import React, { useState, useEffect } from 'react';
import {
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  PieChart,
  Activity,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import apiService from '../../services/apiService';
import { AccountType } from '../../types/clientAccounts';
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

const CurrentAccountReports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('summary');
  const [period, setPeriod] = useState('month');
  const [reportData, setReportData] = useState<ReportData>({});
  const [customDateRange, setCustomDateRange] = useState({ startDate: '', endDate: '' });
  const [filters, setFilters] = useState<any>({ currency: '', branchId: '', status: '', accountNumber: '', txType: '' });
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [accountsPreviewLimit, setAccountsPreviewLimit] = useState(1000);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiService.getAllBranches();
        const mapped = (data || []).map((b: any) => ({ id: Number(b.id ?? b.branchId ?? b.BranchId), name: String(b.name ?? b.branchName ?? b.BranchName ?? b.code ?? `#${b.id ?? b.branchId ?? b.BranchId}`) }))
          .filter(b => !Number.isNaN(b.id));
        setBranches(mapped);
      } catch {}
    })();
    loadReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadReportData(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [reportType, period, JSON.stringify(filters), customDateRange.startDate, customDateRange.endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Build date range
      let startDateStr: string | undefined;
      let endDateStr: string | undefined;
      if (period === 'custom' && customDateRange.startDate && customDateRange.endDate) {
        startDateStr = customDateRange.startDate;
        endDateStr = customDateRange.endDate;
      } else if (period !== 'all') {
        const endDate = new Date();
        const startDate = new Date();
        switch (period) {
          case 'day': startDate.setDate(startDate.getDate() - 1); break;
          case 'week': startDate.setDate(startDate.getDate() - 7); break;
          case 'month': startDate.setMonth(startDate.getMonth() - 1); break;
          case 'quarter': startDate.setMonth(startDate.getMonth() - 3); break;
          case 'year': startDate.setFullYear(startDate.getFullYear() - 1); break;
        }
        startDateStr = startDate.toISOString().split('T')[0];
        endDateStr = endDate.toISOString().split('T')[0];
      } else {
        const endDate = new Date();
        const startDate = new Date(2000,0,1);
        startDateStr = startDate.toISOString().split('T')[0];
        endDateStr = endDate.toISOString().split('T')[0];
      }

      if (reportType === 'summary') {
        // Get accounts (current) and a capped set of transactions
        const accounts = await apiService.getClientAccounts({ accountType: AccountType.CURRENT, branchId: filters.branchId || undefined, currency: filters.currency || undefined });
        // If an accountNumber filter is set, load its transactions; otherwise attempt to load recent transactions across a small set of accounts
        let txArray: any[] = [];
        if (filters.accountNumber && String(filters.accountNumber).trim()) {
          try {
            txArray = await apiService.getAccountTransactions(String(filters.accountNumber).trim());
          } catch (e) { txArray = []; }
        } else {
          // limit accounts to 20 to avoid heavy loads
          const list = (accounts || []).slice(0, 20);
          const txArrays = await Promise.all(list.map((a:any) => apiService.getAccountTransactions(a.accountNumber || a.AccountNumber || '')));
          txArray = ([] as any[]).concat(...txArrays);
        }

        const asArray = Array.isArray(accounts) ? accounts : [];
        const activeAccounts = asArray.filter((a:any) => (a.status || a.Status || '').toString().toUpperCase() === 'ACTIVE');
        const totalBalance = asArray.reduce((sum:number,a:any) => sum + Number(a.balance || 0), 0);
        const deposits = txArray.filter((t:any) => String(t.transactionType || t.type || '').toLowerCase().includes('deposit') || String(t.type) === '0');
        const withdrawals = txArray.filter((t:any) => String(t.transactionType || t.type || '').toLowerCase().includes('withdraw') || String(t.type) === '1');
        setReportData({
          totalAccounts: asArray.length,
          activeAccounts: activeAccounts.length,
          totalBalance,
          totalDeposits: deposits.reduce((s:number,t:any)=>s + Number(t.amount || t.Amount || 0),0),
          totalWithdrawals: withdrawals.reduce((s:number,t:any)=>s + Number(t.amount || t.Amount || 0),0),
          avgBalance: totalBalance / (asArray.length || 1),
          accounts: asArray,
          transactions: txArray
        });
      } else if (reportType === 'accounts') {
        const accounts = await apiService.getClientAccounts({ accountType: AccountType.CURRENT, branchId: filters.branchId || undefined });
        const statusOf = (s:any) => (typeof s === 'number') ? String(s) : String(s || '');
        const accountsByStatus = [
          { name: 'Actif', value: accounts.filter((a:any) => (a.status||'').toString().toUpperCase() === 'ACTIVE').length },
          { name: 'Inactif', value: accounts.filter((a:any) => (a.status||'').toString().toUpperCase() === 'INACTIVE').length },
          { name: 'Fermé', value: accounts.filter((a:any) => (a.status||'').toString().toUpperCase() === 'CLOSED').length },
          { name: 'Suspendu', value: accounts.filter((a:any) => (a.status||'').toString().toUpperCase() === 'SUSPENDED').length }
        ];
        setReportData({ accountsByStatus, accounts });
      } else if (reportType === 'transactions') {
        // If accountNumber provided, load that account's transactions; otherwise aggregate across a small set of accounts
        let transactions: any[] = [];
        if (filters.accountNumber && String(filters.accountNumber).trim()) {
          transactions = await apiService.getAccountTransactions(String(filters.accountNumber).trim());
        } else {
          const accounts = await apiService.getClientAccounts({ accountType: AccountType.CURRENT, page:1, pageSize:50 });
          const list = (accounts || []).slice(0, 30);
          const txArrays = await Promise.all(list.map((a:any) => apiService.getAccountTransactions(a.accountNumber || a.AccountNumber || '')));
          transactions = ([] as any[]).concat(...txArrays);
        }

        // Apply transaction type filter if specified
        if (filters.txType !== '') {
          const txTypeNum = Number(filters.txType);
          transactions = transactions.filter((t: any) => {
            const tType = String(t.transactionType || t.type || '').toLowerCase();
            if (txTypeNum === 0) return tType.includes('deposit') || tType === '0';
            if (txTypeNum === 1) return tType.includes('withdraw') || tType === '1';
            return true;
          });
        }

        const transactionsByType = [
          { name: 'Dépôts', value: transactions.filter((t:any) => (t.transactionType||t.type||'').toString().toLowerCase().includes('deposit') || t.type === 'Deposit').length },
          { name: 'Retraits', value: transactions.filter((t:any) => (t.transactionType||t.type||'').toString().toLowerCase().includes('withdraw') || t.type === 'Withdrawal').length }
        ];
        setReportData({ transactionsByType, transactions });
      }

    } catch (error:any) {
      const serverMsg = error?.response?.data?.message || error?.message || '';
      console.error('Error loading current account report data:', serverMsg || error);
      toast.error(`Erreur lors du chargement du rapport${serverMsg ? `: ${serverMsg}` : ''}`);
    } finally { setLoading(false); }
  };

  const statusBadgeClass = (s: any) => {
    const v = mapStatus(s);
    if (v === 'ACTIVE') return 'bg-green-100 text-green-800';
    if (v === 'INACTIVE') return 'bg-gray-100 text-gray-700';
    if (v === 'CLOSED') return 'bg-red-100 text-red-700';
    if (v === 'SUSPENDED') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-700';
  };

  const mapStatus = (s: any) => {
    if (typeof s === 'number') {
      const m: any = { 0: 'ACTIVE', 1: 'INACTIVE', 2: 'CLOSED', 3: 'SUSPENDED' };
      return m[s] || 'INACTIVE';
    }
    return String(s || '').trim().toUpperCase() || 'INACTIVE';
  };

  const fmtDate = (d:any) => { if (!d) return ''; const dt = new Date(d); if (isNaN(dt.getTime())) return ''; return dt.toLocaleDateString('fr-FR'); };

  const getPeriodLabel = () => {
    switch(period){case 'day': return 'Aujourd hui'; case 'week': return '7 derniers jours'; case 'month': return '30 derniers jours'; case 'quarter': return '3 derniers mois'; case 'year': return 'Dernière année'; case 'all': return 'Toute la période'; case 'custom': return 'Période personnalisée'; default: return '';}
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Rapports et Statistiques - Comptes Courants</h2>
          <p className="text-gray-600 mt-1">Analyses détaillées des comptes courants</p>
        </div>
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
              placeholder="Ex: CC-001234"
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
                      <p className="text-2xl font-bold mt-1">{new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(reportData.totalBalance||0)}</p>
                      <p className="text-xs mt-2 opacity-75">Moy: {new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(reportData.avgBalance||0)}</p>
                    </div>
                    <DollarSign className="h-12 w-12 opacity-80" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Activité ce mois</p>
                      <p className="text-3xl font-bold mt-1">{(reportData.totalDeposits || 0) + (reportData.totalWithdrawals || 0) > 0 ? 'Actif' : 'Faible'}</p>
                      <p className="text-xs mt-2 opacity-75">{(reportData.totalDeposits || 0) + (reportData.totalWithdrawals || 0)} transactions</p>
                    </div>
                    <TrendingUp className="h-12 w-12 opacity-80" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <ArrowUpRight className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total dépôts</p>
                      <p className="text-xl font-bold text-gray-900">{new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(reportData.totalDeposits||0)}</p>
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
                      <p className="text-xl font-bold text-gray-900">{new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(reportData.totalWithdrawals||0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reportType === 'accounts' && reportData.accountsByStatus && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="h-5 w-5 text-blue-600" />
                Comptes par statut
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {reportData.accountsByStatus.map((item:any)=>(
                  <div key={item.name} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-gray-900">{item.value}</p>
                    <p className="text-sm text-gray-600 mt-1">{item.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportType === 'accounts' && Array.isArray(reportData.accounts) && (
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(reportData.accounts as any[]).slice(0, accountsPreviewLimit).map((a:any)=>(
                    <tr key={a.id||a.accountNumber}>
                      <td className="px-4 py-2 text-sm text-gray-900 font-mono">{a.accountNumber}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                            {(a.customerName || a.customerCode || '?').toString().slice(0,2).toUpperCase()}
                          </span>
                          <span>{a.customerName || a.customerCode || a.customerId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">{a.currency}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">{Number(a.balance||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">{Number(a.availableBalance||a.balance||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusBadgeClass(a.status)}`}>{mapStatus(a.status)}</span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">{a.branchName||''}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{fmtDate(a.openedDate||a.openingDate||a.createdAt)}</td>
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
                      {(reportData.transactions as any[]).map((t:any) => (
                        <tr key={t.id || `${t.reference}-${t.accountNumber}-${t.processedAt}`}>
                          <td className="px-4 py-2 text-sm text-gray-900">{new Date(t.processedAt || t.transactionDate).toLocaleString('fr-FR')}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 font-mono">{t.reference}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{t.accountNumber}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{t.transactionType || t.type}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">{Number(t.amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{t.currency || t.Currency || 'HTG'}</td>
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

export default CurrentAccountReports;
