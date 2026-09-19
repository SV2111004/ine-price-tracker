import React from 'react';
import { RefreshCw, Eye, Trash2, ExternalLink, Power, AlertTriangle, TrendingUp } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';

export function TrackedProductsList({
  products,
  onSelectProduct,
  onScrapeSingle,
  onToggleTracking,
  onDeleteProduct,
  scrapingIds = new Set()
}) {
  if (products.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 mb-4 border border-slate-800">
          <TrendingUp className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">No Tracked Products Yet</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Search the INE Mock Store above and click "Track Product" to begin automated price and stock monitoring.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Tracked Products ({products.length})</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated price & stock records persisted in Supabase PostgreSQL
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase bg-slate-900/80 text-slate-400 border-b border-slate-800 font-mono">
            <tr>
              <th scope="col" className="px-5 py-3.5">Product</th>
              <th scope="col" className="px-4 py-3.5">Latest Price</th>
              <th scope="col" className="px-4 py-3.5">Known Stock</th>
              <th scope="col" className="px-4 py-3.5">Last Scrape</th>
              <th scope="col" className="px-4 py-3.5">Scrape Status</th>
              <th scope="col" className="px-4 py-3.5">Active</th>
              <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {products.map((p) => {
              const isScraping = scrapingIds.has(p.id);

              return (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Product Details */}
                  <td className="px-5 py-4">
                    <div className="font-medium text-white line-clamp-1">{p.product_name}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                      {p.category && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-sans text-[10px]">
                          {p.category}
                        </span>
                      )}
                      <span>ID: #{p.external_product_id}</span>
                      {p.sku && <span>SKU: {p.sku}</span>}
                      <a
                        href={p.product_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-0.5"
                        title="Open product on mock store"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>

                  {/* Latest Successful Price */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    {p.latest_price !== null && p.latest_price !== undefined ? (
                      <span className="text-base font-bold text-emerald-400 font-mono">
                        ₹{Number(p.latest_price).toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 italic">
                        No valid price yet
                      </span>
                    )}
                  </td>

                  {/* Known Stock */}
                  <td className="px-4 py-4 whitespace-nowrap text-xs">
                    {p.latest_stock ? (
                      <span className="px-2 py-1 rounded-md bg-slate-800/80 text-slate-300 font-medium">
                        {p.latest_stock}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Unknown</span>
                    )}
                  </td>

                  {/* Last Scrape Timestamp */}
                  <td className="px-4 py-4 whitespace-nowrap text-xs font-mono text-slate-400">
                    {p.last_scrape_completed_at ? (
                      new Date(p.last_scrape_completed_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        day: 'numeric',
                        month: 'short'
                      })
                    ) : (
                      <span className="text-slate-600">Never</span>
                    )}
                  </td>

                  {/* Scrape Status */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <StatusBadge status={p.last_scrape_status} />
                    {p.last_scrape_error && (
                      <div className="text-[10px] text-rose-400/80 truncate max-w-[140px] mt-1" title={p.last_scrape_error}>
                        {p.last_scrape_error}
                      </div>
                    )}
                  </td>

                  {/* Tracking Toggle */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onToggleTracking(p.id, !p.tracking_enabled)}
                      className={`p-1.5 rounded-lg border transition-colors ${p.tracking_enabled
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                        }`}
                      title={p.tracking_enabled ? 'Tracking enabled (Click to pause)' : 'Tracking paused (Click to enable)'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onScrapeSingle(p.id)}
                        disabled={isScraping}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-600/80 hover:bg-sky-600 text-white font-medium flex items-center gap-1 transition-all disabled:opacity-50 text-xs shadow-sm"
                        title="Trigger scraper immediately"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
                        Scrape Now
                      </button>

                      <button
                        onClick={() => onSelectProduct(p)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="View price history and scrape logs"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteProduct(p.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete tracked product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
