import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { initializeConfig } from './config/secrets.js';
import { getPrismaClient } from './config/prisma-client.js';
import logger from './config/logger.js';

dotenv.config();

async function main() {
  await initializeConfig();
  const prisma = getPrismaClient();

  logger.info('Starting database seeding...');

  // 1. Seed Users
  const salt = await bcrypt.genSalt(12);
  const defaultPassword = await bcrypt.hash('TacticalC2Secure!', salt);

  const users = [
    { name: 'General John Miller', email: 'commander@quantumdefense.mil', role: 'Commander' },
    { name: 'Captain Sarah Connor', email: 'operator@quantumdefense.mil', role: 'Operator' },
    { name: 'Specialist Alex Mercer', email: 'analyst@quantumdefense.mil', role: 'Analyst' },
    { name: 'System Administrator', email: 'admin@quantumdefense.mil', role: 'Admin' }
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password: defaultPassword,
        role: u.role
      }
    });
    logger.info(`Seeded user: ${user.email} (Role: ${user.role})`);
  }

  logger.info('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    logger.error('Error during seeding', { error: e.message });
    process.exit(1);
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    await prisma.$disconnect();
  });
