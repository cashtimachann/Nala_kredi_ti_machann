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
  X,
  UserPlus
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
    { name: 'Gestion Caisse', icon: DollarSign, href: '/cash-management', roles: ['SuperAdmin', 'Director', 'RegionalManager'] },
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

  // Filter navigation based on user role, with curated menus for branch heads
  // Normalize role to catch synonyms (e.g., AssistantManager, Chef de Succursale)
  const roleNorm = (user.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const branchHeadRoleKeys = ['manager', 'branchsupervisor', 'assistantmanager', 'chefdesuccursale', 'branchmanager'];
  const isBranchHead = branchHeadRoleKeys.includes(roleNorm);
  const branchHeadDisplayRoles = [
    'Manager',
    'BranchSupervisor',
    'Branch Supervisor',
    'AssistantManager',
    'Assistant Manager',
    'ChefDeSuccursale',
    'Chef de Succursale',
    'BranchManager',
    'Branch Manager'
  ];
  const branchHeadCreateAdminNav = {
    name: 'Créer Admin Succursale',
    icon: UserPlus,
    href: '/admin/accounts',
    roles: branchHeadDisplayRoles
  };
  const navigationSource = isBranchHead ? [...allNavigation, branchHeadCreateAdminNav] : allNavigation;
  const displayBranchName = user.branchName;
  const allowedForBranchHead = new Set<string>([
    '/dashboard',
    '/client-accounts',
    '/savings',
    '/current-accounts',
    '/term-savings',
    '/loans',
    '/currency-exchange/rates',
    '/transfers',
    '/reports/branch',
    '/admin/accounts'
  ]);

  // Base role filter
  let navigation = navigationSource.filter(item => 
    item.roles.includes('all') || item.roles.includes(user.role)
  );

  // Apply role-specific curation for branch heads
  if (isBranchHead) {
    navigation = navigation.filter(item => allowedForBranchHead.has(item.href));
  }

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
        fixed inset-y-0 left-0 z-50 w-64 shadow-lg transform transition-transform duration-300 ease-in-out
        ${isBranchHead ? 'bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800' : 'bg-white'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo with close button on mobile */}
          <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${isBranchHead ? 'border-blue-500' : ''}`}>
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isBranchHead ? 'bg-white/20 backdrop-blur' : 'bg-primary-600'}`}>
                <span className={`font-bold text-sm ${isBranchHead ? 'text-white' : 'text-white'}`}>NC</span>
              </div>
              <div className="ml-3">
                <p className={`text-sm font-semibold ${isBranchHead ? 'text-white' : 'text-gray-900'}`}>Nala Kredi</p>
                <p className={`text-xs ${isBranchHead ? 'text-blue-200' : 'text-gray-500'}`}>Ti Machann</p>
              </div>
            </div>
            {/* Close button - only visible on mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className={`lg:hidden p-2 rounded-md transition-colors ${isBranchHead ? 'text-blue-200 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'}`}
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
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isBranchHead
                        ? 'text-blue-100 hover:bg-white/10 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isBranchHead ? 'text-blue-200 group-hover:text-white' : 'text-gray-400 group-hover:text-gray-500'}`} />
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
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all
                    ${isBranchHead
                      ? isCurrent
                        ? 'bg-white text-blue-700 shadow-lg'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                      : isCurrent
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon
                    className={`
                      mr-3 flex-shrink-0 h-5 w-5 transition-colors
                      ${isBranchHead
                        ? isCurrent
                          ? 'text-blue-700'
                          : 'text-blue-200 group-hover:text-white'
                        : isCurrent 
                          ? 'text-primary-500' 
                          : 'text-gray-400 group-hover:text-gray-500'
                      }
                    `}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info - Fixed at bottom */}
          <div className={`border-t px-4 py-4 flex-shrink-0 ${isBranchHead ? 'border-blue-500 bg-blue-900/30' : ''}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isBranchHead ? 'bg-white/20 backdrop-blur' : 'bg-primary-600'}`}>
                  <span className="text-sm font-medium text-white">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isBranchHead ? 'text-white' : 'text-gray-900'}`}>
                  {user.firstName} {user.lastName}
                </p>
                <p className={`text-xs truncate ${isBranchHead ? 'text-blue-200' : 'text-gray-500'}`}>{user.role}</p>
                {user.branchName && (
                  <p className={`text-xs truncate ${isBranchHead ? 'text-blue-300 font-medium' : 'text-primary-600'}`}>{user.branchName}</p>
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
              {/* Mobile menu button - Left side */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Center - Branch name for branch heads */}
              {isBranchHead && displayBranchName && (
                <div className="hidden lg:flex items-center justify-center flex-1">
                  <div className="flex items-center px-6 py-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 shadow-sm">
                    <Building2 className="h-5 w-5 text-blue-600 mr-3" />
                    <p className="text-sm font-bold text-blue-900 truncate whitespace-nowrap">Succursale :  {displayBranchName}</p>
                  </div>
                </div>
              )}

              {/* Empty spacer for desktop when not branch head */}
              {!isBranchHead && <div className="hidden lg:block flex-1" />}

              {/* Right side content */}
              <div className="flex items-center ml-auto space-x-2 sm:space-x-4">
                {/* Notifications */}
                <button className="p-2 text-gray-400 hover:text-gray-500 relative">
                  <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                    3
                  </span>
                </button>

                {/* Branch info - visible on small screens for branch heads */}
                {isBranchHead && displayBranchName && (
                  <div className="flex lg:hidden items-center px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
                    <Building2 className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-800 truncate whitespace-nowrap">(Succursale) {displayBranchName}</span>
                  </div>
                )}

                {/* Branch info - hidden on small screens (only for non-branch heads) */}
                {!isBranchHead && displayBranchName && (
                  <div className="hidden md:flex items-center px-3 py-1 bg-primary-50 rounded-full">
                    <Building2 className="h-4 w-4 text-primary-600 mr-2" />
                    <span className="text-sm font-medium text-primary-800 truncate whitespace-nowrap">(Succursale) {displayBranchName}</span>
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