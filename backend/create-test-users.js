#!/usr/bin/env node

/**
 * Script para crear/resetear usuarios de prueba
 * Uso: node create-test-users.js
 */

import sequelize from './src/config/db.js';
import { User, Table, Game, Hand, HandAction, Transaction } from './src/models/index.js';
import bcrypt from 'bcryptjs';

const createTestUsers = async () => {
  try {
    console.log('🔄 Conectando a base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    // Opción 1: Limpiar todo (descomentar si quieres resetear)
    // console.log('🗑️  Borrando datos anteriores...');
    // await sequelize.drop();
    // console.log('✅ Datos borrados');

    // Sincronizar modelos
    console.log('📊 Sincronizando modelos...');
    await sequelize.sync({ alter: true });
    console.log('✅ Modelos sincronizados');

    // Hasear contraseña
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Verificar si los usuarios ya existen
    const existingUser = await User.findOne({ where: { username: 'jugador1' } });
    
    if (existingUser) {
      console.log('⚠️  Los usuarios de prueba ya existen');
      console.log('\n📝 Usuarios disponibles:');
      console.log('  📧 Email: jugador1@pokerkings.com');
      console.log('  🔑 Contraseña: password123');
      console.log('  OR');
      console.log('  📧 Email: jugador2@pokerkings.com');
      console.log('  🔑 Contraseña: password123');
      console.log('  OR');
      console.log('  📧 Email: jugador3@pokerkings.com');
      console.log('  🔑 Contraseña: password123');
    } else {
      // Crear usuarios
      console.log('👤 Creando usuarios de prueba...');
      
      const user1 = await User.create({
        username: 'jugador1',
        email: 'jugador1@pokerkings.com',
        password: hashedPassword,
        chips: 5000,
        level: 5,
        experience: 2500,
        avatar: '🎮',
        highestWinning: 1000,
        totalWinnings: 5000,
        gamesPlayed: 25,
      gamesWon: 8,
      isBot: false
    });

    const user2 = await User.create({
      username: 'jugador2',
      email: 'jugador2@pokerkings.com',
      password: hashedPassword,
      chips: 3000,
      level: 3,
      experience: 1200,
      avatar: '🎲',
      highestWinning: 500,
      totalWinnings: 2000,
      gamesPlayed: 15,
      gamesWon: 4,
      isBot: false
    });

    const user3 = await User.create({
      username: 'jugador3',
      email: 'jugador3@pokerkings.com',
      password: hashedPassword,
      chips: 10000,
      level: 10,
      experience: 5000,
      avatar: '👑',
      highestWinning: 3000,
      totalWinnings: 15000,
      gamesPlayed: 60,
      gamesWon: 25,
      isBot: false
      
      console.log('\n👤 Usuario 2:');
      console.log('  📧 Email:    jugador2@pokerkings.com');
      console.log('  🔑 Password: password123');
      console.log('  💰 Chips:    3000');
      console.log('  🏆 Level:    3');
      
      console.log('\n👤 Usuario 3 (Admin):');
      console.log('  📧 Email:    jugador3@pokerkings.com');
      console.log('  🔑 Password: password123');
      console.log('  💰 Chips:    10000');
      console.log('  🏆 Level:    10');
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    // NO crear mesas de prueba automáticamente
    // Las mesas serán creadas por los usuarios según necesiten
    console.log('\n📝 NOTA: Las mesas se crean desde la interfaz al hacer click en "Crear Mesa"');

    console.log('\n✨ Base de datos lista para usar');
    console.log('\n🚀 Próximo paso:');
    console.log('   1. Abre http://localhost:5173');
    console.log('   2. Usa cualquiera de los emails arriba para login');
    console.log('   3. Contraseña: password123');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

createTestUsers();
