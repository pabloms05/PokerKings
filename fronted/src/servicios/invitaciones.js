const STORAGE_KEY = 'game_invitations';
const UPDATE_EVENT = 'invitaciones:updated';

const readInvitations = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeInvitations = (items) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const getGameInvitations = () => readInvitations();

export const addGameInvitation = (invite) => {
  const tableId = invite?.table?.id || invite?.tableId;
  const gameId = invite?.gameId;
  const fromId = invite?.from?.id || invite?.from?.userId || invite?.fromId || 'unknown';

  if (!tableId || !gameId) {
    return null;
  }

  const normalized = {
    id: `${gameId}:${fromId}:${tableId}`,
    type: 'game',
    gameId,
    invitationToken: invite?.invitationToken || null,
    table: {
      id: tableId,
      name: invite?.table?.name || 'Mesa'
    },
    from: {
      id: fromId,
      username: invite?.from?.username || 'Un amigo',
      avatar: invite?.from?.avatar || 'default-avatar.png'
    },
    createdAt: Date.now()
  };

  const current = readInvitations();
  const withoutDuplicate = current.filter((i) => i.id !== normalized.id);
  writeInvitations([normalized, ...withoutDuplicate]);

  return normalized;
};

export const removeGameInvitation = (invitationId) => {
  const current = readInvitations();
  writeInvitations(current.filter((i) => i.id !== invitationId));
};

export const clearGameInvitations = () => {
  writeInvitations([]);
};

export const invitationsUpdateEvent = UPDATE_EVENT;
