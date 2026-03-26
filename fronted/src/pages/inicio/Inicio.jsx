import React from 'react';
import './Inicio.css';

function HomePage({ onNavigate }) {
  return (
    <div className="home-page">
      <div className="home-content">
        <h1 className="home-title">🎰 Poker Kings</h1>
        <p className="home-subtitle">La mejor experiencia de poker online</p>

        {/* Mesa de poker central */}
        <div className="home-table-container">
          <img 
            src="/assets/images/mesa-poker.png" 
            alt="Mesa de Poker" 
            className="home-table-image"
          />
          
          {/* Botones sobre la mesa */}
          <div className="home-buttons">
            <button 
              className="btn btn-home btn-play"
              onClick={() => onNavigate('mesas')}
            >
              <span className="btn-icon">🎮</span>
              <span className="btn-text">Jugar</span>
            </button>
            
            <button 
              className="btn btn-home btn-create"
              onClick={() => onNavigate('crear')}
            >
              <span className="btn-icon">🔒</span>
              <span className="btn-text">Crear Mesa</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default HomePage;
