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

export interface CreateLoanApplicationRequest {
  savingsAccountNumber: string;
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
  loanType: LoanType;
  requestedAmount: number;
  requestedDurationMonths: number;
  currency: string;
  status: string;
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

class MicrocreditLoanApplicationService {
  private getAuthHeaders() {
    const token = sessionStorage.getItem('auth_token');
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
      
      // Map backend response back to frontend enum values
      const responseData = response.data;
      if (responseData.loanType) {
        responseData.loanType = reverseLoanTypeMapping[responseData.loanType] || responseData.loanType;
      }
      if (responseData.currency) {
        responseData.currency = reverseCurrencyMapping[responseData.currency] || responseData.currency;
      }
      
      return responseData;
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
      
      // Map backend response back to frontend enum values
      const responseData = response.data;
      if (responseData.loanType) {
        responseData.loanType = reverseLoanTypeMapping[responseData.loanType] || responseData.loanType;
      }
      if (responseData.currency) {
        responseData.currency = reverseCurrencyMapping[responseData.currency] || responseData.currency;
      }
      
      return responseData;
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
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.loanType) params.append('loanType', loanTypeMapping[filters.loanType]);
      if (filters?.branchId) params.append('branchId', filters.branchId.toString());

      const response = await axios.get(
        `${API_BASE_URL}/MicrocreditLoanApplication?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      );
      
      // Map backend responses back to frontend enum values
      const responseData = response.data;
      if (Array.isArray(responseData)) {
        responseData.forEach(item => {
          if (item.loanType) {
            item.loanType = reverseLoanTypeMapping[item.loanType] || item.loanType;
          }
          if (item.currency) {
            item.currency = reverseCurrencyMapping[item.currency] || item.currency;
          }
        });
      }
      
      return responseData;
    } catch (error: any) {
      console.error('Error fetching loan applications:', error);
      throw new Error(
        error.response?.data?.message || 
        'Erreur lors de la récupération des demandes'
      );
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
      
      // Map backend response back to frontend enum values
      const responseData = response.data;
      if (responseData.loanType) {
        responseData.loanType = reverseLoanTypeMapping[responseData.loanType] || responseData.loanType;
      }
      if (responseData.currency) {
        responseData.currency = reverseCurrencyMapping[responseData.currency] || responseData.currency;
      }
      
      return responseData;
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
      
      // Map backend response back to frontend enum values
      const responseData = response.data;
      if (responseData.loanType) {
        responseData.loanType = reverseLoanTypeMapping[responseData.loanType] || responseData.loanType;
      }
      if (responseData.currency) {
        responseData.currency = reverseCurrencyMapping[responseData.currency] || responseData.currency;
      }
      
      return responseData;
    } catch (error: any) {
      console.error('Error submitting loan application:', error);
      
      // Message d'erreur plus explicite pour les erreurs 409
      let errorMessage = 'Erreur lors de la soumission de la demande';
      
      if (error.response?.status === 409) {
        errorMessage = error.response?.data || 'La demande a déjà été soumise ou validée';
      } else {
        errorMessage = error.response?.data?.message || 
                      error.response?.data?.title || 
                      error.response?.data || 
                      errorMessage;
      }
      
      throw new Error(errorMessage);
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
}

export const microcreditLoanApplicationService = new MicrocreditLoanApplicationService();
export default microcreditLoanApplicationService;
