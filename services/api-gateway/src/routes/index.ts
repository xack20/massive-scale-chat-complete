import { Router } from 'express';
import { authController } from '../controllers/authController';
import { healthController } from '../controllers/healthController';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Health check routes
router.get('/health', healthController.check);
router.get('/health/detailed', healthController.detailed);

// Authentication routes (handled by gateway, not proxied)
router.post('/auth/register', authRateLimiter, authController.register);
router.post('/auth/login', authRateLimiter, authController.login);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/logout', authController.logout);

// Service discovery endpoint
router.get('/services', (req, res) => {
  res.json({
    services: {
      users: process.env.USER_SERVICE_URL,
      messages: process.env.MESSAGE_SERVICE_URL,
      files: process.env.FILE_SERVICE_URL,
      notifications: process.env.NOTIFICATION_SERVICE_URL,
      presence: process.env.PRESENCE_SERVICE_URL
    }
  });
});

export default router;