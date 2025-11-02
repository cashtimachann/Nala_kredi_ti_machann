// Types et interfaces pour la gestion des administrateurs

export enum AdminLevel {
  SUPPORT_TECHNIQUE = 3,
  ADMINISTRATEUR_FINANCIER = 4,
  ADMINISTRATEUR_RH = 4,
  MANAGER_REGIONAL = 4,
  AUDITEUR = 4,
  SUPER_ADMINISTRATEUR = 5
}

export enum AdminType {
  SUPER_ADMINISTRATEUR = 'SUPER_ADMINISTRATEUR',
  ADMINISTRATEUR_FINANCIER = 'ADMINISTRATEUR_FINANCIER',
  ADMINISTRATEUR_RH = 'ADMINISTRATEUR_RH',
  MANAGER_REGIONAL = 'MANAGER_REGIONAL',
  AUDITEUR = 'AUDITEUR',
  SUPPORT_TECHNIQUE = 'SUPPORT_TECHNIQUE'
}

export interface AdminPermissions {
  canCreateUsers: boolean;
  canModifyUsers: boolean;
  canDeleteUsers: boolean;
  canViewFinancialData: boolean;
  canModifyFinancialData: boolean;
  canViewSystemLogs: boolean;
  canModifySystemSettings: boolean;
  canManageBranches: boolean;
  canViewAllReports: boolean;
  canValidateCredits: boolean;
  maxCreditValidation?: number; // Montant maximum de crédit qu'il peut valider
  readOnlyAccess: boolean;
  canManagePayroll: boolean;
  canManageEmployees: boolean;
  canProvideSupport: boolean;
}

export interface AdminProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  photo?: string;
  adminType: AdminType;
  adminLevel: AdminLevel;
  permissions: AdminPermissions;
  department: string;
  // Optional primary branch assigned to this admin (single succursale)
  branchId?: string;
  hireDate: string;
  isActive: boolean;
  assignedBranches: string[]; // Pour Manager Régional
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastLogin?: string;
}

export interface AdminFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photo?: File | string;
  adminType: AdminType;
  department?: Department;
  // Required selected succursale id
  branchId: string;
  hireDate: string;
  assignedBranches: string[];
  password: string;
  confirmPassword: string;
}

export interface AdminCreateRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  adminType: AdminType;
  department?: string;
  branchId: string;
  hireDate: string;
  assignedBranches: string[];
  password: string;
  photo?: string; // Base64 encoded
}

export interface AdminUpdateRequest {
  firstName: string;
  lastName: string;
  phone: string;
  adminType: AdminType;
  department?: string;
  branchId: string;
  hireDate: string;
  assignedBranches: string[];
  photo?: string;
}

// Définition des permissions par type d'administrateur
export const ADMIN_PERMISSIONS: Record<AdminType, AdminPermissions> = {
  [AdminType.SUPER_ADMINISTRATEUR]: {
    canCreateUsers: true,
    canModifyUsers: true,
    canDeleteUsers: true,
    canViewFinancialData: true,
    canModifyFinancialData: true,
    canViewSystemLogs: true,
    canModifySystemSettings: true,
    canManageBranches: true,
    canViewAllReports: true,
    canValidateCredits: true,
    readOnlyAccess: false,
    canManagePayroll: true,
    canManageEmployees: true,
    canProvideSupport: true
  },
  [AdminType.ADMINISTRATEUR_FINANCIER]: {
    canCreateUsers: false,
    canModifyUsers: false,
    canDeleteUsers: false,
    canViewFinancialData: true,
    canModifyFinancialData: true,
    canViewSystemLogs: false,
    canModifySystemSettings: false,
    canManageBranches: false,
    canViewAllReports: true,
    canValidateCredits: true,
    maxCreditValidation: 100000, // HTG
    readOnlyAccess: false,
    canManagePayroll: false,
    canManageEmployees: false,
    canProvideSupport: false
  },
  [AdminType.ADMINISTRATEUR_RH]: {
    canCreateUsers: true,
    canModifyUsers: true,
    canDeleteUsers: false,
    canViewFinancialData: false,
    canModifyFinancialData: false,
    canViewSystemLogs: false,
    canModifySystemSettings: false,
    canManageBranches: false,
    canViewAllReports: false,
    canValidateCredits: false,
    readOnlyAccess: false,
    canManagePayroll: true,
    canManageEmployees: true,
    canProvideSupport: false
  },
  [AdminType.MANAGER_REGIONAL]: {
    canCreateUsers: false,
    canModifyUsers: true,
    canDeleteUsers: false,
    canViewFinancialData: true,
    canModifyFinancialData: false,
    canViewSystemLogs: false,
    canModifySystemSettings: false,
    canManageBranches: false,
    canViewAllReports: true,
    canValidateCredits: true,
    maxCreditValidation: 50000, // HTG
    readOnlyAccess: false,
    canManagePayroll: false,
    canManageEmployees: true,
    canProvideSupport: false
  },
  [AdminType.AUDITEUR]: {
    canCreateUsers: false,
    canModifyUsers: false,
    canDeleteUsers: false,
    canViewFinancialData: true,
    canModifyFinancialData: false,
    canViewSystemLogs: true,
    canModifySystemSettings: false,
    canManageBranches: false,
    canViewAllReports: true,
    canValidateCredits: false,
    readOnlyAccess: true,
    canManagePayroll: false,
    canManageEmployees: false,
    canProvideSupport: false
  },
  [AdminType.SUPPORT_TECHNIQUE]: {
    canCreateUsers: false,
    canModifyUsers: false,
    canDeleteUsers: false,
    canViewFinancialData: false,
    canModifyFinancialData: false,
    canViewSystemLogs: true,
    canModifySystemSettings: false,
    canManageBranches: false,
    canViewAllReports: false,
    canValidateCredits: false,
    readOnlyAccess: false,
    canManagePayroll: false,
    canManageEmployees: false,
    canProvideSupport: true
  }
};

// Labels pour l'affichage
export const ADMIN_TYPE_LABELS: Record<AdminType, string> = {
  [AdminType.SUPER_ADMINISTRATEUR]: 'Super Administrateur',
  [AdminType.ADMINISTRATEUR_FINANCIER]: 'Administrateur Financier',
  [AdminType.ADMINISTRATEUR_RH]: 'Administrateur RH',
  [AdminType.MANAGER_REGIONAL]: 'Manager Régional',
  [AdminType.AUDITEUR]: 'Auditeur',
  [AdminType.SUPPORT_TECHNIQUE]: 'Support Technique'
};

export const ADMIN_TYPE_DESCRIPTIONS: Record<AdminType, string> = {
  [AdminType.SUPER_ADMINISTRATEUR]: 'Accès total au système, gestion des succursales et création d\'administrateurs',
  [AdminType.ADMINISTRATEUR_FINANCIER]: 'Vue consolidée finances, validation crédits importants, rapports financiers',
  [AdminType.ADMINISTRATEUR_RH]: 'Gestion des employés, traitement paie, congés et recrutement',
  [AdminType.MANAGER_REGIONAL]: 'Supervision zone géographique, validation crédits moyens',
  [AdminType.AUDITEUR]: 'Accès lecture seule, tous les rapports et pistes d\'audit',
  [AdminType.SUPPORT_TECHNIQUE]: 'Assistance utilisateurs, maintenance système'
};

// Départements disponibles
export const DEPARTMENTS = [
  'Direction Générale',
  'Finance et Comptabilité', 
  'Ressources Humaines',
  'Opérations Régionales',
  'Audit et Contrôle',
  'Support Technique',
  'Service Client',
  'Marketing et Communication',
  'Juridique et Conformité',
  'Développement des Affaires'
] as const;

export type Department = typeof DEPARTMENTS[number];

// Filtres pour la liste des administrateurs
export interface AdminFilters {
  search: string;
  adminType: AdminType | '';
  department: Department | '';
  isActive: boolean | '';
  assignedBranch: string;
}

export interface AdminStatistics {
  totalAdmins: number;
  activeAdmins: number;
  adminsByType: Record<AdminType, number>;
  adminsByDepartment: Record<string, number>;
  recentLogins: number; // Nombre de connexions dans les 30 derniers jours
}