import { pool } from '../config/db.js';

// Safe numerical helpers
const safeNum = (val, fallback = 0) =>
  typeof val === 'number' && Number.isFinite(val) && !isNaN(val) ? val : fallback;
const safeBound = (val, min = 0, max = 100, fallback = 0) =>
  Math.min(max, Math.max(min, Math.round(safeNum(val, fallback))));

export const getPeerBenchmark = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const requestedTierId = req.query.tierId ? parseInt(req.query.tierId, 10) : null;

    // 1. Fetch user profile monthly income
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

    const effectiveMonthlyIncome = setMonthlyIncome > 0
      ? setMonthlyIncome
      : loggedIncome90 > 0
      ? loggedIncome90 / 3
      : 55000; // Default Tier 2 reference fallback

    const totalIncome90 = Math.max(loggedIncome90, effectiveMonthlyIncome * 3);

    // 3. Fetch all peer benchmarks
    const { rows: allTiers } = await pool.query(
      `SELECT id, tier_name, min_income, max_income, food_pct, housing_pct, shopping_pct, transport_pct, savings_pct 
       FROM peer_benchmarks 
       ORDER BY min_income ASC`
    );

    // Determine active benchmark tier
    let activeBenchmark = null;
    if (requestedTierId) {
      activeBenchmark = allTiers.find((t) => t.id === requestedTierId);
    }
    if (!activeBenchmark) {
      activeBenchmark = allTiers.find(
        (t) => effectiveMonthlyIncome >= parseFloat(t.min_income) && effectiveMonthlyIncome <= parseFloat(t.max_income)
      ) || allTiers[1] || allTiers[0];
    }

    // 4. Fetch user expenses over last 90 days
    const { rows: expenses } = await pool.query(
      `SELECT e.amount, c.name as category_name
       FROM expenses e
       JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = $1 AND e.date >= CURRENT_DATE - INTERVAL '90 days'`,
      [userId]
    );

    const categorySpending = {
      food: 0,
      housing: 0,
      shopping: 0,
      transport: 0,
      savings: 0,
      other: 0,
    };

    let totalSpent90 = 0;

    expenses.forEach((e) => {
      const amt = safeNum(parseFloat(e.amount));
      totalSpent90 += amt;
      const cat = (e.category_name || '').toLowerCase();

      if (cat === 'food' || cat === 'groceries' || cat === 'dining') {
        categorySpending.food += amt;
      } else if (cat === 'bills' || cat === 'rent' || cat === 'utilities' || cat === 'housing') {
        categorySpending.housing += amt;
      } else if (cat === 'shopping' || cat === 'entertainment' || cat === 'fun') {
        categorySpending.shopping += amt;
      } else if (cat === 'transport' || cat === 'travel' || cat === 'fuel') {
        categorySpending.transport += amt;
      } else if (cat === 'savings' || cat === 'investments' || cat === 'sip') {
        categorySpending.savings += amt;
      } else {
        categorySpending.other += amt;
      }
    });

    // Determine denominator for percentage calculations
    const denominator = totalIncome90 > 0 ? totalIncome90 : Math.max(totalSpent90, 1);

    // User percentages
    const userFoodPct = safeNum((categorySpending.food / denominator) * 100);
    const userHousingPct = safeNum((categorySpending.housing / denominator) * 100);
    const userShoppingPct = safeNum((categorySpending.shopping / denominator) * 100);
    const userTransportPct = safeNum((categorySpending.transport / denominator) * 100);

    // Savings %: Tracked savings expenses + residual unspent income
    const residualSavings = Math.max(0, totalIncome90 - totalSpent90);
    const totalSavings = categorySpending.savings + residualSavings;
    const userSavingsPct = safeNum((totalSavings / denominator) * 100);

    // Benchmark targets
    const benchmarkFood = parseFloat(activeBenchmark.food_pct);
    const benchmarkHousing = parseFloat(activeBenchmark.housing_pct);
    const benchmarkShopping = parseFloat(activeBenchmark.shopping_pct);
    const benchmarkTransport = parseFloat(activeBenchmark.transport_pct);
    const benchmarkSavings = parseFloat(activeBenchmark.savings_pct);

    const comparisons = [
      {
        category: 'Food & Dining',
        userPct: Math.round(userFoodPct),
        benchmarkPct: Math.round(benchmarkFood),
        delta: Math.round(userFoodPct - benchmarkFood),
        userAmount: Math.round(categorySpending.food / 3),
        benchmarkAmount: Math.round((benchmarkFood / 100) * effectiveMonthlyIncome),
        icon: 'Utensils',
      },
      {
        category: 'Housing & Utilities',
        userPct: Math.round(userHousingPct),
        benchmarkPct: Math.round(benchmarkHousing),
        delta: Math.round(userHousingPct - benchmarkHousing),
        userAmount: Math.round(categorySpending.housing / 3),
        benchmarkAmount: Math.round((benchmarkHousing / 100) * effectiveMonthlyIncome),
        icon: 'Home',
      },
      {
        category: 'Shopping & Discretionary',
        userPct: Math.round(userShoppingPct),
        benchmarkPct: Math.round(benchmarkShopping),
        delta: Math.round(userShoppingPct - benchmarkShopping),
        userAmount: Math.round(categorySpending.shopping / 3),
        benchmarkAmount: Math.round((benchmarkShopping / 100) * effectiveMonthlyIncome),
        icon: 'ShoppingBag',
      },
      {
        category: 'Transport & Travel',
        userPct: Math.round(userTransportPct),
        benchmarkPct: Math.round(benchmarkTransport),
        delta: Math.round(userTransportPct - benchmarkTransport),
        userAmount: Math.round(categorySpending.transport / 3),
        benchmarkAmount: Math.round((benchmarkTransport / 100) * effectiveMonthlyIncome),
        icon: 'Car',
      },
      {
        category: 'Savings & Investments',
        userPct: Math.round(userSavingsPct),
        benchmarkPct: Math.round(benchmarkSavings),
        delta: Math.round(userSavingsPct - benchmarkSavings),
        userAmount: Math.round(totalSavings / 3),
        benchmarkAmount: Math.round((benchmarkSavings / 100) * effectiveMonthlyIncome),
        icon: 'PiggyBank',
      },
    ];

    // 5. Calculate Peer Alignment Score (0-100)
    const totalAbsoluteDeviation = comparisons.reduce((sum, item) => sum + Math.abs(item.delta), 0);
    const alignmentScore = safeBound(100 - totalAbsoluteDeviation * 1.2, 20, 100, 85);

    // 6. Generate Actionable Comparative Takeaways
    const insights = [];

    const shoppingComp = comparisons.find((c) => c.category.includes('Shopping'));
    if (shoppingComp && shoppingComp.delta > 3) {
      insights.push({
        type: 'warning',
        title: 'Shopping exceeds peer average',
        text: `Your shopping allocation is ${shoppingComp.delta}% higher than urban peers in ${activeBenchmark.tier_name}. Trimming impulse purchases can free up ~₹${Math.round((shoppingComp.delta / 100) * effectiveMonthlyIncome).toLocaleString()}/mo.`,
        icon: 'AlertCircle',
      });
    }

    const savingsComp = comparisons.find((c) => c.category.includes('Savings'));
    if (savingsComp && savingsComp.delta >= 0) {
      insights.push({
        type: 'success',
        title: 'Healthy Savings Velocity',
        text: `Your savings rate of ${savingsComp.userPct}% meets or exceeds the macroeconomic benchmark (${savingsComp.benchmarkPct}%). You are building capital faster than the average urban earner.`,
        icon: 'CheckCircle2',
      });
    } else if (savingsComp && savingsComp.delta < 0) {
      insights.push({
        type: 'alert',
        title: 'Opportunity to boost savings',
        text: `Your savings rate is ${Math.abs(savingsComp.delta)}% below the ${activeBenchmark.tier_name} standard (${savingsComp.benchmarkPct}%). Target automating small deposits into your Savings Vault on payday.`,
        icon: 'TrendingUp',
      });
    }

    const foodComp = comparisons.find((c) => c.category.includes('Food'));
    if (foodComp && foodComp.delta <= 0) {
      insights.push({
        type: 'success',
        title: 'Efficient Grocery & Food Budget',
        text: `You spend ${Math.abs(foodComp.delta)}% less on food than peers in your income bracket, preserving valuable monthly cashflow.`,
        icon: 'Utensils',
      });
    }

    if (insights.length < 2) {
      insights.push({
        type: 'info',
        title: 'Balanced Urban Lifestyle',
        text: `Your spending profile closely adheres to the verified Indian Urban Household Expenditure indices (MoSPI / RBI) for ${activeBenchmark.tier_name}.`,
        icon: 'Scale',
      });
    }

    res.json({
      activeTier: activeBenchmark,
      availableTiers: allTiers,
      effectiveMonthlyIncome: Math.round(effectiveMonthlyIncome),
      alignmentScore,
      comparisons,
      insights: insights.slice(0, 3),
      dataNotice: 'Benchmarks calibrated against MoSPI Urban Household Consumption & RBI Consumer Surveys.',
    });
  } catch (error) {
    next(error);
  }
};
