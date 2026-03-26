import React, { useState, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import Navbar from './componentes/diseño/BarraNavegacion'
import Login from './pages/login-register/InicioSesion'
import Register from './pages/login-register/Registro'
import HomePage from './pages/inicio/Inicio'
import LobbyPage from './pages/mesas/Mesas'
import CreateTablePage from './pages/creacion-de-mesas/CrearMesa'
import TablePage from './pages/partida/Partida'
import Tienda from './pages/tienda/Tienda'
import './Aplicacion.css'
import './estilos/animaciones.css'
import { authService } from './servicios/autenticacion'
import { tableAPI, userAPI } from './servicios/api'
import { socketService } from './servicios/socketBase'
import { addGameInvitation, removeGameInvitation } from './servicios/invitaciones'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const [currentView, setCurrentView] = useState(
    () => sessionStorage.getItem('nav_view') || 'inicio'
  )
  const [currentTable, setCurrentTable] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('nav_table')) } catch { return null }
  })

  // Cargar datos al iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Verificar si hay usuario autenticado
        const currentUser = authService.getCurrentUser()
        if (currentUser) {
          // Cargar datos frescos desde la BD para tener fichas correctas
          try {
            const response = await userAPI.getUserById(currentUser.id)
            const freshUser = { ...currentUser, ...response.data }
            setUser(freshUser)
            sessionStorage.setItem('user', JSON.stringify(freshUser))
          } catch {
            // Si falla la BD, usar sessionStorage pero sanear las fichas
            setUser({ ...currentUser, chips: Number(currentUser.chips) || 0 })
          }
        } else {
          // sin tablas
        }
      } catch (err) {
        console.error('Error cargando datos:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Función cuando el inicio de sesión es exitoso
  const handleLoginSuccess = (loggedUser) => {
    setUser(loggedUser)
  }

  // Función cuando el registro es exitoso
  const handleRegisterSuccess = (registeredUser) => {
    setUser(registeredUser)
    setShowRegister(false)
  }

  // Función para cerrar sesión
  const handleLogout = () => {
    authService.logout()
    sessionStorage.removeItem('nav_view')
    sessionStorage.removeItem('nav_table')
    setUser(null)
    setCurrentView('inicio')
    setCurrentTable(null)
  }

  // Logout automático cuando el token expira (401)
  useEffect(() => {
    const onUnauthorized = () => {
      authService.logout()
      sessionStorage.removeItem('nav_view')
      sessionStorage.removeItem('nav_table')
      setUser(null)
      setCurrentView('inicio')
      setCurrentTable(null)
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, []) // setters de useState son estables, no necesitan deps

  // Función para actualizar usuario
  const handleUpdateUser = async (updatedUser) => {
    setUser(updatedUser)
    sessionStorage.setItem('user', JSON.stringify(updatedUser))
    try {
      await userAPI.updateProfile(updatedUser.id, {
        avatar: updatedUser.avatar,
        chips: updatedUser.chips,
      })
    } catch (err) {
      console.warn('No se pudo guardar perfil en backend:', err)
    }
  }

  // Navegación entre vistas
  const handleNavigate = (view) => {
    sessionStorage.setItem('nav_view', view)
    if (view !== 'partida') {
      sessionStorage.removeItem('nav_table')
      setCurrentTable(null)
    }
    setCurrentView(view)
  }

  // Notificaciones de invitación a partida en tiempo real
  useEffect(() => {
    if (!user?.id) return;

    const token = authService.getToken();
    if (token) {
      socketService.connect(token);
    }

    const handleGameInvitation = (invite) => {
      const storedInvite = addGameInvitation(invite)
      const inviterName = invite?.from?.username || 'Un amigo';
      const tableName = invite?.table?.name || 'una mesa';

      toast((t) => (
        <div style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '0.6rem' }}>
            <strong>{inviterName}</strong> te invitó a <strong>{tableName}</strong>
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
                if (!invite?.table?.id) {
                  setCurrentView('mesas')
                  return
                }

                try {
                  await handleJoinTable(invite.table, invite.invitationToken)
                  if (storedInvite?.id) {
                    removeGameInvitation(storedInvite.id)
                  }
                } catch {
                  setCurrentView('mesas')
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
      ), { duration: 7000, id: `game-invite-${storedInvite?.id || invite?.gameId || Date.now()}` })
    }

    socketService.onGameInvitation(handleGameInvitation)
    return () => socketService.offGameInvitation(handleGameInvitation)
  }, [user?.id])

  // Permitir navegar a una mesa al aceptar invitación desde el panel de invitaciones.
  useEffect(() => {
    const onNavigateToInvitationTable = (event) => {
      const table = event?.detail?.table
      if (!table?.id) return

      sessionStorage.setItem('nav_table', JSON.stringify(table))
      sessionStorage.setItem('nav_view', 'partida')
      setCurrentTable(table)
      setCurrentView('partida')
    }

    window.addEventListener('invitacion:abrir-mesa', onNavigateToInvitationTable)
    return () => window.removeEventListener('invitacion:abrir-mesa', onNavigateToInvitationTable)
  }, [])

  // Unirse a mesa
  const handleJoinTable = async (table, invitationToken = null) => {
    try {
      console.log('Unirse a mesa:', table)
      const response = await tableAPI.joinTable(table.id, invitationToken)
      const resolvedTable = response.data?.table || table

      // Solo entrar a mesa cuando el backend confirma join
      sessionStorage.setItem('nav_table', JSON.stringify(resolvedTable))
      sessionStorage.setItem('nav_view', 'partida')
      setCurrentTable(resolvedTable)
      setCurrentView('partida')
    } catch (err) {
      console.error('Error uniéndose a mesa:', err)
      toast.error(err?.response?.data?.message || 'No se pudo unir a la mesa')
    }
  }

  // Crear mesa
  const handleCreateTable = async (formData) => {
    try {
      console.log('Creando mesa:', formData)
      
      // Llamar al backend para crear la mesa
      const tableData = {
        name: formData.tableName,
        smallBlind: formData.smallBlind,
        bigBlind: formData.bigBlind,
        maxPlayers: formData.maxPlayers,
        isPrivate: formData.isPrivate,
        botsCount: formData.bots
      }
      
      try {
        const response = await tableAPI.createTable(tableData)
        
        // Establecer la mesa creada como mesa actual
        const createdTable = {
          ...response.data,
          players: [user], // El creador es el primer jugador
          botsCount: formData.bots
        }
        sessionStorage.setItem('nav_table', JSON.stringify(createdTable))
        sessionStorage.setItem('nav_view', 'partida')
        setCurrentTable(createdTable)
        
        setCurrentView('partida')
        
      } catch (apiError) {
        // Si backend no está disponible, crear mesa localmente
        console.warn('Backend no disponible, creando mesa localmente')
        const localTable = {
          id: Date.now(),
          ...tableData,
          players: [user],
          status: 'waiting'
        }
        sessionStorage.setItem('nav_table', JSON.stringify(localTable))
        sessionStorage.setItem('nav_view', 'partida')
        setCurrentTable(localTable)
        setCurrentView('partida')
      }
    } catch (err) {
      console.error('Error creando mesa:', err)
      toast.error('No se pudo crear la mesa')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e27', color: '#daa520', fontSize: '1.2rem' }}>
        <span>Cargando...</span>
      </div>
    )
  }

  // Si no hay usuario, mostrar inicio de sesión o registro
  if (!user) {
    return (
      <div className="App">
        {showRegister ? (
          <Register
            onRegisterSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => setShowRegister(false)}
          />
        ) : (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setShowRegister(true)}
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
      
      <Navbar user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} onNavigate={handleNavigate} />
      
      {/* Renderizar vista actual */}
      {currentView === 'inicio' && (
        <HomePage onNavigate={handleNavigate} />
      )}

      {currentView === 'mesas' && (
        <LobbyPage 
          user={user}
          onNavigate={handleNavigate}
          onJoinTable={handleJoinTable}
        />
      )}

      {currentView === 'crear' && (
        <CreateTablePage 
          onNavigate={handleNavigate}
          onCreate={handleCreateTable}
        />
      )}

      {currentView === 'partida' && currentTable && (
        <TablePage 
          table={currentTable}
          user={user}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === 'tienda' && (
        <Tienda
          user={user}
          onNavigate={handleNavigate}
          onUpdateUser={handleUpdateUser}
        />
      )}
    </div>
  )
}

export default App
