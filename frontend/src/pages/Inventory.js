import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Edit, Trash2, AlertTriangle, Package, Info, RefreshCw, DollarSign } from 'lucide-react';
import { inventoryService } from '../services/api';

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    current_quantity: '',
    min_quantity: '',
    unit_price: '',
    supplier_id: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const queryClient = useQueryClient();

  const { 
    data: products, 
    isLoading, 
    error, 
    refetch 
  } = useQuery('products', inventoryService.getProducts, {
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const deleteMutation = useMutation(
    (id) => inventoryService.deleteProduct(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
      },
    }
  );

  const filteredProducts = products?.data?.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    }
    
    if (!formData.current_quantity || formData.current_quantity < 0) {
      errors.current_quantity = 'Current quantity must be 0 or greater';
    }
    
    if (!formData.min_quantity || formData.min_quantity < 0) {
      errors.min_quantity = 'Minimum quantity must be 0 or greater';
    }
    
    if (!formData.unit_price || formData.unit_price < 0) {
      errors.unit_price = 'Unit price must be 0 or greater';
    }
    
    if (!formData.category_id) {
      errors.category_id = 'Please select a category';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const productData = {
        ...formData,
        current_quantity: parseInt(formData.current_quantity),
        min_quantity: parseInt(formData.min_quantity),
        unit_price: parseFloat(formData.unit_price)
      };
      
      if (editingProduct) {
        await inventoryService.updateProduct(editingProduct.product_id, productData);
      } else {
        await inventoryService.createProduct(productData);
      }
      
      queryClient.invalidateQueries('products');
      setShowAddModal(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        category_id: '',
        current_quantity: '',
        min_quantity: '',
        unit_price: '',
        supplier_id: ''
      });
      setFormErrors({});
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please try again.');
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      category_id: product.category_id || '',
      current_quantity: product.current_quantity || '',
      min_quantity: product.min_quantity || '',
      unit_price: product.unit_price || '',
      supplier_id: product.supplier_id || ''
    });
    setFormErrors({});
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      category_id: '',
      current_quantity: '',
      min_quantity: '',
      unit_price: '',
      supplier_id: ''
    });
    setFormErrors({});
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your inventory...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Inventory</h3>
          <p className="text-gray-600 mb-4">
            We're having trouble loading your inventory data. This might be due to missing credentials or connection issues.
          </p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const isLowStock = (product) => product.current_quantity < product.min_quantity;

  // Calculate inventory summary
  const totalProducts = products?.data?.length || 0;
  const lowStockProducts = products?.data?.filter(isLowStock).length || 0;
  const totalValue = products?.data?.reduce((sum, product) => sum + (product.current_quantity * product.unit_price), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Product
        </button>
      </div>

      {/* Inventory Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900">{totalProducts}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Package className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-semibold text-gray-900">{lowStockProducts}</p>
            </div>
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
          {lowStockProducts > 0 && (
            <div className="mt-4 flex items-center">
              <span className="text-sm font-medium text-red-600">Needs attention</span>
              <span className="text-sm text-gray-500 ml-2">Review stock levels</span>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
              <p className="text-2xl font-semibold text-gray-900">${totalValue.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name or category..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm text-gray-500">
          <Info className="inline h-4 w-4 mr-1" />
          Tip: Search by product name or category to quickly find items
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Min Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts?.map((product) => (
              <tr key={product.product_id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{product.category_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{product.current_quantity}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{product.min_quantity}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{product.supplier_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isLowStock(product) ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Low Stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      In Stock
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(product)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.product_id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredProducts?.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No products found' : 'No products in inventory'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms or check for typos.'
                : 'Get started by adding your first product to track inventory.'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Product
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingProduct) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter product name"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category_id"
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.category_id ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a category</option>
                    <option value="1">Electronics</option>
                    <option value="2">Clothing</option>
                    <option value="3">Food & Beverages</option>
                    <option value="4">Office Supplies</option>
                    <option value="5">Other</option>
                  </select>
                  {formErrors.category_id && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.category_id}</p>
                  )}
                </div>

                {/* Current Quantity */}
                <div>
                  <label htmlFor="current_quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="current_quantity"
                    name="current_quantity"
                    value={formData.current_quantity}
                    onChange={handleInputChange}
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.current_quantity ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {formErrors.current_quantity && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.current_quantity}</p>
                  )}
                </div>

                {/* Minimum Quantity */}
                <div>
                  <label htmlFor="min_quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Quantity <span className="text-red-500">*</span>
                    <span className="ml-1 text-gray-400" title="Stock level that triggers low stock alerts">
                      <Info className="inline h-4 w-4" />
                    </span>
                  </label>
                  <input
                    type="number"
                    id="min_quantity"
                    name="min_quantity"
                    value={formData.min_quantity}
                    onChange={handleInputChange}
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.min_quantity ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="10"
                  />
                  {formErrors.min_quantity && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.min_quantity}</p>
                  )}
                </div>

                {/* Unit Price */}
                <div>
                  <label htmlFor="unit_price" className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="unit_price"
                    name="unit_price"
                    value={formData.unit_price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.unit_price ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {formErrors.unit_price && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.unit_price}</p>
                  )}
                </div>

                {/* Supplier */}
                <div>
                  <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <select
                    id="supplier_id"
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a supplier (optional)</option>
                    <option value="1">ABC Supplies</option>
                    <option value="2">Global Trading Co.</option>
                    <option value="3">Local Distributors</option>
                    <option value="4">Direct Manufacturer</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product description (optional)"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;