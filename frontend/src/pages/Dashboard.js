import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Package, Users, AlertTriangle, DollarSign, RefreshCw, Info, AlertCircle } from 'lucide-react';
import { dashboardService } from '../services/api';
import Chart from '../components/Chart';
import { useResponsive, ResponsiveGrid, ResponsiveCard, TouchFriendlyButton } from '../components/Responsive/ResponsiveUtils';
import { VisuallyHidden } from '../components/Accessibility/A11yUtils';

const Dashboard = () => {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const { isMobile, isTablet } = useResponsive();
  
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery(
    'dashboard-stats',
    dashboardService.getStats,
    {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const { data: inventoryTrends, isLoading: trendsLoading, error: trendsError } = useQuery(
    'inventory-trends',
    dashboardService.getInventoryTrends,
    {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    }
  );

  const { data: attendanceStats, isLoading: attendanceLoading, error: attendanceError } = useQuery(
    'attendance-stats',
    dashboardService.getAttendanceStats,
    {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    }
  );

  const handleRefresh = () => {
    refetchStats();
    setLastRefresh(new Date());
  };

  if (statsLoading || trendsLoading || attendanceLoading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-live="polite">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" aria-hidden="true"></div>
          <p className="text-gray-600">Loading your dashboard data...</p>
          <VisuallyHidden>Dashboard data is loading</VisuallyHidden>
        </div>
      </div>
    );
  }

  // Error state
  if (statsError || trendsError || attendanceError) {
    return (
      <div className="flex items-center justify-center h-64" role="alert">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Dashboard</h3>
          <p className="text-gray-600 mb-4">
            We're having trouble connecting to the server. Please check your internet connection and try again.
          </p>
          <TouchFriendlyButton
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Try Again
          </TouchFriendlyButton>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Products',
      value: stats?.data?.totalProducts || 0,
      icon: Package,
      color: 'blue',
      change: '+12%',
      changeType: 'increase',
      description: 'Total number of products in your inventory'
    },
    {
      title: 'Low Stock Items',
      value: stats?.data?.lowStockItems || 0,
      icon: AlertTriangle,
      color: 'yellow',
      change: '-5%',
      changeType: 'decrease',
      description: 'Items that need restocking soon'
    },
    {
      title: 'Active Employees',
      value: stats?.data?.activeEmployees || 0,
      icon: Users,
      color: 'green',
      change: '+3%',
      changeType: 'increase',
      description: 'Currently active employees in your organization'
    },
    {
      title: 'Monthly Payments',
      value: `$${stats?.data?.monthlyPayments || 0}`,
      icon: DollarSign,
      color: 'purple',
      change: '+8%',
      changeType: 'increase',
      description: 'Total payments processed this month'
    }
  ];

  return (
    <div className="space-y-6">
      <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'justify-between items-center'}`}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your business today.</p>
        </div>
        <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center space-x-4'}`}>
          <TouchFriendlyButton
            onClick={handleRefresh}
            className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Refresh
          </TouchFriendlyButton>
          <div className="text-sm text-gray-500" aria-live="polite">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <ResponsiveGrid columns={isMobile ? 1 : isTablet ? 2 : 4} gap={6}>
        {statCards.map((card, index) => (
          <ResponsiveCard key={index} {...card} />
        ))}
      </ResponsiveGrid>

      {/* Charts */}
      <ResponsiveGrid columns={isMobile ? 1 : 2} gap={6}>
        <ResponsiveCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Inventory Trends
              </h3>
              <p className="text-sm text-gray-600">Track your stock levels over time</p>
            </div>
            <Info className="h-5 w-5 text-gray-400" title="Shows how your inventory levels have changed over the past months" aria-hidden="true" />
          </div>
          {inventoryTrends?.data && inventoryTrends.data.length > 0 ? (
            <Chart 
              data={inventoryTrends.data} 
              type="line" 
              height={isMobile ? 250 : 300}
              aria-label="Inventory trends chart"
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500" role="status">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" aria-hidden="true" />
                <p>No inventory data available yet</p>
                <p className="text-sm">Add some products to see trends here</p>
              </div>
            </div>
          )}
        </ResponsiveCard>
        
        <ResponsiveCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Attendance Overview
              </h3>
              <p className="text-sm text-gray-600">Employee attendance distribution</p>
            </div>
            <Info className="h-5 w-5 text-gray-400" title="Shows the percentage of employees who were present, late, or absent" aria-hidden="true" />
          </div>
          {attendanceStats?.data && attendanceStats.data.length > 0 ? (
            <Chart 
              data={attendanceStats.data} 
              type="pie" 
              height={isMobile ? 250 : 300}
              aria-label="Employee attendance distribution chart"
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500" role="status">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" aria-hidden="true" />
                <p>No attendance data available yet</p>
                <p className="text-sm">Start tracking employee attendance to see insights here</p>
              </div>
            </div>
          )}
        </ResponsiveCard>
      </ResponsiveGrid>

      {/* Recent Activity */}
      <ResponsiveCard>
        <div className={`${isMobile ? 'px-4 py-3' : 'px-6 py-4'} border-b border-gray-200`}>
          <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center justify-between'}`}>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Activity
              </h3>
              <p className="text-sm text-gray-600">Latest updates from your business</p>
            </div>
            <TouchFriendlyButton className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              View All Activity
            </TouchFriendlyButton>
          </div>
        </div>
        <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="space-y-4">
            {/* Sample activities - in a real app, these would come from an API */}
            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center" aria-hidden="true">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">New product "Office Chair" added to inventory</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center" aria-hidden="true">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Employee John Doe marked present for today</p>
                <p className="text-xs text-gray-500">3 hours ago</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center" aria-hidden="true">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Low stock alert: Printer Paper (only 5 units left)</p>
                <p className="text-xs text-gray-500">5 hours ago</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <TouchFriendlyButton className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              View Complete Activity Log
            </TouchFriendlyButton>
          </div>
        </div>
      </ResponsiveCard>
    </div>
  );
};

export default Dashboard;