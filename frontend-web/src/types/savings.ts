// Types et interfaces pour le système de comptes d'épargne

export enum Currency {
  HTG = 'HTG',
  USD = 'USD'
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CLOSED = 'CLOSED',
  SUSPENDED = 'SUSPENDED'
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  INTEREST = 'INTEREST',
  FEE = 'FEE',
  OPENING_DEPOSIT = 'OPENING_DEPOSIT'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED'
}

export enum IdentityDocumentType {
  CIN = 'CIN', // Carte d'Identité Nationale
  PASSPORT = 'PASSPORT',
  DRIVING_LICENSE = 'DRIVING_LICENSE',
  BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE'
}

// Client/Customer Information
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'M' | 'F';
  address: CustomerAddress;
  contact: CustomerContact;
  identity: CustomerIdentity;
  // For entreprise (personne morale), the legal representative (if present)
  legalRepresentative?: LegalRepresentative;
  occupation?: string;
  monthlyIncome?: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface CustomerAddress {
  street: string;
  commune: string;
  department: string;
  country: string;
  postalCode?: string;
}

export interface CustomerContact {
  primaryPhone: string;
  secondaryPhone?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface CustomerIdentity {
  documentType: IdentityDocumentType;
  documentNumber: string;
  issuedDate: string;
  expiryDate?: string;
  issuingAuthority: string;
}

export interface LegalRepresentative {
  firstName?: string;
  lastName?: string;
  title?: string;
  documentType?: IdentityDocumentType | number;
  documentNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
}

// Savings Account
export interface SavingsAccount {
  id: string;
  accountNumber: string;
  customerId: string;
  customer?: Customer;
  branchId: number;
  branchName?: string;
  currency: Currency;
  balance: number;
  availableBalance: number;
  minimumBalance: number;
  openingDate: string;
  lastTransactionDate?: string;
  status: AccountStatus;
  interestRate: number;
  accruedInterest: number;
  lastInterestCalculation?: string;
  accountLimits: AccountLimits;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closedBy?: string;
  closureReason?: string;
}

export interface AccountLimits {
  dailyWithdrawalLimit: number;
  dailyDepositLimit: number;
  monthlyWithdrawalLimit: number;
  maxBalance: number;
  minWithdrawalAmount: number;
  maxWithdrawalAmount: number;
}

// Transactions
export interface Transaction {
  id: string;
  accountId: string;
  accountNumber: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reference: string;
  processedBy: string;
  processedByName?: string;
  branchId: number;
  branchName?: string;
  status: TransactionStatus;
  processedAt: string;
  createdAt: string;
  fees?: number;
  exchangeRate?: number;
  relatedTransactionId?: string;
  customerSignature?: string;
  receiptNumber?: string;
}

// Form Data Types
export interface CustomerFormData {
  // Type de client
  isBusiness?: boolean; // Personne morale si true
  companyName?: string; // Raison sociale (si personne morale)
  legalForm?: string; // Forme juridique (S.A., S.E.M., Individuelle, Coopérative)
  businessRegistrationNumber?: string; // Numéro de commerce / Registre
  companyNif?: string; // NIF de l'entreprise
  headOfficeAddress?: string; // Adresse du siège social
  companyPhone?: string; // Téléphone entreprise
  companyEmail?: string; // Email entreprise
  legalRepresentativeName?: string; // Nom du représentant légal
  legalRepresentativeTitle?: string; // Titre/Fonction du représentant
  legalRepresentativeDocumentType?: IdentityDocumentType; // Pièce représentant
  legalRepresentativeDocumentNumber?: string; // Numéro pièce représentant
  legalRepresentativeIssuedDate?: string; // Date d'émission du document du représentant
  legalRepresentativeExpiryDate?: string; // Date d'expiration du document du représentant
  legalRepresentativeIssuingAuthority?: string; // Autorité d'émission du document du représentant

  // Informations d'identification
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  birthPlace?: string; // Kote nesans
  gender: 'M' | 'F';
  nationality?: string; // Nasyonalite
  nif?: string; // Numéro d'Identification Fiscale
  photoUrl?: string; // Foto kliyan
  signature?: string; // Siyati (base64 oswa URL)
  
  // Adresse
  street: string;
  commune: string;
  department: string;
  postalAddress?: string; // Adrès postal (si diferan)
  
  // Contact
  primaryPhone: string;
  secondaryPhone?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  
  // Document d'identité
  documentType: IdentityDocumentType;
  documentNumber: string;
  issuedDate: string;
  expiryDate?: string;
  issuingAuthority: string;
  documentPhotoUrl?: string; // Fotokopi dokiman
  proofOfResidenceUrl?: string; // Prèv rezidans
  
  // Informations professionnelles
  occupation?: string;
  employerName?: string; // Non anplwayè oswa antrepriz
  workAddress?: string; // Adrès travay oswa komès
  incomeSource?: string; // Sous prensipal revni (salè, komès, transfè, elatriye)
  monthlyIncome?: number;
  transactionFrequency?: string; // Frekans tranzaksyon estime
  accountPurpose?: string; // Rezon ouvèti kont lan
  
  // Informations additionnelles (optionnel)
  referencePerson?: string; // Moun referans
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED'; // Sitiyasyon matrimonyal
  spouseName?: string; // Non konjwen
  numberOfDependents?: number; // Kantite moun ki depann
  educationLevel?: string; // Nivo edikasyon
  taxInfo?: string; // Enfòmasyon fiskal
  biometricData?: string; // Done byometrik (anprent oswa rekonesans fasyal)
  
  // Documents additionnels pour personne morale
  businessRegistrationDocumentUrl?: string; // Extrait registre du commerce
  companyProofOfAddressUrl?: string; // Justificatif de domicile de la société
  fundsOriginDeclarationUrl?: string; // Déclaration relative à l'origine des fonds
  otherDocumentsUrls?: string[]; // Autres documents
  
  // Déclaration et acceptation
  acceptTerms?: boolean; // Acceptation des conditions
  signaturePlace?: string; // Lieu de signature
  signatureDate?: string; // Date de signature
}

// Moun ki gen dwa siyati sou kont lan
export interface AuthorizedSigner {
  id?: string;
  fullName: string;
  documentType: IdentityDocumentType;
  documentNumber: string;
  relationshipToCustomer: string; // Relasyon avèk kliyan an (benefisyè, ko-titilè, mandatè)
  address: string;
  phoneNumber: string;
  signature?: string;
  authorizationLimit?: number; // Limit otorite (si gen limit sou tranzaksyon)
  photoUrl?: string;
}

export interface AccountOpeningFormData {
  customer: CustomerFormData;
  authorizedSigners?: AuthorizedSigner[]; // Moun ki gen dwa siyati
  currency: Currency;
  initialDeposit: number;
  depositMethod?: string; // Mòd vèsman inisyal (kach, transfè, chèk, elatriye)
  branchId: number;
  interestRate?: number;
  accountLimits?: Partial<AccountLimits>;
  securityPin?: string; // Kòd sekrè/PIN
  securityQuestion?: string; // Kesyon sekirite
  securityAnswer?: string; // Repons kesyon sekirite
  agentId?: string; // Ajan responsab ouvèti a
  privacyConsent: boolean; // Konsantman sou kondisyon itilizasyon ak politik konfidansyalite
  termsAccepted: boolean; // Akseptasyon règleman yo
}

export interface TransactionFormData {
  accountNumber: string;
  type: TransactionType;
  amount: number;
  description?: string;
  customerPresent: boolean;
  customerSignature?: string;
  verificationMethod: 'ID_CHECK' | 'SIGNATURE' | 'BIOMETRIC' | 'PIN';
  notes?: string;
}

// Search and Filter Types
export interface AccountFilters {
  search: string;
  currency: Currency | '';
  status: AccountStatus | '';
  branchId: number | '';
  dateFrom?: string;
  dateTo?: string;
  minBalance?: number;
  maxBalance?: number;
}

export interface TransactionFilters {
  accountId?: string;
  type: TransactionType | '';
  status: TransactionStatus | '';
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  branchId: number | '';
}

// Response Types
export interface AccountListResponse {
  accounts: SavingsAccount[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statistics: AccountStatistics;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: TransactionSummary;
}

// Statistics and Summary Types
export interface AccountStatistics {
  totalAccounts: number;
  activeAccounts: number;
  totalBalanceHTG: number;
  totalBalanceUSD: number;
  averageBalance: number;
  accountsByStatus: Record<AccountStatus, number>;
  accountsByCurrency: Record<Currency, number>;
  newAccountsThisMonth: number;
  dormantAccounts: number;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalVolume: number;
  averageTransaction: number;
  transactionsByType: Record<TransactionType, number>;
  dailyVolume: Record<string, number>;
}

// Configuration Types
export interface SavingsAccountConfig {
  minimumOpeningDeposit: Record<Currency, number>;
  minimumBalance: Record<Currency, number>;
  defaultInterestRate: Record<Currency, number>;
  defaultLimits: Record<Currency, AccountLimits>;
  fees: {
    withdrawal: Record<Currency, number>;
    belowMinimumBalance: Record<Currency, number>;
    accountMaintenance: Record<Currency, number>;
    statementPrint: Record<Currency, number>;
  };
  businessRules: {
    maxAccountsPerCustomer: number;
    requireMinimumAge: number;
    allowJointAccounts: boolean;
    interestCalculationFrequency: 'DAILY' | 'MONTHLY' | 'QUARTERLY';
    dormancyPeriodDays: number;
  };
}

// Utility Types
export interface AccountBalance {
  current: number;
  available: number;
  currency: Currency;
  lastUpdated: string;
}

export interface InterestCalculation {
  period: string;
  rate: number;
  principal: number;
  interest: number;
  compound: boolean;
}

// Receipt and Document Types
export interface TransactionReceipt {
  transactionId: string;
  receiptNumber: string;
  accountNumber: string;
  customerName: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  balanceAfter: number;
  processedAt: string;
  processedBy: string;
  branchName: string;
  signature?: string;
}

export interface AccountStatement {
  accountId: string;
  accountNumber: string;
  customerName: string;
  periodFrom: string;
  periodTo: string;
  openingBalance: number;
  closingBalance: number;
  transactions: Transaction[];
  interestEarned: number;
  totalCredits: number;
  totalDebits: number;
  generatedAt: string;
}

// Validation Constants
export const HAITI_DEPARTMENTS = [
  'Artibonite',
  'Centre', 
  'Grand\'Anse',
  'Nippes',
  'Nord',
  'Nord-Est',
  'Nord-Ouest',
  'Ouest',
  'Sud',
  'Sud-Est'
] as const;

export type HaitiDepartment = typeof HAITI_DEPARTMENTS[number];

export const COMMUNES_BY_DEPARTMENT: Record<HaitiDepartment, string[]> = {
  'Ouest': ['Port-au-Prince', 'Delmas', 'Tabarre', 'Pétion-Ville', 'Carrefour', 'Gressier', 'Léogâne', 'Grand-Goâve'],
  'Artibonite': ['Gonaïves', 'Saint-Marc', 'Dessalines', 'Petite-Rivière-de-l\'Artibonite', 'Verrettes'],
  'Nord': ['Cap-Haïtien', 'Fort-Dauphin', 'Ouanaminthe', 'Dondon', 'Milot'],
  'Sud': ['Cayes', 'Aquin', 'Saint-Louis-du-Sud', 'Cavaillon', 'Port-Salut'],
  'Centre': ['Hinche', 'Mirebalais', 'Lascahobas', 'Cerca-la-Source', 'Thomassique'],
  'Grand\'Anse': ['Jérémie', 'Dame-Marie', 'Anse-d\'Hainault', 'Corail', 'Pestel'],
  'Nippes': ['Miragoâne', 'Petit-Goâve', 'Anse-à-Veau', 'Baradères', 'Plaisance-du-Sud'],
  'Nord-Est': ['Fort-Dauphin', 'Trou-du-Nord', 'Sainte-Suzanne', 'Terrier-Rouge', 'Mombin-Crochu'],
  'Nord-Ouest': ['Port-de-Paix', 'Jean-Rabel', 'Môle-Saint-Nicolas', 'Bombardopolis', 'Bassin-Bleu'],
  'Sud-Est': ['Jacmel', 'Cayes-Jacmel', 'Marigot', 'Bainet', 'Belle-Anse']
};

// Business Rules Constants
export const BUSINESS_RULES = {
  MIN_AGE: 16,
  MAX_ACCOUNTS_PER_CUSTOMER: 3,
  ACCOUNT_NUMBER_LENGTH: 12,
  MIN_OPENING_DEPOSIT: {
    [Currency.HTG]: 500,
    [Currency.USD]: 10
  },
  MIN_BALANCE: {
    [Currency.HTG]: 100,
    [Currency.USD]: 2
  },
  DEFAULT_DAILY_WITHDRAWAL_LIMIT: {
    [Currency.HTG]: 50000,
    [Currency.USD]: 1000
  },
  INTEREST_RATES: {
    [Currency.HTG]: 0.03, // 3% annual
    [Currency.USD]: 0.015  // 1.5% annual
  }
} as const;