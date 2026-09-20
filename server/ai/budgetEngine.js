export const autoRebalance = (currentBudgets, overspentCategory, monthlyIncome) => {
  const adjustments = {};
  for (const [category, amount] of Object.entries(currentBudgets)) {
    if (category !== overspentCategory) {
      adjustments[category] = Math.max(0, amount - (amount * 0.1));
    }
  }
  return adjustments;
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