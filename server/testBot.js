import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

console.log('Testing bot connection...');

bot.on('message', (msg) => {
  bot.sendMessage(msg.chat.id, 'Bot is working!');
});

console.log('✅ Bot is running!');