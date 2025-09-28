import { useCallback, useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';
import { api } from '../lib/api';
import { Message } from '../types';

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
      const response = await api.get(`/messages/conversation/${conversationId}`, {
        params: { page: pageNum, limit: 50 }
      });
      
      if (pageNum === 1) {
        setMessages(response.data.messages || response.data || []);
      } else {
        setMessages(prev => [...prev, ...(response.data.messages || response.data || [])]);
      }
      
      setHasMore(response.data.hasMore || false);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch messages');
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

  // Socket listeners for real-time messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      if (!conversationId || message.conversationId === conversationId) {
        setMessages(prev => [...prev, message]);
      }
    };

    const handleMessageUpdated = (message: Message) => {
      setMessages(prev => prev.map(m => 
        m.id === message.id ? message : m
      ));
    };

    const handleMessageDeleted = (messageId: string) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    };

    socket.on('new-message', handleNewMessage);
    socket.on('message-updated', handleMessageUpdated);
    socket.on('message-deleted', handleMessageDeleted);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('message-updated', handleMessageUpdated);
      socket.off('message-deleted', handleMessageDeleted);
    };
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string, attachments?: any[]) => {
    const socket = getSocket();
    if (!socket || !conversationId) return;

    try {
      // Send via API for persistence
      const response = await api.post('/messages', {
        conversationId,
        content,
        attachments,
        type: attachments?.length ? 'file' : 'text'
      });

      // Emit to socket for real-time delivery
      socket.emit('send-message', response.data);
      
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
      throw err;
    }
  }, [conversationId]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchMessages(page + 1);
    }
  }, [loading, hasMore, page, fetchMessages]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await api.delete(`/messages/${messageId}`);
      const socket = getSocket();
      socket?.emit('delete-message', { messageId, conversationId });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete message');
      throw err;
    }
  }, [conversationId]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    try {
      const response = await api.put(`/messages/${messageId}`, { content });
      const socket = getSocket();
      socket?.emit('edit-message', response.data);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to edit message');
      throw err;
    }
  }, []);

  return {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    loadMore,
    deleteMessage,
    editMessage,
    refetch: () => fetchMessages(1)
  };
}
