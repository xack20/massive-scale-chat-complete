import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import client from 'prom-client';

// Load environment variables
dotenv.config({ path: '../../.env' });

// Import middleware
import { errorHandler } from './middleware/errorHandler';

// Import routes
import userRoutes from './routes/userRoutes';

// Import utilities
import { logger } from './utils/logger';

// Import database
import prisma from './config/database';

// Initialize express app
const app: Application = express();
const PORT = process.env.USER_SERVICE_PORT || 3001;
const KAFKA_DISABLED = (process.env.KAFKA_DISABLED || 'false').toLowerCase() === 'true';

// Prometheus metrics setup
client.collectDefaultMetrics();
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2,5]
});

// Simple middleware to record metrics
app.use((req: Request, res: Response, next: NextFunction) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = (req as any).route?.path || req.path;
    end({ method: req.method, route, status_code: res.statusCode });
  });
  next();
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
    service: 'user-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness/Readiness split (basic)
app.get('/livez', (_req: Request, res: Response) => res.status(200).send('ok'));
app.get('/readyz', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).send('ready');
  } catch (e) {
    res.status(500).send('not-ready');
  }
});

// Metrics endpoint
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end((err as Error).message);
  }
});

// API Routes
app.use('/api/users', userRoutes);

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

// Placeholder for Kafka init (skipped if disabled)
const initKafka = async () => {
  if (KAFKA_DISABLED) {
    logger.warn('Kafka integration disabled via KAFKA_DISABLED env flag');
    return;
  }
  // Future: initialize Kafka producers/consumers here.
  logger.info('Kafka initialization placeholder (no-op)');
};

// Start server
const server = app.listen(PORT, async () => {
  logger.info(`User Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  await initKafka();
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Graceful shutdown initiated');
  
  // Close database connections
  await prisma.$disconnect();
  
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

export default app;