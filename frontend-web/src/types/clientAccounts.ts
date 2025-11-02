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

export interface ClientAccount {
  id: string;
  accountNumber: string;
  accountType: AccountType;
  customerId: string;
  customerName: string;
  customerPhone: string;
  branchId: number;
  branchName: string;
  currency: 'HTG' | 'USD';
  balance: number;
  availableBalance: number;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'SUSPENDED';
  openingDate: string;
  lastTransactionDate?: string;
  interestRate?: number;
  termType?: TermSavingsType;
  maturityDate?: string;
  minimumBalance?: number;
  dailyWithdrawalLimit?: number;
  monthlyWithdrawalLimit?: number;
  // Current account specific (optional)
  overdraftLimit?: number;
  dailyDepositLimit?: number;
  allowOverdraft?: boolean;
  currentOverdraft?: number;
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

export const getTermInterestRate = (termType: TermSavingsType, currency: 'HTG' | 'USD'): number => {
  const rates = {
    [TermSavingsType.THREE_MONTHS]: { HTG: 0.025, USD: 0.0125 }, // 2.5% / 1.25%
    [TermSavingsType.SIX_MONTHS]: { HTG: 0.035, USD: 0.0175 },   // 3.5% / 1.75%
    [TermSavingsType.TWELVE_MONTHS]: { HTG: 0.045, USD: 0.0225 }, // 4.5% / 2.25%
    [TermSavingsType.TWENTY_FOUR_MONTHS]: { HTG: 0.055, USD: 0.0275 } // 5.5% / 2.75%
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