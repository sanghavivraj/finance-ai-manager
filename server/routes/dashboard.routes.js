import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { summary, report, monthlyComparison } from '../controllers/dashboard.controller.js';
import { getHealthScore } from '../controllers/health.controller.js';

const r = Router();
r.use(auth);

r.get('/summary', summary);
r.get('/report', report);
r.get('/monthly-comparison', monthlyComparison);
r.get('/health', getHealthScore); // Add this

export default r;