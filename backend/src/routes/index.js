import { Router } from 'express';
import healthRoutes from './health.routes.js';
import productsRoutes from './products.routes.js';
import scrapeRoutes from './scrape.routes.js';

const router = Router();

router.use('/', healthRoutes);
router.use('/', productsRoutes);
router.use('/', scrapeRoutes);

export default router;
