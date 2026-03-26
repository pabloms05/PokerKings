import { Game, Table, User, Hand, HandAction, Friend } from '../models/index.js';
import { Op } from 'sequelize';
import { getIO } from '../config/socket.js';
import {
  initializeGame,
  activateWaitingGame,
  processPlayerAction,
  getGameState,
  createDeck
} from '../services/game.service.js';
import { emitLobbyTables } from '../sockets/lobby.socket.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const TURN_TIMEOUT_MS = 45 * 1000;
const turnTimers = new Map();

const parsePlayers = (players) => {
  if (Array.isArray(players)) return players;
  if (typeof players === 'string') {
    try {
      return JSON.parse(players || '[]');
    } catch {
      return [];
    }
  }
  return [];
};

const clearTurnTimer = (gameId) => {
  const existing = turnTimers.get(gameId);
  if (existing) {
    clearTimeout(existing);
    turnTimers.delete(gameId);
  }
};

const emitHandOverIfNeeded = async (io, tableId, gameId, result) => {
  if (!result?.handOver) return;

  const winners = Array.isArray(result.winners) ? result.winners : [];
  const winnerIds = winners.map(w => w.userId).filter(Boolean);
  let winnerId = result.winner?.userId || result.winner?.id || winnerIds[0] || null;
  let winnerName = 'Desconocido';
  const potWon = result.potWon ?? winners.reduce((sum, w) => sum + (w.chipsWon || 0), 0);

  if (winners.length > 1) {
    const names = winners.map(w => w.username).filter(Boolean);
    winnerName = names.length > 0 ? `Empate: ${names.join(', ')}` : 'Empate';
  } else {
    const winnerUser = winnerId ? await User.findByPk(winnerId) : null;
    winnerName = winnerUser?.username || winners[0]?.username || winnerName;
  }

  io.to(`table_${tableId}`).emit('handOver', {
    gameId,
    tableId,
    winnerId,
    winnerName,
    winnerIds,
    winners,
    potWon
  });
};

const armTurnTimerForGame = async (gameId) => {
  clearTurnTimer(gameId);

  const game = await Game.findByPk(gameId);
  if (!game || game.status !== 'active') {
    return;
  }

  const players = parsePlayers(game.players);
  const currentPlayer = players[game.currentPlayerIndex];

  if (!currentPlayer) {
    return;
  }

  if (currentPlayer.folded || currentPlayer.isSittingOut || (parseInt(currentPlayer.chips, 10) || 0) <= 0) {
    return;
  }

  const expectedPlayerId = String(currentPlayer.userId);

  try {
    const io = getIO();
    io.to(`table_${game.tableId}`).emit('turn:deadline', {
      gameId: game.id,
      tableId: game.tableId,
      currentPlayerIndex: game.currentPlayerIndex,
      playerId: currentPlayer.userId,
      durationSeconds: Math.floor(TURN_TIMEOUT_MS / 1000),
      deadlineMs: Date.now() + TURN_TIMEOUT_MS
    });
  } catch (emitErr) {
    console.warn(`⚠️ No se pudo emitir turn:deadline para game ${gameId}:`, emitErr.message);
  }

  const timeoutId = setTimeout(async () => {
    try {
      turnTimers.delete(gameId);

      const freshGame = await Game.findByPk(gameId);
      if (!freshGame || freshGame.status !== 'active') {
        return;
      }

      const freshPlayers = parsePlayers(freshGame.players);
      const actingPlayer = freshPlayers[freshGame.currentPlayerIndex];
      if (!actingPlayer) {
        return;
      }

      // Si cambió el turno, rearma timer para el jugador correcto.
      if (String(actingPlayer.userId) !== expectedPlayerId) {
        await armTurnTimerForGame(gameId);
        return;
      }

      if (actingPlayer.folded || actingPlayer.isSittingOut || (parseInt(actingPlayer.chips, 10) || 0) <= 0) {
        await armTurnTimerForGame(gameId);
        return;
      }

      console.log(`⏱️ Timeout de turno (${TURN_TIMEOUT_MS}ms) en game ${gameId}. Auto-fold para user ${actingPlayer.userId}`);

      const result = await processPlayerAction(freshGame, actingPlayer.userId, 'fold', 0);

      const table = await Table.findByPk(freshGame.tableId);
      if (table) {
        const io = getIO();
        io.to(`table_${table.id}`).emit('gameStateUpdated', await getGameState(gameId, false));
        await emitHandOverIfNeeded(io, table.id, gameId, result);
      }

      await armTurnTimerForGame(gameId);
    } catch (error) {
      console.error(`❌ Error ejecutando timeout de turno en game ${gameId}:`, error.message);
    }
  }, TURN_TIMEOUT_MS);

  turnTimers.set(gameId, timeoutId);
};

const armTurnTimerForTable = async (tableId) => {
  if (!tableId) return;

  const activeGame = await Game.findOne({
    where: { tableId, status: 'active' },
    order: [['updatedAt', 'DESC']]
  });

  if (!activeGame) return;
  await armTurnTimerForGame(activeGame.id);
};

/**
 * Crear y iniciar un nuevo juego en una mesa
 * POST /games/start
 * Body: { tableId, playerIds: [uuid, uuid] }
 */
export const startGame = async (req, res) => {
  let tableId = null;
  try {
    let playerIds;
    ({ tableId, playerIds } = req.body || {});

    if (!tableId || !playerIds || playerIds.length < 1) {
      return res.status(400).json({ 
        error: 'Se requieren tableId y al menos 1 jugador' 
      });
    }

    // Verificar que la mesa existe
    const table = await Table.findByPk(tableId);
    if (!table) {
      return res.status(404).json({ error: 'Mesa no encontrada' });
    }

    // Buy-in fijo por asiento: 100 ciegas grandes.
    const tableBuyIn = Math.max(1, (parseInt(table.bigBlind, 10) || 0) * 100);

    // Verificar si hay juego activo o en espera
    const activeGame = await Game.findOne({
      where: { tableId, status: 'active' }
    });

    if (activeGame) {
      console.log('ℹ️  Ya hay un juego activo en la mesa');
      
      // Parsear players si es string
      const gamePlayers = typeof activeGame.players === 'string' 
        ? JSON.parse(activeGame.players || '[]')
        : (activeGame.players || []);
      
      const newPlayerId = playerIds[0];
      const userInGameIndex = gamePlayers.findIndex(p => p.userId === newPlayerId);
      const activeSeats = gamePlayers.filter(p => !p.isSittingOut).length;
      const userAlreadyInGame = userInGameIndex !== -1;
      
      if (userAlreadyInGame) {
        // Si estaba sentado fuera, permitir reingreso para la siguiente mano
        if (gamePlayers[userInGameIndex]?.isSittingOut) {
          // Al reingresar a la mesa se usa un stack fresco de buy-in
          // (el descuento se hace en /tables/:id/join).
          gamePlayers[userInGameIndex].chips = tableBuyIn;
          gamePlayers[userInGameIndex].isSittingOut = false;
          gamePlayers[userInGameIndex].folded = true;
          gamePlayers[userInGameIndex].hand = null;
          gamePlayers[userInGameIndex].holeCards = null;
          gamePlayers[userInGameIndex].committed = 0;
          gamePlayers[userInGameIndex].betInPhase = 0;
          gamePlayers[userInGameIndex].lastAction = null;

          activeGame.players = gamePlayers;
          activeGame.changed('players', true);
          await activeGame.save();

          const updatedActiveSeats = gamePlayers.filter(p => !p.isSittingOut).length;
          await table.update({
            currentPlayers: Math.min(table.maxPlayers, updatedActiveSeats),
            status: updatedActiveSeats >= 2 ? 'playing' : 'waiting'
          });

          try {
            await emitLobbyTables(getIO());
          } catch (emitErr) {
            console.warn('⚠️ No se pudo emitir lobby update:', emitErr.message);
          }
        }

        console.log('✅ Usuario ya está en el juego, devolviendo estado actual');
        return res.status(200).json({
          success: true,
          message: 'Ya estás en este juego',
          game: await getGameState(activeGame.id)
        });
      } else {
        // Permitir unirse a juego activo para entrar en la siguiente mano
        if (activeSeats >= table.maxPlayers) {
          return res.status(400).json({
            error: 'La mesa está llena'
          });
        }

        const user = await User.findByPk(newPlayerId);
        if (!user) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        gamePlayers.push({
          userId: user.id,
          chips: tableBuyIn,
          committed: 0,
          hand: null,
          folded: true,
          isSittingOut: false,
          lastAction: null,
          betInPhase: 0
        });

        activeGame.players = gamePlayers;
        activeGame.changed('players', true);
        await activeGame.save();

        const updatedActiveSeats = gamePlayers.filter(p => !p.isSittingOut).length;
        await table.update({
          currentPlayers: Math.min(table.maxPlayers, updatedActiveSeats),
          status: updatedActiveSeats >= 2 ? 'playing' : 'waiting'
        });

        try {
          await emitLobbyTables(getIO());
        } catch (emitErr) {
          console.warn('⚠️ No se pudo emitir lobby update:', emitErr.message);
        }

        const updatedState = await getGameState(activeGame.id);
        try {
          const io = getIO();
          io.to(`table_${tableId}`).emit('gameStateUpdated', updatedState);
        } catch (err) {
          console.warn('⚠️  No se pudo emitir evento WebSocket:', err.message);
        }

        return res.status(200).json({
          success: true,
          message: 'Te uniste a la mesa. Entrarás en la siguiente mano.',
          game: updatedState
        });
      }
    }

    const waitingGame = await Game.findOne({
      where: { tableId, status: 'waiting' }
    });

    if (waitingGame) {
      // Unirse a juego en espera
      const gamePlayers = typeof waitingGame.players === 'string'
        ? JSON.parse(waitingGame.players || '[]')
        : (waitingGame.players || []);

      const newPlayerId = playerIds[0];
      const userInGameIndex = gamePlayers.findIndex(p => p.userId === newPlayerId);
      const alreadyInGame = userInGameIndex !== -1;

      if (alreadyInGame && gamePlayers[userInGameIndex]?.isSittingOut) {
        // Al reingresar a la mesa se usa un stack fresco de buy-in
        // (el descuento se hace en /tables/:id/join).
        gamePlayers[userInGameIndex].chips = tableBuyIn;
        gamePlayers[userInGameIndex].isSittingOut = false;
        gamePlayers[userInGameIndex].folded = true;
        gamePlayers[userInGameIndex].hand = null;
        gamePlayers[userInGameIndex].holeCards = null;
        gamePlayers[userInGameIndex].committed = 0;
        gamePlayers[userInGameIndex].betInPhase = 0;
        gamePlayers[userInGameIndex].lastAction = null;

        waitingGame.players = gamePlayers;
        waitingGame.changed('players', true);
        await waitingGame.save();
      }

      if (!alreadyInGame) {
        const user = await User.findByPk(newPlayerId);
        if (user) {
          gamePlayers.push({ userId: user.id, chips: tableBuyIn });
          waitingGame.players = gamePlayers;
          waitingGame.changed('players', true);
          await waitingGame.save();
        }
      }

      const seatedPlayers = gamePlayers.filter(p => !p.isSittingOut);

      await table.update({
        status: seatedPlayers.length >= 2 ? 'playing' : 'waiting',
        currentPlayers: Math.min(table.maxPlayers, seatedPlayers.length)
      });

      try {
        await emitLobbyTables(getIO());
      } catch (emitErr) {
        console.warn('⚠️ No se pudo emitir lobby update:', emitErr.message);
      }

      if (seatedPlayers.length >= 2) {
        const playersData = seatedPlayers.map(p => ({
          userId: p.userId,
          chips: tableBuyIn
        }));

        await activateWaitingGame(waitingGame, playersData);

        const gameState = await getGameState(waitingGame.id);
        const io = getIO();
        io.to(`table_${tableId}`).emit('gameStateUpdated', gameState);

        return res.status(200).json({
          success: true,
          message: 'Juego iniciado con jugadores',
          game: gameState
        });
      }

      const waitingState = await getGameState(waitingGame.id, false);
      return res.status(200).json({
        success: true,
        message: 'Esperando más jugadores',
        game: waitingState
      });
    }

    // Agregar bots según la configuración de la mesa
    const botsToAdd = table.botsCount || 0;
    
    if (botsToAdd > 0) {
      console.log(`⚠️  Agregando ${botsToAdd} bots según configuración de la mesa...`);
      
      // Buscar usuarios bot disponibles
      const availablePlayers = await User.findAll({
        where: { 
          id: { [Op.notIn]: playerIds },
          isBot: true  // Solo bots reales
        },
        limit: botsToAdd,
        order: [['createdAt', 'ASC']]
      });

      // Agregar los bots
      for (let i = 0; i < Math.min(availablePlayers.length, botsToAdd); i++) {
        playerIds.push(availablePlayers[i].id);
      }

      console.log(`✅ ${Math.min(availablePlayers.length, botsToAdd)} bots agregados. Total jugadores: ${playerIds.length}`);
    }

    // Obtener datos de los jugadores (chips de su cuenta)
    const players = await User.findAll({
      where: { id: playerIds },
      attributes: ['id', 'chips']
    });

    if (players.length < 2) {
      const waitingGameCreated = await Game.create({
        tableId,
        phase: 'waiting',
        status: 'waiting',
        players: players.map(p => ({ userId: p.id, chips: tableBuyIn })),
        communityCards: [],
        currentBet: 0,
        pot: 0
      });

      await table.update({
        status: 'waiting',
        currentPlayers: Math.min(table.maxPlayers, players.length)
      });

      try {
        await emitLobbyTables(getIO());
      } catch (emitErr) {
        console.warn('⚠️ No se pudo emitir lobby update:', emitErr.message);
      }

      const waitingState = await getGameState(waitingGameCreated.id, false);
      const io = getIO();
      io.to(`table_${tableId}`).emit('gameStateUpdated', waitingState);

      return res.status(200).json({
        success: true,
        message: 'Mesa creada. Esperando más jugadores',
        game: waitingState
      });
    }

    // Inicializar el juego
    const playersData = players.map(p => ({
      userId: p.id,
      chips: tableBuyIn
    }));

    const game = await initializeGame(tableId, playersData);

    // Actualizar estado de la mesa
    await table.update({
      status: 'playing',
      currentPlayers: playerIds.length
    });

    try {
      await emitLobbyTables(getIO());
    } catch (emitErr) {
      console.warn('⚠️ No se pudo emitir lobby update:', emitErr.message);
    }

    const gameState = await getGameState(game.id);

    // Emitir evento WebSocket para actualizar el frontend en tiempo real
    try {
      const io = getIO();
      io.to(`table_${tableId}`).emit('gameStateUpdated', gameState);
      console.log(`📡 Evento gameStateUpdated emitido para mesa ${tableId}`);
    } catch (err) {
      console.warn('⚠️  No se pudo emitir evento WebSocket:', err.message);
    }

    res.status(201).json({
      success: true,
      message: 'Juego iniciado',
      game: gameState
    });

  } catch (error) {
    res.status(500).json({ 
      error: `Error iniciando juego: ${error.message}` 
    });
  } finally {
    try {
      await armTurnTimerForTable(tableId);
    } catch (timerError) {
      console.warn('⚠️ No se pudo armar timeout de turno tras startGame:', timerError.message);
    }
  }
};

/**
 * Obtener el estado actual del juego
 * GET /games/:gameId
 */
export const getGame = async (req, res) => {
  try {
    const { gameId } = req.params;

    const gameState = await getGameState(gameId);
    res.json(gameState);

  } catch (error) {
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Realizar una acción en el juego
 * POST /games/:gameId/action
 * Body: { userId, action: 'fold'|'check'|'call'|'raise'|'all-in', amount?: number }
 */
export const playerAction = async (req, res) => {
  const { gameId } = req.params;
  try {
    const { userId, action, amount } = req.body;

    clearTurnTimer(gameId);

    // Validar entrada
    if (!userId || !action) {
      return res.status(400).json({ 
        error: 'userId y action son requeridos' 
      });
    }

    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ 
        error: 'Este juego ya ha terminado' 
      });
    }

    // Procesar la acción
    const result = await processPlayerAction(game, userId, action, amount || 0);

    // Emitir actualización del juego a todos los jugadores en la sala
    const io = getIO();
    const table = await Table.findByPk(game.tableId);
    if (table) {
      const updatedGameState = await getGameState(gameId, false);
      io.to(`table_${table.id}`).emit('gameStateUpdated', updatedGameState);
      console.log(`📢 Emitiendo gameStateUpdated a sala table_${table.id}`);
    }

    if (result.gameOver) {
      return res.json({
        success: true,
        gameOver: true,
        winner: result.winner || null,
        gameState: await getGameState(gameId, false)
      });
    }

    if (result.handOver) {
      const winners = Array.isArray(result.winners) ? result.winners : [];
      const winnerIds = winners.map(w => w.userId).filter(Boolean);
      let winnerId = result.winner?.userId || result.winner?.id || winnerIds[0] || null;
      let winnerName = 'Desconocido';
      let potWon = result.potWon ?? winners.reduce((sum, w) => sum + (w.chipsWon || 0), 0);

      try {
        if (winners.length > 1) {
          const names = winners.map(w => w.username).filter(Boolean);
          winnerName = names.length > 0 ? `Empate: ${names.join(', ')}` : 'Empate';
        } else {
          const winnerUser = winnerId ? await User.findByPk(winnerId) : null;
          winnerName = winnerUser?.username || winners[0]?.username || winnerName;
        }

        const io = getIO();
        const table = await Table.findByPk(game.tableId);
        if (table) {
          io.to(`table_${table.id}`).emit('handOver', {
            gameId,
            tableId: table.id,
            winnerId,
            winnerName,
            winnerIds,
            winners,
            potWon
          });
        }
      } catch (emitError) {
        console.error('Error emitiendo handOver:', emitError.message);
      }

      return res.json({
        success: true,
        handOver: true,
        winner: result.winner || null,
        winnerId,
        winnerName,
        winnerIds,
        winners,
        potWon,
        gameState: result.gameState || await getGameState(gameId, false)
      });
    }

    if (result.phaseAdvanced) {
      return res.json({
        success: true,
        phaseAdvanced: true,
        gameState: result.gameState
      });
    }

    res.json({
      success: true,
      action: result.action,
      amount: result.amount,
      gameState: await getGameState(gameId, false)
    });

  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  } finally {
    try {
      await armTurnTimerForGame(gameId);
    } catch (timerError) {
      console.warn(`⚠️ No se pudo actualizar timeout de turno para game ${gameId}:`, timerError.message);
    }
  }
};

/**
 * Obtener juegos activos de un jugador
 * GET /games/player/:userId
 */
export const getPlayerGames = async (req, res) => {
  try {
    const { userId } = req.params;

    const games = await Game.findAll({
      where: { status: 'active' },
      attributes: ['id', 'tableId', 'phase', 'pot', 'currentPlayerIndex', 'players'],
      include: [
        {
          model: Table,
          attributes: ['name', 'smallBlind', 'bigBlind']
        }
      ]
    });

    // Filtrar juegos donde el usuario es jugador
    const userGames = games.filter(game => {
      return game.players.some(p => p.userId === userId);
    });

    res.json({
      count: userGames.length,
      games: await Promise.all(
        userGames.map(async (game) => {
          const state = await getGameState(game.id);
          return state;
        })
      )
    });

  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
};

/**
 * Obtener juegos terminados de una mesa
 * GET /games/table/:tableId/history
 */
export const getGameHistory = async (req, res) => {
  try {
    const { tableId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const games = await Game.findAll({
      where: { tableId, status: 'finished' },
      attributes: [
        'id', 'phase', 'pot', 'winnerId', 'createdAt', 'endTime'
      ],
      include: [
        {
          model: User,
          as: 'winner',
          attributes: ['id', 'username', 'avatar']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await Game.count({
      where: { tableId, status: 'finished' }
    });

    res.json({
      total,
      count: games.length,
      games
    });

  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
};

/**
 * Obtener detalles de una mano específica
 * GET /games/:gameId/hands/:handId
 */
export const getHandDetails = async (req, res) => {
  try {
    const { gameId, handId } = req.params;

    const hand = await Hand.findByPk(handId, {
      where: { gameId },
      include: [
        {
          model: User,
          as: 'player',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: HandAction,
          attributes: ['action', 'amount', 'phase', 'sequenceNumber'],
          order: [['sequenceNumber', 'ASC']]
        }
      ]
    });

    if (!hand) {
      return res.status(404).json({ error: 'Mano no encontrada' });
    }

    res.json(hand);

  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
};

/**
 * Abandonar un juego
 * POST /games/:gameId/leave
 * Body: { userId }
 */
export const leaveGame = async (req, res) => {
  const { gameId } = req.params;
  try {
    const { userId } = req.body;
    const playerUserId = userId || req.userId;

    if (!playerUserId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }

    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    if (!['active', 'waiting'].includes(game.status)) {
      return res.status(400).json({ 
        error: 'El juego ya ha terminado' 
      });
    }

    // Marcar al jugador como sitting out
    const players = game.players;
    const playerIndex = players.findIndex(p => p.userId === playerUserId);

    if (playerIndex === -1) {
      return res.status(400).json({ 
        error: 'El jugador no está en este juego' 
      });
    }

    players[playerIndex].isSittingOut = true;
    players[playerIndex].folded = true;
    players[playerIndex].hand = null;
    players[playerIndex].holeCards = null;
    players[playerIndex].committed = 0;
    players[playerIndex].betInPhase = 0;
    players[playerIndex].lastAction = null;

    // Al abandonar la mesa, devolver stack de mesa a la cuenta del usuario.
    const tableStack = Math.max(0, parseInt(players[playerIndex].chips) || 0);
    const dbUser = await User.findByPk(playerUserId);
    if (dbUser) {
      dbUser.chips = (Math.max(0, parseInt(dbUser.chips) || 0) + tableStack);
      await dbUser.save();
    }

    // El asiento abandona la mano y no conserva stack en mesa.
    players[playerIndex].chips = 0;
    
    // Si es el turno del jugador que se va, mover al siguiente
    if (game.currentPlayerIndex === playerIndex) {
      let nextIndex = (playerIndex + 1) % players.length;
      while (
        (players[nextIndex].isSittingOut || players[nextIndex].folded || (parseInt(players[nextIndex].chips) || 0) <= 0) &&
        nextIndex !== playerIndex
      ) {
        nextIndex = (nextIndex + 1) % players.length;
      }
      game.currentPlayerIndex = nextIndex;
    }

    await game.update({ players });

    const table = await Table.findByPk(game.tableId);
    if (table) {
      const activeSeats = players.filter(p => !p.isSittingOut).length;
      if (activeSeats < 2) {
        game.status = 'waiting';
        game.phase = 'waiting';
        game.currentBet = 0;
        game.pot = 0;
        game.communityCards = [];
        game.deck = [];
        game.sidePots = [];
      }

      if (activeSeats === 0) {
        game.players = [];
        game.currentPlayerIndex = 0;
        game.dealerId = null;
        game.smallBlindId = null;
        game.bigBlindId = null;
      }

      await game.save();

      await table.update({
        currentPlayers: Math.max(0, activeSeats),
        status: activeSeats >= 2 ? 'playing' : 'waiting'
      });

      try {
        const io = getIO();
        io.to(`table_${table.id}`).emit('gameStateUpdated', await getGameState(gameId, false));

        const tables = await Table.findAll({ where: { status: ['waiting', 'playing'] } });
        io.to('lobby').emit('lobby:update', tables);
        io.to('lobby').emit('lobby:tables', tables);
      } catch (emitError) {
        console.warn('⚠️ No se pudo emitir gameStateUpdated tras leaveGame:', emitError.message);
      }
    }

    res.json({
      success: true,
      message: 'Has abandonado el juego',
      gameState: await getGameState(gameId)
    });

  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  } finally {
    try {
      await armTurnTimerForGame(gameId);
    } catch (timerError) {
      console.warn(`⚠️ No se pudo actualizar timeout de turno tras leaveGame en game ${gameId}:`, timerError.message);
    }
  }
};

/**
 * Invitar amigos a una partida en curso
 * POST /games/:gameId/invite
 * Body: { friendIds: [uuid, ...] }
 */
export const inviteFriendsToGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { friendIds } = req.body;
    const inviterId = req.userId;

    if (!Array.isArray(friendIds) || friendIds.length === 0) {
      return res.status(400).json({ error: 'friendIds debe ser un array con al menos un id' });
    }

    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    const table = await Table.findByPk(game.tableId);
    if (!table) {
      return res.status(404).json({ error: 'Mesa no encontrada' });
    }

    const players = Array.isArray(game.players)
      ? game.players
      : (typeof game.players === 'string' ? JSON.parse(game.players || '[]') : []);

    const inviterInGame = players.some(p => p.userId === inviterId);
    if (!inviterInGame) {
      return res.status(403).json({ error: 'Solo jugadores de la mesa pueden invitar amigos' });
    }

    const uniqueFriendIds = [...new Set(friendIds.map(String))].filter(id => id !== String(inviterId));
    if (uniqueFriendIds.length === 0) {
      return res.status(400).json({ error: 'No hay amigos válidos para invitar' });
    }

    const friendships = await Friend.findAll({
      where: {
        userId: inviterId,
        friendId: { [Op.in]: uniqueFriendIds }
      },
      attributes: ['friendId']
    });
    const allowedFriendIds = friendships.map(f => f.friendId);

    if (allowedFriendIds.length === 0) {
      return res.status(403).json({ error: 'Solo puedes invitar usuarios que sean tus amigos' });
    }

    const inviter = await User.findByPk(inviterId, {
      attributes: ['id', 'username', 'avatar']
    });

    const io = getIO();
    const basePayload = {
      type: 'game-invitation',
      gameId: game.id,
      table: {
        id: table.id,
        name: table.name,
        smallBlind: table.smallBlind,
        bigBlind: table.bigBlind,
        maxPlayers: table.maxPlayers,
        isPrivate: table.isPrivate
      },
      from: {
        id: inviter?.id || inviterId,
        username: inviter?.username || 'Jugador',
        avatar: inviter?.avatar || 'default-avatar.png'
      },
      sentAt: new Date().toISOString()
    };

    allowedFriendIds.forEach((friendId) => {
      const invitationToken = jwt.sign(
        {
          type: 'table-join-invite',
          invitedUserId: friendId,
          inviterId,
          tableId: table.id,
          gameId: game.id
        },
        config.jwtSecret,
        { expiresIn: '30m' }
      );

      io.to(`user_${friendId}`).emit('game:invitation', {
        ...basePayload,
        invitationToken
      });
    });

    const rejectedFriendIds = uniqueFriendIds.filter(id => !allowedFriendIds.includes(id));

    res.json({
      success: true,
      invitedCount: allowedFriendIds.length,
      invitedFriendIds: allowedFriendIds,
      rejectedFriendIds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  startGame,
  getGame,
  playerAction,
  getPlayerGames,
  getGameHistory,
  getHandDetails,
  leaveGame,
  inviteFriendsToGame
};
