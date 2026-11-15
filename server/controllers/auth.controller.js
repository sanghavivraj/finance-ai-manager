import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import bot from '../telegramBot.js';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set in environment variables.');
  return secret;
};


export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate name
    if (!name || name.length < 2 || name.length > 50) {
      return res.status(400).json({ error: 'Name must be 2-50 characters' });
    }
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate password
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email`,
      [name.trim(), email.trim().toLowerCase(), hash]
    );
    const token = jwt.sign({ id: rows[0].id }, getJwtSecret(), { expiresIn: '30d' });
    res.json({ token, user: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'An account with this email already exists' });
    next(e);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    const { rows } = await pool.query(`SELECT * FROM users WHERE LOWER(email)=LOWER($1)`, [email]);
    if (!rows[0]) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: rows[0].id }, getJwtSecret(), { expiresIn: '30d' });
    const { password_hash, ...user } = rows[0];
    res.json({ token, user });
  } catch (e) { next(e); }
};

export const me = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, monthly_income, auto_rebalance, (telegram_id IS NOT NULL) AS telegram_linked FROM users WHERE id=$1`,
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    const { rows } = await pool.query(
      `SELECT id, name, email, telegram_id FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (rows.length === 0) {
      return res.json({ message: 'If an account with that email exists, a password reset code has been generated.' });
    }

    const user = rows[0];
    const resetCode = crypto.randomInt(100000, 1000000).toString(); // CSPRNG 6-digit OTP
    const hashedCode = crypto.createHash('sha256').update(resetCode).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await pool.query(
      `UPDATE users
       SET reset_code = $1, reset_code_expires = $2, reset_attempts = 0
       WHERE id = $3`,
      [hashedCode, expires, user.id]
    );

    // Send 6-digit OTP code via Telegram Bot if linked
    if (user.telegram_id && bot) {
      try {
        await bot.sendMessage(
          user.telegram_id,
          `🔑 *Password Reset Verification Code*\n\nHello ${user.name},\nYour 6-digit password reset OTP code is:\n\n\`${resetCode}\`\n\n*Note:* This code will expire in 15 minutes.`,
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        console.error('Telegram OTP send failed:', err.message);
      }
    }

    // Only expose OTP in dev AND only via console — never in HTTP response
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Reset code for ${email}: ${resetCode}`);
    }
    res.json({
      message: user.telegram_id
        ? 'A 6-digit verification code has been sent to your Telegram!'
        : 'Reset code generated. Link your Telegram account for direct OTP notifications.',
    });
  } catch (e) {
    next(e);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, code, token, newPassword } = req.body;
    const userCode = (code || token || '').toString().trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!/^\d{6}$/.test(userCode)) {
      return res.status(400).json({ error: 'Reset code must be a 6-digit number' });
    }
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const { rows } = await pool.query(
      `SELECT id, reset_code, reset_code_expires, COALESCE(reset_attempts, 0) AS attempts
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    const user = rows[0];
    const invalid = () => res.status(400).json({ error: 'Invalid or expired reset code' });

    if (!user || !user.reset_code || new Date(user.reset_code_expires) < new Date()) return invalid();

    // Lock the code after 5 wrong guesses (brute-force protection)
    if (user.attempts >= 5) {
      await pool.query(`UPDATE users SET reset_code = NULL, reset_code_expires = NULL WHERE id = $1`, [user.id]);
      return res.status(429).json({ error: 'Too many attempts. Request a new code.' });
    }

    const hashed = crypto.createHash('sha256').update(userCode).digest('hex');
    const a = Buffer.from(hashed);
    const b = Buffer.from(user.reset_code);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      await pool.query(`UPDATE users SET reset_attempts = COALESCE(reset_attempts, 0) + 1 WHERE id = $1`, [user.id]);
      return invalid();
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users
       SET password_hash = $1, reset_code = NULL, reset_code_expires = NULL,
           reset_token = NULL, reset_token_expires = NULL, reset_attempts = 0
       WHERE id = $2`,
      [newHash, user.id]
    );

    res.json({ message: 'Password reset successful! You can now log in with your new password.' });
  } catch (e) {
    next(e);
  }
};

// Generate a one-time code the user sends to the Telegram bot: /link <code>
export const createTelegramLinkCode = async (req, res, next) => {
  try {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 hex chars
    const hashed = crypto.createHash('sha256').update(code).digest('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query(
      `UPDATE users SET telegram_link_code = $1, telegram_link_expires = $2 WHERE id = $3`,
      [hashed, expires, req.user.id]
    );
    res.json({ code, expiresInMinutes: 10 });
  } catch (e) { next(e); }
};
