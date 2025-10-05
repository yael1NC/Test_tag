import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 8080,
  linkLen: parseInt(process.env.LINK_LEN) || 6,
  dbFile: process.env.DB_FILE || 'database/database.sqlite',
  dbSchema: process.env.DB_SCHEMA || 'database/database.sql',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV === 'development'
};

export const logLevel = config.isDev ? 'dev' : 'combined';