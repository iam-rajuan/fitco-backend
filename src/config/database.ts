import mongoose from 'mongoose';
import config from './index';

mongoose.set('strictQuery', true);

const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error', (error as Error).message);
    process.exit(1);
  }
};

export default connectDatabase;