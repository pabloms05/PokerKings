// Socket.IO Service - Para comunicación en tiempo real
import io from 'socket.io-client';

const resolveSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  // In production behind reverse proxy, always use same-origin socket endpoint.
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:3000';
};

const SOCKET_URL = resolveSocketUrl();

let socket = null;

export const socketService = {
  // Conectar al servidor
  connect: (token) => {
    if (socket) return socket;

    socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Eventos de conexión
    socket.on('connect', () => {
      console.log('✅ Conectado al servidor via WebSocket');
    });

    socket.on('disconnect', () => {
      console.log('❌ Desconectado del servidor');
    });

    socket.on('error', (error) => {
      console.error('❌ Error de Socket.IO:', error);
    });

    return socket;
  },

  // Desconectar
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  // ============= EVENTOS DE LOBBY =============
  joinLobby: (callback) => {
    socket?.emit('lobby:join', callback);
  },

  leaveLobby: (callback) => {
    socket?.emit('lobby:leave', callback);
  },

  refreshLobby: (callback) => {
    socket?.emit('lobby:refresh', callback);
  },

  onLobbyUpdate: (callback) => {
    socket?.on('lobby:update', callback);
  },

  // ============= EVENTOS DE MESA =============
  joinTable: (tableId, callback) => {
    socket?.emit('table:join', { tableId }, callback);
  },

  leaveTable: (tableId, callback) => {
    socket?.emit('table:leave', { tableId }, callback);
  },

  onTableUpdate: (callback) => {
    socket?.on('table:update', callback);
  },

  // ============= EVENTOS DE JUEGO =============
  startGame: (tableId, callback) => {
    socket?.emit('game:start', { tableId }, callback);
  },

  playAction: (tableId, action, amount, callback) => {
    socket?.emit('game:action', { tableId, action, amount }, callback);
  },

  onGameUpdate: (callback) => {
    socket?.on('game:update', callback);
  },

  onGameEnd: (callback) => {
    socket?.on('game:end', callback);
  },

  // ============= EVENTOS DE CHAT (Opcional) =============
  sendMessage: (tableId, message) => {
    socket?.emit('chat:message', { tableId, message });
  },

  onMessage: (callback) => {
    socket?.on('chat:message', callback);
  },

  onGameInvitation: (callback) => {
    socket?.on('game:invitation', callback);
  },

  onFriendPresence: (callback) => {
    socket?.on('friend:presence', callback);
  },

  offFriendPresence: (callback) => {
    if (callback) {
      socket?.off('friend:presence', callback);
      return;
    }
    socket?.off('friend:presence');
  },

  onFriendsPresenceSnapshot: (callback) => {
    socket?.on('friends:presence:snapshot', callback);
  },

  offFriendsPresenceSnapshot: (callback) => {
    if (callback) {
      socket?.off('friends:presence:snapshot', callback);
      return;
    }
    socket?.off('friends:presence:snapshot');
  },

  requestFriendsPresenceSnapshot: () => {
    socket?.emit('friends:presence:request');
  },

  // Remover listeners
  offLobbyUpdate: () => {
    socket?.off('lobby:update');
  },

  offTableUpdate: () => {
    socket?.off('table:update');
  },

  offGameUpdate: () => {
    socket?.off('game:update');
  },

  offGameEnd: () => {
    socket?.off('game:end');
  },

  offMessage: () => {
    socket?.off('chat:message');
  },

  offGameInvitation: (callback) => {
    if (callback) {
      socket?.off('game:invitation', callback);
      return;
    }
    socket?.off('game:invitation');
  },

  // Obtener socket actual
  getSocket: () => socket,
};

export default socketService;
