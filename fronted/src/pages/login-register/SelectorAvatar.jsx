import React, { useState } from 'react';
import './SelectorAvatar.css';

const OPCIONES_AVATAR = [
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

function SelectorAvatar({ avatarSeleccionado, alSeleccionarAvatar }) {
  const [estaAbierto, setEstaAbierto] = useState(false);

  const manejarSeleccionAvatar = (avatar) => {
    alSeleccionarAvatar(avatar);
    setEstaAbierto(false);
  };

  return (
    <div className="avatar-selector">
      <label className="form-label">
        😊 Elige tu Avatar
      </label>
      
      <div className="avatar-display" onClick={() => setEstaAbierto(!estaAbierto)}>
        <div className="selected-avatar">
          <span className="avatar-emoji">{avatarSeleccionado || '👤'}</span>
        </div>
        <span className="avatar-label">Haz clic para cambiar</span>
      </div>

      {estaAbierto && (
        <div className="avatar-gallery">
          <div className="gallery-header">
            <span>Selecciona tu avatar</span>
            <button 
              type="button" 
              className="btn-close-gallery"
              onClick={() => setEstaAbierto(false)}
            >
              ✕
            </button>
          </div>
          <div className="avatar-grid">
            {OPCIONES_AVATAR.map((avatar, indice) => (
              <button
                key={indice}
                type="button"
                className={`avatar-option ${avatarSeleccionado === avatar ? 'selected' : ''}`}
                onClick={() => manejarSeleccionAvatar(avatar)}
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SelectorAvatar;
