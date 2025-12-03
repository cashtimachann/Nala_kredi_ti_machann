// Types for Branch Reports and SuperAdmin functionality

export interface CurrencyAmount {
  amountHTG: number;
  amountUSD: number;
}

// Detailed DTOs coming from backend BranchReport DTOs
export interface CreditDisbursementDto {
  creditId: number;
  creditNumber: string;
  customerName: string;
  accountNumber: string;
  amount: number;
  currency: 'HTG' | 'USD' | string;
  disbursementDate: string; // ISO date
  disbursedBy?: string;
  termWeeks?: number;
  interestRate?: number;
}

export interface CreditPaymentSummaryDto {
  paymentId: number;
  creditNumber: string;
  customerName: string;
  amount: number;
  principalPaid: number;
  interestPaid: number;
  penaltyPaid?: number;
  currency: 'HTG' | 'USD' | string;
  paymentDate: string;
  receivedBy?: string;
}

export interface TransactionSummaryDto {
  transactionId: number | string;
  transactionNumber: string;
  accountNumber?: string;
  customerName?: string;
  amount: number;
  currency: 'HTG' | 'USD' | string;
  type: string;
  transactionDate: string;
  processedBy?: string;
}

export interface CashSessionSummaryDto {
  sessionId: number;
  cashierName: string;
  openingBalanceHTG: number;
  openingBalanceUSD: number;
  closingBalanceHTG: number;
  closingBalanceUSD: number;
  openedAt: string;
  closedAt?: string;
  status: string;
}

export interface CashBalanceDto {
  openingBalanceHTG: number;
  openingBalanceUSD: number;
  closingBalanceHTG: number;
  closingBalanceUSD: number;
  netChangeHTG: number;
  netChangeUSD: number;
  cashSessions: CashSessionSummaryDto[];
}

export interface InterBranchTransferSummaryDto {
  transferId: number | string;
  transferNumber: string;
  sourceBranch: string;
  destinationBranch: string;
  amount: number;
  currency: 'HTG' | 'USD' | string;
  transferDate: string;
  status: string;
  initiatedBy?: string;
}

export interface DailyBranchReportDto {
  reportDate: string;
  branchId: number;
  branchName: string;
  branchRegion?: string;

  // Detailed lists
  creditsDisbursed: CreditDisbursementDto[];
  paymentsReceived: CreditPaymentSummaryDto[];
  deposits: TransactionSummaryDto[];
  withdrawals: TransactionSummaryDto[];
  interBranchTransfers?: InterBranchTransferSummaryDto[];

  // Totals (backend uses total* naming)
  totalCreditsDisbursedHTG: number;
  totalCreditsDisbursedUSD: number;
  creditsDisbursedCount: number;

  totalPaymentsReceivedHTG: number;
  totalPaymentsReceivedUSD: number;
  paymentsReceivedCount: number;

  totalDepositsHTG: number;
  totalDepositsUSD: number;
  depositsCount: number;

  totalWithdrawalsHTG: number;
  totalWithdrawalsUSD: number;
  withdrawalsCount: number;

  // Cash balance object
  cashBalance: CashBalanceDto;

  // Totals for inter-branch transfers
  totalTransfersOutHTG?: number;
  totalTransfersOutUSD?: number;
  totalTransfersInHTG?: number;
  totalTransfersInUSD?: number;

  // General stats
  totalTransactions?: number;
  activeCashSessions?: number;
  completedCashSessions?: number;
}

export interface MonthlyBranchReportDto {
  month: number;
  year: number;
  branchId: number;
  branchName: string;
  branchRegion?: string;

  totalCreditsDisbursedHTG: number;
  totalCreditsDisbursedUSD: number;
  totalCreditsDisbursedCount: number;

  totalPaymentsReceivedHTG: number;
  totalPaymentsReceivedUSD: number;
  totalPaymentsReceivedCount: number;

  totalDepositsHTG: number;
  totalDepositsUSD: number;
  totalDepositsCount: number;

  totalWithdrawalsHTG: number;
  totalWithdrawalsUSD: number;
  totalWithdrawalsCount: number;

  averageDailyCashBalanceHTG?: number;
  averageDailyCashBalanceUSD?: number;

  numberOfBusinessDays?: number;
  portfolioAtRisk?: number;
  collectionRate?: number;

  // Daily report list
  dailyReports?: DailyBranchReportDto[];
}

export interface CustomPeriodReportRequestDto {
  branchId: number;
  startDate: string;
  endDate: string;
}

export interface PerformanceComparisonDto {
  comparisonDate: string;
  startDate: string;
  endDate: string;
  branches: BranchPerformanceDto[];
}

export interface BranchPerformanceDto {
  branchId: number;
  branchName: string;
  region?: string;
  totalCollectionsHTG: number;
  totalCollectionsUSD: number;
  totalDisbursementsHTG: number;
  totalDisbursementsUSD: number;
  collectionRate: number;
  portfolioAtRisk: number;
  numberOfActiveLoans: number;
  numberOfCustomers: number;
  numberOfEmployees: number;
  rank: number;
}

// SuperAdmin DTOs

export interface SuperAdminConsolidatedReportDto {
  reportDate: string;
  startDate: string;
  endDate: string;

  totalCreditsDisbursedHTG: number;
  totalCreditsDisbursedUSD: number;
  totalCreditsDisbursedCount: number;

  totalPaymentsReceivedHTG: number;
  totalPaymentsReceivedUSD: number;
  totalPaymentsReceivedCount: number;

  totalDepositsHTG: number;
  totalDepositsUSD: number;
  totalDepositsCount: number;

  totalWithdrawalsHTG: number;
  totalWithdrawalsUSD: number;
  totalWithdrawalsCount: number;

  totalCashBalanceHTG: number;
  totalCashBalanceUSD: number;

  totalBranches: number;
  totalActiveCustomers: number;
  totalActiveLoans: number;
  totalEmployees: number;

  globalPortfolioAtRisk: number;
  globalCollectionRate: number;

  branchReports: DailyBranchReportDto[];
  topPerformers: BranchPerformanceDto[];
  alerts: BranchAlertDto[];
}

export interface BranchAlertDto {
  branchId: number;
  branchName: string;
  alertType: 'PAR_HIGH' | 'PAR_CRITICAL' | 'COLLECTION_LOW' | 'COLLECTION_CRITICAL' | 'CASH_ANOMALY';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  message: string;
  value: number;
  threshold: number;
  detectedAt: string;
}

export interface SuperAdminTransactionAuditDto {
  startDate: string;
  endDate: string;
  branchId?: number;
  transactionType?: string;
  userId?: string;
  totalTransactions: number;
  totalAmountHTG: number;
  totalAmountUSD: number;
  transactions: TransactionAuditDetailDto[];
}

export interface TransactionAuditDetailDto {
  transactionId: number;
  transactionNumber: string;
  transactionType: string;
  branchId: number;
  branchName: string;
  userId: string;
  userName: string;
  userRole: string;
  customerName?: string;
  accountNumber?: string;
  amount: number;
  currency: string;
  status: string;
  transactionDate: string;
  description?: string;
  reference?: string;
  cashSessionId?: number;
  cashierName?: string;
}

export interface SuperAdminDashboardStatsDto {
  asOfDate: string;

  todayDisbursementsHTG: number;
  todayDisbursementsUSD: number;
  todayCollectionsHTG: number;
  todayCollectionsUSD: number;
  todayTransactionsCount: number;

  monthToDateDisbursementsHTG: number;
  monthToDateDisbursementsUSD: number;
  monthToDateCollectionsHTG: number;
  monthToDateCollectionsUSD: number;

  totalOutstandingPortfolioHTG: number;
  totalOutstandingPortfolioUSD: number;
  totalActiveLoans: number;
  globalPAR: number;

  activeBranches: number;
  activeCashSessions: number;

  topBranches: BranchQuickStatsDto[];

  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
}

export interface BranchQuickStatsDto {
  branchId: number;
  branchName: string;
  todayCollections: number;
  todayTransactions: number;
  collectionRate: number;
  par: number;
  status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
}

export interface TransactionSearchRequestDto {
  startDate: string;
  endDate: string;
  branchId?: number;
  transactionType?: string;
  userId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface BranchOverviewDto {
  startDate: string;
  endDate: string;
  branches: BranchQuickStatsDto[];
}
