import { pool } from '../config/db.js';
import { generateAIBudget, autoRebalance } from '../ai/budgetEngine.js';
import { getCurrentMonthTotalIncome } from '../utils/incomeCalculator.js';
import { callGemini, extractJSON, isAIConfigured } from '../ai/geminiClient.js';


// ✅ FIXED LIST FUNCTION - Returns monthlyIncome correctly
export const list = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    // Get budgets
    const { rows: budgetRows } = await pool.query(
      `SELECT b.*, c.name as category_name, c.icon 
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3 AND c.is_active = true
       ORDER BY c.name`,
      [userId, month, year]
    );

    // Get total income for current month
    const { rows: incomeRows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM incomes 
       WHERE user_id=$1 
       AND EXTRACT(MONTH FROM date)=$2 
       AND EXTRACT(YEAR FROM date)=$3`,
      [userId, month, year]
    );

    const monthlyIncome = parseFloat(incomeRows[0].total);

    // ✅ Calculate spending for EACH budget category
    const budgetsWithSpending = await Promise.all(
      budgetRows.map(async (budget) => {
        const { rows: spentRows } = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as total 
           FROM expenses 
           WHERE user_id=$1 
           AND category_id=$2 
           AND EXTRACT(MONTH FROM date)=$3 
           AND EXTRACT(YEAR FROM date)=$4`,
          [userId, budget.category_id, month, year]
        );

        return {
          ...budget,
          spent: parseFloat(spentRows[0].total)
        };
      })
    );

    res.json({
      budgets: budgetsWithSpending,
      monthlyIncome: monthlyIncome
    });
  } catch (e) {
    console.error("BUDGET LIST ERROR:", e);
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    
    // Validate amount
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    
    await pool.query(
      `UPDATE budgets SET amount=$1, is_ai_generated=false WHERE id=$2 AND user_id=$3`,
      [amount, id, req.user.id]
    );
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const rebalance = async (req, res, next) => {
  try {
    const { categoryId, newSpent } = req.body;
    const now = new Date();
    const month = now.getMonth() + 1, year = now.getFullYear();
    const { rows: budgets } = await pool.query(
      `SELECT b.*, c.name FROM budgets b JOIN categories c ON c.id=b.category_id
       WHERE b.user_id=$1 AND b.month=$2 AND b.year=$3`,
      [req.user.id, month, year]
    );
    const { rows: u } = await pool.query(`SELECT monthly_income FROM users WHERE id=$1`, [req.user.id]);
    const income = parseFloat(u[0].monthly_income);

    const map = Object.fromEntries(budgets.map(b => [b.name, parseFloat(b.amount)]));
    const overCat = budgets.find(b => b.category_id == categoryId)?.name;
    map[overCat] = newSpent;
    const rebalanced = autoRebalance(map, overCat, income);

    for (const b of budgets) {
      await pool.query(`UPDATE budgets SET amount=$1 WHERE id=$2`,
        [rebalanced[b.name], b.id]);
    }
    res.json({ success: true, budgets: rebalanced });
  } catch (e) { next(e); }
};

export const generateWithAI = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const { monthly_limit, total_budget } = req.body || {};

    // 1. Determine total monthly limit
    let totalMonthlyLimit = parseFloat(monthly_limit || total_budget || 0);

    if (totalMonthlyLimit <= 0) {
      // Get TOTAL income from incomes table
      const { rows: incomeRows } = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total 
         FROM incomes 
         WHERE user_id=$1 
         AND EXTRACT(MONTH FROM date)=$2 
         AND EXTRACT(YEAR FROM date)=$3`,
        [userId, month, year]
      );
      totalMonthlyLimit = parseFloat(incomeRows[0]?.total || 0);

      if (totalMonthlyLimit === 0) {
        const { rows: u } = await pool.query(`SELECT monthly_income FROM users WHERE id=$1`, [userId]);
        totalMonthlyLimit = parseFloat(u[0]?.monthly_income || 0);
      }

      if (totalMonthlyLimit === 0) {
        totalMonthlyLimit = 25000; // Sensible default benchmark
      }
    }

    // Get ONLY ACTIVE categories
    const { rows: activeCats } = await pool.query(
      `SELECT name FROM categories WHERE is_active = true ORDER BY id`
    );

    const activeCategoryNames = activeCats.map(c => c.name);

    if (activeCategoryNames.length === 0) {
      return res.status(400).json({
        error: 'No active categories. Enable at least one category!'
      });
    }

    // Generate budget
    const { generateAIBudget } = await import('../ai/budgetEngine.js');
    const newBudgets = generateAIBudget(totalMonthlyLimit, activeCategoryNames);

    // DELETE ALL existing budgets for this month
    await pool.query(
      `DELETE FROM budgets WHERE user_id=$1 AND month=$2 AND year=$3`,
      [userId, month, year]
    );

    // Insert new budgets
    const { rows: allCats } = await pool.query(`SELECT id, name FROM categories`);
    const catMap = Object.fromEntries(allCats.map(c => [c.name, c.id]));

    for (const [categoryName, amount] of Object.entries(newBudgets)) {
      if (catMap[categoryName]) {
        await pool.query(
          `INSERT INTO budgets (user_id, category_id, amount, month, year, is_ai_generated) 
           VALUES ($1, $2, $3, $4, $5, true)`,
          [userId, catMap[categoryName], amount, month, year]
        );
      }
    }

    res.json({
      success: true,
      message: 'AI Guardrails generated successfully!',
      totalLimit: totalMonthlyLimit,
      budgets: newBudgets
    });
  } catch (e) {
    console.error("GENERATE AI ERROR:", e);
    next(e);
  }
};


// ==========================================
// 🛡️ INDIAN MARKET CATEGORY PRICE FLOORS & INTELLIGENCE RULES
// ==========================================
export const CATEGORY_MARKET_RULES = [
  {
    category: 'Motorcycles / Two-Wheelers',
    keywords: ['bike', 'motorcycle', 'bullet', 'pulsar', 'splendor', 'royal enfield', 'ktm', 'yamaha', 'two wheeler', 'two-wheeler', 'shine', 'platina', 'apache', 'duke'],
    minFloor: 50000,
    defaultBenchmark: 85000,
    typicalRange: { min: 65000, max: 180000 },
    icon: '🏍️',
    suggestedCategory: 'Transport',
    clarification: 'motorcycle / petrol or electric two-wheeler in India (e.g. Hero Splendor, Honda Shine, Bajaj Pulsar, Royal Enfield) — NEVER a push bicycle',
    floorNote: 'In India, a new motorcycle starts at ₹50,000+ (e.g. Hero HF/Splendor, Honda Shine).'
  },
  {
    category: 'Scooters / Mopeds',
    keywords: ['scooty', 'scooter', 'activa', 'jupiter', 'access 125', 'ola s1', 'ather', 'chetak', 'burgman', 'iqube', 'tvs ntorq', 'pep+'],
    minFloor: 45000,
    defaultBenchmark: 80000,
    typicalRange: { min: 60000, max: 125000 },
    icon: '🛵',
    suggestedCategory: 'Transport',
    clarification: 'gearless scooter / electric scooter in India (e.g. Honda Activa 6G, TVS Jupiter, Suzuki Access 125, Ola S1)',
    floorNote: 'In India, a new gearless scooter starts around ₹45,000 to ₹75,000+.'
  },
  {
    category: 'Cars / Four-Wheelers',
    keywords: ['car', 'four wheeler', 'four-wheeler', 'suv', 'sedan', 'hatchback', 'maruti', 'hyundai', 'tata', 'swift', 'creta', 'thar', 'nexon', 'baleno', 'brezza', 'scorpio', 'innova'],
    minFloor: 350000,
    defaultBenchmark: 750000,
    typicalRange: { min: 500000, max: 1800000 },
    icon: '🚗',
    suggestedCategory: 'Transport',
    clarification: 'passenger car / automobile in India',
    floorNote: 'In India, a new passenger car starts around ₹3,50,000+ (e.g. Maruti Alto K10, S-Presso).'
  },
  {
    category: 'Bicycles',
    keywords: ['cycle', 'bicycle', 'pedal cycle', 'mtb', 'gear cycle', 'mountain bike', 'hero cycle', 'firefox', 'rockrider', 'btwin', 'hercules'],
    minFloor: 3000,
    defaultBenchmark: 9500,
    typicalRange: { min: 4500, max: 25000 },
    icon: '🚲',
    suggestedCategory: 'Transport',
    clarification: 'pedal bicycle in India',
    floorNote: 'Standard bicycles in India start around ₹3,000 to ₹8,000+.'
  },
  {
    category: 'Smartphones',
    keywords: ['phone', 'mobile', 'smartphone', 'iphone', 'samsung galaxy', 'oneplus', 'redmi', 'realme', 'vivo', 'oppo', 'pixel', 'motorola', 'iqoo', 'poco'],
    minFloor: 6000,
    defaultBenchmark: 22000,
    typicalRange: { min: 10000, max: 80000 },
    icon: '📱',
    suggestedCategory: 'Shopping',
    clarification: 'smartphone in India',
    floorNote: 'Modern Android smartphones in India start around ₹6,000+.'
  },
  {
    category: 'Laptops / Computers',
    keywords: ['laptop', 'notebook', 'macbook', 'chromebook', 'pc', 'computer', 'thinkpad', 'vivobook', 'ideapad', 'gaming laptop', 'tuf gaming'],
    minFloor: 22000,
    defaultBenchmark: 55000,
    typicalRange: { min: 32000, max: 125000 },
    icon: '💻',
    suggestedCategory: 'Shopping',
    clarification: 'laptop / notebook computer in India',
    floorNote: 'Basic entry laptops in India start at ₹22,000+.'
  },
  {
    category: 'Tablets / iPads',
    keywords: ['tablet', 'ipad', 'tab', 'galaxy tab', 'xiaomi pad', 'oneplus pad', 'ipad air', 'ipad pro'],
    minFloor: 10000,
    defaultBenchmark: 28000,
    typicalRange: { min: 15000, max: 65000 },
    icon: '📱',
    suggestedCategory: 'Shopping',
    clarification: 'tablet / iPad in India',
    floorNote: 'Tablets in India start around ₹10,000+.'
  },
  {
    category: 'Air Conditioners',
    keywords: ['ac', 'air conditioner', 'split ac', 'inverter ac', 'window ac', '1.5 ton ac', '1 ton ac', 'voltas ac', 'daikin', 'hitachi'],
    minFloor: 24000,
    defaultBenchmark: 36000,
    typicalRange: { min: 26000, max: 55000 },
    icon: '❄️',
    suggestedCategory: 'Bills',
    clarification: 'air conditioner in India',
    floorNote: 'New 1-ton to 1.5-ton ACs start at ₹24,000+ in India.'
  },
  {
    category: 'Refrigerators',
    keywords: ['fridge', 'refrigerator', 'single door fridge', 'double door fridge', 'frost free fridge', 'mini fridge'],
    minFloor: 11000,
    defaultBenchmark: 24000,
    typicalRange: { min: 14000, max: 50000 },
    icon: '🧊',
    suggestedCategory: 'Bills',
    clarification: 'refrigerator in India',
    floorNote: 'Single door refrigerators in India start around ₹11,000+.'
  },
  {
    category: 'Smart Televisions',
    keywords: ['tv', 'television', 'smart tv', 'oled tv', 'led tv', 'qled', '4k tv', 'sony bravia', 'mi tv'],
    minFloor: 9000,
    defaultBenchmark: 28000,
    typicalRange: { min: 15000, max: 75000 },
    icon: '📺',
    suggestedCategory: 'Entertainment',
    clarification: 'smart TV in India',
    floorNote: '32-inch Smart LED TVs start around ₹9,000+ in India.'
  },
  {
    category: 'Washing Machines',
    keywords: ['washing machine', 'washer', 'front load', 'top load', 'fully automatic washing machine', 'semi automatic'],
    minFloor: 9000,
    defaultBenchmark: 22000,
    typicalRange: { min: 12000, max: 42000 },
    icon: '🧺',
    suggestedCategory: 'Bills',
    clarification: 'washing machine in India',
    floorNote: 'Washing machines in India start around ₹9,000+.'
  },
  {
    category: 'Audio / Earbuds / Headphones',
    keywords: ['airpods', 'earbuds', 'earphones', 'headphones', 'tws', 'bluetooth headset', 'neckband', 'boat airdopes', 'galaxy buds', 'sony wh-1000xm'],
    minFloor: 800,
    defaultBenchmark: 3500,
    typicalRange: { min: 1500, max: 24000 },
    icon: '🎧',
    suggestedCategory: 'Shopping',
    clarification: 'earbuds / headphones in India',
    floorNote: 'True wireless earbuds start around ₹800 to ₹1,500+ in India.'
  },
  {
    category: 'Air Coolers',
    keywords: ['cooler', 'air cooler', 'desert cooler', 'room cooler', 'symphony cooler', 'kenstar cooler'],
    minFloor: 3500,
    defaultBenchmark: 8000,
    typicalRange: { min: 4500, max: 15000 },
    icon: '💨',
    suggestedCategory: 'Bills',
    clarification: 'air cooler in India',
    floorNote: 'Room air coolers in India start at ₹3,500+.'
  },
  {
    category: 'Smartwatches',
    keywords: ['smartwatch', 'apple watch', 'galaxy watch', 'fitness band', 'noise smartwatch', 'fire-boltt', 'amazfit'],
    minFloor: 1200,
    defaultBenchmark: 3500,
    typicalRange: { min: 1800, max: 35000 },
    icon: '⌚',
    suggestedCategory: 'Shopping',
    clarification: 'smartwatch in India',
    floorNote: 'Smartwatches in India start at ₹1,200+.'
  },
  {
    category: 'Kitchen Appliances',
    keywords: ['microwave', 'oven', 'air fryer', 'mixer', 'mixer grinder', 'geyser', 'water heater', 'water purifier', 'ro purifier', 'induction cooktop', 'chimney'],
    minFloor: 1500,
    defaultBenchmark: 5500,
    typicalRange: { min: 2500, max: 18000 },
    icon: '🍳',
    suggestedCategory: 'Bills',
    clarification: 'kitchen appliance in India',
    floorNote: 'Home and kitchen appliances in India start around ₹1,500+.'
  },
  {
    category: 'Shoes & Sneakers',
    keywords: ['shoes', 'sneakers', 'running shoes', 'nike shoes', 'adidas', 'puma', 'boots', 'sports shoes'],
    minFloor: 600,
    defaultBenchmark: 3500,
    typicalRange: { min: 1200, max: 14000 },
    icon: '👟',
    suggestedCategory: 'Shopping',
    clarification: 'footwear / shoes in India',
    floorNote: 'Brand footwear in India starts around ₹600+.'
  },
  {
    category: 'Clothing & Apparel',
    keywords: ['jacket', 'coat', 'hoodie', 'jeans', 'suit', 'blazer', 't-shirt', 'shirt', 'dress', 'saree', 'lehenga', 'kurta'],
    minFloor: 400,
    defaultBenchmark: 2500,
    typicalRange: { min: 800, max: 12000 },
    icon: '👗',
    suggestedCategory: 'Shopping',
    clarification: 'clothing / apparel in India',
    floorNote: 'Apparel in India starts around ₹400+.'
  }
];

/**
 * Resolves category rules, floor price caps, and market benchmarks using longest-match specificity.
 */
export const resolveMarketFloor = (itemQuery, customPrice = 0) => {
  const lower = itemQuery.toLowerCase().trim();
  let bestMatch = null;
  let longestKeywordLen = 0;

  for (const rule of CATEGORY_MARKET_RULES) {
    for (const kw of rule.keywords) {
      const isMatch =
        lower === kw ||
        lower.startsWith(kw + ' ') ||
        lower.endsWith(' ' + kw) ||
        lower.includes(' ' + kw + ' ');

      if (isMatch && kw.length > longestKeywordLen) {
        longestKeywordLen = kw.length;
        bestMatch = { rule, matchedKeyword: kw };
      }
    }
  }

  const matchedRule = bestMatch?.rule || null;
  let isBelowFloor = false;
  let effectiveBudget = customPrice;
  let estimatedPrice = matchedRule ? matchedRule.defaultBenchmark : 15000;
  let priceRange = matchedRule
    ? matchedRule.typicalRange
    : { min: Math.round(estimatedPrice * 0.8), max: Math.round(estimatedPrice * 1.2) };
  let icon = matchedRule?.icon || '🛍️';
  let suggestedCategory = matchedRule?.suggestedCategory || 'Shopping';
  let floorWarning = null;

  if (matchedRule) {
    if (customPrice > 0 && customPrice < matchedRule.minFloor) {
      isBelowFloor = true;
      effectiveBudget = matchedRule.defaultBenchmark;
      floorWarning = `${matchedRule.floorNote} Showing realistic options around the ₹${matchedRule.defaultBenchmark.toLocaleString('en-IN')} benchmark.`;
    } else if (customPrice >= matchedRule.minFloor) {
      effectiveBudget = customPrice;
      estimatedPrice = customPrice;
      priceRange = { min: Math.round(customPrice * 0.8), max: Math.round(customPrice * 1.2) };
    } else {
      // customPrice is 0 or unassigned
      effectiveBudget = matchedRule.defaultBenchmark;
      estimatedPrice = matchedRule.defaultBenchmark;
    }
  } else {
    if (customPrice > 0) {
      effectiveBudget = customPrice;
      estimatedPrice = customPrice;
      priceRange = { min: Math.round(customPrice * 0.8), max: Math.round(customPrice * 1.2) };
    }
  }

  const resolvedClarification = matchedRule
    ? `${itemQuery} — in Indian market this means: ${matchedRule.clarification}`
    : itemQuery;

  return {
    matchedRule,
    isBelowFloor,
    effectiveBudget: Math.round(effectiveBudget),
    estimatedPrice: Math.round(estimatedPrice),
    priceRange,
    icon,
    suggestedCategory,
    floorWarning,
    resolvedClarification,
  };
};

// ==========================================
// 💡 LIVE MARKET INTELLIGENCE — Google Search Grounded
// ==========================================
export const marketEstimate = async (req, res, next) => {
  try {
    const { item, price } = req.body;
    if (!item || !item.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const itemQuery = item.trim();
    const customPrice = parseFloat(price || 0);

    const {
      matchedRule,
      isBelowFloor,
      effectiveBudget,
      estimatedPrice,
      priceRange,
      icon,
      suggestedCategory,
      floorWarning,
      resolvedClarification,
    } = resolveMarketFloor(itemQuery, customPrice);

    if (!isAIConfigured()) {
      return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

    const prompt = `You are a real-time Indian market intelligence engine for 2026.
User is researching: "${resolvedClarification}"
Target Budget for alternatives: ₹${effectiveBudget.toLocaleString('en-IN')}

TASK:
1. Search live Indian e-commerce & retail market data (Amazon.in, Flipkart, official brand stores).
2. Recommend 4 real, specific brand and model alternatives available in India that match this exact item category.
3. PRICING & TIER RULES:
   - All alternative prices MUST be strictly cheaper than ₹${effectiveBudget.toLocaleString('en-IN')}.
   - Provide 4 distinct tiers scaled relative to ₹${effectiveBudget.toLocaleString('en-IN')}:
     • Alternative 1 (Top Pick / Premium Spec): ~85% to 92% of budget.
     • Alternative 2 (Best Value / Segment Leader): ~70% to 82% of budget.
     • Alternative 3 (Feature-Packed / Runner-Up): ~58% to 70% of budget.
     • Alternative 4 (Budget Champion / Max Savings): ~45% to 58% of budget.
   - If item is "mountain bike" or "cycle", suggest REAL BICYCLES (Decathlon Rockrider, Firefox, Hero Sprint, Btwin, Trek).
   - If item is "motorcycle" or "bike", suggest REAL MOTORCYCLES (Hero Splendor, Honda Shine, Bajaj Platina, Royal Enfield).
   - Use real brand names, real model variants, and authentic prices in INR.

Return ONLY this valid JSON (no markdown fences, no extra text):
{
  "estimatedPrice": ${estimatedPrice},
  "priceRange": { "min": ${priceRange.min}, "max": ${priceRange.max} },
  "suggestedCategory": "${suggestedCategory}",
  "icon": "${icon}",
  "itemSummary": "Top real-market alternatives for ${itemQuery} under ₹${effectiveBudget.toLocaleString('en-IN')} in India",
  "alternatives": [
    {
      "name": "<Brand + Model 1>",
      "price": <price in INR strictly below ${effectiveBudget}>,
      "savings": <${effectiveBudget} - price>,
      "reason": "<Specific advantage or feature in 1 sentence>",
      "badge": "Top Pick"
    },
    {
      "name": "<Brand + Model 2>",
      "price": <price in INR strictly below ${effectiveBudget}>,
      "savings": <${effectiveBudget} - price>,
      "reason": "<Specific advantage or feature in 1 sentence>",
      "badge": "Best Value"
    },
    {
      "name": "<Brand + Model 3>",
      "price": <price in INR strictly below ${effectiveBudget}>,
      "savings": <${effectiveBudget} - price>,
      "reason": "<Specific advantage or feature in 1 sentence>",
      "badge": "Smart Choice"
    },
    {
      "name": "<Brand + Model 4>",
      "price": <price in INR strictly below ${effectiveBudget}>,
      "savings": <${effectiveBudget} - price>,
      "reason": "<Specific advantage or feature in 1 sentence>",
      "badge": "Budget Champion"
    }
  ],
  "valueInsight": "<One sentence insight on cost-effectiveness, resale value, or warranty in India>",
  "costPerUse": "<Estimated daily or monthly running/ownership cost in INR>"
}`;

    let parsed = null;
    try {
      const rawText = await callGemini(prompt, { timeoutMs: 10000, useSearch: true });
      parsed = extractJSON(rawText);

      if (!parsed || !Array.isArray(parsed.alternatives) || parsed.alternatives.length === 0) {
        const directText = await callGemini(prompt, { timeoutMs: 8000, useSearch: false });
        parsed = extractJSON(directText);
      }
    } catch (aiErr) {
      console.warn('⚠️ Live AI query failed/quota reached, using intelligent market category synthesis:', aiErr.message || aiErr);
    }

    if (!parsed || !Array.isArray(parsed.alternatives) || parsed.alternatives.length === 0) {
      // High-availability category fallback synthesis with 4 rich alternatives
      const p1 = Math.round(effectiveBudget * 0.88);
      const p2 = Math.round(effectiveBudget * 0.74);
      const p3 = Math.round(effectiveBudget * 0.62);
      const p4 = Math.round(effectiveBudget * 0.50);

      let fallbackAlts = [];
      if (matchedRule?.category.includes('Bicycle')) {
        fallbackAlts = [
          {
            name: 'Decathlon Rockrider ST540 / ST100 27.5T MTB',
            price: Math.min(p1, Math.round(effectiveBudget * 0.88)),
            savings: Math.max(0, effectiveBudget - Math.min(p1, Math.round(effectiveBudget * 0.88))),
            reason: 'Lightweight aluminum frame, 80mm front suspension fork, and mechanical disc brakes for smooth trail riding.',
            badge: 'Top Spec MTB'
          },
          {
            name: 'Firefox Bikes Target 21S / Grunge 27.5T',
            price: Math.min(p2, Math.round(effectiveBudget * 0.75)),
            savings: Math.max(0, effectiveBudget - Math.min(p2, Math.round(effectiveBudget * 0.75))),
            reason: 'Equipped with Shimano 21-speed thumb shifters, dual disc brakes, and durable alloy double-wall rims.',
            badge: 'Best Overall Value'
          },
          {
            name: 'Hero Sprint Pro Reaction 27.5T Multi-Speed',
            price: Math.min(p3, Math.round(effectiveBudget * 0.62)),
            savings: Math.max(0, effectiveBudget - Math.min(p3, Math.round(effectiveBudget * 0.62))),
            reason: 'Rugged MTB frame with quick-release front wheel and ergonomic handlebar grip for city commuting.',
            badge: 'Popular Choice'
          },
          {
            name: 'Leader Scout 26T / Btwin MyBike Commuter',
            price: Math.min(p4, Math.round(effectiveBudget * 0.50)),
            savings: Math.max(0, effectiveBudget - Math.min(p4, Math.round(effectiveBudget * 0.50))),
            reason: 'High-tensile steel frame with low-maintenance rigid fork, ideal for daily fitness and local errands.',
            badge: 'Budget Champion'
          }
        ];
      } else if (matchedRule?.category.includes('Motorcycle')) {
        fallbackAlts = [
          {
            name: 'Hero Splendor Plus XTEC (100cc BS6 OBD2)',
            price: Math.min(p1, 79900),
            savings: Math.max(0, effectiveBudget - Math.min(p1, 79900)),
            reason: "India's highest selling commuter motorcycle with 65+ kmpl mileage, i3S start-stop tech, and maximum resale value.",
            badge: 'Top Mileage Pick'
          },
          {
            name: 'Honda Shine 125 (5-Speed Smooth Commuter)',
            price: Math.min(p2, 82500),
            savings: Math.max(0, effectiveBudget - Math.min(p2, 82500)),
            reason: 'Ultra-smooth 125cc eSP engine with a 5-speed gearbox for vibration-free cruising.',
            badge: 'Best Engine Refinement'
          },
          {
            name: 'Bajaj Platina 110 Drum (ComforTec Suspension)',
            price: Math.min(p3, 71400),
            savings: Math.max(0, effectiveBudget - Math.min(p3, 71400)),
            reason: 'Features long-travel ComforTec suspension and wide quilted seat for plush daily commuting on rough roads.',
            badge: 'Best Ride Comfort'
          },
          {
            name: 'Hero HF 100 / Deluxe (70+ kmpl Utility)',
            price: Math.min(p4, 56400),
            savings: Math.max(0, effectiveBudget - Math.min(p4, 56400)),
            reason: 'India’s most affordable reliable workhorse with lowest maintenance and highest fuel efficiency.',
            badge: 'Budget Champion'
          }
        ];
      } else if (matchedRule?.category.includes('Scooter')) {
        fallbackAlts = [
          {
            name: 'Honda Activa 6G (Smart Key Variant)',
            price: Math.min(p1, 79500),
            savings: Math.max(0, effectiveBudget - Math.min(p1, 79500)),
            reason: "India's #1 trusted family scooter with reliable H-Smart keyless tech and all-metal body durability.",
            badge: 'Market Leader'
          },
          {
            name: 'TVS Jupiter 110 (SmartXonnect)',
            price: Math.min(p2, 74200),
            savings: Math.max(0, effectiveBudget - Math.min(p2, 74200)),
            reason: 'Largest under-seat storage in segment, external fuel fill, and plush suspension for family comfort.',
            badge: 'Best Comfort'
          },
          {
            name: 'Suzuki Access 125 (Drum)',
            price: Math.min(p3, 81000),
            savings: Math.max(0, effectiveBudget - Math.min(p3, 81000)),
            reason: 'Peppy 125cc engine with lightweight handling and quick city acceleration.',
            badge: 'Top Performance'
          },
          {
            name: 'TVS Scooty Pep+ / Zest 110',
            price: Math.min(p4, 65500),
            savings: Math.max(0, effectiveBudget - Math.min(p4, 65500)),
            reason: 'Ultra-lightweight scooter designed for effortless city parking and agile daily errands.',
            badge: 'Budget Pick'
          }
        ];
      } else if (matchedRule?.category.includes('Smartphone')) {
        fallbackAlts = [
          {
            name: 'OnePlus Nord CE4 / Realme 12 Pro 5G',
            price: p1,
            savings: Math.max(0, effectiveBudget - p1),
            reason: 'Fast Snapdragon processor, 120Hz AMOLED display, and 100W SuperVOOC fast charging.',
            badge: 'Top Performer'
          },
          {
            name: 'Motorola Edge 50 Fusion / Neo',
            price: p2,
            savings: Math.max(0, effectiveBudget - p2),
            reason: 'Clean bloatware-free Android UI, IP68 water resistance, and Sony Lytia OIS camera.',
            badge: 'Best Value'
          },
          {
            name: 'Redmi Note 13 Pro 5G',
            price: p3,
            savings: Math.max(0, effectiveBudget - p3),
            reason: 'Crystal-clear 200MP OIS camera, 1.5K 120Hz curved display, and fast charging.',
            badge: 'Camera Pick'
          },
          {
            name: 'Samsung Galaxy M34 5G (6000mAh)',
            price: p4,
            savings: Math.max(0, effectiveBudget - p4),
            reason: 'Massive 6000mAh battery, vibrant Super AMOLED screen, and 4 years of OS updates.',
            badge: 'Battery Champion'
          }
        ];
      } else if (matchedRule?.category.includes('Laptop')) {
        fallbackAlts = [
          {
            name: 'ASUS Vivobook 15 (Intel Core i5 12th Gen, 16GB RAM)',
            price: p1,
            savings: Math.max(0, effectiveBudget - p1),
            reason: 'Fast 12th Gen Core i5 processor with 16GB RAM for multitasking and fast boots.',
            badge: 'Top Performer'
          },
          {
            name: 'HP 15s (AMD Ryzen 5 5500U, 16GB RAM, 512GB SSD)',
            price: p2,
            savings: Math.max(0, effectiveBudget - p2),
            reason: 'Excellent balance of 6-core processing, 7-hour battery backup, and full HD anti-glare display.',
            badge: 'Best Overall Value'
          },
          {
            name: 'Lenovo IdeaPad Slim 3 (Ryzen 5 / Core i3)',
            price: p3,
            savings: Math.max(0, effectiveBudget - p3),
            reason: 'Slim profile, privacy shutter webcam, and Dolby Audio tuned speakers.',
            badge: 'Smart Workhorse'
          },
          {
            name: 'Acer Aspire Lite (AMD Ryzen 3 / Core i3, 512GB SSD)',
            price: p4,
            savings: Math.max(0, effectiveBudget - p4),
            reason: 'Ultra-affordable with fast NVMe SSD storage and premium metallic lid finish.',
            badge: 'Budget Champion'
          }
        ];
      } else {
        fallbackAlts = [
          {
            name: `Premium Top Spec for ${itemQuery}`,
            price: p1,
            savings: Math.max(0, effectiveBudget - p1),
            reason: 'Top-tier branded model with highest warranty coverage and premium build quality.',
            badge: 'Top Pick'
          },
          {
            name: `Segment Best Value for ${itemQuery}`,
            price: p2,
            savings: Math.max(0, effectiveBudget - p2),
            reason: 'Sweet-spot market alternative offering optimal price-to-performance ratio.',
            badge: 'Best Value'
          },
          {
            name: `Feature-Packed Alternative for ${itemQuery}`,
            price: p3,
            savings: Math.max(0, effectiveBudget - p3),
            reason: 'Popular consumer choice with balanced features and high customer satisfaction ratings.',
            badge: 'Smart Choice'
          },
          {
            name: `Economy Budget Choice for ${itemQuery}`,
            price: p4,
            savings: Math.max(0, effectiveBudget - p4),
            reason: 'Cost-effective alternative that fulfills all core requirements while maximizing immediate savings.',
            badge: 'Budget Champion'
          }
        ];
      }

      parsed = {
        estimatedPrice,
        priceRange,
        suggestedCategory,
        icon,
        itemSummary: `Live market alternatives for ${itemQuery} in India`,
        alternatives: fallbackAlts,
        valueInsight: `Evaluated against current Indian retail benchmarks and safe discretionary cash flow.`,
        costPerUse: `High daily utility value with strong price-to-performance ratio.`
      };
    }

    const finalEstimatedPrice = parsed.estimatedPrice || estimatedPrice;
    const finalPriceRange = parsed.priceRange || priceRange;

    const result = {
      item: itemQuery,
      estimatedPrice: finalEstimatedPrice,
      priceRange: finalPriceRange,
      suggestedCategory: parsed.suggestedCategory || suggestedCategory,
      icon: parsed.icon || icon,
      itemSummary: parsed.itemSummary || `Live market search for ${itemQuery}`,
      isBelowFloor,
      minFloor: matchedRule?.minFloor || null,
      floorWarning,
      alternatives: parsed.alternatives.map(a => {
        const altPrice = Math.round(Number(a.price) || (effectiveBudget * 0.8));
        return {
          name: a.name,
          price: altPrice,
          savings: Math.max(0, Math.round(effectiveBudget - altPrice)),
          reason: a.reason || 'High-value market alternative with proven reliability.',
          badge: a.badge || 'Live Market Pick',
        };
      }),
      valueInsight: parsed.valueInsight || 'Evaluated against current Indian retail and e-commerce pricing.',
      costPerUse: parsed.costPerUse || 'High daily utility value with strong price-to-performance ratio.',
    };

    res.json(result);
  } catch (e) {
    console.error('LIVE MARKET ESTIMATE ERROR:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch live market data. Please try again.' });
  }
};

// ==========================================
// 🛡️ PRE-SPEND SMART PURCHASE CHECKER DECISION ENGINE
// ==========================================
export const frictionCheck = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { item, amount, category = 'Shopping', timelineMonths = 1 } = req.body;
    const purchaseAmount = parseFloat(amount || 0);
    const chosenMonths = parseFloat(timelineMonths || 1);
    const isTimelineSplit = chosenMonths > 1;
    const monthlyInstallment = isTimelineSplit ? Math.round(purchaseAmount / chosenMonths) : purchaseAmount;
    const weeklyInstallment = Math.round(monthlyInstallment / 4.3);

    if (!item || purchaseAmount <= 0) {
      return res.status(400).json({ error: 'Valid item name and price amount are required.' });
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const currentDay = now.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);

    // 1. Get user income
    const { rows: incomeRows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM incomes
       WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3`,
      [userId, month, year]
    );
    let monthlyIncome = parseFloat(incomeRows[0]?.total || 0);
    if (monthlyIncome === 0) {
      const { rows: u } = await pool.query(`SELECT monthly_income FROM users WHERE id=$1`, [userId]);
      monthlyIncome = parseFloat(u[0]?.monthly_income || 0) || 25000;
    }

    // 2. Get active budgets
    const { rows: budgetRows } = await pool.query(
      `SELECT b.*, c.name as category_name FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3 AND c.is_active = true`,
      [userId, month, year]
    );

    // 3. COMPLEX CALCULATION: Fetch actual spent per category to calculate real remaining
    const { rows: spentRows } = await pool.query(
      `SELECT c.name as category_name, COALESCE(SUM(e.amount), 0) as total
       FROM expenses e JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = $1 AND EXTRACT(MONTH FROM e.date)=$2 AND EXTRACT(YEAR FROM e.date)=$3
       GROUP BY c.name`,
      [userId, month, year]
    );
    const spentByCategory = Object.fromEntries(spentRows.map(r => [r.category_name, parseFloat(r.total)]));

    const totalBudget = budgetRows.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0) || monthlyIncome;
    const billsBudget = budgetRows.filter(b => b.category_name === 'Bills').reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
    const savingsBudget = budgetRows.filter(b => ['Savings', 'Investments'].includes(b.category_name)).reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
    const discretionaryBudget = Math.max(0, totalBudget - billsBudget - savingsBudget);

    const totalSpent = spentRows.reduce((sum, e) => sum + parseFloat(e.total || 0), 0);
    const discretionarySpent = spentRows
      .filter(e => !['Bills', 'Savings', 'Investments'].includes(e.category_name))
      .reduce((sum, e) => sum + parseFloat(e.total || 0), 0);
      
    const remainingTotalBudget = Math.max(0, totalBudget - totalSpent);
    const zeroGuiltPool = Math.max(0, discretionaryBudget - discretionarySpent);
    const remainingPoolAfterPurchase = zeroGuiltPool - monthlyInstallment;
    const poolImpactPercent = zeroGuiltPool > 0 ? Math.round((monthlyInstallment / zeroGuiltPool) * 100) : 100;
    const safeDailyVelocity = daysRemaining > 0 ? remainingTotalBudget / daysRemaining : (monthlyIncome / 30);
    const runwayImpactDays = safeDailyVelocity > 0 ? parseFloat((monthlyInstallment / safeDailyVelocity).toFixed(1)) : 1;

    // ==========================================
    // 🧠 THE COMPLEX CALCULATION: DYNAMIC SACRIFICE ENGINE
    // ==========================================
    const shortfall = Math.max(0, monthlyInstallment - zeroGuiltPool);
    let categoryCuts = [];
    let remainingShortfall = shortfall;

    // Find which discretionary categories have the most room to cut
    const discretionaryCats = budgetRows
      .filter(b => !['Bills', 'Savings', 'Investments'].includes(b.category_name))
      .map(b => {
        const budget = parseFloat(b.amount || 0);
        const spent = spentByCategory[b.category_name] || 0;
        const remaining = Math.max(0, budget - spent);
        // We will mathematically cut up to 60% of the remaining budget to be safe
        const maxCut = remaining * 0.6; 
        return { name: b.category_name, budget, spent, remaining, maxCut };
      })
      .sort((a, b) => b.remaining - a.remaining); // Cut from largest remaining first

    for (const cat of discretionaryCats) {
      if (remainingShortfall <= 0) break;
      const cutAmount = Math.min(cat.maxCut, remainingShortfall);
      if (cutAmount > 100) { // Ignore tiny cuts under ₹100
        categoryCuts.push({
          category: cat.name,
          currentBudget: cat.budget,
          cutAmount: Math.round(cutAmount),
          newBudget: Math.round(cat.budget - cutAmount),
          percentCut: Math.round((cutAmount / cat.budget) * 100)
        });
        remainingShortfall -= cutAmount;
      }
    }
    // ==========================================

    // 4. Scoring Formula
    let rationalityScore = 1;
    let severity = 'safe';
    let isApproved = true;
    let defaultVerdict = isTimelineSplit ? '100% Safe Goal Pace' : '100% Safe to Buy: Guilt-Free';

    if (zeroGuiltPool <= 0 || monthlyInstallment > zeroGuiltPool) {
      const overextensionRatio = zeroGuiltPool > 0 ? (monthlyInstallment / zeroGuiltPool) : (monthlyInstallment / 1000);
      const hazardScore = Math.round(15 / Math.max(1, overextensionRatio));
      rationalityScore = Math.max(1, Math.min(15, hazardScore));
      severity = 'critical';
      isApproved = false;
      defaultVerdict = isTimelineSplit ? 'Exceeds Safe Monthly Buffer' : 'Major Budget Hazard: Exceeds Safe Money';
    } else {
      const poolRemainingRatio = (zeroGuiltPool - monthlyInstallment) / zeroGuiltPool;
      const computedScore = Math.round(16 + poolRemainingRatio * 82);
      rationalityScore = Math.max(16, Math.min(99, computedScore));
      if (rationalityScore >= 70) { severity = 'safe'; isApproved = true; defaultVerdict = isTimelineSplit ? '100% Safe Goal Pace' : '100% Safe to Buy: Guilt-Free'; } 
      else if (rationalityScore >= 40) { severity = 'balanced'; isApproved = true; defaultVerdict = isTimelineSplit ? 'Comfortable Monthly Pace' : 'Moderate Spend: Looks Good'; } 
      else { severity = 'warning'; isApproved = false; defaultVerdict = 'Tight Monthly Margin'; }
    }

    // 5. Intelligent AI Advisor Prompting (Now using the Complex Calculation)
    let psychologyAdvice = '';
    let alternativeAction = '';
    let verdict = defaultVerdict;

    if (isAIConfigured()) {
      try {
        const cutsString = categoryCuts.length > 0 
          ? categoryCuts.map(c => `- Reduce ${c.category} by ₹${c.cutAmount} (${c.percentCut}% cut). New limit: ₹${c.newBudget}`).join('\n') 
          : 'No category cuts needed. Fully covered by safe pool.';

        const prompt = `You are an expert, encouraging personal finance coach.
Current Year: 2026.
User wants to buy: "${item}" for ₹${purchaseAmount.toLocaleString()} over ${chosenMonths} months (₹${monthlyInstallment.toLocaleString()}/mo).
User's Safe Discretionary Cash (Zero-Guilt Pool): ₹${zeroGuiltPool.toLocaleString()}/mo.
Shortfall to cover: ₹${shortfall.toLocaleString()}/mo.

MATHEMATICAL SACRIFICE PLAN (Calculated from user's real budgets):
${cutsString}

INSTRUCTIONS:
1. Act as an active, encouraging coach. Reference the exact numbers (₹${monthlyInstallment.toLocaleString()}/mo pace, ₹${zeroGuiltPool.toLocaleString()} safe cash).
2. If safe (Score >= 70): Reassure them their bills are protected.
3. If tight/critical (Score < 70): Explicitly tell them to apply the Mathematical Sacrifice Plan above. Do NOT give generic advice. Tell them exactly which categories to cut based on the math.
4. Keep it warm, sharp, and encouraging. No jargon.

Return JSON ONLY (no markdown):
{
  "verdict": string (3-5 words matching severity),
  "psychologyAdvice": string (2 sentences referencing exact ₹ numbers and the specific category cuts if needed),
  "alternativeAction": string (1 actionable next step)
}`;

        const rawText = await callGemini(prompt, { timeoutMs: 5000 });
        const parsed = extractJSON(rawText);
        if (parsed) {
          if (parsed.verdict) verdict = parsed.verdict.trim();
          if (parsed.psychologyAdvice) psychologyAdvice = parsed.psychologyAdvice.trim();
          if (parsed.alternativeAction) alternativeAction = parsed.alternativeAction.trim();
        }
      } catch (err) { /* Fallback below */ }
    }

    // Fallback if AI fails
    if (!psychologyAdvice) {
      if (severity === 'critical') {
        psychologyAdvice = `At ₹${monthlyInstallment.toLocaleString()}/mo, this exceeds your ₹${zeroGuiltPool.toLocaleString()} safe cash. Apply these cuts: ${categoryCuts.length > 0 ? categoryCuts.map(c => `${c.category} -₹${c.cutAmount}`).join(', ') : 'Pace discretionary expenses'}.`;
        alternativeAction = `Adjust your category limits in the Budgets tab to free up ₹${shortfall.toLocaleString()}/mo.`;
      } else if (severity === 'warning') {
        psychologyAdvice = `Allocating ₹${monthlyInstallment.toLocaleString()}/mo uses ${poolImpactPercent}% of your safe cash. Consider cutting: ${categoryCuts.length > 0 ? categoryCuts.map(c => `${c.category} by ₹${c.cutAmount}`).join(', ') : 'discretionary spend'}.`;
        alternativeAction = 'Pace non-essential orders slightly to make this smoothly achievable.';
      } else {
        psychologyAdvice = `At ₹${monthlyInstallment.toLocaleString()}/mo, this easily fits within your ₹${zeroGuiltPool.toLocaleString()} safe cash flow with ₹${remainingPoolAfterPurchase.toLocaleString()} left untouched.`;
        alternativeAction = 'Greenlight! Go ahead and enjoy your purchase guilt-free.';
      }
    }

    res.json({
      item, amount: purchaseAmount, category, timelineMonths: chosenMonths,
      monthlyInstallment, weeklyInstallment, rationalityScore, verdict, severity, isApproved,
      runwayImpactDays, zeroGuiltPool, remainingPoolAfterPurchase, safeDailyVelocity,
      shortfall, categoryCuts, // <-- SEND THE COMPLEX CALCULATION TO FRONTEND
      psychologyAdvice, alternativeAction,
    });
  } catch (e) {
    console.error('FRICTION CHECK ERROR:', e);
    next(e);
  }
};