import React, { useEffect, useState } from 'react';
import './AccionesApuesta.css';

// FIX: Memoización para evitar re-renders innecesarios
const BettingActions = React.memo(function BettingActions({ 
  playerChips = 0, 
  currentBet = 0, 
  minRaise = 0,
  pot = 0,
  isPlayerTurn = false,
  canCheck = false,
  canCall = false,
  canRaise = false,
  canFold = false,
  turnTimeRemaining = 45, // FIX: Recibir tiempo restante como prop
  onFold,
  onCheck,
  onCall,
  onRaise,
  onAllIn
}) {
  const minAllowedRaise = Math.max(0, Math.min(minRaise, playerChips));
  const maxAllowedRaise = Math.max(minAllowedRaise, playerChips);
  const [raiseAmount, setRaiseAmount] = useState(minAllowedRaise);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);

  useEffect(() => {
    setRaiseAmount((prev) => {
      if (prev < minAllowedRaise) return minAllowedRaise;
      if (prev > maxAllowedRaise) return maxAllowedRaise;
      return prev;
    });
  }, [minAllowedRaise, maxAllowedRaise]);

  const decreaseRaiseAmount = () => {
    setRaiseAmount((prev) => Math.max(minAllowedRaise, prev - 1));
  };

  const increaseRaiseAmount = () => {
    setRaiseAmount((prev) => Math.min(maxAllowedRaise, prev + 1));
  };

  const handleRaise = () => {
    if (raiseAmount >= minAllowedRaise && raiseAmount <= maxAllowedRaise) {
      onRaise(raiseAmount);
      setShowRaiseSlider(false);
      setRaiseAmount(minAllowedRaise);
    }
  };

  const handleAllIn = () => {
    onAllIn(playerChips);
  };

  console.log('🎮 BettingActions Render:', { isPlayerTurn, canCheck, canCall, canRaise, canFold });

  return (
    <div className={`betting-actions-container${!isPlayerTurn ? ' disabled' : ''}`}>
      {!isPlayerTurn && (
        <div className="waiting-turn">
          <span className="waiting-icon">⏳</span>
          <span>Esperando tu turno...</span>
        </div>
      )}
      <div className="betting-info">
        <div className="info-item">
          <span className="info-label">💰 Bote:</span>
          <span className="info-value">{pot.toLocaleString()} PK</span>
        </div>
        <div className="info-item">
          <span className="info-label">💵 Apuesta actual:</span>
          <span className="info-value">{currentBet.toLocaleString()} PK</span>
        </div>
        <div className="info-item">
          <span className="info-label">🪙 Tus fichas:</span>
          <span className="info-value">{playerChips.toLocaleString()} PK</span>
        </div>
      </div>

      {/* Barra de botones SIEMPRE VISIBLE */}
      <div className="action-buttons" style={{ display: 'flex', position: 'relative', zIndex: 50 }}>
          {/* Botón 1: No ir (Fold) */}
          <button
            className="btn-action btn-fold"
            onClick={onFold}
            disabled={!isPlayerTurn || !canFold}
            title={!canFold ? 'No puedes hacer fold ahora' : 'No ir'}
          >
            🚫 No ir
          </button>
          
          {/* Botón 2: Pasar (Check) - SIEMPRE VISIBLE */}
          <button 
            className="btn-action btn-check" 
            onClick={onCheck}
            disabled={!isPlayerTurn || !canCheck}
            title={!canCheck ? "No puedes pasar, debes igualar la apuesta" : "Pasar sin apostar"}
          >
            ✅ Pasar
          </button>
          
          {/* Botón 3: Igualar (Call) */}
          <button
            className="btn-action btn-call"
            onClick={onCall}
            disabled={!isPlayerTurn || !canCall}
            title={!canCall ? 'No puedes igualar ahora' : 'Igualar'}
          >
            💵 Igualar {currentBet.toLocaleString()} PK
          </button>
          
          {/* Botón 4: Subir (Raise) */}
          <button
            className="btn-action btn-raise"
            onClick={() => setShowRaiseSlider(true)}
            disabled={!isPlayerTurn || !canRaise}
            title={!canRaise ? 'No puedes subir ahora' : 'Subir'}
          >
            💸 Subir
          </button>
        </div>

      {/* Slider de subida */}
      {showRaiseSlider && (
        <div className="raise-slider-container">
          <div className="slider-header">
            <span>💸 Cantidad a subir</span>
            <button className="btn-close-slider" onClick={() => setShowRaiseSlider(false)}>✕</button>
          </div>
          <div className="slider-amount">
            <span className="amount-label">Monto:</span>
            <span className="amount-value">{raiseAmount.toLocaleString()} PK</span>
          </div>
          <div className="raise-slider-controls">
            <button
              type="button"
              className="slider-step-btn"
              onClick={decreaseRaiseAmount}
              disabled={raiseAmount <= minRaise}
              aria-label="Disminuir apuesta"
            >
              -
            </button>
            <input
              type="range"
              min={minAllowedRaise}
              max={maxAllowedRaise}
              step={1}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(parseInt(e.target.value, 10))}
              className="raise-slider"
            />
            <button
              type="button"
              className="slider-step-btn"
              onClick={increaseRaiseAmount}
              disabled={raiseAmount >= maxAllowedRaise}
              aria-label="Aumentar apuesta"
            >
              +
            </button>
          </div>
          <div className="slider-limits">
            <span>Min: {minAllowedRaise.toLocaleString()}</span>
            <span>Max: {maxAllowedRaise.toLocaleString()}</span>
          </div>
          <div className="slider-actions">
            <button className="btn-action btn-cancel" onClick={() => setShowRaiseSlider(false)}>
              Cancelar
            </button>
            {playerChips > 0 && (
              <button className="btn-action btn-allin" onClick={handleAllIn}>
                🔥 All-In
              </button>
            )}
            <button className="btn-action btn-confirm" onClick={handleRaise}>
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
            style={{ width: `${(Math.max(0, turnTimeRemaining) / 45) * 100}%` }}
          ></div>
        </div>
        <div className="timer-seconds">{turnTimeRemaining}s</div>
      </div>
    </div>
  );
});

export default BettingActions;
