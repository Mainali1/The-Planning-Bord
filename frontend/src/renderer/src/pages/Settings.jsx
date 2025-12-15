import React, { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Database, Bell, Mail, Shield, Server } from 'lucide-react'
import toast from 'react-hot-toast'
import ServerControl from '../components/ServerControl'

const Settings = () => {
  const [settings, setSettings] = useState({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    default_currency: 'USD',
    timezone: 'UTC',
    date_format: 'MM/DD/YYYY',
    notification_email: true,
    notification_low_stock: true,
    notification_payment_reminder: true,
    microsoft_client_id: '',
    microsoft_tenant_id: '',
    backend_url: '',
    offline_mode: false
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [backendStatus, setBackendStatus] = useState(false)
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    fetchSettings()
    checkConnectionStatus()
  }, [])

  const fetchSettings = async () => {
    try {
      const backendUrl = window.electronAPI ? await window.electronAPI.getBackendUrl() : 'http://localhost:8000'
      
      const response = await fetch(`${backendUrl}/settings`)
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      // Use default settings if backend is not available
      setSettings({
        company_name: 'Your Company Name',
        company_address: '123 Business St, City, State 12345',
        company_phone: '(555) 123-4567',
        company_email: 'info@yourcompany.com',
        default_currency: 'USD',
        timezone: 'America/New_York',
        date_format: 'MM/DD/YYYY',
        notification_email: true,
        notification_low_stock: true,
        notification_payment_reminder: true,
        microsoft_client_id: '',
        microsoft_tenant_id: '',
        backend_url: 'http://localhost:8000',
        offline_mode: false
      })
    } finally {
      setLoading(false)
    }
  }

  const checkConnectionStatus = async () => {
    try {
      if (window.electronAPI) {
        const status = await window.electronAPI.checkBackendStatus()
        setBackendStatus(status)
      }
      
      // Check online status
      const onlineResponse = await fetch('https://www.microsoft.com', { mode: 'no-cors' })
      setIsOnline(true)
    } catch (error) {
      setIsOnline(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      const backendUrl = window.electronAPI ? await window.electronAPI.getBackendUrl() : 'http://localhost:8000'
      
      const response = await fetch(`${backendUrl}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        toast.success('Settings saved successfully!')
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      const response = await fetch(`${settings.backend_url}/health`)
      if (response.ok) {
        toast.success('Connection successful!')
      } else {
        toast.error('Connection failed')
      }
    } catch (error) {
      toast.error('Connection failed')
    }
  }

  const handleTestMicrosoft365 = async () => {
    try {
      const backendUrl = window.electronAPI ? await window.electronAPI.getBackendUrl() : 'http://localhost:8000'
      
      const response = await fetch(`${backendUrl}/microsoft/test-connection`)
      if (response.ok) {
        toast.success('Microsoft 365 connection successful!')
      } else {
        toast.error('Microsoft 365 connection failed')
      }
    } catch (error) {
      toast.error('Microsoft 365 connection failed')
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center">
        <SettingsIcon className="w-8 h-8 text-gray-600 mr-3" />
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Server className="w-5 h-5 mr-2" />
          Connection Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Backend Server</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              backendStatus 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {backendStatus ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Internet Connection</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Server Control */}
      <ServerControl 
        backendStatus={backendStatus}
        isOnline={isOnline}
        onServerToggle={checkConnectionStatus}
      />

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                id="company_name"
                name="company_name"
                value={settings.company_name}
                onChange={handleInputChange}
                required
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="company_email" className="block text-sm font-medium text-gray-700 mb-2">
                Company Email *
              </label>
              <input
                type="email"
                id="company_email"
                name="company_email"
                value={settings.company_email}
                onChange={handleInputChange}
                required
                className="input-field"
              />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="company_address" className="block text-sm font-medium text-gray-700 mb-2">
              Company Address
            </label>
            <textarea
              id="company_address"
              name="company_address"
              value={settings.company_address}
              onChange={handleInputChange}
              rows={3}
              className="textarea-field"
            />
          </div>
          <div className="mt-4">
            <label htmlFor="company_phone" className="block text-sm font-medium text-gray-700 mb-2">
              Company Phone
            </label>
            <input
              type="tel"
              id="company_phone"
              name="company_phone"
              value={settings.company_phone}
              onChange={handleInputChange}
              className="input-field"
            />
          </div>
        </div>

        {/* Regional Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Regional Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="default_currency" className="block text-sm font-medium text-gray-700 mb-2">
                Default Currency
              </label>
              <select
                id="default_currency"
                name="default_currency"
                value={settings.default_currency}
                onChange={handleInputChange}
                className="select-field"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
              </select>
            </div>
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                value={settings.timezone}
                onChange={handleInputChange}
                className="select-field"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
            <div>
              <label htmlFor="date_format" className="block text-sm font-medium text-gray-700 mb-2">
                Date Format
              </label>
              <select
                id="date_format"
                name="date_format"
                value={settings.date_format}
                onChange={handleInputChange}
                className="select-field"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notification Settings
          </h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="notification_email"
                name="notification_email"
                checked={settings.notification_email}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="notification_email" className="ml-3 text-sm text-gray-700">
                Enable email notifications
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="notification_low_stock"
                name="notification_low_stock"
                checked={settings.notification_low_stock}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="notification_low_stock" className="ml-3 text-sm text-gray-700">
                Notify when inventory is low
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="notification_payment_reminder"
                name="notification_payment_reminder"
                checked={settings.notification_payment_reminder}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="notification_payment_reminder" className="ml-3 text-sm text-gray-700">
                Send payment reminders
              </label>
            </div>
          </div>
        </div>

        {/* Microsoft 365 Integration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Microsoft 365 Integration
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="microsoft_client_id" className="block text-sm font-medium text-gray-700 mb-2">
                Microsoft Client ID
              </label>
              <input
                type="text"
                id="microsoft_client_id"
                name="microsoft_client_id"
                value={settings.microsoft_client_id}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter your Microsoft Client ID"
              />
            </div>
            <div>
              <label htmlFor="microsoft_tenant_id" className="block text-sm font-medium text-gray-700 mb-2">
                Microsoft Tenant ID
              </label>
              <input
                type="text"
                id="microsoft_tenant_id"
                name="microsoft_tenant_id"
                value={settings.microsoft_tenant_id}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter your Microsoft Tenant ID"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleTestMicrosoft365}
                className="btn-secondary"
              >
                Test Connection
              </button>
              <a
                href="https://portal.azure.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                <Mail className="w-4 h-4 mr-1" />
                Get Microsoft 365 Credentials
              </a>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Advanced Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="backend_url" className="block text-sm font-medium text-gray-700 mb-2">
                Backend Server URL
              </label>
              <input
                type="url"
                id="backend_url"
                name="backend_url"
                value={settings.backend_url}
                onChange={handleInputChange}
                className="input-field"
                placeholder="http://localhost:8000"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="offline_mode"
                name="offline_mode"
                checked={settings.offline_mode}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="offline_mode" className="ml-3 text-sm text-gray-700">
                Enable offline mode (work without internet connection)
              </label>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleTestConnection}
                className="btn-secondary"
              >
                Test Backend Connection
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
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
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Settings