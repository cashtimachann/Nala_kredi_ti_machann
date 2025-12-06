// Transaction Audit Component - Advanced search and filtering for SuperAdmin

import React, { useState } from 'react';
import { branchReportService } from '../../services/branchReportService';
import {
  SuperAdminTransactionAuditDto,
  TransactionAuditDetailDto,
  TransactionSearchRequestDto
} from '../../types/branchReports';

export const TransactionAudit: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [auditData, setAuditData] = useState<SuperAdminTransactionAuditDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<TransactionSearchRequestDto>({
    startDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], // Last 7 days
    endDate: new Date().toISOString().split('T')[0],
  });

  const [branchId, setBranchId] = useState<string>('');
  const [transactionType, setTransactionType] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  // Search transactions
  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const searchRequest: TransactionSearchRequestDto = {
        startDate: filters.startDate,
        endDate: filters.endDate,
      };

      if (branchId) searchRequest.branchId = Number(branchId);
      if (transactionType) searchRequest.transactionType = transactionType;
      if (userId) searchRequest.userId = userId;
      if (minAmount) searchRequest.minAmount = Number(minAmount);
      if (maxAmount) searchRequest.maxAmount = Number(maxAmount);

      const result = await branchReportService.searchTransactions(searchRequest);
      setAuditData(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la recherche des transactions');
      console.error('Error searching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Export to CSV
  const handleExport = () => {
    if (!auditData || auditData.transactions.length === 0) return;

    const csvContent = [
      // Headers
      ['Numéro', 'Type', 'Succursale', 'Utilisateur', 'Rôle', 'Client', 'Montant', 'Devise', 'Statut', 'Date', 'Description'].join(','),
      // Data rows
      ...auditData.transactions.map(t => [
        t.transactionNumber,
        t.transactionType,
        t.branchName,
        t.userName,
        t.userRole,
        t.customerName || '',
        t.amount,
        t.currency,
        t.status,
        new Date(t.transactionDate).toLocaleString('fr-HT'),
        t.description || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    branchReportService.downloadFile(blob, `audit-tranzaksyon-${filters.startDate}-${filters.endDate}.csv`);
  };

  // Reset filters
  const handleReset = () => {
    setFilters({
      startDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    });
    setBranchId('');
    setTransactionType('');
    setUserId('');
    setMinAmount('');
    setMaxAmount('');
    setAuditData(null);
    setError(null);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black mb-2">
            🔍 Audit des Transactions
          </h1>
          <p className="text-black">
            Rechercher et filtrer toutes les transactions du système
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-black mb-4">Filtres</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Date de Début
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Date de Fin
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Branch ID */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                ID Succursale (optionnel)
              </label>
              <input
                type="number"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                placeholder="Entrer ID succursale"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Transaction Type */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Type de Transaction (optionnel)
              </label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les types</option>
                <option value="Deposit">Dépôt</option>
                <option value="Withdrawal">Retrait</option>
                <option value="CreditDisbursement">Crédit décaissé</option>
                <option value="CreditPayment">Paiement crédit</option>
                <option value="Transfer">Transfert</option>
              </select>
            </div>

            {/* User ID */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                ID Utilisateur (optionnel)
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Entrer ID utilisateur"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Amount Range */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Montant Minimum (optionnel)
              </label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant Maximum (optionnel)
              </label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="Aucune limite"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? '🔄 Recherche...' : '🔍 Rechercher'}
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              🔄 Réinitialiser
            </button>
            {auditData && auditData.transactions.length > 0 && (
              <button
                onClick={handleExport}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                📥 Exporter CSV
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-black">Recherche des transactions...</p>
          </div>
        )}

        {/* Results */}
        {!loading && auditData && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="text-sm text-black mb-1">Total Transactions</div>
                <div className="text-3xl font-bold text-blue-600">
                  {auditData.totalTransactions.toLocaleString()}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="text-sm text-black mb-1">Total HTG</div>
                <div className="text-2xl font-bold text-green-600">
                  {branchReportService.formatCurrency(auditData.totalAmountHTG, 'HTG')}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="text-sm text-black mb-1">Total USD</div>
                <div className="text-2xl font-bold text-green-600">
                  {branchReportService.formatCurrency(auditData.totalAmountUSD, 'USD')}
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-black">
                  Transactions ({auditData.transactions.length})
                </h3>
                {auditData.totalTransactions > 1000 && (
                  <p className="text-sm text-yellow-600 mt-1">
                    ⚠️ Seulement les 1000 premières transactions sont affichées. Utilisez les filtres pour plus de précision.
                  </p>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                        Numéro
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text.black uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                        Succursale
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                        Utilisateur
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Client
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-black uppercase">
                        Montant
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-black uppercase">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditData.transactions.map((transaction) => (
                      <TransactionRow key={transaction.transactionId} transaction={transaction} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* No Results */}
        {!loading && auditData && auditData.transactions.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Aucun résultat
            </h3>
            <p className="text-gray-600">
              Aucune transaction ne correspond à vos filtres. Essayez de modifier les paramètres.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Transaction Row Component
const TransactionRow: React.FC<{ transaction: TransactionAuditDetailDto }> = ({ transaction }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm font-medium text-blue-600">{transaction.transactionNumber}</div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="text-sm text-gray-900">{transaction.transactionType}</span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm text-gray-900">{transaction.branchName}</div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm text-gray-900">{transaction.userName}</div>
          <div className="text-xs text-gray-500">{transaction.userRole}</div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm text-gray-900">{transaction.customerName || '-'}</div>
          {transaction.accountNumber && (
            <div className="text-xs text-gray-500">{transaction.accountNumber}</div>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <div className="text-sm font-medium text-gray-900">
            {branchReportService.formatCurrency(transaction.amount, transaction.currency as 'HTG' | 'USD')}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-center">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            transaction.status === 'Completed' ? 'bg-green-100 text-green-800' :
            transaction.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {transaction.status}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm text-gray-900">
            {new Date(transaction.transactionDate).toLocaleDateString('fr-HT')}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(transaction.transactionDate).toLocaleTimeString('fr-HT')}
          </div>
        </td>
      </tr>
      
      {/* Expanded Details */}
      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">ID Transaction:</span>
                <span className="ml-2 text-gray-900">{transaction.transactionId}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">ID Utilisateur:</span>
                <span className="ml-2 text-gray-900">{transaction.userId}</span>
              </div>
              {transaction.description && (
                <div className="col-span-2">
                  <span className="font-medium text-gray-700">Description:</span>
                  <span className="ml-2 text-gray-900">{transaction.description}</span>
                </div>
              )}
              {transaction.reference && (
                <div>
                  <span className="font-medium text-gray-700">Référence:</span>
                  <span className="ml-2 text-gray-900">{transaction.reference}</span>
                </div>
              )}
              {transaction.cashSessionId && (
                <div>
                  <span className="font-medium text-gray-700">Session Caisse:</span>
                  <span className="ml-2 text-gray-900">#{transaction.cashSessionId}</span>
                </div>
              )}
              {transaction.cashierName && (
                <div>
                  <span className="font-medium text-gray-700">Caissier:</span>
                  <span className="ml-2 text-gray-900">{transaction.cashierName}</span>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default TransactionAudit;
