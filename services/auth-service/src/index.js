import dotenv from 'dotenv';
import { initializeConfig } from './config/secrets.js';
import logger from './config/logger.js';

// Load initial .env file
dotenv.config();

async function startServer() {
  try {
    // 1. Fetch dynamic config / secrets from Vault if available
    await initializeConfig();

    // 2. Import app after config has been finalized
    const { default: app } = await import('./app.js');

    const port = process.env.PORT || 4001;
    app.listen(port, () => {
      logger.info(`Auth Service successfully initialized and listening on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start Auth Service', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();
