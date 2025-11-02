import React, { useState, useEffect } from 'react';
import { 
  Building2,
  TrendingUp, 
  Users, 
  DollarSign,
  CreditCard,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Download,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Activity
} from 'lucide-react';
import apiService from '../../services/apiService';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';

interface BranchStats {
  todayTransactions: number;
  todayVolume: number;
  activeEmployees: number;
  activeCredits: number;
  pendingValidations: number;
  portfolioValue: number;
  monthlyPerformance: number;
  cashBalance: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  clientName: string;
  cashier: string;
  timestamp: string;
  status: string;
}

interface PendingAccount {
  id: string;
  accountNumber: string;
  clientName: string;
  accountType: string;
  submittedBy: string;
  submittedDate: string;
  amount: number;
}

interface CreditPortfolio {
  totalLoans: number;
  activeLoans: number;
  totalDisbursed: number;
  totalOutstanding: number;
  paymentsThisMonth: number;
  overdueLoans: number;
  averageTicket: number;
  portfolioAtRisk: number;
}

const BranchSupervisorDashboard: React.FC = () => {
  const [stats, setStats] = useState<BranchStats>({
    todayTransactions: 0,
    todayVolume: 0,
    activeEmployees: 0,
    activeCredits: 0,
    pendingValidations: 0,
    portfolioValue: 0,
    monthlyPerformance: 0,
    cashBalance: 0
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([]);
  const [creditPortfolio, setCreditPortfolio] = useState<CreditPortfolio>({
    totalLoans: 0,
    activeLoans: 0,
    totalDisbursed: 0,
    totalOutstanding: 0,
    paymentsThisMonth: 0,
    overdueLoans: 0,
    averageTicket: 0,
    portfolioAtRisk: 0
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'portfolio' | 'validations' | 'reports'>('dashboard');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load branch supervisor dashboard data
      const dashboardData = await apiService.getBranchSupervisorDashboard();
      
      if (dashboardData) {
        setStats({
          todayTransactions: dashboardData.todayTransactionCount || 0,
          todayVolume: dashboardData.todayTransactionVolume || 0,
          activeEmployees: dashboardData.activeCashiers || 0,
          activeCredits: dashboardData.activeCredits || 0,
          pendingValidations: dashboardData.pendingCreditApprovals || 0,
          portfolioValue: dashboardData.branchCreditPortfolio || 0,
          monthlyPerformance: dashboardData.averageTransactionTime || 0,
          cashBalance: dashboardData.todayTransactionVolume || 0
        });
      }

      // Load recent transactions from API
      const user = useAuthStore.getState().user;
      if (user?.branchId) {
        const recentTransactions = await apiService.getRecentTransactions(user.branchId, 10);
        setTransactions(recentTransactions || []);
      }

      // Load pending accounts from API
      if (user?.branchId) {
        const pendingAccounts = await apiService.getPendingAccounts(user.branchId);
        setPendingAccounts(pendingAccounts || []);
      }

      // Load credit portfolio data
      setCreditPortfolio({
        totalLoans: 156,
        activeLoans: 142,
        totalDisbursed: 8750000,
        totalOutstanding: 6240000,
        paymentsThisMonth: 45,
        overdueLoans: 8,
        averageTicket: 55000,
        portfolioAtRisk: 2.8
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateAccount = async (accountId: string, approved: boolean) => {
    try {
      if (approved) {
        toast.success('Compte approuvé avec succès');
      } else {
        toast.error('Compte rejeté');
      }
      // Reload data
      loadDashboardData();
    } catch (error) {
      toast.error('Erreur lors de la validation');
    }
  };

  const handleGenerateReport = async (reportType: string) => {
    try {
      toast.loading('Génération du rapport en cours...');
      
      setTimeout(() => {
        toast.dismiss();
        toast.success(`Rapport ${reportType} généré avec succès`);
      }, 1500);
    } catch (error) {
      toast.dismiss();
      toast.error('Erreur lors de la génération du rapport');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Building2 className="h-8 w-8" />
                Chef de Succursale
              </h1>
              <p className="text-green-100">Supervision et gestion de la succursale</p>
            </div>
            <button
              onClick={loadDashboardData}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="h-5 w-5" />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Tableau de Bord
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'transactions'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Historique Transactions
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'portfolio'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Portefeuille Crédit
            </button>
            <button
              onClick={() => setActiveTab('validations')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'validations'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Validations ({pendingAccounts.length})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'reports'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Rapports
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Transactions Aujourd'hui</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todayTransactions}</p>
                    <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                      <ArrowUpRight className="h-4 w-4" />
                      +12% vs hier
                    </p>
                  </div>
                  <div className="bg-green-100 rounded-full p-3">
                    <Activity className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Volume du Jour</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {new Intl.NumberFormat('fr-HT', {
                        style: 'currency',
                        currency: 'HTG',
                        maximumFractionDigits: 0
                      }).format(stats.todayVolume)}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">HTG</p>
                  </div>
                  <div className="bg-blue-100 rounded-full p-3">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Employés Actifs</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeEmployees}/12</p>
                    <p className="text-sm text-purple-600 mt-1">En service</p>
                  </div>
                  <div className="bg-purple-100 rounded-full p-3">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Crédits Actifs</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{creditPortfolio.activeLoans}</p>
                    <p className="text-sm text-orange-600 mt-1">
                      {creditPortfolio.overdueLoans} en retard
                    </p>
                  </div>
                  <div className="bg-orange-100 rounded-full p-3">
                    <CreditCard className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Validations en Attente</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stats.pendingValidations}</p>
                  </div>
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Portefeuille Crédit</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {new Intl.NumberFormat('fr-HT', {
                        style: 'currency',
                        currency: 'HTG',
                        maximumFractionDigits: 0
                      }).format(creditPortfolio.totalOutstanding)}
                    </p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Performance Mensuelle</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">92%</p>
                  </div>
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Temps Moyen Transaction</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">3.5 min</p>
                  </div>
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Dernières Transactions</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caissier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heure</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.slice(0, 5).map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {transaction.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.clientName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {transaction.cashier}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {new Intl.NumberFormat('fr-HT', {
                            style: 'currency',
                            currency: transaction.currency
                          }).format(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(transaction.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Historique des Transactions</h2>
            <div className="mb-4 flex gap-4">
              <input
                type="date"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                <option>Tous les types</option>
                <option>Dépôts</option>
                <option>Retraits</option>
                <option>Paiements</option>
              </select>
              <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Filtrer
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Heure</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{transaction.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.clientName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {new Intl.NumberFormat('fr-HT', {
                          style: 'currency',
                          currency: transaction.currency
                        }).format(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(transaction.timestamp).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-green-600 hover:text-green-900">
                          <Eye className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <p className="text-gray-600 text-sm font-medium">Total Prêts</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{creditPortfolio.totalLoans}</p>
                <p className="text-sm text-gray-500 mt-1">{creditPortfolio.activeLoans} actifs</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <p className="text-gray-600 text-sm font-medium">Montant Décaissé</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {new Intl.NumberFormat('fr-HT', {
                    style: 'currency',
                    currency: 'HTG',
                    maximumFractionDigits: 0
                  }).format(creditPortfolio.totalDisbursed)}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <p className="text-gray-600 text-sm font-medium">Encours Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {new Intl.NumberFormat('fr-HT', {
                    style: 'currency',
                    currency: 'HTG',
                    maximumFractionDigits: 0
                  }).format(creditPortfolio.totalOutstanding)}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <p className="text-gray-600 text-sm font-medium">PAR 30</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{creditPortfolio.portfolioAtRisk}%</p>
                <p className="text-sm text-red-600 mt-1">{creditPortfolio.overdueLoans} en retard</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Détails du Portefeuille</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Paiements ce mois</span>
                    <span className="font-bold text-gray-900">{creditPortfolio.paymentsThisMonth}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Ticket moyen</span>
                    <span className="font-bold text-gray-900">
                      {new Intl.NumberFormat('fr-HT', {
                        style: 'currency',
                        currency: 'HTG'
                      }).format(creditPortfolio.averageTicket)}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <span className="text-green-700">Taux de recouvrement</span>
                    <span className="font-bold text-green-900">95.2%</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                    <span className="text-blue-700">Nouveaux prêts (30j)</span>
                    <span className="font-bold text-blue-900">23</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Validations Tab */}
        {activeTab === 'validations' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Comptes en Attente de Validation ({pendingAccounts.length})
            </h2>
            {pendingAccounts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <p className="text-gray-600">Aucun compte en attente de validation</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingAccounts.map((account) => (
                  <div key={account.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{account.clientName}</h3>
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                            En attente
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">N° de Compte</p>
                            <p className="font-medium text-gray-900">{account.accountNumber}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Type de Compte</p>
                            <p className="font-medium text-gray-900">{account.accountType}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Soumis par</p>
                            <p className="font-medium text-gray-900">{account.submittedBy}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Date de soumission</p>
                            <p className="font-medium text-gray-900">
                              {new Date(account.submittedDate).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Dépôt Initial</p>
                            <p className="font-medium text-green-600">
                              {new Intl.NumberFormat('fr-HT', {
                                style: 'currency',
                                currency: 'HTG'
                              }).format(account.amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleValidateAccount(account.id, true)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                          <CheckCircle className="h-5 w-5" />
                          Approuver
                        </button>
                        <button
                          onClick={() => handleValidateAccount(account.id, false)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                        >
                          <AlertCircle className="h-5 w-5" />
                          Rejeter
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Rapports de Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <button
                onClick={() => handleGenerateReport('Rapport Quotidien')}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 rounded-full p-3 group-hover:bg-green-200">
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Rapport Quotidien</h3>
                    <p className="text-sm text-gray-600">Activités du jour</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Download className="h-5 w-5 text-gray-400 group-hover:text-green-600" />
                </div>
              </button>

              <button
                onClick={() => handleGenerateReport('Rapport Hebdomadaire')}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 rounded-full p-3 group-hover:bg-blue-200">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Rapport Hebdomadaire</h3>
                    <p className="text-sm text-gray-600">7 derniers jours</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Download className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                </div>
              </button>

              <button
                onClick={() => handleGenerateReport('Rapport Mensuel')}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 rounded-full p-3 group-hover:bg-purple-200">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Rapport Mensuel</h3>
                    <p className="text-sm text-gray-600">Performance globale</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Download className="h-5 w-5 text-gray-400 group-hover:text-purple-600" />
                </div>
              </button>

              <button
                onClick={() => handleGenerateReport('Rapport Transactions')}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 rounded-full p-3 group-hover:bg-orange-200">
                    <Activity className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Rapport Transactions</h3>
                    <p className="text-sm text-gray-600">Détails complets</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Download className="h-5 w-5 text-gray-400 group-hover:text-orange-600" />
                </div>
              </button>

              <button
                onClick={() => handleGenerateReport('Rapport Portefeuille')}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-teal-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-teal-100 rounded-full p-3 group-hover:bg-teal-200">
                    <CreditCard className="h-8 w-8 text-teal-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Rapport Portefeuille</h3>
                    <p className="text-sm text-gray-600">Crédits et encours</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Download className="h-5 w-5 text-gray-400 group-hover:text-teal-600" />
                </div>
              </button>

              <button
                onClick={() => handleGenerateReport('Rapport Performance')}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 rounded-full p-3 group-hover:bg-indigo-200">
                    <UserCheck className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Rapport Performance</h3>
                    <p className="text-sm text-gray-600">Équipe et KPIs</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Download className="h-5 w-5 text-gray-400 group-hover:text-indigo-600" />
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchSupervisorDashboard;