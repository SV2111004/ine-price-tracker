import React from 'react';
import { CheckCircle2, RotateCcw, XCircle, Clock } from 'lucide-react';

export function StatusBadge({ status }) {
  const normalized = String(status || '').toUpperCase();

  if (normalized === 'SUCCESS') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        SUCCESS
      </span>
    );
  }

  if (normalized === 'RETRIED' || normalized === 'RETRYING') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
        <RotateCcw className="w-3 h-3 text-amber-600" />
        RETRYING
      </span>
    );
  }

  if (normalized === 'FAILED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
        <XCircle className="w-3 h-3 text-rose-600" />
        FAILED
      </span>
    );
  }

  if (normalized === 'STARTED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
        <Clock className="w-3 h-3 text-blue-600" />
        RUNNING
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium">
      {normalized || 'PENDING'}
    </span>
  );
}