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

    async getUserConversations(req: Request, res: Response) {
      try {
        const userId = req.headers['x-user-id'] as string;
        const { page = 1, limit = 20 } = req.query;

        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        logger.info('Fetching conversations for user', { userId });

        const conversations = await Conversation.find({
          'participants.userId': userId,
          isArchived: false
        })
          .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 })
          .limit(Number(limit))
          .skip((Number(page) - 1) * Number(limit))
          .lean();

        // Get only conversations where the user has had messages
        const conversationsWithMessages = [];
        for (const conv of conversations) {
          const messageCount = await Message.countDocuments({
            conversationId: conv._id,
            deletedAt: null
          });
        
          if (messageCount > 0) {
            // Get the other participant for direct conversations
            if (conv.type === 'direct') {
              const otherParticipant = conv.participants.find(p => p.userId !== userId);
              if (otherParticipant) {
                // Fetch real user data from user service if the participant name looks like a placeholder
                let participantName = otherParticipant.userName;
                if (participantName && (participantName.startsWith('User-') || participantName.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'))) {
                  try {
                    // Try to fetch user data from user service
                    const userResponse = await fetch(`http://api-gateway:3000/api/users/${otherParticipant.userId}`, {
                      headers: {
                        'Authorization': req.headers.authorization || '',
                        'x-user-id': userId
                      }
                    });
                    if (userResponse.ok) {
                      const userData = await userResponse.json() as { fullName?: string; username?: string; email?: string };
                      participantName = userData.fullName || userData.username || userData.email || participantName;
                    }
                  } catch (error: any) {
                    logger.warn('Failed to fetch user data for participant', { participantId: otherParticipant.userId, error: error?.message || 'Unknown error' });
                  }
                }
                
                conversationsWithMessages.push({
                  ...conv,
                  id: conv._id.toString(), // Ensure id field is present
                  otherParticipant: {
                    userId: otherParticipant.userId,
                    userName: participantName,
                    userAvatar: otherParticipant.userAvatar
                  },
                  messageCount
                });
              }
            } else {
              conversationsWithMessages.push({
                ...conv,
                id: conv._id.toString(), // Ensure id field is present
                messageCount
              });
            }
          }
        }

        logger.info('Returning conversations', { count: conversationsWithMessages.length, conversationIds: conversationsWithMessages.map(c => c.id) });

        res.json({
          conversations: conversationsWithMessages,
          total: conversationsWithMessages.length
        });
      } catch (error: any) {
        logger.error('Error fetching user conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
      }
    },

    async createDirectConversation(req: Request, res: Response) {
      try {
      const { participantId, participantName } = req.body;
      const currentUserId = req.headers['x-user-id'] as string;
      const currentUserName = req.headers['x-user-name'] as string;

      logger.info('Creating direct conversation', { currentUserId, participantId, currentUserName, participantName });

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

      // Create new conversation with proper user names
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
            userName: participantName || `User-${participantId.slice(0, 8)}`, // Use provided name or short fallback
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
