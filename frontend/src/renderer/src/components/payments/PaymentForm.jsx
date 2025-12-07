import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, X, DollarSign, CreditCard, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

const PaymentForm = ({ onSuccess, mode = 'add' }) => {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense',
    category: '',
    description: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    status: 'completed',
    reference_number: ''
  })
  
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mode === 'edit' && id) {
      fetchPayment()
    }
  }, [id, mode])

  const fetchPayment = async () => {
    try {
      setLoading(true)
      const backendUrl = window.electronAPI ? await window.electronAPI.getBackendUrl() : 'http://localhost:8000'
      
      const response = await fetch(`${backendUrl}/payments/${id}`)
      if (response.ok) {
        const payment = await response.json()
        setFormData({
          amount: payment.amount || '',
          type: payment.type || 'expense',
          category: payment.category || '',
          description: payment.description || '',
          payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
          payment_method: payment.payment_method || 'cash',
          status: payment.status || 'completed',
          reference_number: payment.reference_number || ''
        })
      }
    } catch (error) {
      console.error('Failed to fetch payment:', error)
      toast.error('Failed to load payment data')
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
        ? `${backendUrl}/payments`
        : `${backendUrl}/payments/${id}`
      
      const method = mode === 'add' ? 'POST' : 'PUT'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        toast.success(mode === 'add' ? 'Payment added successfully!' : 'Payment updated successfully!')
        if (onSuccess) {
          onSuccess()
        }
        navigate('/payments')
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to save payment')
      }
    } catch (error) {
      console.error('Failed to save payment:', error)
      toast.error('Failed to save payment')
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
          {mode === 'add' ? 'Add Payment' : 'Edit Payment'}
        </h1>
        <button
          onClick={() => navigate('/payments')}
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
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount ($) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  step="0.01"
                  min="0"
                  className="input-field pl-10"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Payment Type *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
                className="select-field"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="e.g., Office Supplies, Sales, Utilities"
              />
            </div>
            
            <div>
              <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  id="payment_date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleInputChange}
                  required
                  className="input-field pl-10"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={3}
              className="textarea-field"
              placeholder="Enter payment description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <select
                id="payment_method"
                name="payment_method"
                value={formData.payment_method}
                onChange={handleInputChange}
                required
                className="select-field"
              >
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                className="select-field"
              >
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="reference_number" className="block text-sm font-medium text-gray-700 mb-2">
              Reference Number
            </label>
            <input
              type="text"
              id="reference_number"
              name="reference_number"
              value={formData.reference_number}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Transaction ID, check number, etc."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={() => navigate('/payments')}
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
                  {mode === 'add' ? 'Add Payment' : 'Update Payment'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PaymentForm