#!/usr/bin/env node

/**
 * Script para limpiar todas las mesas de prueba de la base de datos
 * Uso: node clean-test-tables.js
 */

import sequelize from './src/config/db.js';
import { Table, Game } from './src/models/index.js';

const cleanTestTables = async () => {
  try {
    console.log('🔄 Conectando a base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');

    // Borrar todos los juegos primero (por foreign keys)
    const gamesCount = await Game.count();
    if (gamesCount > 0) {
      await Game.destroy({ where: {}, force: true });
      console.log(`🗑️  ${gamesCount} juego(s) eliminado(s)`);
    }

    // Borrar todas las mesas
    const tablesCount = await Table.count();
    if (tablesCount > 0) {
      await Table.destroy({ where: {}, force: true });
      console.log(`🗑️  ${tablesCount} mesa(s) eliminada(s)`);
    }

    if (tablesCount === 0 && gamesCount === 0) {
      console.log('ℹ️  No había mesas ni juegos para eliminar');
    }

    console.log('\n✨ Base de datos limpia');
    console.log('📝 Las mesas se crearán desde la interfaz cuando los usuarios las necesiten');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

cleanTestTables();
