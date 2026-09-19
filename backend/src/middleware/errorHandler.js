import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';

  if (statusCode >= 500) {
    logger.error(`API Error on ${req.method} ${req.originalUrl}: ${message}`, { stack: err.stack });
  } else {
    logger.warn(`Client Error [${statusCode}] on ${req.method} ${req.originalUrl}: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(process.env.NODE_ENV === 'development' && statusCode >= 500 ? { details: err.stack } : {})
    }
  });
}
