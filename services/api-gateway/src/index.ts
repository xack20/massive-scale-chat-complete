// Minimal NodeJS global typings fallbacks (in case @types/node not included during build stage)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const process: any; // Provided by Node at runtime
// URL global exists in Node >= 10; declare for TypeScript if missing types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const URL: typeof globalThis.URL;

import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import morgan from 'morgan';
import client from 'prom-client';

// Load environment variables
dotenv.config({ path: '../../.env' });

// Import middleware
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Import routes
import routes from './routes';

// Import utilities
import { logger } from './utils/logger';

// Initialize express app
const app: Application = express();
const PORT = process.env.PORT || 3000;

// Prometheus metrics setup
client.collectDefaultMetrics();
const httpRequestDuration = new client.Histogram({
  name: 'api_gateway_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds for API Gateway',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2,5]
});
const requestCounter = new client.Counter({
  name: 'api_gateway_requests_total',
  help: 'Total number of requests received by API Gateway',
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

// Security middleware
app.use(helmet());

// Flexible CORS configuration: supports comma-separated origins in CORS_ORIGIN.
// If not provided, default to common local development origins (port 80 via HAProxy & Next.js port 3006).
// Additionally, accept any localhost / 127.0.0.1 (http/https, any port) to reduce friction in dev while keeping
// production explicit via env.
const allowedOrigins = (process.env.CORS_ORIGIN?.split(',').map((o: string) => o.trim()).filter(Boolean)) || [
  'http://localhost',
  'http://localhost:80',
  'http://localhost:3000',
  'http://localhost:3006',
  'http://127.0.0.1',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3006'
];

// Helper to evaluate dynamic acceptance
const isDynamicallyAllowed = (origin: string): boolean => {
  if (allowedOrigins.includes(origin)) return true;
  try {
    const u = new URL(origin);
    if ((u.hostname === 'localhost' || u.hostname === '127.0.0.1') && ['http:', 'https:'].includes(u.protocol)) {
      return true;
    }
  } catch (_) {
    return false;
  }
  return false;
};

logger.info(`[CORS] Allowed origins list (explicit): ${allowedOrigins.join(', ')}`);

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) { // non-browser or same-origin
      return callback(null, true);
    }
    if (isDynamicallyAllowed(origin)) {
      logger.debug(`[CORS] Allowing origin: ${origin}`);
      return callback(null, true);
    }
    logger.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Accept','X-Requested-With'],
  exposedHeaders: ['Authorization']
}));

// Ensure preflight for all routes (some proxies / client libs can send OPTIONS to deep paths)
app.options('*', cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    if (isDynamicallyAllowed(origin)) return callback(null, true);
    return callback(new Error('CORS preflight origin rejected'));
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Accept','X-Requested-With']
}));

// Lightweight debugging endpoint to introspect CORS behavior during development
app.get('/cors-debug', (req: Request, res: Response) => {
  res.json({
    requestedOrigin: req.headers.origin,
    explicitAllowedOrigins: allowedOrigins,
    dynamicAccepted: req.headers.origin ? isDynamicallyAllowed(req.headers.origin) : 'n/a'
  });
});

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

// Rate limiting
app.use('/api', rateLimiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Liveness & Readiness
app.get('/livez', (_req: Request, res: Response) => res.status(200).send('ok'));
app.get('/readyz', async (_req: Request, res: Response) => {
  try {
    // Gateway readiness: for now just always ready (could add downstream probes later)
    res.status(200).send('ready');
  } catch (e) {
    res.status(500).send('not-ready');
  }
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
app.use('/api', routes);

// Service proxy configuration
const services = {
  '/api/users': {
    target: process.env.USER_SERVICE_URL || 'http://user-service:3001',
    changeOrigin: true,
    pathRewrite: { '^/api/users': '' }
  },
  '/api/messages': {
    target: process.env.MESSAGE_SERVICE_URL || 'http://message-service:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/messages': '' }
  },
  '/api/files': {
    target: process.env.FILE_SERVICE_URL || 'http://file-service:3003',
    changeOrigin: true,
    pathRewrite: { '^/api/files': '' }
  },
  '/api/notifications': {
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3004',
    changeOrigin: true,
    pathRewrite: { '^/api/notifications': '' }
  },
  '/api/presence': {
    target: process.env.PRESENCE_SERVICE_URL || 'http://presence-service:3005',
    changeOrigin: true,
    pathRewrite: { '^/api/presence': '' }
  }
};

// Set up proxies for each service
Object.entries(services).forEach(([path, config]) => {
  app.use(path, authMiddleware, createProxyMiddleware(config));
});

// WebSocket proxy for real-time features
app.use('/ws', createProxyMiddleware({
  target: process.env.PRESENCE_SERVICE_URL || 'http://presence-service:3005',
  ws: true,
  changeOrigin: true
}));

// Socket.IO proxy for chat features (no auth middleware for WebSocket handshake)
app.use('/socket.io', createProxyMiddleware({
  target: process.env.MESSAGE_SERVICE_URL || 'http://message-service:3002',
  ws: true,
  changeOrigin: true,
  pathRewrite: {
    '^/socket.io': '/socket.io'
  }
}));

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource could not be found',
    path: req.originalUrl
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info('Service proxies configured:');
  Object.keys(services).forEach(path => {
    logger.info(`  ${path} -> ${services[path as keyof typeof services].target}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;