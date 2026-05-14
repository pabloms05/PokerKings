import React, { useState } from 'react';
import toast from 'react-hot-toast';
import TrofeosOffcanvas from './PanelTrofeos';
import MisionesOffcanvas from './PanelMisiones';
import AmigosOffcanvas from './PanelAmigos';
import InvitacionesOffcanvas from './PanelInvitaciones';
import AccountModal from './ModalCuenta';
import './BarraNavegacion.css';

function Navbar({ user, onLogout, onUpdateUser, onNavigate }) {
  // Estado local de UI: offcanvas activo, modal de cuenta y menu colapsado
  // Controla que solo un offcanvas este abierto a la vez para evitar solapamientos
  const [activeOffcanvas, setActiveOffcanvas] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [navbarExpanded, setNavbarExpanded] = useState(false); // FIX: Toggle sin Bootstrap

  // Handlers: apertura/cierre de offcanvas y modal
  // Abre un panel lateral y cierra cualquier otro abierto para mantener foco
  const openTrofeos = () => setActiveOffcanvas('trofeos');
  const openMisiones = () => setActiveOffcanvas('misiones');
  const openAmigos = () => setActiveOffcanvas('amigos');
  const openInvitaciones = () => setActiveOffcanvas('invitaciones');
  const openAccount = () => setShowAccountModal(true);
  const closeOffcanvas = () => setActiveOffcanvas(null);
  const closeAccount = () => setShowAccountModal(false);

  // Handlers: cuenta y actualizacion de avatar
  // Actualiza avatar, notifica a la app y muestra toast
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

  // Handlers: navegacion principal del navbar
  // Navegacion principal por vistas (inicio, mesas, tienda)
  const handleInicio = () => {
    if (onNavigate) onNavigate('inicio');
  };

  // Funcion para ir al lobby de mesas desde el navbar
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

  // Handlers: sesion y logout con confirmacion
  // Confirma y ejecuta cierre de sesion con toast
  const handleCerrarSesion = () => {
    // Cierra cualquier toast de confirmacion previo para evitar duplicados
    toast.dismiss('logout-confirm');

    // Muestra toast de confirmacion con botones de accion
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

  // Render de navbar, offcanvas y modal de cuenta con props actuales
  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark navbar-casino">
        <div className="container-fluid">
          <span className="navbar-brand" style={{ cursor: 'pointer' }} onClick={handleInicio}>
            <img src="/assets/images/logo.png" alt="Poker Kings" height="75" />
          </span>

          {/* Boton hamburguesa para movil: alterna menu sin Bootstrap JS */}
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
              {/* 1. Inicio: vuelve a la vista principal */}
              <li className="nav-item">
                <button className="nav-link btn btn-link" onClick={handleInicio}>
                  🏠 Inicio
                </button>
              </li>

              {/* 2. Mesas: abre el lobby en tiempo real */}
              <li className="nav-item">
                <button className="nav-link btn btn-link" onClick={handleMesas}>
                  🎮 Mesas
                </button>
              </li>

              {/* 3. Tienda: abre catalogo de fichas */}
              <li className="nav-item">
                <button
                  className="nav-link btn btn-link nav-tienda"
                  onClick={handleTienda}
                >
                  🛒 Tienda
                </button>
              </li>

              {/* 4. Trofeos: abre panel de logros */}
              <li className="nav-item">
                <button
                  className="nav-link btn btn-link"
                  onClick={openTrofeos}
                >
                  🏆 Trofeos
                </button>
              </li>

              {/* 5. Misiones: abre panel de misiones */}
              <li className="nav-item">
                <button
                  className="nav-link btn btn-link"
                  onClick={openMisiones}
                >
                  ✅ Misiones Diarias
                </button>
              </li>

              {/* 6. Amigos: abre panel de amigos */}
              <li className="nav-item">
                <button
                  className="nav-link btn btn-link"
                  onClick={openAmigos}
                >
                  👥 Amigos
                </button>
              </li>

              {/* 7. Invitaciones: abre panel de invitaciones */}
              <li className="nav-item">
                <button
                  className="nav-link btn btn-link"
                  onClick={openInvitaciones}
                >
                  📨 Invitaciones
                </button>
              </li>

              {/* 8. Mi cuenta: abre modal de perfil */}
              <li className="nav-item">
                <button
                  className="nav-link btn btn-link"
                  onClick={openAccount}
                >
                  👤 Mi Cuenta
                </button>
              </li>

              {/* 9. Cerrar sesion: confirma y cierra */}
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

      {/* Offcanvas de Trofeos: lista logros */}
      <TrofeosOffcanvas
        show={activeOffcanvas === 'trofeos'}
        onHide={closeOffcanvas}
        userId={user?.id}
      />

      {/* Offcanvas de Misiones: lista progreso y recompensas */}
      <MisionesOffcanvas
        show={activeOffcanvas === 'misiones'}
        onHide={closeOffcanvas}
        userId={user?.id}
        onUserStatsUpdated={onUpdateUser}
      />

      {/* Offcanvas de Amigos: buscar, aceptar y eliminar */}
      <AmigosOffcanvas
        show={activeOffcanvas === 'amigos'}
        onHide={closeOffcanvas}
      />

      {/* Offcanvas de Invitaciones: aceptar o rechazar */}
      <InvitacionesOffcanvas
        show={activeOffcanvas === 'invitaciones'}
        onHide={closeOffcanvas}
      />

      {/* Modal de Mi Cuenta: datos y cambio de avatar */}
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
