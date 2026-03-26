/**
 * Servicio de Botes Laterales (Side Pots)
 * Gestiona botes laterales cuando los jugadores hacen all-in con diferentes tamaños de stack
 *
 * Ejemplo:
 * - Jugador A: $100 all-in
 * - Jugador B: $300 all-in
 * - Jugador C: $500 all-in
 *
 * Bote Principal: $100 x 3 = $300 (A, B, C pueden ganar)
 * Bote Lateral 1: $200 x 2 = $400 (B, C pueden ganar)
 * Bote Lateral 2: $200 x 1 = $200 (solo C puede ganar)
 */

/**
 * Calcular botes laterales basados en las apuestas comprometidas de los jugadores
 * Retorna un array de botes con los jugadores elegibles para cada uno
 *
 * @param {Array} players - Array de {userId, chips, committed, folded}
 * @returns {Array} Array de {amount, eligiblePlayerIndices}
 */
export const calculateSidePots = (players) => {
  // Obtener jugadores activos (no foldeados) con sus cantidades comprometidas
  const activeCommitments = players
    .map((p, idx) => ({
      playerIndex: idx,
      committed: parseInt(p.committed) || 0,
      folded: p.folded
    }))
    .filter(p => !p.folded)
    .sort((a, b) => a.committed - b.committed);

  if (activeCommitments.length === 0) {
    return [];
  }

  const pots = [];
  let previousLevel = 0;

  for (let i = 0; i < activeCommitments.length; i++) {
    const currentLevel = activeCommitments[i].committed;

    if (currentLevel > previousLevel) {
      // Determinar jugadores elegibles para este bote (aquellos que comprometieron al menos este nivel)
      const eligibleIndices = activeCommitments
        .filter(p => p.committed >= currentLevel)
        .map(p => p.playerIndex);

      // Incluir también jugadores no foldeados que comprometieron al nivel anterior
      // Son elegibles para todos los botes hasta su nivel de compromiso
      for (let j = 0; j < activeCommitments.length; j++) {
        const p = activeCommitments[j];
        if (p.committed >= currentLevel && !eligibleIndices.includes(p.playerIndex)) {
          eligibleIndices.push(p.playerIndex);
        }
      }

      // Calcular la cantidad del bote
      // Cada jugador elegible contribuye (currentLevel - previousLevel)
      const levelDifference = currentLevel - previousLevel;
      const contributingPlayers = activeCommitments.filter(
        p => p.committed >= currentLevel
      ).length;

      const potAmount = levelDifference * contributingPlayers;

      pots.push({
        amount: potAmount,
        eligiblePlayerIndices: eligibleIndices.sort((a, b) => a - b)
      });

      previousLevel = currentLevel;
    }
  }

  return pots;
};

/**
 * Reconstruir botes desde el estado actual del juego
 * Debe llamarse siempre que el estado del juego cambie (acción tomada, cambio de fase, etc)
 *
 * @param {Object} game - Objeto del juego con array de jugadores
 */
export const rebuildSidePots = (game) => {
  const pots = calculateSidePots(game.players);

  // Almacenar botes en el objeto del juego
  game.sidePots = pots;

  // Calcular total del bote desde los botes laterales para verificar integridad
  const totalFromPots = pots.reduce((sum, pot) => sum + pot.amount, 0);

  return {
    sidePots: pots,
    totalFromPots
  };
};

/**
 * Distribuir botes a los ganadores
 * En el showdown, la mejor mano gana cada bote para el que sea elegible
 * En escenarios de fold, el jugador restante gana todos los botes para los que sea elegible
 *
 * @param {Array} pots - Array de botes laterales
 * @param {Array} winners - Array de {playerIndex, hand, description}
 * @param {Array} players - Array de jugadores del juego
 * @param {number} dealerIndex - Índice del dealer (para distribuir chip impar de forma correcta)
 * @returns {Array} Array de jugadores actualizado con fichas distribuidas
 */
export const distributeSidePots = (pots, winners, players, dealerIndex = 0) => {
  const updatedPlayers = JSON.parse(JSON.stringify(players));
  const numPlayers = players.length;

  // Para cada bote, encontrar el mejor ganador entre los jugadores elegibles
  for (const pot of pots) {
    // Encontrar ganadores entre los jugadores elegibles para este bote
    const eligibleWinners = winners.filter(w =>
      pot.eligiblePlayerIndices.includes(w.playerIndex)
    );

    if (eligibleWinners.length === 0) {
      // No hay ganadores elegibles para este bote (no debería pasar)
      continue;
    }

    if (eligibleWinners.length === 1) {
      // Un solo ganador para este bote
      updatedPlayers[eligibleWinners[0].playerIndex].chips += pot.amount;
    } else {
      // Múltiples ganadores (división)
      const share = Math.floor(pot.amount / eligibleWinners.length);
      const remainder = pot.amount - share * eligibleWinners.length;

      // Distribuir share equitativo a todos
      eligibleWinners.forEach((winner) => {
        updatedPlayers[winner.playerIndex].chips += share;
      });

      // El chip impar va al jugador más cercano al dealer en sentido horario
      if (remainder > 0) {
        // Encontrar el ganador más cercano al dealer en orden horario
        let closestToDealer = null;
        let closestDistance = numPlayers;

        for (const winner of eligibleWinners) {
          // Calcular distancia en sentido horario desde el dealer
          let distance = (winner.playerIndex - dealerIndex + numPlayers) % numPlayers;
          if (distance === 0 && eligibleWinners.length > 1) {
            distance = numPlayers; // El dealer mismo tendría distancia 0
          }
          if (distance < closestDistance) {
            closestDistance = distance;
            closestToDealer = winner.playerIndex;
          }
        }

        if (closestToDealer !== null) {
          updatedPlayers[closestToDealer].chips += remainder;
        }
      }
    }
  }

  return updatedPlayers;
};

/**
 * Validar si un jugador puede hacer all-in con una cantidad específica
 * All-in solo es válido si:
 * 1. El jugador tiene fichas para comprometer
 * 2. La cantidad comprometida (anterior + nueva) es válida
 *
 * @param {Object} player - Objeto del jugador
 * @param {number} playerChips - Fichas restantes
 * @returns {boolean}
 */
export const validateAllIn = (player, playerChips) => {
  return playerChips > 0 && playerChips >= 0;
};

/**
 * Verificar si algún jugador está all-in (no tiene más fichas para actuar)
 * @param {Array} players - Array de jugadores del juego
 * @returns {boolean}
 */
export const isAnyPlayerAllIn = (players) => {
  return players.some(p => p.chips === 0 && !p.folded);
};

/**
 * Verificar si solo queda un jugador (todos los demás foldearon o están all-in con 0 fichas)
 * Se usa para determinar si el juego debe avanzar al showdown
 *
 * @param {Array} players - Array de jugadores del juego
 * @returns {number} Número de jugadores aún capaces de actuar
 */
export const getActivePlayersCount = (players) => {
  return players.filter(p => !p.folded && p.chips > 0).length;
};

/**
 * Cuando un jugador hace fold, actualizar los botes para removerlo de los jugadores elegibles
 * Esto asegura que los jugadores foldeados no ganen ningún bote
 *
 * @param {Array} pots - Array de botes laterales
 * @param {number} foldingPlayerIndex - Índice del jugador que hizo fold
 * @returns {Array} Botes actualizados sin el jugador foldeado
 */
export const removeFoldedPlayerFromPots = (pots, foldingPlayerIndex) => {
  return pots.map(pot => ({
    ...pot,
    eligiblePlayerIndices: pot.eligiblePlayerIndices.filter(
      idx => idx !== foldingPlayerIndex
    )
  })).filter(pot => pot.eligiblePlayerIndices.length > 0);
};
