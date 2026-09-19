import { Router } from 'express';
import { scrapeController } from '../controllers/scrape.controller.js';
import { requireCronSecret } from '../middleware/auth.middleware.js';

const router = Router();

// Manual single product scrape (useful for dashboard 'Scrape Now' and debugging)
router.post('/scrape/product/:id', scrapeController.scrapeSingle);

// Scheduled batch scrape (protected by CRON_SECRET, compatible with cron-job.org)
// Supports both POST /api/scrape/all and POST /api/scrape/run
router.post('/scrape/all', requireCronSecret, scrapeController.runScheduled);
router.post('/scrape/run', requireCronSecret, scrapeController.runScheduled);

export default router;
