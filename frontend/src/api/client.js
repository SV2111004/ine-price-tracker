const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    const errorMsg = data?.error?.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.code = data?.error?.code;
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  getHealth() {
    return request('/health');
  },

  searchProducts(query) {
    return request(`/products/search?q=${encodeURIComponent(query || '')}`);
  },

  getTrackedProducts() {
    return request('/tracked-products');
  },

  addTrackedProduct(product) {
    return request('/tracked-products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  deleteTrackedProduct(id) {
    return request(`/tracked-products/${id}`, {
      method: 'DELETE',
    });
  },

  toggleTracking(id, tracking_enabled) {
    return request(`/tracked-products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ tracking_enabled }),
    });
  },

  getTrackedProduct(id) {
    return request(`/tracked-products/${id}`);
  },

  getProductHistory(id) {
    return request(`/tracked-products/${id}/history`);
  },

  getProductLogs(id) {
    return request(`/tracked-products/${id}/logs`);
  },

  scrapeProduct(id, options = {}) {
    const query = options.headed ? '?headed=true' : '';
    // Supports /tracked-products/:id/scrape or /scrape/product/:id
    return request(`/tracked-products/${id}/scrape${query}`, {
      method: 'POST',
    });
  },

  triggerBatchScrape(secret) {
    const token = secret || import.meta.env.VITE_CRON_SECRET || '';
    return request('/scrape/all', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }
};
