import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Game = sequelize.define('Game', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tableId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'tables', key: 'id' }
  },
  winnerId: {
    type: DataTypes.UUID,
    references: { model: 'users', key: 'id' },
    comment: 'Primary winner (for backward compatibility)'
  },
  winnerIds: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of all winner user IDs (for split pots)'
  },
  winners: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of {userId, username, chips, hand, description} for all winners'
  },
  pot: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  phase: {
    type: DataTypes.ENUM('waiting', 'preflop', 'flop', 'turn', 'river', 'showdown'),
    defaultValue: 'preflop'
  },
  communityCards: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('waiting', 'active', 'finished'),
    defaultValue: 'active'
  },
  dealerId: {
    type: DataTypes.UUID,
    references: { model: 'users', key: 'id' },
    comment: 'Dealer button (BTN)'
  },
  smallBlindId: {
    type: DataTypes.UUID,
    references: { model: 'users', key: 'id' },
    comment: 'Small blind player'
  },
  bigBlindId: {
    type: DataTypes.UUID,
    references: { model: 'users', key: 'id' },
    comment: 'Big blind player'
  },
  currentPlayerIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Index of current player in players array'
  },
  players: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of {userId, chips, committed, hand} objects in order'
  },
  currentBet: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: 'Current bet amount to call'
  },
  deck: {
    type: DataTypes.JSON,
    comment: 'Remaining cards in deck'
  },
  startTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endTime: {
    type: DataTypes.DATE
  }
}, {
  timestamps: true,
  tableName: 'games'
});

export default Game;
