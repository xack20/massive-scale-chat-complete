import crypto from 'crypto';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { logger } from './logger';

// Redis client (optional). If REDIS_URL absent, use in-memory fallback.
let redis: Redis | null = null;
if (process.env.REDIS_URL) {
  try {
    const redisOptions: any = { lazyConnect: true };
    if (process.env.REDIS_PASSWORD) {
      redisOptions.password = process.env.REDIS_PASSWORD;
    }
    redis = new Redis(process.env.REDIS_URL, redisOptions);
    redis.on('error', err => logger.error('[redis] error', err));
    redis.connect().catch(err => logger.error('Failed to connect Redis', err));
  } catch (err) {
    logger.error('Redis initialization failed, falling back to memory blacklist', err);
    redis = null;
  }
} else {
  logger.warn('[tokenBlacklist] REDIS_URL not set, using in-memory blacklist');
}

interface BlacklistedToken { expiresAt: number; }
const memoryBlacklist = new Map<string, BlacklistedToken>();

// Refresh token storage (hashed) when using memory fallback
interface RefreshRecord { userId: string; exp: number; } // exp epoch seconds
const memoryRefresh = new Map<string, RefreshRecord>();

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [token, meta] of memoryBlacklist.entries()) if (meta.expiresAt <= now) memoryBlacklist.delete(token);
  for (const [key, rec] of memoryRefresh.entries()) if (rec.exp <= now) memoryRefresh.delete(key);
}, CLEANUP_INTERVAL_MS).unref?.();

export function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function blacklistToken(token: string) {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    const exp = decoded?.exp || Math.floor(Date.now() / 1000) + 3600;
    if (redis) {
      await redis.set(`bl:${token}`, '1', 'EX', Math.max(1, exp - Math.floor(Date.now() / 1000)));
    } else {
      memoryBlacklist.set(token, { expiresAt: exp });
    }
  } catch {
    const fallbackExp = Math.floor(Date.now() / 1000) + 1800;
    if (redis) {
      await redis.set(`bl:${token}`, '1', 'EX', 1800);
    } else {
      memoryBlacklist.set(token, { expiresAt: fallbackExp });
    }
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  if (redis) return Boolean(await redis.get(`bl:${token}`));
  const entry = memoryBlacklist.get(token);
  if (!entry) return false;
  if (entry.expiresAt <= Math.floor(Date.now() / 1000)) { memoryBlacklist.delete(token); return false; }
  return true;
}

export async function storeRefreshToken(jti: string, rawToken: string, userId: string, exp: number) {
  const ttl = Math.max(1, exp - Math.floor(Date.now() / 1000));
  const key = `rt:${hashToken(rawToken)}`; // store hashed token
  const val = JSON.stringify({ jti, userId, exp });
  if (redis) await redis.set(key, val, 'EX', ttl);
  else memoryRefresh.set(key, { userId, exp });
}

export async function revokeRefreshToken(rawToken: string) {
  const key = `rt:${hashToken(rawToken)}`;
  if (redis) await redis.del(key);
  else memoryRefresh.delete(key);
}

export async function isRefreshTokenValid(rawToken: string, userId: string): Promise<boolean> {
  const key = `rt:${hashToken(rawToken)}`;
  if (redis) {
    const data = await redis.get(key);
    if (!data) return false;
    try { const parsed = JSON.parse(data); return parsed.userId === userId; } catch { return false; }
  } else {
    const rec = memoryRefresh.get(key); if (!rec) return false; if (rec.userId !== userId) return false; if (rec.exp <= Math.floor(Date.now() / 1000)) { memoryRefresh.delete(key); return false; } return true;
  }
}

export function getBlacklistSize() { return memoryBlacklist.size; }

