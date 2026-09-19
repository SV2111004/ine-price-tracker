import { Router } from 'express';
import { productsController } from '../controllers/products.controller.js';
import { scrapeController } from '../controllers/scrape.controller.js';

const router = Router();

// Search INE mock store catalog
router.get('/products/search', productsController.search);

// Tracked products CRUD
router.get('/tracked-products', productsController.getTracked);
router.post('/tracked-products', productsController.addTracked);
router.get('/tracked-products/:id', productsController.getTrackedById);
router.delete('/tracked-products/:id', productsController.deleteTracked);
router.patch('/tracked-products/:id', productsController.toggleTracking);

// History, logs, and manual scrape
router.get('/tracked-products/:id/history', productsController.getHistory);
router.get('/tracked-products/:id/logs', productsController.getLogs);
router.post('/tracked-products/:id/scrape', scrapeController.scrapeSingle);

export default router;
