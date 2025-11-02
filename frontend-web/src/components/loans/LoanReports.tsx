import React, { useState } from 'react';
import {
  X,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Users,
  Percent,
  BarChart3,
  PieChart,
  FileText,
  Filter,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Target
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LoanReportsProps {
  onClose: () => void;
}

interface PortfolioMetrics {
  totalLoans: number;
  totalDisbursed: { HTG: number; USD: number };
  totalOutstanding: { HTG: number; USD: number };
  totalCollected: { HTG: number; USD: number };
  averageInterestRate: number;
  averageLoanSize: { HTG: number; USD: number };
  portfolioAtRisk: number;
  par30: number;
  par60: number;
  par90: number;
  repaymentRate: number;
  defaultRate: number;
}

interface LoanTypePerformance {
  type: string;
  count: number;
  totalAmount: { HTG: number; USD: number };
  outstanding: { HTG: number; USD: number };
  repaymentRate: number;
  defaultRate: number;
  averageInterestRate: number;
}

interface BranchPerformance {
  branch: string;
  totalLoans: number;
  disbursed: { HTG: number; USD: number };
  outstanding: { HTG: number; USD: number };
  repaymentRate: number;
  par30: number;
}

interface LoanOfficerPerformance {
  officer: string;
  totalLoans: number;
  activeLoans: number;
  disbursed: { HTG: number; USD: number };
  collected: { HTG: number; USD: number };
  repaymentRate: number;
  overdueLoans: number;
}

interface OverdueDetail {
  loanNumber: string;
  customerName: string;
  amount: number;
  currency: 'HTG' | 'USD';
  daysOverdue: number;
  dueAmount: number;
  phone: string;
  officer: string;
  branch: string;
}

const LoanReports: React.FC<LoanReportsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'performance' | 'overdue' | 'collection'>('portfolio');
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | '1year' | 'custom'>('30days');
  const [currency, setCurrency] = useState<'ALL' | 'HTG' | 'USD'>('ALL');

  // Données de démonstration
  const portfolioMetrics: PortfolioMetrics = {
    totalLoans: 247,
    totalDisbursed: { HTG: 45750000, USD: 95000 },
    totalOutstanding: { HTG: 32100000, USD: 68000 },
    totalCollected: { HTG: 13650000, USD: 27000 },
    averageInterestRate: 18.5,
    averageLoanSize: { HTG: 185263, USD: 3846 },
    portfolioAtRisk: 15.2,
    par30: 12.5,
    par60: 8.3,
    par90: 4.2,
    repaymentRate: 92.3,
    defaultRate: 2.1
  };

  const loanTypePerformance: LoanTypePerformance[] = [
    {
      type: 'COMMERCIAL',
      count: 98,
      totalAmount: { HTG: 18500000, USD: 38000 },
      outstanding: { HTG: 12800000, USD: 26500 },
      repaymentRate: 94.5,
      defaultRate: 1.5,
      averageInterestRate: 18.0
    },
    {
      type: 'AGRICULTURAL',
      count: 72,
      totalAmount: { HTG: 15200000, USD: 31000 },
      outstanding: { HTG: 10500000, USD: 21500 },
      repaymentRate: 89.8,
      defaultRate: 3.2,
      averageInterestRate: 15.0
    },
    {
      type: 'PERSONAL',
      count: 61,
      totalAmount: { HTG: 10050000, USD: 21000 },
      outstanding: { HTG: 7200000, USD: 15000 },
      repaymentRate: 91.2,
      defaultRate: 2.5,
      averageInterestRate: 20.0
    },
    {
      type: 'EMERGENCY',
      count: 16,
      totalAmount: { HTG: 2000000, USD: 5000 },
      outstanding: { HTG: 1600000, USD: 5000 },
      repaymentRate: 95.0,
      defaultRate: 0.5,
      averageInterestRate: 22.0
    }
  ];

  const branchPerformance: BranchPerformance[] = [
    {
      branch: 'Port-au-Prince Centre',
      totalLoans: 87,
      disbursed: { HTG: 16200000, USD: 33500 },
      outstanding: { HTG: 11340000, USD: 23450 },
      repaymentRate: 93.5,
      par30: 11.2
    },
    {
      branch: 'Cap-Haïtien',
      totalLoans: 64,
      disbursed: { HTG: 11900000, USD: 24600 },
      outstanding: { HTG: 8330000, USD: 17220 },
      repaymentRate: 91.8,
      par30: 13.5
    },
    {
      branch: 'Les Cayes',
      totalLoans: 52,
      disbursed: { HTG: 9650000, USD: 19950 },
      outstanding: { HTG: 6755000, USD: 13965 },
      repaymentRate: 90.5,
      par30: 14.8
    },
    {
      branch: 'Gonaïves',
      totalLoans: 44,
      disbursed: { HTG: 8000000, USD: 16950 },
      outstanding: { HTG: 5675000, USD: 13365 },
      repaymentRate: 92.1,
      par30: 12.9
    }
  ];

  const loanOfficerPerformance: LoanOfficerPerformance[] = [
    {
      officer: 'Marie Dupont',
      totalLoans: 42,
      activeLoans: 38,
      disbursed: { HTG: 7800000, USD: 16100 },
      collected: { HTG: 5850000, USD: 12075 },
      repaymentRate: 96.5,
      overdueLoans: 2
    },
    {
      officer: 'Jean Baptiste',
      totalLoans: 38,
      activeLoans: 34,
      disbursed: { HTG: 7100000, USD: 14700 },
      collected: { HTG: 5112000, USD: 10584 },
      repaymentRate: 93.2,
      overdueLoans: 4
    },
    {
      officer: 'Pierre Louis',
      totalLoans: 35,
      activeLoans: 31,
      disbursed: { HTG: 6500000, USD: 13450 },
      collected: { HTG: 4550000, USD: 9415 },
      repaymentRate: 89.5,
      overdueLoans: 6
    },
    {
      officer: 'Anne Marie Joseph',
      totalLoans: 33,
      activeLoans: 30,
      disbursed: { HTG: 6150000, USD: 12725 },
      collected: { HTG: 4612500, USD: 9543 },
      repaymentRate: 94.8,
      overdueLoans: 3
    }
  ];

  const overdueLoans: OverdueDetail[] = [
    {
      loanNumber: 'MC-2025-0023',
      customerName: 'Paul Léon',
      amount: 50000,
      currency: 'HTG',
      daysOverdue: 45,
      dueAmount: 4500,
      phone: '509-3845-6721',
      officer: 'Pierre Louis',
      branch: 'Port-au-Prince Centre'
    },
    {
      loanNumber: 'MC-2025-0056',
      customerName: 'Claudette François',
      amount: 75000,
      currency: 'HTG',
      daysOverdue: 32,
      dueAmount: 6800,
      phone: '509-4512-8934',
      officer: 'Jean Baptiste',
      branch: 'Cap-Haïtien'
    },
    {
      loanNumber: 'MC-2025-0089',
      customerName: 'Joseph Etienne',
      amount: 1500,
      currency: 'USD',
      daysOverdue: 28,
      dueAmount: 135,
      phone: '509-3678-2341',
      officer: 'Marie Dupont',
      branch: 'Les Cayes'
    },
    {
      loanNumber: 'MC-2025-0112',
      customerName: 'Rose Marie Pierre',
      amount: 100000,
      currency: 'HTG',
      daysOverdue: 22,
      dueAmount: 9000,
      phone: '509-4823-5612',
      officer: 'Anne Marie Joseph',
      branch: 'Gonaïves'
    },
    {
      loanNumber: 'MC-2025-0145',
      customerName: 'Jacques Hyppolite',
      amount: 2000,
      currency: 'USD',
      daysOverdue: 18,
      dueAmount: 180,
      phone: '509-3956-7823',
      officer: 'Pierre Louis',
      branch: 'Port-au-Prince Centre'
    }
  ];

  const formatCurrency = (amount: number, curr: string) => {
    if (curr === 'HTG') {
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount) + ' HTG';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getLoanTypeLabel = (type: string) => {
    const labels: Record<string, { label: string; emoji: string; color: string }> = {
      COMMERCIAL: { label: 'Commercial', emoji: '🏪', color: 'blue' },
      AGRICULTURAL: { label: 'Agricole', emoji: '🌾', color: 'green' },
      PERSONAL: { label: 'Personnel', emoji: '👤', color: 'purple' },
      EMERGENCY: { label: 'Urgence', emoji: '🚨', color: 'red' }
    };
    return labels[type] || labels.PERSONAL;
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 90) return 'text-blue-600';
    if (rate >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPARColor = (par: number) => {
    if (par < 5) return 'text-green-600';
    if (par < 10) return 'text-yellow-600';
    if (par < 15) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleExport = (format: 'PDF' | 'EXCEL') => {
    toast.success(`Export ${format} en cours...`);
    // TODO: Implement export functionality
  };

  const handlePrint = () => {
    toast.success('Impression en cours...');
    // TODO: Implement print functionality
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Rapports de Microcrédits</h2>
            <p className="text-indigo-100">Analyse du portefeuille et performance</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              title="Imprimer"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleExport('PDF')}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              title="Exporter PDF"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="7days">7 derniers jours</option>
                  <option value="30days">30 derniers jours</option>
                  <option value="90days">90 derniers jours</option>
                  <option value="1year">1 an</option>
                  <option value="custom">Personnalisé</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="ALL">Toutes devises</option>
                  <option value="HTG">HTG uniquement</option>
                  <option value="USD">USD uniquement</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => handleExport('EXCEL')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'portfolio'
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <PieChart className="w-5 h-5 inline-block mr-2" />
              Portefeuille
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'performance'
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-5 h-5 inline-block mr-2" />
              Performance
            </button>
            <button
              onClick={() => setActiveTab('overdue')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'overdue'
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <AlertTriangle className="w-5 h-5 inline-block mr-2" />
              Retards
            </button>
            <button
              onClick={() => setActiveTab('collection')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'collection'
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Target className="w-5 h-5 inline-block mr-2" />
              Recouvrement
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab: Portfolio Overview */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Total Prêts</span>
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{portfolioMetrics.totalLoans}</p>
                  <p className="text-xs text-gray-600 mt-1">Tous types confondus</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Capital Décaissé</span>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(portfolioMetrics.totalDisbursed.HTG, 'HTG')}
                  </p>
                  <p className="text-sm text-gray-600">{formatCurrency(portfolioMetrics.totalDisbursed.USD, 'USD')}</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Capital Restant</span>
                    <DollarSign className="w-5 h-5 text-yellow-600" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(portfolioMetrics.totalOutstanding.HTG, 'HTG')}
                  </p>
                  <p className="text-sm text-gray-600">{formatCurrency(portfolioMetrics.totalOutstanding.USD, 'USD')}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Taux de Remboursement</span>
                    <Percent className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{portfolioMetrics.repaymentRate}%</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Excellent
                  </p>
                </div>
              </div>

              {/* Portfolio at Risk */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Portefeuille à Risque (PAR)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">PAR Global</p>
                    <p className={`text-3xl font-bold ${getPARColor(portfolioMetrics.portfolioAtRisk)}`}>
                      {portfolioMetrics.portfolioAtRisk}%
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">PAR 30 jours</p>
                    <p className={`text-3xl font-bold ${getPARColor(portfolioMetrics.par30)}`}>
                      {portfolioMetrics.par30}%
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">PAR 60 jours</p>
                    <p className={`text-3xl font-bold ${getPARColor(portfolioMetrics.par60)}`}>
                      {portfolioMetrics.par60}%
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">PAR 90 jours</p>
                    <p className={`text-3xl font-bold ${getPARColor(portfolioMetrics.par90)}`}>
                      {portfolioMetrics.par90}%
                    </p>
                  </div>
                </div>
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900">
                    Le PAR est dans les normes acceptables (&lt;15%). Continuer le suivi des prêts en retard.
                  </p>
                </div>
              </div>

              {/* Loan Type Distribution */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-indigo-600" />
                  Distribution par Type de Prêt
                </h3>
                <div className="space-y-3">
                  {loanTypePerformance.map((type) => {
                    const percentage = (type.count / portfolioMetrics.totalLoans) * 100;
                    const typeInfo = getLoanTypeLabel(type.type);
                    return (
                      <div key={type.type} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{typeInfo.emoji}</span>
                            <span className="font-semibold text-gray-900">{typeInfo.label}</span>
                            <span className="text-sm text-gray-600">({type.count} prêts)</span>
                          </div>
                          <span className="text-lg font-bold text-gray-900">{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                          <div
                            className={`h-3 rounded-full bg-${typeInfo.color}-500`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-gray-600">Montant Total</p>
                            <p className="font-semibold">{formatCurrency(type.totalAmount.HTG, 'HTG')}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Taux Moyen</p>
                            <p className="font-semibold">{type.averageInterestRate}%</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Remboursement</p>
                            <p className={`font-semibold ${getPerformanceColor(type.repaymentRate)}`}>
                              {type.repaymentRate}%
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Performance */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Branch Performance */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Performance par Succursale
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Succursale</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Prêts</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Décaissé HTG</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Restant HTG</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Taux Remb.</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">PAR 30</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {branchPerformance.map((branch, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-gray-900">{branch.branch}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900">
                            {branch.totalLoans}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                            {formatCurrency(branch.disbursed.HTG, 'HTG')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                            {formatCurrency(branch.outstanding.HTG, 'HTG')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`font-semibold ${getPerformanceColor(branch.repaymentRate)}`}>
                              {branch.repaymentRate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`font-semibold ${getPARColor(branch.par30)}`}>
                              {branch.par30}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Loan Officer Performance */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Performance des Agents de Crédit
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Prêts</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actifs</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Décaissé HTG</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Collecté HTG</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Taux Remb.</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">En Retard</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loanOfficerPerformance.map((officer, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {officer.repaymentRate >= 95 && <Award className="w-4 h-4 text-yellow-500" />}
                              <span className="font-semibold text-gray-900">{officer.officer}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900">
                            {officer.totalLoans}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-green-600 font-semibold">
                            {officer.activeLoans}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                            {formatCurrency(officer.disbursed.HTG, 'HTG')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                            {formatCurrency(officer.collected.HTG, 'HTG')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`font-semibold ${getPerformanceColor(officer.repaymentRate)}`}>
                              {officer.repaymentRate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              officer.overdueLoans === 0 ? 'bg-green-100 text-green-800' :
                              officer.overdueLoans <= 3 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {officer.overdueLoans}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Overdue Loans */}
          {activeTab === 'overdue' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">
                  <p className="font-medium mb-1">Prêts en Retard</p>
                  <p>Liste des prêts nécessitant une action de recouvrement immédiate.</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  Détails des Prêts en Retard
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant Prêt</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Jours Retard</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant Dû</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {overdueLoans.map((loan, index) => (
                        <tr key={index} className={
                          loan.daysOverdue >= 60 ? 'bg-red-50' :
                          loan.daysOverdue >= 30 ? 'bg-yellow-50' : 'bg-white'
                        }>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">{loan.loanNumber}</span>
                            <p className="text-xs text-gray-500">{loan.branch}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-semibold text-gray-900">{loan.customerName}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {formatCurrency(loan.amount, loan.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                              loan.daysOverdue >= 60 ? 'bg-red-100 text-red-800' :
                              loan.daysOverdue >= 30 ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              <Clock className="w-4 h-4" />
                              {loan.daysOverdue}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-bold text-red-600">
                              {formatCurrency(loan.dueAmount, loan.currency)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{loan.phone}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{loan.officer}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Collection */}
          {activeTab === 'collection' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">Capital Collecté (30j)</span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(portfolioMetrics.totalCollected.HTG, 'HTG')}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{formatCurrency(portfolioMetrics.totalCollected.USD, 'USD')}</p>
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +12.5% vs mois précédent
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">Taux de Collecte</span>
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{portfolioMetrics.repaymentRate}%</p>
                  <p className="text-sm text-gray-600 mt-1">Objectif: 95%</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(portfolioMetrics.repaymentRate / 95) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">Taux de Défaut</span>
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{portfolioMetrics.defaultRate}%</p>
                  <p className="text-sm text-gray-600 mt-1">Limite: 5%</p>
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Sous la limite
                  </p>
                </div>
              </div>

              {/* Collection Actions */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  Actions de Recouvrement Recommandées
                </h3>
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900 mb-1">Priorité HAUTE - 2 prêts</p>
                      <p className="text-sm text-red-800">
                        Prêts en retard de plus de 60 jours. Contact immédiat requis + visite terrain.
                      </p>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-900 mb-1">Priorité MOYENNE - 8 prêts</p>
                      <p className="text-sm text-yellow-800">
                        Prêts en retard de 30-60 jours. Appel téléphonique + plan de remboursement.
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                    <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900 mb-1">Suivi NORMAL - 15 prêts</p>
                      <p className="text-sm text-blue-800">
                        Prêts en retard de 1-30 jours. Rappel de paiement par SMS/appel.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Rapport généré le {new Date().toLocaleDateString('fr-FR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoanReports;
