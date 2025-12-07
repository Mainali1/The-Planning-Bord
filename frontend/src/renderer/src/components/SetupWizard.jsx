import React, { useState } from 'react';
import { ChevronRight, Check, AlertCircle, Eye, EyeOff, Settings, Mail, Shield, Database } from 'lucide-react';

const SetupWizard = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    licenseKey: '',
    companyName: '',
    adminEmail: '',
    adminPassword: '',
    serverMode: 'local', // 'local' or 'cloud'
    cloudServerUrl: '',
    cloudApiKey: '',
    ms365ClientId: '',
    ms365TenantId: '',
    ms365ClientSecret: '',
    enableNotifications: true,
    enableInventory: true,
    enableEmployees: true,
    enableFinance: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const steps = [
    { title: 'License Agreement', icon: Shield },
    { title: 'License Key', icon: Settings },
    { title: 'Company Setup', icon: Settings },
    { title: 'Server Configuration', icon: Database },
    { title: 'Microsoft 365 Integration', icon: Mail },
    { title: 'Features Setup', icon: Settings },
    { title: 'Complete', icon: Check }
  ];

  const handleNext = () => {
    if (validateCurrentStep()) {
      setError('');
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: // License Key
        if (!formData.licenseKey.trim()) {
          setError('Please enter a valid license key');
          return false;
        }
        return true;
      case 2: // Company Setup
        if (!formData.companyName.trim() || !formData.adminEmail.trim() || !formData.adminPassword) {
          setError('Please fill in all required fields');
          return false;
        }
        if (formData.adminPassword.length < 8) {
          setError('Password must be at least 8 characters long');
          return false;
        }
        return true;
      case 3: // Server Configuration
        if (formData.serverMode === 'cloud' && !formData.cloudServerUrl.trim()) {
          setError('Please enter the cloud server URL');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Save configuration
      const response = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      onComplete(formData);
    } catch (err) {
      setError(err.message || 'Failed to complete setup');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // License Agreement
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to The Planning Bord</h2>
              <p className="text-gray-600 mb-6">
                This is proprietary business management software. Please read and accept the license agreement to continue.
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto text-sm text-gray-700">
              <p className="font-semibold mb-2">THE PLANNING BORD - PROPRIETARY SOFTWARE LICENSE</p>
              <p className="mb-2">Copyright (c) 2024 The Planning Bord. All rights reserved.</p>
              <p className="mb-2">
                This is a proprietary software product. By installing, copying, or otherwise using this software, 
                you agree to be bound by the terms of this license agreement.
              </p>
              <p className="mb-2">
                You shall not modify, adapt, translate, or create derivative works based on the software, 
                reverse engineer, decompile, disassemble, or attempt to discover the source code.
              </p>
              <p>
                The software and all intellectual property rights therein are and shall remain the sole 
                and exclusive property of The Planning Bord.
              </p>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="accept-license"
                className="mr-2"
                onChange={(e) => setFormData({...formData, acceptLicense: e.target.checked})}
              />
              <label htmlFor="accept-license" className="text-sm text-gray-700">
                I accept the terms of the license agreement
              </label>
            </div>
          </div>
        );

      case 1: // License Key
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Enter License Key</h2>
              <p className="text-gray-600 mb-6">
                Please enter your license key to activate The Planning Bord.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License Key *
              </label>
              <input
                type="text"
                value={formData.licenseKey}
                onChange={(e) => setFormData({...formData, licenseKey: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="XXXX-XXXX-XXXX-XXXX"
              />
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Need help?</p>
                  <p>Contact support@planningbord.com if you need assistance with your license key.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 2: // Company Setup
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Company Information</h2>
              <p className="text-gray-600 mb-6">
                Set up your company profile and create the administrator account.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your Company Name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Administrator Email *
                </label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@yourcompany.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Administrator Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Minimum 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 3: // Server Configuration
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Server Configuration</h2>
              <p className="text-gray-600 mb-6">
                Choose how you want to run The Planning Bord - locally on your computer or connect to a cloud server.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                   onClick={() => setFormData({...formData, serverMode: 'local'})}
                   style={{
                     borderColor: formData.serverMode === 'local' ? '#3B82F6' : '#E5E7EB',
                     backgroundColor: formData.serverMode === 'local' ? '#EFF6FF' : 'white'
                   }}>
                <div className="flex items-center">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Local Server</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Run everything on your computer. Perfect for small businesses or testing.
                    </p>
                    <ul className="text-xs text-gray-500 mt-2 space-y-1">
                      <li>• No internet required</li>
                      <li>• All data stored locally</li>
                      <li>• Easy to set up</li>
                    </ul>
                  </div>
                  <div className="ml-4">
                    <div className={`w-4 h-4 rounded-full border-2 ${formData.serverMode === 'local' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                      {formData.serverMode === 'local' && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                   onClick={() => setFormData({...formData, serverMode: 'cloud'})}
                   style={{
                     borderColor: formData.serverMode === 'cloud' ? '#3B82F6' : '#E5E7EB',
                     backgroundColor: formData.serverMode === 'cloud' ? '#EFF6FF' : 'white'
                   }}>
                <div className="flex items-center">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Cloud Server</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Connect to a cloud server for multi-user access and automatic backups.
                    </p>
                    <ul className="text-xs text-gray-500 mt-2 space-y-1">
                      <li>• Access from anywhere</li>
                      <li>• Automatic backups</li>
                      <li>• Multi-user support</li>
                    </ul>
                  </div>
                  <div className="ml-4">
                    <div className={`w-4 h-4 rounded-full border-2 ${formData.serverMode === 'cloud' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                      {formData.serverMode === 'cloud' && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {formData.serverMode === 'cloud' && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cloud Server URL *
                  </label>
                  <input
                    type="url"
                    value={formData.cloudServerUrl}
                    onChange={(e) => setFormData({...formData, cloudServerUrl: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://your-server.planningbord.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={formData.cloudApiKey}
                    onChange={(e) => setFormData({...formData, cloudApiKey: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your API key (optional)"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 4: // Microsoft 365 Integration
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Microsoft 365 Integration</h2>
              <p className="text-gray-600 mb-6">
                Connect to Microsoft 365 for email notifications and calendar integration. This is optional but recommended.
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex">
                <Mail className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">What you'll get:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Automatic email notifications for low inventory</li>
                    <li>• Employee schedule reminders</li>
                    <li>• Financial report summaries</li>
                    <li>• Task assignment notifications</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Microsoft 365 Client ID
                </label>
                <input
                  type="text"
                  value={formData.ms365ClientId}
                  onChange={(e) => setFormData({...formData, ms365ClientId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="From Azure App Registration"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Microsoft 365 Tenant ID
                </label>
                <input
                  type="text"
                  value={formData.ms365TenantId}
                  onChange={(e) => setFormData({...formData, ms365TenantId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your Azure Tenant ID"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Microsoft 365 Client Secret
                </label>
                <input
                  type="password"
                  value={formData.ms365ClientSecret}
                  onChange={(e) => setFormData({...formData, ms365ClientSecret: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="From Azure App Registration"
                />
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Need help setting this up?</p>
                  <p>Contact your IT administrator or support@planningbord.com for assistance with Microsoft 365 integration.</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="skip-ms365"
                className="mr-2"
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData({
                      ...formData,
                      ms365ClientId: '',
                      ms365TenantId: '',
                      ms365ClientSecret: ''
                    });
                  }
                }}
              />
              <label htmlFor="skip-ms365" className="text-sm text-gray-700">
                Skip Microsoft 365 integration for now (you can set this up later)
              </label>
            </div>
          </div>
        );

      case 5: // Features Setup
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Choose Your Features</h2>
              <p className="text-gray-600 mb-6">
                Select which features you want to use. You can enable/disable these later in settings.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Inventory Management</h3>
                  <p className="text-sm text-gray-600">Track products, stock levels, and get low inventory alerts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableInventory}
                    onChange={(e) => setFormData({...formData, enableInventory: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Employee Management</h3>
                  <p className="text-sm text-gray-600">Manage employee records, schedules, and permissions</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableEmployees}
                    onChange={(e) => setFormData({...formData, enableEmployees: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Finance & Payments</h3>
                  <p className="text-sm text-gray-600">Track payments, generate invoices, and manage finances</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableFinance}
                    onChange={(e) => setFormData({...formData, enableFinance: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Email Notifications</h3>
                  <p className="text-sm text-gray-600">Receive alerts for important events and reminders</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableNotifications}
                    onChange={(e) => setFormData({...formData, enableNotifications: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        );

      case 6: // Complete
        return (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Setup Complete!</h2>
              <p className="text-gray-600 mb-6">
                You're all set! The Planning Bord is now configured and ready to use.
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg text-left">
              <h3 className="font-medium text-gray-900 mb-3">Your Configuration:</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Company: {formData.companyName}</li>
                <li>• Server Mode: {formData.serverMode === 'local' ? 'Local Server' : 'Cloud Server'}</li>
                <li>• Features: {[
                  formData.enableInventory && 'Inventory',
                  formData.enableEmployees && 'Employees',
                  formData.enableFinance && 'Finance',
                  formData.enableNotifications && 'Notifications'
                ].filter(Boolean).join(', ')}</li>
                <li>• Microsoft 365: {formData.ms365ClientId ? 'Connected' : 'Not connected'}</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">What's next?</p>
                  <p>Log in with your administrator account and start managing your business!</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">The Planning Bord Setup</h1>
            <span className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex space-x-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex-1">
                    <div className={`h-2 rounded-full ${
                      index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}></div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-between mt-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex flex-col items-center">
                    <Icon className={`w-4 h-4 ${
                      index <= currentStep ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <span className={`text-xs mt-1 ${
                      index <= currentStep ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {renderStepContent()}
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowe"
              >
                {isLoading ? 'Completing...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;