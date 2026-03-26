import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Table = sequelize.define('Table', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  maxPlayers: {
    type: DataTypes.INTEGER,
    defaultValue: 6
  },
  smallBlind: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  bigBlind: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tableColor: {
    type: DataTypes.STRING,
    defaultValue: '#1a4d2e'
  },
  status: {
    type: DataTypes.ENUM('waiting', 'playing', 'finished'),
    defaultValue: 'waiting'
  },
  currentPlayers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  botsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Número de bots a agregar automáticamente'
  }
}, {
  timestamps: true,
  tableName: 'tables'
});

export default Table;
