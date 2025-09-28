import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export const registerSocketIO = (io: Server) => {
  ioInstance = io;
};

export const getSocketIO = (): Server | null => ioInstance;
