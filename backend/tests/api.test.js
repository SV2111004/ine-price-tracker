import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import { config } from '../src/config/env.js';

describe('Backend API Integration Tests', () => {
  let createdProductId = null;

  it('GET /api/health returns 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('ine-price-tracker-backend');
    expect(res.body.database).toBeDefined();
  });

  it('GET /api/products/search?q= returns products from INE store', async () => {
    const res = await request(app).get('/api/products/search?q=Amperage');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  }, 15000);

  it('POST /api/tracked-products adds a product to tracking', async () => {
    const payload = {
      external_product_id: '99999',
      product_name: 'Test Tracking Unit',
      product_url: 'https://demo.inelabteamdev.com/product/99999',
      category: 'Test Category',
      sku: 'TEST-SKU-999'
    };

    const res = await request(app)
      .post('/api/tracked-products')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.external_product_id).toBe('99999');
    createdProductId = res.body.data.id;
  });

  it('POST /api/tracked-products rejects duplicate external product IDs (409 Conflict)', async () => {
    const duplicatePayload = {
      external_product_id: '99999',
      product_name: 'Duplicate Test Unit',
      product_url: 'https://demo.inelabteamdev.com/product/99999'
    };

    const res = await request(app)
      .post('/api/tracked-products')
      .send(duplicatePayload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/tracked-products returns list of tracked products', async () => {
    const res = await request(app).get('/api/tracked-products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const found = res.body.data.find(p => p.external_product_id === '99999');
    expect(found).toBeDefined();
    expect(found.product_name).toBe('Test Tracking Unit');
  });

  it('GET /api/tracked-products/:id returns the individual product', async () => {
    const res = await request(app).get(`/api/tracked-products/${createdProductId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdProductId);
    expect(res.body.data.external_product_id).toBe('99999');

    const notFound = await request(app).get('/api/tracked-products/non-existent-uuid-1234');
    expect(notFound.status).toBe(404);
  });

  it('PATCH /api/tracked-products/:id toggles tracking status', async () => {
    const res = await request(app)
      .patch(`/api/tracked-products/${createdProductId}`)
      .send({ tracking_enabled: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tracking_enabled).toBe(false);
  });

  it('POST /api/scrape/run and /api/scrape/all reject unauthenticated calls (401 Unauthorized)', async () => {
    const res1 = await request(app)
      .post('/api/scrape/run')
      .send();
    expect(res1.status).toBe(401);
    expect(res1.body.success).toBe(false);
    expect(res1.body.error.code).toBe('UNAUTHORIZED');

    const res2 = await request(app)
      .post('/api/scrape/all')
      .send();
    expect(res2.status).toBe(401);
    expect(res2.body.success).toBe(false);
    expect(res2.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/scrape/all rejects invalid CRON_SECRET tokens', async () => {
    const res = await request(app)
      .post('/api/scrape/all')
      .set('Authorization', 'Bearer invalid_wrong_token')
      .send();

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /api/tracked-products/:id deletes the product', async () => {
    const res = await request(app).delete(`/api/tracked-products/${createdProductId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await request(app).get('/api/tracked-products');
    const found = check.body.data.find(p => p.id === createdProductId);
    expect(found).toBeUndefined();
  });
});
