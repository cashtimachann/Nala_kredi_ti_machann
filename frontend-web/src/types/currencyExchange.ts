// Currency Exchange System Types

// Enums
export enum CurrencyType {
  HTG = 1,
  USD = 2,
  EUR = 3,
  CAD = 4,
  DOP = 5,
  JMD = 6
}

export enum ExchangeType {
  Purchase = 1,  // Client achète des devises (Banque vend)
  Sale = 2       // Client vend des devises (Banque achète)
}

export enum RateUpdateMethod {
  Manual = 1,
  Automatic = 2,
  External = 3
}

export enum ExchangeTransactionStatus {
  Pending = 1,
  Completed = 2,
  Cancelled = 3,
  Failed = 4
}

export enum CurrencyMovementType {
  Purchase = 0,   // Acha
  Sale = 1,       // Vant
  Transfer = 2,   // Transfè
  Reserve = 3,    // Rezèv
  Adjustment = 4  // Ajisteman
}

// Base Interfaces
export interface CurrencyExchangeRate {
  id: string;
  baseCurrency: CurrencyType;
  baseCurrencyName: string;
  targetCurrency: CurrencyType;
  targetCurrencyName: string;
  buyingRate: number;
  sellingRate: number;
  effectiveDate: string;
  expiryDate?: string;
  updateMethod: RateUpdateMethod;
  updateMethodName: string;
  isActive: boolean;
  notes?: string;
  createdBy: string;
  createdByName: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
  transactions?: ExchangeTransaction[];
}

export interface ExchangeTransaction {
  id: string;
  transactionNumber: string;
  branchId: string;
  branchName: string;
  exchangeRateId: string;
  exchangeType: ExchangeType;
  exchangeTypeName: string;
  fromCurrency: CurrencyType;
  fromCurrencyName: string;
  toCurrency: CurrencyType;
  toCurrencyName: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  commissionAmount: number;
  commissionRate: number;
  netAmount: number;
  customerName?: string;
  customerDocument?: string;
  customerPhone?: string;
  status: ExchangeTransactionStatus;
  statusName: string;
  transactionDate: string;
  processedBy: string;
  processedByName: string;
  approvedBy?: string;
  notes?: string;
  receiptNumber?: string;
  receiptPrinted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyReserve {
  id: string;
  branchId: string;
  branchName: string;
  currency: CurrencyType;
  currencyName: string;
  currentBalance: number;
  minimumThreshold: number;
  maximumThreshold: number;
  reorderLevel: number;
  lastUpdated: string;
  updatedBy: string;
  updatedByName: string;
  movements?: CurrencyMovement[];
}

export interface CurrencyMovement {
  id: string;
  branchId: string;
  branchName: string;
  currency: CurrencyType;
  currencyName: string;
  movementType: CurrencyMovementType;
  movementTypeName: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  exchangeTransactionId?: string;
  reference?: string;
  description: string;
  processedBy: string;
  processedByName: string;
  approvedBy?: string;
  movementDate: string;
  createdAt: string;
}

// DTOs for forms and API calls
export interface CreateExchangeRateDto {
  baseCurrency: CurrencyType;
  targetCurrency: CurrencyType;
  buyingRate: number;
  sellingRate: number;
  effectiveDate: string;
  expiryDate?: string;
  updateMethod: RateUpdateMethod;
  notes?: string;
}

export interface UpdateExchangeRateDto extends Partial<CreateExchangeRateDto> {
  id: string;
  isActive?: boolean;
}

export interface ExchangeCalculationDto {
  branchId: string;
  exchangeType: ExchangeType;
  amount: number;
}

export interface ExchangeCalculationResult {
  fromCurrency: CurrencyType;
  fromCurrencyName: string;
  toCurrency: CurrencyType;
  toCurrencyName: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  rateId: string;
  isValid: boolean;
  message?: string;
  errorMessage?: string;
  availableBalance?: number;
}

export interface ProcessExchangeDto {
  branchId: string;
  fromCurrency: CurrencyType;
  toCurrency: CurrencyType;
  fromAmount: number;
  exchangeType: ExchangeType;
  customerName?: string;
  customerDocument?: string;
  customerPhone?: string;
  notes?: string;
}

export interface UpdateCurrencyReserveDto {
  id: string;
  minimumThreshold?: number;
  maximumThreshold?: number;
  reorderLevel?: number;
}

export interface CreateCurrencyMovementDto {
  branchId: string;
  currency: CurrencyType;
  movementType: CurrencyMovementType;
  amount: number;
  reference?: string;
  description: string;
}

// Search and Filter DTOs
export interface ExchangeRateSearchDto {
  baseCurrency?: CurrencyType;
  targetCurrency?: CurrencyType;
  isActive?: boolean;
  effectiveDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ExchangeTransactionSearchDto {
  branchId?: string;
  exchangeType?: ExchangeType;
  fromCurrency?: CurrencyType;
  toCurrency?: CurrencyType;
  status?: ExchangeTransactionStatus;
  startDate?: string;
  endDate?: string;
  includeAll?: boolean;
  customerName?: string;
  transactionNumber?: string;
  page?: number;
  pageSize?: number;
}

export interface CurrencyMovementSearchDto {
  branchId?: string;
  currency?: CurrencyType;
  movementType?: CurrencyMovementType;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// Statistics and Reports
export interface ExchangeStatistics {
  totalTransactions: number;
  totalVolume: number;
  totalCommission: number;
  averageTransactionAmount: number;
  transactionsByType: {
    exchangeType: ExchangeType;
    exchangeTypeName: string;
    count: number;
    volume: number;
    commission: number;
  }[];
  transactionsByCurrency: {
    currency: CurrencyType;
    currencyName: string;
    buyCount: number;
    sellCount: number;
    buyVolume: number;
    sellVolume: number;
    totalCommission: number;
  }[];
  transactionsByBranch: {
    branchId: string;
    branchName: string;
    transactionCount: number;
    totalVolume: number;
    totalCommission: number;
  }[];
}

export interface CurrencyReserveReport {
  branchId: string;
  branchName: string;
  reserves: {
    currency: CurrencyType;
    currencyName: string;
    currentBalance: number;
    minimumThreshold: number;
    maximumThreshold: number;
    availableCapacity: number;
    utilizationPercentage: number;
    needsReorder: boolean;
    status: 'Normal' | 'Low' | 'Critical' | 'Excess';
  }[];
  totalReserveValue: number; // en HTG
  lowReserveCount: number;
  criticalReserveCount: number;
}

export interface ProfitabilityReport {
  period: string;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  revenueByBranch: {
    branchId: string;
    branchName: string;
    revenue: number;
    transactionCount: number;
    averageMargin: number;
  }[];
  revenueByCurrency: {
    currency: CurrencyType;
    currencyName: string;
    revenue: number;
    volume: number;
    averageSpread: number;
  }[];
}

// Helper functions for formatting
export const formatCurrencyType = (currency: CurrencyType): string => {
  // Some legacy payloads may send numeric 0 for HTG; normalize defensively
  const normalized: CurrencyType = (currency as number) === 0 ? CurrencyType.HTG : currency;
  const currencies = {
    [CurrencyType.HTG]: 'Gourde Haïtienne (HTG)',
    [CurrencyType.USD]: 'Dollar Américain (USD)',
    [CurrencyType.EUR]: 'Euro (EUR)',
    [CurrencyType.CAD]: 'Dollar Canadien (CAD)',
    [CurrencyType.DOP]: 'Peso Dominicain (DOP)',
    [CurrencyType.JMD]: 'Dollar Jamaïcain (JMD)'
  };
  return currencies[normalized] || 'Inconnu';
};

export const formatCurrencySymbol = (currency: CurrencyType): string => {
  const normalized: CurrencyType = (currency as number) === 0 ? CurrencyType.HTG : currency;
  const symbols = {
    [CurrencyType.HTG]: 'HTG',
    [CurrencyType.USD]: '$',
    [CurrencyType.EUR]: '€',
    [CurrencyType.CAD]: 'CAD$',
    [CurrencyType.DOP]: 'RD$',
    [CurrencyType.JMD]: 'J$'
  };
  return symbols[normalized] || '';
};

export const formatExchangeType = (type: ExchangeType): string => {
  const types = {
    [ExchangeType.Purchase]: 'Achat (client achète)',
    [ExchangeType.Sale]: 'Vente (client vend)'
  };
  return types[type] || 'Inconnu';
};

export const formatRateUpdateMethod = (method: RateUpdateMethod): string => {
  // Normalize legacy numeric 0 to Manual
  const normalized: RateUpdateMethod = (method as number) === 0 ? RateUpdateMethod.Manual : method;
  const methods = {
    [RateUpdateMethod.Manual]: 'Manuel',
    [RateUpdateMethod.Automatic]: 'Automatique',
    [RateUpdateMethod.External]: 'Externe'
  };
  return methods[normalized] || 'Inconnu';
};

export const formatTransactionStatus = (status: ExchangeTransactionStatus): string => {
  const statuses = {
    [ExchangeTransactionStatus.Pending]: 'En attente',
    [ExchangeTransactionStatus.Completed]: 'Complété',
    [ExchangeTransactionStatus.Cancelled]: 'Annulé',
    [ExchangeTransactionStatus.Failed]: 'Échoué'
  };
  return statuses[status] || 'Inconnu';
};

export const formatMovementType = (type: CurrencyMovementType): string => {
  const types = {
    [CurrencyMovementType.Purchase]: 'Achat',
    [CurrencyMovementType.Sale]: 'Vente',
    [CurrencyMovementType.Transfer]: 'Transfert',
    [CurrencyMovementType.Reserve]: 'Réserve',
    [CurrencyMovementType.Adjustment]: 'Ajustement'
  };
  return types[type] || 'Inconnu';
};

export const formatCurrencyAmount = (amount: number, currency: CurrencyType): string => {
  const symbol = formatCurrencySymbol(currency);
  if (currency === CurrencyType.HTG) {
    return `${amount.toLocaleString('fr-HT')} ${symbol}`;
  }
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getReserveStatus = (currentBalance: number, minimumThreshold: number, maximumThreshold: number): string => {
  if (currentBalance <= minimumThreshold * 0.5) return 'Critical';
  if (currentBalance <= minimumThreshold) return 'Low';
  if (currentBalance >= maximumThreshold) return 'Excess';
  return 'Normal';
};

export const getReserveStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'Normal': 'green',
    'Low': 'yellow',
    'Critical': 'red',
    'Excess': 'blue'
  };
  return colors[status] || 'gray';
};