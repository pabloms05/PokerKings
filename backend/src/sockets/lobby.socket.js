import { Table } from '../models/index.js';

export const getLobbyTables = async () => {
  return Table.findAll({
    where: { status: ['waiting', 'playing'] }
  });
};

export const emitLobbyTables = async (io) => {
  if (!io) return;
  const tables = await getLobbyTables();
  io.to('lobby').emit('lobby:tables', tables);
  io.to('lobby').emit('lobby:update', tables);
};

export const setupLobbySocket = (io, socket) => {
  socket.on('lobby:join', async () => {
    socket.join('lobby');
    const tables = await getLobbyTables();
    socket.emit('lobby:tables', tables);
  });

  socket.on('lobby:leave', () => {
    socket.leave('lobby');
  });

  socket.on('lobby:refresh', async () => {
    const tables = await getLobbyTables();
    socket.emit('lobby:tables', tables);
  });
};
