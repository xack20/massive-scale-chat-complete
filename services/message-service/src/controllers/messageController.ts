import { Request, Response } from 'express';
import { Conversation } from '../models/conversation';
import { Message } from '../models/message';
import { publishToKafka } from '../services/kafkaService';
import { getSocketIO } from '../services/socketRegistry';
import { logger } from '../utils/logger';

export const messageController = {
  async sendMessage(req: Request, res: Response) {
    try {
      const { conversationId, content, type = 'text', attachments, replyTo } = req.body;
      const userId = req.headers['x-user-id'] as string;
      const userName = req.headers['x-user-name'] as string;

      const message = await Message.create({
        conversationId,
        senderId: userId,
        senderName: userName,
        content,
        type,
        attachments,
        replyTo,
        status: 'sent'
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: {
          messageId: message._id,
          content,
          senderId: userId,
          senderName: userName,
          timestamp: message.createdAt
        }
      });

  await publishToKafka('message-sent', message);
  // Broadcast to conversation room
  const io = getSocketIO();
  io?.to(conversationId).emit('new-message', message);

      res.status(201).json(message);
    } catch (error) {
      logger.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  },

  async getMessages(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      const messages = await Message.find({ 
        conversationId,
        deletedAt: null 
      })
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      res.json(messages);
    } catch (error) {
      logger.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  },

  async updateMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.headers['x-user-id'] as string;

      const message = await Message.findOneAndUpdate(
        { _id: id, senderId: userId },
        { content, editedAt: new Date() },
        { new: true }
      );

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

  await publishToKafka('message-updated', message);
  const io = getSocketIO();
  io?.to(message.conversationId.toString()).emit('message-updated', message);
      res.json(message);
    } catch (error) {
      logger.error('Error updating message:', error);
      res.status(500).json({ error: 'Failed to update message' });
    }
  },

  async deleteMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const message = await Message.findOneAndUpdate(
        { _id: id, senderId: userId },
        { deletedAt: new Date() },
        { new: true }
      );

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

  await publishToKafka('message-deleted', { messageId: id });
  const io = getSocketIO();
  io?.to(message.conversationId.toString()).emit('message-deleted', { messageId: id });
      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      logger.error('Error deleting message:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  }
};
