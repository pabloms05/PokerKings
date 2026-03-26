import React, { useState } from 'react';
import './SelectorAvatar.css';

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

function AvatarSelector({ selectedAvatar, onSelectAvatar }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectAvatar = (avatar) => {
    onSelectAvatar(avatar);
    setIsOpen(false);
  };

  return (
    <div className="avatar-selector">
      <label className="form-label">
        😊 Elige tu Avatar
      </label>
      
      <div className="avatar-display" onClick={() => setIsOpen(!isOpen)}>
        <div className="selected-avatar">
          <span className="avatar-emoji">{selectedAvatar || '👤'}</span>
        </div>
        <span className="avatar-label">Haz clic para cambiar</span>
      </div>

      {isOpen && (
        <div className="avatar-gallery">
          <div className="gallery-header">
            <span>Selecciona tu avatar</span>
            <button 
              type="button" 
              className="btn-close-gallery"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="avatar-grid">
            {AVATAR_OPTIONS.map((avatar, index) => (
              <button
                key={index}
                type="button"
                className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                onClick={() => handleSelectAvatar(avatar)}
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

export default AvatarSelector;
