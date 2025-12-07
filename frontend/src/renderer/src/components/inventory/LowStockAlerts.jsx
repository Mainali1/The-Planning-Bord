import React from 'react'
import { AlertTriangle } from 'lucide-react'

const LowStockAlerts = ({ products }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center mb-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
        <h3 className="text-lg font-medium text-red-800">Low Stock Alerts</h3>
      </div>
      <div className="space-y-2">
        {products.map((product) => (
          <div key={product.id} className="flex justify-between items-center text-sm">
            <span className="text-red-700">{product.name}</span>
            <span className="text-red-600 font-medium">
              {product.current_quantity} remaining (min: {product.minimum_quantity})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LowStockAlerts