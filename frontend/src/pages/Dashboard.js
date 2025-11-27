import React from 'react';
import { useQuery } from 'react-query';
import { Package, Users, AlertTriangle, DollarSign } from 'lucide-react';
import { dashboardService } from '../services/api';
import StatCard from '../components/StatCard';
import Chart from '../components/Chart';

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery(
    'dashboard-stats',
    dashboardService.getStats
  );

  const { data: inventoryTrends, isLoading: trendsLoading } = useQuery(
    'inventory-trends',
    dashboardService.getInventoryTrends
  );

  const { data: attendanceStats, isLoading: attendanceLoading } = useQuery(
    'attendance-stats',
    dashboardService.getAttendanceStats
  );

  if (statsLoading || trendsLoading || attendanceLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
      changeType: 'increase'
    },
    {
      title: 'Low Stock Items',
      value: stats?.data?.lowStockItems || 0,
      icon: AlertTriangle,
      color: 'yellow',
      change: '-5%',
      changeType: 'decrease'
    },
    {
      title: 'Active Employees',
      value: stats?.data?.activeEmployees || 0,
      icon: Users,
      color: 'green',
      change: '+3%',
      changeType: 'increase'
    },
    {
      title: 'Monthly Payments',
      value: `$${stats?.data?.monthlyPayments || 0}`,
      icon: DollarSign,
      color: 'purple',
      change: '+8%',
      changeType: 'increase'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Inventory Trends
          </h3>
          <Chart 
            data={inventoryTrends?.data || []} 
            type="line" 
            height={300}
          />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Attendance Overview
          </h3>
          <Chart 
            data={attendanceStats?.data || []} 
            type="pie" 
            height={300}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500 py-8">
            No recent activity to display
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;