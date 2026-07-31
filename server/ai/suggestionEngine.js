// Strong, actionable solutions for every category
const STRONG_SOLUTIONS = {
  Food: [
    "🍳 **Cook at home** for the next 5 days. Avoid Zomato/Swiggy completely.",
    "🛒 **Meal Prep:** Cook large batches on Sunday to avoid daily spending.",
    "🥪 **Pack Lunch:** Take food to office/college. Saves ~₹150/day.",
  ],
  Shopping: [
    "🛑 **The 24-Hour Rule:** Wait 24 hours before buying anything over ₹500.",
    " **Unsubscribe:** Remove yourself from Myntra/Ajio emails to stop impulse buys.",
    "📦 **Sell Unused Items:** List 3 things on OLX/Quikr to recover funds.",
  ],
  Transport: [
    "🚲 **Walk/Cycle:** For distances under 2km, do not use Uber/Ola.",
    "⛽ **Carpool:** Share rides with colleagues to split fuel costs by 50%.",
    "🚌 **Public Transit:** Switch to Metro/Bus for the next 2 weeks.",
  ],
  Bills: [
    "💡 **Audit Subscriptions:** Cancel Netflix/Spotify if not used daily. Use family plans.",
    "📉 **Negotiate:** Call your internet provider and ask for a retention discount.",
    "🔌 **Energy Save:** Turn off AC 1 hour before sleeping to cut electricity bills.",
  ],
  Entertainment: [
    "🎬 **Free Alternatives:** Use free tiers or library apps instead of paid movies.",
    "🎮 **Gaming:** Stick to one game; avoid micro-transactions this month.",
    " **Host at Home:** Invite friends over instead of going to expensive clubs.",
  ],
};

export function generateSuggestions({ budgets, spent, monthlyIncome }) {
  const tips = [];
  const totalSpent = Object.values(spent).reduce((a, b) => a + b, 0);
  const remaining = monthlyIncome - totalSpent;

  // 1. Over-budget detection with STRONG solutions
  for (const [cat, budget] of Object.entries(budgets)) {
    const s = spent[cat] || 0;
    if (s > budget) {
      const overBy = s - budget;
      const solutions = STRONG_SOLUTIONS[cat] || ["Review your spending habits."];
      // Pick a random strong solution
      const randomTip = solutions[Math.floor(Math.random() * solutions.length)];
      
      tips.push({
        type: 'critical',
        title: `🚨 ${cat} is Over Budget by ₹${overBy.toFixed(0)}`,
        body: `You have spent ₹${s.toFixed(0)} of your ₹${budget.toFixed(0)} limit.`,
        solution: randomTip, // The strong advice
      });
    } else if (s > budget * 0.85) {
      tips.push({
        type: 'warning',
        title: `⚠️ ${cat} is almost full (${((s / budget) * 100).toFixed(0)}%)`,
        body: `Slow down! You only have ₹${(budget - s).toFixed(0)} left for the rest of the month.`,
        solution: "Pause non-essential spending in this category immediately.",
      });
    }
  }

  // 2. Savings Rate
  const savings = (spent['Savings'] || 0) + (spent['Investments'] || 0);
  const savingsRate = monthlyIncome > 0 ? savings / monthlyIncome : 0;
  if (savingsRate < 0.2) {
    tips.push({
      type: 'tip',
      title: '💰 Low Savings Rate',
      body: `You are saving only ${(savingsRate * 100).toFixed(0)}%. Aim for 20% to build wealth.`,
      solution: "Set up an auto-transfer of ₹2000 to a separate savings account on the 1st of every month.",
    });
  }

  // 3. Remaining Balance
  if (remaining < 0) {
    tips.push({
      type: 'critical',
      title: '🔴 Critical: You are in Debt',
      body: `You have overspent your income by ₹${Math.abs(remaining).toFixed(0)}.`,
      solution: "Stop all discretionary spending immediately. Focus only on Food and Bills.",
    });
  }

  return tips.slice(0, 5);
}