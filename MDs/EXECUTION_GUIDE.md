# 🚀 Guía de Ejecución - Mejoras Backend PokerKings

## 📋 Pre-requisitos

- ✅ Node.js backend corriendo en `http://localhost:3001/api`
- ✅ PostgreSQL con datos seeded
- ✅ PowerShell 5.1+
- ✅ Token de autenticación válido

---

## 🔧 Pasos para Testear

### Paso 1: Verificar Backend Activo
```powershell
# En terminal 1 - Backend
cd C:\Users\Pablo\Desktop\PROJECTE\PokerKings\backend
npm start
# Debe escuchar en http://localhost:3001
```

### Paso 2: Ejecutar Tests
```powershell
# En terminal 2 - Tests
cd C:\Users\Pablo\Desktop\PROJECTE\PokerKings

# Test 1: Chip Impar (Odd Chip Distribution)
.\test-chip-odd.ps1

# Test 2: Split Pot (Múltiples Ganadores)
.\test-split-pot.ps1

# Test 3: Multi-Player (Full Game Flow)
.\test-multi-player.ps1
```

---

## ✅ Resultados Esperados

### test-chip-odd.ps1
```
✅ Juego creado
✅ Preflop complete
✅ Flop complete
✅ Turn complete
✅ River complete
✅ Pot debe ser 0
✅ Total chips debe ser 18000
✅ TEST PASSED!
```

### test-split-pot.ps1
```
✅ Juego creado
✅ Preflop complete
✅ Flop complete
✅ Turn complete
✅ River complete
✅ Pot debe ser 0
✅ Total chips debe ser 18000
✅ Status debe ser finished
✅ TEST PASSED!
```

### test-multi-player.ps1
```
✅ TEST 3 PASSED!
   Full game con checks
✅ TEST 4 PASSED!
   Raise + Fold scenario
```

---

## 🎯 Qué se Testea

### Test Chip Odd
- ✅ Juego completo (preflop → river)
- ✅ Todos los jugadores en la mano
- ✅ Ganador determinado correctamente
- ✅ Chips totales conservados (18000)

### Test Split Pot
- ✅ Juego completo con checks
- ✅ Múltiples ganadores registrados
- ✅ Array `winners` contiene información
- ✅ `winnerIds` lista todos los IDs

### Test Multi-Player
- ✅ Full game flow (3 jugadores)
- ✅ Early fold scenario
- ✅ Conservación de fichas
- ✅ Correcta rotación de turnos

---

## 📊 Logs Importantes

Durante la ejecución de tests, buscar estos logs en la consola backend:

### Chip Impar
```
[DEBUG][CHIP_ODD] Chip impar (1) asignado a player 0 (distancia: 1 desde dealer 0)
```

### Split Pot
```
[DEBUG][SPLIT_POT] Pot de 600 fichas dividido entre 2 ganadores:
  0: Player 0 (...)
  1: Player 1 (...)

[DEBUG][WINNERS] All winners: jugador1 (300 chips), jugador2 (300 chips)
```

### Showdown
```
[DEBUG][SHOWDOWN] Starting showdown...
[DEBUG][SHOWDOWN] Community cards: 5 [...]
[DEBUG][SHOWDOWN] Contenders: 3
```

---

## 🔍 Verificación Manual

### Caso 1: Revisar Chip Impar
```powershell
# En test-chip-odd.ps1, después de river:
# Verificar en output:
#   ✅ El chip impar (si existe) va al más cercano del dealer
#   ✅ Suma total = 18000
```

### Caso 2: Revisar Multiple Winners
```powershell
# En test-split-pot.ps1, en RESULTADO FINAL:
# Si hubo empate (split pot):
#   📊 MÚLTIPLES GANADORES (Split Pot):
#      Ganador 0: [nombre]
#      Ganador 1: [nombre]
```

### Caso 3: Revisar Logs en Backend
```powershell
# Buscar en logs del backend:
[DEBUG][SPLIT_POT]  # Si hubo split pot
[DEBUG][CHIP_ODD]   # Si hubo chip impar
[DEBUG][WINNERS]    # Resumen de ganadores
```

---

## 🛠️ Troubleshooting

### Error: "Juego ya terminado"
```
❌ El juego avanzó a showdown cuando no debería
✅ Solución: Verificar que autoShowdown=false en POST actions
```

### Error: "Pot no es positivo"
```
❌ El pot se distribuyó antes de tiempo
✅ Solución: Verificar que pot = 0 solo después de finishShowdown
```

### Error: "Total chips no es 18000"
```
❌ Se perdieron o crearon fichas
✅ Solución: Revisar distributeSidePots() - debe sumar exactamente
```

### Múltiples ganadores no aparecen
```
❌ Los ganadores no se registraron
✅ Solución: Verificar que allWinners Set se completa correctamente
```

---

## 📝 Documentación

| Archivo | Tema |
|---------|------|
| `CHIP_ODD_DISTRIBUTION.md` | Sistema de chip impar |
| `MULTIPLE_WINNERS.md` | Sistema de múltiples ganadores |
| `IMPLEMENTATION_SUMMARY.md` | Resumen técnico |
| `IMPROVEMENTS_SUMMARY.md` | Resumen ejecutivo |

---

## 🎮 Próximo Paso: Timeouts

Una vez validados estos tests, siguiente implementar:

```powershell
# Test de timeout (próximo)
.\test-timeouts.ps1
```

Requiere:
- Timer en `processPlayerAction()`
- Auto-fold si se agota tiempo
- Configuración por mesa

---

## ⚡ Quick Reference

### Iniciar Backend
```powershell
cd backend && npm start
```

### Ejecutar Todos los Tests
```powershell
.\test-chip-odd.ps1
.\test-split-pot.ps1
.\test-multi-player.ps1
```

### Ver Logs Backend
```
Buscar en consola del backend:
[DEBUG][CHIP_ODD]
[DEBUG][SPLIT_POT]
[DEBUG][WINNERS]
[DEBUG][SHOWDOWN]
```

### Validar Cambios BD
```javascript
// Nuevos campos en Game model:
winnerIds: JSON
winners: JSON
```

---

## 🎯 Checklist Completitud

- ✅ Chip impar distribuido según dealer
- ✅ Múltiples ganadores registrados
- ✅ Tests validando funcionalidad
- ✅ Documentación completa
- ✅ Backward compatible
- ✅ Logging detallado

---

## 📞 Soporte Rápido

**Pregunta**: ¿Dónde está implementado el chip impar?
**Respuesta**: `game.service.js:335-355` en `finishShowdown()`

**Pregunta**: ¿Cómo acceder a múltiples ganadores desde Frontend?
**Respuesta**: En `getGameState()` response: `state.winners` array

**Pregunta**: ¿Se mantiene backward compatibility?
**Respuesta**: Sí, `winnerId` sigue siendo válido

---

*Última actualización: 29/01/2026*
*Guía v1.0 - Ejecución de Mejoras Backend*
