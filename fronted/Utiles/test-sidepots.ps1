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

$user1 = "179505ce-fe5a-4469-bfc0-b54fb928f4d0" # BTN (5000 chips)
$user2 = "4a6dc974-8c6f-46c1-923f-193bfda909ba" # SB (3000 chips)
$user3 = "a4bcf54f-61b4-4924-8edd-610859036284" # BB (10000 chips)

# =============================================================================
# TEST 5: Side Pots - Player goes all-in with fewer chips
# =============================================================================
Write-Host "`n════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "🎰 TEST 5: Side Pots - All-in with different stacks" -ForegroundColor Magenta
Write-Host "════════════════════════════════════════`n" -ForegroundColor Magenta

Write-Host "📋 Setup: Creating game with unequal chip stacks"
Write-Host "   Player 1 (BTN): 5000 chips"
Write-Host "   Player 2 (SB):  3000 chips"
Write-Host "   Player 3 (BB):  10000 chips`n"

try {
  $tableRes = Invoke-RestMethod -Method Post -Uri "$base/tables" -Headers $headers -Body (@{
    name = "TestSidePots_$(Get-Random)"
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
  Write-Host "   Pot inicial: $($state.pot)"
  Write-Host "   Current bet: $($state.currentBet)`n"

  # Mostrar estado inicial
  Write-Host "🎲 PREFLOP - Initial state:"
  for ($i = 0; $i -lt $state.players.Count; $i++) {
    $p = $state.players[$i]
    $pos = if ($i -eq 0) { "(BTN)" } elseif ($state.smallBlindId -eq $p.userId) { "(SB)" } else { "(BB)" }
    Write-Host "   Player $i $pos : $($p.chips) chips, committed: $($p.committed)"
  }
  Write-Host ""

  # PREFLOP ACTIONS
  # BTN goes all-in with 5000 chips (todas sus fichas)
  Write-Host "📍 Action 1: BTN goes all-in con todas sus fichas (5000)"
  $action1 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId/action" -Headers $headers -Body (@{
    userId = $user1; action = "raise"; amount = 5000
  } | ConvertTo-Json) -ContentType "application/json"
  
  $state = $action1.gameState
  Write-Host "   ✅ BTN all-in 5000"
  Write-Host "   Pot: $($state.pot)"
  Write-Host "   Current bet: $($state.currentBet)"
  Write-Host "   BTN remaining: $($state.players[0].chips) chips"
  Write-Host "   SB (next to act) has: $($state.players[1].chips) chips`n"

  # SB goes all-in with remaining 2900
  Write-Host "📍 Action 2: SB goes all-in con todas sus fichas (2900)"
  $action2 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId/action" -Headers $headers -Body (@{
    userId = $user2; action = "raise"; amount = 2900
  } | ConvertTo-Json) -ContentType "application/json"
  
  $state = $action2.gameState
  Write-Host "   ✅ SB all-in 2900"
  Write-Host "   Pot: $($state.pot)"
  Write-Host "   Current bet: $($state.currentBet) (debe seguir siendo 5000)"
  Write-Host "   SB remaining: $($state.players[1].chips) chips`n"

  # BB calls the raise (calls 5000 - 200 BB = 4800 more)
  Write-Host "📍 Action 3: BB calls (debe poner 5000 total, ya tiene 200 BB)"
  $action3 = Invoke-RestMethod -Method Post -Uri "$base/games/$gameId/action" -Headers $headers -Body (@{
    userId = $user3; action = "call"
  } | ConvertTo-Json) -ContentType "application/json"
  
  $state = $action3.gameState
  Write-Host "   ✅ BB called"
  Write-Host "   Pot: $($state.pot)"
  Write-Host "   Phase: $($state.phase)"
  Write-Host "   Current turn: $($state.currentTurn)"
  
  Write-Host ""
  Write-Host "CARTAS DESPUES DEL CALL:"
  Write-Host "   Cartas comunitarias: $($state.communityCards -join ', ')"
  for ($i = 0; $i -lt $state.players.Count; $i++) {
    $p = $state.players[$i]
    $pos = if ($i -eq 0) { "(BTN)" } elseif ($state.smallBlindId -eq $p.userId) { "(SB)" } else { "(BB)" }
    Write-Host "   Player $i $pos : Chips=$($p.chips), Committed=$($p.committed), Cards=$($p.cards -join ', '), Folded=$($p.folded), LastAction=$($p.lastAction)"
  }

  # Cuando todos menos 1 están all-in, el juego auto-avanza a showdown sin pausas
  # El pot debe ser 13000: BTN 5000 + SB 3000 + BB 5000 = 13000
  Assert ($state.pot -eq 13000) "Pot debe ser 13000 después del call"

Write-Host "`n📊 Descripción de Side Pots (esperado):"
  Write-Host "   Main Pot (all 3 players): 3000 x 3 = 9000 chips"
  Write-Host "   Side Pot 1 (BTN y BB): 2000 x 2 = 4000 chips"
  Write-Host "   Total: 13000 chips"
  Write-Host ""
  Write-Host "   Como todos menos 1 están all-in (0 fichas), el juego avanza automáticamente a showdown"
  Write-Host "   sin pausas en flop/turn/river`n"

  # Esperar a que el juego procese automáticamente el showdown
  Start-Sleep -Seconds 1
  
  # Get final state
  $final = Invoke-RestMethod -Method Get -Uri "$base/games/$gameId" -Headers $headers
  
  Write-Host "`n🏁 RESULTADO TEST 5:"
  Write-Host "   Winner: $($final.winner.username)"
  Write-Host "   Status: $($final.status)"
  Write-Host "   Phase: $($final.phase)"
  Write-Host "   Pot: $($final.pot)"
  Write-Host ""
  
  Write-Host ""
  Write-Host "CARTAS FINALES:"
  Write-Host "   Cartas comunitarias: $($final.communityCards -join ', ')"
  for ($i = 0; $i -lt $final.players.Count; $i++) {
    $p = $final.players[$i]
    $pos = if ($i -eq 0) { "(BTN)" } elseif ($final.smallBlindId -eq $p.userId) { "(SB)" } else { "(BB)" }
    Write-Host "   Player $i $pos : Cards=$($p.cards -join ', '), Chips=$($p.chips), Folded=$($p.folded)"
  }
  Write-Host ""
  
  Write-Host "RESULTADO FINAL:"
  for ($i = 0; $i -lt $final.players.Count; $i++) {
    $p = $final.players[$i]
    $initialChips = if ($i -eq 0) { 5000 } elseif ($i -eq 1) { 3000 } else { 10000 }
    $change = $p.chips - $initialChips
    $changeStr = if ($change -gt 0) { "+$change" } else { "$change" }
    Write-Host "   Player $i final: $($p.chips) chips (initial: $initialChips, change: $changeStr)"
  }

  $totalChips = ($final.players | ForEach-Object { $_.chips } | Measure-Object -Sum).Sum
  Assert ($totalChips -eq 18000) "Total chips debe ser 18000 (es $totalChips)"
  Assert ($final.status -eq "finished") "Status debe ser finished"
  Assert ($final.phase -eq "showdown") "Phase debe ser showdown"
  
  if ($final.sidePots) {
    Write-Host ""
    Write-Host "Side Pots Distribution:"
    for ($i = 0; $i -lt $final.sidePots.Count; $i++) {
      $pot = $final.sidePots[$i]
      Write-Host "   Pot $i : $($pot.amount) chips, eligible players: $($pot.eligiblePlayerIndices -join ', ')"
    }
  }

  if (-not $script:hasErrors) {
    Write-Host ""
    Write-Host "TEST 5 PASSED!" -ForegroundColor Green
  }
} catch {
  Write-Host "ERROR en TEST 5: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.ErrorDetails) {
    Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
  }
  $script:hasErrors = $true
}

# =============================================================================
# RESUMEN
# =============================================================================
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
if ($script:hasErrors) {
  Write-Host "TEST FAILED" -ForegroundColor Yellow
} else {
  Write-Host "TEST PASSED!" -ForegroundColor Green
}
Write-Host "====================================" -ForegroundColor Cyan

Read-Host "`nPulsa Enter para cerrar"
