import { db } from '../config/database.js';
import { searchCatalog, fetchProductMetadata } from '../services/catalog.service.js';

export const productsController = {
  // GET /api/products/search?q=
  async search(req, res, next) {
    try {
      const query = req.query.q || '';
      const results = await searchCatalog(query);
      res.json({
        success: true,
        data: results
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/tracked-products
  async getTracked(req, res, next) {
    try {
      const products = await db.getTrackedProducts();
      res.json({
        success: true,
        data: products
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/tracked-products/:id
  async getTrackedById(req, res, next) {
    try {
      const { id } = req.params;
      const product = await db.getTrackedProductById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Tracked product with ID ${id} not found`
          }
        });
      }
      res.json({
        success: true,
        data: product
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/tracked-products
  async addTracked(req, res, next) {
    try {
      const { external_product_id, product_name, product_url, category, sku, image_url } = req.body;

      if (!external_product_id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Field "external_product_id" is required'
          }
        });
      }

      // If name or url not provided in body, fetch verified details from INE mock store product API
      let name = product_name;
      let url = product_url || `https://demo.inelabteamdev.com/product/${external_product_id}`;
      let cat = category;
      let productSku = sku;

      if (!name) {
        const metadata = await fetchProductMetadata(external_product_id);
        if (!metadata) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'PRODUCT_NOT_FOUND',
              message: `Product with ID ${external_product_id} does not exist in INE Store`
            }
          });
        }
        name = metadata.name;
        cat = cat || metadata.category;
        productSku = productSku || metadata.sku;
      }

      const created = await db.addTrackedProduct({
        external_product_id,
        product_name: name,
        product_url: url,
        category: cat,
        sku: productSku,
        image_url: image_url || null,
        tracking_enabled: true
      });

      res.status(201).json({
        success: true,
        data: created
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/tracked-products/:id
  async deleteTracked(req, res, next) {
    try {
      const { id } = req.params;
      const success = await db.deleteTrackedProduct(id);
      if (!success) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Tracked product with ID ${id} not found`
          }
        });
      }
      res.json({
        success: true,
        message: 'Product removed from tracking'
      });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/tracked-products/:id
  async toggleTracking(req, res, next) {
    try {
      const { id } = req.params;
      const { tracking_enabled } = req.body;
      if (tracking_enabled === undefined) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Field "tracking_enabled" (boolean) is required'
          }
        });
      }

      const updated = await db.updateTrackedProduct(id, { tracking_enabled: Boolean(tracking_enabled) });
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Tracked product with ID ${id} not found`
          }
        });
      }

      res.json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/tracked-products/:id/history
  async getHistory(req, res, next) {
    try {
      const { id } = req.params;
      const history = await db.getPriceHistory(id);
      res.json({
        success: true,
        data: history
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/tracked-products/:id/logs
  async getLogs(req, res, next) {
    try {
      const { id } = req.params;
      const logs = await db.getScrapeLogs(id);
      res.json({
        success: true,
        data: logs
      });
    } catch (err) {
      next(err);
    }
  }
};
