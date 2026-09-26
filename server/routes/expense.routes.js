import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { add, list, remove, getByCategory, update, scanReceipt } from '../controllers/expense.controller.js';
import { getMoneyDNA } from '../controllers/dna.controller.js';

const r = Router();
r.use(auth);

r.post('/scan-receipt', scanReceipt);
r.post('/', add);
r.get('/', list);
r.get('/dna', getMoneyDNA); 
r.put('/:id', update);
r.delete('/:id', remove);
r.get('/by-category/:categoryId', getByCategory);

export default r;