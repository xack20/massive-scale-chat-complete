import { Request, Response } from 'express';
import { PresenceManager } from '../services/presenceManager';
import { logger } from '../utils/logger';

export const presenceController = {
  async getOnlineUsers(req: Request, res: Response) {
    try {
      const users = await PresenceManager.getOnlineUsers();
      res.json(users);
    } catch (error) {
      logger.error('Get online users error:', error);
      res.status(500).json({ error: 'Failed to get online users' });
    }
  },

  async getUserStatus(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const status = await PresenceManager.getUserStatus(userId);
      res.json({ userId, status });
    } catch (error) {
      logger.error('Get user status error:', error);
      res.status(500).json({ error: 'Failed to get user status' });
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { status } = req.body;
      
      await PresenceManager.updateUserStatus(userId, status);
      res.json({ success: true });
    } catch (error) {
      logger.error('Update status error:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }
  }
};
