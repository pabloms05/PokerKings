# 👥 Sistema de Múltiples Ganadores (Split Pots)

## Resumen

El sistema ahora registra **todos los ganadores** en caso de empates (split pots), no solo el ganador principal. Esto es esencial para mostrar correctamente quién ganó qué en escenarios con múltiples jugadores ganando.

## Cambios Realizados

### 1. **Game.js Model** - Nuevos Campos
```javascript
winnerIds: DataTypes.JSON,      // Array de IDs de ganadores
winners: DataTypes.JSON          // Array detallado de ganadores con info
```

### 2. **finishShowdown()** - Tracking de Múltiples Ganadores
```javascript
// Ahora registra:
game.winnerId           // Ganador principal (backward compatibility)
game.winnerIds          // Array de todos los ganadores
game.winners            // Array con detalles: {userId, username, hand, chipsWon}
```

### 3. **getGameState()** - Retorna Información Completa
```javascript
return {
  winner: game.winner || null,    // Ganador principal
  winners: game.winners || [],    // Todos los ganadores
  winnerIds: game.winnerIds || [] // IDs de ganadores
}
```

---

## 📊 Estructura de Datos

### Objeto Winner (en array `winners`)
```javascript
{
  userId: "uuid-del-jugador",
  username: "nombre_del_jugador",
  chips: 5200,           // Fichas finales totales
  hand: "Pair",          // Tipo de mano (ej: "Pair", "Flush", etc)
  description: "Pair",   // Descripción de la mano
  chipsWon: 200          // Fichas ganadas en esta mano
}
```

---

## 🎯 Casos de Uso

### Caso 1: Un Solo Ganador
```json
{
  "winnerId": "user-1",
  "winnerIds": ["user-1"],
  "winners": [
    {
      "userId": "user-1",
      "username": "jugador1",
      "chips": 5600,
      "hand": "Pair",
      "chipsWon": 600
    }
  ]
}
```

### Caso 2: Split Pot - 2 Ganadores (Empate Exacto)
```json
{
  "winnerId": "user-1",
  "winnerIds": ["user-1", "user-2"],
  "winners": [
    {
      "userId": "user-1",
      "username": "jugador1",
      "chips": 5300,
      "hand": "Pair",
      "chipsWon": 300
    },
    {
      "userId": "user-2",
      "username": "jugador2",
      "chips": 3300,
      "hand": "Pair",
      "chipsWon": 300
    }
  ]
}
```

### Caso 3: Split Pot - 3 Ganadores (Botes Múltiples)
```
Main Pot: 600 fichas → 3 ganadores (200 cada uno)
Side Pot 1: 400 fichas → 2 ganadores (200 cada uno)

Resultado:
- User 1: 400 (200 main + 200 side) ✅
- User 2: 200 (200 main) ✅
- User 3: 200 (200 main) ✅
```

---

## 🔄 Flujo de Distribución

```
1. Fin de river → Inicia finishShowdown()

2. Para cada bote lateral:
   a. Encuentra ganadores elegibles
   b. Compara sus manos
   c. Si hay empate:
      - Divide equitativamente
      - Registra en array `winners`
      - Asigna chip impar al más cercano al dealer

3. Al terminar:
   ✅ game.winners contiene todos los ganadores
   ✅ game.winnerIds lista de IDs
   ✅ game.winnerId = primer ganador (backward compat)

4. getGameState() retorna información completa
```

---

## 📝 Logging de Split Pots

El sistema logguea automáticamente cuando hay split pots:

```
[DEBUG][SPLIT_POT] Pot de 600 fichas dividido entre 2 ganadores:
  0: Player 0 (user-1)
  1: Player 1 (user-2)

[DEBUG][WINNERS] All winners: jugador1 (300 chips), jugador2 (300 chips)

[DEBUG][CHIP_ODD] Chip impar (1) asignado a player 0 (distancia: 1 desde dealer 0)
```

---

## 🧪 Testing

### Test Split Pot
```powershell
.\test-split-pot.ps1
```

Valida:
- ✅ Múltiples ganadores registrados
- ✅ `winnerIds` contiene todos los IDs
- ✅ `winners` tiene información detallada
- ✅ Chip impar asignado correctamente
- ✅ Distribución equitativa de fichas

### Test Chip Odd
```powershell
.\test-chip-odd.ps1
```

Valida:
- ✅ Chip impar asignado al más cercano al dealer
- ✅ Conservación de fichas

---

## 💡 Diferencias con Sistema Anterior

### Antes ❌
```javascript
{
  winnerId: "user-1",
  winner: { id, username, avatar }
  // Sin información de split pot
}
```

**Limitaciones:**
- Solo un ganador registrado
- No se sabe si hubo empate
- Frontend no puede mostrar split pots

### Ahora ✅
```javascript
{
  winnerId: "user-1",              // Para backward compatibility
  winnerIds: ["user-1", "user-2"], // Todos los que ganaron
  winners: [                        // Info detallada
    { userId, username, hand, chipsWon, chips }
  ]
}
```

**Ventajas:**
- Todos los ganadores registrados
- Información clara de empates
- Frontend puede mostrar "1ra: jugador1, 2da: jugador2"
- Compatible con sistema anterior

---

## 🎮 Uso en Frontend

### Mostrar Resultado
```javascript
if (gameState.winners.length > 1) {
  console.log("🏆 Split Pot entre:", gameState.winners.map(w => w.username));
} else if (gameState.winner) {
  console.log("🏆 Ganador:", gameState.winner.username);
}
```

### Mostrar Detalles
```javascript
gameState.winners.forEach((winner, idx) => {
  console.log(`${idx + 1}. ${winner.username} - ${winner.hand} (+${winner.chipsWon} chips)`);
});
```

---

## 🔍 Compatibilidad

- ✅ `winnerId` sigue funcionando (ganador principal)
- ✅ `winner` objeto sigue siendo válido
- ✅ Nuevos campos `winnerIds` y `winners` opcionales
- ✅ No rompe APIs existentes

