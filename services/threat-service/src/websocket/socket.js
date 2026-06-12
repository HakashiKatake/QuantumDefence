import { Server } from 'socket.io';
import logger from '../config/logger.js';

let io = null;

export function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Threat WebSocket Client Connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`Threat WebSocket Client Disconnected: ${socket.id}`);
    });
  });
}

export function broadcastEvent(event, data) {
  if (io) {
    io.emit(event, data);
    logger.info(`Broadcasted WebSocket event: ${event}`, { dataId: data.id });
  } else {
    logger.warn(`Failed to broadcast event: ${event}. socket.io not initialized.`);
  }
}
