import React, { useCallback, useEffect, useState } from 'react';
import { achievementAPI } from '../../servicios/api';

function TrofeosOffcanvas({ show, onHide }) {
  // Lista de trofeos (vendrá del backend)
  const trofeos = [];

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
        {trofeos.length === 0 ? (
          <div className="text-center text-muted py-5">
            <p>No tienes trofeos aún</p>
            <small>Juega para desbloquear trofeos</small>
          </div>
        ) : (
          <div className="list-group">
            {trofeos.map(trofeo => (
              <div 
                key={trofeo.id} 
                className={`list-group-item ${trofeo.desbloqueado ? 'list-group-item-success' : ''}`}
              >
                <h6>{trofeo.nombre}</h6>
                <p className="mb-0 text-muted">{trofeo.descripcion}</p>
                {trofeo.desbloqueado && <span className="badge bg-success">✓ Desbloqueado</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TrofeosOffcanvas;
