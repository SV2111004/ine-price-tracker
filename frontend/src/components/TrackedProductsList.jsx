import React from 'react';

export function TrackedProductsList({
  products,
  selectedProductId,
  onSelectProduct
}) {
  if (!products || products.length === 0) {
    return null;
  }

  const handleOpenGraph = (product) => {
    onSelectProduct(product);
    // Smoothly scroll to the graph section
    const graphElement = document.getElementById('price-graph-section');
    if (graphElement) {
      graphElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-2">
        All Tracked Products ({products.length})
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-gray-200">
          <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 border-r border-gray-200">Product Name</th>
              <th className="px-3 py-2 border-r border-gray-200">Price</th>
              <th className="px-3 py-2 border-r border-gray-200">Stock</th>
              <th className="px-3 py-2 border-r border-gray-200">Time</th>
              <th className="px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((p) => {
              const isSelected = p.id === selectedProductId;
              const formattedTime = p.last_scrape_completed_at
                ? new Date(p.last_scrape_completed_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: 'numeric',
                    month: 'short'
                  })
                : 'Never';

              return (
                <tr
                  key={p.id}
                  className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-3 py-2 border-r border-gray-200 font-medium text-gray-900">
                    {p.product_name}
                  </td>
                  <td className="px-3 py-2 border-r border-gray-200 text-gray-800">
                    {p.latest_price !== null && p.latest_price !== undefined
                      ? `₹${Number(p.latest_price).toLocaleString('en-IN')}`
                      : '—'}
                  </td>
                  <td className="px-3 py-2 border-r border-gray-200 text-gray-700">
                    {p.latest_stock || '—'}
                  </td>
                  <td className="px-3 py-2 border-r border-gray-200 text-gray-500 whitespace-nowrap">
                    {formattedTime}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleOpenGraph(p)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                    >
                      Open Graph
                    </button>
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
