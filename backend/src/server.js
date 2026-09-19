import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const app = express();

// Security and middleware
app.use(cors({
  origin: '*', // Allow frontend dev server and deployed origins
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-secret']
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Mount API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  logger.info(`====================================================`);
  logger.info(`INE Price Tracker Backend listening on port ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`API Health: http://localhost:${config.port}/api/health`);
  logger.info(`====================================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

export default app;
