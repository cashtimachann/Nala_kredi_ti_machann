import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  TrendingUp, 
  DollarSign, 
  Users, 
  BarChart3, 
  PieChart, 
  Activity, 
  RefreshCw, 
  FileSpreadsheet, 
  ArrowUpRight, 
  ArrowDownLeft 
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import toast from 'react-hot-toast';

interface ReportData {
  totalAccounts?: number;
  activeAccounts?: number;
  totalBalance?: number;
  totalDeposits?: number;
  totalWithdrawals?: number;
  totalInterest?: number;
  avgBalance?: number;
  newAccountsThisMonth?: number;
  closedAccountsThisMonth?: number;
  topAccounts?: any[];
  transactionsByType?: any[];
  accountsByStatus?: any[];
  transactions?: any[];
  accounts?: any[];
}

const SavingsReports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('summary');
  const [period, setPeriod] = useState('month');
  const [reportData, setReportData] = useState<ReportData>({});
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [filters, setFilters] = useState<any>({
    currency: '',
    branchId: '',
    status: '',
    accountNumber: '',
    txType: '' // 0=Deposit,1=Withdrawal,2=Interest
  });
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  // local UI state for accounts preview (client-side paging if needed later)
  const [accountsPreviewLimit, setAccountsPreviewLimit] = useState(1000);

  useEffect(() => {
    // preload branches once
    (async () => {
      try {
        const data = await apiService.getAllBranches();
        const mapped = (data || []).map((b: any) => ({ id: Number(b.id ?? b.branchId ?? b.BranchId), name: String(b.name ?? b.branchName ?? b.BranchName ?? b.code ?? `#${b.id ?? b.branchId ?? b.BranchId}`) }))
          .filter(b => !Number.isNaN(b.id));
        setBranches(mapped);
      } catch {
        // ignore
      }
    })();
    // initial load
    loadReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, period, JSON.stringify(filters), customDateRange.startDate, customDateRange.endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Build clean params to avoid sending empty strings
      const accountsParams: any = {
        branchId: filters.branchId ? Number(filters.branchId) : undefined,
        currency: filters.currency !== '' ? Number(filters.currency) : undefined,
        status: filters.status !== '' ? Number(filters.status) : undefined,
        accountNumber: filters.accountNumber?.trim() ? filters.accountNumber.trim() : undefined
      };
      const txParamsBase: any = {
        branchId: filters.branchId ? Number(filters.branchId) : undefined,
        type: filters.txType !== '' ? Number(filters.txType) : undefined
      };
      let params: any = { ...filters };

      // Compute a robust date range for the API (always send both bounds)
      let startDateStr: string | undefined;
      let endDateStr: string | undefined;

      if (period === 'custom' && customDateRange.startDate && customDateRange.endDate) {
        startDateStr = customDateRange.startDate;
        endDateStr = customDateRange.endDate;
      } else if (period !== 'all') {
        const endDate = new Date();
        const startDate = new Date();

        switch (period) {
          case 'day':
            startDate.setDate(startDate.getDate() - 1);
            break;
          case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        }
        startDateStr = startDate.toISOString().split('T')[0];
        endDateStr = endDate.toISOString().split('T')[0];
      } else {
        // When "all" is selected, still send a very wide but explicit range to avoid backend null-handling issues
        const endDate = new Date();
        const startDate = new Date(2000, 0, 1); // Jan 1, 2000
        startDateStr = startDate.toISOString().split('T')[0];
        endDateStr = endDate.toISOString().split('T')[0];
      }
      params.startDate = startDateStr;
      params.endDate = endDateStr;

      if (reportType === 'summary') {
        let [accounts, transactions] = await Promise.all([
          apiService.getSavingsAccounts({ ...accountsParams, page: 1, pageSize: 1000 }),
          apiService.getSavingsTransactions({
            ...txParamsBase,
            accountId: undefined,
            // Always send both bounds and cap the preview size to reduce backend load
            dateFrom: startDateStr,
            dateTo: endDateStr,
            page: 1,
            pageSize: 500
          })
        ]);
        if (filters.accountNumber) {
          const q = String(filters.accountNumber).trim().toLowerCase();
          accounts = accounts.filter((a: any) => String(a.accountNumber).toLowerCase().includes(q));
          transactions = transactions.filter((t: any) => String(t.accountNumber).toLowerCase().includes(q));
        }

        const asArray = Array.isArray(accounts) ? accounts : [];
        const txArray = Array.isArray(transactions) ? transactions : [];
        const activeAccounts = asArray.filter((a: any) => {
          const st = typeof a.status === 'number' ? ({0:'Active',1:'Inactive',2:'Closed',3:'Suspended'} as any)[a.status] : a.status;
          return st === 'Active';
        });
        const totalBalance = asArray.reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);
        const deposits = txArray.filter((t: any) => String(t.type).toLowerCase().includes('deposit') || String(t.type) === '0');
        const withdrawals = txArray.filter((t: any) => String(t.type).toLowerCase().includes('withdrawal') || String(t.type) === '1');
        const interest = txArray.filter((t: any) => String(t.type).toLowerCase().includes('interest') || String(t.type) === '2');

        const thisMonth = new Date();
        const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
        const getOpenDate = (a: any) => a.openedDate || a.openingDate || a.createdAt || '';
        const getClosedDate = (a: any) => a.closedDate || a.ClosedDate || '';
        const newAccountsThisMonth = asArray.filter((a: any) => {
          const d = getOpenDate(a);
          return d ? new Date(d) >= monthStart : false;
        }).length;
        const closedAccountsThisMonth = asArray.filter((a: any) => {
          const d = getClosedDate(a);
          return d ? new Date(d) >= monthStart : false;
        }).length;

        setReportData({
          totalAccounts: accounts.length,
          activeAccounts: activeAccounts.length,
          totalBalance: totalBalance,
          totalDeposits: deposits.reduce((sum: number, t: any) => sum + t.amount, 0),
          totalWithdrawals: withdrawals.reduce((sum: number, t: any) => sum + t.amount, 0),
          totalInterest: interest.reduce((sum: number, t: any) => sum + t.amount, 0),
          avgBalance: totalBalance / (accounts.length || 1),
          newAccountsThisMonth: newAccountsThisMonth,
          closedAccountsThisMonth: closedAccountsThisMonth,
          accounts,
          transactions
        });
      } else if (reportType === 'accounts') {
        let accounts = await apiService.getSavingsAccounts({ ...accountsParams, page: 1, pageSize: 1000 });
        if (filters.accountNumber) {
          const q = String(filters.accountNumber).trim().toLowerCase();
          accounts = accounts.filter((a: any) => String(a.accountNumber).toLowerCase().includes(q));
        }
        const statusOf = (s: any) => {
          if (typeof s === 'number') return ({0:'Active',1:'Inactive',2:'Closed',3:'Suspended'} as any)[s] || 'Inactive';
          return String(s);
        };
        const accountsByStatus = [
          { name: 'Actif', value: accounts.filter((a: any) => statusOf(a.status) === 'Active').length },
          { name: 'Inactif', value: accounts.filter((a: any) => statusOf(a.status) === 'Inactive').length },
          { name: 'Fermé', value: accounts.filter((a: any) => statusOf(a.status) === 'Closed').length },
          { name: 'Suspendu', value: accounts.filter((a: any) => statusOf(a.status) === 'Suspended').length }
        ];

        setReportData({ accountsByStatus, accounts });
      } else if (reportType === 'transactions') {
        let transactions = await apiService.getSavingsTransactions({
          ...txParamsBase,
          accountId: undefined,
          // Always send both bounds and limit the preview for stability
          dateFrom: startDateStr,
          dateTo: endDateStr,
          page: 1,
          pageSize: 1000
        });
        if (filters.accountNumber) {
          const q = String(filters.accountNumber).trim().toLowerCase();
          transactions = transactions.filter((t: any) => String(t.accountNumber).toLowerCase().includes(q));
        }

        const transactionsByType = [
          { name: 'Dépôts', value: transactions.filter((t: any) => t.type === 'Deposit').length },
          { name: 'Retraits', value: transactions.filter((t: any) => t.type === 'Withdrawal').length },
          { name: 'Intérêts', value: transactions.filter((t: any) => t.type === 'Interest').length },
          { name: 'Frais', value: transactions.filter((t: any) => t.type === 'Fee').length }
        ];

        setReportData({ transactionsByType, transactions });
      }

    } catch (error: any) {
      const serverMsg = error?.response?.data?.message || error?.message || '';
      console.error('Error loading report data:', serverMsg || error);
      toast.error(`Erreur lors du chargement du rapport${serverMsg ? `: ${serverMsg}` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      toast.loading('Génération du rapport...');
      let content = '';
      let mimeType = 'text/plain';
      let extension: string = format;

      if (format === 'csv' || format === 'excel') {
        mimeType = 'text/csv';
        extension = 'csv';
        content = generateCSV();
      } else if (format === 'pdf') {
        // Use browser print-to-PDF for now
        window.print();
        toast.dismiss();
        toast.success('Utilisez la fonction Imprimer > PDF du navigateur');
        return;
      } else {
        mimeType = 'text/plain';
        extension = 'txt';
        content = generateTextReport();
      }

      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport-epargne-${reportType}-${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Rapport exporté avec succès');
    } catch (error) {
      toast.dismiss();
      toast.error('Erreur lors de l\'exportation');
    }
  };

  const generateCSV = () => {
    // Detailed export depending on report type
    if (reportType === 'transactions' && Array.isArray(reportData.transactions)) {
      const rows = reportData.transactions as any[];
      const header = ['Date','Référence','Compte','Type','Montant','Devise','Succursale','Par','Statut'];
      const lines = [header.join(',')];
      for (const t of rows) {
        const date = t.processedAt || t.transactionDate || '';
        const ref = sanitizeCsv(t.reference);
        const acc = sanitizeCsv(t.accountNumber);
        const type = mapType(t.type);
        const amt = Number(t.amount || 0).toFixed(2);
        const cur = mapCurrency(t.currency);
        const branch = sanitizeCsv(t.branchName || t.BranchName || (t.branchId ? `#${t.branchId}` : ''));
        const by = sanitizeCsv(t.processedByName || t.processedBy || '');
        const status = sanitizeCsv(t.status || '');
        lines.push([date, ref, acc, type, amt, cur, branch, by, status].join(','));
      }
      return lines.join('\n');
    }
    if (reportType === 'accounts' && Array.isArray(reportData.accounts)) {
      const rows = reportData.accounts as any[];
      const header = ['Compte','Client','Devise','Solde','Solde dispo','Statut','Succursale','Ouverture'];
      const lines = [header.join(',')];
      for (const a of rows) {
        const acc = sanitizeCsv(a.accountNumber);
        const client = sanitizeCsv(a.customerName || a.customerCode || a.customerId);
        const cur = mapCurrency(a.currency);
        const bal = Number(a.balance || 0).toFixed(2);
        const avail = Number(a.availableBalance || a.balance || 0).toFixed(2);
        const status = sanitizeCsv(a.status || '');
        const branch = sanitizeCsv(a.branchName || (a.branchId ? `#${a.branchId}` : ''));
        const opened = a.openedDate || a.openingDate || a.createdAt || '';
        lines.push([acc, client, cur, bal, avail, status, branch, opened].join(','));
      }
      return lines.join('\n');
    }
    // Summary as fallback
    let csv = 'Type de Rapport,Valeur\n';
    csv += `Période,${getPeriodLabel()}\n`;
    csv += `Total des comptes,${reportData.totalAccounts || 0}\n`;
    csv += `Comptes actifs,${reportData.activeAccounts || 0}\n`;
    csv += `Solde total,${reportData.totalBalance || 0}\n`;
    csv += `Total dépôts,${reportData.totalDeposits || 0}\n`;
    csv += `Total retraits,${reportData.totalWithdrawals || 0}\n`;
    csv += `Intérêts payés,${reportData.totalInterest || 0}\n`;
    return csv;
  };

  const sanitizeCsv = (v: any) => {
    const s = String(v ?? '').replaceAll('"', '""');
    if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s}"`;
    return s;
  };

  const mapCurrency = (c: any) => {
    const s = String(c).toUpperCase();
    if (s === '0' || s === 'HTG') return 'HTG';
    if (s === '1' || s === 'USD') return 'USD';
    return s;
  };

  const mapType = (t: any) => {
    const s = String(t).trim().toLowerCase().replace(/\s+/g, '');
    if (s === '0' || s === 'deposit') return 'Dépôt';
    if (s === '1' || s === 'withdrawal') return 'Retrait';
    if (s === '2' || s === 'interest') return 'Intérêt';
    return String(t);
  };

  const mapStatus = (s: any) => {
    if (typeof s === 'number') {
      const m: any = { 0: 'Active', 1: 'Inactive', 2: 'Closed', 3: 'Suspended' };
      return m[s] || 'Inactive';
    }
    return String(s || '').trim() || 'Inactive';
  };

  const statusBadgeClass = (s: any) => {
    const v = mapStatus(s);
    if (v === 'Active') return 'bg-green-100 text-green-800';
    if (v === 'Inactive') return 'bg-gray-100 text-gray-700';
    if (v === 'Closed') return 'bg-red-100 text-red-700';
    if (v === 'Suspended') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-700';
  };

  const fmtDate = (d: any) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('fr-FR');
  };

  const generateTextReport = () => {
    let report = '=== RAPPORT ÉPARGNE ===\n\n';
    report += `Type: ${reportType}\n`;
    report += `Période: ${getPeriodLabel()}\n`;
    report += `Date: ${new Date().toLocaleString('fr-FR')}\n\n`;
    report += `--- STATISTIQUES ---\n`;
    report += `Total des comptes: ${reportData.totalAccounts || 0}\n`;
    report += `Comptes actifs: ${reportData.activeAccounts || 0}\n`;
    report += `Solde total: ${formatCurrency(reportData.totalBalance || 0)}\n`;
    report += `Total dépôts: ${formatCurrency(reportData.totalDeposits || 0)}\n`;
    report += `Total retraits: ${formatCurrency(reportData.totalWithdrawals || 0)}\n`;
    report += `Intérêts payés: ${formatCurrency(reportData.totalInterest || 0)}\n`;
    return report;
  };

  const formatCurrency = (amount: number, currency: string = 'HTG') => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' ' + currency;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'day': return 'Aujourd\'hui';
      case 'week': return '7 derniers jours';
      case 'month': return '30 derniers jours';
      case 'quarter': return '3 derniers mois';
      case 'year': return 'Dernière année';
      case 'all': return 'Toute la période';
      case 'custom': return 'Période personnalisée';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Rapports et Statistiques</h2>
          <p className="text-gray-600 mt-1">Analyses détaillées des comptes d épargne</p>
        </div>
        {/* Export buttons removed from Rapports tab as requested */}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de rapport</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="summary">Résumé général</option>
              <option value="accounts">Rapport des comptes</option>
              <option value="transactions">Rapport des transactions</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="day">Aujourd hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">30 derniers jours</option>
              <option value="quarter">3 derniers mois</option>
              <option value="year">Dernière année</option>
              <option value="all">Toute la période</option>
              <option value="custom">Personnalisée</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
            <select
              value={filters.currency}
              onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes</option>
              <option value="0">HTG</option>
              <option value="1">USD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">N° de compte</label>
            <input
              type="text"
              value={filters.accountNumber}
              onChange={(e) => setFilters({ ...filters, accountNumber: e.target.value })}
              placeholder="Ex: 200100000001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Succursale</label>
            <select
              value={filters.branchId}
              onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          {reportType === 'transactions' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de transaction</label>
              <select
                value={filters.txType}
                onChange={(e) => setFilters({ ...filters, txType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous</option>
                <option value="0">Dépôt</option>
                <option value="1">Retrait</option>
                <option value="2">Intérêt</option>
              </select>
            </div>
          )}
          <div className="flex items-end">
            <button
              onClick={loadReportData}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {period === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
              <input
                type="date"
                value={customDateRange.startDate}
                onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
              <input
                type="date"
                value={customDateRange.endDate}
                onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {reportType === 'summary' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">Période: {getPeriodLabel()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Total des comptes</p>
                      <p className="text-3xl font-bold mt-1">{reportData.totalAccounts || 0}</p>
                      <p className="text-xs mt-2 opacity-75">{reportData.activeAccounts || 0} actifs</p>
                    </div>
                    <Users className="h-12 w-12 opacity-80" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Solde total</p>
                      <p className="text-2xl font-bold mt-1">{formatCurrency(reportData.totalBalance || 0)}</p>
                      <p className="text-xs mt-2 opacity-75">Moy: {formatCurrency(reportData.avgBalance || 0)}</p>
                    </div>
                    <DollarSign className="h-12 w-12 opacity-80" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Nouveaux ce mois</p>
                      <p className="text-3xl font-bold mt-1">{reportData.newAccountsThisMonth || 0}</p>
                      <p className="text-xs mt-2 opacity-75">Fermés: {reportData.closedAccountsThisMonth || 0}</p>
                    </div>
                    <TrendingUp className="h-12 w-12 opacity-80" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <ArrowUpRight className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total dépôts</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.totalDeposits || 0)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <ArrowDownLeft className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total retraits</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.totalWithdrawals || 0)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Intérêts payés</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.totalInterest || 0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reportType === 'accounts' && (
            <div className="space-y-6">
              {/* Summary chips */}
              {/* Removed summary chips as requested */}
              {/* Removed Top 10 block as requested */}

              {reportData.accountsByStatus && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-blue-600" />
                    Comptes par statut
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {reportData.accountsByStatus.map((item: any) => (
                      <div key={item.name} className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-3xl font-bold text-gray-900">{item.value}</p>
                        <p className="text-sm text-gray-600 mt-1">{item.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed accounts table */}
              {Array.isArray(reportData.accounts) && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Liste des comptes</h3>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Compte</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Devise</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Solde</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Solde dispo</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Succursale</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ouverture</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dernière txn</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(reportData.accounts as any[]).slice(0, accountsPreviewLimit).map((a: any) => (
                        <tr key={a.id || a.accountNumber}>
                          <td className="px-4 py-2 text-sm text-gray-900 font-mono">{a.accountNumber}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                {(a.customerName || a.customerCode || '?').toString().slice(0,2).toUpperCase()}
                              </span>
                              <span>{a.customerName || a.customerCode || a.customerId}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">{mapCurrency(a.currency)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">{Number(a.balance || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">{Number(a.availableBalance || a.balance || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`text-xs px-2 py-1 rounded-full ${statusBadgeClass(a.status)}`}>{mapStatus(a.status)}</span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">{a.branchName || (a.branchId ? `#${a.branchId}` : '')}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{fmtDate(a.openedDate || a.openingDate || a.createdAt)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{fmtDate(a.lastTransactionDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {Array.isArray(reportData.accounts) && (reportData.accounts as any[]).length > accountsPreviewLimit && (
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={() => setAccountsPreviewLimit(l => l + 1000)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        Afficher plus
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {reportType === 'transactions' && reportData.transactionsByType && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Transactions par type
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {reportData.transactionsByType.map((item: any) => (
                    <div key={item.name} className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <p className="text-4xl font-bold text-blue-900">{item.value}</p>
                      <p className="text-sm text-blue-700 mt-2 font-medium">{item.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              {Array.isArray(reportData.transactions) && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Aperçu détaillé</h3>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date/Heure</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Compte</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Devise</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Succursale</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Par</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(reportData.transactions as any[]).map((t: any) => (
                        <tr key={t.id || `${t.reference}-${t.accountNumber}-${t.processedAt}`}>
                          <td className="px-4 py-2 text-sm text-gray-900">{new Date(t.processedAt || t.transactionDate).toLocaleString('fr-FR')}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 font-mono">{t.reference}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{t.accountNumber}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{mapType(t.type)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">{Number(t.amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{mapCurrency(t.currency)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{t.branchName || t.BranchName || (t.branchId ? `#${t.branchId}` : '')}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{t.processedByName || t.processedBy || ''}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{t.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SavingsReports;