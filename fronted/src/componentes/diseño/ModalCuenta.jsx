import React, { useState, useEffect } from 'react';
import './ModalCuenta.css';

// Constantes: lista fija de avatares disponibles para el selector
const AVATAR_OPTIONS = [
  '😀', '😎', '🤩', '😇', '🥳',
  '🤠', '🤡', '👽', '👻', '💀',
  '🎃', '🤓', '😈', '🥶', '🤯',
  '🥴', '😵', '🤑', '😺', '😸',
  '😹', '😻', '😼', '😽', '🙀',
  '😿', '😾', '🦁', '🐯', '🐻',
  '🐨', '🐼', '🐵', '🙈', '🙉',
  '🙊', '👨', '👩', '🧑', '👴',
  '👵', '🧔', '👨‍🦰', '👨‍🦱', '👨‍🦳'
];

function AccountModal({ show, onHide, user, onUpdateAvatar }) {
  // Estado del carrusel: avatar elegido, indice visible, cambios pendientes y guardado
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    let avatarInicial = '🎮';
    if (user && user.avatar) {
      avatarInicial = user.avatar;
    }
    return avatarInicial;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false); // FIX: Estado de carga

  // Efectos: mantener carrusel alineado con el avatar del usuario
  // Actualiza indice y avatar seleccionado cuando cambia user
  useEffect(() => {
    if (user && user.avatar) {
      const index = AVATAR_OPTIONS.indexOf(user.avatar);
      if (index !== -1) {
        setCurrentIndex(index);
      }
      setSelectedAvatar(user.avatar);
    }
  }, [user]);

  // Handlers: mover el carrusel y guardar cambios del avatar
  const handlePrevious = () => {
    const newIndex = (currentIndex - 1 + AVATAR_OPTIONS.length) % AVATAR_OPTIONS.length;
    setCurrentIndex(newIndex);
    setSelectedAvatar(AVATAR_OPTIONS[newIndex]);
    setHasChanges(AVATAR_OPTIONS[newIndex] !== user?.avatar);
  };

  const handleNext = () => {
    const newIndex = (currentIndex + 1) % AVATAR_OPTIONS.length;
    setCurrentIndex(newIndex);
    setSelectedAvatar(AVATAR_OPTIONS[newIndex]);
    setHasChanges(AVATAR_OPTIONS[newIndex] !== user?.avatar);
  };

  const handleSave = () => {
    if (!onUpdateAvatar || !hasChanges) {
      return;
    }

    setSaving(true);
    Promise.resolve(onUpdateAvatar(selectedAvatar)).then(
      () => {
        setHasChanges(false);
      },
      (errorGuardado) => {
        console.error('Error guardando avatar:', errorGuardado);
      }
    ).then(() => {
      setSaving(false);
    });
  };

  const handleCancel = () => {
    let avatarActual = '🎮';
    if (user && user.avatar) {
      avatarActual = user.avatar;
    }

    setSelectedAvatar(avatarActual);
    const index = AVATAR_OPTIONS.indexOf(avatarActual);
    if (index !== -1) {
      setCurrentIndex(index);
    }
    setHasChanges(false);
    onHide();
  };

  // Valores derivados: texto/estado del boton Guardar segun cambios y carga
  if (!show) return null;

  let contenidoBotonGuardar = '✓ Sin Cambios';
  if (hasChanges) {
    contenidoBotonGuardar = '💾 Guardar Cambios';
  }
  if (saving) {
    contenidoBotonGuardar = (
      <>
        <span className="spinner">⏳</span>
        Guardando...
      </>
    );
  }

  // Render del modal de cuenta con info del usuario y carrusel de avatar
  return (
    <div className="account-modal-overlay" onClick={handleCancel}>
      <div className="account-modal-content" onClick={(eventoClick) => eventoClick.stopPropagation()}>
        <div className="account-modal-header">
          <h2>👤 Mi Cuenta</h2>
          <button className="btn-close-modal" onClick={handleCancel}>✕</button>
        </div>

        <div className="account-modal-body">
          {/* Informacion del usuario: username, email, chips y nivel */}
          <div className="user-info-section">
            <div className="info-row">
              <span className="info-label">Usuario:</span>
              <span className="info-value">{user?.username || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{user?.email || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">💰 Fichas:</span>
              <span className="info-value">{user?.chips?.toLocaleString() || '0'} PK</span>
            </div>
            <div className="info-row">
              <span className="info-label">⭐ Nivel:</span>
              <span className="info-value">{user?.level || 1}</span>
            </div>
          </div>

          {/* Selector de avatar con carrusel y controles prev/next */}
          <div className="avatar-carousel-section">
            <h3>Cambiar Avatar</h3>
            <div className="avatar-carousel">
              <button 
                className="carousel-btn carousel-btn-prev" 
                onClick={handlePrevious}
                type="button"
              >
                ‹
              </button>
              
              <div className="avatar-display-large">
                <span className="avatar-emoji-large">{selectedAvatar}</span>
              </div>

              <button 
                className="carousel-btn carousel-btn-next" 
                onClick={handleNext}
                type="button"
              >
                ›
              </button>
            </div>

            <div className="avatar-counter">
              {currentIndex + 1} / {AVATAR_OPTIONS.length}
            </div>

            {/* Vista previa de avatares cercanos para seleccionar rapido */}
            <div className="avatar-preview-strip">
              {[-2, -1, 0, 1, 2].map((offset) => {
                const index = (currentIndex + offset + AVATAR_OPTIONS.length) % AVATAR_OPTIONS.length;

                let clasePreview = 'preview-avatar';
                if (offset === 0) {
                  clasePreview = 'preview-avatar active';
                }

                return (
                  <div 
                    key={offset}
                    className={clasePreview}
                    onClick={() => {
                      setCurrentIndex(index);
                      setSelectedAvatar(AVATAR_OPTIONS[index]);
                      setHasChanges(AVATAR_OPTIONS[index] !== user?.avatar);
                    }}
                  >
                    {AVATAR_OPTIONS[index]}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="account-modal-footer">
          <button className="btn-modal btn-cancel" onClick={handleCancel}>
            Cancelar
          </button>
          <button 
            className="btn-modal btn-save" 
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {contenidoBotonGuardar}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccountModal;
