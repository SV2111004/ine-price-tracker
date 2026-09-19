import React from 'react';
import { StatusBadge } from './StatusBadge.jsx';

export function ScrapeLogsTable({ logs = [] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-xs italic">
        No scrape attempts logged for this product yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-80 overflow-y-auto">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="sticky top-0 bg-slate-900 uppercase text-[10px] text-slate-400 border-b border-slate-800 font-mono">
          <tr>
            <th className="px-3 py-2.5">Timestamp</th>
            <th className="px-3 py-2.5">Attempt</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Price</th>
            <th className="px-3 py-2.5">Stock</th>
            <th className="px-3 py-2.5">Duration</th>
            <th className="px-3 py-2.5">Error / Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono">
          {logs.map((log) => {
            const dateStr = new Date(log.completed_at || log.started_at).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });

            const duration = log.duration_ms ?? log.response_time_ms;
            const durationSec = duration ? `${(duration / 1000).toFixed(1)}s` : '-';
            const displayPrice = log.extracted_price ?? log.price;
            const displayStock = log.extracted_stock ?? log.stock;

            return (
              <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-400">{dateStr}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">{log.attempt_number}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <StatusBadge status={log.status} />
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-emerald-400 font-semibold">
                  {displayPrice !== null && displayPrice !== undefined ? `₹${Number(displayPrice).toLocaleString('en-IN')}` : '-'}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">
                  {displayStock || '-'}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-400">{durationSec}</td>
                <td className="px-3 py-2.5 text-rose-400 font-sans max-w-xs truncate" title={log.error_message || ''}>
                  {log.error_message || '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
