import { useState, useCallback, useEffect } from 'react';
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
    if (!usuario?.id || !usuario?.avatar) return;
    setJugadores((previo) => previo.map((jugador) =>
      jugador.userId === usuario.id ? { ...jugador, avatar: usuario.avatar } : jugador
    ));
  }, [usuario?.avatar, usuario?.id]);
  
  // Winners from backend
  const [ganadores, setGanadores] = useState([]); // Para múltiples ganadores
  const [idsGanadores, setIdsGanadores] = useState([]); // IDs de ganadores
  const [resultadoUltimaMano, setResultadoUltimaMano] = useState(null);

  // Configurar listeners de WebSocket al montar
  useEffect(() => {
    gameSocket.connect();

    // Actualizar estado del juego desde backend
    gameSocket.on('gameStateUpdated', (estadoJuegoSocket) => {
      console.log('🎮 gameStateUpdated recibido:', estadoJuegoSocket);
      
      if (estadoJuegoSocket) {
        setIdJuego(estadoJuegoSocket.id);
        // FIX: Separar phase y status correctamente
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
        
        // Actualizar estado del jugador actual
        if (estadoJuegoSocket.players && estadoJuegoSocket.players.length > 0) {
          console.log('👥 Actualizando jugadores:', estadoJuegoSocket.players.length, estadoJuegoSocket.players);

          // Usar avatar local (sessionStorage) para el jugador actual ya que el backend puede tener uno desactualizado
          const usuarioSesion = JSON.parse(sessionStorage.getItem('user') || '{}');
          const jugadoresConAvatar = estadoJuegoSocket.players.map((jugador) =>
            jugador.userId === usuarioSesion.id && usuarioSesion.avatar
              ? { ...jugador, avatar: usuarioSesion.avatar }
              : jugador
          );
          setJugadores(jugadoresConAvatar);
          indiceActual = estadoJuegoSocket.players.findIndex((jugador) => jugador.userId === usuarioSesion.id);
          
          // FIX: Manejar caso cuando currentIdx === -1 (espectador)
          if (indiceActual !== -1) {
            setIndiceJugador(indiceActual);
            const jugadorActual = estadoJuegoSocket.players[indiceActual];
            setFichasJugador(jugadorActual.chips || 0);
            setApuestaJugador(jugadorActual.betInPhase || 0);
            setCartasPropias(jugadorActual.holeCards || []);
            setJugadorSeRetiro(jugadorActual.folded || false);
            // Resetear acciones cuando es tu turno o al empezar mano
            if (estadoJuegoSocket.currentPlayerIndex === indiceActual || !jugadorActual.lastAction) {
              setJugadorYaActuo(false);
            }
          } else {
            // Usuario es espectador, establecer valores por defecto
            setIndiceJugador(-1);
            setFichasJugador(0);
            setApuestaJugador(0);
            setCartasPropias([]);
            setJugadorSeRetiro(false);
            setJugadorYaActuo(false);
          }
        }
        
        // Actualizar turno actual
        if (estadoJuegoSocket.currentPlayerIndex !== undefined) {
          console.log('🎯 Turno actual:', estadoJuegoSocket.currentPlayerIndex);
          setIndiceTurnoActual(estadoJuegoSocket.currentPlayerIndex);
        }
        
        console.log('🔍 Debug - playerIndex:', indiceActual, 'currentPlayerTurn:', estadoJuegoSocket.currentPlayerIndex);
        console.log('🔍 Es mi turno?:', indiceActual === estadoJuegoSocket.currentPlayerIndex);
        
        // Guardar múltiples ganadores si están disponibles
        if (estadoJuegoSocket.winners) {
          setGanadores(estadoJuegoSocket.winners);
        }
        if (estadoJuegoSocket.winnerIds) {
          setIdsGanadores(estadoJuegoSocket.winnerIds);
        }
      }
    });

    // Cambio de fase
    gameSocket.on('phaseChanged', (datosFase) => {
      if (datosFase.phase) {
        setFaseJuego(datosFase.phase);
        setCartasComunitarias(datosFase.communityCards || []);
      }
    });

    // Fin del juego / Showdown
    gameSocket.on('showdown', (datosShowdown) => {
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
    });

    gameSocket.on('handOver', (handData) => {
      setLastHandResult(handData);
      setPlayerHasActed(false);
    });

    gameSocket.on('turnDeadline', (datosLimiteTurno) => {
      if (!datosLimiteTurno?.deadlineMs) return;
      setFechaLimiteTurnoMs(datosLimiteTurno.deadlineMs);
      const restante = Math.max(0, Math.ceil((datosLimiteTurno.deadlineMs - Date.now()) / 1000));
      setTiempoRestanteTurno(restante);
    });

    return () => {
      // FIX: Pasar las mismas referencias de funciones para limpiar correctamente
      // No hay referencias específicas guardadas, así que usamos off sin callback
      // para remover todos los listeners de ese evento
      gameSocket.off('gameStateUpdated');
      gameSocket.off('phaseChanged');
      gameSocket.off('showdown');
      gameSocket.off('handOver');
      gameSocket.off('turnDeadline');
    };
  }, []);

  // Fallback local: si cambia de turno y no llegó deadline aún, iniciar una cuenta de 45s.
  useEffect(() => {
    if (indiceTurnoActual === null || indiceTurnoActual === undefined) return;
    setFechaLimiteTurnoMs(Date.now() + DURACION_TURNO_SEGUNDOS * 1000);
  }, [indiceTurnoActual]);

  // Actualizar contador visible cada segundo en base al deadline.
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

  // Actions que envían al backend vía REST API
  const enviarAccion = useCallback(async (accion, monto = 0) => {
    const usuarioSesion = JSON.parse(sessionStorage.getItem('user') || '{}');
    const idUsuarioSesion = usuarioSesion?.id || usuarioSesion?.userId;

    if (!idJuego || !idUsuarioSesion) {
      console.error('❌ No se puede enviar acción: faltan gameId o userId');
      return { success: false, error: 'Falta contexto de juego' };
    }

    try {
      const response = await gameAPI.playerAction(idJuego, accion, monto);
      const datos = response.data;

      if (datos?.success) {
        console.log('✅ Acción procesada:', accion);
        if (datos?.gameState) {
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
              const yo = siguiente.players[indiceYo];
              setFichasJugador(yo.chips || 0);
              setApuestaJugador(yo.betInPhase || 0);
              setCartasPropias(yo.holeCards || []);
              setJugadorSeRetiro(yo.folded || false);
            }
          }
        }

        if (data.handOver) {
          setLastHandResult({
            winnerId: data.winnerId || data.winner?.userId || data.winner?.id,
            winnerName: data.winnerName || data.winner?.username || 'Desconocido',
            winnerIds: data.winnerIds || [],
            winners: data.winners || [],
            potWon: data.potWon ?? 0
          });
          setJugadorYaActuo(false);
        }
      } else {
        console.error('❌ Error en acción:', datos?.error || datos);
      }

      return datos;
    } catch (error) {
      console.error('❌ Error enviando acción:', error?.response?.data || error.message);
      return {
        success: false,
        error: error?.response?.data?.error || error?.response?.data?.message || error.message
      };
    }
  }, [idJuego]);

  const handleFold = useCallback(() => {
    if (idJuego) {
      console.log('📤 Enviando acción FOLD');
      enviarAccion('fold');
      setJugadorSeRetiro(true);
      setJugadorYaActuo(true);
    }
  }, [idJuego, enviarAccion]);

  const handleCheck = useCallback(() => {
    if (idJuego) {
      console.log('📤 Enviando acción CHECK');
      enviarAccion('check');
      setJugadorYaActuo(true);
    }
  }, [idJuego, enviarAccion]);

  const handleCall = useCallback(() => {
    if (idJuego) {
      const montoIgualar = apuestaActual - apuestaJugador;
      console.log('📤 Enviando acción CALL', montoIgualar);
      enviarAccion('call', montoIgualar);
      setJugadorYaActuo(true);
    }
  }, [idJuego, enviarAccion, apuestaActual, apuestaJugador]);

  const handleRaise = useCallback((montoSubida) => {
    if (idJuego) {
      const apuestaTotal = apuestaActual + montoSubida;
      console.log('📤 Enviando acción RAISE', apuestaTotal);
      enviarAccion('raise', apuestaTotal);
      setJugadorYaActuo(true);
    }
  }, [idJuego, enviarAccion, apuestaActual]);

  const handleAllIn = useCallback(() => {
    if (idJuego) {
      const montoAllIn = fichasJugador;
      console.log('📤 Enviando acción ALL-IN', montoAllIn);
      enviarAccion('all-in', montoAllIn);
      setJugadorYaActuo(true);
    }
  }, [idJuego, enviarAccion, fichasJugador]);

  // Game phase progression (backend controls)
  const advanceGamePhase = useCallback(() => {
    // Backend maneja el avance de fases
    console.log('Esperando al backend para avanzar fase...');
  }, []);

  // Initialize new game - AHORA CONECTA CON BACKEND
  const startNewGame = useCallback((initialPlayers, playerIdx, smallBlind, bigBlind) => {
    setIndiceJugador(playerIdx);
    // El backend se encargará de iniciar el juego
    console.log('Esperando al backend para iniciar el juego...');
  }, []);

  // Update community cards (backend will send)
  const updateCommunityCards = useCallback((cards) => {
    setCartasComunitarias(cards);
  }, []);

  // Update player chips (backend will send)
  const updatePlayerChips = useCallback((chips) => {
    setFichasJugador(chips);
  }, []);

  // Update turn (backend will send)
  const updateCurrentTurn = useCallback((playerIndex) => {
    setIndiceTurnoActual(playerIndex);
    setTiempoRestanteTurno(DURACION_TURNO_SEGUNDOS);
  }, []);

  // Check if player can perform actions
  const estadoJugadorActual = jugadores[indiceJugador];
  const comprometido = parseInt(estadoJugadorActual?.betInPhase ?? apuestaJugador) || 0;
  const apuestaActualNumero = parseInt(apuestaActual) || 0;
  const subidaMinimaEfectiva = Math.max(1, parseInt(subidaMinima) || (apuestaActualNumero > 0 ? apuestaActualNumero : 1));
  const esMiTurno = indiceTurnoActual === indiceJugador;
  const esPreflop = faseJuego === 'preflop' || faseJuego === 'pre-flop';
  const esCiegaGrande = indiceJugador === posicionCiegaGrande;
  let canCheck = esMiTurno && comprometido >= apuestaActualNumero && !jugadorSeRetiro;
  const canCall = esMiTurno && apuestaActualNumero > comprometido && !jugadorSeRetiro;
  const canRaise = esMiTurno && fichasJugador > (apuestaActualNumero - comprometido + subidaMinimaEfectiva) && !jugadorSeRetiro;
  const canFold = esMiTurno && !jugadorSeRetiro;
  const canAllIn = esMiTurno && fichasJugador > 0 && !jugadorSeRetiro;

  // Preflop: si eres BB y ya igualaste (SB ha pagado), debes poder hacer check
  if (esMiTurno && esPreflop && esCiegaGrande && comprometido >= apuestaActualNumero && !jugadorSeRetiro) {
    canCheck = true;
  }

  // Debug logs para check
  if (esMiTurno) {
    console.log('🔍 [usePokerGame] Action Check Debug:', {
      playerIndex: indiceJugador,
      currentPlayerTurn: indiceTurnoActual,
      isMyTurn: esMiTurno,
      committed: comprometido,
      currentBetNum: apuestaActualNumero,
      playerHasFolded: jugadorSeRetiro,
      canCheck,
      canCall,
      currentPlayerState: estadoJugadorActual
    });
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
