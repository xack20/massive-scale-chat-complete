import { useCallback, useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';
import { Message } from '../types';

export function useChat(conversationId?: string) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(false);

	// Placeholder: would fetch history via REST
	useEffect(() => {
		if (conversationId) {
			setLoading(true);
			// TODO: fetch messages from API
			setLoading(false);
		}
	}, [conversationId]);

	useEffect(() => {
		const socket = getSocket();
		if (!socket) return;
		const handler = (m: Message) => {
			if (!conversationId || m.conversationId === conversationId) {
				setMessages(prev => [...prev, m]);
			}
		};
		socket.on('new-message', handler);
		return () => {
			socket.off('new-message', handler);
		};
	}, [conversationId]);

	const sendMessage = useCallback((content: string) => {
		const socket = getSocket();
		if (!socket) return;
		socket.emit('send-message', { content, conversationId });
	}, [conversationId]);

	return { messages, loading, sendMessage };
}
