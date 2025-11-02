// Currency Exchange System Types

// Enums
export enum CurrencyType {
  HTG = 0,
  USD = 1,
  EUR = 2,
  CAD = 3,
  DOP = 4,
  JMD = 5
}

export enum ExchangeType {
  Buy = 0,  // Achèt (Bank buys foreign currency from customer)
  Sell = 1  // Vann (Bank sells foreign currency to customer)
}

export enum RateUpdateMethod {
  Manual = 0,
  Automatic = 1,
  External = 2
}

export enum ExchangeTransactionStatus {
  Draft = 0,
  Pending = 1,
  Approved = 2,
  Completed = 3,
  Cancelled = 4,
  Rejected = 5
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
  fromCurrency: CurrencyType;
  toCurrency: CurrencyType;
  amount: number;
  exchangeType: ExchangeType;
  branchId: string;
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
  const currencies = {
    [CurrencyType.HTG]: 'Gourde Haïtienne (HTG)',
    [CurrencyType.USD]: 'Dollar Américain (USD)',
    [CurrencyType.EUR]: 'Euro (EUR)',
    [CurrencyType.CAD]: 'Dollar Canadien (CAD)',
    [CurrencyType.DOP]: 'Peso Dominicain (DOP)',
    [CurrencyType.JMD]: 'Dollar Jamaïcain (JMD)'
  };
  return currencies[currency] || 'Inconnu';
};

export const formatCurrencySymbol = (currency: CurrencyType): string => {
  const symbols = {
    [CurrencyType.HTG]: 'HTG',
    [CurrencyType.USD]: '$',
    [CurrencyType.EUR]: '€',
    [CurrencyType.CAD]: 'CAD$',
    [CurrencyType.DOP]: 'RD$',
    [CurrencyType.JMD]: 'J$'
  };
  return symbols[currency] || '';
};

export const formatExchangeType = (type: ExchangeType): string => {
  const types = {
    [ExchangeType.Buy]: 'Achat',
    [ExchangeType.Sell]: 'Vente'
  };
  return types[type] || 'Inconnu';
};

export const formatRateUpdateMethod = (method: RateUpdateMethod): string => {
  const methods = {
    [RateUpdateMethod.Manual]: 'Manuel',
    [RateUpdateMethod.Automatic]: 'Automatique',
    [RateUpdateMethod.External]: 'Externe'
  };
  return methods[method] || 'Inconnu';
};

export const formatTransactionStatus = (status: ExchangeTransactionStatus): string => {
  const statuses = {
    [ExchangeTransactionStatus.Draft]: 'Brouillon',
    [ExchangeTransactionStatus.Pending]: 'En attente',
    [ExchangeTransactionStatus.Approved]: 'Approuvé',
    [ExchangeTransactionStatus.Completed]: 'Complété',
    [ExchangeTransactionStatus.Cancelled]: 'Annulé',
    [ExchangeTransactionStatus.Rejected]: 'Rejeté'
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