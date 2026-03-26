import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  type: {
    type: DataTypes.ENUM('purchase', 'win', 'loss', 'bonus', 'dailyFree'),
    allowNull: false
  },
  amount: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  description: DataTypes.STRING,
  reference: DataTypes.STRING,
  balanceBefore: DataTypes.BIGINT,
  balanceAfter: DataTypes.BIGINT
}, {
  timestamps: true,
  tableName: 'transactions'
});

export default Transaction;
