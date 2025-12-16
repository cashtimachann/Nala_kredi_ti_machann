import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Eye,
  Search,
  Filter,
  Calendar,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Trash2,
  FileDown
} from 'lucide-react';
import {
  CurrencyExchangeRate,
  CreateExchangeRateDto,
  UpdateExchangeRateDto,
  ExchangeRateSearchDto,
  CurrencyType,
  RateUpdateMethod,
  ExchangeTransaction,
  ExchangeTransactionSearchDto,
  ExchangeTransactionStatus,
  ExchangeType,
  formatCurrencyType,
  formatRateUpdateMethod,
  formatCurrencySymbol,
  formatTransactionStatus,
  formatExchangeType
} from '../../types/currencyExchange';
import apiService from '../../services/apiService';
import ExchangeRateForm from './ExchangeRateForm';
import ExchangeTransactionForm from './ExchangeTransactionForm';
import toast from 'react-hot-toast';

interface ExchangeRateManagementProps {
  branchId?: string;
}

const normalizeTransactionStatus = (
  status: ExchangeTransactionStatus | string | undefined | null
): string => {
  if (status === undefined || status === null) {
    return 'unknown';
  }

  if (typeof status === 'string') {
    return status.toLowerCase();
  }

  switch (status) {
    case ExchangeTransactionStatus.Completed:
      return 'completed';
    case ExchangeTransactionStatus.Pending:
      return 'pending';
    case ExchangeTransactionStatus.Cancelled:
      return 'cancelled';
    case ExchangeTransactionStatus.Failed:
      return 'failed';
    default:
      return 'unknown';
  }
};

const getStatusBadgeClass = (
  status: ExchangeTransactionStatus | string | undefined | null
): string => {
  const normalized = normalizeTransactionStatus(status);

  switch (normalized) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (
  statusName: string | undefined,
  status: ExchangeTransactionStatus | string | undefined | null
): string => {
  if (statusName && statusName.trim().length > 0) {
    return statusName;
  }

  if (typeof status === 'string') {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  if (status !== undefined && status !== null) {
    return formatTransactionStatus(status as ExchangeTransactionStatus);
  }

  return 'Inconnu';
};

const ExchangeRateManagement: React.FC<ExchangeRateManagementProps> = ({ branchId }) => {
  const [activeTab, setActiveTab] = useState<'rates' | 'history'>('rates');
  const [rates, setRates] = useState<CurrencyExchangeRate[]>([]);
  const [transactions, setTransactions] = useState<ExchangeTransaction[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [baseCurrencyFilter, setBaseCurrencyFilter] = useState<CurrencyType | ''>('');
  const [targetCurrencyFilter, setTargetCurrencyFilter] = useState<CurrencyType | ''>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [exchangeTypeFilter, setExchangeTypeFilter] = useState<ExchangeType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ExchangeTransactionStatus | ''>('');
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [showRateForm, setShowRateForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingRate, setEditingRate] = useState<CurrencyExchangeRate | null>(null);
  const [selectedRate, setSelectedRate] = useState<CurrencyExchangeRate | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<ExchangeTransaction | null>(null);
  
  // Pagination states
  const [ratesCurrentPage, setRatesCurrentPage] = useState(1);
  const [transactionsCurrentPage, setTransactionsCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (activeTab === 'rates') {
      loadExchangeRates();
      setRatesCurrentPage(1);
    } else {
      // Default to all branches (no branch filter) so history shows everything
      if (branchFilter !== '') {
        setBranchFilter('');
      }
      loadTransactions();
      setTransactionsCurrentPage(1);
    }
  }, [activeTab, baseCurrencyFilter, targetCurrencyFilter, activeFilter, exchangeTypeFilter, statusFilter, branchFilter, startDateFilter, endDateFilter]);

  const clearHistoryFilters = () => {
    setSearchTerm('');
    setBaseCurrencyFilter('');
    setTargetCurrencyFilter('');
    setExchangeTypeFilter('');
    setStatusFilter('');
    // Show all branches by default
    setBranchFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const loadBranches = async () => {
    try {
      const data = await apiService.getAllBranches();
      setBranches(data);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadExchangeRates = async () => {
    try {
      setLoading(true);
      const searchDto: ExchangeRateSearchDto = {
        baseCurrency: baseCurrencyFilter !== '' ? baseCurrencyFilter : undefined,
        targetCurrency: targetCurrencyFilter !== '' ? targetCurrencyFilter : undefined,
        isActive: activeFilter !== '' ? activeFilter === 'true' : undefined
      };
  const data = await apiService.getExchangeRates(searchDto);
  setRates(data);
    } catch (error) {
      console.error('Error loading exchange rates:', error);
      toast.error('Erreur lors du chargement des taux');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentRates = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCurrentRates();
      setRates(data);
    } catch (error) {
      console.error('Error loading current rates:', error);
      toast.error('Erreur lors du chargement des taux actuels');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const searchDto: ExchangeTransactionSearchDto = {
        fromCurrency: baseCurrencyFilter !== '' ? baseCurrencyFilter : undefined,
        toCurrency: targetCurrencyFilter !== '' ? targetCurrencyFilter : undefined,
        exchangeType: exchangeTypeFilter !== '' ? exchangeTypeFilter : undefined,
        status: statusFilter !== '' ? statusFilter : undefined,
        branchId: branchFilter !== '' ? branchFilter : undefined,
        includeAll: branchFilter === '' ? true : undefined,
        startDate: startDateFilter !== '' ? startDateFilter : undefined,
        endDate: endDateFilter !== '' ? endDateFilter : undefined
      };
      const data = await apiService.getExchangeTransactions(searchDto);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRate = () => {
    setEditingRate(null);
    setShowRateForm(true);
  };

  const handleEditRate = (rate: CurrencyExchangeRate) => {
    setEditingRate(rate);
    setShowRateForm(true);
  };

  const handleDeactivateRate = async (rate: CurrencyExchangeRate) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir désactiver ce taux de change?`)) {
      return;
    }

    try {
      await apiService.deactivateExchangeRate(rate.id);
      toast.success('Taux désactivé avec succès');
      loadExchangeRates();
    } catch (error) {
      console.error('Error deactivating rate:', error);
      toast.error('Erreur lors de la désactivation');
    }
  };

  const handleDeleteRate = async (rate: CurrencyExchangeRate) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement ce taux de change? Cette action est irréversible.`)) {
      return;
    }

    try {
      await apiService.deleteExchangeRate(rate.id);
      toast.success('Taux supprimé avec succès');
      if (selectedRate?.id === rate.id) {
        setSelectedRate(null);
      }
      loadExchangeRates();
    } catch (error: unknown) {
      console.error('Error deleting rate:', error);
      const message = (error as any)?.response?.data?.message || 'Erreur lors de la suppression';
      toast.error(message);
    }
  };

  const handleRateSubmit = async (rateData: CreateExchangeRateDto | UpdateExchangeRateDto) => {
    try {
      if (editingRate) {
        await apiService.updateExchangeRate(rateData as UpdateExchangeRateDto);
        toast.success('Taux modifié avec succès');
      } else {
        await apiService.createExchangeRate(rateData as CreateExchangeRateDto);
        toast.success('Taux créé avec succès');
      }
      setShowRateForm(false);
      setEditingRate(null);
      loadExchangeRates();
    } catch (error) {
      console.error('Error saving rate:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />;
  };

  const formatRate = (rate: number) => {
    return rate.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  };
  
  // Pagination helpers
  const getPaginatedData = <T,>(data: T[], currentPage: number): T[] => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };
  
  const getTotalPages = (dataLength: number): number => {
    return Math.ceil(dataLength / itemsPerPage);
  };

  const formatDate = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-CA', { timeZone: 'UTC' });
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('fr-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDisplayDateTime = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('fr-HT', {
      dateStyle: 'full',
      timeStyle: 'short'
    });
  };

  const formatAmount = (value: number) => {
    return value.toLocaleString('fr-HT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const buildTransactionsHtml = () => {
    const generatedAt = new Date().toLocaleString('fr-HT', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const rows = transactions
      .map((transaction, index) => {
        const fromAmount = formatAmount(transaction.fromAmount);
        const toAmount = formatAmount(transaction.toAmount);
        const netAmount = formatAmount(transaction.netAmount ?? 0);
        const statusColor = getStatusBadgeClass(transaction.status as ExchangeTransactionStatus | string);
        const statusLabel = getStatusLabel(transaction.statusName, transaction.status);

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${transaction.transactionNumber}</td>
            <td>${transaction.branchName ?? '—'}</td>
            <td>${transaction.exchangeTypeName || formatExchangeType(transaction.exchangeType)}</td>
            <td>${fromAmount} ${transaction.fromCurrencyName || formatCurrencyType(transaction.fromCurrency)}</td>
            <td>${toAmount} ${transaction.toCurrencyName || formatCurrencyType(transaction.toCurrency)}</td>
            <td>${formatRate(transaction.exchangeRate)}</td>
            <td>${netAmount}</td>
            <td><span class="status ${statusColor}">${statusLabel}</span></td>
            <td>${transaction.customerName ?? '—'}</td>
            <td>${formatDisplayDateTime(transaction.transactionDate)}</td>
            <td>${transaction.processedByName || transaction.processedBy || '—'}</td>
          </tr>
        `;
      })
      .join('');

    const filters: string[] = [];
    if (baseCurrencyFilter) {
      filters.push(`Devise source: ${formatCurrencyType(baseCurrencyFilter as CurrencyType)}`);
    }
    if (targetCurrencyFilter) {
      filters.push(`Devise cible: ${formatCurrencyType(targetCurrencyFilter as CurrencyType)}`);
    }
    if (exchangeTypeFilter) {
      filters.push(`Type de change: ${formatExchangeType(exchangeTypeFilter as ExchangeType)}`);
    }
    if (statusFilter) {
      filters.push(`Statut: ${getStatusLabel(undefined, statusFilter)}`);
    }
    if (branchFilter) {
      const branchName = branches.find((b) => String(b.id) === String(branchFilter))?.name;
      filters.push(`Succursale: ${branchName ?? branchFilter}`);
    }
    if (startDateFilter || endDateFilter) {
      filters.push(`Période: ${startDateFilter || '—'} → ${endDateFilter || '—'}`);
    }

    return `<!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Historique des changes</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          h1 { margin-bottom: 0; }
          h2 { margin-top: 32px; }
          .meta { margin-top: 8px; color: #4b5563; }
          .filters { margin: 16px 0; padding: 12px; background: #f9fafb; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f3f4f6; }
          tr:nth-child(even) { background: #f9fafb; }
          .status { display: inline-block; padding: 2px 6px; border-radius: 9999px; font-size: 10px; text-transform: uppercase; }
          .bg-green-100 { background: #dcfce7; color: #065f46; }
          .bg-yellow-100 { background: #fef3c7; color: #92400e; }
          .bg-gray-100 { background: #f3f4f6; color: #374151; }
          .bg-red-100 { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 40px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <h1>Historique des changes</h1>
        <div class="meta">Généré le ${generatedAt}</div>
        ${filters.length ? `<div class="filters"><strong>Filtres appliqués :</strong><br/>${filters.join('<br/>')}</div>` : ''}
        <h2>Total des transactions : ${transactions.length}</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>N° Transaction</th>
              <th>Succursale</th>
              <th>Type</th>
              <th>Montant source</th>
              <th>Montant converti</th>
              <th>Taux</th>
              <th>Montant net</th>
              <th>Statut</th>
              <th>Client</th>
              <th>Date</th>
              <th>Traité par</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="12" style="text-align:center;">Aucune transaction</td></tr>'}
          </tbody>
        </table>
        <div class="footer">Rapport généré par Nala Crédit · ${generatedAt}</div>
      </body>
    </html>`;
  };

  const openReportWindow = (html: string, autoPrint = false) => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      toast.error('Impossible d\'ouvrir la fenêtre de rapport');
      return;
    }
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    if (autoPrint) {
      setTimeout(() => {
        reportWindow.print();
        reportWindow.close();
      }, 150);
    }
  };

  const handleExportTransactionsPdf = () => {
    if (transactions.length === 0) {
      toast.error('Aucune transaction à exporter');
      return;
    }
    openReportWindow(buildTransactionsHtml(), true);
  };

  const handleViewTransactionsHtml = () => {
    if (transactions.length === 0) {
      toast.error('Aucune transaction à afficher');
      return;
    }
    openReportWindow(buildTransactionsHtml());
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="w-8 h-8 mr-3 text-primary-600" />
            Gestion des Taux de Change
          </h2>
          <p className="text-gray-600 mt-1">
            Gérez les taux de change pour toutes les devises
          </p>
        </div>
        <div className="flex space-x-3">
          {activeTab === 'rates' && (
            <>
              <button
                onClick={loadCurrentRates}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Taux Actuels
              </button>
              <button
                onClick={handleCreateRate}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nouveau Taux
              </button>
            </>
          )}
          {activeTab === 'history' && (
            <>
              <button
                onClick={() => setShowTransactionForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                <DollarSign className="w-5 h-5 mr-2" />
                Nouvelle Transaction
              </button>
              <button
                onClick={handleViewTransactionsHtml}
                className="bg-gray-100 text-black px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center"
              >
                <Eye className="w-5 h-5 mr-2" />
                Voir HTML
              </button>
              <button
                onClick={handleExportTransactionsPdf}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
              >
                <FileDown className="w-5 h-5 mr-2" />
                Exporter PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('rates')}
            className={`${
              activeTab === 'rates'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <TrendingUp className="w-5 h-5 mr-2" />
            Taux de Change
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`${
              activeTab === 'history'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Calendar className="w-5 h-5 mr-2" />
            Historique des Changes
          </button>
        </nav>
      </div>

      {/* Search and Filters */}
      {activeTab === 'rates' && (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Base Currency Filter */}
          <select
            value={baseCurrencyFilter}
            onChange={(e) => setBaseCurrencyFilter(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Devise de base</option>
            <option value={CurrencyType.HTG}>HTG - Gourde</option>
            <option value={CurrencyType.USD}>USD - Dollar US</option>
            <option value={CurrencyType.EUR}>EUR - Euro</option>
            <option value={CurrencyType.CAD}>CAD - Dollar CA</option>
            <option value={CurrencyType.DOP}>DOP - Peso DO</option>
            <option value={CurrencyType.JMD}>JMD - Dollar JM</option>
          </select>

          {/* Target Currency Filter */}
          <select
            value={targetCurrencyFilter}
            onChange={(e) => setTargetCurrencyFilter(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Devise cible</option>
            <option value={CurrencyType.HTG}>HTG - Gourde</option>
            <option value={CurrencyType.USD}>USD - Dollar US</option>
            <option value={CurrencyType.EUR}>EUR - Euro</option>
            <option value={CurrencyType.CAD}>CAD - Dollar CA</option>
            <option value={CurrencyType.DOP}>DOP - Peso DO</option>
            <option value={CurrencyType.JMD}>JMD - Dollar JM</option>
          </select>

          {/* Active Filter */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Tous les statuts</option>
            <option value="true">Actifs</option>
            <option value="false">Inactifs</option>
          </select>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setBaseCurrencyFilter('');
              setTargetCurrencyFilter('');
              setActiveFilter('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center text-black"
          >
            <Filter className="w-4 h-4 mr-2" />
            Réinitialiser
          </button>

          {/* Refresh */}
          <button
            onClick={loadExchangeRates}
            className="px-4 py-2 bg-gray-100 text-black rounded-md hover:bg-gray-200 flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      )}

      {/* Transaction Filters */}
      {activeTab === 'history' && (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {/* From Currency Filter */}
          <select
            value={baseCurrencyFilter}
            onChange={(e) => setBaseCurrencyFilter(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Devise source</option>
            <option value={CurrencyType.HTG}>HTG - Gourde</option>
            <option value={CurrencyType.USD}>USD - Dollar US</option>
          </select>

          {/* To Currency Filter */}
          <select
            value={targetCurrencyFilter}
            onChange={(e) => setTargetCurrencyFilter(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Devise cible</option>
            <option value={CurrencyType.HTG}>HTG - Gourde</option>
            <option value={CurrencyType.USD}>USD - Dollar US</option>
          </select>

          {/* Exchange Type Filter */}
          <select
            value={exchangeTypeFilter}
            onChange={(e) => setExchangeTypeFilter(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Type de change</option>
            <option value={ExchangeType.Purchase}>Achat (client achète)</option>
            <option value={ExchangeType.Sale}>Vente (client vend)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Tous les statuts</option>
            <option value={ExchangeTransactionStatus.Pending}>En attente</option>
            <option value={ExchangeTransactionStatus.Completed}>Complété</option>
            <option value={ExchangeTransactionStatus.Cancelled}>Annulé</option>
            <option value={ExchangeTransactionStatus.Failed}>Échoué</option>
          </select>

          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Toutes les succursales</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>

          {/* Start Date Filter */}
          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Date début"
          />

          {/* End Date Filter */}
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Date fin"
          />

          {/* Clear Filters */}
          <button
            onClick={() => {
              setBaseCurrencyFilter('');
              setTargetCurrencyFilter('');
              setExchangeTypeFilter('');
              setStatusFilter('');
              setBranchFilter('');
              setStartDateFilter('');
              setEndDateFilter('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center text-black"
          >
            <Filter className="w-4 h-4 mr-2" />
            Réinitialiser
          </button>
        </div>
      </div>
      )}

      {/* Exchange Rates List */}
      {activeTab === 'rates' && (
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : rates.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            Aucun taux de change trouvé
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paire de devises
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taux d'achat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taux de vente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spread
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Période de validité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Méthode
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
                {getPaginatedData(rates, ratesCurrentPage).map((rate) => {
                  const spread = ((rate.sellingRate - rate.buyingRate) / rate.buyingRate * 100);
                  const expiringSoon = isExpiringSoon(rate.expiryDate);
                  const expired = isExpired(rate.expiryDate);
                  
                  return (
                    <tr key={rate.id} className={`hover:bg-gray-50 ${expired ? 'bg-red-50' : expiringSoon ? 'bg-yellow-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrencySymbol(rate.baseCurrency)} → {formatCurrencySymbol(rate.targetCurrency)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {(rate.baseCurrencyName || formatCurrencyType(rate.baseCurrency))} /
                              {' '}
                              {(rate.targetCurrencyName || formatCurrencyType(rate.targetCurrency))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          <TrendingDown className="w-4 h-4 mr-1 text-red-500" />
                          {formatRate(rate.buyingRate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                          {formatRate(rate.sellingRate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {spread.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          <div>
                            <div>{formatDate(rate.effectiveDate)}</div>
                            {rate.expiryDate && (
                              <div className={`text-xs ${expired ? 'text-red-600' : expiringSoon ? 'text-yellow-600' : 'text-gray-500'}`}>
                                → {formatDate(rate.expiryDate)}
                                {expired && ' (Expiré)'}
                                {expiringSoon && !expired && ' (Expire bientôt)'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {rate.updateMethodName || formatRateUpdateMethod(rate.updateMethod)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Par: {rate.createdByName || rate.createdBy || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rate.isActive && !expired)}`}>
                          {getStatusIcon(rate.isActive && !expired)}
                          <span className="ml-1">
                            {expired ? 'Expiré' : rate.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setSelectedRate(rate)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditRate(rate)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {rate.isActive && (
                            <button
                              onClick={() => handleDeactivateRate(rate)}
                              className="text-red-600 hover:text-red-900"
                              title="Désactiver"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRate(rate)}
                            className="text-red-600 hover:text-red-900"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Rates Pagination */}
        {!loading && rates.length > itemsPerPage && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Page {ratesCurrentPage} sur {getTotalPages(rates.length)} - {rates.length} taux au total
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRatesCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={ratesCurrentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setRatesCurrentPage(prev => Math.min(getTotalPages(rates.length), prev + 1))}
                disabled={ratesCurrentPage === getTotalPages(rates.length)}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Transaction History List */}
      {activeTab === 'history' && (
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            Aucune transaction trouvée
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant converti
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taux
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
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
                {getPaginatedData(transactions, transactionsCurrentPage).map((transaction) => {
                  const statusColor = getStatusBadgeClass(transaction.status as ExchangeTransactionStatus | string);
                  const statusLabel = getStatusLabel(transaction.statusName, transaction.status);
                  
                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.transactionNumber}
                        </div>
                        <div className="text-xs text-gray-500">
                          {transaction.branchName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {transaction.exchangeTypeName || formatExchangeType(transaction.exchangeType)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.fromAmount.toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {transaction.fromCurrencyName || formatCurrencyType(transaction.fromCurrency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.toAmount.toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {transaction.toCurrencyName || formatCurrencyType(transaction.toCurrency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatRate(transaction.exchangeRate)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {transaction.customerName || '—'}
                        </div>
                        {transaction.customerPhone && (
                          <div className="text-xs text-gray-500">
                            {transaction.customerPhone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(transaction.transactionDate)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {transaction.processedByName || transaction.processedBy}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedTransaction(transaction)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Transactions Pagination */}
        {!loading && transactions.length > itemsPerPage && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Page {transactionsCurrentPage} sur {getTotalPages(transactions.length)} - {transactions.length} transactions au total
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTransactionsCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={transactionsCurrentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setTransactionsCurrentPage(prev => Math.min(getTotalPages(transactions.length), prev + 1))}
                disabled={transactionsCurrentPage === getTotalPages(transactions.length)}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Rate Form Modal */}
      {showRateForm && (
        <ExchangeRateForm
          rate={editingRate}
          onSubmit={handleRateSubmit}
          onCancel={() => {
            setShowRateForm(false);
            setEditingRate(null);
          }}
        />
      )}

      {/* Rate Details Modal */}
      {selectedRate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Détails du taux de change
                </h3>
                <button
                  onClick={() => setSelectedRate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Devise de base</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedRate.baseCurrencyName || formatCurrencyType(selectedRate.baseCurrency)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Devise cible</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedRate.targetCurrencyName || formatCurrencyType(selectedRate.targetCurrency)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Taux d'achat</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {formatRate(selectedRate.buyingRate)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Taux de vente</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {formatRate(selectedRate.sellingRate)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Date d'effet</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {formatDateTime(selectedRate.effectiveDate)}
                  </p>
                </div>

                {selectedRate.expiryDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date d'expiration</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {formatDateTime(selectedRate.expiryDate)}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Méthode de mise à jour</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedRate.updateMethodName || formatRateUpdateMethod(selectedRate.updateMethod)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Créé par</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedRate.createdByName || selectedRate.createdBy || '—'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDateTime(selectedRate.createdAt)}
                  </p>
                </div>

                {selectedRate.notes && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedRate.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Détails de la transaction
                </h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">N° Transaction</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {selectedTransaction.transactionNumber}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Succursale</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedTransaction.branchName}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Type de change</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedTransaction.exchangeTypeName || formatExchangeType(selectedTransaction.exchangeType)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Statut</label>
                  <p className="text-sm text-gray-900 mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      getStatusBadgeClass(selectedTransaction.status as ExchangeTransactionStatus | string)
                    }`}>
                      {getStatusLabel(selectedTransaction.statusName, selectedTransaction.status)}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Montant source</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {selectedTransaction.fromAmount.toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedTransaction.fromCurrencyName || formatCurrencyType(selectedTransaction.fromCurrency)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Montant converti</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {selectedTransaction.toAmount.toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedTransaction.toCurrencyName || formatCurrencyType(selectedTransaction.toCurrency)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Taux de change</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {formatRate(selectedTransaction.exchangeRate)}
                  </p>
                </div>

                {/* Commission removed as requested */}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Montant net</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {selectedTransaction.netAmount.toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Client</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedTransaction.customerName || '—'}
                  </p>
                  {selectedTransaction.customerPhone && (
                    <p className="text-xs text-gray-500">{selectedTransaction.customerPhone}</p>
                  )}
                  {selectedTransaction.customerDocument && (
                    <p className="text-xs text-gray-500">{selectedTransaction.customerDocument}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Date de transaction</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {formatDateTime(selectedTransaction.transactionDate)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Traité par</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedTransaction.processedByName || selectedTransaction.processedBy}
                  </p>
                </div>

                {selectedTransaction.receiptNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">N° Reçu</label>
                    <p className="text-sm text-gray-900 mt-1 font-medium">
                      {selectedTransaction.receiptNumber}
                    </p>
                  </div>
                )}

                {selectedTransaction.notes && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedTransaction.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <ExchangeTransactionForm
          branchId={branchId}
          onSuccess={() => {
            setShowTransactionForm(false);
            loadTransactions();
          }}
          onCancel={() => setShowTransactionForm(false)}
        />
      )}
    </div>
  );
};

export default ExchangeRateManagement;