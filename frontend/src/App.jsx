import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.jsx';
import { ProductSearch } from './components/ProductSearch.jsx';
import { PriceChart } from './components/PriceChart.jsx';
import { ScrapeLogsTable } from './components/ScrapeLogsTable.jsx';
import { TrackedProductsList } from './components/TrackedProductsList.jsx';
import { api } from './api/client.js';

export function App() {
  const [trackedProducts, setTrackedProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productHistory, setProductHistory] = useState([]);
  const [productLogs, setProductLogs] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isBatchScraping, setIsBatchScraping] = useState(false);
  const [error, setError] = useState(null);

  // Load tracked products
  const loadData = async (selectExternalId = null) => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await api.getTrackedProducts();
      const list = res.data || [];
      setTrackedProducts(list);

      setSelectedProductId((prevId) => {
        if (selectExternalId) {
          const match = list.find((p) => String(p.external_product_id) === String(selectExternalId));
          if (match) return match.id;
        }
        if (prevId && list.some((p) => p.id === prevId)) {
          return prevId;
        }
        return list[0] ? list[0].id : null;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Find active product
  const activeProduct = trackedProducts.find((p) => p.id === selectedProductId) || trackedProducts[0] || null;

  // Load history and logs for active product
  const loadActiveDetails = async (productId) => {
    if (!productId) {
      setProductHistory([]);
      setProductLogs([]);
      return;
    }
    try {
      const [histRes, logsRes] = await Promise.all([
        api.getProductHistory(productId).catch(() => ({ data: [] })),
        api.getProductLogs(productId).catch(() => ({ data: [] }))
      ]);
      setProductHistory(histRes.data || []);
      setProductLogs(logsRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeProduct?.id) {
      loadActiveDetails(activeProduct.id);
    }
  }, [activeProduct?.id]);

  const handleProductTracked = async (newExternalId) => {
    await loadData(newExternalId);
  };

  const handleSelectProduct = (product) => {
    setSelectedProductId(product.id);
  };

  const handleSelectExistingByExternalId = (externalId) => {
    const found = trackedProducts.find((p) => String(p.external_product_id) === String(externalId));
    if (found) {
      setSelectedProductId(found.id);
    }
  };

  const handleScrapeNow = async () => {
    if (!activeProduct || isScraping) return;
    setIsScraping(true);
    try {
      await api.scrapeProduct(activeProduct.id);
      await loadData();
      await loadActiveDetails(activeProduct.id);
    } catch (err) {
      alert(`Scrape finished with message: ${err.message}`);
      await loadData();
      await loadActiveDetails(activeProduct.id);
    } finally {
      setIsScraping(false);
    }
  };

  const handleScrapeAll = async () => {
    if (isBatchScraping) return;
    setIsBatchScraping(true);
    try {
      const res = await api.triggerBatchScrape();
      alert(`Batch Scrape Done! Successful: ${res.data?.successful ?? 0}, Failed: ${res.data?.failed ?? 0}`);
      await loadData();
      if (activeProduct?.id) {
        await loadActiveDetails(activeProduct.id);
      }
    } catch (err) {
      alert(`Error during Scrape All: ${err.message}`);
    } finally {
      setIsBatchScraping(false);
    }
  };

  const trackedIds = new Set(trackedProducts.map((p) => String(p.external_product_id)));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-10">
      {/* Header */}
      <Header onRefreshAll={() => loadData()} isRefreshing={isRefreshing} />

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
            Error: {error}. Make sure backend is running.
          </div>
        )}

        {/* 1. Search Product */}
        <ProductSearch
          trackedIds={trackedIds}
          onProductTracked={handleProductTracked}
          onSelectExistingProduct={handleSelectExistingByExternalId}
        />

        {/* 2. Scrape Option */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">Scrape Product</h2>

          {trackedProducts.length > 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs text-gray-600 font-medium whitespace-nowrap">Choose product:</label>
                <select
                  value={activeProduct?.id || ''}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white text-gray-900 w-full sm:w-auto"
                >
                  {trackedProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleScrapeNow}
                  disabled={!activeProduct || isScraping}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium disabled:opacity-50"
                >
                  {isScraping ? 'Scraping...' : 'Scrape Now'}
                </button>

                <button
                  onClick={handleScrapeAll}
                  disabled={trackedProducts.length === 0 || isBatchScraping}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded text-sm font-medium disabled:opacity-50"
                >
                  {isBatchScraping ? 'Scraping All...' : 'Scrape All'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              No products tracked yet. Use the search box above to track a product.
            </p>
          )}

          {isScraping && (
            <p className="text-xs text-blue-600 mt-2 font-medium">
              Scraping live price & stock using Playwright... Please wait.
            </p>
          )}
        </div>

        {/* 3. Price & Stock for Selected Product */}
        {activeProduct && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
              <h2 className="text-base font-semibold text-gray-900">
                {activeProduct.product_name}
              </h2>
              <a
                href={activeProduct.product_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 underline"
              >
                View on Store ↗
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center sm:text-left">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <span className="text-xs text-gray-500 block">Price</span>
                <span className="text-xl font-bold text-green-700 font-mono">
                  {activeProduct.latest_price !== null && activeProduct.latest_price !== undefined
                    ? `₹${Number(activeProduct.latest_price).toLocaleString('en-IN')}`
                    : 'Not scraped yet'}
                </span>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <span className="text-xs text-gray-500 block">Stock</span>
                <span className="text-base font-semibold text-gray-800">
                  {activeProduct.latest_stock || 'Unknown'}
                </span>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded col-span-2 sm:col-span-1">
                <span className="text-xs text-gray-500 block">Last Scraped</span>
                <span className="text-xs text-gray-700 font-mono">
                  {activeProduct.last_scrape_completed_at
                    ? new Date(activeProduct.last_scrape_completed_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short'
                      })
                    : 'Never'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Graph */}
        {activeProduct && (
          <div id="price-graph-section" className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">
                Price Graph ({productHistory.length} points)
              </h3>
            </div>
            <PriceChart history={productHistory} />
          </div>
        )}

        {/* 5. Scrape Logs */}
        {activeProduct && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">
              Scrape Logs ({productLogs.length})
            </h3>
            <ScrapeLogsTable logs={productLogs} />
          </div>
        )}

        {/* 6. All Tracked Products Table */}
        {trackedProducts.length > 0 && (
          <TrackedProductsList
            products={trackedProducts}
            selectedProductId={activeProduct?.id}
            onSelectProduct={handleSelectProduct}
          />
        )}
      </main>

      <footer className="text-center text-xs text-gray-400 mt-10">
        INE Product Price Tracker
      </footer>
    </div>
  );
}

export default App;
