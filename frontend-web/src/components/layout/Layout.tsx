import React, { ReactNode } from 'react';
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
  Shield
} from 'lucide-react';
import { UserInfo } from '../../services';

interface LayoutProps {
  children: ReactNode;
  user: UserInfo;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const location = useLocation();
  
  const navigation = [
    { name: 'Tableau de bord', icon: Home, href: '/dashboard' },
    { name: 'Comptes Clients', icon: UserCheck, href: '/client-accounts' },
    { name: 'Administrateurs', icon: Shield, href: '/admin/accounts' },
    { name: 'Succursales', icon: Building2, href: '/branches' },
    { name: 'Comptes d\'épargne', icon: Wallet, href: '/savings' },
    { name: 'Comptes Courants', icon: UserCheck, href: '/current-accounts' },
    { name: 'Comptes d\'Épargne à Terme', icon: TrendingUp, href: '/term-savings' },
    { name: 'Microcrédits', icon: Banknote, href: '/loans' },
    { name: 'Change de devises', icon: DollarSign, href: '/currency-exchange/rates' },
    { name: 'Transferts Inter-Succursales', icon: ArrowRightLeft, href: '/transfers' },
    { name: 'Paie', icon: Briefcase, href: '/payroll' },
    { name: 'Transactions', icon: CreditCard, href: '/transactions' },
    { name: 'Rapports', icon: FileText, href: '/reports' },
    { name: 'Paramètres', icon: Settings, href: '/settings' },
  ];

  const isCurrentPath = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href) && href !== '#';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-4 border-b">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">NC</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-gray-900">Nala Kredi</p>
                <p className="text-xs text-gray-500">Ti Machann</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
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
                    {item.name}
                  </a>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.href}
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
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t px-4 py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500">{user.role}</p>
                {user.branchName && (
                  <p className="text-xs text-primary-600 truncate">{user.branchName}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Top navigation */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-end">
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button className="p-2 text-gray-400 hover:text-gray-500 relative">
                  <Bell className="h-6 w-6" />
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                    3
                  </span>
                </button>

                {/* Branch info */}
                {user.branchName && (
                  <div className="hidden md:flex items-center px-3 py-1 bg-primary-50 rounded-full">
                    <Building2 className="h-4 w-4 text-primary-600 mr-2" />
                    <span className="text-sm font-medium text-primary-800">{user.branchName}</span>
                  </div>
                )}

                {/* User info with dropdown */}
                <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </span>
                      </div>
                    </div>
                    <div className="hidden md:block">
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
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;