import React, { useState } from 'react';
import './CrearMesa.css';

function PaginaCrearMesa({ onNavigate: alNavegar, onCreate: alCrear }) {
  const [datosFormulario, setDatosFormulario] = useState({
    nombreMesa: '',
    maximoJugadores: 6,
    bots: 0,
    ciegaPequena: 10,
    ciegaGrande: 20,
    esPrivada: true
  });

  const manejarCambio = (evento) => {
    const { name, value } = evento.target;
    setDatosFormulario((previo) => ({
      ...previo,
      [name]: name === 'nombreMesa' ? value : parseInt(value, 10)
    }));
  };

  const manejarEnvio = (evento) => {
    evento.preventDefault();
    if (datosFormulario.nombreMesa.trim()) {
      alCrear({
        tableName: datosFormulario.nombreMesa,
        maxPlayers: datosFormulario.maximoJugadores,
        bots: datosFormulario.bots,
        smallBlind: datosFormulario.ciegaPequena,
        bigBlind: datosFormulario.ciegaGrande,
        isPrivate: datosFormulario.esPrivada
      });
    }
  };

  return (
    <div className="create-table-page">
      <div className="create-container">
        <button className="btn-back" onClick={() => alNavegar('inicio')}>
          ← Volver
        </button>

        <h1 className="create-title">{datosFormulario.esPrivada ? '🔒' : '🔓'} Crear Mesa {datosFormulario.esPrivada ? 'Privada' : 'Pública'}</h1>
        <p className="create-subtitle">Configura tu mesa personalizada</p>

        <form onSubmit={manejarEnvio} className="create-form">
          {/* Nombre de la mesa */}
          <div className="form-group">
            <label className="form-label">
              📝 Nombre de la Mesa
            </label>
            <input
              type="text"
              name="nombreMesa"
              value={datosFormulario.nombreMesa}
              onChange={manejarCambio}
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
                  className={`btn-option ${datosFormulario.maximoJugadores === num ? 'active' : ''}`}
                  onClick={() => setDatosFormulario((previo) => ({ ...previo, maximoJugadores: num }))}
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
                className={`btn-option ${!datosFormulario.esPrivada ? 'active' : ''}`}
                onClick={() => setDatosFormulario((previo) => ({ ...previo, esPrivada: false }))}
              >
                🔓 Pública
              </button>
              <button
                type="button"
                className={`btn-option ${datosFormulario.esPrivada ? 'active' : ''}`}
                onClick={() => setDatosFormulario((previo) => ({ ...previo, esPrivada: true }))}
              >
                🔒 Privada
              </button>
            </div>
            <p className="form-hint">
              {datosFormulario.esPrivada
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
                max={datosFormulario.maximoJugadores - 1}
                value={datosFormulario.bots}
                onChange={manejarCambio}
                className="form-slider"
              />
              <div className="slider-value">
                {datosFormulario.bots} bot{datosFormulario.bots !== 1 ? 's' : ''}
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
                name="ciegaPequena"
                value={datosFormulario.ciegaPequena}
                onChange={manejarCambio}
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
                name="ciegaGrande"
                value={datosFormulario.ciegaGrande}
                onChange={manejarCambio}
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
              <strong>{datosFormulario.nombreMesa || 'Sin nombre'}</strong>
            </div>
            <div className="summary-item">
              <span>Tipo:</span>
              <strong>{datosFormulario.esPrivada ? '🔒 Privada' : '🔓 Pública'}</strong>
            </div>
            <div className="summary-item">
              <span>Jugadores:</span>
              <strong>{datosFormulario.maximoJugadores} asientos</strong>
            </div>
            <div className="summary-item">
              <span>Bots:</span>
              <strong>{datosFormulario.bots}</strong>
            </div>
            <div className="summary-item">
              <span>Ciegas:</span>
              <strong>{datosFormulario.ciegaPequena}/{datosFormulario.ciegaGrande}</strong>
            </div>
          </div>

          {/* Botones */}
          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancel"
              onClick={() => alNavegar('inicio')}
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

export default PaginaCrearMesa;
