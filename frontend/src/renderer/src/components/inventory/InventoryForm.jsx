import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Package, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

const InventoryForm = ({ onSuccess, mode = 'add' }) => {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    description: '',
    unit_price: '',
    current_quantity: '',
    minimum_quantity: '',
    reorder_quantity: '',
    supplier_name: '',
    supplier_email: '',
    supplier_phone: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (mode === 'edit' && id) {
      fetchProduct()
    }
  }, [id, mode])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const backendUrl = window.electronAPI ? await window.electronAPI.getBackendUrl() : 'http://localhost:8000'
      
      const response = await fetch(`${backendUrl}/inventory/products/${id}`)
      if (response.ok) {
        const product = await response.json()
        setFormData({
          name: product.name || '',
          sku: product.sku || '',
          category: product.category || '',
          description: product.description || '',
          unit_price: product.unit_price || '',
          current_quantity: product.current_quantity || '',
          minimum_quantity: product.minimum_quantity || '',
          reorder_quantity: product.reorder_quantity || '',
          supplier_name: product.supplier_name || '',
          supplier_email: product.supplier_email || '',
          supplier_phone: product.supplier_phone || ''
        })
      }
    } catch (error) {
      console.error('Failed to fetch product:', error)
      toast.error('Failed to load product data')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      const backendUrl = window.electronAPI ? await window.electronAPI.getBackendUrl() : 'http://localhost:8000'
      
      const url = mode === 'add' 
        ? `${backendUrl}/inventory/products`
        : `${backendUrl}/inventory/products/${id}`
      
      const method = mode === 'add' ? 'POST' : 'PUT'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        toast.success(mode === 'add' ? 'Product added successfully!' : 'Product updated successfully!')
        if (onSuccess) {
          onSuccess()
        }
        navigate('/inventory')
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to save product')
      }
    } catch (error) {
      console.error('Failed to save product:', error)
      toast.error('Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {mode === 'add' ? 'Add New Product' : 'Edit Product'}
        </h1>
        <button
          onClick={() => navigate('/inventory')}
          className="btn-secondary flex items-center"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="Enter product name"
              />
            </div>
            
            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-2">
                SKU *
              </label>
              <input
                type="text"
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="Enter SKU"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="select-field"
              >
                <option value="">Select Category</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Food & Beverages">Food & Beverages</option>
                <option value="Electronics">Electronics</option>
                <option value="Furniture">Furniture</option>
                <option value="Cleaning Supplies">Cleaning Supplies</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="unit_price" className="block text-sm font-medium text-gray-700 mb-2">
                Unit Price ($) *
              </label>
              <input
                type="number"
                id="unit_price"
                name="unit_price"
                value={formData.unit_price}
                onChange={handleInputChange}
                required
                step="0.01"
                min="0"
                className="input-field"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="textarea-field"
              placeholder="Enter product description"
            />
          </div>

          {/* Inventory Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="current_quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Quantity *
                </label>
                <input
                  type="number"
                  id="current_quantity"
                  name="current_quantity"
                  value={formData.current_quantity}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className="input-field"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label htmlFor="minimum_quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Quantity *
                </label>
                <input
                  type="number"
                  id="minimum_quantity"
                  name="minimum_quantity"
                  value={formData.minimum_quantity}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className="input-field"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label htmlFor="reorder_quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Reorder Quantity *
                </label>
                <input
                  type="number"
                  id="reorder_quantity"
                  name="reorder_quantity"
                  value={formData.reorder_quantity}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className="input-field"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Supplier Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="supplier_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Name
                </label>
                <input
                  type="text"
                  id="supplier_name"
                  name="supplier_name"
                  value={formData.supplier_name}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter supplier name"
                />
              </div>
              
              <div>
                <label htmlFor="supplier_email" className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Email
                </label>
                <input
                  type="email"
                  id="supplier_email"
                  name="supplier_email"
                  value={formData.supplier_email}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="supplier@example.com"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label htmlFor="supplier_phone" className="block text-sm font-medium text-gray-700 mb-2">
                Supplier Phone
              </label>
              <input
                type="tel"
                id="supplier_phone"
                name="supplier_phone"
                value={formData.supplier_phone}
                onChange={handleInputChange}
                className="input-field"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center"
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {mode === 'add' ? 'Add Product' : 'Update Product'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InventoryForm