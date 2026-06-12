import http from 'http';
import dotenv from 'dotenv';
import { initializeConfig } from './config/secrets.js';
import logger from './config/logger.js';

dotenv.config();

async function startServer() {
  try {
    await initializeConfig();

    const { default: app } = await import('./app.js');
    const { initializeSocket } = await import('./websocket/socket.js');

    const server = http.createServer(app);
    initializeSocket(server);

    const port = process.env.PORT || 4003;
    server.listen(port, () => {
      logger.info(`Threat Service successfully initialized and listening on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start Threat Service', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();
