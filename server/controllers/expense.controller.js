import { pool } from '../config/db.js';
import { autoRebalance } from '../ai/budgetEngine.js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let _ai = null;
function getAI() {
  if (!_ai && process.env.GEMINI_API_KEY) {
    _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _ai;
}

async function callGemini(contents) {
  const ai = getAI();
  if (!ai) throw new Error('GEMINI_API_KEY is not configured on server.');
  const models = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];
  let lastErr = null;
  for (const model of models) {
    try {
      const res = await ai.models.generateContent({ model, contents });
      return res;
    } catch (e) {
      console.warn(`⚠️ Model ${model} failed in web OCR: ${e.message}. Trying next fallback...`);
      lastErr = e;
    }
  }
  throw lastErr;
}

function sanitizeAndParseJson(text) {
  if (!text) return {};
  let cleaned = String(text).replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('⚠️ OCR JSON parse warning:', err.message);
    return {};
  }
}

export const scanReceipt = async (req, res, next) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing in server configuration.' });
    }

    const prompt = `You are a financial receipt parser. Extract expense information from this image.
CATEGORIZATION RULES:
- "Bills": MUST be used for utility bills (electricity, water, wifi, recharge, rent, maintenance) AND ALL charitable donations, temple trusts, church/mosque donations, religious funds (Daan, Puja, Prabhavna, Sadharan Fund, Sangh receipts), trust payments, and NGO contributions. ALWAYS map donation receipts and religious trusts to "Bills", NEVER "Savings".
- "Savings": MUST ONLY be used when the user explicitly saves or transfers money into their personal bank savings, emergency fund, fixed deposit (FD), recurring deposit (RD), or wealth goal. NEVER map merchant receipts, temple funds, or donation receipts to "Savings".
- "Transport": MUST be used for ALL vehicle fuel, gas, petrol, diesel, CNG, EV charging, fuel stations, petrol pumps, cabs (Uber, Ola, Rapido), trains, flights, metro, bus, parking, and tolls.
- "Shopping": MUST be used for clothes, fashion brands (Zara, H&M, Nike, Uniqlo, Myntra, Amazon, Flipkart, Westside, Snitch, etc.), shoes, electronics, apparel, e-commerce, and retail stores.
- "Food": Groceries, dining, cafes, restaurants, Swiggy, Zomato, food items, drinks, snacks.
- "Entertainment": Movies, streaming, events, gaming.
- "Health": Pharmacy, gym, medicines, hospital, doctor.

Return ONLY a raw, valid JSON object (no markdown, no codeblock) with these exact keys:
{
  "amount": number (total transaction amount),
  "category": string (must be one of: Food, Shopping, Transport, Bills, Entertainment, Health, Savings, Investments),
  "merchant": string or null (store, trust, or vendor name e.g. "Shell", "Zara", "McDonald's"),
  "note": string (short summary of items or description),
  "date": string (YYYY-MM-DD or today's date)
}`;

    const geminiRes = await callGemini([
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
          { text: prompt }
        ]
      }
    ]);

    const rawText = geminiRes.text || geminiRes.response?.text() || '{}';
    const parsed = sanitizeAndParseJson(rawText);

    if (!parsed.amount || isNaN(parsed.amount)) {
      return res.status(422).json({ error: 'Could not clearly identify total amount from receipt photo.' });
    }

    const amount = parseFloat(parsed.amount);
    const categoryName = parsed.category || 'Shopping';
    const merchant = parsed.merchant && parsed.merchant !== 'N/A' && parsed.merchant !== 'Receipt OCR' ? parsed.merchant : null;
    const note = parsed.note && parsed.note !== 'Scanned Receipt' ? parsed.note : (merchant || categoryName);
    const date = parsed.date || new Date().toISOString().split('T')[0];

    // Find category ID
    const { rows: categories } = await pool.query(`SELECT id, name FROM categories WHERE is_active = true`);
    let matchedCat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    if (!matchedCat) {
      matchedCat = categories.find(c => c.name.toLowerCase() === 'shopping') || categories[0];
    }

    res.json({
      amount,
      category: matchedCat.name,
      category_id: matchedCat.id,
      merchant,
      description: note,
      date,
      raw: parsed,
    });
  } catch (err) {
    console.error('Scan receipt controller error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze receipt.' });
  }
};

export const add = async (req, res, next) => {
  try {
    const { category_id, amount, description, date, merchant, item_name, payment_method, mood } = req.body;
    const userId = req.user.id;
    const numAmount = parseFloat(amount);
    const now = new Date(date || Date.now());
    const month = now.getMonth() + 1, year = now.getFullYear();

    // 1. Insert expense
    await pool.query(
      `INSERT INTO expenses (user_id, category_id, amount, description, date, merchant, item_name, payment_method, mood)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [userId, category_id, numAmount, description, date || now, merchant || null, item_name || null, payment_method || null, mood || null]
    );

    // 2. ✅ AUTO-SYNC TO SAVINGS VAULT GOALS IF CATEGORY IS SAVINGS/INVESTMENTS
    const { rows: catInfo } = await pool.query(`SELECT name FROM categories WHERE id=$1`, [category_id]);
    const catName = catInfo[0]?.name || '';
    const isAssetTransfer = catName === 'Savings' || catName === 'Investments';

    if (isAssetTransfer) {
      const { rows: userGoals } = await pool.query(
        `SELECT id FROM goals WHERE user_id=$1 ORDER BY created_at ASC LIMIT 1`,
        [userId]
      );
      if (userGoals.length > 0) {
        await pool.query(
          `UPDATE goals SET current_amount = current_amount + $1 WHERE id=$2`,
          [numAmount, userGoals[0].id]
        );
      } else {
        // Automatically create a primary savings vault goal if none exists yet
        await pool.query(
          `INSERT INTO goals (user_id, name, target_amount, current_amount, icon)
           VALUES ($1, 'Emergency & Wealth Vault', 100000, $2, '🛡️')`,
          [userId, numAmount]
        );
      }
    }

    // 3. Check budget logic (for living expenses)
    let warning = null;
    if (!isAssetTransfer) {
      const { rows: b } = await pool.query(
        `SELECT * FROM budgets WHERE user_id=$1 AND category_id=$2 AND month=$3 AND year=$4`,
        [userId, category_id, month, year]
      );
      const { rows: spent } = await pool.query(
        `SELECT COALESCE(SUM(amount),0) as total FROM expenses
         WHERE user_id=$1 AND category_id=$2 AND EXTRACT(MONTH FROM date)=$3 AND EXTRACT(YEAR FROM date)=$4`,
        [userId, category_id, month, year]
      );

      const budget = b[0] ? parseFloat(b[0].amount) : 0;
      const totalSpent = parseFloat(spent[0].total);

      if (budget > 0 && totalSpent > budget) {
        warning = { over: true, budget, spent: totalSpent, category_id };
        const { rows: u } = await pool.query(`SELECT auto_rebalance, monthly_income FROM users WHERE id=$1`, [userId]);
        if (u[0]?.auto_rebalance) {
          const { rows: all } = await pool.query(
            `SELECT b.id, c.name FROM budgets b JOIN categories c ON c.id=b.category_id
             WHERE b.user_id=$1 AND b.month=$2 AND b.year=$3`,
            [userId, month, year]
          );
          const map = Object.fromEntries(all.map(x => [x.name, parseFloat(x.amount)]));
          if (catInfo[0]) {
            map[catInfo[0].name] = totalSpent;
            const rebalanced = autoRebalance(map, catInfo[0].name, parseFloat(u[0].monthly_income));
            for (const x of all) {
              await pool.query(`UPDATE budgets SET amount=$1 WHERE id=$2`, [rebalanced[x.name], x.id]);
            }
          }
        }
      }
    }

    res.json({ success: true, warning });
  } catch (e) { next(e); }
};

export const list = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*, c.name as category_name, c.icon FROM expenses e
       JOIN categories c ON c.id=e.category_id
       WHERE e.user_id=$1 AND c.is_active = true
       ORDER BY e.date DESC LIMIT 200`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
};

export const getByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { rows } = await pool.query(
      `SELECT 
         COALESCE(merchant, 'General / Other') as merchant, 
         SUM(amount) as total, 
         COUNT(*) as transaction_count,
         MAX(date) as last_date
       FROM expenses 
       WHERE user_id=$1 AND category_id=$2 
       GROUP BY merchant 
       ORDER BY total DESC`,
      [req.user.id, categoryId]
    );
    res.json(rows);
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rows: expRows } = await pool.query(
      `SELECT e.*, c.name as category_name FROM expenses e
       JOIN categories c ON c.id = e.category_id
       WHERE e.id=$1 AND e.user_id=$2`,
      [req.params.id, userId]
    );

    if (expRows.length > 0) {
      const exp = expRows[0];
      const isAssetTransfer = exp.category_name === 'Savings' || exp.category_name === 'Investments';
      if (isAssetTransfer) {
        const { rows: userGoals } = await pool.query(
          `SELECT id FROM goals WHERE user_id=$1 ORDER BY created_at ASC LIMIT 1`,
          [userId]
        );
        if (userGoals.length > 0) {
          await pool.query(
            `UPDATE goals SET current_amount = GREATEST(0, current_amount - $1) WHERE id=$2`,
            [parseFloat(exp.amount), userGoals[0].id]
          );
        }
      }
    }

    await pool.query(`DELETE FROM expenses WHERE id=$1 AND user_id=$2`,
      [req.params.id, userId]);
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const { category_id, amount, description, date, merchant, item_name, payment_method, mood } = req.body;
    const userId = req.user.id;
    const newAmount = parseFloat(amount);

    // 1. Get old expense details before update
    const { rows: oldExpenseRows } = await pool.query(
      `SELECT e.*, c.name as category_name FROM expenses e
       JOIN categories c ON c.id = e.category_id
       WHERE e.id=$1 AND e.user_id=$2`,
      [req.params.id, userId]
    );

    if (oldExpenseRows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const oldExp = oldExpenseRows[0];
    const oldAmount = parseFloat(oldExp.amount);
    const oldIsSavings = oldExp.category_name === 'Savings' || oldExp.category_name === 'Investments';

    const { rows: newCatRows } = await pool.query(`SELECT name FROM categories WHERE id=$1`, [category_id]);
    const newCatName = newCatRows[0]?.name || '';
    const newIsSavings = newCatName === 'Savings' || newCatName === 'Investments';

    // 2. Perform update
    await pool.query(
      `UPDATE expenses 
       SET category_id=$1, amount=$2, description=$3, date=$4, merchant=$5, item_name=$6, payment_method=$7, mood=$8
       WHERE id=$9 AND user_id=$10`,
      [category_id, newAmount, description, date, merchant, item_name, payment_method, mood, req.params.id, userId]
    );

    // 3. Sync goal current_amount
    if (oldIsSavings || newIsSavings) {
      const { rows: userGoals } = await pool.query(
        `SELECT id FROM goals WHERE user_id=$1 ORDER BY created_at ASC LIMIT 1`,
        [userId]
      );
      if (userGoals.length > 0) {
        const goalId = userGoals[0].id;
        if (oldIsSavings && newIsSavings) {
          const diff = newAmount - oldAmount;
          await pool.query(
            `UPDATE goals SET current_amount = GREATEST(0, current_amount + $1) WHERE id=$2`,
            [diff, goalId]
          );
        } else if (oldIsSavings && !newIsSavings) {
          await pool.query(
            `UPDATE goals SET current_amount = GREATEST(0, current_amount - $1) WHERE id=$2`,
            [oldAmount, goalId]
          );
        } else if (!oldIsSavings && newIsSavings) {
          await pool.query(
            `UPDATE goals SET current_amount = current_amount + $1 WHERE id=$2`,
            [newAmount, goalId]
          );
        }
      } else if (newIsSavings) {
        await pool.query(
          `INSERT INTO goals (user_id, name, target_amount, current_amount, icon)
           VALUES ($1, 'Emergency & Wealth Vault', 100000, $2, '🛡️')`,
          [userId, newAmount]
        );
      }
    }
    
    res.json({ success: true });
  } catch (e) { next(e); }
};