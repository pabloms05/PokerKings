import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Hand = sequelize.define('Hand', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  gameId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'games', key: 'id' }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  cards: {
    type: DataTypes.JSON,
    allowNull: false
  },
  finalCards: {
    type: DataTypes.JSON
  },
  result: {
    type: DataTypes.ENUM('win', 'loss', 'fold', 'draw'),
    allowNull: false
  },
  profit: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  position: {
    type: DataTypes.STRING,
    comment: 'BTN, SB, BB, UTG, etc'
  }
}, {
  timestamps: true,
  tableName: 'hands'
});

export default Hand;
