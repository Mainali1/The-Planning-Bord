import React, { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { Plus, Search, Filter, Edit, Trash2, AlertTriangle, Package } from 'lucide-react'
import InventoryList from '../components/inventory/InventoryList'
import InventoryForm from '../components/inventory/InventoryForm'
import LowStockAlerts from '../components/inventory/LowStockAlerts'

const Inventory = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const backendUrl = window.electronAPI ? await window.electronAPI.getBackendUrl() : 'http://localhost:8000'
      
      const response = await fetch(`${backendUrl}/inventory/products`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      // Mock data for demo
      setProducts([
        {
          id: 1,
          name: 'Printer Paper',
          sku: 'PP-A4-500',
          category: 'Office Supplies',
          current_quantity: 15,
          minimum_quantity: 50,
          reorder_quantity: 100,
          unit_price: 12.99,
          supplier_email: 'supplier@example.com',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 2,
          name: 'Coffee Beans',
          sku: 'CB-ESP-1KG',
          category: 'Food & Beverages',
          current_quantity: 8,
          minimum_quantity: 20,
          reorder_quantity: 40,
          unit_price: 24.99,
          supplier_email: 'coffee@supplier.com',
          created_at: '2024-01-10T14:30:00Z'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const backendUrl = window.electronAPI ? await window.electronAPI.getBackendUrl() : 'http://localhost:8000'
        
        const response = await fetch(`${backendUrl}/inventory/products/${id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          fetchProducts() // Refresh the list
        }
      } catch (error) {
        console.error('Failed to delete product:', error)
      }
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const lowStockProducts = products.filter(product => 
    product.current_quantity <= product.minimum_quantity
  )

  return (
    <div className="space-y-6">
      <Routes>
        <Route path="/" element={
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
              <Link
                to="/inventory/add"
                className="btn-primary flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Link>
            </div>

            {/* Low Stock Alerts */}
            {lowStockProducts.length > 0 && (
              <LowStockAlerts products={lowStockProducts} />
            )}

            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                <div className="md:w-48">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="select-field"
                  >
                    <option value="all">All Categories</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Food & Beverages">Food & Beverages</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Furniture">Furniture</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Products</h2>
              </div>
              <InventoryList 
                products={filteredProducts}
                onDelete={handleDeleteProduct}
                loading={loading}
              />
            </div>
          </div>
        } />
        
        <Route path="/add" element={
          <InventoryForm 
            onSuccess={fetchProducts}
            mode="add"
          />
        } />
        
        <Route path="/edit/:id" element={
          <InventoryForm 
            onSuccess={fetchProducts}
            mode="edit"
          />
        } />
      </Routes>
    </div>
  )
}

export default Inventory