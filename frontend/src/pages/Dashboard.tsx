import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ChartBarIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  // Mock data - in real app, this would come from API
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        totalProducts: 150,
        totalBatches: 500,
        totalTraces: 2500,
        verifiedBatches: 480,
        activeSensors: 25,
        alerts: 3
      };
    }
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return [
        {
          id: 1,
          type: 'batch_verified',
          message: 'Batch BATCH001 has been verified',
          timestamp: '2 minutes ago',
          status: 'success'
        },
        {
          id: 2,
          type: 'sensor_alert',
          message: 'Temperature alert in Warehouse A',
          timestamp: '15 minutes ago',
          status: 'warning'
        },
        {
          id: 3,
          type: 'product_created',
          message: 'New product Smartphone Model X created',
          timestamp: '1 hour ago',
          status: 'info'
        }
      ];
    }
  });

  const StatCard = ({ title, value, icon: Icon, color }: {
    title: string;
    value: number;
    icon: React.ComponentType<any>;
    color: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );

  const ActivityItem = ({ activity }: { activity: any }) => (
    <div className="flex items-start space-x-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
      <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
        activity.status === 'success' ? 'bg-green-500' :
        activity.status === 'warning' ? 'bg-yellow-500' :
        'bg-blue-500'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{activity.timestamp}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Overview of your supply chain operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Products"
          value={stats?.totalProducts || 0}
          icon={CubeIcon}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Batches"
          value={stats?.totalBatches || 0}
          icon={ClipboardDocumentListIcon}
          color="bg-green-500"
        />
        <StatCard
          title="Total Traces"
          value={stats?.totalTraces || 0}
          icon={ChartBarIcon}
          color="bg-purple-500"
        />
        <StatCard
          title="Verified Batches"
          value={stats?.verifiedBatches || 0}
          icon={CheckCircleIcon}
          color="bg-emerald-500"
        />
        <StatCard
          title="Active Sensors"
          value={stats?.activeSensors || 0}
          icon={CpuChipIcon}
          color="bg-orange-500"
        />
        <StatCard
          title="Active Alerts"
          value={stats?.alerts || 0}
          icon={ExclamationTriangleIcon}
          color="bg-red-500"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {recentActivity?.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
            <CubeIcon className="h-5 w-5 mr-2" />
            Add Product
          </button>
          <button className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
            <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
            Create Batch
          </button>
          <button className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
            <CpuChipIcon className="h-5 w-5 mr-2" />
            View Sensors
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
