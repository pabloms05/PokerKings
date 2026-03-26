import React, { useState } from 'react';
import { authService } from '../../servicios/autenticacion';
import './InicioSesion.css';

function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Llamar al servicio de autenticación
      const result = await authService.login(identifier, password);

      if (result.success) {
        console.log('✅ Login exitoso:', result.user);
        // Notificar al componente padre
        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        }
      } else {
        setError(result.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      console.error('Error en login:', err);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Login rápido para pruebas
  const handleQuickLogin = async (userNumber) => {
    setError('');
    setLoading(true);
    try {
      const email = `jugador${userNumber}@pokerkings.com`;
      console.log('🔐 Intentando login con:', email);
      
      const result = await authService.login(email, 'password123');
      
      console.log('📊 Resultado del login:', result);
      
      if (result.success) {
        console.log('✅ Login exitoso:', result.user);
        onLoginSuccess(result.user);
      } else {
        console.error('❌ Login fallido:', result.error);
        setError(result.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      console.error('💥 Error en login rápido:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
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
        {error && (
          <div className="login-error">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
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
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              disabled={loading}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Botón de login */}
          <button
            type="submit"
            className="btn-login"
            disabled={loading}
          >
            {loading ? (
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
            onClick={onSwitchToRegister}
            disabled={loading}
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
              onClick={() => handleQuickLogin(1)}
              disabled={loading}
            >
              Jugador 1
            </button>
            <button
              className="btn-quick"
              onClick={() => handleQuickLogin(2)}
              disabled={loading}
            >
              Jugador 2
            </button>
            <button
              className="btn-quick"
              onClick={() => handleQuickLogin(3)}
              disabled={loading}
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

export default Login;
