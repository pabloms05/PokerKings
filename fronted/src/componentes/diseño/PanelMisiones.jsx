import React, { useCallback, useEffect, useState } from 'react';
import { missionAPI } from '../../servicios/api';
import toast from 'react-hot-toast';

function MisionesOffcanvas({ show, onHide, userId, onUserStatsUpdated }) {
  // Estado local: misiones visibles, flag de carga y mision en reclamo
  const [misiones, setMisiones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claimingMissionId, setClaimingMissionId] = useState(null);

  // Helpers: recalcula progreso y trae misiones desde backend
  const cargarMisiones = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await missionAPI.checkProgress();
      const response = await missionAPI.getAllMissions();
      setMisiones(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.warn('No se pudieron cargar misiones:', error?.message || error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Efectos: recargar al abrir y cuando cambia progression:updated
  useEffect(() => {
    if (!show) return;
    cargarMisiones();
  }, [show, cargarMisiones]);

  useEffect(() => {
    const onProgressionUpdate = (event) => {
      const payloadUserId = event?.detail?.userId;
      if (!show) return;
      if (String(payloadUserId) !== String(userId)) return;
      cargarMisiones();
    };

    window.addEventListener('progression:updated', onProgressionUpdate);
    return () => window.removeEventListener('progression:updated', onProgressionUpdate);
  }, [show, userId, cargarMisiones]);

  // Handlers: reclamar recompensa, actualizar usuario y emitir evento
  const reclamarRecompensa = async (missionId) => {
    if (!missionId || claimingMissionId) return;
    setClaimingMissionId(missionId);
    try {
      const response = await missionAPI.claimReward(missionId);
      const rewardedUser = response?.data?.user;
      if (rewardedUser && onUserStatsUpdated) {
        onUserStatsUpdated(rewardedUser);
      }
      toast.success('Recompensa reclamada correctamente');
      await cargarMisiones();
      window.dispatchEvent(new CustomEvent('progression:updated', {
        detail: { userId, user: rewardedUser || null, source: 'mission-claim' }
      }));
    } catch (error) {
      const message = error?.response?.data?.message || 'No se pudo reclamar la recompensa';
      toast.error(message);
      await cargarMisiones();
    } finally {
      setClaimingMissionId(null);
    }
  };

  // Render del offcanvas con lista, progreso y boton de reclamo
  return (
    <div 
      className={`offcanvas offcanvas-start offcanvas-casino ${show ? 'show' : ''}`} 
      tabIndex="-1"
      style={{ visibility: show ? 'visible' : 'hidden' }}
    >
      <div className="offcanvas-header">
        <h5 className="offcanvas-title">✅ Misiones Diarias</h5>
        <button 
          type="button" 
          className="btn-close" 
          onClick={onHide}
        ></button>
      </div>
      <div className="offcanvas-body">
        {loading ? (
          <div className="text-center text-muted py-5">
            <p>Cargando misiones...</p>
          </div>
        ) : misiones.length === 0 ? (
          <div className="text-center text-muted py-5">
            <p>No hay misiones disponibles</p>
            <small>Las misiones diarias se actualizarán pronto</small>
          </div>
        ) : (
          <div className="list-group">
            {misiones.map(mision => (
              <div key={mision.id} className="list-group-item">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">{mision.title}</h6>
                  <div className="d-flex gap-2">
                    <span className="badge bg-warning text-dark">
                      💰 {Number(mision.reward || 0).toLocaleString()} fichas
                    </span>
                    <span className="badge bg-info text-dark">
                      ⭐ {Number(mision.rewardExperience || 0).toLocaleString()} XP
                    </span>
                  </div>
                </div>
                <p className="mb-2 text-muted small">{mision.description || 'Completa el objetivo para obtener recompensas.'}</p>
                <p className="mb-1 small text-secondary">
                  Progreso: {Number(mision.progress || 0)}/{Number(mision?.requirement?.count || 0)}
                </p>
                {mision.completed && (
                  <div className="mt-2 d-flex justify-content-between align-items-center">
                    <span className="text-success">✅ Completada</span>
                    {mision.claimed ? (
                      <span className="badge bg-secondary">Recompensa reclamada</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        disabled={!mision.claimable || claimingMissionId === mision.id}
                        onClick={() => reclamarRecompensa(mision.id)}
                      >
                        {claimingMissionId === mision.id ? 'Reclamando...' : 'Reclamar'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MisionesOffcanvas;
