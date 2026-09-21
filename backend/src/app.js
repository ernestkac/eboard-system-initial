import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Standard JSON request body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// Root API information route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to ADMARC Limited Executive Board Management System (eBoard) REST API',
    documentation: '/api/health',
    version: '1.0.0'
  });
});

// Mount modular API routes under /api
app.use('/api', routes);

// 404 Route Not Found handler
app.use(notFoundHandler);

// Centralized Express error handler
app.use(errorHandler);

export default app;
