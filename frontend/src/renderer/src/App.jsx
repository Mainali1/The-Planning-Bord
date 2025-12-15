import React, { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Employees from './pages/Employees'
import Payments from './pages/Payments'
import Settings from './pages/Settings'
import LoginForm from './components/LoginForm'
import SetupWizard from './components/SetupWizard'
import authUtils from './utils/auth'
import './App.css'

function App() {
  const [backendStatus, setBackendStatus] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [setupComplete, setSetupComplete] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)

  useEffect(() => {
    // Check authentication status
    setIsAuthenticated(authUtils.isAuthenticated())
    
    // Check setup status
    checkSetupStatus()
    
    // Check backend status
    checkBackendStatus()
    
    // Set up periodic backend status checks
    const interval = setInterval(checkBackendStatus, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  const checkBackendStatus = async () => {
    try {
      if (window.electronAPI) {
        const status = await window.electronAPI.checkBackendStatus()
        setBackendStatus(status)
      } else {
        // Fallback for development (non-electron)
        const response = await fetch('http://localhost:8000/health')
        setBackendStatus(response.ok)
      }
    } catch (error) {
      setBackendStatus(false)
    }
  }



  const checkSetupStatus = async () => {
    try {
      setCheckingSetup(true)
      const response = await fetch('http://localhost:8000/api/setup/status')
      if (response.ok) {
        const data = await response.json()
        setSetupComplete(data.setup_complete)
      } else {
        // If setup endpoint doesn't exist, assume setup is complete for backward compatibility
        setSetupComplete(true)
      }
    } catch (error) {
      console.error('Error checking setup status:', error)
      // Assume setup is complete if we can't check
      setSetupComplete(true)
    } finally {
      setCheckingSetup(false)
    }
  }

  const checkOnlineStatus = async () => {
    try {
      const response = await fetch('https://www.microsoft.com', { mode: 'no-cors' })
      setIsOnline(true)
    } catch (error) {
      setIsOnline(false)
    }
  }

  const handleLogin = (user) => {
    setIsAuthenticated(true)
    setCurrentUser(user)
  }

  const handleSetupComplete = async (setupData) => {
    try {
      // After setup completion, try to auto-login with the created admin account
      const loginResponse = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: setupData.admin_username || setupData.adminUsername,
          password: setupData.admin_password || setupData.adminPassword,
        }),
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        localStorage.setItem('planningbord_token', loginData.access_token);
        setSetupComplete(true);
        setIsAuthenticated(true);
        setCurrentUser(loginData.user);
      } else {
        // If auto-login fails, just mark setup as complete and show login form
        setSetupComplete(true);
      }
    } catch (error) {
      console.error('Auto-login after setup failed:', error);
      // If auto-login fails, just mark setup as complete and show login form
      setSetupComplete(true);
    }
  }

  const handleLogout = () => {
    authUtils.removeToken()
    setIsAuthenticated(false)
    setCurrentUser(null)
  }

  useEffect(() => {
    checkOnlineStatus()
    const interval = setInterval(checkOnlineStatus, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])



  // Show setup wizard if setup is not complete
  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking system status...</p>
        </div>
      </div>
    )
  }

  // Show setup wizard if setup is not complete
  if (!setupComplete) {
    return <SetupWizard onComplete={handleSetupComplete} />
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          backendStatus={backendStatus}
          isOnline={isOnline}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        
        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="container mx-auto px-6 py-8">
            {!backendStatus && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <strong>Backend Server Offline:</strong> Some features may not be available. Please check if the backend server is running.
              </div>
            )}
            
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/inventory/*" element={<Inventory />} />
              <Route path="/employees/*" element={<Employees />} />
              <Route path="/payments/*" element={<Payments />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App