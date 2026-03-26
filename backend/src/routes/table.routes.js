import express from 'express';
import { getTables, getTable, createTable, joinTable, leaveTable } from '../controllers/table.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', getTables);
router.get('/:id', getTable);
router.post('/', authMiddleware, createTable);
router.post('/:id/join', authMiddleware, joinTable);
router.post('/:id/leave', authMiddleware, leaveTable);

export default router;
