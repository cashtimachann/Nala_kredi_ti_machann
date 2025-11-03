import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Download, Eye, Calendar, DollarSign,
  TrendingUp, Clock, AlertTriangle, CheckCircle, XCircle,
  Users, FileText, BarChart3, CreditCard, RefreshCw, Percent
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoanApplicationForm from './LoanApplicationForm';
import LoanApprovalWorkflow from './LoanApprovalWorkflow';
import LoanDetails from './LoanDetails';
import LoanReports from './LoanReports';

// Types
type LoanType = 'COMMERCIAL' | 'AGRICULTURAL' | 'PERSONAL' | 'EMERGENCY';
type LoanStatus = 'PENDING' | 'APPROVED' | 'DISBURSED' | 'ACTIVE' | 'OVERDUE' | 'PAID' | 'REJECTED';

interface Loan {
  id: string;
  loanNumber: string;
  customerId: string;
  customerCode?: string;
  customerName: string;
  loanType: LoanType;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  disbursementDate: string;
  maturityDate: string;
  remainingBalance: number;
  paidAmount: number;
  status: LoanStatus;
  currency: 'HTG' | 'USD';
  collateral?: string;
  guarantors?: string[];
  branch: string;
  loanOfficer: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  daysOverdue?: number;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
}

interface LoanStats {
  totalClients: number;
  activeLoans: number;
  totalOutstanding: { HTG: number; USD: number };
  repaymentRate: number;
  overdueLoans: { count: number; amount: { HTG: number; USD: number } };
  interestRevenue: { HTG: number; USD: number };
  loansCompletedThisMonth: number;
  newLoansThisMonth: number;
}

const LoanManagement: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([]);
  const [stats, setStats] = useState<LoanStats>({
    totalClients: 0,
    activeLoans: 0,
    totalOutstanding: { HTG: 0, USD: 0 },
    repaymentRate: 0,
    overdueLoans: { count: 0, amount: { HTG: 0, USD: 0 } },
    interestRevenue: { HTG: 0, USD: 0 },
    loansCompletedThisMonth: 0,
    newLoansThisMonth: 0
  });
  const [loading, setLoading] = useState(true);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showApprovalWorkflow, setShowApprovalWorkflow] = useState(false);
  const [showReports, setShowReports] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LoanStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | LoanType>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'HTG' | 'USD'>('ALL');

  useEffect(() => {
    loadLoans();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [loans, searchTerm, statusFilter, typeFilter, currencyFilter]);

  const loadLoans = async () => {
    try {
      setLoading(true);
      
      // Load dashboard statistics
      const statsResponse = await fetch('/api/MicrocreditLoan/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats({
          totalClients: statsData.totalClients,
          activeLoans: statsData.activeLoans,
          totalOutstanding: statsData.totalOutstanding,
          repaymentRate: statsData.repaymentRate,
          overdueLoans: statsData.overdueLoans,
          interestRevenue: statsData.interestRevenue,
          loansCompletedThisMonth: statsData.loansCompletedThisMonth,
          newLoansThisMonth: statsData.newLoansThisMonth
        });
      } else {
        // Fallback to demo data if API fails
        console.warn('Failed to load dashboard stats, using demo data');
        setStats({
          totalClients: 247,
          activeLoans: 89,
          totalOutstanding: { HTG: 2850000, USD: 45600 },
          repaymentRate: 92.3,
          overdueLoans: { count: 5, amount: { HTG: 125000, USD: 2100 } },
          interestRevenue: { HTG: 485000, USD: 7800 },
          loansCompletedThisMonth: 12,
          newLoansThisMonth: 18
        });
      }

      // Load loans list
      const loansResponse = await fetch('/api/MicrocreditLoan', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (loansResponse.ok) {
        const loansData = await loansResponse.json();
        setLoans(loansData.loans || []);
      } else {
        // Demo data fallback
        const demoLoans: Loan[] = [
          {
            id: '1',
            loanNumber: 'MC-2025-0001',
            customerId: 'C001',
            customerName: 'Jean Baptiste',
            loanType: 'COMMERCIAL',
            principalAmount: 100000,
            interestRate: 18,
            termMonths: 12,
            monthlyPayment: 9168,
            disbursementDate: '2025-01-15',
            maturityDate: '2026-01-15',
            remainingBalance: 85000,
            paidAmount: 15000,
            status: 'ACTIVE',
            currency: 'HTG',
            collateral: 'Stock de marchandises (valeur 150,000 HTG)',
            guarantors: ['Marie Claire', 'Pierre Louis'],
            branch: 'Port-au-Prince',
            loanOfficer: 'Sophie Martin',
            createdAt: '2025-01-10T10:00:00',
            approvedBy: 'Admin',
            approvedAt: '2025-01-14T15:30:00',
            nextPaymentDate: '2025-11-15',
            nextPaymentAmount: 9168
          },
          {
            id: '2',
            loanNumber: 'MC-2025-0002',
            customerId: 'C002',
            customerName: 'Marie Jeanne',
            loanType: 'AGRICULTURAL',
            principalAmount: 2000,
            interestRate: 15,
            termMonths: 6,
            monthlyPayment: 350,
            disbursementDate: '2025-05-01',
            maturityDate: '2025-11-01',
            remainingBalance: 1200,
            paidAmount: 800,
            status: 'ACTIVE',
            currency: 'USD',
            collateral: 'Récolte future (1 hectare de maïs)',
            guarantors: ['Cooperative Agricole'],
            branch: 'Gonaïves',
            loanOfficer: 'Jacques Dubois',
            createdAt: '2025-04-20T09:00:00',
            approvedBy: 'Regional Manager',
            approvedAt: '2025-04-28T14:00:00',
            nextPaymentDate: '2025-11-01',
            nextPaymentAmount: 350
          },
          {
            id: '3',
            loanNumber: 'MC-2025-0003',
            customerId: 'C003',
            customerName: 'Paul Léon',
            loanType: 'PERSONAL',
            principalAmount: 50000,
            interestRate: 20,
            termMonths: 18,
            monthlyPayment: 3222,
            disbursementDate: '2024-08-01',
            maturityDate: '2026-02-01',
            remainingBalance: 45000,
            paidAmount: 5000,
            status: 'OVERDUE',
            currency: 'HTG',
            collateral: 'Titre de propriété (maison)',
            guarantors: ['Frère - André Léon', 'Cousin - Marc Jeune'],
            branch: 'Cap-Haïtien',
            loanOfficer: 'Claire Benoît',
            createdAt: '2024-07-15T11:00:00',
            approvedBy: 'Branch Supervisor',
            approvedAt: '2024-07-28T16:00:00',
            daysOverdue: 15,
            nextPaymentDate: '2025-10-01',
            nextPaymentAmount: 3222
          },
          {
            id: '4',
            loanNumber: 'MC-2025-0004',
            customerId: 'C004',
            customerName: 'Roseline Auguste',
            loanType: 'EMERGENCY',
            principalAmount: 300,
            interestRate: 22,
            termMonths: 3,
            monthlyPayment: 105,
            disbursementDate: '2025-09-10',
            maturityDate: '2025-12-10',
            remainingBalance: 210,
            paidAmount: 90,
            status: 'ACTIVE',
            currency: 'USD',
            collateral: 'Aucun',
            guarantors: ['Voisin - Robert Jean'],
            branch: 'Les Cayes',
            loanOfficer: 'Michel François',
            createdAt: '2025-09-08T08:00:00',
            approvedBy: 'Admin',
            approvedAt: '2025-09-09T10:00:00',
            nextPaymentDate: '2025-11-10',
            nextPaymentAmount: 105
          }
        ];
        setLoans(demoLoans);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading loans:', error);
      toast.error('Erreur lors du chargement des prêts');
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...loans];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(loan =>
        loan.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.loanNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(loan => loan.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(loan => loan.loanType === typeFilter);
    }

    // Currency filter
    if (currencyFilter !== 'ALL') {
      filtered = filtered.filter(loan => loan.currency === currencyFilter);
    }

    setFilteredLoans(filtered);
  };

  const formatCurrency = (amount: number, currency: 'HTG' | 'USD') => {
    if (currency === 'HTG') {
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount) + ' HTG';
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getLoanTypeLabel = (type: LoanType) => {
    const labels = {
      COMMERCIAL: 'Commercial',
      AGRICULTURAL: 'Agricole',
      PERSONAL: 'Personnel',
      EMERGENCY: 'Urgence'
    };
    return labels[type];
  };

  const getLoanTypeBadge = (type: LoanType) => {
    const badges = {
      COMMERCIAL: { color: 'bg-blue-100 text-blue-800', icon: '🏪' },
      AGRICULTURAL: { color: 'bg-green-100 text-green-800', icon: '🌾' },
      PERSONAL: { color: 'bg-purple-100 text-purple-800', icon: '👤' },
      EMERGENCY: { color: 'bg-red-100 text-red-800', icon: '🚨' }
    };

    const badge = badges[type];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color} flex items-center gap-1`}>
        <span>{badge.icon}</span>
        {getLoanTypeLabel(type)}
      </span>
    );
  };

  const getStatusBadge = (status: LoanStatus) => {
    const badges = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', label: 'En attente', icon: Clock },
      APPROVED: { color: 'bg-blue-100 text-blue-800', label: 'Approuvé', icon: CheckCircle },
      DISBURSED: { color: 'bg-indigo-100 text-indigo-800', label: 'Décaissé', icon: DollarSign },
      ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Actif', icon: CheckCircle },
      OVERDUE: { color: 'bg-red-100 text-red-800', label: 'En retard', icon: AlertTriangle },
      PAID: { color: 'bg-gray-100 text-gray-800', label: 'Soldé', icon: CheckCircle },
      REJECTED: { color: 'bg-gray-100 text-gray-800', label: 'Rejeté', icon: XCircle }
    };

    const badge = badges[status];
    const Icon = badge.icon;
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const handleViewDetails = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowDetails(true);
  };

  const handleApproval = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowApprovalWorkflow(true);
  };

  const handleApproveLoan = (applicationId: string, level: number, comment: string) => {
    console.log('Approving loan:', applicationId, 'at level:', level, 'comment:', comment);
    // TODO: Call API to approve
    toast.success('Demande approuvée avec succès!');
    setShowApprovalWorkflow(false);
    loadLoans();
  };

  const handleRejectLoan = (applicationId: string, level: number, reason: string) => {
    console.log('Rejecting loan:', applicationId, 'at level:', level, 'reason:', reason);
    // TODO: Call API to reject
    toast.error('Demande rejetée');
    setShowApprovalWorkflow(false);
    loadLoans();
  };

  const handleNewApplication = () => {
    setShowApplicationForm(true);
  };

  const handleExport = () => {
    toast.success('Export en cours...');
    // TODO: Implement export functionality
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Microcrédits</h1>
          <p className="text-gray-600 mt-1">Portefeuille de prêts et remboursements</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowReports(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            Rapports
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            Exporter
          </button>
          <button
            onClick={handleNewApplication}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouvelle Demande
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Nombre total de clients */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.totalClients.toLocaleString()}</span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Total Clients</h3>
          <p className="text-xs text-gray-500 mt-1">Emprunteurs enregistrés</p>
        </div>

        {/* 2. Nombre de crédits actifs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.activeLoans}</span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Crédits Actifs</h3>
          <p className="text-xs text-gray-500 mt-1">Prêts en cours</p>
        </div>

        {/* 3. Montant total des crédits en cours */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalOutstanding.HTG, 'HTG')}</p>
              <p className="text-sm font-semibold text-gray-600">{formatCurrency(stats.totalOutstanding.USD, 'USD')}</p>
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Capital Restant</h3>
          <p className="text-xs text-gray-500 mt-1">Encours total</p>
        </div>

        {/* 4. Taux de remboursement global (%) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Percent className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{stats.repaymentRate}%</p>
              <p className="text-sm text-gray-600">Taux global</p>
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Taux Remboursement</h3>
          <p className="text-xs text-gray-500 mt-1">Performance globale</p>
        </div>

        {/* 5. Crédits en retard (nombre + montant) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-600">{stats.overdueLoans.count}</p>
              <p className="text-sm text-gray-600">prêts en retard</p>
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Crédits en Retard</h3>
          <div className="text-xs text-gray-500 mt-1">
            <p>{formatCurrency(stats.overdueLoans.amount.HTG, 'HTG')}</p>
            <p>{formatCurrency(stats.overdueLoans.amount.USD, 'USD')}</p>
          </div>
        </div>

        {/* 6. Revenus générés (intérêts perçus) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats.interestRevenue.HTG, 'HTG')}</p>
              <p className="text-sm font-semibold text-gray-600">{formatCurrency(stats.interestRevenue.USD, 'USD')}</p>
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Revenus Intérêts</h3>
          <p className="text-xs text-gray-500 mt-1">Intérêts perçus</p>
        </div>

        {/* 7. Crédits remboursés ce mois */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-cyan-600" />
            </div>
            <span className="text-2xl font-bold text-cyan-600">{stats.loansCompletedThisMonth}</span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Remboursés ce Mois</h3>
          <p className="text-xs text-gray-500 mt-1">Prêts soldés</p>
        </div>

        {/* 8. Nouveaux crédits ce mois */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Plus className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-orange-600">{stats.newLoansThisMonth}</span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Nouveaux Crédits</h3>
          <p className="text-xs text-gray-500 mt-1">Ce mois</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Approuvé</option>
            <option value="ACTIVE">Actif</option>
            <option value="OVERDUE">En retard</option>
            <option value="PAID">Soldé</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="ALL">Tous les types</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="AGRICULTURAL">Agricole</option>
            <option value="PERSONAL">Personnel</option>
            <option value="EMERGENCY">Urgence</option>
          </select>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="ALL">Toutes devises</option>
            <option value="HTG">HTG</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>{filteredLoans.length} prêt(s) trouvé(s)</span>
          {(searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL' || currencyFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setCurrencyFilter('ALL');
              }}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prêt
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mensualité
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restant
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prochain Paiement
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <CreditCard className="w-12 h-12 mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Aucun prêt trouvé</p>
                      <p className="text-sm mt-2">Modifiez vos filtres ou créez une nouvelle demande</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{loan.loanNumber}</p>
                        <p className="text-xs text-gray-500">{loan.branch}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">{loan.customerName}</p>
                      <p className="text-xs text-gray-500">Agent: {loan.loanOfficer}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getLoanTypeBadge(loan.loanType)}
                      <p className="text-xs text-gray-500 mt-1">{loan.termMonths} mois · {loan.interestRate}%</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(loan.principalAmount, loan.currency)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-blue-600">
                        {formatCurrency(loan.monthlyPayment, loan.currency)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-semibold text-purple-600">
                          {formatCurrency(loan.remainingBalance, loan.currency)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Payé: {formatCurrency(loan.paidAmount, loan.currency)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {loan.nextPaymentDate && (
                        <div>
                          <p className="text-sm text-gray-900">{formatDate(loan.nextPaymentDate)}</p>
                          <p className="text-xs font-medium text-green-600">
                            {formatCurrency(loan.nextPaymentAmount || 0, loan.currency)}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {getStatusBadge(loan.status)}
                        {loan.status === 'OVERDUE' && loan.daysOverdue && (
                          <p className="text-xs text-red-600 font-medium">
                            {loan.daysOverdue} jours de retard
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(loan)}
                          className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Détails
                        </button>
                        {loan.status === 'PENDING' && (
                          <button
                            onClick={() => handleApproval(loan)}
                            className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approuver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application Form Modal */}
      {showApplicationForm && (
        <LoanApplicationForm
          onSubmit={(data) => {
            console.log('Loan application submitted:', data);
            // TODO: Call API
            toast.success('Demande de crédit soumise avec succès!');
            setShowApplicationForm(false);
            loadLoans();
          }}
          onCancel={() => setShowApplicationForm(false)}
        />
      )}

      {/* Details Modal */}
      {showDetails && selectedLoan && (
        <LoanDetails
          loan={selectedLoan}
          onClose={() => setShowDetails(false)}
          onRecordPayment={() => {
            // Refresh loan list after payment
            loadLoans();
          }}
        />
      )}

      {/* Approval Workflow Modal */}
      {showApprovalWorkflow && selectedLoan && (
        <LoanApprovalWorkflow
          application={{
            id: selectedLoan.id,
            loanNumber: selectedLoan.loanNumber,
            loanType: selectedLoan.loanType,
            customerId: selectedLoan.customerId,
            customerName: selectedLoan.customerName,
            phone: '509-XXXX-XXXX', // TODO: Get from customer data
            email: undefined,
            address: 'Port-au-Prince', // TODO: Get from customer data
            occupation: 'Commerçant', // TODO: Get from customer data
            monthlyIncome: 50000, // TODO: Get from customer data
            dependents: 2, // TODO: Get from customer data
            requestedAmount: selectedLoan.principalAmount,
            currency: selectedLoan.currency,
            termMonths: selectedLoan.termMonths,
            interestRate: selectedLoan.interestRate,
            monthlyPayment: selectedLoan.monthlyPayment,
            purpose: 'Financement activité commerciale', // TODO: Get from application data
            collateralType: selectedLoan.collateral,
            collateralValue: selectedLoan.principalAmount * 1.3, // TODO: Get from application data
            collateralDescription: 'Garantie fournie', // TODO: Get from application data
            guarantor1Name: selectedLoan.guarantors?.[0],
            guarantor1Phone: '509-XXXX-XXXX',
            guarantor1Relation: 'FAMILY',
            guarantor2Name: selectedLoan.guarantors?.[1],
            guarantor2Phone: '509-YYYY-YYYY',
            guarantor2Relation: 'FRIEND',
            submittedDate: selectedLoan.createdAt,
            status: selectedLoan.status as 'PENDING' | 'APPROVED' | 'REJECTED',
            currentApprovalLevel: 1, // TODO: Get from workflow data
            branchId: selectedLoan.branch
          }}
          onClose={() => setShowApprovalWorkflow(false)}
          onApprove={handleApproveLoan}
          onReject={handleRejectLoan}
        />
      )}

      {/* Reports Modal */}
      {showReports && (
        <LoanReports
          onClose={() => setShowReports(false)}
        />
      )}
    </div>
  );
};

export default LoanManagement;
