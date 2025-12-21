import axios from 'axios';
import { LoanType } from '../types/microcredit';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost:5001/api';

// Mapping between frontend and backend enum values
const loanTypeMapping: Record<LoanType, string> = {
  [LoanType.COMMERCIAL]: 'Commercial',
  [LoanType.AGRICULTURAL]: 'Agricultural',
  [LoanType.PERSONAL]: 'Personal',
  [LoanType.EMERGENCY]: 'Emergency',
  [LoanType.CREDIT_LOYER]: 'CreditLoyer',
  [LoanType.CREDIT_AUTO]: 'CreditAuto',
  [LoanType.CREDIT_MOTO]: 'CreditMoto',
  [LoanType.CREDIT_PERSONNEL]: 'CreditPersonnel',
  [LoanType.CREDIT_SCOLAIRE]: 'CreditScolaire',
  [LoanType.CREDIT_AGRICOLE]: 'CreditAgricole',
  [LoanType.CREDIT_PROFESSIONNEL]: 'CreditProfessionnel',
  [LoanType.CREDIT_APPUI]: 'CreditAppui',
  [LoanType.CREDIT_HYPOTHECAIRE]: 'CreditHypothecaire'
};

const currencyMapping: Record<'HTG' | 'USD', string> = {
  'HTG': 'HTG',
  'USD': 'USD'
};

const guaranteeTypeMapping: Record<number, string> = {
  0: 'Collateral',
  1: 'Personal',
  2: 'Group',
  3: 'Insurance',
  4: 'Deposit'
};

// Reverse mappings for backend to frontend conversion
const reverseLoanTypeMapping: Record<string, LoanType> = {
  'Commercial': LoanType.COMMERCIAL,
  'Agricultural': LoanType.AGRICULTURAL,
  'Personal': LoanType.PERSONAL,
  'Emergency': LoanType.EMERGENCY,
  'CreditLoyer': LoanType.CREDIT_LOYER,
  'CreditAuto': LoanType.CREDIT_AUTO,
  'CreditMoto': LoanType.CREDIT_MOTO,
  'CreditPersonnel': LoanType.CREDIT_PERSONNEL,
  'CreditScolaire': LoanType.CREDIT_SCOLAIRE,
  'CreditAgricole': LoanType.CREDIT_AGRICOLE,
  'CreditProfessionnel': LoanType.CREDIT_PROFESSIONNEL,
  'CreditAppui': LoanType.CREDIT_APPUI,
  'CreditHypothecaire': LoanType.CREDIT_HYPOTHECAIRE
};

const reverseCurrencyMapping: Record<string, 'HTG' | 'USD'> = {
  'HTG': 'HTG',
  'USD': 'USD'
};

// Mapping for application status from backend to frontend
const statusMapping: Record<string, string> = {
  'Draft': 'DRAFT',
  'Submitted': 'SUBMITTED',
  'UnderReview': 'UNDER_REVIEW',
  'Pending': 'PENDING',
  'Approved': 'APPROVED',
  'Active': 'ACTIVE',
  'Completed': 'COMPLETED',
  'Overdue': 'OVERDUE',
  'Defaulted': 'DEFAULTED',
  'Rejected': 'REJECTED',
  'Cancelled': 'CANCELLED'
};

// Helper function to normalize response data from backend
const normalizeResponseData = (data: any): any => {
  if (!data) return data;
  
  // Normalize single object
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (data.loanType) {
      data.loanType = reverseLoanTypeMapping[data.loanType] || data.loanType;
    }
    if (data.currency) {
      data.currency = reverseCurrencyMapping[data.currency] || data.currency;
    }
    if (data.status) {
      data.status = statusMapping[data.status] || data.status;
    }
    if (data.applicationStatus) {
      data.applicationStatus = statusMapping[data.applicationStatus] || data.applicationStatus;
    }
    // Normalize interest rate fields: backend may return decimal (e.g., 0.035) or percent (3.5)
    if (typeof data.interestRate === 'number') {
      // If value looks like decimal (less than 1), convert to percent
      if (data.interestRate > 0 && data.interestRate < 1) data.interestRate = data.interestRate * 100;
    }
    if (typeof data.monthlyInterestRate === 'number') {
      if (data.monthlyInterestRate > 0 && data.monthlyInterestRate < 1) {
        data.monthlyInterestRate = data.monthlyInterestRate * 100;
      }
      // If annual interest not present, approximate annual from monthly
      if (!data.interestRate && typeof data.monthlyInterestRate === 'number') {
        data.interestRate = data.monthlyInterestRate * 12;
      }
    }
  }
  
  // Normalize array of objects
  if (Array.isArray(data)) {
    data.forEach(item => {
      if (item.loanType) {
        item.loanType = reverseLoanTypeMapping[item.loanType] || item.loanType;
      }
      if (item.currency) {
        item.currency = reverseCurrencyMapping[item.currency] || item.currency;
      }
      if (item.status) {
        item.status = statusMapping[item.status] || item.status;
      }
      if (item.applicationStatus) {
        item.applicationStatus = statusMapping[item.applicationStatus] || item.applicationStatus;
      }
      // Normalize interest rate fields for array items as well
      if (typeof item.interestRate === 'number') {
        if (item.interestRate > 0 && item.interestRate < 1) item.interestRate = item.interestRate * 100;
      }
      if (typeof item.monthlyInterestRate === 'number') {
        if (item.monthlyInterestRate > 0 && item.monthlyInterestRate < 1) item.monthlyInterestRate = item.monthlyInterestRate * 100;
        if (!item.interestRate && typeof item.monthlyInterestRate === 'number') item.interestRate = item.monthlyInterestRate * 12;
      }
    });
  }
  
  return data;
};

export interface CreateLoanApplicationRequest {
  savingsAccountNumber: string;
  // Snapshot of applicant info collected on the form (not strictly required - for audit and snapshotting)
  customerName?: string;
  phone?: string;
  email?: string;
  customerAddress?: string;
  occupation?: string;
  loanType: LoanType;
  requestedAmount: number;
  requestedDurationMonths: number;
  purpose: string;
  businessPlan?: string;
  currency: 'HTG' | 'USD';
  branchId: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  existingDebts: number;
  collateralValue?: number;
  // Added missing required fields
  dependents: number;
  interestRate: number;
  monthlyInterestRate: number;
  collateralType?: string;
  collateralDescription?: string;
  // Guarantor information
  guarantor1Name?: string;
  guarantor1Phone?: string;
  guarantor1Relation?: string;
  guarantor2Name?: string;
  guarantor2Phone?: string;
  guarantor2Relation?: string;
  // Reference information
  reference1Name?: string;
  reference1Phone?: string;
  reference2Name?: string;
  reference2Phone?: string;
  // Document verification flags
  hasNationalId: boolean;
  hasProofOfResidence: boolean;
  hasProofOfIncome: boolean;
  hasCollateralDocs: boolean;
  notes?: string;
  guarantees?: GuaranteeDto[];
}

// Enum values from backend: Collateral=0, Personal=1, Group=2, Insurance=3, Deposit=4
export interface GuaranteeDto {
  type: number; // MicrocreditGuaranteeType enum value
  description: string;
  value: number;
  currency: 'HTG' | 'USD';
  guarantorInfo?: {
    name: string;
    phone: string;
    address: string;
    occupation: string;
    monthlyIncome?: number;
    relation: string;
  };
}

export interface LoanApplicationResponse {
  id: string;
  applicationNumber: string;
  borrowerId: string;
  loanId?: string; // ID of the loan created from this application (if approved)
  borrower?: {
    id: string;
    firstName: string;
    lastName: string;
    accountNumber: string;
    contact?: {
      phone?: string;
      phoneNumber?: string;
      email?: string;
    };
  };
  loanType: LoanType;
  requestedAmount: number;
  requestedDurationMonths: number;
  purpose: string;
  currency: string;
  branchId: number;
  branchName: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  occupation?: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  existingDebts: number;
  dependents?: number;
  collateralValue?: number;
  debtToIncomeRatio: number;
  creditScore?: number;
  interestRate: number;
  monthlyInterestRate: number;
  status: string;
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  disbursementDate?: string;
  loanOfficerId: string;
  loanOfficerName: string;
  guarantees?: Array<{
    id: string;
    type: string;
    description: string;
    contactName?: string;
    contactPhone?: string;
    value?: number;
    currency?: string;
  }>;
}

export interface LoanApplicationListResponse {
  applications: LoanApplicationResponse[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

class MicrocreditLoanApplicationService {
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token && token !== 'null' && token !== 'undefined';
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Créer une nouvelle demande de crédit
   */
  async createApplication(data: CreateLoanApplicationRequest): Promise<LoanApplicationResponse> {
    try {
      // Map frontend enum values to backend enum values
      const mappedData = {
        ...data,
        loanType: loanTypeMapping[data.loanType],
        currency: currencyMapping[data.currency],
        guarantees: data.guarantees?.map(guarantee => ({
          ...guarantee,
          type: guaranteeTypeMapping[guarantee.type],
          currency: currencyMapping[guarantee.currency]
        })) || []
      };

      const response = await axios.post(
        `${API_BASE_URL}/MicrocreditLoanApplication`,
        mappedData,
        { headers: this.getAuthHeaders() }
      );
      
      return normalizeResponseData(response.data);
    } catch (error: any) {
      console.error('Error creating loan application:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data || 
        'Erreur lors de la création de la demande de crédit'
      );
    }
  }

  /**
   * Obtenir une demande de crédit par ID
   */
  async getApplication(id: string): Promise<LoanApplicationResponse> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/MicrocreditLoanApplication/${id}`,
        { headers: this.getAuthHeaders() }
      );
      
      return normalizeResponseData(response.data);
    } catch (error: any) {
      console.error('Error fetching loan application:', error);
      throw new Error(
        error.response?.data?.message || 
        'Erreur lors de la récupération de la demande'
      );
    }
  }

  /**
   * Obtenir toutes les demandes de crédit
   */
  async getAllApplications(filters?: {
    status?: string;
    loanType?: LoanType;
    branchId?: number;
  }): Promise<LoanApplicationResponse[]> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('AUTH_REQUIRED');
      }
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.loanType) params.append('loanType', loanTypeMapping[filters.loanType]);
      if (filters?.branchId) params.append('branchId', filters.branchId.toString());

      const response = await axios.get(
        `${API_BASE_URL}/MicrocreditLoanApplication?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      );
      
      // Handle paginated response shape from backend: { Applications: [...], TotalCount, ... }
      const responseData = response.data as any;
      let list: any[] = [];
      if (Array.isArray(responseData)) {
        list = responseData;
      } else if (Array.isArray(responseData?.Applications)) {
        list = responseData.Applications;
      } else if (Array.isArray(responseData?.applications)) {
        list = responseData.applications;
      } else {
        list = [];
      }

      // Normalize each item in the list
      return normalizeResponseData(list) as LoanApplicationResponse[];
    } catch (error: any) {
      console.error('Error fetching loan applications:', error);
      throw new Error(
        error?.message || error.response?.data?.message || 
        'Erreur lors de la récupération des demandes'
      );
    }
  }

  /**
   * Obtenir les demandes de crédit avec pagination
   */
  async getApplicationsPage(paramsIn?: {
    page?: number;
    pageSize?: number;
    status?: string;
    loanType?: LoanType;
    branchId?: number;
  }): Promise<LoanApplicationListResponse> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('AUTH_REQUIRED');
      }

      const params = new URLSearchParams();
      if (paramsIn?.page) params.append('page', String(paramsIn.page));
      if (paramsIn?.pageSize) params.append('pageSize', String(paramsIn.pageSize));
      if (paramsIn?.status) params.append('status', paramsIn.status);
      if (paramsIn?.loanType) params.append('loanType', loanTypeMapping[paramsIn.loanType]);
      if (paramsIn?.branchId) params.append('branchId', String(paramsIn.branchId));

      const response = await axios.get(
        `${API_BASE_URL}/MicrocreditLoanApplication?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      );

      const data = response.data as any;
      const applications: any[] = Array.isArray(data?.Applications)
        ? data.Applications
        : Array.isArray(data?.applications)
        ? data.applications
        : Array.isArray(data)
        ? data
        : [];

      const normalizedApplications = normalizeResponseData(applications);

      return {
        applications: normalizedApplications as LoanApplicationResponse[],
        totalCount: data?.TotalCount ?? data?.totalCount ?? applications.length,
        totalPages: data?.TotalPages ?? data?.totalPages ?? 1,
        currentPage: data?.CurrentPage ?? data?.currentPage ?? (paramsIn?.page ?? 1),
        pageSize: data?.PageSize ?? data?.pageSize ?? (paramsIn?.pageSize ?? applications.length)
      };
    } catch (error: any) {
      console.error('Error fetching paged applications:', error);
      throw new Error(error?.message || error.response?.data?.message || 'Erreur lors de la récupération des demandes');
    }
  }

  /**
   * Mettre à jour une demande de crédit (seulement en statut Draft)
   */
  async updateApplication(id: string, data: CreateLoanApplicationRequest): Promise<LoanApplicationResponse> {
    try {
      // Map frontend enum values to backend enum values
      const mappedData = {
        ...data,
        loanType: loanTypeMapping[data.loanType],
        currency: currencyMapping[data.currency],
        guarantees: data.guarantees?.map(guarantee => ({
          ...guarantee,
          type: guaranteeTypeMapping[guarantee.type],
          currency: currencyMapping[guarantee.currency]
        })) || []
      };

      const response = await axios.put(
        `${API_BASE_URL}/MicrocreditLoanApplication/${id}`,
        mappedData,
        { headers: this.getAuthHeaders() }
      );
      
      return normalizeResponseData(response.data);
    } catch (error: any) {
      console.error('Error updating loan application:', error);
      throw new Error(
        error.response?.data?.message || 
        'Erreur lors de la mise à jour de la demande'
      );
    }
  }

  /**
   * Soumettre une demande de crédit
   */
  async submitApplication(id: string): Promise<LoanApplicationResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/MicrocreditLoanApplication/${id}/submit`,
        {},
        { headers: this.getAuthHeaders() }
      );
      
      return normalizeResponseData(response.data);
    } catch (error: any) {
      console.error('Error submitting loan application:', error);
      
      // Message d'erreur plus explicite pour les erreurs 409
      let errorMessage = 'Erreur lors de la soumission de la demande';
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message || error?.response?.data?.title || error?.response?.data;

      if (status === 409) {
        errorMessage = serverMessage || 'La demande a déjà été soumise ou validée';
      } else if (status) {
        errorMessage = serverMessage || errorMessage;
      }

      // Conserver le code statut pour le gestionnaire appelant
      const err: any = new Error(errorMessage);
      err.status = status;
      err.response = error?.response;
      throw err;
    }
  }

  async uploadDocument(applicationId: string, file: File, documentType: string, name?: string, description?: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      if (description) formData.append('description', description);

      const response = await axios.post(
        `${API_BASE_URL}/MicrocreditLoanApplication/${applicationId}/documents`,
        formData,
        { headers: { ...this.getAuthHeaders(), 'Content-Type': 'multipart/form-data' } }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error uploading microcredit document:', error);
      throw new Error(error?.response?.data?.message || error?.message || 'Erreur lors de l\'upload du document');
    }
  }

  async getDocuments(applicationId: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/MicrocreditLoanApplication/${applicationId}/documents`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching application documents:', error);
      throw new Error(error?.response?.data?.message || error?.message || 'Erreur lors de la récupération des documents');
    }
  }

  async downloadDocument(applicationId: string, documentId: string): Promise<Blob> {
    // Try direct controller download endpoint first (new in backend)
    try {
      const response = await axios.get(
        `${API_BASE_URL}/MicrocreditLoanApplication/${applicationId}/documents/${documentId}/download`,
        { headers: { ...this.getAuthHeaders() }, responseType: 'blob' }
      );
      return response.data;
    } catch (error: any) {
      // If it failed, fallback to file upload download by filename
      try {
        const docs = await this.getDocuments(applicationId);
        const doc = docs?.find((d: any) => d.id === documentId);
        const fileName = doc?.filePath ? doc.filePath.split('/').pop() : undefined;
        if (!fileName) throw new Error('File name for document not found');
        const fallbackResponse = await axios.get(
          `${API_BASE_URL}/FileUpload/files/${encodeURIComponent(fileName)}`,
          { headers: { ...this.getAuthHeaders() }, responseType: 'blob' }
        );
        return fallbackResponse.data;
      } catch (innerError: any) {
        console.error('Error downloading application document:', innerError);
        throw new Error(innerError?.response?.data?.message || innerError?.message || 'Erreur lors du téléchargement du document');
      }
    }
  }

  

  /**
   * Approuver une demande de crédit
   */
  async approveApplication(id: string, comments: string, approvedAmount?: number, disbursementDate?: string): Promise<LoanApplicationResponse> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('AUTH_REQUIRED');
      }

      const response = await axios.post(
        `${API_BASE_URL}/MicrocreditLoanApplication/${id}/approve`,
        { comments, approvedAmount, disbursementDate },
        { headers: this.getAuthHeaders() }
      );

      return normalizeResponseData(response.data);
    } catch (error: any) {
      console.error('Error approving loan application:', error);

      // Normalize error with HTTP status and server message so callers can react
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message || error?.response?.data?.title || error?.response?.data;

      let errorMessage = 'Erreur lors de l\'approbation de la demande';
      if (status === 409) {
        // Conflict - preserve server message when available
        errorMessage = serverMessage || 'La demande ne peut pas être approuvée dans son état actuel (409 Conflict)';
      } else if (status) {
        errorMessage = serverMessage || error?.message || errorMessage;
      } else {
        errorMessage = error?.message || errorMessage;
      }

      const err: any = new Error(errorMessage);
      err.status = status;
      err.response = error?.response;
      throw err;
    }
  }

  /**
   * Rejeter une demande de crédit
   */
  async rejectApplication(id: string, reason: string): Promise<LoanApplicationResponse> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('AUTH_REQUIRED');
      }

      const response = await axios.post(
        `${API_BASE_URL}/MicrocreditLoanApplication/${id}/reject`,
        { reason },
        { headers: this.getAuthHeaders() }
      );

      return normalizeResponseData(response.data);
    } catch (error: any) {
      console.error('Error rejecting loan application:', error);
      throw new Error(
        error?.message || error.response?.data?.message || 
        'Erreur lors du rejet de la demande'
      );
    }
  }

  /**
   * Obtenir la liste des succursales
   */
  async getBranches(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/Branch`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching branches:', error);
      throw new Error(
        error.response?.data?.message || 
        'Erreur lors de la récupération des succursales'
      );
    }
  }

  /**
   * Obtenir les informations d'un compte d'épargne par numéro
   */
  async getSavingsAccountByNumber(accountNumber: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/SavingsAccount/by-number/${accountNumber}`,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching savings account by number:', error);
      throw new Error(
        error.response?.data?.message || 
        'Erreur lors de la récupération du compte d\'épargne'
      );
    }
  }

  // Nouvelles méthodes pour le dashboard
  async getDashboardStats(filters?: { branchId?: number; dateRange?: string }): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/MicrocreditLoan/dashboard/stats`,
        {
          headers: this.getAuthHeaders(),
          params: filters
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      throw new Error(
        error.response?.data?.message ||
        'Erreur lors de la récupération des statistiques du dashboard'
      );
    }
  }

  async getAgentPerformance(branchId?: number, months: number = 6): Promise<any[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/MicrocreditLoanApplication/dashboard/agent-performance`,
        { headers: this.getAuthHeaders(), params: { branchId, months } }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching agent performance:', error);
      throw new Error(
        error.response?.data?.message ||
        'Erreur lors de la récupération des performances des agents'
      );
    }
  }

  async getPortfolioTrend(range: string, branchId?: number): Promise<any[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/MicrocreditLoanApplication/dashboard/portfolio-trend`,
        {
          headers: this.getAuthHeaders(),
          params: { range, branchId }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching portfolio trend:', error);
      throw new Error(
        error.response?.data?.message ||
        'Erreur lors de la récupération des tendances du portefeuille'
      );
    }
  }

  async getActiveLoans(branchId?: number): Promise<any[]> {
    try {
      const buildParams = (status: string) => {
        const params: any = { status, pageSize: 1000 };
        if (typeof branchId === 'number') {
          params.branchId = branchId;
        }
        return params;
      };

      // Fetch Active, Overdue, and Defaulted loans
      const [activeResponse, overdueResponse, defaultedResponse] = await Promise.all([
        axios.get(
          `${API_BASE_URL}/MicrocreditLoan`,
          { headers: this.getAuthHeaders(), params: buildParams('Active') }
        ),
        axios.get(
          `${API_BASE_URL}/MicrocreditLoan`,
          { headers: this.getAuthHeaders(), params: buildParams('Overdue') }
        ),
        axios.get(
          `${API_BASE_URL}/MicrocreditLoan`,
          { headers: this.getAuthHeaders(), params: buildParams('Defaulted') }
        )
      ]);
      
      // Extract loans from responses
      const extractLoans = (data: any): any[] => {
        if (data?.loans && Array.isArray(data.loans)) {
          return data.loans;
        } else if (Array.isArray(data)) {
          return data;
        }
        return [];
      };
      
      const activeLoans = extractLoans(activeResponse.data);
      const overdueLoans = extractLoans(overdueResponse.data);
      const defaultedLoans = extractLoans(defaultedResponse.data);
      
      // Combine and normalize all lists
      const allLoans = [...activeLoans, ...overdueLoans, ...defaultedLoans];
      return normalizeResponseData(allLoans) as any[];
    } catch (error: any) {
      console.error('Error fetching active loans:', error);
      // Don't throw error, just return empty array to avoid blocking UI
      return [];
    }
  }

  async getApprovedLoans(branchId?: number): Promise<any[]> {
    try {
      const params: any = { status: 'Approved', pageSize: 1000 };
      if (typeof branchId === 'number') {
        params.branchId = branchId;
      }

      // Fetch loan applications with APPROVED status (ready for disbursement)
      // These are applications that have been approved but not yet disbursed
      const response = await axios.get(
        `${API_BASE_URL}/MicrocreditLoanApplication`,
        { headers: this.getAuthHeaders(), params }
      );
      
      // Handle different response formats
      const data = response.data;
      
      // Backend returns { applications: [], Applications: [], totalCount, ... }
      let list: any[] = [];
      if (Array.isArray(data?.Applications)) {
        list = data.Applications;
      } else if (Array.isArray(data?.applications)) {
        list = data.applications;
      } else if (Array.isArray(data)) {
        list = data;
      }
      
      // For approved applications, fetch the corresponding loan IDs
      if (list.length > 0) {
        const applicationIds = list.map(app => app.id);
        try {
          // Use POST to avoid very long query strings when applicationIds list is large
          const loansResponse = await axios.post(
            `${API_BASE_URL}/MicrocreditLoan/by-application-ids`,
            applicationIds,
            { headers: this.getAuthHeaders() }
          );
          
          const loansData = loansResponse.data;
          let loans: any[] = [];
          if (Array.isArray(loansData?.loans)) {
            loans = loansData.loans;
          } else if (Array.isArray(loansData)) {
            loans = loansData;
          }
          
          // Create a map of applicationId to loanId
          const loanIdMap = new Map<string, string>();
          loans.forEach(loan => {
            if (loan.applicationId) {
              loanIdMap.set(loan.applicationId, loan.id);
            }
          });
          
          // Populate loanId in applications
          list.forEach(app => {
            app.loanId = loanIdMap.get(app.id) || app.loanId;
          });
        } catch (loanError) {
          console.warn('Could not fetch loan IDs for approved applications:', loanError);
          // Continue without loan IDs - they'll fall back to application IDs
        }
      }
      
      return normalizeResponseData(list) as any[];
    } catch (error: any) {
      console.error('Error fetching approved loan applications:', error);
      // Don't throw error, just return empty array to avoid blocking UI
      return [];
    }
  }

  async getLoanIdForApplication(applicationId: string): Promise<string | null> {
    try {
      // Use POST to avoid URL length / encoding issues
      const response = await axios.post(
        `${API_BASE_URL}/MicrocreditLoan/by-application-ids`,
        [applicationId],
        { headers: this.getAuthHeaders() }
      );

      const data = response.data;
      const loans = Array.isArray(data?.loans)
        ? data.loans
        : Array.isArray(data)
        ? data
        : [];

      if (!Array.isArray(loans) || loans.length === 0) {
        return null;
      }

      const normalizedLoans = normalizeResponseData(loans);
      const firstLoan = Array.isArray(normalizedLoans) ? normalizedLoans[0] : loans[0];
      return firstLoan?.id ?? null;
    } catch (error: any) {
      console.error(`Error fetching loan ID for application ${applicationId}:`, error);
      throw new Error(
        error.response?.data?.message ||
        'Impossible de récupérer l\'identifiant du prêt'
      );
    }
  }

  // Get overdue loans for reports
  async getOverdueLoans(daysOverdue?: number, branchId?: number): Promise<any[]> {
    try {
  const params: any = {};
      if (daysOverdue !== undefined) {
        params.daysOverdue = daysOverdue;
      }

      if (branchId) params.branchId = branchId;
      const response = await axios.get(
        `${API_BASE_URL}/MicrocreditLoan/overdue`,
        {
          headers: this.getAuthHeaders(),
          params
        }
      );
      
      // Extract array from response
      const data = response.data;
      let loansList: any[] = [];
      
      if (Array.isArray(data?.loans)) {
        loansList = data.loans;
      } else if (Array.isArray(data?.items)) {
        loansList = data.items;
      } else if (Array.isArray(data)) {
        loansList = data;
      }
      
      return normalizeResponseData(loansList) || [];
    } catch (error: any) {
      console.error('Error fetching overdue loans:', error);
      throw new Error(
        error.response?.data?.message ||
        'Erreur lors de la récupération des prêts en retard'
      );
    }
  }

  // Get all loans grouped by type for reports
  async getLoansByType(branchId?: number, status?: string): Promise<any> {
    try {
  const params: any = { pageSize: 10000 };
      if (branchId) params.branchId = branchId;
  if (status) params.status = status;
      const response = await axios.get(
        `${API_BASE_URL}/MicrocreditLoan`,
        {
          headers: this.getAuthHeaders(),
          params
        }
      );

      // Extract loans array from response
      const data = response.data;
      let loansList: any[] = [];
      
      if (Array.isArray(data?.loans)) {
        loansList = data.loans;
      } else if (Array.isArray(data?.items)) {
        loansList = data.items;
      } else if (Array.isArray(data)) {
        loansList = data;
      }

      const loans = normalizeResponseData(loansList);
      
      // Ensure loans is an array
      const loansArray = Array.isArray(loans) ? loans : [];
      
      // Group by loan type
      const groupedByType: Record<string, any[]> = {};
      loansArray.forEach((loan: any) => {
        const type = loan.loanType || 'UNKNOWN';
        if (!groupedByType[type]) {
          groupedByType[type] = [];
        }
        groupedByType[type].push(loan);
      });

      return groupedByType;
    } catch (error: any) {
      console.error('Error fetching loans by type:', error);
      throw new Error(
        error.response?.data?.message ||
        'Erreur lors de la récupération des prêts par type'
      );
    }
  }
}

export const microcreditLoanApplicationService = new MicrocreditLoanApplicationService();
export default microcreditLoanApplicationService;
