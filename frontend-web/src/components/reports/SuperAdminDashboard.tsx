// SuperAdmin Dashboard - Complete overview and control of all branches

import React, { useState, useEffect } from 'react';
import { branchReportService } from '../../services/branchReportService';
import {
  SuperAdminDashboardStatsDto,
  SuperAdminConsolidatedReportDto,
  BranchAlertDto,
  BranchQuickStatsDto
} from '../../types/branchReports';

export const SuperAdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<SuperAdminDashboardStatsDto | null>(null);
  const [consolidatedReport, setConsolidatedReport] = useState<SuperAdminConsolidatedReportDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Date filters for consolidated report
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );

  // Load dashboard stats
  const loadDashboardStats = async () => {
    try {
      const stats = await branchReportService.getDashboardStats();
      setDashboardStats(stats);
      setError(null);
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des statistiques');
    }
  };

  // Load consolidated report
  const loadConsolidatedReport = async () => {
    setLoading(true);
    try {
      const report = await branchReportService.getConsolidatedReport(startDate, endDate);
      setConsolidatedReport(report);
      setError(null);
    } catch (err: any) {
      console.error('Error loading consolidated report:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement du rapport consolidé');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadDashboardStats();
    loadConsolidatedReport();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadDashboardStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Reload consolidated when dates change
  useEffect(() => {
    loadConsolidatedReport();
  }, [startDate, endDate]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">
              🔐 Dashboard SuperAdmin
            </h1>
            <p className="text-black">
              Contrôle total sur toutes les succursales
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-black">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Actualisation automatique
            </label>
            <button
              onClick={() => {
                loadDashboardStats();
                loadConsolidatedReport();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              🔄 Actualiser
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* Real-time Stats Section */}
        {dashboardStats && (
          <>
            {/* Today's Activity */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-black mb-4">
                📊 Activité d'Aujourd'hui
              </h2>
              <div className="grid grid-cols-5 gap-4">
                <StatCard
                  icon="💰"
                  label="Crédits Décaissés"
                  valueHTG={dashboardStats.todayDisbursementsHTG}
                  valueUSD={dashboardStats.todayDisbursementsUSD}
                  color="blue"
                />
                <StatCard
                  icon="💵"
                  label="Paiements Reçus"
                  valueHTG={dashboardStats.todayCollectionsHTG}
                  valueUSD={dashboardStats.todayCollectionsUSD}
                  color="green"
                />
                <StatCard
                  icon="📝"
                  label="Transactions"
                  value={dashboardStats.todayTransactionsCount.toString()}
                  color="purple"
                />
                <StatCard
                  icon="🏢"
                  label="Succursales Actives"
                  value={dashboardStats.activeBranches.toString()}
                  color="indigo"
                />
                <StatCard
                  icon="💼"
                  label="Sessions Caisse"
                  value={dashboardStats.activeCashSessions.toString()}
                  color="gray"
                />
              </div>
            </div>

            {/* Month-to-Date */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                📅 Mois en Cours (MTD)
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-black mb-4">💰 Crédits Décaissés</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-black">HTG:</span>
                      <span className="font-bold text-blue-600">
                        {branchReportService.formatCurrency(dashboardStats.monthToDateDisbursementsHTG, 'HTG')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">USD:</span>
                      <span className="font-bold text-blue-600">
                        {branchReportService.formatCurrency(dashboardStats.monthToDateDisbursementsUSD, 'USD')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-black mb-4">💵 Paiements Reçus</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-black">HTG:</span>
                      <span className="font-bold text-green-600">
                        {branchReportService.formatCurrency(dashboardStats.monthToDateCollectionsHTG, 'HTG')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">USD:</span>
                      <span className="font-bold text-green-600">
                        {branchReportService.formatCurrency(dashboardStats.monthToDateCollectionsUSD, 'USD')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Portfolio Overview */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-black mb-4">
                💼 Aperçu Portefeuille
              </h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="text-sm text-black mb-1">Total HTG</div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {branchReportService.formatCurrency(dashboardStats.totalOutstandingPortfolioHTG, 'HTG')}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="text-sm text-black mb-1">Total USD</div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {branchReportService.formatCurrency(dashboardStats.totalOutstandingPortfolioUSD, 'USD')}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="text-sm text-black mb-1">Crédits Actifs</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboardStats.totalActiveLoans.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="text-sm text-black mb-1">PAR Global</div>
                  <div className={`text-2xl font-bold ${
                    dashboardStats.globalPAR < 5 ? 'text-green-600' :
                    dashboardStats.globalPAR < 10 ? 'text-blue-600' :
                    dashboardStats.globalPAR < 15 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {dashboardStats.globalPAR.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Alerts Summary */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-black mb-4">
                🚨 Alertes
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-red-700 mb-1">CRITIQUE</div>
                      <div className="text-3xl font-bold text-red-700">
                        {dashboardStats.criticalAlerts}
                      </div>
                    </div>
                    <div className="text-4xl">🔴</div>
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-orange-700 mb-1">ÉLEVÉ</div>
                      <div className="text-3xl font-bold text-orange-700">
                        {dashboardStats.highAlerts}
                      </div>
                    </div>
                    <div className="text-4xl">🟠</div>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-yellow-700 mb-1">MOYEN</div>
                      <div className="text-3xl font-bold text-yellow-700">
                        {dashboardStats.mediumAlerts}
                      </div>
                    </div>
                    <div className="text-4xl">🟡</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top 5 Branches */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                🏆 Top 5 Succursales Aujourd'hui
              </h2>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Succursale
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Paiements Aujourd'hui
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Transactions
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Taux Recouvrement
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        PAR
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardStats.topBranches.map((branch) => (
                      <tr key={branch.branchId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{branch.branchName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {branchReportService.formatCurrency(branch.todayCollections, 'HTG')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-gray-900">{branch.todayTransactions}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className={`text-sm font-medium ${
                            branch.collectionRate > 95 ? 'text-green-600' :
                            branch.collectionRate > 90 ? 'text-blue-600' :
                            branch.collectionRate > 85 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {branch.collectionRate.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className={`text-sm font-medium ${
                            branch.par < 5 ? 'text-green-600' :
                            branch.par < 10 ? 'text-blue-600' :
                            branch.par < 15 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {branch.par.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            branchReportService.getStatusColor(branch.status)
                          }`}>
                            {branch.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Consolidated Report Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-black">
              📊 Rapport Consolidé - Toutes les Succursales
            </h2>
            <div className="flex items-center gap-4">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <span className="text-black">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {loading && (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-black">Chargement du rapport consolidé...</p>
            </div>
          )}

          {!loading && consolidatedReport && (
            <>
              {/* Global Totals */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="text-sm text-black mb-1">Total Succursales</div>
                  <div className="text-3xl font-bold text-indigo-600">
                    {consolidatedReport.totalBranches}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="text-sm text-black mb-1">Total Clients</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {consolidatedReport.totalActiveCustomers.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="text-sm text-black mb-1">Total Crédits</div>
                  <div className="text-3xl font-bold text-green-600">
                    {consolidatedReport.totalActiveLoans.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="text-sm text-black mb-1">Total Employés</div>
                  <div className="text-3xl font-bold text-purple-600">
                    {consolidatedReport.totalEmployees}
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {consolidatedReport.alerts.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-black mb-4">
                    🚨 Alertes Actives
                  </h3>
                  <div className="space-y-2">
                    {consolidatedReport.alerts.map((alert, index) => (
                      <AlertCard key={index} alert={alert} />
                    ))}
                  </div>
                </div>
              )}

              {/* Top Performers */}
              {consolidatedReport.topPerformers.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-black mb-4">
                    🏆 Meilleures Performances
                  </h3>
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rang</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Succursale</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paiements (HTG)</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taux Recouv.</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">PAR</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {consolidatedReport.topPerformers.map((branch) => (
                          <tr key={branch.branchId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-2xl">{branch.rank === 1 ? '🥇' : branch.rank === 2 ? '🥈' : branch.rank === 3 ? '🥉' : `#${branch.rank}`}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-black">{branch.branchName}</div>
                              {branch.region && <div className="text-sm text-black">{branch.region}</div>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-medium text-green-600">
                                {branchReportService.formatCurrency(branch.totalCollectionsHTG, 'HTG')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-medium text-blue-600">
                                {branch.collectionRate.toFixed(1)}%
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className={`text-sm font-medium ${
                                branch.portfolioAtRisk < 5 ? 'text-green-600' : 'text-yellow-600'
                              }`}>
                                {branch.portfolioAtRisk.toFixed(1)}%
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  icon: string;
  label: string;
  value?: string;
  valueHTG?: number;
  valueUSD?: number;
  color: 'blue' | 'green' | 'purple' | 'indigo' | 'gray';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, valueHTG, valueUSD, color }) => {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    purple: 'border-purple-200 bg-purple-50',
    indigo: 'border-indigo-200 bg-indigo-50',
    gray: 'border-gray-200 bg-gray-50',
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-black">{label}</div>
        <div className="text-2xl">{icon}</div>
      </div>
      {value ? (
        <div className="text-2xl font-bold text-black">{value}</div>
      ) : (
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">
            {branchReportService.formatCurrency(valueHTG || 0, 'HTG')}
          </div>
          <div className="text-sm font-medium text-gray-600">
            {branchReportService.formatCurrency(valueUSD || 0, 'USD')}
          </div>
        </div>
      )}
    </div>
  );
};

// Alert Card Component
const AlertCard: React.FC<{ alert: BranchAlertDto }> = ({ alert }) => {
  return (
    <div className={`p-4 rounded-lg border-l-4 ${branchReportService.getAlertColor(alert.severity)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold">{alert.branchName}</span>
            <span className="text-xs px-2 py-1 rounded-full bg-white">
              {alert.severity}
            </span>
          </div>
          <div className="text-sm">{alert.message}</div>
          <div className="text-xs mt-1 opacity-75">
            Valè: {alert.value.toFixed(2)} | Sèy: {alert.threshold.toFixed(2)}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {new Date(alert.detectedAt).toLocaleTimeString('fr-HT')}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
