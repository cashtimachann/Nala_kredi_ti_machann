import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  MapPin, 
  Shield, 
  Activity,
  CheckCircle,
  Clock,
  Wallet,
  Settings,
  AlertTriangle,
  CreditCard,
  UserCheck,
  Banknote
} from 'lucide-react';
import ClientAccountManagement from '../admin/ClientAccountManagement';
import CurrentAccountManagement from '../admin/CurrentAccountManagement';
import SavingsCustomerManagement from '../savings/SavingsCustomerManagement';
import TermSavingsManagement from '../admin/TermSavingsManagement';
import LoanManagement from '../loans/LoanManagement';
import apiService from '../../services/apiService';
import toast from 'react-hot-toast';

interface SystemStats {
  totalBranches: number;
  activeBranches: number;
  totalUsers: number;
  activeUsers: number;
  totalVolume: number;
  systemHealth: number;
  recentActivity: number;
  totalSavingsAccounts: number;
  activeSavingsAccounts: number;
  totalSavingsBalance: number;
  totalClientAccounts: number;
  activeClientAccounts: number;
  totalClientBalanceHTG: number;
  totalClientBalanceUSD: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

const SuperAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'current-accounts' | 'term-savings' | 'microloans' | 'savings-customers'>('overview');
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalBranches: 0,
    activeBranches: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalVolume: 0,
    systemHealth: 96.8,
    recentActivity: 45,
    totalSavingsAccounts: 0,
    activeSavingsAccounts: 0,
    totalSavingsBalance: 0,
    totalClientAccounts: 0,
    activeClientAccounts: 0,
    totalClientBalanceHTG: 0,
    totalClientBalanceUSD: 0
  });

  useEffect(() => {
    // Load system statistics
    loadSystemStats();
    loadRecentActivities();
  }, []);

  const loadSystemStats = async () => {
    try {
      // Load real system statistics from API
      const dashboardData = await apiService.getSuperAdminDashboard();
      setSystemStats(dashboardData);
    } catch (error) {
      console.error('Error loading system stats:', error);
      toast.error('Erreur lors du chargement des statistiques système');
    }
  };

  const loadRecentActivities = async () => {
    try {
      const activities = await apiService.getRecentActivities(10);
      setRecentActivities(activities);
    } catch (error) {
      console.error('Error loading recent activities:', error);
      // Keep the hardcoded activities as fallback
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount).replace('$', 'HTG ');
  };

  // Removed duplicate navigation - using sidebar navigation instead

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Succursales</p>
              <p className="text-2xl font-bold text-gray-900">{systemStats.totalBranches}</p>
              <p className="text-sm text-green-600 mt-1">
                {systemStats.activeBranches} actives
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilisateurs Système</p>
              <p className="text-2xl font-bold text-gray-900">{systemStats.totalUsers}</p>
              <p className="text-sm text-green-600 mt-1">
                {systemStats.activeUsers} actifs aujourd'hui
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Comptes Clients</p>
              <p className="text-2xl font-bold text-gray-900">{systemStats.totalClientAccounts}</p>
              <p className="text-sm text-green-600 mt-1">
                {systemStats.activeClientAccounts} actifs
              </p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <CreditCard className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Santé du Système</p>
              <p className="text-2xl font-bold text-gray-900">{systemStats.systemHealth}%</p>
              <p className="text-sm text-green-600 mt-1">Performance optimale</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-green-600" />
            État du Système
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-sm font-medium text-gray-700">Base de données</span>
              </div>
              <span className="text-sm text-green-600">Opérationnel</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-sm font-medium text-gray-700">Services API</span>
              </div>
              <span className="text-sm text-green-600">Opérationnel</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-sm font-medium text-gray-700">Système de sauvegarde</span>
              </div>
              <span className="text-sm text-green-600">Opérationnel</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-yellow-500 mr-3" />
                <span className="text-sm font-medium text-gray-700">Maintenance programmée</span>
              </div>
              <span className="text-sm text-yellow-600">Dimanche 02:00</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Activité Récente
          </h3>
          <div className="space-y-4">
            {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
              <div key={activity.id} className={`flex items-start space-x-3 py-3 ${index < recentActivities.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div className={`p-2 rounded-full ${
                  activity.type === 'branch' ? 'bg-blue-100' :
                  activity.type === 'user' ? 'bg-green-100' :
                  activity.type === 'transaction' ? 'bg-orange-100' :
                  'bg-purple-100'
                }`}>
                  {activity.type === 'branch' && <Building2 className="h-4 w-4 text-blue-600" />}
                  {activity.type === 'user' && <Users className="h-4 w-4 text-green-600" />}
                  {activity.type === 'transaction' && <TrendingUp className="h-4 w-4 text-orange-600" />}
                  {activity.type === 'config' && <Settings className="h-4 w-4 text-purple-600" />}
                  {activity.type === 'alert' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500">{activity.description} - {new Date(activity.timestamp).toLocaleString('fr-FR')}</p>
                </div>
              </div>
            )) : (
              <>
                <div className="flex items-start space-x-3 py-3 border-b border-gray-100">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Nouvelle succursale créée</p>
                    <p className="text-xs text-gray-500">Port-au-Prince Centre - Il y a 2 heures</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 py-3 border-b border-gray-100">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Nouvel utilisateur ajouté</p>
                    <p className="text-xs text-gray-500">Marie Joseph (Caissière) - Il y a 4 heures</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 py-3 border-b border-gray-100">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Settings className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Configuration mise à jour</p>
                    <p className="text-xs text-gray-500">Limites de crédit modifiées - Il y a 6 heures</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 py-3">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Alerte système</p>
                    <p className="text-xs text-gray-500">Espace disque faible sur serveur 2 - Il y a 8 heures</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé Rapide</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{systemStats?.totalBranches || 0}</div>
            <div className="text-sm text-gray-600">Succursales</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{systemStats?.totalUsers || 0}</div>
            <div className="text-sm text-gray-600">Utilisateurs</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{systemStats?.totalClientAccounts || 0}</div>
            <div className="text-sm text-gray-600">Comptes Clients</div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500 text-center">
          Utilisez le menu de navigation à gauche pour accéder aux différents modules du système.
        </div>
      </div>
    </div>
  );

  const tabItems = [
    {
      id: 'overview' as const,
      label: 'Vue d\'ensemble',
      icon: Activity,
      description: 'Statistiques globales du système'
    },
    {
      id: 'accounts' as const,
      label: 'Comptes Clients',
      icon: CreditCard,
      description: 'Gestion des comptes et clients'
    },
    {
      id: 'current-accounts' as const,
      label: 'Comptes Courants',
      icon: Wallet,
      description: 'Gestion des comptes courants'
    },
    {
      id: 'term-savings' as const,
      label: 'Épargne à Terme',
      icon: Clock,
      description: 'Gestion des comptes d\'épargne à terme'
    },
    {
      id: 'microloans' as const,
      label: 'Microcrédits',
      icon: Banknote,
      description: 'Gestion des prêts et microcrédits'
    },
    {
      id: 'savings-customers' as const,
      label: 'Clients Épargnants',
      icon: UserCheck,
      description: 'Gestion des clients épargnants'
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'accounts':
        return <ClientAccountManagement />;
      case 'current-accounts':
        return <CurrentAccountManagement />;
      case 'term-savings':
        return <TermSavingsManagement />;
      case 'microloans':
        return <LoanManagement />;
      case 'savings-customers':
        return <SavingsCustomerManagement />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Super Administrateur</h1>
        <p className="text-gray-600 mt-1">Vue d'ensemble du système Nala Kredi Ti Machann</p>
      </div>

      {/* Content - Overview Only */}
      {renderOverview()}
    </div>
  );
};

export default SuperAdminDashboard;