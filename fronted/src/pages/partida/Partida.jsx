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
  // Constantes locales para limites del chat
  const MAXIMO_CARACTERES_CHAT = 300;

  // Estado principal de partida, UI y chat
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

  // Valores derivados usados por efectos de inicializacion
  const idMesa = mesa?.id;
  const idUsuario = usuario?.id;

  // Efectos: layout y chat en tiempo real
  // Detecta tamano de pantalla para colapsar botones
  useEffect(() => {
    const manejarResize = () => setVistaCompacta(window.innerWidth < 900);
    window.addEventListener('resize', manejarResize);
    return () => window.removeEventListener('resize', manejarResize);
  }, []);

  useEffect(() => {
    referenciaAmigos.current = amigos;
  }, [amigos]);

  useEffect(() => {
    if (!mesa || !mesa.id) return;

    const alHistorialChat = (payload) => {
      if (!payload || String(payload.tableId) !== String(mesa.id)) return;

      let mensajesRecibidos = [];
      if (Array.isArray(payload.messages)) {
        mensajesRecibidos = payload.messages;
      }

      setMensajesChat(mensajesRecibidos);
    };

    const alMensajeChat = (mensajeChat) => {
      if (!mensajeChat || String(mensajeChat.tableId) !== String(mesa.id)) return;
      setMensajesChat((previo) => [...previo, mensajeChat].slice(-120));
      const idUsuarioMensaje = mensajeChat ? mensajeChat.userId : undefined;
      const idUsuarioActual = usuario ? usuario.id : undefined;
      if (!chatAbierto && String(idUsuarioMensaje) !== String(idUsuarioActual)) {
        setContadorNoLeidosChat((previo) => previo + 1);
      }
    };

    // Suscribir eventos del chat de esta mesa.
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

  // Efectos: presencia y amigos cuando el modal esta abierto
  useEffect(() => {
    if (!mostrarModalInvitacion) return;

    const alPresenciaAmigo = (payload) => {
      const idUsuarioAmigo = String(payload?.userId || '');
      if (!idUsuarioAmigo) return;

      setAmigos((amigosPrevios) => amigosPrevios.map((amigo) => {
        if (amigo && String(amigo.id) === idUsuarioAmigo) {
          return { ...amigo, online: !!payload?.online };
        }

        return amigo;
      }));
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

    // Refrescamos presencia cada pocos segundos para no mostrar estados viejos.
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

    const refrescarEstadoOnline = () => {
      const idsAmigos = referenciaAmigos.current.map((amigo) => amigo?.id).filter(Boolean);
      if (idsAmigos.length === 0) return;

      friendAPI.getOnlineStatus(idsAmigos).then(
        (respuestaOnline) => {
          const estadoEnLinea = respuestaOnline?.data?.onlineStatus || {};
          setAmigos((amigosPrevios) => amigosPrevios.map((amigo) => ({
            ...amigo,
            online: !!estadoEnLinea[String(amigo?.id)]
          })));
        },
        (errorOnline) => {
          console.warn('No se pudo refrescar online-status en vivo:', errorOnline?.message || errorOnline);
        }
      );
    };

    // Doble capa: evento realtime + consulta REST periódica para mayor consistencia.
    refrescarEstadoOnline();
    const idIntervalo = setInterval(refrescarEstadoOnline, 1500);

    return () => clearInterval(idIntervalo);
  }, [mostrarModalInvitacion]);

  // Hook central del juego (estado principal del backend)
  const juegoPoker = useJuegoPoker(usuario);

  // Helpers: refrescar saldo desde el backend
  const refrescarSaldoUsuario = async () => {
    if (!usuario?.id || !alActualizarUsuario) return;

    try {
      const response = await userAPI.getUserById(usuario.id);
      const usuarioActualizado = { ...usuario, ...response?.data, chips: Number(response?.data?.chips ?? usuario.chips ?? 0) };
      alActualizarUsuario(usuarioActualizado);
    } catch (error) {
      console.warn('No se pudo refrescar saldo de usuario:', error?.message || error);
    }
  };

  // Efectos: sincronizacion con backend
  // Sincroniza jugadores y modo espectador
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
      const misionesCount = (juegoPoker.lastHandResult.completedMissions || []).length;
      const trofeosCount = (juegoPoker.lastHandResult.unlockedAchievements || []).length;
      const claveMano = `${claveIds || juegoPoker.lastHandResult.winnerId}-${juegoPoker.lastHandResult.potWon}-${misionesCount}-${trofeosCount}`;
      if (claveMano !== ultimaManoMostrada) {
        const ganadores = juegoPoker.lastHandResult.winners || [];
        const yoGane = (juegoPoker.lastHandResult.winnerIds || []).includes(usuario?.id) || juegoPoker.lastHandResult.winnerId === usuario?.id;

        let nombreGanador = 'Desconocido';
        if (ganadores.length > 1) {
          const nombresGanadores = ganadores.map((ganador) => ganador.username).filter(Boolean).join(', ');
          nombreGanador = nombresGanadores || juegoPoker.lastHandResult.winnerName || 'Empate';
        } else {
          nombreGanador = juegoPoker.lastHandResult.winnerName || ganadores[0]?.username || 'Desconocido';
        }

        setDatosPopupGanador({
          winnerName: nombreGanador,
          potWon: juegoPoker.lastHandResult.potWon ?? 0,
          esTuVictoria: !!yoGane
        });

        setTimeout(() => {
          setDatosPopupGanador(null);
        }, 3500);

        const yoDespuesDeMano = (juegoPoker.players || []).find((jugador) => jugador.userId === usuario?.id);
        const eliminado = !!yoDespuesDeMano && ((Number(yoDespuesDeMano.chips) || 0) <= 0 || !!yoDespuesDeMano.isSittingOut);

        const misionesCompletadas = (juegoPoker.lastHandResult.completedMissions || []).filter(
          (mission) => String(mission.userId) === String(usuario?.id)
        );
        misionesCompletadas.forEach((mission) => {
          toast.success(`Mision completada: ${mission.title} (+${Number(mission.reward) || 0} PK)`);
        });

        const trofeosDesbloqueados = (juegoPoker.lastHandResult.unlockedAchievements || []).filter(
          (achievement) => String(achievement.userId) === String(usuario?.id)
        );
        trofeosDesbloqueados.forEach((achievement) => {
          toast.success(`Trofeo desbloqueado: ${achievement.name}`);
        });

        if (misionesCompletadas.length > 0 || trofeosDesbloqueados.length > 0) {
          window.dispatchEvent(new CustomEvent('progression:updated', {
            detail: {
              userId: usuario?.id,
              completedMissions: misionesCompletadas,
              unlockedAchievements: trofeosDesbloqueados
            }
          }));
        }

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

  // Efectos: inicializar juego
  // Inicia partida y se une a la sala de sockets
  useEffect(() => {
    const inicializarJuego = async () => {
      if (!mesa || !usuario) return;

      try {
        setCargando(true);
        setErrorVista(null);

        // ESPERAR a unirse a la sala de WebSocket de la mesa ANTES de hacer startGame
        console.log(`🔌 Uniendose a sala de WebSocket: table_${mesa.id}`);
        try {
          await gameSocket.joinTable(mesa.id);
          console.log(`✅ Socket unido a la sala. Procediendo con startGame...`);
        } catch (socketErr) {
          console.error('⚠️ Error al unirse a WebSocket:', socketErr.message);
          // Continuar de todas formas, pero puede haber problemas de sync
        }

        // Crear lista de jugadores para el backend
        const idsJugadores = [usuario.id]; // Comenzar con el usuario actual
        
        // El backend manejará agregar más jugadores si existen en la mesa
        // Por ahora, solo enviar el usuario actual
        
        // Iniciar el juego en el backend
        const response = await gameAPI.startGame(mesa.id, idsJugadores);
        
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
      if (mesa?.id) {
        gameSocket.leaveTable(mesa.id);
      }
    };
  }, [idMesa, idUsuario]);

  // Handlers de partida (levantarse, sentarse, salir, chat, invitaciones)
  // Cambiar a modo espectador
  const manejarLevantarse = () => {
    let promesaSalida = Promise.resolve();
    if (juegoPoker.gameId) {
      promesaSalida = gameAPI.leaveGame(juegoPoker.gameId, usuario?.id);
    }

    promesaSalida.then(
      () => refrescarSaldoUsuario(),
      (errorSalida) => {
        console.error('Error al cambiar a modo espectador:', errorSalida);
        return refrescarSaldoUsuario();
      }
    ).then(() => {
      if (!mesa || !mesa.id) {
        return Promise.resolve();
      }

      gameSocket.leaveTable(mesa.id);
      return gameSocket.joinTable(mesa.id).then(
        () => {},
        (errorSocket) => {
          console.warn('⚠️ No se pudo re-unir como espectador tras levantarse:', errorSocket.message);
        }
      );
    }).then(() => {
      juegoPoker.setPlayers((jugadoresPrevios) => jugadoresPrevios.map((jugador) => {
        const idJugador = jugador ? jugador.userId : undefined;
        const idUsuarioActual = usuario ? usuario.id : undefined;
        if (String(idJugador) !== String(idUsuarioActual)) {
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
    });
  };

  // Volver a sentarse en la mesa
  const manejarSentarse = () => {
    if (!mesa || !usuario) {
      setEsEspectador(false);
      setMostrarMenu(false);
      return;
    }

    gameSocket.joinTable(mesa.id).then(
      () => {
        console.log('✅ Socket re-unido a la sala. Procediendo con startGame...');
      },
      (errorSocket) => {
        console.error('⚠️ Error al re-unirse a WebSocket:', errorSocket.message);
      }
    ).then(() => {
      gameAPI.startGame(mesa.id, [usuario.id]).then(
        (respuestaInicio) => {
          const datosJuego = respuestaInicio.data?.game || respuestaInicio.data;
          if (datosJuego && datosJuego.id) {
            juegoPoker.setGameId(datosJuego.id);
            if (Array.isArray(datosJuego.players)) {
              setJugadores(datosJuego.players);
            }
          }

          refrescarSaldoUsuario().then(() => {
            setEsEspectador(false);
            setMostrarMenu(false);
            console.log('🪡 Usuario volvió a sentarse en la mesa');
          });
        },
        (errorSentarse) => {
          console.error('Error al volver a sentarse:', errorSentarse);
        }
      );
    });
  };

  // Salir de la mesa con confirmacion
  const manejarSalirMesa = () => {
    const ejecutarSalida = () => {
      let promesaSalida = Promise.resolve();
      if (juegoPoker.gameId) {
        promesaSalida = gameAPI.leaveGame(juegoPoker.gameId, usuario?.id);
      }

      promesaSalida.then(
        () => refrescarSaldoUsuario(),
        (errorSalida) => {
          console.error('Error abandonando el juego:', errorSalida);
          return refrescarSaldoUsuario();
        }
      ).then(() => {
        if (mesa && mesa.id) {
          gameSocket.leaveTable(mesa.id);
        }

        toast.success('Has abandonado la mesa', { id: 'leave-success' });
        alNavegar('inicio');
      });
    };

    toast.dismiss('leave-confirm');
    
    toast((instanciaToast) => (
      <div style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '1rem' }}>¿Abandonar la partida?</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            onClick={() => {
              toast.dismiss(instanciaToast.id);
              ejecutarSalida();
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
            onClick={() => toast.dismiss(instanciaToast.id)}
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

  const manejarEnviarChat = (evento) => {
    evento.preventDefault();
    const texto = entradaChat.trim();
    if (!texto || !mesa || !mesa.id || enviandoChat) return;

    if (texto.length > MAXIMO_CARACTERES_CHAT) {
      toast.error(`El mensaje no puede superar ${MAXIMO_CARACTERES_CHAT} caracteres`);
      return;
    }

    setEnviandoChat(true);
    gameSocket.sendTableChatMessage(mesa.id, texto).then(
      () => {
        setEntradaChat('');
      },
      (errorChat) => {
        toast.error(errorChat?.message || 'No se pudo enviar el mensaje');
      }
    ).then(() => {
      setEnviandoChat(false);
    });
  };

  // Abrir modal e hidratar lista de amigos para invitar
  const manejarAbrirInvitar = () => {
    setCargandoAmigos(true);
    friendAPI.getFriends().then(
      (respuestaAmigos) => {
        let listaAmigos = [];
        if (respuestaAmigos && Array.isArray(respuestaAmigos.data)) {
          listaAmigos = respuestaAmigos.data;
        }

        const idsAmigos = listaAmigos.map((amigo) => amigo.id).filter(Boolean);
        if (idsAmigos.length === 0) {
          setAmigos(listaAmigos);
          return Promise.resolve();
        }

        return friendAPI.getOnlineStatus(idsAmigos).then(
          (respuestaOnline) => {
            const estadoEnLinea = respuestaOnline?.data?.onlineStatus || {};
            setAmigos(listaAmigos.map((amigo) => ({
              ...amigo,
              online: !!estadoEnLinea[String(amigo.id)]
            })));
          },
          (errorOnline) => {
            console.warn('No se pudo consultar estado online de amigos:', errorOnline?.message || errorOnline);
            setAmigos(listaAmigos.map((amigo) => ({
              ...amigo,
              online: false
            })));
          }
        );
      },
      (errorAmigos) => {
        console.error('Error cargando amigos:', errorAmigos);
        toast.error('No se pudo cargar la lista de amigos');
        setAmigos([]);
      }
    ).then(() => {
      setCargandoAmigos(false);
      setMostrarModalInvitacion(true);
      setMostrarMenu(false);
    });
  };

  // Seleccionar o deseleccionar amigos
  const alternarSeleccionAmigo = (idAmigo) => {
    setAmigosSeleccionados((seleccionPrevio) => {
      if (seleccionPrevio.includes(idAmigo)) {
        return seleccionPrevio.filter((idSeleccionado) => idSeleccionado !== idAmigo);
      }

      return [...seleccionPrevio, idAmigo];
    });
  };

  // Enviar invitaciones a amigos seleccionados
  const manejarEnviarInvitaciones = () => {
    if (!juegoPoker.gameId) {
      toast.error('La partida aún no está lista para enviar invitaciones');
      return;
    }

    if (amigosSeleccionados.length === 0) {
      toast.error('Selecciona al menos un amigo para invitar');
      return;
    }

    gameAPI.inviteFriends(juegoPoker.gameId, amigosSeleccionados).then(
      (respuestaInvitaciones) => {
        let enviadas = amigosSeleccionados.length;
        if (
          respuestaInvitaciones &&
          respuestaInvitaciones.data &&
          respuestaInvitaciones.data.invitedCount !== undefined &&
          respuestaInvitaciones.data.invitedCount !== null
        ) {
          enviadas = respuestaInvitaciones.data.invitedCount;
        }

        const rechazadas = (respuestaInvitaciones?.data?.rejectedFriendIds || []).length;

        if (enviadas > 0) {
          let textoExito = `📨 ${enviadas} invitación enviada`;
          if (enviadas > 1) {
            textoExito = `📨 ${enviadas} invitaciones enviadas`;
          }
          toast.success(textoExito, { id: 'send-invites' });
        }

        if (rechazadas > 0) {
          let textoError = `${rechazadas} invitación no válida no se pudo enviar`;
          if (rechazadas > 1) {
            textoError = `${rechazadas} invitaciones no válidas no se pudieron enviar`;
          }
          toast.error(textoError);
        }

        setMostrarModalInvitacion(false);
        setAmigosSeleccionados([]);
      },
      (errorInvitaciones) => {
        console.error('Error enviando invitaciones:', errorInvitaciones);
        toast.error(errorInvitaciones?.response?.data?.error || 'No se pudieron enviar las invitaciones');
      }
    );
  };

  // Render temprano: validaciones de estado
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

  // Render: valores derivados de UI
  // Si el hook ya trae jugadores del backend, usamos esa fuente como principal.
  let jugadoresMesa = jugadores;
  if (juegoPoker.players.length > 0) {
    jugadoresMesa = juegoPoker.players;
  }

  const indiceUsuarioActual = jugadoresMesa.findIndex((jugador) => jugador?.userId === usuario?.id);
  const esMiTurno = juegoPoker.currentPlayerTurn === juegoPoker.playerIndex;
  // Solo mostramos botones cuando realmente te toca actuar.
  const mostrarAccionesApuesta = !esEspectador && juegoPoker.gamePhase !== 'waiting' && esMiTurno;

  let clasePopupGanador = 'winner-popup';
  let iconoPopupGanador = '🏆';
  let tituloPopupGanador = 'Ganador de la mano';
  if (datosPopupGanador && datosPopupGanador.esTuVictoria) {
    clasePopupGanador = 'winner-popup winner-popup--tuya';
    iconoPopupGanador = '🥇';
    tituloPopupGanador = '¡HAS GANADO!';
  }

  let textoNoLeidosChat = '';
  if (contadorNoLeidosChat > 0) {
    textoNoLeidosChat = `(${contadorNoLeidosChat})`;
  }

  let claseBotonMenu = 'btn-menu';
  let textoBotonMenu = '☰ Menú';
  if (vistaCompacta) {
    claseBotonMenu = 'btn-menu compact';
    textoBotonMenu = '☰';
  }

  let botonEstadoJugador = (
    <button
      className="menu-item"
      onClick={manejarLevantarse}
    >
      <span className="menu-icon">🪡</span>
      Levantarse
      <span className="menu-desc">Cambiar a modo espectador</span>
    </button>
  );
  if (esEspectador) {
    botonEstadoJugador = (
      <button
        className="menu-item"
        onClick={manejarSentarse}
      >
        <span className="menu-icon">🪡</span>
        Volver a sentarse
        <span className="menu-desc">Reincorporarse a la mesa</span>
      </button>
    );
  }

  let clasePanelChat = 'table-chat-panel';
  if (vistaCompacta) {
    clasePanelChat = 'table-chat-panel compact';
  }

  let contenidoMensajesChat = (
    <p className="table-chat-empty">No hay mensajes todavía. Sé el primero en escribir.</p>
  );
  if (mensajesChat.length > 0) {
    contenidoMensajesChat = mensajesChat.map((mensaje) => {
      const esMio = String(mensaje.userId) === String(usuario?.id);

      let marcaTiempo = null;
      if (mensaje && mensaje.createdAt) {
        marcaTiempo = new Date(mensaje.createdAt);
      }

      let textoHora = '';
      if (marcaTiempo && !Number.isNaN(marcaTiempo.getTime())) {
        textoHora = marcaTiempo.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      let claseMensaje = 'table-chat-message';
      if (esMio) {
        claseMensaje = 'table-chat-message mine';
      }

      return (
        <article key={mensaje.id} className={claseMensaje}>
          <div className="table-chat-message-top">
            <span className="table-chat-user">{mensaje.avatar || '🎭'} {mensaje.username || 'Jugador'}</span>
            <span className="table-chat-time">{textoHora}</span>
          </div>
          <p>{mensaje.message}</p>
        </article>
      );
    });
  }

  // Render principal de la mesa, acciones, chat e invitaciones
  return (
    <div className="table-page">
      {/* Popup ganador centrado en pantalla */}
      {datosPopupGanador && (
        <div className={clasePopupGanador}>
          <div className="winner-popup__icono">{iconoPopupGanador}</div>
          <div className="winner-popup__titulo">
            {tituloPopupGanador}
          </div>
          <div className="winner-popup__nombre">{datosPopupGanador.winnerName}</div>
          <div className="winner-popup__bote">+{(datosPopupGanador.potWon || 0).toLocaleString()} PK</div>
        </div>
      )}

      {/* Header con información de la mesa */}
      <div className="table-header">
        {!vistaCompacta && (
          <button className="btn-back" onClick={manejarSalirMesa}>
            ← Salir de la mesa
          </button>
        )}
        
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
              🗣️ Chat {textoNoLeidosChat}
            </button>
          )}

          <button 
            className={claseBotonMenu}
            onClick={() => setMostrarMenu(!mostrarMenu)}
          >
            {textoBotonMenu}
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
                    onClick={() => {
                      setMostrarMenu(false);
                      manejarSalirMesa();
                    }}
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
                    Chat {textoNoLeidosChat}
                    <span className="menu-desc">Abrir el chat</span>
                  </button>
                  <div className="menu-divider" />
                </>
              )}

              {botonEstadoJugador}
              
              <button 
                className="menu-item" 
                onClick={manejarAbrirInvitar}
              >
                <span className="menu-icon">👥</span>
                Invitar a un amigo
                <span className="menu-desc">Enviar invitaciones</span>
              </button>
              
            </div>
          )}
        </div>
      </div>

      {/* Mesa de poker + acciones en overlay */}
      <div className="table-game-area">
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

        {/* Acciones: solo visibles cuando es tu turno */}
        {mostrarAccionesApuesta && (
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
        )}
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
        <section className={clasePanelChat}>
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
            {contenidoMensajesChat}
            <div ref={referenciaFinChat} />
          </div>

          <form className="table-chat-form" onSubmit={manejarEnviarChat}>
            <input
              type="text"
              value={entradaChat}
              onChange={(eventoEntrada) => setEntradaChat(eventoEntrada.target.value.slice(0, MAXIMO_CARACTERES_CHAT))}
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
                {amigos.map((amigo) => {
                  let claseAmigo = 'friend-item';
                  if (!amigo.online) {
                    claseAmigo = 'friend-item offline';
                  }
                  if (amigosSeleccionados.includes(amigo.id)) {
                    claseAmigo = `${claseAmigo} selected`;
                  }

                  const manejarClickAmigo = () => {
                    if (amigo.online) {
                      alternarSeleccionAmigo(amigo.id);
                    }
                  };

                  let estadoAmigo = <span className="status-badge offline">⚪ Offline</span>;
                  if (amigo.online) {
                    estadoAmigo = <span className="status-badge online">🟢 Online</span>;
                  }

                  let iconoSeleccion = null;
                  if (amigosSeleccionados.includes(amigo.id)) {
                    iconoSeleccion = <span className="check-icon">✓</span>;
                  }

                  return (
                    <div
                      key={amigo.id}
                      className={claseAmigo}
                      onClick={manejarClickAmigo}
                    >
                      <div className="friend-info">
                        <span className="friend-avatar">{amigo.avatar}</span>
                        <span className="friend-name">{amigo.username}</span>
                        {estadoAmigo}
                      </div>
                      {iconoSeleccion}
                    </div>
                  );
                })}
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
