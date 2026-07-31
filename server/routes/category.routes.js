import { Router } from 'express';
import { pool } from '../config/db.js';
import { auth } from '../middleware/auth.js';

const r = Router();
r.use(auth);

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT id, name, icon, type FROM categories ORDER BY id`);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

export default r;