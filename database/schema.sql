CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  monthly_income NUMERIC(12,2) DEFAULT 0,
  auto_rebalance BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('need','want','savings','investment')),
  icon VARCHAR(30)
);

-- Seed default categories
INSERT INTO categories (name, type, icon) VALUES
  ('Food',          'need',       '🍔'),
  ('Shopping',      'want',       '🛍️'),
  ('Transport',     'need',       '🚗'),
  ('Bills',         'need',       '📄'),
  ('Entertainment', 'want',       '🎮'),
  ('Savings',       'savings',    '💰'),
  ('Investments',   'investment', '📈');

CREATE TABLE incomes (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(100) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_salary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE budgets (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id),
  month INT NOT NULL,
  year INT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  is_ai_generated BOOLEAN DEFAULT true,
  UNIQUE(user_id, category_id, month, year)
);

CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id),
  amount NUMERIC(12,2) NOT NULL,
  description VARCHAR(255),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX idx_budgets_user_month ON budgets(user_id, month, year);