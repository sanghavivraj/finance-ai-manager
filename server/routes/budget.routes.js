// server/routes/budget.routes.js
import { Router } from 'express';
import * as c from '../controllers/budget.controller.js';
import { auth } from '../middleware/auth.js';
const r = Router(); r.use(auth);
r.post('/generate', c.generate);
r.get('/', c.list);
r.put('/:id', c.update);
r.post('/rebalance', c.rebalance);
export default r;