export interface Branch {
  id: number;
  name: string;
  code: string;
  address: string;
  commune: string;
  department: string;
  phones: string[];
  email: string;
  openingDate: string;
  managerId?: string;
  managerName?: string;
  maxEmployees: number;
  status: BranchStatus;
  limits: BranchLimits;
  operatingHours: OperatingHours;
  createdAt: string;
  updatedAt: string;
}

export enum BranchStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  UnderConstruction = 'UnderConstruction'
}

export interface BranchLimits {
  dailyWithdrawalLimit: number;
  dailyDepositLimit: number;
  maxLocalCreditApproval: number;
  minCashReserveHTG: number;
  minCashReserveUSD: number;
}

export interface OperatingHours {
  openTime: string;
  closeTime: string;
  closedDays: DayOfWeek[];
}

export enum DayOfWeek {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6
}

export interface CreateBranchRequest {
  name: string;
  code?: string;
  address: string;
  commune: string;
  department: string;
  phones: string[];
  email: string;
  openingDate: string;
  managerId?: string;
  maxEmployees: number;
  status: BranchStatus;
  limits: BranchLimits;
  operatingHours: OperatingHours;
}

export interface UpdateBranchRequest extends Partial<CreateBranchRequest> {
  id: number;
}

export interface BranchFormData {
  name: string;
  code: string;
  address: string;
  commune: string;
  department: string;
  phone1: string;
  phone2?: string;
  phone3?: string;
  email: string;
  openingDate: string;
  managerId?: string;
  maxEmployees: number;
  status: BranchStatus;
  
  // Limits
  dailyWithdrawalLimit: number;
  dailyDepositLimit: number;
  maxLocalCreditApproval: number;
  minCashReserveHTG: number;
  minCashReserveUSD: number;
  
  // Operating Hours
  openTime: string;
  closeTime: string;
  closedDays?: DayOfWeek[];
}

export interface BranchHistory {
  id: number;
  branchId: number;
  action: string;
  description: string;
  performedBy: string;
  performedAt: string;
  oldValue?: any;
  newValue?: any;
}

// Haitian Departments
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

// Common communes by department
export const COMMUNES_BY_DEPARTMENT: Record<string, string[]> = {
  'Ouest': [
    'Port-au-Prince',
    'Carrefour',
    'Delmas',
    'Pétion-Ville',
    'Tabarre',
    'Cité Soleil',
    'Kenscoff',
    'Gressier',
    'Léogâne',
    'Grand-Goâve',
    'Petit-Goâve',
    'Arcahaie',
    'Cabaret',
    'Cornillon',
    'Croix-des-Bouquets'
  ],
  'Artibonite': [
    'Gonaïves',
    'Saint-Marc',
    'Dessalines',
    'Grande-Saline',
    'L\'Estère',
    'Petite-Rivière-de-l\'Artibonite',
    'Verrettes'
  ],
  'Nord': [
    'Cap-Haïtien',
    'Fort-Dauphin',
    'Grande-Rivière-du-Nord',
    'Quartier-Morin',
    'Limonade',
    'Plaine-du-Nord',
    'Dondon',
    'Saint-Raphaël'
  ],
  'Sud': [
    'Les Cayes',
    'Aquin',
    'Saint-Louis-du-Sud',
    'Cavaillon',
    'Port-Salut',
    'Roche-à-Bateau',
    'Torbeck'
  ],
  'Centre': [
    'Hinche',
    'Mirebalais',
    'Lascahobas',
    'Belladère',
    'Savanette',
    'Cerca-la-Source',
    'Thomonde'
  ],
  'Grand\'Anse': [
    'Jérémie',
    'Abricots',
    'Anse-d\'Hainault',
    'Corail',
    'Pestel',
    'Roseaux',
    'Beaumont'
  ],
  'Nippes': [
    'Miragoâne',
    'Petit-Trou-de-Nippes',
    'Anse-à-Veau',
    'Arnaud',
    'Baradères',
    'Fond-des-Nègres',
    'Plaisance-du-Sud'
  ],
  'Nord-Est': [
    'Fort-Liberté',
    'Ouanaminthe',
    'Terrier-Rouge',
    'Capotille',
    'Mont-Organisé',
    'Ferrier'
  ],
  'Nord-Ouest': [
    'Port-de-Paix',
    'Jean-Rabel',
    'Môle-Saint-Nicolas',
    'Bassin-Bleu',
    'Bombardopolis',
    'Chansolme'
  ],
  'Sud-Est': [
    'Jacmel',
    'Cayes-Jacmel',
    'Marigot',
    'Bainet',
    'Côtes-de-Fer',
    'La Vallée',
    'Belle-Anse'
  ]
};