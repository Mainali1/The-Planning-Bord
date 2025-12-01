import React, { useState, useEffect } from 'react';
import { Save, User, Bell, Shield, Mail, Database, Briefcase, Settings as SettingsIcon } from 'lucide-react';
import api from '../services/api';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: 'Admin User',
    email: 'admin@planningbord.com',
    role: 'Administrator'
  });
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    inventory: true,
    attendance: false,
    payments: true
  });
  const [security, setSecurity] = useState({
    twoFactor: false,
    passwordExpiry: 90,
    sessionTimeout: 30
  });
  const [businessSettings, setBusinessSettings] = useState({
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    businessAddress: ''
  });
  const [emailSettings, setEmailSettings] = useState({
    host: '',
    port: '587',
    user: '',
    pass: '',
    secure: false
  });
  const [microsoftSettings, setMicrosoftSettings] = useState({
    clientId: '',
    clientSecret: '',
    tenantId: '',
    userId: ''
  });
  const [settingsStatus, setSettingsStatus] = useState({
    emailConfigured: false,
    microsoftConfigured: false
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Fetch current settings
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setErrors({});
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success) {
        setSettingsStatus({
          emailConfigured: data.data.emailConfigured,
          microsoftConfigured: data.data.microsoftConfigured
        });
        setBusinessSettings({
          businessName: data.data.businessName || '',
          businessEmail: data.data.businessEmail || '',
          businessPhone: data.data.businessPhone || '',
          businessAddress: data.data.businessAddress || ''
        });
      } else {
        setErrors({ general: data.message || 'Failed to fetch settings' });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setErrors({ general: 'Unable to connect to server. Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateBusinessSettings = () => {
    const newErrors = {};
    if (!businessSettings.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    if (businessSettings.businessEmail && !validateEmail(businessSettings.businessEmail)) {
      newErrors.businessEmail = 'Please enter a valid email address';
    }
    if (businessSettings.businessPhone && !/^[+]?[\d\s\-\(\)]+$/.test(businessSettings.businessPhone)) {
      newErrors.businessPhone = 'Please enter a valid phone number';
    }
    return newErrors;
  };

  const validateEmailSettings = () => {
    const newErrors = {};
    if (!emailSettings.host.trim()) {
      newErrors.host = 'SMTP host is required';
    }
    if (!emailSettings.port || parseInt(emailSettings.port) <= 0) {
      newErrors.port = 'Valid port number is required';
    }
    if (!emailSettings.user.trim()) {
      newErrors.user = 'Username is required';
    }
    if (!emailSettings.pass.trim()) {
      newErrors.pass = 'Password is required';
    }
    return newErrors;
  };

  const validateMicrosoftSettings = () => {
    const newErrors = {};
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!microsoftSettings.clientId.trim()) {
      newErrors.clientId = 'Client ID is required';
    } else if (!guidRegex.test(microsoftSettings.clientId)) {
      newErrors.clientId = 'Client ID must be a valid GUID format';
    }
    
    if (!microsoftSettings.clientSecret.trim()) {
      newErrors.clientSecret = 'Client secret is required';
    }
    
    if (!microsoftSettings.tenantId.trim()) {
      newErrors.tenantId = 'Tenant ID is required';
    } else if (!guidRegex.test(microsoftSettings.tenantId)) {
      newErrors.tenantId = 'Tenant ID must be a valid GUID format';
    }
    
    return newErrors;
  };

  const handleSave = async (section) => {
    setSaving(true);
    setErrors({});
    
    try {
      let data = {};
      let validationErrors = {};
      
      switch (section) {
        case 'business':
          validationErrors = validateBusinessSettings();
          if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
          }
          data = { businessSettings };
          break;
        case 'email':
          validationErrors = validateEmailSettings();
          if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
          }
          data = { emailSettings };
          break;
        case 'microsoft':
          validationErrors = validateMicrosoftSettings();
          if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
          }
          data = { microsoftSettings };
          break;
        default:
          data = { profileData, notifications, security };
      }
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully!`);
        fetchSettings();
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setErrors({ general: `Failed to save settings: ${result.message || 'Please check your input and try again.'}` });
      }
    } catch (error) {
      console.error(`Error saving ${section} settings:`, error);
      setErrors({ general: `Unable to save settings. Please check your connection and try again.` });
    } finally {
      setSaving(false);
    }
  };

  const testEmailConnection = async () => {
    try {
      const response = await api.post('/settings/test-email', {
        to: emailSettings.user || 'test@example.com',
        subject: 'Test Email from Planning Bord',
        message: 'This is a test email to verify your email configuration is working correctly.'
      });
      
      if (response.data.success) {
        alert('Email test successful! Check your inbox for the test email.');
      } else {
        alert('Email test failed: ' + response.data.message);
      }
    } catch (error) {
      console.error('Email test error:', error);
      alert('Failed to test email connection. Please check your settings and try again.');
    }
  };

  const testMicrosoftConnection = async () => {
    try {
      const response = await api.post('/settings/test-microsoft');
      
      if (response.data.success) {
        alert('Microsoft 365 connection test successful!');
      } else {
        alert('Microsoft 365 test failed: ' + response.data.message);
      }
    } catch (error) {
      console.error('Microsoft test error:', error);
      alert('Failed to test Microsoft 365 connection. Please check your settings and try again.');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={profileData.role}
                    onChange={(e) => setProfileData({...profileData, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Manager">Manager</option>
                    <option value="Employee">Employee</option>
                  </select>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => handleSave('Profile')}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </button>
                {settingsStatus.microsoftConfigured && (
                  <button
                    onClick={() => testMicrosoftConnection()}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Test Microsoft 365
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">General Notifications</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={notifications.email}
                        onChange={(e) => setNotifications({...notifications, email: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Email notifications</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={notifications.sms}
                        onChange={(e) => setNotifications({...notifications, sms: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">SMS notifications</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={notifications.push}
                        onChange={(e) => setNotifications({...notifications, push: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Push notifications</span>
                    </label>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Business Notifications</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={notifications.inventory}
                        onChange={(e) => setNotifications({...notifications, inventory: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Inventory alerts</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={notifications.attendance}
                        onChange={(e) => setNotifications({...notifications, attendance: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Attendance alerts</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={notifications.payments}
                        onChange={(e) => setNotifications({...notifications, payments: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Payment alerts</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => handleSave('Notifications')}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Notifications
                </button>
                {settingsStatus.microsoftConfigured && (
                  <button
                    onClick={() => testMicrosoftConnection()}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Test Microsoft 365
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Authentication</h4>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={security.twoFactor}
                      onChange={(e) => setSecurity({...security, twoFactor: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable two-factor authentication</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password Expiry (days)
                    </label>
                    <select
                      value={security.passwordExpiry}
                      onChange={(e) => setSecurity({...security, passwordExpiry: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                      <option value={180}>180 days</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <select
                      value={security.sessionTimeout}
                      onChange={(e) => setSecurity({...security, sessionTimeout: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={120}>120 minutes</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => handleSave('Security')}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Security Settings
                </button>
              </div>
            </div>
          </div>
        );
      case 'business':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">🏢 Business Information Setup</h4>
                <p className="text-sm text-blue-800 mb-2">
                  This information will be used throughout the system for invoices, reports, and customer communications.
                </p>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• <strong>Business Name:</strong> Your company name as it should appear on documents</p>
                  <p>• <strong>Business Email:</strong> Primary contact email for customers</p>
                  <p>• <strong>Business Phone:</strong> Main contact number for customer inquiries</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
                  <input
                    type="text"
                    value={businessSettings.businessName}
                    onChange={(e) => setBusinessSettings({...businessSettings, businessName: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.businessName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your business name"
                  />
                  {errors.businessName && (
                    <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
                  <input
                    type="email"
                    value={businessSettings.businessEmail}
                    onChange={(e) => setBusinessSettings({...businessSettings, businessEmail: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.businessEmail ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="your@business.com"
                  />
                  {errors.businessEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.businessEmail}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Phone</label>
                  <input
                    type="tel"
                    value={businessSettings.businessPhone}
                    onChange={(e) => setBusinessSettings({...businessSettings, businessPhone: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.businessPhone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="+1 (555) 123-4567"
                  />
                  {errors.businessPhone && (
                    <p className="mt-1 text-sm text-red-600">{errors.businessPhone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Address</label>
                  <textarea
                    value={businessSettings.businessAddress}
                    onChange={(e) => setBusinessSettings({...businessSettings, businessAddress: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.businessAddress ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="123 Business St, City, State 12345"
                    rows="3"
                  />
                  {errors.businessAddress && (
                    <p className="mt-1 text-sm text-red-600">{errors.businessAddress}</p>
                  )}
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => handleSave('business')}
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Business Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      case 'email':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Email Configuration</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  settingsStatus.emailConfigured 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {settingsStatus.emailConfigured ? 'Configured' : 'Not Configured'}
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host *</label>
                  <input
                    type="text"
                    value={emailSettings.host}
                    onChange={(e) => setEmailSettings({...emailSettings, host: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.host ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="smtp.gmail.com"
                  />
                  {errors.host && (
                    <p className="mt-1 text-sm text-red-600">{errors.host}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port *</label>
                  <input
                    type="number"
                    value={emailSettings.port}
                    onChange={(e) => setEmailSettings({...emailSettings, port: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.port ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="587"
                  />
                  {errors.port && (
                    <p className="mt-1 text-sm text-red-600">{errors.port}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                  <input
                    type="text"
                    value={emailSettings.user}
                    onChange={(e) => setEmailSettings({...emailSettings, user: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.user ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="your@email.com"
                  />
                  {errors.user && (
                    <p className="mt-1 text-sm text-red-600">{errors.user}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <input
                    type="password"
                    value={emailSettings.pass}
                    onChange={(e) => setEmailSettings({...emailSettings, pass: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.pass ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Your email password or app password"
                  />
                  {errors.pass && (
                    <p className="mt-1 text-sm text-red-600">{errors.pass}</p>
                  )}
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={emailSettings.secure}
                      onChange={(e) => setEmailSettings({...emailSettings, secure: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Use secure connection (TLS/SSL)</span>
                  </label>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-900 mb-2">📧 Email Setup Guide</h4>
                  <div className="text-sm text-green-800 space-y-3">
                    <div>
                      <p className="font-medium">Common Email Providers:</p>
                      <ul className="mt-1 space-y-1 text-xs">
                        <li>• <strong>Gmail:</strong> smtp.gmail.com:587 (use app password)</li>
                        <li>• <strong>Outlook:</strong> smtp-mail.outlook.com:587</li>
                        <li>• <strong>Office 365:</strong> smtp.office365.com:587</li>
                      </ul>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                      <p className="text-xs text-yellow-800">
                        <strong>⚠️ Important:</strong> Most email providers now require "App Passwords" instead of your regular password. 
                        <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">Learn how to create app passwords</a>
                      </p>
                    </div>
                  </div>
                </div>
                {!settingsStatus.emailConfigured && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Email notifications and reports will be disabled until email is configured.
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => handleSave('email')}
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Email Settings
                    </>
                  )}
                </button>
                {settingsStatus.emailConfigured && (
                  <button
                    onClick={() => testEmailConnection()}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Test Email
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      case 'microsoft':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Microsoft 365 Integration</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  settingsStatus.microsoftConfigured 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {settingsStatus.microsoftConfigured ? 'Configured' : 'Not Configured'}
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client ID *</label>
                  <input
                    type="text"
                    value={microsoftSettings.clientId}
                    onChange={(e) => setMicrosoftSettings({...microsoftSettings, clientId: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.clientId ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  {errors.clientId && (
                    <p className="mt-1 text-sm text-red-600">{errors.clientId}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Secret *</label>
                  <input
                    type="password"
                    value={microsoftSettings.clientSecret}
                    onChange={(e) => setMicrosoftSettings({...microsoftSettings, clientSecret: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.clientSecret ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Your client secret"
                  />
                  {errors.clientSecret && (
                    <p className="mt-1 text-sm text-red-600">{errors.clientSecret}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tenant ID *</label>
                  <input
                    type="text"
                    value={microsoftSettings.tenantId}
                    onChange={(e) => setMicrosoftSettings({...microsoftSettings, tenantId: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.tenantId ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  {errors.tenantId && (
                    <p className="mt-1 text-sm text-red-600">{errors.tenantId}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User ID (Optional)</label>
                  <input
                    type="text"
                    value={microsoftSettings.userId}
                    onChange={(e) => setMicrosoftSettings({...microsoftSettings, userId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </div>
                {!settingsStatus.microsoftConfigured && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Microsoft 365 email and calendar integration will be disabled until configured.
                    </p>
                  </div>
                )}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">🔧 Setup Instructions</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Follow these steps to connect your Microsoft 365 account:
                  </p>
                  <ol className="text-sm text-blue-800 space-y-2">
                    <li>1. <strong>Go to Azure Portal</strong> - <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">Click here to open</a></li>
                    <li>2. <strong>Register Application</strong> - Click "Azure Active Directory" → "App registrations" → "New registration"</li>
                    <li>3. <strong>Add Permissions</strong> - Go to "API permissions" → "Add permission" → "Microsoft Graph" → "Application permissions"</li>
                    <li>4. <strong>Required Permissions:</strong>
                      <ul className="ml-4 mt-1 text-xs space-y-1">
                        <li>• Mail.Send (to send emails)</li>
                        <li>• Calendars.ReadWrite (for calendar events)</li>
                      </ul>
                    </li>
                    <li>5. <strong>Create Secret</strong> - Go to "Certificates & secrets" → "New client secret"</li>
                    <li>6. <strong>Copy credentials</strong> - Paste them here</li>
                  </ol>
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-yellow-800">
                      <strong>💡 Tip:</strong> Make sure to grant admin consent for the permissions after adding them.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => handleSave('microsoft')}
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Microsoft Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Configure your business information and integrations</p>
          
          {/* Configuration Status Overview */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border ${
              settingsStatus.businessConfigured 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${
                  settingsStatus.businessConfigured ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span className="text-sm font-medium">
                  {settingsStatus.businessConfigured ? '✅ Business Info' : '⚠️ Business Info'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {settingsStatus.businessConfigured 
                  ? 'Your business information is configured' 
                  : 'Add your business details to get started'
                }
              </p>
            </div>
            
            <div className={`p-4 rounded-lg border ${
              settingsStatus.emailConfigured 
                ? 'bg-green-50 border-green-200' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${
                  settingsStatus.emailConfigured ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-sm font-medium">
                  {settingsStatus.emailConfigured ? '✅ Email' : '⭕ Email'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {settingsStatus.emailConfigured 
                  ? 'Email notifications are enabled' 
                  : 'Email features are disabled'
                }
              </p>
            </div>
            
            <div className={`p-4 rounded-lg border ${
              settingsStatus.microsoftConfigured 
                ? 'bg-green-50 border-green-200' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${
                  settingsStatus.microsoftConfigured ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-sm font-medium">
                  {settingsStatus.microsoftConfigured ? '✅ Microsoft 365' : '⭕ Microsoft 365'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {settingsStatus.microsoftConfigured 
                  ? 'Microsoft 365 integration is active' 
                  : 'Microsoft 365 features are disabled'
                }
              </p>
            </div>
          </div>
        </div>
        {loading && (
          <div className="flex items-center text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
            Loading...
          </div>
        )}
      </div>

      {/* Error Display */}
)

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{success}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{errors.general}</p>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Settings Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="inline h-4 w-4 mr-2" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('business')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'business'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Briefcase className="inline h-4 w-4 mr-2" />
              Business
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'email'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Mail className="inline h-4 w-4 mr-2" />
              Email
            </button>
            <button
              onClick={() => setActiveTab('microsoft')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'microsoft'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="inline h-4 w-4 mr-2" />
              Microsoft 365
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Bell className="inline h-4 w-4 mr-2" />
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="inline h-4 w-4 mr-2" />
              Security
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
    </div>
  );
};

export default Settings;