import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './env.js';
import { setupLobbySocket } from '../sockets/lobby.socket.js';
import { setupTableSocket } from '../sockets/table.socket.js';
import { Friend } from '../models/index.js';

let ioInstance = null;
const connectedSocketsByUserId = new Map();

const markUserConnected = (userId, socketId) => {
  const key = String(userId);
  const wasOnline = connectedSocketsByUserId.has(key);
  if (!connectedSocketsByUserId.has(key)) {
    connectedSocketsByUserId.set(key, new Set());
  }
  connectedSocketsByUserId.get(key).add(socketId);
  return !wasOnline;
};

const markUserDisconnected = (userId, socketId) => {
  const key = String(userId);
  const userSockets = connectedSocketsByUserId.get(key);
  if (!userSockets) return false;

  userSockets.delete(socketId);
  if (userSockets.size === 0) {
    connectedSocketsByUserId.delete(key);
    return true;
  }

  return false;
};

const emitPresenceToFriends = async (io, userId, online) => {
  const friendships = await Friend.findAll({
    where: { userId },
    attributes: ['friendId']
  });

  const friendIds = friendships.map((friendship) => String(friendship.friendId));
  friendIds.forEach((friendId) => {
    io.to(`user_${friendId}`).emit('friend:presence', {
      userId: String(userId),
      online: !!online
    });
  });
};

const emitPresenceSnapshotToSocket = async (socket) => {
  const requesterId = socket.data?.userId;
  if (!requesterId) return;

  const friendships = await Friend.findAll({
    where: { userId: requesterId },
    attributes: ['friendId']
  });

  const friendIds = friendships.map((friendship) => String(friendship.friendId));
  const onlineStatus = getOnlineStatusForUsers(friendIds);

  socket.emit('friends:presence:snapshot', { onlineStatus });
};

export const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  ioInstance = io;

  io.on('connection', (socket) => {
    try {
      const token = socket.handshake?.auth?.token;
      if (token) {
        const decoded = jwt.verify(token, config.jwtSecret);
        socket.data.userId = decoded?.id || null;
        if (socket.data.userId) {
          // Personal room for direct events (game invitations, notifications, etc.)
          socket.join(`user_${socket.data.userId}`);
          const becameOnline = markUserConnected(socket.data.userId, socket.id);
          if (becameOnline) {
            emitPresenceToFriends(io, socket.data.userId, true).catch((err) => {
              console.warn('⚠️ No se pudo emitir estado online a amigos:', err.message);
            });
          }

          emitPresenceSnapshotToSocket(socket).catch((err) => {
            console.warn('⚠️ No se pudo emitir snapshot de presencia:', err.message);
          });
        }
      }
    } catch {
      socket.data.userId = null;
    }

    console.log('👤 User connected:', socket.id);

    setupLobbySocket(io, socket);
    setupTableSocket(io, socket);

    socket.on('friends:presence:request', async () => {
      try {
        await emitPresenceSnapshotToSocket(socket);
      } catch (err) {
        console.warn('⚠️ Error enviando friends:presence:snapshot:', err.message);
      }
    });

    socket.on('disconnect', () => {
      if (socket.data?.userId) {
        const becameOffline = markUserDisconnected(socket.data.userId, socket.id);
        if (becameOffline) {
          emitPresenceToFriends(io, socket.data.userId, false).catch((err) => {
            console.warn('⚠️ No se pudo emitir estado offline a amigos:', err.message);
          });
        }
      }
      console.log('👋 User disconnected:', socket.id);
    });
  });

  return io;
};

// Exportar instancia para usar en controladores
export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO no está inicializado');
  }
  return ioInstance;
};

export const isUserOnline = (userId) => {
  if (!userId) return false;
  return connectedSocketsByUserId.has(String(userId));
};

export const getOnlineStatusForUsers = (userIds = []) => {
  const status = {};
  for (const userId of userIds) {
    const key = String(userId);
    status[key] = connectedSocketsByUserId.has(key);
  }
  return status;
};
