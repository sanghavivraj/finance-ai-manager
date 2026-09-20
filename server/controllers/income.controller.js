import { pool } from '../config/db.js';

// 1. ADD INCOME
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

// 2. LIST INCOME (Filtered by CURRENT MONTH ONLY)
export const list = async (req, res, next) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const { rows } = await pool.query(
      `SELECT * FROM incomes 
       WHERE user_id=$1 
       AND EXTRACT(MONTH FROM date)=$2 
       AND EXTRACT(YEAR FROM date)=$3
       ORDER BY date DESC`,
      [req.user.id, currentMonth, currentYear]
    );
    res.json(rows);
  } catch (e) { next(e); }
};

// 3. UPDATE INCOME
export const update = async (req, res, next) => {
  try {
    const { source, amount, date, is_salary } = req.body;
    await pool.query(
      `UPDATE incomes SET source=$1, amount=$2, date=$3, is_salary=$4 
       WHERE id=$5 AND user_id=$6`,
      [source, amount, date, !!is_salary, req.params.id, req.user.id]
    );
    if (is_salary) {
      await pool.query(`UPDATE users SET monthly_income=$1 WHERE id=$2`, [amount, req.user.id]);
    }
    res.json({ success: true });
  } catch (e) { next(e); }
};

// 4. DELETE INCOME
export const remove = async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM incomes WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
};