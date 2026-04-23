import { useState, useEffect } from 'react';
import { gameSocket } from '../../servicios/socketJuego';
import { gameAPI } from '../../servicios/api';

const DURACION_TURNO_SEGUNDOS = 45;

const normalizarSubidaMinima = (subidaMinimaEntrante, apuestaActualEntrante) => {
  const subidaMinimaNumero = Number(subidaMinimaEntrante);
  const apuestaActualNumero = Number(apuestaActualEntrante);

  if (Number.isFinite(subidaMinimaNumero) && subidaMinimaNumero > 0) {
    return Math.floor(subidaMinimaNumero);
  }

  if (Number.isFinite(apuestaActualNumero) && apuestaActualNumero > 0) {
    return Math.floor(apuestaActualNumero);
  }

  return 1;
};

const obtenerUsuarioSesion = () => {
  const textoUsuario = sessionStorage.getItem('user');
  if (!textoUsuario) {
    return {};
  }

  return JSON.parse(textoUsuario);
};

/**
 * Custom hook for managing poker game state
 * Integrado con backend a través de WebSocket
 */
const useJuegoPoker = (usuario) => {
  // Game state
  const [idJuego, setIdJuego] = useState(null);
  const [faseJuego, setFaseJuego] = useState('waiting'); // pre-flop, flop, turn, river, showdown
  const [estadoJuego, setEstadoJuego] = useState('waiting'); // waiting, active, completed
  const [bote, setBote] = useState(0);
  const [botesLaterales, setBotesLaterales] = useState([]);
  const [cartasComunitarias, setCartasComunitarias] = useState([]);
  const [apuestaActual, setApuestaActual] = useState(0);
  const [subidaMinima, setSubidaMinima] = useState(0);
  const [posicionDealer, setPosicionDealer] = useState(0);
  const [posicionCiegaPequena, setPosicionCiegaPequena] = useState(1);
  const [posicionCiegaGrande, setPosicionCiegaGrande] = useState(2);
  const [indiceTurnoActual, setIndiceTurnoActual] = useState(null);
  const [tiempoRestanteTurno, setTiempoRestanteTurno] = useState(DURACION_TURNO_SEGUNDOS);
  const [fechaLimiteTurnoMs, setFechaLimiteTurnoMs] = useState(null);
  
  // Player-specific state
  const [cartasPropias, setCartasPropias] = useState([]);
  const [fichasJugador, setFichasJugador] = useState(0);
  const [apuestaJugador, setApuestaJugador] = useState(0);
  const [jugadorSeRetiro, setJugadorSeRetiro] = useState(false);
  const [jugadorYaActuo, setJugadorYaActuo] = useState(false);
  const [indiceJugador, setIndiceJugador] = useState(0);

  // All players state (for display)
  const [jugadores, setJugadores] = useState([]);

  // Actualizar avatar del jugador actual inmediatamente cuando cambia en el perfil
  useEffect(() => {
    if (!usuario || !usuario.id || !usuario.avatar) return;
    setJugadores((jugadoresPrevios) => jugadoresPrevios.map((jugador) => {
      if (jugador.userId === usuario.id) {
        return { ...jugador, avatar: usuario.avatar };
      }

      return jugador;
    }));
  }, [usuario?.avatar, usuario?.id]);
  
  // Winners from backend
  const [ganadores, setGanadores] = useState([]); // Para múltiples ganadores
  const [idsGanadores, setIdsGanadores] = useState([]); // IDs de ganadores
  const [resultadoUltimaMano, setResultadoUltimaMano] = useState(null);

  // Escuchar eventos del backend y reflejarlos en el estado local.
  useEffect(() => {
    gameSocket.connect();

    const manejarEstadoJuegoActualizado = (estadoJuegoSocket) => {
      if (estadoJuegoSocket) {
        setIdJuego(estadoJuegoSocket.id);
        setFaseJuego(estadoJuegoSocket.phase || 'waiting');
        setEstadoJuego(estadoJuegoSocket.status || 'waiting');
        setBote(estadoJuegoSocket.pot || 0);
        setBotesLaterales(estadoJuegoSocket.sidePots || []);
        setCartasComunitarias(estadoJuegoSocket.communityCards || []);
        const apuestaNormalizada = Number(estadoJuegoSocket.currentBet) || 0;
        setApuestaActual(apuestaNormalizada);
        setSubidaMinima(normalizarSubidaMinima(estadoJuegoSocket.minRaise, apuestaNormalizada));
        setPosicionDealer(estadoJuegoSocket.dealerIndex || 0);
        setPosicionCiegaPequena(estadoJuegoSocket.smallBlindIndex ?? 0);
        setPosicionCiegaGrande(estadoJuegoSocket.bigBlindIndex ?? 0);
        
        let indiceActual = -1;
        
        // Actualizar lista de jugadores y datos del usuario actual.
        if (estadoJuegoSocket.players && estadoJuegoSocket.players.length > 0) {
          const usuarioSesion = obtenerUsuarioSesion();
          const idUsuarioActual = usuarioSesion?.id || usuario?.id;
          const avatarUsuarioActual = usuarioSesion?.avatar || usuario?.avatar;
          const jugadoresConAvatar = estadoJuegoSocket.players.map((jugador) => {
            if (jugador.userId === idUsuarioActual && avatarUsuarioActual) {
              return { ...jugador, avatar: avatarUsuarioActual };
            }

            return jugador;
          });

          setJugadores(jugadoresConAvatar);
          indiceActual = jugadoresConAvatar.findIndex((jugador) => jugador.userId === idUsuarioActual);
          
          // Si no aparece en players, se trata como espectador.
          if (indiceActual !== -1) {
            setIndiceJugador(indiceActual);
            const jugadorActual = jugadoresConAvatar[indiceActual];
            setFichasJugador(jugadorActual.chips || 0);
            setApuestaJugador(jugadorActual.betInPhase || 0);
            setCartasPropias(jugadorActual.holeCards || []);
            setJugadorSeRetiro(jugadorActual.folded || false);

            // Al iniciar mano o al llegar tu turno, permitimos volver a actuar.
            if (estadoJuegoSocket.currentPlayerIndex === indiceActual || !jugadorActual.lastAction) {
              setJugadorYaActuo(false);
            }
          } else {
            setIndiceJugador(-1);
            setFichasJugador(0);
            setApuestaJugador(0);
            setCartasPropias([]);
            setJugadorSeRetiro(false);
            setJugadorYaActuo(false);
          }
        }
        
        if (estadoJuegoSocket.currentPlayerIndex !== undefined) {
          setIndiceTurnoActual(estadoJuegoSocket.currentPlayerIndex);
        }

        // Guardar múltiples ganadores si están disponibles
        if (estadoJuegoSocket.winners) {
          setGanadores(estadoJuegoSocket.winners);
        }
        if (estadoJuegoSocket.winnerIds) {
          setIdsGanadores(estadoJuegoSocket.winnerIds);
        }
      }
    };

    // Cambio de fase
    const manejarCambioFase = (datosFase) => {
      if (datosFase.phase) {
        setFaseJuego(datosFase.phase);
        setCartasComunitarias(datosFase.communityCards || []);
      }
    };

    // Fin del juego / Showdown
    const manejarShowdown = (datosShowdown) => {
      setFaseJuego('showdown');
      if (datosShowdown.winners) {
        setGanadores(datosShowdown.winners);
      }
      if (datosShowdown.winnerIds) {
        setIdsGanadores(datosShowdown.winnerIds);
      }
      if (datosShowdown.pot) {
        setBote(datosShowdown.pot);
      }
    };

    const manejarFinDeMano = (handData) => {
      setResultadoUltimaMano(handData);
      setJugadorYaActuo(false);
    };

    const manejarLimiteDeTurno = (datosLimiteTurno) => {
      if (!datosLimiteTurno || !datosLimiteTurno.deadlineMs) return;
      setFechaLimiteTurnoMs(datosLimiteTurno.deadlineMs);
      const restante = Math.max(0, Math.ceil((datosLimiteTurno.deadlineMs - Date.now()) / 1000));
      setTiempoRestanteTurno(restante);
    };

    gameSocket.on('gameStateUpdated', manejarEstadoJuegoActualizado);
    gameSocket.on('phaseChanged', manejarCambioFase);
    gameSocket.on('showdown', manejarShowdown);
    gameSocket.on('handOver', manejarFinDeMano);
    gameSocket.on('turnDeadline', manejarLimiteDeTurno);

    return () => {
      gameSocket.off('gameStateUpdated', manejarEstadoJuegoActualizado);
      gameSocket.off('phaseChanged', manejarCambioFase);
      gameSocket.off('showdown', manejarShowdown);
      gameSocket.off('handOver', manejarFinDeMano);
      gameSocket.off('turnDeadline', manejarLimiteDeTurno);
    };
  }, [usuario?.id]);

  // Si el backend no manda deadline, usamos un timer local de respaldo.
  useEffect(() => {
    if (indiceTurnoActual === null || indiceTurnoActual === undefined) return;
    setFechaLimiteTurnoMs(Date.now() + DURACION_TURNO_SEGUNDOS * 1000);
  }, [indiceTurnoActual]);

  // Mostrar cuenta regresiva de turno en segundos.
  useEffect(() => {
    if (!fechaLimiteTurnoMs) return;

    const actualizarContador = () => {
      const restante = Math.max(0, Math.ceil((fechaLimiteTurnoMs - Date.now()) / 1000));
      setTiempoRestanteTurno(restante);
    };

    actualizarContador();
    const idIntervalo = setInterval(actualizarContador, 1000);
    return () => clearInterval(idIntervalo);
  }, [fechaLimiteTurnoMs]);

  // Resetear acciones cuando cambia el turno al jugador actual
  useEffect(() => {
    if (indiceTurnoActual === indiceJugador) {
      setJugadorYaActuo(false);
    }
  }, [indiceTurnoActual, indiceJugador]);

  // Enviar acciones del jugador al backend (fold, call, raise...).
  const enviarAccion = async (accion, monto = 0) => {
    const usuarioSesion = obtenerUsuarioSesion();
    const idUsuarioSesion = usuarioSesion?.id || usuarioSesion?.userId;

    if (!idJuego || !idUsuarioSesion) {
      console.error('❌ No se puede enviar acción: faltan gameId o userId');
      return { success: false, error: 'Falta contexto de juego' };
    }

    return gameAPI.playerAction(idJuego, accion, monto).then(
      (respuestaAccion) => {
        const datos = respuestaAccion.data;

        if (datos && datos.success) {
          if (datos && datos.gameState) {
            const siguiente = datos.gameState;
            setIdJuego(siguiente.id || idJuego);
            setFaseJuego(siguiente.phase || 'waiting');
            setEstadoJuego(siguiente.status || 'waiting');
            setBote(siguiente.pot || 0);
            setBotesLaterales(siguiente.sidePots || []);
            setCartasComunitarias(siguiente.communityCards || []);
            const apuestaNormalizada = Number(siguiente.currentBet) || 0;
            setApuestaActual(apuestaNormalizada);
            setSubidaMinima(normalizarSubidaMinima(siguiente.minRaise, apuestaNormalizada));
            setPosicionDealer(siguiente.dealerIndex || 0);
            setPosicionCiegaPequena(siguiente.smallBlindIndex ?? 0);
            setPosicionCiegaGrande(siguiente.bigBlindIndex ?? 0);
            setIndiceTurnoActual(siguiente.currentPlayerIndex ?? null);

            if (Array.isArray(siguiente.players)) {
              setJugadores(siguiente.players);
              const indiceYo = siguiente.players.findIndex((jugador) => jugador.userId === idUsuarioSesion);
              if (indiceYo !== -1) {
                setIndiceJugador(indiceYo);
                const datosJugadorActual = siguiente.players[indiceYo];
                setFichasJugador(datosJugadorActual.chips || 0);
                setApuestaJugador(datosJugadorActual.betInPhase || 0);
                setCartasPropias(datosJugadorActual.holeCards || []);
                setJugadorSeRetiro(datosJugadorActual.folded || false);
              }
            }
          }

        if (datos.handOver) {
          setResultadoUltimaMano({
            winnerId: datos.winnerId || datos.winner?.userId || datos.winner?.id,
            winnerName: datos.winnerName || datos.winner?.username || 'Desconocido',
            winnerIds: datos.winnerIds || [],
            winners: datos.winners || [],
            potWon: datos.potWon ?? 0
          });
          setJugadorYaActuo(false);
        }
      } else {
        console.error('❌ Error en acción:', datos?.error || datos);
      }

        return datos;
      },
      (errorDeAccion) => {
        console.error('❌ Error enviando acción:', errorDeAccion?.response?.data || errorDeAccion.message);
        return {
          success: false,
          error: errorDeAccion?.response?.data?.error || errorDeAccion?.response?.data?.message || errorDeAccion.message
        };
      }
    );
  };

  const handleFold = () => {
    if (idJuego) {
      enviarAccion('fold');
      setJugadorSeRetiro(true);
      setJugadorYaActuo(true);
    }
  };

  const handleCheck = () => {
    if (idJuego) {
      enviarAccion('check');
      setJugadorYaActuo(true);
    }
  };

  const handleCall = () => {
    if (idJuego) {
      const montoIgualar = apuestaActual - apuestaJugador;
      enviarAccion('call', montoIgualar);
      setJugadorYaActuo(true);
    }
  };

  const handleRaise = (montoSubida) => {
    if (idJuego) {
      const apuestaTotal = apuestaActual + montoSubida;
      enviarAccion('raise', apuestaTotal);
      setJugadorYaActuo(true);
    }
  };

  const handleAllIn = () => {
    if (idJuego) {
      const montoAllIn = fichasJugador;
      enviarAccion('all-in', montoAllIn);
      setJugadorYaActuo(true);
    }
  };

  // El backend decide cuándo avanza la fase.
  const advanceGamePhase = () => {
    // Backend maneja el avance de fases
    console.log('Esperando al backend para avanzar fase...');
  };

  // Iniciar partida local solo configura índice; el estado real llega del backend.
  const startNewGame = (initialPlayers, playerIdx, smallBlind, bigBlind) => {
    setIndiceJugador(playerIdx);
    console.log('Esperando al backend para iniciar el juego...');
  };

  const updateCommunityCards = (cards) => {
    setCartasComunitarias(cards);
  };

  const updatePlayerChips = (chips) => {
    setFichasJugador(chips);
  };

  const updateCurrentTurn = (playerIndex) => {
    setIndiceTurnoActual(playerIndex);
    setTiempoRestanteTurno(DURACION_TURNO_SEGUNDOS);
  };

  // Reglas simples para habilitar/deshabilitar botones de acción.
  const estadoJugadorActual = jugadores[indiceJugador];
  const comprometido = parseInt(estadoJugadorActual?.betInPhase ?? apuestaJugador) || 0;
  const apuestaActualNumero = parseInt(apuestaActual) || 0;
  let subidaMinimaBase = parseInt(subidaMinima) || 0;
  if (subidaMinimaBase <= 0 && apuestaActualNumero > 0) {
    subidaMinimaBase = apuestaActualNumero;
  }
  if (subidaMinimaBase <= 0) {
    subidaMinimaBase = 1;
  }
  const subidaMinimaEfectiva = Math.max(1, subidaMinimaBase);
  const esMiTurno = indiceTurnoActual === indiceJugador;
  const esPreflop = faseJuego === 'preflop' || faseJuego === 'pre-flop';
  const esCiegaGrande = indiceJugador === posicionCiegaGrande;
  let canCheck = esMiTurno && comprometido >= apuestaActualNumero && !jugadorSeRetiro;
  const canCall = esMiTurno && apuestaActualNumero > comprometido && !jugadorSeRetiro;
  const canRaise = esMiTurno && fichasJugador > (apuestaActualNumero - comprometido + subidaMinimaEfectiva) && !jugadorSeRetiro;
  const canFold = esMiTurno && !jugadorSeRetiro;
  const canAllIn = esMiTurno && fichasJugador > 0 && !jugadorSeRetiro;

  // Caso especial de preflop: BB puede pasar si ya igualó.
  if (esMiTurno && esPreflop && esCiegaGrande && comprometido >= apuestaActualNumero && !jugadorSeRetiro) {
    canCheck = true;
  }

  return {
    // Game state
    gameId: idJuego,
    gamePhase: faseJuego,
    gameStatus: estadoJuego,
    pot: bote,
    sidePots: botesLaterales,
    communityCards: cartasComunitarias,
    currentBet: apuestaActual,
    minRaise: subidaMinima,
    dealerPosition: posicionDealer,
    smallBlindPosition: posicionCiegaPequena,
    bigBlindPosition: posicionCiegaGrande,
    currentPlayerTurn: indiceTurnoActual,
    turnTimeRemaining: tiempoRestanteTurno,
    playerHoleCards: cartasPropias,
    playerChips: fichasJugador,
    playerBet: apuestaJugador,
    playerHasFolded: jugadorSeRetiro,
    playerHasActed: jugadorYaActuo,
    players: jugadores,
    playerIndex: indiceJugador,
    
    // Winners
    winners: ganadores,
    winnerIds: idsGanadores,
    lastHandResult: resultadoUltimaMano,
    
    // Action checks
    canCheck,
    canCall,
    canRaise,
    canFold,
    canAllIn,
    
    // Actions
    handleFold,
    handleCheck,
    handleCall,
    handleRaise,
    handleAllIn,
    
    // Game control (for backend integration)
    advanceGamePhase,
    startNewGame,
    updateCommunityCards,
    updatePlayerChips,
    updateCurrentTurn,
    setGamePhase: setFaseJuego,
    setPot: setBote,
    setSidePots: setBotesLaterales,
    setCurrentBet: setApuestaActual,
    setMinRaise: setSubidaMinima,
    setDealerPosition: setPosicionDealer,
    setSmallBlindPosition: setPosicionCiegaPequena,
    setBigBlindPosition: setPosicionCiegaGrande,
    setPlayerHoleCards: setCartasPropias,
    setPlayers: setJugadores,
    setGameId: setIdJuego,
  };
};

export default useJuegoPoker;
