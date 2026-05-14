import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { tableAPI } from '../../servicios/api';
import {
  getGameInvitations,
  removeGameInvitation,
  invitationsUpdateEvent
} from '../../servicios/invitaciones';

function InvitacionesOffcanvas({ show, onHide }) {
  // Estado local: invitaciones guardadas en memoria del cliente
  const [invitaciones, setInvitaciones] = useState([]);

  // Efectos: cargar invitaciones desde memoria y escuchar cambios
  useEffect(() => {
    const loadInvitations = () => {
      setInvitaciones(getGameInvitations());
    };

    loadInvitations();
    window.addEventListener(invitationsUpdateEvent, loadInvitations);
    return () => window.removeEventListener(invitationsUpdateEvent, loadInvitations);
  }, []);

  // Handlers: aceptar invitacion (join mesa) o rechazarla
  const handleAceptar = (invitacion) => {
    if (!invitacion || !invitacion.table || !invitacion.table.id) {
      toast.error('La invitación no tiene una mesa válida');
      return;
    }

    tableAPI.joinTable(invitacion.table.id, invitacion.invitationToken).then(
      (respuestaUnion) => {
        const mesaResuelta = respuestaUnion?.data?.table || invitacion.table;

        removeGameInvitation(invitacion.id);
        if (onHide) {
          onHide();
        }

        window.dispatchEvent(new CustomEvent('invitacion:abrir-mesa', {
          detail: { table: mesaResuelta }
        }));
      },
      (errorUnion) => {
        toast.error(errorUnion?.response?.data?.message || 'No se pudo aceptar la invitación');
      }
    );
  };

  const handleRechazar = (id) => {
    removeGameInvitation(id);
    toast.success('Invitación rechazada');
  };

  // Valores derivados: clases y contenido segun si hay invitaciones
  let claseOffcanvas = 'offcanvas offcanvas-start offcanvas-casino';
  if (show) {
    claseOffcanvas = 'offcanvas offcanvas-start offcanvas-casino show';
  }

  let visibilidadOffcanvas = 'hidden';
  if (show) {
    visibilidadOffcanvas = 'visible';
  }

  let contenidoInvitaciones = (
    <div className="text-center text-muted py-5">
      <p>No tienes invitaciones pendientes</p>
    </div>
  );

  if (invitaciones.length > 0) {
    contenidoInvitaciones = (
      <div className="list-group">
        {invitaciones.map((invitacion) => (
          <div key={invitacion.id} className="list-group-item">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <strong>{invitacion.from?.username || 'Un amigo'}</strong>
                <p className="mb-0 text-muted">
                  Te invitó a la mesa <strong>{invitacion.table?.name || 'Mesa'}</strong>
                </p>
                <small className="text-muted">
                  🎲 Invitación a mesa
                </small>
              </div>
            </div>
            <div className="btn-group w-100 mt-2">
              <button
                className="btn btn-success btn-sm"
                onClick={() => handleAceptar(invitacion)}
              >
                ✓ Aceptar
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleRechazar(invitacion.id)}
              >
                ✗ Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render del offcanvas con acciones aceptar/rechazar
  return (
    <div 
      className={claseOffcanvas}
      tabIndex="-1"
      style={{ visibility: visibilidadOffcanvas }}
    >
      <div className="offcanvas-header">
        <h5 className="offcanvas-title">📨 Invitaciones</h5>
        <button 
          type="button" 
          className="btn-close" 
          onClick={onHide}
        ></button>
      </div>
      <div className="offcanvas-body">
        {contenidoInvitaciones}
      </div>
    </div>
  );
}

export default InvitacionesOffcanvas;
