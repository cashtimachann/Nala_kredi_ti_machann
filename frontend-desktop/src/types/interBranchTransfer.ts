/**
 * Types and Interfaces for Inter-Branch Transfer
 * Tip ak Entèfas pou Transfè Ant Siksale
 */

/**
 * Currency enumeration
 * Enimerasyon Monnen
 */
export enum Currency {
  HTG = 'HTG', // Gourdes Haitiennes
  USD = 'USD'  // US Dollars
}

/**
 * Transfer status enumeration
 * Enimerasyon Estati Transfè
 */
export enum TransferStatus {
  PENDING = 'PENDING',           // An atant
  APPROVED = 'APPROVED',         // Apwouve
  REJECTED = 'REJECTED',         // Rejte
  COMPLETED = 'COMPLETED',       // Konplete
  CANCELLED = 'CANCELLED'        // Anile
}

/**
 * Branch information
 * Enfòmasyon Siksale
 */
export interface Branch {
  id: number;
  name: string;
  code: string;
  commune?: string;
  department?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

/**
 * Transfer form data
 * Done Fòm Transfè
 */
export interface TransferFormData {
  toBranchId: string;
  toBranchName?: string;
  amount: string;
  currency: Currency | 'HTG' | 'USD';
  exchangeRate: string;
  reason: string;
  notes: string;
}

/**
 * Complete inter-branch transfer record
 * Dosye Transfè Ant Siksale Konplè
 */
export interface InterBranchTransfer {
  id: number;
  fromBranchId: number;
  fromBranchName: string;
  toBranchId: number;
  toBranchName: string;
  currency: Currency;
  amount: number;
  exchangeRate: number;
  convertedAmount: number;
  reason: string;
  notes?: string;
  status: TransferStatus;
  initiatedBy: number;
  initiatedByName: string;
  approvedBy?: number;
  approvedByName?: string;
  rejectedBy?: number;
  rejectedByName?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  completedAt?: string;
  referenceNumber?: string;
}

/**
 * Transfer creation DTO
 * DTO pou Kreye Transfè
 */
export interface CreateInterBranchTransferDto {
  toBranchId: number;
  currency: Currency;
  amount: number;
  exchangeRate: number;
  reason: string;
  notes?: string;
}

/**
 * Transfer update DTO
 * DTO pou Modifye Transfè
 */
export interface UpdateInterBranchTransferDto {
  id: number;
  toBranchId?: number;
  currency?: Currency;
  amount?: number;
  exchangeRate?: number;
  reason?: string;
  notes?: string;
}

/**
 * Transfer approval DTO
 * DTO pou Apwouve Transfè
 */
export interface ApproveTransferDto {
  id: number;
  approvalNotes?: string;
}

/**
 * Transfer rejection DTO
 * DTO pou Rejte Transfè
 */
export interface RejectTransferDto {
  id: number;
  rejectionReason: string;
}

/**
 * Transfer filter options
 * Opsyon Filtè Transfè
 */
export interface TransferFilterOptions {
  status?: TransferStatus;
  currency?: Currency;
  fromBranchId?: number;
  toBranchId?: number;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Transfer statistics
 * Estatistik Transfè
 */
export interface TransferStatistics {
  totalTransfers: number;
  totalAmountHTG: number;
  totalAmountUSD: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  completedCount: number;
  averageAmount: number;
  largestTransfer: number;
}

/**
 * Validation result
 * Rezilta Validasyon
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: string[];
}

/**
 * Currency information helper
 * Asistan Enfòmasyon Monnen
 */
export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
  nameFr: string;
  nameHt: string;
}

/**
 * Get currency information
 * Jwenn enfòmasyon monnen
 */
export const getCurrencyInfo = (currency: Currency | string): CurrencyInfo => {
  const currencies: Record<string, CurrencyInfo> = {
    HTG: {
      code: Currency.HTG,
      symbol: 'Gds',
      name: 'Haitian Gourde',
      nameFr: 'Gourde Haïtienne',
      nameHt: 'Goud Ayisyen'
    },
    USD: {
      code: Currency.USD,
      symbol: '$',
      name: 'US Dollar',
      nameFr: 'Dollar Américain',
      nameHt: 'Dola Ameriken'
    }
  };

  return currencies[currency] || currencies.HTG;
};

/**
 * Format currency amount
 * Fòmate montan lajan
 */
export const formatCurrency = (
  amount: number,
  currency: Currency | string,
  locale: string = 'fr-FR'
): string => {
  const currencyInfo = getCurrencyInfo(currency);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + ' ' + currencyInfo.symbol;
};

/**
 * Calculate converted amount
 * Kalkile montan konvèti
 */
export const calculateConvertedAmount = (
  amount: number,
  exchangeRate: number
): number => {
  return parseFloat((amount * exchangeRate).toFixed(2));
};

/**
 * Validate transfer amount
 * Valide montan transfè
 */
export const validateTransferAmount = (
  amount: number,
  currency: Currency
): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  if (amount <= 0) {
    errors.amount = 'Le montant doit être positif';
  }

  // Check for high amounts
  const highAmountThreshold = currency === Currency.HTG ? 100000 : 1000;
  if (amount > highAmountThreshold) {
    warnings.push(`Montant élevé (> ${formatCurrency(highAmountThreshold, currency)}). Validation requise.`);
  }

  // Check for extremely high amounts
  const extremeThreshold = currency === Currency.HTG ? 1000000 : 10000;
  if (amount > extremeThreshold) {
    warnings.push(`Montant très élevé nécessitant une approbation spéciale.`);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
};

/**
 * Get status label
 * Jwenn etikèt estati
 */
export const getStatusLabel = (status: TransferStatus, lang: 'fr' | 'ht' = 'fr'): string => {
  const labels: Record<TransferStatus, { fr: string; ht: string }> = {
    [TransferStatus.PENDING]: { fr: 'En attente', ht: 'An atant' },
    [TransferStatus.APPROVED]: { fr: 'Approuvé', ht: 'Apwouve' },
    [TransferStatus.REJECTED]: { fr: 'Rejeté', ht: 'Rejte' },
    [TransferStatus.COMPLETED]: { fr: 'Complété', ht: 'Konplete' },
    [TransferStatus.CANCELLED]: { fr: 'Annulé', ht: 'Anile' }
  };

  return labels[status][lang];
};

/**
 * Get status color for UI
 * Jwenn koulè estati pou UI
 */
export const getStatusColor = (status: TransferStatus): string => {
  const colors: Record<TransferStatus, string> = {
    [TransferStatus.PENDING]: 'warning',
    [TransferStatus.APPROVED]: 'info',
    [TransferStatus.REJECTED]: 'error',
    [TransferStatus.COMPLETED]: 'success',
    [TransferStatus.CANCELLED]: 'default'
  };

  return colors[status];
};

export default {
  Currency,
  TransferStatus,
  getCurrencyInfo,
  formatCurrency,
  calculateConvertedAmount,
  validateTransferAmount,
  getStatusLabel,
  getStatusColor
};
