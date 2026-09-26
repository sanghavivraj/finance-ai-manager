import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { list, update, generateWithAI, frictionCheck, marketEstimate } from '../controllers/budget.controller.js';

const r = Router();
r.use(auth);

r.get('/', list);
r.put('/:id', update);
r.post('/generate-ai', generateWithAI);
r.post('/market-estimate', marketEstimate);
r.post('/friction-check', frictionCheck);

export default r;