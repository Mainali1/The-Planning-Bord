import React from 'react';
import MicrosoftIntegration from '../components/MicrosoftIntegration';

const Microsoft365 = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Microsoft 365 Integration</h1>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Integration Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2">📧 Outlook Email</h4>
            <p className="text-sm text-gray-600">Send emails directly through Outlook integration</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2">📅 Calendar Events</h4>
            <p className="text-sm text-gray-600">Create and manage calendar events</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2">☁️ OneDrive Storage</h4>
            <p className="text-sm text-gray-600">Upload and manage files in OneDrive</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2">📋 SharePoint Lists</h4>
            <p className="text-sm text-gray-600">Sync data with SharePoint lists</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2">💬 Teams Messaging</h4>
            <p className="text-sm text-gray-600">Send messages to Teams channels</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2">🔄 Business Sync</h4>
            <p className="text-sm text-gray-600">Sync inventory and employee data</p>
          </div>
        </div>
      </div>

      <MicrosoftIntegration />
    </div>
  );
};

export default Microsoft365;