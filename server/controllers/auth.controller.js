import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email`,
      [name, email, hash]
    );
    const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '30d' });
    res.json({ token, user: rows[0] });
  } catch (e) { next(e); }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query(`SELECT * FROM users WHERE email=$1`, [email]);
    if (!rows[0]) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '30d' });
    const { password_hash, ...user } = rows[0];
    res.json({ token, user });
  } catch (e) { next(e); }
};

export const me = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, monthly_income, auto_rebalance FROM users WHERE id=$1`,
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
};