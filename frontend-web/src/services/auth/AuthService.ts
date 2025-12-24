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

export interface CashManagementStats {
  depositsCount: number;
  depositsHTG: number;
  depositsUSD: number;
  withdrawalsCount: number;
  withdrawalsHTG: number;
  withdrawalsUSD: number;
  exchangeCount: number;
  exchangeHTGIn: number;
  exchangeHTGOut: number;
  exchangeUSDIn: number;
  exchangeUSDOut: number;
  recoveriesCount: number;
  recoveriesHTG: number;
  recoveriesUSD: number;
  netHTG: number;
  netUSD: number;
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
  cashManagement?: CashManagementStats;
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
      branchName: userData.branchName || userData.BranchName || userData.branch || userData.Branch,
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
    // Fetch raw profile and normalize keys (handles PascalCase from backend)
    const data: any = await this.get<any>('/auth/profile');
    const userData = data?.user || data?.User || data;
    const normalizedUser: UserInfo = {
      id: userData.id || userData.Id,
      email: userData.email || userData.Email,
      firstName: userData.firstName || userData.FirstName,
      lastName: userData.lastName || userData.LastName,
      role: userData.role || userData.Role,
      branchId: userData.branchId || userData.BranchId,
      branchName: userData.branchName || userData.BranchName || userData.branch || userData.Branch,
      phoneNumber: userData.phoneNumber || userData.PhoneNumber,
      isActive: userData.isActive || userData.IsActive,
      lastLogin: userData.lastLogin || userData.LastLogin
    };
    return normalizedUser;
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
    // Use existing backend endpoint: /api/Transaction/branch/{branchId}/today
    const summary: any = await this.get<any>(`/transaction/branch/${branchId}/today`);
    const list = (summary?.Transactions ?? summary?.transactions ?? []) as any[];
    return list.slice(0, limit).map((t) => {
      const rawC = t.Currency ?? t.currency ?? 'HTG';
      const currency = typeof rawC === 'number' ? (rawC === 1 ? 'HTG' : 'USD') : String(rawC);
      return {
        id: String(t.Id ?? t.id ?? t.TransactionNumber ?? t.transactionNumber ?? ''),
        type: String(t.Type ?? t.type ?? ''),
        amount: Number(t.Amount ?? t.amount ?? 0),
        currency,
        clientName: String(t.Customer ?? t.customer ?? ''),
        cashier: String(t.ProcessedBy ?? t.processedBy ?? ''),
        timestamp: String(t.CreatedAt ?? t.createdAt ?? new Date().toISOString()),
        status: 'Complétée'
      } as Transaction;
    });
  }

  async getPendingAccounts(_branchId: number): Promise<PendingAccount[]> {
    // Temporarily use loans pending as validation items for supervisors
    const loans: any[] = await this.get<any[]>(`/branch/loans/pending`);
    return loans.map((l) => ({
      id: String(l.id ?? l.Id ?? ''),
      accountNumber: String(l.applicationNumber ?? l.ApplicationNumber ?? ''),
      clientName: String(l.clientName ?? l.ClientName ?? ''),
      accountType: String(l.loanType ?? l.LoanType ?? 'Loan'),
      submittedBy: String(l.submittedBy ?? l.SubmittedBy ?? ''),
      submittedDate: String(l.requestDate ?? l.RequestDate ?? new Date().toISOString()),
      amount: Number(l.amount ?? l.Amount ?? 0)
    }));
  }

  // Approvals for pending loans (used by Branch Supervisor)
  async approveLoan(id: string): Promise<void> {
    await this.post(`/branch/loans/${id}/approve`);
  }

  async rejectLoan(id: string, reason: string): Promise<void> {
    await this.post(`/branch/loans/${id}/reject`, { reason });
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