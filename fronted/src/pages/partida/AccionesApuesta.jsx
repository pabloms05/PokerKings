import React, { useEffect, useState } from 'react';
import './AccionesApuesta.css';

function AccionesApuesta({
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
  // Valores derivados: limites seguros para apuestas y subida
  const fichasJugadorSeguras = Math.max(0, Number(fichasJugador) || 0);
  const apuestaActualSegura = Math.max(0, Number(apuestaActual) || 0);
  const subidaMinimaSegura = Math.max(0, Number(subidaMinima) || 0);

  let subidaPorDefecto = 1;
  if (apuestaActualSegura > 0) {
    subidaPorDefecto = apuestaActualSegura;
  }

  let subidaMinimaBase = subidaPorDefecto;
  if (subidaMinimaSegura > 0) {
    subidaMinimaBase = subidaMinimaSegura;
  }

  const subidaMinimaPermitida = Math.min(fichasJugadorSeguras, subidaMinimaBase);
  const subidaMaximaPermitida = fichasJugadorSeguras;

  // Estado local del slider de subida y monto seleccionado
  const [montoSubida, setMontoSubida] = useState(subidaMinimaPermitida);
  const [mostrarSliderSubida, setMostrarSliderSubida] = useState(false);

  // Efectos: mantener monto dentro de limites al cambiar props
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

  // Handlers: ajustar monto y ejecutar acciones de apuesta
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

  // Valores derivados de UI: clases y tooltips segun estado
  let claseContenedorAcciones = 'betting-actions-container';
  if (!esTurnoJugador) {
    claseContenedorAcciones = 'betting-actions-container disabled';
  }

  let tituloFold = 'No ir';
  if (!puedeRetirarse) {
    tituloFold = 'No puedes hacer fold ahora';
  }

  let tituloCheck = 'Pasar sin apostar';
  if (!puedePasar) {
    tituloCheck = 'No puedes pasar, debes igualar la apuesta';
  }

  let tituloCall = 'Igualar';
  if (!puedeIgualar) {
    tituloCall = 'No puedes igualar ahora';
  }

  let tituloRaise = 'Subir';
  if (!puedeSubir) {
    tituloRaise = 'No puedes subir ahora';
  }

  let botonAllIn = null;
  if (fichasJugador > 0) {
    botonAllIn = (
      <button className="btn-action btn-allin" onClick={manejarAllIn}>
        🔥 All-In
      </button>
    );
  }

  // Render de acciones, slider y temporizador
  return (
    <div className={claseContenedorAcciones}>
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

      {/* Barra de botones siempre visible, incluso cuando no es tu turno */}
      <div className="action-buttons" style={{ display: 'flex', position: 'relative', zIndex: 50 }}>
          {/* Boton 1: retirar la mano (fold) y abandonar la apuesta */}
          <button
            className="btn-action btn-fold"
            onClick={alRetirarse}
            disabled={!esTurnoJugador || !puedeRetirarse}
            title={tituloFold}
          >
            🚫 No ir
          </button>
          
          {/* Boton 2: pasar sin apostar si la regla lo permite */}
          <button 
            className="btn-action btn-check" 
            onClick={alPasar}
            disabled={!esTurnoJugador || !puedePasar}
            title={tituloCheck}
          >
            ✅ Pasar
          </button>
          
          {/* Boton 3: igualar la apuesta actual (call) */}
          <button
            className="btn-action btn-call"
            onClick={alIgualar}
            disabled={!esTurnoJugador || !puedeIgualar}
            title={tituloCall}
          >
            💵 Igualar {apuestaActual.toLocaleString()} PK
          </button>
          
          {/* Boton 4: abrir slider para subir la apuesta */}
          <button
            className="btn-action btn-raise"
            onClick={() => {
              setMontoSubida(subidaMinimaPermitida);
              setMostrarSliderSubida(true);
            }}
            disabled={!esTurnoJugador || !puedeSubir}
            title={tituloRaise}
          >
            💸 Subir
          </button>
        </div>

      {/* Slider de subida: elige monto dentro de limites */}
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
              onChange={(eventoSlider) => setMontoSubida(parseInt(eventoSlider.target.value, 10))}
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
            {botonAllIn}
            <button className="btn-action btn-confirm" onClick={manejarSubida}>
              ✅ Confirmar Subida
            </button>
          </div>
        </div>
      )}

      <div className="turn-timer">
        <div className="timer-label">⏱️ Tiempo restante</div>
        <div className="timer-bar">
          {/* Timer dinamico: muestra porcentaje de tiempo restante */}
          <div 
            className="timer-fill" 
            style={{ width: `${(Math.max(0, tiempoRestanteTurno) / 45) * 100}%` }}
          ></div>
        </div>
        <div className="timer-seconds">{tiempoRestanteTurno}s</div>
      </div>
    </div>
  );
}

export default AccionesApuesta;
