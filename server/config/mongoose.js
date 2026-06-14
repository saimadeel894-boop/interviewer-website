import mongoose from 'mongoose';

mongoose.set('bufferCommands', false);

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

export default mongoose;
