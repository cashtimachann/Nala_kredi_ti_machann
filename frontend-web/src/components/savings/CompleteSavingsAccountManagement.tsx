

import React, { useState, useEffect, useRef } from 'react';
import ClientCreationForm from '../admin/ClientCreationForm';
import AccountDetailsView from './AccountDetailsView';
import {
  Search,
  Plus,
  Edit,
  Eye,
  Lock,
  Unlock,
  TrendingUp,
  DollarSign,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  XCircle,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Building2
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import savingsCustomerService from '../../services/savingsCustomerService';
import toast from 'react-hot-toast';
import { unparse } from 'papaparse';
import * as XLSX from 'xlsx';

// Utility functions exported for use in AccountDetailsView
// ...existing code...

// ...existing code...

// ...existing code...


// Utility functions exported for use in AccountDetailsView
export const displayCurrency = (c: any): 'HTG' | 'USD' | '' => {
  if (c === undefined || c === null) return '';
  const s = String(c).toUpperCase();
  if (s === '0' || s === 'HTG') return 'HTG';
  if (s === '1' || s === 'USD') return 'USD';
  // If an unexpected value is provided, do not append suffix
  return '';
};

export const formatCurrency = (amount: number, currency: any) => {
  const cur = displayCurrency(currency);
  const num = new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  return cur ? `${num} ${cur}` : num;
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800';
    case 'Inactive':
      return 'bg-gray-100 text-gray-800';
    case 'Closed':
      return 'bg-red-100 text-red-800';
    case 'Suspended':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Active':
      return <CheckCircle className="h-4 w-4" />;
    case 'Inactive':
      return <XCircle className="h-4 w-4" />;
    case 'Closed':
      return <Lock className="h-4 w-4" />;
    case 'Suspended':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return null;
  }
};

interface SavingsAccount {
  id: string;
  accountNumber: string;
  customerId: string;
  customerCode?: string;
  CustomerCode?: string; // tolerate backend casing variant
  customerName: string;
  customerPhone: string;
  branchId: number;
  branchName: string;
  currency: 'HTG' | 'USD';
  balance: number;
  availableBalance: number;
  blockedBalance: number;
  minimumBalance: number;
  openingDate: string;
  lastTransactionDate?: string;
  lastInterestCalculation?: string;
  status: 'Active' | 'Inactive' | 'Closed' | 'Suspended';
  interestRate: number;
  accruedInterest: number;
  dailyWithdrawalLimit: number;
  monthlyWithdrawalLimit: number;
  createdAt: string;
}

interface AccountFilters {
  branchId?: number;
  customerId?: string;
  currency?: 0 | 1; // 0=HTG, 1=USD
  status?: 0 | 1 | 2 | 3; // Active, Inactive, Closed, Suspended
  accountNumber?: string;
  page?: number;
  pageSize?: number;
}

const CompleteSavingsAccountManagement: React.FC = () => {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SavingsAccount | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateNewClientAccountModal, setShowCreateNewClientAccountModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<AccountFilters>({});
  const [statistics, setStatistics] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadAccounts();
    loadStatistics();
    loadBranches();
    try {
      const user = apiService.getCurrentUser?.();
      if (user) setCurrentUser(user);
    } catch {}
  }, [filters]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await apiService.getSavingsAccounts(filters);
      // Sort accounts from most recent to oldest based on openingDate or createdAt
      const sortedData = Array.isArray(data) ? data.sort((a, b) => {
        const dateA = new Date(a.openingDate || a.createdAt || 0);
        const dateB = new Date(b.openingDate || b.createdAt || 0);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      }) : data;
      setAccounts(sortedData);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Erreur lors du chargement des comptes');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await apiService.getSavingsAccountStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadBranches = async () => {
    try {
      const data = await apiService.getAllBranches();
      const mapped = (data || []).map((b: any) => ({ id: b.id || b.Id, name: b.name || b.Name }));
      setBranches(mapped);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const handleViewDetails = async (account: SavingsAccount) => {
    setSelectedAccount(account);
    setShowDetails(true);
  };

  const handleCalculateInterest = async (accountId: string) => {
    try {
      await apiService.calculateSavingsAccountInterest(accountId);
      toast.success('Intérêts calculés avec succès');
      loadAccounts();
    } catch (error) {
      const anyErr: any = error;
      const status = anyErr?.response?.status;
      const message = anyErr?.response?.data?.message || anyErr?.message;
      if (status === 403) {
        toast.error("Vous n'avez pas l'autorisation (Admin/SuperAdmin requis)");
      } else if (status === 400 || status === 404) {
        toast.error(message || 'Requête invalide lors du calcul des intérêts');
      } else {
        toast.error('Erreur lors du calcul des intérêts');
      }
    }
  };

  const handleCalculateAllInterests = async () => {
    try {
      const result = await apiService.calculateAllSavingsInterest();
      toast.success(`Intérêts calculés pour ${result.message || 'tous les comptes'}`);
      loadAccounts();
      loadStatistics();
    } catch (error) {
      toast.error('Erreur lors du calcul des intérêts');
    }
  };

  const handleCloseAccount = async (id: string) => {
    const reason = prompt('Raison de la fermeture du compte:');
    if (!reason) return;

    try {
      await apiService.closeSavingsAccount(id, reason);
      toast.success('Compte fermé avec succès');
      loadAccounts();
    } catch (error) {
      toast.error('Erreur lors de la fermeture du compte');
    }
  };




  const filteredAccounts = accounts.filter(account =>
    (account.accountNumber && account.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (account.customerName && account.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (account.customerPhone && account.customerPhone.includes(searchTerm))
  ).filter(account => {
    if (filters.branchId && account.branchId !== filters.branchId) return false;
    if (filters.currency !== undefined && account.currency !== (filters.currency === 0 ? 'HTG' : 'USD')) return false;
    if (filters.status !== undefined && account.status !== (filters.status === 0 ? 'Active' : filters.status === 1 ? 'Inactive' : filters.status === 2 ? 'Closed' : 'Suspended')) return false;
    return true;
  });

  // Pagination calculations
  const totalFiltered = filteredAccounts.length;
  const totalPages = Math.ceil(totalFiltered / pageSize);
  const paginatedAccounts = filteredAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Export helpers (exports filteredAccounts)
  const exportAccountsCSV = () => {
    try {
      const data = filteredAccounts.map(a => ({
        id: a.id,
        accountNumber: a.accountNumber,
        customerName: a.customerName,
        phone: a.customerPhone,
        branch: a.branchName,
        currency: a.currency,
        balance: a.balance,
        status: a.status,
        opened: a.openingDate
      }));
      const csv = unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accounts_savings_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
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
        Succursale: a.branchName,
        Devise: a.currency,
        Solde: a.balance,
        Statut: a.status,
        OuvertLe: a.openingDate
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Comptes');
      XLSX.writeFile(wb, `accounts_savings_${new Date().toISOString().slice(0,10)}.xlsx`);
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
          <td style="padding:8px;border:1px solid #ddd">${a.accountNumber}</td>
          <td style="padding:8px;border:1px solid #ddd">${a.customerName}</td>
          <td style="padding:8px;border:1px solid #ddd">${a.branchName}</td>
          <td style="padding:8px;border:1px solid #ddd">${a.currency}</td>
          <td style="padding:8px;border:1px solid #ddd">${a.balance}</td>
          <td style="padding:8px;border:1px solid #ddd">${a.status}</td>
        </tr>
      `).join('');
      const html = `
        <html><head><meta charset="utf-8"><title>Comptes Épargne</title>
        <style>table{border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif}th,td{border:1px solid #ddd;padding:8px}th{background:#f3f4f6;text-align:left}</style>
        </head><body>
        <h2>Liste Comptes Épargne</h2>
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
  

  const getTodayCount = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return accounts.filter(a => {
      const dateStr = a.createdAt || a.openingDate;
      if (!dateStr) return false;
      const accDate = new Date(dateStr);
      accDate.setHours(0, 0, 0, 0);
      return accDate.getTime() === today.getTime();
    }).length;
  };

  const htgCount = accounts.filter(a => {
    const c = String(a.currency).toUpperCase();
    return c === 'HTG' || c === '0';
  }).length;
  const usdCount = accounts.filter(a => {
    const c = String(a.currency).toUpperCase();
    return c === 'USD' || c === '1';
  }).length;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Total Comptes avec sous-totaux */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Comptes</p>
                <p className="text-3xl font-bold">{statistics.totalAccounts || 0}</p>
                <p className="text-xs mt-1 opacity-75">
                  <span className="font-bold">{htgCount}</span> Compte(s) HTG | <span className="font-bold">{usdCount}</span> Compte(s) USD
                </p>
                <p className="text-xs mt-1 opacity-75">{statistics.activeAccounts || 0} actifs</p>
              </div>
              <DollarSign className="h-12 w-12 opacity-80" />
            </div>
          </div>
          {/* Solde Total HTG */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Solde Total HTG</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('fr-FR').format(statistics.totalBalanceHTG)}
                </p>
                <p className="text-xs mt-1 opacity-75">Gourdes</p>
              </div>
              <TrendingUp className="h-12 w-12 opacity-80" />
            </div>
          </div>
          {/* Solde Total USD */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Solde Total USD</p>
                <p className="text-2xl font-bold">
                  ${new Intl.NumberFormat('fr-FR').format(statistics.totalBalanceUSD)}
                </p>
                <p className="text-xs mt-1 opacity-75">Dollars US</p>
              </div>
              <DollarSign className="h-12 w-12 opacity-80" />
            </div>
          </div>
          {/* Comptes créés aujourd'hui */}
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-xl text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Créés aujourd'hui</p>
                <p className="text-3xl font-bold">{getTodayCount()}</p>
                <p className="text-xs mt-1 opacity-75">Comptes ouverts</p>
              </div>
              <Calendar className="h-12 w-12 opacity-80" />
            </div>
          </div>
          {/* Nouveaux ce Mois */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Nouveaux ce Mois</p>
                <p className="text-3xl font-bold">{statistics.newAccountsThisMonth || 0}</p>
                <p className="text-xs mt-1 opacity-75">Comptes ouverts</p>
              </div>
              <Calendar className="h-12 w-12 opacity-80" />
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Rechercher par numéro, nom client ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border-2 transition-colors flex items-center gap-2 ${
                showFilters
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-gray-300 hover:border-blue-500'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filtres
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <button
              onClick={handleCalculateAllInterests}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Calculer Intérêts
            </button>

            <button
              onClick={loadAccounts}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>

            {/* Export buttons */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => exportAccountsCSV()}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                title="Exporter CSV"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
              <button
                onClick={() => exportAccountsExcel()}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                title="Exporter Excel"
              >
                <Download className="h-4 w-4" /> XLSX
              </button>
              <button
                onClick={() => exportAccountsPDF()}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                title="Exporter PDF"
              >
                <Download className="h-4 w-4" /> PDF
              </button>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nouveau Compte
            </button>

            <button
              onClick={() => setShowCreateNewClientAccountModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nouveau Client + Compte
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Succursale
              </label>
              <select
                value={filters.branchId ?? ''}
                onChange={(e) => setFilters({...filters, branchId: e.target.value ? parseInt(e.target.value) : undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes succursales</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Devise
              </label>
              <select
                value={filters.currency ?? ''}
                onChange={(e) => setFilters({...filters, currency: e.target.value ? parseInt(e.target.value) as 0 | 1 : undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes devises</option>
                <option value="0">HTG</option>
                <option value="1">USD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Statut
              </label>
              <select
                value={filters.status ?? ''}
                onChange={(e) => setFilters({...filters, status: e.target.value ? parseInt(e.target.value) as 0 | 1 | 2 | 3 : undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous statuts</option>
                <option value="0">Actifs</option>
                <option value="1">Inactifs</option>
                <option value="2">Fermés</option>
                <option value="3">Suspendus</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({})}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun compte trouvé</h3>
            <p className="text-gray-500">Essayez de modifier vos critères de recherche</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Numéro Compte
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Succursale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Devise
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solde
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Intérêts
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{account.accountNumber}</div>
                      <div className="text-sm text-gray-500">
                        Ouvert le {new Date(account.openingDate).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{
                        account.customerName && account.customerName.trim() !== ''
                          ? account.customerName
                          : account.customerCode || account.CustomerCode || account.customerId
                            ? <span className="italic text-gray-400">{account.customerCode || account.CustomerCode || account.customerId}</span>
                            : <span className="italic text-gray-400">Nom inconnu</span>
                      }</div>
                      <div className="text-sm text-gray-500">
                        {account.customerCode || account.CustomerCode ? `Code: ${account.customerCode || account.CustomerCode}` : account.customerPhone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account.branchName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        String(account.currency).toUpperCase() === 'HTG' || String(account.currency) === '0'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {String(account.currency).toUpperCase() === 'HTG' || String(account.currency) === '0' ? 'HTG' : 'USD'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(account.balance, account.currency)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Dispo: {formatCurrency(account.availableBalance, account.currency)}
                      </div>
                      {account.blockedBalance > 0 && (
                        <div className="text-xs text-red-600 font-medium">
                          Bloquée: {formatCurrency(account.blockedBalance, account.currency)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-purple-600">
                        {formatCurrency(account.accruedInterest, account.currency)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {account.interestRate}% / an
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">

                      {(() => {
                        // Map numeric status to string if needed
                        const statusMap = {
                          0: 'Active',
                          1: 'Inactive',
                          2: 'Closed',
                          3: 'Suspended',
                        };
                        const statusStr = typeof account.status === 'number' ? statusMap[account.status as 0|1|2|3] : account.status;
                        return (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(statusStr)}`}>
                            {getStatusIcon(statusStr)}
                            {statusStr}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetails(account)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Voir détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCalculateInterest(account.id)}
                          className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={(() => {
                            const role = (currentUser?.role || currentUser?.Role || '').toString();
                            const isAuthorized = role === 'Admin' || role === 'SuperAdmin';
                            // Eligibility: Active, interestRate>0, 30+ days since last calc or opening
                            const opened = new Date(account.openingDate);
                            const lastCalc = account.lastInterestCalculation ? new Date(account.lastInterestCalculation) : opened;
                            const days = Math.floor((Date.now() - lastCalc.getTime()) / (1000*60*60*24));
                            const eligible = account.status === 'Active' && account.interestRate > 0 && days >= 30;
                            if (!isAuthorized) return 'Réservé aux Admin/SuperAdmin';
                            if (!eligible) return 'Non éligible: compte actif, taux > 0, et ≥ 30 jours requis';
                            return 'Calculer intérêts';
                          })()}
                          disabled={(() => {
                            const role = (currentUser?.role || currentUser?.Role || '').toString();
                            const isAuthorized = role === 'Admin' || role === 'SuperAdmin';
                            const opened = new Date(account.openingDate);
                            const lastCalc = account.lastInterestCalculation ? new Date(account.lastInterestCalculation) : opened;
                            const days = Math.floor((Date.now() - lastCalc.getTime()) / (1000*60*60*24));
                            const eligible = account.status === 'Active' && account.interestRate > 0 && days >= 30;
                            return !isAuthorized || !eligible;
                          })()}
                        >
                          <TrendingUp className="h-4 w-4" />
                        </button>
                        {account.status === 'Active' && (
                          <button
                            onClick={() => handleCloseAccount(account.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Fermer compte"
                          >
                            <Lock className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalFiltered > 0 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="pageSize" className="text-sm text-gray-700">
                  Éléments par page:
                </label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="text-sm text-gray-700">
                Affichage de {Math.min((currentPage - 1) * pageSize + 1, totalFiltered)} à {Math.min(currentPage * pageSize, totalFiltered)} sur {totalFiltered} résultats
              </div>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Précédent</span>
                  <ChevronUp className="h-5 w-5 rotate-[-90deg]" />
                </button>
                <div className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  Page {currentPage} sur {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Suivant</span>
                  <ChevronUp className="h-5 w-5 rotate-90" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateModal && (
        <CreateAccountModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadAccounts();
            loadStatistics();
          }}
        />
      )}
      {showCreateNewClientAccountModal && (
        <CreateAccountWithNewCustomerModal
          onClose={() => setShowCreateNewClientAccountModal(false)}
          onSuccess={() => {
            setShowCreateNewClientAccountModal(false);
            loadAccounts();
            loadStatistics();
          }}
        />
      )}
    {/* Account Details Modal */}
    {showDetails && selectedAccount && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto relative">
          <AccountDetailsView
            accountId={selectedAccount.id}
            onClose={() => {
              setShowDetails(false);
              setSelectedAccount(null);
            }}
            onUpdate={() => {
              loadAccounts();
              loadStatistics && loadStatistics();
            }}
          />
        </div>
      </div>
    )}
    </div>
  );
};

// Modal Component for Creating Account
const CreateAccountModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'customer' | 'account'>(('customer'));
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const lastSearchedRef = useRef<string>('');
  const CODE_PATTERN = /^[A-Z]{2}\d{3,}$/; // e.g., TD5765
  const [accountForm, setAccountForm] = useState({
    branchId: 1,
    currency: 0 as 0 | 1, // 0=HTG, 1=USD
    initialDeposit: 0,
    interestRatePercent: 2.0, // UI percent; will be converted to fraction
    notes: '',
    limits: {
      dailyWithdrawalLimit: '',
      dailyDepositLimit: '',
      monthlyWithdrawalLimit: '',
      maxBalance: '',
      minWithdrawalAmount: '',
      maxWithdrawalAmount: ''
    } as any
  });

  const searchCustomers = async () => {
    const query = customerSearch?.trim();
    if (!query || query.length < 2) return;
    try {
      setLoading(true);
      // Uppercase to ensure exact match on CustomerCode (e.g., TD5765)
      const term = query.toUpperCase();
      if (lastSearchedRef.current === term) return;
      lastSearchedRef.current = term;
      const results = await apiService.getSavingsCustomers(term);
      setCustomers(results || []);
    } catch (error) {
      toast.error('Erreur lors de la recherche du client');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    // keep selected customer; accountForm no longer stores customerId directly
    setStep('account');
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
      if (lastSearchedRef.current !== upper) {
        searchCustomers();
      }
    }, delay);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerSearch, step]);

  // Load branches once when entering account step
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await apiService.getAllBranches();
        const mapped = (data || []).map((b: any) => ({ id: b.id || b.Id, name: b.name || b.Name }));
        setBranches(mapped);
        if (mapped.length && !accountForm.branchId) {
          setAccountForm((f) => ({ ...f, branchId: mapped[0].id }));
        }
      } catch {
        // ignore
      }
    };
    if (step === 'account') {
      loadBranches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Adjust default interest suggestion when currency changes
  const handleCurrencyChange = (value: 0 | 1) => {
    const suggested = value === 0 ? 2.0 : 1.5; // HTG:2% USD:1.5%
    setAccountForm({ ...accountForm, currency: value, interestRatePercent: suggested });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    // Basic validations
    if (!accountForm.initialDeposit || accountForm.initialDeposit <= 0) {
      toast.error('Le dépôt initial doit être supérieur à 0');
      return;
    }
    if (!accountForm.branchId) {
      toast.error('Veuillez sélectionner une succursale');
      return;
    }

    // Map UI form to backend DTO
    const payload: any = {
      ExistingCustomerId: selectedCustomer.id || selectedCustomer.Id,
      Currency: accountForm.currency, // 0=HTG,1=USD
      InitialDeposit: accountForm.initialDeposit,
      BranchId: accountForm.branchId,
    };
    // Interest rate: backend expects fraction (e.g., 0.02 for 2%)
    if (accountForm.interestRatePercent !== undefined && accountForm.interestRatePercent !== null && accountForm.interestRatePercent >= 0) {
      payload.InterestRate = Number((accountForm.interestRatePercent / 100).toFixed(6));
    }
    // Optional limits when advanced expanded and values provided
    if (showAdvanced) {
      const l = accountForm.limits as any;
      const limits: any = {};
      if (l.dailyWithdrawalLimit) limits.DailyWithdrawalLimit = Number(l.dailyWithdrawalLimit);
      if (l.dailyDepositLimit) limits.DailyDepositLimit = Number(l.dailyDepositLimit);
      if (l.monthlyWithdrawalLimit) limits.MonthlyWithdrawalLimit = Number(l.monthlyWithdrawalLimit);
      if (l.maxBalance) limits.MaxBalance = Number(l.maxBalance);
      if (l.minWithdrawalAmount) limits.MinWithdrawalAmount = Number(l.minWithdrawalAmount);
      if (l.maxWithdrawalAmount) limits.MaxWithdrawalAmount = Number(l.maxWithdrawalAmount);
      if (Object.keys(limits).length) payload.AccountLimits = limits;
    }

    setLoading(true);
    try {
      await apiService.openSavingsAccount(payload);
      toast.success('Compte d\'épargne ouvert avec succès');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'ouverture du compte');
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
              <h2 className="text-2xl font-bold">Ouvrir un Compte d'Épargne</h2>
              <p className="text-blue-100 mt-1">
                {step === 'customer' ? 'Étape 1: Sélectionner le client' : 'Étape 2: Configurer le compte'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>
        {/* Content Wrapper for comfortable padding */}
        <div className="p-6 md:p-8">
        {/* Step 1: Customer Selection */}
        {step === 'customer' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher un client
              </label>
              <div className="flex gap-2 flex-col sm:flex-row">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchCustomers(); } }}
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
            {/* Customer Results */}
            {customers.length > 0 && (
              <div ref={resultsRef} className="space-y-2 max-h-[50vh] overflow-y-auto border border-gray-200 rounded-lg p-2 mt-2">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedCustomer?.id === customer.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{customer.fullName}</p>
                        <p className="text-sm text-gray-500">{customer.primaryPhone}</p>
                        { (customer.customerCode || customer.CustomerCode) && (
                          <p className="text-xs text-gray-500">Code: {customer.customerCode || customer.CustomerCode}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {customer.documentType}: {customer.documentNumber}
                        </p>
                      </div>
                      {selectedCustomer?.id === customer.id && (
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
        {/* Step 2: Account Configuration */}
        {step === 'account' && selectedCustomer && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Client sélectionné:</p>
              <p className="font-semibold text-gray-900">{selectedCustomer.fullName}</p>
              <button
                type="button"
                onClick={() => setStep('customer')}
                className="text-sm text-blue-600 hover:underline mt-1"
              >
                Changer de client
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
                <select
                  value={accountForm.currency}
                  onChange={(e) => handleCurrencyChange(parseInt(e.target.value) as 0 | 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value={0}>HTG (Gourdes)</option>
                  <option value={1}>USD (Dollars)</option>
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
                    branches.map(b => (
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Taux d'intérêt (% / an)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="15"
                  value={accountForm.interestRatePercent}
                  onChange={(e) => setAccountForm({ ...accountForm, interestRatePercent: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-2">Suggestion: {accountForm.currency === 0 ? '2.00% (HTG)' : '1.50% (USD)'}</p>
              </div>
            </div>
            <div className="pt-2">
              <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-gray-700 hover:text-gray-900">
                {showAdvanced ? 'Masquer options avancées' : 'Afficher options avancées'}
              </button>
              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Plafond Retrait Quotidien</label>
                    <input type="number" step="0.01" value={accountForm.limits.dailyWithdrawalLimit}
                      onChange={(e) => setAccountForm({ ...accountForm, limits: { ...accountForm.limits, dailyWithdrawalLimit: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Plafond Dépôt Quotidien</label>
                    <input type="number" step="0.01" value={accountForm.limits.dailyDepositLimit}
                      onChange={(e) => setAccountForm({ ...accountForm, limits: { ...accountForm.limits, dailyDepositLimit: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Plafond Retrait Mensuel</label>
                    <input type="number" step="0.01" value={accountForm.limits.monthlyWithdrawalLimit}
                      onChange={(e) => setAccountForm({ ...accountForm, limits: { ...accountForm.limits, monthlyWithdrawalLimit: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Solde Maximum</label>
                    <input type="number" step="0.01" value={accountForm.limits.maxBalance}
                      onChange={(e) => setAccountForm({ ...accountForm, limits: { ...accountForm.limits, maxBalance: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Montant Min. Retrait</label>
                    <input type="number" step="0.01" value={accountForm.limits.minWithdrawalAmount}
                      onChange={(e) => setAccountForm({ ...accountForm, limits: { ...accountForm.limits, minWithdrawalAmount: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Montant Max. Retrait</label>
                    <input type="number" step="0.01" value={accountForm.limits.maxWithdrawalAmount}
                      onChange={(e) => setAccountForm({ ...accountForm, limits: { ...accountForm.limits, maxWithdrawalAmount: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optionnel)
              </label>
              <textarea
                value={accountForm.notes}
                onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Notes additionnelles..."
              />
            </div>
            <div className="flex gap-4 pt-6 border-t border-gray-200 mt-6">
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
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Ouverture...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Ouvrir le compte
                  </>
                )}
              </button>
            </div>
          </form>
        )}
        </div>
      </div>
    </div>
  );
};

export default CompleteSavingsAccountManagement;

// Modal to create a NEW customer, then open a Savings Account in one flow
const CreateAccountWithNewCustomerModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'customer' | 'account'>('customer');
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [createdCustomerDto, setCreatedCustomerDto] = useState<any | null>(null);
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);

  const [accountForm, setAccountForm] = useState({
    branchId: 1,
    currency: 0 as 0 | 1, // 0=HTG, 1=USD
    initialDeposit: 0,
    interestRatePercent: 2.0,
    limits: {
      dailyWithdrawalLimit: '',
      dailyDepositLimit: '',
      monthlyWithdrawalLimit: '',
      maxBalance: '',
      minWithdrawalAmount: '',
      maxWithdrawalAmount: ''
    } as any
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (step === 'account') {
      (async () => {
        try {
          const data = await apiService.getAllBranches();
          const mapped = (data || []).map((b: any) => ({ id: b.id || b.Id, name: b.name || b.Name }));
          setBranches(mapped);
          if (mapped.length && !accountForm.branchId) {
            setAccountForm((f) => ({ ...f, branchId: mapped[0].id }));
          }
        } catch {
          /* ignore */
        }
      })();
    }
  }, [step]);

  const handleCurrencyChange = (value: 0 | 1) => {
    const suggested = value === 0 ? 2.0 : 1.5; // HTG:2% USD:1.5%
    setAccountForm({ ...accountForm, currency: value, interestRatePercent: suggested });
  };

  // Map ClientCreationForm data -> SavingsCustomerCreateDto
  const mapClientFormToSavingsCustomerDto = (clientData: any) => {
    // gender: map 'M'|'F' to backend enum (0/1)
    const mapGender = (g: string) => (String(g).toUpperCase() === 'F' ? 1 : 0);
    // IdentityDocumentType in ClientCreationForm is numeric; backend expects SavingsIdentityDocumentType numeric too
    const mapDocType = (t: any) => Number(t);

    const dto: any = {
      // Common fields
      isBusiness: !!clientData.isBusiness,
      firstName: clientData.firstName || clientData.legalRepresentativeFirstName || '',
      lastName: clientData.lastName || clientData.legalRepresentativeLastName || '',
      dateOfBirth: clientData.dateOfBirth || '1900-01-01', // Required by backend
      gender: mapGender(clientData.gender || 'M'),

      // Address
      street: clientData.street,
      commune: clientData.commune,
      department: clientData.department,
      postalCode: clientData.postalAddress || clientData.postalCode || undefined,

      // Contact
      primaryPhone: clientData.primaryPhone || clientData.companyPhone,
      secondaryPhone: clientData.secondaryPhone || undefined,
      email: clientData.email || clientData.companyEmail || undefined,
      emergencyContactName: clientData.emergencyContactName || clientData.emergencyContact?.name || undefined,
      emergencyContactPhone: clientData.emergencyContactPhone || clientData.emergencyContact?.phone || undefined,

      // Identity (use representative's document for business clients)
      documentType: mapDocType(clientData.documentType || clientData.legalRepresentativeDocumentType),
      documentNumber: clientData.documentNumber || clientData.legalRepresentativeDocumentNumber,
      issuedDate: clientData.issuedDate || clientData.legalRepresentativeIssuedDate,
      expiryDate: clientData.expiryDate || clientData.legalRepresentativeExpiryDate || undefined,
      issuingAuthority: clientData.issuingAuthority || clientData.legalRepresentativeIssuingAuthority,

      // Professional info
      occupation: clientData.occupation || undefined,
      monthlyIncome: clientData.monthlyIncome ? Number(clientData.monthlyIncome) : undefined,

      // Business client fields
      ...(clientData.isBusiness && {
        companyName: clientData.companyName || undefined,
        legalForm: clientData.legalForm || undefined,
        tradeRegisterNumber: clientData.tradeRegisterNumber || clientData.businessRegistrationNumber || undefined,
        taxId: clientData.taxId || clientData.companyNif || undefined,
        headOfficeAddress: clientData.headOfficeAddress || undefined,
        companyPhone: clientData.companyPhone || undefined,
        companyEmail: clientData.companyEmail || undefined,

        // Representative fields
        representativeFirstName: clientData.legalRepresentativeFirstName || undefined,
        representativeLastName: clientData.legalRepresentativeLastName || undefined,
        representativeTitle: clientData.legalRepresentativeTitle || undefined,
        representativeDocumentType: mapDocType(clientData.legalRepresentativeDocumentType),
        representativeDocumentNumber: clientData.legalRepresentativeDocumentNumber || undefined,
        representativeIssuedDate: clientData.legalRepresentativeIssuedDate || undefined,
        representativeExpiryDate: clientData.legalRepresentativeExpiryDate || undefined,
        representativeIssuingAuthority: clientData.legalRepresentativeIssuingAuthority || undefined,
      }),

      // Additional individual client fields
      birthPlace: clientData.birthPlace || undefined,
      nationality: clientData.nationality || 'Haïtienne',
      personalNif: clientData.nif || undefined,

      // Extended professional info
      employerName: clientData.employerName || undefined,
      workAddress: clientData.workAddress || undefined,
      incomeSource: clientData.incomeSource || undefined,

      // Family/Social info
      maritalStatus: clientData.maritalStatus || undefined,
      numberOfDependents: clientData.numberOfDependents || undefined,
      educationLevel: clientData.educationLevel || undefined,

      // Declaration/Signature
      acceptTerms: clientData.acceptTerms || false,
      signaturePlace: clientData.signaturePlace || undefined,
      signatureDate: clientData.signatureDate || undefined,

      // Reference
      referencePersonName: clientData.referencePerson || undefined,
      referencePersonPhone: clientData.referencePersonPhone || undefined,
    };
    return dto;
  };

  const handleCustomerCreated = async (clientData: any) => {
    setLoading(true);
    try {
      // Create the customer first
      const dto = mapClientFormToSavingsCustomerDto(clientData);
      const created = await savingsCustomerService.createCustomer(dto);
      const customerId = created.id;

      // Upload files if provided
      if (clientData.uploadedFiles) {
        try {
          // Upload photo if provided
          if (clientData.uploadedFiles.photo) {
            await savingsCustomerService.uploadFile(clientData.uploadedFiles.photo, customerId, 'photo');
            console.log('Photo uploaded successfully');
          }

          // Upload ID document if provided
          if (clientData.uploadedFiles.idDocument) {
            await savingsCustomerService.uploadDocument(customerId, clientData.uploadedFiles.idDocument, 0, 'Pièce d\'identité (recto)', 'Face de la carte d\'identité nationale');
            console.log('ID document uploaded successfully');
          }

          // Upload proof of residence if provided
          if (clientData.uploadedFiles.proofOfResidence) {
            // Use document type 2 = ProofOfResidence
            await savingsCustomerService.uploadDocument(customerId, clientData.uploadedFiles.proofOfResidence, 2, 'Justificatif de domicile', 'Facture d\'électricité, d\'eau ou autre document prouvant le domicile');
            console.log('Proof of residence uploaded successfully');
          }

          // Upload business registration document if provided
          if (clientData.uploadedFiles.businessRegistrationDocument) {
            await savingsCustomerService.uploadDocument(customerId, clientData.uploadedFiles.businessRegistrationDocument, 4, 'Registre de commerce', 'Extrait du registre de commerce');
            console.log('Business registration document uploaded successfully');
          }

          // Upload company proof of address if provided
          if (clientData.uploadedFiles.companyProofOfAddress) {
            // Use document type 2 = ProofOfResidence
            await savingsCustomerService.uploadDocument(customerId, clientData.uploadedFiles.companyProofOfAddress, 2, 'Justificatif domicile société', 'Facture d\'électricité, d\'eau ou autre document prouvant l\'adresse de l\'entreprise');
            console.log('Company proof of address uploaded successfully');
          }

          // Upload funds origin declaration if provided
          if (clientData.uploadedFiles.fundsOriginDeclaration) {
            await savingsCustomerService.uploadDocument(customerId, clientData.uploadedFiles.fundsOriginDeclaration, 4, 'Déclaration origine fonds', 'Déclaration d\'origine des fonds');
            console.log('Funds origin declaration uploaded successfully');
          }

          // Upload other documents if provided
          if (clientData.uploadedFiles.otherDocuments && clientData.uploadedFiles.otherDocuments.length > 0) {
            for (let i = 0; i < clientData.uploadedFiles.otherDocuments.length; i++) {
              const doc = clientData.uploadedFiles.otherDocuments[i];
              await savingsCustomerService.uploadDocument(customerId, doc, 4, `Document supplémentaire ${i + 1}`, 'Document supplémentaire');
            }
            console.log('Other documents uploaded successfully');
          }
        } catch (fileError: any) {
          console.error('Error uploading files:', fileError);
          toast.error('Client créé mais erreur lors de l\'upload des fichiers');
          // Don't fail the entire operation, just warn about file upload issues
        }
      }

      // Save signature if provided
      if (clientData.signature) {
        try {
          await savingsCustomerService.saveSignature(customerId, clientData.signature);
          console.log('Signature saved successfully');
        } catch (signatureError: any) {
          console.error('Error saving signature:', signatureError);
          toast.error('Client créé mais erreur lors de la sauvegarde de la signature');
          // Don't fail the entire operation, just warn about signature issues
        }
      }

      // Save the created customer info for account creation
      setCreatedCustomerDto(dto);
      setCreatedCustomerId(customerId);
      setStep('account');
      return created;
    } catch (error: any) {
      console.error('Error creating customer:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Erreur lors de la création du client');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdCustomerDto) {
      toast.error('Veuillez compléter la création du client');
      return;
    }

    if (!accountForm.initialDeposit || accountForm.initialDeposit <= 0) {
      toast.error("Le dépôt initial doit être supérieur à 0");
      return;
    }

    if (!accountForm.branchId) {
      toast.error('Veuillez sélectionner une succursale');
      return;
    }

    const payload: any = {
      CustomerId: createdCustomerId,
      Currency: accountForm.currency,
      InitialDeposit: accountForm.initialDeposit,
      BranchId: accountForm.branchId,
    };
    if (accountForm.interestRatePercent !== undefined && accountForm.interestRatePercent !== null && accountForm.interestRatePercent >= 0) {
      payload.InterestRate = Number((accountForm.interestRatePercent / 100).toFixed(6));
    }
    if (showAdvanced) {
      const l = accountForm.limits as any;
      const limits: any = {};
      if (l.dailyWithdrawalLimit) limits.DailyWithdrawalLimit = Number(l.dailyWithdrawalLimit);
      if (l.dailyDepositLimit) limits.DailyDepositLimit = Number(l.dailyDepositLimit);
      if (l.monthlyWithdrawalLimit) limits.MonthlyWithdrawalLimit = Number(l.monthlyWithdrawalLimit);
      if (l.maxBalance) limits.MaxBalance = Number(l.maxBalance);
      if (l.minWithdrawalAmount) limits.MinWithdrawalAmount = Number(l.minWithdrawalAmount);
      if (l.maxWithdrawalAmount) limits.MaxWithdrawalAmount = Number(l.maxWithdrawalAmount);
      if (Object.keys(limits).length) payload.AccountLimits = limits;
    }

    setLoading(true);
    try {
      await apiService.openSavingsAccount(payload);
      toast.success("Client créé et compte d'épargne ouvert avec succès");
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur lors de l'ouverture du compte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Nouveau Client + Compte d'Épargne</h2>
              <p className="text-green-100 mt-1">
                {step === 'customer' ? 'Étape 1: Créer le client' : 'Étape 2: Configurer le compte'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {step === 'customer' && (
            <ClientCreationForm
              onSubmit={handleCustomerCreated}
              onCancel={onClose}
              isLoading={loading}
            />
          )}

          {step === 'account' && (
            <form onSubmit={handleSubmitAccount} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
                  <select
                    value={accountForm.currency}
                    onChange={(e) => handleCurrencyChange(parseInt(e.target.value) as 0 | 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value={0}>HTG (Gourdes)</option>
                    <option value={1}>USD (Dollars)</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Taux d'intérêt (% / an)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="15"
                    value={accountForm.interestRatePercent}
                    onChange={(e) => setAccountForm({ ...accountForm, interestRatePercent: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-2">Suggestion: {accountForm.currency === 0 ? '2.00% (HTG)' : '1.50% (USD)'}</p>
                </div>
              </div>

              <div className="pt-2">
                <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-gray-700 hover:text-gray-900">
                  {showAdvanced ? 'Masquer options avancées' : 'Afficher options avancées'}
                </button>
                {showAdvanced && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Plafond Retrait Quotidien</label>
                      <input type="number" step="0.01" value={accountForm.limits.dailyWithdrawalLimit}
                        onChange={(e) => setAccountForm({ ...accountForm, limits: { ...accountForm.limits, dailyWithdrawalLimit: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Plafond Dépôt Quotidien</label>
                      <input type="number" step="0.01" value={accountForm.limits.dailyDepositLimit}
                        onChange={(e) => setAccountForm({ ...accountForm, limits: { ...accountForm.limits, dailyDepositLimit: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Plafond Retrait Mensuel</label>
                      <input type="number" step="0.01" value={accountForm.limits.monthlyWithdrawalLimit}
                        onChange={(e) => setAccountForm({ ...accountForm, limits: { ...accountForm.limits, monthlyWithdrawalLimit: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Solde Maximum</label>
                      <input type="number" step="0.01" value={accountForm.limits.maxBalance}
                        onChange={(e) => setAccountForm({ ...accountForm, limits: { ...accountForm.limits, maxBalance: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Montant Min. Retrait</label>
                      <input type="number" step="0.01" value={accountForm.limits.minWithdrawalAmount}
                        onChange={(e) => setAccountForm({ ...accountForm, limits: { ...accountForm.limits, minWithdrawalAmount: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Montant Max. Retrait</label>
                      <input type="number" step="0.01" value={accountForm.limits.maxWithdrawalAmount}
                        onChange={(e) => setAccountForm({ ...accountForm, limits: { ...accountForm.limits, maxWithdrawalAmount: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={() => setStep('customer')}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Ouverture...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Créer client et ouvrir compte
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
