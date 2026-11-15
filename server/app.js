import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';
import incomeRoutes from './routes/income.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import budgetRoutes from './routes/budget.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import categoryRoutes from './routes/category.routes.js';
import goalRoutes from './routes/goal.routes.js';
import dnaRoutes from './routes/dna.routes.js';
import peerRoutes from './routes/peer.routes.js';
import aiRoutes from './routes/ai.routes.js';

const app = express();

// Security headers
app.use(helmet());

// CORS: only allow configured origins (comma-separated). Defaults to the Vite dev server.
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());
app.use(cors({ origin: allowedOrigins }));

app.use(express.json({ limit: '10mb' })); // receipt photos are sent as base64

// Rate limits: strict on credential endpoints, looser on AI (costly) endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please slow down.' },
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/dna', dnaRoutes);
app.use('/api/peer', peerRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api', aiLimiter, aiRoutes);

// Central error handler: never leak internals (SQL errors etc.) in production
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message =
    status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Server error'
      : err.message || 'Server error';
  res.status(status).json({ error: message });
});

export default app;
