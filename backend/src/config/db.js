import { Sequelize } from 'sequelize';
import { config } from './env.js';

const sequelize = new Sequelize(config.dbName, config.dbUser, config.dbPassword, {
  host: config.dbHost,
  port: config.dbPort,
  dialect: 'postgres',
  logging: config.nodeEnv === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: config.nodeEnv === 'development' });
    console.log('✅ PostgreSQL connected successfully');
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error);
    process.exit(1);
  }
};

export default sequelize;
