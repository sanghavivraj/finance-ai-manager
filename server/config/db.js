import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'finance_manager',
});

pool.on('error', e => console.error('DB error', e));

// Auto-migrate tables if not exists
pool.query(`
  CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_amount NUMERIC(12,2) NOT NULL,
    current_amount NUMERIC(12,2) DEFAULT 0,
    deadline DATE,
    icon VARCHAR(30) DEFAULT '🎯',
    created_at TIMESTAMP DEFAULT NOW()
  );
  ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code VARCHAR(10);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_expires TIMESTAMP;
  CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
`).catch(err => console.error('Table init error:', err.message));