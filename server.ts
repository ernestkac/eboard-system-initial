import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import apiRoutes from './backend/src/routes/index.js';
import { errorHandler } from './backend/src/middleware/errorHandler.js';
import { testConnection } from './backend/src/config/database.js';
import { logger } from './backend/src/utils/logger.js';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // Basic CORS & Parser middlewares
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logger in dev
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      logger.debug(`${req.method} ${req.originalUrl}`);
    }
    next();
  });

  // Check database status
  testConnection().then((status) => {
    if (!status.connected) {
      logger.warn(`MySQL alert: ${status.error}. Ensure MySQL service is running.`);
    } else {
      logger.info('Successfully connected to MySQL database.');
    }
  });

  // Mount backend REST API routes under /api
  app.use('/api', apiRoutes);

  // Vite middleware for frontend / API explorer
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Centralized Error Handler for API routes
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`=======================================================`);
    logger.info(`ADMARC Limited eBoard REST API Server running`);
    logger.info(`Listening on http://0.0.0.0:${PORT}`);
    logger.info(`Health check: http://0.0.0.0:${PORT}/api/health`);
    logger.info(`=======================================================`);
  });
}

startServer();
