import React, { useState, useEffect, useRef } from 'react';
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
  // Estado para rastrear qué cartas ya fueron reveladas
  const [cartasReveladas, setCartasReveladas] = useState([]);

  // Escala responsiva: mide el wrapper y escala el contenedor proporcionalmente
  const referenciaWrapper = useRef(null);
  const [escala, setEscala] = useState(1);

  useEffect(() => {
    const actualizarEscala = () => {
      if (!referenciaWrapper.current) return;
      const anchoDisponible = referenciaWrapper.current.offsetWidth;
      const nuevaEscala = Math.min(anchoDisponible / BASE_WIDTH, 1);
      setEscala(nuevaEscala);
    };

    actualizarEscala();
    const observador = new ResizeObserver(actualizarEscala);
    if (referenciaWrapper.current) observador.observe(referenciaWrapper.current);
    return () => observador.disconnect();
  }, []);

  // Preferimos currentUserIndex cuando llega del padre; si no, lo buscamos por id.
  const indiceUsuarioActualCalculado = currentUserIndex !== null && currentUserIndex !== undefined
    ? currentUserIndex
    : players.findIndex((jugador) => {
      const idJugador = jugador?.userId ?? jugador?.id ?? jugador?.username;
      return String(idJugador) === String(currentPlayerId);
    });
  
  // Guardar datos de la ronda anterior para animar solo cuando hay cambios reales.
  const referenciaFaseAnterior = useRef(gamePhase);
  const referenciaCantidadCartasAnterior = useRef(communityCards.length);
  
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

  const obtenerAvatarVisible = (jugador) => {
    if (!jugador || !jugador.avatar) return '👤';

    if (
      jugador.avatar.includes('.png') ||
      jugador.avatar.includes('.jpg') ||
      jugador.avatar.includes('default-avatar')
    ) {
      if (jugador.username && jugador.username.toLowerCase().includes('bot')) {
        return '🤖';
      }
      return '👤';
    }

    return jugador.avatar;
  };

  const obtenerClasePuntoFase = (fasePunto) => {
    let clase = 'phase-dot';
    if (fasePunto === 'preflop') {
      if (gamePhase === 'pre-flop' || gamePhase === 'preflop') {
        clase = 'phase-dot active';
      }
      return clase;
    }

    if (gamePhase === fasePunto) {
      clase = 'phase-dot active';
    }

    return clase;
  };

  const renderizarCartasDelJugador = (jugador, esJugadorActual) => {
    if (esJugadorActual && jugador.holeCards && jugador.holeCards.length > 0) {
      return jugador.holeCards.map((carta, indiceCarta) => {
        const imagenCarta = obtenerImagenCarta(carta);

        let contenidoCarta = <div className="card-placeholder">?</div>;
        if (imagenCarta) {
          contenidoCarta = <img src={imagenCarta} alt={carta} />;
        }

        return (
          <div key={indiceCarta} className="player-card-revealed">
            {contenidoCarta}
          </div>
        );
      });
    }

    return (
      <>
        <div className="player-card">🂠</div>
        <div className="player-card">🂠</div>
      </>
    );
  };

  const renderizarContenidoAsiento = (jugador, indiceOriginal, esJugadorActual, indiceAsiento) => {
    if (!jugador) {
      return (
        <div className="empty-seat">
          <div className="empty-seat-icon">+</div>
          <div className="empty-seat-text">Asiento {indiceAsiento + 1}</div>
        </div>
      );
    }

    let badgeDealer = null;
    if (dealerPosition === indiceOriginal) {
      badgeDealer = <div className="position-badge dealer-badge">D</div>;
    }

    let badgeSmallBlind = null;
    if (smallBlindPosition === indiceOriginal) {
      badgeSmallBlind = <div className="position-badge sb-badge">SB</div>;
    }

    let badgeBigBlind = null;
    if (bigBlindPosition === indiceOriginal) {
      badgeBigBlind = <div className="position-badge bb-badge">BB</div>;
    }

    return (
      <>
        <div className="player-cards">
          {renderizarCartasDelJugador(jugador, esJugadorActual)}
        </div>

        <div className="player-info">
          {badgeDealer}
          {badgeSmallBlind}
          {badgeBigBlind}

          <div className="player-header">
            <div className="player-avatar">
              {obtenerAvatarVisible(jugador)}
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
    );
  };

  // Determinar qué cartas mostrar según fase del juego
  const obtenerCartasVisibles = () => {
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

  const cartasVisibles = obtenerCartasVisibles();
  const espaciosVacios = 5 - cartasVisibles.length;

  // Efecto para revelar cartas nuevas con delay
  useEffect(() => {
    const cambioFase = referenciaFaseAnterior.current !== gamePhase;
    const cambioCartas = referenciaCantidadCartasAnterior.current !== communityCards.length;
    
    // Resetear cuando cambia la fase a waiting (nueva mano)
    if (gamePhase === 'waiting') {
      setCartasReveladas([]);
      referenciaFaseAnterior.current = gamePhase;
      referenciaCantidadCartasAnterior.current = communityCards.length;
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
    referenciaFaseAnterior.current = gamePhase;
    referenciaCantidadCartasAnterior.current = communityCards.length;
  }, [gamePhase, communityCards.length, cartasReveladas]);
  
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

  const posiciones = posicionesAsientos[maxPlayers] || posicionesAsientos[6];

  // Reordenar jugadores para que el usuario actual quede en el asiento inferior.
  let indiceCentroInferior = maxPlayers - 1;
  if (maxPlayers === 6) {
    indiceCentroInferior = 3;
  } else if (maxPlayers === 4) {
    indiceCentroInferior = 2;
  }
  const jugadoresMostrados = Array.from({ length: maxPlayers }, () => null);
  const mapaIndicesJugadores = {};

  if (indiceUsuarioActualCalculado !== null && indiceUsuarioActualCalculado !== undefined && players.length > 0 && indiceUsuarioActualCalculado >= 0) {
    // Rotación circular: mueve asientos para que tu jugador quede siempre abajo.
    const desplazamiento = (indiceCentroInferior - indiceUsuarioActualCalculado + players.length) % players.length;

    for (let i = 0; i < maxPlayers; i++) {
      if (i < players.length) {
        const indiceOriginal = (i - desplazamiento + players.length) % players.length;
        const jugadorOriginal = players[indiceOriginal];
        if (jugadorOriginal && jugadorOriginal.isSittingOut) {
          jugadoresMostrados[i] = null;
        } else {
          jugadoresMostrados[i] = jugadorOriginal;
        }
        mapaIndicesJugadores[i] = indiceOriginal;
      } else {
        mapaIndicesJugadores[i] = null;
      }
    }
  } else {
    // Si no sabemos quién es el usuario actual, mostramos jugadores en orden natural.
    for (let i = 0; i < maxPlayers; i++) {
      if (i < players.length) {
        if (players[i] && players[i].isSittingOut) {
          jugadoresMostrados[i] = null;
        } else {
          jugadoresMostrados[i] = players[i];
        }
        mapaIndicesJugadores[i] = i;
      } else {
        mapaIndicesJugadores[i] = null;
      }
    }
  }

  return (
    <div
      ref={referenciaWrapper}
      className="poker-table-wrapper"
      style={{
        height: `${BASE_HEIGHT * escala}px`,
        '--table-color': tableColor
      }}
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

              let claseCartaComunitaria = `community-card-table card-${indice}`;
              if (estaRevelada) {
                claseCartaComunitaria = `community-card-table revealed card-${indice}`;
              }

              let contenidoFrenteCarta = <div className="card-placeholder-table">?</div>;
              if (imagenCarta) {
                contenidoFrenteCarta = (
                  <img
                    src={imagenCarta}
                    alt={carta}
                    className="card-image"
                  />
                );
              }

              return (
                <div 
                  key={carta}
                  className={claseCartaComunitaria}
                  style={{ transitionDelay: `${indice * 0.4}s` }}
                >
                  <div className="card-inner-table">
                    <div className="card-back-table">🂠</div>
                    <div className="card-front-table">
                      {contenidoFrenteCarta}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Slots vacíos */}
            {gamePhase !== 'waiting' && Array.from({ length: espaciosVacios }).map((_, indice) => (
              <div key={`empty-${indice}`} className="community-card-table empty">
                <div className="card-back-table">🂠</div>
              </div>
            ))}

            {/* Estado de espera */}
            {gamePhase === 'waiting' && Array.from({ length: 5 }).map((_, indice) => (
              <div key={`waiting-${indice}`} className="community-card-table waiting">
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
              {sidePots.map((boteLateral, indice) => (
                <div key={indice} className="side-pot-mini">
                  +{boteLateral.amount.toLocaleString()} PK
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Indicador de fase */}
        <div className="phase-indicator">
          <div className={obtenerClasePuntoFase('preflop')}></div>
          <div className={obtenerClasePuntoFase('flop')}></div>
          <div className={obtenerClasePuntoFase('turn')}></div>
          <div className={obtenerClasePuntoFase('river')}></div>
          <div className={obtenerClasePuntoFase('showdown')}></div>
        </div>
      </div>

      {/* Asientos de jugadores */}
      {Array.from({ length: maxPlayers }).map((_, indiceAsiento) => {
        const jugador = jugadoresMostrados[indiceAsiento];
        const posicion = posiciones[indiceAsiento];
        
        // Obtener el índice original del jugador para las posiciones de dealer/blind
        let indiceOriginal = indiceAsiento;
        if (mapaIndicesJugadores[indiceAsiento] !== undefined) {
          indiceOriginal = mapaIndicesJugadores[indiceAsiento];
        }

        const esJugadorActual = indiceOriginal === indiceUsuarioActualCalculado;

        let claseAsiento = 'player-seat empty';
        if (jugador) {
          claseAsiento = 'player-seat occupied';
        }
        if (indiceOriginal === currentPlayerIndex) {
          claseAsiento = `${claseAsiento} current-turn`;
        }

        return (
          <div 
            key={indiceAsiento}
            className={claseAsiento}
            style={posicion}
          >
            {renderizarContenidoAsiento(jugador, indiceOriginal, esJugadorActual, indiceAsiento)}
          </div>
        );
      })}
      </div>
    </div>
  );
}

export default PokerTable;
