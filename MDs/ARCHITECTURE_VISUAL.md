# 🗺️ MAPA MENTAL - Frontend-Backend Integration

## 🎮 FLUJO PRINCIPAL

```
┌─────────────────────────────────────────────────────────┐
│                    USUARIO EN NAVEGADOR                 │
│                                                         │
│  http://localhost:5173                                 │
│  ┌─────────────────────────────────────────────┐       │
│  │ React App (Vite)                            │       │
│  │ ┌────────────────────────────────────────┐  │       │
│  │ │ TablePage.jsx                          │  │       │
│  │ │ ├─ usePokerGame() hook                 │  │       │
│  │ │ │  ├─ gameId                           │  │       │
│  │ │ │  ├─ winners[], winnerIds[]  ✨ NUEVO │  │       │
│  │ │ │  ├─ gamePhase                        │  │       │
│  │ │ │  └─ handleFold(), handleCall(), etc  │  │       │
│  │ │ ├─ PokerTable (muestra mesa)           │  │       │
│  │ │ ├─ BettingActions (botones)            │  │       │
│  │ │ └─ CommunityCards (5 cartas)           │  │       │
│  │ │                                        │  │       │
│  │ │ gameSocket.connect()  ← WebSocket     │  │       │
│  │ └────────────────────────────────────────┘  │       │
│  │         ↕ SOCKET.IO (WebSocket)             │       │
│  └────────┬─────────────────────────────────────┘       │
└───────────┼─────────────────────────────────────────────┘
            │
            │ WebSocket: playerAction('fold')
            │
┌───────────▼─────────────────────────────────────────────┐
│              BACKEND - Node.js + Express                │
│                                                         │
│  localhost:3000                                        │
│  ┌──────────────────────────────────────────────┐      │
│  │ app.js / server.js                           │      │
│  │ ├─ Express Routes                            │      │
│  │ │  └─ POST /games/start                      │      │
│  │ │  └─ POST /games/:id/action                 │      │
│  │ │  └─ GET /games/:id                         │      │
│  │ │                                            │      │
│  │ ├─ Socket.IO Server                          │      │
│  │ │  ├─ socket.on('playerAction')              │      │
│  │ │  ├─ socket.emit('gameStateUpdated')        │      │
│  │ │  └─ socket.emit('showdown')                │      │
│  │ │                                            │      │
│  │ ├─ game.service.js                           │      │
│  │ │  ├─ startGame() ✅                         │      │
│  │ │  ├─ playerAction() ✅                      │      │
│  │ │  ├─ finishShowdown() ✅                    │      │
│  │ │  │  ├─ compareHands()                      │      │
│  │ │  │  ├─ distributePots()                    │      │
│  │ │  │  ├─ Calcular winners[] ✨              │      │
│  │ │  │  └─ Calcular chip odd ✨              │      │
│  │ │  └─ getGameState() ✅                     │      │
│  │ │                                            │      │
│  │ └─ Models                                    │      │
│  │    ├─ Game.js ✅ (+ winnerIds, winners)     │      │
│  │    ├─ User.js ✅                            │      │
│  │    ├─ Table.js ✅                           │      │
│  │    └─ Hand.js ✅                            │      │
│  │                                            │      │
│  └─ PostgreSQL Database ✅                    │      │
│     └─ Datos persistentes                     │      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 🔄 CICLO DE UNA ACCIÓN

### Escenario: Usuario hace FOLD

```
PASO 1: USUARIO HACE CLICK EN FOLD
┌────────────────────────────────────┐
│ <button onClick={handleFold}>      │
│   Fold                              │
│ </button>                           │
└─────────────┬──────────────────────┘
              │
              ▼
PASO 2: HOOK usePokerGame
┌────────────────────────────────────┐
│ const handleFold = () => {         │
│   if (gameId && playerIndex) {     │
│     gameSocket.playerAction(       │
│       gameId,                      │
│       playerIndex,                 │
│       'fold'                       │
│     )                              │
│     setPlayerHasFolded(true)       │
│   }                                │
│ }                                  │
└─────────────┬──────────────────────┘
              │
              ▼
PASO 3: WEBSOCKET ENVÍA AL BACKEND
┌────────────────────────────────────┐
│ socket.emit('playerAction', {      │
│   gameId: 'game-123',              │
│   playerIndex: 2,                  │
│   action: 'fold'                   │
│ })                                 │
└─────────────┬──────────────────────┘
              │
              ▼
PASO 4: BACKEND RECIBE
┌────────────────────────────────────┐
│ socket.on('playerAction', (data) {│
│   const game = Game.findById(data) │
│   const player = game.players[2]   │
│   player.folded = true             │
│   game.nextTurn()                  │
│   io.emit('gameStateUpdated', game)│
│ })                                 │
└─────────────┬──────────────────────┘
              │
              ▼
PASO 5: TODOS RECIBEN UPDATE
┌────────────────────────────────────┐
│ socket.on('gameStateUpdated', (s) {│
│   setGamePhase(s.status)           │
│   setCurrentPlayerTurn(s.curIdx)   │
│   setPlayers(s.players)            │
│   // React re-renderiza            │
│ })                                 │
└─────────────┬──────────────────────┘
              │
              ▼
PASO 6: UI SE ACTUALIZA
┌────────────────────────────────────┐
│ <PokerTable players={players} />   │
│ ├─ Player 2: FOLDED ✓              │
│ ├─ Player 3: Tu turno! ✓           │
│ └─ Pot actualizado ✓               │
└────────────────────────────────────┘
```

---

## 🏆 CICLO DE SHOWDOWN (Lo Importante!)

```
FASE 1: RIVER COMPLETO (5 cartas comunitarias)
┌─────────────────────────────────────────────┐
│ gamePhase = 'river'                         │
│ players activos = 2 (otros dieron fold)    │
│ comunityCards = ['A♠', 'K♥', 'Q♦', 'J♣', '10♠']
└────────────────┬────────────────────────────┘
                 │
                 ▼
FASE 2: LLAMAR finishShowdown()
┌─────────────────────────────────────────────┐
│ ✅ Backend ejecuta:                         │
│ finishShowdown(game)                        │
│ ├─ getAllWinners() = [player1, player2]    │
│ ├─ compareHands([hand1, hand2])            │
│ │  └─ Ambas = "Pair of Aces" (empate!)    │
│ ├─ calculateSidePots()                     │
│ │  └─ Main pot = 2000                      │
│ │  └─ Remainders = 1                       │
│ └─ distributePots(pots, winners)           │
│    ├─ CADA ganador: 1000 chips             │
│    └─ CHIP ODD: calcular al más cercano    │
│                                             │
└────────────────┬────────────────────────────┘
                 │
                 ▼
FASE 3: CALCULAR CHIP ODD
┌─────────────────────────────────────────────┐
│ 6 jugadores en mesa, dealer = pos 0         │
│ Ganadores = pos 1 y pos 3                   │
│                                             │
│ distance[1] = (1 - 0 + 6) % 6 = 1  ← MÁS  │
│ distance[3] = (3 - 0 + 6) % 6 = 3          │
│                                             │
│ ✅ Player 1 obtiene el chip impar          │
│                                             │
└────────────────┬────────────────────────────┘
                 │
                 ▼
FASE 4: CREAR RESULTADO
┌─────────────────────────────────────────────┐
│ game.winners = [                            │
│   {                                         │
│     userId: 'user-1',                       │
│     username: 'Carlos',                     │
│     hand: 'Pair of Aces',                   │
│     chipsWon: 1001    ← INCLUYE ODD CHIP  │
│   },                                        │
│   {                                         │
│     userId: 'user-3',                       │
│     username: 'Maria',                      │
│     hand: 'Pair of Aces',                   │
│     chipsWon: 999                           │
│   }                                         │
│ ]                                           │
│                                             │
│ game.winnerIds = ['user-1', 'user-3']     │
│ game.pot = 0  ← COMPLETAMENTE DISTRIBUIDO  │
│                                             │
└────────────────┬────────────────────────────┘
                 │
                 ▼
FASE 5: EMITIR A FRONTEND
┌─────────────────────────────────────────────┐
│ socket.emit('showdown', {                   │
│   winners: [...],      ✨ NUEVO             │
│   winnerIds: [...],    ✨ NUEVO             │
│   pot: 0,                                   │
│   gamePhase: 'showdown'                     │
│ })                                          │
│                                             │
└────────────────┬────────────────────────────┘
                 │
                 ▼
FASE 6: ACTUALIZAR HOOK EN FRONTEND
┌─────────────────────────────────────────────┐
│ socket.on('showdown', (data) => {           │
│   setGamePhase('showdown')                  │
│   setWinners(data.winners)       ✨ NUEVO   │
│   setWinnerIds(data.winnerIds)   ✨ NUEVO   │
│   setPot(0)                                 │
│   // React re-renderiza con múltiples      │
│   // ganadores visibles!                    │
│ })                                          │
│                                             │
└────────────────┬────────────────────────────┘
                 │
                 ▼
FASE 7: UI MUESTRA RESULTADO
┌─────────────────────────────────────────────┐
│ <PokerTable winners={[carlos, maria]} />    │
│ ├─ 🏆 Carlos gana 1001 fichas               │
│ ├─ 🏆 Maria gana 999 fichas                 │
│ ├─ ♦️ Chip impar para Carlos (cercano dealer)
│ └─ Botón: Next Hand / Leave Table           │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 📦 FLUJO DE DATOS EN COMPONENTES

```
App.jsx
├─ TablePage
│  ├─ usePokerGame()  ← HOOK CON WEBSOCKET
│  │  ├─ gameId
│  │  ├─ gamePhase
│  │  ├─ winners ✨ NUEVO
│  │  ├─ winnerIds ✨ NUEVO
│  │  ├─ handleFold()
│  │  ├─ handleCall()
│  │  └─ (acciones envían a backend)
│  │
│  ├─ PokerTable
│  │  ├─ props: players, pot, winners ✨
│  │  ├─ mostrar todos los jugadores
│  │  └─ resaltar ganadores
│  │
│  ├─ BettingActions
│  │  ├─ props: canFold, canCall, canRaise
│  │  ├─ onClick={handleFold}
│  │  └─ (envía acción a backend)
│  │
│  └─ CommunityCards
│     └─ props: cards, gamePhase
```

---

## 🔐 FLUJO DE AUTENTICACIÓN

```
TOKEN FLOW:
┌─────────────┐
│  Login      │
└──────┬──────┘
       │ email + password
       ▼
┌──────────────────┐
│ Backend valida   │
│ Crea JWT token   │
└──────┬───────────┘
       │ token + user data
       ▼
┌──────────────────┐
│ localStorage     │
│ .setItem('token')│
└──────┬───────────┘
       │
       │ Cada request HTTP
       ▼
┌──────────────────────────────────┐
│ axios interceptor                │
│ Authorization: Bearer {token}    │
└──────┬───────────────────────────┘
       │
       │ WebSocket también
       ▼
┌──────────────────────┐
│ socket.io auth       │
│ {token: localStorage}│
└──────────────────────┘
```

---

## 🧠 ESTADO GLOBAL DEL HOOK

```
usePokerGame() retorna:

┌─────────────────────────────────────┐
│ GAME STATE                          │
│ ├─ gameId: string (nuevo)           │
│ ├─ gamePhase: string                │
│ ├─ pot: number                      │
│ ├─ sidePots: array                  │
│ ├─ communityCards: array            │
│ ├─ currentBet: number               │
│ ├─ dealerPosition: number           │
│ └─ currentPlayerTurn: number        │
├─ PLAYER STATE                       │
│ ├─ playerChips: number              │
│ ├─ playerBet: number                │
│ ├─ playerHoleCards: array           │
│ ├─ playerHasFolded: boolean         │
│ └─ playerHasActed: boolean          │
├─ PLAYERS                            │
│ └─ players: array of player objects │
├─ WINNERS (nuevo)  ✨               │
│ ├─ winners: array                   │
│ └─ winnerIds: array                 │
└─ ACTIONS                            │
   ├─ handleFold() → gameSocket       │
   ├─ handleCall() → gameSocket       │
   ├─ handleRaise() → gameSocket      │
   └─ handleAllIn() → gameSocket      │
```

---

## 🚀 INSTALACIÓN & EJECUCIÓN

```
PASO 1: Install Dependencies
┌──────────────────────┐
│ npm install          │ (socket.io-client)
│ en /fronted          │ ← YA HECHO ✅
└──────────────────────┘

PASO 2: Start Backend
┌──────────────────────┐
│ cd backend           │
│ npm run dev          │
│ → :3000 ✅           │
└──────────────────────┘

PASO 3: Start Frontend
┌──────────────────────┐
│ cd fronted           │
│ npm run dev          │
│ → :5173 ✅           │
└──────────────────────┘

PASO 4: Open Browser
┌──────────────────────┐
│ http://localhost     │
│         :5173        │
│                      │
│ Login → Crear Mesa   │
│ → Ver juego ✅       │
└──────────────────────┘
```

---

## 📊 SINCRONIZACIÓN EN TIEMPO REAL

```
Cuando BACKEND emite:        Frontend escucha en:
────────────────────────     ──────────────────────
gameStateUpdated        →    gameSocket.on('gameStateUpdated')
phaseChanged            →    gameSocket.on('phaseChanged')
showdown                →    gameSocket.on('showdown')
playerJoined            →    gameSocket.on('playerJoined')
playerLeft              →    gameSocket.on('playerLeft')

usePokerGame automáticamente:
├─ Recibe el evento
├─ Actualiza estado React
├─ Re-renderiza componentes
└─ Usuario ve cambios en tiempo real ✅
```

---

## ✅ CHECKLIST IMPORTANTE

```
✅ Backend corriendo en :3000
✅ Frontend corriendo en :5173  
✅ WebSocket conectado
✅ Login funciona
✅ Crear mesa funciona
✅ Unirse a mesa funciona
✅ Juego carga sin errores
✅ Ver cartas y fichas
✅ Hacer acciones (fold, call)
✅ Otros jugadores sincronizados
✅ Múltiples ganadores visibles
✅ Chip odd correctamente distribuido
```

---

**Estado**: ✅ COMPLETAMENTE INTEGRADO
**Próximo**: Testing en tiempo real
**Fecha**: 29/01/2026
