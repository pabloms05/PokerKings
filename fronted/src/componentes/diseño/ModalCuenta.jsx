import React, { useState, useEffect } from 'react';
import './ModalCuenta.css';

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
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '🎮');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false); // FIX: Estado de carga

  // Encontrar el índice del avatar actual
  useEffect(() => {
    if (user?.avatar) {
      const index = AVATAR_OPTIONS.indexOf(user.avatar);
      if (index !== -1) {
        setCurrentIndex(index);
      }
      setSelectedAvatar(user.avatar);
    }
  }, [user]);

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

  const handleSave = async () => {
    if (onUpdateAvatar && hasChanges) {
      // FIX: Mostrar indicador de carga
      setSaving(true);
      try {
        await onUpdateAvatar(selectedAvatar);
        setHasChanges(false);
      } catch (error) {
        console.error('Error guardando avatar:', error);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCancel = () => {
    setSelectedAvatar(user?.avatar || '🎮');
    const index = AVATAR_OPTIONS.indexOf(user?.avatar || '🎮');
    if (index !== -1) {
      setCurrentIndex(index);
    }
    setHasChanges(false);
    onHide();
  };

  if (!show) return null;

  return (
    <div className="account-modal-overlay" onClick={handleCancel}>
      <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="account-modal-header">
          <h2>👤 Mi Cuenta</h2>
          <button className="btn-close-modal" onClick={handleCancel}>✕</button>
        </div>

        <div className="account-modal-body">
          {/* Información del usuario */}
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

          {/* Selector de avatar con carrusel */}
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

            {/* Vista previa de avatares cercanos */}
            <div className="avatar-preview-strip">
              {[-2, -1, 0, 1, 2].map((offset) => {
                const index = (currentIndex + offset + AVATAR_OPTIONS.length) % AVATAR_OPTIONS.length;
                return (
                  <div 
                    key={offset}
                    className={`preview-avatar ${offset === 0 ? 'active' : ''}`}
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
            {saving ? (
              <>
                <span className="spinner">⏳</span>
                Guardando...
              </>
            ) : hasChanges ? (
              '💾 Guardar Cambios'
            ) : (
              '✓ Sin Cambios'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccountModal;
