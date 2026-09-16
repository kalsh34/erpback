import mongoose from 'mongoose';
import { config } from './env';

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log(`[DB] MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('[DB] MongoDB connection error:', error);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[DB] MongoDB error:', err);
  });
};
