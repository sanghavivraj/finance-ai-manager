import ContextBuilder from './contextBuilder.js';
import FinancialIntelligenceEngine from './financialIntelligenceEngine.js';

class GoalIntelligence {
  constructor(userId) {
    this.contextBuilder = new ContextBuilder(userId);
    this.financialEngine = new FinancialIntelligenceEngine(userId);
  }

  async analyzeGoals() {
    const context = await this.contextBuilder.buildContext();

    // Analyze goals
    const goalAnalysis = [];

    for (const goal of (context.goals || [])) {
      const target = parseFloat(goal.targetAmount || 1);
      const current = parseFloat(goal.currentAmount || 0);
      const progress = target > 0 ? (current / target) * 100 : 0;
      const remainingAmount = Math.max(0, target - current);
      const deadline = new Date(goal.deadline);
      const currentDate = new Date();
      const monthsRemaining = Math.max(1, Math.ceil((deadline - currentDate) / (1000 * 60 * 60 * 24 * 30)));
      const monthlyContribution = monthsRemaining > 0 ? remainingAmount / monthsRemaining : remainingAmount;

      let status = 'onTrack';
      if (progress < 50) {
        status = 'behind';
      } else if (progress >= 100) {
        status = 'ahead';
      }

      goalAnalysis.push({
        id: goal.id,
        name: goal.name || 'Savings Goal',
        status,
        progress: Math.min(100, progress),
        targetAmount: target,
        currentAmount: current,
        remainingAmount,
        monthlyContribution: Math.round(monthlyContribution),
        monthsRemaining
      });
    }

    // Get AI explanation for goal analysis
    const explanation = await this.financialEngine.getAIExplanation(context, "Explain the following goal analysis:");

    return {
      goalAnalysis,
      explanation
    };
  }
}

export default GoalIntelligence;