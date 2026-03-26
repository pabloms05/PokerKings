import React, { useState } from 'react';
import './CrearMesa.css';

function CreateTablePage({ onNavigate, onCreate }) {
  const [formData, setFormData] = useState({
    tableName: '',
    maxPlayers: 6,
    bots: 0,
    smallBlind: 10,
    bigBlind: 20,
    isPrivate: true
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'tableName' ? value : parseInt(value)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.tableName.trim()) {
      onCreate(formData);
    }
  };

  return (
    <div className="create-table-page">
      <div className="create-container">
        <button className="btn-back" onClick={() => onNavigate('inicio')}>
          ← Volver
        </button>

        <h1 className="create-title">{formData.isPrivate ? '🔒' : '🔓'} Crear Mesa {formData.isPrivate ? 'Privada' : 'Pública'}</h1>
        <p className="create-subtitle">Configura tu mesa personalizada</p>

        <form onSubmit={handleSubmit} className="create-form">
          {/* Nombre de la mesa */}
          <div className="form-group">
            <label className="form-label">
              📝 Nombre de la Mesa
            </label>
            <input
              type="text"
              name="tableName"
              value={formData.tableName}
              onChange={handleChange}
              className="form-input"
              placeholder="Ej: Mesa de amigos"
              maxLength={50}
              required
            />
          </div>

          {/* Número de jugadores */}
          <div className="form-group">
            <label className="form-label">
              👥 Número de Jugadores
            </label>
            <div className="button-group">
              {[4, 6, 8].map(num => (
                <button
                  key={num}
                  type="button"
                  className={`btn-option ${formData.maxPlayers === num ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, maxPlayers: num }))}
                >
                  {num} jugadores
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de mesa: Pública/Privada */}
          <div className="form-group">
            <label className="form-label">
              🔒 Tipo de Mesa
            </label>
            <div className="button-group">
              <button
                type="button"
                className={`btn-option ${!formData.isPrivate ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, isPrivate: false }))}
              >
                🔓 Pública
              </button>
              <button
                type="button"
                className={`btn-option ${formData.isPrivate ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, isPrivate: true }))}
              >
                🔒 Privada
              </button>
            </div>
            <p className="form-hint">
              {formData.isPrivate 
                ? 'Solo jugadores invitados pueden unirse' 
                : 'Cualquiera puede unirse desde el lobby'}
            </p>
          </div>

          {/* Número de bots */}
          <div className="form-group">
            <label className="form-label">
              🤖 Número de Bots
            </label>
            <div className="slider-container">
              <input
                type="range"
                name="bots"
                min="0"
                max={formData.maxPlayers - 1}
                value={formData.bots}
                onChange={handleChange}
                className="form-slider"
              />
              <div className="slider-value">
                {formData.bots} bot{formData.bots !== 1 ? 's' : ''}
              </div>
            </div>
            <p className="form-hint">
              Los bots rellenarán asientos vacíos automáticamente
            </p>
          </div>

          {/* Ciegas */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                💰 Ciega Pequeña
              </label>
              <select
                name="smallBlind"
                value={formData.smallBlind}
                onChange={handleChange}
                className="form-select"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                💰 Ciega Grande
              </label>
              <select
                name="bigBlind"
                value={formData.bigBlind}
                onChange={handleChange}
                className="form-select"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
          </div>

          {/* Resumen */}
          <div className="summary-card">
            <h3 className="summary-title">📊 Resumen de Configuración</h3>
            <div className="summary-item">
              <span>Mesa:</span>
              <strong>{formData.tableName || 'Sin nombre'}</strong>
            </div>
            <div className="summary-item">
              <span>Tipo:</span>
              <strong>{formData.isPrivate ? '🔒 Privada' : '🔓 Pública'}</strong>
            </div>
            <div className="summary-item">
              <span>Jugadores:</span>
              <strong>{formData.maxPlayers} asientos</strong>
            </div>
            <div className="summary-item">
              <span>Bots:</span>
              <strong>{formData.bots}</strong>
            </div>
            <div className="summary-item">
              <span>Ciegas:</span>
              <strong>{formData.smallBlind}/{formData.bigBlind}</strong>
            </div>
          </div>

          {/* Botones */}
          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancel"
              onClick={() => onNavigate('inicio')}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-submit"
            >
              🎲 Crear Mesa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTablePage;
