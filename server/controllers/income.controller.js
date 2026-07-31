import { pool } from '../config/db.js';

export const add = async (req, res, next) => {
  try {
    const { source, amount, date, is_salary } = req.body;
    await pool.query(
      `INSERT INTO incomes (user_id, source, amount, date, is_salary) VALUES ($1,$2,$3,$4,$5)`,
      [req.user.id, source, amount, date || new Date(), !!is_salary]
    );
    if (is_salary) {
      await pool.query(`UPDATE users SET monthly_income=$1 WHERE id=$2`, [amount, req.user.id]);
    }
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const list = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM incomes WHERE user_id=$1 ORDER BY date DESC`, [req.user.id]);
    res.json(rows);
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM incomes WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
};