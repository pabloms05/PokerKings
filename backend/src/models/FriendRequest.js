import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const FriendRequest = sequelize.define('FriendRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  receiverId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    defaultValue: 'pending'
  }
}, {
  timestamps: true,
  tableName: 'friend_requests'
});

export default FriendRequest;
