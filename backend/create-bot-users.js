#!/usr/bin/env node

/**
 * Script para crear usuarios bot para pruebas
 * Uso: node create-bot-users.js
 */

import sequelize from './src/config/db.js';
import { User } from './src/models/index.js';
import bcrypt from 'bcryptjs';

const createBotUsers = async () => {
  try {
    console.log('🤖 Creando usuarios bot...');
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    const hashedPassword = await bcrypt.hash('botpassword123', 10);

    // Crear bots
    const botNames = [
      { username: 'bot-agresivo', email: 'bot-agresivo@pokerkings.com', avatar: '🤖' },
      { username: 'bot-cauteloso', email: 'bot-cauteloso@pokerkings.com', avatar: '🦾' },
      { username: 'bot-inteligente', email: 'bot-inteligente@pokerkings.com', avatar: '🧠' },
    ];

    for (const botData of botNames) {
      const existingBot = await User.findOne({ where: { username: botData.username } });
      
      if (!existingBot) {
        await User.create({
          username: botData.username,
          email: botData.email,
          password: hashedPassword,
          chips: 5000,
          level: 5,
          experience: 0,
          avatar: botData.avatar,
          highestWinning: 0,
          totalWinnings: 0,
          gamesPlayed: 0,
          gamesWon: 0,
          isBot: true  // ← IMPORTANTE: Marcar como bot
        });
        console.log(`✅ Bot creado: ${botData.username}`);
      } else {
        console.log(`⚠️  Bot ya existe: ${botData.username}`);
      }
    }

    console.log('\n✨ Bots creados correctamente');
    console.log('\n📝 Los bots se usarán automáticamente cuando crees una mesa con botsCount > 0');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

createBotUsers();
