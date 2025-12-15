import React, { useState, useEffect } from 'react'
import { Server, Power, PowerOff, AlertCircle, Lock } from 'lucide-react'
import authUtils from '../utils/auth'

const ServerControl = ({ backendStatus, isOnline, onServerToggle }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [serverStatus, setServerStatus] = useState({
    is_running: false,
    status: 'unknown',
    message: 'Checking server status...'
  })
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    // Fetch server status on component mount
    fetchServerStatus()
    
    // Get current user role
    const userInfo = authUtils.getUserInfo()
    if (userInfo) {
      setUserRole(userInfo.role)
    }
  }, [backendStatus, isOnline])

  const fetchServerStatus = async () => {
    try {
      // Check if user is authenticated and has required role
      if (!authUtils.isAuthenticated()) {
        setServerStatus({
          is_running: false,
          status: 'unauthorized',
          message: 'Authentication required'
        })
        return
      }

      const response = await fetch('http://localhost:8000/api/server/status', {
        headers: authUtils.getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        setServerStatus(data)
      } else if (response.status === 401) {
        setServerStatus({
          is_running: false,
          status: 'unauthorized',
          message: 'Authentication failed'
        })
      } else if (response.status === 403) {
        setServerStatus({
          is_running: false,
          status: 'forbidden',
          message: 'Insufficient permissions'
        })
      } else {
        setServerStatus({
          is_running: false,
          status: 'error',
          message: 'Failed to fetch server status'
        })
      }
    } catch (error) {
      setServerStatus({
        is_running: false,
        status: 'error',
        message: 'Server not responding'
      })
    }
  }

  const handleServerToggle = async () => {
    setIsLoading(true)
    
    try {
      // Check if user is authenticated and has admin role
      if (!authUtils.isAuthenticated()) {
        alert('Authentication required. Please log in.')
        setIsLoading(false)
        return
      }

      // Check if user has admin role for server control
      const userInfo = authUtils.getUserInfo()
      if (!userInfo || userInfo.role !== 'ADMIN') {
        alert('Admin privileges required for server control.')
        setIsLoading(false)
        return
      }

      const action = serverStatus.is_running ? 'stop' : 'start'
      const response = await fetch('http://localhost:8000/api/server/control', {
        method: 'POST',
        headers: authUtils.getAuthHeaders(),
        body: JSON.stringify({
          action: action
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update local state
        setServerStatus(prev => ({
          ...prev,
          is_running: action === 'start',
          status: action === 'start' ? 'online' : 'offline',
          message: data.message
        }))

        // Call parent callback if provided
        if (onServerToggle) {
          onServerToggle(action === 'start')
        }

        // Refresh status after a short delay
        setTimeout(() => {
          fetchServerStatus()
        }, 1000)
        
      } else {
        const error = await response.json()
        alert(`Failed to ${action} server: ${error.detail}`)
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = () => {
    if (serverStatus.status === 'online' || backendStatus) {
      return 'text-green-600 bg-green-100'
    } else if (serverStatus.status === 'error' || serverStatus.status === 'unauthorized' || serverStatus.status === 'forbidden') {
      return 'text-red-600 bg-red-100'
    } else {
      return 'text-gray-600 bg-gray-100'
    }
  }

  const getButtonColor = () => {
    // Check if user has admin privileges
    if (!authUtils.isAuthenticated() || (userRole && userRole !== 'ADMIN')) {
      return 'bg-gray-400 cursor-not-allowed'
    }
    
    if (serverStatus.is_running || backendStatus) {
      return 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    } else {
      return 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
    }
  }

  const getButtonIcon = () => {
    if (serverStatus.is_running || backendStatus) {
      return <PowerOff className="w-4 h-4" />
    } else {
      return <Power className="w-4 h-4" />
    }
  }

  const getButtonText = () => {
    // Check if user has admin privileges
    if (!authUtils.isAuthenticated()) {
      return 'Login Required'
    }
    
    if (userRole && userRole !== 'ADMIN') {
      return 'Admin Required'
    }
    
    if (serverStatus.is_running || backendStatus) {
      return 'Stop Server'
    } else {
      return 'Start Server'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Server className={`w-6 h-6 ${getStatusColor().split(' ')[0]}`} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Server Control</h3>
            <p className="text-sm text-gray-500">Manage backend server status</p>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {serverStatus.status === 'online' || backendStatus ? 'Online' : 'Offline'}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          {serverStatus.status === 'error' && (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          {serverStatus.status === 'unauthorized' && (
            <Lock className="w-4 h-4 text-red-500" />
          )}
          {serverStatus.status === 'forbidden' && (
            <Lock className="w-4 h-4 text-red-500" />
          )}
          <span>{serverStatus.message}</span>
        </div>
        
        {userRole && (
          <div className="text-xs text-blue-600 mt-1">
            Logged in as: {userRole}
          </div>
        )}
        
        {serverStatus.uptime && (
          <div className="text-xs text-gray-500 mt-1">
            Uptime: {serverStatus.uptime}
          </div>
        )}
      </div>

      <button
        onClick={handleServerToggle}
        disabled={isLoading || !authUtils.isAuthenticated() || (userRole && userRole !== 'ADMIN')}
        className={`w-full flex items-center justify-center space-x-2 px-4 py-2 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonColor()}`}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            {getButtonIcon()}
            <span>{getButtonText()}</span>
          </>
        )}
      </button>

      <div className="mt-4 text-xs text-gray-500">
        <p>• Server runs on localhost:8000</p>
        <p>• Toggle to start/stop backend services</p>
        {serverStatus.status === 'error' && (
          <p className="text-red-600 mt-2">
            • Check if backend is properly configured
          </p>
        )}
        {serverStatus.status === 'unauthorized' && (
          <p className="text-red-600 mt-2">
            • Please log in to access server controls
          </p>
        )}
        {serverStatus.status === 'forbidden' && (
          <p className="text-red-600 mt-2">
            • Admin privileges required for server control
          </p>
        )}
      </div>
    </div>
  )
}

export default ServerControl