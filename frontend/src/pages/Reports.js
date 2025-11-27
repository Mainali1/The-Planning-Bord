import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { BarChart3, Download, Calendar, Filter } from 'lucide-react';
import Chart from '../components/Chart';
import { dashboardService } from '../services/api';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('inventory');
  const [dateRange, setDateRange] = useState('month');

  const { data: inventoryTrends } = useQuery('inventory-trends', dashboardService.getInventoryTrends);
  const { data: attendanceStats } = useQuery('attendance-stats', dashboardService.getAttendanceStats);
  const { data: paymentStats } = useQuery('payment-stats', dashboardService.getPaymentStats);

  const handleExport = (format) => {
    // Export functionality will be implemented here
    alert(`Exporting ${selectedReport} report as ${format}`);
  };

  const renderReport = () => {
    switch (selectedReport) {
      case 'inventory':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Trends</h3>
              <Chart data={inventoryTrends?.data} type="line" height={300} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Levels</h3>
                <Chart data={inventoryTrends?.data} type="pie" height={250} />
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Alerts</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium text-red-800">Product A</span>
                    <span className="text-sm text-red-600">5 units remaining</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm font-medium text-yellow-800">Product B</span>
                    <span className="text-sm text-yellow-600">12 units remaining</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'attendance':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Overview</h3>
              <Chart data={attendanceStats?.data} type="pie" height={300} />
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Attendance Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">85%</div>
                  <div className="text-sm text-green-800">Present</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">10%</div>
                  <div className="text-sm text-yellow-800">Late</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">5%</div>
                  <div className="text-sm text-red-800">Absent</div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'financial':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Distribution</h3>
              <Chart data={paymentStats?.data} type="pie" height={300} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Expenses</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Supplier Payments</span>
                    <span className="text-sm font-medium text-gray-900">$12,500</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Salaries</span>
                    <span className="text-sm font-medium text-gray-900">$45,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Other Expenses</span>
                    <span className="text-sm font-medium text-gray-900">$3,200</span>
                  </div>
                  <hr className="my-3" />
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-sm text-gray-900">Total</span>
                    <span className="text-sm text-gray-900">$60,700</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Trends</h3>
                <Chart data={paymentStats?.data} type="line" height={250} />
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
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="flex space-x-4">
        <button
          onClick={() => setSelectedReport('inventory')}
          className={`px-4 py-2 rounded-lg font-medium ${
            selectedReport === 'inventory'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <BarChart3 className="inline h-4 w-4 mr-2" />
          Inventory Reports
        </button>
        <button
          onClick={() => setSelectedReport('attendance')}
          className={`px-4 py-2 rounded-lg font-medium ${
            selectedReport === 'attendance'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Calendar className="inline h-4 w-4 mr-2" />
          Attendance Reports
        </button>
        <button
          onClick={() => setSelectedReport('financial')}
          className={`px-4 py-2 rounded-lg font-medium ${
            selectedReport === 'financial'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <DollarSign className="inline h-4 w-4 mr-2" />
          Financial Reports
        </button>
      </div>

      {/* Report Content */}
      {renderReport()}
    </div>
  );
};

export default Reports;