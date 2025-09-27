import { Request, Response } from 'express';
import { sendEmail } from '../services/emailService';
import { sendPushNotification } from '../services/pushService';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export const notificationController = {
  async sendNotification(req: Request, res: Response) {
    try {
      const { userId, type, title, message, data } = req.body;

      if (type === 'email') {
        await sendEmail(data.email, title, message);
      } else if (type === 'push') {
        await sendPushNotification(userId, title, message);
      }

      // Store notification in Redis
      await redis.lpush(`notifications:${userId}`, JSON.stringify({
        title,
        message,
        type,
        timestamp: new Date(),
        read: false
      }));

      res.json({ success: true, message: 'Notification sent' });
    } catch (error) {
      logger.error('Notification error:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  },

  async getNotifications(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string;
      const notifications = await redis.lrange(`notifications:${userId}`, 0, -1);
      
      res.json(notifications.map(n => JSON.parse(n)));
    } catch (error) {
      logger.error('Get notifications error:', error);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  },

  async markAsRead(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { notificationId } = req.params;
      
      // Implementation for marking notification as read
      res.json({ success: true });
    } catch (error) {
      logger.error('Mark as read error:', error);
      res.status(500).json({ error: 'Failed to mark as read' });
    }
  }
};
