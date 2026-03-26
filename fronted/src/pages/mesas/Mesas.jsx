import React, { useState, useEffect } from 'react';
import { tableAPI } from '../../servicios/api';
import { socketService } from '../../servicios/socketBase';
import './Mesas.css';

function LobbyPage({ onNavigate, onJoinTable, user }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar mesas desde el backend
  useEffect(() => {
    const loadTables = async () => {
      try {
        const response = await tableAPI.getAllTables();
        setTables(response.data || []);
      } catch (err) {
        console.error('Error cargando mesas:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadTables();

    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const socket = socketService.getSocket() || socketService.connect(token);

    const onLobbyTables = (incomingTables) => {
      setTables(incomingTables || []);
      setLoading(false);
    };

    if (socket) {
      socket.emit('lobby:join');
      socket.on('lobby:tables', onLobbyTables);
      socket.on('lobby:update', onLobbyTables);
    }
    
    return () => {
      if (socket) {
        socket.emit('lobby:leave');
        socket.off('lobby:tables', onLobbyTables);
        socket.off('lobby:update', onLobbyTables);
      }
    };
  }, []);

  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <button className="btn-back" onClick={() => onNavigate('inicio')}>
          ← Volver
        </button>
        <h1 className="lobby-title">🎮 Mesas Disponibles</h1>
        <div className="lobby-stats">
          <span className="stat-badge">🟢 {tables.length} mesa{tables.length !== 1 ? 's' : ''} disponible{tables.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-message">Cargando mesas...</div>
      ) : tables.length === 0 ? (
        <div className="empty-message">
          <p>No hay mesas disponibles</p>
          <button onClick={() => onNavigate('crear')} className="btn-create-first">
            + Crear Primera Mesa
          </button>
        </div>
      ) : (
        <>
          {/* Scroll horizontal de mesas */}
          <div className="tables-scroll-container">
            <div className="tables-scroll">
              {tables.map(table => (
                (() => {
                  const currentPlayers = table.currentPlayers || 0;
                  const isFull = currentPlayers >= table.maxPlayers;
                  const buyIn = Number(table.bigBlind || 0) * 100;
                  const userChips = Number(user?.chips || 0);
                  const insufficientChips = buyIn > 0 && userChips < buyIn;
                  const disabled = isFull || insufficientChips;

                  return (
                <div key={table.id} className="table-card">
                  <div className="table-card-header">
                    <h3 className="table-name">
                      {table.isPrivate ? '🔒' : '🔓'} {table.name}
                    </h3>
                    <span className={`table-status ${table.status}`}>
                      {table.status === 'playing' ? '🎲 Jugando' : '⏳ Esperando'}
                    </span>
                  </div>

                  <div className="table-card-body">
                    {/* Mini mesa visual */}
                    <div className="mini-table">
                      <img src="/assets/images/mesa-poker.png" alt="Mesa" />
                      <div className="player-count">
                        {table.currentPlayers || 0}/{table.maxPlayers}
                      </div>
                    </div>

                    {/* Información */}
                    <div className="table-info">
                      <div className="info-row">
                        <span className="info-label">👥 Jugadores:</span>
                        <span className="info-value">{currentPlayers}/{table.maxPlayers}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">💰 Ciegas:</span>
                        <span className="info-value">{table.smallBlind}/{table.bigBlind}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">🎟️ Buy-in:</span>
                        <span className="info-value">{buyIn}</span>
                      </div>
                      {table.botsCount > 0 && (
                        <div className="info-row">
                          <span className="info-label">🤖 Bots:</span>
                          <span className="info-value">{table.botsCount}</span>
                        </div>
                      )}
                      <div className="info-row">
                        <span className="info-label">🔐 Tipo:</span>
                        <span className="info-value">{table.isPrivate ? 'Privada' : 'Pública'}</span>
                      </div>
                    </div>

                    {/* Botón unirse */}
                    <button 
                      className={`btn-join ${disabled ? 'disabled' : ''}`}
                      onClick={() => !disabled && onJoinTable(table)}
                      disabled={disabled}
                      title={insufficientChips ? `Necesitas ${buyIn} fichas para entrar` : undefined}
                    >
                      {isFull ? '🔒 Mesa Llena' : insufficientChips ? '💸 Fichas Insuficientes' : '▶ Unirse'}
                    </button>
                  </div>
                </div>
                  )
                })()
              ))}
            </div>
          </div>

          {/* Indicador de scroll */}
          <div className="scroll-hint">
            ← Desliza para ver más mesas →
          </div>
        </>
      )}
    </div>
  );
}

export default LobbyPage;
