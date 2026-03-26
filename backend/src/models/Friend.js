import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Friend = sequelize.define('Friend', {
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
  friendId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  }
}, {
  timestamps: true,
  tableName: 'friends'
});

export default Friend;
