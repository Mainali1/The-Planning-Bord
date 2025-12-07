import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { BarChart3, Download, Calendar, DollarSign, AlertCircle, RefreshCw, Info, TrendingUp } from 'lucide-react';
import Chart from '../components/Chart';
import { dashboardService } from '../services/api';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('inventory');
  const [dateRange, setDateRange] = useState('month');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { 
    data: inventoryTrends, 
    isLoading: inventoryLoading, 
    error: inventoryError, 
    refetch: refetchInventory 
  } = useQuery('inventory-trends', dashboardService.getInventoryTrends, {
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
  
  const { 
    data: attendanceStats, 
    isLoading: attendanceLoading, 
    error: attendanceError, 
    refetch: refetchAttendance 
  } = useQuery('attendance-stats', dashboardService.getAttendanceStats, {
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
  
  const { 
    data: paymentStats, 
    isLoading: paymentLoading, 
    error: paymentError, 
    refetch: refetchPayment 
  } = useQuery('payment-stats', dashboardService.getPaymentStats, {
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const handleExport = (format) => {
    // Show user-friendly export notification
    const formatName = format.toUpperCase();
    alert(`Exporting ${selectedReport} report as ${formatName}...\n\nThis feature will be available soon. Your data will be exported securely.`);
  };

  const handleRefresh = () => {
    refetchInventory();
    refetchAttendance();
    refetchPayment();
    setLastRefresh(new Date());
  };

  // Loading state
  if (inventoryLoading || attendanceLoading || paymentLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your reports...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (inventoryError || attendanceError || paymentError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Reports</h3>
          <p className="text-gray-600 mb-4">
            We're having trouble loading your reports. This might be due to missing credentials or connection issues.
          </p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const renderReport = () => {
    switch (selectedReport) {
      case 'inventory':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Inventory Trends</h3>
                  <p className="text-sm text-gray-600">Track your stock levels over time</p>
                </div>
                <Info className="h-5 w-5 text-gray-400" title="Shows how your inventory levels have changed over time" />
              </div>
              {inventoryTrends?.data && inventoryTrends.data.length > 0 ? (
                <Chart data={inventoryTrends.data} type="line" height={300} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No inventory data available</p>
                    <p className="text-sm">Add some products to see trends here</p>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Stock Levels</h3>
                    <p className="text-sm text-gray-600">Current inventory distribution</p>
                  </div>
                  <Info className="h-5 w-5 text-gray-400" title="Shows the distribution of your current stock levels" />
                </div>
                {inventoryTrends?.data && inventoryTrends.data.length > 0 ? (
                  <Chart data={inventoryTrends.data} type="pie" height={250} />
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No stock level data</p>
                      <p className="text-sm">Add products to see distribution</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
                    <p className="text-sm text-gray-600">Items that need restocking</p>
                  </div>
                  <Info className="h-5 w-5 text-gray-400" title="Shows products with low stock levels that need attention" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="text-sm font-medium text-red-800">Product A</span>
                    <span className="text-sm text-red-600">5 units remaining</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <span className="text-sm font-medium text-yellow-800">Product B</span>
                    <span className="text-sm text-yellow-600">12 units remaining</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-800">No other low stock items</span>
                    <span className="text-sm text-gray-600">All good!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'attendance':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Attendance Overview</h3>
                  <p className="text-sm text-gray-600">Employee attendance distribution</p>
                </div>
                <Info className="h-5 w-5 text-gray-400" title="Shows the percentage of employees who were present, late, or absent" />
              </div>
              {attendanceStats?.data && attendanceStats.data.length > 0 ? (
                <Chart data={attendanceStats.data} type="pie" height={300} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No attendance data available</p>
                    <p className="text-sm">Start tracking attendance to see insights here</p>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Monthly Attendance Summary</h3>
                  <p className="text-sm text-gray-600">Key attendance metrics for this month</p>
                </div>
                <Info className="h-5 w-5 text-gray-400" title="Summary of employee attendance patterns for the current month" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 mr-1" />
                    85%
                  </div>
                  <div className="text-sm text-green-800">Present</div>
                  <div className="text-xs text-green-600 mt-1">Most employees on time</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-600">10%</div>
                  <div className="text-sm text-yellow-800">Late</div>
                  <div className="text-xs text-yellow-600 mt-1">Minor delays</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-600">5%</div>
                  <div className="text-sm text-red-800">Absent</div>
                  <div className="text-xs text-red-600 mt-1">Requires attention</div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'financial':
        return (
          <div className="space-y-6">
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-semibold text-gray-900">$85,200</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100 text-green-600">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-sm font-medium text-green-600">+12%</span>
                  <span className="text-sm text-gray-500 ml-2">from last month</span>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-semibold text-gray-900">$60,700</p>
                  </div>
                  <div className="p-3 rounded-full bg-red-100 text-red-600">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-sm font-medium text-red-600">+5%</span>
                  <span className="text-sm text-gray-500 ml-2">from last month</span>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Net Profit</p>
                    <p className="text-2xl font-semibold text-gray-900">$24,500</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-sm font-medium text-green-600">+18%</span>
                  <span className="text-sm text-gray-500 ml-2">from last month</span>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                    <p className="text-2xl font-semibold text-gray-900">28.8%</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-sm font-medium text-green-600">+3.2%</span>
                  <span className="text-sm text-gray-500 ml-2">from last month</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Payment Distribution</h3>
                  <p className="text-sm text-gray-600">How your payments are distributed across categories</p>
                </div>
                <Info className="h-5 w-5 text-gray-400" title="Shows the breakdown of your payments by category" />
              </div>
              {paymentStats?.data && paymentStats.data.length > 0 ? (
                <Chart data={paymentStats.data} type="pie" height={300} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <DollarSign className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No payment data available</p>
                    <p className="text-sm">Start recording payments to see distribution</p>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Monthly Expenses</h3>
                    <p className="text-sm text-gray-600">Breakdown of your monthly expenses</p>
                  </div>
                  <Info className="h-5 w-5 text-gray-400" title="Detailed breakdown of your monthly business expenses" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Supplier Payments</span>
                    <span className="text-sm font-medium text-gray-900">$12,500</span>
                  </div>
                  <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Salaries</span>
                    <span className="text-sm font-medium text-gray-900">$45,000</span>
                  </div>
                  <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Other Expenses</span>
                    <span className="text-sm font-medium text-gray-900">$3,200</span>
                  </div>
                  <hr className="my-3" />
                  <div className="flex justify-between items-center font-semibold p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-900">Total Expenses</span>
                    <span className="text-sm text-gray-900">$60,700</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Expense Trends</h3>
                    <p className="text-sm text-gray-600">How your expenses change over time</p>
                  </div>
                  <Info className="h-5 w-5 text-gray-400" title="Shows trends in your business expenses over time" />
                </div>
                {paymentStats?.data && paymentStats.data.length > 0 ? (
                  <Chart data={paymentStats.data} type="line" height={250} />
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <DollarSign className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No expense trend data</p>
                      <p className="text-sm">Record more payments to see trends</p>
                    </div>
                  </div>
                )}
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
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Generate detailed reports to understand your business performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
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
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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