// Add to server/routes/category.routes.js
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { pool } from '../config/db.js';

const r = Router();
r.use(auth);

// Get all categories (with active status)
r.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM categories ORDER BY id`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// Toggle category active status
r.put('/:id/toggle', async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE categories SET is_active = NOT is_active WHERE id=$1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default r;