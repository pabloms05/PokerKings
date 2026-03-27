import express from 'express';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getFriendsOnlineStatus,
  searchUsersForFriendRequest,
  getPendingRequests,
  removeFriend
} from '../controllers/friend.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/requests/pending', authMiddleware, getPendingRequests);
router.get('/online-status', authMiddleware, getFriendsOnlineStatus);
router.get('/search', authMiddleware, searchUsersForFriendRequest);
router.post('/request', authMiddleware, sendFriendRequest);
router.post('/request/:requestId/accept', authMiddleware, acceptFriendRequest);
router.post('/request/:requestId/reject', authMiddleware, rejectFriendRequest);
router.get('/', authMiddleware, getFriends);
router.get('/:id', authMiddleware, getFriends);
router.delete('/:friendId', authMiddleware, removeFriend);

export default router;
