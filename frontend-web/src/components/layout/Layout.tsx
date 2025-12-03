import React, { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  CreditCard, 
  Users, 
  TrendingUp, 
  Settings, 
  LogOut,
  Bell,
  Briefcase,
  DollarSign,
  Building2,
  FileText,
  Wallet,
  ArrowRightLeft,
  UserCheck,
  Banknote,
  Shield,
  BarChart3,
  Search,
  Award,
  Menu,
  X
} from 'lucide-react';
import { UserInfo } from '../../services';

interface LayoutProps {
  children: ReactNode;
  user: UserInfo;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Base navigation items
  const baseNavigation = [
    { name: 'Tableau de bord', icon: Home, href: '/dashboard', roles: ['all'] },
    { name: 'Comptes Clients', icon: UserCheck, href: '/client-accounts', roles: ['all'] },
    { name: 'Administrateurs', icon: Shield, href: '/admin/accounts', roles: ['SuperAdmin', 'SystemAdmin'] },
    { name: 'Succursales', icon: Building2, href: '/branches', roles: ['SuperAdmin', 'Director', 'RegionalManager'] },
    { name: 'Comptes d\'épargne', icon: Wallet, href: '/savings', roles: ['all'] },
    { name: 'Comptes Courants', icon: UserCheck, href: '/current-accounts', roles: ['all'] },
    { name: 'Comptes d\'Épargne à Terme', icon: TrendingUp, href: '/term-savings', roles: ['all'] },
    { name: 'Microcrédits', icon: Banknote, href: '/loans', roles: ['all'] },
    { name: 'Change de devises', icon: DollarSign, href: '/currency-exchange/rates', roles: ['all'] },
    { name: 'Transferts Inter-Succursales', icon: ArrowRightLeft, href: '/transfers', roles: ['all'] },
    { name: 'Paie', icon: Briefcase, href: '/payroll', roles: ['all'] },
    { name: 'Transactions', icon: CreditCard, href: '/transactions', roles: ['all'] },
    { name: 'Rapports', icon: FileText, href: '/reports', roles: ['all'] },
  ];

  // Branch Reports (Manager/Supervisor only)
  const branchReportsNav = [
    { name: 'Rapports Succursale', icon: BarChart3, href: '/reports/branch', roles: ['Manager', 'BranchSupervisor', 'SuperAdmin', 'Director', 'Cashier'] },
  ];

  // SuperAdmin Reports
  const superAdminReportsNav = [
    { name: 'Tableau de Bord SuperAdmin', icon: Shield, href: '/admin/reports/dashboard', roles: ['SuperAdmin', 'Director'] },
    { name: 'Audit des Transactions', icon: Search, href: '/admin/reports/audit', roles: ['SuperAdmin', 'Director'] },
    { name: 'Comparaison Succursales', icon: Award, href: '/admin/reports/performance', roles: ['SuperAdmin', 'Director'] },
  ];

  // Settings
  const settingsNav = [
    { name: 'Paramètres', icon: Settings, href: '/settings', roles: ['all'] },
  ];

  // Combine navigation based on user role
  const allNavigation = [
    ...baseNavigation,
    ...branchReportsNav,
    ...superAdminReportsNav,
    ...settingsNav,
  ];

  // Filter navigation based on user role
  const navigation = allNavigation.filter(item => 
    item.roles.includes('all') || item.roles.includes(user.role)
  );

  const isCurrentPath = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href) && href !== '#';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo with close button on mobile */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">NC</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-gray-900">Nala Kredi</p>
                <p className="text-xs text-gray-500">Ti Machann</p>
              </div>
            </div>
            {/* Close button - only visible on mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-thin">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isCurrent = isCurrentPath(item.href);
              
              if (item.href === '#') {
                return (
                  <a
                    key={item.name}
                    href="#"
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <Icon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                    <span className="truncate">{item.name}</span>
                  </a>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${isCurrent
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon
                    className={`
                      mr-3 flex-shrink-0 h-5 w-5
                      ${isCurrent ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info - Fixed at bottom */}
          <div className="border-t px-4 py-4 flex-shrink-0">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.role}</p>
                {user.branchName && (
                  <p className="text-xs text-primary-600 truncate">{user.branchName}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-30">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Spacer for mobile */}
              <div className="lg:hidden flex-1" />

              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Notifications */}
                <button className="p-2 text-gray-400 hover:text-gray-500 relative">
                  <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                    3
                  </span>
                </button>

                {/* Branch info - hidden on small screens */}
                {user.branchName && (
                  <div className="hidden md:flex items-center px-3 py-1 bg-primary-50 rounded-full">
                    <Building2 className="h-4 w-4 text-primary-600 mr-2" />
                    <span className="text-sm font-medium text-primary-800">{user.branchName}</span>
                  </div>
                )}

                {/* User info with dropdown */}
                <div className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </span>
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                  </div>

                  {/* Logout button */}
                  <button
                    onClick={onLogout}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Déconnexion"
                  >
                    <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;