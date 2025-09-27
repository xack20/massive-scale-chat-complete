import { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';

export function usePresence() {
	const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

	useEffect(() => {
		const socket = getSocket();
		if (!socket) return;

		const handlePresence = (users: string[]) => setOnlineUsers(users);
		socket.on('presence:update', handlePresence);
		socket.emit('presence:subscribe');
		return () => {
			socket.off('presence:update', handlePresence);
		};
	}, []);

	return { onlineUsers };
}
