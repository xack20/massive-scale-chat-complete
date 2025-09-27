#!/bin/bash

echo "Implementing remaining services and components..."

# Complete Message Service implementation
cat > services/message-service/src/controllers/messageController.ts << 'EOF'
import { Request, Response } from 'express';
import { Message } from '../models/message';
import { Conversation } from '../models/conversation';
import { publishToKafka } from '../services/kafkaService';
import { logger } from '../utils/logger';

export const messageController = {
  async sendMessage(req: Request, res: Response) {
    try {
      const { conversationId, content, type = 'text', attachments, replyTo } = req.body;
      const userId = req.headers['x-user-id'] as string;
      const userName = req.headers['x-user-name'] as string;

      const message = await Message.create({
        conversationId,
        senderId: userId,
        senderName: userName,
        content,
        type,
        attachments,
        replyTo,
        status: 'sent'
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: {
          messageId: message._id,
          content,
          senderId: userId,
          senderName: userName,
          timestamp: message.createdAt
        }
      });

      await publishToKafka('message-sent', message);

      res.status(201).json(message);
    } catch (error) {
      logger.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  },

  async getMessages(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      const messages = await Message.find({ 
        conversationId,
        deletedAt: null 
      })
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      res.json(messages);
    } catch (error) {
      logger.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  },

  async updateMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.headers['x-user-id'] as string;

      const message = await Message.findOneAndUpdate(
        { _id: id, senderId: userId },
        { content, editedAt: new Date() },
        { new: true }
      );

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      await publishToKafka('message-updated', message);
      res.json(message);
    } catch (error) {
      logger.error('Error updating message:', error);
      res.status(500).json({ error: 'Failed to update message' });
    }
  },

  async deleteMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const message = await Message.findOneAndUpdate(
        { _id: id, senderId: userId },
        { deletedAt: new Date() },
        { new: true }
      );

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      await publishToKafka('message-deleted', { messageId: id });
      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      logger.error('Error deleting message:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  }
};
EOF

# Message Service routes
cat > services/message-service/src/routes/messageRoutes.ts << 'EOF'
import { Router } from 'express';
import { messageController } from '../controllers/messageController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', messageController.sendMessage);
router.get('/conversation/:conversationId', messageController.getMessages);
router.put('/:id', messageController.updateMessage);
router.delete('/:id', messageController.deleteMessage);

export default router;
EOF

# Message Service middleware
cat > services/message-service/src/middleware/auth.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
EOF

cat > services/message-service/src/middleware/errorHandler.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
};
EOF

# Message Service utils
cat > services/message-service/src/utils/logger.ts << 'EOF'
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'message-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
EOF

# Message Service Kafka service
cat > services/message-service/src/services/kafkaService.ts << 'EOF'
import { Kafka } from 'kafkajs';
import { logger } from '../utils/logger';

const kafka = new Kafka({
  clientId: 'message-service',
  brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(',')
});

const producer = kafka.producer();

export const initializeKafka = async () => {
  try {
    await producer.connect();
    logger.info('Kafka producer connected');
  } catch (error) {
    logger.error('Kafka connection failed:', error);
    throw error;
  }
};

export const publishToKafka = async (topic: string, message: any) => {
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }]
    });
  } catch (error) {
    logger.error('Failed to publish to Kafka:', error);
  }
};
EOF

# Message Service Socket service
cat > services/message-service/src/services/socketService.ts << 'EOF'
import { Server } from 'socket.io';
import { logger } from '../utils/logger';

export const initializeSocketService = async (io: Server) => {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('join-conversation', (conversationId) => {
      socket.join(conversationId);
      logger.info(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    socket.on('leave-conversation', (conversationId) => {
      socket.leave(conversationId);
      logger.info(`Socket ${socket.id} left conversation ${conversationId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
};
EOF

cat > services/message-service/src/services/messageProcessor.ts << 'EOF'
import { Message } from '../models/message';
import { logger } from '../utils/logger';

export class MessageProcessor {
  static async processMessage(message: any) {
    try {
      // Process message logic here
      logger.info('Processing message:', message);
      return message;
    } catch (error) {
      logger.error('Error processing message:', error);
      throw error;
    }
  }
}
EOF

# File Service implementation
cat > services/file-service/src/index.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import fileRoutes from './routes/fileRoutes';
import { errorHandler } from './middleware/errorHandler';
import { initializeStorage } from './config/storage';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.FILE_SERVICE_PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'file-service' });
});

app.use('/api/files', fileRoutes);
app.use(errorHandler);

const startServer = async () => {
  await initializeStorage();
  app.listen(PORT, () => {
    logger.info(`File Service running on port ${PORT}`);
  });
};

startServer();
EOF

cat > services/file-service/src/config/storage.ts << 'EOF'
import { Client } from 'minio';
import { logger } from '../utils/logger';

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

export const initializeStorage = async () => {
  const bucketName = process.env.MINIO_BUCKET_NAME || 'chat-uploads';
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName);
    logger.info(`Bucket ${bucketName} created`);
  }
};
EOF

cat > services/file-service/src/controllers/fileController.ts << 'EOF'
import { Request, Response } from 'express';
import { minioClient } from '../config/storage';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const fileController = {
  async uploadFile(req: Request, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileName = `${uuidv4()}-${file.originalname}`;
      const bucketName = process.env.MINIO_BUCKET_NAME || 'chat-uploads';

      await minioClient.putObject(bucketName, fileName, file.buffer, file.size, {
        'Content-Type': file.mimetype
      });

      const fileUrl = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${fileName}`;

      res.json({
        fileName,
        fileUrl,
        size: file.size,
        mimeType: file.mimetype
      });
    } catch (error) {
      logger.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  },

  async getFile(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      const bucketName = process.env.MINIO_BUCKET_NAME || 'chat-uploads';
      
      const stream = await minioClient.getObject(bucketName, fileName);
      stream.pipe(res);
    } catch (error) {
      logger.error('Get file error:', error);
      res.status(404).json({ error: 'File not found' });
    }
  }
};
EOF

cat > services/file-service/src/routes/fileRoutes.ts << 'EOF'
import { Router } from 'express';
import { fileController } from '../controllers/fileController';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authMiddleware);
router.post('/upload', upload.single('file'), fileController.uploadFile);
router.get('/:fileName', fileController.getFile);

export default router;
EOF

cat > services/file-service/src/middleware/upload.ts << 'EOF'
import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800')
  }
});
EOF

cat > services/file-service/src/middleware/auth.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
EOF

cat > services/file-service/src/middleware/errorHandler.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
};
EOF

cat > services/file-service/src/utils/logger.ts << 'EOF'
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'file-service' },
  transports: [new winston.transports.Console()]
});
EOF

cat > services/file-service/src/services/fileProcessor.ts << 'EOF'
import sharp from 'sharp';
import { logger } from '../utils/logger';

export class FileProcessor {
  static async generateThumbnail(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(200, 200)
        .toBuffer();
    } catch (error) {
      logger.error('Thumbnail generation failed:', error);
      throw error;
    }
  }
}
EOF

echo "Services implementation completed!"