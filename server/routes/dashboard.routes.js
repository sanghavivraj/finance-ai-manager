import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { summary, health, report, monthlyComparison } from '../controllers/dashboard.controller.js';

const r = Router();
r.use(auth);

r.get('/summary', summary);
r.get('/health', health);
r.get('/report', report); // ✅ MAKE SURE THIS EXISTS
r.get('/monthly-comparison', monthlyComparison);

export default r;