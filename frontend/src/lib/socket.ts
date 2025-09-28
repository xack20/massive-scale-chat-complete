import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (token: string) => {
  const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  
  // Try multiple potential ports for the message service
  const WS_URL = runtimeEnv.NEXT_PUBLIC_MESSAGE_SERVICE_URL || 
                 runtimeEnv.NEXT_PUBLIC_WS_URL || 
                 'http://localhost:3001';
  
  console.log('Connecting socket to:', WS_URL);
  
  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    timeout: 10000,
    retries: 3
  });

  socket.on('connect', () => {
    console.log('Socket connected to:', WS_URL);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
