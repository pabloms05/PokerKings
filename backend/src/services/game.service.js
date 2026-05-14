import { Game, Table, User, Hand } from '../models/index.js';
import {
  advancePhase,
  checkAllPlayersActed,
  getFirstToActInPhase
} from './game.phases.js';
import { compareHands, getBestHand } from './hand.ranking.js';
import {
  calculateSidePots,
  rebuildSidePots,
  distributeSidePots,
  getActivePlayersCount,
  removeFoldedPlayerFromPots
} from './sidepots.service.js';
import { processHandProgression } from './progression.service.js';

// Palos de cartas
const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Crear un mazo nuevo (52 cartas)
 */
export const createDeck = () => {
  const deck = [];
  for (let suit of SUITS) {
    for (let rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  // Shuffle
  return shuffleDeck(deck);
};

/**
 * Mezclar el mazo (Fisher-Yates shuffle)
 */
export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Obtener la siguiente posición del dealer (rotación circular)
 */
export const getNextDealerPosition = (currentDealerIndex, playersCount) => {
  return (currentDealerIndex + 1) % playersCount;
};

/**
 * Calcular posiciones de dealer, small blind y big blind
 */
export const calculatePositions = (playersArray, dealerIndex) => {
  const count = playersArray.length;
  
  if (count < 2) {
    throw new Error('Se requieren al menos 2 jugadores');
  }

  // En heads-up: dealer = SB, otro = BB
  // En 6-max+: dealer (BTN), siguiente (SB), siguiente (BB)
  let smallBlindIndex, bigBlindIndex;
  
  if (count === 2) {
    // Heads-up solicitado: dealer es BB, otro es SB
    smallBlindIndex = (dealerIndex + 1) % count;
    bigBlindIndex = dealerIndex;
  } else {
    // 6-max+: estándar
    smallBlindIndex = (dealerIndex + 1) % count;
    bigBlindIndex = (dealerIndex + 2) % count;
  }

  return {
    dealerIndex,
    smallBlindIndex,
    bigBlindIndex,
    positions: playersArray.map((player, idx) => {
      if (idx === dealerIndex && count > 2) return 'BTN';
      if (idx === smallBlindIndex) return 'SB';
      if (idx === bigBlindIndex) return 'BB';
      if (count === 2) return null;
      
      // Nombres estándar para posiciones (6-max):
      // BTN, SB, BB, UTG, HJ, CO
      const positionNames = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];
      return positionNames[idx] || `POS${idx}`;
    })
  };
};

/**
 * Inicializar una nueva partida
 */
export const initializeGame = async (tableId, playersData) => {
  try {
    const table = await Table.findByPk(tableId);
    if (!table) throw new Error('Mesa no encontrada');

    const smallBlindAmount = table.smallBlind;
    const bigBlindAmount = table.bigBlind;

    // Crear array de jugadores con estructura
    const players = playersData.map(playerData => ({
      userId: playerData.userId,
      chips: playerData.chips || 1000,
      committed: 0,
      betInPhase: 0,
      lastAction: null,
      hand: null,
      folded: false,
      isSittingOut: false
    }));

    // Dealer es el primer jugador (será rotado después de cada mano)
    const dealerIndex = 0;
    const positions = calculatePositions(players, dealerIndex);

    // Crear mazo
    const deck = createDeck();

    // Repartir cartas iniciales (2 por jugador)
    players.forEach(player => {
      player.hand = [deck.pop(), deck.pop()];
      player.holeCards = [...player.hand];
    });

    // El siguiente jugador en turno será quien actúa primero (después de BB)
    // En preflop: UTG (after BB)
    // Si es heads-up (2 jugadores): dealer actúa primero
    const currentPlayerIndex = players.length === 2
      ? positions.smallBlindIndex
      : (positions.bigBlindIndex + 1) % players.length;

    // Crear el juego
    const game = await Game.create({
      tableId,
      phase: 'preflop',
      status: 'active',
      dealerId: players[dealerIndex].userId,
      smallBlindId: players[positions.smallBlindIndex].userId,
      bigBlindId: players[positions.bigBlindIndex].userId,
      players,
      currentPlayerIndex,
      currentBet: bigBlindAmount,
      deck,
      communityCards: [],
      pot: smallBlindAmount + bigBlindAmount
    });

    // Registrar los blinds como apuestas y restarlos de chips
    players[positions.smallBlindIndex].chips -= smallBlindAmount;
    players[positions.smallBlindIndex].committed = smallBlindAmount;
    players[positions.smallBlindIndex].betInPhase = smallBlindAmount;
    players[positions.bigBlindIndex].chips -= bigBlindAmount;
    players[positions.bigBlindIndex].committed = bigBlindAmount;
    players[positions.bigBlindIndex].betInPhase = bigBlindAmount;

    await game.update({ players });

    return game;
  } catch (error) {
    throw new Error(`Error inicializando juego: ${error.message}`);
  }
};

/**
 * Activar un juego en espera (waiting) con jugadores reales
 */
export const activateWaitingGame = async (game, playersData) => {
  const table = await Table.findByPk(game.tableId);
  if (!table) throw new Error('Mesa no encontrada');

  const smallBlindAmount = table.smallBlind;
  const bigBlindAmount = table.bigBlind;

  const players = playersData.map(playerData => ({
    userId: playerData.userId,
    chips: playerData.chips || 1000,
    committed: 0,
    hand: null,
    folded: false,
    isSittingOut: false,
    lastAction: null,
    betInPhase: 0
  }));

  const dealerIndex = 0;
  const positions = calculatePositions(players, dealerIndex);
  const deck = createDeck();

  players.forEach(player => {
    player.hand = [deck.pop(), deck.pop()];
    player.holeCards = [...player.hand];
  });

  const currentPlayerIndex = players.length === 2
    ? positions.smallBlindIndex
    : (positions.bigBlindIndex + 1) % players.length;

  players[positions.smallBlindIndex].chips -= smallBlindAmount;
  players[positions.smallBlindIndex].committed = smallBlindAmount;
  players[positions.smallBlindIndex].betInPhase = smallBlindAmount;
  players[positions.bigBlindIndex].chips -= bigBlindAmount;
  players[positions.bigBlindIndex].committed = bigBlindAmount;
  players[positions.bigBlindIndex].betInPhase = bigBlindAmount;

  await game.update({
    phase: 'preflop',
    status: 'active',
    dealerId: players[dealerIndex].userId,
    smallBlindId: players[positions.smallBlindIndex].userId,
    bigBlindId: players[positions.bigBlindIndex].userId,
    players,
    currentPlayerIndex,
    currentBet: bigBlindAmount,
    deck,
    communityCards: [],
    pot: smallBlindAmount + bigBlindAmount
  });

  return game;
};

/**
 * Iniciar una nueva mano en el mismo juego (rotando dealer, SB y BB)
 */
const startNextHand = async (game) => {
  const table = await Table.findByPk(game.tableId);
  if (!table) {
    throw new Error('Mesa no encontrada para nueva mano');
  }

  const smallBlindAmount = table.smallBlind;
  const bigBlindAmount = table.bigBlind;

  const players = JSON.parse(JSON.stringify(game.players || []));

  // Reset estado por jugador
  players.forEach((p) => {
    p.folded = false;
    p.lastAction = null;
    p.betInPhase = 0;
    p.committed = 0;
  });

  // Rotar dealer
  const currentDealerIndex = players.findIndex(p => p.userId === game.dealerId);
  const dealerIndex = getNextDealerPosition(currentDealerIndex >= 0 ? currentDealerIndex : 0, players.length);
  const positions = calculatePositions(players, dealerIndex);

  // Crear mazo y repartir cartas
  const deck = createDeck();
  players.forEach((p) => {
    if (p.chips > 0 && !p.isSittingOut) {
      p.hand = [deck.pop(), deck.pop()];
      p.holeCards = [...p.hand];
      p.folded = false;
    } else {
      p.hand = null;
      p.holeCards = null;
      p.folded = true;
    }
  });

  // Aplicar blinds
  const sbIndex = positions.smallBlindIndex;
  const bbIndex = positions.bigBlindIndex;
  const sbAmount = Math.min(smallBlindAmount, players[sbIndex].chips);
  const bbAmount = Math.min(bigBlindAmount, players[bbIndex].chips);

  players[sbIndex].chips -= sbAmount;
  players[sbIndex].committed = sbAmount;
  players[sbIndex].betInPhase = sbAmount;
  players[bbIndex].chips -= bbAmount;
  players[bbIndex].committed = bbAmount;
  players[bbIndex].betInPhase = bbAmount;

  const currentPlayerIndex = players.length === 2
    ? dealerIndex
    : (positions.bigBlindIndex + 1) % players.length;

  game.status = 'active';
  game.phase = 'preflop';
  game.dealerId = players[dealerIndex].userId;
  game.smallBlindId = players[sbIndex].userId;
  game.bigBlindId = players[bbIndex].userId;
  game.currentPlayerIndex = currentPlayerIndex;
  game.currentBet = bbAmount;
  game.pot = sbAmount + bbAmount;
  game.communityCards = [];
  game.deck = deck;
  game.sidePots = [];
  game.winnerId = null;
  game.winnerIds = null;
  game.winners = null;
  game.endTime = null;
  game.players = players;
  game.changed('players', true);

  await game.save();
};

/**
 * Repartir cartas comunitarias según la fase siguiente
 */
const dealCommunityForNextPhase = (game, nextPhase) => {
  // Normalizar deck y community a arrays reales (pueden venir como string JSON desde DB)
  let deck = Array.isArray(game.deck)
    ? [...game.deck]
    : (typeof game.deck === 'string'
        ? JSON.parse(game.deck || '[]')
        : (game.deck ? JSON.parse(JSON.stringify(game.deck)) : []));

  let community = Array.isArray(game.communityCards)
    ? [...game.communityCards]
    : (typeof game.communityCards === 'string'
        ? JSON.parse(game.communityCards || '[]')
        : (game.communityCards ? JSON.parse(JSON.stringify(game.communityCards)) : []));

  const burn = () => {
    if (deck.length === 0) return;
    deck.pop();
  };

  const deal = (count) => {
    for (let i = 0; i < count; i++) {
      if (deck.length === 0) break;
      community.push(deck.pop());
    }
  };

  switch (nextPhase) {
    case 'flop':
      burn();
      deal(3);
      break;
    case 'turn':
      burn();
      deal(1);
      break;
    case 'river':
      burn();
      deal(1);
      break;
    default:
      break;
  }

  game.deck = deck;
  game.communityCards = community;
};

/**
 * Determinar si sólo queda un jugador activo
 */
const getActivePlayers = (players) => players.filter(p => !p.folded);

const normalizeBustedPlayersToSittingOut = (players) => {
  if (!Array.isArray(players)) return [];

  return players.map((p) => {
    const chips = Math.max(0, parseInt(p.chips) || 0);
    if (chips > 0) return { ...p, chips };

    return {
      ...p,
      chips: 0,
      isSittingOut: true,
      folded: true,
      hand: null,
      holeCards: null,
      committed: 0,
      betInPhase: 0,
      lastAction: null
    };
  });
};

/**
 * Resolver ganador por fold (solo queda uno activo)
 */
const finishByFold = async (game) => {
  const active = getActivePlayers(game.players);
  if (active.length !== 1) return null;

  const winner = active[0];
  const winnerIndex = game.players.findIndex(p => p.userId === winner.userId);

  // Build or rebuild side pots to determine pot distribution
  const sidePots = game.sidePots || calculateSidePots(game.players);

  // Find all pots the winner is eligible for
  let winningsFromPots = 0;
  for (const pot of sidePots) {
    if (pot.eligiblePlayerIndices.includes(winnerIndex)) {
      winningsFromPots += pot.amount;
    }
  }

  // Fallback: if eligible pots are zero, use total pot amount
  if (winningsFromPots === 0) {
    winningsFromPots = sidePots.reduce((sum, pot) => sum + (pot.amount || 0), 0);
  }

  // Add the winnings to winner's chips
  winner.chips += winningsFromPots;

  let progressionPayload = { unlockedAchievements: [], completedMissions: [] };
  try {
    progressionPayload = await processHandProgression({
      game,
      winners: [{ userId: winner.userId, chipsWon: winningsFromPots }]
    });
  } catch (progressionError) {
    console.error('[PROGRESSION] Error processing hand progression (fold):', progressionError.message);
  }

  // Actualizar jugadores con el bote distribuido y sacar de asiento a jugadores sin fichas
  game.players = normalizeBustedPlayersToSittingOut(JSON.parse(JSON.stringify(game.players)));
  game.changed('players', true);

  // ¿Hay suficientes jugadores con fichas para seguir?
  const playersWithChips = game.players.filter(p => p.chips > 0 && !p.isSittingOut);
  if (playersWithChips.length >= 2) {
    await startNextHand(game);
    return {
      winner: { ...winner, chipsWon: winningsFromPots },
      winners: [{ userId: winner.userId, chipsWon: winningsFromPots }],
      potWon: winningsFromPots,
      progression: progressionPayload,
      handContinues: true
    };
  }

  game.status = 'finished';
  game.winnerId = winner.userId;
  game.pot = 0;
  game.sidePots = sidePots;
  game.endTime = new Date();

  await game.save();

  return {
    winner: { ...winner, chipsWon: winningsFromPots },
    winners: [{ userId: winner.userId, chipsWon: winningsFromPots }],
    potWon: winningsFromPots,
    progression: progressionPayload,
    handContinues: false
  };
};

/**
 * Resolver showdown calculando la mejor mano
 */
const finishShowdown = async (game) => {
  const community = Array.isArray(game.communityCards)
    ? game.communityCards
    : (typeof game.communityCards === 'string'
        ? JSON.parse(game.communityCards || '[]')
        : []);
  const contenders = getActivePlayers(game.players);

  console.log('[DEBUG][SHOWDOWN] Starting showdown...');
  console.log('[DEBUG][SHOWDOWN] Community cards:', community.length, community);
  console.log('[DEBUG][SHOWDOWN] Contenders:', contenders.length);
  console.log('[DEBUG][SHOWDOWN] Pot before distribution:', game.pot);
  console.log('[DEBUG][SHOWDOWN] Side pots:', game.sidePots);

  if (community.length < 5 || contenders.length === 0) {
    console.log('[DEBUG][SHOWDOWN] ERROR: Not enough community cards (', community.length, ') or no contenders (', contenders.length, ')');
    return null;
  }

  // Build side pots
  const sidePots = game.sidePots || calculateSidePots(game.players);
  console.log('[DEBUG][SHOWDOWN] Calculated side pots:', sidePots);

  // Evaluate hands for all contenders
  const handEvals = contenders.map((player) => {
    const playerIndex = game.players.findIndex(p => p.userId === player.userId);
    const bestHand = getBestHand(player.hand, community);
    console.log('[DEBUG][SHOWDOWN] Player', playerIndex, 'hand:', player.hand, 'best:', bestHand);
    return {
      playerIndex,
      player,
      bestHand
    };
  });

  // Distribute each side pot to the best eligible hand
  const distributedPlayers = JSON.parse(JSON.stringify(game.players));
  const dealerIndex = game.players.findIndex(p => p.userId === game.dealerId);
  const numPlayers = game.players.length;
  
  // Track all winners (for split pots)
  const allWinners = new Set();
  const winnerDetails = {};

  for (const pot of sidePots) {
    // Get eligible contenders for this pot
    const potContenders = handEvals.filter(h =>
      pot.eligiblePlayerIndices.includes(h.playerIndex)
    );

    if (potContenders.length === 0) continue;

    // Find best hand(s) among eligible contenders
    let potWinners = [potContenders[0]];
    for (let i = 1; i < potContenders.length; i++) {
      const cmp = compareHands(
        potContenders[i].bestHand,
        potWinners[0].bestHand
      );
      if (cmp === 1) {
        potWinners = [potContenders[i]];
      } else if (cmp === 0) {
        potWinners.push(potContenders[i]);
      }
    }

    // Log split pot winners
    if (potWinners.length > 1) {
      console.log(`[DEBUG][SPLIT_POT] Pot de ${pot.amount} fichas dividido entre ${potWinners.length} ganadores:`, 
        potWinners.map((w, idx) => `${idx}: Player ${w.playerIndex} (${w.player.userId})`).join(', ')
      );
    }

    // Distribute pot among winners
    const share = Math.floor(pot.amount / potWinners.length);
    const remainder = pot.amount - share * potWinners.length;

    // Distribuir share equitativo a todos
    potWinners.forEach((winner) => {
      distributedPlayers[winner.playerIndex].chips += share;
      allWinners.add(winner.player.userId);
      
      // Store winner details
      if (!winnerDetails[winner.player.userId]) {
        winnerDetails[winner.player.userId] = {
          playerIndex: winner.playerIndex,
          userId: winner.player.userId,
          hand: winner.bestHand.hand.name,
          description: winner.bestHand.hand.name,
          chipsWon: share
        };
      } else {
        winnerDetails[winner.player.userId].chipsWon += share;
      }
    });

    // El chip impar va al jugador más cercano al dealer en sentido horario
    if (remainder > 0) {
      let closestToDealer = null;
      let closestDistance = numPlayers;

      for (const winner of potWinners) {
        // Calcular distancia en sentido horario desde el dealer
        let distance = (winner.playerIndex - dealerIndex + numPlayers) % numPlayers;
        if (distance === 0 && potWinners.length > 1) {
          distance = numPlayers;
        }
        if (distance < closestDistance) {
          closestDistance = distance;
          closestToDealer = winner.playerIndex;
        }
      }

      if (closestToDealer !== null) {
        distributedPlayers[closestToDealer].chips += remainder;
        winnerDetails[game.players[closestToDealer].userId].chipsWon += remainder;
        console.log(`[DEBUG][CHIP_ODD] Chip impar (${remainder}) asignado a player ${closestToDealer} (distancia: ${closestDistance} desde dealer ${dealerIndex})`);
      }
    }
  }

  // Build winners info
  const winnerUsers = await User.findAll({
    where: { id: Array.from(allWinners) },
    attributes: ['id', 'username']
  });
  const winnerUserMap = new Map(winnerUsers.map(u => [u.id, u.username]));

  const winners = Array.from(allWinners).map(userId => {
    const user = game.players.find(p => p.userId === userId);
    const details = winnerDetails[userId];
    return {
      userId,
      username: winnerUserMap.get(userId) || user?.username || 'Unknown',
      chips: distributedPlayers.find(p => p.userId === userId)?.chips || 0,
      hand: details?.hand,
      description: details?.description,
      chipsWon: details?.chipsWon || 0
    };
  });

  // Get primary winner (used for handOver winnerName / winnerId compatibility)
  // Pick winner with highest chipsWon; tie-break by seat order from distributedPlayers
  let primaryWinnerUserId = null;
  if (winners.length > 0) {
    const sortedWinners = [...winners].sort((a, b) => {
      if ((b.chipsWon || 0) !== (a.chipsWon || 0)) {
        return (b.chipsWon || 0) - (a.chipsWon || 0);
      }
      const idxA = distributedPlayers.findIndex(p => p.userId === a.userId);
      const idxB = distributedPlayers.findIndex(p => p.userId === b.userId);
      return idxA - idxB;
    });
    primaryWinnerUserId = sortedWinners[0].userId;
  }
  const primaryWinner = primaryWinnerUserId
    ? distributedPlayers.find(p => p.userId === primaryWinnerUserId)
    : null;

  console.log('[DEBUG][WINNERS] All winners:', winners.map(w => `${w.username} (${w.chipsWon} chips)`).join(', '));

  let progressionPayload = { unlockedAchievements: [], completedMissions: [] };
  try {
    progressionPayload = await processHandProgression({ game, winners });
  } catch (progressionError) {
    console.error('[PROGRESSION] Error processing hand progression (showdown):', progressionError.message);
  }

  // Actualizar jugadores con chips distribuidos y sacar de asiento a jugadores sin fichas
  game.players = normalizeBustedPlayersToSittingOut(distributedPlayers);
  game.changed('players', true);

  // ¿Hay suficientes jugadores con fichas para seguir?
  const playersWithChips = game.players.filter(p => p.chips > 0 && !p.isSittingOut);
  if (playersWithChips.length >= 2) {
    let potWon = winners.reduce((sum, w) => sum + (w.chipsWon || 0), 0);
    if (potWon === 0) {
      potWon = sidePots.reduce((sum, pot) => sum + (pot.amount || 0), 0);
    }
    await startNextHand(game);
    return { winner: primaryWinner, winners, potWon, progression: progressionPayload, handContinues: true };
  }

  game.status = 'finished';
  game.phase = 'showdown';
  game.winnerId = primaryWinner?.userId || null;
  game.winnerIds = Array.from(allWinners);
  game.winners = winners;
  game.pot = 0;
  game.sidePots = sidePots;
  game.endTime = new Date();

  await game.save();

  let potWon = winners.reduce((sum, w) => sum + (w.chipsWon || 0), 0);
  if (potWon === 0) {
    potWon = sidePots.reduce((sum, pot) => sum + (pot.amount || 0), 0);
  }
  return { winner: primaryWinner, winners, potWon, progression: progressionPayload, handContinues: false };
};

/**
 * Avanzar a la siguiente fase si corresponde
 */
const advanceGamePhase = async (game) => {
  const nextPhase = advancePhase(game.phase);

  if (!nextPhase) {
    return await finishShowdown(game);
  }

  dealCommunityForNextPhase(game, nextPhase);

  // Reset de apuestas para la nueva ronda (deep copy de players)
  game.currentBet = 0;
  const players = JSON.parse(JSON.stringify(game.players));
  
  // IMPORTANTE: Mantener committed para calcular side pots
  // Solo resetear lastAction y betInPhase
  players.forEach((p) => {
    p.lastAction = null;
    p.betInPhase = 0;
    // NO resetear p.committed - lo necesitamos para side pots
  });
  game.players = players;

  const dealerIndex = game.players.findIndex(p => p.userId === game.dealerId);
  const firstToAct = getFirstToActInPhase(game.players, dealerIndex, nextPhase);

  game.phase = nextPhase;
  game.currentPlayerIndex = firstToAct;

  console.log('[DEBUG][ADVANCE_PHASE] Avanzando a', nextPhase, 'pot:', game.pot, 'committed:', players.map(p => p.committed));

  await game.update({
    phase: game.phase,
    communityCards: game.communityCards,
    deck: game.deck,
    players: game.players,
    currentBet: 0,
    pot: game.pot,
    currentPlayerIndex: game.currentPlayerIndex
  });

  return;

  return null;
};

/**
 * Validar que una acción es legal
 */
export const validateAction = (game, playerId, action, amount = 0) => {
  const players = game.players;
  const currentPlayerIndex = game.currentPlayerIndex;
  const currentPlayer = players[currentPlayerIndex];

  // Verificar que es el turno del jugador
  if (currentPlayer.userId !== playerId) {
    throw new Error('No es tu turno');
  }

  // Verificar que el jugador no está folded
  if (currentPlayer.folded) {
    throw new Error('Ya hiciste fold en esta mano');
  }

  // Convertir a números para evitar comparaciones de strings
  const currentBet = parseInt(game.currentBet) || 0;
  const playerChips = currentPlayer.chips;
  const playerBetInPhase = parseInt(currentPlayer.betInPhase) || 0;

  switch (action) {
    case 'fold':
      return true;

    case 'check':
      // Solo si la apuesta actual es igual a lo que ya ha puesto
      if (playerBetInPhase >= currentBet) {
        return true;
      }
      throw new Error('No puedes hacer check, necesitas igualar la apuesta');

    case 'call':
      const callAmount = currentBet - playerBetInPhase;
      // Si no alcanza para igualar completa, se permite call all-in (short call)
      // y la gestión de side pots se hace en processPlayerAction.
      return true;

    case 'raise':
      // Si el jugador está haciendo all-in (apostando todas sus fichas), es válido
      const isAllIn = amount >= playerChips;
      
      if (!isAllIn && amount <= currentBet - playerBetInPhase) {
        throw new Error(`La subida mínima es ${currentBet - playerBetInPhase + currentBet}`);
      }
      const raiseTotal = playerBetInPhase + amount;
      if (raiseTotal > playerChips + playerBetInPhase) {
        throw new Error('No tienes suficientes fichas para subir esa cantidad');
      }
      return true;

    case 'all-in':
      if (playerChips <= 0) {
        throw new Error('Ya estás all-in');
      }
      return true;

    default:
      throw new Error('Acción inválida');
  }
};

/**
 * Procesar una acción en el juego
 */
export const processPlayerAction = async (game, playerId, action, amount = 0) => {
  // Asegurar que pot y currentBet son números ANTES de validar
  game.pot = parseInt(game.pot) || 0;
  game.currentBet = parseInt(game.currentBet) || 0;

  // También convertir committed de todos los jugadores
  game.players.forEach(p => {
    p.committed = parseInt(p.committed) || 0;
  });

  validateAction(game, playerId, action, amount);

  const players = game.players;
  const currentPlayerIndex = game.currentPlayerIndex;
  const currentPlayer = players[currentPlayerIndex];

  let totalBet = 0;

  switch (action) {
    case 'fold':
      currentPlayer.folded = true;
      // Rebuild side pots when a player folds
      if (!game.sidePots) {
        game.sidePots = calculateSidePots(game.players);
      }
      game.sidePots = removeFoldedPlayerFromPots(game.sidePots, currentPlayerIndex);
      break;

    case 'check':
      // No hay cambio en fichas
      break;

    case 'call':
      const playerCommittedNum = parseInt(currentPlayer.committed) || 0;
      const playerBetInPhaseNum = parseInt(currentPlayer.betInPhase) || 0;
      const callAmount = Math.max(0, game.currentBet - playerBetInPhaseNum);
      const paidAmount = Math.min(callAmount, currentPlayer.chips);
      currentPlayer.chips -= paidAmount;
      currentPlayer.committed = playerCommittedNum + paidAmount;
      currentPlayer.betInPhase = playerBetInPhaseNum + paidAmount;
      game.pot += paidAmount;
      totalBet = paidAmount;

      // Si el call dejó al jugador all-in, inicializar/recalcular side pots
      if (currentPlayer.chips === 0) {
        if (!game.sidePots) {
          game.sidePots = calculateSidePots(game.players);
        } else {
          game.sidePots = rebuildSidePots(game.players);
        }
      }
      break;

    case 'raise':
      // Si el jugador está apostando todas sus fichas (all-in), manejarlo como tal
      if (amount >= currentPlayer.chips) {
        // Es un all-in disfrazado de raise
        totalBet = currentPlayer.chips;
        game.pot += currentPlayer.chips;
        currentPlayer.committed = (parseInt(currentPlayer.committed) || 0) + currentPlayer.chips;
        currentPlayer.betInPhase = (parseInt(currentPlayer.betInPhase) || 0) + currentPlayer.chips;
        currentPlayer.chips = 0;
        // Solo actualizar currentBet si la nueva apuesta es mayor
        if (currentPlayer.betInPhase > game.currentBet) {
          game.currentBet = currentPlayer.betInPhase;
        }
      } else {
        // Raise normal
        currentPlayer.chips -= amount;
        currentPlayer.committed = (parseInt(currentPlayer.committed) || 0) + amount;
        currentPlayer.betInPhase = (parseInt(currentPlayer.betInPhase) || 0) + amount;
        game.pot += amount;
        game.currentBet = currentPlayer.betInPhase;
        totalBet = amount;
      }
      break;

    case 'all-in':
      totalBet = currentPlayer.chips;
      game.pot += currentPlayer.chips;
      currentPlayer.committed = (parseInt(currentPlayer.committed) || 0) + currentPlayer.chips;
      currentPlayer.betInPhase = (parseInt(currentPlayer.betInPhase) || 0) + currentPlayer.chips;
      currentPlayer.chips = 0;
      if (currentPlayer.betInPhase > game.currentBet) {
        game.currentBet = currentPlayer.betInPhase;
      }
      // Initialize side pots when a player goes all-in
      if (!game.sidePots) {
        game.sidePots = calculateSidePots(game.players);
      }
      break;
  }

  currentPlayer.lastAction = action;

  // Normalizar referencia explícitamente (algunas implementaciones de JSON pueden entregar copias)
  players[currentPlayerIndex] = { ...currentPlayer };

  console.log('[DEBUG][NEXT_PLAYER] After action, looking for next player');
  console.log('[DEBUG][NEXT_PLAYER] Current player index:', currentPlayerIndex);
  console.log('[DEBUG][NEXT_PLAYER] Players state:', players.map((p, idx) => ({
    index: idx,
    userId: p.userId,
    chips: p.chips,
    folded: p.folded
  })));

  // Mover al siguiente jugador que no está folded NI all-in
  let nextIndex = (currentPlayerIndex + 1) % players.length;
  const startIndex = nextIndex;

  console.log('[DEBUG][NEXT_PLAYER] Starting nextIndex:', nextIndex, 'startIndex:', startIndex);

  // Saltar jugadores folded o all-in (sin chips para actuar)
  while (players[nextIndex].folded || players[nextIndex].chips === 0) {
    console.log('[DEBUG][NEXT_PLAYER] Skipping player', nextIndex, '- folded:', players[nextIndex].folded, 'chips:', players[nextIndex].chips);
    nextIndex = (nextIndex + 1) % players.length;
    if (nextIndex === startIndex) {
      console.log('[DEBUG][NEXT_PLAYER] Full circle! nextIndex === startIndex');
      const nonFoldedPlayers = players.filter(p => !p.folded);
      const pendingPlayers = players
        .map((p, idx) => ({ p, idx }))
        .filter(({ p }) => (parseInt(p.chips) || 0) > 0 && p.lastAction == null);

      if (nonFoldedPlayers.length === 1) {
        const soleRemaining = nonFoldedPlayers[0];
        const pendingOthers = pendingPlayers.filter(({ p }) => p.userId !== soleRemaining.userId);
        if (pendingOthers.length > 0) {
          nextIndex = pendingOthers[0].idx;
          console.log('[DEBUG][NEXT_PLAYER] Preventing premature fold win, pending player found:', nextIndex);
          break;
        }
      }

      // Todos excepto uno han hecho fold, o todos están all-in
      const activePlayers = getActivePlayers(players);
      if (activePlayers.length === 1) {
        console.log('[DEBUG][NEXT_PLAYER] Only 1 active player, ending by fold');
        const foldResult = await finishByFold(game);
        if (foldResult?.handContinues) {
          return {
            success: true,
            handOver: true,
            winner: foldResult.winner,
            winners: foldResult.winners || [],
            potWon: foldResult.potWon || 0,
            progression: foldResult.progression || { unlockedAchievements: [], completedMissions: [] },
            gameState: await getGameState(game.id, false)
          };
        }
        return { gameOver: true, winner: foldResult?.winner || foldResult };
      }
      // Todos están all-in, avanzar a la siguiente fase automáticamente
      console.log('[DEBUG][NEXT_PLAYER] All players all-in, breaking');
      break;
    }
  }

  console.log('[DEBUG][NEXT_PLAYER] Found next player:', nextIndex);

  // Verificar si la ronda de apuestas terminó
  const dealerIndex = players.findIndex(p => p.userId === game.dealerId);
  const firstToAct = getFirstToActInPhase(players, dealerIndex, game.phase);
  const activePlayers = getActivePlayers(players);

  let roundComplete = checkAllPlayersActed(players, dealerIndex);

  // Debug: estado antes de decidir avanzar de fase
  console.log('[DEBUG][ROUND_CHECK]', {
    phase: game.phase,
    currentBet: game.currentBet,
    dealerIndex,
    firstToAct,
    currentPlayerIndex,
    nextIndex,
    roundComplete,
    activePlayers: activePlayers.map(p => ({
      userId: p.userId,
      committed: parseInt(p.committed) || 0,
      chips: p.chips,
      lastAction: p.lastAction,
      betInPhase: p.betInPhase || 0,
      folded: p.folded
    }))
  });

  // Fallback: si todos actuaron y las apuestas están igualadas, la ronda termina
  if (!roundComplete) {
    const currentBetNum = parseInt(game.currentBet) || 0;
    // Solo considerar jugadores que pueden actuar (tienen chips)
    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    
    const allMatched = playersWithChips.every(p => {
      const betInPhase = parseInt(p.betInPhase) || 0;
      return betInPhase >= currentBetNum;
    });
    const everyoneActed = playersWithChips.every(p => p.lastAction);

    // Si todos con chips han actuado y los montos coinciden, la ronda está completa
    // (sin importar si volvimos al firstToAct, porque los all-in pueden romper ese ciclo)
    if (everyoneActed && allMatched) {
      roundComplete = true;
    }
  }

  // Guardia adicional: aunque checkAllPlayersActed diga true,
  // la ronda NO puede cerrarse si algún jugador con chips no ha igualado currentBet.
  if (roundComplete) {
    const currentBetNum = parseInt(game.currentBet) || 0;
    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    const everyoneMatchedCurrentBet = playersWithChips.every(p => {
      const betInPhase = parseInt(p.betInPhase) || 0;
      return betInPhase >= currentBetNum;
    });

    if (!everyoneMatchedCurrentBet) {
      roundComplete = false;
      console.log('[DEBUG][ROUND_CHECK] Preventing premature roundComplete: players with chips not matched currentBet');
    }
  }

  if (activePlayers.length === 1) {
    const soleRemaining = activePlayers[0];
    const pendingOthers = players.filter(
      p => (parseInt(p.chips) || 0) > 0 && p.lastAction == null && p.userId !== soleRemaining.userId
    );

    if (pendingOthers.length > 0) {
      const nextPendingIndex = players.findIndex(p => p.userId === pendingOthers[0].userId);
      if (nextPendingIndex !== -1) {
        game.currentPlayerIndex = nextPendingIndex;
        game.players = JSON.parse(JSON.stringify(players));
        game.changed('players', true);
        await game.save();

        return {
          success: true,
          action,
          amount: totalBet,
          nextPlayer: players[nextPendingIndex],
          gameState: await getGameState(game.id, false)
        };
      }
    }

    const foldResult = await finishByFold(game);
    if (foldResult?.handContinues) {
      return {
        success: true,
        handOver: true,
        winner: foldResult.winner,
        winners: foldResult.winners || [],
        potWon: foldResult.potWon || 0,
        progression: foldResult.progression || { unlockedAchievements: [], completedMissions: [] },
        gameState: await getGameState(game.id, false)
      };
    }
    return { gameOver: true, winner: foldResult?.winner || foldResult };
  }

  if (roundComplete) {
    console.log('[DEBUG][ROUND_COMPLETE] Round marked as complete');
    console.log('[DEBUG][ROUND_COMPLETE] Players:', players.map(p => ({
      userId: p.userId,
      chips: p.chips,
      committed: p.committed,
      lastAction: p.lastAction,
      folded: p.folded
    })));
    
    // Deep copy limpio para guardar
    game.players = JSON.parse(JSON.stringify(players));
    game.changed('players', true);
    
    // Guardar el estado actualizado antes de avanzar fase
    await game.save();
    console.log(`[DEBUG][SAVE] Game ${game.id} saved with ${game.players?.length || 0} players`);

    const activePlayers = players.filter(p => !p.folded);
    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    const allInPlayers = activePlayers.filter(p => p.chips === 0 && (p.betInPhase || p.committed) > 0);
    const pendingPlayersWithChips = activePlayers.filter(p => p.chips > 0 && !p.lastAction);

    console.log('[DEBUG][ROUND_COMPLETE] Active players:', activePlayers.length);
    console.log('[DEBUG][ROUND_COMPLETE] Players with chips:', playersWithChips.length);
    console.log('[DEBUG][ROUND_COMPLETE] All-in players:', allInPlayers.length);
    console.log('[DEBUG][ROUND_COMPLETE] Pending players with chips:', pendingPlayersWithChips.length);

    // Si aún queda algún jugador con fichas por actuar, NO cerrar ronda todavía.
    if (pendingPlayersWithChips.length > 0) {
      const nextPendingIndex = players.findIndex(p => p.userId === pendingPlayersWithChips[0].userId);
      if (nextPendingIndex !== -1) {
        game.currentPlayerIndex = nextPendingIndex;
        game.players = JSON.parse(JSON.stringify(players));
        game.changed('players', true);
        await game.save();

        return {
          success: true,
          action,
          amount: totalBet,
          nextPlayer: players[nextPendingIndex],
          gameState: await getGameState(game.id, false)
        };
      }
    }

    // Si hay jugadores all-in y la ronda terminó, correr board automáticamente
    // hasta river y resolver showdown.
    const hasAllInPlayers = allInPlayers.length > 0;
    if (hasAllInPlayers && activePlayers.length > 1) {
      const runoutByPhase = {
        preflop: ['flop', 'turn', 'river'],
        flop: ['turn', 'river'],
        turn: ['river'],
        river: []
      };

      const phasesToDeal = runoutByPhase[game.phase] || [];
      for (const phaseToDeal of phasesToDeal) {
        dealCommunityForNextPhase(game, phaseToDeal);
        game.phase = phaseToDeal;
      }

      game.currentBet = 0;
      game.players = JSON.parse(JSON.stringify(players));
      game.changed('players', true);
      await game.save();

      const showdownResult = await finishShowdown(game);
      if (showdownResult?.handContinues) {
        return {
          success: true,
          handOver: true,
          winner: showdownResult.winner,
          winners: showdownResult.winners || [],
          potWon: showdownResult.potWon || 0,
          progression: showdownResult.progression || { unlockedAchievements: [], completedMissions: [] },
          gameState: await getGameState(game.id, false)
        };
      }
      return { gameOver: true, winner: showdownResult?.winner || showdownResult };
    }

    // Flujo normal: avanzar solo una fase
    if (game.phase === 'river') {
      const showdownResult = await finishShowdown(game);
      if (showdownResult?.handContinues) {
        return {
          success: true,
          handOver: true,
          winner: showdownResult.winner,
          winners: showdownResult.winners || [],
          potWon: showdownResult.potWon || 0,
          progression: showdownResult.progression || { unlockedAchievements: [], completedMissions: [] },
          gameState: await getGameState(game.id, false)
        };
      }
      return { gameOver: true, winner: showdownResult?.winner || showdownResult };
    }

    await advanceGamePhase(game);
    
    const result = {
      phaseAdvanced: true,
      gameState: await getGameState(game.id, false)
    };

    return result;
  }

  // Si no pasamos la ronda completa, simplemente mover al siguiente jugador
  game.currentPlayerIndex = nextIndex;
  game.players = JSON.parse(JSON.stringify(players));  // Deep copy limpio
  game.changed('players', true);
  
  await game.save();

  const result = { 
    success: true, 
    action, 
    amount: totalBet,
    nextPlayer: players[nextIndex],
    gameState: await getGameState(game.id, false)
  };

  return result;
};

/**
 * Obtener el estado actual del juego
 */
export const getGameState = async (gameId, autoShowdown = true) => {
  const game = await Game.findByPk(gameId, {
    include: [
      {
        model: Table,
        attributes: ['name', 'smallBlind', 'bigBlind', 'maxPlayers']
      },
      {
        model: User,
        as: 'winner',
        attributes: ['id', 'username', 'avatar']
      }
    ]
  });

  if (!game) throw new Error('Juego no encontrado');

  console.log(`[DEBUG][getGameState] Game ${gameId}:`, {
    players_count: game.players?.length || 0,
    players_raw: game.players,
    status: game.status,
    phase: game.phase
  });

  // Si el juego está activo y todos excepto 1 jugador están all-in, hacer showdown automáticamente
  // PERO solo si autoShowdown es true (no se ejecuta durante processPlayerAction)
  if (autoShowdown && game.status === 'active') {
    const activePlayers = game.players.filter(p => !p.folded);
    const playersWithChips = activePlayers.filter(p => p.chips > 0);

    if (playersWithChips.length <= 1 && activePlayers.length > 1 && game.phase !== 'showdown') {
      // Avanzar automáticamente a river si no estamos allí
      while (game.phase !== 'river') {
        console.log('[DEBUG][GAMESTATE_AUTO] Avanzando de', game.phase);
        await advanceGamePhase(game);
      }
      // Hacer showdown
      console.log('[DEBUG][GAMESTATE_AUTO] Haciendo showdown');
      await finishShowdown(game);
    }
  }

  // Parse JSON fields si son strings
  const communityCards = typeof game.communityCards === 'string' 
    ? JSON.parse(game.communityCards || '[]')
    : (game.communityCards || []);

  // Obtener información completa de los jugadores desde la base de datos
  const playerUserIds = game.players.map(p => p.userId);
  const users = await User.findAll({
    where: { id: playerUserIds },
    attributes: ['id', 'username', 'avatar', 'chips']
  });

  // Crear un mapa de usuarios por ID para búsqueda rápida
  const usersMap = {};
  users.forEach(u => {
    usersMap[u.id] = u;
  });

  return {
    id: game.id,
    tableId: game.tableId,
    table: game.Table,
    phase: game.phase,
    status: game.status,
    pot: parseInt(game.pot) || 0,
    communityCards: communityCards,
    currentBet: parseInt(game.currentBet) || 0,
    currentPlayerIndex: game.currentPlayerIndex,
    players: game.players.map((p, idx) => {
      const user = usersMap[p.userId];
      return {
        userId: p.userId,
        username: user?.username || 'Unknown',
        avatar: user?.avatar || '🎮',
        chips: p.chips,
        committed: parseInt(p.committed) || 0,
        folded: p.folded,
        isSittingOut: !!p.isSittingOut,
        lastAction: p.lastAction || null,
        betInPhase: p.betInPhase || 0,
        isCurrentPlayer: idx === game.currentPlayerIndex,
        holeCards: p.holeCards || [],
        cardsHidden: true // Las cartas se ven según permisos
      };
    }),
    dealerIndex: game.players.findIndex(p => p.userId === game.dealerId),
    smallBlindIndex: game.players.findIndex(p => p.userId === game.smallBlindId),
    bigBlindIndex: game.players.findIndex(p => p.userId === game.bigBlindId),
    winner: game.winner || null,
    winners: game.winners || [],
    winnerIds: game.winnerIds || [],
    startTime: game.startTime,
    endTime: game.endTime
  };
};

export default {
  createDeck,
  shuffleDeck,
  getNextDealerPosition,
  calculatePositions,
  initializeGame,
  validateAction,
  processPlayerAction,
  getGameState
};
