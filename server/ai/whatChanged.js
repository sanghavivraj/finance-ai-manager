import ContextBuilder from './contextBuilder.js';
import FinancialIntelligenceEngine from './financialIntelligenceEngine.js';

class WhatChanged {
  constructor(userId) {
    this.contextBuilder = new ContextBuilder(userId);
    this.financialEngine = new FinancialIntelligenceEngine(userId);
  }

  async detectChanges() {
    const context = await this.contextBuilder.buildContext();

    // Calculate meaningful changes
    const changes = {
      significantSpendingChanges: [],
      budgetChanges: [],
      goalChanges: []
    };

    // Detect significant spending changes
    for (const budget of (context.budgets || [])) {
      const catLower = (budget.category || '').toLowerCase();
      const isAsset = ['savings', 'investments'].includes(catLower);
      const allocated = budget.allocated || 0;
      if (allocated > 0) {
        const changePercentage = ((budget.spent - allocated) / allocated) * 100;
        if (Math.abs(changePercentage) > 20) {
          changes.significantSpendingChanges.push({
            category: budget.category,
            isAsset,
            changePercentage,
            oldAmount: allocated,
            newAmount: budget.spent
          });
        }
      }
    }

    // Detect budget changes (Exclude Savings & Investments)
    for (const budget of (context.budgets || [])) {
      const catLower = (budget.category || '').toLowerCase();
      const isAsset = ['savings', 'investments'].includes(catLower);
      if (!isAsset && budget.remaining < 0) {
        changes.budgetChanges.push({
          category: budget.category,
          remaining: budget.remaining
        });
      }
    }

    // Detect goal changes
    for (const goal of (context.goals || [])) {
      const target = goal.targetAmount || 1;
      const progress = target > 0 ? (goal.currentAmount / target) * 100 : 0;
      if (progress > 70) {
        changes.goalChanges.push({
          progress,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount
        });
      }
    }

    // Get AI explanation for changes
    const explanation = await this.financialEngine.getAIExplanation(context, "Explain recent financial shifts and celebrate positive savings milestones:");

    return {
      changes,
      explanation
    };
  }
}

export default WhatChanged;