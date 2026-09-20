import React from 'react';
import { RefreshCw } from 'lucide-react';

export function Header({ onRefreshAll, isRefreshing }) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">INE Price Tracker</h1>
          <p className="text-xs text-gray-500">
            Track product price and stock from{' '}
            <a
              href="https://demo.inelabteamdev.com"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              demo.inelabteamdev.com
            </a>
          </p>
        </div>

        <button
          onClick={onRefreshAll}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </header>
  );
}
