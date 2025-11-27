import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Download, Eye, DollarSign,
  TrendingUp, Clock, AlertTriangle, CheckCircle, XCircle,
  Users, FileText, BarChart3, CreditCard, RefreshCw,
  User, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoanApplicationForm from './LoanApplicationForm';
import LoanApprovalWorkflow from './LoanApprovalWorkflow';
import LoanDetails from './LoanDetails';
import LoanReports from './LoanReports';
import DisburseLoanModal from './DisburseLoanModal';
import RecouvrementModal from './RecouvrementModal';
import {
  roundCurrency,
  normalizePercentValue,
  resolveMonthlyRatePercent,
  resolveAnnualRatePercent,
  calculateMonthlyPaymentFromMonthlyRate
} from './loanRateUtils';
import {
  LoanType,
  LoanStatus,
  ApplicationStatus,
  type LoanApplication as LoanApplicationType
} from '../../types/microcredit';
import { microcreditLoanApplicationService } from '../../services/microcreditLoanApplicationService';
import { microcreditLoanService } from '../../services/microcreditLoanService';
import { microcreditPaymentService, type PaymentResponse, type PaymentHistoryResponse, PaymentStatus } from '../../services/microcreditPaymentService';

interface Loan {
  id: string;
  loanRecordId?: string;
  applicationId?: string;
  loanNumber: string;
  customerId: string;
  customerCode?: string;
  savingsAccountNumber?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  occupation?: string;
  monthlyIncome?: number;
  dependents?: number;
  loanType: LoanType;
  principalAmount: number;
  // Additional visibility fields for application context
  approvedAmount?: number;
  requestedAmount?: number;
  interestRate: number;
  monthlyInterestRate?: number;
  termMonths: number;
  monthlyPayment: number;
  // Monthly payment including distributed processing fee (frais dossier réparti)
  monthlyPaymentWithFee?: number;
  disbursementDate: string;
  maturityDate: string;
  remainingBalance: number;
  paidAmount: number;
  status: LoanStatus;
  applicationStatus?: ApplicationStatus;
  currency: 'HTG' | 'USD';
  collateral?: string;
  guarantors?: string[];
  branch: string;
  loanOfficer: string;
  createdAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  daysOverdue?: number;
  lateFees?: number;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
  paidInterest?: number;
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

interface DashboardStats {
  totalPortfolio: number;
  activeClients: number;
  repaymentRate: number;
  par30: number;
  pendingApplications: number;
  loansToDisburse: number;
  criticalOverdueLoans: number;
  monthlyGrowth: number;
  interestRevenue: number;
  averageLoanSize: number;
}

interface ChartData {
  month: string;
  portfolio: number;
  loans: number;
  repayment: number;
}

interface AgentPerformance {
  id: string;
  name: string;
  portfolio: number;
  recoveryRate: number;
  clientsCount: number;
  score: number;
  branch: string;
}

type LoanManagementTab = 'overview' | 'loans' | 'disbursement' | 'applications' | 'overdue' | 'payments' | 'reports';

const tabDefaultStatus: Record<LoanManagementTab, 'ALL' | LoanStatus> = {
  overview: 'ALL',
  loans: 'ALL',
  disbursement: LoanStatus.APPROVED,
  applications: LoanStatus.PENDING,
  overdue: LoanStatus.OVERDUE,
  payments: 'ALL',
  reports: 'ALL'
};

const formatCurrency = (amount: number, currency: 'HTG' | 'USD' = 'HTG'): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(safeAmount);

  return `${formatted} ${currency}`.trim();
};

// Calcul des frais de retard: 0.11667% par jour
const calculateLateFees = (principalAmount: number, daysOverdue: number): number => {
  const dailyRate = 0.0011667; // 0.11667%
  return principalAmount * dailyRate * daysOverdue;
};

const formatDate = (dateString?: string): string => {
  if (!dateString) {
    return 'N/A';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const normalizeStatusKey = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .replace(/[-\s]+/g, '_')
    .toUpperCase();

const loanStatusLookup: Record<string, LoanStatus> = {
  PENDING: LoanStatus.PENDING,
  SUBMITTED: LoanStatus.PENDING,
  UNDER_REVIEW: LoanStatus.PENDING,
  IN_REVIEW: LoanStatus.PENDING,
  APPROVED: LoanStatus.APPROVED,
  ACTIVE: LoanStatus.ACTIVE,
  ONGOING: LoanStatus.ACTIVE,
  IN_PROGRESS: LoanStatus.ACTIVE,
  COMPLETED: LoanStatus.COMPLETED,
  PAID: LoanStatus.COMPLETED,
  PAID_OFF: LoanStatus.COMPLETED,
  CLOSED: LoanStatus.COMPLETED,
  OVERDUE: LoanStatus.OVERDUE,
  LATE: LoanStatus.OVERDUE,
  ARREARS: LoanStatus.OVERDUE,
  DEFAULTED: LoanStatus.DEFAULTED,
  DEFAULT: LoanStatus.DEFAULTED,
  CANCELLED: LoanStatus.CANCELLED,
  CANCELED: LoanStatus.CANCELLED
};

const applicationStatusLookup: Record<string, ApplicationStatus> = {
  DRAFT: ApplicationStatus.DRAFT,
  SUBMITTED: ApplicationStatus.SUBMITTED,
  SUBMIT: ApplicationStatus.SUBMITTED,
  PENDING: ApplicationStatus.SUBMITTED,
  UNDER_REVIEW: ApplicationStatus.UNDER_REVIEW,
  IN_REVIEW: ApplicationStatus.UNDER_REVIEW,
  APPROVED: ApplicationStatus.APPROVED,
  ACCEPTED: ApplicationStatus.APPROVED,
  VALIDATED: ApplicationStatus.APPROVED,
  REJECTED: ApplicationStatus.REJECTED,
  DECLINED: ApplicationStatus.REJECTED,
  CANCELLED: ApplicationStatus.CANCELLED,
  CANCELED: ApplicationStatus.CANCELLED
};

const castLoanStatus = (status: unknown): LoanStatus | undefined => {
  const key = normalizeStatusKey(status);
  return loanStatusLookup[key];
};

const castApplicationStatus = (status: unknown): ApplicationStatus | undefined => {
  const key = normalizeStatusKey(status);
  return applicationStatusLookup[key];
};

const LoanManagement: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([]);
  const [activeLoansCount, setActiveLoansCount] = useState(0);
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
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
  const [selectedApplication, setSelectedApplication] = useState<LoanApplicationType | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showApprovalWorkflow, setShowApprovalWorkflow] = useState(false);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [showRecouvrementModal, setShowRecouvrementModal] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LoanManagementTab>('overview');
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
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [overdueDaysFilter, setOverdueDaysFilter] = useState<'ALL' | '1-30' | '31-60' | '60+'>('ALL');

  // Dashboard state
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalPortfolio: 0,
    activeClients: 0,
    repaymentRate: 0,
    par30: 0,
    pendingApplications: 0,
    loansToDisburse: 0,
    criticalOverdueLoans: 0,
    monthlyGrowth: 0,
    interestRevenue: 0,
    averageLoanSize: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [agents, setAgents] = useState<AgentPerformance[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [loansToDisburseCount, setLoansToDisburseCount] = useState(0);

  // Payments state
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsTotalCount, setPaymentsTotalCount] = useState(0);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsPageSize, setPaymentsPageSize] = useState(20);
  const [paymentsStatusFilter, setPaymentsStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [paymentsDateFrom, setPaymentsDateFrom] = useState<string>('');
  const [paymentsDateTo, setPaymentsDateTo] = useState<string>('');
  const [paymentsSearchTerm, setPaymentsSearchTerm] = useState<string>('');

  const changeTab = (tab: LoanManagementTab) => {
    setActiveTab(tab);
    const defaultStatus = tabDefaultStatus[tab];
    if (defaultStatus !== undefined) {
      setStatusFilter(defaultStatus);
    }
  };

  useEffect(() => {
    loadLoans();
  }, [activeTab, currentPage, pageSize, statusFilter, typeFilter, branchFilter]);

  // Map LoanStatus (frontend enum) to backend request string
  const loanStatusRequestMap: Record<LoanStatus, string> = {
    // 'Pending' is not a recognized backend enum; use 'Submitted' instead to request
    // new applications awaiting review.
    [LoanStatus.PENDING]: 'Submitted',
    [LoanStatus.APPROVED]: 'Approved',
    [LoanStatus.ACTIVE]: 'Active',
    [LoanStatus.COMPLETED]: 'Completed',
    [LoanStatus.OVERDUE]: 'Overdue',
    [LoanStatus.DEFAULTED]: 'Defaulted',
    [LoanStatus.CANCELLED]: 'Cancelled'
  };

  useEffect(() => {
    applyFilters();
  }, [loans, searchTerm, statusFilter, typeFilter, currencyFilter, branchFilter, dateFromFilter, dateToFilter, activeTab]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, currencyFilter, branchFilter, dateFromFilter, dateToFilter, pageSize]);

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

  // Load dashboard data
  useEffect(() => {
    if (activeTab === 'overview') {
      loadDashboardData();
    }
  }, [timeRange, selectedBranch, activeTab]);

  const loadLoans = async () => {
    try {
      setLoading(true);
      setAuthRequired(false);
      // Preload branch list to map branchId -> branchName for all tabs
      let branchesLookup: Record<string | number, string> = {};
      try {
        const fetchedBranches = await microcreditLoanApplicationService.getBranches();
        setBranchesList(fetchedBranches || []);
        branchesLookup = Object.fromEntries((fetchedBranches || []).map((b: any) => [b.id, b.name]));
      } catch (err) {
        console.error('Error loading branches for mapping:', err);
      }
      
      if (activeTab === 'loans' || activeTab === 'disbursement' || activeTab === 'overdue') {
        // Fetch data depending on active tab to avoid mixing different datasets
        // Loans tab: main fetch Active/Overdue loans, auxiliary fetch Approved applications for header count
        // Disbursement tab: only fetch Approved applications as the main dataset
        // Overdue tab: fetch Active/Overdue loans (same as Loans tab)
        // Always fetch active/overdue loans as well as approved applications so we can reliably
        // detect which approved applications have already been disbursed (linked to an active loan).
        const [activeLoans, approvedApplications] = await Promise.all([
          microcreditLoanApplicationService.getActiveLoans(),
          (microcreditLoanApplicationService as any).getApprovedLoans()
        ]);

        // Convert active loans to Loan format (only present when activeTab === 'loans')
        const activeLoansData: Loan[] = activeLoans.map(loan => {
          const principalAmount = roundCurrency(loan.principalAmount ?? loan.approvedAmount ?? loan.requestedAmount ?? 0);
          const termMonths = loan.termMonths ?? loan.durationMonths ?? 12;
          const monthlyRate = resolveMonthlyRatePercent((loan as any).monthlyInterestRate, loan.interestRate, 3.5);
          const annualRate = resolveAnnualRatePercent(monthlyRate, loan.interestRate, normalizePercentValue(loan.interestRate ?? monthlyRate * 12));
          const normalizedMonthlyPayment = roundCurrency(
            loan.monthlyPayment ?? loan.installmentAmount ?? calculateMonthlyPaymentFromMonthlyRate(principalAmount, monthlyRate, termMonths)
          );
          const processingFee = (loan.approvedAmount ?? loan.principalAmount) ? roundCurrency((loan.approvedAmount ?? principalAmount) * 0.05) : 0;
          const distributedFeePortion = termMonths > 0 ? roundCurrency(processingFee / termMonths) : 0;
          const monthlyPaymentWithFee = roundCurrency(normalizedMonthlyPayment + distributedFeePortion);
          const remainingBalance = roundCurrency(
            loan.remainingBalance ?? loan.outstandingBalance ?? Math.max(principalAmount - (loan.paidAmount ?? loan.amountPaid ?? 0), 0)
          );
          const paidAmount = roundCurrency(loan.paidAmount ?? loan.amountPaid ?? (principalAmount - remainingBalance));
          const currency = (loan.currency === 'USD' ? 'USD' : 'HTG') as 'HTG' | 'USD';

          return {
            id: loan.id,
            loanNumber: loan.loanNumber || `LOAN-${loan.id.substring(0, 8)}`,
            loanRecordId: loan.id,
            applicationId: loan.applicationId || loan.application?.id,
            customerId: loan.customerId || loan.borrowerId || '',
            customerCode: loan.customer?.accountNumber ?? loan.borrower?.accountNumber ?? undefined,
            customerName: (loan.customer ?? loan.borrower)
              ? `${(loan.customer ?? loan.borrower).firstName} ${(loan.customer ?? loan.borrower).lastName}`.trim()
              : loan.customerName ?? loan.borrowerName ?? 'Client',
            customerPhone: loan.customer?.contact?.phone || loan.customer?.contact?.phoneNumber || loan.borrower?.contact?.phone || loan.borrower?.contact?.phoneNumber || loan.customerPhone,
            loanType: loan.loanType as LoanType,
            principalAmount,
            approvedAmount: (loan as any).approvedAmount ?? principalAmount,
            requestedAmount: (loan as any).requestedAmount ?? principalAmount,
            interestRate: annualRate,
            monthlyInterestRate: monthlyRate,
            termMonths,
            monthlyPayment: normalizedMonthlyPayment,
            monthlyPaymentWithFee,
            disbursementDate: loan.disbursementDate ?? '',
            maturityDate: loan.maturityDate ?? '',
            remainingBalance,
            paidAmount,
            status: castLoanStatus(loan.status) ?? LoanStatus.PENDING,
            applicationStatus: castApplicationStatus(loan.applicationStatus) ?? ApplicationStatus.DRAFT,
            currency,
            collateral: loan.collateral ?? undefined,
            guarantors: Array.isArray(loan.guarantors) ? loan.guarantors.filter(Boolean) : [],
            branch: branchesLookup[loan.branchId] ?? loan.branchName ?? loan.branch ?? 'Principal',
            loanOfficer: loan.loanOfficerName || getLoanOfficerName(loan) || 'N/A',
            createdAt: loan.createdAt ?? new Date().toISOString(),
            approvedBy: loan.approvedBy ?? undefined,
            approvedByName: (loan as any).approvedByName ?? loan.approvedBy ?? undefined,
            approvedAt: loan.approvedAt ?? undefined,
            nextPaymentDate: loan.nextPaymentDate ?? undefined,
            nextPaymentAmount: loan.nextPaymentAmount ?? undefined,
            daysOverdue: loan.daysOverdue ?? 0,
            lateFees: loan.daysOverdue ? calculateLateFees(loan.principalAmount || 0, loan.daysOverdue) : 0
          };
        });
        
        // Convert approved applications to Loan format (for disbursement)
        const approvedLoansData: Loan[] = approvedApplications.map((app: any) => {
          const requestedAmount = roundCurrency(app.requestedAmount ?? 0);
          const approvedAmount = roundCurrency(app.approvedAmount ?? requestedAmount);
          const effectiveAmount = approvedAmount || requestedAmount;
          const termMonths = app.requestedDurationMonths ?? app.durationMonths ?? 12;
          const monthlyRate = resolveMonthlyRatePercent(app.monthlyInterestRate, app.interestRate, 3.5);
          const annualRate = resolveAnnualRatePercent(monthlyRate, app.interestRate, normalizePercentValue(app.interestRate ?? monthlyRate * 12));
          const monthlyPayment = roundCurrency(calculateMonthlyPaymentFromMonthlyRate(effectiveAmount, monthlyRate, termMonths));
          const processingFee = approvedAmount ? roundCurrency(approvedAmount * 0.05) : 0;
          const distributedFeePortion = termMonths > 0 ? roundCurrency(processingFee / termMonths) : 0;
          const monthlyPaymentWithFee = roundCurrency(monthlyPayment + distributedFeePortion);
          const loanRecordId = app.loanId || app.loanRecordId || app.loan?.id;
          const currency = (app.currency === 'USD' ? 'USD' : 'HTG') as 'HTG' | 'USD';

          return {
            id: loanRecordId || app.id,
            loanRecordId: loanRecordId || undefined,
            applicationId: app.id,
            loanNumber: app.applicationNumber || `APP-${app.id.substring(0, 8)}`,
            customerId: app.borrowerId || '',
            customerCode: app.customerCode ?? app.borrower?.accountNumber ?? app.borrowerId ?? undefined,
            customerName: app.customerName ?? (app.borrower ? `${app.borrower.firstName} ${app.borrower.lastName}`.trim() : 'Client'),
            customerPhone: app.customerPhone ?? app.borrower?.contact?.phone ?? app.borrower?.contact?.phoneNumber,
            loanType: app.loanType as LoanType,
            principalAmount: effectiveAmount,
            approvedAmount,
            requestedAmount,
            interestRate: annualRate,
            monthlyInterestRate: monthlyRate,
            termMonths,
            monthlyPayment,
            monthlyPaymentWithFee,
            disbursementDate: app.disbursementDate || '',
            maturityDate: app.disbursementDate
              ? new Date(new Date(app.disbursementDate).setMonth(new Date(app.disbursementDate).getMonth() + termMonths)).toISOString()
              : '',
            remainingBalance: effectiveAmount,
            paidAmount: 0,
            status: mapApplicationStatusToLoanStatus(app.status as string),
            applicationStatus: castApplicationStatus(app.status as string) ?? ApplicationStatus.DRAFT,
            currency,
            collateral: (app.collateralDescription
              || (app.guarantees || []).find((g: any) => {
                const t = g.type ?? g.Type ?? '';
                return t === 'Collateral' || t === 0 || t === '0' || (typeof t === 'string' && t.toLowerCase().includes('collat'));
              })?.description
              || app.collateralType) || undefined,
            guarantors: (() => {
              const fromArray = (app.guarantees || []).filter((g: any) => {
                const t = g.type ?? g.Type ?? '';
                return t === 'Personal' || t === 1 || t === '1' || (typeof t === 'string' && t.toLowerCase().includes('personal'));
              }).map((g: any) => g.contactName || g.description).filter(Boolean);

              if (fromArray.length === 0) {
                const snapshot: string[] = [];
                if (app.guarantor1Name) snapshot.push(app.guarantor1Name);
                if (app.guarantor2Name) snapshot.push(app.guarantor2Name);
                return snapshot;
              }

              return fromArray;
            })(),
            branch: branchesLookup[(app.branchId ?? app.branchName)] ?? app.branchName ?? 'Principal',
            loanOfficer: getLoanOfficerName(app) || 'N/A',
            createdAt: app.createdAt ?? new Date().toISOString(),
            approvedBy: app.approvedBy ?? undefined,
            approvedByName: (app as any).approverName || (app as any).ApproverName || (app as any).approvedByName || app.loanOfficerName || (app as any).approvedBy || undefined,
            approvedAt: app.approvedAt ?? undefined,
            nextPaymentDate: undefined,
            nextPaymentAmount: undefined,
            daysOverdue: 0,
            lateFees: 0
          };
        });
        
        // Use the appropriate list for the tab
        // For disbursement tab, filter out applications that have already been disbursed
        // An application is considered disbursed if it has a corresponding active loan
        const disbursedApplicationIds = new Set(activeLoansData.map(loan => loan.applicationId).filter(Boolean));
        const filteredApprovedLoansData = approvedLoansData.filter(loan =>
          !disbursedApplicationIds.has(loan.applicationId || loan.id)
        );
        const combined = (activeTab === 'loans' || activeTab === 'overdue') ? activeLoansData : filteredApprovedLoansData;
        // Remove duplicates based on loan ID
        const uniqueLoans = combined.filter((loan, index, self) => 
          index === self.findIndex(l => l.id === loan.id)
        );
        
        // Apply sorting
        const sorted = [...uniqueLoans];
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
        setTotalPages(1); // Active loans are typically loaded all at once

        // Calculate counts for badges from the source data (not from sorted display list)
        // This ensures badges reflect backend state regardless of active tab
        const activeLoansForBadge = activeLoansData.filter(l => l.status === LoanStatus.ACTIVE || l.status === LoanStatus.OVERDUE);
        setActiveLoansCount(activeLoansForBadge.length);
        
        // Disbursement count from approved applications that haven't been disbursed yet
        setLoansToDisburseCount(filteredApprovedLoansData.length);
        
        // Calculate statistics so KPIs match the ACTIVE + OVERDUE dataset displayed in the tab
        const overdueLoans = activeLoansData.filter(l => l.status === LoanStatus.OVERDUE);

        const totalOutstandingHTG = activeLoansForBadge
          .filter(l => l.currency === 'HTG')
          .reduce((sum, l) => sum + l.remainingBalance, 0);
        const totalOutstandingUSD = activeLoansForBadge
          .filter(l => l.currency === 'USD')
          .reduce((sum, l) => sum + l.remainingBalance, 0);

        const overdueAmountHTG = overdueLoans
          .filter(l => l.currency === 'HTG')
          .reduce((sum, l) => sum + l.remainingBalance, 0);
        const overdueAmountUSD = overdueLoans
          .filter(l => l.currency === 'USD')
          .reduce((sum, l) => sum + l.remainingBalance, 0);
        
        setStats({
          totalClients: new Set(activeLoansForBadge.map(l => l.customerId)).size,
          activeLoans: activeLoansForBadge.length,
          totalOutstanding: { HTG: totalOutstandingHTG, USD: totalOutstandingUSD },
          repaymentRate: 95, // TODO: calculate from actual payment data
          overdueLoans: { 
            count: overdueLoans.length, 
            amount: { HTG: overdueAmountHTG, USD: overdueAmountUSD } 
          },
          interestRevenue: { HTG: 0, USD: 0 }, // TODO: calculate from actual payments
          loansCompletedThisMonth: sorted.filter(l => l.status === LoanStatus.COMPLETED).length,
          newLoansThisMonth: 0 // TODO: calculate based on disbursement date
        });
        
      } else {
        // For applications tab, load applications with pagination
        // Applications don't have OVERDUE, ACTIVE, or COMPLETED status - only loans do
        // So we need to check if the statusFilter is a loan-only status and skip it
        const loanOnlyStatuses = [LoanStatus.OVERDUE, LoanStatus.ACTIVE, LoanStatus.COMPLETED, LoanStatus.DEFAULTED];
        
        const requestParams: any = { page: currentPage, pageSize };
        
        // Only set status filter if it's a valid application status
        if (statusFilter === 'ALL' || loanOnlyStatuses.includes(statusFilter as LoanStatus)) {
          requestParams.status = loanStatusRequestMap[LoanStatus.PENDING];
        } else {
          requestParams.status = loanStatusRequestMap[statusFilter as LoanStatus];
        }
        
        if (typeFilter !== 'ALL') requestParams.loanType = typeFilter;
        if (branchFilter !== 'ALL') {
          const branchObj = branchesList.find(b => b.name === branchFilter || b.id === branchFilter);
          if (branchObj) requestParams.branchId = branchObj.id;
        }
        const page = await microcreditLoanApplicationService.getApplicationsPage(requestParams);
        const applications = page.applications;
        
    // Convert applications to Loan format for display
  const loansData: Loan[] = applications.map(app => {
          const monthlyRate = resolveMonthlyRatePercent((app as any).monthlyInterestRate, app.interestRate, 3.5);
          const interestRate = resolveAnnualRatePercent(monthlyRate, app.interestRate, monthlyRate > 0 ? monthlyRate * 12 : 0); // annual
          const requestedAmount = roundCurrency(app.requestedAmount ?? 0);
          const approvedAmount = roundCurrency((app as any).approvedAmount ?? 0);
          const effectiveAmount = approvedAmount > 0 ? approvedAmount : requestedAmount;
          const monthlyPayment = calculateMonthlyPaymentFromMonthlyRate(effectiveAmount, monthlyRate, app.requestedDurationMonths);
    const processingFee = approvedAmount > 0 ? roundCurrency(approvedAmount * 0.05) : 0;
    const distributedFeePortion = app.requestedDurationMonths > 0 ? roundCurrency(processingFee / app.requestedDurationMonths) : 0;
    const monthlyPaymentWithFee = roundCurrency(monthlyPayment + distributedFeePortion);
          
          return {
            id: app.id,
            loanRecordId: app.loanId || undefined,
            applicationId: app.id,
            loanNumber: app.applicationNumber || `APP-${app.id.substring(0, 8)}`,
            customerId: app.borrowerId || '',
            customerCode: app.borrower?.accountNumber,
            savingsAccountNumber: (app as any).savingsAccountNumber || app.borrower?.accountNumber,
            customerName: app.borrower 
              ? `${app.borrower.firstName} ${app.borrower.lastName}` 
              : 'Client',
            customerPhone: app.borrower?.contact?.phone || app.borrower?.contact?.phoneNumber,
            loanType: app.loanType as LoanType,
            principalAmount: effectiveAmount,
            requestedAmount,
            approvedAmount: approvedAmount > 0 ? approvedAmount : undefined,
            interestRate: interestRate,
            monthlyInterestRate: monthlyRate,
            termMonths: app.requestedDurationMonths,
            monthlyPayment: monthlyPayment,
            monthlyPaymentWithFee,
            disbursementDate: app.disbursementDate || '',
            maturityDate: app.disbursementDate 
              ? new Date(new Date(app.disbursementDate).setMonth(new Date(app.disbursementDate).getMonth() + app.requestedDurationMonths)).toISOString()
              : '',
            remainingBalance: effectiveAmount, // TODO: calculate from payments
            paidAmount: 0, // TODO: calculate from payments
            status: mapApplicationStatusToLoanStatus(app.status as string),
            applicationStatus: castApplicationStatus(app.status as string) ?? ApplicationStatus.DRAFT,
            currency: app.currency as 'HTG' | 'USD',
            collateral: app.guarantees?.find((g: any) => {
              const t = g.type ?? g.Type ?? '';
              return t === 'Collateral' || t === 0 || t === '0' || (typeof t === 'string' && t.toLowerCase().includes('collat'));
            })?.description || (app as any).collateralType || (app as any).collateralDescription,
            guarantors: (() => {
              // Try to get guarantors from guarantees array first
              const fromArray = (app.guarantees || []).filter((g: any) => {
                const t = g.type ?? g.Type ?? '';
                return t === 'Personal' || t === 1 || t === '1' || (typeof t === 'string' && t.toLowerCase().includes('personal'));
              }).map((g: any) => g.contactName || g.description).filter(Boolean);
              
              // If array is empty, try snapshot fields
              if (fromArray.length === 0) {
                const snapshot = [];
                if ((app as any).guarantor1Name) snapshot.push((app as any).guarantor1Name);
                if ((app as any).guarantor2Name) snapshot.push((app as any).guarantor2Name);
                return snapshot;
              }
              
              return fromArray;
            })(),
            branch: branchesLookup[(app.branchId ?? app.branchName)] ?? app.branchName ?? 'Principal',
            loanOfficer: getLoanOfficerName(app),
            createdAt: app.createdAt,
            approvedBy: app.loanOfficerId,
            approvedByName: (app as any).approverName || (app as any).ApproverName || (app as any).approvedByName || app.loanOfficerName || (app as any).approvedBy,
            approvedAt: app.approvedAt
          };
        });
        
        // Remove duplicates based on application ID
        const uniqueLoans = loansData.filter((loan, index, self) => 
          index === self.findIndex(l => l.id === loan.id)
        );
        
        // Apply sorting
        const sorted = [...uniqueLoans];
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

    const pendingCount = page.totalCount ?? sorted.filter(l => l.status === LoanStatus.PENDING).length;
    setPendingApplicationsCount(pendingCount);

    // Assurer que le compteur "Prêts à Décaisser" (approved non encore déboursés)
    // est aussi mis à jour quand on est sur l'onglet overview (sinon restait à 0 ou ancien état)
    try {
      const [activeLoansForCount, approvedApplicationsForCount] = await Promise.all([
        microcreditLoanApplicationService.getActiveLoans(),
        (microcreditLoanApplicationService as any).getApprovedLoans()
      ]);
      const disbursedIds = new Set(activeLoansForCount.map((l: any) => l.applicationId || l.application?.id).filter(Boolean));
      const notYetDisbursed = approvedApplicationsForCount.filter((app: any) => !disbursedIds.has(app.id));
      setLoansToDisburseCount(notYetDisbursed.length);
    } catch (e) {
      console.warn('Impossible de rafraîchir le compteur Prêts à Décaisser sur overview:', e);
    }

    // Calculate statistics for applications
        const pendingLoans = sorted.filter(l => l.status === LoanStatus.PENDING);
        
        setStats({
          totalClients: new Set(sorted.map(l => l.customerId)).size,
          activeLoans: 0, // No active loans in applications
          totalOutstanding: { HTG: 0, USD: 0 }, // No outstanding amounts in applications
          repaymentRate: 0, // Not applicable for applications
          overdueLoans: { count: 0, amount: { HTG: 0, USD: 0 } }, // No overdue in applications
          interestRevenue: { HTG: 0, USD: 0 }, // No revenue in applications
          loansCompletedThisMonth: 0, // Not applicable
          newLoansThisMonth: pendingLoans.length
        });
      }
      
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

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(loan =>
        (loan.customerName && loan.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (loan.loanNumber && loan.loanNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter - apply tab-specific defaults when no filter is selected
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(loan => loan.status === statusFilter);
    } else if (activeTab === 'loans') {
      // Default to showing ACTIVE and OVERDUE loans in the "Prêts Actifs" tab
      filtered = filtered.filter(loan => 
        loan.status === LoanStatus.ACTIVE || loan.status === LoanStatus.OVERDUE
      );
    } else if (activeTab === 'disbursement') {
      // Default to showing only APPROVED loans in the "Décaissement" tab
      filtered = filtered.filter(loan => loan.status === LoanStatus.APPROVED);
    } else if (activeTab === 'applications') {
      // Default to showing PENDING applications in the "Nouvelles Demandes" tab
      // (applications already come filtered from backend, but we apply this for consistency)
      // Note: Don't filter here since applications tab uses different data source
    }

    // Type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(loan => loan.loanType === typeFilter);
    }

    // Currency filter
    if (currencyFilter !== 'ALL') {
      filtered = filtered.filter(loan => loan.currency === currencyFilter);
    }

    // Branch filter
    if (branchFilter !== 'ALL' && branchFilter) {
      filtered = filtered.filter(loan => loan.branch === branchFilter);
    }

    // Date range filter — for disbursement tab, filter by approvedAt when available, otherwise createdAt
    if (dateFromFilter) {
      filtered = filtered.filter(loan => {
        const dateToCheck = activeTab === 'disbursement' ? (loan.approvedAt ?? loan.createdAt) : loan.createdAt;
        if (!dateToCheck) return false;
        const loanDate = new Date(dateToCheck);
        const fromDate = new Date(dateFromFilter);
        return loanDate >= fromDate;
      });
    }

    if (dateToFilter) {
      filtered = filtered.filter(loan => {
        const dateToCheck = activeTab === 'disbursement' ? (loan.approvedAt ?? loan.createdAt) : loan.createdAt;
        if (!dateToCheck) return false;
        const loanDate = new Date(dateToCheck);
        const toDate = new Date(dateToFilter);
        toDate.setHours(23, 59, 59, 999); // Include entire day
        return loanDate <= toDate;
      });
    }

    setFilteredLoans(filtered);
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
    const badges: Record<LoanType, { color: string; icon: React.ReactNode; label?: string }> = {
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

  const defaultBadge = { color: 'bg-gray-100 text-gray-800', icon: '🏷', label: getLoanTypeLabel(type) ?? String(type || '') };
  const badge = badges[type] ?? defaultBadge;
  const Icon = badge.icon;
  const label = badge.label ?? getLoanTypeLabel(type) ?? String(type || '');
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color} flex items-center gap-1`}>
        <span>{Icon}</span>
        {label}
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

  const handleViewDetails = async (loan: Loan) => {
    // If loan represents an application, fetch full application details so fields are not empty
    if (loan.applicationId) {
      try {
        const app = await microcreditLoanApplicationService.getApplication(loan.applicationId);
        // Map application fields back into the Loan shape to ensure LoanDetails has the snapshot data
        const sourceAnnualRate = typeof app.interestRate === 'number' && !isNaN(app.interestRate)
          ? app.interestRate
          : loan.interestRate;
        const sourceMonthlyRate = (app as any).monthlyInterestRate ?? (loan as any).monthlyInterestRate;
        const monthlyRate = resolveMonthlyRatePercent(sourceMonthlyRate, sourceAnnualRate, resolveMonthlyRatePercent(undefined, loan.interestRate));
        const interestRate = resolveAnnualRatePercent(monthlyRate, sourceAnnualRate, normalizePercentValue(sourceAnnualRate ?? 0));
        const durationMonths = app.requestedDurationMonths ?? loan.termMonths ?? 12;
        const requestedAmount = app.requestedAmount ?? loan.principalAmount ?? 0;
        const approvedAmount = (app as any).approvedAmount ?? (loan as any).approvedAmount;
        const effectiveAmount = approvedAmount ?? requestedAmount;
        const monthlyPayment = monthlyRate > 0
          ? calculateMonthlyPaymentFromMonthlyRate(effectiveAmount, monthlyRate, durationMonths)
          : roundCurrency(loan.monthlyPayment);
        const processingFee = approvedAmount ? roundCurrency(approvedAmount * 0.05) : 0;
        const distributedFeePortion = durationMonths > 0 ? roundCurrency(processingFee / durationMonths) : 0;
        const monthlyPaymentWithFee = roundCurrency((monthlyPayment || 0) + distributedFeePortion);

        const mappedLoan: Loan = {
          ...loan,
          id: app.id,
          loanRecordId: app.loanId || loan.loanRecordId,
          applicationId: app.id,
          loanNumber: app.applicationNumber || loan.loanNumber,
          customerId: app.borrowerId || loan.customerId,
          customerCode: app.borrower?.accountNumber || loan.customerCode,
          customerName: app.customerName ?? (app.borrower ? `${app.borrower.firstName} ${app.borrower.lastName}` : loan.customerName),
          customerPhone: app.customerPhone ?? app.borrower?.contact?.phone ?? app.borrower?.contact?.phoneNumber ?? loan.customerPhone,
          savingsAccountNumber: (app as any).savingsAccountNumber || loan.customerCode || app.borrower?.accountNumber,
          customerEmail: app.customerEmail ?? loan.customerEmail,
          customerAddress: app.customerAddress ?? loan.customerAddress,
          occupation: app.occupation ?? loan.occupation,
          monthlyIncome: app.monthlyIncome ?? loan.monthlyIncome,
          dependents: (app as any).dependents ?? loan.dependents,
          loanType: app.loanType as LoanType,
          principalAmount: effectiveAmount,
          approvedAmount: approvedAmount,
          requestedAmount: requestedAmount,
          interestRate,
          termMonths: durationMonths,
          monthlyPayment: monthlyPayment || loan.monthlyPayment,
          monthlyPaymentWithFee,
          remainingBalance: effectiveAmount,
          monthlyInterestRate: monthlyRate > 0 ? monthlyRate : undefined,
          disbursementDate: app.disbursementDate ?? loan.disbursementDate,
          maturityDate: app.disbursementDate ? new Date(new Date(app.disbursementDate).setMonth(new Date(app.disbursementDate).getMonth() + (durationMonths ?? 0))).toISOString() : loan.maturityDate,
          paidAmount: loan.paidAmount ?? 0,
          status: mapApplicationStatusToLoanStatus(app.status as string),
          currency: (app.currency as 'HTG' | 'USD') || loan.currency,
          collateral: app.guarantees?.find(g => g.type === 'Collateral')?.description || loan.collateral,
          guarantors: (app.guarantees || []).filter(g => g.type === 'Personal').map(g => g.contactName || g.description) || loan.guarantors,
          branch: app.branchName ?? loan.branch,
          loanOfficer: app.loanOfficerName ?? loan.loanOfficer,
          createdAt: app.createdAt,
          approvedBy: loan.approvedBy || app.loanOfficerId,
          approvedByName: (loan as any).approvedByName ?? ((app as any).approverName || (app as any).ApproverName || (app as any).approvedByName || app.loanOfficerName || loan.approvedBy || (app as any).approvedBy),
          approvedAt: app.approvedAt
        };

        setSelectedLoan(mappedLoan);
        setShowDetails(true);
        return;
      } catch (err: any) {
        console.error('Error fetching application for details modal:', err);
        // Fallback to default behavior
      }
    }

    // If loan has a loanRecordId but missing full loan data (installment/monthlyPayment), fetch it
    if (loan.loanRecordId && (!loan.monthlyPayment || loan.monthlyPayment === 0 || !loan.monthlyInterestRate)) {
      try {
        const fullLoan = await microcreditLoanService.getLoan(loan.loanRecordId);
        const fallbackMonthlyRate = resolveMonthlyRatePercent(loan.monthlyInterestRate, loan.interestRate);
        const normalizedMonthlyRate = resolveMonthlyRatePercent(
          (fullLoan as any).monthlyInterestRate,
          fullLoan.interestRate ?? loan.interestRate,
          fallbackMonthlyRate
        );
        const normalizedAnnualRate = resolveAnnualRatePercent(
          normalizedMonthlyRate,
          fullLoan.interestRate ?? loan.interestRate,
          normalizePercentValue(fullLoan.interestRate ?? loan.interestRate ?? normalizedMonthlyRate * 12)
        );
        const termMonths = fullLoan.durationMonths ?? loan.termMonths ?? 0;
        const principalAmount = roundCurrency(fullLoan.principalAmount ?? loan.principalAmount ?? 0);
        const normalizedMonthlyPayment = roundCurrency(
          fullLoan.installmentAmount ??
          loan.monthlyPayment ??
          calculateMonthlyPaymentFromMonthlyRate(principalAmount, normalizedMonthlyRate, termMonths)
        );
        const mappedLoan: Loan = {
          ...loan,
          id: fullLoan.id || loan.id,
          loanRecordId: fullLoan.id || loan.loanRecordId,
          loanNumber: fullLoan.loanNumber ?? loan.loanNumber,
          customerId: fullLoan.borrowerId ?? loan.customerId,
          customerName: fullLoan.borrowerName ?? loan.customerName,
          principalAmount,
          interestRate: normalizedAnnualRate,
          monthlyInterestRate: normalizedMonthlyRate > 0 ? normalizedMonthlyRate : undefined,
          termMonths,
          monthlyPayment: normalizedMonthlyPayment,
          monthlyPaymentWithFee: normalizedMonthlyPayment, // Active loan schedule already includes only principal+interest; fee not financed here
          disbursementDate: fullLoan.disbursementDate ?? loan.disbursementDate,
          maturityDate: fullLoan.maturityDate ?? loan.maturityDate,
          remainingBalance: fullLoan.outstandingBalance ?? loan.remainingBalance,
          paidAmount: fullLoan.amountPaid ?? loan.paidAmount,
          status: castLoanStatus(fullLoan.status as any) ?? loan.status,
          currency: (fullLoan.currency as 'HTG' | 'USD') || loan.currency,
          branch: fullLoan.branchName ?? loan.branch,
          loanOfficer: loan.loanOfficer,
          createdAt: fullLoan.createdAt ?? loan.createdAt
          ,approvedByName: (fullLoan as any).approvedByName || (fullLoan as any).approverName || (fullLoan as any).loanOfficerName || loan.approvedByName || (fullLoan as any).approvedBy || loan.approvedBy
        };

        setSelectedLoan(mappedLoan);
        setShowDetails(true);
        return;
      } catch (err: any) {
        console.error('Error fetching full loan for details modal:', err);
        // Fallback to showing the loan object we have
      }
    }

    setSelectedLoan(loan);
    setShowDetails(true);
  };

  const handleApproval = async (loan: Loan) => {
    setSelectedLoan(loan);
    setSelectedApplication(null);
    try {
      // Fetch full application details from backend to avoid placeholder/mock values
      const applicationId = loan.applicationId || loan.id;
      if (!applicationId) {
        // If we don't have an application ID, try mapping by loanRecordId
        toast.error('Impossible de trouver la référence de la demande.');
        return;
      }

      const fetchedApplication = await microcreditLoanApplicationService.getApplication(applicationId);
      setSelectedApplication(fetchedApplication as any);
      setShowApprovalWorkflow(true);
    } catch (error: any) {
      console.error('Error fetching application before approval:', error);
      toast.error(error?.message || 'Erreur lors de la récupération de la demande');
      // Still show modal with minimal data if caller wants, but we prefer real data
      setShowApprovalWorkflow(true);
    }
  };

  const handleDisburse = async (loan: Loan) => {
    let loanRecordId = loan.loanRecordId;
    let loanForModal: Loan = loan;

  if (!loanRecordId && loan.status === LoanStatus.APPROVED && loan.applicationId) {
      try {
        const fetchedLoanId = await microcreditLoanApplicationService.getLoanIdForApplication(loan.applicationId);

        if (fetchedLoanId) {
          loanRecordId = fetchedLoanId;
          loanForModal = { ...loan, loanRecordId: fetchedLoanId };

          // Update loan list with the freshly retrieved loan ID so future actions reuse it
          setLoans(prev => prev.map(existing => {
            if (existing.id === loan.id || existing.applicationId === loan.applicationId) {
              return {
                ...existing,
                loanRecordId: fetchedLoanId
              };
            }
            return existing;
          }));
        }
      } catch (error: any) {
        console.error('Could not retrieve loan ID before disbursement:', error);
        toast.error(error?.message || "Impossible de récupérer l'identifiant du prêt.");
      }
    }

    if (!loanRecordId && loan.status === LoanStatus.APPROVED) {
      toast.error("Impossible de débloquer ce prêt: identifiant absent. Actualisez la liste ou contactez l'administrateur.");
      return;
    }

    setSelectedLoan(loanForModal);
    setShowDisburseModal(true);
  };

  const handleDisburseSuccess = () => {
    // Switch to loans tab to show the newly disbursed loan
    changeTab('loans');
    toast.success('Le prêt a été déboursé avec succès');
  };

  const handleApproveLoan = async (applicationId: string, level: number, comment: string, approvedAmount?: number, disbursementDate?: string) => {
  // Prevent duplicate approve requests for the same application
  if (approvingId === applicationId) return;
  setApprovingId(applicationId);

  // Show a single loading toast that will be updated with success/error
  const toastId = toast.loading('Requête en cours...');

  try {
      // First, check if application needs to be submitted (if it's still Draft)
  const app = loans.find(l => l.id === applicationId || l.applicationId === applicationId);
      if (app?.applicationStatus === ApplicationStatus.DRAFT) {
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
                  { id: toastId, duration: 6000 }
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
      
      // Now approve with disbursement date
  await microcreditLoanApplicationService.approveApplication(applicationId, comment, approvedAmount, disbursementDate);
      toast.success('Demande approuvée avec succès!', { id: toastId });
      setShowApprovalWorkflow(false);
      // Reload loans to show updated status
      await loadLoans();
    } catch (error: any) {
      console.error('Error approving loan:', error);

      // Better handling for 409 Conflict returned by backend
      const status = error?.status || error?.response?.status;
      const serverMessage = (error?.message || error?.response?.data?.message || error?.response?.data || '').toString();

      if (status === 409) {
        // Common backend causes: already submitted/approved, validation failed, not in reviewable state
        const msg = serverMessage.toLowerCase();
        if (msg.includes('already') || msg.includes('déjà') || msg.includes('approuvé') || msg.includes('approved')) {
          // If backend says it's already approved/submitted, show friendly feedback
          toast.success('Demande déjà approuvée ou déjà soumise.', { id: toastId });
        } else if (msg.includes('validation')) {
          toast.error('La demande ne peut pas être soumise : validation échouée (documents manquants).', { id: toastId });
        } else if (msg.includes('reviewable') || msg.includes('review') || msg.includes('etat')) {
          toast.error('La demande n\'est pas dans un état approuvable. Veuillez vérifier le statut ou lancer la révision.', { id: toastId });
        } else {
          toast.error(serverMessage || 'Conflit lors de l\'approbation (409)', { id: toastId });
        }
      } else if (error?.message === 'AUTH_REQUIRED') {
        setAuthRequired(true);
        toast.error('Veuillez vous connecter pour effectuer cette action', { id: toastId });
      } else {
        const errorMsg = error?.message || error?.response?.data || 'Erreur lors de l\'approbation de la demande';
        toast.error(errorMsg, { id: toastId });
      }
    } finally {
      // Clear in-flight flag
      if (approvingId === applicationId) setApprovingId(null);
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
    try {
      if (activeTab === 'applications') {
        // Export pending applications shown in the Applications tab
        const rows = filteredLoans
          .filter(l => l.status === LoanStatus.PENDING)
          .map(l => {
            const requested = l.requestedAmount ?? l.principalAmount ?? 0;
            const approved = l.approvedAmount ?? null;
            const deltaPct = approved && requested > 0
              ? (((approved - requested) / requested) * 100)
              : null;
            // Application processing fee and net-to-client, based on approved amount when available
            const fee = approved ? roundCurrency(approved * 0.05) : null;
            const netAmount = approved ? roundCurrency(approved - (fee ?? 0)) : null;
            const mensualiteAvecFrais = l.monthlyPaymentWithFee ?? (l.monthlyPayment + (fee && l.termMonths ? roundCurrency(fee / l.termMonths) : 0));
            return {
              date: l.createdAt,
              numero: l.loanNumber,
              client: l.customerName,
              branche: l.branch,
              type: getLoanTypeLabel(l.loanType),
              devise: l.currency,
              montant_demande: requested,
              montant_approuve: approved ?? '',
              difference_pct: deltaPct !== null ? deltaPct.toFixed(1) + '%' : '',
              mensualite_estimee: l.monthlyPayment,
              duree_mois: l.termMonths,
              frais_dossier_5pct: fee ?? '',
              net_a_verser: netAmount ?? '',
              mensualite_avec_frais: mensualiteAvecFrais
            };
          });

        const headers = [
          'Date Demande',
          'Numéro',
          'Client',
          'Succursale',
          'Type',
          'Devise',
          'Montant Demandé',
          'Montant Approuvé',
          'Différence %',
          'Mensualité (estimée)',
          'Durée (mois)',
          'Frais dossier (5%)',
          'Net à verser',
          'Mensualité + Frais (estimée)'
        ];

        const csvContent = [
          headers.join(','),
          ...rows.map(r => [
            new Date(r.date).toLocaleDateString('fr-FR'),
            r.numero,
            `"${r.client}"`,
            r.branche,
            r.type,
            r.devise,
            r.montant_demande,
            r.montant_approuve,
            r.difference_pct,
            r.mensualite_estimee,
            r.duree_mois,
            r.frais_dossier_5pct,
            r.net_a_verser,
            r.mensualite_avec_frais
          ].join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `demandes_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast.success('Export des demandes réussi');
        return;
      }

      // Fallback: simple notification for other tabs (existing behavior can be extended later)
      toast.success('Export en cours...');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error("Erreur lors de l'export");
    }
  };

  // Export PDF for current tab view (applications, disbursement, loans, overdue, payments)
  const handleExportPdf = () => {
    try {
      const openPrintWindow = (html: string) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) { toast.error('Veuillez autoriser les pop-ups pour exporter en PDF'); return; }
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      };

      const formatAmount = (n?: number, currency: 'HTG' | 'USD' = 'HTG') => formatCurrency(roundCurrency(n ?? 0), currency);
      const now = new Date();
      const titleMap: Record<LoanManagementTab, string> = {
        overview: 'Tableau de Bord',
        applications: 'Nouvelles Demandes',
        disbursement: 'À Décaisser',
        loans: 'Prêts Actifs',
        overdue: 'Prêts en Retard',
        payments: 'Paiements',
        reports: 'Rapports'
      };
      const pageTitle = `Export \u2014 ${titleMap[activeTab]} \u2014 ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR')}`;

      // Build rows depending on tab
      let tableHeader = '';
      let tableRowsHtml = '';

      if (activeTab === 'payments') {
        tableHeader = '<tr><th>Date</th><th>Reçu</th><th>Montant</th><th>Traité Par</th><th>Succursale</th><th>Statut</th></tr>';
        tableRowsHtml = payments.map(p => {
          const date = p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('fr-FR') : (p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : 'N/A');
          const amount = formatAmount(p.amount, (p.currency as any) || 'HTG');
          const receipt = p.receiptNumber || '';
          const processedBy = p.processedByName || '';
          const branch = p.branchName || '';
          const status = p.status || '';
          return `<tr><td>${date}</td><td>${receipt}</td><td>${amount}</td><td>${processedBy}</td><td>${branch}</td><td>${status}</td></tr>`;
        }).join('');
      } else {
        tableHeader = '<tr><th>#</th><th>Client</th><th>Montant</th><th>Mensualité</th><th>Statut</th><th>Succursale</th></tr>';
        tableRowsHtml = filteredLoans.map(l => {
          const num = l.loanNumber || l.applicationId || l.id;
          const client = l.customerName || 'Client';
          const amount = formatAmount(l.principalAmount, l.currency);
          const mensualite = formatAmount(l.monthlyPaymentWithFee ?? l.monthlyPayment, l.currency);
          const statutLabel = (() => {
            switch (l.status) {
              case LoanStatus.PENDING: return 'En attente';
              case LoanStatus.APPROVED: return 'Approuvé';
              case LoanStatus.ACTIVE: return 'Actif';
              case LoanStatus.COMPLETED: return 'Soldé';
              case LoanStatus.OVERDUE: return 'En retard';
              case LoanStatus.DEFAULTED: return 'En défaut';
              case LoanStatus.CANCELLED: return 'Annulé';
              default: return String(l.status);
            }
          })();
          const branch = l.branch || '';
          return `<tr><td>${num}</td><td>${client}</td><td>${amount}</td><td>${mensualite}</td><td>${statutLabel}</td><td>${branch}</td></tr>`;
        }).join('');
      }

      const html = `<!doctype html>
        <html lang="fr"><head>
        <meta charset="utf-8" />
        <title>${pageTitle}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
          th { background: #f3f4f6; text-align: left; }
          tfoot td { font-weight: 600; }
        </style>
        </head><body>
        <h1>${pageTitle}</h1>
        <table>
          <thead>${tableHeader}</thead>
          <tbody>${tableRowsHtml}</tbody>
        </table>
        </body></html>`;

      if (!tableRowsHtml) {
        toast.error('Aucune donnée à exporter pour cet onglet');
        return;
      }
      openPrintWindow(html);
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  // Export overdue loans to CSV
  const handleExportOverdueLoans = () => {
    try {
      const overdueLoans = loans.filter(l => {
        if ((l.daysOverdue || 0) <= 0) return false;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchesSearch = (l.loanNumber && l.loanNumber.toLowerCase().includes(term)) || (l.customerName && l.customerName.toLowerCase().includes(term)) || (l.customerPhone && l.customerPhone.toLowerCase().includes(term));
          if (!matchesSearch) return false;
        }
        if (branchFilter !== 'ALL' && l.branch !== branchFilter) return false;
        if (currencyFilter !== 'ALL' && l.currency !== currencyFilter) return false;
        const days = l.daysOverdue || 0;
        if (overdueDaysFilter === '1-30' && (days < 1 || days > 30)) return false;
        if (overdueDaysFilter === '31-60' && (days < 31 || days > 60)) return false;
        if (overdueDaysFilter === '60+' && days <= 60) return false;
        if (agentFilter && l.loanOfficer && !l.loanOfficer.toLowerCase().includes(agentFilter.toLowerCase())) return false;
        return true;
      });

      const csvContent = [
        ['Numéro Prêt', 'Client', 'Téléphone', 'Succursale', 'Montant Prêt', 'Solde Restant', 'Frais Retard', 'Jours Retard', 'Devise', 'Agent'].join(','),
        ...overdueLoans.map(loan => [
          loan.loanNumber,
          `"${loan.customerName}"`,
          loan.customerPhone || '',
          loan.branch,
          loan.principalAmount,
          loan.remainingBalance,
          (loan.lateFees || 0).toFixed(2),
          loan.daysOverdue,
          loan.currency,
          `"${loan.loanOfficer}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `prets-en-retard-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('Export réussi!');
    } catch (error) {
      console.error('Error exporting overdue loans:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  // Export payments to CSV
  const handleExportPayments = () => {
    try {
      const filteredPayments = payments.filter(payment => {
        if (!paymentsSearchTerm) return true;
        const term = paymentsSearchTerm.toLowerCase();
        return (payment.receiptNumber && payment.receiptNumber.toLowerCase().includes(term)) ||
               (payment.reference && payment.reference.toLowerCase().includes(term)) ||
               (payment.processedByName && payment.processedByName.toLowerCase().includes(term));
      });

      const csvContent = [
        ['Date', 'Numéro Reçu', 'Référence', 'Méthode', 'Montant', 'Principal', 'Intérêt', 'Pénalités', 'Devise', 'Traité Par', 'Succursale', 'Statut'].join(','),
  ...filteredPayments.map(payment => [
          new Date(payment.paymentDate).toLocaleDateString('fr-FR'),
          payment.receiptNumber,
          payment.reference || '',
          payment.paymentMethod,
          payment.amount.toFixed(2),
          payment.principalAmount.toFixed(2),
          payment.interestAmount.toFixed(2),
          payment.penaltyAmount.toFixed(2),
          payment.currency,
          `"${payment.processedByName}"`,
          payment.branchName || branchesList.find((b: any) => b.id === payment.branchId)?.name || (payment.branchId ? String(payment.branchId) : 'Principal'),
          payment.status
        ].join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `paiements-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('Export réussi!');
    } catch (error) {
      console.error('Error exporting payments:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  // Load payments data
  const loadPayments = async () => {
    try {
      setPaymentsLoading(true);
      // Ensure branches are loaded for fallback mapping
      if (!branchesList || branchesList.length === 0) {
        try {
          const fetchedBranches = await microcreditLoanApplicationService.getBranches();
          setBranchesList(fetchedBranches || []);
        } catch (err) {
          console.error('Error preloading branches for payments fallback:', err);
        }
      }

      const response = await microcreditPaymentService.getPaymentHistory(
        paymentsPage,
        paymentsPageSize,
        paymentsDateFrom || undefined,
        paymentsDateTo || undefined,
        paymentsStatusFilter !== 'ALL' ? paymentsStatusFilter : undefined,
        branchFilter !== 'ALL' ? parseInt(branchFilter) : undefined
      );
      
      // Ensure branchName is populated for each payment by falling back to the branch list
      const normalizedPayments = (response.payments || []).map((p: any) => {
        const fallbackBranch = branchesList.find((b: any) => b.id === p.branchId)?.name;
        return {
          ...p,
          branchName: p.branchName || fallbackBranch || (p.branchId ? String(p.branchId) : 'Principal')
        };
      });
      setPayments(normalizedPayments);
      setPaymentsTotalCount(response.totalCount);
      setPaymentsTotalPages(response.totalPages);
    } catch (error: any) {
      console.error('Error loading payments:', error);
      toast.error(error.message || 'Erreur lors du chargement des paiements');
    } finally {
      setPaymentsLoading(false);
    }
  };

  // Load payments when tab is active or filters change
  useEffect(() => {
    if (activeTab === 'payments') {
      loadPayments();
    }
  }, [activeTab, paymentsPage, paymentsPageSize, paymentsStatusFilter, paymentsDateFrom, paymentsDateTo, branchFilter]);

  // Dashboard functions
  const loadDashboardData = async () => {
    try {
      setDashboardLoading(true);
      
      // Load dashboard stats from the backend API and count of pending applications
      const [stats, pendingAppsPage, approvedAppsPage, activeLoansData] = await Promise.all([
        microcreditLoanApplicationService.getDashboardStats({
          branchId: selectedBranch !== 'all' ? parseInt(selectedBranch) : undefined,
          dateRange: timeRange
        }),
        microcreditLoanApplicationService.getApplicationsPage({
          status: 'Submitted',
          page: 1,
          pageSize: 1
        }),
        microcreditLoanApplicationService.getApplicationsPage({
          status: 'Approved',
          page: 1,
          pageSize: 1
        }),
        microcreditLoanApplicationService.getActiveLoans()
      ]);

      // Extract data with proper field mapping
      const totalOutstanding = {
        HTG: (stats.totalOutstanding?.HTG || stats.totalOutstanding?.htg || 0),
        USD: (stats.totalOutstanding?.USD || stats.totalOutstanding?.usd || 0)
      };
      
      const interestRevenue = {
        HTG: (stats.interestRevenue?.HTG || stats.interestRevenue?.htg || 0),
        USD: (stats.interestRevenue?.USD || stats.interestRevenue?.usd || 0)
      };
      
      const overdueAmount = {
        HTG: (stats.overdueLoans?.amount?.HTG || stats.overdueLoans?.amount?.htg || 0),
        USD: (stats.overdueLoans?.amount?.USD || stats.overdueLoans?.amount?.usd || 0)
      };
      
      // Calculate total portfolio value (converting USD to HTG for total)
      const totalPortfolio = totalOutstanding.HTG + (totalOutstanding.USD * 130);
      
      // Calculate PAR30 (Portfolio at Risk)
      const overdueSum = overdueAmount.HTG + (overdueAmount.USD * 130);
      const par30 = totalPortfolio > 0 ? (overdueSum / totalPortfolio) * 100 : 0;
      
      // Set counts
      setActiveLoansCount(stats.activeLoans || 0);
      const approvedCount = approvedAppsPage.totalCount || 0;
      setLoansToDisburseCount(approvedCount);
      const pendingCount = pendingAppsPage.totalCount || 0;
      setPendingApplicationsCount(pendingCount);
      
      // Count overdue loans from active loans data
      const overdueCount = activeLoansData.filter((loan: any) => {
        const daysOverdue = loan.daysOverdue ?? 0;
        return daysOverdue > 0;
      }).length;

      const newStats: DashboardStats = {
        totalPortfolio,
        activeClients: stats.totalClients || 0,
        repaymentRate: stats.repaymentRate || 0,
        par30,
        pendingApplications: pendingCount,
        loansToDisburse: approvedCount,
        criticalOverdueLoans: overdueCount,
        monthlyGrowth: calculateMonthlyGrowth(stats),
        interestRevenue: interestRevenue.HTG + (interestRevenue.USD * 130),
        averageLoanSize: stats.activeLoans > 0 ? totalPortfolio / stats.activeLoans : 0
      };

      setDashboardStats(newStats);
      
      // Load chart data and agent performance
      const [chartData, agentPerformance] = await Promise.all([
        microcreditLoanApplicationService.getPortfolioTrend(timeRange),
        microcreditLoanApplicationService.getAgentPerformance()
      ]);
      
      setChartData(chartData);
      setAgents(agentPerformance);
      
      setDashboardLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Erreur lors du chargement des données du tableau de bord');
      setDashboardLoading(false);
    }
  };

  // Fonctions utilitaires de calcul
  const calculateRepaymentRate = (loans: any[]): number => {
    if (loans.length === 0) return 0;
    const completedLoans = loans.filter(loan => loan.status === LoanStatus.COMPLETED);
    return (completedLoans.length / loans.length) * 100;
  };

  const calculatePAR30 = (overdueLoans: any[], allLoans: any[]): number => {
    if (allLoans.length === 0) return 0;
    const parAmount = overdueLoans
      .filter(loan => loan.daysOverdue > 30)
      .reduce((sum, loan) => sum + loan.remainingBalance, 0);
    const totalPortfolio = allLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
    return totalPortfolio > 0 ? (parAmount / totalPortfolio) * 100 : 0;
  };

  const calculateMonthlyGrowth = (stats: any): number => {
    // Calculate monthly growth based on new loans this month vs last month
    const thisMonth = stats.newLoansThisMonth || 0;
    const lastMonth = stats.loansCompletedThisMonth || 1; // Avoid division by zero
    return lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
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
              onClick={() => changeTab('overview')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-900 hover:text-black hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                <span>Vue d'ensemble</span>
              </div>
            </button>
            <button
              onClick={() => changeTab('applications')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'applications'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-900 hover:text-black hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span>Nouvelles Demandes</span>
              </div>
            </button>
            <button
              onClick={() => changeTab('disbursement')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'disbursement'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-900 hover:text-black hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <span>À Décaisser</span>
              </div>
            </button>
            <button
              onClick={() => changeTab('loans')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'loans'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-900 hover:text-black hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                <span>Prêts Actifs</span>
              </div>
            </button>
            <button
              onClick={() => changeTab('overdue')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overdue'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-900 hover:text-black hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Prêts en Retard</span>
              </div>
            </button>
            <button
              onClick={() => changeTab('payments')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'payments'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-900 hover:text-black hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <span>Paiements</span>
              </div>
            </button>
          <button
            onClick={() => changeTab('reports')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reports'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-900 hover:text-black hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span>Rapports</span>
            </div>
          </button>
          </nav>
        </div>
      </div>

      {/* Overview/Dashboard Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* En-tête simplifiée (filtres retirés selon demande) */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Tableau de Bord Microcrédits</h2>
              <p className="text-gray-600 mt-1">Vue d'ensemble de votre portefeuille</p>
            </div>
          </div>

          {/* Cartes Statistiques Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Portefeuille Total"
              value={formatCurrency(dashboardStats.totalPortfolio, 'HTG')}
              trend={dashboardStats.monthlyGrowth}
              icon={<DollarSign className="w-6 h-6" />}
              color="blue"
            />
            
            <StatCard 
              title="Clients Actifs"
              value={dashboardStats.activeClients.toLocaleString()}
              trend={8.2}
              icon={<Users className="w-6 h-6" />}
              color="green"
            />
            
            <StatCard 
              title="Taux Remboursement"
              value={`${dashboardStats.repaymentRate}%`}
              trend={2.1}
              icon={<TrendingUp className="w-6 h-6" />}
              color="indigo"
            />
            
            <StatCard 
              title="PAR 30+ Jours"
              value={`${dashboardStats.par30}%`}
              trend={-1.5}
              icon={<AlertTriangle className="w-6 h-6" />}
              color="red"
            />
          </div>

          {/* Deuxième ligne de statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard 
              title="Demandes en Attente"
              value={dashboardStats.pendingApplications.toString()}
              trend={0}
              icon={<Clock className="w-6 h-6" />}
              color="yellow"
              size="small"
            />
            
            <StatCard 
              title="À Décaisser"
              value={loansToDisburseCount.toString()}
              trend={0}
              icon={<CheckCircle className="w-6 h-6" />}
              color="blue"
              size="small"
            />
            
            <StatCard 
              title="Retard Critique"
              value={dashboardStats.criticalOverdueLoans.toString()}
              trend={0}
              icon={<AlertTriangle className="w-6 h-6" />}
              color="red"
              size="small"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Alertes Prioritaires */}
            <div className="lg:col-span-1">
              <PriorityAlerts 
                pendingApplications={dashboardStats.pendingApplications}
                criticalOverdue={dashboardStats.criticalOverdueLoans}
                loansToDisburse={loansToDisburseCount}
                activeLoansCount={activeLoansCount}
                onNavigate={(tab, status) => {
                  changeTab(tab);
                  if (status) {
                    const loanStatusMap: Record<string, LoanStatus> = {
                      'OVERDUE': LoanStatus.OVERDUE,
                      'APPROVED': LoanStatus.APPROVED,
                      'ACTIVE': LoanStatus.ACTIVE,
                      'PENDING': LoanStatus.PENDING,
                      'SUBMITTED': LoanStatus.PENDING
                    };
                    setStatusFilter(loanStatusMap[status] || 'ALL');
                  }
                }}
              />
            </div>

            {/* Performance Agents */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Performance des Agents</h3>
                  <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    Voir tout
                  </button>
                </div>
                <div className="space-y-4">
                  {agents.map((agent, index) => (
                    <AgentPerformanceRow key={`${agent.id}-${agent.name}-${index}`} agent={agent} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Graphiques */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Évolution du Portefeuille</h3>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 hover:text-black">
                  <Download className="w-4 h-4" />
                  Exporter
                </button>
              </div>
            </div>
            <PortfolioChart data={chartData} />
          </div>
        </div>
      )}



      {/* Filters */}
      {(activeTab === 'loans' || activeTab === 'disbursement') && (
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
          {/* Branch filter for loans and disbursement */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="ALL">Toutes les succursales</option>
            {branchesList && branchesList.length > 0 ? (
              branchesList.map((b: any) => (
                <option key={b.id || b.name} value={b.name || b.id}>{b.name || b.id}</option>
              ))
            ) : (
              Array.from(new Set(loans.map(l => l.branch))).filter(Boolean).sort().map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))
            )}
          </select>
          {/* Date filters: From & To */}
          <input
            type="date"
            value={dateFromFilter}
            onChange={(e) => setDateFromFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            title="Date de début: filtre selon la date d'approbation si disponible, sinon date de création"
          />
          <input
            type="date"
            value={dateToFilter}
            onChange={(e) => setDateToFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            title="Date de fin: filtre selon la date d'approbation si disponible, sinon date de création"
          />

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
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Exporter PDF"
            >
              Exporter PDF
            </button>
          {(searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL' || currencyFilter !== 'ALL' || branchFilter !== 'ALL' || dateFromFilter || dateToFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setCurrencyFilter('ALL');
                setBranchFilter('ALL');
                setDateFromFilter('');
                setDateToFilter('');
              }}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Réinitialiser les filtres
            </button>
            )}
          </div>
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
                  {pendingApplicationsCount} demande(s) à traiter
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={handleExportPdf}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                  title="Exporter PDF"
                >
                  Exporter PDF
                </button>
                {/* Type Filter */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Type de Crédit</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="ALL">Tout</option>
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
                </div>
                {/* Branch Filter */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Succursale</label>
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="ALL">Tout</option>
                    {branchesList && branchesList.length > 0 ? (
                      branchesList.map((b: any) => (
                        <option key={b.id || b.name} value={b.name || b.id}>{b.name || b.id}</option>
                      ))
                    ) : (
                      Array.from(new Set(loans.map(l => l.branch))).filter(Boolean).sort().map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))
                    )}
                  </select>
                </div>
                {/* Date From Filter */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">De</label>
                  <input
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                {/* Date To Filter */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Jiska</label>
                  <input
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
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
                {filteredLoans.filter(l => l.status === LoanStatus.PENDING).length === 0 ? (
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
                  filteredLoans.filter(l => l.status === LoanStatus.PENDING).map((loan) => (
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
                          {formatCurrency(loan.requestedAmount ?? loan.principalAmount, loan.currency)}
                        </p>
                        {loan.approvedAmount && (loan.approvedAmount !== (loan.requestedAmount ?? loan.principalAmount)) && (
                          <div className="text-xs text-blue-600 font-medium">
                            <p>Approuvé: {formatCurrency(loan.approvedAmount, loan.currency)}</p>
                            {loan.requestedAmount && loan.requestedAmount > 0 && (
                              <p className="text-[11px] text-blue-500">
                                Différence: {(((loan.approvedAmount - loan.requestedAmount) / loan.requestedAmount) * 100).toFixed(1)}%
                              </p>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-500">
                          Mensualité (hors frais): {formatCurrency(loan.monthlyPayment, loan.currency)}
                        </p>
                        {typeof loan.monthlyPaymentWithFee === 'number' && loan.monthlyPaymentWithFee > 0 && (
                          <p className="text-xs font-semibold text-purple-600">
                            Mensualité + Frais: {formatCurrency(loan.monthlyPaymentWithFee, loan.currency)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{loan.termMonths} mois</p>
                        <p className="text-xs text-gray-500">Taux mensuel: {resolveMonthlyRatePercent(loan.monthlyInterestRate, loan.interestRate, 3.5).toFixed(2)}%</p>
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
                          {!loan.collateral && (!loan.guarantors || loan.guarantors.length === 0) && (
                            <p className="text-xs text-gray-400 italic">Oken garanti</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(loan.status)}
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
      {(activeTab === 'loans' || activeTab === 'disbursement') && (
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
                  Mensualité + Frais
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restant
                </th>
                {/* Removed 'Prochain Paiement' column as requested */}
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
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <CreditCard className="w-12 h-12 mb-4 text-gray-300" />
                      <p className="text-lg font-medium">
                        {activeTab === 'disbursement' ? 'Aucun prêt en attente de décaissement' : 'Aucun prêt trouvé'}
                      </p>
                      <p className="text-sm mt-2">
                        {activeTab === 'disbursement'
                          ? 'Les prêts approuvés apparaîtront ici pour être déboursés.'
                          : 'Modifiez vos filtres ou créez une nouvelle demande'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => {
                  const monthlyRatePercent = resolveMonthlyRatePercent(loan.monthlyInterestRate, loan.interestRate, 3.5);
                  
                  // Force recalculation of monthly payment to ensure it matches the displayed interest rate
                  // This fixes discrepancies where the backend might have stored a payment based on a default rate
                  const effectiveMonthlyPayment = roundCurrency(
                    calculateMonthlyPaymentFromMonthlyRate(loan.principalAmount, monthlyRatePercent, loan.termMonths)
                  );
                  const processingFeeA = (loan.approvedAmount ?? loan.principalAmount) ? roundCurrency((loan.approvedAmount ?? loan.principalAmount) * 0.05) : 0;
                  const distributedFeePortionA = loan.termMonths > 0 ? roundCurrency(processingFeeA / loan.termMonths) : 0;
                  const effectiveMonthlyPaymentWithFee = roundCurrency(effectiveMonthlyPayment + distributedFeePortionA);
                  
                  // Recalculate remaining balance to be consistent with the new monthly payment
                  // We assume the paid amount is correct, but the total due needs to be adjusted to the new rate
                  // This is a display-only fix; the database ledger remains as is until corrected
                  const totalDue = effectiveMonthlyPayment * loan.termMonths;
                  const totalDueWithFees = roundCurrency((effectiveMonthlyPayment + distributedFeePortionA) * loan.termMonths);
                  const effectiveRemainingBalance = roundCurrency(Math.max(0, totalDueWithFees - (loan.paidAmount ?? 0)));
                  
                  const paidAmount = roundCurrency(loan.paidAmount ?? 0);

                  return (
                    <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{loan.loanNumber}</p>
                          <p className="text-xs text-gray-500">{loan.branch}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900">{loan.customerName}</p>
                        <p className="text-xs text-gray-500">Agent: {loan.loanOfficer || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getLoanTypeBadge(loan.loanType)}
                        <p className="text-xs text-gray-500 mt-1">
                          {loan.termMonths} mois · Taux mensuel: {monthlyRatePercent.toFixed(2)}%
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(roundCurrency(loan.principalAmount), loan.currency)}
                        </p>
                        {loan.approvedAmount && (
                          <p className="text-[11px] text-gray-600">
                            Frais dossier (5%): {formatCurrency(Math.round((loan.approvedAmount || 0) * 0.05), loan.currency)}
                          </p>
                        )}
                        {(loan.requestedAmount && loan.requestedAmount !== loan.principalAmount) && (
                          <p className="text-xs text-gray-500">Demandé: {formatCurrency(loan.requestedAmount, loan.currency)}</p>
                        )}
                        {(loan.approvedAmount && loan.approvedAmount !== loan.principalAmount) && (
                          <div className="text-xs text-blue-600 font-medium">
                            <p>Approuvé: {formatCurrency(loan.approvedAmount, loan.currency)}</p>
                            {loan.requestedAmount && loan.requestedAmount > 0 && (
                              <p className="text-[11px] text-blue-500">
                                Différence: {(((loan.approvedAmount - loan.requestedAmount) / loan.requestedAmount) * 100).toFixed(1)}%
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-blue-600">
                          {formatCurrency(effectiveMonthlyPaymentWithFee, loan.currency)}
                        </p>
                        <p className="text-[11px] text-gray-500">Hors frais: {formatCurrency(effectiveMonthlyPayment, loan.currency)}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-semibold text-purple-600">
                            {formatCurrency(effectiveRemainingBalance, loan.currency)}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            Reste à payer (avec frais)
                          </p>
                          <p className="text-xs text-gray-500">
                            Payé: {formatCurrency(paidAmount, loan.currency)}
                          </p>
                        </div>
                      </td>
                      {/* Next payment column removed */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getStatusBadge(loan.status)}
                          {loan.status === LoanStatus.OVERDUE && loan.daysOverdue && loan.daysOverdue > 0 && (
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
                          {loan.status === LoanStatus.PENDING && (
                            <button
                              onClick={() => handleApproval(loan)}
                              className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approuver
                            </button>
                          )}
                          {loan.status === LoanStatus.APPROVED && (
                            <button
                              onClick={() => handleDisburse(loan)}
                              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                              <DollarSign className="w-4 h-4" />
                              Débourser
                            </button>
                          )}
                          {loan.status === LoanStatus.ACTIVE && (
                            <button
                              onClick={() => { setSelectedLoan(loan); setShowRecouvrementModal(true); }}
                              className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                            >
                              <CreditCard className="w-4 h-4" />
                              Recouvrement
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
          loan={{
            ...selectedLoan,
            remainingBalance: (() => {
               const monthlyRate = resolveMonthlyRatePercent(selectedLoan.monthlyInterestRate, selectedLoan.interestRate, 3.5);
               const effectiveMonthlyPayment = roundCurrency(
                 calculateMonthlyPaymentFromMonthlyRate(selectedLoan.principalAmount, monthlyRate, selectedLoan.termMonths)
               );
               const totalDue = effectiveMonthlyPayment * selectedLoan.termMonths;
               return roundCurrency(Math.max(0, totalDue - (selectedLoan.paidAmount ?? 0)));
            })()
          }}
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
          // If a real application was fetched, use it; otherwise construct a fallback from selectedLoan
          application={selectedApplication ?? ({
            id: selectedLoan.id,
            applicationNumber: selectedLoan.loanNumber,
            borrowerId: selectedLoan.customerId,
            borrower: undefined as any,
            loanType: selectedLoan.loanType,
            requestedAmount: selectedLoan.principalAmount,
            requestedDurationMonths: selectedLoan.termMonths,
            purpose: '',
            currency: selectedLoan.currency as any,
            branchId: 0,
            branchName: selectedLoan.branch,
            monthlyIncome: 0, // fallback placeholder set to 0 to avoid using principal amount as income
            monthlyExpenses: 0,
            existingDebts: 0,
            collateralValue: undefined,
            debtToIncomeRatio: 0,
            dependents: 0,
            interestRate: selectedLoan.interestRate,
            monthlyInterestRate: 0,
            collateralType: selectedLoan.collateral,
            collateralDescription: undefined,
            guarantor1Name: selectedLoan.guarantors?.[0],
            guarantor1Phone: undefined,
            guarantor1Relation: undefined,
            guarantor2Name: selectedLoan.guarantors?.[1],
            guarantor2Phone: undefined,
            guarantor2Relation: undefined,
            hasNationalId: false,
            hasProofOfResidence: false,
            hasProofOfIncome: false,
            hasCollateralDocs: false,
            createdAt: selectedLoan.createdAt,
            updatedAt: selectedLoan.createdAt,
            status: 'PENDING' as any,
            loanOfficerId: '',
            loanOfficerName: selectedLoan.loanOfficer
          } as any)}
          onClose={() => setShowApprovalWorkflow(false)}
          onApprove={handleApproveLoan}
          onReject={handleRejectLoan}
        />
      )}

      {/* Overdue Loans Tab */}
      {activeTab === 'overdue' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  Prêts en Retard
                </h2>
                <p className="text-gray-600 mt-1">
                  Liste des prêts nécessitant un suivi de recouvrement
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={loadLoans}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-900 hover:text-black"
                >
                  <RefreshCw className="w-4 h-4" />
                  Actualiser
                </button>
                <button
                  onClick={handleExportOverdueLoans}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exporter
                </button>
                <button
                  onClick={handleExportPdf}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-900 hover:text-black"
                  title="Exporter PDF"
                >
                  Exporter PDF
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rechercher
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Client, numéro..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Succursale
                </label>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ALL">Toutes</option>
                  {branchesList.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jours de Retard
                </label>
                <select
                  value={overdueDaysFilter}
                  onChange={(e) => setOverdueDaysFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ALL">Tous</option>
                  <option value="1-30">1-30 jours</option>
                  <option value="31-60">31-60 jours</option>
                  <option value="60+">Plus de 60 jours</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Devise
                </label>
                <select
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ALL">Toutes</option>
                  <option value="HTG">HTG</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent
                </label>
                <input
                  type="text"
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  placeholder="Nom agent..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {(searchTerm || branchFilter !== 'ALL' || currencyFilter !== 'ALL' || overdueDaysFilter !== 'ALL' || agentFilter) && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setBranchFilter('ALL');
                    setCurrencyFilter('ALL');
                    setOverdueDaysFilter('ALL');
                    setAgentFilter('');
                  }}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Réinitialiser les filtres
                </button>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total en Retard</span>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {loans.filter(l => {
                    if ((l.daysOverdue || 0) <= 0) return false;
                    if (searchTerm) {
                      const term = searchTerm.toLowerCase();
                      const matchesSearch = (l.loanNumber && l.loanNumber.toLowerCase().includes(term)) || (l.customerName && l.customerName.toLowerCase().includes(term)) || (l.customerPhone && l.customerPhone.toLowerCase().includes(term));
                      if (!matchesSearch) return false;
                    }
                    if (branchFilter !== 'ALL' && l.branch !== branchFilter) return false;
                    if (currencyFilter !== 'ALL' && l.currency !== currencyFilter) return false;
                    const days = l.daysOverdue || 0;
                    if (overdueDaysFilter === '1-30' && (days < 1 || days > 30)) return false;
                    if (overdueDaysFilter === '31-60' && (days < 31 || days > 60)) return false;
                    if (overdueDaysFilter === '60+' && days <= 60) return false;
                    if (agentFilter && l.loanOfficer && !l.loanOfficer.toLowerCase().includes(agentFilter.toLowerCase())) return false;
                    return true;
                  }).length}
                </p>
                <p className="text-sm text-gray-600 mt-1">Prêts</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Montant Dû (HTG)</span>
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {loans.filter(l => {
                    if ((l.daysOverdue || 0) <= 0) return false;
                    if (searchTerm) {
                      const term = searchTerm.toLowerCase();
                      const matchesSearch = (l.loanNumber && l.loanNumber.toLowerCase().includes(term)) || (l.customerName && l.customerName.toLowerCase().includes(term)) || (l.customerPhone && l.customerPhone.toLowerCase().includes(term));
                      if (!matchesSearch) return false;
                    }
                    if (branchFilter !== 'ALL' && l.branch !== branchFilter) return false;
                    if (currencyFilter !== 'ALL' && l.currency !== currencyFilter) return false;
                    const days = l.daysOverdue || 0;
                    if (overdueDaysFilter === '1-30' && (days < 1 || days > 30)) return false;
                    if (overdueDaysFilter === '31-60' && (days < 31 || days > 60)) return false;
                    if (overdueDaysFilter === '60+' && days <= 60) return false;
                    if (agentFilter && l.loanOfficer && !l.loanOfficer.toLowerCase().includes(agentFilter.toLowerCase())) return false;
                    return l.currency === 'HTG';
                  }).reduce((sum, l) => sum + l.remainingBalance, 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-gray-600 mt-1">HTG</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Retard &gt; 30 jours</span>
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-yellow-600">
                  {loans.filter(l => {
                    if ((l.daysOverdue || 0) <= 30) return false;
                    if (searchTerm) {
                      const term = searchTerm.toLowerCase();
                      const matchesSearch = (l.loanNumber && l.loanNumber.toLowerCase().includes(term)) || (l.customerName && l.customerName.toLowerCase().includes(term)) || (l.customerPhone && l.customerPhone.toLowerCase().includes(term));
                      if (!matchesSearch) return false;
                    }
                    if (branchFilter !== 'ALL' && l.branch !== branchFilter) return false;
                    if (currencyFilter !== 'ALL' && l.currency !== currencyFilter) return false;
                    const days = l.daysOverdue || 0;
                    if (overdueDaysFilter === '1-30' && (days < 1 || days > 30)) return false;
                    if (overdueDaysFilter === '31-60' && (days < 31 || days > 60)) return false;
                    if (overdueDaysFilter === '60+' && days <= 60) return false;
                    if (agentFilter && l.loanOfficer && !l.loanOfficer.toLowerCase().includes(agentFilter.toLowerCase())) return false;
                    return true;
                  }).length}
                </p>
                <p className="text-sm text-gray-600 mt-1">Prêts critiques</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Retard &gt; 60 jours</span>
                  <XCircle className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {loans.filter(l => {
                    if ((l.daysOverdue || 0) <= 60) return false;
                    if (searchTerm) {
                      const term = searchTerm.toLowerCase();
                      const matchesSearch = (l.loanNumber && l.loanNumber.toLowerCase().includes(term)) || (l.customerName && l.customerName.toLowerCase().includes(term)) || (l.customerPhone && l.customerPhone.toLowerCase().includes(term));
                      if (!matchesSearch) return false;
                    }
                    if (branchFilter !== 'ALL' && l.branch !== branchFilter) return false;
                    if (currencyFilter !== 'ALL' && l.currency !== currencyFilter) return false;
                    const days = l.daysOverdue || 0;
                    if (overdueDaysFilter === '1-30' && (days < 1 || days > 30)) return false;
                    if (overdueDaysFilter === '31-60' && (days < 31 || days > 60)) return false;
                    if (overdueDaysFilter === '60+' && days <= 60) return false;
                    if (agentFilter && l.loanOfficer && !l.loanOfficer.toLowerCase().includes(agentFilter.toLowerCase())) return false;
                    return true;
                  }).length}
                </p>
                <p className="text-sm text-gray-600 mt-1">Action urgente</p>
              </div>
            </div>

            {/* Overdue Loans Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Numéro Prêt
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Montant Prêt
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Solde Restant
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Frais de Retard
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jours Retard
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Agent
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loans
                      .filter(loan => {
                        // Filtre pour prêts en retard
                        if ((loan.daysOverdue || 0) <= 0) return false;
                        
                        // Filtre par recherche
                        if (searchTerm) {
                          const term = searchTerm.toLowerCase();
                          const matchesSearch = 
                            (loan.loanNumber && loan.loanNumber.toLowerCase().includes(term)) ||
                            (loan.customerName && loan.customerName.toLowerCase().includes(term)) ||
                            (loan.customerPhone && loan.customerPhone.toLowerCase().includes(term));
                          if (!matchesSearch) return false;
                        }
                        
                        // Filtre par succursale
                        if (branchFilter !== 'ALL' && loan.branch !== branchFilter) return false;
                        
                        // Filtre par devise
                        if (currencyFilter !== 'ALL' && loan.currency !== currencyFilter) return false;
                        
                        // Filtre par jours de retard
                        const days = loan.daysOverdue || 0;
                        if (overdueDaysFilter === '1-30' && (days < 1 || days > 30)) return false;
                        if (overdueDaysFilter === '31-60' && (days < 31 || days > 60)) return false;
                        if (overdueDaysFilter === '60+' && days <= 60) return false;
                        
                        // Filtre par agent
                        if (agentFilter && loan.loanOfficer && !loan.loanOfficer.toLowerCase().includes(agentFilter.toLowerCase())) return false;
                        
                        return true;
                      })
                      .sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0))
                      .map((loan) => (
                        <tr 
                          key={loan.id}
                          className={
                            (loan.daysOverdue || 0) >= 60 ? 'bg-red-50' :
                            (loan.daysOverdue || 0) >= 30 ? 'bg-yellow-50' : 
                            'hover:bg-gray-50'
                          }
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">{loan.loanNumber}</span>
                              <span className="text-xs text-gray-500">{loan.branch}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="w-4 h-4 text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{loan.customerName}</div>
                                <div className="text-xs text-gray-500">{loan.customerPhone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm text-gray-900">
                              {loan.principalAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {loan.currency}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-bold text-red-600">
                              {loan.remainingBalance.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {loan.currency}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-bold text-orange-600">
                                {(loan.lateFees || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {loan.currency}
                              </span>
                              <span className="text-xs text-gray-500">
                                0.11667% / jour
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                              (loan.daysOverdue || 0) >= 60 ? 'bg-red-100 text-red-800' :
                              (loan.daysOverdue || 0) >= 30 ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              <Clock className="w-4 h-4" />
                              {loan.daysOverdue}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{loan.loanOfficer}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleViewDetails(loan)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Voir détails"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setSelectedLoan(loan); setShowRecouvrementModal(true); }}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Enregistrer paiement"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* Empty State */}
                {loans.filter(loan => {
                  if ((loan.daysOverdue || 0) <= 0) return false;
                  if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    const matchesSearch = (loan.loanNumber && loan.loanNumber.toLowerCase().includes(term)) || (loan.customerName && loan.customerName.toLowerCase().includes(term)) || (loan.customerPhone && loan.customerPhone.toLowerCase().includes(term));
                    if (!matchesSearch) return false;
                  }
                  if (branchFilter !== 'ALL' && loan.branch !== branchFilter) return false;
                  if (currencyFilter !== 'ALL' && loan.currency !== currencyFilter) return false;
                  const days = loan.daysOverdue || 0;
                  if (overdueDaysFilter === '1-30' && (days < 1 || days > 30)) return false;
                  if (overdueDaysFilter === '31-60' && (days < 31 || days > 60)) return false;
                  if (overdueDaysFilter === '60+' && days <= 60) return false;
                  if (agentFilter && loan.loanOfficer && !loan.loanOfficer.toLowerCase().includes(agentFilter.toLowerCase())) return false;
                  return true;
                }).length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun prêt trouvé</h3>
                    <p className="text-gray-600">
                      {(searchTerm || branchFilter !== 'ALL' || currencyFilter !== 'ALL' || overdueDaysFilter !== 'ALL' || agentFilter)
                        ? 'Aucun prêt ne correspond aux filtres sélectionnés.'
                        : 'Excellent! Tous les clients sont à jour dans leurs paiements.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  Historique des Paiements
                </h2>
                <p className="text-gray-600 mt-1">
                  Liste complète de tous les paiements enregistrés
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={loadPayments}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-900 hover:text-black"
                >
                  <RefreshCw className="w-4 h-4" />
                  Actualiser
                </button>
                <button
                  onClick={handleExportPayments}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exporter
                </button>
                <button
                  onClick={handleExportPdf}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-900 hover:text-black"
                  title="Exporter PDF"
                >
                  Exporter PDF
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rechercher
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={paymentsSearchTerm}
                    onChange={(e) => setPaymentsSearchTerm(e.target.value)}
                    placeholder="Reçu, référence..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={paymentsStatusFilter}
                  onChange={(e) => setPaymentsStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value={PaymentStatus.PENDING}>En attente</option>
                  <option value={PaymentStatus.COMPLETED}>Complété</option>
                  <option value={PaymentStatus.CANCELLED}>Annulé</option>
                  <option value={PaymentStatus.REVERSED}>Renversé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Début
                </label>
                <input
                  type="date"
                  value={paymentsDateFrom}
                  onChange={(e) => setPaymentsDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Fin
                </label>
                <input
                  type="date"
                  value={paymentsDateTo}
                  onChange={(e) => setPaymentsDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Succursale
                </label>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ALL">Toutes les succursales</option>
                  {branchesList.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(paymentsStatusFilter !== 'ALL' || paymentsDateFrom || paymentsDateTo || branchFilter !== 'ALL' || paymentsSearchTerm) && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    setPaymentsStatusFilter('ALL');
                    setPaymentsDateFrom('');
                    setPaymentsDateTo('');
                    setBranchFilter('ALL');
                    setPaymentsSearchTerm('');
                  }}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Réinitialiser les filtres
                </button>
              </div>
            )}

            {/* Payments Table */}
            {paymentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Numéro Reçu
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Méthode
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capital
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Intérêt
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pénalités
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Traité Par
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Succursale
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments
                      .filter(payment => {
                        if (!paymentsSearchTerm) return true;
                        const term = paymentsSearchTerm.toLowerCase();
                        return (payment.receiptNumber && payment.receiptNumber.toLowerCase().includes(term)) ||
                               (payment.reference && payment.reference.toLowerCase().includes(term)) ||
                               (payment.processedByName && payment.processedByName.toLowerCase().includes(term));
                      })
                      .map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(payment.paymentDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{payment.receiptNumber}</span>
                          {payment.reference && (
                            <div className="text-xs text-gray-500">{payment.reference}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.paymentMethod}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-bold text-green-600">
                            {payment.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {payment.currency}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {payment.principalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {payment.interestAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {payment.penaltyAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{payment.processedByName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.branchName || branchesList.find((b: any) => b.id === payment.branchId)?.name || 'Principal'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            payment.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            payment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            payment.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Empty State */}
                {payments.filter(payment => {
                  if (!paymentsSearchTerm) return true;
                  const term = paymentsSearchTerm.toLowerCase();
                  return (payment.receiptNumber && payment.receiptNumber.toLowerCase().includes(term)) ||
                         (payment.reference && payment.reference.toLowerCase().includes(term)) ||
                         (payment.processedByName && payment.processedByName.toLowerCase().includes(term));
                }).length === 0 && (
                  <div className="text-center py-12">
                    <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun paiement trouvé</h3>
                    <p className="text-gray-600">
                      {paymentsSearchTerm ? 
                        'Aucun paiement ne correspond à votre recherche.' :
                        'Aucun paiement ne correspond aux critères sélectionnés.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {paymentsTotalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Affichage de {((paymentsPage - 1) * paymentsPageSize) + 1} à {Math.min(paymentsPage * paymentsPageSize, paymentsTotalCount)} sur {paymentsTotalCount} paiements
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPaymentsPage(Math.max(1, paymentsPage - 1))}
                    disabled={paymentsPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Précédent
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Page {paymentsPage} sur {paymentsTotalPages}
                  </span>
                  <button
                    onClick={() => setPaymentsPage(Math.min(paymentsTotalPages, paymentsPage + 1))}
                    disabled={paymentsPage === paymentsTotalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <LoanReports />
        </div>
      )}

      {/* Disburse Modal */}
      {showDisburseModal && selectedLoan && (
        <DisburseLoanModal
          loan={selectedLoan}
          onClose={() => setShowDisburseModal(false)}
          onSuccess={handleDisburseSuccess}
        />
      )}

      {/* Recouvrement Modal */}
      {showRecouvrementModal && selectedLoan && (
        <RecouvrementModal
          loan={{
            ...selectedLoan,
            remainingBalance: (() => {
               const monthlyRate = resolveMonthlyRatePercent(selectedLoan.monthlyInterestRate, selectedLoan.interestRate, 3.5);
               const effectiveMonthlyPayment = roundCurrency(
                 calculateMonthlyPaymentFromMonthlyRate(selectedLoan.principalAmount, monthlyRate, selectedLoan.termMonths)
               );
               const totalDue = effectiveMonthlyPayment * selectedLoan.termMonths;
               return roundCurrency(Math.max(0, totalDue - (selectedLoan.paidAmount ?? 0)));
            })()
          }}
          onClose={() => setShowRecouvrementModal(false)}
          onSuccess={() => {
            setShowRecouvrementModal(false);
            loadLoans();
          }}
        />
      )}
    </div>
  );
};

// Helper to extract the loan officer/agent name from backend objects
const getLoanOfficerName = (source: any): string => {
  if (!source) return 'Agent';
  // Direct string variants
  if (typeof source.loanOfficerName === 'string' && source.loanOfficerName.trim()) return source.loanOfficerName;
  if (typeof source.loanOfficer === 'string' && source.loanOfficer.trim()) return source.loanOfficer;
  if (typeof source.approverName === 'string' && source.approverName.trim()) return source.approverName;
  if (typeof source.loanOfficerFullName === 'string' && source.loanOfficerFullName.trim()) return source.loanOfficerFullName;

  // Object variants: loanOfficer or approver may be an object
  const officerObj = source.loanOfficer || source.approver || source.loanOfficerDto || source.loanOfficerData || source.loanOfficerInfo;
  if (officerObj) {
    if (typeof officerObj.name === 'string' && officerObj.name.trim()) return officerObj.name;
    if (typeof officerObj.fullName === 'string' && officerObj.fullName.trim()) return officerObj.fullName;
    const f = officerObj.firstName || officerObj.first_name || officerObj.firstname;
    const l = officerObj.lastName || officerObj.last_name || officerObj.lastname;
    if (f || l) return `${(f || '').trim()} ${(l || '').trim()}`.trim();
  }

  // Fallback snapshot fields on loan/application
  if (typeof source.loanOfficerName === 'string') return source.loanOfficerName;
  if (typeof source.approvedByName === 'string') return source.approvedByName;
  return 'Agent';
};

// Composants enfants pour le dashboard
const StatCard: React.FC<{
  title: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'indigo' | 'red' | 'yellow';
  size?: 'normal' | 'small';
}> = ({ title, value, trend, icon, color, size = 'normal' }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600', 
    indigo: 'bg-indigo-100 text-indigo-600',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };

  const sizeClasses = {
    normal: 'p-6',
    small: 'p-4'
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${sizeClasses[size]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className={`${size === 'normal' ? 'text-2xl' : 'text-xl'} font-bold text-gray-900`}>
            {value}
          </p>
          {trend !== 0 && (
            <p className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </p>
          )}
        </div>
      </div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
    </div>
  );
};

const PriorityAlerts: React.FC<{
  pendingApplications: number;
  criticalOverdue: number;
  loansToDisburse: number;
  activeLoansCount: number;
  onNavigate: (tab: 'applications' | 'loans' | 'disbursement', status?: string) => void;
}> = ({ pendingApplications, criticalOverdue, loansToDisburse, activeLoansCount, onNavigate }) => {
  const alerts = [
    {
      type: 'high' as const,
      title: 'Demandes en Attente',
      count: pendingApplications,
      action: 'Traiter',
      onClick: () => onNavigate('applications', 'SUBMITTED'),
      icon: <Clock className="w-5 h-5" />
    },
    {
      type: 'high' as const,
      title: 'Prêts en Retard Critique',
      count: criticalOverdue,
      action: 'Voir liste',
      onClick: () => onNavigate('loans', 'OVERDUE'),
      icon: <AlertTriangle className="w-5 h-5" />
    },
    {
      type: 'medium' as const,
      title: 'Prêts à Décaisser',
      count: loansToDisburse,
      action: 'Décaisser',
      onClick: () => onNavigate('disbursement', 'APPROVED'),
      icon: <CheckCircle className="w-5 h-5" />
    },
    {
      type: 'active' as const,
      title: 'Prêts Actifs',
      count: activeLoansCount,
      action: 'Voir',
      onClick: () => onNavigate('loans', 'ACTIVE'),
      icon: <TrendingUp className="w-5 h-5" />
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Prioritaires</h3>
      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${
              alert.type === 'high'
                ? 'bg-red-50 border-red-200'
                : alert.type === 'active'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  alert.type === 'high'
                    ? 'bg-red-100 text-red-600'
                    : alert.type === 'active'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {alert.icon}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{alert.title}</p>
                  <p className="text-sm text-gray-600">{alert.count !== undefined ? `${alert.count} élément(s)` : 'Chargement...'}</p>
                </div>
              </div>
              <button 
                onClick={alert.onClick}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium hover:underline transition-all"
              >
                {alert.action}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AgentPerformanceRow: React.FC<{ agent: AgentPerformance }> = ({ agent }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
          <Users className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{agent.name}</p>
          <p className="text-sm text-gray-600">{agent.branch}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-gray-900">{formatCurrency(agent.portfolio, 'HTG')}</p>
        <div className="flex items-center gap-2">
          <div className="w-20 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${agent.recoveryRate}%` }}
            ></div>
          </div>
          <span className="text-sm text-gray-600">{agent.recoveryRate}%</span>
        </div>
      </div>
    </div>
  );
};

const PortfolioChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  // Implémentation simplifiée du graphique
  const maxPortfolio = Math.max(...data.map(d => d.portfolio));
  
  return (
    <div className="space-y-6">
      {/* Légende */}
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary-600 rounded"></div>
          <span className="text-gray-600">Portefeuille</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-600">Taux Remboursement</span>
        </div>
      </div>

      {/* Graphique simplifié */}
      <div className="flex items-end justify-between h-48">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div className="flex items-end justify-center gap-1 h-32 w-full">
              <div
                className="bg-primary-600 rounded-t w-3/4"
                style={{ height: `${(item.portfolio / maxPortfolio) * 100}%` }}
              ></div>
              <div
                className="bg-green-500 rounded-t w-1/4"
                style={{ height: `${item.repayment}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-600 mt-2">{item.month}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoanManagement;
