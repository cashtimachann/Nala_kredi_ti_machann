import axios, { AxiosInstance } from 'axios';
import { LoanType } from '../types/microcredit';

// Types pour les configurations de type de crédit
export interface LoanTypeConfiguration {
  id: string;
  type: LoanType;
  typeName: string;
  name: string;
  description: string | null;
  minAmount: number;
  maxAmount: number;
  minDurationMonths: number;
  maxDurationMonths: number;
  interestRateMin: number;
  interestRateMax: number;
  defaultInterestRate: number;
  gracePeriodDays: number;
  penaltyRate: number;
  processingFeeRate: number;
  isActive: boolean;
  icon: string;
  color: string;
  requiresCollateral: boolean;
}

export interface LoanTypeInfo {
  type: LoanType;
  name: string;
  description: string;
  icon: string;
  color: string;
  requiresCollateral: boolean;
}

export interface CreateLoanTypeConfigurationDto {
  type: LoanType;
  name: string;
  description?: string;
  minAmount: number;
  maxAmount: number;
  minDurationMonths: number;
  maxDurationMonths: number;
  interestRateMin: number;
  interestRateMax: number;
  defaultInterestRate: number;
  gracePeriodDays: number;
  penaltyRate: number;
  processingFeeRate: number;
  isActive?: boolean;
}

class MicrocreditLoanTypeService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'https://localhost:5001/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          sessionStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Obtenir tous les types de crédit disponibles avec leurs métadonnées
   */
  async getAllLoanTypes(): Promise<LoanTypeInfo[]> {
    try {
      const response = await this.api.get<LoanTypeInfo[]>('/MicrocreditLoanTypes');
      return response.data;
    } catch (error) {
      console.error('Error fetching loan types:', error);
      throw error;
    }
  }

  /**
   * Obtenir les configurations pour tous les types de crédit actifs
   */
  async getConfigurations(): Promise<LoanTypeConfiguration[]> {
    try {
      const response = await this.api.get<LoanTypeConfiguration[]>('/MicrocreditLoanTypes/configurations');
      return response.data;
    } catch (error) {
      console.error('Error fetching loan type configurations:', error);
      throw error;
    }
  }

  /**
   * Obtenir la configuration pour un type de crédit spécifique
   */
  async getConfiguration(loanType: LoanType): Promise<LoanTypeConfiguration> {
    try {
      const response = await this.api.get<LoanTypeConfiguration>(
        `/MicrocreditLoanTypes/configurations/${loanType}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching configuration for loan type ${loanType}:`, error);
      throw error;
    }
  }

  /**
   * Créer ou mettre à jour une configuration de type de crédit (Admin seulement)
   */
  async createOrUpdateConfiguration(
    dto: CreateLoanTypeConfigurationDto
  ): Promise<LoanTypeConfiguration> {
    try {
      const response = await this.api.post<LoanTypeConfiguration>(
        '/MicrocreditLoanTypes/configurations',
        dto
      );
      return response.data;
    } catch (error) {
      console.error('Error creating/updating loan type configuration:', error);
      throw error;
    }
  }

  /**
   * Obtenir les configurations groupées par catégorie
   */
  async getConfigurationsByCategory(): Promise<Record<string, LoanTypeConfiguration[]>> {
    try {
      const configurations = await this.getConfigurations();
      
      const categories: Record<string, LoanTypeConfiguration[]> = {
        personal: [],
        business: [],
        property: [],
        vehicle: [],
        education: [],
        other: []
      };

      configurations.forEach(config => {
        const category = this.getCategoryForLoanType(config.type);
        if (categories[category]) {
          categories[category].push(config);
        }
      });

      return categories;
    } catch (error) {
      console.error('Error fetching configurations by category:', error);
      throw error;
    }
  }

  /**
   * Déterminer la catégorie d'un type de crédit
   */
  private getCategoryForLoanType(loanType: LoanType): string {
    const categoryMap: Record<LoanType, string> = {
      [LoanType.PERSONAL]: 'personal',
      [LoanType.EMERGENCY]: 'personal',
      [LoanType.CREDIT_PERSONNEL]: 'personal',
      [LoanType.CREDIT_LOYER]: 'personal',
      [LoanType.CREDIT_APPUI]: 'personal',
      
      [LoanType.COMMERCIAL]: 'business',
      [LoanType.AGRICULTURAL]: 'business',
      [LoanType.CREDIT_AGRICOLE]: 'business',
      [LoanType.CREDIT_PROFESSIONNEL]: 'business',
      
      [LoanType.CREDIT_AUTO]: 'vehicle',
      [LoanType.CREDIT_MOTO]: 'vehicle',
      
      [LoanType.CREDIT_HYPOTHECAIRE]: 'property',
      
      [LoanType.CREDIT_SCOLAIRE]: 'education'
    };

    return categoryMap[loanType] || 'other';
  }

  /**
   * Valider un montant de crédit pour un type donné
   */
  async validateLoanAmount(loanType: LoanType, amount: number): Promise<{
    isValid: boolean;
    message?: string;
  }> {
    try {
      const config = await this.getConfiguration(loanType);
      
      if (amount < config.minAmount) {
        return {
          isValid: false,
          message: `Le montant minimum pour ce type de crédit est ${config.minAmount.toLocaleString()}`
        };
      }
      
      if (amount > config.maxAmount) {
        return {
          isValid: false,
          message: `Le montant maximum pour ce type de crédit est ${config.maxAmount.toLocaleString()}`
        };
      }
      
      return { isValid: true };
    } catch (error) {
      console.error('Error validating loan amount:', error);
      return {
        isValid: false,
        message: 'Erreur lors de la validation du montant'
      };
    }
  }

  /**
   * Valider une durée de crédit pour un type donné
   */
  async validateLoanDuration(loanType: LoanType, durationMonths: number): Promise<{
    isValid: boolean;
    message?: string;
  }> {
    try {
      const config = await this.getConfiguration(loanType);
      
      if (durationMonths < config.minDurationMonths) {
        return {
          isValid: false,
          message: `La durée minimum pour ce type de crédit est ${config.minDurationMonths} mois`
        };
      }
      
      if (durationMonths > config.maxDurationMonths) {
        return {
          isValid: false,
          message: `La durée maximum pour ce type de crédit est ${config.maxDurationMonths} mois`
        };
      }
      
      return { isValid: true };
    } catch (error) {
      console.error('Error validating loan duration:', error);
      return {
        isValid: false,
        message: 'Erreur lors de la validation de la durée'
      };
    }
  }

  /**
   * Calculer les frais de traitement pour un montant et un type de crédit
   */
  async calculateProcessingFee(loanType: LoanType, amount: number): Promise<number> {
    try {
      const config = await this.getConfiguration(loanType);
      return amount * config.processingFeeRate;
    } catch (error) {
      console.error('Error calculating processing fee:', error);
      return 0;
    }
  }

  /**
   * Calculer le montant mensuel estimé pour un crédit
   */
  async calculateMonthlyPayment(
    loanType: LoanType,
    amount: number,
    durationMonths: number
  ): Promise<{
    monthlyPayment: number;
    totalInterest: number;
    totalAmount: number;
    interestRate: number;
  }> {
    try {
      const config = await this.getConfiguration(loanType);
      const monthlyRate = config.defaultInterestRate;
      
      // Formule de calcul du paiement mensuel avec intérêt composé
      const monthlyPayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, durationMonths)) /
                            (Math.pow(1 + monthlyRate, durationMonths) - 1);
      
      const totalAmount = monthlyPayment * durationMonths;
      const totalInterest = totalAmount - amount;
      
      return {
        monthlyPayment,
        totalInterest,
        totalAmount,
        interestRate: monthlyRate
      };
    } catch (error) {
      console.error('Error calculating monthly payment:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const microcreditLoanTypeService = new MicrocreditLoanTypeService();

// Export class for testing or custom instances
export default MicrocreditLoanTypeService;
