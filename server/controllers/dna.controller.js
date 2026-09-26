import { pool } from '../config/db.js';

// Helpers for safe numerical guarding against NaN / Infinity
const safeNum = (val, fallback = 0) => (typeof val === 'number' && Number.isFinite(val) && !isNaN(val)) ? val : fallback;
const safeBound = (val, min = 0, max = 100, fallback = 0) => Math.min(max, Math.max(min, Math.round(safeNum(val, fallback))));

export const getFinancialDNA = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Fetch user monthly income setting
    const { rows: userRows } = await pool.query(
      `SELECT monthly_income FROM users WHERE id = $1`,
      [userId]
    );
    const setMonthlyIncome = parseFloat(userRows[0]?.monthly_income || 0);

    // 2. Fetch logged income over last 90 days
    const { rows: incomeRows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_income
       FROM incomes
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '90 days'`,
      [userId]
    );
    const loggedIncome90 = parseFloat(incomeRows[0]?.total_income || 0);

    // Estimated monthly income
    const monthlyIncome = setMonthlyIncome > 0 
      ? setMonthlyIncome 
      : (loggedIncome90 > 0 ? loggedIncome90 / 3 : 50000); // default reference fallback if un-set

    const totalIncome90 = Math.max(loggedIncome90, monthlyIncome * 3);

    // 3. Fetch expenses over last 90 days with categories
    const { rows: expenses } = await pool.query(
      `SELECT e.id, e.amount, e.description, e.merchant, e.date, c.name as category_name,
              EXTRACT(ISODOW FROM e.date) as day_of_week
       FROM expenses e
       JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = $1 AND e.date >= CURRENT_DATE - INTERVAL '90 days'
       ORDER BY e.date DESC`,
      [userId]
    );

    if (expenses.length === 0) {
      return res.json({
        hasData: false,
        message: 'No transaction history found in the last 90 days. Log your expenses via web or Telegram to reveal your Money DNA!',
      });
    }

    // 4. Calculate core metrics with zero-division guards
    const totalSpent90 = expenses.reduce((acc, e) => acc + safeNum(parseFloat(e.amount)), 0);
    const monthlySpentAvg = totalSpent90 / 3;

    // Safe Savings Rate calculation
    const savingsRate = (totalIncome90 > 0 && Number.isFinite(totalIncome90))
      ? Math.round(((totalIncome90 - totalSpent90) / totalIncome90) * 100)
      : 0;

    // Category distribution
    const categoryTotals = {};
    let discretionarySpent = 0;
    let essentialSpent = 0;
    let experientialSpent = 0; // Food + Entertainment

    const essentialCategories = ['bills', 'food', 'groceries', 'health', 'utilities', 'rent', 'transport'];
    const discretionaryCategories = ['shopping', 'entertainment', 'dining', 'movies', 'games', 'fun', 'travel'];

    expenses.forEach((e) => {
      const amt = safeNum(parseFloat(e.amount));
      const catLower = (e.category_name || '').toLowerCase();
      categoryTotals[catLower] = (categoryTotals[catLower] || 0) + amt;

      if (essentialCategories.includes(catLower)) {
        essentialSpent += amt;
      } else if (discretionaryCategories.includes(catLower)) {
        discretionarySpent += amt;
      } else {
        discretionarySpent += amt * 0.5;
        essentialSpent += amt * 0.5;
      }

      if (['food', 'entertainment', 'dining'].includes(catLower)) {
        experientialSpent += amt;
      }
    });

    const discretionaryRatio = (totalSpent90 > 0 && Number.isFinite(totalSpent90)) ? discretionarySpent / totalSpent90 : 0;
    const experientialRatio = (totalSpent90 > 0 && Number.isFinite(totalSpent90)) ? experientialSpent / totalSpent90 : 0;

    // Weekend vs Weekday Spend (Fri = 5, Sat = 6, Sun = 7 in ISO day of week)
    let weekendSpent = 0;
    expenses.forEach((e) => {
      const dow = parseInt(e.day_of_week, 10);
      if (dow === 5 || dow === 6 || dow === 7) {
        weekendSpent += safeNum(parseFloat(e.amount));
      }
    });
    const weekendRatio = (totalSpent90 > 0 && Number.isFinite(totalSpent90)) ? weekendSpent / totalSpent90 : 0;

    // Impulse factor (Single transaction > 25% of monthly income)
    const impulseThreshold = monthlyIncome > 0 ? monthlyIncome * 0.25 : 12500;
    const impulsePurchases = expenses.filter((e) => safeNum(parseFloat(e.amount)) >= impulseThreshold);
    const impulseCount = impulsePurchases.length;

    // 5. Determine Primary Archetype
    let archetype = {
      title: 'The Balanced Strategist',
      badgeColor: 'from-emerald-500 to-teal-600',
      badgeText: 'Balanced & Mindful',
      icon: 'Scale',
      description: 'You maintain harmony between living expenses, future investments, and discretionary enjoyment.',
      keyTrait: 'Follows consistent budget allocations with low financial anxiety.',
    };

    if (savingsRate >= 40) {
      archetype = {
        title: 'The Fortress Saver',
        badgeColor: 'from-blue-600 to-indigo-700',
        badgeText: 'High Capital Retention',
        icon: 'ShieldCheck',
        description: 'You prioritize wealth accumulation and keep cash burn exceptionally low.',
        keyTrait: 'Retains over 40% of income into savings & assets.',
      };
    } else if (savingsRate < 0 || totalSpent90 >= totalIncome90 * 0.95) {
      archetype = {
        title: 'The Over-Leveraged',
        badgeColor: 'from-red-500 to-rose-700',
        badgeText: 'Cash Flow Warning',
        icon: 'AlertTriangle',
        description: 'Your cash burn rate is approaching or exceeding your monthly income stream.',
        keyTrait: 'Outflows consume nearly all incoming liquidity.',
      };
    } else if (weekendRatio >= 0.45) {
      archetype = {
        title: 'The Weekend Splurger',
        badgeColor: 'from-amber-500 to-orange-600',
        badgeText: 'Weekend Peak Burn',
        icon: 'Zap',
        description: 'Your weekday discipline gives way to high-volume spending between Friday and Sunday.',
        keyTrait: 'Over 45% of total outflow occurs over weekends.',
      };
    } else if (experientialRatio >= 0.40) {
      archetype = {
        title: 'The Experiential Seeker',
        badgeColor: 'from-purple-500 to-pink-600',
        badgeText: 'Experience First',
        icon: 'Sparkles',
        description: 'You value memorable meals, dining, and social events above tangible goods.',
        keyTrait: 'Dining & Entertainment make up > 40% of your expenses.',
      };
    }

    // 6. Compute Financial Health Radar Scores (Guarded 0 to 100)
    const savingsScore = safeBound((savingsRate / 40) * 100, 0, 100, 0);

    // Budget Discipline Score
    const { rows: budgets } = await pool.query(
      `SELECT b.amount as limit_amt, COALESCE(SUM(e.amount), 0) as spent_amt
       FROM budgets b
       LEFT JOIN expenses e ON e.category_id = b.category_id AND e.user_id = b.user_id
       WHERE b.user_id = $1
       GROUP BY b.id`,
      [userId]
    );
    let rawDiscipline = 80;
    if (budgets.length > 0) {
      const overBudgets = budgets.filter((b) => parseFloat(b.spent_amt) > parseFloat(b.limit_amt));
      rawDiscipline = 100 - (overBudgets.length / budgets.length) * 100;
    }
    const disciplineScore = safeBound(rawDiscipline, 0, 100, 80);

    // Consistency Score (Week over week variance)
    const weeklyTotals = [0, 0, 0, 0];
    expenses.forEach((e) => {
      const daysAgo = Math.floor((new Date() - new Date(e.date)) / (1000 * 60 * 60 * 24));
      const weekIdx = Math.min(3, Math.floor(daysAgo / 7));
      weeklyTotals[weekIdx] += safeNum(parseFloat(e.amount));
    });
    const avgWeekly = weeklyTotals.reduce((a, b) => a + b, 0) / 4;
    const variance = weeklyTotals.reduce((acc, val) => acc + Math.pow(val - avgWeekly, 2), 0) / 4;
    const stdDev = Math.sqrt(variance);
    const rawConsistency = (avgWeekly > 0 && Number.isFinite(avgWeekly)) ? 100 - (stdDev / avgWeekly) * 50 : 85;
    const consistencyScore = safeBound(rawConsistency, 10, 100, 85);

    // Discretionary Control Score
    const discretionaryControlScore = safeBound((1 - safeNum(discretionaryRatio)) * 100, 0, 100, 50);

    // Impulse Resistance Score
    const impulseScore = safeBound(100 - impulseCount * 25, 0, 100, 100);

    const radarScores = [
      { subject: 'Savings Rate', score: savingsScore, fullMark: 100 },
      { subject: 'Budget Discipline', score: disciplineScore, fullMark: 100 },
      { subject: 'Consistency', score: consistencyScore, fullMark: 100 },
      { subject: 'Discretionary Control', score: discretionaryControlScore, fullMark: 100 },
      { subject: 'Impulse Resistance', score: impulseScore, fullMark: 100 },
    ];

    // 7. Generate Algorithmic Behavioral Advice
    const recommendations = [];

    if (weekendRatio >= 0.40) {
      recommendations.push({
        title: 'Cap Weekend Outflows',
        icon: 'Calendar',
        color: 'text-amber-500',
        text: `Over ${Math.round(weekendRatio * 100)}% of your spending happens on weekends. Setting a dedicated Friday-to-Sunday cash limit can save you ~₹${Math.round(weekendSpent * 0.2).toLocaleString()}/month.`,
      });
    }

    if (impulseCount > 0) {
      recommendations.push({
        title: '24-Hour Cooling Off Rule',
        icon: 'Clock',
        color: 'text-red-500',
        text: `You had ${impulseCount} high-ticket purchase(s) exceeding ₹${Math.round(impulseThreshold).toLocaleString()} recently. Instituting a 24-hour pause before big purchases reduces impulse spend by up to 35%.`,
      });
    }

    if (discretionaryRatio > 0.45) {
      recommendations.push({
        title: 'Optimize Discretionary Categories',
        icon: 'TrendingUp',
        color: 'text-purple-500',
        text: `Discretionary expenses account for ${Math.round(discretionaryRatio * 100)}% of total burn. Redirecting 10% into your Savings Vault boosts long-term compound growth.`,
      });
    }

    if (savingsRate < 20) {
      recommendations.push({
        title: 'Automate 20% Wealth Deposit',
        icon: 'PiggyBank',
        color: 'text-emerald-500',
        text: `Your current savings rate is ${savingsRate}%. Automate a 20% deposit into your Savings Vault immediately on payday before discretionary spending occurs.`,
      });
    }

    if (recommendations.length < 2) {
      recommendations.push({
        title: 'Maintain Financial Momentum',
        icon: 'ShieldCheck',
        color: 'text-emerald-500',
        text: 'Your current spending patterns display healthy discipline. Keep logging expenses daily via Telegram for precision tracking!',
      });
    }

    res.json({
      hasData: true,
         hasIncomeData: totalIncome90 > 0 && Number.isFinite(totalIncome90) && loggedIncome90 > 0,
      archetype,
      metrics: {
        savingsRate: safeNum(savingsRate, 0),
        discretionaryRatio: Math.round(safeNum(discretionaryRatio, 0) * 100),
        weekendRatio: Math.round(safeNum(weekendRatio, 0) * 100),
        monthlySpentAvg: Math.round(safeNum(monthlySpentAvg, 0)),
        totalTransactions: expenses.length,
        impulseCount,
      },
      radarScores,
      recommendations,
      coolingOffAlert: impulseScore < 60 ? {
        title: 'Cooling-Off Trigger Warning Active',
        threshold: Math.round(impulseThreshold),
        text: `Impulse Resistance score is currently at ${impulseScore}/100. We recommend placing a compulsory 24-hour waiting period on all purchases over ₹${Math.round(impulseThreshold).toLocaleString()}.`,
      } : null,
    });
  } catch (error) {
    next(error);
  }
};

export const getMoneyDNA = getFinancialDNA;