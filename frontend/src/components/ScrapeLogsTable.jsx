import React from 'react';
import { StatusBadge } from './StatusBadge.jsx';

export function ScrapeLogsTable({ logs = [] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-xs bg-gray-50 border border-dashed border-gray-200 rounded">
        No logs yet. Click "Scrape Now" to run a scrape attempt.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-56 border border-gray-200 rounded">
      <table className="w-full text-left text-xs">
        <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 border-r border-gray-200">Date & Time</th>
            <th className="px-3 py-2 border-r border-gray-200">Attempt</th>
            <th className="px-3 py-2 border-r border-gray-200">Status</th>
            <th className="px-3 py-2 border-r border-gray-200">Price</th>
            <th className="px-3 py-2 border-r border-gray-200">Stock</th>
            <th className="px-3 py-2">Error / Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 font-mono">
          {logs.map((log, idx) => {
            const dateStr = new Date(log.completed_at || log.started_at).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });

            const displayPrice = log.extracted_price ?? log.price;
            const displayStock = log.extracted_stock ?? log.stock;

            return (
              <tr key={log.id || idx} className="hover:bg-gray-50">
                <td className="px-3 py-1.5 border-r border-gray-200 text-gray-600 whitespace-nowrap">{dateStr}</td>
                <td className="px-3 py-1.5 border-r border-gray-200 text-gray-800 text-center font-semibold">{log.attempt_number}</td>
                <td className="px-3 py-1.5 border-r border-gray-200 font-sans">
                  <StatusBadge status={log.status} />
                </td>
                <td className="px-3 py-1.5 border-r border-gray-200 text-emerald-700 font-medium">
                  {displayPrice !== null && displayPrice !== undefined ? `₹${Number(displayPrice).toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="px-3 py-1.5 border-r border-gray-200 text-gray-700 font-sans">
                  {displayStock || '—'}
                </td>
                <td className="px-3 py-1.5 text-rose-600 font-sans truncate max-w-xs" title={log.error_message || ''}>
                  {log.error_message || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
