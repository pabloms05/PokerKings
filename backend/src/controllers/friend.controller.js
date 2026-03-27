import { User, FriendRequest, Friend } from '../models/index.js';
import { Op } from 'sequelize';
import { getOnlineStatusForUsers } from '../config/socket.js';

export const sendFriendRequest = async (req, res) => {
  try {
    const { receiverId, friendId, username, email } = req.body;
    const senderId = req.userId;

    let resolvedReceiverId = receiverId || friendId || null;

    if (!resolvedReceiverId && username) {
      const normalizedUsername = String(username).trim();
      const userByUsername = await User.findOne({ where: { username: normalizedUsername } });
      resolvedReceiverId = userByUsername?.id || null;
    }

    if (!resolvedReceiverId && email) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const userByEmail = await User.findOne({ where: { email: normalizedEmail } });
      resolvedReceiverId = userByEmail?.id || null;
    }

    if (!resolvedReceiverId) {
      return res.status(400).json({ message: 'receiverId, friendId, username or email is required' });
    }

    if (senderId === resolvedReceiverId) {
      return res.status(400).json({ message: 'Cannot send request to yourself' });
    }

    const receiver = await User.findByPk(resolvedReceiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    const alreadyFriends = await Friend.findOne({
      where: { userId: senderId, friendId: resolvedReceiverId }
    });
    if (alreadyFriends) {
      return res.status(400).json({ message: 'You are already friends' });
    }

    const existingRequest = await FriendRequest.findOne({
      where: {
        status: 'pending',
        [Op.or]: [
          { senderId, receiverId: resolvedReceiverId },
          { senderId: resolvedReceiverId, receiverId: senderId }
        ]
      }
    });
    if (existingRequest) {
      return res.status(400).json({ message: 'Request already sent' });
    }

    const request = await FriendRequest.create({
      senderId,
      receiverId: resolvedReceiverId,
      status: 'pending'
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.userId;

    const request = await FriendRequest.findByPk(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.receiverId !== userId) {
      return res.status(403).json({ message: 'Cannot accept other users requests' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    request.status = 'accepted';
    await request.save();

    // Create friendship both ways, idempotent when repeated.
    await Friend.findOrCreate({
      where: { userId: request.senderId, friendId: request.receiverId },
      defaults: { userId: request.senderId, friendId: request.receiverId }
    });
    await Friend.findOrCreate({
      where: { userId: request.receiverId, friendId: request.senderId },
      defaults: { userId: request.receiverId, friendId: request.senderId }
    });

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.userId;
    const request = await FriendRequest.findByPk(requestId);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.receiverId !== userId) {
      return res.status(403).json({ message: 'Cannot reject other users requests' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    request.status = 'rejected';
    await request.save();

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFriends = async (req, res) => {
  try {
    const userId = req.params.id || req.userId;
    const friends = await Friend.findAll({
      where: { userId },
      include: [{ association: 'friend', attributes: ['id', 'username', 'avatar', 'chips'] }]
    });

    const friendsList = friends.map(f => f.friend);
    res.json(friendsList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.userId;
    const requests = await FriendRequest.findAll({
      where: { receiverId: userId, status: 'pending' },
      include: [{ association: 'sender', attributes: ['id', 'username', 'avatar'] }]
    });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.userId;

    await Friend.destroy({
      where: { userId, friendId }
    });
    await Friend.destroy({
      where: { userId: friendId, friendId: userId }
    });

    res.json({ message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFriendsOnlineStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const idsParam = req.query?.ids;

    if (!idsParam) {
      return res.status(400).json({ message: 'ids is required' });
    }

    const requestedIds = String(idsParam)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (requestedIds.length === 0) {
      return res.status(400).json({ message: 'ids is required' });
    }

    const friendships = await Friend.findAll({
      where: {
        userId,
        friendId: { [Op.in]: requestedIds }
      },
      attributes: ['friendId']
    });

    const allowedFriendIds = friendships.map((f) => String(f.friendId));
    const onlineStatus = getOnlineStatusForUsers(allowedFriendIds);

    res.json({ onlineStatus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
