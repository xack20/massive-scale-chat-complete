import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';

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

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3006'],
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

// Rate limiting
app.use('/api', rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
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