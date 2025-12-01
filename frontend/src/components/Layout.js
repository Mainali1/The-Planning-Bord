import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Package, 
  Users, 
  DollarSign, 
  FileText, 
  Settings,
  LogOut,
  Briefcase,
  HelpCircle,
  Bell,
  User,
  ChevronDown,
  X,
  Info,
  Menu,
  X as CloseIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SkipLink } from '../components/Accessibility/A11yUtils';
import { useResponsive, ResponsiveNav, TouchFriendlyButton } from '../components/Responsive/ResponsiveUtils';

const Layout = ({ children }) => {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [showHelp, setShowHelp] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const helpRef = React.useRef(null);
  const notificationsRef = React.useRef(null);
  const userMenuRef = React.useRef(null);
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const menuItems = [
    { path: '/', icon: BarChart3, label: 'Dashboard', description: 'View business overview and key metrics' },
    { path: '/inventory', icon: Package, label: 'Inventory', description: 'Manage products and stock levels' },
    { path: '/employees', icon: Users, label: 'Employees', description: 'Manage staff and attendance' },
    { path: '/payments', icon: DollarSign, label: 'Payments', description: 'Track payments and expenses' },
    { path: '/reports', icon: FileText, label: 'Reports', description: 'Generate business reports and analytics' },
    { path: '/microsoft365', icon: Briefcase, label: 'Microsoft 365', description: 'Integrate with Microsoft services' },
    { path: '/settings', icon: Settings, label: 'Settings', description: 'Configure system settings' },
  ];

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showHelp && helpRef.current && !helpRef.current.contains(event.target)) {
        setShowHelp(false);
      }
      if (showNotifications && notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHelp, showNotifications, showUserMenu]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Skip to main content link for screen readers */}
      <SkipLink href="#main-content" />
      
      {/* Mobile menu overlay */}
      {(isMobile || isTablet) && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Sidebar */}
      <ResponsiveNav
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        className={`${(isMobile || isTablet) ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : ''} ${isDesktop ? 'w-64' : 'fixed inset-y-0 left-0 w-64 z-50'}`}
      >
        <div className="h-full bg-white shadow-lg flex flex-col">
          {/* Mobile menu button */}
          {(isMobile || isTablet) && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h1 className="text-lg font-bold text-gray-800">Planning Bord</h1>
              <TouchFriendlyButton
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
                className="p-2"
              >
                <CloseIcon className="h-5 w-5" />
              </TouchFriendlyButton>
            </div>
      </ResponsiveNav>
          )}
          
          <div className="p-6 flex-1">
        <div className="p-6 flex-1">
          <h1 className="text-2xl font-bold text-gray-800 mb-8">
            Planning Bord
          </h1>
          
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={item.description}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => (isMobile || isTablet) && setSidebarOpen(false)}
                >
                  <Icon className="mr-3 h-5 w-5" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="p-6 border-t border-gray-200">
          <TouchFriendlyButton
            onClick={logout}
            className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg w-full transition-colors"
            aria-label="Sign out of your account"
          >
            <LogOut className="mr-3 h-5 w-5" aria-hidden="true" />
            Logout
          </TouchFriendlyButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4 lg:px-8">
            {/* Mobile menu button */}
            {(isMobile || isTablet) && (
              <TouchFriendlyButton
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className="p-2 lg:hidden"
              >
                <Menu className="h-6 w-6" />
              </TouchFriendlyButton>
            )}
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
              </h2>
              <span className="text-sm text-gray-500">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Help Button */}
              <div className="relative" ref={helpRef}>
                <TouchFriendlyButton
                  onClick={() => setShowHelp(!showHelp)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Help & Support"
                  aria-expanded={showHelp}
                  aria-haspopup="true"
                >
                  <HelpCircle className="h-5 w-5" aria-hidden="true" />
                </TouchFriendlyButton>
                
                {showHelp && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50" role="dialog" aria-labelledby="help-title">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 id="help-title" className="font-semibold text-gray-900">Help & Support</h3>
                        <TouchFriendlyButton
                          onClick={() => setShowHelp(false)}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label="Close help"
                        >
                          <X className="h-4 w-4" />
                        </TouchFriendlyButton>
                      </div>
                      <div className="space-y-3 text-sm text-gray-600">
                        <div className="flex items-start space-x-2">
                          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">Getting Started</p>
                            <p>Visit the Settings page to configure your business information and integrations.</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">Need More Help?</p>
                            <p>Contact support at support@planningbord.com or call 1-800-HELP-NOW</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <TouchFriendlyButton
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors relative"
                  aria-label="Notifications (3 unread)"
                  aria-expanded={showNotifications}
                  aria-haspopup="true"
                >
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center" aria-hidden="true">
                    3
                  </span>
                </TouchFriendlyButton>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50" role="dialog" aria-labelledby="notifications-title">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 id="notifications-title" className="font-semibold text-gray-900">Notifications</h3>
                        <TouchFriendlyButton
                          onClick={() => setShowNotifications(false)}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label="Close notifications"
                        >
                          <X className="h-4 w-4" />
                        </TouchFriendlyButton>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="font-medium text-yellow-800">Low Stock Alert</p>
                          <p className="text-yellow-700">5 products are running low on stock</p>
                          <p className="text-xs text-yellow-600 mt-1">2 hours ago</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="font-medium text-blue-800">System Update</p>
                          <p className="text-blue-700">New features available in Settings</p>
                          <p className="text-xs text-blue-600 mt-1">1 day ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <TouchFriendlyButton
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label={`User menu for ${user?.email || 'User'}`}
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                >
                  <User className="h-5 w-5" aria-hidden="true" />
                  <span className="text-sm font-medium hidden sm:inline">{user?.email || 'User'}</span>
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </TouchFriendlyButton>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50" role="menu" aria-labelledby="user-menu">
                    <div className="py-1">
                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowUserMenu(false)}
                        role="menuitem"
                      >
                        Account Settings
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8" tabIndex="-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;