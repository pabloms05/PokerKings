import React, { useState } from 'react';
import { authService } from '../../servicios/autenticacion';
import AvatarSelector from './SelectorAvatar';
import './Registro.css';

function Register({ onRegisterSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    avatar: '🎮'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Limpiar error general y de campo cuando el usuario corrige inputs.
    if (error) setError('');
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (formData.username.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    setLoading(true);

    try {
      // Llamar al servicio de registro
      const result = await authService.register(
        formData.username.trim(),
        formData.email.trim(),
        formData.password,
        formData.avatar
      );

      if (result.success) {
        console.log('✅ Registro exitoso:', result.user);
        // Notificar al componente padre
        if (onRegisterSuccess) {
          onRegisterSuccess(result.user);
        }
      } else {
        setError(result.error || 'Error al crear la cuenta');
        setFieldErrors(result.fieldErrors || {});
      }
    } catch (err) {
      console.error('Error en registro:', err);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        {/* Logo */}
        <div className="register-logo">
          <img src="/assets/images/logo.png" alt="Poker Kings" />
        </div>

        <h2 className="register-title">
          🎰 Crear Cuenta
        </h2>

        {/* Mostrar error si existe */}
        {error && (
          <div className="register-error">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          {/* Selector de avatar */}
          <AvatarSelector 
            selectedAvatar={formData.avatar}
            onSelectAvatar={(avatar) => setFormData(prev => ({ ...prev, avatar }))}
          />

          {/* Nombre de usuario */}
          <div className="form-group">
            <label className="form-label">
              👤 Nombre de Usuario
            </label>
            <input
              type="text"
              className="form-input"
              name="username"
              placeholder="Ej: PokerKing123"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={loading}
              minLength="3"
            />
            <small className="form-hint">
              Mínimo 3 caracteres. Debe ser unico.
            </small>
            {fieldErrors.username && (
              <small className="form-hint" style={{ color: '#ff6b6b' }}>
                {fieldErrors.username}
              </small>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">
              📧 Email
            </label>
            <input
              type="email"
              className="form-input"
              name="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
            {fieldErrors.email && (
              <small className="form-hint" style={{ color: '#ff6b6b' }}>
                {fieldErrors.email}
              </small>
            )}
          </div>

          {/* Contraseña */}
          <div className="form-group">
            <label className="form-label">
              🔒 Contraseña
            </label>
            <input
              type="password"
              className="form-input"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
              minLength="6"
            />
            <small className="form-hint">
              Mínimo 6 caracteres
            </small>
          </div>

          {/* Confirmar contraseña */}
          <div className="form-group">
            <label className="form-label">
              🔒 Confirmar Contraseña
            </label>
            <input
              type="password"
              className="form-input"
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={loading}
              minLength="6"
            />
          </div>

          {/* Botón de registro */}
          <button
            type="submit"
            className="btn-register"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creando cuenta...
              </>
            ) : (
              '✨ Crear Cuenta'
            )}
          </button>
        </form>

        {/* Botón para ir a login */}
        <div className="register-footer">
          <p className="footer-text">¿Ya tienes cuenta?</p>
          <button
            className="btn-switch"
            onClick={onSwitchToLogin}
            disabled={loading}
          >
            Iniciar Sesión
          </button>
        </div>

        {/* Info de chips gratis */}
        <div className="welcome-bonus">
          🎁 <strong>¡Bienvenida!</strong>
          <br />
          Comenzarás con <strong>1000 chips gratis</strong> para jugar
        </div>
      </div>
    </div>
  );
}

export default Register;
