import React, { useState } from 'react';
import {
  DollarSign,
  Calendar,
  User,
  FileText,
  Search,
  Filter,
  Check,
  X,
  Clock,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  Plus,
  Eye,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';

// Types
interface SalaryAdvance {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  position: string;
  branch: string;
  baseSalary: number;
  requestDate: string;
  requestedAmount: number;
  approvedAmount?: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'DEDUCTED';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  paymentDate?: string;
  deductionMonths: number;
  monthlyDeduction: number;
  remainingBalance: number;
  deductions: AdvanceDeduction[];
}

interface AdvanceDeduction {
  id: string;
  month: string;
  year: number;
  amount: number;
  deductedAt: string;
}

interface AdvanceRequest {
  employeeId: string;
  requestedAmount: number;
  reason: string;
  deductionMonths: number;
}

interface SalaryAdvanceProps {
  onClose?: () => void;
}

const SalaryAdvance: React.FC<SalaryAdvanceProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterBranch, setFilterBranch] = useState<string>('ALL');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<SalaryAdvance | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdvanceRequest>();

  // Demo data
  const [advances] = useState<SalaryAdvance[]>([
    {
      id: 'ADV001',
      employeeId: 'EMP002',
      employeeCode: 'EMP-2024-002',
      employeeName: 'Marie Dupont',
      position: 'Agent de Crédit',
      branch: 'Port-au-Prince Centre',
      baseSalary: 28000,
      requestDate: '2024-10-05',
      requestedAmount: 10000,
      approvedAmount: 10000,
      reason: 'Frais médicaux urgents',
      status: 'DEDUCTED',
      approvedBy: 'Jean Baptiste',
      approvedAt: '2024-10-06',
      paymentDate: '2024-10-07',
      deductionMonths: 2,
      monthlyDeduction: 5000,
      remainingBalance: 0,
      deductions: [
        {
          id: 'DED001',
          month: 'Octobre',
          year: 2024,
          amount: 5000,
          deductedAt: '2024-10-31'
        },
        {
          id: 'DED002',
          month: 'Septembre',
          year: 2024,
          amount: 5000,
          deductedAt: '2024-09-30'
        }
      ]
    },
    {
      id: 'ADV002',
      employeeId: 'EMP003',
      employeeCode: 'EMP-2024-003',
      employeeName: 'Pierre Louis',
      position: 'Caissier',
      branch: 'Cap-Haïtien',
      baseSalary: 22000,
      requestDate: '2024-10-10',
      requestedAmount: 8000,
      approvedAmount: 8000,
      reason: 'Frais de scolarité',
      status: 'PAID',
      approvedBy: 'Jean Baptiste',
      approvedAt: '2024-10-11',
      paymentDate: '2024-10-12',
      deductionMonths: 2,
      monthlyDeduction: 4000,
      remainingBalance: 8000,
      deductions: []
    },
    {
      id: 'ADV003',
      employeeId: 'EMP006',
      employeeCode: 'EMP-2024-006',
      employeeName: 'Rose Marie Pierre',
      position: 'Agent de Crédit',
      branch: 'Gonaïves',
      baseSalary: 26000,
      requestDate: '2024-10-12',
      requestedAmount: 12000,
      approvedAmount: 10000,
      reason: 'Réparation véhicule',
      status: 'APPROVED',
      approvedBy: 'Claudette François',
      approvedAt: '2024-10-13',
      deductionMonths: 3,
      monthlyDeduction: 3334,
      remainingBalance: 10000,
      deductions: []
    },
    {
      id: 'ADV004',
      employeeId: 'EMP005',
      employeeCode: 'EMP-2024-005',
      employeeName: 'Jacques Hyppolite',
      position: 'Agent de Sécurité',
      branch: 'Les Cayes',
      baseSalary: 18000,
      requestDate: '2024-10-14',
      requestedAmount: 6000,
      reason: 'Urgence familiale',
      status: 'PENDING',
      deductionMonths: 2,
      monthlyDeduction: 3000,
      remainingBalance: 6000,
      deductions: []
    },
    {
      id: 'ADV005',
      employeeId: 'EMP008',
      employeeCode: 'EMP-2024-008',
      employeeName: 'Anne Joseph',
      position: 'Comptable',
      branch: 'Port-au-Prince Centre',
      baseSalary: 32000,
      requestDate: '2024-10-15',
      requestedAmount: 15000,
      reason: 'Achat équipement informatique',
      status: 'PENDING',
      deductionMonths: 3,
      monthlyDeduction: 5000,
      remainingBalance: 15000,
      deductions: []
    },
    {
      id: 'ADV006',
      employeeId: 'EMP007',
      employeeCode: 'EMP-2024-007',
      employeeName: 'Paul Léon',
      position: 'Informaticien',
      branch: 'Port-au-Prince Centre',
      baseSalary: 40000,
      requestDate: '2024-09-28',
      requestedAmount: 10000,
      approvedAmount: 10000,
      reason: 'Frais médicaux',
      status: 'REJECTED',
      rejectionReason: 'Dépassement du plafond autorisé (40% du salaire)',
      deductionMonths: 2,
      monthlyDeduction: 5000,
      remainingBalance: 10000,
      deductions: []
    }
  ]);

  // Demo employees for request form
  const employees = [
    { id: 'EMP001', code: 'EMP-2024-001', name: 'Jean Baptiste', baseSalary: 45000 },
    { id: 'EMP002', code: 'EMP-2024-002', name: 'Marie Dupont', baseSalary: 28000 },
    { id: 'EMP003', code: 'EMP-2024-003', name: 'Pierre Louis', baseSalary: 22000 },
    { id: 'EMP004', code: 'EMP-2024-004', name: 'Claudette François', baseSalary: 35000 },
    { id: 'EMP005', code: 'EMP-2024-005', name: 'Jacques Hyppolite', baseSalary: 18000 },
    { id: 'EMP006', code: 'EMP-2024-006', name: 'Rose Marie Pierre', baseSalary: 26000 },
    { id: 'EMP007', code: 'EMP-2024-007', name: 'Paul Léon', baseSalary: 40000 },
    { id: 'EMP008', code: 'EMP-2024-008', name: 'Anne Joseph', baseSalary: 32000 }
  ];

  // Branches
  const branches = [
    { id: 'BR001', name: 'Port-au-Prince Centre' },
    { id: 'BR002', name: 'Cap-Haïtien' },
    { id: 'BR003', name: 'Les Cayes' },
    { id: 'BR004', name: 'Gonaïves' }
  ];

  // Statistics
  const stats = {
    totalRequests: advances.length,
    pendingRequests: advances.filter(a => a.status === 'PENDING').length,
    totalAdvanced: advances.filter(a => a.status !== 'REJECTED').reduce((sum, a) => sum + (a.approvedAmount || 0), 0),
    totalOutstanding: advances.filter(a => a.status === 'PAID').reduce((sum, a) => sum + a.remainingBalance, 0)
  };

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-HT').format(amount) + ' HTG';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'DEDUCTED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'APPROVED': return 'Approuvé';
      case 'REJECTED': return 'Rejeté';
      case 'PAID': return 'Payé';
      case 'DEDUCTED': return 'Déduit';
      default: return status;
    }
  };

  // Filter advances
  const filteredAdvances = advances.filter(advance => {
    const matchesSearch = 
      (advance.employeeName && advance.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (advance.employeeCode && advance.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'ALL' || advance.status === filterStatus;
    const matchesBranch = filterBranch === 'ALL' || advance.branch === filterBranch;

    return matchesSearch && matchesStatus && matchesBranch;
  });

  // Handlers
  const handleRequestAdvance = (data: AdvanceRequest) => {
    console.log('New advance request:', data);
    toast.success('Demande d\'avance soumise avec succès');
    setShowRequestForm(false);
    reset();
  };

  const handleApprove = (advance: SalaryAdvance) => {
    if (window.confirm(`Approuver l'avance de ${formatCurrency(advance.requestedAmount)} pour ${advance.employeeName}?`)) {
      toast.success('Avance approuvée avec succès');
    }
  };

  const handleReject = (advance: SalaryAdvance) => {
    const reason = window.prompt('Raison du rejet:');
    if (reason) {
      toast.success('Avance rejetée');
    }
  };

  const handleProcessPayment = (advance: SalaryAdvance) => {
    if (window.confirm(`Traiter le paiement de ${formatCurrency(advance.approvedAmount || 0)} pour ${advance.employeeName}?`)) {
      toast.success('Paiement traité avec succès');
    }
  };

  const handleViewDetails = (advance: SalaryAdvance) => {
    setSelectedAdvance(advance);
    setShowDetailsModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Avances sur Salaire</h1>
          <p className="text-gray-600 mt-1">Gérez les demandes et déductions d'avances</p>
        </div>
        <button
          onClick={() => setShowRequestForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Demande
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Demandes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalRequests}</p>
              <p className="text-sm text-blue-600 mt-1">Ce mois</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Attente</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.pendingRequests}</p>
              <p className="text-sm text-yellow-600 mt-1">À traiter</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Avancé</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalAdvanced / 1000)}K
              </p>
              <p className="text-sm text-green-600 mt-1">Approuvé</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Solde Restant</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalOutstanding / 1000)}K
              </p>
              <p className="text-sm text-orange-600 mt-1">À déduire</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <TrendingDown className="h-6 w-6 text-orange-600" />
            </div>
          </div>
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
            <option value="REJECTED">Rejetés</option>
            <option value="PAID">Payés</option>
            <option value="DEDUCTED">Déduits</option>
          </select>
        </div>
      </div>

      {/* Advances Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Demande
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant Demandé
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant Approuvé
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Déduction
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Solde Restant
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
              {filteredAdvances.map((advance) => (
                <tr key={advance.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {advance.employeeName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {advance.employeeCode}
                      </div>
                      <div className="text-xs text-gray-400">
                        {advance.position}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(advance.requestDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(advance.requestedAmount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {advance.approvedAmount ? (
                      <div className="text-sm font-medium text-green-600">
                        {formatCurrency(advance.approvedAmount)}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">-</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">
                      {advance.deductionMonths} mois
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(advance.monthlyDeduction)}/mois
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {advance.remainingBalance > 0 ? (
                      <div className="text-sm font-medium text-orange-600">
                        {formatCurrency(advance.remainingBalance)}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">-</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(advance.status)}`}>
                      {getStatusLabel(advance.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {advance.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(advance)}
                            className="text-green-600 hover:text-green-900"
                            title="Approuver"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleReject(advance)}
                            className="text-red-600 hover:text-red-900"
                            title="Rejeter"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {advance.status === 'APPROVED' && (
                        <button
                          onClick={() => handleProcessPayment(advance)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Traiter paiement"
                        >
                          <DollarSign className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleViewDetails(advance)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir détails"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredAdvances.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune avance trouvée</h3>
            <p className="mt-1 text-sm text-gray-500">
              Essayez de modifier vos filtres ou créez une nouvelle demande.
            </p>
          </div>
        )}
      </div>

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Nouvelle Demande d'Avance</h2>
              <p className="text-gray-600 mt-1">Remplissez les informations ci-dessous</p>
            </div>

            <form onSubmit={handleSubmit(handleRequestAdvance)} className="p-6 space-y-6">
              {/* Employee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employé *
                </label>
                <select
                  {...register('employeeId', { required: 'Employé requis' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un employé</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.code} - {emp.name} (Salaire: {formatCurrency(emp.baseSalary)})
                    </option>
                  ))}
                </select>
                {errors.employeeId && (
                  <p className="mt-1 text-sm text-red-600">{errors.employeeId.message}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant Demandé (HTG) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    {...register('requestedAmount', { 
                      required: 'Montant requis',
                      min: { value: 1000, message: 'Montant minimum: 1000 HTG' },
                      max: { value: 50000, message: 'Montant maximum: 50000 HTG' }
                    })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: 10000"
                  />
                </div>
                {errors.requestedAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.requestedAmount.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Maximum: 40% du salaire mensuel de base
                </p>
              </div>

              {/* Deduction months */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de mois pour déduction *
                </label>
                <select
                  {...register('deductionMonths', { required: 'Nombre de mois requis' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Sélectionner</option>
                  <option value="1">1 mois</option>
                  <option value="2">2 mois</option>
                  <option value="3">3 mois</option>
                  <option value="4">4 mois</option>
                  <option value="5">5 mois</option>
                  <option value="6">6 mois</option>
                </select>
                {errors.deductionMonths && (
                  <p className="mt-1 text-sm text-red-600">{errors.deductionMonths.message}</p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison de la demande *
                </label>
                <textarea
                  {...register('reason', { 
                    required: 'Raison requise',
                    minLength: { value: 10, message: 'Minimum 10 caractères' }
                  })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Expliquez la raison de votre demande d'avance..."
                />
                {errors.reason && (
                  <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
                )}
              </div>

              {/* Alert */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Important:</p>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>Le montant sera déduit automatiquement de votre salaire</li>
                    <li>L'avance ne peut pas dépasser 40% de votre salaire de base</li>
                    <li>La demande doit être approuvée par votre supérieur</li>
                  </ul>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestForm(false);
                    reset();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Soumettre la Demande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedAdvance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Détails de l'Avance</h2>
              <p className="text-gray-600 mt-1">ID: {selectedAdvance.id}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Informations Employé</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Nom</p>
                    <p className="font-medium">{selectedAdvance.employeeName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Code</p>
                    <p className="font-medium">{selectedAdvance.employeeCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Poste</p>
                    <p className="font-medium">{selectedAdvance.position}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Succursale</p>
                    <p className="font-medium">{selectedAdvance.branch}</p>
                  </div>
                </div>
              </div>

              {/* Advance Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Date de demande</p>
                  <p className="font-medium">{formatDate(selectedAdvance.requestDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Statut</p>
                  <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${getStatusColor(selectedAdvance.status)}`}>
                    {getStatusLabel(selectedAdvance.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Montant demandé</p>
                  <p className="font-medium">{formatCurrency(selectedAdvance.requestedAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Montant approuvé</p>
                  <p className="font-medium">
                    {selectedAdvance.approvedAmount ? formatCurrency(selectedAdvance.approvedAmount) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Déduction mensuelle</p>
                  <p className="font-medium">{formatCurrency(selectedAdvance.monthlyDeduction)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Solde restant</p>
                  <p className="font-medium text-orange-600">{formatCurrency(selectedAdvance.remainingBalance)}</p>
                </div>
              </div>

              {/* Reason */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Raison</p>
                <p className="bg-gray-50 rounded-lg p-3">{selectedAdvance.reason}</p>
              </div>

              {/* Approval/Rejection Info */}
              {(selectedAdvance.status === 'APPROVED' || selectedAdvance.status === 'PAID' || selectedAdvance.status === 'DEDUCTED') && selectedAdvance.approvedBy && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="font-medium text-green-900">Approuvé par {selectedAdvance.approvedBy}</p>
                  <p className="text-sm text-green-700">Le {formatDate(selectedAdvance.approvedAt!)}</p>
                </div>
              )}

              {selectedAdvance.status === 'REJECTED' && selectedAdvance.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-medium text-red-900">Rejeté</p>
                  <p className="text-sm text-red-700">{selectedAdvance.rejectionReason}</p>
                </div>
              )}

              {/* Deduction History */}
              {selectedAdvance.deductions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Historique des Déductions</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Période</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Montant</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedAdvance.deductions.map(deduction => (
                          <tr key={deduction.id}>
                            <td className="px-4 py-2 text-sm">{deduction.month} {deduction.year}</td>
                            <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(deduction.amount)}</td>
                            <td className="px-4 py-2 text-sm">{formatDate(deduction.deductedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-gray-600 text-center">
        Affichage de {filteredAdvances.length} sur {advances.length} avance(s)
      </div>
    </div>
  );
};

export default SalaryAdvance;
