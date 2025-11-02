import { BaseApiService } from '../base/BaseApiService';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  branchId?: number;
  branchName?: string;
  phoneNumber?: string;
  isActive?: boolean;
  lastLogin?: string;
}

export interface CashierDashboard {
  cashSessionStatus: string;
  cashBalanceHTG: number;
  cashBalanceUSD: number;
  todayDeposits: number;
  todayWithdrawals: number;
  todayExchanges: number;
  clientsServed: number;
  transactionCount: number;
  lastTransactionTime?: string;
}

export interface CreditAgentDashboard {
  activeCreditsCount: number;
  totalPortfolioAmount: number;
  pendingApplications: number;
  paymentsDueThisWeek: number;
  overdueCredits: number;
  repaymentRate: number;
  paymentsExpectedThisWeek: number;
  averageTicketSize: number;
}

export interface BranchSupervisorDashboard {
  todayTransactionVolume: number;
  todayTransactionCount: number;
  activeCashiers: number;
  newAccountsToday: number;
  branchCreditPortfolio: number;
  activeCredits: number;
  pendingCreditApprovals: number;
  averageTransactionTime: number;
  cashierPerformance: CashierPerformance[];
}

export interface CashierPerformance {
  cashierName: string;
  transactionsToday: number;
  volumeToday: number;
  sessionStart: string;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  clientName: string;
  cashier: string;
  timestamp: string;
  status: string;
}

export interface PendingAccount {
  id: string;
  accountNumber: string;
  clientName: string;
  accountType: string;
  submittedBy: string;
  submittedDate: string;
  amount: number;
}

export interface SuperAdminDashboard {
  totalBranches: number;
  activeBranches: number;
  totalUsers: number;
  activeUsers: number;
  totalVolume: number;
  systemHealth: number;
  recentActivity: number;
  totalSavingsAccounts: number;
  activeSavingsAccounts: number;
  totalSavingsBalance: number;
  totalClientAccounts: number;
  activeClientAccounts: number;
  totalClientBalanceHTG: number;
  totalClientBalanceUSD: number;
}

export class AuthService extends BaseApiService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.post<any>('/auth/login', credentials);
    // Handle both PascalCase (backend) and camelCase (frontend) response
    const data = response;
    const userData = data.user || data.User;

    // Normalize the user data to ensure all fields are properly mapped
    const normalizedUser: UserInfo = {
      id: userData.id || userData.Id,
      email: userData.email || userData.Email,
      firstName: userData.firstName || userData.FirstName,
      lastName: userData.lastName || userData.LastName,
      role: userData.role || userData.Role,
      branchId: userData.branchId || userData.BranchId,
      branchName: userData.branchName || userData.BranchName,
      phoneNumber: userData.phoneNumber || userData.PhoneNumber,
      isActive: userData.isActive || userData.IsActive,
      lastLogin: userData.lastLogin || userData.LastLogin
    };

    // Store token securely
    this.setAuthToken(data.token || data.Token);

    return {
      token: data.token || data.Token,
      user: normalizedUser
    };
  }

  async logout(): Promise<void> {
    await this.post('/auth/logout');
    this.clearAuthToken();
  }

  async getProfile(): Promise<UserInfo> {
    return this.get<UserInfo>('/auth/profile');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.post('/auth/change-password', { currentPassword, newPassword });
  }

  // Dashboard methods
  async getCashierDashboard(): Promise<CashierDashboard> {
    return this.get<CashierDashboard>('/dashboard/cashier');
  }

  async getCreditAgentDashboard(): Promise<CreditAgentDashboard> {
    return this.get<CreditAgentDashboard>('/dashboard/credit-agent');
  }

  async getBranchSupervisorDashboard(): Promise<BranchSupervisorDashboard> {
    return this.get<BranchSupervisorDashboard>('/dashboard/branch-supervisor');
  }

  async getRecentTransactions(branchId: number, limit: number = 10): Promise<Transaction[]> {
    return this.get<Transaction[]>(`/branch/${branchId}/transactions/recent?limit=${limit}`);
  }

  async getPendingAccounts(branchId: number): Promise<PendingAccount[]> {
    return this.get<PendingAccount[]>(`/branch/${branchId}/accounts/pending`);
  }

  async getSuperAdminDashboard(): Promise<SuperAdminDashboard> {
    return this.get<SuperAdminDashboard>('/dashboard/super-admin');
  }

  async getRecentActivities(limit: number = 10): Promise<any[]> {
    return this.get<any[]>(`/dashboard/recent-activities?limit=${limit}`);
  }

  // Utility methods for backward compatibility
  setAuthToken(token: string): void {
    super.setAuthToken(token);
  }

  removeAuthToken(): void {
    this.clearAuthToken();
  }

  getAuthToken(): string | null {
    return super.getAuthToken();
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  getCurrentUser(): UserInfo | null {
    const userStr = sessionStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  setCurrentUser(user: UserInfo): void {
    sessionStorage.setItem('user', JSON.stringify(user));
  }
}

export const authService = new AuthService();