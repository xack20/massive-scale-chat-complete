import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import client from 'prom-client';
import { connectRedis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import notificationRoutes from './routes/notificationRoutes';
import { initializeKafkaConsumer } from './services/kafkaConsumer';
import { logger } from './utils/logger';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3004;
const KAFKA_DISABLED = (process.env.KAFKA_DISABLED || 'false').toLowerCase() === 'true';

// Prometheus metrics setup
client.collectDefaultMetrics();
const httpRequestDuration = new client.Histogram({
  name: 'notification_service_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds for Notification Service',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2,5]
});
const requestCounter = new client.Counter({
  name: 'notification_service_requests_total',
  help: 'Total number of requests received by Notification Service',
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

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'notification-service', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Liveness & Readiness
app.get('/livez', (_req, res) => res.status(200).send('ok'));
app.get('/readyz', async (_req, res) => {
  try {
    // Basic readiness: Redis must be connected (placeholder - could enhance with ping)
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

app.use('/api/notifications', notificationRoutes);
app.use(errorHandler);

const startServer = async () => {
  await connectRedis();
  if (KAFKA_DISABLED) {
    logger.warn('Kafka consumer disabled via KAFKA_DISABLED env flag');
  } else {
    await initializeKafkaConsumer();
  }
  
  const server = app.listen(PORT, () => {
    logger.info(`Notification Service running on port ${PORT}`);
  });

  const gracefulShutdown = async () => {
    logger.info('Graceful shutdown initiated (notification-service)');
    server.close(() => {
      logger.info('HTTP server closed (notification-service)');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forcefully shutting down (notification-service)');
      process.exit(1);
    }, 10000);
  };
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

startServer();
