import React, { useState } from 'react';
import toast from 'react-hot-toast';
import TrofeosOffcanvas from './PanelTrofeos';
import MisionesOffcanvas from './PanelMisiones';
import AmigosOffcanvas from './PanelAmigos';
import InvitacionesOffcanvas from './PanelInvitaciones';
import AccountModal from './ModalCuenta';
import './BarraNavegacion.css';

function Navbar({ user, onLogout, onUpdateUser, onNavigate }) {
  // Estado local de UI (offcanvas activo, modal cuenta y menu colapsado)
  // Controla que solo un offcanvas este abierto a la vez
  const [activeOffcanvas, setActiveOffcanvas] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [navbarExpanded, setNavbarExpanded] = useState(false); // FIX: Toggle sin Bootstrap

  // Handlers: offcanvas y modales
  // Abre un panel lateral y cierra cualquier otro abierto
  const openTrofeos = () => setActiveOffcanvas('trofeos');
  const openMisiones = () => setActiveOffcanvas('misiones');
  const openAmigos = () => setActiveOffcanvas('amigos');
  const openInvitaciones = () => setActiveOffcanvas('invitaciones');
  const openAccount = () => setShowAccountModal(true);
  const closeOffcanvas = () => setActiveOffcanvas(null);
  const closeAccount = () => setShowAccountModal(false);

  // Handlers: cuenta
  // Actualiza avatar y notifica a la app
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

  // Handlers: navegacion
  // Navegacion principal por vistas
  const handleInicio = () => {
    if (onNavigate) onNavigate('inicio');
  };

  // Función para ir al lobby de mesas
  const handleMesas = () => {
    if (onNavigate) onNavigate('mesas');
  };

  const handleTienda = () => {
    if (onNavigate) {
      onNavigate('tienda');
    }
  };

  // Handlers: navbar responsivo
  // Toggle del menu movil sin JS de Bootstrap
  const toggleNavbar = () => {
    setNavbarExpanded(!navbarExpanded);
  };

  // Handlers: sesion
  // Confirma y ejecuta cierre de sesion
  const handleCerrarSesion = () => {
    // Cerrar cualquier toast de confirmación previo
    toast.dismiss('logout-confirm');

    // Mostrar toast de confirmación
    toast((instanciaToast) => (
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
          ¿Estás seguro que quieres cerrar sesión?
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={() => {
              toast.dismiss(instanciaToast.id);
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
              toast.dismiss(instanciaToast.id);
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

  // Render de navbar, offcanvas y modal de cuenta
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
            onClick={toggleNavbar}
            aria-controls="navbarNav"
            aria-expanded={navbarExpanded}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className={`navbar-collapse collapse${navbarExpanded ? ' show' : ''}`} id="navbarNav">
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
                  onClick={handleTienda}
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
        userId={user?.id}
      />

      {/* Offcanvas para Misiones */}
      <MisionesOffcanvas
        show={activeOffcanvas === 'misiones'}
        onHide={closeOffcanvas}
        userId={user?.id}
        onUserStatsUpdated={onUpdateUser}
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
        onHide={closeAccount}
        user={user}
        onUpdateAvatar={handleUpdateAvatar}
      />
    </>
  );
}

export default Navbar;
