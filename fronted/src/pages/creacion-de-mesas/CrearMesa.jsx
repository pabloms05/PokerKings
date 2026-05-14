import React, { useState } from 'react';
import './CrearMesa.css';

function PaginaCrearMesa({ onNavigate: alNavegar, onCreate: alCrear }) {
  // Estado del formulario de creacion: nombre, blinds, bots y privacidad
  const [datosFormulario, setDatosFormulario] = useState({
    nombreMesa: '',
    maximoJugadores: 6,
    ciegaPequena: 10,
    ciegaGrande: 20,
    esPrivada: true
  });

  // Valores derivados para etiquetas, iconos y texto de ayuda segun privacidad
  const iconoTipoMesa = datosFormulario.esPrivada ? '🔒' : '🔓';
  const textoTipoMesa = datosFormulario.esPrivada ? 'Privada' : 'Pública';
  const textoAyudaTipo = datosFormulario.esPrivada
    ? 'Solo jugadores invitados pueden unirse'
    : 'Cualquiera puede unirse desde el lobby';

  // Helpers: clases activas para botones de opciones
  const obtenerClaseBotonOpcion = (esActivo) => (
    esActivo ? 'btn-option active' : 'btn-option'
  );

  // Handlers: actualiza estado y envia datos al crear
  const manejarCambio = (evento) => {
    const { name, value } = evento.target;

    let valorProcesado = value;
    if (name !== 'nombreMesa') {
      valorProcesado = parseInt(value, 10);
    }

    setDatosFormulario((previo) => ({
      ...previo,
      [name]: valorProcesado
    }));
  };

  const manejarEnvio = (evento) => {
    evento.preventDefault();
    if (!datosFormulario.nombreMesa.trim()) return;

    alCrear({
      tableName: datosFormulario.nombreMesa,
      maxPlayers: datosFormulario.maximoJugadores,
      smallBlind: datosFormulario.ciegaPequena,
      bigBlind: datosFormulario.ciegaGrande,
      isPrivate: datosFormulario.esPrivada
    });
  };

  // Render del formulario, resumen y botones de accion
  return (
    <div className="create-table-page">
      <div className="create-container">
        <button className="btn-back" onClick={() => alNavegar('inicio')}>
          ← Volver
        </button>

        <h1 className="create-title">{iconoTipoMesa} Crear Mesa {textoTipoMesa}</h1>
        <p className="create-subtitle">Configura tu mesa personalizada</p>

        <form onSubmit={manejarEnvio} className="create-form">
          {/* Nombre de la mesa y validaciones basicas */}
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

          {/* Numero de jugadores disponible (4/6/8) */}
          <div className="form-group">
            <label className="form-label">
              👥 Número de Jugadores
            </label>
            <div className="button-group">
              {[4, 6, 8].map(num => (
                <button
                  key={num}
                  type="button"
                  className={obtenerClaseBotonOpcion(datosFormulario.maximoJugadores === num)}
                  onClick={() => setDatosFormulario((previo) => ({ ...previo, maximoJugadores: num }))}
                >
                  {num} jugadores
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de mesa: publica o privada, actualiza mensaje */}
          <div className="form-group">
            <label className="form-label">
              🔒 Tipo de Mesa
            </label>
            <div className="button-group">
              <button
                type="button"
                className={obtenerClaseBotonOpcion(!datosFormulario.esPrivada)}
                onClick={() => setDatosFormulario((previo) => ({ ...previo, esPrivada: false }))}
              >
                🔓 Pública
              </button>
              <button
                type="button"
                className={obtenerClaseBotonOpcion(datosFormulario.esPrivada)}
                onClick={() => setDatosFormulario((previo) => ({ ...previo, esPrivada: true }))}
              >
                🔒 Privada
              </button>
            </div>
            <p className="form-hint">
              {textoAyudaTipo}
            </p>
          </div>

          {/* Ciegas: seleccion de small/big blind */}
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

          {/* Resumen de configuracion antes de crear */}
          <div className="summary-card">
            <h3 className="summary-title">📊 Resumen de Configuración</h3>
            <div className="summary-item">
              <span>Mesa:</span>
              <strong>{datosFormulario.nombreMesa || 'Sin nombre'}</strong>
            </div>
            <div className="summary-item">
              <span>Tipo:</span>
              <strong>{iconoTipoMesa} {textoTipoMesa}</strong>
            </div>
            <div className="summary-item">
              <span>Jugadores:</span>
              <strong>{datosFormulario.maximoJugadores} asientos</strong>
            </div>
            <div className="summary-item">
              <span>Ciegas:</span>
              <strong>{datosFormulario.ciegaPequena}/{datosFormulario.ciegaGrande}</strong>
            </div>
          </div>

          {/* Botones: cancelar o crear mesa */}
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
