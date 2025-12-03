import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { extractApiErrorMessage } from '../utils/errorHandling';
import { Branch, CreateBranchRequest, UpdateBranchRequest, BranchHistory } from '../types/branch';
import {
  Employee, CreateEmployeeDto, UpdateEmployeeDto, EmployeeSearchDto,
  PayrollPeriod, CreatePayrollPeriodDto, PayrollSearchDto,
  Payslip, PayrollCalculationDto, ProcessPayrollDto,
  SalaryAdvance, CreateSalaryAdvanceDto, ApproveSalaryAdvanceDto, PaySalaryAdvanceDto, SalaryAdvanceSearchDto,
  PayrollStatistics, SalaryAdvanceStatistics
} from '../types/payroll';
import {
  ClientAccount,
  AccountType,
  AccountTransaction,
  AccountSearchFilters,
  ClientAccountStats,
  SavingsAccountFormData,
  CurrentAccountFormData,
  TermSavingsAccountFormData,
  CreateSavingsAccountRequest,
  CreateCurrentAccountRequest,
  CreateTermSavingsAccountRequest,
  getAccountTypeLabel,
  getTermTypeLabel,
  TermSavingsType
} from '../types/clientAccounts';
import { 
  InterBranchTransfer, CreateInterBranchTransferDto, UpdateInterBranchTransferDto, InterBranchTransferSearchDto,
  ApproveInterBranchTransferDto, RejectInterBranchTransferDto, ProcessInterBranchTransferDto, DispatchInterBranchTransferDto, InterBranchTransferLogDto,
  ConsolidatedTransferReportDto 
} from '../types/interBranchTransfer';
import {
  CurrencyExchangeRate, CreateExchangeRateDto, UpdateExchangeRateDto, ExchangeRateSearchDto,
  ExchangeTransaction, ProcessExchangeDto, ExchangeTransactionSearchDto, ExchangeCalculationDto, ExchangeCalculationResult,
  CurrencyReserve, UpdateCurrencyReserveDto,
  CurrencyMovement, CreateCurrencyMovementDto, CurrencyMovementSearchDto,
  ExchangeStatistics, CurrencyReserveReport, ProfitabilityReport
} from '../types/currencyExchange';

// Import new modular services
import { authService, clientAccountService } from './index';
import { LoginRequest, LoginResponse, UserInfo, CashierDashboard, CreditAgentDashboard, BranchSupervisorDashboard, CashierPerformance, Transaction, PendingAccount, SuperAdminDashboard } from './auth/AuthService';

class ApiService {
  private api: AxiosInstance;
  private assetBaseOrigin: string;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'https://localhost:5001/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Derive the asset origin (scheme://host:port) from API base, stripping trailing /api
    try {
      const raw = this.api.defaults.baseURL || '';
      const url = new URL(raw);
      // If path ends with /api, drop it for asset base
      const path = url.pathname?.replace(/\/?api\/?$/, '') || '';
      this.assetBaseOrigin = `${url.protocol}//${url.host}${path}`.replace(/\/$/, '');
    } catch {
      // Fallbacks aligned with typical dev ports
      this.assetBaseOrigin = (process.env.REACT_APP_API_URL?.startsWith('http') ? process.env.REACT_APP_API_URL : 'http://localhost:5000').replace(/\/?api\/?$/, '');
    }

    console.log('🔧 ApiService initialized:', {
      baseURL: this.api.defaults.baseURL,
      hasAuthService: !!authService,
      initialToken: !!authService?.getAuthToken?.()
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token - USING authService CONSISTENTLY
    this.api.interceptors.request.use(
      (config) => {
        const token = authService?.getAuthToken?.();
        console.log('🔐 Interceptor - Token found:', !!token, 'for URL:', config.url);
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('✅ Authorization header set for:', config.url);
        } else {
          console.warn('⚠️ No token found for request:', config.url);
        }
        return config;
      },
      (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors - USING authService CONSISTENTLY
    this.api.interceptors.response.use(
      (response) => {
        console.log('✅ Response received:', response.status, response.config.url);
        // Normalize any file/photo URLs in the payload so images resolve reliably in dev
        if (response && response.data) {
          response.data = this.normalizePayloadFileUrls(response.data);
        }
        return response;
      },
      (error) => {
        console.error('❌ Response error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });
        
        if (error.response?.status === 401) {
          console.warn('🚨 401 Unauthorized - Clearing tokens and redirecting');
          authService?.logout?.();
        }
        // Attach parsed message for downstream consumers (centralized handling)
        (error as any).parsedMessage = extractApiErrorMessage(error);
        return Promise.reject(error);
      }
    );
  }

  // --- URL normalization helpers -------------------------------------------------
  private normalizePayloadFileUrls(data: any): any {
    const seen = new WeakSet<object>();

    const normalizeString = (val: string): string => {
      if (!val) return val;
      // Fix stale dev URLs pointing to port 7001
      if (val.startsWith('http://localhost:7001/')) {
        const rest = val.replace('http://localhost:7001', '');
        return `${this.assetBaseOrigin}${rest}`;
      }
      // Standardize any absolute URL that still points to a different localhost port
      if (/^https?:\/\/localhost:\d+\//.test(val) && !val.startsWith(this.assetBaseOrigin)) {
        try {
          const u = new URL(val);
          return `${this.assetBaseOrigin}${u.pathname}${u.search}${u.hash}`;
        } catch {
          // ignore
        }
      }
      // Prefix relative /uploads paths with the asset base origin
      if (val.startsWith('/uploads/')) {
        return `${this.assetBaseOrigin}${val}`;
      }
      return val;
    };

    const shouldNormalizeKey = (key: string) => {
      const k = key.toLowerCase();
      return (
        k === 'photourl' ||
        k === 'photo_url' ||
        k === 'fileurl' ||
        k === 'file_url' ||
        k === 'signature' ||
        k === 'image' ||
        k.endsWith('photourl') ||
        k.endsWith('fileurl')
      );
    };

    const walk = (node: any): any => {
      if (node == null) return node;
      const t = typeof node;
      if (t === 'string') return normalizeString(node as string);
      if (t !== 'object') return node;
      if (seen.has(node)) return node;
      seen.add(node);

      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
          node[i] = walk(node[i]);
        }
        return node;
      }

      // Object: normalize targeted keys and recurse
      for (const key of Object.keys(node)) {
        const val = (node as any)[key];
        if (typeof val === 'string') {
          if (shouldNormalizeKey(key) || val.startsWith('/uploads/') || /localhost:7001\//.test(val)) {
            (node as any)[key] = normalizeString(val);
            continue;
          }
        }
        (node as any)[key] = walk(val);
      }
      return node;
    };

    try {
      return walk(data);
    } catch (e) {
      console.warn('URL normalization skipped due to error:', e);
      return data;
    }
  }

  // Debug methods
  public debugAuthState(): void {
    console.group('🔐 ApiService Authentication Debug');
    console.log('AuthService token:', authService?.getAuthToken?.());
    console.log('LocalStorage token:', localStorage.getItem('token'));
    console.log('BaseURL:', this.api.defaults.baseURL);
    console.log('Is authenticated:', this.isAuthenticated());
    console.groupEnd();
  }

  public async testApiConnection(): Promise<void> {
    try {
      console.log('🧪 Testing API connection...');
      const response = await this.api.get('/CurrentAccount');
      console.log('✅ API test successful:', response.status);
    } catch (error: any) {
      console.error('❌ API test failed:', {
        status: error.response?.status,
        message: error.message,
        url: error.config?.url
      });
    }
  }

  // Authentication methods - DELEGATED TO AuthService
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return authService.login(credentials);
  }

  async logout(): Promise<void> {
    return authService.logout();
  }

  async getProfile(): Promise<UserInfo> {
    return authService.getProfile();
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return authService.changePassword(currentPassword, newPassword);
  }

  // Dashboard methods - DELEGATED TO AuthService
  async getCashierDashboard(): Promise<CashierDashboard> {
    return authService.getCashierDashboard();
  }

  async getCreditAgentDashboard(): Promise<CreditAgentDashboard> {
    return authService.getCreditAgentDashboard();
  }

  async getBranchSupervisorDashboard(): Promise<BranchSupervisorDashboard> {
    return authService.getBranchSupervisorDashboard();
  }

  async getSuperAdminDashboard(): Promise<SuperAdminDashboard> {
    return authService.getSuperAdminDashboard();
  }

  async getRecentActivities(limit: number = 10): Promise<any[]> {
    return authService.getRecentActivities(limit);
  }

  async getRecentTransactions(branchId: number, limit?: number): Promise<Transaction[]> {
    return authService.getRecentTransactions(branchId, limit);
  }

  async getPendingAccounts(branchId: number): Promise<PendingAccount[]> {
    return authService.getPendingAccounts(branchId);
  }

  // Transaction methods
  async processDeposit(accountId: number, amount: number, currency: 'HTG' | 'USD'): Promise<void> {
    await this.api.post('/transaction/deposit', {
      accountId,
      amount,
      currency: currency === 'HTG' ? 1 : 2,
      type: 1 // Deposit
    });
  }

  async processWithdrawal(accountId: number, amount: number, currency: 'HTG' | 'USD'): Promise<void> {
    await this.api.post('/transaction/withdrawal', {
      accountId,
      amount,
      currency: currency === 'HTG' ? 1 : 2,
      type: 2 // Withdrawal
    });
  }

  async openCashSession(openingBalanceHTG: number, openingBalanceUSD: number): Promise<void> {
    await this.api.post('/transaction/cash-session/open', {
      openingBalanceHTG,
      openingBalanceUSD
    });
  }

  async closeCashSession(closingBalanceHTG: number, closingBalanceUSD: number, notes?: string): Promise<void> {
    await this.api.post('/transaction/cash-session/close', {
      closingBalanceHTG,
      closingBalanceUSD,
      notes
    });
  }

  // Credit methods
  async createCreditApplication(application: {
    customerId: number;
    requestedAmount: number;
    currency: 'HTG' | 'USD';
    termWeeks: number;
    purpose: string;
    collateral?: string;
  }): Promise<void> {
    await this.api.post('/credit/application', {
      ...application,
      currency: application.currency === 'HTG' ? 1 : 2
    });
  }

  async getPendingApplications(): Promise<any[]> {
    const response = await this.api.get('/credit/applications/pending');
    return response.data;
  }

  async approveApplication(applicationId: number, approvedAmount?: number): Promise<void> {
    await this.api.post(`/credit/application/${applicationId}/approve`, {
      approvedAmount
    });
  }

  async rejectApplication(applicationId: number, comments: string): Promise<void> {
    await this.api.post(`/credit/application/${applicationId}/reject`, {
      comments
    });
  }

  async getAgentPortfolio(agentId: string): Promise<any> {
    const response = await this.api.get(`/credit/agent/${agentId}/portfolio`);
    return response.data;
  }

  async recordCreditPayment(creditId: number, amount: number): Promise<void> {
    await this.api.post('/credit/payment', {
      creditId,
      amount
    });
  }

  async getPaymentsDue(): Promise<any[]> {
    const response = await this.api.get('/credit/payments-due');
    return response.data;
  }

  // Utility methods - CONSISTENTLY USING authService
  setAuthToken(token: string): void {
    authService.setAuthToken(token);
  }

  removeAuthToken(): void {
    authService.removeAuthToken();
  }

  getAuthToken(): string | null {
    const token = authService.getAuthToken();
    console.log('🔑 getAuthToken result:', !!token);
    return token;
  }

  isAuthenticated(): boolean {
    const isAuth = !!authService.getAuthToken();
    console.log('🔐 isAuthenticated:', isAuth);
    return isAuth;
  }

  getCurrentUser(): UserInfo | null {
    return authService.getCurrentUser();
  }

  setCurrentUser(user: UserInfo): void {
    authService.setCurrentUser(user);
  }

  // Branch Management methods
  async getAllBranches(): Promise<Branch[]> {
    const response: AxiosResponse<Branch[]> = await this.api.get('/branch', {
      headers: { 'x-cache-ttl': '30000' },
    });
    return response.data;
  }

  async getBranchById(id: number): Promise<Branch> {
    const response: AxiosResponse<Branch> = await this.api.get(`/branch/${id}`, {
      headers: { 'x-cache-ttl': '60000' },
    });
    return response.data;
  }

  async createBranch(branchData: CreateBranchRequest): Promise<Branch> {
    const response: AxiosResponse<Branch> = await this.api.post('/branch', branchData);
    return response.data;
  }

  async updateBranch(id: number, branchData: UpdateBranchRequest): Promise<Branch> {
    const response: AxiosResponse<Branch> = await this.api.put(`/branch/${id}`, branchData);
    return response.data;
  }

  async deleteBranch(id: number): Promise<void> {
    await this.api.delete(`/branch/${id}`);
  }

  async activateBranch(id: number): Promise<void> {
    await this.api.post(`/branch/${id}/activate`);
  }

  async deactivateBranch(id: number): Promise<void> {
    await this.api.post(`/branch/${id}/deactivate`);
  }

  async assignBranchManager(branchId: number, managerId: string): Promise<void> {
    await this.api.post(`/branch/${branchId}/assign-manager`, { managerId });
  }

  async getBranchHistory(branchId: number): Promise<BranchHistory[]> {
    const response: AxiosResponse<BranchHistory[]> = await this.api.get(`/branch/${branchId}/history`);
    return response.data;
  }

  async generateBranchCode(name: string): Promise<string> {
    const response: AxiosResponse<{ code: string }> = await this.api.post('/branch/generate-code', { name });
    return response.data.code;
  }

  async validateBranchCode(code: string): Promise<boolean> {
    const response: AxiosResponse<{ isValid: boolean }> = await this.api.post('/branch/validate-code', { code });
    return response.data.isValid;
  }

  // Get available managers for branch assignment
  async getAvailableManagers(): Promise<UserInfo[]> {
    const response: AxiosResponse<UserInfo[]> = await this.api.get('/users/available-managers', {
      headers: { 'x-cache-ttl': '60000' },
    });
    return response.data;
  }

  // Get all users
  async getAllUsers(): Promise<UserInfo[]> {
    const response: AxiosResponse<UserInfo[]> = await this.api.get('/users', {
      headers: { 'x-cache-ttl': '45000' },
    });
    return response.data;
  }

  // Get all admins with full details
  async getAllAdmins(filters?: {
    search?: string;
    adminType?: number;
    department?: string;
    isActive?: boolean;
    assignedBranch?: string;
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('Search', filters.search);
    if (filters?.adminType !== undefined) params.append('AdminType', filters.adminType.toString());
    if (filters?.department) params.append('Department', filters.department);
    if (filters?.isActive !== undefined) params.append('IsActive', filters.isActive.toString());
    if (filters?.assignedBranch) params.append('AssignedBranch', filters.assignedBranch);
    if (filters?.page) params.append('Page', filters.page.toString());
    if (filters?.pageSize) params.append('PageSize', filters.pageSize.toString());
    
    const response: AxiosResponse<any> = await this.api.get(`/admin?${params.toString()}`);
    return response.data;
  }

  // Create admin user
  async createAdmin(adminData: any): Promise<any> {
    const response: AxiosResponse<any> = await this.api.post('/admin', adminData);
    return response.data;
  }

  // Update user status (activate/deactivate)
  async updateUserStatus(userId: string, isActive: boolean): Promise<UserInfo> {
    const response: AxiosResponse<UserInfo> = await this.api.put(`/admin/${userId}/toggle-status`, { isActive });
    return response.data;
  }

  // Update user details
  async updateUser(userId: string, userData: {
    FirstName: string;
    LastName: string;
    Phone: string;
    Department: string;
    AdminType: number;
    HireDate: string;
    AssignedBranches: string[];
    Password?: string;
  }): Promise<UserInfo> {
    const response: AxiosResponse<UserInfo> = await this.api.put(`/admin/${userId}`, userData);
    return response.data;
  }

  // Delete user
  async deleteUser(userId: string): Promise<void> {
    await this.api.delete(`/admin/${userId}`);
  }

  // =============================================================================
  // INTER-BRANCH TRANSFER METHODS
  // =============================================================================

  // InterBranchTransfer CRUD operations
  async getInterBranchTransfers(searchDto?: InterBranchTransferSearchDto): Promise<InterBranchTransfer[]> {
    const params = new URLSearchParams();
    if (searchDto) {
      Object.entries(searchDto).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const response: AxiosResponse<InterBranchTransfer[]> = await this.api.get(`/InterBranchTransfer?${params}`);
    return response.data;
  }

  async getInterBranchTransfer(id: string): Promise<InterBranchTransfer> {
    const response: AxiosResponse<InterBranchTransfer> = await this.api.get(`/InterBranchTransfer/${id}`);
    return response.data;
  }

  async createInterBranchTransfer(transferData: CreateInterBranchTransferDto): Promise<InterBranchTransfer> {
    const response: AxiosResponse<InterBranchTransfer> = await this.api.post('/InterBranchTransfer', transferData);
    return response.data;
  }

  async updateInterBranchTransfer(transferData: UpdateInterBranchTransferDto): Promise<InterBranchTransfer> {
    const response: AxiosResponse<InterBranchTransfer> = await this.api.put(`/InterBranchTransfer/${transferData.id}`, transferData);
    return response.data;
  }

  async deleteInterBranchTransfer(id: string): Promise<void> {
    await this.api.delete(`/InterBranchTransfer/${id}`);
  }

  // Transfer workflow operations
  async approveInterBranchTransfer(approvalData: ApproveInterBranchTransferDto): Promise<InterBranchTransfer> {
    const response: AxiosResponse<InterBranchTransfer> = await this.api.put(`/InterBranchTransfer/${approvalData.id}/approve`, approvalData);
    return response.data;
  }

  async rejectInterBranchTransfer(id: string, rejectionData: RejectInterBranchTransferDto): Promise<InterBranchTransfer> {
    const response: AxiosResponse<InterBranchTransfer> = await this.api.put(`/InterBranchTransfer/${id}/reject`, rejectionData);
    return response.data;
  }

  async processInterBranchTransfer(processingData: ProcessInterBranchTransferDto): Promise<InterBranchTransfer> {
    const response: AxiosResponse<InterBranchTransfer> = await this.api.put(`/InterBranchTransfer/${processingData.id}/process`, processingData);
    return response.data;
  }

  async dispatchInterBranchTransfer(dispatchData: DispatchInterBranchTransferDto): Promise<InterBranchTransfer> {
    const response: AxiosResponse<InterBranchTransfer> = await this.api.put(`/InterBranchTransfer/${dispatchData.id}/dispatch`, dispatchData);
    return response.data;
  }

  async cancelInterBranchTransfer(id: string, reason: string): Promise<InterBranchTransfer> {
    const response: AxiosResponse<InterBranchTransfer> = await this.api.put(`/InterBranchTransfer/${id}/cancel`, { reason });
    return response.data;
  }

  // Transfer audit and tracking
  async getInterBranchTransferLogs(transferId: string): Promise<InterBranchTransferLogDto[]> {
    const response: AxiosResponse<InterBranchTransferLogDto[]> = await this.api.get(`/InterBranchTransfer/${transferId}/logs`);
    return response.data;
  }

  async getTransferAuditTrail(transferId: string): Promise<InterBranchTransferLogDto[]> {
    const response: AxiosResponse<InterBranchTransferLogDto[]> = await this.api.get(`/InterBranchTransfer/${transferId}/audit-trail`);
    return response.data;
  }

  // Transfer reports and analytics
  async getConsolidatedTransferReport(branchId?: number, startDate?: string, endDate?: string): Promise<ConsolidatedTransferReportDto> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response: AxiosResponse<ConsolidatedTransferReportDto> = await this.api.get(`/InterBranchTransfer/consolidated-report?${params}`);
    return response.data;
  }

  async getBranchTransferSummary(branchId: number, startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const qs = params.toString();
    const url = qs
      ? `/InterBranchTransfer/branch/${branchId}/summary?${qs}`
      : `/InterBranchTransfer/branch/${branchId}/summary`;
    const response: AxiosResponse<any> = await this.api.get(url);
    return response.data;
  }

  async getBranchFinancialSummary(branchId: number): Promise<any> {
    const response: AxiosResponse<any> = await this.api.get(`/Branch/${branchId}/financial-summary`);
    return response.data;
  }

  async getPendingTransfersForApproval(): Promise<InterBranchTransfer[]> {
    const response: AxiosResponse<InterBranchTransfer[]> = await this.api.get('/inter-branch-transfer/pending-approval');
    return response.data;
  }

  async getTransfersInTransit(): Promise<InterBranchTransfer[]> {
    const response: AxiosResponse<InterBranchTransfer[]> = await this.api.get('/inter-branch-transfer/in-transit');
    return response.data;
  }

  async getRecentTransfers(limit: number = 10): Promise<InterBranchTransfer[]> {
    const response: AxiosResponse<InterBranchTransfer[]> = await this.api.get(`/inter-branch-transfer/recent?limit=${limit}`);
    return response.data;
  }

  // =============================================================================
  // PAYROLL SYSTEM METHODS
  // =============================================================================

  // Employee Management
  async getEmployees(searchDto?: EmployeeSearchDto): Promise<Employee[]> {
    const params = new URLSearchParams();
    if (searchDto) {
      if (searchDto.branchId) params.append('branchId', searchDto.branchId.toString());
      if (searchDto.searchTerm) params.append('searchTerm', searchDto.searchTerm.toString());
      if (searchDto.status !== undefined && searchDto.status !== null) {
        const statusMap: Record<number, string> = { 0: 'Active', 1: 'Inactive', 2: 'Suspended', 3: 'Terminated' };
        const statusName = statusMap[Number(searchDto.status)];
        if (statusName) params.append('status', statusName);
      }
      if ((searchDto as any).function !== undefined && (searchDto as any).function !== null) {
        const pos = this.mapFunctionToPosition(Number((searchDto as any).function));
        if (pos) params.append('position', pos);
      }
      if ((searchDto as any).hireDateFrom) params.append('hireDateFrom', (searchDto as any).hireDateFrom);
      if ((searchDto as any).hireDateTo) params.append('hireDateTo', (searchDto as any).hireDateTo);
      if ((searchDto as any).page) params.append('page', String((searchDto as any).page));
      if ((searchDto as any).pageSize) params.append('pageSize', String((searchDto as any).pageSize));
    }
    const response: AxiosResponse<any[]> = await this.api.get(`/employees?${params}`, {
      headers: { 'x-cache-ttl': '20000' },
    });
    return (response.data || []).map((dto) => this.mapEmployeeDto(dto));
  }

  async getEmployee(id: string): Promise<Employee> {
    const response: AxiosResponse<any> = await this.api.get(`/employees/${id}`, {
      headers: { 'x-cache-ttl': '45000' },
    });
    return this.mapEmployeeDto(response.data);
  }

  async createEmployee(employeeData: CreateEmployeeDto): Promise<Employee> {
    const response: AxiosResponse<Employee> = await this.api.post('/employees', employeeData);
    return response.data;
  }

  async updateEmployee(employeeData: UpdateEmployeeDto): Promise<Employee> {
    const response: AxiosResponse<Employee> = await this.api.put(`/employees/${employeeData.id}`, employeeData);
    return response.data;
  }

  async deleteEmployee(id: string): Promise<void> {
    await this.api.delete(`/employees/${id}`);
  }

  async getEmployeesByBranch(branchId: string): Promise<Employee[]> {
    const response: AxiosResponse<Employee[]> = await this.api.get(`/employees/branch/${branchId}`);
    return response.data;
  }

  // Payroll Period Management
  async getPayrollPeriods(searchDto?: PayrollSearchDto): Promise<PayrollPeriod[]> {
    const params = new URLSearchParams();
    if (searchDto) {
      Object.entries(searchDto).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const response: AxiosResponse<PayrollPeriod[]> = await this.api.get(`/payroll-periods?${params}`);
    return response.data;
  }

  async getPayrollPeriod(id: string): Promise<PayrollPeriod> {
    const response: AxiosResponse<PayrollPeriod> = await this.api.get(`/payroll-periods/${id}`);
    return response.data;
  }

  async createPayrollPeriod(periodData: CreatePayrollPeriodDto): Promise<PayrollPeriod> {
    const response: AxiosResponse<PayrollPeriod> = await this.api.post('/payroll-periods', periodData);
    return response.data;
  }

  async processPayroll(payrollData: ProcessPayrollDto): Promise<Payslip[]> {
    const response: AxiosResponse<Payslip[]> = await this.api.post('/payroll/process', payrollData);
    return response.data;
  }

  async finalizePayroll(periodId: string): Promise<PayrollPeriod> {
    const response: AxiosResponse<PayrollPeriod> = await this.api.post(`/payroll-periods/${periodId}/finalize`);
    return response.data;
  }

  // Payslip Management
  async getPayslips(periodId: string): Promise<Payslip[]> {
    const response: AxiosResponse<Payslip[]> = await this.api.get(`/payslips/period/${periodId}`);
    return response.data;
  }

  async getPayslip(id: string): Promise<Payslip> {
    const response: AxiosResponse<Payslip> = await this.api.get(`/payslips/${id}`);
    return response.data;
  }

  async getEmployeePayslips(employeeId: string): Promise<Payslip[]> {
    const response: AxiosResponse<Payslip[]> = await this.api.get(`/payslips/employee/${employeeId}`);
    return response.data;
  }

  async approvePayslip(id: string): Promise<Payslip> {
    const response: AxiosResponse<Payslip> = await this.api.post(`/payslips/${id}/approve`);
    return response.data;
  }

  async markPayslipAsPaid(id: string, paymentData: { paymentMode: number; paymentReference?: string }): Promise<Payslip> {
    const response: AxiosResponse<Payslip> = await this.api.post(`/payslips/${id}/mark-paid`, paymentData);
    return response.data;
  }

  // Salary Advance Management
  async getSalaryAdvances(searchDto?: SalaryAdvanceSearchDto): Promise<SalaryAdvance[]> {
    const params = new URLSearchParams();
    if (searchDto) {
      Object.entries(searchDto).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const response: AxiosResponse<SalaryAdvance[]> = await this.api.get(`/salary-advances?${params}`);
    return response.data;
  }

  async getSalaryAdvance(id: string): Promise<SalaryAdvance> {
    const response: AxiosResponse<SalaryAdvance> = await this.api.get(`/salary-advances/${id}`);
    return response.data;
  }

  async createSalaryAdvance(advanceData: CreateSalaryAdvanceDto): Promise<SalaryAdvance> {
    const response: AxiosResponse<SalaryAdvance> = await this.api.post('/salary-advances', advanceData);
    return response.data;
  }

  async approveSalaryAdvance(approvalData: ApproveSalaryAdvanceDto): Promise<SalaryAdvance> {
    const response: AxiosResponse<SalaryAdvance> = await this.api.post(`/salary-advances/${approvalData.id}/approve`, approvalData);
    return response.data;
  }

  async rejectSalaryAdvance(id: string, reason: string): Promise<SalaryAdvance> {
    const response: AxiosResponse<SalaryAdvance> = await this.api.post(`/salary-advances/${id}/reject`, { reason });
    return response.data;
  }

  async paySalaryAdvance(paymentData: PaySalaryAdvanceDto): Promise<SalaryAdvance> {
    const response: AxiosResponse<SalaryAdvance> = await this.api.post(`/salary-advances/${paymentData.id}/pay`, paymentData);
    return response.data;
  }

  // Payroll Reports and Statistics
  async getPayrollStatistics(branchId?: string, startDate?: string, endDate?: string): Promise<PayrollStatistics> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response: AxiosResponse<PayrollStatistics> = await this.api.get(`/payroll/statistics?${params}`);
    return response.data;
  }

  async getSalaryAdvanceStatistics(branchId?: string): Promise<SalaryAdvanceStatistics> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    const response: AxiosResponse<SalaryAdvanceStatistics> = await this.api.get(`/salary-advances/statistics?${params}`);
    return response.data;
  }

  // =============================================================================
  // CURRENCY EXCHANGE SYSTEM METHODS
  // =============================================================================

  // Exchange Rate Management
  async getExchangeRates(searchDto?: ExchangeRateSearchDto): Promise<CurrencyExchangeRate[]> {
    const params = new URLSearchParams();
    if (searchDto) {
      Object.entries(searchDto).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const response: AxiosResponse<any> = await this.api.get(`/currency-exchange/rates?${params}`);
    return response.data.data || [];
  }

  async getExchangeRate(id: string): Promise<CurrencyExchangeRate> {
    const response: AxiosResponse<any> = await this.api.get(`/currency-exchange/rates/${id}`);
    return response.data.data;
  }

  async getCurrentRates(): Promise<CurrencyExchangeRate[]> {
    const response: AxiosResponse<any> = await this.api.get('/currency-exchange/current-rates');
    return response.data.data || [];
  }

  async createExchangeRate(rateData: CreateExchangeRateDto): Promise<CurrencyExchangeRate> {
    const response: AxiosResponse<CurrencyExchangeRate> = await this.api.post('/currency-exchange/rates', rateData);
    return response.data;
  }

  async updateExchangeRate(rateData: UpdateExchangeRateDto): Promise<CurrencyExchangeRate> {
    const response: AxiosResponse<CurrencyExchangeRate> = await this.api.put(`/currency-exchange/rates/${rateData.id}`, rateData);
    return response.data;
  }

  async deactivateExchangeRate(id: string): Promise<void> {
    await this.api.delete(`/currency-exchange/rates/${id}`);
  }

  // Exchange Transaction Management
  async calculateExchange(calculation: ExchangeCalculationDto): Promise<ExchangeCalculationResult> {
    const response: AxiosResponse<any> = await this.api.post('/currency-exchange/calculate', calculation);
    return response.data.data;
  }

  async processExchange(exchangeData: ProcessExchangeDto): Promise<ExchangeTransaction> {
    const response: AxiosResponse<any> = await this.api.post('/currency-exchange/transactions', {
      branchId: exchangeData.branchId,
      fromCurrency: exchangeData.fromCurrency,
      toCurrency: exchangeData.toCurrency,
      exchangeType: exchangeData.exchangeType,
      amount: exchangeData.fromAmount,
      fromAmount: exchangeData.fromAmount,
      customerName: exchangeData.customerName,
      customerDocument: exchangeData.customerDocument,
      customerPhone: exchangeData.customerPhone,
      notes: exchangeData.notes
    });
    return response.data.data;
  }

  async getExchangeTransactions(searchDto?: ExchangeTransactionSearchDto): Promise<ExchangeTransaction[]> {
    const params = new URLSearchParams();
    if (searchDto) {
      Object.entries(searchDto).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const response: AxiosResponse<any> = await this.api.get(`/currency-exchange/transactions?${params}`);
    return response.data.data || [];
  }

  async getExchangeTransaction(id: string): Promise<ExchangeTransaction> {
    const response: AxiosResponse<any> = await this.api.get(`/currency-exchange/transactions/${id}`);
    return response.data.data;
  }

  async approveExchangeTransaction(id: string): Promise<ExchangeTransaction> {
    const response: AxiosResponse<ExchangeTransaction> = await this.api.post(`/currency-exchange/transactions/${id}/approve`);
    return response.data;
  }

  async cancelExchangeTransaction(id: string, reason: string): Promise<ExchangeTransaction> {
    const response: AxiosResponse<ExchangeTransaction> = await this.api.post(`/currency-exchange/transactions/${id}/cancel`, { reason });
    return response.data;
  }

  async printReceipt(transactionId: string): Promise<void> {
    await this.api.post(`/currency-exchange/transactions/${transactionId}/print-receipt`);
  }

  // Currency Reserve Management
  async getCurrencyReserves(branchId?: string): Promise<CurrencyReserve[]> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    const response: AxiosResponse<any> = await this.api.get(`/currency-exchange/reserves?${params}`);
    return response.data.data || [];
  }

  async getCurrencyReserve(id: string): Promise<CurrencyReserve> {
    const response: AxiosResponse<any> = await this.api.get(`/currency-exchange/reserves/${id}`);
    return response.data.data;
  }

  async updateCurrencyReserve(reserveData: UpdateCurrencyReserveDto): Promise<CurrencyReserve> {
    const response: AxiosResponse<CurrencyReserve> = await this.api.put(`/currency-exchange/reserves/${reserveData.id}`, reserveData);
    return response.data;
  }

  async getCurrencyMovements(searchDto?: CurrencyMovementSearchDto): Promise<CurrencyMovement[]> {
    const params = new URLSearchParams();
    if (searchDto) {
      Object.entries(searchDto).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const response: AxiosResponse<any> = await this.api.get(`/currency-exchange/movements?${params}`);
    return response.data.data || [];
  }

  async createCurrencyMovement(movementData: CreateCurrencyMovementDto): Promise<CurrencyMovement> {
    const response: AxiosResponse<CurrencyMovement> = await this.api.post('/currency-exchange/movements', movementData);
    return response.data;
  }

  // Currency Exchange Reports and Statistics
  async getExchangeStatistics(branchId?: string, startDate?: string, endDate?: string): Promise<ExchangeStatistics> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response: AxiosResponse<ExchangeStatistics> = await this.api.get(`/currency-exchange/statistics?${params}`);
    return response.data;
  }

  async getCurrencyReserveReport(branchId?: string): Promise<CurrencyReserveReport[]> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    const response: AxiosResponse<CurrencyReserveReport[]> = await this.api.get(`/currency-exchange/reserve-report?${params}`);
    return response.data;
  }

  async getProfitabilityReport(branchId?: string, startDate?: string, endDate?: string): Promise<ProfitabilityReport> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response: AxiosResponse<ProfitabilityReport> = await this.api.get(`/currency-exchange/profitability?${params}`);
    return response.data;
  }

  async getDailyExchangeTransactions(branchId: string, date: string): Promise<ExchangeTransaction[]> {
    const response: AxiosResponse<any> = await this.api.get(`/currency-exchange/daily/${branchId}/${date}`);
    return response.data.data || [];
  }

  // Client Account Management Methods - DELEGATED TO ClientAccountService
  async getClientAccounts(filters?: AccountSearchFilters): Promise<ClientAccount[]> {
    return clientAccountService.getClientAccounts(filters);
  }

  async getClientAccountStats(): Promise<ClientAccountStats> {
    return clientAccountService.getClientAccountStats();
  }

  async getCurrentAccountBalance(accountNumber: string): Promise<{ balance: number; availableBalance: number; currency: 'HTG' | 'USD'; status?: string; }> {
    return clientAccountService.getCurrentAccountBalance(accountNumber);
  }

  async getAccountTransactions(accountNumber: string): Promise<AccountTransaction[]> {
    return clientAccountService.getAccountTransactions(accountNumber);
  }

  async cancelCurrentAccountTransaction(id: string | number, reason: string): Promise<void> {
    return clientAccountService.cancelCurrentAccountTransaction(id, reason);
  }

  async processCurrentAccountTransaction(data: {
    accountNumber: string;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    currency: 'HTG' | 'USD';
    amount: number;
    description?: string;
    clientPresent?: boolean;
    verificationMethod?: string;
    notes?: string;
  }): Promise<any> {
    return clientAccountService.processCurrentAccountTransaction(data);
  }

  async processCurrentAccountTransfer(data: any): Promise<any> {
    return clientAccountService.processCurrentAccountTransfer(data);
  }

  async createSavingsAccount(data: CreateSavingsAccountRequest): Promise<ClientAccount> {
    return clientAccountService.createSavingsAccount(data);
  }

  async createCurrentAccount(data: CreateCurrentAccountRequest): Promise<ClientAccount> {
    return clientAccountService.createCurrentAccount(data);
  }

  async updateCurrentAccount(accountId: string, data: any): Promise<ClientAccount> {
    return clientAccountService.updateCurrentAccount(accountId, data);
  }

  async createTermSavingsAccount(data: CreateTermSavingsAccountRequest): Promise<ClientAccount> {
    return clientAccountService.createTermSavingsAccount(data);
  }

  async renewTermSavingsAccount(accountId: string, data?: { renewalTermType?: TermSavingsType; autoRenew?: boolean; interestRate?: number }): Promise<ClientAccount> {
    return clientAccountService.renewTermSavingsAccount(accountId, data);
  }

  async updateAccountStatus(accountId: string | number, isActive: boolean, accountNumber?: string): Promise<void> {
    return clientAccountService.updateAccountStatus(accountId, isActive, accountNumber);
  }

  async getTermSavingsAccounts(filters?: {
    currency?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    return clientAccountService.getTermSavingsAccounts(filters);
  }

  async closeTermSavingsAccount(accountId: string, reason: string, earlyWithdrawalPenaltyPercent?: number): Promise<void> {
    return clientAccountService.closeTermSavingsAccount(accountId, reason, earlyWithdrawalPenaltyPercent);
  }

  async closeClientAccount(accountId: string, reason: string): Promise<void> {
    return clientAccountService.closeClientAccount(accountId, reason);
  }

  async deleteTermSavingsAccount(accountId: string): Promise<void> {
    return clientAccountService.deleteTermSavingsAccount(accountId);
  }

  async toggleTermSavingsAccountStatus(accountId: string): Promise<void> {
    return clientAccountService.toggleTermSavingsAccountStatus(accountId);
  }

  async getAccountDetails(accountId: string | number): Promise<ClientAccount> {
    return clientAccountService.getAccountDetails(accountId);
  }

  async getAccountByNumber(accountNumber: string): Promise<ClientAccount> {
    return clientAccountService.getAccountByNumber(accountNumber);
  }

  async processTermSavingsTransaction(data: {
    accountNumber: string;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: number;
    currency: 'HTG' | 'USD';
    description?: string;
  }): Promise<any> {
    return clientAccountService.processTermSavingsTransaction(data);
  }

  async getAllTermSavingsTransactions(filters?: {
    accountNumber?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    branchId?: string;
    minAmount?: string;
    maxAmount?: string;
  }): Promise<AccountTransaction[]> {
    return clientAccountService.getAllTermSavingsTransactions(filters);
  }

  // =============================
  // Mapping helpers (ClientAccount)
  // =============================
  private mapAccountType(value: any): AccountType {
    const v = (typeof value === 'number') ? value : (value || '').toString().toLowerCase();
    if (typeof v === 'number') {
      return v === 1 ? AccountType.CURRENT : v === 2 ? AccountType.TERM_SAVINGS : AccountType.SAVINGS;
    }
    switch (v) {
      case 'current':
        return AccountType.CURRENT;
      case 'termsavings':
      case 'term_savings':
      case 'term-savings':
        return AccountType.TERM_SAVINGS;
      default:
        return AccountType.SAVINGS;
    }
  }

  private mapCurrency(value: any): 'HTG' | 'USD' {
    if (typeof value === 'number') return value === 1 ? 'USD' : 'HTG';
    const v = (value || '').toString().toUpperCase();
    return v === 'USD' ? 'USD' : 'HTG';
  }

  private mapStatus(value: any): 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'SUSPENDED' {
    if (typeof value === 'number') {
      switch (value) {
        case 1: return 'INACTIVE';
        case 2: return 'CLOSED';
        case 3: return 'SUSPENDED';
        default: return 'ACTIVE';
      }
    }
    const v = (value || '').toString().toLowerCase();
    if (v.includes('inactive')) return 'INACTIVE';
    if (v.includes('closed')) return 'CLOSED';
    if (v.includes('suspend')) return 'SUSPENDED';
    return 'ACTIVE';
  }

  private mapTermType(value: any): TermSavingsType | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') {
      return value === 1
        ? TermSavingsType.SIX_MONTHS
        : value === 2
          ? TermSavingsType.TWELVE_MONTHS
          : value === 3
            ? TermSavingsType.TWENTY_FOUR_MONTHS
            : TermSavingsType.THREE_MONTHS;
    }
    const v = (value || '').toString().toLowerCase();
    switch (v) {
      case 'sixmonths':
      case 'six_months':
      case 'six-months':
        return TermSavingsType.SIX_MONTHS;
      case 'twelvemonths':
      case 'twelve_months':
      case 'twelve-months':
        return TermSavingsType.TWELVE_MONTHS;
      case 'twentyfourmonths':
      case 'twenty_four_months':
      case 'twenty-four-months':
        return TermSavingsType.TWENTY_FOUR_MONTHS;
      default:
        return TermSavingsType.THREE_MONTHS;
    }
  }

  private mapClientAccountSummary(dto: any): ClientAccount {
    const accountType = this.mapAccountType(dto?.accountType ?? dto?.AccountType);
    const currency = this.mapCurrency(dto?.currency ?? dto?.Currency);
    const status = this.mapStatus(dto?.status ?? dto?.Status);
    const openingDate = (dto?.openingDate ?? dto?.OpeningDate) || new Date().toISOString();
    const lastTx = dto?.lastTransactionDate ?? dto?.LastTransactionDate ?? undefined;
    const id = dto?.id ?? dto?.Id ?? '';
    const branchId = Number(dto?.branchId ?? dto?.BranchId ?? 0);

    return {
      id,
      accountNumber: dto?.accountNumber ?? dto?.AccountNumber ?? '',
      accountType,
      customerId: dto?.customerId ?? dto?.CustomerId ?? '',
      customerName: dto?.customerName ?? dto?.CustomerName ?? '',
      customerPhone: dto?.customerPhone ?? dto?.CustomerPhone ?? '',
      branchId,
      branchName: dto?.branchName ?? dto?.BranchName ?? '',
      currency,
      balance: Number(dto?.balance ?? dto?.Balance ?? 0),
      availableBalance: Number(dto?.availableBalance ?? dto?.AvailableBalance ?? dto?.balance ?? dto?.Balance ?? 0),
      status,
      openingDate: typeof openingDate === 'string' ? openingDate : new Date(openingDate).toISOString(),
      lastTransactionDate: lastTx ? (typeof lastTx === 'string' ? lastTx : new Date(lastTx).toISOString()) : undefined,
      interestRate: dto?.interestRate ?? dto?.InterestRate ?? undefined,
      interestRateMonthly: dto?.interestRateMonthly ?? dto?.InterestRateMonthly ?? undefined,
      termType: this.mapTermType(dto?.termType ?? dto?.TermType),
      maturityDate: dto?.maturityDate ?? dto?.MaturityDate ?? undefined,
      minimumBalance: dto?.minimumBalance ?? dto?.MinimumBalance ?? undefined,
      dailyWithdrawalLimit: dto?.dailyWithdrawalLimit ?? dto?.DailyWithdrawalLimit ?? undefined,
      monthlyWithdrawalLimit: dto?.monthlyWithdrawalLimit ?? dto?.MonthlyWithdrawalLimit ?? undefined,
      overdraftLimit: dto?.overdraftLimit ?? dto?.OverdraftLimit ?? undefined,
      dailyDepositLimit: dto?.dailyDepositLimit ?? dto?.DailyDepositLimit ?? undefined,
      allowOverdraft: (() => {
        const raw = dto?.allowOverdraft ?? dto?.AllowOverdraft;
        if (typeof raw === 'boolean') return raw;
        const limit = dto?.overdraftLimit ?? dto?.OverdraftLimit ?? 0;
        return Number(limit) > 0;
      })(),
      createdAt: dto?.createdAt ?? dto?.CreatedAt ?? (typeof openingDate === 'string' ? openingDate : new Date(openingDate).toISOString()),
      updatedAt: dto?.updatedAt ?? dto?.UpdatedAt ?? (lastTx ? (typeof lastTx === 'string' ? lastTx : new Date(lastTx).toISOString()) : (typeof openingDate === 'string' ? openingDate : new Date(openingDate).toISOString())),
    };
  }

  private mapClientAccountTransaction(dto: any): AccountTransaction {
    const mapStatus = (v: any): AccountTransaction['status'] => {
      if (typeof v === 'number') {
        switch (v) {
          case 0: return 'PENDING' as any;
          case 1: return 'COMPLETED' as any;
          case 2: return 'CANCELLED' as any;
          case 3: return 'FAILED' as any;
          default: return 'COMPLETED' as any;
        }
      }
      const s = (v || '').toString().toUpperCase();
      if (s.includes('CANCEL')) return 'CANCELLED' as any;
      if (s.includes('FAIL')) return 'FAILED' as any;
      if (s.includes('PEND')) return 'PENDING' as any;
      if (s.includes('COMPLETE')) return 'COMPLETED' as any;
      return 'COMPLETED' as any;
    };
    const typeMap = (v: any): AccountTransaction['type'] => {
      if (typeof v === 'number') {
        switch (v) {
          case 1: return 'WITHDRAWAL';
          case 2: return 'INTEREST';
          case 3: return 'FEE';
          case 4: return 'TRANSFER';
          default: return 'DEPOSIT';
        }
      }
      const s = (v || '').toString().toLowerCase();
      if (s.includes('withdraw')) return 'WITHDRAWAL';
      if (s.includes('interest')) return 'INTEREST';
      if (s.includes('fee')) return 'FEE';
      if (s.includes('transfer')) return 'TRANSFER';
      return 'DEPOSIT';
    };

    const processedAt = dto?.processedAt ?? dto?.ProcessedAt;
    return {
      id: dto?.id ?? dto?.Id ?? '',
      accountId: dto?.accountId ?? dto?.AccountId ?? '',
      accountNumber: dto?.accountNumber ?? dto?.AccountNumber ?? '',
      type: typeMap(dto?.type ?? dto?.Type),
      amount: Number(dto?.amount ?? dto?.Amount ?? 0),
      currency: this.mapCurrency(dto?.currency ?? dto?.Currency),
      balanceBefore: Number(dto?.balanceBefore ?? dto?.BalanceBefore ?? 0),
      balanceAfter: Number(dto?.balanceAfter ?? dto?.BalanceAfter ?? 0),
      description: dto?.description ?? dto?.Description ?? '',
      processedBy: dto?.processedBy ?? dto?.ProcessedBy ?? '',
      processedByName: dto?.processedByName ?? dto?.ProcessedByName ?? dto?.processedBy ?? dto?.ProcessedBy ?? '',
      processedAt: typeof processedAt === 'string' ? processedAt : new Date(processedAt || Date.now()).toISOString(),
      reference: dto?.reference ?? dto?.Reference ?? undefined,
      receiptNumber: dto?.receiptNumber ?? dto?.ReceiptNumber ?? undefined,
      status: mapStatus(dto?.status ?? dto?.Status),
      branchId: dto?.branchId ?? dto?.BranchId ?? undefined,
      branchName: dto?.branchName ?? dto?.BranchName ?? undefined,
      branch: dto?.branchName ?? dto?.BranchName ?? dto?.branch ?? dto?.Branch ?? undefined
    };
  }

  // Helper: map frontend EmployeeFunction to backend EmployeePosition string
  private mapFunctionToPosition(func?: number): string | undefined {
    if (func === undefined || func === null) return undefined;
    switch (func) {
      case 0: // Cashier
        return 'Cashier';
      case 1: // CreditAgent
        return 'LoanOfficer';
      case 2: // BranchSupervisor
        return 'AssistantManager';
      case 3: // RegionalManager
        return 'Manager';
      case 4: // SystemAdmin
        return 'ITSupport';
      case 5: // Accounting
        return 'Accountant';
      case 6: // Management
        return 'Manager';
      case 7: // SuperAdmin
        return 'Manager';
      case 8: // Security
        return 'Security';
      case 9: // Maintenance
        return 'Cleaner';
      case 10: // CustomerService
        return 'CustomerService';
      default:
        return undefined;
    }
  }

  // Helper: map backend EmployeePosition string to frontend EmployeeFunction enum value
  private mapPositionToFunction(position?: string): number {
    switch (position) {
      case 'Cashier':
        return 0; // EmployeeFunction.Cashier
      case 'LoanOfficer':
        return 1; // CreditAgent
      case 'AssistantManager':
      case 'Supervisor':
        return 2; // BranchSupervisor
      case 'Manager':
        return 6; // Management
      case 'RegionalManager':
        return 3; // RegionalManager
      case 'ITSupport':
        return 4; // SystemAdmin
      case 'Accountant':
        return 5; // Accounting
      case 'Security':
        return 8; // Security
      case 'Cleaner':
      case 'Driver':
        return 9; // Maintenance
      case 'CustomerService':
        return 10; // CustomerService
      default:
        return 6; // default to Management
    }
  }

  // Helper: map backend EmployeeStatus string to frontend EmployeeStatus enum value
  private mapStatusToFrontend(status?: string): number {
    switch (status) {
      case 'Active':
        return 0; // EmployeeStatus.Active
      case 'Inactive':
        return 1; // Inactive
      case 'Suspended':
      case 'OnLeave':
        return 2; // Suspended
      case 'Terminated':
        return 3; // Terminated
      default:
        return 1; // Inactive as fallback
    }
  }

  // Helper: convert backend EmployeeDto to frontend Employee
  private mapEmployeeDto(dto: any): Employee {
    const functionEnum = this.mapPositionToFunction(dto?.positionName || dto?.position);
    const statusEnum = this.mapStatusToFrontend(dto?.statusName || dto?.status);
    return {
      id: dto.id,
      employeeNumber: dto.employeeCode,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      nationalId: dto.nationalId,
      dateOfBirth: '',
      hireDate: dto.hireDate,
      terminationDate: dto.terminationDate || undefined,
      function: functionEnum as any,
      functionName: dto.positionName || '',
      status: statusEnum as any,
      statusName: dto.statusName || '',
      branchId: (dto.branchId ?? '').toString(),
      branchName: dto.branchName || '',
      baseSalary: dto.baseSalary ?? 0,
      currency: (dto.currency || 'HTG') as 'HTG' | 'USD',
      bankAccountNumber: dto.bankAccount || '',
      bankName: dto.bankName || '',
      address: dto.address || '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      isActive: statusEnum === 0,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      createdBy: dto.createdBy || '',
      updatedBy: dto.updatedBy || '',
    };
  }

  // =============================================================================
  // SAVINGS ACCOUNT SYSTEM METHODS
  // =============================================================================

  // Savings Customer Management
  async getSavingsCustomers(searchTerm?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (searchTerm) params.append('searchTerm', searchTerm);
    const response = await this.api.get(`/SavingsCustomer/search?${params}`);
    return response.data;
  }

  async getSavingsCustomer(id: string): Promise<any> {
    const response = await this.api.get(`/SavingsCustomer/${id}`);
    return response.data;
  }

  async getSavingsCustomerByPhone(phone: string): Promise<any> {
    const response = await this.api.get(`/SavingsCustomer/by-phone/${phone}`);
    return response.data;
  }

  async getSavingsCustomerByDocument(documentType: number, documentNumber: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('documentType', documentType.toString());
    params.append('documentNumber', documentNumber);
    const response = await this.api.get(`/SavingsCustomer/by-document?${params}`);
    return response.data;
  }

  async createSavingsCustomer(customerData: any): Promise<any> {
    const response = await this.api.post('/SavingsCustomer', customerData);
    return response.data;
  }

  async updateSavingsCustomer(id: string, customerData: any): Promise<any> {
    const response = await this.api.put(`/SavingsCustomer/${id}`, customerData);
    return response.data;
  }

  async deactivateSavingsCustomer(id: string): Promise<void> {
    await this.api.post(`/SavingsCustomer/${id}/deactivate`);
  }

  async validateSavingsCustomer(id: string): Promise<any> {
    const response = await this.api.post(`/SavingsCustomer/${id}/validate`);
    return response.data;
  }

  // Savings Account Management
  async getSavingsAccounts(filters?: any): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.branchId) params.append('branchId', filters.branchId.toString());
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.currency !== undefined) params.append('currency', filters.currency.toString());
    if (filters?.status !== undefined) params.append('status', filters.status.toString());
    if (filters?.accountNumber) params.append('accountNumber', filters.accountNumber);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());

    const response = await this.api.get(`/SavingsAccount?${params}`);
    return response.data.accounts || response.data;
  }

  async getSavingsAccount(id: string): Promise<any> {
    const response = await this.api.get(`/SavingsAccount/${id}`);
    return response.data;
  }

  async getSavingsAccountByNumber(accountNumber: string): Promise<any> {
    const response = await this.api.get(`/SavingsAccount/by-number/${accountNumber}`);
    return response.data;
  }

  async openSavingsAccount(accountData: any): Promise<any> {
    // Sanitize PhotoUrl fields to respect backend validation (max length 500, no base64 data URLs)
    const sanitizePhotoUrl = (val: any): string | undefined => {
      if (!val || typeof val !== 'string') return undefined;
      const trimmed = val.trim();
      if (!trimmed) return undefined;
      // Reject base64/data URLs and overly long strings
      if (trimmed.startsWith('data:')) return undefined;
      if (trimmed.length > 500) return undefined;
      return trimmed;
    };

    const sanitizePayload = (payload: any): any => {
      if (!payload || typeof payload !== 'object') return payload;

      // Authorized signers
      if (Array.isArray(payload.AuthorizedSigners)) {
        payload.AuthorizedSigners = payload.AuthorizedSigners.map((s: any) => {
          const copy = { ...s };
          const p = sanitizePhotoUrl(copy.PhotoUrl);
          if (!p) delete copy.PhotoUrl; else copy.PhotoUrl = p;
          return copy;
        });
      }

      // Customer object (when creating client + account in one go)
      if (payload.Customer && typeof payload.Customer === 'object') {
        const p = sanitizePhotoUrl(payload.Customer.PhotoUrl);
        if (!p) delete payload.Customer.PhotoUrl; else payload.Customer.PhotoUrl = p;
      }

      // Any top-level PhotoUrl (just in case)
      if ('PhotoUrl' in payload) {
        const p = sanitizePhotoUrl(payload.PhotoUrl);
        if (!p) delete payload.PhotoUrl; else payload.PhotoUrl = p;
      }

      return payload;
    };

    const safePayload = sanitizePayload({ ...accountData });
    const response = await this.api.post('/SavingsAccount/open', safePayload);
    return response.data;
  }

  async updateSavingsAccount(id: string, accountData: any): Promise<any> {
    const response = await this.api.put(`/SavingsAccount/${id}`, accountData);
    return response.data;
  }

  async closeSavingsAccount(id: string, reason: string): Promise<void> {
    await this.api.post(`/SavingsAccount/${id}/close`, { reason });
  }

  async getSavingsAccountBalance(accountNumber: string): Promise<any> {
    const response = await this.api.get(`/SavingsAccount/${accountNumber}/balance`);
    return response.data;
  }

  async generateSavingsAccountStatement(accountId: string, request: any): Promise<any> {
    const response = await this.api.post(`/SavingsAccount/${accountId}/statement`, request);
    return response.data;
  }

  async calculateSavingsAccountInterest(accountId: string): Promise<void> {
    await this.api.post(`/SavingsAccount/${accountId}/calculate-interest`);
  }

  async calculateAllSavingsInterest(): Promise<any> {
    const response = await this.api.post('/SavingsAccount/calculate-interest-all');
    return response.data;
  }

  async getSavingsAccountTransactions(accountId: string, filters?: any): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.type !== undefined) params.append('type', filters.type.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());

    const response = await this.api.get(`/SavingsAccount/${accountId}/transactions?${params}`);
    const payload = response.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.transactions)) return payload.transactions;
    if (Array.isArray(payload?.Transactions)) return payload.Transactions;
    return Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.Items)
        ? payload.Items
        : [];
  }

  async getSavingsAccountStatistics(): Promise<any> {
    const response = await this.api.get('/SavingsAccount/statistics');
    return response.data;
  }

  // Savings Transaction Management
  async processSavingsTransaction(transactionData: any): Promise<any> {
    const response = await this.api.post('/SavingsTransaction/process', transactionData);
    return response.data;
  }

  async processSavingsTransfer(transferData: any): Promise<any> {
    const response = await this.api.post('/SavingsTransaction/transfer', transferData);
    return response.data;
  }

  async getSavingsTransaction(id: string): Promise<any> {
    const response = await this.api.get(`/SavingsTransaction/${id}`);
    return response.data;
  }

  async getSavingsTransactions(filters?: any): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.accountId) params.append('accountId', filters.accountId);
    if (filters?.branchId) params.append('branchId', filters.branchId.toString());
    if (filters?.type !== undefined) params.append('type', filters.type.toString());
    if (filters?.status !== undefined) params.append('status', filters.status.toString());
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());

    const response = await this.api.get(`/SavingsTransaction?${params}`);
    return response.data.transactions || response.data;
  }

  async generateSavingsTransactionReceipt(id: string): Promise<any> {
    const response = await this.api.get(`/SavingsTransaction/${id}/receipt`);
    return response.data;
  }

  async cancelSavingsTransaction(id: string, reason: string): Promise<void> {
    await this.api.post(`/SavingsTransaction/${id}/cancel`, { reason });
  }

  async getSavingsDailyTransactionTotal(accountId: string, type: number, date?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('accountId', accountId);
    params.append('type', type.toString());
    if (date) params.append('date', date);

    const response = await this.api.get(`/SavingsTransaction/daily-total?${params}`);
    return response.data;
  }

  async getSavingsMonthlyTransactionTotal(accountId: string, type: number, date?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('accountId', accountId);
    params.append('type', type.toString());
    if (date) params.append('date', date);

    const response = await this.api.get(`/SavingsTransaction/monthly-total?${params}`);
    return response.data;
  }

  async validateSavingsTransaction(transactionData: any): Promise<any> {
    const response = await this.api.post('/SavingsTransaction/validate', transactionData);
    return response.data;
  }

  async getSavingsTransactionStatistics(filters?: any): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.branchId) params.append('branchId', filters.branchId.toString());
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);

    const response = await this.api.get(`/SavingsTransaction/statistics?${params}`);
    return response.data;
  }

  async getSavingsTransactionReport(filters?: any): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.branchId) params.append('branchId', filters.branchId.toString());

    const response = await this.api.get(`/SavingsTransaction/report?${params}`);
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;

// Re-export dashboard interfaces for component usage
export type { CashierDashboard, CreditAgentDashboard, BranchSupervisorDashboard, SuperAdminDashboard, Transaction, PendingAccount };