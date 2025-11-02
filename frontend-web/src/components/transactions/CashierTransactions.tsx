import React, { useState, useEffect } from 'react';
import { 
  Search, 
  DollarSign, 
  TrendingDown, 
  RefreshCw, 
  Filter,
  Calendar,
  Printer,
  Download,
  Eye,
  Plus,
  ArrowLeftRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'EXCHANGE';
  accountNumber: string;
  customerName: string;
  amount: number;
  currency: 'HTG' | 'USD';
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  referenceNumber: string;
  createdAt: string;
  processedBy: string;
  description?: string;
}

interface TransactionFilters {
  search: string;
  type: string;
  currency: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

const CashierTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState<'deposit' | 'withdrawal' | 'exchange' | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    type: '',
    currency: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });

  // Quick Transaction Form
  const [quickForm, setQuickForm] = useState({
    accountNumber: '',
    amount: '',
    currency: 'HTG',
    description: ''
  });

  // Load transactions
  const loadTransactions = async () => {
    setLoading(true);
    try {
      // Simulated data - replace with API call
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          type: 'DEPOSIT',
          accountNumber: 'G00100000001',
          customerName: 'Marie Dupont',
          amount: 5000,
          currency: 'HTG',
          status: 'COMPLETED',
          referenceNumber: 'DEP-2025-001',
          createdAt: new Date().toISOString(),
          processedBy: 'Caissier 1'
        },
        {
          id: '2',
          type: 'WITHDRAWAL',
          accountNumber: 'G00100000002',
          customerName: 'Jean Baptiste',
          amount: 3000,
          currency: 'HTG',
          status: 'COMPLETED',
          referenceNumber: 'WDR-2025-001',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          processedBy: 'Caissier 1'
        }
      ];
      setTransactions(mockTransactions);
      setFilteredTransactions(mockTransactions);
    } catch (error) {
      toast.error('Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...transactions];

    if (filters.search) {
      filtered = filtered.filter(t =>
        t.accountNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.customerName.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.referenceNumber.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.type) {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    if (filters.currency) {
      filtered = filtered.filter(t => t.currency === filters.currency);
    }

    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    setFilteredTransactions(filtered);
  }, [filters, transactions]);

  // Handle quick transaction
  const handleQuickTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quickForm.accountNumber || !quickForm.amount) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    try {
      // API call here
      toast.success(`${showQuickAction === 'deposit' ? 'Dépôt' : 'Retrait'} effectué avec succès`);
      setShowQuickAction(null);
      setQuickForm({ accountNumber: '', amount: '', currency: 'HTG', description: '' });
      loadTransactions();
    } catch (error) {
      toast.error('Erreur lors du traitement de la transaction');
    }
  };

  // Get transaction type badge
  const getTypeBadge = (type: string) => {
    const badges = {
      DEPOSIT: 'bg-green-100 text-green-800',
      WITHDRAWAL: 'bg-red-100 text-red-800',
      EXCHANGE: 'bg-blue-100 text-blue-800'
    };
    return badges[type as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const badges = {
      COMPLETED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Transactions</h1>
            <p className="text-gray-600 mt-1">Gérez les dépôts, retraits et opérations de caisse</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowQuickAction('deposit')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Dépôt</span>
            </button>
            <button
              onClick={() => setShowQuickAction('withdrawal')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
            >
              <TrendingDown className="w-4 h-4" />
              <span>Nouveau Retrait</span>
            </button>
            <button
              onClick={() => setShowQuickAction('exchange')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Change</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Compte, client, référence..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous</option>
              <option value="DEPOSIT">Dépôt</option>
              <option value="WITHDRAWAL">Retrait</option>
              <option value="EXCHANGE">Change</option>
            </select>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Devise
            </label>
            <select
              value={filters.currency}
              onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Toutes</option>
              <option value="HTG">HTG</option>
              <option value="USD">USD</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous</option>
              <option value="COMPLETED">Complété</option>
              <option value="PENDING">En attente</option>
              <option value="CANCELLED">Annulé</option>
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de début
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de fin
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Quick Date Filters */}
        <div className="flex space-x-2 mt-4">
          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setFilters({ ...filters, dateFrom: today, dateTo: today });
            }}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
              setFilters({ 
                ...filters, 
                dateFrom: weekAgo.toISOString().split('T')[0], 
                dateTo: today.toISOString().split('T')[0] 
              });
            }}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Cette semaine
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);
              setFilters({ 
                ...filters, 
                dateFrom: monthAgo.toISOString().split('T')[0], 
                dateTo: today.toISOString().split('T')[0] 
              });
            }}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Ce mois
          </button>
          <button
            onClick={() => setFilters({ search: '', type: '', currency: '', status: '', dateFrom: '', dateTo: '' })}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Transactions ({filteredTransactions.length})
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={loadTransactions}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Actualiser</span>
              </button>
              <button className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Exporter</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center p-12">
            <p className="text-gray-500">Aucune transaction trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date/Heure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Compte
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Référence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadge(transaction.type)}`}>
                        {transaction.type === 'DEPOSIT' ? 'Dépôt' : transaction.type === 'WITHDRAWAL' ? 'Retrait' : 'Change'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.accountNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={transaction.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.type === 'DEPOSIT' ? '+' : '-'}{transaction.amount.toLocaleString()} {transaction.currency}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(transaction.status)}`}>
                        {transaction.status === 'COMPLETED' ? 'Complété' : transaction.status === 'PENDING' ? 'En attente' : 'Annulé'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.referenceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          title="Voir détails"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          title="Imprimer reçu"
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Transaction Modal */}
      {showQuickAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {showQuickAction === 'deposit' ? '💰 Nouveau Dépôt' : 
                 showQuickAction === 'withdrawal' ? '💸 Nouveau Retrait' : 
                 '🔄 Opération de Change'}
              </h3>
              
              <form onSubmit={handleQuickTransaction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de compte *
                  </label>
                  <input
                    type="text"
                    value={quickForm.accountNumber}
                    onChange={(e) => setQuickForm({ ...quickForm, accountNumber: e.target.value })}
                    placeholder="G00100000001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant *
                  </label>
                  <input
                    type="number"
                    value={quickForm.amount}
                    onChange={(e) => setQuickForm({ ...quickForm, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Devise *
                  </label>
                  <select
                    value={quickForm.currency}
                    onChange={(e) => setQuickForm({ ...quickForm, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="HTG">HTG - Gourdes</option>
                    <option value="USD">USD - Dollars</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optionnel)
                  </label>
                  <textarea
                    value={quickForm.description}
                    onChange={(e) => setQuickForm({ ...quickForm, description: e.target.value })}
                    placeholder="Notes additionnelles..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickAction(null);
                      setQuickForm({ accountNumber: '', amount: '', currency: 'HTG', description: '' });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 text-white rounded-lg ${
                      showQuickAction === 'deposit' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    Confirmer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierTransactions;
