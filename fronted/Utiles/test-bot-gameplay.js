/**
 * Test script para verificar que los bots juegan automáticamente
 */

import axios from './backend/node_modules/axios/index.js';

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  validateStatus: () => true // Don't throw on any status
});

async function testBotGameplay() {
  try {
    console.log('🤖 TEST: Bot Gameplay Automation\n');

    // 1. Login para obtener un token
    console.log('1️⃣ Logging in...');
    const loginRes = await API.post('/auth/login', {
      email: 'jugador1@pokerkings.com',
      password: 'password123'
    });

    if (loginRes.status !== 200) {
      console.error('❌ Login failed:', loginRes.data);
      return;
    }

    const token = loginRes.data.token;
    const userId = loginRes.data.user.id;
    console.log(`✅ Logged in as: ${loginRes.data.user.username} (ID: ${userId})`);

    // 2. Crear una mesa con 2 bots
    console.log('\n2️⃣ Creating table with 2 bots...');
    const createTableRes = await API.post('/tables', 
      {
        name: 'Bot Test Table',
        maxPlayers: 6,
        blindSmall: 1,
        blindBig: 2,
        botsCount: 2  // 2 bots
      },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (createTableRes.status !== 201) {
      console.error('❌ Create table failed:', createTableRes.data);
      return;
    }

    const tableId = createTableRes.data.id;
    console.log(`✅ Table created (ID: ${tableId}) with ${createTableRes.data.botsCount} bots`);

    // 3. Unirse a la mesa
    console.log('\n3️⃣ Joining table...');
    const joinRes = await API.post(`/tables/${tableId}/join`, 
      { userId },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (joinRes.status !== 200) {
      console.error('❌ Join table failed:', joinRes.data);
      return;
    }

    console.log(`✅ Joined table. Current players: ${joinRes.data.currentPlayers}/${joinRes.data.maxPlayers}`);

    // 4. Iniciar el juego
    console.log('\n4️⃣ Starting game...');
    const startGameRes = await API.post(`/games/start`, 
      { tableId, playerIds: [userId] },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (startGameRes.status !== 200 && startGameRes.status !== 201) {
      console.error('❌ Start game failed:', startGameRes.data);
      return;
    }

    const gameId = startGameRes.data.id;
    console.log(`✅ Game started (ID: ${gameId})`);
    console.log(`   Phase: ${startGameRes.data.phase}`);
    console.log(`   Current Player Index: ${startGameRes.data.currentPlayerIndex}`);

    // 5. Obtener estado del juego
    console.log('\n5️⃣ Getting initial game state...');
    const gameStateRes = await API.get(`/games/${gameId}`, 
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (gameStateRes.status === 200) {
      const game = gameStateRes.data;
      console.log(`✅ Game state retrieved`);
      console.log(`   Players in game: ${game.players.length}`);
      game.players.forEach((p, i) => {
        console.log(`   [${i}] ${p.username || 'Unknown'} (Bot: ${p.isBot ? '✅' : '❌'}) - Chips: ${p.chips}, Folded: ${p.folded}`);
      });
      console.log(`   Current Player: ${game.currentPlayerIndex}`);
      console.log(`   Pot: ${game.pot}`);
    }

    // 6. Simular algunos turnos y verificar que cambia el currentPlayerIndex
    console.log('\n6️⃣ Waiting 3 seconds for bots to auto-play...');
    await new Promise(r => setTimeout(r, 3000));

    const gameState2 = await API.get(`/games/${gameId}`, 
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (gameState2.status === 200) {
      const game2 = gameState2.data;
      console.log(`✅ Game state after wait:`);
      console.log(`   Current Player: ${game2.currentPlayerIndex}`);
      console.log(`   Pot: ${game2.pot}`);
      console.log(`   Phase: ${game2.phase}`);
      
      game2.players.forEach((p, i) => {
        console.log(`   [${i}] ${p.username || 'Unknown'} - Chips: ${p.chips}, LastAction: ${p.lastAction}`);
      });

      if (game2.currentPlayerIndex !== game.currentPlayerIndex) {
        console.log('\n✅ SUCCESS: Players have taken actions! Bots are playing!');
      } else {
        console.log('\n⚠️  WARNING: currentPlayerIndex hasn\'t changed. Bots may not be executing.');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBotGameplay();
