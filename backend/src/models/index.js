import sequelize from '../config/db.js';
import User from './User.js';
import Friend from './Friend.js';
import FriendRequest from './FriendRequest.js';
import Table from './Table.js';
import Game from './Game.js';
import Hand from './Hand.js';
import HandAction from './HandAction.js';
import Transaction from './Transaction.js';
import Mission from './Mission.js';
import Achievement from './Achievement.js';
import TableChatMessage from './TableChatMessage.js';

// Define associations
User.hasMany(FriendRequest, { foreignKey: 'senderId', as: 'sentRequests' });
User.hasMany(FriendRequest, { foreignKey: 'receiverId', as: 'receivedRequests' });
FriendRequest.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
FriendRequest.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

Friend.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Friend.belongsTo(User, { foreignKey: 'friendId', as: 'friend' });

User.hasMany(Transaction, { foreignKey: 'userId' });
Transaction.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Game, { foreignKey: 'winnerId', as: 'wonGames' });
Game.belongsTo(Table, { foreignKey: 'tableId' });
Game.belongsTo(User, { foreignKey: 'winnerId', as: 'winner' });

Table.hasMany(Game, { foreignKey: 'tableId' });

Hand.belongsTo(Game, { foreignKey: 'gameId' });
Hand.belongsTo(User, { foreignKey: 'userId', as: 'player' });
Game.hasMany(Hand, { foreignKey: 'gameId' });

HandAction.belongsTo(Hand, { foreignKey: 'handId' });
Hand.hasMany(HandAction, { foreignKey: 'handId' });

User.hasMany(Mission, { foreignKey: 'userId' });
Mission.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Achievement, { foreignKey: 'userId' });
Achievement.belongsTo(User, { foreignKey: 'userId' });

Table.hasMany(TableChatMessage, { foreignKey: 'tableId' });
TableChatMessage.belongsTo(Table, { foreignKey: 'tableId' });
User.hasMany(TableChatMessage, { foreignKey: 'userId' });
TableChatMessage.belongsTo(User, { foreignKey: 'userId' });

export {
  sequelize,
  User,
  Friend,
  FriendRequest,
  Table,
  Game,
  Hand,
  HandAction,
  Transaction,
  Mission,
  Achievement,
  TableChatMessage
};
