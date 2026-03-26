import express from 'express';
import { getShopItems, purchaseItem } from '../controllers/shop.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/items', getShopItems);
router.post('/purchase', authMiddleware, purchaseItem);

export default router;
