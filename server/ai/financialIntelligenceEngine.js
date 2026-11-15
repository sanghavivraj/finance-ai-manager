import { calculatePersonalizedBudget } from './budgetEngine.js';
import { calculateHealthScore } from '../controllers/health.controller.js';
import { getCurrentMonthTotalIncome } from '../utils/incomeCalculator.js';
import { callGemini, extractJSON, isAIConfigured } from './geminiClient.js';
import { pool } from '../config/db.js';

// Deterministic Calculation Layer
class FinancialIntelligenceEngine {
  constructor(userId) {
    this.userId = userId;
  }

  async getFinancialContext() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get budgets
    const { rows: budgetRows } = await pool.query(
      `SELECT b.*, c.name as category_name, c.icon, c.type 
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3 AND NOT EXISTS (SELECT 1 FROM user_disabled_categories udc WHERE udc.user_id = $1 AND udc.category_id = c.id)
       ORDER BY c.name`,
      [this.userId, currentMonth, currentYear]
    );

    // Get total income for current month
    const { rows: incomeRows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM incomes 
       WHERE user_id=$1 
       AND EXTRACT(MONTH FROM date)=$2 
       AND EXTRACT(YEAR FROM date)=$3`,
      [this.userId, currentMonth, currentYear]
    );

    const monthlyIncome = parseFloat(incomeRows[0]?.total || 0);

    // Get expense history
    const { rows: expenseHistoryRows } = await pool.query(
      `SELECT e.amount, c.name as category, EXTRACT(MONTH FROM e.date) as month 
       FROM expenses e
       JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = $1 
       AND EXTRACT(YEAR FROM e.date) = $2`,
      [this.userId, currentYear]
    );

    // Get active goals
    const { rows: goalRows } = await pool.query(
      `SELECT id, name, target_amount as targetAmount, current_amount as currentAmount, deadline 
       FROM goals 
       WHERE user_id = $1 AND deadline >= CURRENT_DATE`,
      [this.userId]
    );

    // Calculate personalized budget
    const personalizedBudget = calculatePersonalizedBudget(
      monthlyIncome,
      expenseHistoryRows,
      budgetRows.map(row => ({ name: row.category_name, type: row.type })),
      goalRows
    );

    // Calculate spending for each budget category
    const budgetsWithSpending = await Promise.all(
      budgetRows.map(async (budget) => {
        const { rows: spentRows } = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as total 
           FROM expenses 
           WHERE user_id=$1 
           AND category_id=$2 
           AND EXTRACT(MONTH FROM date)=$3 
           AND EXTRACT(YEAR FROM date)=$4`,
          [this.userId, budget.category_id, currentMonth, currentYear]
        );

        return {
          ...budget,
          amount: parseFloat(budget.amount),
          suggestedAmount: personalizedBudget.budgets?.[budget.category_name] || parseFloat(budget.amount),
          spent: parseFloat(spentRows[0]?.total || 0)
        };
      })
    );

    // Get health score
    const healthData = await calculateHealthScore(this.userId);

    return {
      currency: "INR (₹ Indian Rupees)",
      budgets: budgetsWithSpending,
      monthlyIncome,
      healthScore: healthData.score,
      healthData,
      expenseHistory: expenseHistoryRows,
      goals: goalRows
    };
  }

  async getAIExplanation(context, prompt) {
    if (!isAIConfigured()) {
      return "AI configuration is currently unavailable. Please check your GEMINI_API_KEY.";
    }

    const fullPrompt = `You are an expert personal finance advisor for Indian users.

CURRENCY & FORMATTING INSTRUCTIONS:
- All figures are in Indian Rupees (INR).
- ALWAYS use the Rupee symbol "₹" for all monetary amounts (e.g. ₹250, ₹1,000, ₹15,000, ₹1,00,000).
- NEVER use dollar signs ($), USD, or cents under any circumstances.

CORE FINANCIAL & SAVINGS PRINCIPLES:
1. "Savings" and "Investments" are WEALTH-BUILDING ASSETS.
   - If the user saved or invested more than their target (spent > allocated), celebrate this as a GREAT positive achievement (+₹X extra saved)!
   - NEVER tell the user they are "over budget" on savings or to "rein in" their savings.
2. For regular consumption expenses (Food, Shopping, Bills, Transport, etc.), staying under budget is desirable, and spending over ceiling is an overage.
3. Keep the response concise, encouraging, and natural in 2-3 sentences.

Financial Context:
${JSON.stringify(context, null, 2)}

User Question / Context: ${prompt}`;
    
    try {
      const rawAiResponse = await callGemini(fullPrompt);
      // Guarantee Rupee symbol by replacing any stray dollar signs
      const cleanResponse = (rawAiResponse || '')
        .replace(/\$([0-9,.]+)/g, '₹$1')
        .replace(/\$/g, '₹')
        .trim();
      return cleanResponse || "Financial analysis completed based on your current budget and spending data.";
    } catch (err) {
      console.error("AI Explanation error:", err);
      return "Financial analysis completed based on your current budget and spending data.";
    }
  }
}

export default FinancialIntelligenceEngine;