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
  currentPlayerIndex = null
}) {
  // Alias internos para mantener consistencia con el resto del componente.
  const maxJugadores = maxPlayers;
  const jugadores = players;
  const faseJuego = gamePhase;
  const cartasComunitarias = communityCards;
  const bote = pot;
  const botesLaterales = sidePots;
  const posicionDealer = dealerPosition;
  const posicionCiegaPequena = smallBlindPosition;
  const posicionCiegaGrande = bigBlindPosition;
  const indiceUsuarioActual = currentUserIndex;
  const indiceTurnoActual = currentPlayerIndex;

  // Estado para rastrear qué cartas ya fueron reveladas
  const [cartasReveladas, setCartasReveladas] = useState([]);

  // Escala responsiva: mide el wrapper y escala el contenedor proporcionalmente
  const referenciaWrapper = useRef(null);
  const [escala, setEscala] = useState(1);

  const actualizarEscala = useCallback(() => {
    if (!referenciaWrapper.current) return;
    const anchoDisponible = referenciaWrapper.current.offsetWidth;
    const nuevaEscala = Math.min(anchoDisponible / BASE_WIDTH, 1);
    setEscala(nuevaEscala);
  }, []);

  useEffect(() => {
    actualizarEscala();
    const observador = new ResizeObserver(actualizarEscala);
    if (referenciaWrapper.current) observador.observe(referenciaWrapper.current);
    return () => observador.disconnect();
  }, [actualizarEscala]);
  
  // FIX: useRef para evitar re-renders innecesarios de animaciones
  const referenciaFaseAnterior = useRef(faseJuego);
  const referenciaCantidadCartasAnterior = useRef(cartasComunitarias.length);
  
  // Obtener ruta de imagen de carta (e.g., "AS" → "/assets/images/AS.png")
  const obtenerImagenCarta = (carta) => {
    if (!carta || carta.length < 2) return null;
    
    // Normalizar formato: "10H" debe quedar como "10H", "Ah" como "AH"
    let rango = carta.slice(0, -1).toUpperCase();
    let palo = carta.slice(-1).toUpperCase();

    
    // Asegurar que rank esté en el formato correcto
    const rangosValidos = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const palosValidos = ['C', 'D', 'H', 'S'];
    
    if (!rangosValidos.includes(rango) || !palosValidos.includes(palo)) {
      console.warn(`Carta invalida: ${carta}`);
      return null;
    }
    
    return `/assets/images/${rango}${palo}.png`;
  };

  // Determinar qué cartas mostrar según fase del juego
  const obtenerCartasVisibles = () => {
    switch (faseJuego) {
      case 'pre-flop':
      case 'preflop':
        return [];
      case 'flop':
        return cartasComunitarias.slice(0, 3);
      case 'turn':
        return cartasComunitarias.slice(0, 4);
      case 'river':
      case 'showdown':
        return cartasComunitarias.slice(0, 5);
      default:
        return [];
    }
  };

  const cartasVisibles = obtenerCartasVisibles();
  const espaciosVacios = 5 - cartasVisibles.length;

  // Efecto para revelar cartas nuevas con delay
  useEffect(() => {
    // FIX: Solo ejecutar si realmente cambió la fase o el número de cartas
    const cambioFase = referenciaFaseAnterior.current !== faseJuego;
    const cambioCartas = referenciaCantidadCartasAnterior.current !== cartasComunitarias.length;
    
    // Resetear cuando cambia la fase a waiting (nueva mano)
    if (faseJuego === 'waiting') {
      setCartasReveladas([]);
      referenciaFaseAnterior.current = faseJuego;
      referenciaCantidadCartasAnterior.current = cartasComunitarias.length;
      return;
    }

    // Solo animar si hubo cambio real
    if (!cambioFase && !cambioCartas) {
      return;
    }

    // Agregar nuevas cartas con un pequeño delay para activar la transición
    const cartasVisiblesActuales = obtenerCartasVisibles();
    cartasVisiblesActuales.forEach((carta, indice) => {
      if (!cartasReveladas.includes(carta)) {
        setTimeout(() => {
          setCartasReveladas((previas) => {
            if (!previas.includes(carta)) {
              return [...previas, carta];
            }
            return previas;
          });
        }, indice * 200); // Delay escalonado para animacion
      }
    });
    
    // Actualizar referencias
    referenciaFaseAnterior.current = faseJuego;
    referenciaCantidadCartasAnterior.current = cartasComunitarias.length;
  }, [faseJuego, cartasComunitarias.length, cartasReveladas]);
  
  // Posiciones de los asientos alrededor de la mesa según el número máximo
  const posicionesAsientos = {
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

  const posiciones = posicionesAsientos[maxJugadores] || posicionesAsientos[6];

  // Reordenar jugadores para que el usuario actual siempre esté en la posición inferior (center-bottom)
  const indiceCentroInferior = maxJugadores === 6 ? 3 : (maxJugadores === 4 ? 2 : maxJugadores - 1);
  let jugadoresMostrados = [];
  let mapaIndicesJugadores = {};

  // Construir array de posiciones con rotación para poner al usuario en la posición inferior
  if (indiceUsuarioActual !== null && indiceUsuarioActual !== undefined && jugadores.length > 0 && indiceUsuarioActual >= 0) {
    // Calcular offset: cuántas posiciones rotar hacia la derecha para que el usuario esté en centerBottomIndex
    const desplazamiento = (indiceCentroInferior - indiceUsuarioActual + jugadores.length) % jugadores.length;
    
    // Llenar el array de posiciones con jugadores rotados
    for (let i = 0; i < maxJugadores; i++) {
      if (i < jugadores.length) {
        // Calcular el índice original del jugador que debería estar en esta posición
        const indiceOriginal = (i - desplazamiento + jugadores.length) % jugadores.length;
        const jugadorOriginal = jugadores[indiceOriginal];
        jugadoresMostrados[i] = jugadorOriginal?.isSittingOut ? null : jugadorOriginal;
        mapaIndicesJugadores[i] = indiceOriginal;
      } else {
        jugadoresMostrados[i] = null;
        mapaIndicesJugadores[i] = null;
      }
    }
  } else {
    // Si no hay usuario actual, mostrar jugadores en orden
    jugadoresMostrados = jugadores.map((jugador) => (jugador?.isSittingOut ? null : jugador));
    for (let i = 0; i < maxJugadores; i++) {
      mapaIndicesJugadores[i] = i < jugadores.length ? i : null;
    }
  }

  return (
    <div
      ref={referenciaWrapper}
      className="poker-table-wrapper"
      style={{ height: `${BASE_HEIGHT * escala}px` }}
    >
      <div
        className="poker-table-container"
        style={{
          transform: `scale(${escala})`,
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
            {cartasVisibles.map((carta, indice) => {
              const imagenCarta = obtenerImagenCarta(carta);
              const estaRevelada = cartasReveladas.includes(carta);
              return (
                <div 
                  key={carta}
                  className={`community-card-table ${estaRevelada ? 'revealed' : ''} card-${indice}`}
                  style={{ transitionDelay: `${indice * 0.4}s` }}
                >
                  <div className="card-inner-table">
                    <div className="card-back-table">🂠</div>
                    <div className="card-front-table">
                      {imagenCarta ? (
                        <img 
                          src={imagenCarta}
                          alt={carta}
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
            {faseJuego !== 'waiting' && Array.from({ length: espaciosVacios }).map((_, indice) => (
              <div key={`empty-${indice}`} className="community-card-table empty">
                <div className="card-back-table">🂠</div>
              </div>
            ))}

            {/* Estado de espera */}
            {faseJuego === 'waiting' && Array.from({ length: 5 }).map((_, indice) => (
              <div key={`waiting-${indice}`} className="community-card-table waiting">
                <div className="card-placeholder-table">?</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pot (bote central) debajo de las cartas */}
        <div className="pot-container">
          <div className="pot-amount">💰 {bote.toLocaleString()} PK</div>
          {botesLaterales && botesLaterales.length > 0 && (
            <div className="side-pots-mini">
              {botesLaterales.map((boteLateral, indice) => (
                <div key={indice} className="side-pot-mini">
                  +{boteLateral.amount.toLocaleString()} PK
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Indicador de fase */}
        <div className="phase-indicator">
          <div className={`phase-dot ${(faseJuego === 'pre-flop' || faseJuego === 'preflop') ? 'active' : ''}`}></div>
          <div className={`phase-dot ${faseJuego === 'flop' ? 'active' : ''}`}></div>
          <div className={`phase-dot ${faseJuego === 'turn' ? 'active' : ''}`}></div>
          <div className={`phase-dot ${faseJuego === 'river' ? 'active' : ''}`}></div>
          <div className={`phase-dot ${faseJuego === 'showdown' ? 'active' : ''}`}></div>
        </div>
      </div>

      {/* Asientos de jugadores */}
      {Array.from({ length: maxJugadores }).map((_, indiceAsiento) => {
        const jugador = jugadoresMostrados[indiceAsiento];
        const posicion = posiciones[indiceAsiento];
        
        // Obtener el índice original del jugador para las posiciones de dealer/blind
        const indiceOriginal = mapaIndicesJugadores[indiceAsiento] !== undefined ? mapaIndicesJugadores[indiceAsiento] : indiceAsiento;
        const esJugadorActual = indiceOriginal === indiceUsuarioActual;

        return (
          <div 
            key={indiceAsiento}
            className={`player-seat ${jugador ? 'occupied' : 'empty'} ${indiceOriginal === indiceTurnoActual ? 'current-turn' : ''}`}
            style={posicion}
          >
            {jugador ? (
              <>
                {/* Cartas del jugador - ARRIBA del player-info */}
                <div className="player-cards">
                  {esJugadorActual && jugador.holeCards && jugador.holeCards.length > 0 ? (
                    // Mostrar cartas reveladas solo para el jugador actual
                    jugador.holeCards.map((carta, indiceCarta) => {
                      const imagenCarta = obtenerImagenCarta(carta);
                      return (
                        <div key={indiceCarta} className="player-card-revealed">
                          {imagenCarta ? (
                            <img src={imagenCarta} alt={carta} />
                          ) : (
                            <div className="card-placeholder">?</div>
                          )}
                        </div>
                      );
                    })
                  ) : esJugadorActual ? (
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
                  {posicionDealer === indiceOriginal && (
                    <div className="position-badge dealer-badge">D</div>
                  )}
                  {posicionCiegaPequena === indiceOriginal && (
                    <div className="position-badge sb-badge">SB</div>
                  )}
                  {posicionCiegaGrande === indiceOriginal && (
                    <div className="position-badge bb-badge">BB</div>
                  )}
                  
                  <div className="player-header">
                    <div className="player-avatar">
                      {(() => {
                        // Si no hay avatar o es una ruta de imagen
                        if (!jugador.avatar || jugador.avatar.includes('.png') || jugador.avatar.includes('.jpg') || jugador.avatar.includes('default-avatar')) {
                          // Si es bot, usar emoji de robot, sino cara genérica
                          return jugador.username && jugador.username.toLowerCase().includes('bot') ? '🤖' : '👤';
                        }
                        // Usar el emoji del avatar
                        return jugador.avatar;
                      })()}
                    </div>
                    <div className="player-level">🎖️ Nv {jugador.level || 1}</div>
                  </div>
                  <div className="player-name">{jugador.username}</div>
                  <div className="player-balance">
                    <span className="pk-coin">🪙</span>
                    <span className="balance-amount">{(jugador.chips || 0).toLocaleString()} PK</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-seat">
                <div className="empty-seat-icon">+</div>
                <div className="empty-seat-text">Asiento {indiceAsiento + 1}</div>
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
