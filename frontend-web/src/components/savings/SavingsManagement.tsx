import React, { useState, useEffect } from 'react';
import {
  Users,
  Wallet,
  TrendingUp,
  Activity,
  Plus,
  DollarSign,
  FileText,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import SavingsCustomerManagement from './SavingsCustomerManagement';
import CompleteSavingsAccountManagement from './CompleteSavingsAccountManagement';
import SavingsTransactionManagement from './SavingsTransactionManagement';
import SavingsReports from './SavingsReports';
import { apiService } from '../../services/apiService';
import toast from 'react-hot-toast';

type SavingsTab = 'overview' | 'customers' | 'accounts' | 'transactions' | 'reports';

interface SavingsStats {
  totalCustomers: number;
  activeCustomers: number;
  totalAccounts: number;
  activeAccounts: number;
  totalBalance: number;
  monthlyDeposits: number;
  monthlyWithdrawals: number;
  interestPaid: number;
}

interface CurrencyBreakdown {
  htg: {
    accounts: number;
    balance: number;
    percentage: number;
  };
  usd: {
    accounts: number;
    balance: number;
    percentage: number;
  };
}

const SavingsManagement: React.FC = () => {
  const currentUser = apiService.getCurrentUser();
  const userBranchId = currentUser?.branchId;
  const roleNorm = (currentUser?.role || '').toString().toLowerCase().replace(/[\s_-]+/g, '');
  const isBranchHead = ['manager','branchsupervisor','chefdesuccursale','branchmanager','assistantmanager','chefdesuccursal'].includes(roleNorm);
  const effectiveBranchId = isBranchHead ? userBranchId : undefined;
  const isBranchLocked = Boolean(effectiveBranchId);
  const [activeTab, setActiveTab] = useState<SavingsTab>('overview');
  const [stats, setStats] = useState<SavingsStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    totalAccounts: 0,
    activeAccounts: 0,
    totalBalance: 0,
    monthlyDeposits: 0,
    monthlyWithdrawals: 0,
    interestPaid: 0
  });
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState({
    depositCount: 0,
    withdrawalCount: 0,
    avgDeposit: 0,
    avgWithdrawal: 0,
    growthRate: 0
  });
  const [dailyStats, setDailyStats] = useState({
    depositCount: 0,
    withdrawalCount: 0,
    totalDeposits: 0,
    totalWithdrawals: 0
  });
  const [currencyBreakdown, setCurrencyBreakdown] = useState<CurrencyBreakdown>({
    htg: { accounts: 0, balance: 0, percentage: 0 },
    usd: { accounts: 0, balance: 0, percentage: 0 }
  });
  const [accountsCreatedToday, setAccountsCreatedToday] = useState(0);
  const [todayCounts, setTodayCounts] = useState({
    depositHTG: 0,
    depositUSD: 0,
    withdrawalHTG: 0,
    withdrawalUSD: 0
  });

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      // Charger les statistiques depuis l'API
      // 1) Tous comptes, 2) transactions récentes (page 1), 3) transactions d'aujourd'hui (filtrées)
      const todayIso = new Date().toISOString().slice(0, 10);
      const [accounts, transactions, transactionsToday] = await Promise.all([
        apiService.getSavingsAccounts(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        apiService.getSavingsTransactions(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        apiService.getSavingsTransactions({ dateFrom: todayIso, dateTo: todayIso, pageSize: 2000, ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}) })
      ]);

      // Calculer les statistiques
      const isActiveStatus = (s: any) => {
        const v = s != null ? String(s).toUpperCase() : '';
        return v === 'ACTIVE' || v === '1' || v === 'TRUE';
      };
      const activeAccounts = accounts.filter((a: any) => isActiveStatus(a.status));
      const totalBalance = accounts.reduce((sum: number, a: any) => sum + (a.balance || 0), 0);

      // Helpers dates (local day key)
      const localDayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const getTxDate = (t: any) => t.processedAt || t.transactionDate || t.createdAt;

      // Normalise transaction type to string labels
      const normalizeType = (t: any): 'Deposit' | 'Withdrawal' | 'Interest' | 'OpeningDeposit' | string => {
        if (t === undefined || t === null) return '';
        const s = String(t).trim();
        if (s === '0') return 'Deposit';
        if (s === '1') return 'Withdrawal';
        if (s === '2') return 'Interest';
        if (s === '3' || s === '4') return 'OpeningDeposit';
        const norm = s.replace(/\s+/g, '').toLowerCase();
        if (norm === 'deposit') return 'Deposit';
        if (norm === 'withdrawal') return 'Withdrawal';
        if (norm === 'interest') return 'Interest';
        if (norm === 'openingdeposit' || norm === 'initialdeposit') return 'OpeningDeposit';
        return s;
      };

      const normalizeStatus = (st: any): 'Completed' | 'Pending' | 'Processing' | 'Cancelled' | 'Failed' | string => {
        if (st === undefined || st === null) return '' as any;
        const s = String(st).trim().toUpperCase();
        if (s === '0') return 'Pending';
        if (s === '1') return 'Processing';
        if (s === '2') return 'Completed';
        if (s === '3') return 'Cancelled';
        if (s === '4') return 'Failed';
        if (s === 'COMPLETED') return 'Completed';
        if (s === 'PENDING') return 'Pending';
        if (s === 'PROCESSING' || s === 'IN_PROGRESS') return 'Processing';
        if (s === 'CANCELLED' || s === 'CANCELED') return 'Cancelled';
        if (s === 'FAILED' || s === 'ERROR') return 'Failed';
        return s.charAt(0) + s.slice(1).toLowerCase();
      };

      // Filtrer les transactions du mois en cours (se base sur processedAt -> transactionDate -> createdAt)
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthTransactions = transactions.filter((t: any) => {
        const dateStr = getTxDate(t);
        if (!dateStr) return false;
        const dt = new Date(dateStr);
        return dt >= monthStart;
      });

      // Inclure dépôts d'ouverture comme dépôts
      const isDeposit = (t: any) => {
        const ty = normalizeType(t.type ?? t);
        return ty === 'Deposit' || ty === 'OpeningDeposit';
      };
      const isWithdrawal = (t: any) => normalizeType(t.type ?? t) === 'Withdrawal';

      const deposits = monthTransactions.filter(isDeposit);
      const withdrawals = monthTransactions.filter(isWithdrawal);
      const interest = monthTransactions.filter((t: any) => t.type === 'Interest');

      const monthlyDeposits = deposits.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      const monthlyWithdrawals = withdrawals.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      const interestPaid = interest.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      // Transactions d'aujourd'hui: utiliser l'appel filtré (toutes les transactions du jour)
      let todayTx: any[] = Array.isArray(transactionsToday) ? transactionsToday : [];
      // Fallback si la liste filtrée est vide: filtrer localement les transactions chargées
      if (!todayTx.length) {
        const todayKey = localDayKey(new Date());
        todayTx = (transactions || []).filter((t: any) => {
          const dateStr = getTxDate(t);
          if (!dateStr) return false;
          const dt = new Date(dateStr);
          return localDayKey(dt) === todayKey;
        });
      }
      // Garder seulement les transactions complétées pour les compteurs du jour
      todayTx = todayTx.filter((t: any) => normalizeStatus(t.status) === 'Completed');
      const todayDeposits = todayTx.filter(isDeposit);
      const todayWithdrawals = todayTx.filter(isWithdrawal);
      
      const dailyDepositTotal = todayDeposits.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      const dailyWithdrawalTotal = todayWithdrawals.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      // Comptter les clients uniques
      const uniqueCustomers = new Set(accounts.map((a: any) => a.customerId));
      const activeCustomerIds = new Set(activeAccounts.map((a: any) => a.customerId));

      // Calculer le taux de croissance
      const netChange = monthlyDeposits - monthlyWithdrawals;
      const growthRate = totalBalance > 0 ? (netChange / totalBalance * 100) : 0;

      // Calculer la répartition par devise (tolère 0/1, '0'/'1', 'HTG'/'USD')
      const currencyVal = (c: any) => {
        const s = c != null ? String(c).toUpperCase() : '';
        if (s === '0' || s === 'HTG') return 'HTG';
        if (s === '1' || s === 'USD') return 'USD';
        return s; // fallback
      };
  const htgAccounts = accounts.filter((a: any) => currencyVal(a.currency) === 'HTG');
  const usdAccounts = accounts.filter((a: any) => currencyVal(a.currency) === 'USD');
      
      const htgBalance = htgAccounts.reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
      const usdBalance = usdAccounts.reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
      
      const htgPercentage = totalBalance > 0 ? (htgBalance / totalBalance * 100) : 0;
      const usdPercentage = totalBalance > 0 ? (usdBalance / totalBalance * 100) : 0;

      setStats({
        totalCustomers: uniqueCustomers.size,
        activeCustomers: activeCustomerIds.size,
        totalAccounts: accounts.length,
        activeAccounts: activeAccounts.length,
        totalBalance,
        monthlyDeposits,
        monthlyWithdrawals,
        interestPaid
      });

      setMonthlyStats({
        depositCount: deposits.length,
        withdrawalCount: withdrawals.length,
        avgDeposit: deposits.length > 0 ? monthlyDeposits / deposits.length : 0,
        avgWithdrawal: withdrawals.length > 0 ? monthlyWithdrawals / withdrawals.length : 0,
        growthRate
      });

      setDailyStats({
        depositCount: todayDeposits.length,
        withdrawalCount: todayWithdrawals.length,
        totalDeposits: dailyDepositTotal,
        totalWithdrawals: dailyWithdrawalTotal
      });

      // Compter dépôts/retraits d'aujourd'hui par devise
      const txCurrencyVal = (c: any) => {
        const s = c != null ? String(c).toUpperCase() : '';
        if (s === '0' || s === 'HTG') return 'HTG';
        if (s === '1' || s === 'USD') return 'USD';
        // Some backends might use 2 for USD; normalize unknowns to HTG unless explicitly USD
        if (s === '2') return 'USD';
        return 'HTG';
      };
  const readCurrency = (t: any) => (t?.currency ?? t?.Currency);
  const depHTG = todayDeposits.filter((t: any) => txCurrencyVal(readCurrency(t)) === 'HTG').length;
  const depUSD = todayDeposits.filter((t: any) => txCurrencyVal(readCurrency(t)) === 'USD').length;
  const witHTG = todayWithdrawals.filter((t: any) => txCurrencyVal(readCurrency(t)) === 'HTG').length;
  const witUSD = todayWithdrawals.filter((t: any) => txCurrencyVal(readCurrency(t)) === 'USD').length;
      setTodayCounts({ depositHTG: depHTG, depositUSD: depUSD, withdrawalHTG: witHTG, withdrawalUSD: witUSD });

      setCurrencyBreakdown({
        htg: {
          accounts: htgAccounts.length,
          balance: htgBalance,
          percentage: htgPercentage
        },
        usd: {
          accounts: usdAccounts.length,
          balance: usdBalance,
          percentage: usdPercentage
        }
      });

      // Comptes créés aujourd'hui
      const todayAccount = new Date();
      todayAccount.setHours(0, 0, 0, 0);
      const createdToday = accounts.filter((a: any) => {
        const dateStr = a.createdAt || a.openingDate;
        if (!dateStr) return false;
        const accDate = new Date(dateStr);
        accDate.setHours(0, 0, 0, 0);
        return accDate.getTime() === todayAccount.getTime();
      });
      setAccountsCreatedToday(createdToday.length);
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'HTG') => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount) + ' ' + currency;
  };

  const tabItems = [
    {
      id: 'overview' as SavingsTab,
      label: 'Vue d\'ensemble',
      icon: Activity,
      description: 'Statistiques générales des comptes d\'épargne'
    },
    {
      id: 'customers' as SavingsTab,
      label: 'Clients',
      icon: Users,
      description: 'Gestion des clients épargnants'
    },
    {
      id: 'accounts' as SavingsTab,
      label: 'Comptes',
      icon: Wallet,
      description: 'Gestion des comptes d\'épargne'
    },
    {
      id: 'transactions' as SavingsTab,
      label: 'Transactions',
      icon: TrendingUp,
      description: 'Historique et traitement des transactions'
    },
    {
      id: 'reports' as SavingsTab,
      label: 'Rapports',
      icon: FileText,
      description: 'Rapports et statistiques détaillées'
    }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {loading ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des statistiques...</p>
          </div>
        </div>
      ) : (
        <>
        {/* ...existing code... (other statistics cards remain) */}
        {/* Overview Cards (6 metrics) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {/* Comptes HTG */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Comptes Épargne HTG</p>
                <p className="text-2xl font-bold text-gray-900">{currencyBreakdown.htg.accounts}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Comptes USD */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Comptes Épargne USD</p>
                <p className="text-2xl font-bold text-gray-900">{currencyBreakdown.usd.accounts}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Wallet className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Dépôts HTG aujourd'hui */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dépôts HTG (aujourd'hui)</p>
                <p className="text-2xl font-bold text-gray-900">{todayCounts.depositHTG}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Dépôts USD aujourd'hui */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dépôts USD (aujourd'hui)</p>
                <p className="text-2xl font-bold text-gray-900">{todayCounts.depositUSD}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Retraits HTG aujourd'hui */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Retraits HTG (aujourd'hui)</p>
                <p className="text-2xl font-bold text-gray-900">{todayCounts.withdrawalHTG}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <ArrowDownLeft className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          {/* Retraits USD aujourd'hui */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Retraits USD (aujourd'hui)</p>
                <p className="text-2xl font-bold text-gray-900">{todayCounts.withdrawalUSD}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <ArrowDownLeft className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Currency Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
            Répartition par Devise
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* HTG */}
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    HTG
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Gourde Haïtienne</p>
                    <p className="text-xs text-gray-500">{currencyBreakdown.htg.accounts} comptes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{currencyBreakdown.htg.percentage.toFixed(1)}%</p>
                </div>
              </div>
              
              {/* Progress Bar HTG */}
              <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${currencyBreakdown.htg.percentage}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Solde total</span>
                <span className="font-bold text-blue-600">{formatCurrency(currencyBreakdown.htg.balance, 'HTG')}</span>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 px-3 py-2 rounded-lg">
                    <p className="text-gray-600">Comptes actifs</p>
                    <p className="font-bold text-blue-700">{currencyBreakdown.htg.accounts}</p>
                  </div>
                  <div className="bg-blue-50 px-3 py-2 rounded-lg">
                    <p className="text-gray-600">Solde moyen</p>
                    <p className="font-bold text-blue-700">
                      {currencyBreakdown.htg.accounts > 0 
                        ? formatCurrency(currencyBreakdown.htg.balance / currencyBreakdown.htg.accounts, 'HTG')
                        : formatCurrency(0, 'HTG')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* USD */}
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    USD
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Dollar Américain</p>
                    <p className="text-xs text-gray-500">{currencyBreakdown.usd.accounts} comptes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{currencyBreakdown.usd.percentage.toFixed(1)}%</p>
                </div>
              </div>
              
              {/* Progress Bar USD */}
              <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                  style={{ width: `${currencyBreakdown.usd.percentage}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Solde total</span>
                <span className="font-bold text-green-600">{formatCurrency(currencyBreakdown.usd.balance, 'USD')}</span>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-green-50 px-3 py-2 rounded-lg">
                    <p className="text-gray-600">Comptes actifs</p>
                    <p className="font-bold text-green-700">{currencyBreakdown.usd.accounts}</p>
                  </div>
                  <div className="bg-green-50 px-3 py-2 rounded-lg">
                    <p className="text-gray-600">Solde moyen</p>
                    <p className="font-bold text-green-700">
                      {currencyBreakdown.usd.accounts > 0 
                        ? formatCurrency(currencyBreakdown.usd.balance / currencyBreakdown.usd.accounts, 'USD')
                        : formatCurrency(0, 'USD')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Comptes</p>
                <p className="text-2xl font-bold text-gray-900">{currencyBreakdown.htg.accounts + currencyBreakdown.usd.accounts}</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">HTG Dominance</p>
                <p className="text-2xl font-bold text-blue-700">{currencyBreakdown.htg.percentage.toFixed(1)}%</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">USD Dominance</p>
                <p className="text-2xl font-bold text-green-700">{currencyBreakdown.usd.percentage.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveTab('customers')}
              className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <Plus className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Nouveau Client</span>
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
            >
              <Wallet className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Ouvrir Compte</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
            >
              <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Transaction</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors"
            >
              <FileText className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Générer Rapport</span>
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'customers':
        return <SavingsCustomerManagement effectiveBranchId={effectiveBranchId} isBranchLocked={isBranchLocked} />;
      case 'accounts':
        return <CompleteSavingsAccountManagement effectiveBranchId={effectiveBranchId} isBranchLocked={isBranchLocked} />;
      case 'transactions':
        return <SavingsTransactionManagement effectiveBranchId={effectiveBranchId} isBranchLocked={isBranchLocked} />;
      case 'reports':
        return <SavingsReports effectiveBranchId={effectiveBranchId} isBranchLocked={isBranchLocked} />;
      default:
        return renderOverview();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Comptes d'Épargne</h1>
        <p className="text-gray-600 mt-1">Module complet de gestion des comptes d'épargne et des transactions</p>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === item.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } transition-colors`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default SavingsManagement;