import { Router } from 'express';
import { add, list, remove, getByCategory } from '../controllers/expense.controller.js';
import { auth } from '../middleware/auth.js';
const r = Router(); r.use(auth);
r.post('/', add); 
r.get('/', list); 
r.get('/by-category/:categoryId', getByCategory);
r.delete('/:id', remove);
export default r;