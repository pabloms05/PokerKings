import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Mission = sequelize.define('Mission', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  requirement: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '{ type: "wins"|"games"|"chips", count: number }'
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  reward: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  completedAt: DataTypes.DATE,
  type: {
    type: DataTypes.ENUM('daily', 'weekly', 'permanent'),
    defaultValue: 'daily'
  }
}, {
  timestamps: true,
  tableName: 'missions'
});

export default Mission;
