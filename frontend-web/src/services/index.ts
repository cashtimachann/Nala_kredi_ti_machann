// Export all services from a central location
export { authService } from './auth/AuthService';
export { clientAccountService } from './clientAccounts/ClientAccountService';

// Re-export types for convenience
export type { LoginRequest, LoginResponse, UserInfo } from './auth/AuthService';
export type {
  ClientAccount,
  AccountType,
  AccountTransaction,
  AccountSearchFilters,
  ClientAccountStats
} from '../types/clientAccounts';