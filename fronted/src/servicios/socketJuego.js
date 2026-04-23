// Servicio WebSocket para conectar con el backend en tiempo real
import io from 'socket.io-client';

const esHostLocal = (valor) => {
  const texto = String(valor || '').toLowerCase();
  return texto.includes('localhost') || texto.includes('127.0.0.1') || texto.includes('0.0.0.0');
};

const resolveSocketUrl = () => {
  const socketEnv = String(import.meta.env.VITE_SOCKET_URL || '').trim();

  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origenActual = window.location.origin;
    const hostnameActual = String(window.location.hostname || '').toLowerCase();

    // Si está configurado como relativo, mantenemos mismo origen.
    if (socketEnv === '/' || socketEnv === './' || socketEnv === '.') {
      return origenActual;
    }

    // Si viene localhost pero estamos en un dominio/dispositivo externo, usamos same-origin.
    if (socketEnv && esHostLocal(socketEnv) && !esHostLocal(hostnameActual)) {
      return origenActual;
    }

    if (socketEnv) {
      return socketEnv;
    }

    return origenActual;
  }

  if (socketEnv) {
    return socketEnv;
  }

  return 'http://localhost:3000';
};

const SOCKET_URL = resolveSocketUrl();

class GameSocketService {
  constructor() {
    this.socket = null;
    this.gameId = null;
    this.listeners = {};
  }

  connect() {
    // Verificar que el token existe antes de conectar
    const token = sessionStorage.getItem('token');
    if (!token) {
      console.warn('⚠️ No hay token de autenticación, no se puede conectar al WebSocket');
      return null;
    }

    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        auth: {
          token,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        timeout: 10000,
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('🔌 Conectado al servidor WebSocket');
        this.emit('socketConnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Error de conexión WebSocket:', error?.message || error);
        this.emit('socketError', error);
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Desconectado del servidor');
        this.emit('socketDisconnected');
      });

      this.socket.on('error', (error) => {
        console.error('❌ Error WebSocket:', error);
        this.emit('socketError', error);
      });

      // Eventos del juego
      this.socket.on('gameStarted', (gameData) => {
        console.log('🎮 gameStarted recibido:', gameData);
        this.emit('gameStarted', gameData);
      });

      this.socket.on('gameState', (gameState) => {
        console.log('🎮 gameState recibido:', gameState);
        this.emit('gameStateUpdated', gameState);
      });

      this.socket.on('gameStateUpdated', (gameState) => {
        console.log('🎮 gameStateUpdated recibido directo:', gameState);
        this.emit('gameStateUpdated', gameState);
      });

      this.socket.on('playerAction', (actionData) => {
        this.emit('playerActionReceived', actionData);
      });

      this.socket.on('phaseChanged', (phaseData) => {
        this.emit('phaseChanged', phaseData);
      });

      this.socket.on('showdown', (showdownData) => {
        this.emit('showdown', showdownData);
      });

      this.socket.on('handOver', (handData) => {
        this.emit('handOver', handData);
      });

      this.socket.on('turn:deadline', (deadlineData) => {
        this.emit('turnDeadline', deadlineData);
      });

      this.socket.on('gameEnded', (gameData) => {
        this.emit('gameEnded', gameData);
      });

      this.socket.on('playerJoined', (playerData) => {
        this.emit('playerJoined', playerData);
      });

      this.socket.on('playerLeft', (playerData) => {
        this.emit('playerLeft', playerData);
      });

      this.socket.on('table:chat:new', (chatMessage) => {
        this.emit('tableChatMessage', chatMessage);
      });

      this.socket.on('table:chat:history', (chatPayload) => {
        this.emit('tableChatHistory', chatPayload);
      });
    }

    // Si el socket ya existe pero quedó desconectado, reintentar explícitamente.
    this.socket.auth = { token };
    if (!this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
  }

  waitForConnection(timeoutMs = 12000) {
    const socket = this.connect();
    if (!socket) {
      return Promise.reject(new Error('No hay token de autenticación para WebSocket'));
    }

    if (socket.connected) {
      return Promise.resolve(socket);
    }

    return new Promise((resolve, reject) => {
      let ultimoError = null;

      const limpiar = () => {
        clearTimeout(temporizador);
        socket.off('connect', alConectar);
        socket.off('connect_error', alErrorConectar);
      };

      const alConectar = () => {
        limpiar();
        resolve(socket);
      };

      const alErrorConectar = (error) => {
        ultimoError = error;
      };

      const temporizador = setTimeout(() => {
        limpiar();
        if (ultimoError?.message) {
          reject(new Error(`Socket no conectado (${ultimoError.message})`));
          return;
        }
        reject(new Error(`Socket no se pudo conectar en ${Math.round(timeoutMs / 1000)} segundos`));
      }, timeoutMs);

      socket.on('connect', alConectar);
      socket.on('connect_error', alErrorConectar);

      if (!socket.connected) {
        socket.connect();
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Unirse a una partida
  joinGame(gameId, userId) {
    this.gameId = gameId;
    if (this.socket) {
      this.socket.emit('joinGame', { gameId, userId });
    }
  }

  // Unirse a la sala de una mesa
  joinTable(tableId) {
    return this.waitForConnection(12000).then(() => new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket no inicializado'));
        return;
      }

      console.log(`📤 Emitiendo table:join para ${tableId}`);

      const timeoutAck = setTimeout(() => {
        reject(new Error('No hubo confirmación de unión a la sala'));
      }, 6000);

      this.socket.emit('table:join', tableId, (response) => {
        clearTimeout(timeoutAck);
        if (response && response.success) {
          console.log(`✅ Confirmado: unido a sala table_${tableId}`);
          resolve(response);
          return;
        }

        const mensaje = response?.error || 'No se pudo unir a la sala';
        console.error('❌ Error al unirse a la sala:', response);
        reject(new Error(mensaje));
      });
    }));
  }

  leaveTable(tableId) {
    if (this.socket && tableId) {
      this.socket.emit('table:leave', tableId);
    }
  }

  requestTableChatHistory(tableId) {
    if (this.socket && tableId) {
      this.socket.emit('table:chat:history', { tableId });
    }
  }

  sendTableChatMessage(tableId, message) {
    return new Promise((resolve, reject) => {
      if (!tableId || !String(message || '').trim()) {
        reject(new Error('Mensaje inválido'));
        return;
      }

      if (!this.isConnected()) {
        reject(new Error('Socket desconectado'));
        return;
      }

      this.socket.emit('table:chat:send', { tableId, message }, (response) => {
        if (response && response.success) {
          resolve(response.message);
          return;
        }
        reject(new Error(response?.error || 'No se pudo enviar el mensaje'));
      });
    });
  }

  // Salir de una partida
  leaveGame(gameId, userId) {
    if (this.socket) {
      this.socket.emit('leaveGame', { gameId, userId });
    }
  }

  // Enviar acción del jugador
  playerAction(gameId, userId, action, amount = 0) {
    if (this.socket) {
      this.socket.emit('playerAction', {
        gameId,
        userId,
        action, // fold, check, call, raise, allIn
        amount,
      });
    }
  }

  // Obtener estado del juego
  getGameState(gameId) {
    if (this.socket) {
      this.socket.emit('getGameState', { gameId });
    }
  }

  // Suscribirse a eventos
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // Desuscribirse de eventos
  off(event, callback) {
    if (!this.listeners[event]) return;

    if (typeof callback !== 'function') {
      delete this.listeners[event];
      return;
    }

    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  // Emitir eventos internos
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  // Verificar si está conectado
  isConnected() {
    return this.socket && this.socket.connected;
  }
}

export const gameSocket = new GameSocketService();
