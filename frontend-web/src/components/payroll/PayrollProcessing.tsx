import React, { useState } from 'react';
import {
  DollarSign,
  Calendar,
  Users,
  FileText,
  Search,
  Filter,
  Check,
  X,
  Download,
  Printer,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calculator,
  Plus,
  Minus
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Types
interface PayrollPeriod {
  id: string;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID';
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  createdBy: string;
  createdAt: string;
  paidAt?: string;
}

interface PayrollItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  position: string;
  branch: string;
  baseSalary: number;
  overtimeHours: number;
  overtimeAmount: number;
  bonuses: PayrollBonus[];
  totalBonuses: number;
  deductions: PayrollDeduction[];
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY';
  bankAccount?: string;
  mobileNumber?: string;
  status: 'PENDING' | 'APPROVED' | 'PAID';
}

interface PayrollBonus {
  id: string;
  type: 'PERFORMANCE' | 'ATTENDANCE' | 'TRANSPORT' | 'MEAL' | 'OTHER';
  description: string;
  amount: number;
}

interface PayrollDeduction {
  id: string;
  type: 'TAX' | 'INSURANCE' | 'ADVANCE' | 'LOAN' | 'PENSION' | 'OTHER';
  description: string;
  amount: number;
}

interface PayrollProcessingProps {
  onClose?: () => void;
}

const PayrollProcessing: React.FC<PayrollProcessingProps> = ({ onClose }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollItem | null>(null);

  // Demo data - Current period
  const currentPeriod: PayrollPeriod = {
    id: 'PAY-2024-10',
    month: 10,
    year: 2024,
    startDate: '2024-10-01',
    endDate: '2024-10-31',
    status: 'CALCULATED',
    totalEmployees: 8,
    totalGross: 248000,
    totalDeductions: 37200,
    totalNet: 210800,
    createdBy: 'Admin',
    createdAt: '2024-10-15T10:00:00'
  };

  // Demo payroll items
  const [payrollItems] = useState<PayrollItem[]>([
    {
      id: 'PI001',
      employeeId: 'EMP001',
      employeeCode: 'EMP-2024-001',
      employeeName: 'Jean Baptiste',
      position: 'Directeur de Succursale',
      branch: 'Port-au-Prince Centre',
      baseSalary: 45000,
      overtimeHours: 0,
      overtimeAmount: 0,
      bonuses: [
        { id: 'B1', type: 'PERFORMANCE', description: 'Prime de performance', amount: 5000 },
        { id: 'B2', type: 'TRANSPORT', description: 'Indemnité transport', amount: 2000 }
      ],
      totalBonuses: 7000,
      deductions: [
        { id: 'D1', type: 'TAX', description: 'Impôt sur le revenu (10%)', amount: 4500 },
        { id: 'D2', type: 'INSURANCE', description: 'Assurance santé', amount: 1500 }
      ],
      totalDeductions: 6000,
      grossSalary: 52000,
      netSalary: 46000,
      paymentMethod: 'BANK_TRANSFER',
      bankAccount: 'BNC-001234567',
      status: 'APPROVED'
    },
    {
      id: 'PI002',
      employeeId: 'EMP002',
      employeeCode: 'EMP-2024-002',
      employeeName: 'Marie Dupont',
      position: 'Agent de Crédit',
      branch: 'Port-au-Prince Centre',
      baseSalary: 28000,
      overtimeHours: 8,
      overtimeAmount: 1400,
      bonuses: [
        { id: 'B3', type: 'PERFORMANCE', description: 'Commission sur prêts', amount: 3000 },
        { id: 'B4', type: 'TRANSPORT', description: 'Indemnité transport', amount: 1500 }
      ],
      totalBonuses: 4500,
      deductions: [
        { id: 'D3', type: 'TAX', description: 'Impôt sur le revenu (8%)', amount: 2240 },
        { id: 'D4', type: 'ADVANCE', description: 'Avance sur salaire', amount: 5000 }
      ],
      totalDeductions: 7240,
      grossSalary: 33900,
      netSalary: 26660,
      paymentMethod: 'BANK_TRANSFER',
      bankAccount: 'BNC-001234568',
      status: 'APPROVED'
    },
    {
      id: 'PI003',
      employeeId: 'EMP003',
      employeeCode: 'EMP-2024-003',
      employeeName: 'Pierre Louis',
      position: 'Caissier',
      branch: 'Cap-Haïtien',
      baseSalary: 22000,
      overtimeHours: 12,
      overtimeAmount: 1650,
      bonuses: [
        { id: 'B5', type: 'TRANSPORT', description: 'Indemnité transport', amount: 1200 }
      ],
      totalBonuses: 1200,
      deductions: [
        { id: 'D5', type: 'TAX', description: 'Impôt sur le revenu (7%)', amount: 1540 }
      ],
      totalDeductions: 1540,
      grossSalary: 24850,
      netSalary: 23310,
      paymentMethod: 'MOBILE_MONEY',
      mobileNumber: '+509 3734 5678',
      status: 'APPROVED'
    },
    {
      id: 'PI004',
      employeeId: 'EMP004',
      employeeCode: 'EMP-2024-004',
      employeeName: 'Claudette François',
      position: 'Responsable RH',
      branch: 'Port-au-Prince Centre',
      baseSalary: 35000,
      overtimeHours: 0,
      overtimeAmount: 0,
      bonuses: [
        { id: 'B6', type: 'TRANSPORT', description: 'Indemnité transport', amount: 1800 }
      ],
      totalBonuses: 1800,
      deductions: [
        { id: 'D6', type: 'TAX', description: 'Impôt sur le revenu (9%)', amount: 3150 },
        { id: 'D7', type: 'PENSION', description: 'Cotisation retraite (3%)', amount: 1050 }
      ],
      totalDeductions: 4200,
      grossSalary: 36800,
      netSalary: 32600,
      paymentMethod: 'BANK_TRANSFER',
      bankAccount: 'BNC-001234569',
      status: 'PENDING'
    },
    {
      id: 'PI005',
      employeeId: 'EMP005',
      employeeCode: 'EMP-2024-005',
      employeeName: 'Jacques Hyppolite',
      position: 'Agent de Sécurité',
      branch: 'Les Cayes',
      baseSalary: 18000,
      overtimeHours: 16,
      overtimeAmount: 1800,
      bonuses: [
        { id: 'B7', type: 'ATTENDANCE', description: 'Prime assiduité', amount: 1000 }
      ],
      totalBonuses: 1000,
      deductions: [
        { id: 'D8', type: 'TAX', description: 'Impôt sur le revenu (6%)', amount: 1080 }
      ],
      totalDeductions: 1080,
      grossSalary: 20800,
      netSalary: 19720,
      paymentMethod: 'CASH',
      status: 'PENDING'
    },
    {
      id: 'PI006',
      employeeId: 'EMP006',
      employeeCode: 'EMP-2024-006',
      employeeName: 'Rose Marie Pierre',
      position: 'Agent de Crédit',
      branch: 'Gonaïves',
      baseSalary: 26000,
      overtimeHours: 6,
      overtimeAmount: 975,
      bonuses: [
        { id: 'B8', type: 'PERFORMANCE', description: 'Commission sur prêts', amount: 2500 }
      ],
      totalBonuses: 2500,
      deductions: [
        { id: 'D9', type: 'TAX', description: 'Impôt sur le revenu (8%)', amount: 2080 }
      ],
      totalDeductions: 2080,
      grossSalary: 29475,
      netSalary: 27395,
      paymentMethod: 'BANK_TRANSFER',
      bankAccount: 'BNC-001234570',
      status: 'PENDING'
    },
    {
      id: 'PI007',
      employeeId: 'EMP007',
      employeeCode: 'EMP-2024-007',
      employeeName: 'Paul Léon',
      position: 'Informaticien',
      branch: 'Port-au-Prince Centre',
      baseSalary: 40000,
      overtimeHours: 10,
      overtimeAmount: 2500,
      bonuses: [
        { id: 'B9', type: 'TRANSPORT', description: 'Indemnité transport', amount: 2000 }
      ],
      totalBonuses: 2000,
      deductions: [
        { id: 'D10', type: 'TAX', description: 'Impôt sur le revenu (10%)', amount: 4000 },
        { id: 'D11', type: 'PENSION', description: 'Cotisation retraite (3%)', amount: 1200 }
      ],
      totalDeductions: 5200,
      grossSalary: 44500,
      netSalary: 39300,
      paymentMethod: 'BANK_TRANSFER',
      bankAccount: 'BNC-001234571',
      status: 'PENDING'
    },
    {
      id: 'PI008',
      employeeId: 'EMP008',
      employeeCode: 'EMP-2024-008',
      employeeName: 'Anne Joseph',
      position: 'Comptable',
      branch: 'Port-au-Prince Centre',
      baseSalary: 32000,
      overtimeHours: 4,
      overtimeAmount: 800,
      bonuses: [
        { id: 'B10', type: 'TRANSPORT', description: 'Indemnité transport', amount: 1600 }
      ],
      totalBonuses: 1600,
      deductions: [
        { id: 'D12', type: 'TAX', description: 'Impôt sur le revenu (9%)', amount: 2880 },
        { id: 'D13', type: 'INSURANCE', description: 'Assurance santé', amount: 1000 }
      ],
      totalDeductions: 3880,
      grossSalary: 34400,
      netSalary: 30520,
      paymentMethod: 'BANK_TRANSFER',
      bankAccount: 'BNC-001234572',
      status: 'PENDING'
    }
  ]);

  // Branches
  const branches = [
    { id: 'BR001', name: 'Port-au-Prince Centre' },
    { id: 'BR002', name: 'Cap-Haïtien' },
    { id: 'BR003', name: 'Les Cayes' },
    { id: 'BR004', name: 'Gonaïves' }
  ];

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-HT').format(amount) + ' HTG';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PAID': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'APPROVED': return 'Approuvé';
      case 'PAID': return 'Payé';
      default: return status;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH': return 'Espèces';
      case 'BANK_TRANSFER': return 'Virement';
      case 'MOBILE_MONEY': return 'Mobile Money';
      default: return method;
    }
  };

  const getBonusTypeLabel = (type: string) => {
    switch (type) {
      case 'PERFORMANCE': return 'Performance';
      case 'ATTENDANCE': return 'Assiduité';
      case 'TRANSPORT': return 'Transport';
      case 'MEAL': return 'Repas';
      case 'OTHER': return 'Autre';
      default: return type;
    }
  };

  const getDeductionTypeLabel = (type: string) => {
    switch (type) {
      case 'TAX': return 'Impôt';
      case 'INSURANCE': return 'Assurance';
      case 'ADVANCE': return 'Avance';
      case 'LOAN': return 'Prêt';
      case 'PENSION': return 'Retraite';
      case 'OTHER': return 'Autre';
      default: return type;
    }
  };

  // Filter payroll items
  const filteredItems = payrollItems.filter(item => {
    const matchesSearch = 
      (item.employeeName && item.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.employeeCode && item.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.position && item.position.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesBranch = filterBranch === 'ALL' || item.branch === filterBranch;
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;

    return matchesSearch && matchesBranch && matchesStatus;
  });

  // Calculate totals
  const totals = {
    employees: filteredItems.length,
    grossSalary: filteredItems.reduce((sum, item) => sum + item.grossSalary, 0),
    totalDeductions: filteredItems.reduce((sum, item) => sum + item.totalDeductions, 0),
    netSalary: filteredItems.reduce((sum, item) => sum + item.netSalary, 0)
  };

  // Handlers
  const handleApproveAll = () => {
    if (window.confirm('Approuver toutes les paies en attente?')) {
      toast.success('Toutes les paies ont été approuvées');
    }
  };

  const handleProcessPayment = () => {
    if (window.confirm('Traiter les paiements pour toutes les paies approuvées?')) {
      toast.success('Les paiements ont été traités avec succès');
    }
  };

  const handleGeneratePayslips = () => {
    toast.success('Bulletins de paie générés avec succès');
  };

  const handleExportPayroll = () => {
    toast.success('Export en cours...');
  };

  const handlePrintPayslip = (item: PayrollItem) => {
    toast.success(`Impression du bulletin de paie pour ${item.employeeName}`);
  };

  const handleApproveItem = (item: PayrollItem) => {
    toast.success(`Paie approuvée pour ${item.employeeName}`);
  };

  const handleRejectItem = (item: PayrollItem) => {
    if (window.confirm(`Rejeter la paie de ${item.employeeName}?`)) {
      toast.success('Paie rejetée');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Traitement de la Paie</h1>
          <p className="text-gray-600 mt-1">
            Période: Octobre 2024 (01/10/2024 - 31/10/2024)
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGeneratePayslips}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-5 h-5" />
            Bulletins de Paie
          </button>
          <button
            onClick={handleExportPayroll}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            Exporter
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Employés</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{currentPeriod.totalEmployees}</p>
              <p className="text-sm text-blue-600 mt-1">À payer</p>
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
                {formatCurrency(currentPeriod.totalGross / 1000)}K
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
                {formatCurrency(currentPeriod.totalDeductions / 1000)}K
              </p>
              <p className="text-sm text-orange-600 mt-1">Total retenues</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Minus className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Salaire Net</p>
              <p className="text-2xl font-bold text-indigo-900 mt-1">
                {formatCurrency(currentPeriod.totalNet / 1000)}K
              </p>
              <p className="text-sm text-indigo-600 mt-1">À décaisser</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <DollarSign className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-indigo-600" />
          <div>
            <p className="font-medium text-gray-900">Paie calculée et prête</p>
            <p className="text-sm text-gray-600">
              {payrollItems.filter(i => i.status === 'APPROVED').length} approuvés, {' '}
              {payrollItems.filter(i => i.status === 'PENDING').length} en attente
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleApproveAll}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Check className="w-5 h-5" />
            Approuver Tout
          </button>
          <button
            onClick={handleProcessPayment}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <DollarSign className="w-5 h-5" />
            Traiter Paiements
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un employé..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Branch Filter */}
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="ALL">Toutes les succursales</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.name}>{branch.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Approuvés</option>
            <option value="PAID">Payés</option>
          </select>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Succursale
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salaire Base
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Heures Sup.
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Primes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Déductions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net à Payer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.employeeName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.employeeCode}
                      </div>
                      <div className="text-xs text-gray-400">
                        {item.position}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.branch}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(item.baseSalary)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {item.overtimeHours}h
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(item.overtimeAmount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-green-600">
                      +{formatCurrency(item.totalBonuses)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.bonuses.length} prime(s)
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-bold text-gray-900">
                      {formatCurrency(item.grossSalary)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-red-600">
                      -{formatCurrency(item.totalDeductions)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.deductions.length} déduction(s)
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-base font-bold text-indigo-600">
                      {formatCurrency(item.netSalary)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getPaymentMethodLabel(item.paymentMethod)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {item.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApproveItem(item)}
                            className="text-green-600 hover:text-green-900"
                            title="Approuver"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleRejectItem(item)}
                            className="text-red-600 hover:text-red-900"
                            title="Rejeter"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handlePrintPayslip(item)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Imprimer bulletin"
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td colSpan={5} className="px-6 py-4 text-right font-bold text-gray-900">
                  TOTAUX ({totals.employees} employés):
                </td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">
                  {formatCurrency(totals.grossSalary)}
                </td>
                <td className="px-6 py-4 text-right font-bold text-red-600">
                  -{formatCurrency(totals.totalDeductions)}
                </td>
                <td className="px-6 py-4 text-right font-bold text-indigo-900 text-lg">
                  {formatCurrency(totals.netSalary)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600 text-center">
        Affichage de {filteredItems.length} sur {payrollItems.length} employé(s)
      </div>
    </div>
  );
};

export default PayrollProcessing;
