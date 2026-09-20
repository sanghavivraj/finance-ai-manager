import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { list, create, deposit, remove } from '../controllers/goal.controller.js';

const r = Router();
r.use(auth);

r.get('/', list);
r.post('/', create);
r.post('/:id/deposit', deposit);
r.delete('/:id', remove);

export default r;
