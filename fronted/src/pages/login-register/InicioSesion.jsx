import React, { useState } from 'react';
import { authService } from '../../servicios/autenticacion';
import './InicioSesion.css';

function InicioSesion({ alIniciarSesionExito, alCambiarARegistro }) {
  // Estado del formulario: inputs, carga y mensaje de error
  const [identificador, setIdentificador] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorInicio, setErrorInicio] = useState('');

  // Handlers: login via authService y cambios de inputs
  const iniciarSesion = (identificadorLogin, contrasenaLogin, alFinalizar) => {
    authService.login(identificadorLogin, contrasenaLogin).then(
      (resultado) => {
        if (resultado.success) {
          if (alIniciarSesionExito) {
            alIniciarSesionExito(resultado.user);
          }
          return;
        }

        setErrorInicio(resultado.error || 'Error al iniciar sesión');
      },
      (errorDeConexion) => {
        console.error('Error en login:', errorDeConexion);
        setErrorInicio('Error de conexión con el servidor');
      }
    ).then(() => {
      if (alFinalizar) {
        alFinalizar();
      }
    });
  };

  const manejarEnvio = (evento) => {
    evento.preventDefault();
    setErrorInicio('');
    setCargando(true);

    iniciarSesion(identificador, contrasena, () => {
      setCargando(false);
    });
  };

  // Acceso rapido para pruebas con usuarios predefinidos
  const manejarLoginRapido = (numeroUsuario) => {
    setErrorInicio('');
    setCargando(true);

    const correoPrueba = `jugador${numeroUsuario}@pokerkings.com`;
    iniciarSesion(correoPrueba, 'password123', () => {
      setCargando(false);
    });
  };

  const manejarCambioIdentificador = (eventoIdentificador) => {
    setIdentificador(eventoIdentificador.target.value);
  };

  const manejarCambioContrasena = (eventoContrasena) => {
    setContrasena(eventoContrasena.target.value);
  };

  // Valores derivados: contenido del boton segun estado de carga
  let contenidoBoton = (
    <>
      <span>🎮</span>
      Iniciar Sesión
    </>
  );

  if (cargando) {
    contenidoBoton = (
      <>
        <span className="spinner"></span>
        Iniciando sesión...
      </>
    );
  }

  // Render de login con errores y accesos rapidos
  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo y titulo de la pantalla */}
        <div className="login-header">
          <img src="/assets/images/logo.png" alt="Poker Kings" className="login-logo" />
          <h2 className="login-title">🎰 Iniciar Sesión</h2>
          <p className="login-subtitle">Bienvenido de vuelta al casino</p>
        </div>

        {/* Mostrar error de autenticacion si existe */}
        {errorInicio && (
          <div className="login-error">
            <span className="error-icon">⚠️</span>
            <span>{errorInicio}</span>
          </div>
        )}

        <form onSubmit={manejarEnvio} className="login-form">
          {/* Campo de email o username */}
          <div className="form-group">
            <label htmlFor="identifier" className="form-label">
              <span className="label-icon">👤</span>
              Email o nombre de usuario
            </label>
            <input
              type="text"
              className="form-input"
              id="identifier"
              placeholder="correo@ejemplo.com o PokerKing123"
              value={identificador}
              onChange={manejarCambioIdentificador}
              required
              disabled={cargando}
              autoComplete="username"
            />
          </div>

          {/* Campo de contrasena */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              <span className="label-icon">🔒</span>
              Contraseña
            </label>
            <input
              type="password"
              className="form-input"
              id="password"
              placeholder="••••••••••••"
              value={contrasena}
              onChange={manejarCambioContrasena}
              required
              disabled={cargando}
            />
          </div>

          {/* Boton para enviar el login */}
          <button
            type="submit"
            className="btn-login"
            disabled={cargando}
          >
            {contenidoBoton}
          </button>
        </form>

        {/* Boton para ir a registro */}
        <div className="login-footer">
          <p className="footer-text">¿No tienes cuenta?</p>
          <button
            className="btn-register"
            onClick={alCambiarARegistro}
            disabled={cargando}
          >
            Crear Cuenta Nueva
          </button>
        </div>

        {/* Login rapido para pruebas locales */}
        <div className="quick-login">
          <div className="divider">
            <span>🧪 Pruebas rápidas:</span>
          </div>
          <div className="quick-login-buttons">
            <button
              className="btn-quick"
              onClick={() => manejarLoginRapido(1)}
              disabled={cargando}
            >
              Jugador 1
            </button>
            <button
              className="btn-quick"
              onClick={() => manejarLoginRapido(2)}
              disabled={cargando}
            >
              Jugador 2
            </button>
            <button
              className="btn-quick"
              onClick={() => manejarLoginRapido(3)}
              disabled={cargando}
            >
              Jugador 3
            </button>
          </div>
          <p className="quick-login-hint">
            (jugador1@pokerkings.com / password123)
          </p>
        </div>
      </div>
    </div>
  );
}

export default InicioSesion;
