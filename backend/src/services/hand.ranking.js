/**
 * Evaluación de manos de poker
 * Determinar el ranking de una mano de 5 cartas
 */

export const HAND_RANKS = {
  ROYAL_FLUSH: { rank: 8, name: 'Royal Flush' },
  STRAIGHT_FLUSH: { rank: 7, name: 'Straight Flush' },
  FOUR_OF_A_KIND: { rank: 6, name: 'Four of a Kind' },
  FULL_HOUSE: { rank: 5, name: 'Full House' },
  FLUSH: { rank: 4, name: 'Flush' },
  STRAIGHT: { rank: 3, name: 'Straight' },
  THREE_OF_A_KIND: { rank: 2, name: 'Three of a Kind' },
  TWO_PAIR: { rank: 1, name: 'Two Pair' },
  ONE_PAIR: { rank: 0, name: 'One Pair' },
  HIGH_CARD: { rank: -1, name: 'High Card' }
};

const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

/**
 * Parse una carta en formato "AS"
 */
const parseCard = (card) => {
  const suitChar = card.charAt(card.length - 1);
  const rankStr = card.substring(0, card.length - 1);
  
  return {
    rank: RANK_VALUES[rankStr],
    rankStr,
    suit: suitChar
  };
};

/**
 * Obtener la mejor mano de 5 cartas de 7 cartas (hole + community)
 */
export const getBestHand = (holeCards, communityCards) => {
  const allCards = [...holeCards, ...communityCards];
  const parsed = allCards.map(parseCard);
  
  // Generar todas las combinaciones de 5 cartas
  const fiveCardCombos = getCombinations(parsed, 5);
  
  // Evaluar cada combinación y encontrar la mejor
  let bestHand = null;
  let bestRank = -2;
  
  for (const combo of fiveCardCombos) {
    const evaluation = evaluateHand(combo);
    if (evaluation.rankValue > bestRank) {
      bestRank = evaluation.rankValue;
      bestHand = { cards: combo, ...evaluation };
    }
  }
  
  return bestHand;
};

/**
 * Evaluar una mano específica de 5 cartas
 */
export const evaluateHand = (cards) => {
  // Ordenar por rank descendente
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);

  // Comprobar patrones
  if (isRoyalFlush(sorted)) {
    return { hand: HAND_RANKS.ROYAL_FLUSH, rankValue: 8, tieBreakers: [14] };
  }
  if (isStraightFlush(sorted)) {
    return { hand: HAND_RANKS.STRAIGHT_FLUSH, rankValue: 7, tieBreakers: getHighCard(sorted) };
  }
  if (isFourOfAKind(sorted)) {
    return { hand: HAND_RANKS.FOUR_OF_A_KIND, rankValue: 6, tieBreakers: getTiebreakers(sorted) };
  }
  if (isFullHouse(sorted)) {
    return { hand: HAND_RANKS.FULL_HOUSE, rankValue: 5, tieBreakers: getTiebreakers(sorted) };
  }
  if (isFlush(sorted)) {
    return { hand: HAND_RANKS.FLUSH, rankValue: 4, tieBreakers: getHighCard(sorted) };
  }
  if (isStraight(sorted)) {
    return { hand: HAND_RANKS.STRAIGHT, rankValue: 3, tieBreakers: getHighCard(sorted) };
  }
  if (isThreeOfAKind(sorted)) {
    return { hand: HAND_RANKS.THREE_OF_A_KIND, rankValue: 2, tieBreakers: getTiebreakers(sorted) };
  }
  if (isTwoPair(sorted)) {
    return { hand: HAND_RANKS.TWO_PAIR, rankValue: 1, tieBreakers: getTiebreakers(sorted) };
  }
  if (isOnePair(sorted)) {
    return { hand: HAND_RANKS.ONE_PAIR, rankValue: 0, tieBreakers: getTiebreakers(sorted) };
  }
  
  return { hand: HAND_RANKS.HIGH_CARD, rankValue: -1, tieBreakers: getHighCard(sorted) };
};

// Patrones de mano
const isFlush = (cards) => {
  return cards.every(c => c.suit === cards[0].suit);
};

const isStraight = (cards) => {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  
  // Verificar secuencia normal
  if (ranks[0] - ranks[4] === 4) {
    return true;
  }
  
  // Verificar A-2-3-4-5 (rueda)
  if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
    return true;
  }
  
  return false;
};

const isRoyalFlush = (cards) => {
  if (!isFlush(cards)) return false;
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  return ranks[0] === 14 && ranks[4] === 10;
};

const isStraightFlush = (cards) => {
  return isFlush(cards) && isStraight(cards);
};

const isNOfAKind = (cards, n) => {
  const rankCounts = {};
  cards.forEach(c => {
    rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
  });
  return Object.values(rankCounts).includes(n);
};

const getFourOfAKind = (cards) => {
  return isNOfAKind(cards, 4);
};

const isFourOfAKind = getFourOfAKind;

const isFullHouse = (cards) => {
  const rankCounts = {};
  cards.forEach(c => {
    rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
  });
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  return counts[0] === 3 && counts[1] === 2;
};

const isThreeOfAKind = (cards) => {
  return isNOfAKind(cards, 3);
};

const isTwoPair = (cards) => {
  const rankCounts = {};
  cards.forEach(c => {
    rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
  });
  const pairs = Object.values(rankCounts).filter(c => c === 2);
  return pairs.length === 2;
};

const isOnePair = (cards) => {
  const rankCounts = {};
  cards.forEach(c => {
    rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
  });
  return Object.values(rankCounts).includes(2);
};

// Tiebreakers
const getHighCard = (cards) => {
  return cards.map(c => c.rank).sort((a, b) => b - a);
};

const getTiebreakers = (cards) => {
  const rankCounts = {};
  cards.forEach(c => {
    rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
  });

  // Ordenar por frecuencia y luego por valor
  return Object.entries(rankCounts)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return parseInt(b[0]) - parseInt(a[0]);
    })
    .map(([rank]) => parseInt(rank));
};

/**
 * Comparar dos manos evaluadas
 * Retorna: 1 si hand1 gana, -1 si hand2 gana, 0 si empate
 */
export const compareHands = (hand1, hand2) => {
  if (hand1.rankValue !== hand2.rankValue) {
    return hand1.rankValue > hand2.rankValue ? 1 : -1;
  }

  // Mismo ranking, verificar tiebreakers
  for (let i = 0; i < hand1.tieBreakers.length; i++) {
    if (hand1.tieBreakers[i] !== hand2.tieBreakers[i]) {
      return hand1.tieBreakers[i] > hand2.tieBreakers[i] ? 1 : -1;
    }
  }

  return 0; // Empate
};

/**
 * Generar todas las combinaciones de tamaño r de un array
 */
function getCombinations(arr, r) {
  if (r === 1) return arr.map(x => [x]);
  
  const combinations = [];
  for (let i = 0; i < arr.length - r + 1; i++) {
    const rest = getCombinations(arr.slice(i + 1), r - 1);
    rest.forEach(combo => {
      combinations.push([arr[i], ...combo]);
    });
  }
  return combinations;
}

export default {
  HAND_RANKS,
  getBestHand,
  evaluateHand,
  compareHands
};
