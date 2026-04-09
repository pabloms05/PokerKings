import React, { useState } from 'react';
import toast from 'react-hot-toast';
import TrofeosOffcanvas from './PanelTrofeos';
import MisionesOffcanvas from './PanelMisiones';
import AmigosOffcanvas from './PanelAmigos';
import InvitacionesOffcanvas from './PanelInvitaciones';
import AccountModal from './ModalCuenta';
import './BarraNavegacion.css';

function Navbar({ user, onLogout, onUpdateUser, onNavigate }) {
  // Estado para controlar qué offcanvas está abierto (solo uno a la vez)
  const [activeOffcanvas, setActiveOffcanvas] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [navbarExpanded, setNavbarExpanded] = useState(false); // FIX: Toggle sin Bootstrap

  // Funciones para abrir offcanvas (cierra cualquier otro abierto)
  const openTrofeos = () => setActiveOffcanvas('trofeos');
  const openMisiones = () => setActiveOffcanvas('misiones');
  const openAmigos = () => setActiveOffcanvas('amigos');
  const openInvitaciones = () => setActiveOffcanvas('invitaciones');
  const openAccount = () => setShowAccountModal(true);
  const closeOffcanvas = () => setActiveOffcanvas(null);

  // Manejar actualización de avatar
  const handleUpdateAvatar = (newAvatar) => {
    console.log('handleUpdateAvatar called with:', newAvatar);
    console.log('Current user:', user);
    if (onUpdateUser) {
      const updatedUser = { ...user, avatar: newAvatar };
      console.log('Calling onUpdateUser with:', updatedUser);
      onUpdateUser(updatedUser);
      toast.success('🎉 Avatar actualizado correctamente');
      setShowAccountModal(false);
    }
  };

  // Función para ir a inicio
  const handleInicio = () => {
    if (onNavigate) onNavigate('inicio');
  };

  // Función para ir al lobby de mesas
  const handleMesas = () => {
    if (onNavigate) onNavigate('mesas');
  };

  // Función para cerrar sesión
  const handleCerrarSesion = () => {
    // Cerrar cualquier toast de confirmación previo
    toast.dismiss('logout-confirm');

    // Mostrar toast de confirmación
    toast((t) => (
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
          ¿Estás seguro que quieres cerrar sesión?
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              if (onLogout) {
                onLogout();
              }
              //toast.success('Sesión cerrada correctamente');
            }}
            style={{
              padding: '8px 16px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sí, cerrar sesión
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
            }}
            style={{
              padding: '8px 16px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: 5000, id: 'logout-confirm' });
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark navbar-casino">
        <div className="container-fluid">
          <span className="navbar-brand" style={{ cursor: 'pointer' }} onClick={handleInicio}>
            <img src="/assets/images/logo.png" alt="Poker Kings" height="75" />
          </span>

          {/* Botón hamburguesa para móvil - FIX: Sin Bootstrap JS */}
          <button
            className="navbar-toggler"
            type="button"
            onClick={() => setNavbarExpanded(!navbarExpanded)}
            aria-controls="navbarNav"
            aria-expanded={navbarExpanded}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className={`navbar-collapse ${navbarExpanded ? 'show' : 'collapse'}`} id="navbarNav">
            <ul className="navbar-nav ms-auto">
              {/* 1. Inicio */}
              <li className="nav-item">
                <button className="nav-link btn btn-link" onClick={handleInicio}>
                  🏠 Inicio
                </button>
              </li>

              {/* 2. Mesas Disponibles */}
              <li className="nav-item">
                <button className="nav-link btn btn-link" onClick={handleMesas}>
                  🎮 Mesas
                </button>
              </li>

              {/* 3. Tienda */}
              <li className="nav-item">
                <button
                  className="nav-link btn btn-link nav-tienda"
                  onClick={() => onNavigate && onNavigate('tienda')}
                >
                  🛒 Tienda
                </button>
              </li>

              {/* 4. Trofeos */}
              <li className="nav-item">
                <button
                  className="nav-link btn btn-link"
                  onClick={openTrofeos}
                >
                  🏆 Trofeos
                </button>
              </li>

              {/* 5. Misiones Diarias */}
              <li className="nav-item">
                <button
                  className="nav-link btn btn-link"
                  onClick={openMisiones}
                >
                  ✅ Misiones Diarias
                </button>
              </li>

              {/* 6. Amigos */}
              <li className="nav-item">
                <button
                  className="nav-link btn btn-link"
                  onClick={openAmigos}
                >
                  👥 Amigos
                </button>
              </li>

              {/* 7. Invitaciones */}
              <li className="nav-item">
                <button
                  className="nav-link btn btn-link"
                  onClick={openInvitaciones}
                >
                  📨 Invitaciones
                </button>
              </li>

              {/* 8. Mi Cuenta */}
              <li className="nav-item">
                <button
                  className="nav-link btn btn-link"
                  onClick={openAccount}
                >
                  👤 Mi Cuenta
                </button>
              </li>

              {/* 9. Cerrar Sesión */}
              <li className="nav-item">
                <button
                  className="nav-link btn btn-link text-danger"
                  onClick={handleCerrarSesion}
                >
                  🚪 Cerrar Sesión
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Offcanvas para Trofeos */}
      <TrofeosOffcanvas
        show={activeOffcanvas === 'trofeos'}
        onHide={closeOffcanvas}
      />

      {/* Offcanvas para Misiones */}
      <MisionesOffcanvas
        show={activeOffcanvas === 'misiones'}
        onHide={closeOffcanvas}
      />

      {/* Offcanvas para Amigos */}
      <AmigosOffcanvas
        show={activeOffcanvas === 'amigos'}
        onHide={closeOffcanvas}
      />

      {/* Offcanvas para Invitaciones */}
      <InvitacionesOffcanvas
        show={activeOffcanvas === 'invitaciones'}
        onHide={closeOffcanvas}
      />

      {/* Modal de Mi Cuenta */}
      <AccountModal
        show={showAccountModal}
        onHide={() => setShowAccountModal(false)}
        user={user}
        onUpdateAvatar={handleUpdateAvatar}
      />
    </>
  );
}

export default Navbar;
