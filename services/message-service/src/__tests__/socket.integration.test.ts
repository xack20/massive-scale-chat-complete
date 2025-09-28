import * as jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { io as Client, Socket } from 'socket.io-client';
import { Conversation } from '../models/conversation';

// NOTE: Assumes message service is running locally on default port 3002 for tests.
// You may adjust via MESSAGE_SERVICE_PORT env if needed.

const SERVICE_URL = process.env.MESSAGE_SERVICE_URL || 'http://localhost:3002';
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// Helper to create auth token
function createToken(user: { id: string; email: string; username?: string }) {
  return jwt.sign({ sub: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Socket.IO message flow', () => {
  let socket: Socket;
  const user = { id: 'u-test-1', email: 'u@test.com', username: 'utest' };
  let conversationId: string;

  beforeAll(async () => {
    // Direct mongoose connection (same DB URL assumption) to seed conversation
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/chatdb';
    await mongoose.connect(mongoUrl);
    const conversation = await Conversation.create({
      type: 'direct',
      participants: [{ userId: user.id, userName: user.username || 'User', isActive: true, role: 'member', joinedAt: new Date() }],
      createdBy: user.id,
      isArchived: false
    } as any);
    conversationId = conversation._id.toString();

    const token = createToken(user);
    socket = Client(SERVICE_URL, { auth: { token } });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket connect timeout')), 5000);
      socket.on('connect', () => { clearTimeout(timer); resolve(); });
      socket.on('connect_error', err => { clearTimeout(timer); reject(err); });
    });
  });

  afterAll(async () => {
    socket.disconnect();
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test('should join conversation and send/receive message', async () => {
    socket.emit('join-conversation', conversationId);
    const content = 'Hello over socket';

    const received = new Promise<any>((resolve) => {
      socket.on('new-message', (msg) => {
        if (msg.conversationId === conversationId && msg.content === content) {
          resolve(msg);
        }
      });
    });

    const ack = await new Promise<any>((resolve) => {
      socket.emit('send-message', { conversationId, content }, (resp: any) => resolve(resp));
    });

    expect(ack).toBeDefined();
    expect(ack.ok).toBe(true);
    expect(ack.message).toBeDefined();
    expect(ack.message.content).toBe(content);

    const broadcast = await Promise.race([
      received,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Did not receive broadcast')), 5000))
    ]);

    expect(broadcast).toBeDefined();
    expect(broadcast.content).toBe(content);
  });

  test('should edit message via socket', async () => {
    // First send a message
    const originalContent = 'Original message';
    const editedContent = 'Edited message';

    const sendAck = await new Promise<any>((resolve) => {
      socket.emit('send-message', { conversationId, content: originalContent }, (resp: any) => resolve(resp));
    });
    const messageId = sendAck.message._id;

    // Listen for message update
    const updateReceived = new Promise<any>((resolve) => {
      socket.on('message-updated', (msg) => {
        if (msg._id === messageId && msg.content === editedContent) {
          resolve(msg);
        }
      });
    });

    // Edit the message
    const editAck = await new Promise<any>((resolve) => {
      socket.emit('edit-message', { messageId, content: editedContent }, (resp: any) => resolve(resp));
    });

    expect(editAck.ok).toBe(true);
    expect(editAck.message.content).toBe(editedContent);

    const updateBroadcast = await Promise.race([
      updateReceived,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Did not receive update broadcast')), 5000))
    ]);

    expect(updateBroadcast.content).toBe(editedContent);
    expect(updateBroadcast.editedAt).toBeDefined();
  });

  test('should delete message via socket', async () => {
    // First send a message
    const content = 'Message to delete';

    const sendAck = await new Promise<any>((resolve) => {
      socket.emit('send-message', { conversationId, content }, (resp: any) => resolve(resp));
    });
    const messageId = sendAck.message._id;

    // Listen for message deletion
    const deleteReceived = new Promise<any>((resolve) => {
      socket.on('message-deleted', (payload) => {
        if (payload.messageId === messageId) {
          resolve(payload);
        }
      });
    });

    // Delete the message
    const deleteAck = await new Promise<any>((resolve) => {
      socket.emit('delete-message', { messageId }, (resp: any) => resolve(resp));
    });

    expect(deleteAck.ok).toBe(true);

    const deleteBroadcast = await Promise.race([
      deleteReceived,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Did not receive delete broadcast')), 5000))
    ]);

    expect(deleteBroadcast.messageId).toBe(messageId);
  });

  test('should handle rate limiting', async () => {
    const promises: Promise<any>[] = [];
    
    // Try to send 35 messages rapidly (above the 30 message limit)
    for (let i = 0; i < 35; i++) {
      promises.push(
        new Promise<any>((resolve) => {
          socket.emit('send-message', { conversationId, content: `Message ${i}` }, (resp: any) => resolve(resp));
        })
      );
    }

    const results = await Promise.all(promises);
    
    // Should have some successful and some rate-limited responses
    const successful = results.filter(r => r.ok);
    const rateLimited = results.filter(r => r.error && r.error.includes('Rate limit exceeded'));
    
    expect(successful.length).toBeGreaterThan(0);
    expect(rateLimited.length).toBeGreaterThan(0);
    expect(successful.length + rateLimited.length).toBe(35);
  });

  test('should handle presence notifications', async () => {
    // Create second socket connection
    const user2 = { id: 'u-test-2', email: 'u2@test.com', username: 'utest2' };
    const token2 = createToken(user2);
    const socket2 = Client(SERVICE_URL, { auth: { token: token2 } });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket2 connect timeout')), 5000);
      socket2.on('connect', () => { clearTimeout(timer); resolve(); });
      socket2.on('connect_error', err => { clearTimeout(timer); reject(err); });
    });

    // Add second user to conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      $push: {
        participants: { userId: user2.id, userName: user2.username, isActive: true, role: 'member', joinedAt: new Date() }
      }
    });

    // Listen for user joined event on first socket
    const userJoined = new Promise<any>((resolve) => {
      socket.on('user-joined', (data) => {
        if (data.userId === user2.id) {
          resolve(data);
        }
      });
    });

    // Second user joins conversation
    socket2.emit('join-conversation', conversationId);

    const joinEvent = await Promise.race([
      userJoined,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Did not receive join event')), 5000))
    ]);

    expect(joinEvent.userId).toBe(user2.id);
    expect(joinEvent.userName).toBe(user2.username);

    socket2.disconnect();
  });

  test('should handle typing indicators', async () => {
    const typingReceived = new Promise<any>((resolve) => {
      socket.on('user-typing', (data) => {
        if (data.userId === user.id && data.isTyping === true) {
          resolve(data);
        }
      });
    });

    // Emit typing indicator
    socket.emit('typing', { conversationId, isTyping: true });

    const typingEvent = await Promise.race([
      typingReceived,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Did not receive typing event')), 3000))
    ]);

    expect(typingEvent.isTyping).toBe(true);
    expect(typingEvent.userId).toBe(user.id);
  });
});
