import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { microsoftService } from '../services/api';

const MicrosoftIntegration = () => {
  const [activeTab, setActiveTab] = useState('email');
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '', importance: 'normal' });
  const [eventForm, setEventForm] = useState({ subject: '', start: '', end: '', attendees: '', body: '' });
  const [file, setFile] = useState(null);
  const [teamsForm, setTeamsForm] = useState({ teamId: '', channelId: '', messageContent: '' });
  const queryClient = useQueryClient();

  const { data: status } = useQuery('microsoft-status', microsoftService.getStatus);

  const sendEmailMutation = useMutation(
    microsoftService.sendEmail,
    {
      onSuccess: () => {
        alert('Email sent successfully!');
        setEmailForm({ to: '', subject: '', body: '', importance: 'normal' });
      },
      onError: (error) => {
        alert('Failed to send email: ' + error.response?.data?.error);
      }
    }
  );

  const createEventMutation = useMutation(
    microsoftService.createCalendarEvent,
    {
      onSuccess: () => {
        alert('Calendar event created successfully!');
        setEventForm({ subject: '', start: '', end: '', attendees: '', body: '' });
      },
      onError: (error) => {
        alert('Failed to create calendar event: ' + error.response?.data?.error);
      }
    }
  );

  const uploadFileMutation = useMutation(
    microsoftService.uploadFile,
    {
      onSuccess: () => {
        alert('File uploaded successfully!');
        setFile(null);
      },
      onError: (error) => {
        alert('Failed to upload file: ' + error.response?.data?.error);
      }
    }
  );

  const sendTeamsMessageMutation = useMutation(
    microsoftService.sendTeamsMessage,
    {
      onSuccess: () => {
        alert('Teams message sent successfully!');
        setTeamsForm({ teamId: '', channelId: '', messageContent: '' });
      },
      onError: (error) => {
        alert('Failed to send Teams message: ' + error.response?.data?.error);
      }
    }
  );

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    sendEmailMutation.mutate(emailForm);
  };

  const handleEventSubmit = (e) => {
    e.preventDefault();
    const attendees = eventForm.attendees ? eventForm.attendees.split(',').map(email => email.trim()) : [];
    createEventMutation.mutate({ ...eventForm, attendees });
  };

  const handleFileUpload = (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    uploadFileMutation.mutate(formData);
  };

  const handleTeamsSubmit = (e) => {
    e.preventDefault();
    sendTeamsMessageMutation.mutate(teamsForm);
  };

  if (!status) return <div>Loading Microsoft 365 status...</div>;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Microsoft 365 Integration</h2>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${status.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {status.connected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['email', 'calendar', 'onedrive', 'teams'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'onedrive' ? 'OneDrive' : tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {activeTab === 'email' && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">To</label>
            <input
              type="email"
              value={emailForm.to}
              onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Body</label>
            <textarea
              value={emailForm.body}
              onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Importance</label>
            <select
              value={emailForm.importance}
              onChange={(e) => setEmailForm({ ...emailForm, importance: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={sendEmailMutation.isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {sendEmailMutation.isLoading ? 'Sending...' : 'Send Email'}
          </button>
        </form>
      )}

      {activeTab === 'calendar' && (
        <form onSubmit={handleEventSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={eventForm.subject}
              onChange={(e) => setEventForm({ ...eventForm, subject: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Time</label>
            <input
              type="datetime-local"
              value={eventForm.start}
              onChange={(e) => setEventForm({ ...eventForm, start: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Time</label>
            <input
              type="datetime-local"
              value={eventForm.end}
              onChange={(e) => setEventForm({ ...eventForm, end: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Attendees (comma-separated emails)</label>
            <input
              type="text"
              value={eventForm.attendees}
              onChange={(e) => setEventForm({ ...eventForm, attendees: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="email1@example.com, email2@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={eventForm.body}
              onChange={(e) => setEventForm({ ...eventForm, body: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={createEventMutation.isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {createEventMutation.isLoading ? 'Creating...' : 'Create Event'}
          </button>
        </form>
      )}

      {activeTab === 'onedrive' && (
        <form onSubmit={handleFileUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Select File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <button
            type="submit"
            disabled={uploadFileMutation.isLoading || !file}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {uploadFileMutation.isLoading ? 'Uploading...' : 'Upload to OneDrive'}
          </button>
        </form>
      )}

      {activeTab === 'teams' && (
        <form onSubmit={handleTeamsSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Team ID</label>
            <input
              type="text"
              value={teamsForm.teamId}
              onChange={(e) => setTeamsForm({ ...teamsForm, teamId: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Channel ID</label>
            <input
              type="text"
              value={teamsForm.channelId}
              onChange={(e) => setTeamsForm({ ...teamsForm, channelId: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Message</label>
            <textarea
              value={teamsForm.messageContent}
              onChange={(e) => setTeamsForm({ ...teamsForm, messageContent: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={sendTeamsMessageMutation.isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {sendTeamsMessageMutation.isLoading ? 'Sending...' : 'Send Teams Message'}
          </button>
        </form>
      )}
    </div>
  );
};

MicrosoftIntegration.propTypes = {};

export default MicrosoftIntegration;