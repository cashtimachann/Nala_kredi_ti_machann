// Branch Performance Comparison Component

import React, { useState, useEffect } from 'react';
import { branchReportService } from '../../services/branchReportService';
import {
  PerformanceComparisonDto,
  BranchPerformanceDto,
  BranchOverviewDto
} from '../../types/branchReports';

export const BranchPerformanceComparison: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceComparisonDto | null>(null);
  const [overviewData, setOverviewData] = useState<BranchOverviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [sortBy, setSortBy] = useState<'rank' | 'collections' | 'par' | 'collectionRate'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Load performance comparison
  const loadPerformanceComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const [performance, overview] = await Promise.all([
        branchReportService.getPerformanceComparison(startDate, endDate),
        branchReportService.getAllBranchesOverview(startDate)
      ]);
      setPerformanceData(performance);
      setOverviewData(overview);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement de la comparaison des performances');
      console.error('Error loading performance comparison:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when dates change
  useEffect(() => {
    loadPerformanceComparison();
  }, [startDate, endDate]);

  // Sort branches
  const sortedBranches = performanceData?.branches
    ? [...performanceData.branches].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'rank':
            comparison = a.rank - b.rank;
            break;
          case 'collections':
            comparison = a.totalCollectionsHTG - b.totalCollectionsHTG;
            break;
          case 'par':
            comparison = a.portfolioAtRisk - b.portfolioAtRisk;
            break;
          case 'collectionRate':
            comparison = a.collectionRate - b.collectionRate;
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      })
    : [];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📊 Comparaison des Performances des Succursales
          </h1>
          <p className="text-gray-600">
            Comparer les performances entre toutes les succursales
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de Début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de Fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trier Par
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rank">Rang</option>
                <option value="collections">Collections Totales</option>
                <option value="collectionRate">Taux de Recouvrement</option>
                <option value="par">PAR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ordre
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="asc">Croissant ↑</option>
                <option value="desc">Décroissant ↓</option>
              </select>
            </div>
            <button
              onClick={loadPerformanceComparison}
              disabled={loading}
              className="px-6 py-2 mt-6 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
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

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Chargement de la comparaison des performances...</p>
          </div>
        )}

        {/* Performance Comparison Display */}
        {!loading && performanceData && sortedBranches.length > 0 && (
          <>
            {/* Top 3 Branches */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                🏆 Top 3 Succursales
              </h2>
              <div className="grid grid-cols-3 gap-6">
                {sortedBranches.slice(0, 3).map((branch, index) => (
                  <TopBranchCard
                    key={branch.branchId}
                    branch={branch}
                    position={index + 1}
                  />
                ))}
              </div>
            </div>

            {/* All Branches Comparison Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">
                  Comparaison Détaillée - {sortedBranches.length} Succursales
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Rang
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Succursale
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Crédits Décaissés (HTG)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Paiements (HTG)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Taux Recouv.
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        PAR
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Crédits Actifs
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Clients
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Employés
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedBranches.map((branch) => (
                      <BranchComparisonRow key={branch.branchId} branch={branch} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance Metrics Summary */}
            <div className="grid grid-cols-2 gap-6">
              {/* Best Performers */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  ⭐ Meilleures Performances
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Meilleur Taux de Recouvrement</div>
                      <div className="text-lg font-bold text-green-600">
                        {sortedBranches.reduce((max, b) => b.collectionRate > max.collectionRate ? b : max).branchName}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {sortedBranches.reduce((max, b) => b.collectionRate > max.collectionRate ? b : max).collectionRate.toFixed(1)}%
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-700">PAR le Plus Bas</div>
                      <div className="text-lg font-bold text-blue-600">
                        {sortedBranches.reduce((min, b) => b.portfolioAtRisk < min.portfolioAtRisk ? b : min).branchName}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {sortedBranches.reduce((min, b) => b.portfolioAtRisk < min.portfolioAtRisk ? b : min).portfolioAtRisk.toFixed(1)}%
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Volume de Paiements le Plus Élevé</div>
                      <div className="text-lg font-bold text-purple-600">
                        {sortedBranches.reduce((max, b) => b.totalCollectionsHTG > max.totalCollectionsHTG ? b : max).branchName}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-purple-600">
                      {branchReportService.formatCurrency(
                        sortedBranches.reduce((max, b) => b.totalCollectionsHTG > max.totalCollectionsHTG ? b : max).totalCollectionsHTG,
                        'HTG'
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Areas for Improvement */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  ⚠️ Zones Requirant Amélioration
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-700">PAR le Plus Élevé</div>
                      <div className="text-lg font-bold text-red-600">
                        {sortedBranches.reduce((max, b) => b.portfolioAtRisk > max.portfolioAtRisk ? b : max).branchName}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {sortedBranches.reduce((max, b) => b.portfolioAtRisk > max.portfolioAtRisk ? b : max).portfolioAtRisk.toFixed(1)}%
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Taux de Recouvrement le Plus Bas</div>
                      <div className="text-lg font-bold text-yellow-600">
                        {sortedBranches.reduce((min, b) => b.collectionRate < min.collectionRate ? b : min).branchName}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {sortedBranches.reduce((min, b) => b.collectionRate < min.collectionRate ? b : min).collectionRate.toFixed(1)}%
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Volume de Paiements le Plus Faible</div>
                      <div className="text-lg font-bold text-orange-600">
                        {sortedBranches.reduce((min, b) => b.totalCollectionsHTG < min.totalCollectionsHTG ? b : min).branchName}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-orange-600">
                      {branchReportService.formatCurrency(
                        sortedBranches.reduce((min, b) => b.totalCollectionsHTG < min.totalCollectionsHTG ? b : min).totalCollectionsHTG,
                        'HTG'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Top Branch Card Component
const TopBranchCard: React.FC<{ branch: BranchPerformanceDto; position: number }> = ({ branch, position }) => {
  const medals = ['🥇', '🥈', '🥉'];
  const colors = [
    'border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100',
    'border-gray-400 bg-gradient-to-br from-gray-50 to-gray-100',
    'border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100'
  ];

  return (
    <div className={`rounded-lg shadow-lg p-6 border-2 ${colors[position - 1]}`}>
      <div className="text-center mb-4">
        <div className="text-6xl mb-2">{medals[position - 1]}</div>
        <div className="text-xl font-bold text-gray-900">{branch.branchName}</div>
        {branch.region && <div className="text-sm text-gray-600">{branch.region}</div>}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Taux Recouvrement:</span>
          <span className="text-lg font-bold text-green-600">{branch.collectionRate.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">PAR:</span>
          <span className={`text-lg font-bold ${
            branch.portfolioAtRisk < 5 ? 'text-green-600' :
            branch.portfolioAtRisk < 10 ? 'text-blue-600' :
            'text-yellow-600'
          }`}>
            {branch.portfolioAtRisk.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Paiements Total:</span>
          <span className="text-sm font-bold text-purple-600">
            {branchReportService.formatCurrency(branch.totalCollectionsHTG, 'HTG')}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Clients:</span>
          <span className="text-sm font-medium text-gray-900">{branch.numberOfCustomers.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

// Branch Comparison Row Component
const BranchComparisonRow: React.FC<{ branch: BranchPerformanceDto }> = ({ branch }) => {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-2xl">
          {branch.rank === 1 ? '🥇' : branch.rank === 2 ? '🥈' : branch.rank === 3 ? '🥉' : `#${branch.rank}`}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="font-medium text-gray-900">{branch.branchName}</div>
        {branch.region && <div className="text-sm text-gray-500">{branch.region}</div>}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="text-sm text-blue-600 font-medium">
          {branchReportService.formatCurrency(branch.totalDisbursementsHTG, 'HTG')}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="text-sm text-green-600 font-medium">
          {branchReportService.formatCurrency(branch.totalCollectionsHTG, 'HTG')}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <span className={`px-2 py-1 text-sm font-bold rounded ${
          branch.collectionRate > 95 ? 'bg-green-100 text-green-800' :
          branch.collectionRate > 90 ? 'bg-blue-100 text-blue-800' :
          branch.collectionRate > 85 ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {branch.collectionRate.toFixed(1)}%
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <span className={`px-2 py-1 text-sm font-bold rounded ${
          branch.portfolioAtRisk < 5 ? 'bg-green-100 text-green-800' :
          branch.portfolioAtRisk < 10 ? 'bg-blue-100 text-blue-800' :
          branch.portfolioAtRisk < 15 ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {branch.portfolioAtRisk.toFixed(1)}%
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="text-sm text-gray-900">{branch.numberOfActiveLoans.toLocaleString()}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="text-sm text-gray-900">{branch.numberOfCustomers.toLocaleString()}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="text-sm text-gray-900">{branch.numberOfEmployees}</div>
      </td>
    </tr>
  );
};

export default BranchPerformanceComparison;
