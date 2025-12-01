import { extractApiErrorMessage } from '../../utils/errorHandling';
import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  Plus,
  UserPlus,
  Search,
  Filter,
  Eye,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Lock,
  Calendar,
  Edit2,
  Download,
  Printer,
  FileText,
  CheckCircle,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ToggleRight,
  ToggleLeft,
  Upload,
  User,
  X
} from 'lucide-react';
import SignatureCanvas from '../savings/SignatureCanvas';
import toast from 'react-hot-toast';
import { unparse } from 'papaparse';
import * as XLSX from 'xlsx';
// import CurrentAccountWizard from './CurrentAccountWizard';
import ClientCreationForm from './ClientCreationForm';
import CustomerDetailsModal from './CustomerDetailsModal';
import EditCustomerModal from './EditCustomerModal';
import { exportClientPdf, exportClientsPdf } from './exportClientPdf';
import CurrentAccountDetailsView from './CurrentAccountDetailsView';
import apiService from '../../services/apiService';
import CurrentAccountReports from './CurrentAccountReports';
import { AccountType } from '../../types/clientAccounts';
import savingsCustomerService from '../../services/savingsCustomerService';
import clientAccountCustomerLoader from '../../services/clientAccountCustomerLoader';
import { useSearchParams } from 'react-router-dom';

// Types
interface CurrentAccount {
  id: string;
  accountNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  branchId: string;
  currency: 'HTG' | 'USD';
  balance: number;
  minimumBalance?: number;
  dailyWithdrawalLimit?: number;
  monthlyWithdrawalLimit?: number;
  overdraftLimit?: number;
  currentOverdraft: number;
  allowOverdraft: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CLOSED';
  openDate: string;
  lastTransactionDate?: string;
}

// Local type for current account transactions (mirrored from savings, aligned with API usage here)
interface CurrentAccountTransaction {
  id?: string | number;
  transactionDate: string;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL' | string;
  amount: number;
  currency: 'HTG' | 'USD';
  balanceAfter: number;
  balanceBefore?: number;
  reference?: string;
  account?: string;
  performedBy?: string;
  branch?: string;
  status?: string;
  description?: string;
}

interface CurrentAccountStats {
  totalAccounts: number;
  activeAccounts: number;
  totalBalanceHTG: number;
  totalBalanceUSD: number;
  accountsWithOverdraft: number;
  totalOverdraftUsed: number;
  accountsByCurrency: {
    HTG: number;
    USD: number;
  };
  recentTransactions: number;
}

const CurrentAccountManagement: React.FC<{ showTabs?: boolean }> = ({ showTabs = true }) => {
  const [params, setParams] = useSearchParams();
  const [accounts, setAccounts] = useState<CurrentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'HTG' | 'USD'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateNewClientAccountModal, setShowCreateNewClientAccountModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<CurrentAccount | null>(null);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  // New: manage internal tab and initial customer for modal
  const [tab, setTab] = useState<'overview' | 'clients' | 'accounts' | 'transactions' | 'rapports'>('overview');
  const [initialCustomerForOpen, setInitialCustomerForOpen] = useState<any | null>(null);

  const [stats, setStats] = useState<CurrentAccountStats>({
    totalAccounts: 0,
    activeAccounts: 0,
    totalBalanceHTG: 0,
    totalBalanceUSD: 0,
    accountsWithOverdraft: 0,
    totalOverdraftUsed: 0,
    accountsByCurrency: { HTG: 0, USD: 0 },
    recentTransactions: 0,
  });
  // Today's totals (deposits/withdrawals) per currency – placeholder values for now
  const [todayTotals, setTodayTotals] = useState({
    depositsHTG: 0,
    depositsUSD: 0,
    withdrawalsHTG: 0,
    withdrawalsUSD: 0,
  });

  // Initialize filters from URL params once
  useEffect(() => {
    const accSearch = params.get('accSearch') || '';
    const accCurrency = (params.get('accCurrency') || '').toUpperCase();
    const accStatus = (params.get('accStatus') || '').toUpperCase();
    const rawTab = (params.get('tab') || '').toLowerCase();
    if (accSearch) setSearchTerm(accSearch);
    if (accCurrency === 'HTG' || accCurrency === 'USD' || accCurrency === 'ALL') {
      setCurrencyFilter(accCurrency as any);
    }
    if (['ACTIVE','INACTIVE','SUSPENDED','CLOSED'].includes(accStatus)) {
      setStatusFilter(accStatus);
    }
    if (rawTab === 'clients' || rawTab === 'accounts' || rawTab === 'overview' || rawTab === 'transactions' || rawTab === 'rapports') {
      setTab(rawTab as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Keep ONLY account filters in URL; never override the parent 'tab' param.
    // Merge with existing params to avoid flipping tabs due to race conditions.
    const next = new URLSearchParams(params);
    next.set('accSearch', searchTerm || '');
    next.set('accCurrency', currencyFilter);
    next.set('accStatus', statusFilter || '');
    next.set('accBranch', branchFilter || '');
    setParams(next, { replace: true });
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currencyFilter, statusFilter, searchTerm, branchFilter]);

  // Reflect tab changes into URL without disrupting other params
  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set('tab', tab);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Placeholder loader for today's totals (to be wired to backend summary endpoint if/when available)
  useEffect(() => {
    // TODO: Replace with API call like apiService.getCurrentAccountsDailyTotals(date)
    setTodayTotals({ depositsHTG: 0, depositsUSD: 0, withdrawalsHTG: 0, withdrawalsUSD: 0 });
  }, []);

  // Branch list for filters and pagination state for accounts
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [accPage, setAccPage] = useState(1);
  const [accPageSize, setAccPageSize] = useState(10);

  // Load branches for account filters
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiService.getAllBranches();
        const mapped = (data || []).map((b: any) => ({ id: b.id || b.Id, name: b.name || b.Name }));
        if (mounted) setBranches(mapped);
      } catch (e) {
        // non-fatal
      }
    })();
    return () => { mounted = false; };
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
  const filters: any = { accountType: 'CURRENT' };
      if (currencyFilter !== 'ALL') filters.currency = currencyFilter;
      if (statusFilter) filters.status = statusFilter as any;
  if (branchFilter) filters.branchId = branchFilter;
      if (searchTerm) filters.customerName = searchTerm; // also matches accountNumber server-side via query mapper

      const list = await apiService.getClientAccounts(filters);
      // Map to CurrentAccount shape expected locally
  const mapped: CurrentAccount[] = (list || []).map((a: any) => ({
        id: a.id,
        accountNumber: a.accountNumber,
        customerId: a.customerId?.toString?.() || '',
        customerName: a.customerName,
        customerPhone: a.customerPhone,
        branchId: a.branchId?.toString?.() || '',
        currency: a.currency,
        balance: a.balance,
        minimumBalance: a.minimumBalance,
        dailyWithdrawalLimit: a.dailyWithdrawalLimit,
        monthlyWithdrawalLimit: a.monthlyWithdrawalLimit,
        overdraftLimit: (a as any).overdraftLimit,
        currentOverdraft: (a as any).currentOverdraft ?? 0,
        allowOverdraft: (a as any).allowOverdraft ?? ((a as any).overdraftLimit > 0),
        status: a.status,
        openDate: a.openingDate,
        lastTransactionDate: a.lastTransactionDate,
      }));

      // Sort accounts from most recent to oldest based on openDate
      const sortedMapped = mapped.sort((a, b) => {
        const dateA = new Date(a.openDate || 0);
        const dateB = new Date(b.openDate || 0);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      });

      setAccounts(sortedMapped);
      // Update stats based on retrieved data
      await loadStats(mapped);
    } catch (error) {
      console.error('Erreur lors du chargement des comptes:', error);
      toast.error('Erreur lors du chargement des comptes courants');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (source?: CurrentAccount[]) => {
    try {
      const list = source || accounts;
      const totalAccounts = list.length;
      const activeAccounts = list.filter(a => a.status === 'ACTIVE').length;
      const totalBalanceHTG = list.filter(a => a.currency === 'HTG').reduce((sum, a) => sum + a.balance, 0);
      const totalBalanceUSD = list.filter(a => a.currency === 'USD').reduce((sum, a) => sum + a.balance, 0);
      const accountsWithOverdraft = list.filter(a => (a.overdraftLimit ?? 0) > 0).length;
      const totalOverdraftUsed = list.reduce((sum, a) => sum + (a.currentOverdraft ?? 0), 0);
      const accountsByCurrency = {
        HTG: list.filter(a => a.currency === 'HTG').length,
        USD: list.filter(a => a.currency === 'USD').length,
      };
      // For recentTransactions, we might need to keep API call or set to 0
      const recentTransactions = 0; // Since we don't have transaction data, set to 0

      setStats({
        totalAccounts,
        activeAccounts,
        totalBalanceHTG,
        totalBalanceUSD,
        accountsWithOverdraft,
        totalOverdraftUsed,
        accountsByCurrency,
        recentTransactions,
      });
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
    }
  };

  const handleCreateAccount = async (accountData: any) => {
    try {
      // TODO: Implémenter l'appel API
      console.log('Creating current account:', accountData);
      toast.success('Compte courant créé avec succès!');
      setShowCreateForm(false);
      await loadAccounts();
      await loadStats();
    } catch (error) {
      console.error('Erreur lors de la création du compte:', error);
      toast.error('Erreur lors de la création du compte');
    }
  };

  const handleViewAccount = (account: CurrentAccount) => {
    setSelectedAccount(account);
    setShowAccountDetails(true);
  };

  const handleCloseAccount = async (accountId: string) => {
    const reason = prompt('Raison de la fermeture du compte:');
    if (!reason) return;

    try {
      setLoading(true);
      try {
        await apiService.closeClientAccount(accountId, reason);
      } catch (err: any) {
        // If backend rejects or requires elevated privileges, surface message
        if (err?.response?.status === 403) {
          toast.error("Vous n'avez pas l'autorisation pour fermer ce compte");
        } else {
          throw err;
        }
      }
      toast.success('Compte fermé avec succès');
      await loadAccounts();
      await loadStats();
    } catch (error) {
      console.error('Erreur lors de la fermeture du compte:', error);
      toast.error('Erreur lors de la fermeture du compte');
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch =
      (account.accountNumber && account.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (account.customerName && account.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (account.customerPhone && account.customerPhone.includes(searchTerm));

    const matchesCurrency = currencyFilter === 'ALL' || account.currency === currencyFilter;
    const matchesStatus = !statusFilter || account.status === statusFilter;
    const matchesBranch = !branchFilter || String(account.branchId) === String(branchFilter);

    return matchesSearch && matchesCurrency && matchesStatus && matchesBranch;
  });

  // Pagination for filtered accounts
  const totalFilteredAccounts = filteredAccounts.length;
  const totalAccPages = Math.max(1, Math.ceil(totalFilteredAccounts / accPageSize));
  const paginatedAccounts = filteredAccounts.slice((accPage - 1) * accPageSize, accPage * accPageSize);

  // Reset page when filters/search change
  useEffect(() => { setAccPage(1); }, [searchTerm, currencyFilter, statusFilter, branchFilter]);

  // Export helpers for accounts (operate on filteredAccounts)
  const exportAccountsCSV = () => {
    try {
      const data = filteredAccounts.map(a => ({
        id: a.id,
        accountNumber: a.accountNumber,
        customerName: a.customerName,
        phone: a.customerPhone,
        branch: branches.find(b => String(b.id) === String(a.branchId))?.name || '',
        currency: a.currency,
        balance: a.balance,
        status: a.status,
        opened: a.openDate
      }));
      const csv = unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accounts_current_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 2000);
      toast.success('Export CSV prêt');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportAccountsExcel = () => {
    try {
      const data = filteredAccounts.map(a => ({
        ID: a.id,
        NumeroCompte: a.accountNumber,
        Client: a.customerName,
        Telephone: a.customerPhone,
        Succursale: branches.find(b => String(b.id) === String(a.branchId))?.name || '',
        Devise: a.currency,
        Solde: a.balance,
        Statut: a.status,
        OuvertLe: a.openDate
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Comptes');
      XLSX.writeFile(wb, `accounts_current_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success('Export XLSX prêt');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  const exportAccountsPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) { toast.error('Veuillez autoriser les pop-ups pour exporter en PDF'); return; }
      const rows = filteredAccounts.map(a => `
        <tr>
          <td style=\"padding:8px;border:1px solid #ddd\">${a.accountNumber}</td>
          <td style=\"padding:8px;border:1px solid #ddd\">${a.customerName}</td>
          <td style=\"padding:8px;border:1px solid #ddd\">${branches.find(b => String(b.id) === String(a.branchId))?.name || ''}</td>
          <td style=\"padding:8px;border:1px solid #ddd\">${a.currency}</td>
          <td style=\"padding:8px;border:1px solid #ddd\">${a.balance}</td>
          <td style=\"padding:8px;border:1px solid #ddd\">${a.status}</td>
        </tr>
      `).join('');
      const html = `
        <html><head><meta charset=\"utf-8\"><title>Comptes Courants</title>
        <style>table{border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif}th,td{border:1px solid #ddd;padding:8px}th{background:#f3f4f6;text-align:left}</style>
        </head><body>
        <h2>Liste Comptes Courants</h2>
        <p>Exporté le ${new Date().toLocaleString('fr-FR')}</p>
        <table>
          <thead><tr><th>Compte</th><th>Client</th><th>Succursale</th><th>Devise</th><th>Solde</th><th>Statut</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.onload = ()=>{ setTimeout(()=>{ window.print(); },300); };</script>
        </body></html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      toast.success('Fenêtre d\'export ouverte - utilisez Imprimer pour sauver en PDF');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  const formatCurrency = (amount: number, currency: 'HTG' | 'USD') => {
    if (currency === 'HTG') {
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount) + ' HTG';
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', label: 'Actif' },
      INACTIVE: { bg: 'bg-red-100', text: 'text-red-800', label: 'Inactif' },
      CLOSED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Fermé' },
      SUSPENDED: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Suspendu' }
    };
    const config = configs[status as keyof typeof configs] || configs.ACTIVE;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      {showTabs && (
        <div className="flex gap-2 border-b">
          {[
            { k: 'overview', label: "Vue d'ensemble" },
            { k: 'clients', label: 'Clients' },
            { k: 'accounts', label: 'Comptes' },
            { k: 'transactions', label: 'Transactions' },
            { k: 'rapports', label: 'Rapports' },
          ].map((t: any) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-4 py-2 -mb-px border-b-2 ${tab === t.k ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Overview Tab */}
      {tab === 'overview' && showTabs && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vue d'ensemble - Comptes Courants</h1>
            <p className="text-gray-600 mt-1">Résumé des comptes courants, par devise et actions rapides</p>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {/* Comptes Courants HTG */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Comptes Courants HTG</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.accountsByCurrency?.HTG ?? 0}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Comptes Courants USD */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Comptes Courants USD</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.accountsByCurrency?.USD ?? 0}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Wallet className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Solde total HTG */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Solde Total HTG</p>
                  <p className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(stats.totalBalanceHTG)} HTG</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Solde total USD */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Solde Total USD</p>
                  <p className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(stats.totalBalanceUSD)} USD</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Total Comptes */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Comptes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAccounts}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Taux de dominance HTG */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">HTG Dominance</p>
                  <p className="text-2xl font-bold text-blue-700">{(() => {
                    const total = (stats.totalBalanceHTG || 0) + (stats.totalBalanceUSD || 0);
                    const pct = total > 0 ? (stats.totalBalanceHTG / total) * 100 : 0;
                    return pct.toFixed(1);
                  })()}%</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
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
            {/* Advanced Filters Toggle */}
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
                      <p className="text-xs text-gray-500">{stats.accountsByCurrency?.HTG ?? 0} comptes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{(() => {
                      const total = (stats.totalBalanceHTG || 0) + (stats.totalBalanceUSD || 0);
                      const pct = total > 0 ? (stats.totalBalanceHTG / total) * 100 : 0;
                      return pct.toFixed(1);
                    })()}%</p>
                  </div>
                </div>

                <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500" style={{ width: `${(() => {
                    const total = (stats.totalBalanceHTG || 0) + (stats.totalBalanceUSD || 0);
                    const pct = total > 0 ? (stats.totalBalanceHTG / total) * 100 : 0;
                    return pct;
                  })()}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Solde total</span>
                  <span className="font-bold text-blue-600">{new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(stats.totalBalanceHTG)} HTG</span>
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
                      <p className="text-xs text-gray-500">{stats.accountsByCurrency?.USD ?? 0} comptes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{(() => {
                      const total = (stats.totalBalanceHTG || 0) + (stats.totalBalanceUSD || 0);
                      const pct = total > 0 ? (stats.totalBalanceUSD / total) * 100 : 0;
                      return pct.toFixed(1);
                    })()}%</p>
                  </div>
                </div>

                <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500" style={{ width: `${(() => {
                    const total = (stats.totalBalanceHTG || 0) + (stats.totalBalanceUSD || 0);
                    const pct = total > 0 ? (stats.totalBalanceUSD / total) * 100 : 0;
                    return pct;
                  })()}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Solde total</span>
                  <span className="font-bold text-green-600">{new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(stats.totalBalanceUSD)} USD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => setTab('clients')}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Users className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Rechercher Client</span>
              </button>
              <button
                onClick={() => setTab('accounts')}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
              >
                <Plus className="h-8 w-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Ouvrir Compte</span>
              </button>
              <button
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.set('tab', 'transactions');
                  setParams(next, { replace: true });
                }}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Transactions</span>
              </button>
              <button
                onClick={() => setTab('accounts')}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                <CreditCard className="h-8 w-8 text-indigo-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Gérer Comptes</span>
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Header */}
      {tab === 'accounts' && (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Comptes Courants</h2>
          <p className="text-gray-600 mt-1">
            Gestion des comptes courants avec découvert autorisé
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nouveau Compte Courant</span>
          </button>
          <button
            onClick={() => setShowCreateNewClientAccountModal(true)}
            className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <UserPlus className="h-5 w-5" />
            <span>Nouveau Client + Compte</span>
          </button>
        </div>
      </div>
      )}

      {/* Statistics Cards */}
      {tab === 'accounts' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Comptes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAccounts}</p>
              <p className="text-sm text-green-600 mt-1">
                {stats.activeAccounts} actifs
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Solde Total HTG</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalBalanceHTG, 'HTG')}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Solde Total USD</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.totalBalanceUSD, 'USD')}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Découverts Utilisés</p>
              <p className="text-2xl font-bold text-orange-600">{stats.accountsWithOverdraft}</p>
              <p className="text-sm text-gray-500 mt-1">
                {formatCurrency(stats.totalOverdraftUsed, 'USD')}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Filters and Search */}
      {tab === 'accounts' && (
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro de compte, nom client, téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Export buttons for accounts */}
          {filteredAccounts.length > 0 && (
            <>
              <button
                onClick={() => exportAccountsPDF()}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
              >
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button
                onClick={() => exportAccountsCSV()}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
              <button
                onClick={() => exportAccountsExcel()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
              >
                <Download className="h-4 w-4" /> XLSX
              </button>
            </>
          )}
        </div>

        <select
          value={currencyFilter}
          onChange={(e) => setCurrencyFilter(e.target.value as any)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="ALL">Toutes devises</option>
          <option value="HTG">HTG</option>
          <option value="USD">USD</option>
        </select>

        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Toutes succursales</option>
          {branches.map(b => (
            <option key={b.id} value={String(b.id)}>{b.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Tous statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="INACTIVE">Inactif</option>
          <option value="SUSPENDED">Suspendu</option>
          <option value="CLOSED">Fermé</option>
        </select>
      </div>
      )}

      {/* Accounts List */}
      {tab === 'accounts' && (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredAccounts.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun compte trouvé</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? 'Aucun compte ne correspond à votre recherche'
                : 'Commencez par créer un nouveau compte courant'}
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Compte
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solde
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Découvert
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{account.accountNumber}</div>
                          <div className="text-sm text-gray-500">{account.currency}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{account.customerName}</div>
                      <div className="text-sm text-gray-500">{account.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(account.balance, account.currency)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Min: {formatCurrency(account.minimumBalance || 0, account.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {account.allowOverdraft ? (
                        <div>
                          <div className={`text-sm font-medium ${account.currentOverdraft > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                            {formatCurrency(account.currentOverdraft, account.currency)}
                          </div>
                          <div className="text-xs text-gray-500">
                            / {formatCurrency(account.overdraftLimit || 0, account.currency)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Non autorisé</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(account.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewAccount(account)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Voir détails"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          const next: Record<string, string> = {
                            tab: 'transactions',
                            account: account.accountNumber,
                            accSearch: params.get('accSearch') || '',
                            accCurrency: params.get('accCurrency') || currencyFilter,
                            accStatus: params.get('accStatus') || statusFilter
                          };
                          setParams(next, { replace: true });
                        }}
                        className="ml-3 text-purple-600 hover:text-purple-900 transition-colors"
                        title="Voir transactions"
                      >
                        <TrendingUp className="h-5 w-5" />
                      </button>
                      {account.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleCloseAccount(account.id)}
                          className="ml-3 text-red-600 hover:text-red-900 transition-colors"
                          title="Fermer compte"
                        >
                          <Lock className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {/* Pagination controls for accounts list */}
          <div className="p-4 border-t bg-white flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Affichage {Math.min((accPage - 1) * accPageSize + 1, totalFilteredAccounts)} - {Math.min(accPage * accPageSize, totalFilteredAccounts)} sur {totalFilteredAccounts} comptes
            </div>
            <div className="flex items-center gap-2">
              <select value={accPageSize} onChange={(e) => setAccPageSize(Number(e.target.value))} className="px-3 py-2 border rounded">
                {[10,20,50,100].map(n => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <button onClick={() => setAccPage(Math.max(1, accPage - 1))} disabled={accPage <= 1} className="px-3 py-2 border rounded disabled:opacity-50">Préc</button>
              <span className="px-2 text-sm">{accPage} / {totalAccPages}</span>
              <button onClick={() => setAccPage(Math.min(totalAccPages, accPage + 1))} disabled={accPage >= totalAccPages} className="px-3 py-2 border rounded disabled:opacity-50">Suiv</button>
            </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Clients Tab */}
      {tab === 'clients' && showTabs && (
        <ClientsTabCurrent onOpenCurrent={(customer) => { setInitialCustomerForOpen(customer); setShowCreateForm(true); }} />
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && showTabs && (
        
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions - Comptes Courants</h1>
            <p className="text-gray-600 mt-1">Résumé des transactions des comptes courants, par devise et actions rapides</p>
          </div>
          <TransactionsTabCurrent />
        </div>
      )}

      {/* Rapports Tab */}
      {tab === 'rapports' && showTabs && (
        <div className="space-y-6">
          <CurrentAccountReports />
        </div>
      )}

      {/* Open Current Account Modal (Existing Client) */}
      {showCreateForm && (
        <OpenCurrentAccountModal
          initialCustomer={initialCustomerForOpen || undefined}
          onClose={() => { setShowCreateForm(false); setInitialCustomerForOpen(null); }}
          onSuccess={async () => {
            setShowCreateForm(false);
            setInitialCustomerForOpen(null);
            await loadAccounts();
            toast.success('Compte courant créé');
          }}
        />
      )}

      {/* Create NEW Client then Current Account Modal */}
      {showCreateNewClientAccountModal && (
        <CreateCurrentAccountWithNewCustomerModal
          onClose={() => setShowCreateNewClientAccountModal(false)}
          onSuccess={async () => {
            setShowCreateNewClientAccountModal(false);
            await loadAccounts();
            toast.success('Client créé et compte courant ouvert');
          }}
        />
      )}

      {/* Account Details Modal (richer view) */}
      {showAccountDetails && selectedAccount && (
        <CurrentAccountDetailsView
          accountId={selectedAccount.id}
          onClose={() => { setShowAccountDetails(false); setSelectedAccount(null); }}
          onUpdate={async () => { await loadAccounts(); await loadStats(); }}
        />
      )}
    </div>
  );
};

export default CurrentAccountManagement;

// Clients tab: list/search customers and open a current account directly
const ClientsTabCurrent: React.FC<{ onOpenCurrent: (customer: any) => void }> = ({ onOpenCurrent }) => {
  const [loading, setLoading] = useState(false);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const lastRef = useRef<string>('');

  // Advanced filters state
  const [filters, setFilters] = useState({
    branch: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination state for clients list
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

  // Load branch list for filter options
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiService.getAllBranches();
        const mapped = (data || []).map((b: any) => ({ id: b.id || b.Id, name: b.name || b.Name }));
        if (mounted) setBranches(mapped);
      } catch (e) {
        // non-fatal
      }
    })();
    return () => { mounted = false; };
  }, []);

  const CODE_PATTERN = /^[A-Z]{2}\d{3,}$/; // e.g., TD5765

  const formatPhoneDisplay = (raw?: string) => {
    if (!raw) return '—';
    const digits = raw.replace(/\D+/g, '');
    if (digits.length === 11 && digits.startsWith('509')) {
      return `${digits.substring(0,3)}-${digits.substring(3,7)}-${digits.substring(7,11)}`;
    }
    if (digits.length === 8) {
      return `509-${digits.substring(0,4)}-${digits.substring(4,8)}`;
    }
    return raw;
  };

  const formatDateDisplay = (raw?: string) => {
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR');
  };

  const docTypeLabel = (t?: number) => {
    switch (t) {
      case 0: return 'CIN';
      case 1: return 'Passeport';
      case 2: return 'Permis';
      case 3: return 'Cert. Naissance';
      default: return 'Document';
    }
  };

  // Derive a stable display ID similar to ClientAccountManagement
  const getDisplayClientId = (customer: any): string => {
    try {
      if (!customer) return 'N/A';
      if (customer.customerCode) return customer.customerCode;
      const docNum = customer.identity?.documentNumber || customer.identity?.DocumentNumber;
      if (docNum && String(docNum).length <= 8) return String(docNum);

      const firstInitial = (customer.firstName || customer.FirstName || 'X').toString().charAt(0).toUpperCase();
      const lastInitial = (customer.lastName || customer.LastName || 'X').toString().charAt(0).toUpperCase();
      const fullName = `${customer.firstName || ''}${customer.lastName || ''}${customer.dateOfBirth || ''}`;
      let hash = 0;
      for (let i = 0; i < fullName.length; i++) {
        const char = fullName.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      hash = Math.abs(hash);
      const digits = (hash % 9000 + 1000).toString();
      return `${firstInitial}${lastInitial}${digits}`;
    } catch (e) {
      return customer.customerCode || customer.id || 'N/A';
    }
  };

  const toggleCustomerStatus = async (customer: any) => {
    if (!window.confirm(`Confirmer ${customer.isActive ? 'la désactivation' : 'l\'activation'} du client ${customer.fullName} ?`)) {
      return;
    }
    try {
      setLoading(true);
      try {
        await savingsCustomerService.toggleCustomerStatus(customer.id || customer.Id);
      } catch (err: any) {
        if (err?.response?.status === 403) {
          await savingsCustomerService.toggleCustomerStatus(customer.id || customer.Id, true);
        } else {
          throw err;
        }
      }
      toast.success(`Client ${customer.isActive ? 'désactivé' : 'activé'} avec succès`);
      await loadCurrentClients();
    } catch (error: any) {
      console.error('Error toggling customer status:', error);
      toast.error(error?.response?.data?.message || 'Erreur lors du changement de statut');
    } finally {
      setLoading(false);
    }
  };

  const showCustomerDetails = (customer: any) => {
    setSelectedCustomer(customer);
    setShowCustomerDetailsModal(true);
  };

  // PDF export now centralized in exportClientPdf.ts

  const handleViewCustomerDetails = (customer: any) => {
    setSelectedCustomer(customer);
    setShowCustomerDetailsModal(true);
  };

  const handleEditCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setShowEditForm(true);
  };

  const loadCurrentClients = async () => {
    setLoading(true);
    try {
      const matched = await clientAccountCustomerLoader.loadCustomersHavingAccounts('CURRENT');
      // Sort by most recent first (createdAt descending)
      const sorted = Array.isArray(matched) ? matched.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      }) : matched;
      setResults(sorted || []);
      if (!matched?.length) toast('Aucun client trouvé avec compte courant');
    } catch (e) {
      console.error('❌ Error loading current clients:', e);
      toast.error('Erreur lors du chargement des clients (courants)');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const doSearch = async () => {
    const raw = term.trim();
    if (!raw || raw.length < 2) return;
    try {
      const q = raw.toUpperCase();
      if (lastRef.current === q) return;
      lastRef.current = q;
      setLoading(true);
      const list = await savingsCustomerService.searchCustomers(q);
      setResults(list || []);
    } catch (e) {
      console.error(e);
      toast.error('Erreur de recherche client');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { loadCurrentClients(); }, []);
  React.useEffect(() => {
    const raw = term.trim();
    if (!raw || raw.length < 2) return;
    const upper = raw.toUpperCase();
    const delay = CODE_PATTERN.test(upper) ? 200 : 500;
    const h = setTimeout(() => { if (lastRef.current !== upper) doSearch(); }, delay);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const filteredCustomers = Array.isArray(results) ? results.filter(customer => {
    // Filtre par succursale (branch) — attached by clientAccountCustomerLoader when possible
    if (filters.branch) {
      const branchName = (customer as any).accountBranchName || (customer as any).branchName || (customer as any).branch || '';
      if (branchName !== filters.branch) return false;
    }

    // Filtre par statut
    if (filters.status && (customer as any).status !== filters.status) {
      return false;
    }

    // Filtre par date de création
    if (filters.dateFrom || filters.dateTo) {
      const createdDate = new Date((customer as any).createdAt || customer.identity?.issuedDate || customer.dateOfBirth);
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        if (createdDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (createdDate > toDate) return false;
      }
    }

    return true;
  }) : [];

  // Pagination calculations
  const totalFiltered = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  // Ensure current page is valid when filters change
  useEffect(() => {
    if (page > totalPages) setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalFiltered, pageSize]);

  const paginatedCustomers = filteredCustomers.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Clients Comptes Courants</h2>
          <p className="text-gray-600 mt-1">
            Rechercher, filtrer et gérer tous les clients avec comptes courants
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone, ou numéro de document..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Export buttons (placed above advanced filters) */}
        {filteredCustomers.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => exportClientsPdf(filteredCustomers, 'Liste Clients - Comptes Courants')}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
            >
              <FileText className="h-4 w-4" /> PDF
            </button>

            <button
              onClick={() => {
                try {
                  const rows = filteredCustomers.map((c: any) => ({
                    id: c.id || '',
                    fullName: c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                    phone: (c.contact?.primaryPhone) || '',
                    email: c.contact?.email || '',
                    documentNumber: c.identity?.documentNumber || '',
                    branch: (c as any).accountBranchName || c.branchName || c.branch || '',
                    commune: c.address?.commune || '',
                    department: c.address?.department || '',
                    createdAt: c.createdAt || '',
                    status: c.isActive ? 'Actif' : 'Inactif'
                  }));
                  const csv = unparse(rows);
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  const url = URL.createObjectURL(blob);
                  link.href = url;
                  link.download = `clients_current_${new Date().toISOString().slice(0,10)}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 2000);
                  toast.success('Export CSV prêt');
                } catch (e) {
                  console.error('CSV export error', e);
                  toast.error('Erreur lors de l\'export CSV');
                }
              }}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
            >
              <Download className="h-4 w-4" /> CSV
            </button>

            <button
              onClick={() => {
                try {
                  const data = filteredCustomers.map((c: any) => ({
                    id: c.id || '',
                    fullName: c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                    phone: (c.contact?.primaryPhone) || '',
                    email: c.contact?.email || '',
                    documentNumber: c.identity?.documentNumber || '',
                    branch: (c as any).accountBranchName || c.branchName || c.branch || '',
                    commune: c.address?.commune || '',
                    department: c.address?.department || '',
                    createdAt: c.createdAt || '',
                    status: c.isActive ? 'Actif' : 'Inactif'
                  }));
                  const ws = XLSX.utils.json_to_sheet(data);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Clients');
                  XLSX.writeFile(wb, `clients_current_${new Date().toISOString().slice(0,10)}.xlsx`);
                  toast.success('Export XLSX prêt');
                } catch (e) {
                  console.error('XLSX export error', e);
                  toast.error('Erreur lors de l\'export XLSX');
                }
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
            >
              <Download className="h-4 w-4" /> XLSX
            </button>
          </div>
        )}

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="mt-3 flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
        >
          <Filter className="h-4 w-4" />
          <span>Filtres avancés</span>
          {showAdvancedFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Branch (Succursale) Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Succursale
                </label>
                <select
                  value={filters.branch}
                  onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Toutes les succursales</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tous les statuts</option>
                  <option value="ACTIVE">Actif</option>
                  <option value="INACTIVE">Inactif</option>
                  <option value="PENDING">En attente</option>
                </select>
              </div>

              {/* Date From Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Date To Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="mt-4 flex items-center space-x-3">
              <button
                onClick={() => setFilters({ branch: '', status: '', dateFrom: '', dateTo: '' })}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Réinitialiser les filtres
              </button>
              <div className="text-sm text-gray-600">
                {filteredCustomers.length} client{filteredCustomers.length > 1 ? 's' : ''} trouvé{filteredCustomers.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && <div className="text-sm text-gray-500">Recherche en cours...</div>}

      {!loading && filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun client trouvé</h3>
          <p className="text-gray-500">Essayez de modifier vos critères de recherche</p>
        </div>
      )}

      {filteredCustomers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adresse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">Aucun client pour le moment</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.filter((c: any) => c && c.id).map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{customer.fullName || 'N/A'}</div>
                          <div className="text-sm text-gray-500">ID: {getDisplayClientId(customer)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.contact?.primaryPhone || 'N/A'}</div>
                      {customer.contact?.email && (
                        <div className="text-sm text-gray-500">{customer.contact.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {customer.documents && customer.documents.length > 0 ? (
                          <div className="flex flex-col space-y-1">
                            <span className="font-medium">{customer.documents.length} document(s)</span>
                            <div className="flex flex-wrap gap-1">
                              {customer.documents.slice(0, 2).map((doc: any, index: number) => (
                                <span key={index} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  {doc.documentTypeName || doc.documentType || 'Document'}
                                </span>
                              ))}
                              {customer.documents.length > 2 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">+{customer.documents.length - 2} autres</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">Aucun document</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{customer.address?.commune || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{customer.address?.department || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.isActive ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Actif</span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Inactif</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          disabled={!customer.id}
                          className="text-blue-600 hover:text-blue-900 transition-colors p-2 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Modifier"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleViewCustomerDetails(customer)}
                          disabled={!customer.id}
                          className="text-gray-600 hover:text-gray-900 transition-colors p-2 hover:bg-gray-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Voir les détails"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => customer && exportClientPdf(customer)}
                          disabled={!customer}
                          className="text-green-600 hover:text-green-900 transition-colors p-2 hover:bg-green-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Ekspò PDF"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="px-4 py-3 bg-white border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Affichage {(page - 1) * pageSize + 1} – {Math.min(page * pageSize, totalFiltered)} sur {totalFiltered}
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Lignes</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 border rounded"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >Préc</button>

              <span className="text-sm">Page</span>
              <select
                value={page}
                onChange={(e) => setPage(Number(e.target.value))}
                className="px-2 py-1 border rounded"
              >
                {Array.from({ length: totalPages }).map((_, i) => (
                  <option key={i} value={i + 1}>{i + 1}</option>
                ))}
              </select>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >Suiv</button>
            </div>
          </div>
        </div>
      )}

      {showCustomerDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{selectedCustomer.fullName || 'Nom inconnu'}</h3>
                {(selectedCustomer.customerCode || selectedCustomer.CustomerCode) && (
                  <p className="text-blue-100">Code Client: {selectedCustomer.customerCode || selectedCustomer.CustomerCode}</p>
                )}
              </div>
              <button onClick={() => setShowCustomerDetailsModal(false)} className="text-white/90 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Informations Personnelles</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Code Client</div>
                    <div className="text-gray-900">{selectedCustomer.customerCode || selectedCustomer.CustomerCode || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Prénom</div>
                    <div className="text-gray-900">{selectedCustomer.firstName || selectedCustomer.FirstName || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Nom</div>
                    <div className="text-gray-900">{selectedCustomer.lastName || selectedCustomer.LastName || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Date de Naissance</div>
                    <div className="text-gray-900">{formatDateDisplay(selectedCustomer.dateOfBirth || selectedCustomer.DateOfBirth)}</div>
                  </div>
                </div>
              </div>
                <div className="flex justify-end gap-2">
                <button onClick={() => exportClientPdf(selectedCustomer)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Exporter en PDF</button>
                <button onClick={() => setShowCustomerDetailsModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      <CustomerDetailsModal
        customer={selectedCustomer}
        isOpen={showCustomerDetailsModal}
        onClose={() => setShowCustomerDetailsModal(false)}
        onEdit={handleEditCustomer}
      />

      {/* Edit Customer Modal */}
      <EditCustomerModal
        customer={selectedCustomer}
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSuccess={loadCurrentClients}
      />
    </div>
  );
};



// Transactions tab: search and display transactions for current accounts
const TransactionsTabCurrent: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [transactions, setTransactions] = useState<CurrentAccountTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<CurrentAccountTransaction[]>([]);
  // Pagination for transactions
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(20);
  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL' | 'OTHER' | 'CANCELLED'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [params, setParams] = useSearchParams();
  const accountInputRef = useRef<HTMLInputElement | null>(null);
  const [showNewTxModal, setShowNewTxModal] = useState(false);
  const newTxAccountRef = useRef<HTMLInputElement | null>(null);
  type NewTxType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  type NewTxCurrency = 'HTG' | 'USD';
  const [newTx, setNewTx] = useState<{ 
    accountNumber: string;
    destinationAccountNumber?: string;
    type: NewTxType;
    currency: NewTxCurrency;
    amount: string;
    description?: string;
    clientPresent: boolean;
    verificationMethod: string;
    notes?: string;
  }>({
    accountNumber: '',
    destinationAccountNumber: '',
    type: 'DEPOSIT',
    currency: 'HTG',
    amount: '',
    description: '',
    clientPresent: true,
    verificationMethod: '',
    notes: ''
  });
  const [newTxClientName, setNewTxClientName] = useState<string>('');
  const [newTxLookupLoading, setNewTxLookupLoading] = useState<boolean>(false);
  const newTxLookupTimer = useRef<any>(null);
  const [newTxAccountInfo, setNewTxAccountInfo] = useState<{ name?: string; currency?: NewTxCurrency; balance?: number; status?: string } | null>(null);
  // Destination/destination account lookup state for transfers
  const [newTxDestinationClientName, setNewTxDestinationClientName] = useState<string>('');
  const [newTxDestinationLookupLoading, setNewTxDestinationLookupLoading] = useState<boolean>(false);
  const newTxDestinationLookupTimer = useRef<any>(null);
  const [newTxDestinationInfo, setNewTxDestinationInfo] = useState<{ name?: string; currency?: NewTxCurrency; balance?: number; status?: string } | null>(null);
  const [newTxSubmitting, setNewTxSubmitting] = useState<boolean>(false);
  const [accountLiveInfo, setAccountLiveInfo] = useState<{ balance: number; availableBalance: number; currency: 'HTG' | 'USD'; status?: string } | null>(null);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

  // Normalize backend status (enum int or various strings) to canonical tokens
  const normalizeStatus = (raw: any): 'COMPLETED' | 'CANCELLED' | 'PENDING' | 'FAILED' | 'PROCESSING' | string => {
    if (raw == null) return 'COMPLETED';
    if (typeof raw === 'number') {
      switch (raw) {
        case 0: return 'PENDING';
        case 1: return 'PROCESSING';
        case 2: return 'COMPLETED';
        case 3: return 'CANCELLED';
        case 4: return 'FAILED';
        default: return String(raw);
      }
    }
    const u = String(raw).trim().toUpperCase();
    if (u.includes('ANNUL')) return 'CANCELLED'; // ANNULÉ / ANNULE / ANNULER
    if (u.includes('CANCEL')) return 'CANCELLED';
    if (u.includes('FAIL') || u.includes('ECHEC') || u.includes('ÉCHEC') || u.includes('ECHOU')) return 'FAILED';
    if (u.includes('PROCESS')) return 'PROCESSING';
    if (u.includes('PEND') || u.includes('ATTENT')) return 'PENDING';
    if (u.includes('COMPLETE') || u.includes('COMPLET')) return 'COMPLETED';
    return u;
  };

  const localizedStatus = (s?: string) => {
    const n = normalizeStatus(s || '');
    switch (n) {
      case 'COMPLETED': return 'Complété';
      case 'CANCELLED': return 'Annulé';
      case 'PENDING': return 'En attente';
      case 'PROCESSING': return 'En cours';
      case 'FAILED': return 'Échoué';
      default: return n || '—';
    }
  };

  const refreshBalance = async (acc: string) => {
    try {
      const info = await apiService.getCurrentAccountBalance(acc);
      setAccountLiveInfo(info);
    } catch (e) {
      // Non-blocking
    }
  };

  const loadTransactions = async (numOverride?: string) => {
    const acc = (numOverride ?? accountNumber).trim();
    if (!acc) return;
    try {
      setLoading(true);
      const data = await apiService.getAccountTransactions(acc);
      const raw: any[] = (data as any[]) || [];
      const mapped: CurrentAccountTransaction[] = raw.map((t: any) => {
        const amount = Number(
          t.amount ?? t.Amount ?? t.initialDeposit ?? t.InitialDeposit ?? t.openingDeposit ?? t.OpeningDeposit ?? 0
        );
        const balanceAfter = Number(
          t.balanceAfter ?? t.BalanceAfter ?? t.balanceAfterAmount ?? t.balance ?? 0
        );
        const balanceBefore = (t.balanceBefore != null)
          ? Number(t.balanceBefore)
          : (t.BalanceBefore != null ? Number(t.BalanceBefore) : (balanceAfter - amount));
        const statusRaw = (t.status ?? t.Status ?? t.state ?? t.State);
        return {
          id: (t.id ?? t.Id ?? t.transactionId ?? t.TransactionId ?? t.txId ?? t.TxId ?? t.sourceId ?? t.SourceId),
          transactionDate: t.transactionDate || t.date || t.Date || t.timestamp || t.openingDate || t.createdAt || t.CreatedAt || t.processedAt,
          transactionType: t.transactionType || t.type || t.Type || t.kind || t.operation,
          amount,
          currency: (t.currency || 'HTG') as 'HTG' | 'USD',
          balanceAfter,
          balanceBefore,
          reference: t.reference || t.ref || t.transactionRef || t.referenceNumber || t.openingReference || `TXN-${t.id || t.Id}`,
          account: t.accountNumber || t.account || accountNumber,
          performedBy: t.performedBy || t.user || t.User || t.cashier || t.processedByName || t.processedBy || 'Système',
          branch: t.branchName || t.branch || t.BranchName || t.Branch || '',
          status: normalizeStatus(statusRaw),
          description: t.description || t.memo || ''
        } as CurrentAccountTransaction;
      });
      console.log('[DEBUG] Mapped transactions:', mapped);
      // Sort by date descending (most recent first)
      const sorted = mapped.sort((a, b) => {
        const dateA = new Date(a.transactionDate).getTime();
        const dateB = new Date(b.transactionDate).getTime();
        return dateB - dateA;
      });
      console.log('[DEBUG] Final sorted transactions:', sorted);
      setTransactions(sorted);
      // Persist account filter in URL so refresh keeps the list
      try {
        const next = new URLSearchParams(params);
        next.set('tab', 'transactions');
        next.set('account', acc);
        setParams(next, { replace: true } as any);
      } catch {}
      // Also refresh current balance/status for this account
      refreshBalance(acc);
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      toast.error('Erreur lors du chargement des transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Prefill from URL param (?account=CC-123) and auto-load
  useEffect(() => {
    const acc = (params.get('account') || '').trim();
    if (acc && acc !== accountNumber) {
      setAccountNumber(acc);
      // Trigger load with the param value to avoid stale state
      loadTransactions(acc);
      refreshBalance(acc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Fetch all available branches for filter options
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await apiService.getAllBranches();
        const mapped = (data || []).map((b: any) => ({ id: b.id || b.Id, name: b.name || b.Name }));
        setBranches(mapped);
      } catch (e) {
        console.error('Error fetching branches:', e);
        // Non-blocking, will fall back to transaction-derived options
      }
    };
    fetchBranches();
  }, []);

  // Listen for "start-new-transaction" to open modal and prefill account number
  useEffect(() => {
    const handler = () => {
      setShowNewTxModal(true);
      setNewTx((prev) => ({
        ...prev,
        accountNumber: accountNumber || prev.accountNumber
      }));
      setTimeout(() => {
        if (newTxAccountRef.current) {
          newTxAccountRef.current.focus();
          newTxAccountRef.current.select();
        }
      }, 50);
    };
    window.addEventListener('start-new-transaction' as any, handler as EventListener);
    return () => window.removeEventListener('start-new-transaction' as any, handler as EventListener);
  }, []);

  // When account number changes in the modal, lookup and display customer name automatically
  useEffect(() => {
    const acc = (newTx.accountNumber || '').trim();
    if (newTxLookupTimer.current) {
      clearTimeout(newTxLookupTimer.current);
      newTxLookupTimer.current = null;
    }
    if (!acc || acc.length < 3) {
      setNewTxClientName('');
      setNewTxLookupLoading(false);
      setNewTxAccountInfo(null);
      return;
    }
    newTxLookupTimer.current = setTimeout(async () => {
      try {
        setNewTxLookupLoading(true);
        const list = await apiService.getClientAccounts({ accountType: AccountType.CURRENT, accountNumber: acc } as any);
        const first = (list || [])[0];
        const name = first?.customerName || '';
        setNewTxClientName(name);
        setNewTxAccountInfo(first ? {
          name,
          currency: (first.currency as NewTxCurrency) || 'HTG',
          balance: typeof first.balance === 'number' ? first.balance : Number(first.balance || 0),
          status: first.status || ''
        } : null);
      } catch (e) {
        setNewTxClientName('');
        setNewTxAccountInfo(null);
      } finally {
        setNewTxLookupLoading(false);
      }
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTx.accountNumber]);

  // Destination lookup for transfers
  useEffect(() => {
    const acc = (newTx.destinationAccountNumber || '').trim();
    if (newTxDestinationLookupTimer.current) {
      clearTimeout(newTxDestinationLookupTimer.current);
      newTxDestinationLookupTimer.current = null;
    }
    if (!acc || acc.length < 3) {
      setNewTxDestinationClientName('');
      setNewTxDestinationLookupLoading(false);
      setNewTxDestinationInfo(null);
      return;
    }
    newTxDestinationLookupTimer.current = setTimeout(async () => {
      try {
        setNewTxDestinationLookupLoading(true);
        const list = await apiService.getClientAccounts({ accountType: AccountType.CURRENT, accountNumber: acc } as any);
        const first = (list || [])[0];
        const name = first?.customerName || '';
        setNewTxDestinationClientName(name);
        setNewTxDestinationInfo(first ? {
          name,
          currency: (first.currency as NewTxCurrency) || 'HTG',
          balance: typeof first.balance === 'number' ? first.balance : Number(first.balance || 0),
          status: first.status || ''
        } : null);
      } catch (e) {
        setNewTxDestinationClientName('');
        setNewTxDestinationInfo(null);
      } finally {
        setNewTxDestinationLookupLoading(false);
      }
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTx.destinationAccountNumber]);

  // Auto-load transactions for a set of current accounts when no account is provided
  useEffect(() => {
    const autoLoadAll = async () => {
      try {
        if (accountNumber && accountNumber.trim().length > 0) return;
        setLoading(true);
        // Load a limited list of current accounts, then fetch their transactions in parallel
        const accounts = await apiService.getClientAccounts({ accountType: AccountType.CURRENT } as any);
        const list = (accounts || []).slice(0, 20); // cap to 20 accounts to avoid heavy loads
        const txArrays = await Promise.all(
          list.map((a: any) => apiService.getAccountTransactions(a.accountNumber || a.AccountNumber || ''))
        );
        const flat = ([] as any[]).concat(...txArrays);
        const mapped: CurrentAccountTransaction[] = flat.map((t: any) => {
          const amount = Number(
            t.amount ?? t.Amount ?? t.initialDeposit ?? t.InitialDeposit ?? t.openingDeposit ?? t.OpeningDeposit ?? 0
          );
          const balanceAfter = Number(
            t.balanceAfter ?? t.BalanceAfter ?? t.balanceAfterAmount ?? t.balance ?? 0
          );
          const balanceBefore = (t.balanceBefore != null)
            ? Number(t.balanceBefore)
            : (t.BalanceBefore != null ? Number(t.BalanceBefore) : (balanceAfter - amount));
          const statusRaw = (t.status ?? t.Status ?? t.state ?? t.State);
          return {
            id: (t.id ?? t.Id ?? t.transactionId ?? t.TransactionId ?? t.txId ?? t.TxId ?? t.sourceId ?? t.SourceId),
            transactionDate: t.transactionDate || t.date || t.Date || t.timestamp || t.openingDate || t.createdAt || t.CreatedAt || t.processedAt,
            transactionType: t.transactionType || t.type || t.Type || t.kind || t.operation,
            amount,
            currency: (t.currency || 'HTG') as 'HTG' | 'USD',
            balanceAfter,
            balanceBefore,
            reference: t.reference || t.ref || t.transactionRef || t.referenceNumber || t.openingReference || `TXN-${t.id || t.Id}`,
            account: t.accountNumber || t.account || '',
            performedBy: t.performedBy || t.user || t.User || t.cashier || t.processedByName || t.processedBy || 'Système',
            branch: t.branchName || t.branch || t.BranchName || t.Branch || '',
            status: normalizeStatus(statusRaw),
            description: t.description || t.memo || ''
          } as CurrentAccountTransaction;
        });
        // Sort by date descending (most recent first)
        const sorted = mapped.sort((a, b) => {
          const dateA = new Date(a.transactionDate).getTime();
          const dateB = new Date(b.transactionDate).getTime();
          return dateB - dateA;
        });
        setTransactions(sorted);
      } catch (e) {
        console.error('Error auto-loading transactions:', e);
      } finally {
        setLoading(false);
      }
    };
    autoLoadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to classify transaction type for filtering/summary (handles accents and synonyms)
  const classify = (t: string | undefined): 'DEPOSIT' | 'WITHDRAWAL' | 'OTHER' => {
    const normalize = (v: string) => v
      ? v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
      : '';
    const s = normalize(String(t || ''));
    // Deposits: handle FR/EN and "initial/opening" variants
    if (
      s.includes('DEPOSIT') || s.includes('DEPOT') || s.includes('VERSEMENT') || s.includes('CREDIT') ||
      s.includes('INITIAL') || s.includes('OPENING') || s.includes('OUVERTURE')
    ) return 'DEPOSIT';
    // Withdrawals
    if (s.includes('WITHDRAW') || s.includes('RETRAIT') || s.includes('DEBIT')) return 'WITHDRAWAL';
    return 'OTHER';
  };

  // Unique branch names available for filter options (from backend or transactions)
  const branchOptions = React.useMemo(() => {
    if (branches.length > 0) {
      return branches.map(b => b.name);
    }
    // Fallback to transaction-derived options
    const set = new Set<string>();
    for (const t of transactions) {
      const b = (t.branch || '').trim();
      if (b) set.add(b);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [branches, transactions]);

  // Apply client-side filters whenever inputs or source list change
  useEffect(() => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const min = minAmount ? Number(minAmount) : null;
    const max = maxAmount ? Number(maxAmount) : null;

    const next = (transactions || []).filter(t => {
      // Type or cancelled-only
      if (typeFilter === 'CANCELLED') {
        if (normalizeStatus(t.status) !== 'CANCELLED') return false;
      } else if (typeFilter !== 'ALL' && classify(t.transactionType) !== typeFilter) {
        return false;
      }
      // Branch filter
      if (branchFilter !== 'ALL') {
        const tb = String(t.branch || '').toLowerCase();
        if (tb !== String(branchFilter).toLowerCase()) return false;
      }
      // Date range (inclusive)
      if (start || end) {
        const d = new Date(t.transactionDate);
        if (isNaN(d.getTime())) return false;
        if (start && d < start) return false;
        if (end) {
          // include whole end day
          const endInclusive = new Date(end);
          endInclusive.setHours(23,59,59,999);
          if (d > endInclusive) return false;
        }
      }
      // Amount range
      if (min != null && !isNaN(min) && t.amount < (min as number)) return false;
      if (max != null && !isNaN(max) && t.amount > (max as number)) return false;
      return true;
    });
    setFilteredTransactions(next);
    // reset page to 1 when filters change
    setTxPage(1);
  }, [transactions, typeFilter, branchFilter, startDate, endDate, minAmount, maxAmount]);

  // Pagination derived values for transactions
  const totalFilteredTx = filteredTransactions.length;
  const totalTxPages = Math.max(1, Math.ceil(totalFilteredTx / txPageSize));
  // ensure current page is valid
  useEffect(() => {
    if (txPage > totalTxPages) setTxPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalFilteredTx, txPageSize]);

  const paginatedTransactions = filteredTransactions.slice((txPage - 1) * txPageSize, txPage * txPageSize);

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['Date/Heure', 'Référence', 'Compte', 'Par', 'Succursale', 'Type', 'Montant', 'Solde Avant', 'Solde Après', 'Statut', 'Description'];
    const csvData = filteredTransactions.map(t => [
      new Date(t.transactionDate).toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      t.reference || '',
      t.account || '',
      t.performedBy || '',
      t.branch || '',
      classify(t.transactionType) === 'DEPOSIT' ? 'Dépôt' :
      classify(t.transactionType) === 'WITHDRAWAL' ? 'Retrait' : (t.transactionType || ''),
      `${(classify(t.transactionType) === 'DEPOSIT' ? '+' : classify(t.transactionType) === 'WITHDRAWAL' ? '-' : '')}${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.amount)} ${t.currency}`,
      t.balanceBefore != null ? `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.balanceBefore)} ${t.currency}` : '',
      `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.balanceAfter)} ${t.currency}`,
      // Use display status override for cancelled deposits with reversal
      (() => {
        const s = normalizeStatus(t.status);
        const o = maybeOverrideStatusToCompleted(t, s);
        return localizedStatus(o);
      })(),
      t.description || ''
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions-compte-${accountNumber || 'tous'}.csv`;
    link.click();
  };

  const exportToHTML = () => {
    if (filteredTransactions.length === 0) return;

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transactions - ${accountNumber || 'Tous les comptes'}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .deposit { color: green; }
        .withdrawal { color: red; }
        .summary { margin-top: 20px; padding: 10px; background-color: #e9ecef; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Historique des Transactions - ${accountNumber || 'Tous les comptes'}</h1>
    <div class="summary">
        <p><strong>Total des transactions:</strong> ${totals.count}</p>
        <p><strong>Dépôts totaux:</strong> ${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totals.deposits)}</p>
        <p><strong>Retraits totaux:</strong> ${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totals.withdrawals)}</p>
        <p><strong>Généré le:</strong> ${new Date().toLocaleString('fr-FR')}</p>
    </div>
    <table>
        <thead>
            <tr>
                <th>Date/Heure</th>
                <th>Référence</th>
                <th>Compte</th>
                <th>Par</th>
                <th>Succursale</th>
                <th>Type</th>
                <th>Montant</th>
                <th>Solde Avant</th>
                <th>Solde Après</th>
                <th>Statut</th>
                <th>Description</th>
            </tr>
        </thead>
        <tbody>
            ${filteredTransactions.map(t => `
                <tr>
                    <td>${new Date(t.transactionDate).toLocaleString('fr-FR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</td>
                    <td>${t.reference || '—'}</td>
                    <td>${t.account || '—'}</td>
                    <td>${t.performedBy || '—'}</td>
                    <td>${t.branch || '—'}</td>
                    <td>${classify(t.transactionType) === 'DEPOSIT' ? 'Dépôt' :
                          classify(t.transactionType) === 'WITHDRAWAL' ? 'Retrait' : (t.transactionType || '—')}</td>
                    <td class="${classify(t.transactionType) === 'DEPOSIT' ? 'deposit' : classify(t.transactionType) === 'WITHDRAWAL' ? 'withdrawal' : ''}">
                        ${(classify(t.transactionType) === 'DEPOSIT' ? '+' : classify(t.transactionType) === 'WITHDRAWAL' ? '-' : '')}${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.amount)} ${t.currency}
                    </td>
                    <td>${t.balanceBefore != null ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.balanceBefore) + ' ' + t.currency : '—'}</td>
                    <td>${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.balanceAfter)} ${t.currency}</td>
                    <td>${(() => {
                      const s = normalizeStatus(t.status);
                      const o = maybeOverrideStatusToCompleted(t, s);
                      return localizedStatus(o);
                    })()}</td>
                    <td>${t.description || '—'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions-compte-${accountNumber || 'tous'}.html`;
    link.click();
  };

  // Summary metrics
  const totals = React.useMemo(() => {
    const dep = filteredTransactions.filter(t => classify(t.transactionType) === 'DEPOSIT').reduce((s, t) => s + (t.amount || 0), 0);
    const wit = filteredTransactions.filter(t => classify(t.transactionType) === 'WITHDRAWAL').reduce((s, t) => s + (t.amount || 0), 0);
    return { deposits: dep, withdrawals: wit, count: filteredTransactions.length };
  }, [filteredTransactions]);

  // Branch distribution summary
  const branchSummary = React.useMemo(() => {
    if (!filteredTransactions.length) return {};
    return filteredTransactions.reduce((acc, tx) => {
      const branch = String(tx.branch || '').trim() || 'Sans succursale';
      acc[branch] = (acc[branch] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredTransactions]);

  // Today's totals by currency (to mirror savings tab cards)
  const todayTotals = React.useMemo(() => {
    const init = { deposits: { HTG: 0, USD: 0 }, withdrawals: { HTG: 0, USD: 0 } } as { deposits: Record<'HTG'|'USD', number>; withdrawals: Record<'HTG'|'USD', number> };
    if (!filteredTransactions?.length) return init;
    const todayKey = new Date().toDateString();
    for (const tx of filteredTransactions) {
      const d = new Date(tx.transactionDate);
      if (d.toDateString() !== todayKey) continue;
      const cur = (tx.currency === 'USD' ? 'USD' : 'HTG') as 'HTG'|'USD';
      const amt = Math.max(0, Number(tx.amount || 0));
      const kind = classify(tx.transactionType);
      if (kind === 'DEPOSIT') init.deposits[cur] += amt;
      else if (kind === 'WITHDRAWAL') init.withdrawals[cur] += amt;
    }
    return init;
  }, [filteredTransactions]);

  // Debug: Verify branch associations in transactions
  React.useEffect(() => {
    if (transactions.length > 0) {
      const branchStats = transactions.reduce((acc, tx) => {
        const branch = String(tx.branch || '').trim() || 'Sans succursale';
        acc[branch] = (acc[branch] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('Vérification des associations de succursales dans les transactions:', branchStats);

      // Also check against known branches
      if (branches.length > 0) {
        const knownBranchNames = branches.map(b => b.name);
        const unknownBranches = Object.keys(branchStats).filter(b => b !== 'Sans succursale' && !knownBranchNames.includes(b));
        if (unknownBranches.length > 0) {
          console.warn('Transactions avec succursales inconnues:', unknownBranches);
        }
      }
    }
  }, [transactions, branches]);

  // Heuristic: detect if a deposit has a subsequent reversal (withdrawal) for same amount on same account
  const hasReversalFor = React.useCallback((tx: CurrentAccountTransaction) => {
    if (!tx || classify(tx.transactionType) !== 'DEPOSIT') return false;
    const acc = (tx.account || '').toUpperCase();
    const amt = Number(tx.amount || 0);
    const cur = tx.currency;
    const t0 = new Date(tx.transactionDate).getTime();
    const withinMs = 24 * 60 * 60 * 1000; // 24 hours window
    const baseRef = String(tx.reference || '').toUpperCase();
    const baseDesc = String(tx.description || '').toUpperCase();
    const hintTokens = ['REV', 'REVERSE', 'REVERSAL', 'CANCEL', 'ANNUL'];
    return transactions.some((o) => {
      if (!o) return false;
      if ((String(o.account || '').toUpperCase()) !== acc) return false;
      if (o.currency !== cur) return false;
      if (classify(o.transactionType) !== 'WITHDRAWAL') return false;
      if (Number(o.amount || 0) !== amt) return false;
      const t1 = new Date(o.transactionDate).getTime();
      if (!(t1 >= t0) || (t1 - t0) > withinMs) return false;
      const ref = String(o.reference || '').toUpperCase();
      const desc = String(o.description || '').toUpperCase();
      // Signals of system reversal
      const hasHint = hintTokens.some(tok => ref.includes(tok) || desc.includes(tok));
      // Also accept linking by sharing a common token from base reference (e.g., ends with numeric id)
      const sharesToken = baseRef && ref && (baseRef.includes(ref) || ref.includes(baseRef));
      return hasHint || sharesToken;
    });
  }, [transactions]);

  // UX rule: Never show a deposit as "Annulé". If a deposit is CANCELLED, display it as COMPLETED
  // so the history reads as a normal deposit paired with a withdrawal (reversal) when present.
  // We still keep hasReversalFor for potential badges/tooltips if needed elsewhere.
  const maybeOverrideStatusToCompleted = (tx: CurrentAccountTransaction, normalized: any) => {
    if (normalized === 'CANCELLED' && classify(tx.transactionType) === 'DEPOSIT') {
      return 'COMPLETED';
    }
    return normalized;
  };

  // Print a simple receipt view for a transaction with popup-blocker fallback
  const handlePrintReceipt = (t: CurrentAccountTransaction) => {
    try {
      const html = `<!DOCTYPE html>
        <html lang="fr">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Reçu - ${t.reference || ''}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px }
              .line { display:flex; justify-content:space-between; margin:6px 0 }
              .muted { color: #666; font-size: 0.9rem }
              @media print { .no-print { display: none; } }
            </style>
            <script>
              window.addEventListener('load', function(){
                try { window.print(); } catch(e) {}
                setTimeout(function(){ try { window.close(); } catch(e) {} }, 300);
              });
            </script>
          </head>
          <body>
            <div class="header">
              <h2>Reçu de transaction</h2>
              <div class="muted">Référence: ${t.reference || '—'}</div>
            </div>
            <div class="line"><div>Date/Heure</div><div>${new Date(t.transactionDate).toLocaleString('fr-FR')}</div></div>
            <div class="line"><div>Compte</div><div>${t.account || '—'}</div></div>
            <div class="line"><div>Par</div><div>${t.performedBy || '—'}</div></div>
            <div class="line"><div>Type</div><div>${classify(t.transactionType) === 'DEPOSIT' ? 'Dépôt' : classify(t.transactionType) === 'WITHDRAWAL' ? 'Retrait' : (t.transactionType || '—')}</div></div>
            <div class="line"><div>Montant</div><div>${(classify(t.transactionType) === 'DEPOSIT' ? '+' : classify(t.transactionType) === 'WITHDRAWAL' ? '-' : '')}${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.amount)} ${t.currency}</div></div>
            <div class="line"><div>Solde Avant</div><div>${t.balanceBefore != null ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.balanceBefore) : '—'} ${t.currency}</div></div>
            <div class="line"><div>Solde Après</div><div>${t.balanceAfter != null ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.balanceAfter) : '—'} ${t.currency}</div></div>
            <div style="margin-top:20px;" class="muted">Statut: ${(() => { const n = normalizeStatus(t.status as any); const o = maybeOverrideStatusToCompleted(t as any, n); return localizedStatus(o as any); })()}</div>
            <div style="margin-top:40px; font-size:0.9rem;" class="muted">Imprimé le ${new Date().toLocaleString('fr-FR')}</div>
            <div class="no-print" style="margin-top:24px; text-align:center; color:#666">Cette fenêtre se fermera après l'impression.</div>
          </body>
        </html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (w) {
        setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 2000);
        return;
      }

      // Popup blocked: fallback to hidden iframe printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      const cleanup = () => {
        try { document.body.removeChild(iframe); } catch {}
        try { URL.revokeObjectURL(url); } catch {}
      };
      iframe.onload = () => {
        try {
          const win = iframe.contentWindow as Window | null;
          if (win) {
            win.focus();
            win.print();
          }
        } catch {}
        setTimeout(cleanup, 1000);
      };
      document.body.appendChild(iframe);
    } catch (err) {
      console.error('Print error', err);
      toast.error("Erreur lors de la préparation du reçu");
    }
  };

  // View receipt in a separate window without auto-print
  const handleViewReceipt = (t: CurrentAccountTransaction) => {
    try {
      const html = `<!DOCTYPE html>
        <html lang="fr">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Reçu - ${t.reference || ''}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px }
              .line { display:flex; justify-content:space-between; margin:6px 0 }
              .muted { color: #666; font-size: 0.9rem }
              .actions { margin-top: 24px; text-align: center; }
              .btn { display:inline-block; padding:8px 14px; border:1px solid #2563eb; color:#2563eb; border-radius:6px; text-decoration:none }
              .btn:hover { background:#2563eb; color:#fff }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Reçu de transaction</h2>
              <div class="muted">Référence: ${t.reference || '—'}</div>
            </div>
            <div class="line"><div>Date/Heure</div><div>${new Date(t.transactionDate).toLocaleString('fr-FR')}</div></div>
            <div class="line"><div>Compte</div><div>${t.account || '—'}</div></div>
            <div class="line"><div>Par</div><div>${t.performedBy || '—'}</div></div>
            <div class="line"><div>Type</div><div>${classify(t.transactionType) === 'DEPOSIT' ? 'Dépôt' : classify(t.transactionType) === 'WITHDRAWAL' ? 'Retrait' : (t.transactionType || '—')}</div></div>
            <div class="line"><div>Montant</div><div>${(classify(t.transactionType) === 'DEPOSIT' ? '+' : classify(t.transactionType) === 'WITHDRAWAL' ? '-' : '')}${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.amount)} ${t.currency}</div></div>
            <div class="line"><div>Solde Avant</div><div>${t.balanceBefore != null ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.balanceBefore) : '—'} ${t.currency}</div></div>
            <div class="line"><div>Solde Après</div><div>${t.balanceAfter != null ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.balanceAfter) : '—'} ${t.currency}</div></div>
            <div style="margin-top:20px;" class="muted">Statut: ${(() => { const n = normalizeStatus(t.status as any); const o = maybeOverrideStatusToCompleted(t as any, n); return localizedStatus(o as any); })()}</div>
            <div style="margin-top:40px; font-size:0.9rem;" class="muted">Généré le ${new Date().toLocaleString('fr-FR')}</div>
            <div class="actions">
              <a href="#" class="btn" onclick="window.print(); return false;">Imprimer</a>
            </div>
          </body>
        </html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) {
        // Fallback: programmatically click an anchor (often allowed by popup blockers)
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Best-effort revoke later
        setTimeout(() => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } }, 2000);
        return;
      }
      // Revoke the URL after a short delay
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } }, 2000);
    } catch (err) {
      console.error('View receipt error', err);
      toast.error('Erreur lors de l\'affichage du reçu');
    }
  };

  // Cancel a transaction — best-effort call to backend. If backend doesn't expose a specific
  // cancel endpoint for current account transactions, this will show an error.
  const handleCancelTransaction = async (t: CurrentAccountTransaction) => {
    if (!t.id) {
      toast.error("Identifiant de transaction manquant — impossible d'annuler depuis cette vue");
      return;
    }
    const ok = window.confirm('Confirmer l\'annulation de cette transaction ? Cette action peut être irréversible.');
    if (!ok) return;
    const reason = window.prompt('Raison de l\'annulation (optionnelle)') || '';
    try {
      await apiService.cancelCurrentAccountTransaction(String(t.id), reason);
      toast.success('Transaction annulée avec succès');
      // Optimistic update: mark as CANCELLED locally for immediate feedback
      setTransactions((prev) => prev.map((tx) => (
        (tx.id === t.id ? { ...tx, status: 'CANCELLED' } : tx)
      )));
      // Refresh transactions list (if an account is selected)
      if ((accountNumber || '').trim()) {
        loadTransactions(accountNumber || undefined);
        refreshBalance(accountNumber);
      }
    } catch (error: any) {
      console.error('Cancel transaction error', error);
      const message = error?.response?.data?.message || error?.message || 'Impossible d\'annuler la transaction via l\'API';
      toast.error(message);
    }
  };

  const handleProcessNewTransaction = async () => {
    // Basic validation only (UI-level)
    const amt = Number(newTx.amount);
    if (!newTx.accountNumber?.trim()) { toast.error('Numéro de compte requis'); return; }
    if (!newTx.type) { toast.error('Type requis'); return; }
    if (!newTx.currency) { toast.error('Devise requise'); return; }
    if (!newTx.amount || isNaN(amt) || amt <= 0) { toast.error('Montant invalide'); return; }
    try {
      setNewTxSubmitting(true);
      // If transfer, call the transfer endpoint
      if (newTx.type === 'TRANSFER') {
        if (!newTx.destinationAccountNumber?.trim()) {
          toast.error('Numéro de compte destinataire requis pour un transfert');
          return;
        }
        if (newTx.accountNumber?.trim() === newTx.destinationAccountNumber?.trim()) {
          toast.error('Le compte source et le compte destinataire doivent être différents');
          return;
        }

        // If both lookups completed we can enforce same currency at UI level
        if (newTxAccountInfo?.currency && newTxDestinationInfo?.currency && newTxAccountInfo.currency !== newTxDestinationInfo.currency) {
          toast.error('Les comptes source et destinataire doivent être dans la même devise');
          return;
        }

        await apiService.processCurrentAccountTransfer({
          sourceAccountNumber: newTx.accountNumber.trim(),
          destinationAccountNumber: newTx.destinationAccountNumber?.trim(),
          amount: Number(newTx.amount),
          currency: newTx.currency === 'HTG' ? 0 : 1,
          description: newTx.description?.trim() || undefined,
          customerPresent: newTx.clientPresent,
          verificationMethod: newTx.verificationMethod || undefined,
          notes: newTx.notes?.trim() || undefined,
        });
      } else {
        // Call backend to process current account transaction
        await apiService.processCurrentAccountTransaction({
          accountNumber: newTx.accountNumber.trim(),
          type: newTx.type,
          currency: newTx.currency,
          amount: Number(newTx.amount),
          description: newTx.description?.trim() || undefined,
          clientPresent: newTx.clientPresent,
          verificationMethod: newTx.verificationMethod || undefined,
          notes: newTx.notes?.trim() || undefined,
        });
      }
      toast.success('Transaction traitée avec succès');
      setShowNewTxModal(false);
      setAccountNumber(newTx.accountNumber);
      await loadTransactions(newTx.accountNumber);
      await refreshBalance(newTx.accountNumber);
    } catch (e: any) {
      console.error('Process new transaction error', e);
      const message = e?.response?.data?.message || e?.message || 'Erreur lors du traitement';
      toast.error(message);
    } finally {
      setNewTxSubmitting(false);
    }
  };

  const formatMoney = (amount: number, currency: NewTxCurrency) => {
    if (currency === 'HTG') {
      return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' HTG';
    }
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div id="transactions-section" className="space-y-4">
      {/* Today's totals (mirror savings cards) */}
      {filteredTransactions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-green-200 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Dépôts HTG</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{new Intl.NumberFormat('fr-FR',{ minimumFractionDigits:2, maximumFractionDigits:2 }).format(todayTotals.deposits.HTG)} HTG</p>
                <p className="text-xs mt-1 text-gray-500">Aujourd'hui</p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white border border-green-200 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Dépôts USD</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{new Intl.NumberFormat('fr-FR',{ minimumFractionDigits:2, maximumFractionDigits:2 }).format(todayTotals.deposits.USD)} USD</p>
                <p className="text-xs mt-1 text-gray-500">Aujourd'hui</p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white border border-red-200 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Retraits HTG</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{new Intl.NumberFormat('fr-FR',{ minimumFractionDigits:2, maximumFractionDigits:2 }).format(todayTotals.withdrawals.HTG)} HTG</p>
                <p className="text-xs mt-1 text-gray-500">Aujourd'hui</p>
              </div>
              <ArrowDownLeft className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white border border-red-200 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Retraits USD</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{new Intl.NumberFormat('fr-FR',{ minimumFractionDigits:2, maximumFractionDigits:2 }).format(todayTotals.withdrawals.USD)} USD</p>
                <p className="text-xs mt-1 text-gray-500">Aujourd'hui</p>
              </div>
              <ArrowDownLeft className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      )}

      {/* Nouvelle Transaction button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            const el = document.getElementById('transactions-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            window.dispatchEvent(new CustomEvent('start-new-transaction'));
          }}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Nouvelle Transaction</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border space-y-3">
        {/* First row: account */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-3 items-center">
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">Numéro de compte</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadTransactions(); }}
                placeholder="CC-001234"
                className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                ref={accountInputRef}
              />
              <button onClick={() => loadTransactions()} className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-xs border rounded-md hover:bg-gray-50">Charger</button>
            </div>
          </div>
        </div>

        {/* Second row: compact primary filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Succursale</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              title="Filtrer par succursale"
            >
              <option value="ALL">Toutes</option>
              {branchOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              title="Filtrer par type"
            >
              <option value="ALL">Tous types</option>
              <option value="DEPOSIT">Dépôts</option>
              <option value="WITHDRAWAL">Retraits</option>
              <option value="OTHER">Autres</option>
              <option value="CANCELLED">Annulées</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Montant min</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Montant max</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {/* Actions row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setTypeFilter('ALL'); setBranchFilter('ALL'); setStartDate(''); setEndDate(''); setMinAmount(''); setMaxAmount(''); }}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50"
              title="Réinitialiser les filtres"
            >
              Réinitialiser
            </button>
            <button
              onClick={() => setShowAdvancedFilters((v) => !v)}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50"
              title="Plus d'options"
            >
              {showAdvancedFilters ? 'Masquer options' : 'Options avancées'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {filteredTransactions.length > 0 && (
              <>
                <button onClick={exportToCSV} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exporter CSV
                </button>
                <button onClick={exportToHTML} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Exporter HTML
                </button>
              </>
            )}
            <button onClick={() => loadTransactions()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" title="Actualiser">
              Actualiser
            </button>
          </div>
        </div>

        {/* Advanced area (placeholder for future) */}
        {showAdvancedFilters && (
          <div className="pt-2 text-sm text-gray-500">
            Astuce: tapez Entrée dans le champ Numéro de compte pour charger rapidement un seul compte. D'autres filtres pourront être ajoutés ici (agent, statut...).
          </div>
        )}
      </div>

      {/* Removed old minimal filters row (now consolidated above) */}

      {/* Live account balance/status */}
      {!!accountNumber?.trim() && accountLiveInfo && (
        <div className="text-sm text-gray-700 flex flex-wrap items-center gap-4">
          <span className="font-medium">Solde actuel: {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(accountLiveInfo.balance)} {accountLiveInfo.currency}</span>
          <span>Disponible: {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(accountLiveInfo.availableBalance)} {accountLiveInfo.currency}</span>
          {accountLiveInfo.status && (
            <span>Statut: <span className="uppercase">{accountLiveInfo.status}</span></span>
          )}
        </div>
      )}

      {/* Summary */}
      {filteredTransactions.length > 0 && (
        <div className="text-sm text-gray-700 flex flex-wrap items-center gap-4">
          <span><strong>{totals.count}</strong> transaction(s)</span>
          <span className="text-green-700">Dépôts: {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(totals.deposits)}</span>
          <span className="text-red-700">Retraits: {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(totals.withdrawals)}</span>
        </div>
      )}

      {/* Branch Distribution Summary */}
      {Object.keys(branchSummary).length > 0 && (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <div className="font-medium mb-2">Distribution par succursale:</div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(branchSummary)
              .sort(([,a], [,b]) => b - a)
              .map(([branch, count]) => (
                <span key={branch} className="bg-white px-2 py-1 rounded border">
                  <span className="font-medium">{branch}</span>: {count}
                </span>
              ))}
          </div>
        </div>
      )}

      {loading && <div className="text-sm text-gray-500">Chargement des transactions...</div>}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DATE/HEURE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RÉFÉRENCE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    COMPTE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PAR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SUCCURSALE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TYPE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MONTANT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SOLDE AVANT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SOLDE APRÈS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    STATUT
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.length > 0 ? (
                  paginatedTransactions.map((transaction, index) => (
                    <tr key={transaction.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transaction.transactionDate).toLocaleString('fr-FR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                        {transaction.reference || '—'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                        {transaction.account || '—'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                        {transaction.performedBy || '—'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                        {transaction.branch || '—'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          classify(transaction.transactionType) === 'DEPOSIT' ? 'bg-green-100 text-green-800' :
                          classify(transaction.transactionType) === 'WITHDRAWAL' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {classify(transaction.transactionType) === 'DEPOSIT' ? <ArrowUpRight className="h-4 w-4" /> :
                           classify(transaction.transactionType) === 'WITHDRAWAL' ? <ArrowDownLeft className="h-4 w-4" /> :
                           <DollarSign className="h-4 w-4" />}
                          {classify(transaction.transactionType) === 'DEPOSIT' ? 'Dépôt' :
                           classify(transaction.transactionType) === 'WITHDRAWAL' ? 'Retrait' :
                           (transaction.transactionType || '—')}
                        </span>
                      </td>
                      <td className={
                        `px-6 py-3 whitespace-nowrap text-sm font-semibold ` +
                        (classify(transaction.transactionType) === 'DEPOSIT' ? 'text-green-600' :
                         classify(transaction.transactionType) === 'WITHDRAWAL' ? 'text-red-600' : 'text-gray-900')
                      }>
                        {(classify(transaction.transactionType) === 'DEPOSIT' ? '+' : classify(transaction.transactionType) === 'WITHDRAWAL' ? '-' : '')}
                        {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(transaction.amount)} {transaction.currency}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                        {transaction.balanceBefore != null ? `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(transaction.balanceBefore)} ${transaction.currency}` : '—'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(transaction.balanceAfter)} {transaction.currency}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        {(() => {
                          const base = normalizeStatus(transaction.status);
                          const effective = maybeOverrideStatusToCompleted(transaction, base);
                          const cls = effective === 'COMPLETED' ? 'bg-green-100 text-green-800'
                            : effective === 'PENDING' ? 'bg-yellow-100 text-yellow-800'
                            : effective === 'PROCESSING' ? 'bg-blue-100 text-blue-800'
                            : effective === 'FAILED' ? 'bg-red-100 text-red-800'
                            : effective === 'CANCELLED' ? 'bg-gray-100 text-gray-800'
                            : 'bg-gray-100 text-gray-800';
                          const icon = effective === 'COMPLETED' ? <CheckCircle className="h-4 w-4" />
                            : effective === 'PENDING' ? <Clock className="h-4 w-4" />
                            : effective === 'PROCESSING' ? <RefreshCw className="h-4 w-4 animate-spin" />
                            : effective === 'CANCELLED' ? <XCircle className="h-4 w-4" />
                            : <AlertCircle className="h-4 w-4" />;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                              {icon}
                              {localizedStatus(effective)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewReceipt(transaction)}
                            className="text-gray-600 hover:text-gray-900 transition-colors"
                            title="Voir reçu"
                          >
                            <FileText className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handlePrintReceipt(transaction)}
                            className="text-gray-600 hover:text-gray-900 transition-colors"
                            title="Imprimer reçu"
                          >
                            <Printer className="h-5 w-5" />
                          </button>
                          {/* Only show cancel when completed OR pending AND we have a valid ID */}
                          {(normalizeStatus(transaction.status) === 'COMPLETED' || normalizeStatus(transaction.status) === 'PENDING') && !!transaction.id && (
                            <button
                              onClick={() => handleCancelTransaction(transaction)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Annuler transaction"
                            >
                              <AlertTriangle className="h-5 w-5" />
                            </button>
                          )}
                          {/* If this is a cancelled deposit (displayed as completed), show a muted indicator instead of the cancel button */}
                          {normalizeStatus(transaction.status) === 'CANCELLED' && classify(transaction.transactionType) === 'DEPOSIT' && (
                            <span
                              className="text-gray-400 cursor-default"
                              title="Déjà annulée — affichée comme 'Complété' pour l'historique"
                            >
                              <XCircle className="h-5 w-5" />
                            </span>
                          )}
                          <button
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Voir détails"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="px-6 py-6 text-center text-sm text-gray-500">
                      {loading ? 'Chargement des transactions...' : 'Aucune transaction trouvée'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination controls for transactions */}
        <div className="px-4 py-3 bg-white border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Affichage {totalFilteredTx === 0 ? 0 : Math.min((txPage - 1) * txPageSize + 1, totalFilteredTx)} - {Math.min(txPage * txPageSize, totalFilteredTx)} sur {totalFilteredTx} transactions
          </div>
          <div className="flex items-center gap-2">
            <select value={txPageSize} onChange={(e) => { setTxPageSize(Number(e.target.value)); setTxPage(1); }} className="px-2 py-1 border rounded">
              {[10,20,50,100].map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
            <button onClick={() => setTxPage(Math.max(1, txPage - 1))} disabled={txPage <= 1} className="px-3 py-1 border rounded disabled:opacity-50">Préc</button>
            <span className="px-2 text-sm">{txPage} / {totalTxPages}</span>
            <button onClick={() => setTxPage(Math.min(totalTxPages, txPage + 1))} disabled={txPage >= totalTxPages} className="px-3 py-1 border rounded disabled:opacity-50">Suiv</button>
          </div>
        </div>

      {/* New Transaction Modal */}
      {showNewTxModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Nouvelle Transaction</h3>
              <button onClick={() => setShowNewTxModal(false)} className="p-2 hover:bg-gray-100 rounded">×</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Numéro de compte</label>
                  <input
                    ref={newTxAccountRef}
                    type="text"
                    value={newTx.accountNumber}
                    onChange={(e) => setNewTx({ ...newTx, accountNumber: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CC-001234"
                  />
                  <div className="mt-1 text-xs text-gray-600 min-h-[1.25rem]">
                    {newTxLookupLoading ? 'Recherche du compte…' : (
                      newTxAccountInfo ? (
                        <span>
                          Client: <span className="font-medium text-gray-800">{newTxAccountInfo.name}</span>
                          {typeof newTxAccountInfo.balance === 'number' && newTxAccountInfo.currency ? (
                            <>
                              {' '}• Solde: <span className="font-medium text-gray-800">{formatMoney(newTxAccountInfo.balance, newTxAccountInfo.currency)}</span>
                            </>
                          ) : null}
                          {newTxAccountInfo.status ? (
                            <>
                              {' '}• Statut: <span className="uppercase">{newTxAccountInfo.status}</span>
                            </>
                          ) : null}
                        </span>
                      ) : (newTxClientName ? `Client: ${newTxClientName}` : '')
                    )}
                  </div>
                </div>
                {newTx.type === 'TRANSFER' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Compte destinataire</label>
                    <input
                      type="text"
                      value={newTx.destinationAccountNumber}
                      onChange={(e) => setNewTx({ ...newTx, destinationAccountNumber: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="CC-002345"
                    />
                    <div className="mt-1 text-xs text-gray-600 min-h-[1.25rem]">
                      {newTxDestinationLookupLoading ? 'Recherche du compte…' : (
                        newTxDestinationInfo ? (
                          <span>
                            Client: <span className="font-medium text-gray-800">{newTxDestinationInfo.name}</span>
                            {typeof newTxDestinationInfo.balance === 'number' && newTxDestinationInfo.currency ? (
                              <>
                                {' '}• Solde: <span className="font-medium text-gray-800">{formatMoney(newTxDestinationInfo.balance, newTxDestinationInfo.currency)}</span>
                              </>
                            ) : null}
                            {newTxDestinationInfo.status ? (
                              <>
                                {' '}• Statut: <span className="uppercase">{newTxDestinationInfo.status}</span>
                              </>
                            ) : null}
                          </span>
                        ) : (newTxDestinationClientName ? `Client: ${newTxDestinationClientName}` : '')
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={newTx.type}
                    onChange={(e) => setNewTx({ ...newTx, type: e.target.value as NewTxType })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DEPOSIT">Dépôt</option>
                    <option value="WITHDRAWAL">Retrait</option>
                    <option value="TRANSFER">Transfert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Devise</label>
                  <select
                    value={newTx.currency}
                    onChange={(e) => setNewTx({ ...newTx, currency: e.target.value as NewTxCurrency })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="HTG">HTG</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Montant</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description (optionnel)</label>
                  <input
                    type="text"
                    value={newTx.description}
                    onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Motif de la transaction"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client présent</label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="client-present"
                      type="checkbox"
                      checked={newTx.clientPresent}
                      onChange={(e) => setNewTx({ ...newTx, clientPresent: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="client-present" className="text-sm text-gray-700">Oui, client présent</label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Méthode de vérification</label>
                  <select
                    value={newTx.verificationMethod}
                    onChange={(e) => setNewTx({ ...newTx, verificationMethod: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner…</option>
                    <option value="CIN">CIN</option>
                    <option value="Passeport">Passeport</option>
                    <option value="Permis">Permis</option>
                    <option value="Signature">Signature</option>
                    <option value="PIN">PIN</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Notes (optionnel)</label>
                  <textarea
                    rows={3}
                    value={newTx.notes}
                    onChange={(e) => setNewTx({ ...newTx, notes: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ajouter des notes…"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
              <button onClick={() => setShowNewTxModal(false)} className="px-4 py-2 rounded-lg border hover:bg-gray-50">Annuler</button>
              <button onClick={handleProcessNewTransaction} disabled={newTxSubmitting} className={`px-4 py-2 rounded-lg text-white ${newTxSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>{newTxSubmitting ? 'Traitement…' : 'Traiter'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Modal to open a Current Account for an existing customer
function OpenCurrentAccountModal({ onClose, onSuccess, initialCustomer }: { onClose: () => void; onSuccess: () => void; initialCustomer?: any }) {
  const [step, setStep] = useState<'customer' | 'account'>('customer');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const lastSearchedRef = useRef<string>('');
  const CODE_PATTERN = /^[A-Z]{2}\d{3,}$/; // e.g., TD5765
  
  // Authorized signers state
  const [authorizedSigners, setAuthorizedSigners] = useState<Array<{
    fullName: string;
    documentType: number;
    documentNumber: string;
    relationshipToCustomer: string;
    phoneNumber: string;
    authorizationLimit?: number;
    photoUrl?: string;
    signature?: string;
  }>>([]);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState<number | null>(null);
  const [signatureMethod, setSignatureMethod] = useState<'digital' | 'upload'>('digital');
  
  const [accountForm, setAccountForm] = useState({
    branchId: 1,
    currency: 'HTG' as 'HTG' | 'USD',
    initialDeposit: 0,
    minimumBalance: '',
    dailyWithdrawalLimit: '',
    monthlyWithdrawalLimit: '',
    allowOverdraft: false,
    overdraftLimit: ''
  } as any);

  // If a customer is provided, preselect and skip to account step
  useEffect(() => {
    if (initialCustomer && (initialCustomer.id || initialCustomer.Id)) {
      setSelectedCustomer(initialCustomer);
      setStep('account');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCustomer]);

  const searchCustomers = async () => {
    if (!customerSearch || customerSearch.trim().length < 2) return;
    try {
      setLoading(true);
      // Uppercase to ensure exact match on CustomerCode (e.g., TD5765)
      const term = customerSearch.trim().toUpperCase();
      if (lastSearchedRef.current === term) return;
      lastSearchedRef.current = term;
      const list = await apiService.getSavingsCustomers(term);
      setCustomers(list || []);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la recherche du client');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customers.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [customers.length]);
  // Reset last searched when returning to customer step
  useEffect(() => {
    if (step === 'customer') {
      lastSearchedRef.current = '';
    }
  }, [step]);

  // Debounced auto-search on input change with code quick matcher
  useEffect(() => {
    if (step !== 'customer') return;
    const raw = customerSearch?.trim();
    if (!raw || raw.length < 2) return;
    const upper = raw.toUpperCase();
    const delay = CODE_PATTERN.test(upper) ? 200 : 500;
    const handle = setTimeout(() => {
      // Only fire if query actually changed
      if (lastSearchedRef.current !== upper) {
        searchCustomers();
      }
    }, delay);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerSearch, step]);

  const handleSelectCustomer = (c: any) => {
    setSelectedCustomer(c);
  };

  useEffect(() => {
    if (step === 'account') {
      (async () => {
        try {
          const data = await apiService.getAllBranches();
          const mapped = (data || []).map((b: any) => ({ id: b.id || b.Id, name: b.name || b.Name }));
          setBranches(mapped);
          if (mapped.length && !accountForm.branchId) {
            setAccountForm((f: any) => ({ ...f, branchId: mapped[0].id }));
          }
        } catch {
          /* ignore */
        }
      })();
    }
  }, [step]);

  // Authorized signers handlers
  const addSigner = () => {
    setAuthorizedSigners([...authorizedSigners, {
      fullName: '',
      documentType: 0,
      documentNumber: '',
      relationshipToCustomer: '',
      phoneNumber: '',
      authorizationLimit: undefined,
      photoUrl: '',
      signature: ''
    }]);
  };

  const updateSigner = (idx: number, field: string, value: any) => {
    const updated = [...authorizedSigners];
    (updated[idx] as any)[field] = value;
    setAuthorizedSigners(updated);
  };

  const removeSigner = (idx: number) => {
    const updated = [...authorizedSigners];
    updated.splice(idx, 1);
    setAuthorizedSigners(updated);
  };

  const handlePhotoUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 5MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSigner(idx, 'photoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 2MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSigner(idx, 'signature', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureSave = (idx: number, signature: string) => {
    updateSigner(idx, 'signature', signature);
    setShowSignatureCanvas(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer?.id && !selectedCustomer?.Id) {
      return;
    }
    if (!accountForm.initialDeposit || Number(accountForm.initialDeposit) <= 0) {
      toast.error("Le dépôt initial doit être supérieur à 0");
      return;
    }
    if (!accountForm.branchId) {
      toast.error('Veuillez sélectionner une succursale');
      return;
    }
    
    // Valider les signataires autorisés
    if (authorizedSigners.length > 0) {
      for (let i = 0; i < authorizedSigners.length; i++) {
        const signer = authorizedSigners[i];
        if (!signer.fullName || signer.fullName.trim().length < 2) {
          toast.error(`Signataire #${i + 1}: Le nom complet est obligatoire (min. 2 caractères)`);
          return;
        }
        if (!signer.documentNumber || signer.documentNumber.trim().length === 0) {
          toast.error(`Signataire #${i + 1}: Le numéro de pièce est obligatoire`);
          return;
        }
        if (!signer.relationshipToCustomer || signer.relationshipToCustomer.trim().length === 0) {
          toast.error(`Signataire #${i + 1}: La relation avec le client est obligatoire`);
          return;
        }
        if (!signer.phoneNumber || signer.phoneNumber.trim().length === 0) {
          toast.error(`Signataire #${i + 1}: Le numéro de téléphone est obligatoire`);
          return;
        }
        if (!signer.photoUrl || signer.photoUrl.trim().length === 0) {
          toast.error(`Signataire #${i + 1}: La photo de la pièce d'identité est obligatoire`);
          return;
        }
        if (!signer.signature || signer.signature.trim().length === 0) {
          toast.error(`Signataire #${i + 1}: La signature est obligatoire`);
          return;
        }
      }
    }
    const customerId = selectedCustomer.id || selectedCustomer.Id;
    const payload: any = {
      customerId,
      currency: accountForm.currency,
      initialDeposit: Number(accountForm.initialDeposit),
      branchId: Number(accountForm.branchId),
    };
    if (accountForm.minimumBalance) payload.minimumBalance = Number(accountForm.minimumBalance);
    if (accountForm.dailyWithdrawalLimit) payload.dailyWithdrawalLimit = Number(accountForm.dailyWithdrawalLimit);
    if (accountForm.monthlyWithdrawalLimit) payload.monthlyWithdrawalLimit = Number(accountForm.monthlyWithdrawalLimit);
    if (accountForm.allowOverdraft && accountForm.overdraftLimit) payload.overdraftLimit = Number(accountForm.overdraftLimit);
    
    // Add authorized signers if any (enforce min length >=2 like backend validation)
    if (authorizedSigners.length > 0) {
      const filtered = authorizedSigners.filter(s => (s.fullName || '').trim().length >= 2);
      if (filtered.length > 0) {
        payload.authorizedSigners = filtered.map(s => ({
          fullName: s.fullName,
          documentType: s.documentType,
          documentNumber: s.documentNumber,
          relationshipToCustomer: s.relationshipToCustomer,
          phone: s.phoneNumber,
          authorizationLimit: s.authorizationLimit,
          signature: s.signature,
          photoUrl: s.photoUrl
        }));
      }
    }

    try {
      setLoading(true);
      await apiService.createCurrentAccount(payload);
      toast.success('Compte courant ouvert avec succès');
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(extractApiErrorMessage(error, "Erreur lors de l'ouverture du compte"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Ouvrir un Compte Courant</h2>
              <p className="text-blue-100 mt-1">{step === 'customer' ? 'Étape 1: Sélectionner le client' : 'Étape 2: Configurer le compte'}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">×</button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {step === 'customer' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher un client</label>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); searchCustomers(); }
                    }}
                    placeholder="Nom, téléphone, code client (ex: TD5765) ou document..."
                    className="flex-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={searchCustomers}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Chercher
                  </button>
                </div>
                {loading && (
                  <div className="text-sm text-gray-500 mt-2">Recherche en cours...</div>
                )}
                {!loading && customers.length === 0 && customerSearch.trim().length >= 2 && (
                  <div className="text-sm text-gray-500 mt-2">Aucun client trouvé</div>
                )}
              </div>

              {customers.length > 0 && (
                <div ref={resultsRef} className="space-y-2 max-h-[50vh] overflow-y-auto border border-gray-200 rounded-lg p-2 mt-2">
                  {customers.map((c) => (
                    <div
                      key={c.id || c.Id}
                      onClick={() => handleSelectCustomer(c)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        (selectedCustomer?.id || selectedCustomer?.Id) === (c.id || c.Id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{c.fullName || `${c.firstName} ${c.lastName}`}</p>
                          <p className="text-sm text-gray-500">{c.primaryPhone || c.phone}</p>
                          { (c.customerCode || c.CustomerCode) && (
                            <p className="text-xs text-gray-500">Code: {c.customerCode || c.CustomerCode}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">{c.documentType}: {c.documentNumber}</p>
                        </div>
                        {(selectedCustomer?.id || selectedCustomer?.Id) === (c.id || c.Id) && (
                          <CheckCircle className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep('account')}
                  disabled={!selectedCustomer}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {step === 'account' && selectedCustomer && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Client sélectionné:</p>
                <p className="font-semibold text-gray-900">{selectedCustomer.fullName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`}</p>
                <button type="button" onClick={() => setStep('customer')} className="text-sm text-blue-600 hover:underline mt-1">Changer de client</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
                  <select
                    value={accountForm.currency}
                    onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="HTG">HTG (Gourdes)</option>
                    <option value="USD">USD (Dollars)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Succursale</label>
                  <select
                    value={accountForm.branchId}
                    onChange={(e) => setAccountForm({ ...accountForm, branchId: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {branches.length === 0 ? (
                      <option value={accountForm.branchId}>#{accountForm.branchId}</option>
                    ) : (
                      branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dépôt initial (requis)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={accountForm.initialDeposit}
                    onChange={(e) => setAccountForm({ ...accountForm, initialDeposit: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Solde minimum (optionnel)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={accountForm.minimumBalance}
                    onChange={(e) => setAccountForm({ ...accountForm, minimumBalance: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plafond Retrait Quotidien (opt.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={accountForm.dailyWithdrawalLimit}
                    onChange={(e) => setAccountForm({ ...accountForm, dailyWithdrawalLimit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plafond Retrait Mensuel (opt.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={accountForm.monthlyWithdrawalLimit}
                    onChange={(e) => setAccountForm({ ...accountForm, monthlyWithdrawalLimit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={accountForm.allowOverdraft}
                      onChange={(e) => setAccountForm({ ...accountForm, allowOverdraft: e.target.checked })}
                    />
                    Autoriser le découvert
                  </label>
                  {accountForm.allowOverdraft && (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Limite de découvert"
                      value={accountForm.overdraftLimit}
                      onChange={(e) => setAccountForm({ ...accountForm, overdraftLimit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>

              {/* Signataires Autorisés */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Signataires Autorisés (Optionnel)</h3>
                
                {authorizedSigners.length === 0 && (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">Aucun signataire autorisé</p>
                    <p className="text-xs text-gray-500">Ajoutez des personnes autorisées à gérer ce compte</p>
                  </div>
                )}

                {authorizedSigners.map((signer, idx) => (
                  <div key={idx} className="bg-white border-2 border-gray-200 rounded-lg p-4 mb-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-semibold text-gray-900">Signataire #{idx + 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSigner(idx)}
                        className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>Retirer</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet *</label>
                        <input
                          type="text"
                          value={signer.fullName}
                          onChange={(e) => updateSigner(idx, 'fullName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Prénom et nom"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de pièce *</label>
                        <select
                          value={signer.documentType}
                          onChange={(e) => updateSigner(idx, 'documentType', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={0}>CIN (Carte d'Identité)</option>
                          <option value={1}>Passeport</option>
                          <option value={2}>Permis de Conduire</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro de pièce *</label>
                        <input
                          type="text"
                          value={signer.documentNumber}
                          onChange={(e) => updateSigner(idx, 'documentNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: 001-123-456-7"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Relation avec le client *</label>
                        <input
                          type="text"
                          value={signer.relationshipToCustomer}
                          onChange={(e) => updateSigner(idx, 'relationshipToCustomer', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: Conjoint(e), Directeur"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone *</label>
                        <input
                          type="tel"
                          value={signer.phoneNumber}
                          onChange={(e) => updateSigner(idx, 'phoneNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="+509 3712 3456"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Limite d'autorisation (HTG)</label>
                        <input
                          type="number"
                          min={0}
                          value={signer.authorizationLimit ?? ''}
                          onChange={(e) => updateSigner(idx, 'authorizationLimit', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: 50000"
                        />
                        <p className="text-xs text-gray-500 mt-1">Montant maximum autorisé par transaction</p>
                      </div>

                      {/* Photo */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Pièce d'identité (Photo)</label>
                        {signer.photoUrl ? (
                          <div className="relative inline-block">
                            <img
                              src={signer.photoUrl}
                              alt="Pièce d'identité"
                              className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={() => updateSigner(idx, 'photoUrl', '')}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                            <Upload className="w-5 h-5 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Cliquer pour télécharger</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(idx, e)}
                              className="hidden"
                            />
                          </label>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Format: JPG, PNG (max 5MB)</p>
                      </div>

                      {/* Signature */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Signature</label>
                        
                        <div className="flex items-center space-x-4 mb-3">
                          <button
                            type="button"
                            onClick={() => setSignatureMethod('digital')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                              signatureMethod === 'digital'
                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                            <span className="text-sm font-medium">Signature digitale</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSignatureMethod('upload')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                              signatureMethod === 'upload'
                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                            }`}
                          >
                            <Upload className="w-4 h-4" />
                            <span className="text-sm font-medium">Télécharger</span>
                          </button>
                        </div>

                        {signer.signature ? (
                          <div className="relative inline-block">
                            <img
                              src={signer.signature}
                              alt="Signature"
                              className="w-48 h-24 object-contain bg-white rounded-lg border-2 border-gray-300 p-2"
                            />
                            <button
                              type="button"
                              onClick={() => updateSigner(idx, 'signature', '')}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            {signatureMethod === 'digital' ? (
                              <button
                                type="button"
                                onClick={() => setShowSignatureCanvas(idx)}
                                className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors shadow-md"
                              >
                                <FileText className="w-5 h-5 mr-2" />
                                <span className="font-medium">Capturer la signature</span>
                              </button>
                            ) : (
                              <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                <Upload className="w-5 h-5 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-600">Cliquer pour télécharger la signature</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleSignatureUpload(idx, e)}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {signatureMethod === 'digital'
                            ? 'Utilisez le canvas pour capturer une signature manuscrite'
                            : 'Format: JPG, PNG (max 2MB)'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addSigner}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Ajouter un signataire autorisé</span>
                </button>
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-200 mt-6">
                <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Annuler</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {loading ? 'Ouverture...' : 'Ouvrir le compte'}
                </button>
              </div>
            </form>
          )}

          {/* Modal pour signature digitale */}
          {showSignatureCanvas !== null && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                      Signature du signataire #{(showSignatureCanvas ?? 0) + 1}
                    </h3>
                    <button
                      onClick={() => setShowSignatureCanvas(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <SignatureCanvas
                    onSave={(signature) => handleSignatureSave(showSignatureCanvas, signature)}
                    onCancel={() => setShowSignatureCanvas(null)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal to create a NEW customer, then open a Current Account in one flow
const CreateCurrentAccountWithNewCustomerModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<'customer' | 'account'>('customer');
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [createdCustomer, setCreatedCustomer] = useState<any | null>(null);

  const [accountForm, setAccountForm] = useState({
    branchId: 1,
    currency: 'HTG' as 'HTG' | 'USD',
    initialDeposit: 0,
    minimumBalance: '',
    dailyWithdrawalLimit: '',
    monthlyWithdrawalLimit: '',
    allowOverdraft: false,
    overdraftLimit: ''
  } as any);

  useEffect(() => {
    if (step === 'account') {
      (async () => {
        try {
          const data = await apiService.getAllBranches();
          const mapped = (data || []).map((b: any) => ({ id: b.id || b.Id, name: b.name || b.Name }));
          setBranches(mapped);
          if (mapped.length && !accountForm.branchId) {
            setAccountForm((f: any) => ({ ...f, branchId: mapped[0].id }));
          }
        } catch {
          /* ignore */
        }
      })();
    }
  }, [step]);

  // Map ClientCreationForm data -> SavingsCustomerCreateDto
  const mapClientFormToSavingsCustomerDto = (clientData: any) => {
    const mapGender = (g: string) => (String(g).toUpperCase() === 'F' ? 1 : 0);
    
    // Map document type string to backend enum number
    const mapDocType = (t: any): number => {
      if (typeof t === 'number') return t;
      const docTypeMap: { [key: string]: number } = {
        'CIN': 0,
        'PASSPORT': 1,
        'DRIVING_LICENSE': 2,
  // 'BIRTH_CERTIFICATE' retired from frontend — legacy numeric 3 may still appear from backend but should not be emitted by frontend
      };
      return docTypeMap[String(t).toUpperCase()] ?? 0;
    };
    
    // Base DTO
    const dto: any = {
      isBusiness: !!clientData.isBusiness,
      street: clientData.street,
      commune: clientData.commune,
      department: clientData.department,
      postalCode: clientData.postalAddress || clientData.postalCode || undefined,
      primaryPhone: clientData.primaryPhone,
      secondaryPhone: clientData.secondaryPhone || undefined,
      email: clientData.email || undefined,
      emergencyContactName: clientData.emergencyContactName || clientData.emergencyContact?.name || undefined,
      emergencyContactPhone: clientData.emergencyContactPhone || clientData.emergencyContact?.phone || undefined,
      documentType: mapDocType(clientData.documentType),
      documentNumber: clientData.documentNumber,
      issuedDate: clientData.issuedDate,
      expiryDate: clientData.expiryDate || undefined,
      issuingAuthority: clientData.issuingAuthority,
      occupation: clientData.occupation || undefined,
      employerName: clientData.employerName || undefined,
      workAddress: clientData.workAddress || undefined,
      incomeSource: clientData.incomeSource || undefined,
      monthlyIncome: clientData.monthlyIncome ? Number(clientData.monthlyIncome) : undefined,
      
      // Informations personnelles additionnelles
      birthPlace: clientData.birthPlace || undefined,
      nationality: clientData.nationality || undefined,
      personalNif: clientData.nif || undefined,
      
      // Informations familiales et sociales
      maritalStatus: clientData.maritalStatus || undefined,
      numberOfDependents: clientData.numberOfDependents ? Number(clientData.numberOfDependents) : undefined,
      educationLevel: clientData.educationLevel || undefined,
      
      // Déclaration et acceptation
      acceptTerms: !!clientData.acceptTerms,
      signaturePlace: clientData.signaturePlace || undefined,
      signatureDate: clientData.signatureDate || undefined,
      
      // Personne de référence
      referencePersonName: clientData.referencePerson || undefined,
      referencePersonPhone: undefined, // À extraire si format "Nom - Téléphone"
    };

    // Champs spécifiques à Personne Morale
    if (clientData.isBusiness) {
      dto.companyName = clientData.companyName || '';
      dto.legalForm = clientData.legalForm || '';
      dto.tradeRegisterNumber = clientData.businessRegistrationNumber || undefined;
      dto.taxId = clientData.companyNif || undefined;
      dto.headOfficeAddress = clientData.headOfficeAddress || undefined;
      dto.companyPhone = clientData.companyPhone || undefined;
      dto.companyEmail = clientData.companyEmail || undefined;
      
      // Représentant légal - envoyer dans les champs dédiés
      dto.representativeFirstName = clientData.legalRepresentativeName || undefined;
      dto.representativeLastName = clientData.companyName || undefined;
      dto.representativeTitle = clientData.legalRepresentativeTitle || undefined;
      dto.representativeDocumentType = clientData.legalRepresentativeDocumentType ? mapDocType(clientData.legalRepresentativeDocumentType) : undefined;
      dto.representativeDocumentNumber = clientData.legalRepresentativeDocumentNumber || undefined;
      
      // Pour une entreprise, utiliser le nom de l'entreprise pour les champs obligatoires
      dto.firstName = clientData.companyName || 'Entreprise';
      dto.lastName = clientData.legalForm || 'Société';
      
      // Pour l'entreprise, mettre des valeurs par défaut
      dto.dateOfBirth = '1900-01-01';
      dto.gender = 0; // Male par défaut
    } else {
      // Champs spécifiques à Personne Physique
      dto.firstName = clientData.firstName;
      dto.lastName = clientData.lastName;
      dto.dateOfBirth = clientData.dateOfBirth;
      dto.gender = mapGender(clientData.gender);
    }

    return dto;
  };

  const handleCustomerSubmit = async (clientData: any) => {
    setLoading(true);
    try {
      const dto = mapClientFormToSavingsCustomerDto(clientData);
      const created = await apiService.createSavingsCustomer(dto);
      setCreatedCustomer(created);
      toast.success('Client créé avec succès');
      setStep('account');
      return created;
    } catch (error: any) {
      console.error('Erreur création client:', error);
      toast.error(error?.response?.data?.message || 'Erreur lors de la création du client');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdCustomer?.id && !createdCustomer?.Id) {
      toast.error('Client invalide');
      return;
    }
    if (!accountForm.initialDeposit || Number(accountForm.initialDeposit) <= 0) {
      toast.error("Le dépôt initial doit être supérieur à 0");
      return;
    }
    if (!accountForm.branchId) {
      toast.error('Veuillez sélectionner une succursale');
      return;
    }

    const customerId = createdCustomer.id || createdCustomer.Id;
    const payload: any = {
      customerId,
      currency: accountForm.currency,
      initialDeposit: Number(accountForm.initialDeposit),
      branchId: Number(accountForm.branchId),
    };
    if (accountForm.minimumBalance) payload.minimumBalance = Number(accountForm.minimumBalance);
    if (accountForm.dailyWithdrawalLimit) payload.dailyWithdrawalLimit = Number(accountForm.dailyWithdrawalLimit);
    if (accountForm.monthlyWithdrawalLimit) payload.monthlyWithdrawalLimit = Number(accountForm.monthlyWithdrawalLimit);
    if (accountForm.allowOverdraft && accountForm.overdraftLimit) payload.overdraftLimit = Number(accountForm.overdraftLimit);

    setLoading(true);
    try {
      await apiService.createCurrentAccount(payload);
      onSuccess();
    } catch (error: any) {
      console.error('Erreur ouverture compte courant:', error);
      toast.error(error?.response?.data?.message || "Erreur lors de l'ouverture du compte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Nouveau Client + Compte Courant</h2>
              <p className="text-blue-100 mt-1">{step === 'customer' ? 'Étape 1: Créer le client' : 'Étape 2: Configurer le compte'}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">×</button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {step === 'customer' && (
            <ClientCreationForm onSubmit={handleCustomerSubmit} onCancel={onClose} isLoading={loading} />
          )}

          {step === 'account' && (
            <form onSubmit={handleSubmitAccount} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Succursale</label>
                  <select
                    value={accountForm.branchId}
                    onChange={(e) => setAccountForm({ ...accountForm, branchId: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
                  <select
                    value={accountForm.currency}
                    onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="HTG">HTG</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dépôt initial</label>
                  <input
                    type="number"
                    min={0}
                    value={accountForm.initialDeposit}
                    onChange={(e) => setAccountForm({ ...accountForm, initialDeposit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Solde minimum (optionnel)</label>
                  <input
                    type="number"
                    min={0}
                    value={accountForm.minimumBalance}
                    onChange={(e) => setAccountForm({ ...accountForm, minimumBalance: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Limite retrait journalier (opt.)</label>
                  <input
                    type="number"
                    min={0}
                    value={accountForm.dailyWithdrawalLimit}
                    onChange={(e) => setAccountForm({ ...accountForm, dailyWithdrawalLimit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Limite retrait mensuel (opt.)</label>
                  <input
                    type="number"
                    min={0}
                    value={accountForm.monthlyWithdrawalLimit}
                    onChange={(e) => setAccountForm({ ...accountForm, monthlyWithdrawalLimit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={accountForm.allowOverdraft}
                      onChange={(e) => setAccountForm({ ...accountForm, allowOverdraft: e.target.checked })}
                    />
                    Autoriser le découvert
                  </label>
                  {accountForm.allowOverdraft && (
                    <input
                      type="number"
                      min={0}
                      placeholder="Limite de découvert"
                      value={accountForm.overdraftLimit}
                      onChange={(e) => setAccountForm({ ...accountForm, overdraftLimit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />)
                  }
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Ouverture...' : 'Ouvrir le compte'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
