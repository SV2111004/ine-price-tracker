import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function PriceChart({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded">
        No price history recorded yet. Click "Scrape Now" to fetch the current price.
      </div>
    );
  }

  const chartData = [...history]
    .sort((a, b) => new Date(a.scraped_at) - new Date(b.scraped_at))
    .map((item) => ({
      time: new Date(item.scraped_at).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      price: Number(item.price)
    }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
          <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `₹${v}`} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '12px'
            }}
            formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Price']}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3, fill: '#2563eb' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
