import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Check, Building, User, Settings, Database } from 'lucide-react';

const SetupWizard = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    companyType: '',
    adminUsername: '',
    adminPassword: '',
    adminEmail: '',
    databaseType: 'sqlite',
    backupSchedule: 'daily',
    enableCloudSync: false,
    licenseKey: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const steps = [
    { id: 1, title: 'Company Information', icon: Building },
    { id: 2, title: 'Admin Account', icon: User },
    { id: 3, title: 'System Settings', icon: Settings },
    { id: 4, title: 'Database Setup', icon: Database },
    { id: 5, title: 'Review & Complete', icon: Check }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const validateStep = () => {
    setError('');
    
    switch (currentStep) {
      case 1:
        if (!formData.companyName.trim()) {
          setError('Company name is required');
          return false;
        }
        if (!formData.companyType) {
          setError('Please select your business type');
          return false;
        }
        break;
      case 2:
        if (!formData.adminUsername.trim() || formData.adminUsername.length < 3) {
          setError('Username must be at least 3 characters');
          return false;
        }
        if (!formData.adminPassword || formData.adminPassword.length < 6) {
          setError('Password must be at least 6 characters');
          return false;
        }
        if (!formData.adminEmail || !formData.adminEmail.includes('@')) {
          setError('Please enter a valid email address');
          return false;
        }
        break;
      case 3:
        if (!formData.licenseKey.trim()) {
          setError('License key is required');
          return false;
        }
        break;
      default:
        return true;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Submit setup data to backend
      const response = await fetch('http://localhost:8000/api/setup/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        if (onComplete) {
          onComplete(result);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Setup failed. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check if the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type *
              </label>
              <select
                value={formData.companyType}
                onChange={(e) => handleInputChange('companyType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select your business type</option>
                <option value="retail">Retail Store</option>
                <option value="restaurant">Restaurant</option>
                <option value="service">Service Business</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="wholesale">Wholesale</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Address
              </label>
              <textarea
                value={formData.companyAddress || ''}
                onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your business address"
                rows="3"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Username *
              </label>
              <input
                type="text"
                value={formData.adminUsername}
                onChange={(e) => handleInputChange('adminUsername', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Choose a username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Password *
              </label>
              <input
                type="password"
                value={formData.adminPassword}
                onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Choose a strong password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email *
              </label>
              <input
                type="email"
                value={formData.adminEmail}
                onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@yourcompany.com"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License Key *
              </label>
              <input
                type="text"
                value={formData.licenseKey}
                onChange={(e) => handleInputChange('licenseKey', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your license key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup Schedule
              </label>
              <select
                value={formData.backupSchedule}
                onChange={(e) => handleInputChange('backupSchedule', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableCloudSync"
                checked={formData.enableCloudSync}
                onChange={(e) => handleInputChange('enableCloudSync', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enableCloudSync" className="ml-2 block text-sm text-gray-700">
                Enable cloud synchronization
              </label>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Database Type
              </label>
              <select
                value={formData.databaseType}
                onChange={(e) => handleInputChange('databaseType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sqlite">SQLite (Recommended for small businesses)</option>
                <option value="postgresql">PostgreSQL (For larger businesses)</option>
                <option value="mysql">MySQL (Alternative option)</option>
              </select>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>Recommendation:</strong> SQLite is perfect for small to medium businesses. 
                It requires no additional setup and works great for up to 100,000 records.
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Review Your Settings</h3>
            <div className="bg-gray-50 rounded-md p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Company:</span>
                <span className="text-sm font-medium">{formData.companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Business Type:</span>
                <span className="text-sm font-medium capitalize">{formData.companyType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Admin User:</span>
                <span className="text-sm font-medium">{formData.adminUsername}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Database:</span>
                <span className="text-sm font-medium uppercase">{formData.databaseType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Backup:</span>
                <span className="text-sm font-medium capitalize">{formData.backupSchedule}</span>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> You can change these settings later in the admin panel.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg">
          <h1 className="text-2xl font-bold mb-2">Welcome to The Planning Bord</h1>
          <p className="text-blue-100">Let's get your business set up in just a few steps</p>
        </div>

        {/* Progress Bar */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    currentStep >= step.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="ml-2">
                    <p className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {renderStepContent()}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1 || isLoading}
              className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </button>
            
            {currentStep < steps.length ? (
              <button
                onClick={() => {
                  if (validateStep()) {
                    handleNext();
                  }
                }}
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  'Setting up...'
                ) : (
                  <>
                    Complete Setup
                    <Check className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;