import Redis from 'ioredis';
import { logger } from '../utils/logger';

const buildRedisUrl = () => {
  const base = process.env.REDIS_URL || 'redis://redis:6379';
  const password = process.env.REDIS_PASSWORD;
  if (!password) return base;
  // If URL already contains password, return as-is
  if (base.includes('@')) return base;
  // Insert password after protocol
  return base.replace('redis://', `redis://:${password}@`);
};

export const redis = new Redis(buildRedisUrl());

export const connectRedis = async () => {
  redis.on('connect', () => {
    logger.info('Redis connected');
  });

  redis.on('error', (error) => {
    logger.error('Redis error:', error);
  });
};
