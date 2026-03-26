/**
 * Utilidades para las diferentes fases del juego
 * preflop -> flop -> turn -> river -> showdown
 */

/**
 * Transiciones válidas de fase
 */
export const PHASE_TRANSITIONS = {
  preflop: 'flop',
  flop: 'turn',
  turn: 'river',
  river: 'showdown',
  showdown: null
};

export const PHASES = ['preflop', 'flop', 'turn', 'river', 'showdown'];

/**
 * Revelar community cards según la fase
 */
export const revealCommunityCards = (allCards, phase) => {
  // allCards es un array de 5 cartas (ya debe estar preparado)
  // Revelar según la fase
  switch (phase) {
    case 'preflop':
      return []; // Sin community cards en preflop
    case 'flop':
      return allCards.slice(0, 3); // 3 cartas en flop
    case 'turn':
      return allCards.slice(0, 4); // +1 carta
    case 'river':
      return allCards.slice(0, 5); // +1 carta
    case 'showdown':
      return allCards; // Todas las cartas
    default:
      return [];
  }
};

/**
 * Obtener número de cartas comunitarias según fase
 */
export const getCommunityCardCount = (phase) => {
  const counts = {
    preflop: 0,
    flop: 3,
    turn: 4,
    river: 5,
    showdown: 5
  };
  return counts[phase] || 0;
};

/**
 * Resetear bets para nueva ronda
 * (Después de cada fase, en la siguiente fase)
 */
export const resetBetsForNextPhase = (players) => {
  players.forEach(player => {
    player.lastAction = null;
    player.betInPhase = 0;
  });
  return players;
};

/**
 * Determinar quién debe actuar en una fase
 * Primero a actuar: en preflop es UTG (después BB)
 * En otras fases es SB o el primero no folded después del dealer
 */
export const getFirstToActInPhase = (players, dealerIndex, phase) => {
  const count = players.length;
  
  if (count === 2) {
    // HEADS-UP ESPECIAL
    if (phase === 'preflop') {
      // Preflop: SB actúa primero (dealer es BB)
      return (dealerIndex + 1) % count;
    } else {
      // Postflop: BB (dealer) actúa primero
      return dealerIndex;
    }
  }
  
  // 6-max+ estándar
  if (phase === 'preflop') {
    // Preflop: el jugador después del BB actúa primero
    const bbIndex = (dealerIndex + 2) % count;
    let firstIndex = (bbIndex + 1) % count;
    
    while (players[firstIndex].folded && firstIndex !== dealerIndex) {
      firstIndex = (firstIndex + 1) % count;
    }
    return firstIndex;
  } else {
    // Postflop: Small blind actúa primero (o el primero no folded)
    const sbIndex = (dealerIndex + 1) % count;
    let firstIndex = sbIndex;
    
    while (players[firstIndex].folded && firstIndex !== dealerIndex) {
      firstIndex = (firstIndex + 1) % count;
    }
    return firstIndex;
  }
};

/**
 * Verificar si todos los jugadores activos han actuado
 * (Y sus bets están equilibradas, excepto all-in)
 */
export const checkAllPlayersActed = (players, dealerIndex) => {
  // Jugadores con chips pueden seguir actuando
  const playersWithChips = players.filter(p => !p.folded && p.chips > 0);
  
  // Si solo hay 1 jugador o ninguno con chips, verificar si ese jugador actuó
  if (playersWithChips.length <= 1) {
    // Si solo hay 1 jugador con chips, verificar que haya actuado
    if (playersWithChips.length === 1) {
      return !!playersWithChips[0].lastAction;
    }
    // Si no hay jugadores con chips (todos all-in), la ronda terminó
    return true;
  }

  // Verificar que todos los jugadores con chips han actuado
  const allActed = playersWithChips.every(p => p.lastAction);
  
  if (!allActed) return false;

  // Verificar que todos los jugadores con chips tienen la misma cantidad apostada en esta fase
  const committedAmounts = playersWithChips.map(p => parseInt(p.betInPhase) || 0);

  if (committedAmounts.length === 0) return true;

  const maxCommitted = Math.max(...committedAmounts);
  return committedAmounts.every(a => a === maxCommitted);
};

/**
 * Avanzar a la siguiente fase
 */
export const advancePhase = (currentPhase) => {
  return PHASE_TRANSITIONS[currentPhase];
};

/**
 * Repartir 5 cartas comunitarias
 */
export const generateCommunityCards = (deck) => {
  const communityCards = [];
  // Burn 1 card
  deck.pop();
  // Flop (3 cartas)
  for (let i = 0; i < 3; i++) {
    communityCards.push(deck.pop());
  }
  // Burn 1 card
  deck.pop();
  // Turn (1 carta)
  communityCards.push(deck.pop());
  // Burn 1 card
  deck.pop();
  // River (1 carta)
  communityCards.push(deck.pop());
  
  return communityCards;
};

/**
 * Convertir cartas a formato evaluable
 * "AH" -> { rank: 'A', suit: 'H' }
 */
export const parseCard = (cardString) => {
  const suitChar = cardString.charAt(cardString.length - 1);
  const rank = cardString.substring(0, cardString.length - 1);
  
  return {
    rank,
    suit: suitChar
  };
};

export default {
  PHASE_TRANSITIONS,
  PHASES,
  revealCommunityCards,
  getCommunityCardCount,
  resetBetsForNextPhase,
  getFirstToActInPhase,
  checkAllPlayersActed,
  advancePhase,
  generateCommunityCards,
  parseCard
};
