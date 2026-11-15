import dotenv from 'dotenv';
// MUST be first — before any route/controller imports that read process.env
dotenv.config();

const { default: app } = await import('./app.js');
await import('./telegramBot.js');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
