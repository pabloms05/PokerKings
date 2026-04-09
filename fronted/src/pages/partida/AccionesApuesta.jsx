import React, { useEffect, useState } from 'react';
import './AccionesApuesta.css';

// FIX: Memoizacion para evitar re-renders innecesarios
const AccionesApuesta = React.memo(function AccionesApuesta({
  playerChips: fichasJugador = 0,
  currentBet: apuestaActual = 0,
  minRaise: subidaMinima = 0,
  pot: bote = 0,
  isPlayerTurn: esTurnoJugador = false,
  canCheck: puedePasar = false,
  canCall: puedeIgualar = false,
  canRaise: puedeSubir = false,
  canFold: puedeRetirarse = false,
  turnTimeRemaining: tiempoRestanteTurno = 45, // FIX: Recibir tiempo restante como prop
  onFold: alRetirarse,
  onCheck: alPasar,
  onCall: alIgualar,
  onRaise: alSubir,
  onAllIn: alIrAllIn
}) {
  const fichasJugadorSeguras = Math.max(0, Number(fichasJugador) || 0);
  const apuestaActualSegura = Math.max(0, Number(apuestaActual) || 0);
  const subidaMinimaSegura = Math.max(0, Number(subidaMinima) || 0);
  const subidaPorDefecto = apuestaActualSegura > 0 ? apuestaActualSegura : 1;
  const subidaMinimaPermitida = Math.min(fichasJugadorSeguras, subidaMinimaSegura > 0 ? subidaMinimaSegura : subidaPorDefecto);
  const subidaMaximaPermitida = fichasJugadorSeguras;
  const [montoSubida, setMontoSubida] = useState(subidaMinimaPermitida);
  const [mostrarSliderSubida, setMostrarSliderSubida] = useState(false);

  useEffect(() => {
    setMontoSubida((previo) => {
      if (previo < subidaMinimaPermitida) return subidaMinimaPermitida;
      if (previo > subidaMaximaPermitida) return subidaMaximaPermitida;
      return previo;
    });
  }, [subidaMinimaPermitida, subidaMaximaPermitida]);

  useEffect(() => {
    if (mostrarSliderSubida) {
      setMontoSubida(subidaMinimaPermitida);
    }
  }, [mostrarSliderSubida, subidaMinimaPermitida]);

  const disminuirMontoSubida = () => {
    setMontoSubida((previo) => Math.max(subidaMinimaPermitida, previo - 1));
  };

  const aumentarMontoSubida = () => {
    setMontoSubida((previo) => Math.min(subidaMaximaPermitida, previo + 1));
  };

  const manejarSubida = () => {
    if (!esTurnoJugador || !puedeSubir || montoSubida <= 0) {
      return;
    }

    if (montoSubida >= subidaMinimaPermitida && montoSubida <= subidaMaximaPermitida) {
      alSubir(montoSubida);
      setMostrarSliderSubida(false);
      setMontoSubida(subidaMinimaPermitida);
    }
  };

  const manejarAllIn = () => {
    alIrAllIn(fichasJugador);
  };

  return (
    <div className={`betting-actions-container${!esTurnoJugador ? ' disabled' : ''}`}>
      {!esTurnoJugador && (
        <div className="waiting-turn">
          <span className="waiting-icon">⏳</span>
          <span>Esperando tu turno...</span>
        </div>
      )}
      <div className="betting-info">
        <div className="info-item">
          <span className="info-label">💰 Bote:</span>
          <span className="info-value">{bote.toLocaleString()} PK</span>
        </div>
        <div className="info-item">
          <span className="info-label">💵 Apuesta actual:</span>
          <span className="info-value">{apuestaActual.toLocaleString()} PK</span>
        </div>
        <div className="info-item">
          <span className="info-label">🪙 Tus fichas:</span>
          <span className="info-value">{fichasJugador.toLocaleString()} PK</span>
        </div>
      </div>

      {/* Barra de botones SIEMPRE VISIBLE */}
      <div className="action-buttons" style={{ display: 'flex', position: 'relative', zIndex: 50 }}>
          {/* Botón 1: No ir (Fold) */}
          <button
            className="btn-action btn-fold"
            onClick={alRetirarse}
            disabled={!esTurnoJugador || !puedeRetirarse}
            title={!puedeRetirarse ? 'No puedes hacer fold ahora' : 'No ir'}
          >
            🚫 No ir
          </button>
          
          {/* Botón 2: Pasar (Check) - SIEMPRE VISIBLE */}
          <button 
            className="btn-action btn-check" 
            onClick={alPasar}
            disabled={!esTurnoJugador || !puedePasar}
            title={!puedePasar ? "No puedes pasar, debes igualar la apuesta" : "Pasar sin apostar"}
          >
            ✅ Pasar
          </button>
          
          {/* Botón 3: Igualar (Call) */}
          <button
            className="btn-action btn-call"
            onClick={alIgualar}
            disabled={!esTurnoJugador || !puedeIgualar}
            title={!puedeIgualar ? 'No puedes igualar ahora' : 'Igualar'}
          >
            💵 Igualar {apuestaActual.toLocaleString()} PK
          </button>
          
          {/* Botón 4: Subir (Raise) */}
          <button
            className="btn-action btn-raise"
            onClick={() => {
              setMontoSubida(subidaMinimaPermitida);
              setMostrarSliderSubida(true);
            }}
            disabled={!esTurnoJugador || !puedeSubir}
            title={!puedeSubir ? 'No puedes subir ahora' : 'Subir'}
          >
            💸 Subir
          </button>
        </div>

      {/* Slider de subida */}
      {mostrarSliderSubida && (
        <div className="raise-slider-container">
          <div className="slider-header">
            <span>💸 Cantidad a subir</span>
            <button className="btn-close-slider" onClick={() => setMostrarSliderSubida(false)}>✕</button>
          </div>
          <div className="slider-amount">
            <span className="amount-label">Monto:</span>
            <span className="amount-value">{montoSubida.toLocaleString()} PK</span>
          </div>
          <div className="raise-slider-controls">
            <button
              type="button"
              className="slider-step-btn"
              onClick={disminuirMontoSubida}
              disabled={montoSubida <= subidaMinimaPermitida}
              aria-label="Disminuir apuesta"
            >
              -
            </button>
            <input
              type="range"
              min={subidaMinimaPermitida}
              max={subidaMaximaPermitida}
              step={1}
              value={montoSubida}
              onChange={(e) => setMontoSubida(parseInt(e.target.value, 10))}
              className="raise-slider"
            />
            <button
              type="button"
              className="slider-step-btn"
              onClick={aumentarMontoSubida}
              disabled={montoSubida >= subidaMaximaPermitida}
              aria-label="Aumentar apuesta"
            >
              +
            </button>
          </div>
          <div className="slider-limits">
            <span>Min: {subidaMinimaPermitida.toLocaleString()}</span>
            <span>Max: {subidaMaximaPermitida.toLocaleString()}</span>
          </div>
          <div className="slider-actions">
            <button className="btn-action btn-cancel" onClick={() => setMostrarSliderSubida(false)}>
              Cancelar
            </button>
            {fichasJugador > 0 && (
              <button className="btn-action btn-allin" onClick={manejarAllIn}>
                🔥 All-In
              </button>
            )}
            <button className="btn-action btn-confirm" onClick={manejarSubida}>
              ✅ Confirmar Subida
            </button>
          </div>
        </div>
      )}

      <div className="turn-timer">
        <div className="timer-label">⏱️ Tiempo restante</div>
        <div className="timer-bar">
          {/* FIX: Timer dinámico basado en turnTimeRemaining */}
          <div 
            className="timer-fill" 
            style={{ width: `${(Math.max(0, tiempoRestanteTurno) / 45) * 100}%` }}
          ></div>
        </div>
        <div className="timer-seconds">{tiempoRestanteTurno}s</div>
      </div>
    </div>
  );
});

export default AccionesApuesta;
