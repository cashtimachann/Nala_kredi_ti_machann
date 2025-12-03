export interface InterBranchTransfer {
  id: string;
  transferNumber: string;
  fromBranchId: number;
  fromBranchName: string;
  toBranchId: number;
  toBranchName: string;
  currency: Currency;
  currencyName: string;
  amount: number;
  exchangeRate: number;
  convertedAmount: number;
  reason: string;
  notes?: string;
  status: TransferStatus;
  statusName: string;
  requestedBy: string;
  requestedByName?: string;
  requestedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  processedBy?: string;
  processedByName?: string;
  processedAt?: string;
  referenceNumber?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export enum Currency {
  HTG = 0,
  USD = 1
}

export enum TransferStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  InTransit = 3,
  Completed = 4,
  Cancelled = 5
}

export interface CreateInterBranchTransferDto {
  fromBranchId?: number; // Optional for SuperAdmin, required if user has no BranchId
  toBranchId: number;
  currency: Currency;
  amount: number;
  exchangeRate?: number;
  reason: string;
  notes?: string;
}

export interface UpdateInterBranchTransferDto {
  id: string;
  amount?: number;
  exchangeRate?: number;
  reason?: string;
  notes?: string;
}

export interface ApproveInterBranchTransferDto {
  id: string;
  notes?: string;
}

export interface RejectInterBranchTransferDto {
  id: string;
  reason: string;
}

export interface ProcessInterBranchTransferDto {
  id: string;
  referenceNumber?: string;
  trackingNumber?: string;
  notes?: string;
}

export interface DispatchInterBranchTransferDto {
  id: string;
  referenceNumber?: string;
  trackingNumber?: string;
  notes?: string;
}

export interface InterBranchTransferSearchDto {
  fromBranchId?: number;
  toBranchId?: number;
  currency?: Currency;
  status?: TransferStatus;
  requestedBy?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface InterBranchTransferLogDto {
  id: string;
  transferId: string;
  action: string;
  description: string;
  performedBy: string;
  performedByName?: string;
  performedAt: string;
  oldValue?: any;
  newValue?: any;
}

export interface BranchTransferSummaryDto {
  branchId: number;
  branchName: string;
  totalSent: number;
  totalReceived: number;
  totalSentHTG?: number;
  totalReceivedHTG?: number;
  totalSentUSD?: number;
  totalReceivedUSD?: number;
  pendingTransfers: number;
  completedTransfers: number;
  lastTransferDate: string;
}

export interface ConsolidatedTransferReportDto {
  branchSummaries: BranchTransferSummaryDto[];
  totalSystemTransfers: number;
  totalActiveTransfers: number;
  reportGeneratedAt: string;
}

// Form data interfaces for frontend components
export interface InterBranchTransferFormData {
  fromBranchId?: number; // Optional for users with BranchId, required for SuperAdmin
  toBranchId: number;
  currency: Currency;
  amount: number;
  exchangeRate?: number;
  reason: string;
  notes?: string;
}

export interface TransferApprovalFormData {
  notes?: string;
}

export interface TransferRejectionFormData {
  reason: string;
}

export interface TransferProcessingFormData {
  referenceNumber?: string;
  trackingNumber?: string;
  notes?: string;
}

// Status display helpers
export const getTransferStatusInfo = (status: TransferStatus) => {
  const statusMap = {
    [TransferStatus.Pending]: {
      label: 'En attente',
      color: 'bg-yellow-100 text-yellow-800',
      icon: 'Clock'
    },
    [TransferStatus.Approved]: {
      label: 'Approuvé',
      color: 'bg-blue-100 text-blue-800',
      icon: 'CheckCircle'
    },
    [TransferStatus.InTransit]: {
      label: 'En transit',
      color: 'bg-purple-100 text-purple-800',
      icon: 'Truck'
    },
    [TransferStatus.Completed]: {
      label: 'Terminé',
      color: 'bg-green-100 text-green-800',
      icon: 'CheckCircle2'
    },
    [TransferStatus.Rejected]: {
      label: 'Rejeté',
      color: 'bg-red-100 text-red-800',
      icon: 'XCircle'
    },
    [TransferStatus.Cancelled]: {
      label: 'Annulé',
      color: 'bg-gray-100 text-gray-800',
      icon: 'X'
    }
  };
  return statusMap[status] || statusMap[TransferStatus.Pending];
};

export const getCurrencyInfo = (currency: Currency) => {
  const currencyMap = {
    [Currency.HTG]: {
      code: 'HTG',
      name: 'Gourdes Haitiennes',
      symbol: 'HTG'
    },
    [Currency.USD]: {
      code: 'USD',
      name: 'US Dollar',
      symbol: '$'
    }
  };
  return currencyMap[currency] || currencyMap[Currency.HTG];
};

// Action types for transfer workflow
export enum TransferAction {
  Create = 'Create',
  Approve = 'Approve',
  Reject = 'Reject',
  Process = 'Process',
  Cancel = 'Cancel'
}

// Transfer workflow configuration
export const TRANSFER_WORKFLOW = {
  [TransferStatus.Pending]: {
    allowedActions: [TransferAction.Approve, TransferAction.Reject],
    nextStatuses: [TransferStatus.Approved, TransferStatus.Rejected]
  },
  [TransferStatus.Approved]: {
    allowedActions: [TransferAction.Process, TransferAction.Cancel],
    nextStatuses: [TransferStatus.InTransit, TransferStatus.Cancelled]
  },
  [TransferStatus.InTransit]: {
    allowedActions: [TransferAction.Process],
    nextStatuses: [TransferStatus.Completed]
  },
  [TransferStatus.Completed]: {
    allowedActions: [],
    nextStatuses: []
  },
  [TransferStatus.Rejected]: {
    allowedActions: [],
    nextStatuses: []
  },
  [TransferStatus.Cancelled]: {
    allowedActions: [],
    nextStatuses: []
  }
};