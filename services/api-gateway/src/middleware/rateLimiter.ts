import { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

// Create different rate limiters for different endpoints
// Determine environment early for both global & auth limiter decisions
const globalIsTestLike = ['test'].includes(process.env.NODE_ENV || '')
  || process.env.PLAYWRIGHT === 'true'
  || process.env.PLAYWRIGHT_TEST === 'true'
  || process.env.CI === 'true';
const globalForceEnable = process.env.ENABLE_GLOBAL_RATE_LIMIT === 'true';
const globalDisableAuthPaths = (process.env.DISABLE_AUTH_RATE_LIMIT === 'true' || globalIsTestLike) && !globalForceEnable;

export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  handler: (req: Request, res: Response) => {
    logger.warn({
      message: 'Rate limit exceeded',
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
      scope: 'globalRateLimiter'
    });
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: req.headers['retry-after'],
      source: 'globalRateLimiter'
    });
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Skip rate limiting for health checks always
    if (req.path === '/health') return true;
    // If auth limiter disabled we must also bypass global limiter for auth endpoints to avoid unintended 429s
    if (globalDisableAuthPaths && req.path.startsWith('/auth/')) return true;
    return false;
  },
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.userId || req.ip || 'unknown';
  }
});

// Stricter rate limiter for authentication endpoints
// --- Authentication rate limiter -------------------------------------------------
// We keep production strict while making local/dev & automated test environments lenient
// to avoid false flakiness (Playwright can legitimately create many users quickly).
// Additionally allow full bypass via DISABLE_AUTH_RATE_LIMIT or PLAYWRIGHT_TEST flags.
const authWindowMs = 15 * 60 * 1000; // 15 minutes
const isProd = process.env.NODE_ENV === 'production';
const isTestLike = ['test'].includes(process.env.NODE_ENV || '')
  || process.env.PLAYWRIGHT === 'true'
  || process.env.PLAYWRIGHT_TEST === 'true'
  || process.env.CI === 'true';
// Allow explicit forcing ON even in dev/test via ENABLE_AUTH_RATE_LIMIT=true
const forceEnable = process.env.ENABLE_AUTH_RATE_LIMIT === 'true';
// Disable if any bypass flag OR (not production) unless explicitly forced on
const disableAuthLimiter = !forceEnable && (
  process.env.DISABLE_AUTH_RATE_LIMIT === 'true' ||
  isTestLike ||
  process.env.NODE_ENV !== 'production'
);
const authMax = isProd
  ? parseInt(process.env.AUTH_RATE_LIMIT_MAX_PROD || '5', 10)
  : parseInt(process.env.AUTH_RATE_LIMIT_MAX_NONPROD || '1000', 10);

if (disableAuthLimiter) {
  logger.warn('[rateLimiter] Auth rate limiter DISABLED for this run (test/bypass flag detected).');
}

const internalAuthLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMax,
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true,      // expose RateLimit-* headers for easier debugging
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn({
      message: 'Auth rate limit exceeded',
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
      source: 'authRateLimiter',
      limit: authMax
    });
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Auth rate limit exceeded. Please try again later.',
      source: 'authRateLimiter'
    });
  },
  keyGenerator: (req: Request) => {
    // Use userId if already present (e.g., repeated login attempts), else IP.
    return req.user?.userId || req.ip || 'unknown';
  }
});

export const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (disableAuthLimiter) {
    // Lightweight trace for debugging sporadic 429s in test environments
    if (process.env.LOG_AUTH_RATE_LIMIT_BYPASS === 'true') {
      logger.debug(`[rateLimiter] Bypass active for ${req.method} ${req.originalUrl}`);
    }
    return next();
  }
  return internalAuthLimiter(req, res, next);
};

// Log final configuration once on module load (non-production to reduce noise in prod)
if (!isProd) {
  logger.info(`[rateLimiter] Auth limiter configured (bypass=${disableAuthLimiter}) windowMs=${authWindowMs} max=${authMax}`);
}

// Rate limiter for file uploads
export const fileUploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each user to 20 file uploads per hour
  message: 'Too many file uploads, please try again later.',
  keyGenerator: (req: Request) => {
    // Always use user ID for file uploads
    return req.user?.userId || 'anonymous';
  }
});

// Rate limiter for message sending
export const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each user to 30 messages per minute
  message: 'Sending messages too quickly, please slow down.',
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  }
});