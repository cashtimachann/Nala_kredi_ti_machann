// Types for client account management in admin dashboard

export enum AccountType {
  SAVINGS = 'SAVINGS',
  CURRENT = 'CURRENT',
  TERM_SAVINGS = 'TERM_SAVINGS'
}

export enum TermSavingsType {
  THREE_MONTHS = 'THREE_MONTHS',
  SIX_MONTHS = 'SIX_MONTHS',
  TWELVE_MONTHS = 'TWELVE_MONTHS',
  TWENTY_FOUR_MONTHS = 'TWENTY_FOUR_MONTHS'
}

export interface AccountLimits {
  dailyDepositLimit?: number;
  dailyWithdrawalLimit?: number;
  monthlyWithdrawalLimit?: number;
  maxBalance?: number;
  minWithdrawalAmount?: number;
  maxWithdrawalAmount?: number;
}

export interface AuthorizedSignerInfo {
  id?: string;
  fullName: string;
  role?: string;
  documentType?: number;
  documentNumber?: string;
  phoneNumber?: string;
  relationshipToCustomer?: string;
  address?: string;
  authorizationLimit?: number;
  photoUrl?: string;
  signature?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientAccount {
  id: string;
  accountNumber: string;
  accountType: AccountType;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerCode?: string;
  branchId: number;
  branchName: string;
  currency: 'HTG' | 'USD';
  balance: number;
  availableBalance: number;
  blockedBalance?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'SUSPENDED';
  openingDate: string;
  lastTransactionDate?: string;
  interestRate?: number;
  // Derived monthly rate returned by the API for term savings (fraction, e.g. 0.015 = 1.5% / mois)
  interestRateMonthly?: number;
  termType?: TermSavingsType;
  maturityDate?: string;
  lastInterestCalculation?: string;
  accruedInterest?: number;
  minimumBalance?: number;
  dailyWithdrawalLimit?: number;
  monthlyWithdrawalLimit?: number;
  // Current account specific (optional)
  overdraftLimit?: number;
  dailyDepositLimit?: number;
  allowOverdraft?: boolean;
  currentOverdraft?: number;
  withdrawalLimit?: number;
  accountLimits?: AccountLimits;
  notes?: string;
  authorizedSigners?: AuthorizedSignerInfo[];
  closedAt?: string;
  closedBy?: string;
  closureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavingsAccountRequest {
  customerId: string;
  currency: 'HTG' | 'USD';
  initialDeposit: number;
  branchId: number;
  interestRate?: number;
  minimumBalance?: number;
  dailyWithdrawalLimit?: number;
}

export interface CreateCurrentAccountRequest {
  customerId: string;
  currency: 'HTG' | 'USD';
  initialDeposit: number;
  branchId: number;
  dailyWithdrawalLimit?: number;
  monthlyWithdrawalLimit?: number;
  minimumBalance?: number;
  overdraftLimit?: number;
  dailyDepositLimit?: number;
  // Security and KYC fields
  pin?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  depositMethod?: string;
  originOfFunds?: string;
  transactionFrequency?: string;
  accountPurpose?: string;
  authorizedSigners?: Array<{
    fullName: string;
    role?: string;
    documentNumber?: string;
    phone?: string;
  }>;
}

export interface CreateTermSavingsAccountRequest {
  customerId: string;
  currency: 'HTG' | 'USD';
  initialDeposit: number;
  branchId: number;
  termType: TermSavingsType;
  interestRate?: number;
}

export interface AccountTransaction {
  id: string;
  accountId: string;
  accountNumber: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST' | 'FEE' | 'TRANSFER';
  amount: number;
  currency: 'HTG' | 'USD';
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  processedBy: string;
  processedByName: string;
  processedAt: string;
  reference?: string;
  receiptNumber?: string;
  // Optional status mapped from backend enums (Pending/Completed/Cancelled/Failed)
  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | string;
  // Branch information
  branchId?: number;
  branchName?: string;
  branch?: string; // Alternative field name for compatibility
}

export interface AccountSearchFilters {
  accountType?: AccountType;
  currency?: 'HTG' | 'USD';
  status?: 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'SUSPENDED';
  branchId?: number;
  customerName?: string;
  accountNumber?: string;
  minBalance?: number;
  maxBalance?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ClientAccountStats {
  totalAccounts: number;
  activeAccounts: number;
  totalBalanceHTG: number;
  totalBalanceUSD: number;
  accountsByType: Record<AccountType, number>;
  accountsByCurrency: Record<'HTG' | 'USD', number>;
  recentTransactions: number;
  dormantAccounts: number;
}

// Form data interfaces
export interface SavingsAccountFormData {
  customerId: string;
  currency: 'HTG' | 'USD';
  initialDeposit: number;
  branchId: number;
  interestRate?: number;
  minimumBalance?: number;
  dailyWithdrawalLimit?: number;
}

export interface CurrentAccountFormData {
  customerId: string;
  currency: 'HTG' | 'USD';
  initialDeposit: number;
  branchId: number;
  dailyWithdrawalLimit?: number;
  monthlyWithdrawalLimit?: number;
  minimumBalance?: number;
}

export interface TermSavingsAccountFormData {
  customerId: string;
  currency: 'HTG' | 'USD';
  initialDeposit: number;
  branchId: number;
  termType: TermSavingsType;
  interestRate?: number;
}

// Helper functions
export const getAccountTypeLabel = (type: AccountType): string => {
  const labels = {
    [AccountType.SAVINGS]: 'Compte d\'Épargne',
    [AccountType.CURRENT]: 'Compte Courant',
    [AccountType.TERM_SAVINGS]: 'Épargne à Terme'
  };
  return labels[type] || type;
};

export const getTermTypeLabel = (termType: TermSavingsType | string): string => {
  // Normalize to handle both enum values and raw strings (case-insensitive)
  const normalizedType = typeof termType === 'string' ? termType.toUpperCase().replace(/[-_\s]/g, '') : termType;
  
  const labels: Record<string, string> = {
    // With underscores
    'THREE_MONTHS': '3 Mois',
    'SIX_MONTHS': '6 Mois',
    'TWELVE_MONTHS': '1 an',
    'TWENTY_FOUR_MONTHS': '2 ans',
    // Without underscores
    'THREEMONTHS': '3 Mois',
    'SIXMONTHS': '6 Mois',
    'TWELVEMONTHS': '1 an',
    'TWENTYFOURMONTHS': '2 ans',
    // Numbers only
    '3': '3 Mois',
    '6': '6 Mois',
    '12': '1 an',
    '24': '2 ans'
  };
  return labels[normalizedType] || labels[normalizedType.replace(/[-_\s]/g, '')] || termType;
};

export const getTermMonthlyInterestPercent = (termType: TermSavingsType, currency: 'HTG' | 'USD'): number => {
  const rates = {
    [TermSavingsType.THREE_MONTHS]: { HTG: 2.5 / 12, USD: 1.25 / 12 }, // ~0.208% / ~0.104%
    [TermSavingsType.SIX_MONTHS]: { HTG: 3.5 / 12, USD: 1.75 / 12 },   // ~0.292% / ~0.146%
    [TermSavingsType.TWELVE_MONTHS]: { HTG: 4.5 / 12, USD: 2.25 / 12 }, // 0.375% / 0.1875%
    [TermSavingsType.TWENTY_FOUR_MONTHS]: { HTG: 5.5 / 12, USD: 2.75 / 12 } // ~0.458% / ~0.229%
  };
  return rates[termType][currency];
};

export const calculateMaturityDate = (openingDate: string, termType: TermSavingsType): string => {
  const date = new Date(openingDate);
  const monthsToAdd = {
    [TermSavingsType.THREE_MONTHS]: 3,
    [TermSavingsType.SIX_MONTHS]: 6,
    [TermSavingsType.TWELVE_MONTHS]: 12,
    [TermSavingsType.TWENTY_FOUR_MONTHS]: 24
  };
  date.setMonth(date.getMonth() + monthsToAdd[termType]);
  return date.toISOString().split('T')[0];
};

// Helper: return number of months for a given TermSavingsType
export const getTermMonths = (termType?: TermSavingsType | string): number => {
  if (!termType) return 12;
  const normalized = typeof termType === 'string' ? termType.toUpperCase().replace(/[-_\s]/g, '') : termType;
  switch (normalized) {
    case TermSavingsType.THREE_MONTHS:
    case 'THREEMONTHS':
    case '3':
      return 3;
    case TermSavingsType.SIX_MONTHS:
    case 'SIXMONTHS':
    case '6':
      return 6;
    case TermSavingsType.TWELVE_MONTHS:
    case 'TWELVEMONTHS':
    case '12':
      return 12;
    case TermSavingsType.TWENTY_FOUR_MONTHS:
    case 'TWENTYFOURMONTHS':
    case '24':
      return 24;
    default:
      return 12;
  }
};

// Compute monthly interest rate percent for a term or savings account.
// Priorities:
// - If interestRateMonthly is present (fraction), use it directly and convert to percent.
// - If interestRate is a fraction (<=1), and this is a term account (termType provided), treat interestRate as term fraction -> monthly = (interestRate / termMonths) * 100
// - If interestRate is a fraction (<=1), and no termType, treat as annual fraction -> monthly = (interestRate / 12) * 100
// - If interestRate > 1, treat as percent (annual) -> monthly = interestRate / 12
export const getMonthlyInterestRatePercent = (params: { interestRate?: number | null; interestRateMonthly?: number | null; termType?: TermSavingsType | string; isMonthlyPercent?: boolean; }): number => {
  const { interestRate, interestRateMonthly, termType, isMonthlyPercent } = params || {};
  if (typeof interestRateMonthly === 'number' && !isNaN(interestRateMonthly)) {
    if (interestRateMonthly > 1) {
      // Treat as annual percent
      return interestRateMonthly / 12;
    } else if (interestRateMonthly > 0.1) {
      // Treat as annual fraction
      return (interestRateMonthly / 12) * 100;
    } else {
      // Treat as monthly fraction
      return interestRateMonthly * 100;
    }
  }
  const r = Number(interestRate ?? 0);
  if (!r) return 0;
  if (isMonthlyPercent) {
    return r;
  }
  const months = getTermMonths(termType);
  if (r <= 1) {
    // Fractional rate
    if (termType) {
      // Rate is for the term (total over the term months)
      return (r / months) * 100;
    }
    // Otherwise assume annual fraction
    return (r / 12) * 100;
  }
  // r > 1: percent figure (annual %)
  return r / 12;
};

// Shared helpers for interest computations (simple interest)
// Returns interest projected for the full term in currency units
export const computeTermProjectedInterest = (
  principal: number,
  monthlyRatePercent: number,
  termType?: TermSavingsType | string
): number => {
  const months = getTermMonths(termType);
  return Number(principal) * (Number(monthlyRatePercent) / 100) * months;
};

// Returns accrued interest from openingDate to nowDate using a 30-day month approximation
export const computeAccruedInterestByDays = (
  principal: number,
  monthlyRatePercent: number,
  openingDate: string,
  nowDate: Date = new Date()
): number => {
  const open = new Date(openingDate);
  const elapsedDays = Math.max(0, Math.floor((nowDate.getTime() - open.getTime()) / (1000 * 60 * 60 * 24)));
  return Number(principal) * (Number(monthlyRatePercent) / 100) * (elapsedDays / 30);
};