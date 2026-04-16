import express from 'express';
import { getMyAchievements } from '../controllers/achievement.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', authMiddleware, getMyAchievements);

export default router;
