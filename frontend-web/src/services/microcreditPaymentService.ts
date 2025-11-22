import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost:5001/api';

export enum PaymentMethod {
  CASH = 'Cash',
  CHECK = 'Check',
  TRANSFER = 'BankTransfer',
  MOBILE_MONEY = 'MobileMoney'
}

export enum PaymentStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  REVERSED = 'Reversed'
}

export interface CreatePaymentRequest {
  loanId: string;
  amount: number;
  paymentDate: string; // Format: YYYY-MM-DD
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  allocateToPrincipal?: boolean;
  customAllocation?: {
    principal: number;
    interest: number;
    penalties: number;
  };
}

export interface PaymentResponse {
  id: string;
  paymentNumber: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  penaltyAmount: number;
  currency: string;
  paymentDate: string;
  valueDate: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  reference?: string;
  processedBy: string;
  processedByName: string;
  branchId: number;
  branchName: string;
  receiptNumber: string;
  receiptPath?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConfirmPaymentRequest {
  notes?: string;
}

export interface PaymentAllocationRequest {
  loanId: string;
  paymentAmount: number;
  paymentDate: string;
}

export interface PaymentAllocationResponse {
  principalAmount: number;
  interestAmount: number;
  penaltyAmount: number;
  feesAmount: number;
  remainingAmount: number;
  allocationDate: string;
}

export interface PaymentHistoryResponse {
  payments: PaymentResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaymentStatistics {
  totalPaymentsCollected: number;
  totalPrincipalCollected: number;
  totalInterestCollected: number;
  totalPenaltiesCollected: number;
  numberOfPayments: number;
  averagePaymentAmount: number;
  paymentsOnTime: number;
  paymentsLate: number;
  collectionRate: number;
  fromDate: string;
  toDate: string;
}

class MicrocreditPaymentService {
  private getAuthHeader() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * Enregistrer un nouveau paiement
   */
  async recordPayment(data: CreatePaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await axios.post<PaymentResponse>(
        `${API_BASE_URL}/MicrocreditPayment`,
        data,
        this.getAuthHeader()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error recording payment:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors de l\'enregistrement du paiement'
      );
    }
  }

  /**
   * Confirmer un paiement en attente
   */
  async confirmPayment(paymentId: string, data?: ConfirmPaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await axios.post<PaymentResponse>(
        `${API_BASE_URL}/MicrocreditPayment/${paymentId}/confirm`,
        data || {},
        this.getAuthHeader()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors de la confirmation du paiement'
      );
    }
  }

  /**
   * Annuler un paiement en attente
   */
  async cancelPayment(paymentId: string, reason?: string): Promise<PaymentResponse> {
    try {
      const response = await axios.post<PaymentResponse>(
        `${API_BASE_URL}/MicrocreditPayment/${paymentId}/cancel`,
        { reason },
        this.getAuthHeader()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error cancelling payment:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors de l\'annulation du paiement'
      );
    }
  }

  /**
   * Obtenir un paiement par ID
   */
  async getPayment(paymentId: string): Promise<PaymentResponse> {
    try {
      const response = await axios.get<PaymentResponse>(
        `${API_BASE_URL}/MicrocreditPayment/${paymentId}`,
        this.getAuthHeader()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting payment:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors de la récupération du paiement'
      );
    }
  }

  /**
   * Obtenir tous les paiements d'un prêt
   */
  async getLoanPayments(loanId: string): Promise<PaymentResponse[]> {
    try {
      const response = await axios.get<PaymentResponse[]>(
        `${API_BASE_URL}/MicrocreditPayment/loan/${loanId}`,
        this.getAuthHeader()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting loan payments:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors de la récupération des paiements du prêt'
      );
    }
  }

  /**
   * Calculer l'allocation d'un paiement
   */
  async calculatePaymentAllocation(data: PaymentAllocationRequest): Promise<PaymentAllocationResponse> {
    try {
      const response = await axios.post<PaymentAllocationResponse>(
        `${API_BASE_URL}/MicrocreditPayment/calculate-allocation`,
        data,
        this.getAuthHeader()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error calculating payment allocation:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors du calcul de l\'allocation du paiement'
      );
    }
  }

  /**
   * Obtenir les paiements par période
   */
  async getPaymentsByPeriod(
    startDate: string, 
    endDate: string, 
    status?: PaymentStatus
  ): Promise<PaymentResponse[]> {
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (status) {
        params.append('status', status);
      }

      const response = await axios.get<PaymentResponse[]>(
        `${API_BASE_URL}/MicrocreditPayment/period?${params.toString()}`,
        this.getAuthHeader()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting payments by period:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors de la récupération des paiements par période'
      );
    }
  }

  /**
   * Obtenir l'historique des paiements avec pagination et filtres
   */
  async getPaymentHistory(
    page: number = 1,
    pageSize: number = 10,
    fromDate?: string,
    toDate?: string,
    status?: PaymentStatus,
    branchId?: number
  ): Promise<PaymentHistoryResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (status) params.append('status', status);
      if (branchId) params.append('branchId', branchId.toString());

      const response = await axios.get<PaymentHistoryResponse>(
        `${API_BASE_URL}/MicrocreditPayment/history?${params.toString()}`,
        this.getAuthHeader()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting payment history:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors de la récupération de l\'historique des paiements'
      );
    }
  }

  /**
   * Obtenir les statistiques de paiements
   */
  async getPaymentStatistics(
    fromDate?: string,
    toDate?: string,
    branchId?: number
  ): Promise<PaymentStatistics> {
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (branchId) params.append('branchId', branchId.toString());

      const response = await axios.get<PaymentStatistics>(
        `${API_BASE_URL}/MicrocreditPayment/statistics?${params.toString()}`,
        this.getAuthHeader()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting payment statistics:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors de la récupération des statistiques de paiements'
      );
    }
  }
}

export const microcreditPaymentService = new MicrocreditPaymentService();
export default microcreditPaymentService;
