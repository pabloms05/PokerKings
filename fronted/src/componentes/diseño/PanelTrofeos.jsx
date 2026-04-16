import React, { useCallback, useEffect, useState } from 'react';
import { achievementAPI } from '../../servicios/api';

function TrofeosOffcanvas({ show, onHide, userId }) {
  const [trofeos, setTrofeos] = useState([]);
  const [loading, setLoading] = useState(false);

  const cargarTrofeos = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await achievementAPI.getAllAchievements();
      setTrofeos(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.warn('No se pudieron cargar trofeos:', error?.message || error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!show) return;
    cargarTrofeos();
  }, [show, cargarTrofeos]);

  useEffect(() => {
    const onProgressionUpdate = (event) => {
      const payloadUserId = event?.detail?.userId;
      if (!show) return;
      if (String(payloadUserId) !== String(userId)) return;
      cargarTrofeos();
    };

    window.addEventListener('progression:updated', onProgressionUpdate);
    return () => window.removeEventListener('progression:updated', onProgressionUpdate);
  }, [show, userId, cargarTrofeos]);

  return (
    <div
      className={`offcanvas offcanvas-start offcanvas-casino ${show ? 'show' : ''}`}
      tabIndex="-1"
      style={{ visibility: show ? 'visible' : 'hidden' }}
    >
      <div className="offcanvas-header">
        <h5 className="offcanvas-title">🏆 Trofeos</h5>
        <button
          type="button"
          className="btn-close"
          onClick={onHide}
        ></button>
      </div>
      <div className="offcanvas-body">
        {loading ? (
          <div className="text-center text-muted py-5">
            <p>Cargando trofeos...</p>
          </div>
        ) : trofeos.length === 0 ? (
          <div className="text-center text-muted py-5">
            <p>No tienes trofeos aún</p>
            <small>Juega para desbloquear trofeos</small>
          </div>
        ) : (
          <div className="list-group">
            {trofeos.map((trofeo) => (
              <div key={trofeo.id} className="list-group-item list-group-item-success">
                <h6>{trofeo.name}</h6>
                <p className="mb-0 text-muted">{trofeo.description}</p>
                <span className="badge bg-success">✓ Desbloqueado</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TrofeosOffcanvas;
