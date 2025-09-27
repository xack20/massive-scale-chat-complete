import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import client from 'prom-client';
import { initializeStorage } from './config/storage';
import { errorHandler } from './middleware/errorHandler';
import fileRoutes from './routes/fileRoutes';
import { logger } from './utils/logger';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.FILE_SERVICE_PORT || 3003;
const KAFKA_DISABLED = (process.env.KAFKA_DISABLED || 'false').toLowerCase() === 'true';

// Prometheus metrics setup
client.collectDefaultMetrics();
const httpRequestDuration = new client.Histogram({
  name: 'file_service_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds for File Service',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2,5]
});
const requestCounter = new client.Counter({
  name: 'file_service_requests_total',
  help: 'Total number of requests received by File Service',
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
  res.json({ status: 'healthy', service: 'file-service', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Liveness & Readiness
app.get('/livez', (_req, res) => res.status(200).send('ok'));
app.get('/readyz', async (_req, res) => {
  try {
    // Simple readiness: ensure storage is initialized by checking env essentials
    if (!process.env.MINIO_ENDPOINT) return res.status(500).send('not-ready');
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

app.use('/api/files', fileRoutes);
app.use(errorHandler);

const startServer = async () => {
  try {
    await initializeStorage();
    if (KAFKA_DISABLED) {
      logger.warn('Kafka integration disabled via KAFKA_DISABLED env flag (no-op for file-service)');
    }
    const server = app.listen(PORT, () => {
      logger.info(`File Service running on port ${PORT}`);
    });

    const gracefulShutdown = async () => {
      logger.info('Graceful shutdown initiated (file-service)');
      server.close(() => {
        logger.info('HTTP server closed (file-service)');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Forcefully shutting down (file-service)');
        process.exit(1);
      }, 10000);
    };
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    logger.error('Failed to start file-service:', error);
    process.exit(1);
  }
};

startServer();
