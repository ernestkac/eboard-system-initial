import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { testConnection } from './config/database.js';
import { logger } from './utils/logger.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

async function startServer() {
  try {
    // Check database connection status on boot
    const dbStatus = await testConnection();
    if (!dbStatus.connected) {
      logger.warn(`Database connection alert: ${dbStatus.error}. Ensure MySQL is running with parameters in .env`);
    }

    const server = app.listen(PORT, HOST, () => {
      logger.info(`=======================================================`);
      logger.info(`ADMARC Limited eBoard REST API Server running`);
      logger.info(`URL: http://${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://${HOST}:${PORT}/api/health`);
      logger.info(`=======================================================`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}. Shutting down server gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    logger.error('Failed to start eBoard server:', error);
    process.exit(1);
  }
}

// Start if executed directly
startServer();

export default app;
