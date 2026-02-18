import dotenv from 'dotenv';

dotenv.config();

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export interface AppConfig {
  env: string;
  port: number;
  mongoUri: string;
  jwt: JwtConfig;
  chat: {
    freeLimit: number;
  };
}

const config: AppConfig = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/creedtng',
  jwt: {
    accessSecret: process.env.JWT_SECRET || 'changemeaccess',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'changemerefresh',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d'
  },
  chat: {
    freeLimit: Number(process.env.CHAT_FREE_DAILY_LIMIT || 10)
  }
};

export default config;