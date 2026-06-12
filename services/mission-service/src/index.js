import dotenv from 'dotenv';
import { initializeConfig } from './config/secrets.js';
import logger from './config/logger.js';

dotenv.config();

async function startServer() {
  try {
    await initializeConfig();

    const { default: app } = await import('./app.js');

    const port = process.env.PORT || 4004;
    app.listen(port, () => {
      logger.info(`Mission Service successfully initialized and listening on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start Mission Service', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();
