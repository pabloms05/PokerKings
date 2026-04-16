import React from 'react';

function TrofeosOffcanvas({ show, onHide }) {
  // Lista de trofeos (vendrá del backend)
  const trofeos = [];

  let claseOffcanvas = 'offcanvas offcanvas-start offcanvas-casino';
  if (show) {
    claseOffcanvas = 'offcanvas offcanvas-start offcanvas-casino show';
  }

  let visibilidadOffcanvas = 'hidden';
  if (show) {
    visibilidadOffcanvas = 'visible';
  }

  let contenidoTrofeos = (
    <div className="text-center text-muted py-5">
      <p>No tienes trofeos aún</p>
      <small>Juega para desbloquear trofeos</small>
    </div>
  );

  if (trofeos.length > 0) {
    contenidoTrofeos = (
      <div className="list-group">
        {trofeos.map((trofeo) => {
          let claseItemTrofeo = 'list-group-item';
          if (trofeo.desbloqueado) {
            claseItemTrofeo = 'list-group-item list-group-item-success';
          }

          let badgeDesbloqueado = null;
          if (trofeo.desbloqueado) {
            badgeDesbloqueado = <span className="badge bg-success">✓ Desbloqueado</span>;
          }

          return (
            <div
              key={trofeo.id}
              className={claseItemTrofeo}
            >
              <h6>{trofeo.nombre}</h6>
              <p className="mb-0 text-muted">{trofeo.descripcion}</p>
              {badgeDesbloqueado}
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
        <h5 className="offcanvas-title">🏆 Trofeos</h5>
        <button 
          type="button" 
          className="btn-close" 
          onClick={onHide}
        ></button>
      </div>
      <div className="offcanvas-body">
        {contenidoTrofeos}
      </div>
    </div>
  );
}

export default TrofeosOffcanvas;
