import { trackerService } from '../services/tracker.service.js';
import { db } from '../config/database.js';

export const scrapeController = {
  // POST /api/scrape/product/:id (Manual single-product scrape)
  async scrapeSingle(req, res, next) {
    try {
      const { id } = req.params;
      const product = await db.getTrackedProductById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Tracked product with ID "${id}" not found`
          }
        });
      }

      // Check if client requested headed mode
      const headed = req.query.headed === 'true';

      const result = await trackerService.scrapeProduct(product, { headed });

      res.json({
        success: result.success,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/scrape/run (Scheduled batch scrape triggered by cron-job.org)
  async runScheduled(req, res, next) {
    try {
      const summary = await trackerService.runBatchScrape();
      res.json({
        success: true,
        data: summary
      });
    } catch (err) {
      next(err);
    }
  }
};
