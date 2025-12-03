// Branch Report Service - API communication for branch reports and SuperAdmin features

import axios, { AxiosInstance } from 'axios';
import {
  DailyBranchReportDto,
  MonthlyBranchReportDto,
  CustomPeriodReportRequestDto,
  PerformanceComparisonDto,
  SuperAdminConsolidatedReportDto,
  SuperAdminTransactionAuditDto,
  SuperAdminDashboardStatsDto,
  TransactionSearchRequestDto,
  BranchOverviewDto
} from '../types/branchReports';

class BranchReportService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'https://localhost:5001/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // ==========================================
  // MANAGER / BRANCH SUPERVISOR ENDPOINTS
  // ==========================================

  /**
   * Get daily report for manager's own branch
   */
  async getMyBranchDailyReport(date?: string): Promise<DailyBranchReportDto> {
    const params = date ? { date } : {};
    const response = await this.api.get<DailyBranchReportDto>('/BranchReport/my-branch/daily', { params });
    return response.data;
  }

  /**
   * Get monthly report for manager's own branch
   */
  async getMyBranchMonthlyReport(month: number, year: number): Promise<MonthlyBranchReportDto> {
    const response = await this.api.get<MonthlyBranchReportDto>('/BranchReport/my-branch/monthly', {
      params: { month, year }
    });
    return response.data;
  }

  /**
   * Get daily report for a specific branch (requires Director or SuperAdmin role)
   */
  async getDailyReportByBranch(branchId: number, date?: string): Promise<DailyBranchReportDto> {
    const params = date ? { date } : {};
    const response = await this.api.get<DailyBranchReportDto>(`/BranchReport/daily/${branchId}`, { params });
    return response.data;
  }

  /**
   * Get monthly report for a specific branch (requires Director or SuperAdmin role)
   */
  async getMonthlyReportByBranch(branchId: number, month: number, year: number): Promise<MonthlyBranchReportDto> {
    const response = await this.api.get<MonthlyBranchReportDto>(`/BranchReport/monthly/${branchId}`, {
      params: { month, year }
    });
    return response.data;
  }

  /**
   * Get custom period report
   */
  async getCustomPeriodReport(request: CustomPeriodReportRequestDto): Promise<DailyBranchReportDto> {
    const response = await this.api.post<DailyBranchReportDto>('/BranchReport/custom', request);
    return response.data;
  }

  /**
   * Normalize server DailyBranchReportDto to the frontend-friendly shape.
   * The backend uses names like totalCreditsDisbursedHTG / cashBalance:{closingBalanceHTG} while
   * some frontend code expects creditsDisbursedHTG and cashBalanceHTG. This function maps both forms
   * so the UI components can rely on a consistent object.
   */
  // No normalization needed anymore — frontend types and UI use backend DTO JSON shape directly

  /**
   * Get performance comparison between all branches
   */
  async getPerformanceComparison(startDate?: string, endDate?: string): Promise<PerformanceComparisonDto> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await this.api.get<PerformanceComparisonDto>('/BranchReport/performance-comparison', { params });
    return response.data;
  }

  /**
   * Export daily report to CSV
   */
  async exportDailyReportCSV(branchId: number, date?: string): Promise<Blob> {
    const params = date ? { date } : {};
    const response = await this.api.get(`/BranchReport/export/daily/${branchId}`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Export monthly report to CSV
   */
  async exportMonthlyReportCSV(branchId: number, month: number, year: number): Promise<Blob> {
    const response = await this.api.get(`/BranchReport/export/monthly/${branchId}`, {
      params: { month, year },
      responseType: 'blob'
    });
    return response.data;
  }

  // ==========================================
  // SUPERADMIN ENDPOINTS
  // ==========================================

  /**
   * Get consolidated report for all branches (SuperAdmin only)
   */
  async getConsolidatedReport(startDate?: string, endDate?: string): Promise<SuperAdminConsolidatedReportDto> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await this.api.get<SuperAdminConsolidatedReportDto>('/BranchReport/superadmin/consolidated', { params });
    return response.data;
  }

  /**
   * Get transaction audit with filters (SuperAdmin only)
   */
  async getTransactionAudit(
    startDate?: string,
    endDate?: string,
    branchId?: number,
    transactionType?: string,
    userId?: string
  ): Promise<SuperAdminTransactionAuditDto> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (branchId) params.branchId = branchId;
    if (transactionType) params.transactionType = transactionType;
    if (userId) params.userId = userId;
    const response = await this.api.get<SuperAdminTransactionAuditDto>('/BranchReport/superadmin/transaction-audit', { params });
    return response.data;
  }

  /**
   * Get real-time dashboard statistics (SuperAdmin only)
   */
  async getDashboardStats(): Promise<SuperAdminDashboardStatsDto> {
    const response = await this.api.get<SuperAdminDashboardStatsDto>('/BranchReport/superadmin/dashboard-stats');
    return response.data;
  }

  /**
   * Get overview of all branches (SuperAdmin only)
   */
  async getAllBranchesOverview(date?: string): Promise<BranchOverviewDto> {
    const params = date ? { date } : {};
    const response = await this.api.get<BranchOverviewDto>('/BranchReport/superadmin/all-branches-overview', { params });
    return response.data;
  }

  /**
   * Advanced transaction search (SuperAdmin only)
   */
  async searchTransactions(request: TransactionSearchRequestDto): Promise<SuperAdminTransactionAuditDto> {
    const response = await this.api.post<SuperAdminTransactionAuditDto>('/BranchReport/superadmin/search-transactions', request);
    return response.data;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Download blob as file
   */
  downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number, currency: 'HTG' | 'USD'): string {
    return new Intl.NumberFormat('fr-HT', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-HT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  /**
   * Format date for API (YYYY-MM-DD)
   */
  formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get status color based on PAR or collection rate
   */
  getStatusColor(status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL'): string {
    switch (status) {
      case 'EXCELLENT':
        return 'text-green-600 bg-green-100';
      case 'GOOD':
        return 'text-blue-600 bg-blue-100';
      case 'WARNING':
        return 'text-yellow-600 bg-yellow-100';
      case 'CRITICAL':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Get alert severity color
   */
  getAlertColor(severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'): string {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-100 border-red-600';
      case 'HIGH':
        return 'text-orange-600 bg-orange-100 border-orange-600';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100 border-yellow-600';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-600';
    }
  }
}

export const branchReportService = new BranchReportService();
