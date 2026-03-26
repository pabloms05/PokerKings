import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './env.js';
import { setupLobbySocket } from '../sockets/lobby.socket.js';
import { setupTableSocket } from '../sockets/table.socket.js';

let ioInstance = null;

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
        }
      }
    } catch {
      socket.data.userId = null;
    }

    console.log('👤 User connected:', socket.id);

    setupLobbySocket(io, socket);
    setupTableSocket(io, socket);

    socket.on('disconnect', () => {
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
