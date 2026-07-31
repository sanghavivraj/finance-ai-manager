import { pool } from '../config/db.js';
import { generateSuggestions } from '../ai/suggestionEngine.js';

export const summary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const month = now.getMonth() + 1, year = now.getFullYear();

    const { rows: u } = await pool.query(
      `SELECT monthly_income FROM users WHERE id=$1`, [userId]);
    const income = parseFloat(u[0].monthly_income) || 0;

    const { rows: budgets } = await pool.query(
      `SELECT b.amount, c.name, c.icon FROM budgets b
       JOIN categories c ON c.id=b.category_id
       WHERE b.user_id=$1 AND b.month=$2 AND b.year=$3`,
      [userId, month, year]);

    const { rows: spentRows } = await pool.query(
      `SELECT c.name, COALESCE(SUM(e.amount),0) as total
       FROM expenses e JOIN categories c ON c.id=e.category_id
       WHERE e.user_id=$1 AND EXTRACT(MONTH FROM e.date)=$2 AND EXTRACT(YEAR FROM e.date)=$3
       GROUP BY c.name`,
      [userId, month, year]);

    const spent = Object.fromEntries(spentRows.map(r => [r.name, parseFloat(r.total)]));
    const totalSpent = Object.values(spent).reduce((a, b) => a + b, 0);
    const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.amount), 0);

    const suggestions = generateSuggestions({
      budgets: Object.fromEntries(budgets.map(b => [b.name, parseFloat(b.amount)])),
      spent, monthlyIncome: income,
    });

    // Last 6 months trend
    const { rows: trend } = await pool.query(
      `SELECT TO_CHAR(date, 'YYYY-MM') as m, SUM(amount) as total
       FROM expenses WHERE user_id=$1 AND date >= NOW() - INTERVAL '6 months'
       GROUP BY m ORDER BY m`, [userId]);

    res.json({
      income, totalSpent, remaining: income - totalSpent,
      totalBudget, budgetUsage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      budgets, spent, suggestions, trend,
    });
  } catch (e) { next(e); }
};

export const report = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const { rows } = await pool.query(
      `SELECT c.name, c.icon, COALESCE(SUM(e.amount),0) as total,
              b.amount as budgeted
       FROM categories c
       LEFT JOIN expenses e ON e.category_id=c.id AND e.user_id=$1
              AND EXTRACT(MONTH FROM e.date)=$2 AND EXTRACT(YEAR FROM e.date)=$3
       LEFT JOIN budgets b ON b.category_id=c.id AND b.user_id=$1
              AND b.month=$2 AND b.year=$3
       GROUP BY c.name, c.icon, b.amount`,
      [req.user.id, month, year]);
    res.json(rows);
  } catch (e) { next(e); }
};

export const monthlyComparison = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const { rows } = await pool.query(
      `SELECT 
        TO_CHAR(date, 'Mon YYYY') as month,
        EXTRACT(YEAR FROM date) as year,
        EXTRACT(MONTH FROM date) as month_num,
        COALESCE(SUM(amount), 0) as spent
       FROM expenses 
       WHERE user_id=$1 
       AND date >= NOW() - INTERVAL '6 months'
       GROUP BY month, year, month_num
       ORDER BY year DESC, month_num DESC`,
      [userId]
    );

    // Get budgets for same months
    const comparison = await Promise.all(rows.map(async (row) => {
      const { rows: budgetRows } = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total 
         FROM budgets 
         WHERE user_id=$1 AND year=$2 AND month=$3`,
        [userId, row.year, row.month_num]
      );
      return {
        month: row.month,
        spent: parseFloat(row.spent),
        budget: parseFloat(budgetRows[0]?.total || 0),
      };
    }));

    res.json(comparison.reverse());
  } catch (e) { next(e); }
};