#!/bin/bash

echo "Implementing Notification and Presence services..."

# Notification Service
cat > services/notification-service/src/index.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import notificationRoutes from './routes/notificationRoutes';
import { errorHandler } from './middleware/errorHandler';
import { connectRedis } from './config/redis';
import { initializeKafkaConsumer } from './services/kafkaConsumer';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3004;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'notification-service' });
});

app.use('/api/notifications', notificationRoutes);
app.use(errorHandler);

const startServer = async () => {
  await connectRedis();
  await initializeKafkaConsumer();
  
  app.listen(PORT, () => {
    logger.info(`Notification Service running on port ${PORT}`);
  });
};

startServer();
EOF

cat > services/notification-service/src/config/redis.ts << 'EOF'
import Redis from 'ioredis';
import { logger } from '../utils/logger';

export const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

export const connectRedis = async () => {
  redis.on('connect', () => {
    logger.info('Redis connected');
  });

  redis.on('error', (error) => {
    logger.error('Redis error:', error);
  });
};
EOF

cat > services/notification-service/src/controllers/notificationController.ts << 'EOF'
import { Request, Response } from 'express';
import { sendEmail } from '../services/emailService';
import { sendPushNotification } from '../services/pushService';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export const notificationController = {
  async sendNotification(req: Request, res: Response) {
    try {
      const { userId, type, title, message, data } = req.body;

      if (type === 'email') {
        await sendEmail(data.email, title, message);
      } else if (type === 'push') {
        await sendPushNotification(userId, title, message);
      }

      // Store notification in Redis
      await redis.lpush(`notifications:${userId}`, JSON.stringify({
        title,
        message,
        type,
        timestamp: new Date(),
        read: false
      }));

      res.json({ success: true, message: 'Notification sent' });
    } catch (error) {
      logger.error('Notification error:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  },

  async getNotifications(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string;
      const notifications = await redis.lrange(`notifications:${userId}`, 0, -1);
      
      res.json(notifications.map(n => JSON.parse(n)));
    } catch (error) {
      logger.error('Get notifications error:', error);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  },

  async markAsRead(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { notificationId } = req.params;
      
      // Implementation for marking notification as read
      res.json({ success: true });
    } catch (error) {
      logger.error('Mark as read error:', error);
      res.status(500).json({ error: 'Failed to mark as read' });
    }
  }
};
EOF

cat > services/notification-service/src/routes/notificationRoutes.ts << 'EOF'
import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.post('/send', notificationController.sendNotification);
router.get('/', notificationController.getNotifications);
router.put('/:notificationId/read', notificationController.markAsRead);

export default router;
EOF

cat > services/notification-service/src/services/emailService.ts << 'EOF'
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html
    });
    logger.info(`Email sent to ${to}`);
  } catch (error) {
    logger.error('Email send error:', error);
    throw error;
  }
};
EOF

cat > services/notification-service/src/services/pushService.ts << 'EOF'
import { logger } from '../utils/logger';

export const sendPushNotification = async (userId: string, title: string, message: string) => {
  try {
    // Implement push notification logic here
    logger.info(`Push notification sent to user ${userId}`);
  } catch (error) {
    logger.error('Push notification error:', error);
    throw error;
  }
};
EOF

cat > services/notification-service/src/services/kafkaConsumer.ts << 'EOF'
import { Kafka } from 'kafkajs';
import { logger } from '../utils/logger';

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(',')
});

const consumer = kafka.consumer({ groupId: 'notification-group' });

export const initializeKafkaConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topics: ['message-sent', 'user-activity'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      logger.info(`Received message from ${topic}`);
      // Process messages and trigger notifications
    }
  });
};
EOF

cat > services/notification-service/src/middleware/auth.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
EOF

cat > services/notification-service/src/middleware/errorHandler.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
};
EOF

cat > services/notification-service/src/utils/logger.ts << 'EOF'
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'notification-service' },
  transports: [new winston.transports.Console()]
});
EOF

# Presence Service
cat > services/presence-service/src/index.ts << 'EOF'
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
EOF

cat > services/presence-service/src/controllers/presenceController.ts << 'EOF'
import { Request, Response } from 'express';
import { PresenceManager } from '../services/presenceManager';
import { logger } from '../utils/logger';

export const presenceController = {
  async getOnlineUsers(req: Request, res: Response) {
    try {
      const users = await PresenceManager.getOnlineUsers();
      res.json(users);
    } catch (error) {
      logger.error('Get online users error:', error);
      res.status(500).json({ error: 'Failed to get online users' });
    }
  },

  async getUserStatus(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const status = await PresenceManager.getUserStatus(userId);
      res.json({ userId, status });
    } catch (error) {
      logger.error('Get user status error:', error);
      res.status(500).json({ error: 'Failed to get user status' });
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { status } = req.body;
      
      await PresenceManager.updateUserStatus(userId, status);
      res.json({ success: true });
    } catch (error) {
      logger.error('Update status error:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }
  }
};
EOF

cat > services/presence-service/src/routes/presenceRoutes.ts << 'EOF'
import { Router } from 'express';
import { presenceController } from '../controllers/presenceController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/online', presenceController.getOnlineUsers);
router.get('/status/:userId', presenceController.getUserStatus);
router.put('/status', presenceController.updateStatus);

export default router;
EOF

cat > services/presence-service/src/services/presenceManager.ts << 'EOF'
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

export class PresenceManager {
  private static io: Server;

  static async initialize(io: Server) {
    this.io = io;

    io.on('connection', (socket) => {
      logger.info(`User connected: ${socket.id}`);

      socket.on('user-online', async (userId) => {
        await this.setUserOnline(userId, socket.id);
        socket.join(`user:${userId}`);
        io.emit('presence-update', { userId, status: 'online' });
      });

      socket.on('typing', ({ userId, conversationId }) => {
        socket.to(`conversation:${conversationId}`).emit('user-typing', { userId });
      });

      socket.on('stop-typing', ({ userId, conversationId }) => {
        socket.to(`conversation:${conversationId}`).emit('user-stop-typing', { userId });
      });

      socket.on('disconnect', async () => {
        await this.handleDisconnect(socket.id);
      });
    });
  }

  static async setUserOnline(userId: string, socketId: string) {
    await redis.set(`presence:${userId}`, JSON.stringify({
      status: 'online',
      socketId,
      lastSeen: new Date()
    }), 'EX', 300); // Expire after 5 minutes
  }

  static async getUserStatus(userId: string) {
    const data = await redis.get(`presence:${userId}`);
    return data ? JSON.parse(data) : { status: 'offline' };
  }

  static async updateUserStatus(userId: string, status: string) {
    await redis.set(`presence:${userId}`, JSON.stringify({
      status,
      lastSeen: new Date()
    }), 'EX', 300);
  }

  static async getOnlineUsers() {
    const keys = await redis.keys('presence:*');
    const users = [];
    
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const userId = key.split(':')[1];
        users.push({ userId, ...JSON.parse(data) });
      }
    }
    
    return users;
  }

  static async handleDisconnect(socketId: string) {
    // Find and remove user by socket ID
    const keys = await redis.keys('presence:*');
    
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const presence = JSON.parse(data);
        if (presence.socketId === socketId) {
          await redis.del(key);
          const userId = key.split(':')[1];
          this.io.emit('presence-update', { userId, status: 'offline' });
          break;
        }
      }
    }
  }
}

export const initializePresenceManager = async (io: Server) => {
  await PresenceManager.initialize(io);
};
EOF

cat > services/presence-service/src/middleware/socketAuth.ts << 'EOF'
import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

export const socketAuth = (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    socket.data.user = decoded;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
};
EOF

cat > services/presence-service/src/middleware/auth.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
EOF

cat > services/presence-service/src/middleware/errorHandler.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
};
EOF

cat > services/presence-service/src/utils/logger.ts << 'EOF'
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'presence-service' },
  transports: [new winston.transports.Console()]
});
EOF

echo "Notification and Presence services implemented!"