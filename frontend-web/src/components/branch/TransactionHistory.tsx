import React, { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import apiService from '../../services/apiService';
import toast from 'react-hot-toast';

interface Transaction {
  id: number;
  transactionNumber: string;
  type: string;
  currency: string;
  amount: number;
  createdAt: string;
  customer: string;
  cashier: string;
  description?: string;
  balanceAfter?: number;
}

interface TransactionHistoryProps {
  branchId: number;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ branchId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    transactionType: '',
    cashierId: '',
    searchTerm: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    totalPages: 1,
    totalTransactions: 0
  });
  const [summary, setSummary] = useState({
    totalHTG: 0,
    totalUSD: 0,
    depositsHTG: 0,
    depositsUSD: 0,
    withdrawalsHTG: 0,
    withdrawalsUSD: 0
  });

  useEffect(() => {
    loadTransactions();
  }, [branchId, pagination.page, filters.startDate, filters.endDate, filters.transactionType]);

  const loadTransactions = async () => {
    try {
      setLoading(true);

      const response = await apiService.getBranchTransactionHistory(branchId, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        transactionType: filters.transactionType || undefined,
        cashierId: filters.cashierId || undefined,
        page: pagination.page,
        pageSize: pagination.pageSize
      });

      setTransactions(response.transactions || []);
      setPagination(prev => ({
        ...prev,
        totalPages: response.totalPages || 1,
        totalTransactions: response.totalTransactions || 0
      }));

      // Calculate summary
      const txList = response.transactions || [];
      const deposits = txList.filter((t: Transaction) => 
        t.type === 'Deposit' || t.type.toLowerCase().includes('dépôt')
      );
      const withdrawals = txList.filter((t: Transaction) => 
        t.type === 'Withdrawal' || t.type.toLowerCase().includes('retrait')
      );

      setSummary({
        totalHTG: txList
          .filter((t: Transaction) => t.currency === 'HTG')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0),
        totalUSD: txList
          .filter((t: Transaction) => t.currency === 'USD')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0),
        depositsHTG: deposits
          .filter((t: Transaction) => t.currency === 'HTG')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0),
        depositsUSD: deposits
          .filter((t: Transaction) => t.currency === 'USD')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0),
        withdrawalsHTG: withdrawals
          .filter((t: Transaction) => t.currency === 'HTG')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0),
        withdrawalsUSD: withdrawals
          .filter((t: Transaction) => t.currency === 'USD')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0)
      });

    } catch (error: any) {
      console.error('Error loading transactions:', error);
      toast.error('Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-HT', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'Deposit': 'Dépôt',
      'Withdrawal': 'Retrait',
      'Transfer': 'Transfert',
      'CreditDisbursement': 'Décaissement Crédit',
      'CreditPayment': 'Paiement Crédit',
      'CurrencyExchange': 'Change',
      'Fee': 'Frais',
      'Commission': 'Commission'
    };
    return types[type] || type;
  };

  const getTransactionTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'Deposit': 'bg-green-100 text-green-700',
      'Withdrawal': 'bg-red-100 text-red-700',
      'Transfer': 'bg-blue-100 text-blue-700',
      'CreditDisbursement': 'bg-purple-100 text-purple-700',
      'CreditPayment': 'bg-indigo-100 text-indigo-700',
      'CurrencyExchange': 'bg-orange-100 text-orange-700',
      'Fee': 'bg-gray-100 text-gray-700',
      'Commission': 'bg-yellow-100 text-yellow-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Numéro', 'Type', 'Client', 'Caissier', 'Montant', 'Devise', 'Description'];
    const rows = transactions.map(t => [
      formatDateTime(t.createdAt),
      t.transactionNumber,
      getTransactionTypeLabel(t.type),
      t.customer,
      t.cashier,
      t.amount.toString(),
      t.currency,
      t.description || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${filters.startDate}_${filters.endDate}.csv`;
    link.click();
  };

  const filteredTransactions = transactions.filter(t => {
    const searchLower = filters.searchTerm.toLowerCase();
    return (
      t.transactionNumber.toLowerCase().includes(searchLower) ||
      t.customer.toLowerCase().includes(searchLower) ||
      t.cashier.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-50 text-red-600 rounded-full p-3">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Historique des Transactions</h2>
            <p className="text-sm text-gray-600">Recherchez et filtrez les transactions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Début
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Fin
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type Transaction
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={filters.transactionType}
                onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none"
              >
                <option value="">Tous les types</option>
                <option value="Deposit">Dépôt</option>
                <option value="Withdrawal">Retrait</option>
                <option value="Transfer">Transfert</option>
                <option value="CreditPayment">Paiement Crédit</option>
                <option value="CurrencyExchange">Change</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Numéro, client, caissier..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={loadTransactions}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            onClick={exportToCSV}
            disabled={filteredTransactions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-700">Dépôts</h3>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-800">
              {new Intl.NumberFormat('fr-HT').format(summary.depositsHTG)} HTG
            </p>
            <p className="text-lg font-semibold text-green-700">
              ${new Intl.NumberFormat('en-US').format(summary.depositsUSD)}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-red-700">Retraits</h3>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-red-800">
              {new Intl.NumberFormat('fr-HT').format(summary.withdrawalsHTG)} HTG
            </p>
            <p className="text-lg font-semibold text-red-700">
              ${new Intl.NumberFormat('en-US').format(summary.withdrawalsUSD)}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-700">Total Volume</h3>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-blue-800">
              {new Intl.NumberFormat('fr-HT').format(summary.totalHTG)} HTG
            </p>
            <p className="text-lg font-semibold text-blue-700">
              ${new Intl.NumberFormat('en-US').format(summary.totalUSD)}
            </p>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Heure</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caissier</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 text-gray-400 animate-spin mr-2" />
                      <span className="text-gray-500">Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Aucune transaction trouvée
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDateTime(transaction.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {transaction.transactionNumber}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTransactionTypeColor(transaction.type)}`}>
                        {getTransactionTypeLabel(transaction.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {transaction.customer}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {transaction.cashier}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Précédent
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Page <span className="font-medium">{pagination.page}</span> sur{' '}
                  <span className="font-medium">{pagination.totalPages}</span> - Total:{' '}
                  <span className="font-medium">{pagination.totalTransactions}</span> transactions
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
