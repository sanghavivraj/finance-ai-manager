import { pool } from '../config/db.js';

export const list = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM goals WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    );

    const formatted = rows.map(g => {
      const target = parseFloat(g.target_amount || 0);
      const current = parseFloat(g.current_amount || 0);
      const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      
      // Simple AI progress likelihood calculation
      let ai_prediction = Math.round(progress > 70 ? 92 : progress > 40 ? 78 : 55);
      let ai_suggestion = progress >= 100 
        ? "Goal Achieved! Consider allocating funds to investments."
        : `Deposit ₹${Math.ceil((target - current) / 3)} per month to hit deadline.`;

      return {
        ...g,
        target: target,
        current: current,
        progress: progress,
        ai_prediction,
        ai_suggestion,
      };
    });

    res.json(formatted);
  } catch (e) { next(e); }
};

export const create = async (req, res, next) => {
  try {
    const { name, target, current, deadline, icon } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO goals (user_id, name, target_amount, current_amount, deadline, icon)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, name, target, current || 0, deadline || null, icon || '🎯']
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
};

export const deposit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    await pool.query(
      `UPDATE goals SET current_amount = current_amount + $1 WHERE id=$2 AND user_id=$3`,
      [parseFloat(amount), id, req.user.id]
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
