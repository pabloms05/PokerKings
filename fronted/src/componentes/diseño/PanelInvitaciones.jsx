import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { tableAPI } from '../../servicios/api';
import {
  getGameInvitations,
  removeGameInvitation,
  invitationsUpdateEvent
} from '../../servicios/invitaciones';

function InvitacionesOffcanvas({ show, onHide }) {
  const [invitaciones, setInvitaciones] = useState([]);

  useEffect(() => {
    const loadInvitations = () => {
      setInvitaciones(getGameInvitations());
    };

    loadInvitations();
    window.addEventListener(invitationsUpdateEvent, loadInvitations);
    return () => window.removeEventListener(invitationsUpdateEvent, loadInvitations);
  }, []);

  const handleAceptar = async (inv) => {
    try {
      if (!inv?.table?.id) {
        toast.error('La invitación no tiene una mesa válida');
        return;
      }

      const response = await tableAPI.joinTable(inv.table.id, inv.invitationToken);
      const resolvedTable = response?.data?.table || inv.table;

      removeGameInvitation(inv.id);
      onHide?.();

      window.dispatchEvent(new CustomEvent('invitacion:abrir-mesa', {
        detail: { table: resolvedTable }
      }));
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo aceptar la invitación');
    }
  };

  const handleRechazar = (id) => {
    removeGameInvitation(id);
    toast.success('Invitación rechazada');
  };

  return (
    <div 
      className={`offcanvas offcanvas-start offcanvas-casino ${show ? 'show' : ''}`} 
      tabIndex="-1"
      style={{ visibility: show ? 'visible' : 'hidden' }}
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
        {invitaciones.length === 0 ? (
          <div className="text-center text-muted py-5">
            <p>No tienes invitaciones pendientes</p>
          </div>
        ) : (
          <div className="list-group">
            {invitaciones.map(inv => (
              <div key={inv.id} className="list-group-item">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <strong>{inv.from?.username || 'Un amigo'}</strong>
                    <p className="mb-0 text-muted">
                      Te invitó a la mesa <strong>{inv.table?.name || 'Mesa'}</strong>
                    </p>
                    <small className="text-muted">
                      🎲 Invitación a mesa
                    </small>
                  </div>
                </div>
                <div className="btn-group w-100 mt-2">
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => handleAceptar(inv)}
                  >
                    ✓ Aceptar
                  </button>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRechazar(inv.id)}
                  >
                    ✗ Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default InvitacionesOffcanvas;
