import { pool } from '../config/db.js';
import { autoRebalance } from '../ai/budgetEngine.js';

export const add = async (req, res, next) => {
  try {
    // Added 'mood' here
    const { category_id, amount, description, date, merchant, item_name, payment_method, mood } = req.body;
    const userId = req.user.id;
    const now = new Date(date || Date.now());
    const month = now.getMonth() + 1, year = now.getFullYear();

    // Insert expense with mood included
    await pool.query(
      `INSERT INTO expenses (user_id, category_id, amount, description, date, merchant, item_name, payment_method, mood)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [userId, category_id, amount, description, date || now, merchant || null, item_name || null, payment_method || null, mood || null]
    );

    // ✅ AUTO-SYNC TO SAVINGS VAULT GOALS IF CATEGORY IS SAVINGS/INVESTMENTS
    const { rows: catInfo } = await pool.query(`SELECT name FROM categories WHERE id=$1`, [category_id]);
    if (catInfo[0] && (catInfo[0].name === 'Savings' || catInfo[0].name === 'Investments')) {
      const { rows: userGoals } = await pool.query(
        `SELECT id FROM goals WHERE user_id=$1 ORDER BY created_at ASC LIMIT 1`,
        [userId]
      );
      if (userGoals.length > 0) {
        await pool.query(
          `UPDATE goals SET current_amount = current_amount + $1 WHERE id=$2`,
          [amount, userGoals[0].id]
        );
      }
    }

    // Check budget logic
    const { rows: b } = await pool.query(
      `SELECT * FROM budgets WHERE user_id=$1 AND category_id=$2 AND month=$3 AND year=$4`,
      [userId, category_id, month, year]
    );
    const { rows: spent } = await pool.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM expenses
       WHERE user_id=$1 AND category_id=$2 AND EXTRACT(MONTH FROM date)=$3 AND EXTRACT(YEAR FROM date)=$4`,
      [userId, category_id, month, year]
    );

    let warning = null;
    const budget = b[0] ? parseFloat(b[0].amount) : 0;
    const totalSpent = parseFloat(spent[0].total);

    if (budget > 0 && totalSpent > budget) {
      warning = { over: true, budget, spent: totalSpent, category_id };
      const { rows: u } = await pool.query(`SELECT auto_rebalance, monthly_income FROM users WHERE id=$1`, [userId]);
      if (u[0]?.auto_rebalance) {
        const { rows: all } = await pool.query(
          `SELECT b.id, c.name FROM budgets b JOIN categories c ON c.id=b.category_id
           WHERE b.user_id=$1 AND b.month=$2 AND b.year=$3`,
          [userId, month, year]
        );
        const map = Object.fromEntries(all.map(x => [x.name, parseFloat(x.amount)]));
        if (catInfo[0]) {
          map[catInfo[0].name] = totalSpent;
          const rebalanced = autoRebalance(map, catInfo[0].name, parseFloat(u[0].monthly_income));
          for (const x of all) {
            await pool.query(`UPDATE budgets SET amount=$1 WHERE id=$2`, [rebalanced[x.name], x.id]);
          }
        }
      }
    }
    res.json({ success: true, warning });
  } catch (e) { next(e); }
};


export const list = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*, c.name as category_name, c.icon FROM expenses e
       JOIN categories c ON c.id=e.category_id
       WHERE e.user_id=$1 AND c.is_active = true
       ORDER BY e.date DESC LIMIT 200`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
};

export const getByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { rows } = await pool.query(
      `SELECT 
         COALESCE(merchant, 'Unknown') as merchant, 
         SUM(amount) as total, 
         COUNT(*) as transaction_count,
         MAX(date) as last_date
       FROM expenses 
       WHERE user_id=$1 AND category_id=$2 
       GROUP BY merchant 
       ORDER BY total DESC`,
      [req.user.id, categoryId]
    );
    res.json(rows);
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM expenses WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
};

// UPDATE FUNCTION (Perfectly written!)
export const update = async (req, res, next) => {
  try {
    const { category_id, amount, description, date, merchant, item_name, payment_method, mood } = req.body;
    
    await pool.query(
      `UPDATE expenses 
       SET category_id=$1, amount=$2, description=$3, date=$4, merchant=$5, item_name=$6, payment_method=$7, mood=$8
       WHERE id=$9 AND user_id=$10`,
      [category_id, amount, description, date, merchant, item_name, payment_method, mood, req.params.id, req.user.id]
    );
    
    res.json({ success: true });
  } catch (e) { next(e); }
};