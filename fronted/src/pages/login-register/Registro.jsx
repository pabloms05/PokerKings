import React, { useState } from 'react';
import { authService } from '../../servicios/autenticacion';
import SelectorAvatar from './SelectorAvatar';
import './Registro.css';

function Registro({ alRegistroExitoso, alCambiarALogin }) {
  // Estado del formulario, carga y errores
  const [datosFormulario, setDatosFormulario] = useState({
    nombreUsuario: '',
    correo: '',
    contrasena: '',
    confirmarContrasena: '',
    avatar: '🎮'
  });
  const [cargando, setCargando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState('');
  const [erroresCampos, setErroresCampos] = useState({});

  // Handlers: cambios de inputs y envio del registro
  const manejarCambio = (evento) => {
    const { name, value } = evento.target;
    setDatosFormulario({
      ...datosFormulario,
      [name]: value
    });

    // Limpia errores cuando el usuario corrige datos.
    if (errorRegistro) setErrorRegistro('');
    if (erroresCampos[name]) {
      setErroresCampos((previo) => ({ ...previo, [name]: undefined }));
    }
  };

  const manejarEnvio = (evento) => {
    evento.preventDefault();
    setErrorRegistro('');
    setErroresCampos({});

    // Validaciones
    if (datosFormulario.contrasena !== datosFormulario.confirmarContrasena) {
      setErrorRegistro('Las contraseñas no coinciden');
      return;
    }

    if (datosFormulario.contrasena.length < 6) {
      setErrorRegistro('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (datosFormulario.nombreUsuario.length < 3) {
      setErrorRegistro('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    setCargando(true);

    authService.register(
      datosFormulario.nombreUsuario.trim(),
      datosFormulario.correo.trim(),
      datosFormulario.contrasena,
      datosFormulario.avatar
    ).then(
      (resultado) => {
        if (resultado.success) {
          if (alRegistroExitoso) {
            alRegistroExitoso(resultado.user);
          }
          return;
        }

        setErrorRegistro(resultado.error || 'Error al crear la cuenta');
        const erroresBackend = resultado.fieldErrors || {};
        setErroresCampos({
          nombreUsuario: erroresBackend.username,
          correo: erroresBackend.email,
          contrasena: erroresBackend.password,
          confirmarContrasena: erroresBackend.confirmPassword
        });
      },
      (errorDeConexion) => {
        console.error('Error en registro:', errorDeConexion);
        setErrorRegistro('Error de conexión con el servidor');
      }
    ).then(() => {
      setCargando(false);
    });
  };

  // Valores derivados: texto del boton segun estado
  let contenidoBotonRegistro = '✨ Crear Cuenta';
  if (cargando) {
    contenidoBotonRegistro = (
      <>
        <span className="spinner"></span>
        Creando cuenta...
      </>
    );
  }

  // Render del formulario de registro
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
        {errorRegistro && (
          <div className="register-error">
            ⚠️ {errorRegistro}
          </div>
        )}

        <form onSubmit={manejarEnvio} className="register-form">
          {/* Selector de avatar */}
          <SelectorAvatar
            avatarSeleccionado={datosFormulario.avatar}
            alSeleccionarAvatar={(avatar) => setDatosFormulario((previo) => ({ ...previo, avatar }))}
          />

          {/* Nombre de usuario */}
          <div className="form-group">
            <label className="form-label">
              👤 Nombre de Usuario
            </label>
            <input
              type="text"
              className="form-input"
              name="nombreUsuario"
              placeholder="Ej: PokerKing123"
              value={datosFormulario.nombreUsuario}
              onChange={manejarCambio}
              required
              disabled={cargando}
              minLength="3"
            />
            <small className="form-hint">
              Mínimo 3 caracteres. Debe ser unico.
            </small>
            {erroresCampos.nombreUsuario && (
              <small className="form-hint" style={{ color: '#ff6b6b' }}>
                {erroresCampos.nombreUsuario}
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
              name="correo"
              placeholder="tu@email.com"
              value={datosFormulario.correo}
              onChange={manejarCambio}
              required
              disabled={cargando}
            />
            {erroresCampos.correo && (
              <small className="form-hint" style={{ color: '#ff6b6b' }}>
                {erroresCampos.correo}
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
              name="contrasena"
              placeholder="••••••••"
              value={datosFormulario.contrasena}
              onChange={manejarCambio}
              required
              disabled={cargando}
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
              name="confirmarContrasena"
              placeholder="••••••••"
              value={datosFormulario.confirmarContrasena}
              onChange={manejarCambio}
              required
              disabled={cargando}
              minLength="6"
            />
          </div>

          {/* Botón de registro */}
          <button
            type="submit"
            className="btn-register"
            disabled={cargando}
          >
            {contenidoBotonRegistro}
          </button>
        </form>

        {/* Botón para ir a login */}
        <div className="register-footer">
          <p className="footer-text">¿Ya tienes cuenta?</p>
          <button
            className="btn-switch"
            onClick={alCambiarALogin}
            disabled={cargando}
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

export default Registro;
