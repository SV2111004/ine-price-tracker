import React, { useState, useEffect } from 'react';
import { X, ExternalLink, RefreshCw, BarChart2, ListOrdered, AlertCircle, ShieldAlert } from 'lucide-react';
import { PriceChart } from './PriceChart.jsx';
import { ScrapeLogsTable } from './ScrapeLogsTable.jsx';
import { api } from '../api/client.js';

export function ProductDetailModal({ product, onClose, onScrapeSingle, isScraping }) {
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'logs'
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDetails = async () => {
    if (!product) return;
    setLoading(true);
    setError(null);
    try {
      const [historyRes, logsRes] = await Promise.all([
        api.getProductHistory(product.id),
        api.getProductLogs(product.id)
      ]);
      setHistory(historyRes.data || []);
      setLogs(logsRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [product?.id]);

  const handleModalScrape = async () => {
    await onScrapeSingle(product.id);
    await loadDetails();
  };

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="glass-panel w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                {product.category || 'General'}
              </span>
              <span className="text-xs font-mono text-slate-500">
                ID #{product.external_product_id}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1 truncate">{product.product_name}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
              {product.sku && <span>SKU: {product.sku}</span>}
              <a
                href={product.product_url}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
              >
                Store Page <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleModalScrape}
              disabled={isScraping}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
              Scrape Now
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Summary Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-6 bg-slate-900/50 border-b border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
            <span className="text-slate-400 block mb-1">Latest Scraped Price</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {product.latest_price !== null && product.latest_price !== undefined
                ? `₹${Number(product.latest_price).toLocaleString('en-IN')}`
                : 'Not available'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
            <span className="text-slate-400 block mb-1">Stock Status</span>
            <span className="text-base font-semibold text-slate-200">
              {product.latest_stock || 'Unknown'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 col-span-2 sm:col-span-1">
            <span className="text-slate-400 block mb-1">Total Scrape Logs</span>
            <span className="text-base font-bold text-sky-400 font-mono">
              {logs.length} attempts
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/30">
          <button
            onClick={() => setActiveTab('chart')}
            className={`py-3 px-4 text-xs font-medium flex items-center gap-2 border-b-2 transition-all ${activeTab === 'chart'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
          >
            <BarChart2 className="w-4 h-4" />
            Price History Chart ({history.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-4 text-xs font-medium flex items-center gap-2 border-b-2 transition-all ${activeTab === 'logs'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
          >
            <ListOrdered className="w-4 h-4" />
            Scrape Logs ({logs.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'chart' ? (
            <div>
              <div className="mb-2 text-xs text-slate-400 flex items-center justify-between">
                <span>Verified Historical Price Progression</span>
                <span className="text-slate-500 font-mono">Source of truth: Supabase PostgreSQL</span>
              </div>
              <PriceChart history={history} />
            </div>
          ) : (
            <div>
              <div className="mb-2 text-xs text-slate-400 flex items-center justify-between">
                <span>Audit Trail of All Scrape Attempts</span>
                <span className="text-slate-500 font-mono">Records both successes and challenge failures</span>
              </div>
              <ScrapeLogsTable logs={logs} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
