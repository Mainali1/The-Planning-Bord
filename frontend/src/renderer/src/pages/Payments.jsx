import React, { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { Plus, Search, DollarSign, CreditCard, TrendingUp, Filter } from 'lucide-react'
import PaymentList from '../components/payments/PaymentList'
import PaymentForm from '../components/payments/PaymentForm'

const Payments = () => {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const backendUrl = window.electronAPI ? await window.electronAPI.getBackendUrl() : 'http://localhost:8000'
      
      const response = await fetch(`${backendUrl}/payments`)
      if (response.ok) {
        const data = await response.json()
        setPayments(data)
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error)
      // Mock data for demo
      setPayments([
        {
          id: 1,
          amount: 1250.00,
          type: 'expense',
          category: 'Office Supplies',
          description: 'Monthly office supplies purchase',
          payment_date: '2024-01-15',
          payment_method: 'credit_card',
          status: 'completed'
        },
        {
          id: 2,
          amount: 3500.00,
          type: 'income',
          category: 'Sales',
          description: 'Product sales revenue',
          payment_date: '2024-01-14',
          payment_method: 'bank_transfer',
          status: 'completed'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePayment = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment record?')) {
      try {
        const backendUrl = window.electronAPI ? await window.electronAPI.getBackendUrl() : 'http://localhost:8000'
        
        const response = await fetch(`${backendUrl}/payments/${id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          fetchPayments() // Refresh the list
        }
      } catch (error) {
        console.error('Failed to delete payment:', error)
      }
    }
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || payment.type === filterType
    return matchesSearch && matchesType
  })

  // Calculate totals
  const totalIncome = payments.filter(p => p.type === 'income' && p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
  const totalExpenses = payments.filter(p => p.type === 'expense' && p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
  const netProfit = totalIncome - totalExpenses

  return (
    <div className="space-y-6">
      <Routes>
        <Route path="/" element={
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Payment & Finance Management</h1>
              <Link
                to="/payments/add"
                className="btn-primary flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Payment
              </Link>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-green-600">Total Income</p>
                    <p className="text-2xl font-bold text-green-900">${totalIncome.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center">
                  <DollarSign className="w-8 h-8 text-red-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-red-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-900">${totalExpenses.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className={`border rounded-lg p-6 ${
                netProfit >= 0 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-center">
                  <CreditCard className={`w-8 h-8 mr-3 ${
                    netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`} />
                  <div>
                    <p className={`text-sm font-medium ${
                      netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'
                    }`}>
                      Net Profit
                    </p>
                    <p className={`text-2xl font-bold ${
                      netProfit >= 0 ? 'text-blue-900' : 'text-orange-900'
                    }`}>
                      ${netProfit.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search payments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                <div className="md:w-48">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="select-field"
                  >
                    <option value="all">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Payment Records</h2>
              </div>
              <PaymentList 
                payments={filteredPayments}
                onDelete={handleDeletePayment}
                loading={loading}
              />
            </div>
          </div>
        } />
        
        <Route path="/add" element={
          <PaymentForm 
            onSuccess={fetchPayments}
            mode="add"
          />
        } />
        
        <Route path="/edit/:id" element={
          <PaymentForm 
            onSuccess={fetchPayments}
            mode="edit"
          />
        } />
      </Routes>
    </div>
  )
}

export default Payments