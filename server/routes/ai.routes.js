import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import {
  askMoney,
  proactiveInsights,
  goalIntelligence,
  whatChanged,
} from '../controllers/ai.controller.js';

const r = Router();
r.use(auth);

r.post('/ask-your-money', askMoney);
r.get('/proactive-insights', proactiveInsights);
r.get('/goal-intelligence', goalIntelligence);
r.get('/what-changed', whatChanged);

export default r;
