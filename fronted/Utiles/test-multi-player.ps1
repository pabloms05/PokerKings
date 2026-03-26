$ErrorActionPreference = "Continue"

$base = "http://localhost:3001/api"
$script:hasErrors = $false

function Assert($condition, $message) {
  if (-not $condition) {
    Write-Host "❌ $message" -ForegroundColor Red
    $script:hasErrors = $true
  } else {
    Write-Host "✅ $message" -ForegroundColor Green
  }
}

# Login
Write-Host "🔐 Login..." -ForegroundColor Cyan
try {
  $loginResponse = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -Body (@{
    email = "jugador1@pokerkings.com"
    password = "password123"
  } | ConvertTo-Json) -ContentType "application/json"
} catch {
  Write-Host "❌ ERROR en login: $($_.Exception.Message)" -ForegroundColor Red
  Read-Host "Pulsa Enter para terminar"
  exit
}

$token = $loginResponse.token
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

$user1 = "179505ce-fe5a-4469-bfc0-b54fb928f4d0" # BTN (dealer) con 3+
$user2 = "4a6dc974-8c6f-46c1-923f-193bfda909ba" # SB
$user3 = "a4bcf54f-61b4-4924-8edd-610859036284" # BB (jugador3)

# =============================================================================
# TEST 3: 3 Jugadores - Full Game con checks
# =============================================================================
Write-Host "`n════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "🎰 TEST 3: 3 Players - Full Game (All Checks)" -ForegroundColor Magenta
Write-Host "════════════════════════════════════════`n" -ForegroundColor Magenta

Write-Host "📋 Setup..."
try {
  $tableRes = Invoke-RestMethod -Method Post -Uri "$base/tables" -Headers $headers -Body (@{
    name = "Test3P_$(Get-Random)"
    smallBlind = 100
    bigBlind = 200
    maxPlayers = 6
  } | ConvertTo-Json) -ContentType "application/json"
  $tableId = $tableRes.id

  $gameStart = Invoke-RestMethod -Method Post -Uri "$base/games/start" -Headers $headers -Body (@{
    tableId   = $tableId
    playerIds = @($user1, $user2, $user3)
  } | ConvertTo-Json) -ContentType "application/json"
  $gameId = $gameStart.game.id
  $state = $gameStart.game

  Write-Host "✅ Juego creado: $gameId"
  Write-Host "   Players: $($state.players.Count)"
  Write-Host "   Phase: $($state.phase)"
  Write-Host "   Pot: $($state.pot)"
  Write-Host "   Current Player Index: $($state.currentPlayerIndex)"
  Write-Host ""

  # Mostrar estado inicial de cada jugador
  for ($i = 0; $i -lt $state.players.Count; $i++) {
    $p = $state.players[$i]
    $isDealer = if ($i -eq 0) { "(BTN)" } else { "" }
    $isSB = if ($state.smallBlindId -eq $p.userId) { "(SB)" } else { "" }
    $isBB = if ($state.bigBlindId -eq $p.userId) { "(BB)" } else { "" }
    $isCurrent = if ($i -eq $state.currentPlayerIndex) { "👉" } else { "  " }
    
    Write-Host "   $isCurrent Player ${i} $isDealer$isSB$isBB : $($p.chips) chips (committed: $($p.committed))"
  }
  Write-Host ""

  # Validaciones iniciales
  Assert ($state.phase -eq "preflop") "Phase debe ser preflop"
  Assert ($state.players.Count -eq 3) "Debe haber 3 jugadores"
  Assert ($state.pot -eq 300) "Pot inicial debe ser 300 (SB=100 + BB=200)"
  
  # En 3 jugadores:
  # Index 0 = BTN (dealer)
  # Index 1 = SB (debe tener committed=100, chips=4900)
  # Index 2 = BB (debe tener committed=200, chips=2800)
  # Primero en actuar preflop = Index 0 (UTG = después de BB = BTN en 3-handed)
  
  Assert ($state.players[1].committed -eq 100) "SB debe tener committed=100"
  Assert ($state.players[2].committed -eq 200) "BB debe tener committed=200"
  Assert ($state.currentPlayerIndex -eq 0) "Preflop: BTN (index 0) debe actuar primero en 3-handed"

  # PREFLOP - Orden: BTN (0) -> SB (1) -> BB (2)
  Write-Host "🎲 PREFLOP..."
  
  # Acción 1: BTN call 200
  $p1 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId/action" -Headers $headers -Body (@{
    userId = $user1; action = "call"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 1 (BTN call): ✅ -> Turno pasa a index $($p1.gameState.currentPlayerIndex)"
  Assert ($p1.gameState.currentPlayerIndex -eq 1) "Turno debe pasar a SB (index 1)"

  # Acción 2: SB call 100 (ya tiene 100, pone 100 más)
  $p2 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId/action" -Headers $headers -Body (@{
    userId = $user2; action = "call"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 2 (SB call): ✅ -> Turno pasa a index $($p2.gameState.currentPlayerIndex)"
  Assert ($p2.gameState.currentPlayerIndex -eq 2) "Turno debe pasar a BB (index 2)"

  # Acción 3: BB check (ya pagó BB)
  $p3 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId/action" -Headers $headers -Body (@{
    userId = $user3; action = "call"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 3 (BB call/check): ✅"
  Assert ($p3.gameState.phase -eq "flop") "Debe avanzar a flop"
  Write-Host "   Phase advanced to: $($p3.gameState.phase) ✅"
  Write-Host "   Pot: $($p3.gameState.pot)`n"

  # FLOP - Orden: SB (1) -> BB (2) -> BTN (0)
  Write-Host "🎲 FLOP..."
  Write-Host "   Community: $($p3.gameState.communityCards -join ', ')"
  Write-Host "   Current player index: $($p3.gameState.currentPlayerIndex)"
  
  # En postflop, SB debe actuar primero (index 1)
  Assert ($p3.gameState.currentPlayerIndex -eq 1) "Postflop: SB debe actuar primero"

  # Acción 1: SB check
  $f1 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId/action" -Headers $headers -Body (@{
    userId = $user2; action = "check"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 1 (SB check): ✅"

  # Acción 2: BB check
  $f2 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId/action" -Headers $headers -Body (@{
    userId = $user3; action = "check"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 2 (BB check): ✅"

  # Acción 3: BTN check
  $f3 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId/action" -Headers $headers -Body (@{
    userId = $user1; action = "check"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 3 (BTN check): ✅"
  Assert ($f3.gameState.phase -eq "turn") "Debe avanzar a turn"
  Write-Host "   Phase advanced to: $($f3.gameState.phase) ✅`n"

  # TURN - Mismo orden que flop
  Write-Host "🎲 TURN..."
  Write-Host "   Community: $($f3.gameState.communityCards -join ', ')"

  $t1 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId/action" -Headers $headers -Body (@{
    userId = $user2; action = "check"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 1 (SB check): ✅"

  $t2 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId/action" -Headers $headers -Body (@{
    userId = $user3; action = "check"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 2 (BB check): ✅"

  $t3 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId/action" -Headers $headers -Body (@{
    userId = $user1; action = "check"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 3 (BTN check): ✅"
  Assert ($t3.gameState.phase -eq "river") "Debe avanzar a river"
  Write-Host "   Phase advanced to: $($t3.gameState.phase) ✅`n"

  # RIVER - Mismo orden
  Write-Host "🎲 RIVER..."
  Write-Host "   Community: $($t3.gameState.communityCards -join ', ')"

  $r1 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId/action" -Headers $headers -Body (@{
    userId = $user2; action = "check"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 1 (SB check): ✅"

  $r2 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId/action" -Headers $headers -Body (@{
    userId = $user3; action = "check"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 2 (BB check): ✅"

  $r3 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId/action" -Headers $headers -Body (@{
    userId = $user1; action = "check"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 3 (BTN check): ✅"
  Assert ($r3.gameState.status -eq "finished") "Game debe terminar"
  Write-Host "   Game Status: $($r3.gameState.status) ✅`n"

  # Validar resultado
  $final = Invoke-RestMethod -Method Get -Uri "$base/games/$gameId" -Headers $headers
  Write-Host "🏁 RESULTADO TEST 3:"
  Write-Host "   Winner: $($final.winner.username)"
  Write-Host "   Winner Hand: $($final.winnerHand.hand) ($($final.winnerHand.description))"
  
  for ($i = 0; $i -lt $final.players.Count; $i++) {
    $p = $final.players[$i]
    Write-Host "   Player ${i} final chips: $($p.chips)"
  }
  Write-Host "   Pot: $($final.pot)"

  $totalChips = ($final.players | ForEach-Object { $_.chips } | Measure-Object -Sum).Sum
  Assert ($totalChips -eq 18000) "Total chips debe ser 18000 (5000+3000+10000, es $totalChips)"
  Assert ($final.pot -eq 0) "Pot debe ser 0 (es $($final.pot))"
  
  if (-not $script:hasErrors) {
    Write-Host "`n✅ TEST 3 PASSED!`n" -ForegroundColor Green
  }
} catch {
  Write-Host "❌ ERROR en TEST 3: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.ErrorDetails) {
    Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
  }
  $script:hasErrors = $true
}

# =============================================================================
# TEST 4: 3 Jugadores - Early fold en preflop
# =============================================================================
Write-Host "════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "🎰 TEST 4: 3 Players - BTN Raise, SB Fold, BB Call" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════`n" -ForegroundColor Yellow

Write-Host "📋 Setup..."
try {
  $tableRes4 = Invoke-RestMethod -Method Post -Uri "$base/tables" -Headers $headers -Body (@{
    name = "Test4_$(Get-Random)"
    smallBlind = 100
    bigBlind = 200
    maxPlayers = 6
  } | ConvertTo-Json) -ContentType "application/json"
  $tableId4 = $tableRes4.id

  $gameStart4 = Invoke-RestMethod -Method Post -Uri "$base/games/start" -Headers $headers -Body (@{
    tableId   = $tableId4
    playerIds = @($user1, $user2, $user3)
  } | ConvertTo-Json) -ContentType "application/json"
  $gameId4 = $gameStart4.game.id

  Write-Host "✅ Juego creado: $gameId4`n"

  # PREFLOP
  Write-Host "🎲 PREFLOP..."
  
  # BTN raises 300 (total 400: 100 SB + 300 raise)
  $p1 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId4/action" -Headers $headers -Body (@{
    userId = $user1; action = "raise"; amount = 300
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 1 (BTN raise 300, total 400): ✅"

  # SB folds
  $p2 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId4/action" -Headers $headers -Body (@{
    userId = $user2; action = "fold"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 2 (SB fold): ✅"

  # BB debe poder actuar aún (no debe terminar el juego todavía)
  Assert ($p2.gameState.status -eq "active") "Game debe seguir activo con 2 jugadores"
  Assert ($p2.gameState.currentPlayerIndex -eq 2) "Turno debe estar en BB"

  # BB calls
  $p3 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId4/action" -Headers $headers -Body (@{
    userId = $user3; action = "call"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 3 (BB call): ✅"
  
  # Ahora debe avanzar a flop con 2 jugadores activos
  Assert ($p3.gameState.phase -eq "flop") "Debe avanzar a flop"
  Write-Host "   Phase advanced to: $($p3.gameState.phase) ✅"
  
  # FLOP - Solo BB y BTN activos, check check
  Write-Host "`n🎲 FLOP (solo BB y BTN)..."
  
  # BB actúa primero postflop (pero SB está folded, así que BB es primero activo)
  $f1 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId4/action" -Headers $headers -Body (@{
    userId = $user3; action = "check"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 1 (BB check): ✅"

  $f2 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId4/action" -Headers $headers -Body (@{
    userId = $user1; action = "check"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Action 2 (BTN check): ✅"
  Assert ($f2.gameState.phase -eq "turn") "Debe avanzar a turn"
  
  # Continuar hasta river
  Write-Host "`n🎲 TURN..."
  $t1 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId4/action" -Headers $headers -Body (@{
    userId = $user3; action = "check"
  } | ConvertTo-Json) -ContentType "application/json"
  $t2 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId4/action" -Headers $headers -Body (@{
    userId = $user1; action = "check"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Checks all around -> River ✅"

  Write-Host "`n🎲 RIVER..."
  $r1 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId4/action" -Headers $headers -Body (@{
    userId = $user3; action = "check"
  } | ConvertTo-Json) -ContentType "application/json"
  $r2 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId4/action" -Headers $headers -Body (@{
    userId = $user1; action = "check"
  } | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   Checks all around -> Showdown ✅"
  
  Assert ($r2.gameState.status -eq "finished") "Game debe terminar"

  $final4 = Invoke-RestMethod -Method Get -Uri "$base/games/$gameId4" -Headers $headers
  Write-Host "`n🏁 RESULTADO TEST 4:"
  Write-Host "   Winner: $($final4.winner.username)"
  Write-Host "   SB (folded) final chips: $($final4.players[1].chips)"
  
  # SB debe tener 2900 (inició con 3000, perdió 100 del SB)
  Assert ($final4.players[1].chips -eq 2900) "SB debe tener 2900 chips (3000 inicial - 100 SB, es $($final4.players[1].chips))"
  
  if (-not $script:hasErrors) {
    Write-Host "`n✅ TEST 4 PASSED!`n" -ForegroundColor Green
  }
} catch {
  Write-Host "❌ ERROR en TEST 4: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.ErrorDetails) {
    Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
  }
  $script:hasErrors = $true
}

# =============================================================================
# RESUMEN
# =============================================================================
Write-Host "`n════════════════════════════════════════" -ForegroundColor Cyan
if ($script:hasErrors) {
  Write-Host "⚠️  ALGUNOS TESTS FALLARON" -ForegroundColor Yellow
} else {
  Write-Host "✅ TODOS LOS TESTS PASARON!" -ForegroundColor Green
}
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan

Read-Host "`nPulsa Enter para cerrar"
