import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRightLeft,
  Building2,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  ConsolidatedTransferReportDto,
  Currency,
  getCurrencyInfo
} from '../../types/interBranchTransfer';
import { Branch } from '../../types/branch';
import apiService from '../../services/apiService';

interface ConsolidatedTransferReportProps {}

const ConsolidatedTransferReport: React.FC<ConsolidatedTransferReportProps> = () => {
  const [report, setReport] = useState<ConsolidatedTransferReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | 'all'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadBranches();
    loadReport();
  }, []);

  useEffect(() => {
    loadReport();
  }, [selectedBranch, startDate, endDate]);

  const loadBranches = async () => {
    try {
      const branchData = await apiService.getAllBranches();
      setBranches(branchData);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const reportData = await apiService.getConsolidatedTransferReport(
        selectedBranch === 'all' ? undefined : selectedBranch,
        startDate || undefined,
        endDate || undefined
      );
      setReport(reportData);
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Erreur lors du chargement du rapport');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: Currency = Currency.HTG) => {
    const currencyInfo = getCurrencyInfo(currency);
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyInfo.code === 'HTG' ? 'USD' : currencyInfo.code,
      minimumFractionDigits: 0
    }).format(amount).replace('$', currencyInfo.symbol);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getBranchSummary = (branchId: number) => {
    return report?.branchSummaries.find(bs => bs.branchId === branchId);
  };

  const getTopSendingBranches = () => {
    return report?.branchSummaries
      .sort((a, b) => b.totalSent - a.totalSent)
      .slice(0, 5) || [];
  };

  const getTopReceivingBranches = () => {
    return report?.branchSummaries
      .sort((a, b) => b.totalReceived - a.totalReceived)
      .slice(0, 5) || [];
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rapport Consolidé des Transferts</h2>
          <p className="text-gray-600 mt-1">
            Analyse des performances et statistiques des transferts inter-succursales
          </p>
        </div>
        <button
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Download className="h-5 w-5" />
          <span>Exporter</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Succursale
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">Toutes les succursales</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} - {branch.commune}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de début
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de fin
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transferts</p>
              <p className="text-2xl font-bold text-gray-900">{report?.totalSystemTransfers || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ArrowRightLeft className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transferts Actifs</p>
              <p className="text-2xl font-bold text-purple-600">{report?.totalActiveTransfers || 0}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Volume Total HTG</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  report?.branchSummaries.reduce((sum, bs) => sum + bs.totalSent, 0) || 0,
                  Currency.HTG
                )}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Volume Total USD</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(
                  report?.branchSummaries.reduce((sum, bs) => sum + bs.totalReceived, 0) || 0,
                  Currency.USD
                )}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingDown className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Branch Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Performance par Succursale</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Succursale
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Envoyé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Reçu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transferts Actifs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dernier Transfert
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {report?.branchSummaries.map((summary) => (
                <tr key={summary.branchId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {summary.branchName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(summary.totalSent)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(summary.totalReceived)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {summary.pendingTransfers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(summary.lastTransferDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Branches Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sending Branches */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Succursales Émettrices</h3>
          <div className="space-y-4">
            {getTopSendingBranches().map((branch, index) => (
              <div key={branch.branchId} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{branch.branchName}</p>
                    <p className="text-sm text-gray-500">{branch.pendingTransfers} actifs</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(branch.totalSent)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Receiving Branches */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Succursales Réceptrices</h3>
          <div className="space-y-4">
            {getTopReceivingBranches().map((branch, index) => (
              <div key={branch.branchId} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-green-600">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{branch.branchName}</p>
                    <p className="text-sm text-gray-500">{branch.completedTransfers} terminés</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(branch.totalReceived)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Footer */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600 text-center">
          Rapport généré le {report ? formatDate(report.reportGeneratedAt) : 'N/A'}
        </p>
      </div>
    </div>
  );
};

export default ConsolidatedTransferReport;