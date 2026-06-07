// src/server.ts
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import prisma from './config/database';
import { startScheduler } from './jobs/scheduler';

async function main() {
  // Test DB connection
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed to connect to database');
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    logger.info({
      port: env.PORT,
      env: env.NODE_ENV,
      docs: `http://localhost:${env.PORT}/api/docs`,
    }, '🚀 Meeting Intelligence Service started');
  });

  // Start cron scheduler
  startScheduler();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully...');
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Database disconnected. Bye!');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.error({ error: err.message, stack: err.stack }, 'Uncaught exception');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
    process.exit(1);
  });
}

main();
