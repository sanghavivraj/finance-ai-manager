import ContextBuilder from './contextBuilder.js';
import FinancialIntelligenceEngine from './financialIntelligenceEngine.js';

class ProactiveInsight {
  constructor(userId) {
    this.contextBuilder = new ContextBuilder(userId);
    this.financialEngine = new FinancialIntelligenceEngine(userId);
  }

  async detectInsights() {
    const context = await this.contextBuilder.buildContext();

    // Detect meaningful insights
    const insights = {
      budgetAlerts: [],
      spendingAlerts: [],
      goalAlerts: []
    };

    // Detect budget alerts (Exclude Savings & Investments from negative budget breaches)
    for (const budget of (context.budgets || [])) {
      const catLower = (budget.category || '').toLowerCase();
      const isAsset = ['savings', 'investments'].includes(catLower);
      if (!isAsset && budget.remaining < 0) {
        insights.budgetAlerts.push({
          category: budget.category,
          remaining: budget.remaining
        });
      }
    }

    // Detect spending alerts (Exclude Savings & Investments — saving more is positive!)
    for (const budget of (context.budgets || [])) {
      const catLower = (budget.category || '').toLowerCase();
      const isAsset = ['savings', 'investments'].includes(catLower);
      const allocated = budget.allocated || 0;
      if (!isAsset && allocated > 0) {
        const changePercentage = ((budget.spent - allocated) / allocated) * 100;
        if (changePercentage > 30) { // More than 30% increase
          insights.spendingAlerts.push({
            category: budget.category,
            changePercentage
          });
        }
      }
    }

    // Detect goal alerts
    for (const goal of (context.goals || [])) {
      const target = goal.targetAmount || 1;
      const progress = target > 0 ? (goal.currentAmount / target) * 100 : 0;
      if (progress < 50) {
        insights.goalAlerts.push({
          progress,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount
        });
      }
    }

    // Get AI explanation for insights
    const explanation = await this.financialEngine.getAIExplanation(context, "Explain the following financial insights in a clear, constructive tone:");

    return {
      insights,
      explanation
    };
  }
}

export default ProactiveInsight;