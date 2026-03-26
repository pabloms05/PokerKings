import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const TableChatMessage = sequelize.define('TableChatMessage', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  message: {
    type: DataTypes.STRING(300),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 300]
    }
  }
}, {
  timestamps: true,
  tableName: 'table_chat_messages'
});

export default TableChatMessage;
