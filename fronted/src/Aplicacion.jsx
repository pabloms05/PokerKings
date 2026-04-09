import React, { useState, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import Navbar from './componentes/diseño/BarraNavegacion'
import InicioSesion from './pages/login-register/InicioSesion'
import Registro from './pages/login-register/Registro'
import PaginaInicio from './pages/inicio/Inicio'
import PaginaMesas from './pages/mesas/Mesas'
import PaginaCrearMesa from './pages/creacion-de-mesas/CrearMesa'
import PaginaPartida from './pages/partida/Partida'
import PaginaTienda from './pages/tienda/Tienda'
import './Aplicacion.css'
import './estilos/animaciones.css'
import { authService } from './servicios/autenticacion'
import { tableAPI, userAPI } from './servicios/api'
import { socketService } from './servicios/socketBase'
import { addGameInvitation, removeGameInvitation } from './servicios/invitaciones'
import { validateTableName } from './servicios/filtroNombreMesa'

function Aplicacion() {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [mostrarRegistro, setMostrarRegistro] = useState(false)
  const [vistaActual, setVistaActual] = useState(
    () => sessionStorage.getItem('nav_view') || 'inicio'
  )
  const [mesaActual, setMesaActual] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('nav_table')) } catch { return null }
  })

  // Cargar datos al iniciar
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true)
        
        // Verificar si hay usuario autenticado
        const usuarioActual = authService.getCurrentUser()
        if (usuarioActual) {
          // Cargar datos frescos desde la BD para tener fichas correctas
          try {
            const response = await userAPI.getUserById(usuarioActual.id)
            const usuarioFresco = { ...usuarioActual, ...response.data }
            setUsuario(usuarioFresco)
            sessionStorage.setItem('user', JSON.stringify(usuarioFresco))
          } catch {
            // Si falla la BD, usar sessionStorage pero sanear las fichas
            setUsuario({ ...usuarioActual, chips: Number(usuarioActual.chips) || 0 })
          }
        } else {
          // sin tablas
        }
      } catch (err) {
        console.error('Error cargando datos:', err)
      } finally {
        setCargando(false)
      }
    }

    cargarDatos()
  }, [])

  // Función cuando el inicio de sesión es exitoso
  const manejarInicioSesionExitoso = (usuarioLogueado) => {
    setUsuario(usuarioLogueado)
  }

  // Función cuando el registro es exitoso
  const manejarRegistroExitoso = (usuarioRegistrado) => {
    setUsuario(usuarioRegistrado)
    setMostrarRegistro(false)
  }

  // Función para cerrar sesión
  const manejarCerrarSesion = () => {
    authService.logout()
    sessionStorage.removeItem('nav_view')
    sessionStorage.removeItem('nav_table')
    setUsuario(null)
    setVistaActual('inicio')
    setMesaActual(null)
  }

  // Logout automático cuando el token expira (401)
  useEffect(() => {
    const onUnauthorized = () => {
      authService.logout()
      sessionStorage.removeItem('nav_view')
      sessionStorage.removeItem('nav_table')
      setUsuario(null)
      setVistaActual('inicio')
      setMesaActual(null)
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, []) // setters de useState son estables, no necesitan deps

  // Función para actualizar usuario
  const manejarActualizarUsuario = async (usuarioActualizado) => {
    setUsuario(usuarioActualizado)
    sessionStorage.setItem('user', JSON.stringify(usuarioActualizado))
    try {
      await userAPI.updateProfile(usuarioActualizado.id, {
        avatar: usuarioActualizado.avatar,
        chips: usuarioActualizado.chips,
      })
    } catch (err) {
      console.warn('No se pudo guardar perfil en backend:', err)
    }
  }

  // Navegación entre vistas
  const manejarNavegacion = (vista) => {
    sessionStorage.setItem('nav_view', vista)
    if (vista !== 'partida') {
      sessionStorage.removeItem('nav_table')
      setMesaActual(null)
    }
    setVistaActual(vista)
  }

  // Notificaciones de invitación a partida en tiempo real
  useEffect(() => {
    if (!usuario?.id) return;

    const token = authService.getToken();
    if (token) {
      socketService.connect(token);
    }

    const manejarInvitacionPartida = (invitacion) => {
      const invitacionGuardada = addGameInvitation(invitacion)
      const nombreInvitador = invitacion?.from?.username || 'Un amigo';
      const nombreMesa = invitacion?.table?.name || 'una mesa';

      toast((t) => (
        <div style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '0.6rem' }}>
            <strong>{nombreInvitador}</strong> te invitó a <strong>{nombreMesa}</strong>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => toast.dismiss(t.id)}
              style={{
                background: '#444',
                color: 'white',
                border: 'none',
                padding: '0.45rem 0.8rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cerrar
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id)
                if (!invitacion?.table?.id) {
                  setVistaActual('mesas')
                  return
                }

                try {
                  await manejarUnirseMesa(invitacion.table, invitacion.invitationToken)
                  if (invitacionGuardada?.id) {
                    removeGameInvitation(invitacionGuardada.id)
                  }
                } catch {
                  setVistaActual('mesas')
                }
              }}
              style={{
                background: '#0b6623',
                color: 'white',
                border: 'none',
                padding: '0.45rem 0.8rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Unirme
            </button>
          </div>
        </div>
      ), { duration: 7000, id: `game-invite-${invitacionGuardada?.id || invitacion?.gameId || Date.now()}` })
    }

    socketService.onGameInvitation(manejarInvitacionPartida)
    return () => socketService.offGameInvitation(manejarInvitacionPartida)
  }, [usuario?.id])

  // Permitir navegar a una mesa al aceptar invitación desde el panel de invitaciones.
  useEffect(() => {
    const onNavigateToInvitationTable = (event) => {
      const mesa = event?.detail?.table
      if (!mesa?.id) return

      sessionStorage.setItem('nav_table', JSON.stringify(mesa))
      sessionStorage.setItem('nav_view', 'partida')
      setMesaActual(mesa)
      setVistaActual('partida')
    }

    window.addEventListener('invitacion:abrir-mesa', onNavigateToInvitationTable)
    return () => window.removeEventListener('invitacion:abrir-mesa', onNavigateToInvitationTable)
  }, [])

  // Unirse a mesa
  const manejarUnirseMesa = async (mesa, tokenInvitacion = null) => {
    try {
      console.log('Unirse a mesa:', mesa)
      const response = await tableAPI.joinTable(mesa.id, tokenInvitacion)
      const mesaResuelta = response.data?.table || mesa

      // Solo entrar a mesa cuando el backend confirma join
      sessionStorage.setItem('nav_table', JSON.stringify(mesaResuelta))
      sessionStorage.setItem('nav_view', 'partida')
      setMesaActual(mesaResuelta)
      setVistaActual('partida')
    } catch (err) {
      console.error('Error uniéndose a mesa:', err)
      toast.error(err?.response?.data?.message || 'No se pudo unir a la mesa')
    }
  }

  // Crear mesa
  const manejarCrearMesa = async (datosFormulario) => {
    try {
      console.log('Creando mesa:', datosFormulario)
      const validacionNombre = validateTableName(datosFormulario.tableName)
      if (!validacionNombre.isValid) {
        toast.error(validacionNombre.message)
        return
      }
      
      // Llamar al backend para crear la mesa
      const datosMesa = {
        name: datosFormulario.tableName,
        smallBlind: datosFormulario.smallBlind,
        bigBlind: datosFormulario.bigBlind,
        maxPlayers: datosFormulario.maxPlayers,
        isPrivate: datosFormulario.isPrivate,
        botsCount: datosFormulario.bots
      }
      
      try {
        const response = await tableAPI.createTable(datosMesa)
        
        // Establecer la mesa creada como mesa actual
        const mesaCreada = {
          ...response.data,
          players: [usuario], // El creador es el primer jugador
          botsCount: datosFormulario.bots
        }
        sessionStorage.setItem('nav_table', JSON.stringify(mesaCreada))
        sessionStorage.setItem('nav_view', 'partida')
        setMesaActual(mesaCreada)
        
        setVistaActual('partida')
        
      } catch (apiError) {
        if (apiError?.response) {
          throw apiError
        }

        // Si backend no está disponible, crear mesa localmente
        console.warn('Backend no disponible, creando mesa localmente')
        const mesaLocal = {
          id: Date.now(),
          ...datosMesa,
          players: [usuario],
          status: 'waiting'
        }
        sessionStorage.setItem('nav_table', JSON.stringify(mesaLocal))
        sessionStorage.setItem('nav_view', 'partida')
        setMesaActual(mesaLocal)
        setVistaActual('partida')
      }
    } catch (err) {
      console.error('Error creando mesa:', err)
      toast.error(err?.response?.data?.message || 'No se pudo crear la mesa')
    }
  }

  if (cargando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e27', color: '#daa520', fontSize: '1.2rem' }}>
        <span>Cargando...</span>
      </div>
    )
  }

  // Si no hay usuario, mostrar inicio de sesión o registro
  if (!usuario) {
    return (
      <div className="App">
        {mostrarRegistro ? (
          <Registro
            alRegistroExitoso={manejarRegistroExitoso}
            alCambiarALogin={() => setMostrarRegistro(false)}
          />
        ) : (
          <InicioSesion
            alIniciarSesionExito={manejarInicioSesionExitoso}
            alCambiarARegistro={() => setMostrarRegistro(true)}
          />
        )}
      </div>
    )
  }

  // Si hay usuario, mostrar la aplicación principal
  return (
    <div className="App">
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a1a2e',
            color: '#daa520',
            border: '2px solid #daa520',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '1rem',
            fontWeight: 'bold',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
          },
          success: {
            iconTheme: {
              primary: '#0b6623',
              secondary: '#daa520',
            },
          },
          error: {
            iconTheme: {
              primary: '#c41e3a',
              secondary: '#daa520',
            },
          },
        }}
      />
      
      <Navbar user={usuario} onLogout={manejarCerrarSesion} onUpdateUser={manejarActualizarUsuario} onNavigate={manejarNavegacion} />
      
      {/* Renderizar vista actual */}
      {vistaActual === 'inicio' && (
        <PaginaInicio onNavigate={manejarNavegacion} />
      )}

      {vistaActual === 'mesas' && (
        <PaginaMesas
          user={usuario}
          onNavigate={manejarNavegacion}
          onJoinTable={manejarUnirseMesa}
        />
      )}

      {vistaActual === 'crear' && (
        <PaginaCrearMesa
          onNavigate={manejarNavegacion}
          onCreate={manejarCrearMesa}
        />
      )}

      {vistaActual === 'partida' && mesaActual && (
        <PaginaPartida
          table={mesaActual}
          user={usuario}
          onUpdateUser={manejarActualizarUsuario}
          onNavigate={manejarNavegacion}
        />
      )}

      {vistaActual === 'tienda' && (
        <PaginaTienda
          usuario={usuario}
          alNavegar={manejarNavegacion}
          alActualizarUsuario={manejarActualizarUsuario}
        />
      )}
    </div>
  )
}

export default Aplicacion
