import sequelize from '../config/db.js';
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
} from '../models/index.js';
import bcrypt from 'bcryptjs';

export const seedDatabase = async () => {
  try {
    // Sincronizar base de datos
    await sequelize.sync({ force: false });
    console.log('✅ Base de datos sincronizada');

    // Verificar si ya hay usuarios
    const existingUsers = await User.count();
    if (existingUsers > 0) {
      console.log('📊 Base de datos ya tiene datos, saltando seed');
      return;
    }

    // Crear usuarios de prueba
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user1 = await User.create({
      username: 'jugador1',
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

    const user2 = await User.create({
      username: 'jugador2',
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

    console.log('✅ Usuarios creados');

    // Crear amistad entre usuarios
    await Friend.create({
      userId: user1.id,
      friendId: user2.id
    });

    await Friend.create({
      userId: user2.id,
      friendId: user1.id
    });

    console.log('✅ Amistades creadas');

    // NO crear mesas de prueba automáticamente
    // Las mesas serán creadas por los usuarios según necesiten
    console.log('✅ Seed completado (sin mesas de prueba automáticas)');
    console.log('🎉 ¡Base de datos poblada exitosamente!');
  } catch (error) {
    console.error('❌ Error al poblar la base de datos:', error);
  }
};
