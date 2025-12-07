import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Package, 
  Users, 
  CreditCard, 
  Settings, 
  BarChart3,
  Menu,
  X
} from 'lucide-react'

const Sidebar = ({ isOpen }) => {
  const location = useLocation()
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Employees', href: '/employees', icon: Users },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const isActive = (path) => {
    return location.pathname.startsWith(path)
  }

  return (
    <div className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
      <div className="flex items-center justify-between h-16 px-6 bg-gray-900">
        <h1 className="text-xl font-bold">Planning Bord</h1>
      </div>
      
      <nav className="mt-8">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                to={item.href}
                className={`${
                  isActive(item.href)
                    ? 'bg-gray-900 border-l-4 border-blue-500'
                    : 'hover:bg-gray-700'
                } flex items-center px-6 py-3 text-sm font-medium transition-colors duration-200`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export default Sidebar