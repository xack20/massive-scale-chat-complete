import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { Message } from '../types';

type RawMessage = Message | (Omit<Message, 'id'> & { _id: string });

const hasMongoId = (m: unknown): m is { _id: string } => typeof (m as { _id?: unknown })?._id === 'string';
const hasId = (m: unknown): m is { id: string } => typeof (m as { id?: unknown })?.id === 'string';
const normalizeMessage = (m: RawMessage): Message => {
  if (hasMongoId(m) && !hasId(m)) {
    const clone = { ...(m as object) } as Record<string, unknown>;
    const mongoId = clone._id as string;
    delete clone._id;
    return { ...(clone as Omit<Message,'id'>), id: mongoId };
  }
  return m as Message;
};

interface ApiFetchResponse {
  messages?: RawMessage[];
  hasMore?: boolean;
}

export function useChat(conversationId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Fetch message history from API
  const fetchMessages = useCallback(async (pageNum: number = 1) => {
    if (!conversationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get<ApiFetchResponse | RawMessage[]>(`/messages/conversation/${conversationId}`, {
        params: { page: pageNum, limit: 50 }
      });
      const data = response.data as ApiFetchResponse | RawMessage[];
      const list: RawMessage[] = Array.isArray(data) ? data : (data.messages as RawMessage[] || []);
      const normalized: Message[] = list.map(normalizeMessage);
      if (pageNum === 1) {
        setMessages(normalized);
      } else {
        setMessages(prev => [...prev, ...normalized]);
      }
      const more = !Array.isArray(data) && data.hasMore ? data.hasMore : false;
      setHasMore(more);
      setPage(pageNum);
    } catch (err: unknown) {
      const axiosMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const message = axiosMsg || (err instanceof Error ? err.message : 'Failed to fetch messages');
      setError(message);
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Initial load
  useEffect(() => {
    if (conversationId) {
      fetchMessages(1);
    }
  }, [conversationId, fetchMessages]);

  // Socket listeners & room join/leave per conversation
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (conversationId) {
      socket.emit('join-conversation', conversationId);
    }

    const handleNewMessage = (message: Message) => {
      if (!conversationId || message.conversationId === conversationId) {
        setMessages(prev => [...prev, message]);
      }
    };
    const handleMessageUpdated = (message: RawMessage) => {
      const nm = normalizeMessage(message);
      const msgId = nm.id;
      setMessages(prev => prev.map(m => {
        const existing = normalizeMessage(m as RawMessage);
        return existing.id === msgId ? nm : m;
      }));
    };
    const handleMessageDeleted = (payload: { messageId: string } | string) => {
      const messageId = typeof payload === 'string' ? payload : payload.messageId;
      setMessages(prev => prev.filter(m => normalizeMessage(m as RawMessage).id !== messageId));
    };

    const handleUserJoined = (data: { userId: string; userName: string; conversationId: string }) => {
      console.log(`${data.userName} joined the conversation`);
      // Could show a system message or update UI to show user is present
    };

    const handleUserLeft = (data: { userId: string; userName: string; conversationId: string }) => {
      console.log(`${data.userName} left the conversation`);
      // Could show a system message or update UI to show user left
    };

    const handleMessageRead = (data: { messageId: string; readBy: string; readByName: string }) => {
      setMessages(prev => prev.map(m => {
        const normalized = normalizeMessage(m as RawMessage);
        if (normalized.id === data.messageId) {
          const updatedReadBy = [...(normalized.readBy || [])];
          if (!updatedReadBy.some(r => r.userId === data.readBy)) {
            updatedReadBy.push({ userId: data.readBy, readAt: new Date() });
          }
          return { ...normalized, readBy: updatedReadBy };
        }
        return m;
      }));
    };

    const handleUserTyping = (data: { userId: string; userName: string; isTyping: boolean }) => {
      // Could update UI to show typing indicators
      console.log(`${data.userName} is ${data.isTyping ? 'typing' : 'stopped typing'}`);
    };

    socket.on('new-message', handleNewMessage);
    socket.on('message-updated', handleMessageUpdated);
    socket.on('message-deleted', handleMessageDeleted);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('message-read', handleMessageRead);
    socket.on('user-typing', handleUserTyping);

    return () => {
      if (conversationId) {
        socket.emit('leave-conversation', conversationId);
      }
      socket.off('new-message', handleNewMessage);
      socket.off('message-updated', handleMessageUpdated);
      socket.off('message-deleted', handleMessageDeleted);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('message-read', handleMessageRead);
      socket.off('user-typing', handleUserTyping);
    };
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string, attachments?: unknown[]) => {
    const socket = getSocket();
    if (!socket || !conversationId) return;

    return new Promise<Message>((resolve, reject) => {
      const tempId = `temp-${Date.now()}`;
      const optimistic: Message = {
        id: tempId,
        conversationId,
        senderId: 'me',
        senderName: 'Me',
        content,
        type: attachments?.length ? 'file' : 'text',
        attachments: attachments as Message['attachments'],
        status: 'sending',
        createdAt: new Date()
      } as Message;
      setMessages(prev => [...prev, optimistic]);
      socket.emit('send-message', { conversationId, content, attachments, type: optimistic.type }, (resp: { error?: string; message?: RawMessage } ) => {
        if (resp && resp.error) {
          setError(resp.error);
          // Mark optimistic message failed
          setMessages(prev => prev.map(m => (m.id === tempId ? { ...m, status: 'failed' } : m)));
          return reject(new Error(resp.error));
        }
        if (!resp || !resp.message) {
          setError('No response from server');
          setMessages(prev => prev.map(m => (m.id === tempId ? { ...m, status: 'failed' } : m)));
          return reject(new Error('No response'));
        }
        const real = normalizeMessage(resp.message);
        setMessages(prev => prev.map(m => (m.id === tempId ? real : m)));
        resolve(real);
      });
    });
  }, [conversationId]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchMessages(page + 1);
    }
  }, [loading, hasMore, page, fetchMessages]);

  const deleteMessage = useCallback(async (messageId: string) => {
    const socket = getSocket();
    if (socket) {
      // Use socket for immediate response
      return new Promise<void>((resolve, reject) => {
        socket.emit('delete-message', { messageId }, (resp: { error?: string; ok?: boolean }) => {
          if (resp?.error) {
            setError(resp.error);
            return reject(new Error(resp.error));
          }
          resolve();
        });
      });
    } else {
      // Fallback to REST API
      try {
        await api.delete(`/messages/${messageId}`);
      } catch (err: unknown) {
        const axiosMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        const message = axiosMsg || (err instanceof Error ? err.message : 'Failed to delete message');
        setError(message);
        throw err;
      }
    }
  }, []);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    const socket = getSocket();
    if (socket) {
      // Use socket for immediate response
      return new Promise<Message>((resolve, reject) => {
        socket.emit('edit-message', { messageId, content }, (resp: { error?: string; message?: RawMessage; ok?: boolean }) => {
          if (resp?.error) {
            setError(resp.error);
            return reject(new Error(resp.error));
          }
          if (!resp?.message) {
            setError('No response from server');
            return reject(new Error('No response'));
          }
          const normalized = normalizeMessage(resp.message);
          resolve(normalized);
        });
      });
    } else {
      // Fallback to REST API
      try {
        const response = await api.put(`/messages/${messageId}`, { content });
        return response.data;
      } catch (err: unknown) {
        const axiosMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        const message = axiosMsg || (err instanceof Error ? err.message : 'Failed to edit message');
        setError(message);
        throw err;
      }
    }
  }, []);

  const markMessageRead = useCallback((messageId: string) => {
    const socket = getSocket();
    if (socket && conversationId) {
      socket.emit('mark-read', { messageId, conversationId });
    }
  }, [conversationId]);

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    const socket = getSocket();
    if (socket && conversationId) {
      socket.emit('typing', { conversationId, isTyping });
    }
  }, [conversationId]);

  return {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    loadMore,
    deleteMessage,
    editMessage,
    markMessageRead,
    sendTypingIndicator,
    refetch: () => fetchMessages(1)
  };
}
