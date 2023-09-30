import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  MapIcon,
  CpuChipIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: HomeIcon,
      current: location.pathname === '/'
    },
    {
      name: 'Products',
      href: '/products',
      icon: CubeIcon,
      current: location.pathname === '/products'
    },
    {
      name: 'Batches',
      href: '/batches',
      icon: ClipboardDocumentListIcon,
      current: location.pathname === '/batches'
    },
    {
      name: 'Traces',
      href: '/traces',
      icon: MapIcon,
      current: location.pathname === '/traces'
    },
    {
      name: 'IoT Sensors',
      href: '/iot',
      icon: CpuChipIcon,
      current: location.pathname === '/iot'
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: ChartBarIcon,
      current: location.pathname === '/analytics'
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      current: location.pathname === '/settings'
    }
  ];

  const tools = [
    {
      name: 'Documentation',
      href: '/docs',
      icon: DocumentTextIcon,
      current: location.pathname === '/docs'
    },
    {
      name: 'Security',
      href: '/security',
      icon: ShieldCheckIcon,
      current: location.pathname === '/security'
    },
    {
      name: 'QR Scanner',
      href: '/scanner',
      icon: QrCodeIcon,
      current: location.pathname === '/scanner'
    }
  ];

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        {/* Logo */}
        <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
            ChainTrace
          </span>
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {/* Main Navigation */}
            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Main
              </h3>
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    item.current
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors'
                  )}
                >
                  <item.icon
                    className={clsx(
                      item.current
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300',
                      'mr-3 flex-shrink-0 h-5 w-5'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Tools Section */}
            <div className="space-y-1 mt-8">
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tools
              </h3>
              {tools.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    item.current
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors'
                  )}
                >
                  <item.icon
                    className={clsx(
                      item.current
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300',
                      'mr-3 flex-shrink-0 h-5 w-5'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="space-y-1 mt-8">
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Quick Actions
              </h3>
              <div className="space-y-1">
                <button className="w-full text-left group flex items-center px-2 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors">
                  <div className="mr-3 flex-shrink-0 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">+</span>
                  </div>
                  Add Product
                </button>
                <button className="w-full text-left group flex items-center px-2 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors">
                  <div className="mr-3 flex-shrink-0 h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">+</span>
                  </div>
                  Create Batch
                </button>
                <button className="w-full text-left group flex items-center px-2 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors">
                  <div className="mr-3 flex-shrink-0 h-5 w-5 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">+</span>
                  </div>
                  Add Trace
                </button>
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                    CT
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    ChainTrace
                  </p>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">
                    v1.0.0
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
