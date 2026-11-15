import { pool } from '../config/db.js';
import { projectGoal } from '../utils/goalProjection.js';

export const list = async (req, res, next) => {
  try {
    let { rows } = await pool.query(
      `SELECT * FROM goals WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    );

    // Auto-heal / Auto-sync: If user has 0 goals, check if they have any savings/investment deposits in expenses
    if (rows.length === 0) {
      const { rows: savingsRows } = await pool.query(
        `SELECT COALESCE(SUM(e.amount), 0) as total_savings
         FROM expenses e
         JOIN categories c ON c.id = e.category_id
         WHERE e.user_id = $1 AND LOWER(c.name) IN ('savings', 'investments')`,
        [req.user.id]
      );

      const totalSavings = parseFloat(savingsRows[0]?.total_savings || 0);
      if (totalSavings > 0) {
        // Automatically create default goal with existing accumulated savings balance
        const { rows: createdGoal } = await pool.query(
          `INSERT INTO goals (user_id, name, target_amount, current_amount, icon)
           VALUES ($1, 'Emergency & Wealth Vault', 100000, $2, '🛡️')
           RETURNING *`,
          [req.user.id, totalSavings]
        );
        rows = createdGoal;
      }
    }

    // Average monthly savings + investments over the last 3 months
    const { rows: pace } = await pool.query(
      `SELECT COALESCE(SUM(e.amount), 0) AS total
       FROM expenses e JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = $1 AND LOWER(c.name) IN ('savings', 'investments')
         AND e.date >= (CURRENT_DATE - INTERVAL '3 months')`,
      [req.user.id]
    );
    const avgMonthlySaving = parseFloat(pace[0]?.total || 0) / 3;
    const unfinished = rows.filter(g => parseFloat(g.current_amount || 0) < parseFloat(g.target_amount || 0)).length || 1;

    const formatted = rows.map(g => {
      const target = parseFloat(g.target_amount || 0);
      const current = parseFloat(g.current_amount || 0);
      const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;

      // Savings capacity is shared evenly across unfinished goals
      const p = projectGoal({
        target, current, deadline: g.deadline,
        monthlySaving: avgMonthlySaving / unfinished,
      });

      return {
        ...g,
        target,
        current,
        progress,
        ai_prediction: p.likelihood,
        ai_suggestion: p.suggestion,
        required_monthly: p.requiredMonthly,
        months_left: p.monthsLeft,
      };
    });

    res.json(formatted);
  } catch (e) { next(e); }
};

export const create = async (req, res, next) => {
  try {
    const { name, target, current, deadline, icon } = req.body;
    const initialAmount = parseFloat(current || 0);
    const userId = req.user.id;

    const { rows } = await pool.query(
      `INSERT INTO goals (user_id, name, target_amount, current_amount, deadline, icon)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, name, target, initialAmount, deadline || null, icon || '🎯']
    );

    if (initialAmount > 0) {
      const { rows: catRows } = await pool.query(
        `SELECT id FROM categories WHERE LOWER(name) = 'savings' LIMIT 1`
      );
      const savingsCatId = catRows[0]?.id || 6;

      await pool.query(
        `INSERT INTO expenses (user_id, category_id, amount, description, merchant, date, payment_method)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, 'transfer')`,
        [userId, savingsCatId, initialAmount, `Initial deposit: ${name}`, name]
      );
    }

    res.json(rows[0]);
  } catch (e) { next(e); }
};

export const deposit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const numAmount = parseFloat(amount);
    const userId = req.user.id;

    // 1. Get goal info
    const { rows: goalRows } = await pool.query(
      `SELECT * FROM goals WHERE id=$1 AND user_id=$2`,
      [id, userId]
    );
    if (goalRows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    const goal = goalRows[0];

    // 2. Update goal current_amount
    await pool.query(
      `UPDATE goals SET current_amount = current_amount + $1 WHERE id=$2 AND user_id=$3`,
      [numAmount, id, userId]
    );

    // 3. Find category ID for 'Savings'
    const { rows: catRows } = await pool.query(
      `SELECT id FROM categories WHERE LOWER(name) = 'savings' LIMIT 1`
    );
    const savingsCatId = catRows[0]?.id || 6;

    // 4. Record matching transaction in expenses table so Expenses & Savings Vault stay perfectly synchronized
    await pool.query(
      `INSERT INTO expenses (user_id, category_id, amount, description, merchant, date, payment_method)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, 'transfer')`,
      [userId, savingsCatId, numAmount, `Deposit to ${goal.name}`, goal.name]
    );

    res.json({ success: true });
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM goals WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
};
