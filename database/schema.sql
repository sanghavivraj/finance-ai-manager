CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  monthly_income NUMERIC(12,2) DEFAULT 0,
  auto_rebalance BOOLEAN DEFAULT false,
  telegram_id VARCHAR(100) UNIQUE,
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,
  reset_code VARCHAR(10),
  reset_code_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('need','want','savings','investment')),
  icon VARCHAR(30),
  is_active BOOLEAN DEFAULT true
);

-- Seed default categories if not exists
INSERT INTO categories (name, type, icon) VALUES
  ('Food',          'need',       '🍔'),
  ('Shopping',      'want',       '🛍️'),
  ('Transport',     'need',       '🚗'),
  ('Bills',         'need',       '📄'),
  ('Entertainment', 'want',       '🎮'),
  ('Savings',       'savings',    '💰'),
  ('Investments',   'investment', '📈')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS incomes (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(100) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_salary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id) ON DELETE CASCADE,
  month INT NOT NULL,
  year INT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  is_ai_generated BOOLEAN DEFAULT true,
  UNIQUE(user_id, category_id, month, year)
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  description VARCHAR(255),
  merchant VARCHAR(150),
  item_name VARCHAR(255),
  payment_method VARCHAR(50) DEFAULT 'Cash',
  mood VARCHAR(20) DEFAULT 'neutral',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

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

-- Compound indices for fast query lookups
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month, year);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);

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

INSERT INTO peer_benchmarks (tier_name, min_income, max_income, food_pct, housing_pct, shopping_pct, transport_pct, savings_pct)
VALUES 
  ('Tier 1 (₹25k–₹50k)', 25000, 50000, 22.0, 30.0, 12.0, 10.0, 20.0),
  ('Tier 2 (₹50k–₹1L)', 50000, 100000, 16.0, 26.0, 14.0, 8.0, 30.0),
  ('Tier 3 (₹1L+)', 100000, 99999999, 12.0, 20.0, 15.0, 6.0, 40.0)
ON CONFLICT DO NOTHING;