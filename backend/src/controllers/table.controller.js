import { Table, User, Game } from '../models/index.js';
import { getIO } from '../config/socket.js';
import { emitLobbyTables } from '../sockets/lobby.socket.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { sanitizeTableName, validateTableNameModeration } from '../services/tableNameModeration.js';

const syncTableFromLatestGame = async (table) => {
  const latestGame = await Game.findOne({
    where: {
      tableId: table.id,
      status: ['active', 'waiting']
    },
    order: [['updatedAt', 'DESC']]
  });

  let activeSeats = 0;
  if (latestGame && Array.isArray(latestGame.players)) {
    activeSeats = latestGame.players.filter(p => !p.isSittingOut).length;
  }

  const nextStatus = activeSeats >= 2 ? 'playing' : 'waiting';
  if ((table.currentPlayers || 0) !== activeSeats || table.status !== nextStatus) {
    table.currentPlayers = activeSeats;
    table.status = nextStatus;
    await table.save();
  }

  return table;
};

export const getTables = async (req, res) => {
  try {
    const tables = await Table.findAll({
      where: { status: ['waiting', 'playing'] }
    });

    const syncedTables = await Promise.all(tables.map(syncTableFromLatestGame));
    res.json(syncedTables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTable = async (req, res) => {
  try {
    const table = await Table.findByPk(req.params.id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    await syncTableFromLatestGame(table);
    res.json(table);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createTable = async (req, res) => {
  try {
    const { name, smallBlind, bigBlind, maxPlayers, isPrivate, tableColor } = req.body;
    const validation = validateTableNameModeration(name);
    if (!validation.isValid) {
      return res.status(400).json({
        message: validation.message,
        code: validation.code
      });
    }

    const table = await Table.create({
      name: sanitizeTableName(name),
      smallBlind,
      bigBlind,
      maxPlayers: maxPlayers || 6,
      isPrivate: isPrivate || false,
      tableColor: tableColor || '#1a4d2e'
    });

    try {
      await emitLobbyTables(getIO());
    } catch (socketErr) {
      console.warn('⚠️ No se pudo emitir lobby update tras createTable:', socketErr.message);
    }

    res.status(201).json(table);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const joinTable = async (req, res) => {
  try {
    const table = await Table.findByPk(req.params.id);
    const user = await User.findByPk(req.userId);
    const invitationToken = req.body?.invitationToken;

    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (table.isPrivate) {
      if (!invitationToken) {
        return res.status(403).json({
          message: 'Esta mesa es privada. Necesitas una invitación válida para unirte.',
          code: 'PRIVATE_TABLE_INVITE_REQUIRED'
        });
      }

      try {
        const decoded = jwt.verify(invitationToken, config.jwtSecret);
        const inviteType = decoded?.type;
        const invitedUserId = String(decoded?.invitedUserId || '');
        const invitedTableId = String(decoded?.tableId || '');

        if (inviteType !== 'table-join-invite' || invitedUserId !== String(req.userId) || invitedTableId !== String(table.id)) {
          return res.status(403).json({
            message: 'La invitación no corresponde a este usuario o a esta mesa.',
            code: 'INVALID_PRIVATE_TABLE_INVITE'
          });
        }
      } catch {
        return res.status(403).json({
          message: 'La invitación es inválida o expiró.',
          code: 'INVALID_PRIVATE_TABLE_INVITE'
        });
      }
    }

    if (table.currentPlayers >= table.maxPlayers) {
      return res.status(400).json({ message: 'Table is full' });
    }

    const buyIn = table.bigBlind * 100;
    if (user.chips < buyIn) {
      return res.status(400).json({
        message: `Insufficient chips. Required: ${buyIn}, available: ${user.chips}`,
        code: 'INSUFFICIENT_CHIPS',
        requiredChips: buyIn,
        availableChips: Number(user.chips)
      });
    }

    table.currentPlayers += 1;
    await table.save();

    try {
      await emitLobbyTables(getIO());
    } catch (socketErr) {
      console.warn('⚠️ No se pudo emitir lobby update tras joinTable:', socketErr.message);
    }

    res.json({ message: 'Joined table successfully', table });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const leaveTable = async (req, res) => {
  try {
    const table = await Table.findByPk(req.params.id);
    table.currentPlayers = Math.max(0, table.currentPlayers - 1);
    await table.save();

    try {
      await emitLobbyTables(getIO());
    } catch (socketErr) {
      console.warn('⚠️ No se pudo emitir lobby update tras leaveTable:', socketErr.message);
    }

    res.json({ message: 'Left table successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
