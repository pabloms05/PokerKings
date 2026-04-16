import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { friendAPI } from '../../servicios/api';
import { socketService } from '../../servicios/socketBase';

function AmigosOffcanvas({ show, onHide }) {
  const [buscarAmigo, setBuscarAmigo] = useState('');
  const [amigos, setAmigos] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const friendsRef = useRef([]);

  useEffect(() => {
    friendsRef.current = amigos;
  }, [amigos]);

  const loadFriendsData = () => {
    setLoading(true);

    return Promise.all([
      friendAPI.getFriends(),
      friendAPI.getPendingRequests()
    ]).then(
      (respuestas) => {
        const respuestaAmigos = respuestas[0];
        const respuestaPendientes = respuestas[1];

        let listaAmigos = [];
        if (respuestaAmigos && Array.isArray(respuestaAmigos.data)) {
          listaAmigos = respuestaAmigos.data;
        }

        let promesaOnline = Promise.resolve();
        if (listaAmigos.length > 0) {
          const idsAmigos = listaAmigos.map((amigo) => amigo.id).filter(Boolean);
          promesaOnline = friendAPI.getOnlineStatus(idsAmigos).then(
            (respuestaOnline) => {
              const estadoOnline = respuestaOnline?.data?.onlineStatus || {};
              setAmigos(listaAmigos.map((amigo) => ({
                ...amigo,
                online: !!estadoOnline[String(amigo.id)]
              })));
            },
            () => {
              setAmigos(listaAmigos.map((amigo) => ({ ...amigo, online: false })));
            }
          );
        } else {
          setAmigos([]);
        }

        return promesaOnline.then(() => {
          let listaPendientes = [];
          if (respuestaPendientes && Array.isArray(respuestaPendientes.data)) {
            listaPendientes = respuestaPendientes.data;
          }
          setPendientes(listaPendientes);
        });
      },
      (errorCarga) => {
        toast.error(errorCarga?.response?.data?.message || 'No se pudieron cargar los amigos');
      }
    ).then(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    if (show) {
      loadFriendsData();
      setBuscarAmigo('');
      setSearchResults([]);
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;

    const query = buscarAmigo.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchingUsers(false);
      return;
    }

    let isCancelled = false;
    setSearchingUsers(true);

    const timeoutId = setTimeout(() => {
      friendAPI.searchUsers(query, 8).then(
        (respuestaBusqueda) => {
          if (!isCancelled) {
            let resultados = [];
            if (respuestaBusqueda && Array.isArray(respuestaBusqueda.data)) {
              resultados = respuestaBusqueda.data;
            }
            setSearchResults(resultados);
          }
        },
        () => {
          if (!isCancelled) {
            setSearchResults([]);
          }
        }
      ).then(() => {
        if (!isCancelled) {
          setSearchingUsers(false);
        }
      });
    }, 280);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [buscarAmigo, show]);

  useEffect(() => {
    if (!show) return;

    const onFriendPresence = (payload) => {
      const friendUserId = String(payload?.userId || '');
      if (!friendUserId) return;

      setAmigos((amigosPrevios) => amigosPrevios.map((amigo) => {
        if (amigo && String(amigo.id) === friendUserId) {
          return { ...amigo, online: !!payload?.online };
        }

        return amigo;
      }));
    };

    const onPresenceSnapshot = (payload) => {
      const onlineStatus = payload?.onlineStatus || {};
      setAmigos((amigosPrevios) => amigosPrevios.map((friend) => ({
        ...friend,
        online: !!onlineStatus[String(friend?.id)]
      })));
    };

    const refreshOnlineStatus = () => {
      const friendIds = friendsRef.current.map((friend) => friend?.id).filter(Boolean);
      if (friendIds.length === 0) return;

      friendAPI.getOnlineStatus(friendIds).then(
        (respuestaOnline) => {
          const estadoOnline = respuestaOnline?.data?.onlineStatus || {};
          setAmigos((amigosPrevios) => amigosPrevios.map((friend) => ({
            ...friend,
            online: !!estadoOnline[String(friend?.id)]
          })));
        },
        (errorOnline) => {
          console.warn('No se pudo refrescar online-status en panel amigos:', errorOnline?.message || errorOnline);
        }
      );
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

  const handleAgregarAmigo = () => {
    const target = buscarAmigo.trim();
    if (!target) return;

    friendAPI.sendFriendRequest(target).then(
      () => {
        toast.success('Solicitud de amistad enviada');
        setBuscarAmigo('');
        setSearchResults([]);
        return loadFriendsData();
      },
      (errorSolicitud) => {
        toast.error(errorSolicitud?.response?.data?.message || 'No se pudo enviar la solicitud');
      }
    );
  };

  const handleAgregarDesdeResultado = (candidate) => {
    if (!candidate || !candidate.id) return;

    friendAPI.sendFriendRequest({ receiverId: candidate.id }).then(
      () => {
        toast.success(`Solicitud enviada a ${candidate.username}`);
        setBuscarAmigo('');
        setSearchResults([]);
        return loadFriendsData();
      },
      (errorSolicitud) => {
        toast.error(errorSolicitud?.response?.data?.message || 'No se pudo enviar la solicitud');
      }
    );
  };

  const handleAccept = (requestId) => {
    friendAPI.acceptFriendRequest(requestId).then(
      () => {
        toast.success('Solicitud aceptada');
        return loadFriendsData();
      },
      (errorAceptacion) => {
        toast.error(errorAceptacion?.response?.data?.message || 'No se pudo aceptar la solicitud');
      }
    );
  };

  const handleReject = (requestId) => {
    friendAPI.rejectFriendRequest(requestId).then(
      () => {
        toast.success('Solicitud rechazada');
        return loadFriendsData();
      },
      (errorRechazo) => {
        toast.error(errorRechazo?.response?.data?.message || 'No se pudo rechazar la solicitud');
      }
    );
  };

  const handleRemoveFriend = (friendId) => {
    friendAPI.removeFriend(friendId).then(
      () => {
        toast.success('Amigo eliminado');
        return loadFriendsData();
      },
      (errorEliminacion) => {
        toast.error(errorEliminacion?.response?.data?.message || 'No se pudo eliminar el amigo');
      }
    );
  };

  let claseOffcanvas = 'offcanvas offcanvas-start offcanvas-casino';
  if (show) {
    claseOffcanvas = 'offcanvas offcanvas-start offcanvas-casino show';
  }

  let visibilidadOffcanvas = 'hidden';
  if (show) {
    visibilidadOffcanvas = 'visible';
  }

  let contenidoBusqueda = null;
  if (buscarAmigo.trim().length >= 2) {
    contenidoBusqueda = (
      <div className="list-group mt-2">
        {searchingUsers && (
          <div className="list-group-item text-muted">
            Buscando usuarios...
          </div>
        )}

        {!searchingUsers && searchResults.length === 0 && (
          <div className="list-group-item text-muted">
            Sin resultados para "{buscarAmigo.trim()}"
          </div>
        )}

        {!searchingUsers && searchResults.length > 0 && (
          <>
            {searchResults.map((candidate) => {
              let claseEstadoCandidato = 'badge ms-2 bg-secondary';
              let textoEstadoCandidato = 'Offline';
              if (candidate.online) {
                claseEstadoCandidato = 'badge ms-2 bg-success';
                textoEstadoCandidato = 'Online';
              }

              return (
                <div
                  key={candidate.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div>
                    <span className="me-2">{candidate.avatar || '👤'}</span>
                    <strong>{candidate.username}</strong>
                    <span
                      className={claseEstadoCandidato}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {textoEstadoCandidato}
                    </span>
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleAgregarDesdeResultado(candidate)}
                  >
                    Agregar
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  let contenidoPendientes = (
    <div className="text-muted mb-3">
      <small>No tienes solicitudes pendientes</small>
    </div>
  );
  if (pendientes.length > 0) {
    contenidoPendientes = (
      <div className="list-group mb-3">
        {pendientes.map((solicitud) => (
          <div
            key={solicitud.id}
            className="list-group-item d-flex justify-content-between align-items-center"
          >
            <div>
              <span className="me-2">{solicitud.sender?.avatar || '👤'}</span>
              <strong>{solicitud.sender?.username || 'Usuario'}</strong>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-success"
                onClick={() => handleAccept(solicitud.id)}
              >
                Aceptar
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => handleReject(solicitud.id)}
              >
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  let contenidoAmigos = (
    <div className="text-center text-muted py-5">
      <p>No tienes amigos aún</p>
      <small>Agrega amigos para comenzar</small>
    </div>
  );
  if (loading) {
    contenidoAmigos = <div className="text-center text-muted py-4">Cargando...</div>;
  }
  if (!loading && amigos.length > 0) {
    contenidoAmigos = (
      <div className="list-group">
        {amigos.map((amigo) => {
          let claseEstadoAmigo = 'badge ms-2 bg-secondary';
          let textoEstadoAmigo = 'Offline';
          if (amigo.online) {
            claseEstadoAmigo = 'badge ms-2 bg-success';
            textoEstadoAmigo = 'Online';
          }

          return (
            <div
              key={amigo.id}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <div>
                <span className="me-2">{amigo.avatar || '👤'}</span>
                <strong>{amigo.username}</strong>
                <span
                  className={claseEstadoAmigo}
                  style={{ fontSize: '0.7rem' }}
                >
                  {textoEstadoAmigo}
                </span>
              </div>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => handleRemoveFriend(amigo.id)}
              >
                Eliminar
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div 
      className={claseOffcanvas}
      tabIndex="-1"
      style={{ visibility: visibilidadOffcanvas }}
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
              onChange={(eventoTexto) => setBuscarAmigo(eventoTexto.target.value)}
            />
            <button 
              className="btn btn-primary" 
              onClick={handleAgregarAmigo}
            >
              ➕ Agregar
            </button>
          </div>

          {contenidoBusqueda}
        </div>

        <hr />

        <h6>Solicitudes pendientes ({pendientes.length})</h6>
        {contenidoPendientes}

        <hr />

        {/* Lista de amigos */}
        <h6>Mis amigos ({amigos.length})</h6>
        {contenidoAmigos}
      </div>
    </div>
  );
}

export default AmigosOffcanvas;
