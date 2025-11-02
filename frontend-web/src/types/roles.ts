/**
 * Synchronized Role Types - MUST match backend enums exactly
 * Backend: NalaCreditAPI/Models/User.cs (UserRole)
 * Backend: NalaCreditAPI/DTOs/AdminDto.cs (AdminTypeDto)
 */

// ============================================================================
// USER ROLES (Database - Authentication/Authorization)
// ============================================================================

/**
 * UserRole - Stored in database, used for authentication/authorization
 * Maps directly to Identity roles
 */
export enum UserRole {
  Cashier = 0,
  Employee = 1,
  Manager = 2,
  Admin = 3,
  SupportTechnique = 4,
  SuperAdmin = 5
}

/**
 * Role names as returned by backend API
 * These are the string values used in JWT tokens and API responses
 */
export const UserRoleNames: Record<UserRole, string> = {
  [UserRole.Cashier]: 'Cashier',
  [UserRole.Employee]: 'Employee',
  [UserRole.Manager]: 'Manager',
  [UserRole.Admin]: 'Admin',
  [UserRole.SupportTechnique]: 'Support',
  [UserRole.SuperAdmin]: 'SuperAdmin'
};

// ============================================================================
// ADMIN TYPES (Business - UI/UX Customization)
// ============================================================================

/**
 * AdminType - Business roles with specific job functions
 * More granular than UserRole, used for UI customization and permissions
 * 
 * Multiple AdminTypes can map to same UserRole:
 * - CHEF_DE_SUCCURSALE & DIRECTEUR_REGIONAL → Manager
 * - ADMINISTRATEUR_SYSTEME & COMPTABLE_FINANCE → Admin
 */
export enum AdminType {
  CAISSIER = 0,
  SECRETAIRE_ADMINISTRATIF = 1,
  AGENT_DE_CREDIT = 2,
  CHEF_DE_SUCCURSALE = 3,
  DIRECTEUR_REGIONAL = 4,
  ADMINISTRATEUR_SYSTEME = 5,
  DIRECTION_GENERALE = 6,
  COMPTABLE_FINANCE = 7
}

/**
 * Mapping AdminType → UserRole (as per backend logic)
 * Source: AdminController.MapAdminTypeToUserRole()
 */
export const AdminTypeToUserRole: Record<AdminType, UserRole> = {
  [AdminType.CAISSIER]: UserRole.Cashier,
  [AdminType.SECRETAIRE_ADMINISTRATIF]: UserRole.SupportTechnique,
  [AdminType.AGENT_DE_CREDIT]: UserRole.Employee,
  [AdminType.CHEF_DE_SUCCURSALE]: UserRole.Manager,
  [AdminType.DIRECTEUR_REGIONAL]: UserRole.Manager,
  [AdminType.ADMINISTRATEUR_SYSTEME]: UserRole.Admin,
  [AdminType.DIRECTION_GENERALE]: UserRole.SuperAdmin,
  [AdminType.COMPTABLE_FINANCE]: UserRole.Admin
};

/**
 * Display labels for AdminType
 */
export const AdminTypeLabels: Record<AdminType, string> = {
  [AdminType.CAISSIER]: 'Caissier',
  [AdminType.SECRETAIRE_ADMINISTRATIF]: 'Secrétaire Administratif',
  [AdminType.AGENT_DE_CREDIT]: 'Agent de Crédit',
  [AdminType.CHEF_DE_SUCCURSALE]: 'Chef de Succursale',
  [AdminType.DIRECTEUR_REGIONAL]: 'Directeur Régional',
  [AdminType.ADMINISTRATEUR_SYSTEME]: 'Administrateur Système',
  [AdminType.DIRECTION_GENERALE]: 'Direction Générale',
  [AdminType.COMPTABLE_FINANCE]: 'Comptable/Finance'
};

/**
 * Descriptions for AdminType
 */
export const AdminTypeDescriptions: Record<AdminType, string> = {
  [AdminType.CAISSIER]: 'Gestion des transactions quotidiennes, encaissements et décaissements',
  [AdminType.SECRETAIRE_ADMINISTRATIF]: 'Support administratif, gestion documentaire et assistance',
  [AdminType.AGENT_DE_CREDIT]: 'Évaluation et suivi des demandes de crédit',
  [AdminType.CHEF_DE_SUCCURSALE]: 'Gestion complète d\'une succursale, validation des opérations jusqu\'à 100K HTG',
  [AdminType.DIRECTEUR_REGIONAL]: 'Supervision d\'une zone géographique, validation crédits moyens',
  [AdminType.ADMINISTRATEUR_SYSTEME]: 'Gestion technique du système, configuration et maintenance',
  [AdminType.DIRECTION_GENERALE]: 'Accès total au système, décisions stratégiques',
  [AdminType.COMPTABLE_FINANCE]: 'Gestion financière, comptabilité, rapports financiers'
};

// ============================================================================
// PERMISSIONS
// ============================================================================

export interface UserPermissions {
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
  maxCreditValidation?: number;
  readOnlyAccess: boolean;
  canManagePayroll: boolean;
  canManageEmployees: boolean;
  canProvideSupport: boolean;
}

/**
 * Permissions by AdminType
 * NOTE: Use AdminType for permissions, not UserRole!
 */
export const PermissionsByAdminType: Record<AdminType, UserPermissions> = {
  [AdminType.DIRECTION_GENERALE]: {
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
  [AdminType.ADMINISTRATEUR_SYSTEME]: {
    canCreateUsers: true,
    canModifyUsers: true,
    canDeleteUsers: false,
    canViewFinancialData: true,
    canModifyFinancialData: false,
    canViewSystemLogs: true,
    canModifySystemSettings: true,
    canManageBranches: true,
    canViewAllReports: true,
    canValidateCredits: false,
    readOnlyAccess: false,
    canManagePayroll: false,
    canManageEmployees: true,
    canProvideSupport: true
  },
  [AdminType.COMPTABLE_FINANCE]: {
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
    maxCreditValidation: 100000,
    readOnlyAccess: false,
    canManagePayroll: true,
    canManageEmployees: false,
    canProvideSupport: false
  },
  [AdminType.DIRECTEUR_REGIONAL]: {
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
    maxCreditValidation: 150000,
    readOnlyAccess: false,
    canManagePayroll: false,
    canManageEmployees: true,
    canProvideSupport: false
  },
  [AdminType.CHEF_DE_SUCCURSALE]: {
    canCreateUsers: false,
    canModifyUsers: false,
    canDeleteUsers: false,
    canViewFinancialData: true,
    canModifyFinancialData: false,
    canViewSystemLogs: false,
    canModifySystemSettings: false,
    canManageBranches: false,
    canViewAllReports: false,
    canValidateCredits: true,
    maxCreditValidation: 100000,
    readOnlyAccess: false,
    canManagePayroll: false,
    canManageEmployees: true,
    canProvideSupport: false
  },
  [AdminType.AGENT_DE_CREDIT]: {
    canCreateUsers: false,
    canModifyUsers: false,
    canDeleteUsers: false,
    canViewFinancialData: false,
    canModifyFinancialData: false,
    canViewSystemLogs: false,
    canModifySystemSettings: false,
    canManageBranches: false,
    canViewAllReports: false,
    canValidateCredits: true,
    maxCreditValidation: 50000,
    readOnlyAccess: false,
    canManagePayroll: false,
    canManageEmployees: false,
    canProvideSupport: false
  },
  [AdminType.CAISSIER]: {
    canCreateUsers: false,
    canModifyUsers: false,
    canDeleteUsers: false,
    canViewFinancialData: false,
    canModifyFinancialData: false,
    canViewSystemLogs: false,
    canModifySystemSettings: false,
    canManageBranches: false,
    canViewAllReports: false,
    canValidateCredits: false,
    readOnlyAccess: false,
    canManagePayroll: false,
    canManageEmployees: false,
    canProvideSupport: false
  },
  [AdminType.SECRETAIRE_ADMINISTRATIF]: {
    canCreateUsers: false,
    canModifyUsers: false,
    canDeleteUsers: false,
    canViewFinancialData: false,
    canModifyFinancialData: false,
    canViewSystemLogs: false,
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get UserRole from AdminType
 */
export function getUserRoleFromAdminType(adminType: AdminType): UserRole {
  return AdminTypeToUserRole[adminType];
}

/**
 * Get permissions for an AdminType
 */
export function getPermissions(adminType: AdminType): UserPermissions {
  return PermissionsByAdminType[adminType];
}

/**
 * Check if user can perform an action based on AdminType
 */
export function canPerformAction(
  adminType: AdminType,
  action: keyof UserPermissions
): boolean {
  const permissions = getPermissions(adminType);
  return permissions[action] === true;
}

/**
 * Get all AdminTypes for a specific UserRole
 */
export function getAdminTypesForUserRole(role: UserRole): AdminType[] {
  return Object.entries(AdminTypeToUserRole)
    .filter(([_, userRole]) => userRole === role)
    .map(([adminType]) => parseInt(adminType) as AdminType);
}

/**
 * Check if AdminType has Manager-level access
 */
export function isManagerLevel(adminType: AdminType): boolean {
  const role = getUserRoleFromAdminType(adminType);
  return role === UserRole.Manager || role === UserRole.Admin || role === UserRole.SuperAdmin;
}

/**
 * Check if AdminType can access branch manager dashboard
 */
export function canAccessBranchManagerDashboard(adminType: AdminType): boolean {
  return adminType === AdminType.CHEF_DE_SUCCURSALE;
}

/**
 * Check if AdminType can access regional manager dashboard
 */
export function canAccessRegionalManagerDashboard(adminType: AdminType): boolean {
  return adminType === AdminType.DIRECTEUR_REGIONAL;
}
