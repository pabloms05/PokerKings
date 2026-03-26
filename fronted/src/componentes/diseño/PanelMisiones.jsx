import React from 'react';

function MisionesOffcanvas({ show, onHide }) {
  // Lista de misiones diarias (vendrá del backend)
  const misiones = [];

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
        {misiones.length === 0 ? (
          <div className="text-center text-muted py-5">
            <p>No hay misiones disponibles</p>
            <small>Las misiones diarias se actualizarán pronto</small>
          </div>
        ) : (
          <div className="list-group">
            {misiones.map(mision => (
              <div key={mision.id} className="list-group-item">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">{mision.nombre}</h6>
                  <span className="badge bg-warning text-dark">
                    💰 {mision.recompensa} fichas
                  </span>
                </div>
                <div className="progress">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${(mision.progreso / mision.total) * 100}%` }}
                  >
                    {mision.progreso}/{mision.total}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MisionesOffcanvas;
