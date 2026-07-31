import TelegramBot from 'node-telegram-bot-api';
import { pool } from './config/db.js';

console.log('🔑 Bot Token:', process.env.TELEGRAM_BOT_TOKEN ? 'Loaded' : 'MISSING!');

// Initialize bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

console.log(' Telegram Bot is running and listening...');

// Smart category mapping
const categoryMap = {
  'food': 'food', 'meal': 'food', 'lunch': 'food', 'dinner': 'food', 'breakfast': 'food',
  'shopping': 'shopping', 'shop': 'shopping', 'buy': 'shopping',
  'transport': 'transport', 'travel': 'transport', 'bus': 'transport', 'train': 'transport', 
  'uber': 'transport', 'ola': 'transport', 'fuel': 'transport', 'petrol': 'transport',
  'bills': 'bills', 'bill': 'bills', 'electricity': 'bills', 'water': 'bills', 'internet': 'bills', 'wifi': 'bills',
  'entertainment': 'entertainment', 'game': 'entertainment', 'games': 'entertainment', 
  'movie': 'entertainment', 'movies': 'entertainment', 'netflix': 'entertainment', 'fun': 'entertainment',
  'savings': 'savings', 'save': 'savings',
  'investments': 'investments', 'invest': 'investments', 'sip': 'investments', 'mutual fund': 'investments',
};

const incomeKeywords = ['salary', 'income', 'freelance', 'bonus', 'payment', 'received'];

// Link command
bot.onText(/\/link (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const email = match[1].trim();
  console.log(`🔗 Link attempt: ${email} from chat ${chatId}`);

  try {
    const { rows } = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (rows.length === 0) {
      console.log('❌ User not found');
      return bot.sendMessage(chatId, `❌ No account found with email: ${email}`);
    }
    
    await pool.query(`UPDATE users SET telegram_id = $1 WHERE id = $2`, [chatId, rows[0].id]);
    console.log('✅ User linked successfully');
    bot.sendMessage(chatId, `✅ Successfully linked! Now try: "500 food" or "500 game"`);
  } catch (error) {
    console.error('❌ Link error:', error);
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
});

// Balance command
bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const { rows } = await pool.query(`SELECT monthly_income FROM users WHERE telegram_id = $1`, [chatId]);
    if (rows.length === 0) return bot.sendMessage(chatId, "❌ Not linked. Use `/link your@email.com`");
    
    const income = rows[0].monthly_income || 0;
    const { rows: spentRows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = (SELECT id FROM users WHERE telegram_id = $1)`, 
      [chatId]
    );
    const spent = spentRows[0].total;
    
    bot.sendMessage(chatId, `💰 Balance:\nIncome: ₹${income}\nSpent: ₹${spent}\nRemaining: ₹${income - spent}`);
  } catch (error) {
    bot.sendMessage(chatId, "❌ Error fetching balance");
  }
});

// Status command
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const { rows } = await pool.query(`SELECT email, name FROM users WHERE telegram_id = $1`, [chatId]);
  if (rows.length === 0) {
    return bot.sendMessage(chatId, "❌ You are not linked to any account. Use `/link email@domain.com`");
  }
  bot.sendMessage(chatId, `✅ Linked to:\nName: ${rows[0].name}\nEmail: ${rows[0].email}`);
});

// Main message handler
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  console.log(`📩 Received: "${text}" from ${chatId}`);

  if (!text || text.startsWith('/')) return;

  // Find user
  const { rows: userRows } = await pool.query(`SELECT id FROM users WHERE telegram_id = $1`, [chatId]);
  if (userRows.length === 0) {
    console.log('⚠️ User not linked');
    return bot.sendMessage(chatId, "👋 Please link first: `/link vraj@example.com`", { parse_mode: 'Markdown' });
  }
  const userId = userRows[0].id;

    // Matches: "500 food", "500 food at burger king", "500 food burger king"
  const regex = /(\d+)\s+([a-zA-Z]+)(?:\s+(?:at|in|from)\s+)?([a-zA-Z\s]+)?/i; 
  const match = text.match(regex);

  if (!match) {
    console.log('❌ No match found');
    return bot.sendMessage(chatId, " Try: `500 food` or `500 game`", { parse_mode: 'Markdown' });
  }

  const amount = parseFloat(match[1]);
  const keyword = match[2].toLowerCase().trim();
  console.log(`Parsed: amount=${amount}, keyword=${keyword}`);

  // Check if expense
  const actualCategory = categoryMap[keyword];
  if (actualCategory) {
    try {
      const { rows: catRows } = await pool.query(`SELECT id FROM categories WHERE LOWER(name) = $1`, [actualCategory]);
      if (catRows.length === 0) {
        console.log(`❌ Category not found: ${actualCategory}`);
        return bot.sendMessage(chatId, `❌ Category '${actualCategory}' not found in database`);
      }

      const categoryId = catRows[0].id;
            const merchant = match[3] ? match[3].trim() : null;
      
      await pool.query(
        `INSERT INTO expenses (user_id, category_id, amount, description, date, merchant) 
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)`,
        [userId, categoryId, amount, `Telegram: ${text}`, merchant]
      );
      
      console.log(`✅ Expense added: ₹${amount} to ${actualCategory}`);
      bot.sendMessage(chatId, `✅ Added ₹${amount} to ${actualCategory}!`);
    } catch (error) {
      console.error('❌ Database error:', error);
      bot.sendMessage(chatId, `❌ Error saving: ${error.message}`);
    }
    return;
  }

  // Check if income
  if (incomeKeywords.includes(keyword)) {
    try {
      await pool.query(
        `INSERT INTO incomes (user_id, source, amount, date, is_salary) VALUES ($1, $2, $3, CURRENT_DATE, $4)`,
        [userId, keyword, amount, keyword === 'salary']
      );
      
      if (keyword === 'salary') {
        await pool.query(`UPDATE users SET monthly_income = $1 WHERE id = $2`, [amount, userId]);
      }

      console.log(`✅ Income added: ₹${amount} as ${keyword}`);
      bot.sendMessage(chatId, `💰 Added ₹${amount} as ${keyword}!`);
    } catch (error) {
      console.error('❌ Income error:', error);
      bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
    return;
  }

  // Fallback
  console.log(`❌ Unknown keyword: ${keyword}`);
  bot.sendMessage(chatId, "🤔 Try: `500 food`, `500 game`, or `20000 salary`", { parse_mode: 'Markdown' });
});

export default bot;