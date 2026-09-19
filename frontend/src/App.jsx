import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.jsx';
import { ProductSearch } from './components/ProductSearch.jsx';
import { TrackedProductsList } from './components/TrackedProductsList.jsx';
import { ProductDetailModal } from './components/ProductDetailModal.jsx';
import { api } from './api/client.js';
import { AlertCircle, ShieldAlert, Sparkles, Server } from 'lucide-react';

export function App() {
  const [health, setHealth] = useState(null);
  const [trackedProducts, setTrackedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [scrapingIds, setScrapingIds] = useState(new Set());

  // Load initial health and tracked products
  const loadData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    setError(null);
    try {
      const [healthData, productsData] = await Promise.all([
        api.getHealth().catch(err => ({ status: 'error', message: err.message })),
        api.getTrackedProducts()
      ]);
      setHealth(healthData);
      setTrackedProducts(productsData.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProductTracked = (newExternalId) => {
    loadData(true);
  };

  const handleScrapeSingle = async (productId) => {
    setScrapingIds((prev) => new Set(prev).add(productId));
    try {
      await api.scrapeProduct(productId);
      await loadData(true);
      // If modal is open for this product, refresh it as well
      if (selectedProduct && selectedProduct.id === productId) {
        const updated = await api.getTrackedProducts();
        const found = (updated.data || []).find(p => p.id === productId);
        if (found) setSelectedProduct(found);
      }
    } catch (err) {
      alert(`Scrape attempt finished: ${err.message}`);
      await loadData(true);
    } finally {
      setScrapingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleToggleTracking = async (productId, enabled) => {
    try {
      await api.toggleTracking(productId, enabled);
      await loadData(true);
    } catch (err) {
      alert(`Failed to update tracking: ${err.message}`);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to stop tracking and delete this product? All scrape logs will be removed.')) {
      return;
    }
    try {
      await api.deleteTrackedProduct(productId);
      if (selectedProduct?.id === productId) {
        setSelectedProduct(null);
      }
      await loadData(true);
    } catch (err) {
      alert(`Failed to delete product: ${err.message}`);
    }
  };

  const trackedIds = new Set(trackedProducts.map((p) => String(p.external_product_id)));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        health={health}
        onRefreshAll={() => loadData(false)}
        isRefreshing={isRefreshing}
      />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 flex-1 space-y-8">
        {/* Banner: Integrity & Mock Store Boundary */}


        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <strong>Connection Error:</strong> {error}. Ensure the backend server is running on port 4000.
            </div>
          </div>
        )}

        {/* Search and Discovery Section */}
        <ProductSearch
          trackedIds={trackedIds}
          onProductTracked={handleProductTracked}
        />

        {/* Tracked Products Table */}
        <TrackedProductsList
          products={trackedProducts}
          onSelectProduct={setSelectedProduct}
          onScrapeSingle={handleScrapeSingle}
          onToggleTracking={handleToggleTracking}
          onDeleteProduct={handleDeleteProduct}
          scrapingIds={scrapingIds}
        />
      </main>

      {/* Product Details Modal (History Chart & Scrape Logs) */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onScrapeSingle={handleScrapeSingle}
          isScraping={scrapingIds.has(selectedProduct.id)}
        />
      )}

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        INE Software Engineer Intern Assignment — Product Price Tracker monorepo
      </footer>
    </div>
  );
}

export default App;
