import { config } from '../config/env.js';

/**
 * Validates that the request contains the authorized CRON_SECRET.
 * Supports:
 * - Authorization: Bearer <CRON_SECRET>
 * - x-cron-secret: <CRON_SECRET>
 */
export function requireCronSecret(req, res, next) {
  const authHeader = req.headers.authorization;
  let providedSecret = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedSecret = authHeader.substring(7).trim();
  } else if (req.headers['x-cron-secret']) {
    providedSecret = req.headers['x-cron-secret'].trim();
  }

  if (!providedSecret || providedSecret !== config.cronSecret) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing CRON_SECRET authorization token'
      }
    });
  }

  next();
}
