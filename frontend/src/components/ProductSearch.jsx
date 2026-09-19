import React, { useState, useEffect } from 'react';
import { Search, Plus, Check, Loader2, Tag, Box, AlertCircle } from 'lucide-react';
import { api } from '../api/client.js';

export function ProductSearch({ trackedIds = new Set(), onProductTracked }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [trackingLoadingId, setTrackingLoadingId] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await api.searchProducts(searchQuery);
      setResults(res.data || []);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTrack = async (product) => {
    setTrackingLoadingId(product.id);
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
      alert(`Failed to track product: ${err.message}`);
    } finally {
      setTrackingLoadingId(null);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-xl border border-slate-800">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-sky-400" />
          Search INE Mock Store
        </h2>
        <p className="text-sm text-slate-400">
          Query live products from the INE catalog by name, brand, SKU, or category to start automated price tracking.
        </p>
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search e.g. 'Amperage', 'Basecamp', 'Monitor', 'USB'..."
          className="w-full px-4 py-3 pl-11 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-inner text-sm"
        />
        <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
        {isSearching && (
          <Loader2 className="w-5 h-5 text-sky-400 animate-spin absolute right-3.5 top-3.5" />
        )}
      </div>

      {searchError && (
        <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Error loading search results: {searchError}</span>
        </div>
      )}

      {/* Search results list */}
      <div className="mt-4 max-h-72 overflow-y-auto space-y-2 pr-1">
        {results.map((product) => {
          const isTracked = trackedIds.has(String(product.id));
          const isLoading = trackingLoadingId === product.id;

          return (
            <div
              key={product.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800/60 border border-slate-800/80 transition-colors gap-3 text-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white truncate">{product.name}</span>
                  {product.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium shrink-0">
                      {product.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                  <span>ID: #{product.id}</span>
                  {product.brand && <span>Brand: {product.brand}</span>}
                  {product.sku && <span>SKU: {product.sku}</span>}
                </div>
              </div>

              <button
                onClick={() => handleTrack(product)}
                disabled={isTracked || isLoading}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 ${isTracked
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 active:scale-95'
                  }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Tracking...
                  </>
                ) : isTracked ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Tracked
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Track Product
                  </>
                )}
              </button>
            </div>
          );
        })}

        {!isSearching && results.length === 0 && (
          <div className="text-center py-6 text-slate-500 text-xs">
            {query ? 'No matching products found in INE Store.' : 'Type to search products or browse catalog.'}
          </div>
        )}
      </div>
    </div>
  );
}
