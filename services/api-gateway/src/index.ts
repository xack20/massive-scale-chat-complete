import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Load environment variables
dotenv.config({ path: '../../.env' });

import { authController } from './controllers/authController';
import { authMiddleware } from './middleware/auth';
import { logger } from './utils/logger';

const app = express();
const port = process.env.PORT || 3000;

// Ultra basic test routes - placed FIRST before any middleware
app.get('/ping', (req, res) => {
  res.send('pong');
});

app.get('/status', (req, res) => {
  res.json({ ok: true });
});

// (Removed temporary /emergency-test route used during debugging)

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3006',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-name']
}));

// Debug middleware
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
// Rate limiting middleware (applied globally except for health checks)
app.use(limiter);

// Global body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware to log request body
app.use('/api/messages', (req, res, next) => {
  logger.info(`Body received: ${JSON.stringify(req.body)} (size: ${JSON.stringify(req.body).length})`, { service: 'api-gateway' });
  next();
});

// Auth routes
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/refresh', authController.refreshToken);

// Health checks
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/readyz', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Socket.IO proxy for real-time features
logger.info('Setting up Socket.IO proxy for /socket.io -> message-service:3002');
app.use('/socket.io', createProxyMiddleware({
  target: process.env.MESSAGE_SERVICE_URL || 'http://message-service:3002',
  changeOrigin: true,
  ws: true,
  logLevel: 'debug' as const,
  timeout: 30000,
  proxyTimeout: 30000,
  xfwd: true
}));

// Individual proxy handlers with path rewriting

// Simple test route to verify routing works - placed early to avoid middleware
app.get('/test-direct', (req, res) => {
  res.json({ message: 'Direct test route working', path: req.originalUrl, timestamp: new Date().toISOString() });
});

// (Removed temporary /api/messages/test route used during debugging)

// Messages service proxy - with body rewriting for Express parsed bodies
logger.info('Registering proxy: /api/messages -> http://message-service:3002');

app.use('/api/messages', authMiddleware, createProxyMiddleware({
  target: 'http://message-service:3002',
  changeOrigin: true,
  pathRewrite: {
    '^/api/messages': ''
  },
  timeout: 30000,
  proxyTimeout: 30000,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req) => {
    logger.info(`PROXY: ${req.method} ${req.originalUrl} -> ${proxyReq.path}`, { service: 'api-gateway' });
    
    // Handle body rewriting for POST/PUT requests when body has been parsed by Express
    if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && req.body) {
      const bodyData = JSON.stringify(req.body);
      const contentLength = Buffer.byteLength(bodyData);
      
      logger.info(`Rewriting body: ${bodyData.substring(0, 100)}...`, { service: 'api-gateway' });
      
      // Fix the content-length
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', contentLength.toString());
      
      // Write the body
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req) => {
    logger.info(`PROXY RESPONSE: ${proxyRes.statusCode} for ${req.originalUrl}`, { service: 'api-gateway' });
  },
  onError: (err, req, res) => {
    logger.error(`PROXY ERROR: ${err.message} for ${req.originalUrl}`, { service: 'api-gateway' });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Gateway error', message: err.message });
    }
  }
}));

// Users service proxy (do NOT rewrite path so user-service keeping /api/users mount works)
logger.info('Registering proxy: /api/users -> http://user-service:3001 (no path rewrite)');
app.use('/api/users', authMiddleware, createProxyMiddleware({
  target: process.env.USER_SERVICE_URL || 'http://user-service:3001',
  changeOrigin: true,
  logLevel: 'info' as const,
  timeout: 10000,
  proxyTimeout: 10000
}));

// Files service proxy
logger.info('Registering proxy: /api/files -> http://file-service:3003');
app.use('/api/files', authMiddleware, createProxyMiddleware({
  target: process.env.FILE_SERVICE_URL || 'http://file-service:3003',
  changeOrigin: true,
  logLevel: 'info' as const,
  timeout: 15000,
  proxyTimeout: 15000,
  pathRewrite: {
    '^/api/files': ''
  }
}));

// Notifications service proxy
logger.info('Registering proxy: /api/notifications -> http://notification-service:3004');
app.use('/api/notifications', authMiddleware, createProxyMiddleware({
  target: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3004',
  changeOrigin: true,
  logLevel: 'info' as const,
  timeout: 10000,
  proxyTimeout: 10000,
  pathRewrite: {
    '^/api/notifications': ''
  }
}));

// Presence service proxy
logger.info('Registering proxy: /api/presence -> http://presence-service:3005');
app.use('/api/presence', authMiddleware, createProxyMiddleware({
  target: process.env.PRESENCE_SERVICE_URL || 'http://presence-service:3005',
  changeOrigin: true,
  logLevel: 'info' as const,
  timeout: 10000,
  proxyTimeout: 10000,
  pathRewrite: {
    '^/api/presence': ''
  }
}));

// WebSocket proxy for presence features
logger.info('Setting up WebSocket proxy for /ws -> presence-service:3005');
app.use('/ws', createProxyMiddleware({
  target: process.env.PRESENCE_SERVICE_URL || 'http://presence-service:3005',
  ws: true,
  changeOrigin: true,
  logLevel: 'info' as const
}));

logger.info('WebSocket proxy registered successfully');

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  logger.error('API Gateway error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  logger.info(`API Gateway running on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info('Graceful shutdown initiated');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
