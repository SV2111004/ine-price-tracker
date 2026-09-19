import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function PriceChart({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 rounded-xl border border-slate-800">
        <p className="text-sm text-slate-400 font-medium">No valid price snapshots recorded yet</p>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          As per data integrity rules, price points are only added to history when a scrape validates price and stock successfully.
        </p>
      </div>
    );
  }

  // Format data chronological for chart (oldest to newest)
  const chartData = [...history]
    .sort((a, b) => new Date(a.scraped_at) - new Date(b.scraped_at))
    .map((item) => ({
      timestamp: new Date(item.scraped_at).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      price: Number(item.price),
      stock: item.stock
    }));

  return (
    <div className="h-64 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis 
            dataKey="timestamp" 
            stroke="#64748b" 
            fontSize={11}
            tickLine={false}
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={11}
            tickFormatter={(v) => `₹${v}`}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              borderColor: '#334155',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#f8fafc'
            }}
            formatter={(val, name, item) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Price']}
            labelFormatter={(label) => `Scraped: ${label}`}
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#38bdf8" 
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#0284c7' }}
            activeDot={{ r: 6, fill: '#38bdf8' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
