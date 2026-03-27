// API Service - Wrapper para todas las peticiones HTTP
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Crear instancia de axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a cada petición
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido — limpiar sesión y notificar a la app
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('nav_view');
      sessionStorage.removeItem('nav_table');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// ============= AUTENTICACIÓN =============
export const authAPI = {
  register: (username, email, password, avatar) =>
    apiClient.post('/auth/register', { username, email, password, avatar }),
  
  login: (identifier, password) =>
    apiClient.post('/auth/login', { identifier, password }),
  
  getProfile: () =>
    apiClient.get('/auth/profile'),
};

// ============= USUARIOS =============
export const userAPI = {
  getProfile: () =>
    apiClient.get('/users/profile'),
  
  getUserById: (userId) =>
    apiClient.get(`/users/${userId}`),
  
  updateProfile: (userId, userData) =>
    apiClient.put(`/users/${userId}`, userData),
};

// ============= MESAS =============
export const tableAPI = {
  getAllTables: () =>
    apiClient.get('/tables'),
  
  createTable: (tableData) =>
    apiClient.post('/tables', tableData),
  
  joinTable: (tableId, invitationToken = null) =>
    apiClient.post(`/tables/${tableId}/join`, invitationToken ? { invitationToken } : {}),
  
  leaveTable: (tableId) =>
    apiClient.post(`/tables/${tableId}/leave`),
  
  getTableById: (tableId) =>
    apiClient.get(`/tables/${tableId}`),
};

// ============= JUEGO (INTEGRACIÓN CON BACKEND) =============
export const gameAPI = {
  // Crear/iniciar un juego
  startGame: (tableId, playerIds) =>
    apiClient.post('/games/start', { tableId, playerIds }),
  
  // Obtener estado del juego
  getGame: (gameId) =>
    apiClient.get(`/games/${gameId}`),
  
  // Enviar acción del jugador
  playerAction: (gameId, action, amount = 0) => {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const userId = user.id || user.userId;
    return apiClient.post(`/games/${gameId}/action`, { userId, action, amount });
  },
  
  // Obtener historial de juegos
  getPlayerGames: (userId) =>
    apiClient.get(`/games/player/${userId}`),
  
  // Obtener historial de la mesa
  getGameHistory: (tableId) =>
    apiClient.get(`/games/table/${tableId}/history`),
  
  // Obtener detalles de una mano
  getHandDetails: (gameId, handId) =>
    apiClient.get(`/games/${gameId}/hands/${handId}`),
  
  // Salir de un juego
  leaveGame: (gameId, userId) =>
    apiClient.post(`/games/${gameId}/leave`, { userId }),

  // Invitar amigos a una partida
  inviteFriends: (gameId, friendIds) =>
    apiClient.post(`/games/${gameId}/invite`, { friendIds }),
};

// ============= TIENDA =============
export const shopAPI = {
  buyChips: (packageId, amount) =>
    apiClient.post('/shop/buy', { packageId, amount }),
  
  getPackages: () =>
    apiClient.get('/shop/packages'),
};

// ============= AMIGOS =============
export const friendAPI = {
  getFriends: () =>
    apiClient.get('/friends'),

  searchUsers: (query, limit = 8) =>
    apiClient.get(`/friends/search?q=${encodeURIComponent(String(query || '').trim())}&limit=${limit}`),
  
  sendFriendRequest: (target) => {
    if (typeof target === 'string') {
      const value = target.trim();
      // UUID-ish value => receiverId, otherwise username.
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      return apiClient.post('/friends/request', isUuid ? { receiverId: value } : { username: value });
    }
    return apiClient.post('/friends/request', target || {});
  },
  
  acceptFriendRequest: (requestId) =>
    apiClient.post(`/friends/request/${requestId}/accept`),
  
  rejectFriendRequest: (requestId) =>
    apiClient.post(`/friends/request/${requestId}/reject`),
  
  removeFriend: (friendId) =>
    apiClient.delete(`/friends/${friendId}`),

  getOnlineStatus: (friendIds = []) => {
    const ids = (Array.isArray(friendIds) ? friendIds : [])
      .map((id) => String(id || '').trim())
      .filter(Boolean)
      .join(',');
    return apiClient.get(`/friends/online-status?ids=${encodeURIComponent(ids)}`);
  },
  
  getPendingRequests: () =>
    apiClient.get('/friends/requests/pending'),
};

// ============= HISTORIAL DE MANOS =============
export const handAPI = {
  getHandHistory: (limit = 20, offset = 0) =>
    apiClient.get(`/hands?limit=${limit}&offset=${offset}`),
  
  getHandById: (handId) =>
    apiClient.get(`/hands/${handId}`),
  
  getHandStats: () =>
    apiClient.get('/hands/stats'),
};

// ============= MISIONES =============
export const missionAPI = {
  getAllMissions: () =>
    apiClient.get('/missions'),
  
  claimReward: (missionId) =>
    apiClient.post(`/missions/${missionId}/claim`),
  
  checkProgress: () =>
    apiClient.post('/missions/check-progress'),
};

export default apiClient;
