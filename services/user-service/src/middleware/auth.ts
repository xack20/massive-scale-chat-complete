import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for user headers set by API Gateway
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];
    const userRole = req.headers['x-user-role'];

    if (!userId || !userEmail) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Headers are set, user is authenticated via API Gateway
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};
