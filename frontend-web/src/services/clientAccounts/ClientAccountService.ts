import { BaseApiService } from '../base/BaseApiService';
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
  TermSavingsType,
  AccountLimits,
  AuthorizedSignerInfo
} from '../../types/clientAccounts';

export class ClientAccountService extends BaseApiService {
  async getClientAccounts(filters?: AccountSearchFilters): Promise<ClientAccount[]> {
    try {
      // When no account type filter is applied, fetch from all endpoints to get all account types
      if (!filters?.accountType) {
        const allAccounts: ClientAccount[] = [];

        // Fetch current accounts
        try {
          const currentParams = new URLSearchParams();
          if (filters?.currency) currentParams.append('currency', filters.currency);
          if (filters?.branchId) currentParams.append('branchId', filters.branchId.toString());
          if (filters?.status) {
            const st = filters.status === 'INACTIVE'
              ? 'Inactive'
              : filters.status === 'CLOSED'
                ? 'Closed'
                : filters.status === 'SUSPENDED'
                  ? 'Suspended'
                  : 'Active';
            currentParams.append('status', st);
          }
          if (filters?.dateFrom) currentParams.append('dateFrom', filters.dateFrom);
          if (filters?.dateTo) currentParams.append('dateTo', filters.dateTo);
          if (filters?.minBalance !== undefined) currentParams.append('minBalance', String(filters.minBalance));
          if (filters?.maxBalance !== undefined) currentParams.append('maxBalance', String(filters.maxBalance));

          const currentResponse = await this.get<any>(`/CurrentAccount?${currentParams}`);
          const currentData = currentResponse;
          const currentRawList: any[] = Array.isArray(currentData)
            ? currentData
            : (currentData?.Accounts || currentData?.accounts || []);
          allAccounts.push(...(currentRawList || []).map((dto: any) => this.mapClientAccountSummary(dto)));
        } catch (error) {
          console.warn('Failed to fetch current accounts:', error);
        }

        // Fetch savings and term savings accounts
        try {
          const savingsParams = new URLSearchParams();
          if (filters?.currency) savingsParams.append('currency', filters.currency);
          if (filters?.customerName) savingsParams.append('customerName', filters.customerName);
          if (filters?.accountNumber) savingsParams.append('accountNumber', filters.accountNumber);
          if (filters?.branchId) savingsParams.append('branchId', filters.branchId.toString());
          if (filters?.status) {
            const st = filters.status === 'INACTIVE'
              ? 'Inactive'
              : filters.status === 'CLOSED'
                ? 'Closed'
                : filters.status === 'SUSPENDED'
                  ? 'Suspended'
                  : 'Active';
            savingsParams.append('status', st);
          }
          if (filters?.dateFrom) savingsParams.append('dateFrom', filters.dateFrom);
          if (filters?.dateTo) savingsParams.append('dateTo', filters.dateTo);

          const savingsResponse = await this.get<any>(`/ClientAccount?${savingsParams}`);
          const savingsData = savingsResponse;
          const savingsRawList: any[] = Array.isArray(savingsData)
            ? savingsData
            : (savingsData?.Accounts || savingsData?.accounts || []);
          allAccounts.push(...(savingsRawList || []).map((dto: any) => this.mapClientAccountSummary(dto)));
        } catch (error) {
          console.warn('Failed to fetch savings/term savings accounts:', error);
        }

        return allAccounts;
      }

      // Route to specialized endpoints when possible to avoid backend aggregator issues
      const params = new URLSearchParams();
      const isCurrent = filters?.accountType === AccountType.CURRENT;

      if (isCurrent) {
        // Dedicated CurrentAccount controller expects CurrentAccountFilterDto
        // Map generic filters → CurrentAccountFilterDto
        const searchVal = filters?.customerName || filters?.accountNumber || '';
        if (searchVal) params.append('search', searchVal);
        if (filters?.currency) params.append('currency', filters.currency);
        if (filters?.branchId) params.append('branchId', filters.branchId.toString());
        if (filters?.status) {
          const st = filters.status === 'INACTIVE'
            ? 'Inactive'
            : filters.status === 'CLOSED'
              ? 'Closed'
              : filters.status === 'SUSPENDED'
                ? 'Suspended'
                : 'Active';
          params.append('status', st);
        }
        if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters?.dateTo) params.append('dateTo', filters.dateTo);
        if (filters?.minBalance !== undefined) params.append('minBalance', String(filters.minBalance));
        if (filters?.maxBalance !== undefined) params.append('maxBalance', String(filters.maxBalance));

  const response = await this.get<any>(`/CurrentAccount?${params}`);
        const data = response;
        const rawList: any[] = Array.isArray(data)
          ? data
          : (data?.Accounts || data?.accounts || []);
        return (rawList || []).map((dto: any) => this.mapClientAccountSummary(dto));
      } else {
        // Fallback to unified ClientAccount aggregator (Savings/Term)
        if (filters.accountType) {
          const at = filters.accountType === AccountType.TERM_SAVINGS ? 'TermSavings' : 'Savings';
          params.append('accountType', at);
        }
        if (filters?.currency) params.append('currency', filters.currency);
        if (filters?.customerName) params.append('customerName', filters.customerName);
        if (filters?.accountNumber) params.append('accountNumber', filters.accountNumber);
        if (filters?.branchId) params.append('branchId', filters.branchId.toString());
        if (filters?.status) {
          const st = filters.status === 'INACTIVE'
            ? 'Inactive'
            : filters.status === 'CLOSED'
              ? 'Closed'
              : filters.status === 'SUSPENDED'
                ? 'Suspended'
                : 'Active';
          params.append('status', st);
        }
        if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters?.dateTo) params.append('dateTo', filters.dateTo);

  const response = await this.get<any>(`/ClientAccount?${params}`);
        const data = response;
        const rawList: any[] = Array.isArray(data)
          ? data
          : (data?.Accounts || data?.accounts || []);
        return (rawList || []).map((dto: any) => this.mapClientAccountSummary(dto));
      }
    } catch (error) {
      console.error('Error fetching client accounts:', error);
      throw error;
    }
  }

  async getClientAccountStats(branchId?: number): Promise<ClientAccountStats> {
    try {
      const url = branchId !== undefined && branchId !== null
        ? `/ClientAccount/statistics?branchId=${encodeURIComponent(String(branchId))}`
        : '/ClientAccount/statistics';
      const response = await this.get<any>(url);
      const stats = response || {};
      // Map backend dictionaries to frontend expectations
      const mapTypeKey = (k: string): AccountType => {
        switch ((k || '').toString().toLowerCase()) {
          case 'savings':
            return AccountType.SAVINGS;
          case 'current':
            return AccountType.CURRENT;
          case 'termsavings':
          case 'term_savings':
          case 'term-savings':
            return AccountType.TERM_SAVINGS;
          default:
            return AccountType.SAVINGS;
        }
      };

      const accountsByTypeSrc = stats.accountsByType || stats.AccountsByType || {};
      const accountsByType: Record<AccountType, number> = {
        [AccountType.SAVINGS]: 0,
        [AccountType.CURRENT]: 0,
        [AccountType.TERM_SAVINGS]: 0,
      };
      Object.keys(accountsByTypeSrc || {}).forEach((k) => {
        const key = mapTypeKey(k);
        accountsByType[key] = Number(accountsByTypeSrc[k] ?? 0);
      });

      const accountsByCurrencySrc = stats.accountsByCurrency || stats.AccountsByCurrency || {};
      const accountsByCurrency: Record<'HTG' | 'USD', number> = { HTG: 0, USD: 0 };
      Object.keys(accountsByCurrencySrc || {}).forEach((k) => {
        const key = (k || '').toString().toUpperCase() === 'USD' ? 'USD' : 'HTG';
        accountsByCurrency[key] = Number(accountsByCurrencySrc[k] ?? 0);
      });

      return {
        totalAccounts: Number(stats.totalAccounts ?? stats.TotalAccounts ?? 0),
        activeAccounts: Number(stats.activeAccounts ?? stats.ActiveAccounts ?? 0),
        totalBalanceHTG: Number(stats.totalBalanceHTG ?? stats.TotalBalanceHTG ?? 0),
        totalBalanceUSD: Number(stats.totalBalanceUSD ?? stats.TotalBalanceUSD ?? 0),
        accountsByType,
        accountsByCurrency,
        recentTransactions: Number(stats.recentTransactions ?? stats.RecentTransactions ?? 0),
        dormantAccounts: Number(stats.dormantAccounts ?? stats.DormantAccounts ?? 0),
      };
    } catch (error) {
      console.error('Error fetching client account stats:', error);
      throw error;
    }
  }

  // Current Account: fetch live balance/status for an account number
  async getCurrentAccountBalance(accountNumber: string): Promise<{ balance: number; availableBalance: number; currency: 'HTG' | 'USD'; status?: string; }> {
    try {
      const acc = encodeURIComponent(accountNumber);
      const response = await this.get<any>(`/CurrentAccount/${acc}/balance`);
      const d = response || {};
      const currencyRaw = d?.currency ?? d?.Currency;
      const currency: 'HTG' | 'USD' = (currencyRaw === 1 || currencyRaw === 'USD') ? 'USD' : 'HTG';
      return {
        balance: Number(d?.balance ?? d?.Balance ?? d?.currentBalance ?? 0),
        availableBalance: Number(d?.availableBalance ?? d?.AvailableBalance ?? d?.balance ?? 0),
        currency,
        status: d?.status ?? d?.Status
      };
    } catch (error) {
      console.error('Error fetching current account balance:', error);
      throw error;
    }
  }

  async getAccountTransactions(accountNumber: string): Promise<AccountTransaction[]> {
    try {
      const response = await this.get<any>(`/ClientAccount/${encodeURIComponent(accountNumber)}/transactions`);
      const raw = response;
      const list: any[] = Array.isArray(raw) ? raw : (raw?.Transactions || raw?.transactions || []);
      return (list || []).map((t) => this.mapClientAccountTransaction(t));
    } catch (error) {
      console.error('Error fetching account transactions:', error);
      throw error;
    }
  }

  // Cancel a transaction for client accounts (savings/current/term) – server should validate permissions/domain
  async cancelCurrentAccountTransaction(id: string | number, reason: string): Promise<void> {
    try {
      const txnId = encodeURIComponent(String(id));
      await this.post(`/CurrentAccount/transactions/${txnId}/cancel`, { reason });
    } catch (error) {
      console.error('Error cancelling current account transaction:', error);
      throw error;
    }
  }

  // Current Account Transaction Management
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
    try {
      const payload = {
        accountNumber: data.accountNumber,
        type: data.type === 'DEPOSIT' ? 0 : 1, // SavingsTransactionType enum (0=Deposit,1=Withdrawal)
        amount: data.amount,
        currency: data.currency === 'HTG' ? 0 : 1, // ClientCurrency enum (0=HTG,1=USD)
        description: data.description || undefined,
        clientPresent: data.clientPresent,
        verificationMethod: data.verificationMethod,
        notes: data.notes
      };
      const url = `/CurrentAccount/${encodeURIComponent(data.accountNumber)}/transactions`;
      const response = await this.post(url, payload);
      return response;
    } catch (error) {
      console.error('Error processing current account transaction:', error);
      throw error;
    }
  }

  async processCurrentAccountTransfer(data: {
    sourceAccountNumber?: string;
    destinationAccountNumber: string;
    currency: 'HTG' | 'USD';
    amount: number;
    description?: string;
    clientPresent?: boolean;
    verificationMethod?: string;
    notes?: string;
  }): Promise<any> {
    try {
      const payload = {
        sourceAccountNumber: data.sourceAccountNumber || undefined,
        destinationAccountNumber: data.destinationAccountNumber,
        amount: data.amount,
        currency: data.currency === 'HTG' ? 0 : 1,
        description: data.description || undefined,
        customerPresent: data.clientPresent,
        verificationMethod: data.verificationMethod,
        notes: data.notes
      };

      const account = encodeURIComponent(String(data.sourceAccountNumber || data.destinationAccountNumber));
      const url = `/CurrentAccount/${account}/transfer`;
      const response = await this.post(url, payload);
      return response;
    } catch (error) {
      console.error('Error processing current account transfer:', error);
      throw error;
    }
  }

  async createSavingsAccount(data: CreateSavingsAccountRequest): Promise<ClientAccount> {
    try {
      const payload = {
        accountType: 0, // Savings
        customerId: data.customerId,
        currency: data.currency === 'HTG' ? 0 : 1,
        initialDeposit: data.initialDeposit,
        branchId: data.branchId,
        interestRate: data.interestRate,
        minimumBalance: data.minimumBalance,
        dailyWithdrawalLimit: data.dailyWithdrawalLimit
      };
      const response = await this.post('/ClientAccount/create', payload);
      return this.mapClientAccountSummary(response);
    } catch (error) {
      console.error('Error creating savings account:', error);
      throw error;
    }
  }

  async createCurrentAccount(data: CreateCurrentAccountRequest): Promise<ClientAccount> {
    try {
      // Map to dedicated CurrentAccount opening endpoint with extended fields
      const payload: any = {
        // Required linkage to existing SavingsCustomer
        customerId: data.customerId,
        currency: data.currency === 'HTG' ? 0 : 1,
        initialDeposit: data.initialDeposit,
        branchId: data.branchId,
        minimumBalance: data.minimumBalance,
        dailyWithdrawalLimit: data.dailyWithdrawalLimit,
        monthlyWithdrawalLimit: data.monthlyWithdrawalLimit,
        dailyDepositLimit: data.dailyDepositLimit,
        overdraftLimit: data.overdraftLimit,
        // Security/KYC
        pin: data.pin,
        securityQuestion: data.securityQuestion,
        securityAnswer: data.securityAnswer,
        depositMethod: data.depositMethod,
        originOfFunds: data.originOfFunds,
        transactionFrequency: data.transactionFrequency,
        accountPurpose: data.accountPurpose,
        authorizedSigners: (data.authorizedSigners || []).map(s => ({
          fullName: s.fullName,
          role: s.role,
          documentNumber: s.documentNumber,
          phone: s.phone
        }))
      };
      const response = await this.post('/CurrentAccount/open', payload);
      return this.mapClientAccountSummary(response);
    } catch (error) {
      console.error('Error creating current account:', error);
      throw error;
    }
  }

  /**
   * Update a current account's editable fields.
   * Backend expected: PUT /CurrentAccount/{accountId}
   */
  async updateCurrentAccount(accountId: string, data: any): Promise<ClientAccount> {
    try {
      const response = await this.put(`/CurrentAccount/${encodeURIComponent(accountId)}`, data);
      return this.mapClientAccountSummary(response);
    } catch (error) {
      console.error('Error updating current account:', error);
      throw error;
    }
  }

  async createTermSavingsAccount(data: CreateTermSavingsAccountRequest): Promise<ClientAccount> {
    let payload: any = undefined;
    try {
      const termTypeMap: Record<TermSavingsType, number> = {
        [TermSavingsType.THREE_MONTHS]: 0,
        [TermSavingsType.SIX_MONTHS]: 1,
        [TermSavingsType.TWELVE_MONTHS]: 2,
        [TermSavingsType.TWENTY_FOUR_MONTHS]: 3
      };
      const monthlyRate = data.interestRate; // treat incoming as monthly fraction going forward (optional)
      payload = {
        accountType: 2, // Term Savings
        customerId: data.customerId,
        currency: data.currency === 'HTG' ? 0 : 1,
        initialDeposit: data.initialDeposit,
        branchId: data.branchId,
        termType: termTypeMap[data.termType]
      };
      // Only include rates if provided; otherwise let backend apply defaults
      if (typeof monthlyRate === 'number') {
        const annualRate = Number((monthlyRate * 12).toFixed(6));
        // Send annual interestRate for backward compatibility and include monthly
        payload.interestRate = annualRate;
        payload.interestRateMonthly = monthlyRate;
      }
      const response = await this.post('/ClientAccount/create', payload);
      return this.mapClientAccountSummary(response);
    } catch (error) {
      // Log payload and server response to aid debugging of 400/validation errors
      try {
        // eslint-disable-next-line no-console
        console.error('Error creating term savings account:', error, { payload, serverResponse: (error as any)?.response?.data });
      } catch (logErr) {
        // ignore logging error
      }
      throw error;
    }
  }

  /**
   * Renew a term savings account at maturity.
   * Backend endpoint expected: POST /ClientAccount/{accountId}/renew
   * Payload (optional): { termType?: number, autoRenew?: boolean, interestRate?: number }
   */
  async renewTermSavingsAccount(accountId: string, data?: { renewalTermType?: TermSavingsType; autoRenew?: boolean; interestRate?: number }): Promise<ClientAccount> {
    try {
      const payload: any = {};
      if (data?.renewalTermType !== undefined) payload.termType = data.renewalTermType;
      if (data?.autoRenew !== undefined) payload.autoRenew = data.autoRenew;
      if (data?.interestRate !== undefined) payload.interestRate = data.interestRate;
      const response = await this.post(`/TermSavingsAccount/${accountId}/renew`, payload);
      return this.mapClientAccountSummary(response);
    } catch (error) {
      console.error('Error renewing term account:', error);
      throw error;
    }
  }

  /**
   * Update account status. Tries multiple URL patterns when backend uses account number vs internal id.
   * @param accountId - primary identifier (often internal id or GUID)
   * @param isActive - desired active state
   * @param accountNumber - optional human-friendly account number (used as fallback)
   */
  async updateAccountStatus(accountId: string | number, isActive: boolean, accountNumber?: string): Promise<void> {
    const tried: string[] = [];
    const attempt = async (url: string) => {
      tried.push(url);
      return this.patch(url, { isActive });
    };

    // Try by the provided accountId first (encoded)
    const idSegment = encodeURIComponent(String(accountId));
    try {
      await attempt(`/ClientAccount/${idSegment}/status`);
      return;
    } catch (error: any) {
      // If 404, continue to fallbacks; otherwise rethrow
      if (error?.response?.status !== 404) {
        console.error('Error updating account status:', error);
        throw error;
      }
      // Log diagnostic info for 404 responses
      try {
        // eslint-disable-next-line no-console
        console.warn('Status update attempt failed (by id):', {
          url: `/ClientAccount/${idSegment}/status`,
          status: error?.response?.status,
          data: error?.response?.data,
        });
      } catch (logErr) {}
    }

    // If we have an account number, try ClientAccount/{accountNumber}/status then CurrentAccount/{accountNumber}/status
    if (accountNumber) {
      const accNum = encodeURIComponent(String(accountNumber));
      try {
        await attempt(`/ClientAccount/${accNum}/status`);
        return;
      } catch (error: any) {
        if (error?.response?.status !== 404) {
          console.error('Error updating account status (by accountNumber):', error);
          throw error;
        }
        try {
          console.warn('Status update attempt failed (by accountNumber):', {
            url: `/ClientAccount/${accNum}/status`,
            status: error?.response?.status,
            data: error?.response?.data,
          });
        } catch (logErr) {}
      }

      try {
        await attempt(`/CurrentAccount/${accNum}/status`);
        return;
      } catch (error: any) {
        if (error?.response?.status !== 404) {
          console.error('Error updating account status (CurrentAccount):', error);
          throw error;
        }
        try {
          console.warn('Status update attempt failed (CurrentAccount):', {
            url: `/CurrentAccount/${accNum}/status`,
            status: error?.response?.status,
            data: error?.response?.data,
          });
        } catch (logErr) {}
      }
    }

    const err = new Error(`Account status endpoint not found. Tried: ${tried.join(', ')}`);
    // eslint-disable-next-line no-console
    console.error('Error updating account status:', err);
    throw err;
  }

  /**
   * Update term savings account details (interest rate, status, notes)
   * @param accountId - account identifier
   * @param data - update data containing interestRateMonthly and/or status
   */
  async updateTermSavingsAccount(accountId: string, data: { interestRateMonthly?: number; status?: string }): Promise<ClientAccount> {
    try {
      const payload: any = {};
      if (data.interestRateMonthly !== undefined) payload.interestRateMonthly = data.interestRateMonthly;
      if (data.status !== undefined) payload.status = data.status;
      
      const response = await this.put(`/TermSavingsAccount/${accountId}`, payload);
      return this.mapClientAccountSummary(response);
    } catch (error) {
      console.error('Error updating term savings account:', error);
      throw error;
    }
  }

  async getTermSavingsAccounts(filters?: {
    currency?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (filters?.currency) params.append('currency', filters.currency);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);
      params.append('page', String(filters?.page || 1));
      params.append('pageSize', String(filters?.pageSize || 1000));

      const response = await this.get(`/TermSavingsAccount?${params}`);
      return response;
    } catch (error) {
      console.error('Error fetching term savings accounts:', error);
      throw error;
    }
  }

  async closeTermSavingsAccount(accountId: string, reason: string, earlyWithdrawalPenaltyPercent?: number): Promise<void> {
    try {
      const payload: any = {
        reason: reason,
        earlyWithdrawalPenaltyPercent: earlyWithdrawalPenaltyPercent ?? null
      };
      console.log('🔥 Closing account payload:', payload);
      await this.post(`/TermSavingsAccount/${accountId}/close`, payload);
    } catch (error) {
      console.error('Error closing term savings account:', error);
      throw error;
    }
  }

  /**
   * Close a client account (Current or Savings wrapper) if backend exposes /ClientAccount/{id}/close
   */
  async closeClientAccount(accountId: string, reason: string): Promise<void> {
    try {
      const payload = { reason };
      await this.post(`/ClientAccount/${accountId}/close`, payload);
    } catch (error) {
      console.error('Error closing client account:', error);
      throw error;
    }
  }

  async deleteTermSavingsAccount(accountId: string): Promise<void> {
    try {
      await this.delete(`/TermSavingsAccount/${accountId}`);
    } catch (error) {
      console.error('Error deleting term savings account:', error);
      throw error;
    }
  }

  /**
   * Toggle term savings account status (ACTIVE <-> SUSPENDED/INACTIVE)
   * Backend endpoint expected: PUT /TermSavingsAccount/{accountId}/toggle-status
   */
  async toggleTermSavingsAccountStatus(accountId: string): Promise<void> {
    try {
      await this.put(`/TermSavingsAccount/${accountId}/toggle-status`);
    } catch (error) {
      console.error('Error toggling term savings account status:', error);
      throw error;
    }
  }

  async getAccountDetails(accountId: string | number): Promise<ClientAccount> {
    const id = encodeURIComponent(String(accountId));
    let summary: any = null;
    let base: ClientAccount | null = null;

    try {
      summary = await this.get<any>(`/ClientAccount/${id}`);
      base = this.mapClientAccountSummary(summary);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status && status !== 404) {
        console.error('Error fetching account summary:', error);
        throw error;
      }
    }

    if (base) {
      return this.enrichAccountDetails(base, id, summary);
    }

    const strategies: Array<() => Promise<ClientAccount>> = [
      async () => {
        const detail = await this.get<any>(`/SavingsAccount/${id}`);
        const detailSummary = this.mapClientAccountSummary(detail);
        return this.mergeSavingsAccountDetails(detailSummary, detail);
      },
      async () => {
        const detail = await this.get<any>(`/CurrentAccount/${id}`);
        const detailSummary = this.mapClientAccountSummary(detail);
        return this.mergeCurrentAccountDetails(detailSummary, detail);
      },
      async () => {
        const detail = await this.get<any>(`/TermSavingsAccount/${id}`);
        const detailSummary = this.mapClientAccountSummary(detail);
        return this.mergeTermSavingsAccountDetails(detailSummary, detail);
      }
    ];

    for (const load of strategies) {
      try {
        return await load();
      } catch (error: any) {
        const status = error?.response?.status;
        if (status && status !== 404) {
          console.warn('Account detail strategy failed:', error);
        }
      }
    }

    throw new Error('Compte introuvable');
  }

  private async enrichAccountDetails(base: ClientAccount, id: string, summary: any): Promise<ClientAccount> {
    let enriched = this.mergeCommonAccountDetails(base, summary);

    if (base.accountType === AccountType.SAVINGS) {
      try {
        const detail = await this.get<any>(`/SavingsAccount/${id}`);
        enriched = this.mergeSavingsAccountDetails(enriched, detail);
      } catch (error) {
        console.warn('Unable to enrich savings account with detailed data:', error);
      }
    } else if (base.accountType === AccountType.CURRENT) {
      try {
        const detail = await this.get<any>(`/CurrentAccount/${id}`);
        enriched = this.mergeCurrentAccountDetails(enriched, detail);
      } catch (error) {
        console.warn('Unable to enrich current account with detailed data:', error);
      }
    } else if (base.accountType === AccountType.TERM_SAVINGS) {
      try {
        const detail = await this.get<any>(`/TermSavingsAccount/${id}`);
        enriched = this.mergeTermSavingsAccountDetails(enriched, detail);
      } catch (error) {
        console.warn('Unable to enrich term savings account with detailed data:', error);
      }
    }

    return enriched;
  }

  /**
   * Get a term savings account by account number
   */
  async getAccountByNumber(accountNumber: string): Promise<ClientAccount> {
    try {
      const response = await this.get(`/TermSavingsAccount/by-number/${encodeURIComponent(accountNumber)}`);
      return this.mapClientAccountSummary(response);
    } catch (error) {
      console.error('Error fetching account by number:', error);
      throw error;
    }
  }

  /**
   * Process a term savings transaction (deposit or withdrawal)
   */
  async processTermSavingsTransaction(data: {
    accountNumber: string;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: number;
    currency: 'HTG' | 'USD';
    description?: string;
  }): Promise<any> {
    try {
      const payload = {
        accountNumber: data.accountNumber,
        type: data.type === 'DEPOSIT' ? 0 : 1, // 0=Deposit, 1=Withdrawal
        amount: data.amount,
        currency: data.currency === 'HTG' ? 0 : 1, // 0=HTG, 1=USD
        description: data.description || undefined
      };
      const response = await this.post('/TermSavingsAccount/transaction', payload);
      return response;
    } catch (error) {
      console.error('Error processing term savings transaction:', error);
      throw error;
    }
  }

  /**
   * Get all term savings transactions with optional filters
   */
  async getAllTermSavingsTransactions(filters?: {
    accountNumber?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    branchId?: string;
    minAmount?: string;
    maxAmount?: string;
  }): Promise<AccountTransaction[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.accountNumber) params.append('accountNumber', filters.accountNumber);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.branchId) params.append('branchId', filters.branchId);
      if (filters?.minAmount) params.append('minAmount', filters.minAmount);
      if (filters?.maxAmount) params.append('maxAmount', filters.maxAmount);

  const response = await this.get<any>(`/TermSavingsAccount/transactions?${params}`);
      const raw = response;
      const list: any[] = Array.isArray(raw) ? raw : (raw?.transactions || raw?.Transactions || []);
      return (list || []).map((t) => this.mapClientAccountTransaction(t));
    } catch (error) {
      console.error('Error fetching all term savings transactions:', error);
      throw error;
    }
  }

  private mergeCommonAccountDetails(base: ClientAccount, dto: any): ClientAccount {
    if (!dto) return base;
    const mapped = this.mapClientAccountSummary(dto);
    return this.mergeAccountData(base, mapped);
  }

  private mergeSavingsAccountDetails(base: ClientAccount, dto: any): ClientAccount {
    if (!dto) return base;
    const mapped = this.mapClientAccountSummary(dto);
    const updates: Partial<ClientAccount> = {
      accountType: AccountType.SAVINGS,
      customerName: mapped.customerName,
      customerPhone: mapped.customerPhone,
      customerCode: mapped.customerCode,
      balance: mapped.balance,
      availableBalance: mapped.availableBalance,
      blockedBalance: mapped.blockedBalance,
      minimumBalance: mapped.minimumBalance,
      dailyWithdrawalLimit: mapped.dailyWithdrawalLimit,
      monthlyWithdrawalLimit: mapped.monthlyWithdrawalLimit,
      dailyDepositLimit: mapped.dailyDepositLimit,
      withdrawalLimit: mapped.withdrawalLimit,
      interestRate: mapped.interestRate,
      interestRateMonthly: mapped.interestRateMonthly,
      lastInterestCalculation: mapped.lastInterestCalculation,
      accruedInterest: mapped.accruedInterest,
      accountLimits: mapped.accountLimits,
      authorizedSigners: mapped.authorizedSigners,
      branchId: mapped.branchId,
      branchName: mapped.branchName,
      status: mapped.status,
      closedAt: mapped.closedAt,
      closedBy: mapped.closedBy,
      closureReason: mapped.closureReason,
      notes: mapped.notes,
    };
    return this.mergeAccountData(base, updates);
  }

  private mergeTermSavingsAccountDetails(base: ClientAccount, dto: any): ClientAccount {
    if (!dto) return base;
    const mapped = this.mapClientAccountSummary(dto);
    const updates: Partial<ClientAccount> = {
      accountType: AccountType.TERM_SAVINGS,
      customerName: mapped.customerName,
      customerPhone: mapped.customerPhone,
      customerCode: mapped.customerCode,
      balance: mapped.balance,
      availableBalance: mapped.availableBalance,
      termType: mapped.termType,
      maturityDate: mapped.maturityDate,
      interestRate: mapped.interestRate,
      interestRateMonthly: mapped.interestRateMonthly,
      lastInterestCalculation: mapped.lastInterestCalculation,
      accruedInterest: mapped.accruedInterest,
      authorizedSigners: mapped.authorizedSigners,
      branchId: mapped.branchId,
      branchName: mapped.branchName,
      status: mapped.status,
      closedAt: mapped.closedAt,
      closedBy: mapped.closedBy,
      closureReason: mapped.closureReason,
      notes: mapped.notes,
    };
    return this.mergeAccountData(base, updates);
  }

  private mergeCurrentAccountDetails(base: ClientAccount, dto: any): ClientAccount {
    if (!dto) return base;
    const mapped = this.mapClientAccountSummary(dto);
    const updates: Partial<ClientAccount> = {
      accountType: AccountType.CURRENT,
      customerName: mapped.customerName,
      customerPhone: mapped.customerPhone,
      customerCode: mapped.customerCode,
      balance: mapped.balance,
      availableBalance: mapped.availableBalance,
      minimumBalance: mapped.minimumBalance,
      dailyWithdrawalLimit: mapped.dailyWithdrawalLimit,
      monthlyWithdrawalLimit: mapped.monthlyWithdrawalLimit,
      dailyDepositLimit: mapped.dailyDepositLimit,
      overdraftLimit: mapped.overdraftLimit,
      allowOverdraft: mapped.allowOverdraft,
      withdrawalLimit: mapped.withdrawalLimit,
      accountLimits: mapped.accountLimits,
      authorizedSigners: mapped.authorizedSigners,
      branchId: mapped.branchId,
      branchName: mapped.branchName,
      status: mapped.status,
      closedAt: mapped.closedAt,
      closedBy: mapped.closedBy,
      closureReason: mapped.closureReason,
      notes: mapped.notes,
    };
    return this.mergeAccountData(base, updates);
  }

  private mergeAccountData(base: ClientAccount, updates: Partial<ClientAccount>): ClientAccount {
    const result: ClientAccount = { ...base };
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (typeof value === 'string') {
        if (!value.trim()) return;
        (result as any)[key] = value;
        return;
      }
      if (Array.isArray(value)) {
        (result as any)[key] = value.slice();
        return;
      }
      if (value && typeof value === 'object') {
        (result as any)[key] = { ...(result as any)[key], ...value };
        return;
      }
      (result as any)[key] = value;
    });
    return result;
  }

  private normalizeAccountLimits(source: any): AccountLimits | undefined {
    if (!source || typeof source !== 'object') return undefined;
    const limits: AccountLimits = {
      dailyDepositLimit: this.toNumber(source.dailyDepositLimit ?? source.DailyDepositLimit),
      dailyWithdrawalLimit: this.toNumber(source.dailyWithdrawalLimit ?? source.DailyWithdrawalLimit),
      monthlyWithdrawalLimit: this.toNumber(source.monthlyWithdrawalLimit ?? source.MonthlyWithdrawalLimit),
      maxBalance: this.toNumber(source.maxBalance ?? source.MaxBalance),
      minWithdrawalAmount: this.toNumber(source.minWithdrawalAmount ?? source.MinWithdrawalAmount),
      maxWithdrawalAmount: this.toNumber(source.maxWithdrawalAmount ?? source.MaxWithdrawalAmount),
    };
    return Object.values(limits).some((val) => val !== undefined) ? limits : undefined;
  }

  private mapAuthorizedSigners(source: any): AuthorizedSignerInfo[] {
    if (!Array.isArray(source)) return [];
    return source
      .map((s: any) => {
        const docTypeRaw = s?.documentType ?? s?.DocumentType;
        const docType = typeof docTypeRaw === 'number' ? docTypeRaw : this.toNumber(docTypeRaw);
        const limit = this.toNumber(s?.authorizationLimit ?? s?.AuthorizationLimit);
        const fullName = s?.fullName ?? s?.FullName ?? '';
        if (!fullName || !String(fullName).trim().length) {
          return null;
        }
        return {
          id: s?.id ?? s?.Id ?? undefined,
          fullName: String(fullName),
          role: s?.role ?? s?.Role ?? undefined,
          documentType: docType !== undefined ? Number(docType) : undefined,
          documentNumber: s?.documentNumber ?? s?.DocumentNumber ?? undefined,
          phoneNumber: s?.phoneNumber ?? s?.phone ?? s?.Phone ?? undefined,
          relationshipToCustomer: s?.relationshipToCustomer ?? s?.RelationshipToCustomer ?? undefined,
          address: s?.address ?? s?.Address ?? undefined,
          authorizationLimit: limit,
          photoUrl: s?.photoUrl ?? s?.PhotoUrl ?? undefined,
          signature: s?.signature ?? s?.Signature ?? undefined,
          isActive: typeof s?.isActive === 'boolean' ? s.isActive : (typeof s?.IsActive === 'boolean' ? s.IsActive : undefined),
          createdAt: s?.createdAt ?? s?.CreatedAt ?? undefined,
          updatedAt: s?.updatedAt ?? s?.UpdatedAt ?? undefined,
        } as AuthorizedSignerInfo;
      })
      .filter((s): s is AuthorizedSignerInfo => !!s);
  }

  private toNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
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
      // Backend enum: Active=0, Inactive=1, Closed=2, Suspended=3, Locked=4
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

    const customer = dto?.customer ?? dto?.Customer ?? {};
    const contact = customer?.contact ?? customer?.Contact ?? {};
    const nameCandidate = [
      dto?.customerName,
      dto?.CustomerName,
      dto?.clientName,
      dto?.ClientName,
      customer?.fullName,
      customer?.FullName,
      [customer?.firstName, customer?.lastName].filter(Boolean).join(' ').trim()
    ].find((v) => v && String(v).trim().length > 0) as string | undefined;
    const phoneCandidate = [
      dto?.customerPhone,
      dto?.CustomerPhone,
      dto?.customerPhoneNumber,
      dto?.CustomerPhoneNumber,
      dto?.phone,
      dto?.Phone,
      contact?.primaryPhone,
      contact?.PrimaryPhone,
      contact?.phone,
      contact?.Phone,
      contact?.primaryPhoneNumber,
      contact?.PrimaryPhoneNumber,
      contact?.phoneNumber,
      contact?.PhoneNumber
    ].find((v) => v && String(v).trim().length > 0) as string | undefined;
    const codeCandidate = [
      dto?.customerCode,
      dto?.CustomerCode,
      dto?.clientCode,
      dto?.ClientCode,
      customer?.customerCode,
      customer?.CustomerCode,
      customer?.clientCode,
      customer?.ClientCode
    ].find((v) => v && String(v).trim().length > 0) as string | undefined;

    const openingDateRaw = dto?.openingDate ?? dto?.OpeningDate ?? dto?.createdAt ?? dto?.CreatedAt ?? new Date().toISOString();
    const openingDate = typeof openingDateRaw === 'string' ? openingDateRaw : new Date(openingDateRaw).toISOString();
    const lastTxRaw = dto?.lastTransactionDate ?? dto?.LastTransactionDate;
    const lastTransactionDate = lastTxRaw ? (typeof lastTxRaw === 'string' ? lastTxRaw : new Date(lastTxRaw).toISOString()) : undefined;
    const createdAtRaw = dto?.createdAt ?? dto?.CreatedAt ?? openingDateRaw;
    const updatedAtRaw = dto?.updatedAt ?? dto?.UpdatedAt ?? lastTxRaw ?? createdAtRaw;

    const accountLimits = this.normalizeAccountLimits(dto?.accountLimits ?? dto?.AccountLimits);
    const dailyWithdrawalLimit = this.toNumber(dto?.dailyWithdrawalLimit ?? dto?.DailyWithdrawalLimit ?? accountLimits?.dailyWithdrawalLimit);
    const monthlyWithdrawalLimit = this.toNumber(dto?.monthlyWithdrawalLimit ?? dto?.MonthlyWithdrawalLimit ?? accountLimits?.monthlyWithdrawalLimit);
    const dailyDepositLimit = this.toNumber(dto?.dailyDepositLimit ?? dto?.DailyDepositLimit ?? accountLimits?.dailyDepositLimit);
    const withdrawalLimit = this.toNumber(dto?.withdrawalLimit ?? dto?.WithdrawalLimit ?? dailyWithdrawalLimit);

    const customerId = dto?.customerId ?? dto?.CustomerId ?? customer?.id ?? customer?.Id ?? '';
    const branchIdRaw = dto?.branchId ?? dto?.BranchId ?? customer?.branchId ?? customer?.BranchId;
    const branchId = this.toNumber(branchIdRaw) ?? 0;

    const account: ClientAccount = {
      id: dto?.id ?? dto?.Id ?? '',
      accountNumber: dto?.accountNumber ?? dto?.AccountNumber ?? '',
      accountType,
      customerId: customerId ? String(customerId) : '',
      customerName: nameCandidate ? String(nameCandidate) : '',
      customerPhone: phoneCandidate ? String(phoneCandidate) : '',
      customerCode: codeCandidate ? String(codeCandidate) : undefined,
      branchId,
      branchName: dto?.branchName ?? dto?.BranchName ?? '',
      currency,
      balance: this.toNumber(dto?.balance ?? dto?.Balance) ?? 0,
      availableBalance: this.toNumber(dto?.availableBalance ?? dto?.AvailableBalance ?? dto?.balance ?? dto?.Balance) ?? 0,
      blockedBalance: this.toNumber(dto?.blockedBalance ?? dto?.BlockedBalance) ?? 0,
      status,
      openingDate,
      lastTransactionDate,
      interestRate: this.toNumber(dto?.interestRate ?? dto?.InterestRate),
      interestRateMonthly: this.toNumber(dto?.interestRateMonthly ?? dto?.InterestRateMonthly),
      termType: this.mapTermType(dto?.termType ?? dto?.TermType),
      maturityDate: dto?.maturityDate ?? dto?.MaturityDate ?? undefined,
      lastInterestCalculation: dto?.lastInterestCalculation ?? dto?.LastInterestCalculation ?? undefined,
      accruedInterest: this.toNumber(dto?.accruedInterest ?? dto?.AccruedInterest),
      minimumBalance: this.toNumber(dto?.minimumBalance ?? dto?.MinimumBalance),
      dailyWithdrawalLimit,
      monthlyWithdrawalLimit,
      overdraftLimit: this.toNumber(dto?.overdraftLimit ?? dto?.OverdraftLimit),
      dailyDepositLimit,
      allowOverdraft: (() => {
        const raw = dto?.allowOverdraft ?? dto?.AllowOverdraft;
        if (typeof raw === 'boolean') return raw;
        const limit = this.toNumber(dto?.overdraftLimit ?? dto?.OverdraftLimit);
        return !!(limit && limit > 0);
      })(),
      currentOverdraft: this.toNumber(dto?.currentOverdraft ?? dto?.CurrentOverdraft),
      withdrawalLimit,
      accountLimits,
      notes: dto?.notes ?? dto?.Notes ?? dto?.closureReason ?? dto?.ClosureReason ?? undefined,
      authorizedSigners: this.mapAuthorizedSigners(dto?.authorizedSigners ?? dto?.AuthorizedSigners),
      closedAt: dto?.closedAt ?? dto?.ClosedAt ?? undefined,
      closedBy: dto?.closedBy ?? dto?.ClosedBy ?? undefined,
      closureReason: dto?.closureReason ?? dto?.ClosureReason ?? undefined,
      createdAt: typeof createdAtRaw === 'string' ? createdAtRaw : new Date(createdAtRaw).toISOString(),
      updatedAt: typeof updatedAtRaw === 'string' ? updatedAtRaw : new Date(updatedAtRaw).toISOString(),
    };

    if (!account.accountLimits) {
      const syntheticLimits: AccountLimits = {};
      if (account.dailyDepositLimit !== undefined) syntheticLimits.dailyDepositLimit = account.dailyDepositLimit;
      if (account.dailyWithdrawalLimit !== undefined) syntheticLimits.dailyWithdrawalLimit = account.dailyWithdrawalLimit;
      if (account.monthlyWithdrawalLimit !== undefined) syntheticLimits.monthlyWithdrawalLimit = account.monthlyWithdrawalLimit;
      if (Object.keys(syntheticLimits).length > 0) {
        account.accountLimits = syntheticLimits;
      }
    }

    if (account.withdrawalLimit === undefined && account.dailyWithdrawalLimit !== undefined) {
      account.withdrawalLimit = account.dailyWithdrawalLimit;
    }

    if (!Array.isArray(account.authorizedSigners)) {
      account.authorizedSigners = [];
    }

    return account;
  }

  private mapClientAccountTransaction(dto: any): AccountTransaction {
    const mapStatus = (v: any): AccountTransaction['status'] => {
      if (typeof v === 'number') {
        // SavingsTransactionStatus: 0=Pending,1=Completed,2=Cancelled,3=Failed (common mapping)
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
        // SavingsTransactionType: 0=Deposit,1=Withdrawal,2=Interest,3=Fee,4=Transfer
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
      // Add status mapping so UI can render CANCELLED/COMPLETED/etc
      status: mapStatus(dto?.status ?? dto?.Status),
      // Add branch information
      branchId: dto?.branchId ?? dto?.BranchId ?? undefined,
      branchName: dto?.branchName ?? dto?.BranchName ?? undefined,
      branch: dto?.branchName ?? dto?.BranchName ?? dto?.branch ?? dto?.Branch ?? undefined
    };
  }
}

export const clientAccountService = new ClientAccountService();