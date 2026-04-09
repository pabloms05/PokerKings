import React, { useState } from 'react';
import { authService } from '../../servicios/autenticacion';
import './InicioSesion.css';

function InicioSesion({ alIniciarSesionExito, alCambiarARegistro }) {
  const [identificador, setIdentificador] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorInicio, setErrorInicio] = useState('');

  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    setErrorInicio('');
    setCargando(true);

    try {
      // Llamar al servicio de autenticación
      const resultado = await authService.login(identificador, contrasena);

      if (resultado.success) {
        console.log('✅ Login exitoso:', resultado.user);
        // Notificar al componente padre
        if (alIniciarSesionExito) {
          alIniciarSesionExito(resultado.user);
        }
      } else {
        setErrorInicio(resultado.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      console.error('Error en login:', err);
      setErrorInicio('Error de conexión con el servidor');
    } finally {
      setCargando(false);
    }
  };

  // Login rápido para pruebas
  const manejarLoginRapido = async (numeroUsuario) => {
    setErrorInicio('');
    setCargando(true);
    try {
      const email = `jugador${numeroUsuario}@pokerkings.com`;
      console.log('🔐 Intentando login con:', email);
      
      const resultado = await authService.login(email, 'password123');
      
      console.log('📊 Resultado del login:', resultado);
      
      if (resultado.success) {
        console.log('✅ Login exitoso:', resultado.user);
        alIniciarSesionExito(resultado.user);
      } else {
        console.error('❌ Login fallido:', resultado.error);
        setErrorInicio(resultado.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      console.error('💥 Error en login rápido:', err);
      setErrorInicio(`Error: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo y Título */}
        <div className="login-header">
          <img src="/assets/images/logo.png" alt="Poker Kings" className="login-logo" />
          <h2 className="login-title">🎰 Iniciar Sesión</h2>
          <p className="login-subtitle">Bienvenido de vuelta al casino</p>
        </div>

        {/* Mostrar error si existe */}
        {errorInicio && (
          <div className="login-error">
            <span className="error-icon">⚠️</span>
            <span>{errorInicio}</span>
          </div>
        )}

        <form onSubmit={manejarEnvio} className="login-form">
          {/* Email o username */}
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
              onChange={(e) => setIdentificador(e.target.value)}
              required
              disabled={cargando}
              autoComplete="username"
            />
          </div>

          {/* Contraseña */}
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
              onChange={(e) => setContrasena(e.target.value)}
              required
              disabled={cargando}
            />
          </div>

          {/* Botón de login */}
          <button
            type="submit"
            className="btn-login"
            disabled={cargando}
          >
            {cargando ? (
              <>
                <span className="spinner"></span>
                Iniciando sesión...
              </>
            ) : (
              <>
                <span>🎮</span>
                Iniciar Sesión
              </>
            )}
          </button>
        </form>

        {/* Botón para ir a registro */}
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

        {/* Login rápido para pruebas */}
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
