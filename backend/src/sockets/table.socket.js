import { Game, Table, Hand, HandAction, User, TableChatMessage } from '../models/index.js';
import pokerEngine from '../services/pokerEngine.js';
import { emitLobbyTables } from './lobby.socket.js';
import { getGameState } from '../services/game.service.js';
import { filterChat } from '../services/chatModeration.js';

const MAX_CHAT_MESSAGES_PER_TABLE = 60;
const MAX_CHAT_MESSAGE_LENGTH = 300;
const SPAM_WINDOW_MS = 10 * 1000;
const SPAM_MAX_MESSAGES = 5;
const SPAM_MUTE_MS = 60 * 1000;
const DUPLICATE_WINDOW_MS = 30 * 1000;
const DUPLICATE_MAX = 3;
const spamWindowByUserTable = new Map();
const mutedUntilByUserTable = new Map();

const userTableKey = (tableId, userId) => `${String(tableId)}:${String(userId)}`;

const getMuteRemainingMs = (tableId, userId) => {
  const key = userTableKey(tableId, userId);
  const mutedUntil = mutedUntilByUserTable.get(key);
  if (!mutedUntil) return 0;
  return Math.max(0, mutedUntil - Date.now());
};

const registerChatAndCheckSpam = (tableId, userId, message) => {
  const key = userTableKey(tableId, userId);
  const now = Date.now();
  const existing = spamWindowByUserTable.get(key) || [];

  const trimmedMessage = String(message || '').trim().toLowerCase();
  const recent = existing.filter(entry => now - entry.timestamp <= DUPLICATE_WINDOW_MS);
  recent.push({ timestamp: now, message: trimmedMessage });
  spamWindowByUserTable.set(key, recent);

  const windowMessages = recent.filter(entry => now - entry.timestamp <= SPAM_WINDOW_MS);
  const duplicateCount = recent.filter(entry => entry.message && entry.message === trimmedMessage).length;

  if (windowMessages.length > SPAM_MAX_MESSAGES || duplicateCount >= DUPLICATE_MAX) {
    mutedUntilByUserTable.set(key, now + SPAM_MUTE_MS);
    return false;
  }

  return true;
};

const loadTableChatMessages = async (tableId) => {
  const records = await TableChatMessage.findAll({
    where: { tableId: String(tableId) },
    include: [{ model: User, attributes: ['id', 'username', 'avatar'] }],
    order: [['createdAt', 'DESC']],
    limit: MAX_CHAT_MESSAGES_PER_TABLE
  });

  return records
    .reverse()
    .map((record) => ({
      id: record.id,
      tableId: record.tableId,
      userId: record.userId,
      username: record.User?.username || 'Jugador',
      avatar: record.User?.avatar || '🎭',
      message: record.message,
      createdAt: record.createdAt
    }));
};

export const setupTableSocket = (io, socket) => {
  const syncLeaveTable = async (tableId) => {
    if (!tableId) return;
    try {
      const table = await Table.findByPk(tableId);
      if (!table) return;

      const userId = socket.data?.userId;
      if (userId) {
        const key = userTableKey(tableId, userId);
        spamWindowByUserTable.delete(key);
        mutedUntilByUserTable.delete(key);
      }

      const game = await Game.findOne({
        where: {
          tableId,
          status: ['active', 'waiting']
        },
        order: [['updatedAt', 'DESC']]
      });

      if (game && Array.isArray(game.players)) {
        if (userId) {
          const nextPlayers = JSON.parse(JSON.stringify(game.players));
          const idx = nextPlayers.findIndex(p => p.userId === userId);
          if (idx !== -1 && !nextPlayers[idx].isSittingOut) {
            nextPlayers[idx].isSittingOut = true;
            nextPlayers[idx].folded = true;
            nextPlayers[idx].hand = null;
            nextPlayers[idx].holeCards = null;
            nextPlayers[idx].committed = 0;
            nextPlayers[idx].betInPhase = 0;
            nextPlayers[idx].lastAction = null;
            game.players = nextPlayers;
            game.changed('players', true);
            await game.save();

            try {
              io.to(`table_${tableId}`).emit('gameStateUpdated', await getGameState(game.id, false));
            } catch (emitErr) {
              console.warn(`⚠️ No se pudo emitir gameStateUpdated tras table:leave en mesa ${tableId}:`, emitErr.message);
            }
          }
        }

        const seated = game.players.filter(p => !p.isSittingOut).length;
        table.currentPlayers = Math.max(0, seated);
        table.status = seated >= 2 ? 'playing' : 'waiting';
      } else {
        table.currentPlayers = 0;
        table.status = 'waiting';
      }

      await table.save();
      await emitLobbyTables(io);
      console.log(`👋 Socket ${socket.id} salió de mesa ${tableId}. currentPlayers=${table.currentPlayers}`);
    } catch (error) {
      console.error(`❌ Error actualizando mesa al salir socket ${socket.id}:`, error.message);
    }
  };

  socket.on('table:join', async (tableId, callback) => {
    console.log(`🔌 Socket ${socket.id} uniéndose a sala table_${tableId}`);
    socket.data.tableId = tableId;
    socket.join(`table_${tableId}`);
    const table = await Table.findByPk(tableId);
    socket.emit('table:state', table);
    console.log(`✅ Socket ${socket.id} unido a sala table_${tableId}`);
    
    // Enviar confirmación al cliente
    if (callback && typeof callback === 'function') {
      callback({ success: true, tableId });
    }

    const chatHistory = await loadTableChatMessages(tableId);
    socket.emit('table:chat:history', {
      tableId,
      messages: chatHistory
    });
  });

  socket.on('table:chat:history', async (payload = {}, callback) => {
    try {
      const tableId = payload?.tableId;
      if (!tableId) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'tableId es requerido' });
        }
        return;
      }

      const normalizedTableId = String(tableId);
      const activeTableId = String(socket.data?.tableId || '');
      if (activeTableId !== normalizedTableId) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Debes unirte a la mesa para ver el chat' });
        }
        return;
      }

      const historyPayload = {
        tableId: normalizedTableId,
        messages: await loadTableChatMessages(normalizedTableId)
      };

      socket.emit('table:chat:history', historyPayload);

      if (typeof callback === 'function') {
        callback({ success: true, ...historyPayload });
      }
    } catch (error) {
      console.error('❌ Error en table:chat:history:', error.message);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'No se pudo cargar el historial' });
      }
    }
  });

  socket.on('table:chat:send', async (payload = {}, callback) => {
    try {
      const tableId = payload?.tableId;
      const message = String(payload?.message || '').trim();
      const userId = socket.data?.userId;

      if (!tableId) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'tableId es requerido' });
        }
        return;
      }

      if (!userId) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'No autenticado' });
        }
        return;
      }

      if (!message) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'El mensaje está vacío' });
        }
        return;
      }

      if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
        if (typeof callback === 'function') {
          callback({ success: false, error: `Máximo ${MAX_CHAT_MESSAGE_LENGTH} caracteres` });
        }
        return;
      }

      const filteredMessage = filterChat(message);

      const normalizedTableId = String(tableId);
      const activeTableId = String(socket.data?.tableId || '');
      if (activeTableId !== normalizedTableId) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Debes unirte a la mesa para usar el chat' });
        }
        return;
      }

      const muteRemainingMs = getMuteRemainingMs(normalizedTableId, userId);
      if (muteRemainingMs > 0) {
        if (typeof callback === 'function') {
          callback({
            success: false,
            code: 'CHAT_MUTED',
            error: `Silenciado temporalmente por spam. Intenta en ${Math.ceil(muteRemainingMs / 1000)}s`
          });
        }
        return;
      }

      const passSpamCheck = registerChatAndCheckSpam(normalizedTableId, userId, filteredMessage);
      if (!passSpamCheck) {
        if (typeof callback === 'function') {
          callback({
            success: false,
            code: 'CHAT_SPAM_DETECTED',
            error: `Demasiados mensajes. Silenciado por ${Math.ceil(SPAM_MUTE_MS / 1000)}s`
          });
        }
        return;
      }

      const user = await User.findByPk(userId);

      const storedMessage = await TableChatMessage.create({
        tableId: normalizedTableId,
        userId,
        message: filteredMessage
      });

      const chatMessage = {
        id: storedMessage.id,
        tableId: normalizedTableId,
        userId,
        username: user?.username || 'Jugador',
        avatar: user?.avatar || '🎭',
        message: filteredMessage,
        createdAt: storedMessage.createdAt
      };

      io.to(`table_${normalizedTableId}`).emit('table:chat:new', chatMessage);

      if (typeof callback === 'function') {
        callback({ success: true, message: chatMessage });
      }
    } catch (error) {
      console.error('❌ Error en table:chat:send:', error.message);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'No se pudo enviar el mensaje' });
      }
    }
  });

  socket.on('table:leave', async (tableId) => {
    socket.leave(`table_${tableId}`);
    if (socket.data?.userId && tableId) {
      const key = userTableKey(tableId, socket.data.userId);
      spamWindowByUserTable.delete(key);
      mutedUntilByUserTable.delete(key);
    }
    if (socket.data.tableId === tableId) {
      socket.data.tableId = null;
    }
    await syncLeaveTable(tableId);
  });

  socket.on('disconnecting', async () => {
    // No forzar sit-out por desconexiones transitorias de red/socket.
    // El estado de asiento se cambia solo por acciones explícitas del usuario
    // (leaveGame / table:leave), evitando sacar jugadores durante una mano.
    socket.data.tableId = null;
  });

  socket.on('game:action', async (data) => {
    const { tableId, action, amount } = data;
    
    const game = await Game.findOne({
      where: { tableId, status: 'active' }
    });
    if (!game) return;

    // Update game state based on action
    io.to(`table_${tableId}`).emit('game:update', game);
  });

  socket.on('game:start', async (tableId) => {
    const table = await Table.findByPk(tableId);
    
    if (table.currentPlayers < 2) {
      socket.emit('error', { message: 'Not enough players' });
      return;
    }

    const hands = pokerEngine.dealCards(table.currentPlayers);
    
    const game = await Game.create({
      tableId,
      pot: table.smallBlind + table.bigBlind,
      status: 'active'
    });

    table.status = 'playing';
    await table.save();

    io.to(`table_${tableId}`).emit('game:started', game);
  });
};
