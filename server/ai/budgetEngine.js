// Heuristic AI: allocates monthly income across categories using
// a 50/30/20-inspired rule, tuned by user's historical spending.
const DEFAULT_RATIOS = {
  Food: 0.15,
  Shopping: 0.10,
  Transport: 0.10,
  Bills: 0.15,
  Entertainment: 0.05,
  Savings: 0.20,
  Investments: 0.25,
};

export function generateBudgets(monthlyIncome, historyByCategory = {}) {
  const budgets = {};
  let total = 0;

  for (const [cat, baseRatio] of Object.entries(DEFAULT_RATIOS)) {
    const spent = historyByCategory[cat] || 0;
    // adapt ratio: if user spent more last month, nudge up (capped)
    let ratio = baseRatio;
    if (monthlyIncome > 0 && spent > 0) {
      const histRatio = spent / monthlyIncome;
      ratio = baseRatio * 0.6 + histRatio * 0.4;
      ratio = Math.max(0.02, Math.min(0.4, ratio));
    }
    budgets[cat] = Math.round(monthlyIncome * ratio * 100) / 100;
    total += budgets[cat];
  }

  // Normalize so sum == monthlyIncome
  if (total > 0) {
    const factor = monthlyIncome / total;
    for (const cat of Object.keys(budgets)) {
      budgets[cat] = Math.round(budgets[cat] * factor * 100) / 100;
    }
  }
  return budgets;
}

// Auto-rebalance: when a category is over budget, shrink the others
// proportionally so total budget stays = monthlyIncome.
export function autoRebalance(budgets, overSpentCategory, monthlyIncome) {
  const result = { ...budgets };
  const overspent = result[overSpentCategory] || 0;
  if (overspent <= monthlyIncome) return result;

  const excess = overspent - monthlyIncome;
  const others = Object.keys(result).filter(c => c !== overSpentCategory);
  const othersTotal = others.reduce((s, c) => s + result[c], 0);
  if (othersTotal <= 0) return result;

  for (const c of others) {
    const share = result[c] / othersTotal;
    result[c] = Math.max(0, Math.round((result[c] - excess * share) * 100) / 100);
  }
  return result;
}