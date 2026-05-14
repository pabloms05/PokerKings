import React from 'react';
import './Inicio.css';

function PaginaInicio({ onNavigate: alNavegar, user }) {
  // Valores derivados: calcula progreso, nivel y experiencia actual
  const chips = Number(user?.chips) || 0;
  const level = Math.max(1, Number(user?.level) || 1);
  const experience = Math.max(0, Number(user?.experience) || 0);

  const experienceMinLevel = (level - 1) * 1000;
  const experienceNextLevel = level * 1000;
  const experienceInCurrentLevel = Math.max(0, experience - experienceMinLevel);
  const experienceRequired = Math.max(1, experienceNextLevel - experienceMinLevel);
  const progressPercent = Math.max(0, Math.min(100, (experienceInCurrentLevel / experienceRequired) * 100));

  // Helpers: formatea numeros para mostrar fichas y XP
  const formatNumber = (value) => Number(value || 0).toLocaleString('es-ES');

  // Render de inicio con acciones principales y panel de progreso
  return (
    <div className="home-page">
      <div className="home-content">
        <h1 className="home-title"></h1>

        <div className="home-actions-container">
          <div className="home-buttons">
            <button 
              className="btn btn-home btn-play"
              onClick={() => alNavegar('mesas')}
            >
              <span className="btn-icon">🎮</span>
              <span className="btn-text">Jugar</span>
            </button>
            
            <button 
              className="btn btn-home btn-create"
              onClick={() => alNavegar('crear')}
            >
              <span className="btn-icon">🔒</span>
              <span className="btn-text">Crear Mesa</span>
            </button>
          </div>
        </div>

      </div>

      <aside className="home-player-stats" aria-label="Progreso del jugador">
        <div className="home-player-stats-title">Tu progreso</div>
        <div className="home-player-stats-row">
          <span className="home-player-stats-label">Dinero</span>
          <span className="home-player-stats-value">💰 {formatNumber(chips)}</span>
        </div>
        <div className="home-player-stats-row">
          <span className="home-player-stats-label">Nivel</span>
          <span className="home-player-stats-level">{level}</span>
        </div>
        <div className="home-player-stats-progress-header">
          <span>Experiencia</span>
          <span>{formatNumber(experienceInCurrentLevel)} / {formatNumber(experienceRequired)} XP</span>
        </div>
        <div className="home-player-stats-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={experienceRequired} aria-valuenow={experienceInCurrentLevel}>
          <div className="home-player-stats-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </aside>
    </div>
  );
}

export default PaginaInicio;
