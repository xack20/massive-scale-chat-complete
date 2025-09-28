import { useEffect, useState } from 'react';
import { getPresenceSocket } from '../lib/socket';

interface PresenceUpdate {
	userId?: string;
	status?: 'online' | 'offline' | string;
}

export function usePresence() {
	const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

	useEffect(() => {
		const socket = getPresenceSocket();
		if (!socket) return;

		// presence-service emits individual updates { userId, status }
		// We will maintain a simple set of userIds reported online.
		const onlineSet = new Set<string>();
		const handlePresenceUpdate = (payload: PresenceUpdate) => {
			const { userId, status } = payload || {};
			if (userId && status) {
				if (status === 'online') onlineSet.add(userId); else onlineSet.delete(userId);
				setOnlineUsers(Array.from(onlineSet));
			}
		};
		socket.on('presence-update', handlePresenceUpdate);
		return () => {
			socket.off('presence-update', handlePresenceUpdate);
		};
	}, []);

	return { onlineUsers };
}
