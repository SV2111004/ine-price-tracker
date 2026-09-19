import React from 'react';
import { Activity, ShieldCheck, Database, RefreshCw, ExternalLink } from 'lucide-react';

export function Header({ health, onRefreshAll, isRefreshing }) {
  return (
    <header className="border-b border-slate-800/80 glass-panel sticky top-0 z-30 px-4 sm:px-8 py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">INE Price Tracker</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 font-medium">
                Live Mock Store
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              Target:
              <a
                href="https://demo.inelabteamdev.com"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline inline-flex items-center gap-0.5 font-mono"
              >
                demo.inelabteamdev.com <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Database indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span>{health?.database?.engine || 'Checking DB...'}</span>
          </div>

          {/* Backend Status indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <span className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span>Backend: {health?.status === 'ok' ? 'Online' : 'Offline'}</span>
          </div>

          <button
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium transition-colors shadow-sm"
            title="Refresh tracked list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}
