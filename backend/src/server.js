import { createServer } from 'http';
import app from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { setupSocket } from './config/socket.js';
import { seedDatabase } from './database/seed.js';
import { startTableCleanupService } from './services/table.cleanup.js';

const server = createServer(app);

// Setup Socket.IO
setupSocket(server);

// Arranque secuencial para evitar race conditions
const startServer = async () => {
  // 1. Conectar a DB primero
  await connectDB();

  // 2. Seed solo en desarrollo, después de que DB esté lista
  if (config.nodeEnv === 'development') {
    await seedDatabase();
  }

  // 3. Iniciar servicio de limpieza
  startTableCleanupService();

  // 4. Arrancar el servidor HTTP
  server.listen(config.port, () => {
    console.log(`🚀 Servidor corriendo en puerto ${config.port}`);
    console.log(`📍 Entorno: ${config.nodeEnv}`);
    console.log(`📊 Base de datos: PostgreSQL`);
  });
};

startServer().catch((err) => {
  console.error('❌ Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
