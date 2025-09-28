import * as jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { Conversation } from '../models/conversation';
import { Message } from '../models/message';
import { logger } from '../utils/logger';
import { publishToKafka } from './kafkaService';

// Rate limiter for socket events (per user)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_MESSAGES = 30; // 30 messages per minute per user

const checkRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_MESSAGES) {
    return false;
  }
  
  userLimit.count++;
  return true;
};

interface AuthPayload {
  sub: string; // user id
  email?: string;
  username?: string;
  name?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

const verifyToken = (token: string): AuthPayload | null => {
  try {
  // Use unified secret fallback matching api-gateway auth middleware
  const secret = process.env.JWT_SECRET || 'dev-secret';
    return jwt.verify(token, secret) as AuthPayload;
  } catch (err) {
    logger.warn(`Socket auth token invalid: ${(err as Error).message}`);
    return null;
  }
};

export const initializeSocketService = async (io: Server) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers['authorization'];
    if (!token) {
      return next(new Error('Authentication token missing'));
    }
    const normalized = typeof token === 'string' && token.startsWith('Bearer ') ? token.slice(7) : token;
    const payload = verifyToken(normalized as string);
    if (!payload) {
      return next(new Error('Invalid token'));
    }
    (socket.data as any).user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username || payload.name,
      role: payload.role
    };
    next();
  });

  io.on('connection', (socket) => {
    const user = (socket.data as any).user;
    logger.info(`Client connected: ${socket.id} user=${user?.id}`);

    socket.on('join-conversation', async (conversationId: string) => {
      if (!conversationId) return;
      
      try {
        const convo = await Conversation.findById(conversationId);
        if (!convo || !convo.participants.some(p => p.userId === user.id)) {
          return socket.emit('error', { message: 'Unauthorized to join conversation' });
        }
        
        socket.join(conversationId);
        logger.info(`Socket ${socket.id} user=${user?.id} joined conversation ${conversationId}`);
        
        // Notify other participants of user presence
        socket.to(conversationId).emit('user-joined', {
          userId: user.id,
          userName: user.username || user.email,
          conversationId,
          timestamp: new Date()
        });
        
        // Update user's last seen in conversation
        await Conversation.findOneAndUpdate(
          { _id: conversationId, 'participants.userId': user.id },
          { $set: { 'participants.$.lastSeenAt': new Date() } }
        );
      } catch (err) {
        logger.error('Error joining conversation:', err);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    socket.on('leave-conversation', async (conversationId: string) => {
      if (!conversationId) return;
      
      socket.leave(conversationId);
      logger.info(`Socket ${socket.id} user=${user?.id} left conversation ${conversationId}`);
      
      // Notify other participants of user leaving
      socket.to(conversationId).emit('user-left', {
        userId: user.id,
        userName: user.username || user.email,
        conversationId,
        timestamp: new Date()
      });
      
      // Update user's last seen in conversation
      try {
        await Conversation.findOneAndUpdate(
          { _id: conversationId, 'participants.userId': user.id },
          { $set: { 'participants.$.lastSeenAt': new Date() } }
        );
      } catch (err) {
        logger.error('Error updating last seen on leave:', err);
      }
    });

    socket.on('send-message', async (payload, callback) => {
      try {
        // Rate limiting check
        if (!checkRateLimit(user.id)) {
          return callback?.({ error: 'Rate limit exceeded. Please slow down.' });
        }
        
        const { conversationId, content, type = 'text', attachments, replyTo } = payload || {};
        if (!conversationId || !content) {
          return callback?.({ error: 'conversationId and content required' });
        }
        const convo = await Conversation.findById(conversationId);
        if (!convo) {
          return callback?.({ error: 'Conversation not found' });
        }
        // Basic participant check (if participants array contains user)
        if (!convo.participants.some(p => p.userId === user.id)) {
          return callback?.({ error: 'Not a participant of this conversation' });
        }
        const message = await Message.create({
          conversationId,
            senderId: user.id,
            senderName: user.username || user.email || 'Unknown',
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
            senderId: user.id,
            senderName: user.username || user.email || 'Unknown',
            timestamp: message.createdAt
          }
        });
        await publishToKafka('message-sent', message);
        io.to(conversationId).emit('new-message', message);
        callback?.({ ok: true, message });
      } catch (err) {
        logger.error('Socket send-message failed', err);
        callback?.({ error: 'Failed to send message' });
      }
    });

    // Edit message via socket
    socket.on('edit-message', async (payload, callback) => {
      try {
        const { messageId, content } = payload || {};
        if (!messageId || !content) {
          return callback?.({ error: 'messageId and content required' });
        }
        
        const message = await Message.findOneAndUpdate(
          { _id: messageId, senderId: user.id },
          { content, editedAt: new Date() },
          { new: true }
        );
        
        if (!message) {
          return callback?.({ error: 'Message not found or unauthorized' });
        }
        
        await publishToKafka('message-updated', message);
        io.to(message.conversationId.toString()).emit('message-updated', message);
        callback?.({ ok: true, message });
      } catch (err) {
        logger.error('Socket edit-message failed', err);
        callback?.({ error: 'Failed to edit message' });
      }
    });

    // Delete message via socket
    socket.on('delete-message', async (payload, callback) => {
      try {
        const { messageId } = payload || {};
        if (!messageId) {
          return callback?.({ error: 'messageId required' });
        }
        
        const message = await Message.findOneAndUpdate(
          { _id: messageId, senderId: user.id },
          { deletedAt: new Date() },
          { new: true }
        );
        
        if (!message) {
          return callback?.({ error: 'Message not found or unauthorized' });
        }
        
        await publishToKafka('message-deleted', { messageId });
        io.to(message.conversationId.toString()).emit('message-deleted', { messageId });
        callback?.({ ok: true });
      } catch (err) {
        logger.error('Socket delete-message failed', err);
        callback?.({ error: 'Failed to delete message' });
      }
    });

    // Mark message as read
    socket.on('mark-read', async (payload) => {
      try {
        const { messageId, conversationId } = payload || {};
        if (!messageId) return;
        
        const message = await Message.findByIdAndUpdate(
          messageId,
          { 
            $addToSet: { 
              readBy: { 
                userId: user.id, 
                readAt: new Date() 
              } 
            } 
          },
          { new: true }
        );
        
        if (message) {
          // Notify sender about read receipt
          socket.to(conversationId).emit('message-read', {
            messageId,
            readBy: user.id,
            readByName: user.username || user.email,
            readAt: new Date()
          });
        }
      } catch (err) {
        logger.error('Socket mark-read failed', err);
      }
    });

    // Typing indicator
    socket.on('typing', (payload) => {
      const { conversationId, isTyping } = payload || {};
      if (!conversationId) return;
      
      socket.to(conversationId).emit('user-typing', {
        userId: user.id,
        userName: user.username || user.email,
        conversationId,
        isTyping,
        timestamp: new Date()
      });
    });

    socket.on('disconnect', async () => {
      logger.info(`Client disconnected: ${socket.id} user=${user?.id}`);
      
      // Update last seen for all conversations user was in
      try {
        await Conversation.updateMany(
          { 'participants.userId': user.id },
          { $set: { 'participants.$.lastSeenAt': new Date() } }
        );
      } catch (err) {
        logger.error('Error updating last seen on disconnect:', err);
      }
    });
  });
};
