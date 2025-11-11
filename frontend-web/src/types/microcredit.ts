// Types et interfaces pour le système de microcrédit

export enum LoanType {
  // Types existants
  COMMERCIAL = 'COMMERCIAL', // Crédit commercial (petit commerce)
  AGRICULTURAL = 'AGRICULTURAL', // Crédit agricole (standard)
  PERSONAL = 'PERSONAL', // Crédit personnel (standard)
  EMERGENCY = 'EMERGENCY', // Crédit d'urgence
  
  // Nouveaux types de microcrédit
  CREDIT_LOYER = 'CREDIT_LOYER', // Crédit Loyer
  CREDIT_AUTO = 'CREDIT_AUTO', // Crédit Auto
  CREDIT_MOTO = 'CREDIT_MOTO', // Crédit Moto
  CREDIT_PERSONNEL = 'CREDIT_PERSONNEL', // Crédit Personnel
  CREDIT_SCOLAIRE = 'CREDIT_SCOLAIRE', // Crédit Scolaire
  CREDIT_AGRICOLE = 'CREDIT_AGRICOLE', // Crédit Agricole
  CREDIT_PROFESSIONNEL = 'CREDIT_PROFESSIONNEL', // Crédit Professionnel
  CREDIT_APPUI = 'CREDIT_APPUI', // Crédit d'Appui
  CREDIT_HYPOTHECAIRE = 'CREDIT_HYPOTHECAIRE' // Crédit Hypothécaire
}

export enum LoanStatus {
  PENDING = 'PENDING', // En attente d'approbation
  APPROVED = 'APPROVED', // Approuvé
  ACTIVE = 'ACTIVE', // En cours
  COMPLETED = 'COMPLETED', // Soldé
  OVERDUE = 'OVERDUE', // En retard
  DEFAULTED = 'DEFAULTED', // En défaut
  CANCELLED = 'CANCELLED' // Annulé
}

export enum ApplicationStatus {
  DRAFT = 'DRAFT', // Brouillon
  SUBMITTED = 'SUBMITTED', // Soumise
  UNDER_REVIEW = 'UNDER_REVIEW', // En cours de révision
  APPROVED = 'APPROVED', // Approuvée
  REJECTED = 'REJECTED', // Rejetée
  CANCELLED = 'CANCELLED' // Annulée
}

export enum PaymentStatus {
  PENDING = 'PENDING', // En attente
  COMPLETED = 'COMPLETED', // Effectué
  OVERDUE = 'OVERDUE', // En retard
  PARTIAL = 'PARTIAL', // Partiel
  CANCELLED = 'CANCELLED' // Annulé
}

export enum GuaranteeType {
  COLLATERAL = 'COLLATERAL', // Garantie matérielle
  PERSONAL = 'PERSONAL', // Caution personnelle
  GROUP = 'GROUP', // Garantie de groupe
  INSURANCE = 'INSURANCE', // Assurance
  DEPOSIT = 'DEPOSIT' // Dépôt de garantie
}

export enum ApprovalLevel {
  LOAN_OFFICER = 'LOAN_OFFICER', // Agent de crédit
  BRANCH_MANAGER = 'BRANCH_MANAGER', // Directeur de succursale
  REGIONAL_MANAGER = 'REGIONAL_MANAGER', // Directeur régional
  CREDIT_COMMITTEE = 'CREDIT_COMMITTEE' // Comité de crédit
}

export enum Currency {
  HTG = 'HTG',
  USD = 'USD'
}

// Configuration des types de crédit
export interface LoanTypeConfiguration {
  id: string;
  type: LoanType;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  minDurationMonths: number;
  maxDurationMonths: number;
  interestRateMin: number;
  interestRateMax: number;
  defaultInterestRate: number;
  requiredGuarantees: GuaranteeType[];
  approvalLevels: ApprovalLevel[];
  gracePeriodDays: number;
  penaltyRate: number;
  processingFeeRate: number;
  isActive: boolean;
  currency: Currency[];
}

// Client/Emprunteur
export interface Borrower {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'M' | 'F';
  address: BorrowerAddress;
  contact: BorrowerContact;
  identity: BorrowerIdentity;
  occupation: string;
  monthlyIncome: number;
  employmentType: string;
  yearsInBusiness?: number;
  creditScore?: number;
  previousLoans?: PreviousLoan[];
  references: Reference[];
  createdAt: string;
  updatedAt: string;
}

export interface BorrowerAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark?: string;
}

export interface BorrowerContact {
  primaryPhone: string;
  secondaryPhone?: string;
  email?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
}

export interface BorrowerIdentity {
  documentType: 'CIN' | 'PASSPORT' | 'DRIVING_LICENSE';
  documentNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate?: string;
}

export interface PreviousLoan {
  lender: string;
  amount: number;
  purpose: string;
  status: 'COMPLETED' | 'ACTIVE' | 'DEFAULTED';
  completedAt?: string;
}

export interface Reference {
  name: string;
  phone: string;
  relation: string;
  yearsKnown: number;
  occupation?: string;
}

// Demande de crédit
export interface LoanApplication {
  id: string;
  applicationNumber: string;
  borrowerId: string;
  borrower: Borrower;
  loanType: LoanType;
  requestedAmount: number;
  requestedDurationMonths: number;
  purpose: string;
  businessPlan?: string;
  currency: Currency;
  branchId: number;
  branchName: string;
  
  // Évaluation financière
  monthlyIncome: number;
  monthlyExpenses: number;
  existingDebts: number;
  collateralValue?: number;
  debtToIncomeRatio: number;
  
  // Documents requis
  documents: ApplicationDocument[];
  
  // Garanties
  guarantees: Guarantee[];
  
  // Workflow d'approbation
  approvals: ApprovalStep[];
  currentApprovalLevel: ApprovalLevel;
  
  // Évaluation de risque
  creditScore?: number;
  riskAssessment?: RiskAssessment;
  
  // Statut et dates
  status: ApplicationStatus;
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  
  // Agent responsable
  loanOfficerId: string;
  loanOfficerName: string;
}

export interface ApplicationDocument {
  id: string;
  type: DocumentType;
  name: string;
  description?: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

export enum DocumentType {
  ID_CARD = 'ID_CARD',
  PROOF_OF_INCOME = 'PROOF_OF_INCOME',
  BUSINESS_REGISTRATION = 'BUSINESS_REGISTRATION',
  BANK_STATEMENTS = 'BANK_STATEMENTS',
  COLLATERAL_DOCUMENT = 'COLLATERAL_DOCUMENT',
  REFERENCE_LETTER = 'REFERENCE_LETTER',
  PHOTOS = 'PHOTOS',
  OTHER = 'OTHER'
}

export interface Guarantee {
  id: string;
  type: GuaranteeType;
  description: string;
  value: number;
  currency: Currency;
  documents: ApplicationDocument[];
  guarantorInfo?: GuarantorInfo;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface GuarantorInfo {
  name: string;
  phone: string;
  address: string;
  occupation: string;
  monthlyIncome?: number;
  relation: string;
}

export interface ApprovalStep {
  id: string;
  level: ApprovalLevel;
  approverId: string;
  approverName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments?: string;
  processedAt?: string;
  requiredAmount?: number; // Montant approuvé à ce niveau
}

export interface RiskAssessment {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  factors: RiskFactor[];
  recommendation: string;
  assessedBy: string;
  assessedAt: string;
}

export interface RiskFactor {
  factor: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  weight: number;
  description: string;
}

// Prêt actif
export interface Loan {
  id: string;
  loanNumber: string;
  applicationId: string;
  borrowerId: string;
  borrower: Borrower;
  loanType: LoanType;
  
  // Conditions du prêt
  principalAmount: number;
  interestRate: number;
  durationMonths: number;
  installmentAmount: number;
  currency: Currency;
  
  // Dates importantes
  disbursementDate: string;
  firstInstallmentDate: string;
  maturityDate: string;
  
  // État financier
  totalAmountDue: number;
  amountPaid: number;
  principalPaid: number;
  interestPaid: number;
  penaltiesPaid: number;
  outstandingBalance: number;
  outstandingPrincipal: number;
  outstandingInterest: number;
  outstandingPenalties: number;
  
  // Statut et performance
  status: LoanStatus;
  installmentsPaid: number;
  installmentsRemaining: number;
  daysOverdue: number;
  
  // Échéancier
  paymentSchedule: PaymentSchedule[];
  
  // Paiements effectués
  payments: Payment[];
  
  // Informations de gestion
  branchId: number;
  branchName: string;
  loanOfficerId: string;
  loanOfficerName: string;
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
  lastPaymentDate?: string;
  nextPaymentDue?: string;
}

// Échéancier de paiement
export interface PaymentSchedule {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  status: PaymentStatus;
  paidAmount?: number;
  paidDate?: string;
  daysOverdue?: number;
  penaltyAmount?: number;
  remainingBalance: number;
}

// Paiement effectué
export interface Payment {
  id: string;
  loanId: string;
  paymentNumber: string;
  
  // Montants
  amount: number;
  principalAmount: number;
  interestAmount: number;
  penaltyAmount: number;
  currency: Currency;
  
  // Dates et statut
  paymentDate: string;
  valueDate: string;
  status: PaymentStatus;
  
  // Méthode de paiement
  paymentMethod: PaymentMethod;
  reference?: string;
  
  // Traitement
  processedBy: string;
  processedByName: string;
  branchId: number;
  branchName: string;
  
  // Reçu
  receiptNumber: string;
  receiptPath?: string;
  
  // Métadonnées
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CHECK = 'CHECK',
  CARD = 'CARD'
}

// Formulaires et interfaces utilisateur
export interface LoanApplicationFormData {
  // Informations de base
  loanType: LoanType;
  requestedAmount: number;
  requestedDurationMonths: number;
  purpose: string;
  currency: Currency;
  branchId: number;
  
  // Informations emprunteur
  borrower: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: 'M' | 'F';
    address: BorrowerAddress;
    contact: BorrowerContact;
    identity: BorrowerIdentity;
    occupation: string;
    monthlyIncome: number;
    employmentType: string;
    yearsInBusiness?: number;
  };
  
  // Informations financières
  monthlyExpenses: number;
  existingDebts: number;
  collateralValue?: number;
  businessPlan?: string;
  
  // Références
  references: Reference[];
  
  // Garanties
  guarantees: Omit<Guarantee, 'id' | 'verified' | 'verifiedAt' | 'verifiedBy'>[];
}

export interface PaymentFormData {
  loanId: string;
  amount: number;
  paymentDate: string;
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

// Statistiques et rapports
export interface LoanStatistics {
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  overdueLoans: number;
  defaultedLoans: number;
  totalDisbursed: number;
  totalOutstanding: number;
  totalCollected: number;
  portfolioAtRisk: number;
  averageLoanSize: number;
  averageInterestRate: number;
  collectionRate: number;
}

export interface LoanPortfolioSummary {
  byType: Record<LoanType, LoanStatistics>;
  byCurrency: Record<Currency, LoanStatistics>;
  byStatus: Record<LoanStatus, number>;
  monthlyTrends: MonthlyTrend[];
}

export interface MonthlyTrend {
  month: string;
  disbursements: number;
  collections: number;
  newLoans: number;
  completedLoans: number;
}

// Filtres et recherche
export interface LoanFilters {
  status?: LoanStatus[];
  loanType?: LoanType[];
  branchId?: number[];
  loanOfficerId?: string[];
  currency?: Currency[];
  amountRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: string;
    end: string;
  };
  overdueDays?: {
    min: number;
    max: number;
  };
}

export interface ApplicationFilters {
  status?: ApplicationStatus[];
  loanType?: LoanType[];
  branchId?: number[];
  loanOfficerId?: string[];
  submissionDateRange?: {
    start: string;
    end: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
}

// Réponses API
export interface LoanListResponse {
  loans: Loan[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface ApplicationListResponse {
  applications: LoanApplication[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

// Constantes métier
export const MICROCREDIT_BUSINESS_RULES = {
  MIN_LOAN_AMOUNT: {
    HTG: 5000,
    USD: 50
  },
  MAX_LOAN_AMOUNT: {
    HTG: 500000,
    USD: 5000
  },
  MIN_DURATION_MONTHS: 3,
  MAX_DURATION_MONTHS: 36,
  MIN_INTEREST_RATE: 0.01, // 1%
  MAX_INTEREST_RATE: 0.03, // 3%
  DEFAULT_PENALTY_RATE: 0.05, // 5% par mois de retard
  GRACE_PERIOD_DAYS: 5,
  MAX_DEBT_TO_INCOME_RATIO: 0.4, // 40%
  MIN_CREDIT_SCORE: 300,
  MAX_CREDIT_SCORE: 850,
  PROCESSING_FEE_RATE: 0.02 // 2% du montant du prêt
} as const;