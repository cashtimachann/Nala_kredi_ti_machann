import React, { useState, useEffect } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  Filter,
  Calendar,
  Download,
  RefreshCw,
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/apiService';
import { useSearchParams } from 'react-router-dom';

// Types
interface Transaction {
  id: string;
  accountNumber: string;
  customerName: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'FEE' | 'INTEREST';
  amount: number;
  currency: 'HTG' | 'USD';
  balance: number;
  description: string;
  referenceNumber: string;
  processedBy: string;
  processedAt: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

interface TransactionStats {
  totalDeposits: number;
  totalWithdrawals: number;
  totalTransfers: number;
  totalFees: number;
  netFlow: number;
  transactionCount: number;
}

const CurrentAccountTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats>({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalTransfers: 0,
    totalFees: 0,
    netFlow: 0,
    transactionCount: 0
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [params] = useSearchParams();

  const loadTransactions = async (accountNumber: string) => {
    try {
      if (!accountNumber || accountNumber.trim().length < 3) {
        toast.error('Entrez un numéro de compte valide');
        return;
      }
      const tx = await apiService.getAccountTransactions(accountNumber.trim());
      const mapped: Transaction[] = (tx || []).map((t: any) => ({
        id: t.id,
        accountNumber: t.accountNumber,
        customerName: '',
        type: (t.type as any),
        amount: t.amount,
        currency: t.currency,
        balance: t.balanceAfter,
        description: t.description,
        referenceNumber: t.reference || '',
        processedBy: t.processedByName || t.processedBy || '',
        processedAt: t.processedAt,
        status: 'COMPLETED'
      }));
      setTransactions(mapped);
      setFilteredTransactions(mapped);
      calculateStats(mapped);
      toast.success(`${mapped.length} transaction(s) chargée(s)`);
    } catch (error) {
      console.error('Erreur lors du chargement des transactions:', error);
      toast.error('Impossible de charger les transactions');
    }
  };

  // Deep-link support: auto-load by ?account=ACC-NUMBER
  useEffect(() => {
    const acc = params.get('account');
    if (acc && acc.trim().length >= 3) {
      setSearchTerm(acc);
      void loadTransactions(acc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate statistics
  const calculateStats = (txns: Transaction[]) => {
    const stats: TransactionStats = {
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalTransfers: 0,
      totalFees: 0,
      netFlow: 0,
      transactionCount: txns.length
    };

    txns.forEach(txn => {
      if (txn.status === 'COMPLETED') {
        switch (txn.type) {
          case 'DEPOSIT':
            stats.totalDeposits += txn.amount;
            break;
          case 'WITHDRAWAL':
            stats.totalWithdrawals += txn.amount;
            break;
          case 'TRANSFER_IN':
          case 'TRANSFER_OUT':
            stats.totalTransfers += txn.amount;
            break;
          case 'FEE':
            stats.totalFees += txn.amount;
            break;
        }
      }
    });

    stats.netFlow = stats.totalDeposits - stats.totalWithdrawals - stats.totalFees;
    setStats(stats);
  };

  // Apply filters
  useEffect(() => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(txn =>
        (txn.accountNumber && txn.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (txn.customerName && txn.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (txn.referenceNumber && txn.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(txn => txn.type === typeFilter);
    }

    // Currency filter
    if (currencyFilter !== 'ALL') {
      filtered = filtered.filter(txn => txn.currency === currencyFilter);
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(txn => new Date(txn.processedAt) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(txn => new Date(txn.processedAt) <= new Date(dateTo));
    }

    setFilteredTransactions(filtered);
    calculateStats(filtered);
  }, [searchTerm, typeFilter, currencyFilter, dateFrom, dateTo, transactions]);

  // Export transactions
  const handleExport = () => {
    toast.success('Export en cours...');
    // TODO: Implement actual export
  };

  // Get transaction icon
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
      case 'TRANSFER_IN':
        return <ArrowDownCircle className="w-5 h-5 text-green-600" />;
      case 'WITHDRAWAL':
      case 'TRANSFER_OUT':
        return <ArrowUpCircle className="w-5 h-5 text-red-600" />;
      case 'FEE':
        return <DollarSign className="w-5 h-5 text-orange-600" />;
      case 'INTEREST':
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  // Get transaction label
  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      DEPOSIT: 'Dépôt',
      WITHDRAWAL: 'Retrait',
      TRANSFER_IN: 'Transfert reçu',
      TRANSFER_OUT: 'Transfert envoyé',
      FEE: 'Frais',
      INTEREST: 'Intérêt'
    };
    return labels[type] || type;
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-HT', {
      style: 'currency',
      currency: currency === 'HTG' ? 'HTG' : 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-HT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Transactions - Comptes Courants</h1>
          <p className="text-sm text-black mt-1">
            Historique des transactions des comptes courants
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Dépôts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalDeposits, 'HTG')}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <ArrowDownCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Retraits</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalWithdrawals, 'HTG')}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <ArrowUpCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Frais Collectés</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalFees, 'HTG')}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Flux Net</p>
              <p className={`text-2xl font-bold mt-1 ${stats.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.netFlow, 'HTG')}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stats.netFlow >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {stats.netFlow >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-600" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-600" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Filtres</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-black hover:text-black"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Masquer' : 'Afficher'} les filtres
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Entrer un numéro de compte (ex: CUR-2024-001)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') loadTransactions(searchTerm); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => loadTransactions(searchTerm)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Charger
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de Transaction
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="ALL">Tous</option>
                <option value="DEPOSIT">Dépôts</option>
                <option value="WITHDRAWAL">Retraits</option>
                <option value="TRANSFER_IN">Transferts reçus</option>
                <option value="TRANSFER_OUT">Transferts envoyés</option>
                <option value="FEE">Frais</option>
                <option value="INTEREST">Intérêts</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Devise
              </label>
              <select
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="ALL">Toutes</option>
                <option value="HTG">HTG</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date début
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date fin
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Heure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compte / Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Solde
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Aucune transaction trouvée</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{formatDate(txn.processedAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(txn.type)}
                        <span className="text-sm text-gray-900">{getTransactionLabel(txn.type)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{txn.accountNumber}</div>
                        <div className="text-gray-500">{txn.customerName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{txn.description}</div>
                      <div className="text-xs text-gray-500">Par: {txn.processedBy}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-medium ${
                        txn.type === 'DEPOSIT' || txn.type === 'TRANSFER_IN' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {txn.type === 'DEPOSIT' || txn.type === 'TRANSFER_IN' ? '+' : '-'}
                        {formatCurrency(txn.amount, txn.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(txn.balance, txn.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono text-gray-600">{txn.referenceNumber}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        txn.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        txn.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {txn.status === 'COMPLETED' ? 'Complété' : txn.status === 'PENDING' ? 'En attente' : 'Échoué'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredTransactions.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Affichage de <span className="font-medium">{filteredTransactions.length}</span> transaction(s)
              </div>
              <div className="text-sm text-gray-500">
                Total: {stats.transactionCount} transaction(s)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentAccountTransactions;
