import { pool } from '../config/db.js';
import { getHealthScore } from './health.controller.js';

export const summary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. Get TOTAL income
    const { rows: incomeRows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM incomes 
       WHERE user_id=$1 
       AND EXTRACT(MONTH FROM date)=$2 
       AND EXTRACT(YEAR FROM date)=$3`,
      [userId, currentMonth, currentYear]
    );
    const totalIncome = parseFloat(incomeRows[0].total);

    // 2. Get total living expenses (excluding internal asset allocations like Savings & Investments)
    const { rows: expenseRows } = await pool.query(
      `SELECT COALESCE(SUM(e.amount), 0) as total FROM expenses e
       JOIN categories c ON c.id = e.category_id
       WHERE e.user_id=$1 
       AND LOWER(c.name) NOT IN ('savings', 'investments')
       AND EXTRACT(MONTH FROM e.date)=$2 
       AND EXTRACT(YEAR FROM e.date)=$3`,
      [userId, currentMonth, currentYear]
    );
    const totalExpenses = parseFloat(expenseRows[0].total);

    // Get total asset transfers / savings
    const { rows: savingsRows } = await pool.query(
      `SELECT COALESCE(SUM(e.amount), 0) as total FROM expenses e
       JOIN categories c ON c.id = e.category_id
       WHERE e.user_id=$1 
       AND LOWER(c.name) IN ('savings', 'investments')
       AND EXTRACT(MONTH FROM e.date)=$2 
       AND EXTRACT(YEAR FROM e.date)=$3`,
      [userId, currentMonth, currentYear]
    );
    const totalSavings = parseFloat(savingsRows[0].total);

    // 3. Get budgets
    const { rows: budgetRows } = await pool.query(
      `SELECT b.*, c.name as category_name FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.user_id=$1 AND b.month=$2 AND b.year=$3 AND c.is_active = true`,
      [userId, currentMonth, currentYear]
    );
    
    const totalBudget = budgetRows.reduce((sum, b) => sum + parseFloat(b.amount), 0);
    const remaining = totalIncome - totalExpenses - totalSavings;
    const budgetUsage = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

    // ✅ 4. Get ACTUAL SPENDING per category (LIVE data!)
    const { rows: spendingRows } = await pool.query(
      `SELECT c.id as category_id, c.name as category_name, COALESCE(SUM(e.amount), 0) as spent
       FROM categories c
       LEFT JOIN expenses e ON e.category_id = c.id 
         AND e.user_id = $1 
         AND EXTRACT(MONTH FROM e.date) = $2 
         AND EXTRACT(YEAR FROM e.date) = $3
       WHERE c.is_active = true
       GROUP BY c.id, c.name
       ORDER BY spent DESC`,
      [userId, currentMonth, currentYear]
    );

    // 5. Get 6-month trend
    const { rows: trendRows } = await pool.query(
      `SELECT EXTRACT(MONTH FROM date) as month, EXTRACT(YEAR FROM date) as year, SUM(amount) as total
       FROM expenses
       WHERE user_id=$1
       GROUP BY EXTRACT(MONTH FROM date), EXTRACT(YEAR FROM date)
       ORDER BY year DESC, month DESC
       LIMIT 6`,
      [userId]
    );
    const trend = trendRows.map(r => ({
      month: parseInt(r.month),
      year: parseInt(r.year),
      total: r.total
    })).reverse();

    // 6. AI suggestions
    const suggestions = [];
    if (budgetUsage > 90) {
      suggestions.push({ type: 'warning', title: 'Budget Alert', body: 'You have used over 90% of your monthly budget.', solution: 'Consider reducing discretionary spending this week.' });
    }
    if (totalIncome > 0 && (totalExpenses / totalIncome) > 0.8) {
      suggestions.push({ type: 'critical', title: 'High Spending Ratio', body: 'You are spending more than 80% of your income.', solution: 'Try to increase your savings allocation.' });
    }

    res.json({
      income: totalIncome,
      totalSpent: totalExpenses,
      remaining,
      budgetUsage,
      budgets: budgetRows,
      spending: spendingRows, // ✅ LIVE spending per category
      expenses: expenseRows,
      trend,
      suggestions
    });
  } catch (e) {
    console.error("DASHBOARD SUMMARY ERROR:", e); 
    next(e);
  }
};

export const health = getHealthScore;


export const monthlyComparison = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 1 ? 12 : thisMonth - 1;
    const lastYear = thisMonth === 1 ? thisYear - 1 : thisYear;

    const { rows } = await pool.query(
      `SELECT
         EXTRACT(MONTH FROM date) as month,
         EXTRACT(YEAR FROM date) as year,
         COALESCE(SUM(e.amount), 0) as total_spent
       FROM expenses e
       WHERE e.user_id = $1
         AND ((EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3)
           OR (EXTRACT(MONTH FROM date) = $4 AND EXTRACT(YEAR FROM date) = $5))
       GROUP BY EXTRACT(MONTH FROM date), EXTRACT(YEAR FROM date)`,
      [userId, thisMonth, thisYear, lastMonth, lastYear]
    );

    const find = (m, y) => {
      const r = rows.find(r => parseInt(r.month) === m && parseInt(r.year) === y);
      return r ? parseFloat(r.total_spent) : 0;
    };

    const current = find(thisMonth, thisYear);
    const previous = find(lastMonth, lastYear);
    const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

    res.json({ current, previous, change, thisMonth, lastMonth, thisYear, lastYear });
  } catch (e) {
    next(e);
  }
};

// ... keep all existing functions (summary, health, etc.)

// NEW: Monthly Report Endpoint
export const report = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;
    
    // Get spending by category for the selected month
    const { rows } = await pool.query(
      `SELECT 
         c.name, 
         c.icon,
         COALESCE(SUM(e.amount), 0) as total,
         COALESCE(b.amount, 0) as budgeted
       FROM categories c
       LEFT JOIN expenses e ON e.category_id = c.id 
         AND e.user_id = $1 
         AND EXTRACT(MONTH FROM e.date) = $2 
         AND EXTRACT(YEAR FROM e.date) = $3
       LEFT JOIN budgets b ON b.category_id = c.id 
         AND b.user_id = $1 
         AND b.month = $2 
         AND b.year = $3
       WHERE c.is_active = true
       GROUP BY c.name, c.icon, b.amount
       ORDER BY total DESC`,
      [userId, month, year]
    );
    
    res.json(rows);
  } catch (e) {
    console.error("REPORT ERROR:", e);
    next(e);
  }
};

// ... keep monthlyComparison and other exports