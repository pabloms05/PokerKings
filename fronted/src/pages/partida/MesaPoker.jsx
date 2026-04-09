import React, { useState, useEffect, useRef, useCallback } from 'react';
import './MesaPoker.css';

// Tamaño base del diseño (en px). Todo el layout está pensado para este ancho.
const BASE_WIDTH = 1100;
const BASE_HEIGHT = 700;

function PokerTable({ 
  maxPlayers = 6, 
  players = [], 
  tableColor = '#1a4d2e',
  dealerPosition = null,
  smallBlindPosition = null,
  bigBlindPosition = null,
  communityCards = [],
  gamePhase = 'waiting',
  pot = 0,
  sidePots = [],
  currentPlayerId = null,
  currentUserIndex = null,
  currentPlayerIndex = null,
  keepVisibleUserId = null,
  keepVisibleWhenSittingOut = false
}) {
  // Estado para rastrear qué cartas ya fueron reveladas
  const [revealedCards, setRevealedCards] = useState([]);

  // Escala responsiva: mide el wrapper y escala el contenedor proporcionalmente
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    if (!wrapperRef.current) return;
    const availableWidth = wrapperRef.current.offsetWidth;
    const newScale = Math.min(availableWidth / BASE_WIDTH, 1);
    setScale(newScale);
  }, []);

  useEffect(() => {
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [updateScale]);
  
  // FIX: useRef para evitar re-renders innecesarios de animaciones
  const prevPhaseRef = useRef(gamePhase);
  const prevCardsLengthRef = useRef(communityCards.length);
  
  // Obtener ruta de imagen de carta (e.g., "AS" → "/assets/images/AS.png")
  const getCardImage = (card) => {
    if (!card || card.length < 2) return null;
    
    // Normalizar formato: "10H" debe quedar como "10H", "Ah" como "AH"
    let rank = card.slice(0, -1).toUpperCase();
    let suit = card.slice(-1).toUpperCase();

    
    // Asegurar que rank esté en el formato correcto
    const validRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const validSuits = ['C', 'D', 'H', 'S'];
    
    if (!validRanks.includes(rank) || !validSuits.includes(suit)) {
      console.warn(`Carta inválida: ${card}`);
      return null;
    }
    
    return `/assets/images/${rank}${suit}.png`;
  };

  // Determinar qué cartas mostrar según fase del juego
  const getVisibleCards = () => {
    switch (gamePhase) {
      case 'pre-flop':
      case 'preflop':
        return [];
      case 'flop':
        return communityCards.slice(0, 3);
      case 'turn':
        return communityCards.slice(0, 4);
      case 'river':
      case 'showdown':
        return communityCards.slice(0, 5);
      default:
        return [];
    }
  };

  const visibleCards = getVisibleCards();
  const emptySlots = 5 - visibleCards.length;

  // Efecto para revelar cartas nuevas con delay
  useEffect(() => {
    // FIX: Solo ejecutar si realmente cambió la fase o el número de cartas
    const phaseChanged = prevPhaseRef.current !== gamePhase;
    const cardsChanged = prevCardsLengthRef.current !== communityCards.length;
    
    // Resetear cuando cambia la fase a waiting (nueva mano)
    if (gamePhase === 'waiting') {
      setRevealedCards([]);
      prevPhaseRef.current = gamePhase;
      prevCardsLengthRef.current = communityCards.length;
      return;
    }

    // Solo animar si hubo cambio real
    if (!phaseChanged && !cardsChanged) {
      return;
    }

    // Agregar nuevas cartas con un pequeño delay para activar la transición
    const currentVisibleCards = getVisibleCards();
    currentVisibleCards.forEach((card, index) => {
      if (!revealedCards.includes(card)) {
        setTimeout(() => {
          setRevealedCards(prev => {
            if (!prev.includes(card)) {
              return [...prev, card];
            }
            return prev;
          });
        }, index * 200); // Delay escalonado para animación
      }
    });
    
    // Actualizar referencias
    prevPhaseRef.current = gamePhase;
    prevCardsLengthRef.current = communityCards.length;
  }, [gamePhase, communityCards.length]);
  
  // Posiciones de los asientos alrededor de la mesa según el número máximo
  const seatPositions = {
    4: [
      { top: '0%', left: '50%', transform: 'translateX(-50%)' },       // Arriba
      { top: '50%', right: '2%', transform: 'translateY(-50%)' },      // Derecha
      { bottom: '0%', left: '50%', transform: 'translateX(-50%)' },    // Abajo
      { top: '50%', left: '2%', transform: 'translateY(-50%)' }        // Izquierda
    ],
    6: [
      { top: '0%', left: '50%', transform: 'translateX(-50%)' },       // Arriba centro
      { top: '6%', right: '12%' },                                     // Arriba derecha
      { bottom: '6%', right: '12%' },                                  // Abajo derecha
      { bottom: '0%', left: '50%', transform: 'translateX(-50%)' },    // Abajo centro
      { bottom: '6%', left: '12%' },                                   // Abajo izquierda
      { top: '6%', left: '12%' }                                       // Arriba izquierda
    ],
    8: [
      { top: '0%', left: '50%', transform: 'translateX(-50%)' },       // Arriba centro
      { top: '4%', right: '12%' },                                     // Arriba derecha
      { bottom: '4%', right: '12%' },                                  // Abajo derecha
      { bottom: '0%', left: '50%', transform: 'translateX(-50%)' },    // Abajo centro
      { bottom: '4%', left: '12%' },                                   // Abajo izquierda
      { top: '4%', left: '12%' },                                      // Arriba izquierda
      { top: '50%', left: '0.5%', transform: 'translateY(-50%)' },     // Centro izquierda
      { top: '50%', right: '0.5%', transform: 'translateY(-50%)' }     // Centro derecha
    ]
  };

  const positions = seatPositions[maxPlayers] || seatPositions[6];

  // Reordenar jugadores para que el usuario actual siempre esté en la posición inferior (center-bottom)
  const centerBottomIndex = maxPlayers === 6 ? 3 : (maxPlayers === 4 ? 2 : maxPlayers - 1);
  let displayedPlayers = [];
  let playerIndexMap = {};

  // Construir array de posiciones con rotación para poner al usuario en la posición inferior
  if (currentUserIndex !== null && currentUserIndex !== undefined && players.length > 0 && currentUserIndex >= 0) {
    // Calcular offset: cuántas posiciones rotar hacia la derecha para que el usuario esté en centerBottomIndex
    const offset = (centerBottomIndex - currentUserIndex + players.length) % players.length;
    
    // Llenar el array de posiciones con jugadores rotados
    for (let i = 0; i < maxPlayers; i++) {
      if (i < players.length) {
        // Calcular el índice original del jugador que debería estar en esta posición
        const originalIndex = (currentUserIndex + i - offset + players.length) % players.length;
        const originalPlayer = players[originalIndex];
        const keepVisible = (
          !!originalPlayer?.isSittingOut
          && keepVisibleWhenSittingOut
          && String(originalPlayer?.userId || '') === String(keepVisibleUserId || '')
        );
        displayedPlayers[i] = (originalPlayer?.isSittingOut && !keepVisible) ? null : originalPlayer;
        playerIndexMap[i] = originalIndex;
      } else {
        displayedPlayers[i] = null;
        playerIndexMap[i] = null;
      }
    }
  } else {
    // Si no hay usuario actual, mostrar jugadores en orden
    displayedPlayers = players.map(p => (p?.isSittingOut ? null : p));
    for (let i = 0; i < maxPlayers; i++) {
      playerIndexMap[i] = i < players.length ? i : null;
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="poker-table-wrapper"
      style={{ height: `${BASE_HEIGHT * scale}px` }}
    >
      <div
        className="poker-table-container"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          width: `${BASE_WIDTH}px`,
          height: `${BASE_HEIGHT}px`,
          left: '50%',
          marginLeft: `-${BASE_WIDTH / 2}px`,
        }}
      >
      {/* Mesa de poker */}
      <div className="poker-table">
        <img 
          src="/assets/images/mesa-poker.png" 
          alt="Mesa de Poker" 
          className="table-image"
        />
        
        {/* Cartas comunitarias encima de la mesa */}
        <div className="community-cards-on-table">
          <div className="cards-row-table">
            {/* Cartas visibles */}
            {visibleCards.map((card, index) => {
              const cardImage = getCardImage(card);
              const isRevealed = revealedCards.includes(card);
              return (
                <div 
                  key={card} 
                  className={`community-card-table ${isRevealed ? 'revealed' : ''} card-${index}`}
                  style={{ transitionDelay: `${index * 0.4}s` }}
                >
                  <div className="card-inner-table">
                    <div className="card-back-table">🂠</div>
                    <div className="card-front-table">
                      {cardImage ? (
                        <img 
                          src={cardImage} 
                          alt={card} 
                          className="card-image"
                        />
                      ) : (
                        <div className="card-placeholder-table">?</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Slots vacíos */}
            {gamePhase !== 'waiting' && Array.from({ length: emptySlots }).map((_, index) => (
              <div key={`empty-${index}`} className="community-card-table empty">
                <div className="card-back-table">🂠</div>
              </div>
            ))}

            {/* Estado de espera */}
            {gamePhase === 'waiting' && Array.from({ length: 5 }).map((_, index) => (
              <div key={`waiting-${index}`} className="community-card-table waiting">
                <div className="card-placeholder-table">?</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pot (bote central) debajo de las cartas */}
        <div className="pot-container">
          <div className="pot-amount">💰 {pot.toLocaleString()} PK</div>
          {sidePots && sidePots.length > 0 && (
            <div className="side-pots-mini">
              {sidePots.map((sidePot, index) => (
                <div key={index} className="side-pot-mini">
                  +{sidePot.amount.toLocaleString()} PK
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Indicador de fase */}
        <div className="phase-indicator">
          <div className={`phase-dot ${(gamePhase === 'pre-flop' || gamePhase === 'preflop') ? 'active' : ''}`}></div>
          <div className={`phase-dot ${gamePhase === 'flop' ? 'active' : ''}`}></div>
          <div className={`phase-dot ${gamePhase === 'turn' ? 'active' : ''}`}></div>
          <div className={`phase-dot ${gamePhase === 'river' ? 'active' : ''}`}></div>
          <div className={`phase-dot ${gamePhase === 'showdown' ? 'active' : ''}`}></div>
        </div>
      </div>

      {/* Asientos de jugadores */}
      {Array.from({ length: maxPlayers }).map((_, index) => {
        const player = displayedPlayers[index];
        const position = positions[index];
        
        // Obtener el índice original del jugador para las posiciones de dealer/blind
        const originalIndex = playerIndexMap[index] !== undefined ? playerIndexMap[index] : index;
        const isCurrentPlayer = originalIndex === currentUserIndex;

        return (
          <div 
            key={index}
            className={`player-seat ${player ? 'occupied' : 'empty'} ${originalIndex === currentPlayerIndex ? 'current-turn' : ''}`}
            style={position}
          >
            {player ? (
              <>
                {/* Cartas del jugador - ARRIBA del player-info */}
                <div className="player-cards">
                  {isCurrentPlayer && player.holeCards && player.holeCards.length > 0 ? (
                    // Mostrar cartas reveladas solo para el jugador actual
                    player.holeCards.map((card, cardIndex) => {
                      const cardImage = getCardImage(card);
                      return (
                        <div key={cardIndex} className="player-card-revealed">
                          {cardImage ? (
                            <img src={cardImage} alt={card} />
                          ) : (
                            <div className="card-placeholder">?</div>
                          )}
                        </div>
                      );
                    })
                  ) : isCurrentPlayer ? (
                    // Jugador actual sin cartas asignadas (esperando)
                    <>
                      <div className="player-card">🂠</div>
                      <div className="player-card">🂠</div>
                    </>
                  ) : (
                    // Mostrar cartas ocultas para otros jugadores
                    <>
                      <div className="player-card">🂠</div>
                      <div className="player-card">🂠</div>
                    </>
                  )}
                </div>

                {/* Info del jugador - DEBAJO de las cartas */}
                <div className="player-info">
                  {/* Position Indicators */}
                  {dealerPosition === originalIndex && (
                    <div className="position-badge dealer-badge">D</div>
                  )}
                  {smallBlindPosition === originalIndex && (
                    <div className="position-badge sb-badge">SB</div>
                  )}
                  {bigBlindPosition === originalIndex && (
                    <div className="position-badge bb-badge">BB</div>
                  )}
                  
                  <div className="player-header">
                    <div className="player-avatar">
                      {(() => {
                        // Si no hay avatar o es una ruta de imagen
                        if (!player.avatar || player.avatar.includes('.png') || player.avatar.includes('.jpg') || player.avatar.includes('default-avatar')) {
                          // Si es bot, usar emoji de robot, sino cara genérica
                          return player.username && player.username.toLowerCase().includes('bot') ? '🤖' : '👤';
                        }
                        // Usar el emoji del avatar
                        return player.avatar;
                      })()}
                    </div>
                    <div className="player-level">🎖️ Nv {player.level || 1}</div>
                  </div>
                  <div className="player-name">{player.username}</div>
                  <div className="player-balance">
                    <span className="pk-coin">🪙</span>
                    <span className="balance-amount">{(player.chips || 0).toLocaleString()} PK</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-seat">
                <div className="empty-seat-icon">+</div>
                <div className="empty-seat-text">Asiento {index + 1}</div>
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

export default PokerTable;
