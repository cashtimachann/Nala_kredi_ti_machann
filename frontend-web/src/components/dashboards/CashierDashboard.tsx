import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Users, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Plus
} from 'lucide-react';
import { CashierDashboard } from '../../services/apiService';
import apiService from '../../services/apiService';
import StatCard from '../common/StatCard';
import QuickActions from '../common/QuickActions';
import RecentTransactions from '../common/RecentTransactions';
import toast from 'react-hot-toast';

const CashierDashboardComponent: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<CashierDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const data = await apiService.getCashierDashboard();
      setDashboardData(data);
    } catch (error) {
      toast.error('Erreur lors du chargement du tableau de bord');
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenCashSession = async () => {
    const openingHTG = prompt("Solde d'ouverture HTG:");
    const openingUSD = prompt("Solde d'ouverture USD:");
    
    if (openingHTG !== null && openingUSD !== null) {
      try {
        await apiService.openCashSession(parseFloat(openingHTG), parseFloat(openingUSD));
        toast.success('Session de caisse ouverte avec succès');
        loadDashboardData();
      } catch (error) {
        toast.error('Erreur lors de l\'ouverture de la session');
      }
    }
  };

  const handleCloseCashSession = async () => {
    if (!dashboardData) return;
    
    const closingHTG = prompt("Solde de fermeture HTG:");
    const closingUSD = prompt("Solde de fermeture USD:");
    const notes = prompt("Notes (optionnel):");
    
    if (closingHTG !== null && closingUSD !== null) {
      try {
        await apiService.closeCashSession(parseFloat(closingHTG), parseFloat(closingUSD), notes || undefined);
        toast.success('Session de caisse fermée avec succès');
        loadDashboardData();
      } catch (error) {
        toast.error('Erreur lors de la fermeture de la session');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h3>
          <button 
            onClick={loadDashboardData}
            className="btn btn-primary"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      label: 'Nouveau Dépôt',
      icon: Plus,
      color: 'success' as const,
      onClick: () => {
        // Navigate to deposit form
        console.log('Navigate to deposit form');
      }
    },
    {
      label: 'Retrait',
      icon: CreditCard,
      color: 'warning' as const,
      onClick: () => {
        // Navigate to withdrawal form
        console.log('Navigate to withdrawal form');
      }
    },
    {
      label: dashboardData.cashSessionStatus === 'Open' ? 'Fermer Session' : 'Ouvrir Session',
      icon: Clock,
      color: dashboardData.cashSessionStatus === 'Open' ? 'danger' as const : 'success' as const,
      onClick: dashboardData.cashSessionStatus === 'Open' ? handleCloseCashSession : handleOpenCashSession
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord - Caissier</h1>
              <p className="text-gray-600">Gestion des opérations de caisse</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                dashboardData.cashSessionStatus === 'Open' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                Session: {dashboardData.cashSessionStatus}
              </div>
              <button 
                onClick={loadDashboardData}
                disabled={refreshing}
                className="btn btn-secondary"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="dashboard-grid mb-8">
          <StatCard
            title="Solde Caisse HTG"
            value={`${dashboardData.cashBalanceHTG.toLocaleString()} HTG`}
            icon={DollarSign}
            color="blue"
          />
          <StatCard
            title="Solde Caisse USD"
            value={`$${dashboardData.cashBalanceUSD.toLocaleString()}`}
            icon={DollarSign}
            color="green"
          />
          <StatCard
            title="Dépôts Aujourd'hui"
            value={`${dashboardData.todayDeposits.toLocaleString()} HTG`}
            icon={TrendingUp}
            color="green"
            change={`+${dashboardData.transactionCount} transactions`}
          />
          <StatCard
            title="Retraits Aujourd'hui"
            value={`${dashboardData.todayWithdrawals.toLocaleString()} HTG`}
            icon={CreditCard}
            color="orange"
          />
          <StatCard
            title="Changes Aujourd'hui"
            value={dashboardData.todayExchanges.toString()}
            icon={RefreshCw}
            color="purple"
          />
          <StatCard
            title="Clients Servis"
            value={dashboardData.clientsServed.toString()}
            icon={Users}
            color="indigo"
          />
        </div>

        {/* Quick Actions & Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <QuickActions actions={quickActions} />
          </div>
          
          <div className="lg:col-span-2">
            <RecentTransactions />
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mt-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance du Jour</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {dashboardData.transactionCount}
                </div>
                <div className="text-sm text-gray-600">Transactions Totales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success-600">
                  {((dashboardData.todayDeposits - dashboardData.todayWithdrawals) / 1000).toFixed(1)}K
                </div>
                <div className="text-sm text-gray-600">Flux Net HTG</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {dashboardData.lastTransactionTime 
                    ? new Date(dashboardData.lastTransactionTime).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Aucune'
                  }
                </div>
                <div className="text-sm text-gray-600">Dernière Transaction</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierDashboardComponent;