import { Request, Response } from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

export const healthController = {
  async check(req: Request, res: Response) {
    res.status(200).json({
      status: 'healthy',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  },

  async detailed(req: Request, res: Response) {
    const healthChecks: any = {
      status: 'healthy',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {}
    };

    // Check PostgreSQL
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthChecks.checks.postgresql = { status: 'healthy' };
    } catch (error) {
      healthChecks.checks.postgresql = { status: 'unhealthy', error: (error as Error).message };
      healthChecks.status = 'degraded';
    }

    // Check Redis
    try {
      await redis.ping();
      healthChecks.checks.redis = { status: 'healthy' };
    } catch (error) {
      healthChecks.checks.redis = { status: 'unhealthy', error: (error as Error).message };
      healthChecks.status = 'degraded';
    }

    // Check downstream services
    const services = [
      { name: 'user-service', url: process.env.USER_SERVICE_URL },
      { name: 'message-service', url: process.env.MESSAGE_SERVICE_URL },
      { name: 'file-service', url: process.env.FILE_SERVICE_URL },
      { name: 'notification-service', url: process.env.NOTIFICATION_SERVICE_URL },
      { name: 'presence-service', url: process.env.PRESENCE_SERVICE_URL }
    ];

    for (const service of services) {
      if (!service.url) continue;
      
      try {
        const response = await axios.get(`${service.url}/health`, { timeout: 5000 });
        healthChecks.checks[service.name] = {
          status: response.data.status || 'healthy',
          responseTime: response.headers['x-response-time'] || 'N/A'
        };
      } catch (error) {
        healthChecks.checks[service.name] = {
          status: 'unhealthy',
          error: axios.isAxiosError(error) ? error.message : 'Unknown error'
        };
        healthChecks.status = 'degraded';
      }
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    healthChecks.memory = {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
    };

    const statusCode = healthChecks.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthChecks);
  }
};