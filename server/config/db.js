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

  -- categories: is_active (required by dashboard, budgets, expense queries)
  ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

  -- expenses: item_name, payment_method, mood (required by expense controller)
  ALTER TABLE expenses ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);
  ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Cash';
  ALTER TABLE expenses ADD COLUMN IF NOT EXISTS mood VARCHAR(20) DEFAULT 'neutral';

  CREATE TABLE IF NOT EXISTS peer_benchmarks (
      id SERIAL PRIMARY KEY,
      tier_name VARCHAR(50) NOT NULL,
      min_income NUMERIC(12, 2) NOT NULL,
      max_income NUMERIC(12, 2) NOT NULL,
      food_pct NUMERIC(5, 2) NOT NULL,
      housing_pct NUMERIC(5, 2) NOT NULL,
      shopping_pct NUMERIC(5, 2) NOT NULL,
      transport_pct NUMERIC(5, 2) NOT NULL,
      savings_pct NUMERIC(5, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  INSERT INTO peer_benchmarks (id, tier_name, min_income, max_income, food_pct, housing_pct, shopping_pct, transport_pct, savings_pct)
  VALUES 
    (1, 'Tier 1 (₹25k–₹50k)', 25000, 50000, 22.0, 30.0, 12.0, 10.0, 20.0),
    (2, 'Tier 2 (₹50k–₹1L)', 50000, 100000, 16.0, 26.0, 14.0, 8.0, 30.0),
    (3, 'Tier 3 (₹1L+)', 100000, 99999999, 12.0, 20.0, 15.0, 6.0, 40.0)
  ON CONFLICT (id) DO NOTHING;
`).catch(err => console.error('Table init error:', err.message));