import React from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';

export function StatusBadge({ status }) {
  const normalized = String(status || '').toUpperCase();

  if (normalized === 'SUCCESS') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
        <CheckCircle2 className="w-3 h-3" />
        SUCCESS
      </span>
    );
  }

  if (normalized === 'RETRIED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium">
        <RotateCcw className="w-3 h-3" />
        RETRIED
      </span>
    );
  }

  if (normalized === 'FAILED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium">
        <XCircle className="w-3 h-3" />
        FAILED
      </span>
    );
  }

  return (
    <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium">
      {normalized || 'PENDING'}
    </span>
  );
}