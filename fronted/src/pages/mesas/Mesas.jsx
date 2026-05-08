import React, { useState, useEffect } from 'react';
import { tableAPI } from '../../servicios/api';
import { socketService } from '../../servicios/socketBase';
import { getGameInvitations, invitationsUpdateEvent } from '../../servicios/invitaciones';
import './Mesas.css';

function PaginaMesas({ onNavigate: alNavegar, onJoinTable: alUnirseMesa, user: usuario }) {
  // Estado del lobby (mesas, carga e invitaciones)
  const [mesas, setMesas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [invitaciones, setInvitaciones] = useState([]);

  // Efectos: mantener invitaciones sincronizadas en memoria
  useEffect(() => {
    const actualizarInvitaciones = () => {
      setInvitaciones(getGameInvitations());
    };

    actualizarInvitaciones();
    window.addEventListener(invitationsUpdateEvent, actualizarInvitaciones);
    return () => window.removeEventListener(invitationsUpdateEvent, actualizarInvitaciones);
  }, []);

  // Efectos: cargar mesas y suscribirse al lobby en tiempo real
  useEffect(() => {
    const cargarMesas = () => {
      setCargando(true);

      tableAPI.getAllTables().then(
        (respuesta) => {
          setMesas(respuesta.data || []);
        },
        (errorDeCarga) => {
          console.error('Error cargando mesas:', errorDeCarga);
        }
      ).then(() => {
        setCargando(false);
      });
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

  // Valores derivados: textos segun cantidad de mesas
  let sufijoMesa = 's';
  let sufijoDisponible = 's';
  if (mesas.length === 1) {
    sufijoMesa = '';
    sufijoDisponible = '';
  }

  let contenidoPrincipal = null;

  if (cargando) {
    contenidoPrincipal = <div className="loading-message">Cargando mesas...</div>;
  } else if (mesas.length === 0) {
    contenidoPrincipal = (
      <div className="empty-message">
        <p>No hay mesas disponibles</p>
        <button onClick={() => alNavegar('crear')} className="btn-create-first">
          + Crear Primera Mesa
        </button>
      </div>
    );
  } else {
    contenidoPrincipal = (
      <>
        {/* Scroll horizontal de mesas */}
        <div className="tables-scroll-container">
          <div className="tables-scroll">
            {mesas.map((mesa) => {
              const jugadoresActuales = mesa.currentPlayers || 0;
              const estaLlena = jugadoresActuales >= mesa.maxPlayers;
              const compraEntrada = Number(mesa.bigBlind || 0) * 100;
              const fichasUsuario = Number(usuario?.chips || 0);
              const fichasInsuficientes = compraEntrada > 0 && fichasUsuario < compraEntrada;
              const invitacionMesa = invitaciones.find((inv) => inv?.table?.id === mesa.id);
              const tokenInvitacion = invitacionMesa?.invitationToken || null;
              const requiereInvitacion = !!mesa.isPrivate && !tokenInvitacion;
              const deshabilitada = estaLlena || fichasInsuficientes || requiereInvitacion;

              let iconoMesa = '🔓';
              let tipoMesaTexto = 'Pública';
              if (mesa.isPrivate) {
                iconoMesa = '🔒';
                tipoMesaTexto = tokenInvitacion ? 'Privada (invitación)' : 'Privada';
              }

              let estadoMesaTexto = '⏳ Esperando';
              if (mesa.status === 'playing') {
                estadoMesaTexto = '🎲 Jugando';
              }

              let claseBotonUnirse = 'btn-join';
              if (deshabilitada) {
                claseBotonUnirse = 'btn-join disabled';
              }

              let tituloBotonUnirse;
              if (fichasInsuficientes) {
                tituloBotonUnirse = `Necesitas ${compraEntrada} fichas para entrar`;
              }
              if (requiereInvitacion) {
                tituloBotonUnirse = 'Necesitas una invitación para entrar';
              }

              let textoBotonUnirse = '▶ Unirse';
              if (estaLlena) {
                textoBotonUnirse = '🔒 Mesa Llena';
              } else if (fichasInsuficientes) {
                textoBotonUnirse = '💸 Fichas Insuficientes';
              } else if (requiereInvitacion) {
                textoBotonUnirse = '🔒 Solo invitación';
              }

              let filaBots = null;
              if (mesa.botsCount > 0) {
                filaBots = (
                  <div className="info-row">
                    <span className="info-label">🤖 Bots:</span>
                    <span className="info-value">{mesa.botsCount}</span>
                  </div>
                );
              }

              return (
                <div key={mesa.id} className="table-card">
                  <div className="table-card-header">
                    <h3 className="table-name">
                      {iconoMesa} {mesa.name}
                    </h3>
                    <span className={`table-status ${mesa.status}`}>
                      {estadoMesaTexto}
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
                      {filaBots}
                      <div className="info-row">
                        <span className="info-label">🔐 Tipo:</span>
                        <span className="info-value">{tipoMesaTexto}</span>
                      </div>
                    </div>

                    {/* Botón unirse */}
                    <button
                      className={claseBotonUnirse}
                      onClick={() => {
                        if (!deshabilitada) {
                          alUnirseMesa(mesa, tokenInvitacion).catch(() => {});
                        }
                      }}
                      disabled={deshabilitada}
                      title={tituloBotonUnirse}
                    >
                      {textoBotonUnirse}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Indicador de scroll */}
        <div className="scroll-hint">
          ← Desliza para ver más mesas →
        </div>
      </>
    );
  }

  // Render del lobby y tarjetas de mesas
  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <button className="btn-back" onClick={() => alNavegar('inicio')}>
          ← Volver
        </button>
        <h1 className="lobby-title">🎮 Mesas Disponibles</h1>
        <div className="lobby-stats">
          <span className="stat-badge">🟢 {mesas.length} mesa{sufijoMesa} disponible{sufijoDisponible}</span>
        </div>
      </div>

      {contenidoPrincipal}
    </div>
  );
}

export default PaginaMesas;
