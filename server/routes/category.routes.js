import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { pool } from '../config/db.js';

const r = Router();
r.use(auth);

// Get all categories with the *current user's* active status
r.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.type, c.icon,
              NOT EXISTS (
                SELECT 1 FROM user_disabled_categories d
                WHERE d.user_id = $1 AND d.category_id = c.id
              ) AS is_active
       FROM categories c
       ORDER BY c.id`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// Toggle category for the current user only
r.put('/:id/toggle', async (req, res, next) => {
  try {
    const categoryId = parseInt(req.params.id, 10);
    if (!Number.isInteger(categoryId)) return res.status(400).json({ error: 'Invalid category id' });

    const del = await pool.query(
      `DELETE FROM user_disabled_categories WHERE user_id=$1 AND category_id=$2`,
      [req.user.id, categoryId]
    );
    if (del.rowCount === 0) {
      await pool.query(
        `INSERT INTO user_disabled_categories (user_id, category_id)
         SELECT $1, id FROM categories WHERE id=$2
         ON CONFLICT DO NOTHING`,
        [req.user.id, categoryId]
      );
    }
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default r;
