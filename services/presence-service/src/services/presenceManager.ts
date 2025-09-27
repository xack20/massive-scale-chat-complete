import Redis from 'ioredis';
import { Server } from 'socket.io';
import { logger } from '../utils/logger';

const buildRedisUrl = () => {
  const base = process.env.REDIS_URL || 'redis://redis:6379';
  const password = process.env.REDIS_PASSWORD;
  if (!password) return base;
  if (base.includes('@')) return base; // already has credentials
  return base.replace('redis://', `redis://:${password}@`);
};

const redis = new Redis(buildRedisUrl());

export class PresenceManager {
  private static io: Server;

  static async initialize(io: Server) {
    this.io = io;

    io.on('connection', (socket) => {
      logger.info(`User connected: ${socket.id}`);

      socket.on('user-online', async (userId) => {
        await this.setUserOnline(userId, socket.id);
        socket.join(`user:${userId}`);
        io.emit('presence-update', { userId, status: 'online' });
      });

      socket.on('typing', ({ userId, conversationId }) => {
        socket.to(`conversation:${conversationId}`).emit('user-typing', { userId });
      });

      socket.on('stop-typing', ({ userId, conversationId }) => {
        socket.to(`conversation:${conversationId}`).emit('user-stop-typing', { userId });
      });

      socket.on('disconnect', async () => {
        await this.handleDisconnect(socket.id);
      });
    });
  }

  static async setUserOnline(userId: string, socketId: string) {
    await redis.set(`presence:${userId}`, JSON.stringify({
      status: 'online',
      socketId,
      lastSeen: new Date()
    }), 'EX', 300); // Expire after 5 minutes
  }

  static async getUserStatus(userId: string) {
    const data = await redis.get(`presence:${userId}`);
    return data ? JSON.parse(data) : { status: 'offline' };
  }

  static async updateUserStatus(userId: string, status: string) {
    await redis.set(`presence:${userId}`, JSON.stringify({
      status,
      lastSeen: new Date()
    }), 'EX', 300);
  }

  static async getOnlineUsers() {
    const keys = await redis.keys('presence:*');
    const users = [];
    
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const userId = key.split(':')[1];
        users.push({ userId, ...JSON.parse(data) });
      }
    }
    
    return users;
  }

  static async handleDisconnect(socketId: string) {
    // Find and remove user by socket ID
    const keys = await redis.keys('presence:*');
    
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const presence = JSON.parse(data);
        if (presence.socketId === socketId) {
          await redis.del(key);
          const userId = key.split(':')[1];
          this.io.emit('presence-update', { userId, status: 'offline' });
          break;
        }
      }
    }
  }
}

export const initializePresenceManager = async (io: Server) => {
  await PresenceManager.initialize(io);
};
