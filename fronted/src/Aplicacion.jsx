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
    const textoMesaGuardada = sessionStorage.getItem('nav_table')
    if (!textoMesaGuardada) {
      return null
    }
    return JSON.parse(textoMesaGuardada)
  })

  // Cargar datos al iniciar
  useEffect(() => {
    const cargarDatos = () => {
      setCargando(true)

      const usuarioActual = authService.getCurrentUser()
      if (!usuarioActual) {
        setCargando(false)
        return
      }

      userAPI.getUserById(usuarioActual.id).then(
        (respuestaUsuario) => {
          const usuarioFresco = { ...usuarioActual, ...respuestaUsuario.data }
          setUsuario(usuarioFresco)
          sessionStorage.setItem('user', JSON.stringify(usuarioFresco))
        },
        () => {
          setUsuario({ ...usuarioActual, chips: Number(usuarioActual.chips) || 0 })
        }
      ).then(() => {
        setCargando(false)
      })
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
  const manejarActualizarUsuario = (usuarioActualizado) => {
    setUsuario(usuarioActualizado)
    sessionStorage.setItem('user', JSON.stringify(usuarioActualizado))

    userAPI.updateProfile(usuarioActualizado.id, {
        avatar: usuarioActualizado.avatar,
        chips: usuarioActualizado.chips,
      }).then(
      () => {},
      (errorDePerfil) => {
        console.warn('No se pudo guardar perfil en backend:', errorDePerfil)
      }
    )
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
    if (!usuario || !usuario.id) return;

    const token = authService.getToken();
    if (token) {
      socketService.connect(token);
    }

    const manejarInvitacionPartida = (invitacion) => {
      const invitacionGuardada = addGameInvitation(invitacion)
      const nombreInvitador = invitacion?.from?.username || 'Un amigo';
      const nombreMesa = invitacion?.table?.name || 'una mesa';

      toast((instanciaToast) => (
        <div style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '0.6rem' }}>
            <strong>{nombreInvitador}</strong> te invitó a <strong>{nombreMesa}</strong>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => toast.dismiss(instanciaToast.id)}
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
              onClick={() => {
                toast.dismiss(instanciaToast.id)
                if (!invitacion || !invitacion.table || !invitacion.table.id) {
                  setVistaActual('mesas')
                  return
                }

                manejarUnirseMesa(invitacion.table, invitacion.invitationToken).then(
                  () => {
                    if (invitacionGuardada && invitacionGuardada.id) {
                      removeGameInvitation(invitacionGuardada.id)
                    }
                  },
                  () => {
                    setVistaActual('mesas')
                  }
                ).then(() => {
                  setVistaActual('mesas')
                })
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
      if (!mesa || !mesa.id) return

      sessionStorage.setItem('nav_table', JSON.stringify(mesa))
      sessionStorage.setItem('nav_view', 'partida')
      setMesaActual(mesa)
      setVistaActual('partida')
    }

    window.addEventListener('invitacion:abrir-mesa', onNavigateToInvitationTable)
    return () => window.removeEventListener('invitacion:abrir-mesa', onNavigateToInvitationTable)
  }, [])

  // Unirse a mesa
  const manejarUnirseMesa = (mesa, tokenInvitacion = null) => {
    console.log('Unirse a mesa:', mesa)
    return tableAPI.joinTable(mesa.id, tokenInvitacion).then(
      (respuestaJoin) => {
        const mesaResuelta = respuestaJoin.data?.table || mesa
        sessionStorage.setItem('nav_table', JSON.stringify(mesaResuelta))
        sessionStorage.setItem('nav_view', 'partida')
        setMesaActual(mesaResuelta)
        setVistaActual('partida')
      },
      (errorJoin) => {
        console.error('Error uniéndose a mesa:', errorJoin)
        toast.error(errorJoin?.response?.data?.message || 'No se pudo unir a la mesa')
        return Promise.reject(errorJoin)
      }
    )
  }

  // Crear mesa
  const manejarCrearMesa = (datosFormulario) => {
    console.log('Creando mesa:', datosFormulario)
    const validacionNombre = validateTableName(datosFormulario.tableName)
    if (!validacionNombre.isValid) {
      toast.error(validacionNombre.message)
      return
    }

    const datosMesa = {
      name: datosFormulario.tableName,
      smallBlind: datosFormulario.smallBlind,
      bigBlind: datosFormulario.bigBlind,
      maxPlayers: datosFormulario.maxPlayers,
      isPrivate: datosFormulario.isPrivate,
      botsCount: datosFormulario.bots
    }

    tableAPI.createTable(datosMesa).then(
      (respuestaCreacion) => {
        const mesaCreada = {
          ...respuestaCreacion.data,
          players: [usuario],
          botsCount: datosFormulario.bots
        }

        sessionStorage.setItem('nav_table', JSON.stringify(mesaCreada))
        sessionStorage.setItem('nav_view', 'partida')
        setMesaActual(mesaCreada)
        setVistaActual('partida')
      },
      (errorCreacion) => {
        if (errorCreacion && errorCreacion.response) {
          console.error('Error creando mesa:', errorCreacion)
          toast.error(errorCreacion?.response?.data?.message || 'No se pudo crear la mesa')
          return
        }

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
    )
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
    let contenidoAcceso = (
      <InicioSesion
        alIniciarSesionExito={manejarInicioSesionExitoso}
        alCambiarARegistro={() => setMostrarRegistro(true)}
      />
    )

    if (mostrarRegistro) {
      contenidoAcceso = (
        <Registro
          alRegistroExitoso={manejarRegistroExitoso}
          alCambiarALogin={() => setMostrarRegistro(false)}
        />
      )
    }

    return (
      <div className="App">
        {contenidoAcceso}
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
        <PaginaInicio onNavigate={manejarNavegacion} user={usuario} />
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
