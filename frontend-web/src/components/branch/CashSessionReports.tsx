import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, TrendingUp, Download, RefreshCw, Clock } from 'lucide-react';
import apiService from '../../services/apiService';
import toast from 'react-hot-toast';

interface CashSessionReportsProps {
  branchId: number;
}

interface CashSessionReport {
  id: number;
  cashierId: string;
  cashierName: string;
  sessionStart: string;
  sessionEnd: string;
  durationMinutes: number;
  openingBalanceHTG: number;
  openingBalanceUSD: number;
  closingBalanceHTG: number;
  closingBalanceUSD: number;
  totalDepositHTG: number;
  totalDepositUSD: number;
  totalWithdrawalHTG: number;
  totalWithdrawalUSD: number;
  transactionCount: number;
  varianceHTG: number;
  varianceUSD: number;
  closedByUserId: string;
  closedByUserName: string;
  notes: string;
}

const CashSessionReports: React.FC<CashSessionReportsProps> = ({ branchId }) => {
  const [reports, setReports] = useState<CashSessionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default: last 7 days
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Summary stats
  const [summary, setSummary] = useState({
    totalSessions: 0,
    totalTransactions: 0,
    totalDepositHTG: 0,
    totalDepositUSD: 0,
    totalWithdrawalHTG: 0,
    totalWithdrawalUSD: 0,
    totalVarianceHTG: 0,
    totalVarianceUSD: 0,
    uniqueCashiers: 0
  });

  useEffect(() => {
    if (startDate && endDate) {
      loadReports();
    }
  }, [startDate, endDate, branchId]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCashSessionReports(branchId, startDate, endDate);
      setReports(data);
      calculateSummary(data);
    } catch (error: any) {
      console.error('Error loading reports:', error);
      toast.error('Erreur lors du chargement des rapports');
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data: CashSessionReport[]) => {
    const uniqueCashiers = new Set(data.map(r => r.cashierId));
    
    setSummary({
      totalSessions: data.length,
      totalTransactions: data.reduce((sum, r) => sum + r.transactionCount, 0),
      totalDepositHTG: data.reduce((sum, r) => sum + r.totalDepositHTG, 0),
      totalDepositUSD: data.reduce((sum, r) => sum + r.totalDepositUSD, 0),
      totalWithdrawalHTG: data.reduce((sum, r) => sum + r.totalWithdrawalHTG, 0),
      totalWithdrawalUSD: data.reduce((sum, r) => sum + r.totalWithdrawalUSD, 0),
      totalVarianceHTG: data.reduce((sum, r) => sum + r.varianceHTG, 0),
      totalVarianceUSD: data.reduce((sum, r) => sum + r.varianceUSD, 0),
      uniqueCashiers: uniqueCashiers.size
    });
  };

  const exportToCSV = () => {
    const headers = [
      'Date Début',
      'Date Fin',
      'Caissier',
      'Durée (min)',
      'Ouverture HTG',
      'Ouverture USD',
      'Dépôts HTG',
      'Dépôts USD',
      'Retraits HTG',
      'Retraits USD',
      'Fermeture HTG',
      'Fermeture USD',
      'Écart HTG',
      'Écart USD',
      'Transactions',
      'Fermé par',
      'Notes'
    ];

    const rows = reports.map(r => [
      new Date(r.sessionStart).toLocaleString('fr-FR'),
      new Date(r.sessionEnd).toLocaleString('fr-FR'),
      r.cashierName,
      r.durationMinutes,
      r.openingBalanceHTG,
      r.openingBalanceUSD,
      r.totalDepositHTG,
      r.totalDepositUSD,
      r.totalWithdrawalHTG,
      r.totalWithdrawalUSD,
      r.closingBalanceHTG,
      r.closingBalanceUSD,
      r.varianceHTG,
      r.varianceUSD,
      r.transactionCount,
      r.closedByUserName,
      r.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport_caisses_${startDate}_${endDate}.csv`;
    link.click();
    
    toast.success('Rapport exporté avec succès!');
  };

  const formatCurrency = (amount: number, currency: 'HTG' | 'USD') => {
    return currency === 'HTG'
      ? `${new Intl.NumberFormat('fr-HT').format(amount)} HTG`
      : `$${new Intl.NumberFormat('en-US').format(amount)}`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Rapports Sessions de Caisse</h2>
            <p className="text-sm text-gray-600 mt-1">Analyse des sessions fermées par période</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadReports}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>
            <button
              onClick={exportToCSV}
              disabled={reports.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Exporter CSV
            </button>
          </div>
        </div>

        {/* Date Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Début
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Fin
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 text-blue-600 rounded-full p-3">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-4">
            <div className="bg-green-50 text-green-600 rounded-full p-3">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Caissiers</p>
              <p className="text-2xl font-bold text-gray-900">{summary.uniqueCashiers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-4">
            <div className="bg-purple-50 text-purple-600 rounded-full p-3">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-50 text-yellow-600 rounded-full p-3">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Écart Total</p>
              <p className={`text-xl font-bold ${summary.totalVarianceHTG >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.totalVarianceHTG, 'HTG')}
              </p>
              <p className={`text-sm font-semibold ${summary.totalVarianceUSD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.totalVarianceUSD, 'USD')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Résumé Financier</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* HTG Summary */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">HTG</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Dépôts totaux:</span>
                <span className="font-semibold text-green-600">
                  +{formatCurrency(summary.totalDepositHTG, 'HTG')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Retraits totaux:</span>
                <span className="font-semibold text-red-600">
                  -{formatCurrency(summary.totalWithdrawalHTG, 'HTG')}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-medium">Net:</span>
                <span className={`font-bold ${(summary.totalDepositHTG - summary.totalWithdrawalHTG) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.totalDepositHTG - summary.totalWithdrawalHTG, 'HTG')}
                </span>
              </div>
            </div>
          </div>

          {/* USD Summary */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">USD</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Dépôts totaux:</span>
                <span className="font-semibold text-green-600">
                  +{formatCurrency(summary.totalDepositUSD, 'USD')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Retraits totaux:</span>
                <span className="font-semibold text-red-600">
                  -{formatCurrency(summary.totalWithdrawalUSD, 'USD')}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-medium">Net:</span>
                <span className={`font-bold ${(summary.totalDepositUSD - summary.totalWithdrawalUSD) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.totalDepositUSD - summary.totalWithdrawalUSD, 'USD')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Sessions Fermées ({reports.length})</h3>
        </div>
        
        {reports.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune session fermée pour cette période</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Caissier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Période
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durée
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ouverture
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fermeture
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transactions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Écart
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fermé par
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{report.cashierName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>
                        <p>{new Date(report.sessionStart).toLocaleDateString('fr-FR')}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(report.sessionStart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {' → '}
                          {new Date(report.sessionEnd).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        {formatDuration(report.durationMinutes)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(report.openingBalanceHTG, 'HTG')}
                        </p>
                        <p className="text-gray-600">
                          {formatCurrency(report.openingBalanceUSD, 'USD')}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(report.closingBalanceHTG, 'HTG')}
                        </p>
                        <p className="text-gray-600">
                          {formatCurrency(report.closingBalanceUSD, 'USD')}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="px-3 py-1 text-sm font-semibold rounded-full bg-purple-100 text-purple-800">
                        {report.transactionCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div>
                        <p className={`font-bold ${report.varianceHTG >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {report.varianceHTG >= 0 ? '+' : ''}{formatCurrency(report.varianceHTG, 'HTG')}
                        </p>
                        <p className={`font-semibold ${report.varianceUSD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {report.varianceUSD >= 0 ? '+' : ''}{formatCurrency(report.varianceUSD, 'USD')}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {report.closedByUserName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashSessionReports;
