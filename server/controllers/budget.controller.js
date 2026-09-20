import { pool } from '../config/db.js';
// ✅ FIXED IMPORT: Changed generateBudgets to generateAIBudget
import { generateAIBudget, autoRebalance } from '../ai/budgetEngine.js';
import { getCurrentMonthTotalIncome } from '../utils/incomeCalculator.js';


export const generate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const { rows: u } = await pool.query(`SELECT monthly_income FROM users WHERE id=$1`, [userId]);
    const income = parseFloat(u[0].monthly_income) || 0;

    // Last month's spending per category
    const { rows: hist } = await pool.query(
      `SELECT c.name, SUM(e.amount) as total
       FROM expenses e JOIN categories c ON c.id = e.category_id
       WHERE e.user_id=$1 AND EXTRACT(MONTH FROM e.date)=$2 AND EXTRACT(YEAR FROM e.date)=$3
       GROUP BY c.name`,
      [userId, month === 1 ? 12 : month - 1, month === 1 ? year - 1 : year]
    );
    const history = Object.fromEntries(hist.map(r => [r.name, parseFloat(r.total)]));

    // ✅ FIXED CALL: Use generateAIBudget with correct arguments
    const budgets = generateAIBudget(income, {}, history);
    
    const { rows: cats } = await pool.query(`SELECT id, name FROM categories`);
    const catMap = Object.fromEntries(cats.map(c => [c.name, c.id]));

    for (const [cat, amount] of Object.entries(budgets)) {
      await pool.query(
        `INSERT INTO budgets (user_id, category_id, month, year, amount, is_ai_generated)
         VALUES ($1,$2,$3,$4,$5,true)
         ON CONFLICT (user_id, category_id, month, year)
         DO UPDATE SET amount=$5, is_ai_generated=true`,
        [userId, catMap[cat], month, year, amount]
      );
    }
    res.json({ success: true, budgets });
  } catch (e) { next(e); }
};

// ✅ FIXED LIST FUNCTION - Returns monthlyIncome correctly
export const list = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;
    
    console.log("Budget list called for:", { userId, month, year }); // Debug log
    
    // Get budgets
    const { rows: budgetRows } = await pool.query(
      `SELECT b.*, c.name as category_name, c.icon 
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3 AND c.is_active = true
       ORDER BY c.name`,
      [userId, month, year]
    );
    
    // Get total income for current month
    const { rows: incomeRows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM incomes 
       WHERE user_id=$1 
       AND EXTRACT(MONTH FROM date)=$2 
       AND EXTRACT(YEAR FROM date)=$3`,
      [userId, month, year]
    );
    
    const monthlyIncome = parseFloat(incomeRows[0].total);
    
    // ✅ Calculate spending for EACH budget category
    const budgetsWithSpending = await Promise.all(
      budgetRows.map(async (budget) => {
        const { rows: spentRows } = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as total 
           FROM expenses 
           WHERE user_id=$1 
           AND category_id=$2 
           AND EXTRACT(MONTH FROM date)=$3 
           AND EXTRACT(YEAR FROM date)=$4`,
          [userId, budget.category_id, month, year]
        );
        
        return {
          ...budget,
          spent: parseFloat(spentRows[0].total)
        };
      })
    );
    
    console.log("Budgets with spending:", budgetsWithSpending); // Debug log
    
    res.json({ 
      budgets: budgetsWithSpending,
      monthlyIncome: monthlyIncome 
    });
  } catch (e) { 
    console.error("BUDGET LIST ERROR:", e);
    next(e); 
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    await pool.query(
      `UPDATE budgets SET amount=$1, is_ai_generated=false WHERE id=$2 AND user_id=$3`,
      [amount, id, req.user.id]
    );
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const rebalance = async (req, res, next) => {
  try {
    const { categoryId, newSpent } = req.body;
    const now = new Date();
    const month = now.getMonth() + 1, year = now.getFullYear();
    const { rows: budgets } = await pool.query(
      `SELECT b.*, c.name FROM budgets b JOIN categories c ON c.id=b.category_id
       WHERE b.user_id=$1 AND b.month=$2 AND b.year=$3`,
      [req.user.id, month, year]
    );
    const { rows: u } = await pool.query(`SELECT monthly_income FROM users WHERE id=$1`, [req.user.id]);
    const income = parseFloat(u[0].monthly_income);

    const map = Object.fromEntries(budgets.map(b => [b.name, parseFloat(b.amount)]));
    const overCat = budgets.find(b => b.category_id == categoryId)?.name;
    map[overCat] = newSpent;
    const rebalanced = autoRebalance(map, overCat, income);

    for (const b of budgets) {
      await pool.query(`UPDATE budgets SET amount=$1 WHERE id=$2`,
        [rebalanced[b.name], b.id]);
    }
    res.json({ success: true, budgets: rebalanced });
  } catch (e) { next(e); }
};

export const generateWithAI = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Get TOTAL income
    const { rows: incomeRows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM incomes 
       WHERE user_id=$1 
       AND EXTRACT(MONTH FROM date)=$2 
       AND EXTRACT(YEAR FROM date)=$3`,
      [userId, month, year]
    );

    const totalMonthlyIncome = parseFloat(incomeRows[0].total);

    if (totalMonthlyIncome === 0) {
      return res.status(400).json({ 
        error: 'No income found for this month. Add income first!' 
      });
    }

    // Get ONLY ACTIVE categories
    const { rows: activeCats } = await pool.query(
      `SELECT name FROM categories WHERE is_active = true ORDER BY id`
    );
    
    const activeCategoryNames = activeCats.map(c => c.name);

    if (activeCategoryNames.length === 0) {
      return res.status(400).json({ 
        error: 'No active categories. Enable at least one category!' 
      });
    }

    // Generate budget
    const { generateAIBudget } = await import('../ai/budgetEngine.js');
    const newBudgets = generateAIBudget(totalMonthlyIncome, activeCategoryNames);

    // DELETE ALL existing budgets for this month
    await pool.query(
      `DELETE FROM budgets WHERE user_id=$1 AND month=$2 AND year=$3`,
      [userId, month, year]
    );

    // Insert new budgets
    const { rows: allCats } = await pool.query(`SELECT id, name FROM categories`);
    const catMap = Object.fromEntries(allCats.map(c => [c.name, c.id]));

    for (const [categoryName, amount] of Object.entries(newBudgets)) {
      if (catMap[categoryName]) {
        await pool.query(
          `INSERT INTO budgets (user_id, category_id, amount, month, year, is_ai_generated) 
           VALUES ($1, $2, $3, $4, $5, true)`,
          [userId, catMap[categoryName], amount, month, year]
        );
      }
    }

    res.json({ 
      success: true, 
      message: 'AI Budget generated successfully!',
      totalIncome: totalMonthlyIncome,
      budgets: newBudgets 
    });
  } catch (e) {
    console.error("GENERATE AI ERROR:", e);
    next(e);
  }
};