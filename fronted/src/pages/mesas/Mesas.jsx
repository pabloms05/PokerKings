import React, { useState, useEffect } from 'react';
import { tableAPI } from '../../servicios/api';
import { socketService } from '../../servicios/socketBase';
import './Mesas.css';

function PaginaMesas({ onNavigate: alNavegar, onJoinTable: alUnirseMesa, user: usuario }) {
  const [mesas, setMesas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Cargar mesas desde el backend
  useEffect(() => {
    const cargarMesas = async () => {
      try {
        const respuesta = await tableAPI.getAllTables();
        setMesas(respuesta.data || []);
      } catch (err) {
        console.error('Error cargando mesas:', err);
      } finally {
        setCargando(false);
      }
    };
    
    cargarMesas();

    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const socket = socketService.getSocket() || socketService.connect(token);

    const alMesasLobby = (mesasEntrantes) => {
      setMesas(mesasEntrantes || []);
      setCargando(false);
    };

    if (socket) {
      socket.emit('lobby:join');
      socket.on('lobby:tables', alMesasLobby);
      socket.on('lobby:update', alMesasLobby);
    }
    
    return () => {
      if (socket) {
        socket.emit('lobby:leave');
        socket.off('lobby:tables', alMesasLobby);
        socket.off('lobby:update', alMesasLobby);
      }
    };
  }, []);

  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <button className="btn-back" onClick={() => alNavegar('inicio')}>
          ← Volver
        </button>
        <h1 className="lobby-title">🎮 Mesas Disponibles</h1>
        <div className="lobby-stats">
          <span className="stat-badge">🟢 {mesas.length} mesa{mesas.length !== 1 ? 's' : ''} disponible{mesas.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {cargando ? (
        <div className="loading-message">Cargando mesas...</div>
      ) : mesas.length === 0 ? (
        <div className="empty-message">
          <p>No hay mesas disponibles</p>
          <button onClick={() => alNavegar('crear')} className="btn-create-first">
            + Crear Primera Mesa
          </button>
        </div>
      ) : (
        <>
          {/* Scroll horizontal de mesas */}
          <div className="tables-scroll-container">
            <div className="tables-scroll">
              {mesas.map((mesa) => (
                (() => {
                  const jugadoresActuales = mesa.currentPlayers || 0;
                  const estaLlena = jugadoresActuales >= mesa.maxPlayers;
                  const compraEntrada = Number(mesa.bigBlind || 0) * 100;
                  const fichasUsuario = Number(usuario?.chips || 0);
                  const fichasInsuficientes = compraEntrada > 0 && fichasUsuario < compraEntrada;
                  const deshabilitada = estaLlena || fichasInsuficientes;

                  return (
                <div key={mesa.id} className="table-card">
                  <div className="table-card-header">
                    <h3 className="table-name">
                      {mesa.isPrivate ? '🔒' : '🔓'} {mesa.name}
                    </h3>
                    <span className={`table-status ${mesa.status}`}>
                      {mesa.status === 'playing' ? '🎲 Jugando' : '⏳ Esperando'}
                    </span>
                  </div>

                  <div className="table-card-body">
                    {/* Mini mesa visual */}
                    <div className="mini-table">
                      <img src="/assets/images/mesa-poker.png" alt="Mesa" />
                      <div className="player-count">
                        {mesa.currentPlayers || 0}/{mesa.maxPlayers}
                      </div>
                    </div>

                    {/* Información */}
                    <div className="table-info">
                      <div className="info-row">
                        <span className="info-label">👥 Jugadores:</span>
                        <span className="info-value">{jugadoresActuales}/{mesa.maxPlayers}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">💰 Ciegas:</span>
                        <span className="info-value">{mesa.smallBlind}/{mesa.bigBlind}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">🎟️ Buy-in:</span>
                        <span className="info-value">{compraEntrada}</span>
                      </div>
                      {mesa.botsCount > 0 && (
                        <div className="info-row">
                          <span className="info-label">🤖 Bots:</span>
                          <span className="info-value">{mesa.botsCount}</span>
                        </div>
                      )}
                      <div className="info-row">
                        <span className="info-label">🔐 Tipo:</span>
                        <span className="info-value">{mesa.isPrivate ? 'Privada' : 'Pública'}</span>
                      </div>
                    </div>

                    {/* Botón unirse */}
                    <button 
                      className={`btn-join ${deshabilitada ? 'disabled' : ''}`}
                      onClick={() => !deshabilitada && alUnirseMesa(mesa)}
                      disabled={deshabilitada}
                      title={fichasInsuficientes ? `Necesitas ${compraEntrada} fichas para entrar` : undefined}
                    >
                      {estaLlena ? '🔒 Mesa Llena' : fichasInsuficientes ? '💸 Fichas Insuficientes' : '▶ Unirse'}
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

export default PaginaMesas;
