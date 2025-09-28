import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import http from 'http';
import client from 'prom-client';
import { Server } from 'socket.io';
import { errorHandler } from './middleware/errorHandler';
import presenceRoutes from './routes/presenceRoutes';
import { initializePresenceManager } from './services/presenceManager';
import { logger } from './utils/logger';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PRESENCE_SERVICE_PORT || 3005;
const KAFKA_DISABLED = (process.env.KAFKA_DISABLED || 'false').toLowerCase() === 'true';
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000','http://localhost:3006']),
    credentials: true
  }
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// Prometheus metrics setup
client.collectDefaultMetrics();
const httpRequestDuration = new client.Histogram({
  name: 'presence_service_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds for Presence Service',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2,5]
});
const requestCounter = new client.Counter({
  name: 'presence_service_requests_total',
  help: 'Total number of requests received by Presence Service',
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

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'presence-service', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Liveness & Readiness
app.get('/livez', (_req, res) => res.status(200).send('ok'));
app.get('/readyz', async (_req, res) => {
  try {
    // Basic readiness: service started
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

app.use('/api/presence', presenceRoutes);
app.use(errorHandler);

const startServer = async () => {
  await initializePresenceManager(io);
  
  server.listen(PORT, () => {
    logger.info(`Presence Service running on port ${PORT}`);
    if (KAFKA_DISABLED) {
      logger.warn('Kafka integration disabled via KAFKA_DISABLED env flag (presence-service placeholder)');
    }
  });

  const gracefulShutdown = async () => {
    logger.info('Graceful shutdown initiated (presence-service)');
    server.close(() => {
      logger.info('HTTP server closed (presence-service)');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forcefully shutting down (presence-service)');
      process.exit(1);
    }, 10000);
  };
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

startServer();
