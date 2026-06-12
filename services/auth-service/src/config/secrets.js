import vault from 'node-vault';
import logger from './logger.js';

const vaultAddr = process.env.VAULT_ADDR;
const vaultToken = process.env.VAULT_TOKEN;

let client = null;
if (vaultAddr && vaultToken) {
  client = vault({ endpoint: vaultAddr, token: vaultToken });
}

export async function getSecret(path) {
  if (!client) {
    logger.info(`Vault client not configured. Falling back to environment variables for path: ${path}`);
    return null;
  }

  try {
    const response = await client.read(path);
    logger.info(`Successfully fetched secret from Vault path: ${path}`);
    return response.data.data;
  } catch (error) {
    logger.warn(`Failed to read secret from Vault path: ${path}. Falling back to env variables. Error: ${error.message}`);
    return null;
  }
}

export async function initializeConfig() {
  const dbSecret = await getSecret('secret/data/quantum-defense/postgres');
  const jwtSecretObj = await getSecret('secret/data/quantum-defense/jwt');

  const databaseUrl = dbSecret 
    ? `postgresql://${dbSecret.username}:${dbSecret.password}@${dbSecret.host}:5432/${dbSecret.database}?schema=auth`
    : process.env.DATABASE_URL;

  const jwtSecret = jwtSecretObj 
    ? jwtSecretObj.secret 
    : process.env.JWT_SECRET || 'c2-top-secret-signing-key';

  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = jwtSecret;
  
  logger.info('Environment variables configuration completed.');
}
