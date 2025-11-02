import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  BarChart3,
  PieChart,
  Filter,
  Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Types
interface PayrollReport {
  month: number;
  year: number;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalTax: number;
  totalInsurance: number;
  totalPension: number;
  totalAdvances: number;
}

interface BranchPayroll {
  branchId: string;
  branchName: string;
  employees: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
}

interface DepartmentPayroll {
  department: string;
  employees: number;
  avgSalary: number;
  totalPayroll: number;
}

interface TaxDeclaration {
  id: string;
  period: string;
  totalTax: number;
  employeeCount: number;
  status: 'DRAFT' | 'SUBMITTED' | 'PAID';
  submittedAt?: string;
  paidAt?: string;
}

interface PayrollReportsProps {
  onClose?: () => void;
}

const PayrollReports: React.FC<PayrollReportsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'branch' | 'department' | 'history' | 'tax'>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('2024-10');
  const [filterYear, setFilterYear] = useState('2024');

  // Demo data - Current Period Report
  const currentReport: PayrollReport = {
    month: 10,
    year: 2024,
    totalEmployees: 8,
    totalGross: 248000,
    totalDeductions: 37200,
    totalNet: 210800,
    totalTax: 21390,
    totalInsurance: 2500,
    totalPension: 2250,
    totalAdvances: 11060
  };

  // Branch payroll data
  const branchPayrolls: BranchPayroll[] = [
    {
      branchId: 'BR001',
      branchName: 'Port-au-Prince Centre',
      employees: 5,
      grossSalary: 185800,
      deductions: 27920,
      netSalary: 157880
    },
    {
      branchId: 'BR002',
      branchName: 'Cap-Haïtien',
      employees: 1,
      grossSalary: 24850,
      deductions: 1540,
      netSalary: 23310
    },
    {
      branchId: 'BR003',
      branchName: 'Les Cayes',
      employees: 1,
      grossSalary: 20800,
      deductions: 1080,
      netSalary: 19720
    },
    {
      branchId: 'BR004',
      branchName: 'Gonaïves',
      employees: 1,
      grossSalary: 29475,
      deductions: 2080,
      netSalary: 27395
    }
  ];

  // Department payroll data
  const departmentPayrolls: DepartmentPayroll[] = [
    {
      department: 'Direction',
      employees: 1,
      avgSalary: 52000,
      totalPayroll: 52000
    },
    {
      department: 'Crédit',
      employees: 2,
      avgSalary: 31688,
      totalPayroll: 63375
    },
    {
      department: 'Opérations',
      employees: 1,
      avgSalary: 24850,
      totalPayroll: 24850
    },
    {
      department: 'Ressources Humaines',
      employees: 1,
      avgSalary: 36800,
      totalPayroll: 36800
    },
    {
      department: 'Sécurité',
      employees: 1,
      avgSalary: 20800,
      totalPayroll: 20800
    },
    {
      department: 'Informatique',
      employees: 1,
      avgSalary: 44500,
      totalPayroll: 44500
    },
    {
      department: 'Comptabilité',
      employees: 1,
      avgSalary: 34400,
      totalPayroll: 34400
    }
  ];

  // Payroll history
  const payrollHistory: PayrollReport[] = [
    {
      month: 10,
      year: 2024,
      totalEmployees: 8,
      totalGross: 248000,
      totalDeductions: 37200,
      totalNet: 210800,
      totalTax: 21390,
      totalInsurance: 2500,
      totalPension: 2250,
      totalAdvances: 11060
    },
    {
      month: 9,
      year: 2024,
      totalEmployees: 8,
      totalGross: 245000,
      totalDeductions: 36750,
      totalNet: 208250,
      totalTax: 21150,
      totalInsurance: 2500,
      totalPension: 2250,
      totalAdvances: 10850
    },
    {
      month: 8,
      year: 2024,
      totalEmployees: 7,
      totalGross: 208000,
      totalDeductions: 31200,
      totalNet: 176800,
      totalTax: 18200,
      totalInsurance: 2000,
      totalPension: 2000,
      totalAdvances: 9000
    },
    {
      month: 7,
      year: 2024,
      totalEmployees: 7,
      totalGross: 210000,
      totalDeductions: 31500,
      totalNet: 178500,
      totalTax: 18400,
      totalInsurance: 2000,
      totalPension: 2000,
      totalAdvances: 9100
    },
    {
      month: 6,
      year: 2024,
      totalEmployees: 6,
      totalGross: 185000,
      totalDeductions: 27750,
      totalNet: 157250,
      totalTax: 16200,
      totalInsurance: 1500,
      totalPension: 1500,
      totalAdvances: 8550
    },
    {
      month: 5,
      year: 2024,
      totalEmployees: 6,
      totalGross: 182000,
      totalDeductions: 27300,
      totalNet: 154700,
      totalTax: 15900,
      totalInsurance: 1500,
      totalPension: 1500,
      totalAdvances: 8400
    }
  ];

  // Tax declarations
  const taxDeclarations: TaxDeclaration[] = [
    {
      id: 'TAX-2024-10',
      period: 'Octobre 2024',
      totalTax: 21390,
      employeeCount: 8,
      status: 'DRAFT',
    },
    {
      id: 'TAX-2024-09',
      period: 'Septembre 2024',
      totalTax: 21150,
      employeeCount: 8,
      status: 'PAID',
      submittedAt: '2024-10-05',
      paidAt: '2024-10-10'
    },
    {
      id: 'TAX-2024-08',
      period: 'Août 2024',
      totalTax: 18200,
      employeeCount: 7,
      status: 'PAID',
      submittedAt: '2024-09-05',
      paidAt: '2024-09-10'
    },
    {
      id: 'TAX-2024-07',
      period: 'Juillet 2024',
      totalTax: 18400,
      employeeCount: 7,
      status: 'PAID',
      submittedAt: '2024-08-05',
      paidAt: '2024-08-10'
    }
  ];

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-HT').format(amount) + ' HTG';
  };

  const getMonthName = (month: number) => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month - 1];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'PAID': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Brouillon';
      case 'SUBMITTED': return 'Soumis';
      case 'PAID': return 'Payé';
      default: return status;
    }
  };

  // Handlers
  const handleExport = (format: 'PDF' | 'EXCEL') => {
    toast.success(`Export ${format} en cours...`);
  };

  const handlePrint = () => {
    toast.success('Impression en cours...');
  };

  const handleSubmitTax = (declaration: TaxDeclaration) => {
    if (window.confirm(`Soumettre la déclaration fiscale pour ${declaration.period}?`)) {
      toast.success('Déclaration soumise avec succès');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rapports de Paie</h1>
          <p className="text-gray-600 mt-1">Historique et déclarations fiscales</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleExport('PDF')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            PDF
          </button>
          <button
            onClick={() => handleExport('EXCEL')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-5 h-5" />
            Imprimer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } transition-colors`}
            >
              <BarChart3 className="h-5 w-5" />
              <span>Vue d'ensemble</span>
            </button>
            <button
              onClick={() => setActiveTab('branch')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'branch'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } transition-colors`}
            >
              <Building2 className="h-5 w-5" />
              <span>Par Succursale</span>
            </button>
            <button
              onClick={() => setActiveTab('department')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'department'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } transition-colors`}
            >
              <PieChart className="h-5 w-5" />
              <span>Par Département</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } transition-colors`}
            >
              <Calendar className="h-5 w-5" />
              <span>Historique</span>
            </button>
            <button
              onClick={() => setActiveTab('tax')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tax'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } transition-colors`}
            >
              <FileText className="h-5 w-5" />
              <span>Déclarations Fiscales</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Period Selector */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Période:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="2024-10">Octobre 2024</option>
                <option value="2024-09">Septembre 2024</option>
                <option value="2024-08">Août 2024</option>
                <option value="2024-07">Juillet 2024</option>
              </select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Employés</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {currentReport.totalEmployees}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">Payés</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Salaire Brut</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(currentReport.totalGross / 1000)}K
                  </p>
                  <p className="text-sm text-green-600 mt-1">Total période</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Déductions</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(currentReport.totalDeductions / 1000)}K
                  </p>
                  <p className="text-sm text-orange-600 mt-1">Total retenues</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Salaire Net</p>
                  <p className="text-2xl font-bold text-indigo-900 mt-1">
                    {formatCurrency(currentReport.totalNet / 1000)}K
                  </p>
                  <p className="text-sm text-indigo-600 mt-1">Décaissé</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Deductions Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des Déductions</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(currentReport.totalTax)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Impôts</div>
                <div className="text-xs text-gray-500 mt-1">
                  {((currentReport.totalTax / currentReport.totalDeductions) * 100).toFixed(1)}% du total
                </div>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(currentReport.totalInsurance)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Assurances</div>
                <div className="text-xs text-gray-500 mt-1">
                  {((currentReport.totalInsurance / currentReport.totalDeductions) * 100).toFixed(1)}% du total
                </div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(currentReport.totalPension)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Retraite</div>
                <div className="text-xs text-gray-500 mt-1">
                  {((currentReport.totalPension / currentReport.totalDeductions) * 100).toFixed(1)}% du total
                </div>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(currentReport.totalAdvances)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Avances</div>
                <div className="text-xs text-gray-500 mt-1">
                  {((currentReport.totalAdvances / currentReport.totalDeductions) * 100).toFixed(1)}% du total
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: By Branch */}
      {activeTab === 'branch' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Succursale
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employés
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salaire Brut
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Déductions
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salaire Net
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % du Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {branchPayrolls.map((branch) => (
                    <tr key={branch.branchId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                          <div className="text-sm font-medium text-gray-900">
                            {branch.branchName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{branch.employees}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(branch.grossSalary)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-red-600">
                          {formatCurrency(branch.deductions)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-bold text-indigo-600">
                          {formatCurrency(branch.netSalary)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-600">
                          {((branch.netSalary / currentReport.totalNet) * 100).toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td className="px-6 py-4 font-bold text-gray-900">TOTAL</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {currentReport.totalEmployees}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {formatCurrency(currentReport.totalGross)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-red-600">
                      {formatCurrency(currentReport.totalDeductions)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-indigo-900 text-lg">
                      {formatCurrency(currentReport.totalNet)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: By Department */}
      {activeTab === 'department' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Département
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employés
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salaire Moyen
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Masse Salariale
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % du Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departmentPayrolls.map((dept, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {dept.department}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{dept.employees}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(dept.avgSalary)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-bold text-indigo-600">
                          {formatCurrency(dept.totalPayroll)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-600">
                          {((dept.totalPayroll / currentReport.totalGross) * 100).toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td className="px-6 py-4 font-bold text-gray-900">TOTAL</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {currentReport.totalEmployees}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {formatCurrency(currentReport.totalGross / currentReport.totalEmployees)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-indigo-900 text-lg">
                      {formatCurrency(currentReport.totalGross)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: History */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Year Filter */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Année:</span>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Période
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employés
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salaire Brut
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Déductions
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salaire Net
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrollHistory.map((report, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {getMonthName(report.month)} {report.year}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{report.totalEmployees}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(report.totalGross)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-red-600">
                          {formatCurrency(report.totalDeductions)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-bold text-indigo-600">
                          {formatCurrency(report.totalNet)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => toast.success('Affichage des détails...')}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir détails"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Tax Declarations */}
      {activeTab === 'tax' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Déclarations Fiscales</p>
              <p className="mt-1">
                Les déclarations doivent être soumises avant le 15 de chaque mois pour la période précédente.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Période
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employés
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant Impôt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Soumission
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {taxDeclarations.map((declaration) => (
                    <tr key={declaration.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {declaration.period}
                        </div>
                        <div className="text-xs text-gray-500">
                          {declaration.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{declaration.employeeCount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-bold text-gray-900">
                          {formatCurrency(declaration.totalTax)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(declaration.status)}`}>
                          {getStatusLabel(declaration.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {declaration.submittedAt ? (
                          <div>
                            <div className="text-sm text-gray-900">
                              {new Date(declaration.submittedAt).toLocaleDateString('fr-FR')}
                            </div>
                            {declaration.paidAt && (
                              <div className="text-xs text-green-600">
                                Payé le {new Date(declaration.paidAt).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {declaration.status === 'DRAFT' && (
                            <button
                              onClick={() => handleSubmitTax(declaration)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Soumettre"
                            >
                              <FileText className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => toast.success('Téléchargement du PDF...')}
                            className="text-blue-600 hover:text-blue-900"
                            title="Télécharger PDF"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollReports;
