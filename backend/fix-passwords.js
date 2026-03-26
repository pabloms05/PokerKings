#!/usr/bin/env node

/**
 * Script para actualizar las contraseñas de los usuarios de prueba
 * Usa bcrypt para hashear la contraseña correctamente
 */

import sequelize from './src/config/db.js';
import { User } from './src/models/index.js';
import bcrypt from 'bcryptjs';

const fixPasswords = async () => {
  try {
    console.log('🔄 Conectando a base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash('password123', 10);
    console.log('🔐 Contraseña hasheada:', hashedPassword.substring(0, 20) + '...');

    // Actualizar los tres usuarios
    const usernames = ['jugador1', 'jugador2', 'jugador3'];
    
    for (const username of usernames) {
      const user = await User.findOne({ where: { username } });
      
      if (user) {
        // Actualizar la contraseña
        await user.update({ password: hashedPassword });
        console.log(`✅ Contraseña actualizada para ${username}`);
      } else {
        console.log(`⚠️  Usuario ${username} no encontrado`);
      }
    }

    console.log('\n✨ Todas las contraseñas han sido actualizadas correctamente');
    console.log('\n📝 Usuarios disponibles para login:');
    console.log('  1️⃣  jugador1@pokerkings.com / password123');
    console.log('  2️⃣  jugador2@pokerkings.com / password123');
    console.log('  3️⃣  jugador3@pokerkings.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixPasswords();
