export const autoRebalance = (currentBudgets, overspentCategory, monthlyIncome) => {
  const adjustments = {};
  for (const [category, amount] of Object.entries(currentBudgets)) {
    if (category !== overspentCategory) {
      adjustments[category] = Math.max(0, amount - (amount * 0.1));
    }
  }
  return adjustments;
};

// New function for personalized budget calculation
export const calculatePersonalizedBudget = (monthlyIncome, expenseHistory = [], activeCategories = [], activeGoals = []) => {
  // Calculate average monthly spending for each category using actual calendar months
  const categoryAverages = {};
  const currentDate = new Date();

  // Get all unique months in the expense history
  const allMonths = new Set(expenseHistory.map(expense => expense.month));
  const historicalMonths = allMonths.size;

  for (const category of activeCategories) {
    const catName = typeof category === 'string' ? category : category.name;
    const categoryHistory = expenseHistory.filter(expense => expense.category === catName);
    const totalSpending = categoryHistory.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
    categoryAverages[catName] = historicalMonths > 0 ? totalSpending / historicalMonths : 0;
  }

  // Calculate required goal contributions with explicit status handling
  let goalContributions = 0;
  const goalStatuses = [];
  const goalShortfall = 0;

  for (const goal of (activeGoals || [])) {
    const target = parseFloat(goal.targetAmount || goal.target_amount || 0);
    const current = parseFloat(goal.currentAmount || goal.current_amount || 0);
    const remainingAmount = Math.max(0, target - current);
    const deadlineDate = new Date(goal.deadline);
    const monthsRemaining = Math.max(1, Math.ceil((deadlineDate - currentDate) / (1000 * 60 * 60 * 24 * 30)));

    let status = 'active';
    let monthlyContribution = 0;

    if (remainingAmount <= 0) {
      status = 'completed';
    } else if (monthsRemaining <= 0) {
      status = 'overdue';
      monthlyContribution = remainingAmount;
    } else {
      monthlyContribution = remainingAmount / monthsRemaining;
    }

    goalContributions += monthlyContribution;
    goalStatuses.push({ goalId: goal.id, status, monthlyContribution, remainingAmount, monthsRemaining });
  }

  // Calculate essential spending baseline
  const essentialCategories = activeCategories.filter(category => {
    const catType = typeof category === 'string' ? 'need' : category.type;
    return catType === 'need';
  });
  const essentialBaseline = essentialCategories.reduce((sum, category) => {
    const catName = typeof category === 'string' ? category : category.name;
    return sum + (categoryAverages[catName] || 0);
  }, 0);

  // Calculate buffer (10% of income or 20% of essential baseline, whichever is larger)
  const buffer = Math.max(0.1 * (monthlyIncome || 0), 0.2 * essentialBaseline);

  // Calculate available discretionary money
  let availableDiscretionary = Math.max(0, (monthlyIncome || 0) - essentialBaseline - goalContributions - buffer);
  let essentialShortfall = 0;

  if (essentialBaseline > (monthlyIncome || 0)) {
    essentialShortfall = essentialBaseline - (monthlyIncome || 0);
    availableDiscretionary = 0;
  }

  // Allocate discretionary money
  const discretionaryCategories = activeCategories.filter(category => {
    const catType = typeof category === 'string' ? 'want' : category.type;
    return catType === 'want';
  });
  const discretionaryBudget = {};

  if (discretionaryCategories.length > 0) {
    const categoriesWithHistory = discretionaryCategories.filter(category => {
      const catName = typeof category === 'string' ? category : category.name;
      return (categoryAverages[catName] || 0) > 0;
    });

    if (categoriesWithHistory.length > 0) {
      const totalDiscretionaryAverage = categoriesWithHistory.reduce((sum, category) => {
        const catName = typeof category === 'string' ? category : category.name;
        return sum + (categoryAverages[catName] || 0);
      }, 0);

      for (const category of discretionaryCategories) {
        const catName = typeof category === 'string' ? category : category.name;
        if ((categoryAverages[catName] || 0) > 0 && totalDiscretionaryAverage > 0) {
          const ratio = (categoryAverages[catName] || 0) / totalDiscretionaryAverage;
          discretionaryBudget[catName] = Math.round(availableDiscretionary * ratio);
        } else {
          discretionaryBudget[catName] = 0;
        }
      }
    } else {
      // No discretionary categories with history - allocate equally
      const equalShare = Math.round(availableDiscretionary / discretionaryCategories.length);
      for (const category of discretionaryCategories) {
        const catName = typeof category === 'string' ? category : category.name;
        discretionaryBudget[catName] = equalShare;
      }
    }
  }

  // Combine essential and discretionary budgets
  const budget = {};
  for (const category of activeCategories) {
    const catName = typeof category === 'string' ? category : category.name;
    const catType = typeof category === 'string' ? 'need' : category.type;
    if (catType === 'need') {
      budget[catName] = Math.round(categoryAverages[catName] || 0);
    } else {
      budget[catName] = discretionaryBudget[catName] || 0;
    }
  }

  // Verify total budget does not exceed income
  const totalBudget = Object.values(budget).reduce((sum, val) => sum + val, 0) + goalContributions + buffer;
  const budgetExceedsIncome = totalBudget > (monthlyIncome || 0);

  return {
    budgets: budget,
    monthlyIncome,
    essentialBaseline,
    goalContributions,
    buffer,
    availableDiscretionary,
    historicalMonths,
    hasExpenseHistory: historicalMonths > 0,
    essentialShortfall,
    goalShortfall,
    goalStatuses,
    budgetExceedsIncome
  };
};

export const generateAIBudget = (monthlyIncome, activeCategories = []) => {
  // Percentages that add up to 100% when ALL 7 categories are active
  const baseAllocations = {
    'Food': 0.20,
    'Shopping': 0.10,
    'Transport': 0.10,
    'Bills': 0.25,
    'Entertainment': 0.10,
    'Savings': 0.15,
    'Investments': 0.10,
  };

  const budget = {};
  let totalPercentage = 0;

  // Only use ACTIVE categories
  for (const category of activeCategories) {
    const ratio = baseAllocations[category] || 0.10;
    budget[category] = Math.round(monthlyIncome * ratio);
    totalPercentage += ratio;
  }

  // Normalize to 100%
  if (totalPercentage > 0 && totalPercentage !== 1) {
    const factor = 1 / totalPercentage;
    for (const category of Object.keys(budget)) {
      budget[category] = Math.round(budget[category] * factor);
    }
  }

  // Fix rounding errors
  const currentTotal = Object.values(budget).reduce((sum, val) => sum + val, 0);
  const difference = monthlyIncome - currentTotal;
  
  if (difference !== 0 && Object.keys(budget).length > 0) {
    const largestCategory = Object.keys(budget).reduce((a, b) => 
      budget[a] > budget[b] ? a : b
    );
    budget[largestCategory] += difference;
  }

  return budget;
};