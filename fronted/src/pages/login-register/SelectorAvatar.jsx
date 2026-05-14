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
  // Estado local del selector: galeria abierta/cerrada
  const [estaAbierto, setEstaAbierto] = useState(false);

  // Valores derivados: emoji a mostrar segun seleccion
  let emojiAvatarSeleccionado = '👤';
  if (avatarSeleccionado) {
    emojiAvatarSeleccionado = avatarSeleccionado;
  }

  // Handlers: seleccionar avatar y cerrar galeria
  const manejarSeleccionAvatar = (avatar) => {
    alSeleccionarAvatar(avatar);
    setEstaAbierto(false);
  };

  // Render del selector con galeria y boton de cierre
  return (
    <div className="avatar-selector">
      <label className="form-label">
        😊 Elige tu Avatar
      </label>
      
      <div className="avatar-display" onClick={() => setEstaAbierto(!estaAbierto)}>
        <div className="selected-avatar">
          <span className="avatar-emoji">{emojiAvatarSeleccionado}</span>
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
            {OPCIONES_AVATAR.map((avatarOpcion, indiceOpcion) => {
              let claseOpcion = 'avatar-option';
              if (avatarSeleccionado === avatarOpcion) {
                claseOpcion = 'avatar-option selected';
              }

              return (
                <button
                  key={indiceOpcion}
                  type="button"
                  className={claseOpcion}
                  onClick={() => manejarSeleccionAvatar(avatarOpcion)}
                >
                  {avatarOpcion}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SelectorAvatar;
