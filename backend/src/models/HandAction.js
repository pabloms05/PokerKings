import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const HandAction = sequelize.define('HandAction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  handId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'hands', key: 'id' }
  },
  action: {
    type: DataTypes.ENUM('fold', 'check', 'call', 'raise', 'all-in'),
    allowNull: false
  },
  amount: {
    type: DataTypes.BIGINT,
    defaultValue: 0
  },
  phase: {
    type: DataTypes.ENUM('preflop', 'flop', 'turn', 'river'),
    allowNull: false
  },
  sequenceNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  timestamps: true,
  tableName: 'hand_actions'
});

export default HandAction;
