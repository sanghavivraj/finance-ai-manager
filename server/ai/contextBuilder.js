import FinancialIntelligenceEngine from './financialIntelligenceEngine.js';

class ContextBuilder {
  constructor(userId) {
    this.financialEngine = new FinancialIntelligenceEngine(userId);
  }

  async buildContext() {
    const financialContext = await this.financialEngine.getFinancialContext();

    // Build structured context for AI
    const structuredContext = {
      monthlyIncome: financialContext.monthlyIncome,
      budgets: financialContext.budgets.map(budget => ({
        category: budget.category_name,
        allocated: budget.amount,
        spent: budget.spent,
        remaining: budget.amount - budget.spent
      })),
      healthScore: financialContext.healthScore,
      expenseHistory: financialContext.expenseHistory,
      goals: (financialContext.goals || []).map(goal => ({
        id: goal.id,
        name: goal.name || 'Savings Goal',
        targetAmount: parseFloat(goal.targetAmount || goal.target_amount || 0),
        currentAmount: parseFloat(goal.currentAmount || goal.current_amount || 0),
        deadline: goal.deadline
      }))
    };

    return structuredContext;
  }
}

export default ContextBuilder;