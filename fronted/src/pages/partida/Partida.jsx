import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import MesaPoker from './MesaPoker';
import AccionesApuesta from './AccionesApuesta';
import useJuegoPoker from './useJuegoPoker';
import { gameAPI, friendAPI, userAPI } from '../../servicios/api';
import { gameSocket } from '../../servicios/socketJuego';
import { socketService } from '../../servicios/socketBase';
import './Partida.css';

function PaginaPartida({ table: mesa, user: usuario, onNavigate: alNavegar, onUpdateUser: alActualizarUsuario }) {
  const MAXIMO_CARACTERES_CHAT = 300;
  const idMesa = mesa?.id;
  const idUsuario = usuario?.id;
  const [jugadores, setJugadores] = useState([]);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [esEspectador, setEsEspectador] = useState(false);
  const [mostrarModalInvitacion, setMostrarModalInvitacion] = useState(false);
  const [amigosSeleccionados, setAmigosSeleccionados] = useState([]);
  const [amigos, setAmigos] = useState([]);
  const [cargandoAmigos, setCargandoAmigos] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorVista, setErrorVista] = useState(null);
  const [ultimaManoMostrada, setUltimaManoMostrada] = useState(null);
  const [datosPopupGanador, setDatosPopupGanador] = useState(null);
  const [retrasoEspectadorHasta, setRetrasoEspectadorHasta] = useState(0);
  const [vistaCompacta, setVistaCompacta] = useState(window.innerWidth < 900);
  const [chatAbierto, setChatAbierto] = useState(false);
  const [mensajesChat, setMensajesChat] = useState([]);
  const [entradaChat, setEntradaChat] = useState('');
  const [enviandoChat, setEnviandoChat] = useState(false);
  const [contadorNoLeidosChat, setContadorNoLeidosChat] = useState(0);
  const referenciaFinChat = useRef(null);
  const referenciaAmigos = useRef([]);

  // Detectar tamaño de pantalla para colapsar botones
  useEffect(() => {
    const manejarResize = () => setVistaCompacta(window.innerWidth < 900);
    window.addEventListener('resize', manejarResize);
    return () => window.removeEventListener('resize', manejarResize);
  }, []);

  useEffect(() => {
    referenciaAmigos.current = amigos;
  }, [amigos]);

  useEffect(() => {
    if (!mesa?.id) return;

    const alHistorialChat = (payload) => {
      if (String(payload?.tableId) !== String(mesa.id)) return;
      setMensajesChat(Array.isArray(payload?.messages) ? payload.messages : []);
    };

    const alMensajeChat = (mensajeChat) => {
      if (String(mensajeChat?.tableId) !== String(mesa.id)) return;
      setMensajesChat((previo) => [...previo, mensajeChat].slice(-120));
      if (!chatAbierto && String(mensajeChat?.userId) !== String(usuario?.id)) {
        setContadorNoLeidosChat((previo) => previo + 1);
      }
    };

    gameSocket.on('tableChatHistory', alHistorialChat);
    gameSocket.on('tableChatMessage', alMensajeChat);

    gameSocket.requestTableChatHistory(mesa.id);

    return () => {
      gameSocket.off('tableChatHistory', alHistorialChat);
      gameSocket.off('tableChatMessage', alMensajeChat);
    };
  }, [mesa?.id, chatAbierto, usuario?.id]);

  useEffect(() => {
    if (chatAbierto && contadorNoLeidosChat > 0) {
      setContadorNoLeidosChat(0);
    }
  }, [chatAbierto, contadorNoLeidosChat]);

  useEffect(() => {
    if (!chatAbierto) return;
    referenciaFinChat.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensajesChat, chatAbierto]);

  useEffect(() => {
    if (!mostrarModalInvitacion) return;

    const alPresenciaAmigo = (payload) => {
      const idUsuarioAmigo = String(payload?.userId || '');
      if (!idUsuarioAmigo) return;

      setAmigos((previo) => previo.map((amigo) => (
        String(amigo?.id) === idUsuarioAmigo
          ? { ...amigo, online: !!payload?.online }
          : amigo
      )));
    };

    const alSnapshotPresencia = (payload) => {
      const estadoEnLinea = payload?.onlineStatus || {};
      setAmigos((previo) => previo.map((amigo) => ({
        ...amigo,
        online: !!estadoEnLinea[String(amigo?.id)]
      })));
    };

    socketService.onFriendPresence(alPresenciaAmigo);
    socketService.onFriendsPresenceSnapshot(alSnapshotPresencia);
    socketService.requestFriendsPresenceSnapshot();

    const idIntervaloSnapshot = setInterval(() => {
      socketService.requestFriendsPresenceSnapshot();
    }, 2000);

    return () => {
      socketService.offFriendPresence(alPresenciaAmigo);
      socketService.offFriendsPresenceSnapshot(alSnapshotPresencia);
      clearInterval(idIntervaloSnapshot);
    };
  }, [mostrarModalInvitacion]);

  useEffect(() => {
    if (!mostrarModalInvitacion) return;

    const refrescarEstadoOnline = async () => {
      const idsAmigos = referenciaAmigos.current.map((amigo) => amigo?.id).filter(Boolean);
      if (idsAmigos.length === 0) return;

      try {
        const response = await friendAPI.getOnlineStatus(idsAmigos);
        const estadoEnLinea = response?.data?.onlineStatus || {};
        setAmigos((previo) => previo.map((amigo) => ({
          ...amigo,
          online: !!estadoEnLinea[String(amigo?.id)]
        })));
      } catch (err) {
        console.warn('No se pudo refrescar online-status en vivo:', err?.message || err);
      }
    };

    refrescarEstadoOnline();
    const idIntervalo = setInterval(refrescarEstadoOnline, 1500);

    return () => clearInterval(idIntervalo);
  }, [mostrarModalInvitacion]);

  // Usar el hook de juego de póker (conectado con backend)
  const juegoPoker = useJuegoPoker(usuario);

  const refrescarSaldoUsuario = async () => {
    if (!idUsuario || !alActualizarUsuario) return;

    try {
      const response = await userAPI.getUserById(idUsuario);
      const usuarioActualizado = { ...usuario, ...response?.data, chips: Number(response?.data?.chips ?? usuario.chips ?? 0) };
      alActualizarUsuario(usuarioActualizado);
    } catch (error) {
      console.warn('No se pudo refrescar saldo de usuario:', error?.message || error);
    }
  };

  // Sincronizar jugadores desde el backend
  useEffect(() => {
    if (juegoPoker.players && juegoPoker.players.length > 0) {
      setJugadores(juegoPoker.players);

      const yo = juegoPoker.players.find((jugador) => jugador.userId === usuario?.id);
      if (yo) {
        const retrasoActivo = Date.now() < retrasoEspectadorHasta;
        const debeEspectar = !!yo.isSittingOut && !retrasoActivo;
        setEsEspectador(debeEspectar);
      }
    }
  }, [juegoPoker.players, usuario?.id, retrasoEspectadorHasta]);

  useEffect(() => {
    if (juegoPoker.lastHandResult) {
      const claveIds = (juegoPoker.lastHandResult.winnerIds || []).join(',');
      const claveMano = `${claveIds || juegoPoker.lastHandResult.winnerId}-${juegoPoker.lastHandResult.potWon}`;
      if (claveMano !== ultimaManoMostrada) {
        const ganadores = juegoPoker.lastHandResult.winners || [];
        const yoGane = (juegoPoker.lastHandResult.winnerIds || []).includes(usuario?.id) || juegoPoker.lastHandResult.winnerId === usuario?.id;

        setDatosPopupGanador({
          winnerName: ganadores.length > 1
            ? (ganadores.map((ganador) => ganador.username).filter(Boolean).join(', ') || juegoPoker.lastHandResult.winnerName || 'Empate')
            : (juegoPoker.lastHandResult.winnerName || ganadores[0]?.username || 'Desconocido'),
          potWon: juegoPoker.lastHandResult.potWon ?? 0,
          esTuVictoria: !!yoGane
        });

        setTimeout(() => {
          setDatosPopupGanador(null);
        }, 3500);

        const yoDespuesDeMano = (juegoPoker.players || []).find((jugador) => jugador.userId === usuario?.id);
        const eliminado = !!yoDespuesDeMano && ((Number(yoDespuesDeMano.chips) || 0) <= 0 || !!yoDespuesDeMano.isSittingOut);
        if (eliminado) {
          // Dar tiempo a ver resultado antes de pasar a espectador.
          const hasta = Date.now() + 3500;
          setRetrasoEspectadorHasta(hasta);
          setEsEspectador(false);

          toast.error('Te has quedado sin fichas. Pasarás a modo espectador para la siguiente mano.');

          setTimeout(() => {
            setEsEspectador(true);
          }, 3500);
        }

        setUltimaManoMostrada(claveMano);
      }
    }
  }, [juegoPoker.lastHandResult, juegoPoker.players, ultimaManoMostrada, usuario?.id]);

  // Inicializar el juego desde el backend
  useEffect(() => {
    const inicializarJuego = async () => {
      if (!idMesa || !idUsuario) return;

      try {
        setCargando(true);
        setErrorVista(null);

        // ESPERAR a unirse a la sala de WebSocket de la mesa ANTES de hacer startGame
        console.log(`🔌 Uniendose a sala de WebSocket: table_${idMesa}`);
        try {
          await gameSocket.joinTable(idMesa);
          console.log(`✅ Socket unido a la sala. Procediendo con startGame...`);
        } catch (socketErr) {
          console.error('⚠️ Error al unirse a WebSocket:', socketErr.message);
          // Continuar de todas formas, pero puede haber problemas de sync
        }

        // Crear lista de jugadores para el backend
        const idsJugadores = [idUsuario]; // Comenzar con el usuario actual
        
        // El backend manejará agregar más jugadores si existen en la mesa
        // Por ahora, solo enviar el usuario actual
        
        // Iniciar el juego en el backend
        const response = await gameAPI.startGame(idMesa, idsJugadores);
        
        // El backend devuelve response.data.game con el estado del juego
        const datosJuego = response.data.game || response.data;
        const idJuego = datosJuego.id;
        
        if (idJuego) {
          // Guardar el ID del juego
          juegoPoker.setGameId(idJuego);

          // Hidratar estado local inmediatamente con jugadores
          if (Array.isArray(datosJuego.players)) {
            setJugadores(datosJuego.players);
          }
          
          // El hook usePokerGame recibirá actualizaciones de todo el estado via WebSocket
          console.log('✅ Juego iniciado/unido:', idJuego);
          await refrescarSaldoUsuario();
        } else {
          console.error('⚠️ No se recibió ID de juego del backend', response.data);
        }
      } catch (err) {
        console.error('❌ Error al iniciar el juego:', err);
        setErrorVista('No se pudo iniciar el juego. Intenta de nuevo.');
      } finally {
        setCargando(false);
      }
    };

    // Esperar un poco antes de inicializar (para que el WebSocket esté listo)
    const temporizador = setTimeout(() => {
      inicializarJuego();
    }, 500);

    return () => {
      clearTimeout(temporizador);
      if (idMesa) {
        gameSocket.leaveTable(idMesa);
      }
    };
  }, [idMesa, idUsuario]);

  // Manejar levantarse (modo espectador)
  const manejarLevantarse = async () => {
    try {
      if (juegoPoker.gameId) {
        await gameAPI.leaveGame(juegoPoker.gameId, usuario?.id);
      }

      await refrescarSaldoUsuario();

      if (mesa?.id) {
        // Fuerza sync global del estado de la mesa para los demás clientes,
        // y vuelve a unir este cliente como espectador.
        gameSocket.leaveTable(mesa.id);
        try {
          await gameSocket.joinTable(mesa.id);
        } catch (socketErr) {
          console.warn('⚠️ No se pudo re-unir como espectador tras levantarse:', socketErr.message);
        }
      }

      // Mantenerse en la sala de la mesa para recibir estado como espectador.
      // Además, actualizar localmente para que el asiento se libere al instante.
      juegoPoker.setPlayers((jugadoresPrevios) => jugadoresPrevios.map((jugador) => {
        if (String(jugador?.userId) !== String(usuario?.id)) {
          return jugador;
        }

        return {
          ...jugador,
          isSittingOut: true,
          folded: true,
          hand: null,
          holeCards: null,
          committed: 0,
          betInPhase: 0,
          lastAction: null,
          chips: 0
        };
      }));

      setEsEspectador(true);
      setMostrarMenu(false);
      console.log('👁️ Usuario cambió a modo espectador');
    } catch (err) {
      console.error('Error al cambiar a modo espectador:', err);
    }
  };

  // Manejar volver a sentarse
  const manejarSentarse = async () => {
    try {
      if (mesa && usuario) {
        // Re-unirse a la sala de WebSocket (por si se había desconectado)
        try {
          await gameSocket.joinTable(mesa.id);
          console.log(`✅ Socket re-unido a la sala. Procediendo con startGame...`);
        } catch (socketErr) {
          console.error('⚠️ Error al re-unirse a WebSocket:', socketErr.message);
        }

        const response = await gameAPI.startGame(mesa.id, [usuario.id]);
        const datosJuego = response.data?.game || response.data;
        if (datosJuego?.id) {
          juegoPoker.setGameId(datosJuego.id);
          if (Array.isArray(datosJuego.players)) {
            setJugadores(datosJuego.players);
          }
        }
        await refrescarSaldoUsuario();
      }
      setEsEspectador(false);
      setMostrarMenu(false);
      console.log('🪡 Usuario volvió a sentarse en la mesa');
    } catch (err) {
      console.error('Error al volver a sentarse:', err);
    }
  };

  // Manejar abandonar partida
  const manejarSalirMesa = async () => {
    const ejecutarSalida = async () => {
      try {
        if (juegoPoker.gameId) {
          await gameAPI.leaveGame(juegoPoker.gameId, usuario?.id);
        }
        await refrescarSaldoUsuario();
        if (mesa?.id) {
          gameSocket.leaveTable(mesa.id);
        }
      } catch (leaveErr) {
        console.error('Error abandonando el juego:', leaveErr);
      }
      toast.success('Has abandonado la mesa', { id: 'leave-success' });
      alNavegar('inicio');
    };

    toast.dismiss('leave-confirm');
    
    toast((t) => (
      <div style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '1rem' }}>¿Abandonar la partida?</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              await ejecutarSalida();
            }}
            style={{
              background: '#c41e3a',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Sí, salir
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{
              background: '#0b6623',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: 5000, id: 'leave-confirm' });
  };

  const manejarEnviarChat = async (evento) => {
    evento.preventDefault();
    const texto = entradaChat.trim();
    if (!texto || !mesa?.id || enviandoChat) return;

    if (texto.length > MAXIMO_CARACTERES_CHAT) {
      toast.error(`El mensaje no puede superar ${MAXIMO_CARACTERES_CHAT} caracteres`);
      return;
    }

    try {
      setEnviandoChat(true);
      await gameSocket.sendTableChatMessage(mesa.id, texto);
      setEntradaChat('');
    } catch (error) {
      toast.error(error?.message || 'No se pudo enviar el mensaje');
    } finally {
      setEnviandoChat(false);
    }
  };

  // Manejar invitar a un amigo
  const manejarAbrirInvitar = async () => {
    setCargandoAmigos(true);
    try {
      const response = await friendAPI.getFriends();
      const lista = Array.isArray(response?.data) ? response.data : [];

      const idsAmigos = lista.map((amigo) => amigo.id).filter(Boolean);
      let estadoEnLinea = {};

      if (idsAmigos.length > 0) {
        try {
          const respuestaOnline = await friendAPI.getOnlineStatus(idsAmigos);
          estadoEnLinea = respuestaOnline?.data?.onlineStatus || {};
        } catch (onlineErr) {
          console.warn('No se pudo consultar estado online de amigos:', onlineErr?.message || onlineErr);
        }
      }

      setAmigos(lista.map((amigo) => ({
        ...amigo,
        online: !!estadoEnLinea[String(amigo.id)]
      })));
    } catch (err) {
      console.error('Error cargando amigos:', err);
      toast.error('No se pudo cargar la lista de amigos');
      setAmigos([]);
    } finally {
      setCargandoAmigos(false);
    }
    setMostrarModalInvitacion(true);
    setMostrarMenu(false);
  };

  // Manejar selección de amigos
  const alternarSeleccionAmigo = (idAmigo) => {
    setAmigosSeleccionados((previo) =>
      previo.includes(idAmigo)
        ? previo.filter((id) => id !== idAmigo)
        : [...previo, idAmigo]
    );
  };

  // Enviar invitaciones
  const manejarEnviarInvitaciones = async () => {
    if (!juegoPoker.gameId) {
      toast.error('La partida aún no está lista para enviar invitaciones');
      return;
    }

    if (amigosSeleccionados.length === 0) {
      toast.error('Selecciona al menos un amigo para invitar');
      return;
    }

    try {
      const response = await gameAPI.inviteFriends(juegoPoker.gameId, amigosSeleccionados);
      const enviadas = response?.data?.invitedCount ?? amigosSeleccionados.length;
      const rechazadas = (response?.data?.rejectedFriendIds || []).length;

      if (enviadas > 0) {
        toast.success(`📨 ${enviadas} invitación${enviadas > 1 ? 'es' : ''} enviada${enviadas > 1 ? 's' : ''}`, { id: 'send-invites' });
      }
      if (rechazadas > 0) {
        toast.error(`${rechazadas} invitación${rechazadas > 1 ? 'es no válidas' : ' no válida'} no se pudo enviar`);
      }

      setMostrarModalInvitacion(false);
      setAmigosSeleccionados([]);
    } catch (err) {
      console.error('Error enviando invitaciones:', err);
      toast.error(err?.response?.data?.error || 'No se pudieron enviar las invitaciones');
    }
  };

  if (!mesa) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#e0e0e0' }}>
        <h2>Mesa no encontrada</h2>
        <button className="btn btn-primary" onClick={() => alNavegar('inicio')}>
          Volver al inicio
        </button>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#e0e0e0' }}>
        <h2>Cargando usuario...</h2>
        <p>Espera un momento</p>
      </div>
    );
  }

  if (cargando) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#e0e0e0' }}>
        <h2>Iniciando juego...</h2>
        <p>Conectando con el servidor...</p>
      </div>
    );
  }

  if (errorVista) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ff6b6b' }}>
        <h2>Error</h2>
        <p>{errorVista}</p>
        <button className="btn btn-primary" onClick={() => alNavegar('mesas')}>
          Volver al lobby
        </button>
      </div>
    );
  }

  return (
    <div className="table-page">
      {/* Popup ganador centrado en pantalla */}
      {datosPopupGanador && (
        <div className={`winner-popup ${datosPopupGanador.esTuVictoria ? 'winner-popup--tuya' : ''}`}>
          <div className="winner-popup__icono">{datosPopupGanador.esTuVictoria ? '🥇' : '🏆'}</div>
          <div className="winner-popup__titulo">
            {datosPopupGanador.esTuVictoria ? '¡HAS GANADO!' : 'Ganador de la mano'}
          </div>
          <div className="winner-popup__nombre">{datosPopupGanador.winnerName}</div>
          <div className="winner-popup__bote">+{(datosPopupGanador.potWon || 0).toLocaleString()} PK</div>
        </div>
      )}

      {/* Header con información de la mesa */}
      <div className="table-header">
        <button className="btn-back" onClick={manejarSalirMesa}>
          ← Salir de la mesa
        </button>
        
        <div className="table-info-header">
          <h2 className="table-title">{mesa.name}</h2>
          <div className="table-stats">
            <span className="stat">💰 Ciegas: {mesa.smallBlind}/{mesa.bigBlind}</span>
            <span className="stat">👥 Jugadores: {juegoPoker.players.filter((jugador) => jugador && !jugador.isSittingOut).length}/{mesa.maxPlayers}</span>
            {mesa.isPrivate && <span className="stat">🔒 Privada</span>}
            {esEspectador && <span className="stat spectator-badge">👁️ Modo Espectador</span>}
            <span className="stat">🎮 Fase: {juegoPoker.gamePhase}</span>
          </div>
        </div>

        {/* Botones de menú y chat */}
        <div className="menu-container">
          {/* Chat: visible solo en pantallas grandes */}
          {!vistaCompacta && (
            <button
              className="btn-menu btn-chat"
              onClick={() => setChatAbierto((previo) => !previo)}
            >
              🗣️ Chat {contadorNoLeidosChat > 0 ? `(${contadorNoLeidosChat})` : ''}
            </button>
          )}

          <button 
            className={`btn-menu${vistaCompacta ? ' compact' : ''}`}
            onClick={() => setMostrarMenu(!mostrarMenu)}
          >
            {vistaCompacta ? '☰' : '☰ Menú'}
          </button>

          {mostrarMenu && vistaCompacta && (
            <div className="menu-backdrop" onClick={() => setMostrarMenu(false)} />
          )}
          
          {/* Dropdown del menú */}
          {mostrarMenu && (
            <div className="menu-dropdown">
              {/* En modo compacto: Salir y Chat al principio del dropdown */}
              {vistaCompacta && (
                <>
                  <button
                    className="menu-item"
                    onClick={() => { setMostrarMenu(false); alNavegar('inicio'); }}
                  >
                    <span className="menu-icon">←</span>
                    Salir de la mesa
                    <span className="menu-desc">Volver al lobby</span>
                  </button>
                  <button
                    className="menu-item"
                    onClick={() => {
                      setChatAbierto((previo) => !previo);
                      setMostrarMenu(false);
                    }}
                  >
                    <span className="menu-icon">🗣️</span>
                    Chat {contadorNoLeidosChat > 0 ? `(${contadorNoLeidosChat})` : ''}
                    <span className="menu-desc">Abrir el chat</span>
                  </button>
                  <div className="menu-divider" />
                </>
              )}

              {!esEspectador ? (
                <button 
                  className="menu-item" 
                  onClick={manejarLevantarse}
                >
                  <span className="menu-icon">🪡</span>
                  Levantarse
                  <span className="menu-desc">Cambiar a modo espectador</span>
                </button>
              ) : (
                <button 
                  className="menu-item" 
                  onClick={manejarSentarse}
                >
                  <span className="menu-icon">🪡</span>
                  Volver a sentarse
                  <span className="menu-desc">Reincorporarse a la mesa</span>
                </button>
              )}
              
              <button 
                className="menu-item" 
                onClick={manejarAbrirInvitar}
              >
                <span className="menu-icon">👥</span>
                Invitar a un amigo
                <span className="menu-desc">Enviar invitaciones</span>
              </button>
              
              <button 
                className="menu-item danger" 
                onClick={manejarSalirMesa}
              >
                <span className="menu-icon">🚻</span>
                Abandonar partida
                <span className="menu-desc">Salir definitivamente</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mesa de poker + acciones en overlay */}
      <div className="table-game-area">
        {(() => {
          const jugadoresMesa = juegoPoker.players.length > 0 ? juegoPoker.players : jugadores;
          const indiceUsuarioActual = jugadoresMesa.findIndex((jugador) => jugador?.userId === usuario?.id);
          return (
        <MesaPoker
          maxPlayers={mesa.maxPlayers}
          players={jugadoresMesa}
          currentPlayerId={usuario?.id || usuario?.username} // ID del usuario actual
          tableColor={mesa.tableColor}
          dealerPosition={juegoPoker.dealerPosition}
          smallBlindPosition={juegoPoker.smallBlindPosition}
          bigBlindPosition={juegoPoker.bigBlindPosition}
          communityCards={juegoPoker.communityCards}
          gamePhase={juegoPoker.gamePhase}
          pot={juegoPoker.pot}
          sidePots={juegoPoker.sidePots}
          currentUserIndex={indiceUsuarioActual}
          currentPlayerIndex={juegoPoker.currentPlayerTurn}
          onEmptySeatClick={manejarAbrirInvitar}
        />
          );
        })()}

        {/* Acciones: solo visibles cuando es tu turno */}
        {!esEspectador && juegoPoker.gamePhase !== 'waiting' && (() => {
          const esMiTurno = juegoPoker.currentPlayerTurn === juegoPoker.playerIndex;
          console.log('🎮 BettingActions:', {
            currentPlayerTurn: juegoPoker.currentPlayerTurn,
            playerIndex: juegoPoker.playerIndex,
            isMyTurn: esMiTurno,
            gamePhase: juegoPoker.gamePhase
          });
          return esMiTurno ? (
            <AccionesApuesta
              playerChips={juegoPoker.playerChips}
              currentBet={juegoPoker.currentBet}
              minRaise={juegoPoker.minRaise}
              pot={juegoPoker.pot}
              isPlayerTurn={esMiTurno}
              canCheck={juegoPoker.canCheck}
              canCall={juegoPoker.canCall}
              canRaise={juegoPoker.canRaise}
              canFold={juegoPoker.canFold}
              turnTimeRemaining={juegoPoker.turnTimeRemaining}
              onFold={juegoPoker.handleFold}
              onCheck={juegoPoker.handleCheck}
              onCall={juegoPoker.handleCall}
              onRaise={juegoPoker.handleRaise}
              onAllIn={juegoPoker.handleAllIn}
            />
          ) : null;
        })()}
      </div>

      {/* Panel de acciones */}
      {esEspectador && (
        <div className="actions-panel">
          <button className="btn-action btn-rejoin" onClick={manejarSentarse}>
            🪡 Volver a la Mesa
          </button>
        </div>
      )}

      {chatAbierto && (
        <section className={`table-chat-panel${vistaCompacta ? ' compact' : ''}`}>
          <header className="table-chat-header">
            <h3>Chat de partida</h3>
            <button
              className="table-chat-close"
              onClick={() => setChatAbierto(false)}
              aria-label="Cerrar chat"
            >
              ✕
            </button>
          </header>

          <div className="table-chat-messages">
            {mensajesChat.length === 0 ? (
              <p className="table-chat-empty">No hay mensajes todavía. Sé el primero en escribir.</p>
            ) : (
              mensajesChat.map((mensaje) => {
                const esMio = String(mensaje.userId) === String(usuario?.id);
                const marcaTiempo = mensaje?.createdAt ? new Date(mensaje.createdAt) : null;
                const textoHora = marcaTiempo && !Number.isNaN(marcaTiempo.getTime())
                  ? marcaTiempo.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <article key={mensaje.id} className={`table-chat-message${esMio ? ' mine' : ''}`}>
                    <div className="table-chat-message-top">
                      <span className="table-chat-user">{mensaje.avatar || '🎭'} {mensaje.username || 'Jugador'}</span>
                      <span className="table-chat-time">{textoHora}</span>
                    </div>
                    <p>{mensaje.message}</p>
                  </article>
                );
              })
            )}
            <div ref={referenciaFinChat} />
          </div>

          <form className="table-chat-form" onSubmit={manejarEnviarChat}>
            <input
              type="text"
              value={entradaChat}
              onChange={(e) => setEntradaChat(e.target.value.slice(0, MAXIMO_CARACTERES_CHAT))}
              placeholder="Escribe un mensaje..."
              maxLength={MAXIMO_CARACTERES_CHAT}
            />
            <button type="submit" disabled={enviandoChat || !entradaChat.trim()}>
              Enviar
            </button>
          </form>
        </section>
      )}

      {/* Modal de invitación a amigos */}
      {mostrarModalInvitacion && (
        <>
          <div className="modal-overlay" onClick={() => setMostrarModalInvitacion(false)}></div>
          <div className="invite-modal">
            <div className="modal-header">
              <h3>👥 Invitar a un amigo</h3>
              <button 
                className="btn-close-modal" 
                onClick={() => setMostrarModalInvitacion(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <p className="modal-subtitle">Selecciona a quién quieres invitar a {mesa.name}</p>
              
              <div className="friends-list">
                {cargandoAmigos && <p style={{ color: '#ddd' }}>Cargando amigos...</p>}
                {!cargandoAmigos && amigos.length === 0 && (
                  <p style={{ color: '#ddd' }}>No tienes amigos para invitar.</p>
                )}
                {amigos.map((amigo) => (
                  <div 
                    key={amigo.id}
                    className={`friend-item ${
                      !amigo.online ? 'offline' : ''
                    } ${
                      amigosSeleccionados.includes(amigo.id) ? 'selected' : ''
                    }`}
                    onClick={() => amigo.online && alternarSeleccionAmigo(amigo.id)}
                  >
                    <div className="friend-info">
                      <span className="friend-avatar">{amigo.avatar}</span>
                      <span className="friend-name">{amigo.username}</span>
                      {amigo.online ? (
                        <span className="status-badge online">🟢 Online</span>
                      ) : (
                        <span className="status-badge offline">⚪ Offline</span>
                      )}
                    </div>
                    {amigosSeleccionados.includes(amigo.id) && (
                      <span className="check-icon">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => setMostrarModalInvitacion(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn-send-invites" 
                onClick={manejarEnviarInvitaciones}
                disabled={amigosSeleccionados.length === 0}
              >
                📨 Enviar Invitaciones ({amigosSeleccionados.length})
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PaginaPartida;
