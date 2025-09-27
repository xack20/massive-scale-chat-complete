import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { logger } from './utils/logger';
import presenceRoutes from './routes/presenceRoutes';
import { errorHandler } from './middleware/errorHandler';
import { initializePresenceManager } from './services/presenceManager';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PRESENCE_SERVICE_PORT || 3005;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'presence-service' });
});

app.use('/api/presence', presenceRoutes);
app.use(errorHandler);

const startServer = async () => {
  await initializePresenceManager(io);
  
  server.listen(PORT, () => {
    logger.info(`Presence Service running on port ${PORT}`);
  });
};

startServer();
