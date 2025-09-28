import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let presenceSocket: Socket | null = null;

interface InitOptions {
  presence?: boolean; // whether to also connect a presence socket
}

const resolveUrl = (env: Record<string, string | undefined>, keyCandidates: string[], fallback: string) => {
  for (const key of keyCandidates) {
    const val = env[key];
    if (val) return val;
  }
  return fallback;
};

export const initSocket = (token: string, opts: InitOptions = {}) => {
  const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

  // Prefer gateway (port 3000) so path /socket.io is proxied to message-service
  const primaryUrl = resolveUrl(runtimeEnv, [
    'NEXT_PUBLIC_GATEWAY_WS_URL',
    'NEXT_PUBLIC_API_WS_URL',
    'NEXT_PUBLIC_WS_URL'
  ], 'http://localhost:3000');

  console.log('[socket] Connecting primary to:', primaryUrl);
  socket = io(primaryUrl, {
    auth: { token },
    path: '/socket.io',
    transports: ['websocket'],
    timeout: 15000
  });

  socket.on('connect', () => console.log('[socket] connected', socket?.id));
  socket.on('disconnect', (reason) => console.log('[socket] disconnected', reason));
  socket.on('connect_error', (err) => console.error('[socket] connect_error', err.message));

  if (opts.presence) {
    const presenceUrl = resolveUrl(runtimeEnv, [
      'NEXT_PUBLIC_PRESENCE_WS_URL'
    ], 'http://localhost:3005');
    console.log('[presence] Connecting to:', presenceUrl);
    presenceSocket = io(presenceUrl, {
      transports: ['websocket'],
      timeout: 10000
    });
    presenceSocket.on('connect_error', (e) => console.error('[presence] connect_error', e.message));
  }

  return socket;
};

export const getSocket = () => socket;
export const getPresenceSocket = () => presenceSocket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  if (presenceSocket) {
    presenceSocket.disconnect();
    presenceSocket = null;
  }
};
