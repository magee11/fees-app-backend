const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDB } = require('./config/db');

async function start() {
  await connectDB();

  const server = app.listen(env.port, () => {
    logger.info(`FeeFlow API running on port ${env.port} [${env.nodeEnv}]`);
    logger.info(`Swagger docs available at http://localhost:${env.port}/api-docs`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.stack || error.message}`);
    process.exit(1);
  });
}

start();
