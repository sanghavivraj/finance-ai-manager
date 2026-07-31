import { pool } from '../config/db.js';
import { generateBudgets, autoRebalance } from '../ai/budgetEngine.js';

export const generate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const { rows: u } = await pool.query(`SELECT monthly_income FROM users WHERE id=$1`, [userId]);
    const income = parseFloat(u[0].monthly_income) || 0;

    // Last month's spending per category
    const { rows: hist } = await pool.query(
      `SELECT c.name, SUM(e.amount) as total
       FROM expenses e JOIN categories c ON c.id = e.category_id
       WHERE e.user_id=$1 AND EXTRACT(MONTH FROM e.date)=$2 AND EXTRACT(YEAR FROM e.date)=$3
       GROUP BY c.name`,
      [userId, month === 1 ? 12 : month - 1, month === 1 ? year - 1 : year]
    );
    const history = Object.fromEntries(hist.map(r => [r.name, parseFloat(r.total)]));

    const budgets = generateBudgets(income, history);
    const { rows: cats } = await pool.query(`SELECT id, name FROM categories`);
    const catMap = Object.fromEntries(cats.map(c => [c.name, c.id]));

    for (const [cat, amount] of Object.entries(budgets)) {
      await pool.query(
        `INSERT INTO budgets (user_id, category_id, month, year, amount, is_ai_generated)
         VALUES ($1,$2,$3,$4,$5,true)
         ON CONFLICT (user_id, category_id, month, year)
         DO UPDATE SET amount=$5, is_ai_generated=true`,
        [userId, catMap[cat], month, year, amount]
      );
    }
    res.json({ success: true, budgets });
  } catch (e) { next(e); }
};

export const list = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const { rows } = await pool.query(
      `SELECT b.*, c.name as category_name, c.icon FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.user_id=$1 AND b.month=$2 AND b.year=$3`,
      [req.user.id, month, year]
    );
    res.json(rows);
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    await pool.query(
      `UPDATE budgets SET amount=$1, is_ai_generated=false WHERE id=$2 AND user_id=$3`,
      [amount, id, req.user.id]
    );
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const rebalance = async (req, res, next) => {
  try {
    const { categoryId, newSpent } = req.body;
    const now = new Date();
    const month = now.getMonth() + 1, year = now.getFullYear();
    const { rows: budgets } = await pool.query(
      `SELECT b.*, c.name FROM budgets b JOIN categories c ON c.id=b.category_id
       WHERE b.user_id=$1 AND b.month=$2 AND b.year=$3`,
      [req.user.id, month, year]
    );
    const { rows: u } = await pool.query(`SELECT monthly_income FROM users WHERE id=$1`, [req.user.id]);
    const income = parseFloat(u[0].monthly_income);

    const map = Object.fromEntries(budgets.map(b => [b.name, parseFloat(b.amount)]));
    const overCat = budgets.find(b => b.category_id == categoryId)?.name;
    map[overCat] = newSpent;
    const rebalanced = autoRebalance(map, overCat, income);

    for (const b of budgets) {
      await pool.query(`UPDATE budgets SET amount=$1 WHERE id=$2`,
        [rebalanced[b.name], b.id]);
    }
    res.json({ success: true, budgets: rebalanced });
  } catch (e) { next(e); }
};