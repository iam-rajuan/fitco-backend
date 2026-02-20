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
  stripe: {
    secretKey: string;
    webhookSecret: string;
    currency: string;
    monthlyPriceCents: number;
    yearlyPriceCents: number;
    successUrl: string;
    cancelUrl: string;
  };
}

const config: AppConfig = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/creedtng',
  jwt: {
    accessSecret: process.env.JWT_SECRET || 'changemeaccess',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'changemerefresh',
    accessExpiresIn: '8h',
    refreshExpiresIn: '7d'
  },
  chat: {
    freeLimit: Number(process.env.CHAT_FREE_DAILY_LIMIT || 10)
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    currency: process.env.STRIPE_CURRENCY || 'usd',
    monthlyPriceCents: Number(process.env.STRIPE_MONTHLY_PRICE_CENTS || 999),
    yearlyPriceCents: Number(process.env.STRIPE_YEARLY_PRICE_CENTS || 9999),
    successUrl: process.env.STRIPE_SUCCESS_URL || 'http://localhost:5000/api/v1/subscriptions/success',
    cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://localhost:5000/api/v1/subscriptions/cancel'
  }
};

export default config;
