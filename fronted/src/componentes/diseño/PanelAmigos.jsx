import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { friendAPI } from '../../servicios/api';
import { socketService } from '../../servicios/socketBase';

function AmigosOffcanvas({ show, onHide }) {
  const [buscarAmigo, setBuscarAmigo] = useState('');
  const [amigos, setAmigos] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const friendsRef = useRef([]);

  useEffect(() => {
    friendsRef.current = amigos;
  }, [amigos]);

  const loadFriendsData = async () => {
    try {
      setLoading(true);
      const [friendsRes, pendingRes] = await Promise.all([
        friendAPI.getFriends(),
        friendAPI.getPendingRequests()
      ]);

      const friendsList = Array.isArray(friendsRes.data) ? friendsRes.data : [];
      if (friendsList.length > 0) {
        try {
          const friendIds = friendsList.map((friend) => friend.id).filter(Boolean);
          const onlineResponse = await friendAPI.getOnlineStatus(friendIds);
          const onlineStatus = onlineResponse?.data?.onlineStatus || {};
          setAmigos(friendsList.map((friend) => ({
            ...friend,
            online: !!onlineStatus[String(friend.id)]
          })));
        } catch {
          setAmigos(friendsList.map((friend) => ({ ...friend, online: false })));
        }
      } else {
        setAmigos([]);
      }
      setPendientes(Array.isArray(pendingRes.data) ? pendingRes.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudieron cargar los amigos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (show) {
      loadFriendsData();
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;

    const onFriendPresence = (payload) => {
      const friendUserId = String(payload?.userId || '');
      if (!friendUserId) return;

      setAmigos((prev) => prev.map((friend) => (
        String(friend?.id) === friendUserId
          ? { ...friend, online: !!payload?.online }
          : friend
      )));
    };

    const onPresenceSnapshot = (payload) => {
      const onlineStatus = payload?.onlineStatus || {};
      setAmigos((prev) => prev.map((friend) => ({
        ...friend,
        online: !!onlineStatus[String(friend?.id)]
      })));
    };

    const refreshOnlineStatus = async () => {
      const friendIds = friendsRef.current.map((friend) => friend?.id).filter(Boolean);
      if (friendIds.length === 0) return;

      try {
        const response = await friendAPI.getOnlineStatus(friendIds);
        const onlineStatus = response?.data?.onlineStatus || {};
        setAmigos((prev) => prev.map((friend) => ({
          ...friend,
          online: !!onlineStatus[String(friend?.id)]
        })));
      } catch (error) {
        console.warn('No se pudo refrescar online-status en panel amigos:', error?.message || error);
      }
    };

    socketService.onFriendPresence(onFriendPresence);
    socketService.onFriendsPresenceSnapshot(onPresenceSnapshot);
    socketService.requestFriendsPresenceSnapshot();

    const snapshotIntervalId = setInterval(() => {
      socketService.requestFriendsPresenceSnapshot();
    }, 2000);

    const apiRefreshIntervalId = setInterval(refreshOnlineStatus, 1500);
    refreshOnlineStatus();

    return () => {
      socketService.offFriendPresence(onFriendPresence);
      socketService.offFriendsPresenceSnapshot(onPresenceSnapshot);
      clearInterval(snapshotIntervalId);
      clearInterval(apiRefreshIntervalId);
    };
  }, [show]);

  const handleAgregarAmigo = async () => {
    const target = buscarAmigo.trim();
    if (!target) return;

    try {
      await friendAPI.sendFriendRequest(target);
      toast.success('Solicitud de amistad enviada');
      setBuscarAmigo('');
      await loadFriendsData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo enviar la solicitud');
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await friendAPI.acceptFriendRequest(requestId);
      toast.success('Solicitud aceptada');
      await loadFriendsData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo aceptar la solicitud');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await friendAPI.rejectFriendRequest(requestId);
      toast.success('Solicitud rechazada');
      await loadFriendsData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo rechazar la solicitud');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await friendAPI.removeFriend(friendId);
      toast.success('Amigo eliminado');
      await loadFriendsData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo eliminar el amigo');
    }
  };

  return (
    <div 
      className={`offcanvas offcanvas-start offcanvas-casino ${show ? 'show' : ''}`} 
      tabIndex="-1"
      style={{ visibility: show ? 'visible' : 'hidden' }}
    >
      <div className="offcanvas-header">
        <h5 className="offcanvas-title">👥 Amigos</h5>
        <button 
          type="button" 
          className="btn-close" 
          onClick={onHide}
        ></button>
      </div>
      <div className="offcanvas-body">
        {/* Buscador de amigos */}
        <div className="mb-3">
          <label className="form-label">Agregar nuevo amigo</label>
          <div className="input-group">
            <input 
              type="text" 
              className="form-control" 
              placeholder="Nombre de usuario"
              value={buscarAmigo}
              onChange={(e) => setBuscarAmigo(e.target.value)}
            />
            <button 
              className="btn btn-primary" 
              onClick={handleAgregarAmigo}
            >
              ➕ Agregar
            </button>
          </div>
        </div>

        <hr />

        <h6>Solicitudes pendientes ({pendientes.length})</h6>
        {pendientes.length === 0 ? (
          <div className="text-muted mb-3">
            <small>No tienes solicitudes pendientes</small>
          </div>
        ) : (
          <div className="list-group mb-3">
            {pendientes.map((req) => (
              <div
                key={req.id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <span className="me-2">{req.sender?.avatar || '👤'}</span>
                  <strong>{req.sender?.username || 'Usuario'}</strong>
                </div>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleAccept(req.id)}
                  >
                    Aceptar
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleReject(req.id)}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <hr />

        {/* Lista de amigos */}
        <h6>Mis amigos ({amigos.length})</h6>
        {loading ? (
          <div className="text-center text-muted py-4">Cargando...</div>
        ) : amigos.length === 0 ? (
          <div className="text-center text-muted py-5">
            <p>No tienes amigos aún</p>
            <small>Agrega amigos para comenzar</small>
          </div>
        ) : (
          <div className="list-group">
            {amigos.map(amigo => (
              <div 
                key={amigo.id} 
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <span className="me-2">{amigo.avatar || '👤'}</span>
                  <strong>{amigo.username}</strong>
                  <span
                    className={`badge ms-2 ${amigo.online ? 'bg-success' : 'bg-secondary'}`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {amigo.online ? 'Online' : 'Offline'}
                  </span>
                </div>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => handleRemoveFriend(amigo.id)}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AmigosOffcanvas;
