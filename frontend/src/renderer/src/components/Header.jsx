import React from 'react'
import { Menu, Bell, Wifi, WifiOff, Server } from 'lucide-react'

const Header = ({ sidebarOpen, setSidebarOpen, backendStatus, isOnline }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-600 lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <h2 className="ml-4 text-2xl font-semibold text-gray-800">
            Business Management Dashboard
          </h2>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2 text-sm">
            <div className="flex items-center space-x-1">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className={`${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Server className={`w-4 h-4 ${backendStatus ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`${backendStatus ? 'text-green-600' : 'text-red-600'}`}>
                {backendStatus ? 'Server Online' : 'Server Offline'}
              </span>
            </div>
          </div>
          
          {/* Notifications */}
          <button className="text-gray-400 hover:text-gray-500">
            <Bell className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header