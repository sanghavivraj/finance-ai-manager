import { pool } from '../config/db.js';

export const getHealthScore = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Get income
    const { rows: incomeRows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3`,
      [userId, month, year]
    );
    const income = parseFloat(incomeRows[0].total);

    // Get total spent
    const { rows: spentRows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3`,
      [userId, month, year]
    );
    const spent = parseFloat(spentRows[0].total);

    // Get savings + investments
    const { rows: savingsRows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses e 
       JOIN categories c ON c.id = e.category_id 
       WHERE e.user_id=$1 AND c.name IN ('Savings', 'Investments') 
       AND EXTRACT(MONTH FROM e.date)=$2 AND EXTRACT(YEAR FROM e.date)=$3`,
      [userId, month, year]
    );
    const savings = parseFloat(savingsRows[0].total);

    // Get budgets and check adherence
    const { rows: budgets } = await pool.query(
      `SELECT b.category_id, b.amount as budget, COALESCE(SUM(e.amount), 0) as spent
       FROM budgets b
       LEFT JOIN expenses e ON e.category_id = b.category_id 
         AND e.user_id = b.user_id 
         AND EXTRACT(MONTH FROM e.date)=$2 
         AND EXTRACT(YEAR FROM e.date)=$3
       WHERE b.user_id=$1 AND b.month=$2 AND b.year=$3
       GROUP BY b.category_id, b.amount`,
      [userId, month, year]
    );

    // Calculate score components
    let score = 0;

    // 1. Savings Rate (0-40 points)
    const savingsRate = income > 0 ? savings / income : 0;
    const savingsScore = Math.min(40, savingsRate * 100 * 2); // 20% savings = 40 points

    // 2. Budget Adherence (0-40 points)
    let adherenceScore = 0;
    if (budgets.length > 0) {
      const withinBudget = budgets.filter(b => parseFloat(b.spent) <= parseFloat(b.budget)).length;
      adherenceScore = (withinBudget / budgets.length) * 40;
    }

    // 3. Spending Discipline (0-20 points)
    const spendingRate = income > 0 ? spent / income : 0;
    const disciplineScore = spendingRate <= 0.8 ? 20 : spendingRate <= 1 ? 10 : 0;

    score = Math.round(savingsScore + adherenceScore + disciplineScore);

    res.json({
      score,
      breakdown: {
        savings: Math.round(savingsScore),
        adherence: Math.round(adherenceScore),
        discipline: Math.round(disciplineScore),
      },
      metrics: {
        income,
        spent,
        savings,
        savingsRate: (savingsRate * 100).toFixed(1),
      }
    });
  } catch (e) {
    next(e);
  }
};