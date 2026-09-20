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

// Smart category mapping fallback
const categoryMap = {
  'food': 'Food', 'meal': 'Food', 'lunch': 'Food', 'dinner': 'Food', 'breakfast': 'Food', 'grocery': 'Food', 'groceries': 'Food', 'cafe': 'Food', 'restaurant': 'Food', 'swiggy': 'Food', 'zomato': 'Food',
  'shopping': 'Shopping', 'shop': 'Shopping', 'buy': 'Shopping', 'clothes': 'Shopping', 'clothing': 'Shopping', 'fashion': 'Shopping', 'shoes': 'Shopping',
  'zara': 'Shopping', 'h&m': 'Shopping', 'hm': 'Shopping', 'myntra': 'Shopping', 'uniqlo': 'Shopping', 'amazon': 'Shopping', 'nike': 'Shopping', 'adidas': 'Shopping', 'puma': 'Shopping', 'flipkart': 'Shopping', 'snitch': 'Shopping', 'westside': 'Shopping', 'pantaloons': 'Shopping', 'trends': 'Shopping',
  'transport': 'Transport', 'travel': 'Transport', 'bus': 'Transport', 'train': 'Transport', 
  'uber': 'Transport', 'ola': 'Transport', 'fuel': 'Transport', 'petrol': 'Transport', 'rapido': 'Transport', 'flight': 'Transport',
  'bills': 'Bills', 'bill': 'Bills', 'electricity': 'Bills', 'water': 'Bills', 'internet': 'Bills', 'wifi': 'Bills', 'rent': 'Bills', 'recharge': 'Bills',
  'entertainment': 'Entertainment', 'game': 'Entertainment', 'games': 'Entertainment', 
  'movie': 'Entertainment', 'movies': 'Entertainment', 'netflix': 'Entertainment', 'fun': 'Entertainment', 'cinema': 'Entertainment',
  'health': 'Health', 'pharmacy': 'Health', 'gym': 'Health', 'medicines': 'Health', 'hospital': 'Health', 'doctor': 'Health',
  'savings': 'Savings', 'save': 'Savings',
  'investments': 'Investments', 'invest': 'Investments', 'sip': 'Investments', 'mutual fund': 'Investments',
};

const retailBrands = ['zara', 'h&m', 'hm', 'myntra', 'uniqlo', 'amazon', 'nike', 'adidas', 'puma', 'flipkart', 'snitch', 'westside', 'pantaloons', 'trends'];

const incomeKeywords = ['salary', 'income', 'freelance', 'bonus', 'payment', 'received'];

// Helper to find category ID in DB
async function findCategoryId(categoryName) {
  const normalized = (categoryMap[categoryName?.toLowerCase()] || categoryName || 'Food').toLowerCase();
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


// Helper to check for duplicate expense today
async function checkDuplicateExpense(userId, categoryId, amount) {
  const { rows } = await pool.query(
    `SELECT e.id, e.amount, e.description, e.merchant, c.name as category_name
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE e.user_id = $1 
       AND e.category_id = $2 
       AND e.amount = $3 
       AND e.date = CURRENT_DATE
     LIMIT 1`,
    [userId, categoryId, amount]
  );
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
  const models = ['gemini-3.6-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-2.0-flash'];
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
- "Shopping": MUST be used for clothes, fashion brands (Zara, H&M, Nike, Uniqlo, Myntra, Amazon, Flipkart, Westside, Snitch, etc.), shoes, electronics, apparel, e-commerce, and retail stores. ALWAYS map clothing stores & fashion brands to Shopping, NEVER Food.
- "Food": Groceries, dining, cafes, restaurants, Swiggy, Zomato.
- "Transport": Cabs (Uber, Ola), fuel/petrol, trains, flights.
- "Bills": Rent, electricity, recharge, utilities, internet.
- "Entertainment": Movies, streaming, events.
- "Health": Pharmacy, gym, medicines, hospital.

Return ONLY a raw, valid JSON object (no markdown, no codeblock) with these exact keys:
{
  "amount": number (total transaction amount),
  "category": string (must be one of: Food, Shopping, Transport, Bills, Entertainment, Health, Savings, Investments),
  "merchant": string or null (store or vendor name e.g. "Zara"),
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
    const catInfo = await findCategoryId(parsed.category);
    const merchant = parsed.merchant || 'Receipt OCR';
    const note = parsed.note || 'Scanned Receipt';

    await bot.deleteMessage(chatId, processingMsg.message_id);

    // Check for Duplicate Expense
    const duplicate = await checkDuplicateExpense(userId, catInfo.id, amount);
    if (duplicate) {
      const pendingId = `dup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      pendingDuplicates.set(pendingId, { userId, categoryId: catInfo.id, amount, description: note, merchant, catName: catInfo.name });

      return bot.sendMessage(
        chatId,
        `⚠️ *Possible Duplicate Receipt Detected!*\n━━━━━━━━━━━━━━━━━━\n💰 *Amount*: ₹${amount.toLocaleString()}\n🏷️ *Category*: ${catInfo.name}\n🏪 *Merchant*: ${merchant}\n📝 *Note*: ${note}\n━━━━━━━━━━━━━━━━━━\nAn expense of ₹${amount.toLocaleString()} for *${catInfo.name}* already exists today.\n\nAre you sure you want to add this duplicate?`,
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
- "Shopping": MUST be used for clothes, fashion brands (Zara, H&M, Nike, Uniqlo, Myntra, Amazon, Flipkart, Westside, Snitch, etc.), shoes, electronics, apparel, e-commerce, and retail stores. ALWAYS map clothing stores & fashion brands to Shopping, NEVER Food.
- "Food": Groceries, dining, cafes, restaurants, Swiggy, Zomato.
- "Transport": Cabs (Uber, Ola), fuel/petrol, trains, flights.
- "Bills": Rent, electricity, recharge, utilities, internet.
- "Entertainment": Movies, streaming, events.
- "Health": Pharmacy, gym, medicines, hospital.

Return ONLY a raw, valid JSON object (no markdown codeblocks) with these keys:
{
  "is_income": boolean (true if income/salary/received, false if expense),
  "amount": number (numeric value),
  "category": string (one of: Food, Shopping, Transport, Bills, Entertainment, Health, Savings, Investments),
  "merchant": string or null (merchant, store, or brand name if mentioned e.g. "Zara"),
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
    const catInfo = await findCategoryId(parsed.category);
    const merchant = parsed.merchant || 'Voice Entry';
    const note = parsed.note || transcribedText;

    await bot.deleteMessage(chatId, processingMsg.message_id);

    if (parsed.is_income) {
      await pool.query(
        `INSERT INTO incomes (user_id, source, amount, date, is_salary) VALUES ($1, $2, $3, CURRENT_DATE, $4)`,
        [userId, note || 'Voice Income', amount, (parsed.category || '').toLowerCase() === 'salary']
      );
      return bot.sendMessage(chatId, `💰 Added ₹${amount.toLocaleString()} as income!`, { parse_mode: 'Markdown' });
    }

    // Check Duplicate Expense
    const duplicate = await checkDuplicateExpense(userId, catInfo.id, amount);
    if (duplicate) {
      const pendingId = `dup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      pendingDuplicates.set(pendingId, { userId, categoryId: catInfo.id, amount, description: note, merchant, catName: catInfo.name });

      return bot.sendMessage(
        chatId,
        `⚠️ *Possible Duplicate Voice Expense Detected!*\n━━━━━━━━━━━━━━━━━━\n💰 *Amount*: ₹${amount.toLocaleString()}\n🏷️ *Category*: ${catInfo.name}\n🗣️ *Speech*: "${transcribedText}"\n━━━━━━━━━━━━━━━━━━\nAn expense of ₹${amount.toLocaleString()} for *${catInfo.name}* already exists today.\n\nAre you sure you want to add this duplicate?`,
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

  const regex = /(\d+)\s+([a-zA-Z]+)(?:\s+(?:at|in|from)\s+)?([a-zA-Z\s]+)?/i;
  const match = text.match(regex);

  if (!match) {
    return bot.sendMessage(chatId, "🤔 Try text like: `500 food`, `1200 shopping at zara`, send a *voice note*, or a *receipt photo*!", { parse_mode: 'Markdown' });
  }

  const amount = parseFloat(match[1]);
  const keyword = match[2].toLowerCase().trim();

  let catInfo = await findCategoryId(keyword);
  let merchant = match[3] ? match[3].trim() : null;

  if (retailBrands.includes(keyword)) {
    catInfo = await findCategoryId('Shopping');
    if (!merchant) {
      merchant = keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  }

  const note = `Telegram: ${text}`;

  if (incomeKeywords.includes(keyword)) {
    await pool.query(
      `INSERT INTO incomes (user_id, source, amount, date, is_salary) VALUES ($1, $2, $3, CURRENT_DATE, $4)`,
      [userId, keyword, amount, keyword === 'salary']
    );
    if (keyword === 'salary') {
      await pool.query(`UPDATE users SET monthly_income = $1 WHERE id = $2`, [amount, userId]);
    }
    return bot.sendMessage(chatId, `💰 Added ₹${amount.toLocaleString()} as ${keyword}!`);
  }

  // Check Duplicate Expense
  const duplicate = await checkDuplicateExpense(userId, catInfo.id, amount);
  if (duplicate) {
    const pendingId = `dup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    pendingDuplicates.set(pendingId, { userId, categoryId: catInfo.id, amount, description: note, merchant, catName: catInfo.name });

    return bot.sendMessage(
      chatId,
      `⚠️ *Possible Duplicate Expense Detected!*\n━━━━━━━━━━━━━━━━━━\n💰 *Amount*: ₹${amount.toLocaleString()}\n🏷️ *Category*: ${catInfo.name}\n💬 *Text*: "${text}"\n━━━━━━━━━━━━━━━━━━\nAn expense of ₹${amount.toLocaleString()} for *${catInfo.name}* already exists today.\n\nAre you sure you want to add this duplicate?`,
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

  bot.sendMessage(chatId, `✅ Added ₹${amount.toLocaleString()} to *${catInfo.name}*!`, { parse_mode: 'Markdown' });
});

export default bot;