import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost:5001/api';

export enum LoanStatus {
  APPROVED = 'Approved',
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  DEFAULTED = 'Defaulted',
  CLOSED = 'Closed'
}

export interface DisburseLoanRequest {
  disbursementDate: string; // Format: YYYY-MM-DD
  notes?: string;
}

export interface LoanResponse {
  id: string;
  loanNumber: string;
  borrowerId: string;
  borrowerName: string;
  loanType: string;
  principalAmount: number;
  interestRate: number;
  durationMonths: number;
  installmentAmount: number;
  currency: string;
  disbursementDate: string;
  firstInstallmentDate: string;
  maturityDate: string;
  totalAmountDue: number;
  amountPaid: number;
  principalPaid: number;
  interestPaid: number;
  penaltiesPaid: number;
  outstandingBalance: number;
  outstandingPrincipal: number;
  outstandingInterest: number;
  status: LoanStatus;
  branchId: number;
  branchName: string;
  daysOverdue: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionNoteResponse {
  id: string;
  loanId: string;
  note: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface MarkDefaultRequest {
  reason: string;
}

export interface RehabilitateLoanRequest {
  notes?: string;
}

class MicrocreditLoanService {
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
   * Débourser un prêt approuvé
   */
  async disburseLoan(loanId: string, data: DisburseLoanRequest): Promise<LoanResponse> {
    try {
      const response = await axios.post<LoanResponse>(
        `${API_BASE_URL}/MicrocreditLoan/${loanId}/disburse`,
        data,
        this.getAuthHeader()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error disbursing loan:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors du déboursement du prêt'
      );
    }
  }

  /**
   * Obtenir un prêt par ID
   */
  async getLoan(loanId: string): Promise<LoanResponse> {
    try {
      const response = await axios.get<LoanResponse>(
        `${API_BASE_URL}/MicrocreditLoan/${loanId}`,
        this.getAuthHeader()
      );
      return normalizeLoanResponse(response.data);
    } catch (error: any) {
      console.error('Error getting loan:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors de la récupération du prêt'
      );
    }
  }

  /**
   * Obtenir la liste des prêts
   */
  async getLoans(params?: {
    page?: number;
    pageSize?: number;
    status?: LoanStatus;
    borrowerId?: string;
    search?: string;
  }): Promise<{
    loans: LoanResponse[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      if (params?.status) queryParams.append('status', params.status);
      if (params?.borrowerId) queryParams.append('borrowerId', params.borrowerId);
      if (params?.search) queryParams.append('search', params.search);

      const response = await axios.get(
        `${API_BASE_URL}/MicrocreditLoan?${queryParams.toString()}`,
        this.getAuthHeader()
      );
      // Normalize each loan in the response if possible
      const data = response.data as any;
      const items = Array.isArray(data.items) ? data.items : Array.isArray(data.loans) ? data.loans : Array.isArray(data) ? data : [];
      const normalized = items.map((it: any) => normalizeLoanResponse(it));
      return { ...data, items: normalized, loans: normalized };
    } catch (error: any) {
      console.error('Error getting loans:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors de la récupération des prêts'
      );
    }
  }

  /**
   * Marquer un prêt comme défaillant
   */
  async markLoanAsDefault(loanId: string, data: MarkDefaultRequest): Promise<LoanResponse> {
    try {
      const response = await axios.post<LoanResponse>(
        `${API_BASE_URL}/MicrocreditLoan/${loanId}/mark-default`,
        data,
        this.getAuthHeader()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error marking loan as default:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors du marquage du prêt comme défaillant'
      );
    }
  }

  /**
   * Réhabiliter un prêt défaillant
   */
  async rehabilitateLoan(loanId: string, data?: RehabilitateLoanRequest): Promise<LoanResponse> {
    try {
      const response = await axios.post<LoanResponse>(
        `${API_BASE_URL}/microcredit-loans/${loanId}/rehabilitate`,
        data || {},
        this.getAuthHeader()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error rehabilitating loan:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors de la réhabilitation du prêt'
      );
    }
  }

  /**
   * Obtenir le calendrier de paiement d'un prêt
   */
  async getPaymentSchedule(loanId: string): Promise<Array<{
    id: string;
    installmentNumber: number;
    dueDate: string;
    principalAmount: number;
    interestAmount: number;
    totalAmount: number;
    paidAmount: number;
    status: string;
    paidDate?: string;
    createdAt: string;
  }>> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/MicrocreditLoan/${loanId}/payment-schedule`,
        this.getAuthHeader()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting payment schedule:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors de la récupération du calendrier de paiement'
      );
    }
  }

  /**
   * Get collection notes for a loan
   */
  async getCollectionNotes(loanId: string): Promise<CollectionNoteResponse[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/MicrocreditLoan/${loanId}/collection-notes`, this.getAuthHeader());
      return response.data || [];
    } catch (error: any) {
      console.error('Error fetching collection notes:', error);
      throw new Error(
        error.response?.data?.message ||
        error.response?.data ||
        'Erreur lors de la récupération des notes de recouvrement'
      );
    }
  }

  /**
   * Add a collection note for a loan
   */
  async addCollectionNote(loanId: string, note: string): Promise<CollectionNoteResponse> {
    try {
      const payload = { note };
      const response = await axios.post(`${API_BASE_URL}/MicrocreditLoan/${loanId}/collection-notes`, payload, this.getAuthHeader());
      return response.data;
    } catch (error: any) {
      console.error('Error adding collection note:', error);
      throw new Error(
        error.response?.data?.message ||
        error.response?.data ||
        'Erreur lors de l\'enregistrement de la note de recouvrement'
      );
    }
  }

  /**
   * Obtenir les prêts d'un client
   */
  async getCustomerLoans(customerId: string): Promise<LoanResponse[]> {
    try {
      const response = await axios.get<LoanResponse[]>(
        `${API_BASE_URL}/MicrocreditLoan/customer/${customerId}`,
        this.getAuthHeader()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting customer loans:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors de la récupération des prêts du client'
      );
    }
  }
}

function normalizeLoanResponse(loan: any): any {
  if (!loan) return loan;
  // Convert decimal interest (0.035) to percent (3.5)
  if (typeof loan.interestRate === 'number' && loan.interestRate > 0 && loan.interestRate < 1) {
    loan.interestRate = loan.interestRate * 100;
  }
  // If missing, try to derive from monthly interest rate
  if ((!loan.interestRate || loan.interestRate === 0) && typeof loan.monthlyInterestRate === 'number') {
    loan.interestRate = loan.monthlyInterestRate * 12;
  }
  return loan;
}

export const microcreditLoanService = new MicrocreditLoanService();
export default microcreditLoanService;
