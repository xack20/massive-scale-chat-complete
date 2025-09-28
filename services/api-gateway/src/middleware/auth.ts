import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip authentication for certain paths
    const publicPaths = [
      '/api/auth/login', 
      '/api/auth/register', 
      '/api/users/login', 
      '/api/users/register',
      '/api/health', 
      '/socket.io', 
      '/ws'
    ];
    
    // Also allow health endpoints for all services
    const healthEndpoints = ['/health', '/livez', '/readyz', '/metrics'];
    const isHealthEndpoint = healthEndpoints.some(endpoint => req.path.endsWith(endpoint));
    const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
    
    if (isPublicPath || isHealthEndpoint || req.path.includes('/health')) {
      return next();
    }

    // Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid authentication token provided'
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    // Attach user to request
    req.user = decoded;
    
    // Add user ID to headers for downstream services
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-name'] = decoded.email; // Use email as username for now
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role'] = decoded.role;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has expired'
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }

    logger.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};

// Optional: Role-based access control middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};