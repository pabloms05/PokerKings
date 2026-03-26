import express from 'express';
import { getUser, updateUser, getUserStats } from '../controllers/user.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/:id', authMiddleware, getUser);
router.put('/:id', authMiddleware, updateUser);
router.get('/:id/stats', authMiddleware, getUserStats);

export default router;
