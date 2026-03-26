#!/usr/bin/env node

// Script para recrear la base de datos y usuarios

import sequelize from '../src/config/db.js';
import {
  User,
  Table,
  Game,
  Hand,
  HandAction,
  Transaction,
  Mission,
  Achievement,
  Friend,
  FriendRequest
} from '../src/models/index.js';
import bcrypt from 'bcryptjs';

async function recreateDatabase() {
  try {
    console.log('🔧 Sincronizando base de datos...');
    // Force: true borra todas las tablas y las recrea
    await sequelize.sync({ force: true });
    console.log('✅ Base de datos sincronizada (limpia)\n');

    console.log('👤 Creando usuarios...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user1 = await User.create({
      username: 'pavlo',
      email: 'jugador1@pokerkings.com',
      password: hashedPassword,
      chips: 5000,
      level: 5,
      experience: 2500,
      avatar: 'avatar1.png',
      highestWinning: 1000,
      totalWinnings: 5000,
      gamesPlayed: 25,
      gamesWon: 8
    });
    console.log(`   ✅ jugador1 creado: ${user1.id}`);

    const user2 = await User.create({
      username: 'pepe',
      email: 'jugador2@pokerkings.com',
      password: hashedPassword,
      chips: 3000,
      level: 3,
      experience: 1200,
      avatar: 'avatar2.png',
      highestWinning: 500,
      totalWinnings: 2000,
      gamesPlayed: 15,
      gamesWon: 4
    });
    console.log(`   ✅ jugador2 creado: ${user2.id}`);

    const user3 = await User.create({
      username: 'jugador3',
      email: 'jugador3@pokerkings.com',
      password: hashedPassword,
      chips: 10000,
      level: 10,
      experience: 5000,
      avatar: 'avatar3.png',
      highestWinning: 3000,
      totalWinnings: 15000,
      gamesPlayed: 60,
      gamesWon: 25
    });
    console.log(`   ✅ jugador3 creado: ${user3.id}\n`);

    console.log('📋 Creando mesas de prueba...');
    const table1 = await Table.create({
      name: 'Mesa Principiantes',
      smallBlind: 10,
      bigBlind: 20,
      maxPlayers: 6,
      isPrivate: false,
      tableColor: '#1a4d2e',
      status: 'waiting',
      currentPlayers: 0
    });
    console.log(`   ✅ Mesa 1 creada: ${table1.id}\n`);

    console.log('════════════════════════════════════════');
    console.log('✅ BASE DE DATOS RECREADA EXITOSAMENTE');
    console.log('════════════════════════════════════════\n');

    console.log('📌 USUARIOS CREADOS:');
    console.log(`   user1: ${user1.id}`);
    console.log(`   user2: ${user2.id}`);
    console.log(`   user3: ${user3.id}\n`);

    console.log('📌 CREDENCIALES:');
    console.log('   Email: jugador1@pokerkings.com');
    console.log('   Email: jugador2@pokerkings.com');
    console.log('   Email: jugador3@pokerkings.com');
    console.log('   Password: password123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

recreateDatabase();
