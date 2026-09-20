import express from 'express';
import { getFinancialDNA } from '../controllers/dna.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, getFinancialDNA);

export default router;
