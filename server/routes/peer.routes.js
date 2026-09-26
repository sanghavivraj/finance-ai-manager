import express from 'express';
import { getPeerBenchmark } from '../controllers/peer.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, getPeerBenchmark);

export default router;
