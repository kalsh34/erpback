import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/vitalpayroll',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  nodeEnv: process.env.NODE_ENV || 'development',
};
