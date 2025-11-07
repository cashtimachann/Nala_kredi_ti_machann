import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Download, Eye, Calendar, DollarSign,
  TrendingUp, Clock, AlertTriangle, CheckCircle, XCircle,
  Users, FileText, BarChart3, CreditCard, RefreshCw, Percent,
  User, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoanApplicationForm from './LoanApplicationForm';
import LoanApprovalWorkflow from './LoanApprovalWorkflow';
import LoanDetails from './LoanDetails';
import LoanReports from './LoanReports';
import { LoanType, LoanStatus, ApplicationStatus } from '../../types/microcredit';
import { microcreditLoanApplicationService } from '../../services/microcreditLoanApplicationService';

// Types

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
  const [authRequired, setAuthRequired] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showApprovalWorkflow, setShowApprovalWorkflow] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [activeTab, setActiveTab] = useState<'loans' | 'applications'>('loans');
  // Pagination & tri (Applications)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOption, setSortOption] = useState<'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('DATE_DESC');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LoanStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | LoanType>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'HTG' | 'USD'>('ALL');

  useEffect(() => {
    loadLoans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  useEffect(() => {
    applyFilters();
  }, [loans, searchTerm, statusFilter, typeFilter, currencyFilter, activeTab]);

  // Resort when sort option changes
  useEffect(() => {
    setLoans(prev => {
      const sorted = [...prev];
      sorted.sort((a, b) => {
        switch (sortOption) {
          case 'DATE_ASC':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'AMOUNT_DESC':
            return b.principalAmount - a.principalAmount;
          case 'AMOUNT_ASC':
            return a.principalAmount - b.principalAmount;
          case 'DATE_DESC':
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
      return sorted;
    });
  }, [sortOption]);

  const loadLoans = async () => {
    try {
      setLoading(true);
      setAuthRequired(false);
      
      // Charger les demandes de crédit depuis le backend (paginées)
      const page = await microcreditLoanApplicationService.getApplicationsPage({ page: currentPage, pageSize });
      const applications = page.applications;
      
      // Convertir les applications en format Loan pour l'affichage
      const loansData: Loan[] = applications.map(app => {
        // Calculer taux d'intérêt et paiement mensuel basiques
        const interestRate = 2.5; // Taux par défaut, TODO: utiliser calcul depuis backend
        const monthlyPayment = app.requestedAmount * (1 + (interestRate * app.requestedDurationMonths / 100)) / app.requestedDurationMonths;
        
        return {
          id: app.id,
          loanNumber: app.applicationNumber || `APP-${app.id.substring(0, 8)}`,
          customerId: app.borrowerId || '',
          customerCode: app.borrower?.accountNumber,
          customerName: app.borrower 
            ? `${app.borrower.firstName} ${app.borrower.lastName}` 
            : 'Client',
          loanType: app.loanType as LoanType,
          principalAmount: app.requestedAmount,
          interestRate: interestRate,
          termMonths: app.requestedDurationMonths,
          monthlyPayment: monthlyPayment,
          disbursementDate: app.createdAt,
          maturityDate: new Date(new Date(app.createdAt).setMonth(new Date(app.createdAt).getMonth() + app.requestedDurationMonths)).toISOString(),
          remainingBalance: app.requestedAmount, // TODO: calculer depuis paiements
          paidAmount: 0, // TODO: calculer depuis paiements
          status: mapApplicationStatusToLoanStatus(app.status as string),
          currency: app.currency as 'HTG' | 'USD',
          collateral: app.guarantees?.find(g => g.type === 'Collateral')?.description,
          guarantors: app.guarantees?.filter(g => g.type === 'Personal').map(g => g.contactName || g.description) || [],
          branch: app.branchName || 'Principal',
          loanOfficer: app.loanOfficerName || 'Agent',
          createdAt: app.createdAt,
          approvedBy: app.loanOfficerId,
          approvedAt: app.approvedAt
        };
      });
      
      // Appliquer tri sélectionné
      const sorted = [...loansData];
      sorted.sort((a, b) => {
        switch (sortOption) {
          case 'DATE_ASC':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'AMOUNT_DESC':
            return b.principalAmount - a.principalAmount;
          case 'AMOUNT_ASC':
            return a.principalAmount - b.principalAmount;
          case 'DATE_DESC':
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });

      setLoans(sorted);
      setTotalPages(page.totalPages || 1);
      
      // Calculer les statistiques
      const activeLoans = loansData.filter(l => l.status === LoanStatus.ACTIVE);
      const pendingLoans = loansData.filter(l => l.status === LoanStatus.PENDING);
      const overdueLoans = loansData.filter(l => l.status === LoanStatus.OVERDUE);
      
      const totalOutstandingHTG = activeLoans.filter(l => l.currency === 'HTG').reduce((sum, l) => sum + l.remainingBalance, 0);
      const totalOutstandingUSD = activeLoans.filter(l => l.currency === 'USD').reduce((sum, l) => sum + l.remainingBalance, 0);
      
      const overdueAmountHTG = overdueLoans.filter(l => l.currency === 'HTG').reduce((sum, l) => sum + l.remainingBalance, 0);
      const overdueAmountUSD = overdueLoans.filter(l => l.currency === 'USD').reduce((sum, l) => sum + l.remainingBalance, 0);
      
      setStats({
        totalClients: new Set(loansData.map(l => l.customerId)).size,
        activeLoans: activeLoans.length,
        totalOutstanding: { HTG: totalOutstandingHTG, USD: totalOutstandingUSD },
        repaymentRate: 95, // TODO: calculer depuis paiements réels
        overdueLoans: { 
          count: overdueLoans.length, 
          amount: { HTG: overdueAmountHTG, USD: overdueAmountUSD } 
        },
        interestRevenue: { HTG: 0, USD: 0 }, // TODO: calculer depuis paiements
        loansCompletedThisMonth: 0, // TODO: calculer depuis dates
        newLoansThisMonth: pendingLoans.length
      });

      setLoading(false);
    } catch (error: any) {
      console.error('Error loading loans:', error);
      if (error?.message === 'AUTH_REQUIRED') {
        setAuthRequired(true);
        toast.error('Tanpri konekte pou wè lis demann yo');
      } else {
        toast.error('Erreur lors du chargement des prêts');
      }
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...loans];

    // Tab-specific filter: show only APPROVED/ACTIVE loans in "Prêts Actifs" tab
    if (activeTab === 'loans') {
      filtered = filtered.filter(loan => 
        loan.status === LoanStatus.APPROVED || 
        loan.status === LoanStatus.ACTIVE ||
        loan.status === LoanStatus.COMPLETED ||
        loan.status === LoanStatus.OVERDUE ||
        loan.status === LoanStatus.DEFAULTED
      );
    }

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
    const labels: Record<LoanType, string> = {
      [LoanType.COMMERCIAL]: 'Commercial',
      [LoanType.AGRICULTURAL]: 'Agricole',
      [LoanType.PERSONAL]: 'Personnel',
      [LoanType.EMERGENCY]: 'Urgence',
      [LoanType.CREDIT_LOYER]: 'Crédit Loyer',
      [LoanType.CREDIT_AUTO]: 'Crédit Auto',
      [LoanType.CREDIT_MOTO]: 'Crédit Moto',
      [LoanType.CREDIT_PERSONNEL]: 'Crédit Personnel',
      [LoanType.CREDIT_SCOLAIRE]: 'Crédit Scolaire',
      [LoanType.CREDIT_AGRICOLE]: 'Crédit Agricole',
      [LoanType.CREDIT_PROFESSIONNEL]: 'Crédit Professionnel',
      [LoanType.CREDIT_APPUI]: 'Crédit d\'Appui',
      [LoanType.CREDIT_HYPOTHECAIRE]: 'Crédit Hypothécaire'
    };
    return labels[type];
  };

  const getLoanTypeBadge = (type: LoanType) => {
    const badges: Record<LoanType, { color: string; icon: string }> = {
      [LoanType.COMMERCIAL]: { color: 'bg-blue-100 text-blue-800', icon: '🏪' },
      [LoanType.AGRICULTURAL]: { color: 'bg-green-100 text-green-800', icon: '🌾' },
      [LoanType.PERSONAL]: { color: 'bg-purple-100 text-purple-800', icon: '👤' },
      [LoanType.EMERGENCY]: { color: 'bg-red-100 text-red-800', icon: '🚨' },
      [LoanType.CREDIT_LOYER]: { color: 'bg-indigo-100 text-indigo-800', icon: '🏠' },
      [LoanType.CREDIT_AUTO]: { color: 'bg-cyan-100 text-cyan-800', icon: '🚗' },
      [LoanType.CREDIT_MOTO]: { color: 'bg-teal-100 text-teal-800', icon: '🏍️' },
      [LoanType.CREDIT_PERSONNEL]: { color: 'bg-pink-100 text-pink-800', icon: '💳' },
      [LoanType.CREDIT_SCOLAIRE]: { color: 'bg-amber-100 text-amber-800', icon: '📚' },
      [LoanType.CREDIT_AGRICOLE]: { color: 'bg-lime-100 text-lime-800', icon: '🚜' },
      [LoanType.CREDIT_PROFESSIONNEL]: { color: 'bg-violet-100 text-violet-800', icon: '💼' },
      [LoanType.CREDIT_APPUI]: { color: 'bg-orange-100 text-orange-800', icon: '🤝' },
      [LoanType.CREDIT_HYPOTHECAIRE]: { color: 'bg-slate-100 text-slate-800', icon: '🏡' }
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
    const badges: Record<LoanStatus, { color: string; label: string; icon: any }> = {
      [LoanStatus.PENDING]: { color: 'bg-yellow-100 text-yellow-800', label: 'En attente', icon: Clock },
      [LoanStatus.APPROVED]: { color: 'bg-blue-100 text-blue-800', label: 'Approuvé', icon: CheckCircle },
      [LoanStatus.ACTIVE]: { color: 'bg-green-100 text-green-800', label: 'Actif', icon: CheckCircle },
      [LoanStatus.COMPLETED]: { color: 'bg-gray-100 text-gray-800', label: 'Soldé', icon: CheckCircle },
      [LoanStatus.OVERDUE]: { color: 'bg-red-100 text-red-800', label: 'En retard', icon: AlertTriangle },
      [LoanStatus.DEFAULTED]: { color: 'bg-red-200 text-red-900', label: 'En défaut', icon: XCircle },
      [LoanStatus.CANCELLED]: { color: 'bg-gray-100 text-gray-800', label: 'Annulé', icon: XCircle }
    };

    const badge = badges[status] || { color: 'bg-yellow-100 text-yellow-800', label: String(status || 'Inconnu'), icon: Clock };
    const Icon = badge.icon;
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const mapApplicationStatusToLoanStatus = (status: string): LoanStatus => {
    switch (status as ApplicationStatus) {
      case ApplicationStatus.SUBMITTED:
      case ApplicationStatus.UNDER_REVIEW:
      case ApplicationStatus.DRAFT:
        return LoanStatus.PENDING;
      case ApplicationStatus.APPROVED:
        return LoanStatus.APPROVED;
      case ApplicationStatus.REJECTED:
      case ApplicationStatus.CANCELLED:
        return LoanStatus.CANCELLED;
      default:
        return LoanStatus.PENDING;
    }
  };

  const handleViewDetails = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowDetails(true);
  };

  const handleApproval = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowApprovalWorkflow(true);
  };

  const handleApproveLoan = async (applicationId: string, level: number, comment: string) => {
    try {
      // First, check if application needs to be submitted (if it's still Draft)
      const app = loans.find(l => l.id === applicationId);
      if (app?.status === LoanStatus.PENDING) {
        // Try to submit first if not already submitted
        try {
          await microcreditLoanApplicationService.submitApplication(applicationId);
        } catch (submitError: any) {
          // If backend says it's already submitted/non-draft, ignore and continue to approve
          const msg = (submitError?.message || '').toLowerCase();
          const status = submitError?.status;
          if (status === 409) {
            if (msg.includes('already') || msg.includes('déjà') || msg.includes('only draft')) {
              // ok to proceed
            } else if (msg.includes('validation')) {
              // Validation failed: inform user and stop
              toast.error(
                "Demann lan pa ka soumèt: dokiman obligatwa yo manke (Kat idantite + Prèv revni verifye).",
                { duration: 6000 }
              );
              return;
            } else {
              throw submitError;
            }
          } else {
            throw submitError;
          }
        }
      }
      
      // Now approve
      await microcreditLoanApplicationService.approveApplication(applicationId, comment);
      toast.success('Demande approuvée avec succès!');
      setShowApprovalWorkflow(false);
      // Reload loans to show updated status
      await loadLoans();
    } catch (error: any) {
      console.error('Error approving loan:', error);
      const errorMsg = error?.message || error?.response?.data || 'Erreur lors de l\'approbation de la demande';
      toast.error(errorMsg);
    }
  };

  const handleRejectLoan = async (applicationId: string, level: number, reason: string) => {
    try {
      await microcreditLoanApplicationService.rejectApplication(applicationId, reason);
      toast.error('Demande rejetée');
      setShowApprovalWorkflow(false);
      // Reload loans to show updated status
      await loadLoans();
    } catch (error: any) {
      console.error('Error rejecting loan:', error);
      toast.error(error?.message || 'Erreur lors du rejet de la demande');
    }
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
      {authRequired && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Tanpri konekte</p>
              <p className="text-sm">Ou dwe konekte pou wè lis nouvo demann kredi yo.</p>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Microcrédits</h1>
          <p className="text-gray-600 mt-1">Portefeuille de prêts et remboursements</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadLoans}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Actualiser la liste"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
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

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'applications'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span>Nouvelles Demandes</span>
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                  {loans.filter(l => l.status === LoanStatus.PENDING).length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('loans')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'loans'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                <span>Prêts Actifs</span>
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                  {loans.filter(l => l.status === LoanStatus.ACTIVE).length}
                </span>
              </div>
            </button>
          </nav>
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
      {activeTab === 'loans' && (
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
              <option value={LoanStatus.PENDING}>En attente</option>
              <option value={LoanStatus.APPROVED}>Approuvé</option>
              <option value={LoanStatus.ACTIVE}>Actif</option>
              <option value={LoanStatus.COMPLETED}>Soldé</option>
              <option value={LoanStatus.OVERDUE}>En retard</option>
              <option value={LoanStatus.DEFAULTED}>En défaut</option>
              <option value={LoanStatus.CANCELLED}>Annulé</option>
            </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="ALL">Tous les types</option>
            <option value={LoanType.COMMERCIAL}>Commercial</option>
            <option value={LoanType.AGRICULTURAL}>Agricole</option>
            <option value={LoanType.PERSONAL}>Personnel</option>
            <option value={LoanType.EMERGENCY}>Urgence</option>
            <option value={LoanType.CREDIT_LOYER}>Crédit Loyer</option>
            <option value={LoanType.CREDIT_AUTO}>Crédit Auto</option>
            <option value={LoanType.CREDIT_MOTO}>Crédit Moto</option>
            <option value={LoanType.CREDIT_PERSONNEL}>Crédit Personnel</option>
            <option value={LoanType.CREDIT_SCOLAIRE}>Crédit Scolaire</option>
            <option value={LoanType.CREDIT_AGRICOLE}>Crédit Agricole</option>
            <option value={LoanType.CREDIT_PROFESSIONNEL}>Crédit Professionnel</option>
            <option value={LoanType.CREDIT_APPUI}>Crédit d'Appui</option>
            <option value={LoanType.CREDIT_HYPOTHECAIRE}>Crédit Hypothécaire</option>
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
      )}

      {/* Applications Table (Nouvelles Demandes) */}
      {activeTab === 'applications' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Demandes en Attente d'Approbation</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {loans.filter(l => l.status === LoanStatus.PENDING).length} demande(s) à traiter
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Tri</label>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="DATE_DESC">Dènye an premye</option>
                    <option value="DATE_ASC">Pi ansyen an premye</option>
                    <option value="AMOUNT_DESC">Montan ↓</option>
                    <option value="AMOUNT_ASC">Montan ↑</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Pa paj</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Action requise</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Demande
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type de Crédit
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant Demandé
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durée
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Garanties
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
                {loans.filter(l => l.status === LoanStatus.PENDING).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <CheckCircle className="w-12 h-12 mb-4 text-gray-300" />
                        <p className="text-lg font-medium">Aucune demande en attente</p>
                        <p className="text-sm mt-2">Toutes les demandes ont été traitées</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  loans.filter(l => l.status === LoanStatus.PENDING).map((loan) => (
                    <tr key={loan.id} className="hover:bg-yellow-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formatDate(loan.createdAt)}</p>
                          <p className="text-xs text-gray-500">{loan.loanNumber}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{loan.customerName}</p>
                            <p className="text-xs text-gray-500">{loan.branch}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getLoanTypeBadge(loan.loanType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(loan.principalAmount, loan.currency)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Mensualité: {formatCurrency(loan.monthlyPayment, loan.currency)}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{loan.termMonths} mois</p>
                        <p className="text-xs text-gray-500">Taux: {loan.interestRate}%</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          {loan.collateral && (
                            <div className="flex items-start gap-1 mb-1">
                              <Shield className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-gray-600">{loan.collateral}</p>
                            </div>
                          )}
                          {loan.guarantors && loan.guarantors.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-blue-600 flex-shrink-0" />
                              <p className="text-xs text-gray-600">
                                {loan.guarantors.length} garant(s)
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(loan.status)}
                          <span className="text-xs text-yellow-600 font-medium">
                            En attente
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(loan)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Voir
                          </button>
                          <button
                            onClick={() => handleApproval(loan)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Traiter
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 text-sm bg-gray-50">
            <div>
              Paj {currentPage} sou {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={`px-3 py-1.5 rounded-md border ${currentPage <= 1 ? 'text-gray-300 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-white'}`}
              >
                Prev
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={`px-3 py-1.5 rounded-md border ${currentPage >= totalPages ? 'text-gray-300 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-white'}`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loans Table */}
      {activeTab === 'loans' && (
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
      )}

      {/* Application Form Modal */}
      {showApplicationForm && (
        <LoanApplicationForm
          onSubmit={(data) => {
            console.log('Loan application submitted:', data);
            toast.success(
              'Demande de crédit soumise avec succès!\n\n' +
              'Votre demande sera examinée par notre comité de crédit.',
              { duration: 5000 }
            );
            setShowApplicationForm(false);
            // Reload loans after brief delay
            setTimeout(() => loadLoans(), 500);
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
