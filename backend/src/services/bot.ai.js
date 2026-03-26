/**
 * Servicio de IA para bots
 * Implementa estrategia básica de poker para jugadores bot
 */

import { Game, User, Table } from '../models/index.js';
import { processPlayerAction, getGameState } from './game.service.js';
import { getIO } from '../config/socket.js';

const botTurnLocks = new Set();

/**
 * Evaluar la fuerza de la mano del jugador
 * Retorna: 'weak' | 'medium' | 'strong'
 */
export const evaluateHandStrength = (holeCards) => {
  if (!holeCards || holeCards.length < 2) {
    return 'weak';
  }

  const [card1, card2] = holeCards;
  
  // Extraer rango (2-A) y palo
  const getRank = (card) => {
    const rankMap = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    return rankMap[card.slice(0, -1)] || 0;
  };

  const rank1 = getRank(card1);
  const rank2 = getRank(card2);
  const isSuited = card1[card1.length - 1] === card2[card2.length - 1];
  const isPair = rank1 === rank2;

  // Puntuación básica
  let score = (rank1 + rank2) / 2;

  // Premium hands
  if (isPair && (rank1 >= 10 || rank1 === 14)) {
    return 'strong'; // AA, KK, QQ, JJ, TT
  }

  if ((rank1 === 14 && rank2 >= 12) || (rank2 === 14 && rank1 >= 12)) {
    return 'strong'; // AK, AQ
  }

  // Medium hands
  if (isPair || (score >= 11 && isSuited) || (score >= 12 && !isSuited)) {
    return 'medium';
  }

  // Weak hands
  return 'weak';
};

/**
 * Tomar decisión para el bot
 * Retorna: { action: 'fold' | 'check' | 'call' | 'raise', amount: number }
 */
export const makeBotDecision = (gameState, botPlayerIndex, currentBet) => {
  const botPlayer = gameState.players[botPlayerIndex];
  
  if (!botPlayer) {
    return { action: 'check', amount: 0 };
  }

  // Determinar acciones disponibles
  const committed = parseInt(botPlayer.committed) || 0;
  const canCheck = currentBet === 0 || committed === currentBet;
  const canCall = botPlayer.chips > 0 && currentBet > committed;
  const canRaise = botPlayer.chips > 0 && (committed + botPlayer.chips) > currentBet;

  // Evaluar la mano
  const handStrength = evaluateHandStrength(botPlayer.holeCards);

  // Probabilidad aleatoria para hacer el juego más interesante
  const randomFactor = Math.random();

  // Estrategia según fase del juego
  const phase = gameState.phase;

  // PRE-FLOP: Más cauteloso
  if (phase === 'pre-flop') {
    if (handStrength === 'strong') {
      // Con mano fuerte, raise
      if (canRaise && randomFactor < 0.8) {
        const raiseAmount = Math.min(currentBet * 2, botPlayer.chips);
        return { action: 'raise', amount: raiseAmount };
      }
      if (canCall) {
        return { action: 'call', amount: currentBet };
      }
    } else if (handStrength === 'medium') {
      // Con mano mediocre, casi siempre call
      if (canCall) {
        return { action: 'call', amount: currentBet };
      }
      if (canCheck) {
        return { action: 'check', amount: 0 };
      }
    } else {
      // Mano débil: evitar fold si puede seguir en juego
      if (canCall) {
        return { action: 'call', amount: currentBet };
      }
      if (canCheck) {
        return { action: 'check', amount: 0 };
      }
      return { action: 'fold', amount: 0 };
    }
  }

  // FLOP, TURN, RIVER: Más agresivo si está comprometido
  if (handStrength === 'strong') {
    if (canRaise && randomFactor < 0.6) {
      const raiseAmount = Math.min(gameState.pot * 0.25, botPlayer.chips);
      return { action: 'raise', amount: raiseAmount };
    }
    if (canCall) {
      return { action: 'call', amount: currentBet };
    }
    if (canCheck) {
      return { action: 'check', amount: 0 };
    }
  } else if (handStrength === 'medium') {
    if (canCheck) {
      return { action: 'check', amount: 0 };
    }
    if (canCall && randomFactor < 0.5) {
      return { action: 'call', amount: currentBet };
    }
    return { action: 'fold', amount: 0 };
  } else {
    if (canCheck) {
      return { action: 'check', amount: 0 };
    }
    return { action: 'fold', amount: 0 };
  }

  // Default
  if (canCheck) {
    return { action: 'check', amount: 0 };
  }
  if (canCall) {
    return { action: 'call', amount: currentBet };
  }
  return { action: 'fold', amount: 0 };
};

/**
 * Ejecutar turno automático del bot
 */
export const executeBotTurn = async (gameId) => {
  if (botTurnLocks.has(gameId)) {
    console.log(`⏳ [BOT] Turno ya en ejecución para gameId: ${gameId}`);
    return null;
  }
  botTurnLocks.add(gameId);
  console.log(`🤖 [executeBotTurn] Iniciando para gameId: ${gameId}`);
  try {
    const game = await Game.findByPk(gameId);
    
    if (!game) {
      console.log('❌ [BOT] Juego no existe');
      return null;
    }

    if (game.status !== 'active') {
      console.log(`❌ [BOT] Juego no está activo. Status: ${game.status}`);
      return null;
    }

    const currentPlayerIndex = game.currentPlayerIndex;
    console.log(`🤖 [BOT] Índice del jugador actual: ${currentPlayerIndex}`);
    
    const currentPlayer = game.players[currentPlayerIndex];

    if (!currentPlayer) {
      console.log('❌ [BOT] No hay jugador actual');
      return null;
    }

    // Obtener el usuario para verificar si es bot
    const user = await User.findByPk(currentPlayer.userId);
    console.log(`🤖 [BOT] Usuario actual: ${user?.username}, isBot: ${user?.isBot}`);

    if (!user || !user.isBot) {
      console.log(`⏸️  [BOT] El jugador actual ${user?.username} no es un bot, esperando entrada del usuario`);
      return null;
    }

    // Bot toma decisión
    const gameState = {
      ...game.toJSON(),
      players: game.players
    };

    const decision = makeBotDecision(gameState, currentPlayerIndex, game.currentBet);
    
    console.log(`🤖 [BOT] ${user.username} tomó decisión:`, decision);

    // Ejecutar la acción en el juego
    console.log(`🤖 [BOT] Ejecutando acción: ${decision.action} con amount: ${decision.amount}`);
    const result = await processPlayerAction(
      game,
      currentPlayer.userId,
      decision.action,
      decision.amount
    );

    // Verificar si el juego terminó
    if (result.gameOver) {
      console.log(`🏁 [BOT] Juego terminado. Ganador: ${result.winner?.userId}`);
      return null;
    }

    if (!result || !result.success) {
      console.error('❌ [BOT] Error al procesar acción del bot:', result);
      return null;
    }

    console.log(`✅ [BOT] Acción ejecutada correctamente: ${decision.action}`);

    // Obtener el juego actualizado
    const updatedGame = await Game.findByPk(gameId);
    console.log(`🔄 [BOT] Juego actualizado. CurrentPlayerIndex: ${updatedGame.currentPlayerIndex}, Status: ${updatedGame.status}`);

    // Emitir actualización a todos los jugadores
    const table = await Table.findByPk(updatedGame.tableId);
    if (table) {
      const updatedGameState = await getGameState(gameId, false);
      const io = getIO();
      io.to(`table_${table.id}`).emit('gameStateUpdated', updatedGameState);
      console.log(`📢 [BOT] Emitiendo gameStateUpdated a sala table_${table.id}`);
    }

    // Si el siguiente jugador también es bot, ejecutar automáticamente
    const nextPlayer = updatedGame.players[updatedGame.currentPlayerIndex];
    console.log(`👀 [BOT] Siguiente jugador:`, nextPlayer ? `userId: ${nextPlayer.userId}` : 'NO EXISTE');
    
    if (!nextPlayer) {
      console.log('❌ [BOT] No hay siguiente jugador');
      return updatedGame;
    }
    
    const nextUser = await User.findByPk(nextPlayer.userId);
    console.log(`👤 [BOT] Usuario siguiente: ${nextUser?.username}, isBot: ${nextUser?.isBot}, game status: ${updatedGame.status}`);

    if (nextUser?.isBot && updatedGame.status === 'active') {
      console.log(`🔁 [BOT] Ejecutando siguiente bot en 1 segundo...`);
      // Esperar un poco antes de ejecutar el siguiente bot
      setTimeout(() => executeBotTurn(gameId), 1000);
    } else {
      console.log(`⏸️ [BOT] No ejecutando siguiente turno. isBot: ${nextUser?.isBot}, status: ${updatedGame.status}`);
    }

    return updatedGame;
  } catch (error) {
    console.error('❌ Error ejecutando turno del bot:', error.message);
    return null;
  } finally {
    botTurnLocks.delete(gameId);
  }
};
