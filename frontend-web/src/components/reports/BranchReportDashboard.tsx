// Branch Report Dashboard - For Branch Managers and Supervisors

import React, { useState, useEffect, useRef } from 'react';
import { branchReportService } from '../../services/branchReportService';
import apiService from '../../services/apiService';
import {
  DailyBranchReportDto,
  MonthlyBranchReportDto,
  BranchOverviewDto,
} from '../../types/branchReports';

type SupportedCurrency = 'HTG' | 'USD';

const toNumber = (value: any): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  let candidate: any = value;
  if (typeof value === 'string') {
    candidate = value.replace(/[^0-9+\-.,]/g, '');
    if (candidate.includes(',') && !candidate.includes('.')) {
      candidate = candidate.replace(',', '.');
    } else {
      candidate = candidate.replace(/,/g, '');
    }
  }

  const numeric = Number(candidate);
  return Number.isFinite(numeric) ? numeric : 0;
};

const keyIncludesBase = (normalizedKey: string, baseLower: string): boolean => {
  if (normalizedKey.includes(baseLower)) {
    return true;
  }
  if (baseLower.endsWith('s')) {
    const singular = baseLower.slice(0, -1);
    if (singular && normalizedKey.includes(singular)) {
      return true;
    }
  }
  if (!baseLower.endsWith('s')) {
    const plural = `${baseLower}s`;
    if (normalizedKey.includes(plural)) {
      return true;
    }
  }
  return false;
};

const gatherTransactions = (source: any, collectionKey: string): Array<{ amount: number | string; currency?: string }> => {
  const normalizedBase = collectionKey.toLowerCase();
  const aggregated: Array<{ amount: number | string; currency?: string }> = [];
  const seenArrays = new Set<any>();

  const collectArray = (arr: any, key: string, parentKey: string) => {
    if (!Array.isArray(arr) || arr.length === 0) {
      return;
    }
    if (seenArrays.has(arr)) {
      return;
    }
    seenArrays.add(arr);

    const normalizedKey = key.toLowerCase();
    const normalizedParent = parentKey.toLowerCase();
    if (
      normalizedKey === normalizedBase ||
      keyIncludesBase(normalizedKey, normalizedBase) ||
      keyIncludesBase(normalizedParent, normalizedBase)
    ) {
      aggregated.push(...arr as Array<{ amount: number | string; currency?: string }>);
    }
  };

  const traverse = (node: any, currentKey: string = '') => {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (Array.isArray(node)) {
      collectArray(node, currentKey, currentKey);
      return;
    }

    Object.entries(node).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        collectArray(value, key, currentKey);
      } else if (value && typeof value === 'object') {
        traverse(value, key);
      }
    });
  };

  traverse(source);

  return aggregated.filter(item => item !== undefined && item !== null);
};

const getAmountForCurrency = (item: any, currency: SupportedCurrency): number => {
  if (!item || typeof item !== 'object') {
    return 0;
  }

  if (item.currency) {
    const itemCurrency = String(item.currency).trim().toUpperCase();
    if (itemCurrency === currency) {
      const direct = toNumber(item.amount);
      if (direct !== 0 || item.amount === 0) {
        return direct;
      }
    }
  }

  const currencyLower = currency.toLowerCase();
  let bestAmount = 0;

  Object.entries(item).forEach(([key, value]) => {
    const normalizedKey = key.toLowerCase();
    if (
      !normalizedKey.includes('amount') &&
      !normalizedKey.includes('total') &&
      !normalizedKey.includes('sum')
    ) {
      return;
    }
    if (!normalizedKey.endsWith(currencyLower)) {
      return;
    }
    const numeric = toNumber(value);
    if (!Number.isFinite(numeric)) {
      return;
    }
    if (Math.abs(numeric) > Math.abs(bestAmount)) {
      bestAmount = numeric;
    }
  });

  if (bestAmount !== 0) {
    return bestAmount;
  }

  if (!item.currency) {
    const fallback = toNumber(item.amount);
    if (fallback !== 0 || item.amount === 0) {
      return fallback;
    }
  }

  return 0;
};

const sumCategoryTotals = (
  source: any,
  baseKey: string,
  currency: SupportedCurrency,
  generalKeyLower: string
): number | null => {
  const baseLower = baseKey.toLowerCase();
  const currencyLower = currency.toLowerCase();
  let total = 0;
  let hasMatch = false;

  Object.entries(source || {}).forEach(([key, value]) => {
    const normalizedKey = key.toLowerCase();
    if (!normalizedKey.startsWith('total')) return;
    if (!normalizedKey.endsWith(currencyLower)) return;
    if (!keyIncludesBase(normalizedKey, baseLower)) return;
    if (normalizedKey === generalKeyLower) return;

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return;
    }
    total += numeric;
    hasMatch = true;
  });

  return hasMatch ? total : null;
};

const sumCategoryCounts = (
  source: any,
  collectionKey: string,
  generalKeyLower: string
): number | null => {
  const baseLower = collectionKey.toLowerCase();
  let total = 0;
  let hasMatch = false;

  Object.entries(source || {}).forEach(([key, value]) => {
    const normalizedKey = key.toLowerCase();
    if (!normalizedKey.endsWith('count')) return;
    if (!keyIncludesBase(normalizedKey, baseLower)) return;
    if (normalizedKey === generalKeyLower) return;

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return;
    }
    total += numeric;
    hasMatch = true;
  });

  return hasMatch ? total : null;
};

const resolveAmountWithFallback = (
  source: any,
  baseKey: string,
  currency: SupportedCurrency,
  collectionKey: string,
  transactions: Array<{ amount: number | string; currency?: string }>
): number => {
  const generalKey = `total${baseKey}${currency}`;
  const generalValue = source?.[generalKey];
  const categoryTotal = sumCategoryTotals(source, baseKey, currency, generalKey.toLowerCase());

  if (generalValue !== undefined && generalValue !== null) {
    const generalNumeric = toNumber(generalValue);
    if (generalNumeric !== 0 || categoryTotal === null) {
      return generalNumeric;
    }
  }

  if (categoryTotal !== null) {
    return categoryTotal;
  }

  if (transactions.length > 0) {
    return transactions.reduce(
      (total, item) => total + getAmountForCurrency(item, currency),
      0
    );
  }

  return 0;
};

const resolveCountWithFallback = (
  source: any,
  collectionKey: string,
  countKey: string,
  transactions: Array<{ amount: number | string; currency?: string }>
): number => {
  const generalValue = source?.[countKey];
  if (generalValue !== undefined && generalValue !== null) {
    return toNumber(generalValue);
  }

  const categoryCount = sumCategoryCounts(source, collectionKey, countKey.toLowerCase());
  if (categoryCount !== null) {
    return categoryCount;
  }

  return transactions.length;
};

const computeDailyTotals = (report: DailyBranchReportDto) => {
  const buildMetric = (
    baseKey: string,
    collectionKey: keyof DailyBranchReportDto & string,
    countKey: keyof DailyBranchReportDto & string
  ) => {
    const transactions = gatherTransactions(report, collectionKey);
    return {
      totalHTG: resolveAmountWithFallback(report, baseKey, 'HTG', collectionKey, transactions),
      totalUSD: resolveAmountWithFallback(report, baseKey, 'USD', collectionKey, transactions),
      count: resolveCountWithFallback(report, collectionKey, countKey, transactions)
    };
  };

  return {
    credits: buildMetric('CreditsDisbursed', 'creditsDisbursed', 'creditsDisbursedCount'),
    payments: buildMetric('PaymentsReceived', 'paymentsReceived', 'paymentsReceivedCount'),
    deposits: buildMetric('Deposits', 'deposits', 'depositsCount'),
    withdrawals: buildMetric('Withdrawals', 'withdrawals', 'withdrawalsCount'),
    cash: {
      closingHTG: toNumber(report.cashBalance?.closingBalanceHTG),
      closingUSD: toNumber(report.cashBalance?.closingBalanceUSD)
    }
  };
};

const resolveAggregateAmount = (
  source: any,
  baseKey: string,
  currency: SupportedCurrency,
  fallbackValue: number
): number => {
  const generalKey = `total${baseKey}${currency}`;
  const generalValue = source?.[generalKey];
  const categoryTotal = sumCategoryTotals(source, baseKey, currency, generalKey.toLowerCase());
  if (generalValue !== undefined && generalValue !== null) {
    const generalNumeric = toNumber(generalValue);
    if (generalNumeric !== 0 || categoryTotal === null) {
      return generalNumeric;
    }
  }

  if (categoryTotal !== null) {
    return categoryTotal;
  }

  return fallbackValue;
};

const resolveAggregateCount = (
  source: any,
  collectionKey: string,
  countKey: string,
  fallbackValue: number
): number => {
  const generalValue = source?.[countKey];
  const categoryCount = sumCategoryCounts(source, collectionKey, countKey.toLowerCase());
  if (generalValue !== undefined && generalValue !== null) {
    const generalNumeric = toNumber(generalValue);
    if (generalNumeric !== 0 || categoryCount === null) {
      return generalNumeric;
    }
  }

  if (categoryCount !== null) {
    return categoryCount;
  }

  return fallbackValue;
};

const computeMonthlyTotals = (report: MonthlyBranchReportDto) => {
  const dailySummaries = (report.dailyReports ?? []).map(computeDailyTotals);

  const sumFromDaily = (selector: (summary: ReturnType<typeof computeDailyTotals>) => number) =>
    dailySummaries.reduce((total, summary) => total + selector(summary), 0);

  const averageFromDaily = (selector: (summary: ReturnType<typeof computeDailyTotals>) => number) => {
    if (dailySummaries.length === 0) {
      return 0;
    }
    return sumFromDaily(selector) / dailySummaries.length;
  };

  return {
    credits: {
      totalHTG: resolveAggregateAmount(
        report,
        'CreditsDisbursed',
        'HTG',
        sumFromDaily(summary => summary.credits.totalHTG)
      ),
      totalUSD: resolveAggregateAmount(
        report,
        'CreditsDisbursed',
        'USD',
        sumFromDaily(summary => summary.credits.totalUSD)
      ),
      count: resolveAggregateCount(
        report,
        'creditsDisbursed',
        'totalCreditsDisbursedCount',
        sumFromDaily(summary => summary.credits.count)
      )
    },
    payments: {
      totalHTG: resolveAggregateAmount(
        report,
        'PaymentsReceived',
        'HTG',
        sumFromDaily(summary => summary.payments.totalHTG)
      ),
      totalUSD: resolveAggregateAmount(
        report,
        'PaymentsReceived',
        'USD',
        sumFromDaily(summary => summary.payments.totalUSD)
      ),
      count: resolveAggregateCount(
        report,
        'paymentsReceived',
        'totalPaymentsReceivedCount',
        sumFromDaily(summary => summary.payments.count)
      )
    },
    deposits: {
      totalHTG: resolveAggregateAmount(
        report,
        'Deposits',
        'HTG',
        sumFromDaily(summary => summary.deposits.totalHTG)
      ),
      totalUSD: resolveAggregateAmount(
        report,
        'Deposits',
        'USD',
        sumFromDaily(summary => summary.deposits.totalUSD)
      ),
      count: resolveAggregateCount(
        report,
        'deposits',
        'totalDepositsCount',
        sumFromDaily(summary => summary.deposits.count)
      )
    },
    withdrawals: {
      totalHTG: resolveAggregateAmount(
        report,
        'Withdrawals',
        'HTG',
        sumFromDaily(summary => summary.withdrawals.totalHTG)
      ),
      totalUSD: resolveAggregateAmount(
        report,
        'Withdrawals',
        'USD',
        sumFromDaily(summary => summary.withdrawals.totalUSD)
      ),
      count: resolveAggregateCount(
        report,
        'withdrawals',
        'totalWithdrawalsCount',
        sumFromDaily(summary => summary.withdrawals.count)
      )
    },
    cash: {
      averageHTG: toNumber(
        report.averageDailyCashBalanceHTG ?? averageFromDaily(summary => summary.cash.closingHTG)
      ),
      averageUSD: toNumber(
        report.averageDailyCashBalanceUSD ?? averageFromDaily(summary => summary.cash.closingUSD)
      )
    }
  };
};

interface BranchReportDashboardProps {
  userRole: string;
  branchId?: number; // For SuperAdmin viewing specific branch
}

export const BranchReportDashboard: React.FC<BranchReportDashboardProps> = ({
  userRole,
  branchId: initialBranchId
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Branch selection for SuperAdmin/Director
  const [branches, setBranches] = useState<Array<{id: number, name: string}>>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(initialBranchId);
  const isSuperAdminOrDirector = ['SuperAdmin', 'Director'].includes(userRole);

  // Financial summary (deposits/withdrawals + transfers)
  const [financialSummary, setFinancialSummary] = useState<any | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const summaryFallbackMessage = isSuperAdminOrDirector
    ? 'Sélectionnez une succursale pour voir le solde.'
    : 'Aucune donnée reçue pour votre succursale. Cliquez sur "Actualiser" pour réessayer.';
  const lastSummaryKeyRef = useRef<string>('');

  // Daily report state
  const [dailyReport, setDailyReport] = useState<DailyBranchReportDto | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Monthly report state
  const [monthlyReport, setMonthlyReport] = useState<MonthlyBranchReportDto | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Load daily report
  const loadDailyReport = async () => {
    if (!selectedBranchId && isSuperAdminOrDirector) {
      setError('Veuillez sélectionner une succursale');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      let report: DailyBranchReportDto;
      if (selectedBranchId && isSuperAdminOrDirector) {
        // SuperAdmin/Director viewing specific branch
        report = await branchReportService.getDailyReportByBranch(selectedBranchId, selectedDate);
      } else {
        // Manager viewing their own branch
        report = await branchReportService.getMyBranchDailyReport(selectedDate);
      }
      setDailyReport(report);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement du rapport journalier');
      console.error('Error loading daily report:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load monthly report
  const loadMonthlyReport = async () => {
    if (!selectedBranchId && isSuperAdminOrDirector) {
      setError('Veuillez sélectionner une succursale');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      let report: MonthlyBranchReportDto;
      if (selectedBranchId && isSuperAdminOrDirector) {
        report = await branchReportService.getMonthlyReportByBranch(
          selectedBranchId,
          selectedMonth,
          selectedYear
        );
      } else {
        report = await branchReportService.getMyBranchMonthlyReport(
          selectedMonth,
          selectedYear
        );
      }
      setMonthlyReport(report);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement du rapport mensuel');
      console.error('Error loading monthly report:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Load branches for SuperAdmin/Director
  const loadBranches = async () => {
    if (!isSuperAdminOrDirector) return;
    
    try {
      // Try to get branches from overview first
      try {
        const overview = await branchReportService.getAllBranchesOverview(
          new Date().toISOString().split('T')[0]
        );
        if (overview.branches && overview.branches.length > 0) {
          setBranches(overview.branches.map(b => ({ id: b.branchId, name: b.branchName })));
          return;
        }
      } catch (overviewErr) {
        console.warn('Could not load from overview, trying alternative:', overviewErr);
      }
      
      // Fallback: Use general branch API
      const branchesData = await apiService.getAllBranches();
      setBranches(branchesData.map((b: any) => ({ 
        id: b.id || b.branchId, 
        name: b.name || b.branchName 
      })));
    } catch (err) {
      console.error('Error loading branches:', err);
      // Set error message for user
      setError('Erreur lors du chargement des succursales');
    }
  };
  
  // Initial load
  useEffect(() => {
    loadBranches();
  }, []);

  // Load data when tab or filters change
  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyReport();
    } else {
      loadMonthlyReport();
    }
  }, [activeTab, selectedDate, selectedMonth, selectedYear, selectedBranchId, isSuperAdminOrDirector]);

  const loadFinancialSummary = async (branchIdOverride?: number) => {
    const targetBranchId = branchIdOverride
      ?? (isSuperAdminOrDirector
        ? selectedBranchId
        : selectedBranchId || dailyReport?.branchId || monthlyReport?.branchId || initialBranchId);

    if (!targetBranchId) {
      setSummaryError(
        isSuperAdminOrDirector
          ? 'Veuillez sélectionner une succursale'
          : 'Résumé financier non disponible pour le moment.'
      );
      setFinancialSummary(null);
      setLoadingSummary(false);
      lastSummaryKeyRef.current = '';
      return;
    }

    const summaryKey = `${targetBranchId}-${activeTab}-${selectedDate}-${selectedMonth}-${selectedYear}`;
    if (branchIdOverride === undefined && summaryKey !== lastSummaryKeyRef.current) {
      lastSummaryKeyRef.current = summaryKey;
    }

    try {
      setLoadingSummary(true);
      setSummaryError(null);
      const data = await apiService.getBranchFinancialSummary(targetBranchId);
      if (summaryKey !== lastSummaryKeyRef.current) {
        return;
      }
      setFinancialSummary(data);
    } catch (e: any) {
      if (summaryKey === lastSummaryKeyRef.current) {
        setSummaryError(e.response?.data?.message || 'Erreur résumé financier');
        setFinancialSummary(null);
      }
    } finally {
      if (summaryKey === lastSummaryKeyRef.current) {
        setLoadingSummary(false);
      }
    }
  };

  useEffect(() => {
    const branchIdFromSelection = selectedBranchId ?? initialBranchId;
    const branchIdFromReports = dailyReport?.branchId || monthlyReport?.branchId;

    const targetBranchId = isSuperAdminOrDirector
      ? selectedBranchId
      : branchIdFromSelection ?? branchIdFromReports;

    if (!targetBranchId) {
      setSummaryError(
        isSuperAdminOrDirector
          ? 'Veuillez sélectionner une succursale'
          : 'Résumé financier non disponible pour le moment.'
      );
      setFinancialSummary(null);
      setLoadingSummary(false);
      lastSummaryKeyRef.current = '';
      return;
    }

    const summaryKey = `${targetBranchId}-${activeTab}-${selectedDate}-${selectedMonth}-${selectedYear}`;
    if (summaryKey === lastSummaryKeyRef.current) {
      return;
    }

    lastSummaryKeyRef.current = summaryKey;
    loadFinancialSummary(targetBranchId);
  }, [
    activeTab,
    selectedDate,
    selectedMonth,
    selectedYear,
    selectedBranchId,
    initialBranchId,
    isSuperAdminOrDirector,
    dailyReport?.branchId,
    monthlyReport?.branchId
  ]);

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const safeText = (value?: string | number | null) => {
    if (value === undefined || value === null || value === '') {
      return 'N/A';
    }
    return escapeHtml(String(value));
  };

  const formatCurrencyForPdf = (value: number, currency: SupportedCurrency) => {
    const numeric = Number.isFinite(value) ? value : Number(value) || 0;
    return escapeHtml(
      branchReportService
        .formatCurrency(numeric, currency)
        .replace(/\u00A0/g, ' ')
    );
  };

  const formatDateForPdf = (value: string) =>
    value
      ? escapeHtml(
          new Date(value).toLocaleDateString('fr-HT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        )
      : 'N/A';

  const formatDateTimeForPdf = (date: Date) =>
    escapeHtml(
      date.toLocaleString('fr-HT', {
        dateStyle: 'full',
        timeStyle: 'short'
      })
    );

  const buildDailyPdfHtml = (report: DailyBranchReportDto) => {
    const summary = computeDailyTotals(report);
    const generatedAt = formatDateTimeForPdf(new Date());
    const branchName = safeText(report.branchName);
    const reportDate = formatDateForPdf(report.reportDate);
    const region = safeText(report.branchRegion);
    const totalTransactions = safeText(report.totalTransactions);
    const activeSessions = safeText(report.activeCashSessions);
    const completedSessions = safeText(report.completedCashSessions);

    const summaryRows = [
      { label: 'Crédits décaissés', totals: summary.credits },
      { label: 'Paiements reçus', totals: summary.payments },
      { label: 'Dépôts', totals: summary.deposits },
      { label: 'Retraits', totals: summary.withdrawals }
    ];

    const summaryBody = summaryRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.label)}</td>
            <td class="number">${formatCurrencyForPdf(row.totals.totalHTG, 'HTG')}</td>
            <td class="number">${formatCurrencyForPdf(row.totals.totalUSD, 'USD')}</td>
            <td class="number">${escapeHtml(String(row.totals.count ?? 0))}</td>
          </tr>
        `
      )
      .join('');

    const cash = report.cashBalance ?? {
      openingBalanceHTG: 0,
      openingBalanceUSD: 0,
      closingBalanceHTG: 0,
      closingBalanceUSD: 0,
      netChangeHTG: 0,
      netChangeUSD: 0
    };

    const cashBody = `
      <tr>
        <td>Solde ouverture</td>
        <td class="number">${formatCurrencyForPdf(toNumber(cash.openingBalanceHTG), 'HTG')}</td>
        <td class="number">${formatCurrencyForPdf(toNumber(cash.openingBalanceUSD), 'USD')}</td>
      </tr>
      <tr>
        <td>Solde fermeture</td>
        <td class="number">${formatCurrencyForPdf(toNumber(cash.closingBalanceHTG), 'HTG')}</td>
        <td class="number">${formatCurrencyForPdf(toNumber(cash.closingBalanceUSD), 'USD')}</td>
      </tr>
      <tr>
        <td>Variation nette</td>
        <td class="number">${formatCurrencyForPdf(toNumber(cash.netChangeHTG), 'HTG')}</td>
        <td class="number">${formatCurrencyForPdf(toNumber(cash.netChangeUSD), 'USD')}</td>
      </tr>
    `;

    const transfersExist =
      toNumber(report.totalTransfersInHTG) !== 0 ||
      toNumber(report.totalTransfersInUSD) !== 0 ||
      toNumber(report.totalTransfersOutHTG) !== 0 ||
      toNumber(report.totalTransfersOutUSD) !== 0;

    const transfersSection = transfersExist
      ? `
        <div class="section">
          <h2>Transferts inter-succursales</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Total HTG</th>
                <th>Total USD</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Entrants</td>
                <td class="number">${formatCurrencyForPdf(toNumber(report.totalTransfersInHTG ?? 0), 'HTG')}</td>
                <td class="number">${formatCurrencyForPdf(toNumber(report.totalTransfersInUSD ?? 0), 'USD')}</td>
              </tr>
              <tr>
                <td>Sortants</td>
                <td class="number">${formatCurrencyForPdf(toNumber(report.totalTransfersOutHTG ?? 0), 'HTG')}</td>
                <td class="number">${formatCurrencyForPdf(toNumber(report.totalTransfersOutUSD ?? 0), 'USD')}</td>
              </tr>
            </tbody>
          </table>
          <p class="note">Les transferts apparaissent après validation complète par les deux succursales.</p>
        </div>
      `
      : '';

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Rapport journalier - ${branchName}</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; padding: 32px; color: #111827; background: #f9fafb; }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { font-size: 26px; margin-bottom: 8px; color: #1f2937; }
    .header p { margin: 4px 0; color: #4b5563; }
    .section { background: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
    .section h2 { font-size: 18px; margin-bottom: 12px; color: #1f2937; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 4px; }
    .info-grid div { background: #eef2ff; border-radius: 6px; padding: 12px; font-size: 13px; }
    .info-grid span { display: block; font-weight: 600; color: #1f2937; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 12px; text-align: left; }
    thead th { background: #1d4ed8; color: #ffffff; }
    tbody tr:nth-child(even) { background: #f3f4f6; }
    .number { text-align: right; font-variant-numeric: tabular-nums; }
    .note { font-size: 11px; color: #6b7280; margin-top: 12px; }
    .actions { margin-top: 24px; text-align: center; }
    .actions button { background: #2563eb; color: #ffffff; border: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; cursor: pointer; }
    .actions button + button { background: #6b7280; margin-left: 12px; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rapport journalier - ${branchName}</h1>
    <p>Date du rapport : ${reportDate}</p>
    <p>Document généré le ${generatedAt}</p>
  </div>

  <div class="section">
    <h2>Informations succursale</h2>
    <div class="info-grid">
      <div><span>Succursale</span>${branchName}</div>
      <div><span>Région</span>${region}</div>
      <div><span>Total transactions</span>${totalTransactions}</div>
      <div><span>Sessions caisse actives</span>${activeSessions}</div>
      <div><span>Sessions caisse terminées</span>${completedSessions}</div>
    </div>
  </div>

  <div class="section">
    <h2>Synthèse financière</h2>
    <table>
      <thead>
        <tr>
          <th>Catégorie</th>
          <th>Total HTG</th>
          <th>Total USD</th>
          <th>Nombre</th>
        </tr>
      </thead>
      <tbody>
        ${summaryBody}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Solde caisse</h2>
    <table>
      <thead>
        <tr>
          <th>Ligne</th>
          <th>HTG</th>
          <th>USD</th>
        </tr>
      </thead>
      <tbody>
        ${cashBody}
      </tbody>
    </table>
    <p class="note">Les soldes correspondent aux montants communiqués par la caisse pour la journée.</p>
  </div>

  ${transfersSection}

  <div class="section">
    <h2>Notes</h2>
    <p class="note">Les montants sont fournis par le service des rapports et peuvent différer des écritures comptables tant que toutes les opérations n'ont pas été rapprochées.</p>
  </div>

  <div class="actions">
    <button onclick="window.print()">Imprimer ou sauvegarder en PDF</button>
    <button onclick="window.close()">Fermer</button>
  </div>
</body>
</html>
    `;
  };

  const buildMonthlyPdfHtml = (report: MonthlyBranchReportDto) => {
    const summary = computeMonthlyTotals(report);
    const generatedAt = formatDateTimeForPdf(new Date());
    const branchName = safeText(report.branchName);
    const monthLabel = escapeHtml(
      new Date(report.year, report.month - 1).toLocaleDateString('fr-HT', {
        year: 'numeric',
        month: 'long'
      })
    );
    const region = safeText(report.branchRegion);
    const businessDays = safeText(report.numberOfBusinessDays);
    const par = report.portfolioAtRisk !== undefined && report.portfolioAtRisk !== null
      ? `${escapeHtml((report.portfolioAtRisk ?? 0).toFixed(2))}%`
      : escapeHtml('Non disponible');
    const collectionRate = report.collectionRate !== undefined && report.collectionRate !== null
      ? `${escapeHtml((report.collectionRate ?? 0).toFixed(2))}%`
      : escapeHtml('Non disponible');

    const summaryRows = [
      { label: 'Crédits décaissés', totals: summary.credits },
      { label: 'Paiements reçus', totals: summary.payments },
      { label: 'Dépôts', totals: summary.deposits },
      { label: 'Retraits', totals: summary.withdrawals }
    ];

    const summaryBody = summaryRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.label)}</td>
            <td class="number">${formatCurrencyForPdf(row.totals.totalHTG, 'HTG')}</td>
            <td class="number">${formatCurrencyForPdf(row.totals.totalUSD, 'USD')}</td>
            <td class="number">${escapeHtml(String(row.totals.count ?? 0))}</td>
          </tr>
        `
      )
      .join('');

    const averageCashBody = `
      <tr>
        <td>Solde moyen journalier</td>
        <td class="number">${formatCurrencyForPdf(summary.cash.averageHTG, 'HTG')}</td>
        <td class="number">${formatCurrencyForPdf(summary.cash.averageUSD, 'USD')}</td>
      </tr>
    `;

    const dailyReports = report.dailyReports ?? [];
    const dailyRows = dailyReports.length
      ? dailyReports
          .map((daily) => {
            const dailySummary = computeDailyTotals(daily);
            return `
              <tr>
                <td>${formatDateForPdf(daily.reportDate)}</td>
                <td class="number">${formatCurrencyForPdf(dailySummary.credits.totalHTG, 'HTG')}</td>
                <td class="number">${formatCurrencyForPdf(dailySummary.credits.totalUSD, 'USD')}</td>
                <td class="number">${formatCurrencyForPdf(dailySummary.payments.totalHTG, 'HTG')}</td>
                <td class="number">${formatCurrencyForPdf(dailySummary.payments.totalUSD, 'USD')}</td>
                <td class="number">${formatCurrencyForPdf(dailySummary.deposits.totalHTG, 'HTG')}</td>
                <td class="number">${formatCurrencyForPdf(dailySummary.deposits.totalUSD, 'USD')}</td>
                <td class="number">${formatCurrencyForPdf(dailySummary.withdrawals.totalHTG, 'HTG')}</td>
                <td class="number">${formatCurrencyForPdf(dailySummary.withdrawals.totalUSD, 'USD')}</td>
              </tr>
            `;
          })
          .join('')
      : `
          <tr>
            <td colspan="9" class="empty">Aucune donnée journalière disponible pour ce mois.</td>
          </tr>
        `;

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Rapport mensuel - ${branchName}</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; padding: 32px; color: #111827; background: #f3f4f6; }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { font-size: 26px; margin-bottom: 8px; color: #1f2937; }
    .header p { margin: 4px 0; color: #4b5563; }
    .section { background: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
    .section h2 { font-size: 18px; margin-bottom: 12px; color: #1f2937; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 4px; }
    .info-grid div { background: #e0f2fe; border-radius: 6px; padding: 12px; font-size: 13px; }
    .info-grid span { display: block; font-weight: 600; color: #1f2937; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 12px; text-align: left; }
    thead th { background: #047857; color: #ffffff; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    .number { text-align: right; font-variant-numeric: tabular-nums; }
    .empty { text-align: center; color: #6b7280; padding: 18px 10px; }
    .note { font-size: 11px; color: #6b7280; margin-top: 12px; }
    .actions { margin-top: 24px; text-align: center; }
    .actions button { background: #10b981; color: #ffffff; border: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; cursor: pointer; }
    .actions button + button { background: #6b7280; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rapport mensuel - ${branchName}</h1>
    <p>Mois : ${monthLabel}</p>
    <p>Document généré le ${generatedAt}</p>
  </div>

  <div class="section">
    <h2>Informations succursale</h2>
    <div class="info-grid">
      <div><span>Succursale</span>${branchName}</div>
      <div><span>Région</span>${region}</div>
      <div><span>Jours ouvrables</span>${businessDays}</div>
    </div>
  </div>

  <div class="section">
    <h2>Indicateurs clés</h2>
    <table>
      <thead>
        <tr>
          <th>Indicateur</th>
          <th>Valeur</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Portfolio at Risk (PAR)</td>
          <td class="number">${par}</td>
        </tr>
        <tr>
          <td>Taux de recouvrement</td>
          <td class="number">${collectionRate}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Synthèse mensuelle</h2>
    <table>
      <thead>
        <tr>
          <th>Catégorie</th>
          <th>Total HTG</th>
          <th>Total USD</th>
          <th>Nombre</th>
        </tr>
      </thead>
      <tbody>
        ${summaryBody}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Solde moyen</h2>
    <table>
      <thead>
        <tr>
          <th>Métrique</th>
          <th>HTG</th>
          <th>USD</th>
        </tr>
      </thead>
      <tbody>
        ${averageCashBody}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Détail par journée</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Crédits HTG</th>
          <th>Crédits USD</th>
          <th>Paiements HTG</th>
          <th>Paiements USD</th>
          <th>Dépôts HTG</th>
          <th>Dépôts USD</th>
          <th>Retraits HTG</th>
          <th>Retraits USD</th>
        </tr>
      </thead>
      <tbody>
        ${dailyRows}
      </tbody>
    </table>
    <p class="note">Chaque ligne représente le total des transactions enregistrées pour la journée correspondante.</p>
  </div>

  <div class="section">
    <h2>Notes</h2>
    <p class="note">Les montants agrégés sont calculés à partir des rapports journaliers et peuvent varier si des ajustements sont effectués après la clôture de la période.</p>
  </div>

  <div class="actions">
    <button onclick="window.print()">Imprimer ou sauvegarder en PDF</button>
    <button onclick="window.close()">Fermer</button>
  </div>
</body>
</html>
    `;
  };

  const openPdfWindow = (html: string) => {
    const pdfWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!pdfWindow) {
      // Fallback: render into hidden iframe and trigger print without popup
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument || (iframe as any).document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        const tryPrint = () => {
          const win = iframe.contentWindow;
          if (win) {
            win.focus();
            win.print();
          }
        };
        // Give the browser a moment to layout content
        setTimeout(tryPrint, 100);
      }
      return;
    }
    pdfWindow.document.write(html);
    pdfWindow.document.close();
    pdfWindow.focus();
  };

  // Export daily report
  const handleExportDaily = async () => {
    if (!dailyReport) return;
    try {
      const blob = await branchReportService.exportDailyReportCSV(
        dailyReport.branchId,
        selectedDate
      );
      branchReportService.downloadFile(
        blob,
        `rapport-journalier-${dailyReport.branchName}-${selectedDate}.csv`
      );
    } catch (err: any) {
      alert('Erreur lors de l\'exportation du rapport: ' + (err.response?.data?.message || err.message));
    }
  };

  // Export monthly report
  const handleExportMonthly = async () => {
    if (!monthlyReport) return;
    try {
      const blob = await branchReportService.exportMonthlyReportCSV(
        monthlyReport.branchId,
        selectedMonth,
        selectedYear
      );
      branchReportService.downloadFile(
        blob,
        `rapport-mensuel-${monthlyReport.branchName}-${selectedYear}-${selectedMonth}.csv`
      );
    } catch (err: any) {
      alert('Erreur lors de l\'exportation du rapport: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleExportDailyPDF = () => {
    if (!dailyReport) {
      return;
    }
    openPdfWindow(buildDailyPdfHtml(dailyReport));
  };

  const handleExportMonthlyPDF = () => {
    if (!monthlyReport) {
      return;
    }
    openPdfWindow(buildMonthlyPdfHtml(monthlyReport));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black mb-2">
            📊 Rapport de Succursale
          </h1>
          <p className="text-black">
            Consulter les rapports journaliers et mensuels de la succursale
          </p>
        </div>

        {/* Branch Selector for SuperAdmin/Director */}
        {isSuperAdminOrDirector && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <label className="block text-sm font-medium text-black mb-2">
              Sélectionner une succursale:
            </label>
            <select
              value={selectedBranchId || ''}
              onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choisir une succursale --</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('daily')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'daily'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-black hover:text-black hover:border-gray-300'
                }`}
              >
                📅 Rapport Journalier
              </button>
              <button
                onClick={() => setActiveTab('monthly')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'monthly'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-black hover:text-black hover:border-gray-300'
                }`}
              >
                📆 Rapport Mensuel
              </button>
            </nav>
          </div>

          {/* Filters */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            {activeTab === 'daily' ? (
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-black">
                  Date:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={loadDailyReport}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  🔄 Actualiser
                </button>
                {dailyReport && (
                  <>
                    <button
                      onClick={handleExportDaily}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      📥 Exporter CSV
                    </button>
                    <button
                      onClick={handleExportDailyPDF}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      📄 Exporter PDF
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-black">
                  Mois:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1).toLocaleString('fr-HT', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <label className="text-sm font-medium text-black">
                  Année:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadMonthlyReport}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  🔄 Actualiser
                </button>
                {monthlyReport && (
                  <>
                    <button
                      onClick={handleExportMonthly}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      📥 Exporter CSV
                    </button>
                    <button
                      onClick={handleExportMonthlyPDF}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      📄 Exporter PDF
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* Financial Summary Cards */}
        {(selectedBranchId || !isSuperAdminOrDirector) && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">💼 Solde Total (Succursale)</h3>
              <button
                onClick={() => loadFinancialSummary()}
                disabled={loadingSummary}
                className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <span className={loadingSummary ? 'animate-spin' : ''}>🔄</span>
                Actualiser
              </button>
            </div>
            {loadingSummary ? (
              <div className="flex items-center gap-3 text-gray-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                <span>Chargement du résumé financier...</span>
              </div>
            ) : summaryError ? (
              <div className="text-sm text-red-600">{summaryError}</div>
            ) : financialSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-900">Total Entrées (HTG)</div>
                  <div className="text-2xl font-bold text-green-700 mt-2">
                    {branchReportService.formatCurrency(Number(financialSummary.totalDepositHTG || 0), 'HTG')}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg">
                  <div className="text-sm font-medium text-red-900">Total Sorties (HTG)</div>
                  <div className="text-2xl font-bold text-red-700 mt-2">
                    {branchReportService.formatCurrency(Number(financialSummary.totalWithdrawalHTG || 0), 'HTG')}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
                  <div className="text-sm font-medium text-indigo-900">Solde Total (HTG)</div>
                  <div className="text-2xl font-bold text-indigo-700 mt-2">
                    {branchReportService.formatCurrency(Number(financialSummary.balanceHTG || 0), 'HTG')}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-900">Total Entrées (USD)</div>
                  <div className="text-2xl font-bold text-green-700 mt-2">
                    {branchReportService.formatCurrency(Number(financialSummary.totalDepositUSD || 0), 'USD')}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg">
                  <div className="text-sm font-medium text-red-900">Total Sorties (USD)</div>
                  <div className="text-2xl font-bold text-red-700 mt-2">
                    {branchReportService.formatCurrency(Number(financialSummary.totalWithdrawalUSD || 0), 'USD')}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
                  <div className="text-sm font-medium text-indigo-900">Solde Total (USD)</div>
                  <div className="text-2xl font-bold text-indigo-700 mt-2">
                    {branchReportService.formatCurrency(Number(financialSummary.balanceUSD || 0), 'USD')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">{summaryFallbackMessage}</div>
            )}
            {financialSummary && (
              <div className="mt-4 text-xs text-gray-500">
                <div>📊 Basé sur dépôts, retraits et transferts inter-succursales <strong>complétés</strong>.</div>
                <div className="mt-1">💡 <strong>Note:</strong> Les transferts approuvés n'affectent le solde qu'après avoir été dispatchés et traités.</div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Chargement du rapport...</p>
          </div>
        )}

        {/* Daily Report Display */}
        {!loading && activeTab === 'daily' && dailyReport && (
          <DailyReportView report={dailyReport} />
        )}

        {/* Monthly Report Display */}
        {!loading && activeTab === 'monthly' && monthlyReport && (
          <MonthlyReportView report={monthlyReport} />
        )}
      </div>
    </div>
  );
};

// Daily Report View Component
const DailyReportView: React.FC<{ report: DailyBranchReportDto }> = ({ report }) => {
  const summary = computeDailyTotals(report);
  const creditsTotalHTG = summary.credits.totalHTG;
  const creditsTotalUSD = summary.credits.totalUSD;
  const creditsCount = summary.credits.count;

  const paymentsTotalHTG = summary.payments.totalHTG;
  const paymentsTotalUSD = summary.payments.totalUSD;
  const paymentsCount = summary.payments.count;

  const depositsTotalHTG = summary.deposits.totalHTG;
  const depositsTotalUSD = summary.deposits.totalUSD;
  const depositsCount = summary.deposits.count;

  const withdrawalsTotalHTG = summary.withdrawals.totalHTG;
  const withdrawalsTotalUSD = summary.withdrawals.totalUSD;
  const withdrawalsCount = summary.withdrawals.count;

  const cashBalanceHTG = summary.cash.closingHTG;
  const cashBalanceUSD = summary.cash.closingUSD;

  return (
    <div className="space-y-6">
      {/* Branch Info */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {report.branchName}
        </h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Date:</span>
            <span className="ml-2 font-medium">
              {branchReportService.formatDate(report.reportDate)}
            </span>
          </div>
          {report.branchRegion && (
            <div>
              <span className="text-gray-600">Rejyon:</span>
              <span className="ml-2 font-medium">{report.branchRegion}</span>
            </div>
          )}
          <div>
            <span className="text-gray-600">Trans. totales:</span>
            <span className="ml-2 font-medium">{report.totalTransactions ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Credits Disbursed */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          💰 Crédits Décaissés
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Total HTG"
            value={branchReportService.formatCurrency(creditsTotalHTG, 'HTG')}
            color="blue"
          />
          <MetricCard
            label="Total USD"
            value={branchReportService.formatCurrency(creditsTotalUSD, 'USD')}
            color="blue"
          />
          <MetricCard
            label="Quantité"
            value={creditsCount.toString()}
            color="blue"
          />
        </div>
      </div>

      {/* Payments Received */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          💵 Paiements Reçus
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Total HTG"
            value={branchReportService.formatCurrency(paymentsTotalHTG, 'HTG')}
            color="green"
          />
          <MetricCard
            label="Total USD"
            value={branchReportService.formatCurrency(paymentsTotalUSD, 'USD')}
            color="green"
          />
          <MetricCard
            label="Quantité"
            value={paymentsCount.toString()}
            color="green"
          />
        </div>
      </div>

      {/* Deposits */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          📈 Dépôts
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Total HTG"
            value={branchReportService.formatCurrency(depositsTotalHTG, 'HTG')}
            color="purple"
          />
          <MetricCard
            label="Total USD"
            value={branchReportService.formatCurrency(depositsTotalUSD, 'USD')}
            color="purple"
          />
          <MetricCard
            label="Quantité"
            value={depositsCount.toString()}
            color="purple"
          />
        </div>
      </div>

      {/* Withdrawals */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          📉 Retraits
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Total HTG"
            value={branchReportService.formatCurrency(withdrawalsTotalHTG, 'HTG')}
            color="orange"
          />
          <MetricCard
            label="Total USD"
            value={branchReportService.formatCurrency(withdrawalsTotalUSD, 'USD')}
            color="orange"
          />
          <MetricCard
            label="Quantité"
            value={withdrawalsCount.toString()}
            color="orange"
          />
        </div>
      </div>

      {/* Cash Balance */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          💼 Solde Caisse
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="Solde HTG"
            value={branchReportService.formatCurrency(cashBalanceHTG, 'HTG')}
            color="indigo"
            large
          />
          <MetricCard
            label="Solde USD"
            value={branchReportService.formatCurrency(cashBalanceUSD, 'USD')}
            color="indigo"
            large
          />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Sessions caisse actives: <span className="font-medium">{report.activeCashSessions ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Monthly Report View Component
const MonthlyReportView: React.FC<{ report: MonthlyBranchReportDto }> = ({ report }) => {
  const summary = computeMonthlyTotals(report);

  const totalCreditsDisbursedHTG = summary.credits.totalHTG;
  const totalCreditsDisbursedUSD = summary.credits.totalUSD;
  const totalCreditsDisbursedCount = summary.credits.count;

  const totalPaymentsReceivedHTG = summary.payments.totalHTG;
  const totalPaymentsReceivedUSD = summary.payments.totalUSD;
  const totalPaymentsReceivedCount = summary.payments.count;

  const totalDepositsHTG = summary.deposits.totalHTG;
  const totalDepositsUSD = summary.deposits.totalUSD;
  const totalDepositsCount = summary.deposits.count;

  const totalWithdrawalsHTG = summary.withdrawals.totalHTG;
  const totalWithdrawalsUSD = summary.withdrawals.totalUSD;
  const totalWithdrawalsCount = summary.withdrawals.count;

  const averageCashHTG = summary.cash.averageHTG;
  const averageCashUSD = summary.cash.averageUSD;

  return (
    <div className="space-y-6">
      {/* Branch Info */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {report.branchName}
        </h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Mois:</span>
            <span className="ml-2 font-medium">
              {new Date(report.year, report.month - 1).toLocaleString('fr-HT', {
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>
          {report.branchRegion && (
            <div>
              <span className="text-gray-600">Rejyon:</span>
              <span className="ml-2 font-medium">{report.branchRegion}</span>
            </div>
          )}
          <div>
            <span className="text-gray-600">Jours ouvrables:</span>
            <span className="ml-2 font-medium">{report.numberOfBusinessDays}</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📊 KPI</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Portfolio at Risk (PAR):</span>
              <span className={`font-bold text-lg ${
                (report.portfolioAtRisk ?? 0) < 5 ? 'text-green-600' :
                (report.portfolioAtRisk ?? 0) < 10 ? 'text-blue-600' :
                (report.portfolioAtRisk ?? 0) < 15 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {(report.portfolioAtRisk ?? 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Taux de Recouvrement:</span>
              <span className={`font-bold text-lg ${
                (report.collectionRate ?? 0) > 95 ? 'text-green-600' :
                (report.collectionRate ?? 0) > 90 ? 'text-blue-600' :
                (report.collectionRate ?? 0) > 85 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {(report.collectionRate ?? 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Average Daily Cash */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">💼 Solde Moyen</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Moyenne HTG:</span>
              <span className="font-bold text-lg text-indigo-600">
                {branchReportService.formatCurrency(averageCashHTG, 'HTG')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Moyenne USD:</span>
              <span className="font-bold text-lg text-indigo-600">
                {branchReportService.formatCurrency(averageCashUSD, 'USD')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Totals */}
      <div className="grid grid-cols-2 gap-6">
        {/* Credits */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">💰 Total Crédits</h3>
          <div className="space-y-3">
            <MetricCard
              label="HTG"
              value={branchReportService.formatCurrency(totalCreditsDisbursedHTG, 'HTG')}
              color="blue"
            />
            <MetricCard
              label="USD"
              value={branchReportService.formatCurrency(totalCreditsDisbursedUSD, 'USD')}
              color="blue"
            />
            <MetricCard
              label="Quantité"
              value={Number(totalCreditsDisbursedCount ?? 0).toString()}
              color="blue"
            />
          </div>
        </div>

        {/* Payments */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">💵 Total Paiements</h3>
          <div className="space-y-3">
            <MetricCard
              label="HTG"
              value={branchReportService.formatCurrency(totalPaymentsReceivedHTG, 'HTG')}
              color="green"
            />
            <MetricCard
              label="USD"
              value={branchReportService.formatCurrency(totalPaymentsReceivedUSD, 'USD')}
              color="green"
            />
            <MetricCard
              label="Quantité"
              value={Number(totalPaymentsReceivedCount ?? 0).toString()}
              color="green"
            />
          </div>
        </div>

        {/* Deposits */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📈 Total Dépôts</h3>
          <div className="space-y-3">
            <MetricCard
              label="HTG"
              value={branchReportService.formatCurrency(totalDepositsHTG, 'HTG')}
              color="purple"
            />
            <MetricCard
              label="USD"
              value={branchReportService.formatCurrency(totalDepositsUSD, 'USD')}
              color="purple"
            />
            <MetricCard
              label="Quantité"
              value={Number(totalDepositsCount ?? 0).toString()}
              color="purple"
            />
          </div>
        </div>

        {/* Withdrawals */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📉 Total Retraits</h3>
          <div className="space-y-3">
            <MetricCard
              label="HTG"
              value={branchReportService.formatCurrency(totalWithdrawalsHTG, 'HTG')}
              color="orange"
            />
            <MetricCard
              label="USD"
              value={branchReportService.formatCurrency(totalWithdrawalsUSD, 'USD')}
              color="orange"
            />
            <MetricCard
              label="Quantité"
              value={Number(totalWithdrawalsCount ?? 0).toString()}
              color="orange"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Metric Card Component
interface MetricCardProps {
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'red' | 'yellow';
  large?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, color, large = false }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="text-sm font-medium opacity-75 mb-1">{label}</div>
      <div className={`font-bold ${large ? 'text-2xl' : 'text-xl'}`}>{value}</div>
    </div>
  );
};

export default BranchReportDashboard;
