import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { list, update, generateWithAI } from '../controllers/budget.controller.js';

const r = Router();
r.use(auth);

r.get('/', list);
r.put('/:id', update);
r.post('/generate-ai', generateWithAI);

export default r;