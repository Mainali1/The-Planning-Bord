import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, Users, DollarSign, AlertTriangle, TrendingUp, Activity } from 'lucide-react'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    totalEmployees: 0,
    monthlyRevenue: 0,
    pendingTasks: 0,
    recentActivities: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const backendUrl = window.electronAPI ? await window.electronAPI.getBackendUrl() : 'http://localhost:8000'
      
      const response = await fetch(`${backendUrl}/dashboard/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      // Use mock data if backend is not available
      setStats({
        totalProducts: 156,
        lowStockItems: 12,
        totalEmployees: 24,
        monthlyRevenue: 45678,
        pendingTasks: 8,
        recentActivities: [
          { id: 1, type: 'inventory', message: 'Low stock alert: Printer Paper', time: '2 minutes ago' },
          { id: 2, type: 'employee', message: 'New employee onboarded: John Doe', time: '1 hour ago' },
          { id: 3, type: 'payment', message: 'Payment processed: $1,250', time: '3 hours ago' }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'blue',
      link: '/inventory'
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: 'red',
      link: '/inventory?filter=low-stock'
    },
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      icon: Users,
      color: 'green',
      link: '/employees'
    },
    {
      title: 'Monthly Revenue',
      value: `$${stats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'purple',
      link: '/payments'
    }
  ]

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      red: 'bg-red-100 text-red-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600'
    }
    return colors[color] || colors.blue
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link
            key={stat.title}
            to={stat.link}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${getColorClasses(stat.color)}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {stats.recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Activity className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          
          {stats.recentActivities.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No recent activity to display
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/inventory/add"
              className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200"
            >
              <Package className="w-5 h-5 mr-2 text-gray-600" />
              <span className="text-gray-700">Add New Product</span>
            </Link>
            <Link
              to="/employees/add"
              className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors duration-200"
            >
              <Users className="w-5 h-5 mr-2 text-gray-600" />
              <span className="text-gray-700">Add Employee</span>
            </Link>
            <Link
              to="/payments/add"
              className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors duration-200"
            >
              <DollarSign className="w-5 h-5 mr-2 text-gray-600" />
              <span className="text-gray-700">Record Payment</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard