// server/routes/income.routes.js
import { Router } from 'express';
import { add, list, remove } from '../controllers/income.controller.js';
import { auth } from '../middleware/auth.js';
const r = Router(); r.use(auth);
r.post('/', add); r.get('/', list); r.delete('/:id', remove);
export default r;