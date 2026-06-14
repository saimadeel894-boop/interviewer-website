import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoose from './config/mongoose.js';
import { Server } from 'socket.io';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import performanceRoutes from './routes/performanceRoutes.js';
import logRoutes from './routes/logRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import initializeSockets from './sockets/index.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const productionClientUrl = 'https://interviewer-website-five.vercel.app';
const localClientUrl = 'http://localhost:5173';
const isHostedRuntime =
  process.env.NODE_ENV === 'production' ||
  Object.keys(process.env).some((key) => key.startsWith('RAILWAY_') || key.startsWith('RENDER'));
const allowLocalhostOrigins = process.env.ALLOW_LOCALHOST_ORIGINS === 'true' || !isHostedRuntime;
const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const defaultOrigins = [productionClientUrl, localClientUrl];
const allowedOrigins = [...new Set([...configuredOrigins, ...defaultOrigins])].filter((origin) => {
  if (allowLocalhostOrigins) {
    return true;
  }

  return !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
});

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

app.set('io', io);
initializeSockets(io);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({
    service: 'workforce-platform-api',
    status: 'ok'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    service: 'workforce-platform-api',
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Server error'
  });
});

const connectDatabase = async () => {
  if (!process.env.MONGO_URI) {
    console.warn('MONGO_URI is not configured. Add server/.env before using database-backed APIs.');
    return;
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000
  });
  console.log('MongoDB connected');
};

const port = process.env.PORT || 5000;

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

connectDatabase().catch((error) => {
  console.error('MongoDB connection failed:', error);
});
