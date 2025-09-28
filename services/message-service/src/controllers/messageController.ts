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
        .sort({ createdAt: 1 })
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
  },

  async createDirectConversation(req: Request, res: Response) {
    try {
      const { participantId } = req.body;
      const currentUserId = req.headers['x-user-id'] as string;
      const currentUserName = req.headers['x-user-name'] as string;

      logger.info('Creating direct conversation', { currentUserId, participantId, currentUserName });

      if (!participantId) {
        return res.status(400).json({ error: 'participantId is required' });
      }

      if (participantId === currentUserId) {
        return res.status(400).json({ error: 'Cannot create conversation with yourself' });
      }

      // Check if direct conversation already exists between these two users
      const participantIds = [currentUserId, participantId].sort();
      const existingConversation = await Conversation.findOne({
        type: 'direct',
        'participants.userId': { $all: participantIds },
        'participants.2': { $exists: false } // Ensures exactly 2 participants
      }).lean().maxTimeMS(5000);

      if (existingConversation) {
        logger.info('Found existing conversation', { conversationId: existingConversation._id });
        return res.json(existingConversation);
      }

      // Create new conversation
      const conversation = await Conversation.create({
        type: 'direct',
        participants: [
          {
            userId: currentUserId,
            userName: currentUserName,
            role: 'member',
            joinedAt: new Date(),
            isActive: true
          },
          {
            userId: participantId,
            userName: `User-${participantId}`, // This should be fetched from user service
            role: 'member',
            joinedAt: new Date(),
            isActive: true
          }
        ],
        createdBy: currentUserId,
        isArchived: false
      });

      logger.info('Created new conversation', { conversationId: conversation._id });
      res.status(201).json(conversation);
    } catch (error: any) {
      logger.error('Error creating direct conversation:', error);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  }
};
