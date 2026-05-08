// Servicio de Autenticación - Manejo de autenticación y sesión
import { authAPI } from './api';
import { socketService } from './socketBase';

// Servicio principal
export const authService = {
  // Registrarse
  register: async (username, email, password, avatar = '🎮') => {
    try {
      const response = await authAPI.register(username, email, password, avatar);
      const { token, user } = response.data;

      // Guardar en sessionStorage (por pestaña)
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));

      // Conectar Socket.IO con el token (solo si backend está disponible)
      try {
        socketService.connect(token);
      } catch (err) {
        console.warn('Socket.IO no disponible');
      }

      return { success: true, user, token };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'No se pudo registrar el usuario',
        fieldErrors: error.response?.data?.errors || {}
      };
    }
  },

  // Iniciar sesión
  login: async (identifier, password) => {
    try {
      const normalizedIdentifier = typeof identifier === 'string' ? identifier.trim() : '';
      const response = await authAPI.login(normalizedIdentifier, password);
      const { token, user } = response.data;

      // Guardar en sessionStorage (por pestaña)
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));

      // Conectar Socket.IO con el token (solo si backend está disponible)
      try {
        socketService.connect(token);
      } catch (err) {
        console.warn('Socket.IO no disponible');
      }

      return { success: true, user, token };
    } catch (error) {
      console.error('❌ Error de login en backend:');
      console.error('   Status:', error.response?.status);
      console.error('   Data:', error.response?.data);
      console.error('   Message:', error.message);

      return {
        success: false,
        error: error.response?.data?.message || 'Usuario o contraseña incorrectos',
      };
    }
  },

  // Sesion local
  // Obtener usuario actual
  getCurrentUser: () => {
    const user = sessionStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      
      // Asegurar que el usuario tenga nivel por defecto si no lo tiene
      if (!parsedUser.level) {
        parsedUser.level = 1;
      }
      
      // Solo normalizar avatar si está vacío o es claramente una ruta de archivo
      // FIX: Verificar si empieza con http:// o /assets/ en lugar de solo buscar '/'
      const isImagePath = parsedUser.avatar && typeof parsedUser.avatar === 'string' && 
                         (parsedUser.avatar.startsWith('http://') || 
                          parsedUser.avatar.startsWith('https://') || 
                          parsedUser.avatar.startsWith('/assets/') || 
                          parsedUser.avatar.includes('.png') || 
                          parsedUser.avatar.includes('.jpg') || 
                          parsedUser.avatar.includes('.jpeg') ||
                          parsedUser.avatar.includes('.gif') ||
                          parsedUser.avatar === 'default-avatar.png');
      
      if (!parsedUser.avatar || isImagePath) {
        parsedUser.avatar = '🎮';
      }
      
      return parsedUser;
    }
    return null;
  },

  // Obtener token
  getToken: () => sessionStorage.getItem('token'),

  // Verificar si está autenticado
  isAuthenticated: () => {
    return !!sessionStorage.getItem('token');
  },

  // Cerrar sesión
  logout: () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    socketService.disconnect();
  },

  // Perfil remoto
  // Obtener perfil actual del servidor
  getProfile: async () => {
    try {
      const response = await authAPI.getProfile();
      const user = response.data;
      
      // Actualizar en sessionStorage
      sessionStorage.setItem('user', JSON.stringify(user));
      
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Error al obtener perfil',
      };
    }
  },

  // Sesion remota
  // Renovar token (si el servidor lo requiere)
  refreshToken: async () => {
    try {
      const response = await authAPI.getProfile();
      const { token } = response.data;
      
      if (token) {
        sessionStorage.setItem('token', token);
      }
      
      return { success: true };
    } catch (error) {
      // Si falla, el usuario debe loguearse de nuevo
      authService.logout();
      return { success: false };
    }
  },
};

// No inicializar Socket.IO automáticamente - solo cuando el usuario haga login
// if (authService.isAuthenticated()) {
//   socketService.connect(authService.getToken());
// }

export default authService;
