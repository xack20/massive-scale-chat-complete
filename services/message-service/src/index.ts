import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import http from 'http';
import morgan from 'morgan';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config({ path: '../../.env' });

// Import database connection
import { connectDatabase } from './config/database';

// Import middleware
import { errorHandler } from './middleware/errorHandler';

// Import routes
import messageRoutes from './routes/messageRoutes';

// Import utilities
import { logger } from './utils/logger';

// Import services
import mongoose from 'mongoose';
import client from 'prom-client';
import { initializeKafka } from './services/kafkaService';
import { registerSocketIO } from './services/socketRegistry';
import { initializeSocketService } from './services/socketService';

// Initialize express app
const app: Application = express();
const PORT = process.env.MESSAGE_SERVICE_PORT || 3002;
const KAFKA_DISABLED = (process.env.KAFKA_DISABLED || 'false').toLowerCase() === 'true';

// Prometheus metrics setup
client.collectDefaultMetrics();
const httpRequestDuration = new client.Histogram({
  name: 'message_service_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds for Message Service',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2,5]
});
const requestCounter = new client.Counter({
  name: 'message_service_requests_total',
  help: 'Total number of requests received by Message Service',
  labelNames: ['method','route']
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = (req as any).route?.path || req.path;
    end({ method: req.method, route, status_code: res.statusCode });
    requestCounter.inc({ method: req.method, route });
  });
  next();
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Compression middleware
app.use(compression());

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'message-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Track readiness (Mongo connection)
let mongoReady = false;
mongoose.connection.on('connected', () => { mongoReady = true; });
mongoose.connection.on('disconnected', () => { mongoReady = false; });

// Liveness & Readiness endpoints
app.get('/livez', (_req: Request, res: Response) => res.status(200).send('ok'));
app.get('/readyz', (_req: Request, res: Response) => {
  if (mongoReady) return res.status(200).send('ready');
  return res.status(500).send('not-ready');
});

// Metrics endpoint
app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end((err as Error).message);
  }
});

// API Routes
app.use('/', messageRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource could not be found',
    path: req.originalUrl
  });
});

// Initialize services
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    // Initialize Kafka (unless disabled)
    if (KAFKA_DISABLED) {
      logger.warn('Kafka integration disabled via KAFKA_DISABLED env flag');
    } else {
      await initializeKafka();
    }
    
  // Register IO instance globally & initialize handlers
  registerSocketIO(io);
  await initializeSocketService(io);
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`Message Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Graceful shutdown initiated');
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export { app, io };

