import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';

export function ProductSearch({ trackedIds = new Set(), onProductTracked, onSelectExistingProduct }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trackingId, setTrackingId] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchProducts(query);
        setResults(res.data || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleTrack = async (product) => {
    setTrackingId(product.id);
    try {
      await api.addTrackedProduct({
        external_product_id: String(product.id),
        product_name: product.name,
        product_url: `https://demo.inelabteamdev.com/product/${product.id}`,
        category: product.category,
        sku: product.sku
      });
      if (onProductTracked) {
        onProductTracked(String(product.id));
      }
    } catch (err) {
      alert(`Error tracking product: ${err.message}`);
    } finally {
      setTrackingId(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-800 mb-2">Search Product</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product name (e.g. Earbuds, Boot, Lock)..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {loading && <p className="text-xs text-gray-500 mt-2">Searching products...</p>}

      {results.length > 0 && (
        <div className="mt-3 border border-gray-200 rounded divide-y divide-gray-100 max-h-56 overflow-y-auto">
          {results.slice(0, 6).map((item) => {
            const isTracked = trackedIds.has(String(item.id));
            const isTracking = trackingId === item.id;

            return (
              <div key={item.id} className="p-2 flex items-center justify-between text-xs hover:bg-gray-50">
                <div>
                  <span className="font-medium text-gray-900">{item.name}</span>
                  {item.category && <span className="text-gray-500 ml-2">({item.category})</span>}
                </div>

                <div>
                  {isTracked ? (
                    <button
                      onClick={() => onSelectExistingProduct && onSelectExistingProduct(String(item.id))}
                      className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded"
                    >
                      ✓ Tracked
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTrack(item)}
                      disabled={isTracking}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded disabled:opacity-50"
                    >
                      {isTracking ? 'Adding...' : '+ Track'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
