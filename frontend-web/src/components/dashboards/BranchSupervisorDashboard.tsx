import React, { useState, useEffect } from 'react';
import { 
  Building2,
  Users, 
  DollarSign,
  CreditCard,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  FileText
} from 'lucide-react';
import apiService from '../../services/apiService';
import { Branch } from '../../types/branch';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import CashManagement from '../branch/CashManagement';
import TransactionHistory from '../branch/TransactionHistory';
import CashSessionReports from '../branch/CashSessionReports';
// Removed inline account management; use left sidebar navigation instead

interface BranchStats {
  todayTransactions: number;
  todayVolume: number;
  todayDepositsHTG: number;
  todayDepositsUSD: number;
  todayWithdrawalsHTG: number;
  todayWithdrawalsUSD: number;
  clientsServed: number;
  activeEmployees: number;
  activeCredits: number;
  pendingValidations: number;
  portfolioValue: number;
  monthlyPerformance: number;
  cashBalance: number;
  branchBalanceHTG: number;
  branchBalanceUSD: number;
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
    todayDepositsHTG: 0,
    todayDepositsUSD: 0,
    todayWithdrawalsHTG: 0,
    todayWithdrawalsUSD: 0,
    clientsServed: 0,
    activeEmployees: 0,
    activeCredits: 0,
    pendingValidations: 0,
    portfolioValue: 0,
    monthlyPerformance: 0,
    cashBalance: 0,
    branchBalanceHTG: 0,
    branchBalanceUSD: 0
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
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
  const [branch, setBranch] = useState<Branch | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'cash' | 'history' | 'reports'>('overview');
  // Removed duplicate tab navigation; use global sidebar

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load branch supervisor dashboard data
      const dashboardData = await apiService.getBranchSupervisorDashboard();
      
      if (dashboardData) {
        // Basic stats from the dashboard endpoint (kept as fallback)
        setStats((prev) => ({
          ...prev,
          activeEmployees: dashboardData.activeCashiers || prev.activeEmployees,
          activeCredits: dashboardData.activeCredits || prev.activeCredits,
          pendingValidations: dashboardData.pendingCreditApprovals || prev.pendingValidations,
          portfolioValue: dashboardData.branchCreditPortfolio || prev.portfolioValue,
          monthlyPerformance: dashboardData.averageTransactionTime || prev.monthlyPerformance
        }));
      }

      // Load recent transactions, pending accounts and branch details from API
      const user = useAuthStore.getState().user;
      if (user?.branchId) {
        try {
          const branchDetails = await apiService.getBranchById(user.branchId);
          setBranch(branchDetails || null);
        } catch (err) {
          console.error('Error loading branch details', err);
          // non-blocking; user can still see other dashboard data
        }

        // Fetch recent (today) transactions and compute accurate counts and volume
        const recentTransactions = await apiService.getRecentTransactions(user.branchId, 1000);
        setTransactions(recentTransactions || []);

        const txList = recentTransactions || [];
        const txCount = txList.length;
        const txVolume = txList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        
        // Compute deposits and withdrawals by currency
        const deposits = txList.filter(t => 
          (t.type?.toLowerCase().includes('dépôt') || t.type?.toLowerCase().includes('depot'))
        );
        const withdrawals = txList.filter(t => 
          t.type?.toLowerCase().includes('retrait')
        );
        
        const depositsHTG = deposits.filter(t => t.currency === 'HTG').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const depositsUSD = deposits.filter(t => t.currency === 'USD').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const withdrawalsHTG = withdrawals.filter(t => t.currency === 'HTG').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const withdrawalsUSD = withdrawals.filter(t => t.currency === 'USD').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        
        // Count unique clients served today
        const uniqueClients = new Set(txList.map(t => t.clientName).filter(Boolean));
        const clientsServed = uniqueClients.size;
        
        setStats((prev) => ({ 
          ...prev, 
          todayTransactions: txCount, 
          todayVolume: txVolume,
          todayDepositsHTG: depositsHTG,
          todayDepositsUSD: depositsUSD,
          todayWithdrawalsHTG: withdrawalsHTG,
          todayWithdrawalsUSD: withdrawalsUSD,
          clientsServed
        }));

        // Fetch cumulative financial summary for balance cards
        try {
          const summary = await apiService.getBranchFinancialSummary(user.branchId);
          setFinancialSummary(summary);
          setStats((prev) => ({
            ...prev,
            branchBalanceHTG: Number(summary?.balanceHTG ?? 0),
            branchBalanceUSD: Number(summary?.balanceUSD ?? 0)
          }));
        } catch (err) {
          console.error('Error loading financial summary:', err);
        }
      }

      // Try to fetch credit portfolio / monthly summary for the branch and map it
      try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const monthly = await apiService.getMyBranchMonthlyReport(month, year);

        // The shape of the report can vary, so safely extract known fields
        const totalOutstanding = monthly?.totalOutstanding || monthly?.totalOutstandingHTG || monthly?.portfolio?.totalOutstanding || monthly?.portfolioTotal || 0;
        const totalDisbursed = monthly?.totalDisbursed || monthly?.totalDisbursedHTG || monthly?.portfolio?.totalDisbursed || 0;
        const activeLoans = monthly?.activeLoans || monthly?.portfolio?.activeLoans || monthly?.loanStats?.active || 0;
        const totalLoans = monthly?.totalLoans || monthly?.loanStats?.total || 0;
        const paymentsThisMonth = monthly?.paymentsThisMonth || monthly?.payments || 0;
        const overdueLoans = monthly?.overdueLoans || monthly?.loanStats?.overdue || 0;
        const averageTicket = monthly?.averageTicket || monthly?.stats?.averageTicket || 0;
        const portfolioAtRisk = monthly?.portfolioAtRisk ?? monthly?.par ?? 0;

        setCreditPortfolio({
          totalLoans: Number(totalLoans) || 0,
          activeLoans: Number(activeLoans) || 0,
          totalDisbursed: Number(totalDisbursed) || 0,
          totalOutstanding: Number(totalOutstanding) || 0,
          paymentsThisMonth: Number(paymentsThisMonth) || 0,
          overdueLoans: Number(overdueLoans) || 0,
          averageTicket: Number(averageTicket) || 0,
          portfolioAtRisk: Number(portfolioAtRisk) || 0
        });
      } catch (err) {
        // Keep previous fallback values if report parsing fails
        console.warn('Could not load monthly portfolio report', err);
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Reports generation moved to dedicated Reports page accessible via sidebar

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-red-700 text-white px-6 py-8 shadow-xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Building2 className="h-8 w-8 drop-shadow-lg" />
                Chef de Succursale
              </h1>
              <p className="text-orange-100">Supervision et gestion de la succursale</p>
            </div>
            <button
              onClick={loadDashboardData}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all hover:scale-105 shadow-lg"
            >
              <RefreshCw className="h-5 w-5" />
              Actualiser
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'overview'
                  ? 'bg-white text-red-600 shadow-lg'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              <Building2 className="h-5 w-5" />
              Vue d'ensemble
            </button>
            <button
              onClick={() => setActiveTab('cash')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'cash'
                  ? 'bg-white text-red-600 shadow-lg'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              <Wallet className="h-5 w-5" />
              Gestion Caisse
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-red-600 shadow-lg'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              <FileText className="h-5 w-5" />
              Historique Transactions
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'reports'
                  ? 'bg-white text-red-600 shadow-lg'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              <FileText className="h-5 w-5" />
              Rapports Caisse
            </button>
          </div>
        </div>
      </div>

      {/* Removed top tabs; use left sidebar for navigation */}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Branch Details Card */}
            {branch && (
              <div className="mb-6">
                <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-red-50 text-red-600 rounded-full p-3">
                      <Building2 className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{branch.name} <span className="text-sm text-gray-500">({branch.code})</span></h2>
                      <p className="text-sm text-gray-600">{branch.address}, {branch.commune}, {branch.department}</p>
                      <p className="text-sm text-gray-600 mt-1">Manager: <span className="font-medium">{branch.managerName || '—'}</span></p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>Phones: {branch.phones?.join(' • ')}</p>
                    <p className="mt-1">Ouvert: {branch.operatingHours?.openTime} — {branch.operatingHours?.closeTime}</p>
                    <p className="mt-1">Depuis: {branch.openingDate ? new Date(branch.openingDate).toLocaleDateString('fr-HT') : '—'}</p>
                  </div>
                </div>
              </div>
            )}
            {/* Statistics Cards - Today's Branch Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between text-white">
                  <div className="w-full">
                    <p className="text-emerald-100 text-sm font-medium mb-2">Total Entrées</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        {new Intl.NumberFormat('fr-HT', {
                          maximumFractionDigits: 0
                        }).format(financialSummary?.totalDepositHTG ?? 0)} HTG
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-semibold text-emerald-100">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 2
                        }).format(financialSummary?.totalDepositUSD ?? 0)}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100 mt-2">Total cumulé • Aujourd'hui: {new Intl.NumberFormat('fr-HT', { maximumFractionDigits: 0 }).format(stats.todayDepositsHTG)} HTG</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-full p-3">
                    <ArrowUpRight className="h-8 w-8" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between text-white">
                  <div className="w-full">
                    <p className="text-rose-100 text-sm font-medium mb-2">Total Sorties</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        {new Intl.NumberFormat('fr-HT', {
                          maximumFractionDigits: 0
                        }).format(financialSummary?.totalWithdrawalHTG ?? 0)} HTG
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-semibold text-rose-100">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 2
                        }).format(financialSummary?.totalWithdrawalUSD ?? 0)}
                      </span>
                    </div>
                    <p className="text-xs text-rose-100 mt-2">Total cumulé • Aujourd'hui: {new Intl.NumberFormat('fr-HT', { maximumFractionDigits: 0 }).format(stats.todayWithdrawalsHTG)} HTG</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-full p-3">
                    <ArrowDownRight className="h-8 w-8" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-indigo-100 text-sm font-medium">Encours Total des Crédits</p>
                    <p className="text-3xl font-bold mt-2">
                      {new Intl.NumberFormat('fr-HT', {
                        maximumFractionDigits: 0
                      }).format(creditPortfolio.totalOutstanding)} HTG
                    </p>
                    <p className="text-sm text-indigo-100 mt-1">{creditPortfolio.activeLoans} crédits actifs</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-full p-3">
                    <CreditCard className="h-8 w-8" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-amber-100 text-sm font-medium">Nombre de Clients Servis</p>
                    <p className="text-3xl font-bold mt-2">{stats.clientsServed}</p>
                    <p className="text-sm text-amber-100 mt-1">Aujourd'hui</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-full p-3">
                    <Users className="h-8 w-8" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between text-white">
                  <div className="w-full">
                    <p className="text-cyan-100 text-sm font-medium mb-2">Solde Total</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        {new Intl.NumberFormat('fr-HT', {
                          maximumFractionDigits: 0
                        }).format(stats.branchBalanceHTG)} HTG
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-semibold text-cyan-100">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 2
                        }).format(stats.branchBalanceUSD)}
                      </span>
                    </div>
                    <p className="text-xs text-cyan-100 mt-2">Net aujourd'hui</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-full p-3">
                    <DollarSign className="h-8 w-8" />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional stats removed per design request */}

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

        {/* Cash Management Tab */}
        {activeTab === 'cash' && branch && (
          <CashManagement branchId={branch.id} />
        )}

        {/* Transaction History Tab */}
        {activeTab === 'history' && branch && (
          <TransactionHistory branchId={branch.id} />
        )}

        {/* Cash Session Reports Tab */}
        {activeTab === 'reports' && branch && (
          <CashSessionReports branchId={branch.id} />
        )}
      </div>
    </div>
  );
};

export default BranchSupervisorDashboard;