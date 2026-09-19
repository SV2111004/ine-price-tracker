import { db } from '../config/database.js';
import { trackerService } from '../services/tracker.service.js';

export const healthController = {
  getHealth(req, res) {
    res.json({
      status: 'ok',
      service: 'ine-price-tracker-backend',
      timestamp: new Date().toISOString(),
      database: {
        engine: db.isSupabase() ? 'Supabase PostgreSQL' : 'Local Atomic File Store (Dev Fallback)',
        isSupabase: db.isSupabase()
      },
      scraper: {
        isBatchRunning: trackerService.isBatchRunning()
      }
    });
  }
};
