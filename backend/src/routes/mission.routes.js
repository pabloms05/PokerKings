import express from 'express';
import {
  getMissions,
  checkMissionProgress,
  claimMissionReward
} from '../controllers/mission.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/:userId', authMiddleware, getMissions);
router.post('/check/:userId', authMiddleware, checkMissionProgress);
router.post('/:missionId/claim', authMiddleware, claimMissionReward);

export default router;
