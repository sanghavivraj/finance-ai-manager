import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenAI } from '@google/genai';
import Groq, { toFile } from 'groq-sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import { pool } from './config/db.js';

dotenv.config();

console.log('🔑 Bot Token:', process.env.TELEGRAM_BOT_TOKEN ? 'Loaded' : 'MISSING!');
console.log('🔑 Gemini API Key:', process.env.GEMINI_API_KEY ? 'Loaded' : 'MISSING!');
console.log('🔑 Groq API Key:', process.env.GROQ_API_KEY ? 'Loaded' : 'MISSING!');

// Initialize bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Prevent 409 Conflict loops on Polling Error
bot.on('polling_error', (error) => {
  console.error('⚠️ Telegram Polling Error:', error.message || error);
});

// Bind graceful shutdown handlers
process.once('SIGINT', () => {
  console.log('🛑 Stopping Telegram Bot polling on SIGINT...');
  bot.stopPolling();
});

process.once('SIGTERM', () => {
  console.log('🛑 Stopping Telegram Bot polling on SIGTERM...');
  bot.stopPolling();
});

// Helper to sanitize and parse JSON from LLMs safely
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
    console.warn('⚠️ Gemini JSON Parse Warning:', err.message, 'Raw text:', text);
    return {};
  }
}

// Initialize Gemini & Groq Clients
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'fake-key' });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'fake-key' });

console.log('🤖 Telegram Bot is running with AI OCR & Voice Recognition...');

// Smart category mapping fallback dictionary
const fuelKeywords = [
  'gas', 'gasoline', 'petrol', 'diesel', 'fuel', 'cng', 'lpg',
  'ev charging', 'charging', 'petrol pump', 'gas station', 'fuel station',
  'shell', 'hp petrol', 'indian oil', 'indianoil', 'bpcl', 'ioc', 'iocl',
  'refuel', 'toll', 'fastag', 'parking'
];

const retailBrands = [
  'zara', 'h&m', 'hm', 'myntra', 'uniqlo', 'amazon', 'nike', 'adidas',
  'puma', 'flipkart', 'snitch', 'westside', 'pantaloons', 'trends',
  'ajio', 'meesho', 'bewakoof', 'decathlon', 'lifestyle', 'max'
];

const donationKeywords = [
  'donation', 'trust', 'sangh', 'temple', 'mandir', 'derasar',
  'prabhavna', 'daan', 'dan', 'puja', 'pooja', 'ngo', 'charity',
  'chhatralaya', 'jain sangh', 'sadharan fund', 'samayik', 'annakshetra',
  'ashram', 'foundation', 'relief fund', 'seva', 'khate'
];

const categoryMap = {
  // Food & Dining
  'food': 'Food', 'meal': 'Food', 'lunch': 'Food', 'dinner': 'Food', 'breakfast': 'Food',
  'grocery': 'Food', 'groceries': 'Food', 'cafe': 'Food', 'restaurant': 'Food',
  'swiggy': 'Food', 'zomato': 'Food', 'snack': 'Food', 'snacks': 'Food',
  'coffee': 'Food', 'tea': 'Food', 'chai': 'Food', 'bakery': 'Food',
  'mcdonalds': 'Food', 'kfc': 'Food', 'dominos': 'Food', 'starbucks': 'Food',

  // Shopping & Fashion Retail
  'shopping': 'Shopping', 'shop': 'Shopping', 'buy': 'Shopping', 'clothes': 'Shopping',
  'clothing': 'Shopping', 'fashion': 'Shopping', 'shoes': 'Shopping', 'electronics': 'Shopping',
  'apparel': 'Shopping', 'footwear': 'Shopping',
  ...Object.fromEntries(retailBrands.map(b => [b, 'Shopping'])),

  // Transport & Vehicle Fuel (Gas, Petrol, Diesel, Fuel, CNG strictly to Transport)
  'transport': 'Transport', 'travel': 'Transport', 'bus': 'Transport', 'train': 'Transport',
  'uber': 'Transport', 'ola': 'Transport', 'rapido': 'Transport', 'flight': 'Transport',
  'auto': 'Transport', 'metro': 'Transport', 'cab': 'Transport', 'taxi': 'Transport',
  'flight ticket': 'Transport', 'train ticket': 'Transport', 'railway': 'Transport',
  ...Object.fromEntries(fuelKeywords.map(f => [f, 'Transport'])),

  // Bills & Utilities & Religious Donations / Trusts
  'bills': 'Bills', 'bill': 'Bills', 'electricity': 'Bills', 'water': 'Bills',
  'internet': 'Bills', 'wifi': 'Bills', 'rent': 'Bills', 'recharge': 'Bills', 'maintenance': 'Bills',
  'donation': 'Bills', 'charity': 'Bills', 'trust': 'Bills', 'temple': 'Bills',
  ...Object.fromEntries(donationKeywords.map(d => [d, 'Bills'])),

  // Entertainment
  'entertainment': 'Entertainment', 'game': 'Entertainment', 'games': 'Entertainment',
  'movie': 'Entertainment', 'movies': 'Entertainment', 'netflix': 'Entertainment',
  'fun': 'Entertainment', 'cinema': 'Entertainment', 'bookmyshow': 'Entertainment',

  // Health
  'health': 'Health', 'pharmacy': 'Health', 'gym': 'Health', 'medicines': 'Health',
  'hospital': 'Health', 'doctor': 'Health', 'clinic': 'Health', 'apollo': 'Health',

  // Savings & Investments
  'savings': 'Savings', 'save': 'Savings',
  'investments': 'Investments', 'invest': 'Investments', 'sip': 'Investments', 'mutual fund': 'Investments',
};

const incomeKeywords = ['salary', 'income', 'freelance', 'bonus', 'payment', 'received'];

// Helper to find category ID in DB with mandatory fallback overrides
async function findCategoryId(categoryName, textContext = '') {
  const context = `${categoryName || ''} ${textContext || ''}`.toLowerCase();

  // 1. Strict Override for Fuel / Vehicle Keywords -> Transport (Never Food)
  if (fuelKeywords.some(k => context.includes(k))) {
    const { rows } = await pool.query(`SELECT id, name FROM categories WHERE LOWER(name) = 'transport' LIMIT 1`);
    if (rows.length > 0) return { id: rows[0].id, name: rows[0].name };
  }

  // 2. Strict Override for Retail Brands -> Shopping (Never Food)
  if (retailBrands.some(b => context.includes(b))) {
    const { rows } = await pool.query(`SELECT id, name FROM categories WHERE LOWER(name) = 'shopping' LIMIT 1`);
    if (rows.length > 0) return { id: rows[0].id, name: rows[0].name };
  }

  // 3. Strict Override for Religious / Donations / Charitable Trusts -> Bills (Never Savings)
  if (donationKeywords.some(d => context.includes(d))) {
    const { rows } = await pool.query(`SELECT id, name FROM categories WHERE LOWER(name) = 'bills' LIMIT 1`);
    if (rows.length > 0) return { id: rows[0].id, name: rows[0].name };
  }

  // 4. Normalized dictionary lookup
  const normalized = (categoryMap[categoryName?.toLowerCase()] || categoryMap[textContext?.toLowerCase()] || categoryName || 'Food').toLowerCase();
  const { rows } = await pool.query(
    `SELECT id, name FROM categories WHERE LOWER(name) = $1 LIMIT 1`,
    [normalized]
  );
  if (rows.length > 0) return { id: rows[0].id, name: rows[0].name };

  // Fallback to first category
  const { rows: fallback } = await pool.query(`SELECT id, name FROM categories ORDER BY id ASC LIMIT 1`);
  return fallback[0] || { id: 1, name: 'Food' };
}

// Helper to check user link
async function getUserIdByChatId(chatId) {
  const { rows } = await pool.query(
    `SELECT id FROM users WHERE telegram_id::text = $1::text`,
    [chatId.toString()]
  );
  return rows[0]?.id || null;
}

async function linkAccount(chatId, emailRaw) {
  const email = emailRaw.replace(/^\/link\s*/i, '').replace(/^\//, '').trim();
  console.log(`🔗 Linking Telegram chat ${chatId} to email "${email}"`);

  try {
    const { rows } = await pool.query(`SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    if (rows.length === 0) {
      return bot.sendMessage(chatId, `❌ No account found with email: \`${email}\`.\nPlease register on the web app first!`, { parse_mode: 'Markdown' });
    }
    
    // Unlink old account if previously linked
    await pool.query(`UPDATE users SET telegram_id = NULL WHERE telegram_id::text = $1::text`, [chatId.toString()]);
    
    // Link new account
    await pool.query(`UPDATE users SET telegram_id = $1 WHERE id = $2`, [chatId.toString(), rows[0].id]);
    bot.sendMessage(chatId, `✅ *Successfully linked to account!*\n• Name: ${rows[0].name}\n• Email: ${rows[0].email}\n\nAll text, voice notes, and receipt photos will now log directly to your web dashboard!`, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('❌ Link error:', error);
    bot.sendMessage(chatId, `❌ Link error: ${error.message}`);
  }
}

// Link command
bot.onText(/\/link (.+)/, async (msg, match) => {
  await linkAccount(msg.chat.id, match[1]);
});

// Balance command
bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const userId = await getUserIdByChatId(chatId);
    if (!userId) return bot.sendMessage(chatId, "❌ Account not linked. Use `/link email@domain.com`", { parse_mode: 'Markdown' });

    const { rows: u } = await pool.query(`SELECT monthly_income FROM users WHERE id = $1`, [userId]);
    const income = parseFloat(u[0]?.monthly_income || 0);

    const { rows: spentRows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = $1`, 
      [userId]
    );
    const spent = parseFloat(spentRows[0].total);
    
    bot.sendMessage(chatId, `💰 *Balance Overview*\n• Income: ₹${income.toLocaleString()}\n• Spent: ₹${spent.toLocaleString()}\n• Remaining: ₹${(income - spent).toLocaleString()}`, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, "❌ Error fetching balance.");
  }
});

// Status command
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const { rows } = await pool.query(
    `SELECT email, name FROM users WHERE telegram_id::text = $1::text`,
    [chatId.toString()]
  );
  if (rows.length === 0) {
    return bot.sendMessage(chatId, "❌ You are not linked to any account. Use `/link email@domain.com`", { parse_mode: 'Markdown' });
  }
  bot.sendMessage(chatId, `✅ Linked Account:\n*Name*: ${rows[0].name}\n*Email*: ${rows[0].email}`, { parse_mode: 'Markdown' });
});

// Pending duplicates cache (key: pendingId, val: expensePayload)
const pendingDuplicates = new Map();

// Helper to check for duplicate expense (by amount or merchant in last 24h / today across all categories)
async function checkDuplicateExpense(userId, amount, merchant = null) {
  let query = `
    SELECT e.id, e.amount, e.description, e.merchant, c.name as category_name
    FROM expenses e
    JOIN categories c ON c.id = e.category_id
    WHERE e.user_id = $1 
      AND (
        (e.amount = $2 AND (e.date >= CURRENT_DATE - INTERVAL '1 day' OR e.date = CURRENT_DATE))
        ${merchant ? `OR (e.merchant ILIKE $3 AND e.amount = $2)` : ''}
      )
    ORDER BY e.id DESC
    LIMIT 1
  `;
  const params = merchant ? [userId, amount, `%${merchant.trim()}%`] : [userId, amount];
  const { rows } = await pool.query(query, params);
  return rows[0] || null;
}

// Helper to insert expense into DB
async function insertExpense({ userId, categoryId, amount, description, merchant, catName }) {
  await pool.query(
    `INSERT INTO expenses (user_id, category_id, amount, description, date, merchant)
     VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)`,
    [userId, categoryId, amount, description, merchant]
  );

  if (catName === 'Savings' || catName === 'Investments') {
    const { rows: goals } = await pool.query(
      `SELECT id FROM goals WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [userId]
    );
    if (goals.length > 0) {
      await pool.query(
        `UPDATE goals SET current_amount = current_amount + $1 WHERE id = $2`,
        [amount, goals[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO goals (user_id, name, target_amount, current_amount, icon)
         VALUES ($1, 'Emergency & Wealth Vault', 100000, $2, '🛡️')`,
        [userId, amount]
      );
    }
  }
}

// Inline Keyboard Callback Query Handler (For Duplicate Confirmation Buttons)
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  if (data.startsWith('add_dup:')) {
    const pendingId = data.replace('add_dup:', '');
    const pending = pendingDuplicates.get(pendingId);

    if (!pending) {
      await bot.answerCallbackQuery(query.id, { text: 'Session expired.' });
      return bot.editMessageText('⏳ This confirmation request has expired.', {
        chat_id: chatId,
        message_id: messageId,
      });
    }

    try {
      await insertExpense(pending);
      pendingDuplicates.delete(pendingId);
      await bot.answerCallbackQuery(query.id, { text: 'Expense added!' });

      return bot.editMessageText(
        `✅ *Duplicate Expense Confirmed & Logged!*\n━━━━━━━━━━━━━━━━━━\n💰 *Amount*: ₹${pending.amount.toLocaleString()}\n🏷️ *Category*: ${pending.catName}\n🏪 *Merchant*: ${pending.merchant || 'N/A'}\n📝 *Note*: ${pending.description}\n━━━━━━━━━━━━━━━━━━\nSuccessfully logged into your account!`,
        { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
      );
    } catch (err) {
      return bot.sendMessage(chatId, `❌ Error inserting duplicate: ${err.message}`);
    }
  }

  if (data.startsWith('cancel_dup:')) {
    const pendingId = data.replace('cancel_dup:', '');
    pendingDuplicates.delete(pendingId);
    await bot.answerCallbackQuery(query.id, { text: 'Cancelled.' });

    return bot.editMessageText(
      `❌ *Duplicate Expense Cancelled.*\nNo duplicate expense was added to your account.`,
      { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }
    );
  }
});

// Helper function for Gemini calls with automatic model fallbacks
async function callGemini(contents) {
  const models = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];
  let lastErr = null;
  for (const model of models) {
    try {
      const res = await ai.models.generateContent({ model, contents });
      return res;
    } catch (e) {
      console.warn(`⚠️ Model ${model} failed: ${e.message}. Trying next fallback...`);
      lastErr = e;
    }
  }
  throw lastErr;
}

// ==========================================
// 📷 FEATURE 1A: PHOTO / RECEIPT OCR HANDLER
// ==========================================
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  console.log(`📸 Received photo from chat ${chatId}`);

  try {
    const userId = await getUserIdByChatId(chatId);
    if (!userId) {
      return bot.sendMessage(chatId, "👋 Please link your account first:\n`/link email@domain.com`", { parse_mode: 'Markdown' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return bot.sendMessage(chatId, "⚠️ `GEMINI_API_KEY` is missing in server configuration. Unable to process receipt photo.", { parse_mode: 'Markdown' });
    }

    const processingMsg = await bot.sendMessage(chatId, "🔍 *Analyzing receipt photo with AI...*", { parse_mode: 'Markdown' });

    // 1. Get highest resolution photo
    const photo = msg.photo[msg.photo.length - 1];
    const fileLink = await bot.getFileLink(photo.file_id);

    // 2. Download photo buffer & convert to Base64
    const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
    const imageBase64 = Buffer.from(response.data).toString('base64');

    // 3. Send to Gemini for OCR Extraction with model fallback
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
  "merchant": string or null (store, trust, or vendor name e.g. "Shri Bapunagar Jain Sangh", "Shell", "Zara"),
  "note": string (short summary of items or description),
  "date": string (YYYY-MM-DD or today's date)
}`;

    const geminiRes = await callGemini([
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
          { text: prompt }
        ]
      }
    ]);

    const rawText = geminiRes.text || geminiRes.response?.text() || '{}';
    console.log('🤖 Gemini OCR Raw Output:', rawText);

    const parsed = sanitizeAndParseJson(rawText);

    if (!parsed.amount || isNaN(parsed.amount)) {
      await bot.deleteMessage(chatId, processingMsg.message_id);
      return bot.sendMessage(chatId, "🤔 Could not clearly identify transaction amount from the image. Please try a clearer photo or send text!");
    }

    const amount = parseFloat(parsed.amount);
    const catInfo = await findCategoryId(parsed.category, `${parsed.merchant || ''} ${parsed.note || ''}`);
    const merchant = parsed.merchant && parsed.merchant !== 'N/A' && parsed.merchant !== 'Receipt OCR' ? parsed.merchant : null;
    const note = parsed.note && parsed.note !== 'Scanned Receipt' ? parsed.note : (merchant || catInfo.name);

    await bot.deleteMessage(chatId, processingMsg.message_id);

    // Check for Duplicate Expense across recent transactions (by amount and merchant)
    const duplicate = await checkDuplicateExpense(userId, amount, merchant);
    if (duplicate) {
      const pendingId = `dup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      pendingDuplicates.set(pendingId, { userId, categoryId: catInfo.id, amount, description: note, merchant, catName: catInfo.name });

      return bot.sendMessage(
        chatId,
        `⚠️ *Possible Duplicate Receipt Detected!*\n━━━━━━━━━━━━━━━━━━\n💰 *Amount*: ₹${amount.toLocaleString()}\n🏷️ *Category*: ${catInfo.name}\n🏪 *Merchant*: ${merchant || 'N/A'}\n📝 *Note*: ${note}\n━━━━━━━━━━━━━━━━━━\nAn entry of ₹${amount.toLocaleString()} (${duplicate.merchant || duplicate.category_name}) already exists in your account.\n\nAre you sure you want to add this duplicate?`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Yes, Add Duplicate', callback_data: `add_dup:${pendingId}` },
                { text: '❌ Cancel', callback_data: `cancel_dup:${pendingId}` }
              ]
            ]
          }
        }
      );
    }

    // Insert Expense
    await insertExpense({ userId, categoryId: catInfo.id, amount, description: note, merchant, catName: catInfo.name });

    const replyMsg = `🧾 *Receipt Parsed & Logged!*
━━━━━━━━━━━━━━━━━━
💰 *Amount*: ₹${amount.toLocaleString()}
🏷️ *Category*: ${catInfo.name}
🏪 *Merchant*: ${merchant}
📝 *Note*: ${note}
📅 *Date*: ${new Date().toLocaleDateString('en-IN')}
━━━━━━━━━━━━━━━━━━
✅ *Expense recorded successfully!*`;

    bot.sendMessage(chatId, replyMsg, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('❌ Receipt OCR error:', error);
    bot.sendMessage(chatId, `❌ Failed to process receipt photo: ${error.message}`);
  }
});

// ==========================================
// 🎙️ FEATURE 1B: VOICE MEMO HANDLER
// ==========================================
bot.on('voice', async (msg) => {
  const chatId = msg.chat.id;
  console.log(`🎙️ Received voice note from chat ${chatId}`);

  try {
    const userId = await getUserIdByChatId(chatId);
    if (!userId) {
      return bot.sendMessage(chatId, "👋 Please link your account first:\n`/link email@domain.com`", { parse_mode: 'Markdown' });
    }

    if (!process.env.GROQ_API_KEY) {
      return bot.sendMessage(chatId, "⚠️ `GROQ_API_KEY` is missing in server configuration. Unable to transcribe voice note.", { parse_mode: 'Markdown' });
    }

    const processingMsg = await bot.sendMessage(chatId, "🎧 *Transcribing voice memo with Whisper AI...*", { parse_mode: 'Markdown' });

    const fileLink = await bot.getFileLink(msg.voice.file_id);
    const audioRes = await axios.get(fileLink, { responseType: 'arraybuffer' });
    const audioBuffer = Buffer.from(audioRes.data);

    const audioFile = await toFile(audioBuffer, 'voice.ogg', { type: 'audio/ogg' });
    const transcriptionRes = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
    });

    const transcribedText = transcriptionRes.text?.trim() || '';

    if (!transcribedText) {
      await bot.deleteMessage(chatId, processingMsg.message_id);
      return bot.sendMessage(chatId, "🗣️ Could not hear any speech in the audio note. Please try speaking again!");
    }

    const prompt = `Extract expense or income transaction details from this speech transcript: "${transcribedText}".
CATEGORIZATION RULES:
- "Bills": MUST be used for utility bills (electricity, water, wifi, recharge, rent, maintenance) AND ALL charitable donations, temple trusts, church/mosque donations, religious funds (Daan, Puja, Prabhavna, Sadharan Fund, Sangh receipts), trust payments, and NGO contributions. ALWAYS map donation receipts and religious trusts to "Bills", NEVER "Savings".
- "Savings": MUST ONLY be used when the user explicitly saves or transfers money into their personal bank savings, emergency fund, fixed deposit (FD), recurring deposit (RD), or wealth goal. NEVER map merchant receipts, temple funds, or donation receipts to "Savings".
- "Transport": MUST be used for ALL vehicle fuel, gas, petrol, diesel, CNG, EV charging, fuel stations, petrol pumps, cabs (Uber, Ola, Rapido), trains, flights, metro, bus, parking, and tolls.
- "Shopping": MUST be used for clothes, fashion brands (Zara, H&M, Nike, Uniqlo, Myntra, Amazon, Flipkart, Westside, Snitch, etc.), shoes, electronics, apparel, e-commerce, and retail stores.
- "Food": Groceries, dining, cafes, restaurants, Swiggy, Zomato, food items, drinks, snacks.
- "Entertainment": Movies, streaming, events, gaming.
- "Health": Pharmacy, gym, medicines, hospital, doctor.

Return ONLY a raw, valid JSON object (no markdown codeblocks) with these keys:
{
  "is_income": boolean (true if income/salary/received, false if expense),
  "amount": number (numeric value),
  "category": string (one of: Food, Shopping, Transport, Bills, Entertainment, Health, Savings, Investments),
  "merchant": string or null (merchant, trust, or brand name if mentioned e.g. "Shell", "Zara", "Jain Sangh"),
  "note": string (short description)
}`;

    const geminiRes = await callGemini([{ role: 'user', parts: [{ text: prompt }] }]);
    const rawText = geminiRes.text || geminiRes.response?.text() || '{}';
    const parsed = sanitizeAndParseJson(rawText);

    if (!parsed.amount || isNaN(parsed.amount)) {
      await bot.deleteMessage(chatId, processingMsg.message_id);
      return bot.sendMessage(chatId, `🗣️ Transcribed: "${transcribedText}"\n\n❌ Could not detect amount. Try saying e.g. "Spent 350 on lunch"`);
    }

    const amount = parseFloat(parsed.amount);
    const catInfo = await findCategoryId(parsed.category, `${parsed.merchant || ''} ${parsed.note || ''} ${transcribedText}`);
    const merchant = parsed.merchant && parsed.merchant !== 'Voice Entry' ? parsed.merchant : null;
    const note = parsed.note || transcribedText;

    await bot.deleteMessage(chatId, processingMsg.message_id);

    if (parsed.is_income) {
      await pool.query(
        `INSERT INTO incomes (user_id, source, amount, date, is_salary) VALUES ($1, $2, $3, CURRENT_DATE, $4)`,
        [userId, note || 'Voice Income', amount, (parsed.category || '').toLowerCase() === 'salary']
      );
      return bot.sendMessage(chatId, `💰 Added ₹${amount.toLocaleString()} as income!`, { parse_mode: 'Markdown' });
    }

    // Check Duplicate Expense (by amount and merchant)
    const duplicate = await checkDuplicateExpense(userId, amount, merchant);
    if (duplicate) {
      const pendingId = `dup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      pendingDuplicates.set(pendingId, { userId, categoryId: catInfo.id, amount, description: note, merchant, catName: catInfo.name });

      return bot.sendMessage(
        chatId,
        `⚠️ *Possible Duplicate Voice Expense Detected!*\n━━━━━━━━━━━━━━━━━━\n💰 *Amount*: ₹${amount.toLocaleString()}\n🏷️ *Category*: ${catInfo.name}\n🏪 *Merchant*: ${merchant || 'N/A'}\n🗣️ *Speech*: "${transcribedText}"\n━━━━━━━━━━━━━━━━━━\nAn entry of ₹${amount.toLocaleString()} (${duplicate.merchant || duplicate.category_name}) already exists in your account.\n\nAre you sure you want to add this duplicate?`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Yes, Add Duplicate', callback_data: `add_dup:${pendingId}` },
                { text: '❌ Cancel', callback_data: `cancel_dup:${pendingId}` }
              ]
            ]
          }
        }
      );
    }

    await insertExpense({ userId, categoryId: catInfo.id, amount, description: note, merchant, catName: catInfo.name });

    const replyMsg = `🎙️ *Voice Expense Logged!*
━━━━━━━━━━━━━━━━━━
🗣️ *Speech*: "${transcribedText}"
💰 *Amount*: ₹${amount.toLocaleString()}
🏷️ *Category*: ${catInfo.name}
🏪 *Merchant*: ${merchant}
━━━━━━━━━━━━━━━━━━
✅ *Successfully logged into your account!*`;

    bot.sendMessage(chatId, replyMsg, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('❌ Voice note error:', error);
    bot.sendMessage(chatId, `❌ Failed to process voice memo: ${error.message}`);
  }
});

// ==========================================
// 💬 TEXT MESSAGE HANDLER
// ==========================================
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text || msg.photo || msg.voice) return;

  if (text.includes('@') && text.includes('.')) {
    return linkAccount(chatId, text);
  }

  if (text.startsWith('/')) return;

  const userId = await getUserIdByChatId(chatId);
  if (!userId) {
    return bot.sendMessage(chatId, "👋 Please link your account first:\n`/link email@domain.com`", { parse_mode: 'Markdown' });
  }

  let amount, keyword, merchant;

  // Pattern 1: Amount first (e.g. '230.34 food', '230.34 food at mcdonalds', '₹230.34 petrol in shell')
  const match1 = text.match(/^(?:(?:spent|paid|added)\s+)?(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:rs\.?|inr|rupees)?\s+(?:on|for|in|to|at)?\s*([a-zA-Z]+)(?:\s+(?:at|in|from|for|on)\s+([a-zA-Z0-9\s]+))?$/i);
  if (match1) {
    amount = parseFloat(match1[1]);
    keyword = match1[2].toLowerCase().trim();
    merchant = match1[3] ? match1[3].trim() : null;
  } else {
    // Pattern 2: Keyword then amount then optional merchant (e.g. 'petrol 500.50 at HPCL', 'food 230.34')
    const match2 = text.match(/^(?:(?:spent|paid|added)\s+)?(?:on|for|in|to|at)?\s*([a-zA-Z]+)\s+(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:rs\.?|inr|rupees)?(?:\s+(?:at|in|from|for|on)\s+([a-zA-Z0-9\s]+))?$/i);
    if (match2) {
      keyword = match2[1].toLowerCase().trim();
      amount = parseFloat(match2[2]);
      merchant = match2[3] ? match2[3].trim() : null;
    } else {
      // Pattern 3: Keyword then merchant then amount (e.g. 'shopping at zara 1200')
      const match3 = text.match(/^(?:(?:spent|paid|added)\s+)?(?:on|for|in|to|at)?\s*([a-zA-Z]+)(?:\s+(?:at|in|from|for|on)\s+([a-zA-Z0-9\s]+))\s+(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:rs\.?|inr|rupees)?$/i);
      if (match3) {
        keyword = match3[1].toLowerCase().trim();
        merchant = match3[2] ? match3[2].trim() : null;
        amount = parseFloat(match3[3]);
      }
    }
  }

  if (!amount || isNaN(amount) || !keyword) {
    return bot.sendMessage(chatId, "🤔 Try text like: `230.34 food`, `1200 shopping at zara`, send a *voice note*, or a *receipt photo*!", { parse_mode: 'Markdown' });
  }

  let catInfo = await findCategoryId(keyword, text);

  if (retailBrands.includes(keyword)) {
    if (!merchant) {
      merchant = keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  } else if (fuelKeywords.includes(keyword)) {
    if (!merchant && !['fuel', 'gas', 'petrol', 'diesel', 'cng'].includes(keyword)) {
      merchant = keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  }

  if (merchant) {
    merchant = merchant.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  const cleanTitle = merchant || (keyword.charAt(0).toUpperCase() + keyword.slice(1));
  const note = cleanTitle;

  if (incomeKeywords.includes(keyword)) {
    await pool.query(
      `INSERT INTO incomes (user_id, source, amount, date, is_salary) VALUES ($1, $2, $3, CURRENT_DATE, $4)`,
      [userId, note, amount, keyword === 'salary']
    );
    if (keyword === 'salary') {
      await pool.query(`UPDATE users SET monthly_income = $1 WHERE id = $2`, [amount, userId]);
    }
    return bot.sendMessage(chatId, `💰 Added ₹${amount.toLocaleString()} as ${note}!`);
  }

  // Check Duplicate Expense (by amount and merchant across recent entries)
  const duplicate = await checkDuplicateExpense(userId, amount, merchant || cleanTitle);
  if (duplicate) {
    const pendingId = `dup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    pendingDuplicates.set(pendingId, { userId, categoryId: catInfo.id, amount, description: note, merchant, catName: catInfo.name });

    return bot.sendMessage(
      chatId,
      `⚠️ *Possible Duplicate Expense Detected!*\n━━━━━━━━━━━━━━━━━━\n💰 *Amount*: ₹${amount.toLocaleString()}\n🏷️ *Category*: ${catInfo.name}\n🏪 *Merchant*: ${merchant || cleanTitle}\n━━━━━━━━━━━━━━━━━━\nAn expense of ₹${amount.toLocaleString()} (${duplicate.merchant || duplicate.category_name}) already exists in your account.\n\nAre you sure you want to add this duplicate?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Yes, Add Duplicate', callback_data: `add_dup:${pendingId}` },
              { text: '❌ Cancel', callback_data: `cancel_dup:${pendingId}` }
            ]
          ]
        }
      }
    );
  }

  await insertExpense({ userId, categoryId: catInfo.id, amount, description: note, merchant, catName: catInfo.name });

  bot.sendMessage(chatId, `✅ Added ₹${amount.toLocaleString()} to *${catInfo.name}* (${cleanTitle})!`, { parse_mode: 'Markdown' });
});

export default bot;