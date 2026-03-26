import express from 'express';
import {
  getHandHistory,
  getHandDetail,
  saveHand,
  saveHandAction,
  getHandStatistics
} from '../controllers/hand.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/history/:userId', authMiddleware, getHandHistory);
router.get('/:handId', authMiddleware, getHandDetail);
router.post('/', authMiddleware, saveHand);
router.post('/action', authMiddleware, saveHandAction);
router.get('/stats/:userId', authMiddleware, getHandStatistics);

export default router;
