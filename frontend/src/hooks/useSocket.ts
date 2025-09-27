import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { initSocket, getSocket, disconnectSocket } from '../lib/socket';

export const useSocket = (token?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (token) {
      const socketInstance = initSocket(token);
      
      socketInstance.on('connect', () => {
        setConnected(true);
      });

      socketInstance.on('disconnect', () => {
        setConnected(false);
      });

      setSocket(socketInstance);

      return () => {
        disconnectSocket();
      };
    }
  }, [token]);

  return { socket, connected };
};
