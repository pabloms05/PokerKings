import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import PokerTable from './MesaPoker';
import BettingActions from './AccionesApuesta';
import usePokerGame from './useJuegoPoker';
import { gameAPI, friendAPI } from '../../servicios/api';
import { gameSocket } from '../../servicios/socketJuego';
import './Partida.css';

function TablePage({ table, user, onNavigate }) {
  const CHAT_MAX_LENGTH = 300;
  const [players, setPlayers] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastShownHandOver, setLastShownHandOver] = useState(null);
  const [winnerPopupData, setWinnerPopupData] = useState(null);
  const [spectatorDelayUntil, setSpectatorDelayUntil] = useState(0);
  const [isCompact, setIsCompact] = useState(window.innerWidth < 900);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const chatBottomRef = useRef(null);

  // Detectar tamaño de pantalla para colapsar botones
  useEffect(() => {
    const handleResize = () => setIsCompact(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!table?.id) return;

    const onChatHistory = (payload) => {
      if (String(payload?.tableId) !== String(table.id)) return;
      setChatMessages(Array.isArray(payload?.messages) ? payload.messages : []);
    };

    const onChatMessage = (chatMessage) => {
      if (String(chatMessage?.tableId) !== String(table.id)) return;
      setChatMessages((prev) => [...prev, chatMessage].slice(-120));
      if (!isChatOpen && String(chatMessage?.userId) !== String(user?.id)) {
        setChatUnreadCount((prev) => prev + 1);
      }
    };

    gameSocket.on('tableChatHistory', onChatHistory);
    gameSocket.on('tableChatMessage', onChatMessage);

    gameSocket.requestTableChatHistory(table.id);

    return () => {
      gameSocket.off('tableChatHistory', onChatHistory);
      gameSocket.off('tableChatMessage', onChatMessage);
    };
  }, [table?.id, isChatOpen, user?.id]);

  useEffect(() => {
    if (isChatOpen && chatUnreadCount > 0) {
      setChatUnreadCount(0);
    }
  }, [isChatOpen, chatUnreadCount]);

  useEffect(() => {
    if (!isChatOpen) return;
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatMessages, isChatOpen]);

  // Usar el hook de juego de póker (conectado con backend)
  const pokerGame = usePokerGame(user);

  // Sincronizar jugadores desde el backend
  useEffect(() => {
    if (pokerGame.players && pokerGame.players.length > 0) {
      setPlayers(pokerGame.players);

      const me = pokerGame.players.find(p => p.userId === user?.id);
      if (me) {
        const delayActive = Date.now() < spectatorDelayUntil;
        const shouldSpectate = !!me.isSittingOut && !delayActive;
        setIsSpectator(shouldSpectate);
      }
    }
  }, [pokerGame.players, user?.id, spectatorDelayUntil]);

  useEffect(() => {
    if (pokerGame.lastHandResult) {
      const idsKey = (pokerGame.lastHandResult.winnerIds || []).join(',');
      const key = `${idsKey || pokerGame.lastHandResult.winnerId}-${pokerGame.lastHandResult.potWon}`;
      if (key !== lastShownHandOver) {
        const winners = pokerGame.lastHandResult.winners || [];
        const meWon = (pokerGame.lastHandResult.winnerIds || []).includes(user?.id) || pokerGame.lastHandResult.winnerId === user?.id;

        setWinnerPopupData({
          winnerName: winners.length > 1
            ? (winners.map(w => w.username).filter(Boolean).join(', ') || pokerGame.lastHandResult.winnerName || 'Empate')
            : (pokerGame.lastHandResult.winnerName || winners[0]?.username || 'Desconocido'),
          potWon: pokerGame.lastHandResult.potWon ?? 0,
          esTuVictoria: !!meWon
        });

        setTimeout(() => {
          setWinnerPopupData(null);
        }, 3500);

        const meAfterHand = (pokerGame.players || []).find(p => p.userId === user?.id);
        const busted = !!meAfterHand && ((Number(meAfterHand.chips) || 0) <= 0 || !!meAfterHand.isSittingOut);
        if (busted) {
          // Dar tiempo a ver resultado antes de pasar a espectador.
          const until = Date.now() + 3500;
          setSpectatorDelayUntil(until);
          setIsSpectator(false);

          toast.error('Te has quedado sin fichas. Pasarás a modo espectador para la siguiente mano.');

          setTimeout(() => {
            setIsSpectator(true);
          }, 3500);
        }

        setLastShownHandOver(key);
      }
    }
  }, [pokerGame.lastHandResult, pokerGame.players, lastShownHandOver, user?.id]);

  // Inicializar el juego desde el backend
  useEffect(() => {
    const initializeGame = async () => {
      if (!table || !user) return;

      try {
        setLoading(true);
        setError(null);

        // ESPERAR a unirse a la sala de WebSocket de la mesa ANTES de hacer startGame
        console.log(`🔌 Uniéndose a sala de WebSocket: table_${table.id}`);
        try {
          await gameSocket.joinTable(table.id);
          console.log(`✅ Socket unido a la sala. Procediendo con startGame...`);
        } catch (socketErr) {
          console.error('⚠️ Error al unirse a WebSocket:', socketErr.message);
          // Continuar de todas formas, pero puede haber problemas de sync
        }

        // Crear lista de jugadores para el backend
        const playerIds = [user.id]; // Comenzar con el usuario actual
        
        // El backend manejará agregar más jugadores si existen en la mesa
        // Por ahora, solo enviar el usuario actual
        
        // Iniciar el juego en el backend
        const response = await gameAPI.startGame(table.id, playerIds);
        
        // El backend devuelve response.data.game con el estado del juego
        const gameData = response.data.game || response.data;
        const gameId = gameData.id;
        
        if (gameId) {
          // Guardar el ID del juego
          pokerGame.setGameId(gameId);

          // Hidratar estado local inmediatamente con jugadores
          if (Array.isArray(gameData.players)) {
            setPlayers(gameData.players);
          }
          
          // El hook usePokerGame recibirá actualizaciones de todo el estado via WebSocket
          console.log('✅ Juego iniciado/unido:', gameId);
        } else {
          console.error('⚠️ No se recibió ID de juego del backend', response.data);
        }
      } catch (err) {
        console.error('❌ Error al iniciar el juego:', err);
        setError('No se pudo iniciar el juego. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    // Esperar un poco antes de inicializar (para que el WebSocket esté listo)
    const timer = setTimeout(() => {
      initializeGame();
    }, 500);

    return () => {
      clearTimeout(timer);
      if (table?.id) {
        gameSocket.leaveTable(table.id);
      }
    };
  }, [table, user]);

  // Manejar levantarse (modo espectador)
  const handleStandUp = async () => {
    try {
      if (pokerGame.gameId) {
        await gameAPI.leaveGame(pokerGame.gameId, user?.id);
      }
      if (table?.id) {
        gameSocket.leaveTable(table.id);
      }
      setIsSpectator(true);
      setShowMenu(false);
      console.log('👁️ Usuario cambió a modo espectador');
    } catch (err) {
      console.error('Error al cambiar a modo espectador:', err);
    }
  };

  // Manejar volver a sentarse
  const handleSitDown = async () => {
    try {
      if (table && user) {
        // Re-unirse a la sala de WebSocket (por si se había desconectado)
        try {
          await gameSocket.joinTable(table.id);
          console.log(`✅ Socket re-unido a la sala. Procediendo con startGame...`);
        } catch (socketErr) {
          console.error('⚠️ Error al re-unirse a WebSocket:', socketErr.message);
        }

        const response = await gameAPI.startGame(table.id, [user.id]);
        const gameData = response.data?.game || response.data;
        if (gameData?.id) {
          pokerGame.setGameId(gameData.id);
          if (Array.isArray(gameData.players)) {
            setPlayers(gameData.players);
          }
        }
      }
      setIsSpectator(false);
      console.log('🪡 Usuario volvió a sentarse en la mesa');
    } catch (err) {
      console.error('Error al volver a sentarse:', err);
    }
  };

  // Manejar abandonar partida
  const handleLeaveTable = async () => {
    const performLeave = async () => {
      try {
        if (pokerGame.gameId) {
          await gameAPI.leaveGame(pokerGame.gameId, user?.id);
        }
        if (table?.id) {
          gameSocket.leaveTable(table.id);
        }
      } catch (leaveErr) {
        console.error('Error abandonando el juego:', leaveErr);
      }
      toast.success('Has abandonado la mesa', { id: 'leave-success' });
      onNavigate('inicio');
    };

    toast.dismiss('leave-confirm');
    
    toast((t) => (
      <div style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '1rem' }}>¿Abandonar la partida?</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              await performLeave();
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

  const handleSendChat = async (event) => {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || !table?.id || sendingChat) return;

    if (text.length > CHAT_MAX_LENGTH) {
      toast.error(`El mensaje no puede superar ${CHAT_MAX_LENGTH} caracteres`);
      return;
    }

    try {
      setSendingChat(true);
      await gameSocket.sendTableChatMessage(table.id, text);
      setChatInput('');
    } catch (error) {
      toast.error(error?.message || 'No se pudo enviar el mensaje');
    } finally {
      setSendingChat(false);
    }
  };

  // Manejar invitar a un amigo
  const handleOpenInvite = async () => {
    setFriendsLoading(true);
    try {
      const response = await friendAPI.getFriends();
      const list = Array.isArray(response?.data) ? response.data : [];
      setFriends(list.map(f => ({ ...f, online: true })));
    } catch (err) {
      console.error('Error cargando amigos:', err);
      toast.error('No se pudo cargar la lista de amigos');
      setFriends([]);
    } finally {
      setFriendsLoading(false);
    }
    setShowInviteModal(true);
    setShowMenu(false);
  };

  // Manejar selección de amigos
  const toggleFriendSelection = (friendId) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  // Enviar invitaciones
  const handleSendInvites = async () => {
    if (!pokerGame.gameId) {
      toast.error('La partida aún no está lista para enviar invitaciones');
      return;
    }

    if (selectedFriends.length === 0) {
      toast.error('Selecciona al menos un amigo para invitar');
      return;
    }

    try {
      const response = await gameAPI.inviteFriends(pokerGame.gameId, selectedFriends);
      const sent = response?.data?.invitedCount ?? selectedFriends.length;
      const rejected = (response?.data?.rejectedFriendIds || []).length;

      if (sent > 0) {
        toast.success(`📨 ${sent} invitación${sent > 1 ? 'es' : ''} enviada${sent > 1 ? 's' : ''}`, { id: 'send-invites' });
      }
      if (rejected > 0) {
        toast.error(`${rejected} invitación${rejected > 1 ? 'es no válidas' : ' no válida'} no se pudo enviar`);
      }

      setShowInviteModal(false);
      setSelectedFriends([]);
    } catch (err) {
      console.error('Error enviando invitaciones:', err);
      toast.error(err?.response?.data?.error || 'No se pudieron enviar las invitaciones');
    }
  };

  if (!table) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#e0e0e0' }}>
        <h2>Mesa no encontrada</h2>
        <button className="btn btn-primary" onClick={() => onNavigate('inicio')}>
          Volver al inicio
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#e0e0e0' }}>
        <h2>Cargando usuario...</h2>
        <p>Espera un momento</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#e0e0e0' }}>
        <h2>Iniciando juego...</h2>
        <p>Conectando con el servidor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ff6b6b' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => onNavigate('mesas')}>
          Volver al lobby
        </button>
      </div>
    );
  }

  return (
    <div className="table-page">
      {/* Popup ganador centrado en pantalla */}
      {winnerPopupData && (
        <div className={`winner-popup ${winnerPopupData.esTuVictoria ? 'winner-popup--tuya' : ''}`}>
          <div className="winner-popup__icono">{winnerPopupData.esTuVictoria ? '🥇' : '🏆'}</div>
          <div className="winner-popup__titulo">
            {winnerPopupData.esTuVictoria ? '¡HAS GANADO!' : 'Ganador de la mano'}
          </div>
          <div className="winner-popup__nombre">{winnerPopupData.winnerName}</div>
          <div className="winner-popup__bote">+{(winnerPopupData.potWon || 0).toLocaleString()} PK</div>
        </div>
      )}

      {/* Header con información de la mesa */}
      <div className="table-header">
        <button className="btn-back" onClick={handleLeaveTable}>
          ← Salir de la mesa
        </button>
        
        <div className="table-info-header">
          <h2 className="table-title">{table.name}</h2>
          <div className="table-stats">
            <span className="stat">💰 Ciegas: {table.smallBlind}/{table.bigBlind}</span>
            <span className="stat">👥 Jugadores: {pokerGame.players.filter(p => p && !p.isSittingOut).length}/{table.maxPlayers}</span>
            {table.isPrivate && <span className="stat">🔒 Privada</span>}
            {isSpectator && <span className="stat spectator-badge">👁️ Modo Espectador</span>}
            <span className="stat">🎮 Fase: {pokerGame.gamePhase}</span>
          </div>
        </div>

        {/* Botones de menú y chat */}
        <div className="menu-container">
          {/* Chat: visible solo en pantallas grandes */}
          {!isCompact && (
            <button
              className="btn-menu btn-chat"
              onClick={() => setIsChatOpen((prev) => !prev)}
            >
              🗣️ Chat {chatUnreadCount > 0 ? `(${chatUnreadCount})` : ''}
            </button>
          )}

          <button 
            className={`btn-menu${isCompact ? ' compact' : ''}`}
            onClick={() => setShowMenu(!showMenu)}
          >
            {isCompact ? '☰' : '☰ Menú'}
          </button>
          
          {/* Dropdown del menú */}
          {showMenu && (
            <div className="menu-dropdown">
              {/* En modo compacto: Salir y Chat al principio del dropdown */}
              {isCompact && (
                <>
                  <button
                    className="menu-item"
                    onClick={() => { setShowMenu(false); onNavigate('inicio'); }}
                  >
                    <span className="menu-icon">←</span>
                    Salir de la mesa
                    <span className="menu-desc">Volver al lobby</span>
                  </button>
                  <button
                    className="menu-item"
                    onClick={() => {
                      setIsChatOpen((prev) => !prev);
                      setShowMenu(false);
                    }}
                  >
                    <span className="menu-icon">🗣️</span>
                    Chat {chatUnreadCount > 0 ? `(${chatUnreadCount})` : ''}
                    <span className="menu-desc">Abrir el chat</span>
                  </button>
                  <div className="menu-divider" />
                </>
              )}

              {!isSpectator ? (
                <button 
                  className="menu-item" 
                  onClick={handleStandUp}
                >
                  <span className="menu-icon">🪡</span>
                  Levantarse
                  <span className="menu-desc">Cambiar a modo espectador</span>
                </button>
              ) : (
                <button 
                  className="menu-item" 
                  onClick={handleSitDown}
                >
                  <span className="menu-icon">🪡</span>
                  Volver a sentarse
                  <span className="menu-desc">Reincorporarse a la mesa</span>
                </button>
              )}
              
              <button 
                className="menu-item" 
                onClick={handleOpenInvite}
              >
                <span className="menu-icon">👥</span>
                Invitar a un amigo
                <span className="menu-desc">Enviar invitaciones</span>
              </button>
              
              <button 
                className="menu-item danger" 
                onClick={handleLeaveTable}
              >
                <span className="menu-icon">🚻</span>
                Abandonar partida
                <span className="menu-desc">Salir definitivamente</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mesa de poker con cartas comunitarias */}
      {(() => {
        const tablePlayers = pokerGame.players.length > 0 ? pokerGame.players : players;
        const currentUserIndex = tablePlayers.findIndex(p => p?.userId === user?.id);
        return (
      <PokerTable 
        maxPlayers={table.maxPlayers}
        players={tablePlayers}
        currentPlayerId={user?.id || user?.username} // ID del usuario actual
        tableColor={table.tableColor}
        dealerPosition={pokerGame.dealerPosition}
        smallBlindPosition={pokerGame.smallBlindPosition}
        bigBlindPosition={pokerGame.bigBlindPosition}
        communityCards={pokerGame.communityCards}
        gamePhase={pokerGame.gamePhase}
        pot={pokerGame.pot}
        sidePots={pokerGame.sidePots}
        currentUserIndex={currentUserIndex}
        currentPlayerIndex={pokerGame.currentPlayerTurn}
      />
        );
      })()}

      {/* Acciones de apuestas */}
      {!isSpectator && pokerGame.gamePhase !== 'waiting' && (() => {
        const isMyTurn = pokerGame.currentPlayerTurn === pokerGame.playerIndex;
        console.log('🎮 BettingActions:', {
          currentPlayerTurn: pokerGame.currentPlayerTurn,
          playerIndex: pokerGame.playerIndex,
          isMyTurn,
          gamePhase: pokerGame.gamePhase
        });
        return (
          <BettingActions 
            playerChips={pokerGame.playerChips}
            currentBet={pokerGame.currentBet}
            minRaise={pokerGame.minRaise}
            pot={pokerGame.pot}
            isPlayerTurn={isMyTurn}
            canCheck={pokerGame.canCheck}
            canCall={pokerGame.canCall}
            canRaise={pokerGame.canRaise}
            canFold={pokerGame.canFold}
            turnTimeRemaining={pokerGame.turnTimeRemaining}
            onFold={pokerGame.handleFold}
            onCheck={pokerGame.handleCheck}
            onCall={pokerGame.handleCall}
            onRaise={pokerGame.handleRaise}
            onAllIn={pokerGame.handleAllIn}
          />
        );
      })()}

      {/* Panel de acciones */}
      {isSpectator && (
        <div className="actions-panel">
          <button className="btn-action btn-rejoin" onClick={handleSitDown}>
            🪡 Volver a la Mesa
          </button>
        </div>
      )}

      {isChatOpen && (
        <section className={`table-chat-panel${isCompact ? ' compact' : ''}`}>
          <header className="table-chat-header">
            <h3>Chat de partida</h3>
            <button
              className="table-chat-close"
              onClick={() => setIsChatOpen(false)}
              aria-label="Cerrar chat"
            >
              ✕
            </button>
          </header>

          <div className="table-chat-messages">
            {chatMessages.length === 0 ? (
              <p className="table-chat-empty">No hay mensajes todavía. Sé el primero en escribir.</p>
            ) : (
              chatMessages.map((msg) => {
                const isMe = String(msg.userId) === String(user?.id);
                const timestamp = msg?.createdAt ? new Date(msg.createdAt) : null;
                const timeText = timestamp && !Number.isNaN(timestamp.getTime())
                  ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <article key={msg.id} className={`table-chat-message${isMe ? ' mine' : ''}`}>
                    <div className="table-chat-message-top">
                      <span className="table-chat-user">{msg.avatar || '🎭'} {msg.username || 'Jugador'}</span>
                      <span className="table-chat-time">{timeText}</span>
                    </div>
                    <p>{msg.message}</p>
                  </article>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          <form className="table-chat-form" onSubmit={handleSendChat}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value.slice(0, CHAT_MAX_LENGTH))}
              placeholder="Escribe un mensaje..."
              maxLength={CHAT_MAX_LENGTH}
            />
            <button type="submit" disabled={sendingChat || !chatInput.trim()}>
              Enviar
            </button>
          </form>
        </section>
      )}

      {/* Modal de invitación a amigos */}
      {showInviteModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowInviteModal(false)}></div>
          <div className="invite-modal">
            <div className="modal-header">
              <h3>👥 Invitar a un amigo</h3>
              <button 
                className="btn-close-modal" 
                onClick={() => setShowInviteModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <p className="modal-subtitle">Selecciona a quién quieres invitar a {table.name}</p>
              
              <div className="friends-list">
                {friendsLoading && <p style={{ color: '#ddd' }}>Cargando amigos...</p>}
                {!friendsLoading && friends.length === 0 && (
                  <p style={{ color: '#ddd' }}>No tienes amigos para invitar.</p>
                )}
                {friends.map(friend => (
                  <div 
                    key={friend.id} 
                    className={`friend-item ${
                      !friend.online ? 'offline' : ''
                    } ${
                      selectedFriends.includes(friend.id) ? 'selected' : ''
                    }`}
                    onClick={() => friend.online && toggleFriendSelection(friend.id)}
                  >
                    <div className="friend-info">
                      <span className="friend-avatar">{friend.avatar}</span>
                      <span className="friend-name">{friend.username}</span>
                      {friend.online ? (
                        <span className="status-badge online">🟢 Online</span>
                      ) : (
                        <span className="status-badge offline">⚪ Offline</span>
                      )}
                    </div>
                    {selectedFriends.includes(friend.id) && (
                      <span className="check-icon">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => setShowInviteModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn-send-invites" 
                onClick={handleSendInvites}
                disabled={selectedFriends.length === 0}
              >
                📨 Enviar Invitaciones ({selectedFriends.length})
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TablePage;
