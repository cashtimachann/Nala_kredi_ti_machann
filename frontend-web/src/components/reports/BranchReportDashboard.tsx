// Branch Report Dashboard - For Branch Managers and Supervisors

import React, { useState, useEffect } from 'react';
import { branchReportService } from '../../services/branchReportService';
import apiService from '../../services/apiService';
import {
  DailyBranchReportDto,
  MonthlyBranchReportDto,
  BranchOverviewDto,
} from '../../types/branchReports';

interface BranchReportDashboardProps {
  userRole: string;
  branchId?: number; // For SuperAdmin viewing specific branch
}

export const BranchReportDashboard: React.FC<BranchReportDashboardProps> = ({
  userRole,
  branchId: initialBranchId
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Branch selection for SuperAdmin/Director
  const [branches, setBranches] = useState<Array<{id: number, name: string}>>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(initialBranchId);
  const isSuperAdminOrDirector = ['SuperAdmin', 'Director'].includes(userRole);

  // Financial summary (deposits/withdrawals + transfers)
  const [financialSummary, setFinancialSummary] = useState<any | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Daily report state
  const [dailyReport, setDailyReport] = useState<DailyBranchReportDto | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Monthly report state
  const [monthlyReport, setMonthlyReport] = useState<MonthlyBranchReportDto | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Load daily report
  const loadDailyReport = async () => {
    if (!selectedBranchId && isSuperAdminOrDirector) {
      setError('Veuillez sélectionner une succursale');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      let report: DailyBranchReportDto;
      if (selectedBranchId && isSuperAdminOrDirector) {
        // SuperAdmin/Director viewing specific branch
        report = await branchReportService.getDailyReportByBranch(selectedBranchId, selectedDate);
      } else {
        // Manager viewing their own branch
        report = await branchReportService.getMyBranchDailyReport(selectedDate);
      }
      setDailyReport(report);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement du rapport journalier');
      console.error('Error loading daily report:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load monthly report
  const loadMonthlyReport = async () => {
    if (!selectedBranchId && isSuperAdminOrDirector) {
      setError('Veuillez sélectionner une succursale');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      let report: MonthlyBranchReportDto;
      if (selectedBranchId && isSuperAdminOrDirector) {
        report = await branchReportService.getMonthlyReportByBranch(
          selectedBranchId,
          selectedMonth,
          selectedYear
        );
      } else {
        report = await branchReportService.getMyBranchMonthlyReport(
          selectedMonth,
          selectedYear
        );
      }
      setMonthlyReport(report);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement du rapport mensuel');
      console.error('Error loading monthly report:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Load branches for SuperAdmin/Director
  const loadBranches = async () => {
    if (!isSuperAdminOrDirector) return;
    
    try {
      const overview = await branchReportService.getAllBranchesOverview(
        new Date().toISOString().split('T')[0]
      );
      setBranches(overview.branches.map(b => ({ id: b.branchId, name: b.branchName })));
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };
  
  // Initial load
  useEffect(() => {
    loadBranches();
  }, []);

  // Load data when tab or filters change
  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyReport();
    } else {
      loadMonthlyReport();
    }
    // Also load financial summary when branch selection changes
    if (selectedBranchId || !isSuperAdminOrDirector) {
      loadFinancialSummary();
    }
  }, [activeTab, selectedDate, selectedMonth, selectedYear, selectedBranchId]);

  const loadFinancialSummary = async () => {
    try {
      setLoadingSummary(true);
      setSummaryError(null);
      let id = selectedBranchId;
      if (!isSuperAdminOrDirector) {
        // For branch managers, backend infers from token; need their branch id
        // Fallback: use dailyReport/monthlyReport when available
        id = dailyReport?.branchId || monthlyReport?.branchId || undefined;
      }
      if (!id) return;
      const data = await apiService.getBranchFinancialSummary(id);
      setFinancialSummary(data);
    } catch (e: any) {
      setSummaryError(e.response?.data?.message || 'Erreur résumé financier');
      setFinancialSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Export daily report
  const handleExportDaily = async () => {
    if (!dailyReport) return;
    try {
      const blob = await branchReportService.exportDailyReportCSV(
        dailyReport.branchId,
        selectedDate
      );
      branchReportService.downloadFile(
        blob,
        `rapport-journalier-${dailyReport.branchName}-${selectedDate}.csv`
      );
    } catch (err: any) {
      alert('Erreur lors de l\'exportation du rapport: ' + (err.response?.data?.message || err.message));
    }
  };

  // Export monthly report
  const handleExportMonthly = async () => {
    if (!monthlyReport) return;
    try {
      const blob = await branchReportService.exportMonthlyReportCSV(
        monthlyReport.branchId,
        selectedMonth,
        selectedYear
      );
      branchReportService.downloadFile(
        blob,
        `rapport-mensuel-${monthlyReport.branchName}-${selectedYear}-${selectedMonth}.csv`
      );
    } catch (err: any) {
      alert('Erreur lors de l\'exportation du rapport: ' + (err.response?.data?.message || err.message));
    }
  };

  // Load data when tab or filters change
  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyReport();
    } else {
      loadMonthlyReport();
    }
  }, [activeTab, selectedDate, selectedMonth, selectedYear, selectedBranchId]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📊 Rapport de Succursale
          </h1>
          <p className="text-gray-600">
            Consulter les rapports journaliers et mensuels de la succursale
          </p>
        </div>

        {/* Branch Selector for SuperAdmin/Director */}
        {isSuperAdminOrDirector && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner une succursale:
            </label>
            <select
              value={selectedBranchId || ''}
              onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choisir une succursale --</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('daily')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'daily'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📅 Rapport Journalier
              </button>
              <button
                onClick={() => setActiveTab('monthly')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'monthly'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📆 Rapport Mensuel
              </button>
            </nav>
          </div>

          {/* Filters */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            {activeTab === 'daily' ? (
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Date:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={loadDailyReport}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  🔄 Actualiser
                </button>
                {dailyReport && (
                  <button
                    onClick={handleExportDaily}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    📥 Exporter CSV
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Mois:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1).toLocaleString('fr-HT', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <label className="text-sm font-medium text-gray-700">
                  Année:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadMonthlyReport}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  🔄 Actualiser
                </button>
                {monthlyReport && (
                  <button
                    onClick={handleExportMonthly}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    📥 Exporter CSV
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* Financial Summary Cards */}
        {(selectedBranchId || !isSuperAdminOrDirector) && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">💼 Solde Total (Succursale)</h3>
              <button
                onClick={loadFinancialSummary}
                disabled={loadingSummary}
                className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <span className={loadingSummary ? 'animate-spin' : ''}>🔄</span>
                Actualiser
              </button>
            </div>
            {loadingSummary ? (
              <div className="flex items-center gap-3 text-gray-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                <span>Chargement du résumé financier...</span>
              </div>
            ) : summaryError ? (
              <div className="text-sm text-red-600">{summaryError}</div>
            ) : financialSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-900">Total Entrées (HTG)</div>
                  <div className="text-2xl font-bold text-green-700 mt-2">
                    {branchReportService.formatCurrency(Number(financialSummary.totalDepositHTG || 0), 'HTG')}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg">
                  <div className="text-sm font-medium text-red-900">Total Sorties (HTG)</div>
                  <div className="text-2xl font-bold text-red-700 mt-2">
                    {branchReportService.formatCurrency(Number(financialSummary.totalWithdrawalHTG || 0), 'HTG')}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
                  <div className="text-sm font-medium text-indigo-900">Solde Total (HTG)</div>
                  <div className="text-2xl font-bold text-indigo-700 mt-2">
                    {branchReportService.formatCurrency(Number(financialSummary.balanceHTG || 0), 'HTG')}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-900">Total Entrées (USD)</div>
                  <div className="text-2xl font-bold text-green-700 mt-2">
                    {branchReportService.formatCurrency(Number(financialSummary.totalDepositUSD || 0), 'USD')}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg">
                  <div className="text-sm font-medium text-red-900">Total Sorties (USD)</div>
                  <div className="text-2xl font-bold text-red-700 mt-2">
                    {branchReportService.formatCurrency(Number(financialSummary.totalWithdrawalUSD || 0), 'USD')}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
                  <div className="text-sm font-medium text-indigo-900">Solde Total (USD)</div>
                  <div className="text-2xl font-bold text-indigo-700 mt-2">
                    {branchReportService.formatCurrency(Number(financialSummary.balanceUSD || 0), 'USD')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Sélectionnez une succursale pour voir le solde.</div>
            )}
            {financialSummary && (
              <div className="mt-4 text-xs text-gray-500">
                <div>📊 Basé sur dépôts, retraits et transferts inter-succursales <strong>complétés</strong>.</div>
                <div className="mt-1">💡 <strong>Note:</strong> Les transferts approuvés n'affectent le solde qu'après avoir été dispatchés et traités.</div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Chargement du rapport...</p>
          </div>
        )}

        {/* Daily Report Display */}
        {!loading && activeTab === 'daily' && dailyReport && (
          <DailyReportView report={dailyReport} />
        )}

        {/* Monthly Report Display */}
        {!loading && activeTab === 'monthly' && monthlyReport && (
          <MonthlyReportView report={monthlyReport} />
        )}
      </div>
    </div>
  );
};

// Daily Report View Component
const DailyReportView: React.FC<{ report: DailyBranchReportDto }> = ({ report }) => {
  return (
    <div className="space-y-6">
      {/* Branch Info */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {report.branchName}
        </h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Date:</span>
            <span className="ml-2 font-medium">
              {branchReportService.formatDate(report.reportDate)}
            </span>
          </div>
          {report.branchRegion && (
            <div>
              <span className="text-gray-600">Rejyon:</span>
              <span className="ml-2 font-medium">{report.branchRegion}</span>
            </div>
          )}
          <div>
            <span className="text-gray-600">Trans. totales:</span>
            <span className="ml-2 font-medium">{report.totalTransactions ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Credits Disbursed */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          💰 Crédits Décaissés
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Total HTG"
            value={branchReportService.formatCurrency(report.totalCreditsDisbursedHTG || 0, 'HTG')}
            color="blue"
          />
          <MetricCard
            label="Total USD"
            value={branchReportService.formatCurrency(report.totalCreditsDisbursedUSD || 0, 'USD')}
            color="blue"
          />
          <MetricCard
            label="Quantité"
            value={(report.creditsDisbursedCount ?? 0).toString()}
            color="blue"
          />
        </div>
      </div>

      {/* Payments Received */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          💵 Paiements Reçus
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Total HTG"
            value={branchReportService.formatCurrency(report.totalPaymentsReceivedHTG || 0, 'HTG')}
            color="green"
          />
          <MetricCard
            label="Total USD"
            value={branchReportService.formatCurrency(report.totalPaymentsReceivedUSD || 0, 'USD')}
            color="green"
          />
          <MetricCard
            label="Quantité"
            value={(report.paymentsReceivedCount ?? 0).toString()}
            color="green"
          />
        </div>
      </div>

      {/* Deposits */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          📈 Dépôts
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Total HTG"
            value={branchReportService.formatCurrency(report.totalDepositsHTG || 0, 'HTG')}
            color="purple"
          />
          <MetricCard
            label="Total USD"
            value={branchReportService.formatCurrency(report.totalDepositsUSD || 0, 'USD')}
            color="purple"
          />
          <MetricCard
            label="Quantité"
            value={(report.depositsCount ?? 0).toString()}
            color="purple"
          />
        </div>
      </div>

      {/* Withdrawals */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          📉 Retraits
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Total HTG"
            value={branchReportService.formatCurrency(report.totalWithdrawalsHTG || 0, 'HTG')}
            color="orange"
          />
          <MetricCard
            label="Total USD"
            value={branchReportService.formatCurrency(report.totalWithdrawalsUSD || 0, 'USD')}
            color="orange"
          />
          <MetricCard
            label="Quantité"
            value={(report.withdrawalsCount ?? 0).toString()}
            color="orange"
          />
        </div>
      </div>

      {/* Cash Balance */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          💼 Solde Caisse
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="Solde HTG"
            value={branchReportService.formatCurrency(report.cashBalance?.closingBalanceHTG ?? 0, 'HTG')}
            color="indigo"
            large
          />
          <MetricCard
            label="Solde USD"
            value={branchReportService.formatCurrency(report.cashBalance?.closingBalanceUSD ?? 0, 'USD')}
            color="indigo"
            large
          />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Sessions caisse actives: <span className="font-medium">{report.activeCashSessions ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Monthly Report View Component
const MonthlyReportView: React.FC<{ report: MonthlyBranchReportDto }> = ({ report }) => {
  return (
    <div className="space-y-6">
      {/* Branch Info */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {report.branchName}
        </h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Mois:</span>
            <span className="ml-2 font-medium">
              {new Date(report.year, report.month - 1).toLocaleString('fr-HT', {
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>
          {report.branchRegion && (
            <div>
              <span className="text-gray-600">Rejyon:</span>
              <span className="ml-2 font-medium">{report.branchRegion}</span>
            </div>
          )}
          <div>
            <span className="text-gray-600">Jours ouvrables:</span>
            <span className="ml-2 font-medium">{report.numberOfBusinessDays}</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📊 KPI</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Portfolio at Risk (PAR):</span>
              <span className={`font-bold text-lg ${
                (report.portfolioAtRisk ?? 0) < 5 ? 'text-green-600' :
                (report.portfolioAtRisk ?? 0) < 10 ? 'text-blue-600' :
                (report.portfolioAtRisk ?? 0) < 15 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {(report.portfolioAtRisk ?? 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Taux de Recouvrement:</span>
              <span className={`font-bold text-lg ${
                (report.collectionRate ?? 0) > 95 ? 'text-green-600' :
                (report.collectionRate ?? 0) > 90 ? 'text-blue-600' :
                (report.collectionRate ?? 0) > 85 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {(report.collectionRate ?? 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Average Daily Cash */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">💼 Solde Moyen</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Moyenne HTG:</span>
              <span className="font-bold text-lg text-indigo-600">
                {branchReportService.formatCurrency(report.averageDailyCashBalanceHTG ?? 0, 'HTG')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Moyenne USD:</span>
              <span className="font-bold text-lg text-indigo-600">
                {branchReportService.formatCurrency(report.averageDailyCashBalanceUSD ?? 0, 'USD')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Totals */}
      <div className="grid grid-cols-2 gap-6">
        {/* Credits */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">💰 Total Crédits</h3>
          <div className="space-y-3">
            <MetricCard
              label="HTG"
              value={branchReportService.formatCurrency(report.totalCreditsDisbursedHTG, 'HTG')}
              color="blue"
            />
            <MetricCard
              label="USD"
              value={branchReportService.formatCurrency(report.totalCreditsDisbursedUSD, 'USD')}
              color="blue"
            />
            <MetricCard
              label="Quantité"
              value={(report.totalCreditsDisbursedCount ?? 0).toString()}
              color="blue"
            />
          </div>
        </div>

        {/* Payments */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">💵 Total Paiements</h3>
          <div className="space-y-3">
            <MetricCard
              label="HTG"
              value={branchReportService.formatCurrency(report.totalPaymentsReceivedHTG, 'HTG')}
              color="green"
            />
            <MetricCard
              label="USD"
              value={branchReportService.formatCurrency(report.totalPaymentsReceivedUSD, 'USD')}
              color="green"
            />
            <MetricCard
              label="Quantité"
              value={(report.totalPaymentsReceivedCount ?? 0).toString()}
              color="green"
            />
          </div>
        </div>

        {/* Deposits */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📈 Total Dépôts</h3>
          <div className="space-y-3">
            <MetricCard
              label="HTG"
              value={branchReportService.formatCurrency(report.totalDepositsHTG, 'HTG')}
              color="purple"
            />
            <MetricCard
              label="USD"
              value={branchReportService.formatCurrency(report.totalDepositsUSD, 'USD')}
              color="purple"
            />
            <MetricCard
              label="Quantité"
              value={(report.totalDepositsCount ?? 0).toString()}
              color="purple"
            />
          </div>
        </div>

        {/* Withdrawals */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📉 Total Retraits</h3>
          <div className="space-y-3">
            <MetricCard
              label="HTG"
              value={branchReportService.formatCurrency(report.totalWithdrawalsHTG, 'HTG')}
              color="orange"
            />
            <MetricCard
              label="USD"
              value={branchReportService.formatCurrency(report.totalWithdrawalsUSD, 'USD')}
              color="orange"
            />
            <MetricCard
              label="Quantité"
              value={(report.totalWithdrawalsCount ?? 0).toString()}
              color="orange"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Metric Card Component
interface MetricCardProps {
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'red' | 'yellow';
  large?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, color, large = false }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="text-sm font-medium opacity-75 mb-1">{label}</div>
      <div className={`font-bold ${large ? 'text-2xl' : 'text-xl'}`}>{value}</div>
    </div>
  );
};

export default BranchReportDashboard;
