import ContextBuilder from './contextBuilder.js';
import FinancialIntelligenceEngine from './financialIntelligenceEngine.js';

class AskYourMoney {
  constructor(userId) {
    this.contextBuilder = new ContextBuilder(userId);
    this.financialEngine = new FinancialIntelligenceEngine(userId);
  }

  async ask(question) {
    const context = await this.contextBuilder.buildContext();
    const explanation = await this.financialEngine.getAIExplanation(context, question);
    return explanation;
  }
}

export default AskYourMoney;