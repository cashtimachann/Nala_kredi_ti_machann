import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, CheckCircle, DollarSign, Calendar, TrendingUp, FileText, Download, ArrowUpDown, Calculator, RotateCw, AlertCircle, XCircle, Printer, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Filter, Users, Eye, Edit2, Building2, User, X, TrendingDown, Loader, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { unparse } from 'papaparse';
import * as XLSX from 'xlsx';
import 'jspdf-autotable';
import apiService from '../../services/apiService';
import savingsCustomerService from '../../services/savingsCustomerService';
import clientAccountCustomerLoader from '../../services/clientAccountCustomerLoader';
import ClientCreationForm from './ClientCreationForm';
import ClientEditForm from './ClientEditForm';
import DocumentUploadModal from './DocumentUploadModal';
import { exportClientsPdf } from './exportClientPdf';
import {
  AccountType,
  ClientAccount,
  ClientAccountStats,
  TermSavingsType,
  getTermTypeLabel,
  getMonthlyInterestRatePercent,
  getTermMonthlyInterestPercent,
  AccountTransaction,
  computeTermProjectedInterest,
  computeAccruedInterestByDays,
  getTermMonths
} from '../../types/clientAccounts';
import { parseGender, genderLabel } from '../../utils/gender';
import jsPDF from 'jspdf';

const CODE_PATTERN = /^[A-Z]{2}\d{3,}$/; // e.g., TD5765

const TermSavingsManagement: React.FC = () => {
  const [tab, setTab] = useState<'overview' | 'clients' | 'accounts' | 'transactions'>('overview');
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [stats, setStats] = useState<ClientAccountStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState(''); // debounced search input
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'HTG' | 'USD'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CLOSED'>('');
  const [termFilter, setTermFilter] = useState<'ALL' | TermSavingsType>('ALL');
  const [branchFilter, setBranchFilter] = useState<number | undefined>(undefined);
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [selected, setSelected] = useState<ClientAccount | null>(null);
  const [initialCustomerForOpen, setInitialCustomerForOpen] = useState<any | null>(null);
  const [txModalAccount, setTxModalAccount] = useState<ClientAccount | null>(null);
  const [txList, setTxList] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Sorting and pagination
  const [sortKey, setSortKey] = useState<keyof ClientAccount | 'computedRate' | 'computedMaturity'>('openingDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Upcoming maturities pagination
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [upcomingPageSize, setUpcomingPageSize] = useState(10);

  // Load branches for the branch filter dropdown
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await apiService.getAllBranches();
        if (!mounted) return;
        const mapped = (list || []).map((b: any) => ({ 
          id: b.id ?? b.branchId, 
          name: b.name || b.branchName || b.displayName || String(b.id) 
        }));
        setBranches(mapped);
      } catch (err) {
        console.error('Error loading branches:', err);
        setBranches([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      // Load all term savings accounts without filters for client-side filtering
      const data = await apiService.getTermSavingsAccounts({
        page: 1,
        pageSize: 1000
      });
      
      const rawList: any[] = data?.accounts || data?.Accounts || (Array.isArray(data) ? data : []);
      
      console.log('📦 Raw TermSavingsAccount data:', rawList[0]);
      
      // Helper functions to map backend enums to frontend strings
      const mapCurrency = (curr: any): 'HTG' | 'USD' => {
        if (typeof curr === 'string') return curr as 'HTG' | 'USD';
        // Backend sends: 0 = HTG, 1 = USD
        return curr === 0 || curr === 'HTG' ? 'HTG' : 'USD';
      };
      
      const mapStatus = (status: any): 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'SUSPENDED' => {
        // Handle string status - normalize to uppercase
        if (typeof status === 'string') {
          const normalized = status.toUpperCase();
          if (['ACTIVE', 'INACTIVE', 'CLOSED', 'SUSPENDED'].includes(normalized)) {
            return normalized as 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'SUSPENDED';
          }
        }
        // Backend sends: 0 = Active, 1 = Inactive, 2 = Closed, 3 = Suspended
        switch(status) {
          case 0: return 'ACTIVE';
          case 1: return 'INACTIVE';
          case 2: return 'CLOSED';
          case 3: return 'SUSPENDED';
          default: return 'ACTIVE';
        }
      };
      
      const mapTermType = (termType: any): any => {
        if (typeof termType === 'string') return termType;
        // Backend sends: 0 = THREE_MONTHS, 1 = SIX_MONTHS, 2 = TWELVE_MONTHS, 3 = TWENTY_FOUR_MONTHS
        switch(termType) {
          case 0: return TermSavingsType.THREE_MONTHS;
          case 1: return TermSavingsType.SIX_MONTHS;
          case 2: return TermSavingsType.TWELVE_MONTHS;
          case 3: return TermSavingsType.TWENTY_FOUR_MONTHS;
          default: return undefined;
        }
      };
      
      const fetched = rawList.map((dto: any) => ({
        id: dto.id,
        accountNumber: dto.accountNumber,
        accountType: AccountType.TERM_SAVINGS,
        customerId: dto.customerId || '',
        customerName: dto.customerName || '',
        customerPhone: dto.customerPhone || '',
        branchId: dto.branchId,
        branchName: dto.branchName || '',
        currency: mapCurrency(dto.currency),
        balance: dto.balance,
        availableBalance: dto.availableBalance,
        status: mapStatus(dto.status),
        openingDate: dto.openingDate,
        maturityDate: dto.maturityDate,
        lastTransactionDate: dto.lastTransactionDate,
        termType: mapTermType(dto.termType), // This is the important field!
        interestRate: dto.interestRate,
        interestRateMonthly: dto.interestRateMonthly,
        accruedInterest: dto.accruedInterest,
        lastInterestCalculation: dto.lastInterestCalculation,
        earlyWithdrawalPenalty: dto.earlyWithdrawalPenalty,
        createdAt: dto.createdAt,
        updatedAt: dto.updatedAt,
        closedAt: dto.closedAt,
        closedBy: dto.closedBy,
        closureReason: dto.closureReason
      } as ClientAccount));
      setAccounts(fetched);
      // Enrich accounts that are missing customerName by fetching customer profiles
      try {
        // First try by customerId for accounts missing customerName
        const idsToFetch = Array.from(new Set(fetched.filter(a => !a.customerName && a.customerId).map(a => String(a.customerId))));
        // Also try by phone for accounts without customerId
        const phonesToFetch = Array.from(new Set(fetched.filter(a => !a.customerName && !a.customerId && a.customerPhone).map(a => String(a.customerPhone))));

        const custMap = new Map<string, any>();

        if (idsToFetch.length) {
          const customers = await Promise.all(idsToFetch.map(id => savingsCustomerService.getCustomer(String(id)).catch(err => { console.warn('Failed to fetch customer by id', id, err); return null; })));
          customers.forEach(c => { if (c && c.id) custMap.set(String(c.id), c); });
        }

        if (phonesToFetch.length) {
          const customersByPhone = await Promise.all(phonesToFetch.map(p => savingsCustomerService.getCustomerByPhone(String(p)).catch(err => { console.warn('Failed to fetch customer by phone', p, err); return null; })));
          customersByPhone.forEach(c => { if (c && c.id) {
            custMap.set(String(c.id), c);
            // also map by phone for quick lookup
            if (c.contact?.primaryPhone) custMap.set(String(c.contact.primaryPhone), c);
            if ((c as any).primaryPhone) custMap.set(String((c as any).primaryPhone), c);
          }});
        }

        const enriched = fetched.map(a => {
          // prefer lookup by id, then by phone
          const byId = a.customerId ? custMap.get(String(a.customerId)) : null;
          const byPhone = !byId && a.customerPhone ? custMap.get(String(a.customerPhone)) : null;
          const c = byId || byPhone;
          if (c) {
            const name = c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || a.customerName;
            return { ...a, customerName: name, customerPhone: a.customerPhone || c.contact?.primaryPhone || c.primaryPhone || a.customerPhone };
          }
          return a;
        });
        setAccounts(enriched);
      } catch (enrichErr) {
        console.warn('Error enriching accounts with customer data', enrichErr);
      }
      const s = await apiService.getClientAccountStats();
      setStats(s);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement des comptes à terme");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Debounce search input to avoid excessive re-rendering while typing
  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const filtered = useMemo(() => {
    return (accounts || []).filter(a => {
      const matchesSearch = !searchTerm ||
        a.accountNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCurrency = currencyFilter === 'ALL' || a.currency === currencyFilter;
      const matchesStatus = !statusFilter || (a.status || '').toUpperCase() === statusFilter.toUpperCase();
      const matchesTerm = termFilter === 'ALL' || a.termType === termFilter;
      const matchesBranch = !branchFilter || a.branchId === branchFilter;
      const matchesMin = !minAmount || a.balance >= Number(minAmount);
      const matchesMax = !maxAmount || a.balance <= Number(maxAmount);
      return matchesSearch && matchesCurrency && matchesStatus && matchesTerm && matchesBranch && matchesMin && matchesMax;
    });
  }, [accounts, searchTerm, currencyFilter, statusFilter, termFilter, branchFilter, minAmount, maxAmount]);

  const sorters: Record<string, (a: ClientAccount) => any> = {
    accountNumber: (a) => a.accountNumber || '',
    customerName: (a) => (a.customerName || '').toLowerCase(),
    branchName: (a) => (a.branchName || '').toLowerCase(),
    currency: (a) => a.currency,
    balance: (a) => a.balance,
    termType: (a) => a.termType || '',
    interestRate: (a) => a.interestRate ?? getTermMonthlyInterestPercent(a.termType!, a.currency),
    openingDate: (a) => new Date(a.openingDate).getTime(),
    maturityDate: (a) => a.maturityDate ? new Date(a.maturityDate).getTime() : 0,
  };

  const sorted = useMemo(() => {
    const key = sortKey === 'computedRate' ? 'interestRate' : (sortKey === 'computedMaturity' ? 'maturityDate' : sortKey);
    const getter = sorters[key as string] || ((a: ClientAccount) => a.accountNumber);
    const arr = [...filtered].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  useEffect(() => { setPage(1); }, [searchTerm, currencyFilter, statusFilter, sortKey, sortDir, pageSize]);

  // Reset upcoming page when accounts change
  useEffect(() => { setUpcomingPage(1); }, [accounts.length]);

  // Helper: compute days until maturity (can be negative for overdue)
  const daysUntil = (maturityDate?: string) => {
    if (!maturityDate) return '-';
    const m = new Date(maturityDate);
    const now = new Date();
    const diff = Math.ceil((m.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    // return as string (negative allowed for overdue)
    return `${diff}`;
  };

  // Return upcoming maturities (term accounts only) sorted asc
  const getUpcomingMaturities = (accounts: ClientAccount[]) => {
    return (accounts || [])
      .filter(a => a.termType != null && a.maturityDate)
      .map(a => ({ ...a, days: parseInt(daysUntil(a.maturityDate) as string) }))
      .sort((x, y) => Number(x.days) - Number(y.days));
  };

  // Compute upcoming maturities pagination
  const allUpcoming = useMemo(() => getUpcomingMaturities(accounts), [accounts]);
  const upcomingTotalPages = Math.max(1, Math.ceil(allUpcoming.length / upcomingPageSize));
  const upcomingPaged = useMemo(() => {
    const start = (upcomingPage - 1) * upcomingPageSize;
    return allUpcoming.slice(start, start + upcomingPageSize);
  }, [allUpcoming, upcomingPage, upcomingPageSize]);

  const countByCurrency = (cur: 'HTG' | 'USD') => accounts.filter(a => a.currency === cur).length;

  const formatCurrency = (amount: number, currency: 'HTG' | 'USD') => {
    if (currency === 'HTG') {
      return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' HTG';
    }
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  };

  const toggleSort = (key: keyof ClientAccount | 'interestRate' | 'maturityDate' | 'balance' | 'termType' | 'customerName' | 'branchName' | 'accountNumber' | 'currency') => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key as any);
      setSortDir('asc');
    }
  };

  const sortingHeader = (label: string, key: keyof ClientAccount | 'interestRate' | 'maturityDate' | 'balance' | 'termType' | 'customerName' | 'branchName' | 'accountNumber' | 'currency', align: 'left' | 'right' = 'left') => (
    <th
      className={`px-6 py-3 text-${align} text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer select-none`}
      onClick={() => toggleSort(key)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-4 w-4 ${sortKey === key ? 'text-blue-600' : 'text-gray-400'}`} />
      </span>
    </th>
  );

  const exportCsv = (rows: ClientAccount[]) => {
    try {
      const columns = [
        'Numéro', 'Client', 'Téléphone', 'Succursale', 'Devise', 'Solde', 'Terme', 'Taux(%) / mois', 'Échéance', 'Statut'
      ];
      const lines = [columns.join(',')];
      rows.forEach((a) => {
        const vals = [
          a.accountNumber,
          (a.customerName || '').replaceAll(',', ' '),
          (a.customerPhone || ''),
          (a.branchName || '').replaceAll(',', ' '),
          a.currency,
          String(a.balance),
          a.termType ? getTermTypeLabel(a.termType) : '',
          a.interestRate !== undefined ? getMonthlyInterestRatePercent({ interestRate: Number(a.interestRate), interestRateMonthly: (a as any).interestRateMonthly, termType: a.termType }).toFixed(2) : getMonthlyInterestRatePercent({ interestRate: getTermMonthlyInterestPercent(a.termType || TermSavingsType.TWELVE_MONTHS, a.currency), termType: a.termType, isMonthlyPercent: true }).toFixed(2),
          a.maturityDate ? new Date(a.maturityDate).toISOString().split('T')[0] : '',
          a.status
        ];
        lines.push(vals.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','));
      });
      const blob = new Blob(["\ufeff" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `term-savings-${date}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV export error', e);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportPdf = (rows: ClientAccount[]) => {
    try {
      const html = `<!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Comptes à Terme - Export</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { font-size: 18px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; }
          th { background: #f5f5f5; text-align: left; }
        </style>
      </head>
      <body>
        <h1>Comptes d'Épargne à Terme</h1>
        <table>
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Client</th>
              <th>Succursale</th>
              <th>Devise</th>
              <th>Solde</th>
              <th>Terme</th>
              <th>Taux(%) / mois</th>
              <th>Échéance</th>
              <th>Jours restants</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(a => `
              <tr>
                <td>${a.accountNumber || ''}</td>
                <td>${(a.customerName || '').replaceAll('<','&lt;')}</td>
                <td>${(a.branchName || '').replaceAll('<','&lt;')}</td>
                <td>${a.currency}</td>
                <td>${a.balance}</td>
                <td>${a.termType ? getTermTypeLabel(a.termType) : ''}</td>
                <td>${a.interestRate !== undefined ? (getMonthlyInterestRatePercent({ interestRate: Number(a.interestRate), interestRateMonthly: (a as any).interestRateMonthly, termType: a.termType }).toFixed(2)) : ''}</td>
                <td>${a.maturityDate ? new Date(a.maturityDate).toLocaleDateString('fr-FR') : ''}</td>
                <td>${daysUntil(a.maturityDate)}</td>
                <td>${a.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>window.onload = function(){ window.print(); setTimeout(() => window.close(), 300); }</script>
      </body>
      </html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) toast.error('Impossible d\'ouvrir la fenêtre d\'impression');
    } catch (e) {
      console.error('PDF export error', e);
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  const exportExcel = (rows: ClientAccount[]) => {
    try {
      const data = rows.map((a) => ({
        Numéro: a.accountNumber,
        Client: a.customerName || '',
        Téléphone: a.customerPhone || '',
        Succursale: a.branchName || '',
        Devise: a.currency,
        Solde: a.balance,
        Terme: a.termType ? getTermTypeLabel(a.termType) : '',
        'Taux(%) / mois': a.interestRate !== undefined
          ? getMonthlyInterestRatePercent({ interestRate: Number(a.interestRate), interestRateMonthly: (a as any).interestRateMonthly, termType: a.termType }).toFixed(2)
          : getMonthlyInterestRatePercent({ interestRate: getTermMonthlyInterestPercent(a.termType || TermSavingsType.TWELVE_MONTHS, a.currency), termType: a.termType, isMonthlyPercent: true }).toFixed(2),
        Échéance: a.maturityDate ? new Date(a.maturityDate).toLocaleDateString('fr-FR') : '',
        Statut: a.status
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Maturités');
      const filename = `term-savings-${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success('Export XLSX prêt');
    } catch (e) {
      console.error('XLSX export error', e);
      toast.error('Erreur lors de l\'export XLSX');
    }
  };

  

  const exportMaturitiesCsv = (accounts: ClientAccount[]) => {
    try {
  const rows = getUpcomingMaturities(accounts);
  const headers = ['Numéro','Client','Téléphone','Succursale','Devise','Solde','Terme','Taux(%) / mois','Échéance','Jours restants'];
      const lines = [headers.join(',')];
      rows.forEach(a => {
        const vals = [
          a.accountNumber,
          (a.customerName || '').replaceAll(',',' '),
          (a.customerPhone || ''),
          (a.branchName || '').replaceAll(',',' '),
          a.currency,
          String(a.balance),
          a.termType ? getTermTypeLabel(a.termType) : '',
          a.interestRate !== undefined ? getMonthlyInterestRatePercent({ interestRate: Number(a.interestRate), interestRateMonthly: (a as any).interestRateMonthly, termType: a.termType }).toFixed(2) : '',
          a.maturityDate ? new Date(a.maturityDate).toISOString().split('T')[0] : '',
          String(daysUntil(a.maturityDate))
        ];
        lines.push(vals.map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(','));
      });
      const blob = new Blob(["\ufeff" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `term-maturities-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export maturities CSV error', e);
      toast.error('Erreur lors de l\'export des échéances');
    }
  };

  // KPI component for Term specific metrics
  const TermKpiAccounts: React.FC<{ accounts: ClientAccount[] }> = ({ accounts }) => {
    const now = new Date();
    const termAccounts = (accounts || []).filter(a => a.termType != null);
    const inDays = (d: string) => Math.ceil((new Date(d).getTime() - now.getTime()) / (1000*60*60*24));
    const maturing7 = termAccounts.filter(a => a.maturityDate && inDays(a.maturityDate) >= 0 && inDays(a.maturityDate) <= 7).length;
    const maturing30 = termAccounts.filter(a => a.maturityDate && inDays(a.maturityDate) >= 0 && inDays(a.maturityDate) <= 30).length;
    const matured = termAccounts.filter(a => a.maturityDate && inDays(a.maturityDate) < 0).length;
    const avgRate = (() => {
      const rates = termAccounts.map(a => Number(a.interestRate ?? getTermMonthlyInterestPercent(a.termType || TermSavingsType.TWELVE_MONTHS, a.currency)));
      if (!rates.length) return 0;
      return rates.reduce((s, r) => s + r, 0) / rates.length;
    })();
    const totalBalance = termAccounts.reduce((s, a) => s + (a.balance || 0), 0);

    return (
      <>
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-6 rounded-xl text-white shadow-lg">
          <div>
            <p className="text-sm opacity-90">À échéance sous 7 jours</p>
            <p className="text-2xl font-bold">{maturing7}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-6 rounded-xl text-white shadow-lg">
          <div>
            <p className="text-sm opacity-90">À échéance sous 30 jours</p>
            <p className="text-2xl font-bold">{maturing30}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl text-white shadow-lg">
          <div>
            <p className="text-sm opacity-90">Déjà échus</p>
            <p className="text-2xl font-bold">{matured}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-violet-500 to-violet-600 p-6 rounded-xl text-white shadow-lg">
          <div>
            <p className="text-sm opacity-90">Taux moyen (mensuel)</p>
            <p className="text-2xl font-bold">{((avgRate * 100) / 12).toFixed(2)}%</p>
            <p className="text-xs mt-1 opacity-75">Solde total: {new Intl.NumberFormat('fr-FR').format(totalBalance)}</p>
          </div>
        </div>
      </>
    );
  };

  const applyMaturityQuickFilter = (days: number) => {
    const now = new Date();
    const list = (accounts || []).filter(a => {
      if (!a.maturityDate) return false;
      const m = new Date(a.maturityDate);
      const diff = Math.ceil((m.getTime() - now.getTime()) / (1000*60*60*24));
      if (days === 0) return diff < 0; // already matured
      return diff >= 0 && diff <= days;
    });
    // Narrow search to customer names of filtered to give a quick shortcut
    // If many, just clear search and set a toast
    if (list.length === 0) {
      toast('Aucune échéance correspondante');
      return;
    }
  setSearchInput('');
  setSearchTerm('');
    setStatusFilter('');
    setCurrencyFilter('ALL');
    setTermFilter('ALL');
    // Move to first page and show only filtered via a temp overlay? Simplify: set min/max range
    // Just inform user and rely on column sort + visual scan
    toast.success(`${list.length} compte(s) arrivent à échéance sous ${days === 0 ? '0' : days} jours`);
    // Optional: auto-sort by maturity date asc
    setSortKey('maturityDate' as any);
    setSortDir('asc');
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setCurrencyFilter('ALL');
    setStatusFilter('');
    setTermFilter('ALL');
    setBranchFilter(undefined);
    setMinAmount('');
    setMaxAmount('');
    setSortKey('openingDate');
    setSortDir('desc');
    setPage(1);
  };

  const openTransactions = async (account: ClientAccount) => {
    try {
      setTxModalAccount(account);
      setTxLoading(true);
      const list = await apiService.getAccountTransactions(account.accountNumber || '');
      setTxList(list || []);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors du chargement des transactions');
    } finally {
      setTxLoading(false);
    }
  };

  const calculateInterestInline = (account: ClientAccount) => {
    const monthlyRate = getMonthlyInterestRatePercent({ 
      interestRate: Number(account.interestRate), 
      interestRateMonthly: account.interestRateMonthly, 
      termType: account.termType 
    });
    const principal = Number(account.balance || 0);
    const projectedInterest = computeTermProjectedInterest(principal, monthlyRate, account.termType);
    toast.success(`Intérêt projeté: ${projectedInterest.toFixed(2)} ${account.currency}`);
  };

  const processQuickRenew = async (account: ClientAccount) => {
    if (!window.confirm(`Confirmer le renouvellement du compte ${account.accountNumber} ?`)) return;
    const loadingId = toast.loading('Renouvellement en cours...');
    try {
      // Try to call backend renew endpoint. If backend not implemented, error will be handled below.
      await apiService.renewTermSavingsAccount(String(account.id || account.accountNumber));
      toast.dismiss(loadingId);
      toast.success('Renouvellement effectué');
      // Refresh list
      await load();
    } catch (e: any) {
      toast.dismiss(loadingId);
      const status = e?.response?.status;
      // If backend route not present or not ready, show consistent not-ready message
      if (status === 404 || status === 501 || status === 400) {
        toast((t) => (
          <div className="text-sm">
            <p className="font-semibold">Renouvellement</p>
            <p>Cette action sera disponible lorsque l'API backend sera prête.</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 border rounded">Fermer</button>
            </div>
          </div>
        ));
        return;
      }

      const msg = e?.response?.data?.message || e?.message || 'Erreur lors du renouvellement';
      toast.error(msg);
    }
  };

  const processEarlyClose = (account: ClientAccount) => {
    // Open a prompt to enter penalty percentage (simple simulation)
  const pct = window.prompt('Entrez le pourcentage de pénalité (%) à appliquer (ex: 2):', '2');
    if (!pct) return;
    const p = Number(pct);
    if (isNaN(p)) { toast.error('Pourcentage invalide'); return; }
    const penalty = Number(account.balance || 0) * (p / 100);
    const payout = Number(account.balance || 0) - penalty;
    toast.success(`Pénalité: ${penalty.toFixed(2)} ${account.currency} • Net: ${payout.toFixed(2)} ${account.currency}`);
  };

  const handleCloseAccount = async (account: ClientAccount) => {
    // Check if account has matured
    const today = new Date();
    const maturityDate = account.maturityDate ? new Date(account.maturityDate) : null;
    const hasMatured = maturityDate ? today >= maturityDate : false;
    
    if (!hasMatured && maturityDate) {
      // Account not yet matured - offer early withdrawal with penalty
      const daysRemaining = Math.ceil((maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const penaltyPct = window.prompt(
        `Ce compte arrive à échéance dans ${daysRemaining} jours.\n\nPour un retrait anticipé, entrez le pourcentage de pénalité (%) à appliquer (ex: 2):`,
        '2'
      );
      
      if (!penaltyPct) return;
      
      const penalty = Number(penaltyPct);
      if (isNaN(penalty) || penalty < 0) {
        toast.error('Pourcentage de pénalité invalide');
        return;
      }
      
      const penaltyAmount = Number(account.balance || 0) * (penalty / 100);
      const netAmount = Number(account.balance || 0) - penaltyAmount;
      
      const reason = window.prompt(
        `Retrait anticipé du compte ${account.accountNumber}\n\nBalance: ${account.balance} ${account.currency}\nPénalité (${penalty}%): ${penaltyAmount.toFixed(2)} ${account.currency}\nMontant net: ${netAmount.toFixed(2)} ${account.currency}\n\nEntrez la raison:`,
        'Retrait anticipé à la demande du client'
      );
      
      if (!reason) {
        toast.error('La raison est obligatoire');
        return;
      }
      
      if (!window.confirm(`Confirmer le retrait anticipé?\n\nPénalité: ${penaltyAmount.toFixed(2)} ${account.currency}\nNet: ${netAmount.toFixed(2)} ${account.currency}\n\nCette action est irréversible.`)) {
        return;
      }
      
      setLoading(true);
      try {
        await apiService.closeTermSavingsAccount(String(account.id), reason, penalty);
        toast.success(`Compte ${account.accountNumber} fermé avec pénalité de ${penalty}%`);
        await load();
      } catch (error: any) {
        console.error('Error closing account with penalty:', error);
        const msg = error?.response?.data?.message || error?.message || 'Erreur lors de la fermeture anticipée';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    } else {
      // Account has matured - normal closure
      const reason = window.prompt(
        `Fermeture du compte ${account.accountNumber} de ${account.customerName}\n\nBalance actuelle: ${account.balance} ${account.currency}\n${hasMatured ? 'Compte arrivé à échéance' : ''}\n\nEntrez la raison de la fermeture:`,
        hasMatured ? 'Arrivée à échéance' : 'Fermeture demandée par le client'
      );
      
      if (!reason) {
        toast.error('La raison de fermeture est obligatoire');
        return;
      }
      
      if (!window.confirm(`Confirmer la fermeture du compte ${account.accountNumber}?\n\nRaison: ${reason}\n\nCette action est irréversible.`)) {
        return;
      }
      
      setLoading(true);
      try {
        await apiService.closeTermSavingsAccount(String(account.id), reason);
        toast.success(`Compte ${account.accountNumber} fermé avec succès`);
        await load();
      } catch (error: any) {
        console.error('Error closing account:', error);
        const msg = error?.response?.data?.message || error?.message || 'Erreur lors de la fermeture du compte';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteAccount = async (account: ClientAccount) => {
    // Only allow delete if balance is 0 and account is inactive/closed
    if (account.balance > 0) {
      toast.error('Impossible de supprimer un compte avec solde non-nul. Fermez-le d\'abord.');
      return;
    }
    if ((account.status || '').toUpperCase() === 'ACTIVE') {
      toast.error('Impossible de supprimer un compte actif. Fermez-le d\'abord.');
      return;
    }
    
    if (!window.confirm(`ATTENTION: Supprimer définitivement le compte ${account.accountNumber}?\n\nCette action est IRRÉVERSIBLE et effacera toutes les données associées.`)) {
      return;
    }
    
    setLoading(true);
    try {
      await apiService.deleteTermSavingsAccount(String(account.id));
      toast.success(`Compte ${account.accountNumber} supprimé`);
      await load();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      const msg = error?.response?.data?.message || error?.message || 'Erreur lors de la suppression du compte';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 tab-contrast-fix">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Comptes d'Épargne à Terme</h2>
          <p className="text-gray-600">Gestion des comptes à terme (3, 6, 12, 24 mois)</p>
        </div>
        {tab === 'accounts' && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowOpenModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nouveau Compte à Terme
            </button>
            <button
              onClick={() => setShowNewClientModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nouveau Client + Compte
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { k: 'overview', label: "Vue d'ensemble" },
          { k: 'clients', label: 'Clients' },
          { k: 'accounts', label: 'Comptes' },
          { k: 'transactions', label: 'Transactions' },
        ].map((t: any) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-4 py-2 -mb-px border-b-2 ${tab === t.k ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6 tab-contrast-fix">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Comptes à Terme</p>
                  <p className="text-3xl font-bold">{accounts.length}</p>
                  <p className="text-xs mt-1 opacity-75">{accounts.filter(a => (a.status || '').toUpperCase() === 'ACTIVE').length} actifs</p>
                </div>
                <DollarSign className="h-10 w-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-xl text-white shadow-lg">
              <div>
                <p className="text-sm opacity-90">Comptes à Terme</p>
                <p className="text-2xl font-bold">{accounts.filter(a => a.termType != null).length}</p>
                <p className="text-xs mt-1 opacity-75">Terme actif: {accounts.filter(a => a.termType != null && (a.status || '').toUpperCase() === 'ACTIVE').length}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
              <div>
                <p className="text-sm opacity-90">Comptes HTG</p>
                <p className="text-2xl font-bold">{countByCurrency('HTG')}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
              <div>
                <p className="text-sm opacity-90">Comptes USD</p>
                <p className="text-2xl font-bold">{countByCurrency('USD')}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-xl text-white shadow-lg">
              <div>
                <p className="text-sm opacity-90">Solde Total HTG</p>
                <p className="text-2xl font-bold">{new Intl.NumberFormat('fr-FR').format(accounts.filter(a => a.currency === 'HTG').reduce((s, a) => s + (a.balance || 0), 0))}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl text-white shadow-lg">
              <div>
                <p className="text-sm opacity-90">Solde Total USD</p>
                <p className="text-2xl font-bold">{'$' + new Intl.NumberFormat('fr-FR').format(accounts.filter(a => a.currency === 'USD').reduce((s, a) => s + (a.balance || 0), 0))}</p>
              </div>
            </div>
          </div>

          {/* Term-specific KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/** compute term-specific metrics client-side **/}
            <TermKpiAccounts accounts={accounts} />
          </div>

          {/* Upcoming maturities list */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold">Prochaines échéances (Comptes à Terme)</h3>
          <p className="text-sm text-gray-700">Tous les comptes arrivant prochainement à échéance</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={upcomingPageSize}
                  onChange={(e) => setUpcomingPageSize(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value={10}>10/page</option>
                  <option value={25}>25/page</option>
                  <option value={50}>50/page</option>
                </select>
                <button onClick={() => exportMaturitiesCsv(accounts)} className="px-3 py-2 border rounded hover:bg-gray-50 flex items-center gap-2" title="Exporter en CSV">
                  <Download className="h-4 w-4" />
                  CSV
                </button>
                <button onClick={() => exportPdf(getUpcomingMaturities(accounts))} className="px-3 py-2 border rounded hover:bg-gray-50 flex items-center gap-2" title="Exporter en PDF">
                  <FileText className="h-4 w-4" />
                  PDF
                </button>
                <button onClick={() => exportExcel(getUpcomingMaturities(accounts))} className="px-3 py-2 border rounded hover:bg-gray-50 flex items-center gap-2" title="Exporter en Excel (XLS)">
                  <Download className="h-4 w-4" />
                  XLS
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Numéro</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Client</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Montant</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Terme</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Échéance</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Jours</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {upcomingPaged.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{a.accountNumber}</td>
                      <td className="px-4 py-2">{a.customerName}</td>
                      <td className="px-4 py-2">{formatCurrency(a.balance, a.currency)}</td>
                      <td className="px-4 py-2">{a.termType ? getTermTypeLabel(a.termType) : '-'}</td>
                      <td className="px-4 py-2">{a.maturityDate ? new Date(a.maturityDate).toLocaleDateString('fr-FR') : '-'}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={
                          a.days < 0 ? 'text-red-600 font-semibold' :
                          a.days <= 7 ? 'text-orange-600 font-semibold' :
                          a.days <= 30 ? 'text-yellow-600 font-semibold' : ''
                        }>
                          {daysUntil(a.maturityDate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls for upcoming maturities */}
            {allUpcoming.length > 0 && (
              <div className="flex items-center justify-between text-sm text-gray-700 mt-3">
                <div>
                  Page {upcomingPage} sur {upcomingTotalPages} • {allUpcoming.length} éléments
                </div>
                <div className="flex items-center gap-2">
                  <button disabled={upcomingPage === 1} onClick={() => setUpcomingPage(1)} className="px-2 py-1 border rounded disabled:opacity-50">«</button>
                  <button disabled={upcomingPage === 1} onClick={() => setUpcomingPage(p => Math.max(1, p - 1))} className="px-2 py-1 border rounded disabled:opacity-50">‹</button>
                  <button disabled={upcomingPage === upcomingTotalPages} onClick={() => setUpcomingPage(p => Math.min(upcomingTotalPages, p + 1))} className="px-2 py-1 border rounded disabled:opacity-50">›</button>
                  <button disabled={upcomingPage === upcomingTotalPages} onClick={() => setUpcomingPage(upcomingTotalPages)} className="px-2 py-1 border rounded disabled:opacity-50">»</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

  {tab === 'accounts' && (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 accounts-contrast-fix">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 h-5 w-5" />
          <input
            type="text"
            placeholder="Rechercher par numéro, nom client..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="ALL">Toutes devises</option>
            <option value="HTG">HTG</option>
            <option value="USD">USD</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Tous statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="INACTIVE">Inactif</option>
            <option value="SUSPENDED">Suspendu</option>
            <option value="CLOSED">Fermé</option>
          </select>
          <select
            value={branchFilter ?? ''}
            onChange={(e) => setBranchFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Toutes succursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={termFilter}
            onChange={(e) => setTermFilter(e.target.value === 'ALL' ? 'ALL' : (e.target.value as TermSavingsType))}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="ALL">Toutes durées</option>
            <option value={TermSavingsType.THREE_MONTHS}>3 mois</option>
            <option value={TermSavingsType.SIX_MONTHS}>6 mois</option>
            <option value={TermSavingsType.TWELVE_MONTHS}>12 mois</option>
            <option value={TermSavingsType.TWENTY_FOUR_MONTHS}>24 mois</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvancedFilters((s) => !s)}
            className="px-3 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
            title="Afficher/masquer les filtres avancés"
          >
            <Filter className="h-4 w-4" />
            {showAdvancedFilters ? 'Masquer filtres avancés' : 'Filtres avancés'}
          </button>
          <button
            onClick={clearFilters}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Réinitialiser tous les filtres"
          >
            Réinitialiser
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => exportCsv(sorted)}
              className="px-3 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
              title="Exporter en CSV"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={() => exportPdf(sorted)}
              className="px-3 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
              title="Exporter en PDF"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        </div>
        {showAdvancedFilters && (
          <div className="bg-gray-50 rounded-lg p-3 border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Montant min"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Montant max"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="text-sm text-gray-700 flex items-center">
                Astuce: combinez les montants avec la devise pour filtrer précisément.
              </div>
            </div>
          </div>
        )}
      </div>
      )}

  {tab === 'accounts' && (
  <div className="flex flex-wrap gap-2 items-center text-sm accounts-contrast-fix">
  <span className="text-gray-900">Échéances rapides:</span>
        <button onClick={() => setSearchTerm('')} className="px-2 py-1 border rounded-lg hover:bg-gray-50">Toutes</button>
        <button onClick={() => applyMaturityQuickFilter(7)} className="px-2 py-1 border rounded-lg hover:bg-gray-50">Dans 7 jours</button>
        <button onClick={() => applyMaturityQuickFilter(30)} className="px-2 py-1 border rounded-lg hover:bg-gray-50">Dans 30 jours</button>
        <button onClick={() => applyMaturityQuickFilter(0)} className="px-2 py-1 border rounded-lg hover:bg-gray-50">Déjà échus</button>
      </div>
      )}

  {tab === 'accounts' && (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden accounts-contrast-fix">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <TrendingUp className="h-8 w-8 text-blue-600 animate-pulse" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun compte trouvé</h3>
            <p className="text-gray-900">Essayez de modifier vos critères de recherche</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {sortingHeader('Numéro', 'accountNumber')}
                  {sortingHeader('Client', 'customerName')}
                  {sortingHeader('Succursale', 'branchName')}
                  {sortingHeader('Devise', 'currency')}
                  {sortingHeader('Solde', 'balance', 'right')}
                  {sortingHeader('Terme', 'termType')}
                  {sortingHeader('Taux (% / mois)', 'interestRate')}
                  {sortingHeader('Échéance', 'maturityDate')}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Jours restants</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paged.map((a) => {
                  return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{a.accountNumber}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {a.customerName && a.customerName !== 'undefined undefined' ? a.customerName : (a as any).customerFullName && (a as any).customerFullName !== 'undefined undefined' ? (a as any).customerFullName : ((a as any).customer?.fullName && (a as any).customer?.fullName !== 'undefined undefined' ? (a as any).customer?.fullName : <span className="italic text-gray-700">Nom inconnu</span>)}
                      </div>
                      <div className="text-xs text-gray-700">{a.customerPhone || (a as any).customer?.contact?.primaryPhone || ''}</div>
                    </td>
                    <td className="px-6 py-4">{a.branchName}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${a.currency === 'USD' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {a.currency}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">{formatCurrency(a.balance, a.currency)}</td>
                    <td className="px-6 py-4">
                      {a.termType ? getTermTypeLabel(a.termType) : <span className="text-gray-700 italic">Non défini</span>}
                    </td>
                    <td className="px-6 py-4">
                      {a.interestRate !== undefined 
                        ? `${getMonthlyInterestRatePercent({ interestRate: Number(a.interestRate), interestRateMonthly: (a as any).interestRateMonthly, termType: a.termType }).toFixed(2)}% / mois` 
                        : a.termType 
                          ? `${getMonthlyInterestRatePercent({ interestRate: getTermMonthlyInterestPercent(a.termType, a.currency), termType: a.termType, isMonthlyPercent: true }).toFixed(2)}% / mois`
                          : <span className="text-gray-700 italic">-</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      {a.maturityDate 
                        ? new Date(a.maturityDate).toLocaleDateString('fr-FR') 
                        : a.openingDate && a.termType
                          ? (() => {
                              const opening = new Date(a.openingDate);
                              const months = a.termType === TermSavingsType.THREE_MONTHS ? 3 :
                                           a.termType === TermSavingsType.SIX_MONTHS ? 6 :
                                           a.termType === TermSavingsType.TWELVE_MONTHS ? 12 : 24;
                              const maturity = new Date(opening);
                              maturity.setMonth(maturity.getMonth() + months);
                              return maturity.toLocaleDateString('fr-FR');
                            })()
                          : <span className="text-gray-700 italic">Non calculée</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      {a.maturityDate || (a.openingDate && a.termType)
                        ? (() => {
                            let maturity: Date;
                            if (a.maturityDate) {
                              maturity = new Date(a.maturityDate);
                            } else {
                              const opening = new Date(a.openingDate);
                              const months = a.termType === TermSavingsType.THREE_MONTHS ? 3 :
                                           a.termType === TermSavingsType.SIX_MONTHS ? 6 :
                                           a.termType === TermSavingsType.TWELVE_MONTHS ? 12 : 24;
                              maturity = new Date(opening);
                              maturity.setMonth(maturity.getMonth() + months);
                            }
                            const now = new Date();
                            const diff = Math.ceil((maturity.getTime() - now.getTime()) / (1000*60*60*24));
                            return <span className={diff < 0 ? 'text-red-600 font-semibold' : diff < 30 ? 'text-orange-600 font-semibold' : ''}>{diff}</span>;
                          })()
                        : <span className="text-gray-700 italic">-</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (a.status || '').toUpperCase() === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        (a.status || '').toUpperCase() === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                        (a.status || '').toUpperCase() === 'SUSPENDED' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        <CheckCircle className="h-4 w-4" />
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelected(a)} 
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Voir détails
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Pagination controls */}
      {tab === 'accounts' && !loading && filtered.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Affichage {Math.min((page - 1) * pageSize + 1, sorted.length)}–{Math.min(page * pageSize, sorted.length)} de {sorted.length} comptes
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">Afficher</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="px-2 py-1 bg-gray-100 text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                title="Première page"
              >
                «
              </button>

              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 bg-gray-100 text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Préc
              </button>

              <div className="text-sm text-gray-700">
                Page {page} / {totalPages}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 bg-gray-100 text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suiv
              </button>

              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="px-2 py-1 bg-gray-100 text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                title="Dernière page"
              >
                »
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'clients' && (
        <div className="tab-contrast-fix">
          <ClientsTab onOpenTerm={(customer) => { setInitialCustomerForOpen(customer); setShowOpenModal(true); }} />
        </div>
      )}

      {tab === 'transactions' && (
        <div className="tab-contrast-fix">
          <TransactionsTab />
        </div>
      )}

      {/* Transactions modal for account details */}
      {txModalAccount && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="bg-gray-100 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Historique - {txModalAccount.accountNumber}</h3>
                <p className="text-sm text-gray-700">{txModalAccount.customerName}</p>
              </div>
              <div>
                <button onClick={() => { setTxModalAccount(null); setTxList([]); }} className="px-3 py-1">Fermer</button>
              </div>
            </div>
            <div className="p-4">
              {txLoading ? (
                <div className="py-10 text-center text-gray-700">Chargement...</div>
              ) : txList.length === 0 ? (
                <div className="py-10 text-center text-gray-700">Aucune transaction</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Montant</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Devise</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {txList.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{new Date(t.processedAt).toLocaleString('fr-FR')}</td>
                          <td className="px-4 py-2">{t.type}</td>
                          <td className="px-4 py-2 text-right">{t.amount}</td>
                          <td className="px-4 py-2">{t.currency}</td>
                          <td className="px-4 py-2">{t.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showOpenModal && (
        <OpenTermSavingsAccountModal
          initialCustomer={initialCustomerForOpen || undefined}
          onClose={() => { setShowOpenModal(false); setInitialCustomerForOpen(null); }}
          onSuccess={() => { setShowOpenModal(false); setInitialCustomerForOpen(null); load(); toast.success('Compte à terme ouvert'); }}
        />
      )}

      {showNewClientModal && (
        <CreateTermSavingsWithNewCustomerModal
          onClose={() => setShowNewClientModal(false)}
          onSuccess={() => { setShowNewClientModal(false); load(); toast.success('Client créé et compte à terme ouvert'); }}
        />
      )}

      {selected && (
        <TermSavingsDetailsModal
          account={selected}
          onClose={() => setSelected(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
};

export default TermSavingsManagement;

// Clients tab: search existing savings customers and open a term account directly
const ClientsTab: React.FC<{ onOpenTerm: (customer: any) => void }> = ({ onOpenTerm }) => {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const lastRef = useRef<string>('');
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  const [showEditClientForm, setShowEditClientForm] = useState(false);

  // Advanced filters state
  const [clientFilters, setClientFilters] = useState({
    branchId: undefined as number | undefined,
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Branches for succursale filter (loaded locally in this tab)
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const data = await apiService.getAllBranches();
        const mapped = (data || []).map((b: any) => ({ id: b.id ?? b.branchId, name: b.name || b.branchName || b.displayName || String(b.id) }));
        setBranches(mapped);
      } catch (e) {
        console.error('Error loading branches for ClientsTab:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pagination state
  const [clientCurrentPage, setClientCurrentPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(10);

  // Format phone for display like 509-1234-5678 (keeps API normalization in services)
  const formatPhoneDisplay = (raw?: string) => {
    if (!raw) return '—';
    const digits = raw.replace(/\D+/g, '');
    // Prefer show without + and with hyphens: 509-XXXX-XXXX
    if (digits.length === 11 && digits.startsWith('509')) {
      return `${digits.substring(0,3)}-${digits.substring(3,7)}-${digits.substring(7,11)}`;
    }
    if (digits.length === 8) {
      return `509-${digits.substring(0,4)}-${digits.substring(4,8)}`;
    }
    // Fallback to raw
    return raw;
  };

  const formatDateDisplay = (raw?: string) => {
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR');
  };

  const formatIncomeHtg = (n?: number) => {
    if (n == null || isNaN(n as any)) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' HTG';
  };

  const docTypeLabel = (t?: number) => {
    switch (t) {
      case 0: return 'CIN';
      case 1: return 'Passeport';
      case 2: return 'Permis';
      case 3: return 'Cert. Naissance';
      default: return 'Document';
    }
  };

  const toggleCustomerStatus = async (customer: any) => {
    if (!window.confirm(`Confirmer ${customer.isActive ? 'la désactivation' : 'l\'activation'} du client ${customer.fullName} ?`)) {
      return;
    }

    try {
      setLoading(true);
      // Try toggle without force first
      try {
        await savingsCustomerService.toggleCustomerStatus(customer.id || customer.Id);
      } catch (err: any) {
        // If backend requires force (e.g., reactivation rules), attempt with force=true
        if (err?.message?.toLowerCase().includes('autorisé') || err?.message?.toLowerCase().includes('non autorisé') || err?.response?.status === 403) {
          await savingsCustomerService.toggleCustomerStatus(customer.id || customer.Id, true);
        } else {
          throw err;
        }
      }
      toast.success(`Client ${customer.isActive ? 'désactivé' : 'activé'} avec succès`);
      // Optimistic local update to improve UX
      setResults(prev => prev.map(c => (c.id === customer.id ? { ...c, isActive: !customer.isActive } : c)));
      // And refresh to get authoritative data
      await loadTermClients();
    } catch (error: any) {
      console.error('Error toggling customer status:', error);
      toast.error(error?.response?.data?.message || 'Erreur lors du changement de statut');
    } finally {
      setLoading(false);
    }
  };

  const showCustomerDetails = (customer: any) => {
    setSelectedCustomer(customer);
    setShowCustomerDetailsModal(true);
  };

  const exportCustomerPDF = (customer: any) => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Impossible d\'ouvrir la fenêtre d\'impression');
        return;
      }

      const safe = (v: any) => (v == null || v === '' ? '—' : v);
      const fmtPhone = (p?: string) => safe(formatPhoneDisplay(p));
      const fmtDate = (d?: string) => safe(formatDateDisplay(d));
      const fmtIncome = (n?: number) => safe(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n || 0) + ' HTG');
      const docLabel = (t?: number) => ({0:'CIN',1:'Passeport',2:'Permis',3:'Cert. Naissance'} as any)[t ?? -1] || 'Document';

      const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Fiche Client - ${safe(customer.fullName)}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 40px; 
              max-width: 1000px; 
              margin: 0 auto;
              color: #1f2937;
              line-height: 1.6;
            }
            .header { 
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: white;
              padding: 30px;
              border-radius: 12px;
              margin-bottom: 30px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header h1 { 
              font-size: 28px; 
              font-weight: bold; 
              margin-bottom: 8px;
            }
            .header .subtitle { 
              font-size: 14px; 
              opacity: 0.9;
            }
            .section { 
              background: #f9fafb;
              border-radius: 10px;
              padding: 24px;
              margin-bottom: 24px;
              border: 1px solid #e5e7eb;
            }
            .section-title { 
              font-size: 18px; 
              font-weight: 600; 
              color: #1f2937;
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 2px solid #3b82f6;
              display: flex;
              align-items: center;
            }
            .section-title::before {
              content: "●";
              color: #3b82f6;
              margin-right: 10px;
              font-size: 20px;
            }
            .grid { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              gap: 20px;
            }
            .item { 
              background: white;
              padding: 12px;
              border-radius: 6px;
              border: 1px solid #e5e7eb;
            }
            .label { 
              font-size: 11px; 
              font-weight: 600;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .value { 
              font-size: 14px; 
              color: #111827;
              font-weight: 500;
            }
            .status-badge { 
              display: inline-block; 
              padding: 6px 14px; 
              border-radius: 20px; 
              font-size: 12px; 
              font-weight: 600;
            }
            .status-active { 
              background: #d1fae5; 
              color: #065f46; 
            }
            .status-inactive { 
              background: #fee2e2; 
              color: #991b1b; 
            }
            .documents-list {
              background: white;
              border-radius: 6px;
              padding: 16px;
              margin-top: 12px;
            }
            .document-item {
              padding: 12px;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              margin-bottom: 10px;
              background: #fafafa;
            }
            .document-item:last-child {
              margin-bottom: 0;
            }
            .document-name {
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 4px;
            }
            .document-meta {
              font-size: 12px;
              color: #6b7280;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              color: #6b7280;
              font-size: 12px;
            }
            @media print { 
              body { padding: 20px; }
              .header { page-break-after: avoid; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${safe(customer.fullName)}</h1>
            <div class="subtitle">Code Client: ${safe(customer.customerCode || customer.CustomerCode || customer.id)}</div>
          </div>

          <div class="section">
            <div class="section-title">Informations Personnelles</div>
            <div class="grid">
              <div class="item">
                <div class="label">Prénom</div>
                <div class="value">${safe(customer.firstName || customer.FirstName)}</div>
              </div>
              <div class="item">
                <div class="label">Nom</div>
                <div class="value">${safe(customer.lastName || customer.LastName)}</div>
              </div>
              <div class="item">
                <div class="label">Date de Naissance</div>
                <div class="value">${fmtDate(customer.dateOfBirth || customer.DateOfBirth)}</div>
              </div>
              <div class="item">
                <div class="label">Genre</div>
                <div class="value">${genderLabel(customer.gender)}</div>
              </div>
              <div class="item">
                <div class="label">ID Client</div>
                <div class="value">${safe(customer.customerCode || customer.CustomerCode || customer.id)}</div>
              </div>
              <div class="item">
                <div class="label">Statut</div>
                <div class="value">
                  <span class="status-badge ${customer.isActive ? 'status-active' : 'status-inactive'}">
                    ${customer.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Adresse</div>
            <div class="grid">
              <div class="item">
                <div class="label">Rue</div>
                <div class="value">${safe(customer.address?.street || customer.street)}</div>
              </div>
              <div class="item">
                <div class="label">Commune</div>
                <div class="value">${safe(customer.address?.commune || customer.commune)}</div>
              </div>
              <div class="item">
                <div class="label">Département</div>
                <div class="value">${safe(customer.address?.department || customer.department)}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Informations de Contact</div>
            <div class="grid">
              <div class="item">
                <div class="label">Téléphone Principal</div>
                <div class="value">${fmtPhone(customer.contact?.primaryPhone || customer.primaryPhone)}</div>
              </div>
              <div class="item">
                <div class="label">Téléphone Secondaire</div>
                <div class="value">${fmtPhone(customer.contact?.secondaryPhone || customer.secondaryPhone)}</div>
              </div>
              <div class="item">
                <div class="label">Email</div>
                <div class="value">${safe(customer.contact?.email || customer.email)}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Document d'Identification</div>
            <div class="grid">
              <div class="item">
                <div class="label">Type de Document</div>
                <div class="value">${docLabel(customer.identity?.documentType)}</div>
              </div>
              <div class="item">
                <div class="label">Numéro de Document</div>
                <div class="value">${safe(customer.identity?.documentNumber)}</div>
              </div>
              <div class="item">
                <div class="label">Date d'Émission</div>
                <div class="value">${fmtDate(customer.identity?.issuedDate)}</div>
              </div>
              <div class="item">
                <div class="label">Date d'Expiration</div>
                <div class="value">${fmtDate(customer.identity?.expiryDate)}</div>
              </div>
              <div class="item">
                <div class="label">Autorité d'Émission</div>
                <div class="value">${safe(customer.identity?.issuingAuthority)}</div>
              </div>
            </div>
          </div>

          ${customer.documents && customer.documents.length > 0 ? `
          <div class="section">
            <div class="section-title">Documents Téléchargés (${customer.documents.length})</div>
            <div class="documents-list">
              ${customer.documents.map((doc: any) => {
                const docName = doc.Name || doc.name || (doc.FilePath || doc.filePath ? String(doc.FilePath || doc.filePath).split(/[/\\]/).pop() : '') || 'Document';
                const docType = doc.documentTypeName || 'Document';
                const rawSize = (doc.FileSize ?? doc.fileSize);
                const docSizeKb = typeof rawSize === 'number' && !isNaN(rawSize) ? (rawSize / 1024).toFixed(1) : null;
                const rawDate = doc.UploadedAt || doc.uploadedAt;
                const dateObj = rawDate ? new Date(rawDate) : null;
                const hasValidDate = !!(dateObj && !isNaN(dateObj.getTime()));
                
                return `
                  <div class="document-item">
                    <div class="document-name">${safe(docName)}</div>
                    <div class="document-meta">
                      Type: ${safe(docType)}
                      ${docSizeKb !== null ? ` • Taille: ${docSizeKb} KB` : ''}
                      ${hasValidDate ? ` • Date: ${dateObj!.toLocaleDateString('fr-FR')}` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          ` : ''}

          ${customer.occupation || customer.monthlyIncome ? `
          <div class="section">
            <div class="section-title">Informations Professionnelles</div>
            <div class="grid">
              ${customer.occupation ? `
              <div class="item">
                <div class="label">Occupation</div>
                <div class="value">${safe(customer.occupation)}</div>
              </div>
              ` : ''}
              ${customer.monthlyIncome ? `
              <div class="item">
                <div class="label">Revenu Mensuel</div>
                <div class="value">${fmtIncome(customer.monthlyIncome)}</div>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}

          <div class="footer">
            Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
          </div>

          <script>
            window.onload = function(){ 
              window.print(); 
              setTimeout(() => window.close(), 500); 
            }
          </script>
        </body>
        </html>`;

      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating customer PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  // Export functions for clients list
  const exportClientsCsv = (clients: any[]) => {
    try {
      const headers = ['Nom complet', 'Prénom', 'Nom', 'Téléphone principal', 'Téléphone secondaire', 'Email', 'Type document', 'Numéro document', 'Commune', 'Département', 'Statut', 'Date création'];
      const lines = [headers.join(',')];
      
      clients.forEach(client => {
        const row = [
          (client.fullName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || '').replace(/,/g, ';'),
          (client.firstName || '').replace(/,/g, ';'),
          (client.lastName || '').replace(/,/g, ';'),
          formatPhoneDisplay(client.contact?.primaryPhone || client.primaryPhone || ''),
          formatPhoneDisplay(client.contact?.secondaryPhone || client.secondaryPhone || ''),
          (client.contact?.email || client.email || '').replace(/,/g, ';'),
          docTypeLabel(client.identity?.documentType),
          (client.identity?.documentNumber || '').replace(/,/g, ';'),
          (client.address?.commune || '').replace(/,/g, ';'),
          (client.address?.department || '').replace(/,/g, ';'),
          client.isActive ? 'Actif' : 'Inactif',
          client.createdAt ? new Date(client.createdAt).toLocaleDateString('fr-FR') : ''
        ];
        lines.push(row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
      });
      
      const blob = new Blob(["\ufeff" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `clients-term-savings-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Export CSV réussi');
    } catch (error) {
      console.error('Error exporting clients CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportClientsExcel = (clients: any[]) => {
    try {
      const data = clients.map(client => ({
        'Nom complet': client.fullName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || '',
        'Prénom': client.firstName || '',
        'Nom': client.lastName || '',
        'Téléphone principal': formatPhoneDisplay(client.contact?.primaryPhone || client.primaryPhone || ''),
        'Téléphone secondaire': formatPhoneDisplay(client.contact?.secondaryPhone || client.secondaryPhone || ''),
        'Email': client.contact?.email || client.email || '',
        'Type document': docTypeLabel(client.identity?.documentType),
        'Numéro document': client.identity?.documentNumber || '',
        'Commune': client.address?.commune || '',
        'Département': client.address?.department || '',
        'Statut': client.isActive ? 'Actif' : 'Inactif',
        'Date création': client.createdAt ? new Date(client.createdAt).toLocaleDateString('fr-FR') : ''
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clients');
      const filename = `clients-term-savings-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success('Export Excel réussi');
    } catch (error) {
      console.error('Error exporting clients Excel:', error);
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  const listRef = useRef<HTMLDivElement | null>(null);

  // Load all customers who currently have a term savings account
  const loadTermClients = async (filters?: typeof clientFilters) => {
    setLoading(true);
    try {
      const matched = await clientAccountCustomerLoader.loadCustomersHavingAccounts('TERM_SAVINGS');
      console.log('📋 Final matched customers:', matched);
      
  let filteredResults: any[] = (matched || []) as any[];
      
      // Apply advanced filters if provided
      if (filters) {
  filteredResults = filteredResults.filter((customer: any) => {
          // Branch (Succursale) filter: if branchId is set, only include matching customers
          if (filters.branchId !== undefined && filters.branchId !== null) {
            // Compare by branch name because SavingsCustomerResponseDto may not include branchId in its type
            const selBranch = branches.find(b => Number(b.id) === Number(filters.branchId));
            if (selBranch) {
              // clientAccountCustomerLoader attaches accountBranchId/accountBranchName onto customer objects
              const acctBranchId = (customer as any).accountBranchId ?? (customer as any).branchId ?? (customer as any).BranchId;
              const acctBranchName = (customer as any).accountBranchName ?? (customer as any).branchName ?? (customer as any).BranchName ?? '';
              if (acctBranchId != null) {
                if (Number(acctBranchId) !== Number(selBranch.id)) return false;
              } else {
                if ((acctBranchName || '') !== selBranch.name) return false;
              }
            }
          }

          // Status filter
          if (filters.status && customer.isActive !== (filters.status === 'ACTIVE')) {
            return false;
          }

          // Date range filter (creation date)
          if (filters.dateFrom || filters.dateTo) {
            const createdDate = new Date(customer.createdAt);
            if (filters.dateFrom) {
              const fromDate = new Date(filters.dateFrom);
              if (createdDate < fromDate) return false;
            }
            if (filters.dateTo) {
              const toDate = new Date(filters.dateTo);
              toDate.setHours(23, 59, 59, 999); // End of day
              if (createdDate > toDate) return false;
            }
          }

          return true;
        });
      }
      
      setResults(filteredResults);
      if (!filteredResults.length) toast('Aucun client trouvé avec compte à terme');
    } catch (e) {
      console.error('❌ Error loading term clients:', e);
      toast.error('Erreur lors du chargement des clients à terme');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const doSearch = async () => {
    const raw = term.trim();
    if (!raw || raw.length < 2) return;
    try {
      const q = raw.toUpperCase();
      if (lastRef.current === q) return;
      lastRef.current = q;
      setLoading(true);
      // Use normalized customer service to ensure fullName/contact/address are populated
      const list = await savingsCustomerService.searchCustomers(q);
      setResults(list || []);
    } catch (e) {
      console.error(e);
      toast.error('Erreur de recherche client');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const raw = term.trim();
    if (!raw || raw.length < 2) return;
    const upper = raw.toUpperCase();
    const delay = CODE_PATTERN.test(upper) ? 200 : 500;
    const h = setTimeout(() => { if (lastRef.current !== upper) doSearch(); }, delay);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  useEffect(() => {
    loadTermClients();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    if (showAdvancedFilters || Object.values(clientFilters).some(v => v !== undefined && v !== '')) {
      loadTermClients(clientFilters);
    }
  }, [clientFilters]);

  // Reset to first page when filters change
  useEffect(() => {
    setClientCurrentPage(1);
  }, [clientFilters, term]);

  const handleDownloadDocument = async (customerId: string, documentId: string, documentName: string) => {
    try {
      const blob = await savingsCustomerService.downloadDocument(customerId, documentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = documentName || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Document téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Erreur lors du téléchargement du document');
    }
  };

  const handleDeleteDocument = async (customerId: string, documentId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;
    try {
      await savingsCustomerService.deleteDocument(customerId, documentId);
      toast.success('Document effacé avec succès');
      // refresh list and selected customer
      await loadTermClients();
      if (selectedCustomer && selectedCustomer.id === customerId) {
        const updated = await savingsCustomerService.getCustomer(customerId);
        setSelectedCustomer(updated || null);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression du document');
    }
  };

  const handleEditClient = async (customerId: string) => {
    try {
      const customer = await savingsCustomerService.getCustomer(customerId);
      setSelectedCustomer(customer);
      setShowEditClientForm(true);
    } catch (error) {
      console.error('Error loading customer for edit:', error);
      toast.error('Impossible de charger le client');
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(results.length / clientPageSize);
  const startIndex = (clientCurrentPage - 1) * clientPageSize;
  const paginatedResults = results.slice(startIndex, startIndex + clientPageSize);

  return (
    <div className="space-y-4 tab-contrast-fix">
      {/* Client Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Recherche par nom, téléphone ou numéro de document..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Export Buttons */}
        {!loading && results.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => exportClientsPdf(results, 'Liste Clients - Comptes à Terme')}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
            >
              <FileText className="h-4 w-4" /> PDF
            </button>

            <button
              onClick={() => {
                try {
                  const rows = results.map((c: any) => ({
                    id: c.id || '',
                    fullName: c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                    phone: (c.contact?.primaryPhone) || '',
                    email: c.contact?.email || '',
                    documentNumber: c.identity?.documentNumber || '',
                    branch: (c as any).accountBranchName || c.branchName || c.branch || '',
                    commune: c.address?.commune || '',
                    department: c.address?.department || '',
                    createdAt: c.createdAt || '',
                    status: c.isActive ? 'Actif' : 'Inactif'
                  }));
                  const csv = unparse(rows);
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  const url = URL.createObjectURL(blob);
                  link.href = url;
                  link.download = `clients_term_savings_${new Date().toISOString().slice(0,10)}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 2000);
                  toast.success('Export CSV prêt');
                } catch (e) {
                  console.error('CSV export error', e);
                  toast.error('Erreur lors de l\'export CSV');
                }
              }}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
            >
              <Download className="h-4 w-4" /> CSV
            </button>

            <button
              onClick={() => {
                try {
                  const data = results.map((c: any) => ({
                    id: c.id || '',
                    fullName: c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                    phone: (c.contact?.primaryPhone) || '',
                    email: c.contact?.email || '',
                    documentNumber: c.identity?.documentNumber || '',
                    branch: (c as any).accountBranchName || c.branchName || c.branch || '',
                    commune: c.address?.commune || '',
                    department: c.address?.department || '',
                    createdAt: c.createdAt || '',
                    status: c.isActive ? 'Actif' : 'Inactif'
                  }));
                  const ws = XLSX.utils.json_to_sheet(data);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Clients');
                  XLSX.writeFile(wb, `clients_term_savings_${new Date().toISOString().slice(0,10)}.xlsx`);
                  toast.success('Export XLSX prêt');
                } catch (e) {
                  console.error('XLSX export error', e);
                  toast.error('Erreur lors de l\'export XLSX');
                }
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
            >
              <Download className="h-4 w-4" /> XLSX
            </button>
          </div>
        )}
        
        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="mt-3 flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
        >
          <Filter className="h-4 w-4" />
          <span>Filtres avancés</span>
          {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Succursale (Branch) Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Succursale
                </label>
                <select
                  value={clientFilters.branchId ?? ''}
                  onChange={(e) => setClientFilters({ ...clientFilters, branchId: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Toutes</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={clientFilters.status}
                  onChange={(e) => setClientFilters({ ...clientFilters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tous les statuts</option>
                  <option value="ACTIVE">Actif</option>
                  <option value="INACTIVE">Inactif</option>
                </select>
              </div>

              {/* Date From Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  value={clientFilters.dateFrom}
                  onChange={(e) => setClientFilters({ ...clientFilters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Date To Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={clientFilters.dateTo}
                  onChange={(e) => setClientFilters({ ...clientFilters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="mt-4 flex items-center space-x-3">
              <button
                onClick={() => setClientFilters({ branchId: undefined, status: '', dateFrom: '', dateTo: '' })}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Effacer les filtres
              </button>
              <div className="text-sm text-gray-600">
                {results.length} client(s) trouvé(s)
              </div>
            </div>
          </div>
        )}
      </div>

  {loading && <div className="text-sm text-gray-700">Recherche en cours...</div>}

      {!loading && results.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{term.trim() ? 'Aucun client trouvé' : 'Aucun client avec compte à terme'}</h3>
          <p className="text-gray-700">{term.trim() ? 'Essayez de modifier vos critères de recherche' : 'Les clients ayant des comptes d\'épargne à terme apparaîtront ici'}</p>
        </div>
      )}

      {/* Clients List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adresse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-700">
                        {term.trim() 
                          ? 'Aucun client ne correspond à votre recherche'
                          : 'Aucun client avec compte à terme pour le moment'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedResults.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{c.fullName || 'N/A'}</div>
                          <div className="text-sm text-gray-700">
                            {c.customerCode ? `Code: ${c.customerCode}` : 'ID: ' + c.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatPhoneDisplay(c.contact?.primaryPhone || c.primaryPhone || c.phone)}</div>
                      {c.contact?.email && (
                        <div className="text-sm text-gray-700">{c.contact.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {c.documents && c.documents.length > 0 ? (
                          <div className="flex flex-col space-y-1">
                            <span className="font-medium">{c.documents.length} document(s)</span>
                            <div className="flex flex-wrap gap-1">
                              {c.documents.slice(0, 2).map((doc: any, index: number) => (
                                <span key={index} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  {doc.documentTypeName || doc.documentType || 'Document'}
                                </span>
                              ))}
                              {c.documents.length > 2 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  +{c.documents.length - 2} autres
                                </span>
                              )}
                            </div>
                          </div>
                        ) : c.identity?.documentType !== undefined ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{docTypeLabel(c.identity.documentType)}</span>
                            <span className="text-xs text-gray-700">{c.identity.documentNumber || '—'}</span>
                          </div>
                        ) : (
                          <span className="text-gray-700">Aucun document</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{c.address?.commune || 'N/A'}</div>
                      <div className="text-sm text-gray-700">{c.address?.department || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {c.isActive ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Actif
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditClient(c.id)}
                          className="text-blue-600 hover:text-blue-900 transition-colors p-2 hover:bg-blue-50 rounded-lg"
                          title="Modifier"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => showCustomerDetails(c)}
                          className="text-gray-600 hover:text-gray-900 transition-colors p-2 hover:bg-gray-50 rounded-lg"
                          title="Voir les détails"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => exportCustomerPDF(c)}
                          className="text-green-600 hover:text-green-900 transition-colors p-2 hover:bg-green-50 rounded-lg"
                          title="Ekspo PDF"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls for Clients */}
        {!loading && results.length > 0 && (
          <div className="px-4 py-3 bg-white border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Affichage {startIndex + 1} – {Math.min(startIndex + clientPageSize, results.length)} sur {results.length}
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Lignes</label>
              <select
                value={clientPageSize}
                onChange={(e) => { setClientPageSize(Number(e.target.value)); setClientCurrentPage(1); }}
                className="px-2 py-1 border rounded"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <button
                onClick={() => setClientCurrentPage((p) => Math.max(1, p - 1))}
                disabled={clientCurrentPage <= 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >Préc</button>

              <span className="text-sm">Page</span>
              <select
                value={clientCurrentPage}
                onChange={(e) => setClientCurrentPage(Number(e.target.value))}
                className="px-2 py-1 border rounded"
              >
                {Array.from({ length: totalPages }).map((_, i) => (
                  <option key={i} value={i + 1}>{i + 1}</option>
                ))}
              </select>

              <button
                onClick={() => setClientCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={clientCurrentPage >= totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >Suiv</button>
            </div>
          </div>
        )}
      </div>

      {/* View Client Details Modal */}
      {showCustomerDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Détails du Client</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedCustomer.fullName}</p>
              </div>
              <button
                onClick={() => setShowCustomerDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Section 1: Informations Personnelles */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  Informations Personnelles
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prénom</label>
                    <p className="text-base text-gray-900">{selectedCustomer.firstName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nom</label>
                    <p className="text-base text-gray-900">{selectedCustomer.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date de Naissance</label>
                    <p className="text-base text-gray-900">
                      {selectedCustomer.dateOfBirth ? new Date(selectedCustomer.dateOfBirth).toLocaleDateString('fr-FR') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Genre</label>
                    <p className="text-base text-gray-900">{genderLabel(selectedCustomer.gender) === 'Masculin' ? 'Homme' : genderLabel(selectedCustomer.gender) === 'Féminin' ? 'Femme' : '—'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID Client</label>
                    <p className="text-base text-gray-900 font-mono bg-blue-50 px-2 py-1 rounded inline-block">
                      {selectedCustomer.customerCode || selectedCustomer.id}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Statut</label>
                    <p className="text-base">
                      {selectedCustomer.isActive ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Actif
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Inactif
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Adresse */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                  Adresse
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Rue</label>
                    <p className="text-base text-gray-900">{selectedCustomer.address?.street || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Commune</label>
                    <p className="text-base text-gray-900">{selectedCustomer.address?.commune || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Département</label>
                    <p className="text-base text-gray-900">{selectedCustomer.address?.department || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Contact */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
                  Informations de Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Téléphone Principal</label>
                    <p className="text-base text-gray-900">{formatPhoneDisplay(selectedCustomer.contact?.primaryPhone || selectedCustomer.primaryPhone)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Téléphone Secondaire</label>
                    <p className="text-base text-gray-900">{formatPhoneDisplay(selectedCustomer.contact?.secondaryPhone || selectedCustomer.secondaryPhone) || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-base text-gray-900">{selectedCustomer.contact?.email || selectedCustomer.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Section 4: Documents */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Documents d'Identification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type de Document</label>
                    <p className="text-base text-gray-900">{docTypeLabel(selectedCustomer.identity?.documentType) || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Numéro de Document</label>
                    <p className="text-base text-gray-900 font-mono">{selectedCustomer.identity?.documentNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Date d'Émission</label>
                    <p className="text-base text-gray-900">
                      {selectedCustomer.identity?.issuedDate ? new Date(selectedCustomer.identity.issuedDate).toLocaleDateString('fr-FR') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Date d'Expiration</label>
                    <p className="text-base text-gray-900">
                      {selectedCustomer.identity?.expiryDate ? new Date(selectedCustomer.identity.expiryDate).toLocaleDateString('fr-FR') : 'N/A'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Autorité d'Émission</label>
                    <p className="text-base text-gray-900">{selectedCustomer.identity?.issuingAuthority || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Section 5: Documents Téléchargés */}
              {selectedCustomer.documents && selectedCustomer.documents.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-600" />
                    Documents Téléchargés ({selectedCustomer.documents.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedCustomer.documents.map((doc: any) => {
                      const docId = doc.Id || doc.id;
                      const docName = doc.Name || doc.name || (doc.FilePath || doc.filePath ? String(doc.FilePath || doc.filePath).split(/[/\\]/).pop() : '') || 'Document';
                      const docType = doc.documentTypeName || 'Document';
                      const rawSize = (doc.FileSize ?? doc.fileSize);
                      const docSizeKb = typeof rawSize === 'number' && !isNaN(rawSize) ? (rawSize / 1024) : null;
                      const rawDate = doc.UploadedAt || doc.uploadedAt;
                      const dateObj = rawDate ? new Date(rawDate) : null;
                      const hasValidDate = !!(dateObj && !isNaN(dateObj.getTime()));

                      return (
                        <div key={docId} className="bg-white rounded-lg p-3 border border-gray-200 hover:border-blue-300 transition-colors">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <FileText className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate flex items-center gap-2">
                                  <span className="truncate">{docName}</span>
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full whitespace-nowrap">{docType}</span>
                                </p>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                  {docSizeKb !== null && <span>{docSizeKb.toFixed(1)} KB</span>}
                                  {docSizeKb !== null && hasValidDate && <span>•</span>}
                                  {hasValidDate && <span>{dateObj!.toLocaleDateString('fr-FR')}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDownloadDocument(selectedCustomer.id, docId, docName)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Télécharger"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteDocument(selectedCustomer.id, docId)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 6: Informations Professionnelles */}
              {(selectedCustomer.occupation || selectedCustomer.monthlyIncome) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                    Informations Professionnelles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCustomer.occupation && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Occupation</label>
                        <p className="text-base text-gray-900">{selectedCustomer.occupation}</p>
                      </div>
                    )}
                    {selectedCustomer.monthlyIncome && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Revenu Mensuel</label>
                        <p className="text-base text-gray-900">{formatIncomeHtg(selectedCustomer.monthlyIncome)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCustomerDetailsModal(false)}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Fermer
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCustomerDetailsModal(false);
                    setShowEditClientForm(true);
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Edit2 className="h-5 w-5" />
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit client modal */}
      {showEditClientForm && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-auto">
            <div className="p-4">
              <ClientEditForm
                customer={selectedCustomer}
                onSubmit={async (data: any) => {
                  try {
                    await savingsCustomerService.updateCustomer(selectedCustomer.id, data);
                    toast.success('Client mis à jour');
                    setShowEditClientForm(false);
                    await loadTermClients();
                  } catch (err) {
                    console.error('Error updating customer:', err);
                    toast.error('Erreur lors de la mise à jour');
                    throw err;
                  }
                }}
                onCancel={() => setShowEditClientForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Document upload modal */}
      {showDocumentUploadModal && selectedCustomer && (
        <DocumentUploadModal
          customer={selectedCustomer}
          onClose={() => setShowDocumentUploadModal(false)}
          onSuccess={async () => { setShowDocumentUploadModal(false); await loadTermClients(); }}
        />
      )}
    </div>
  );
};

// Transactions tab: view transactions of an account number
const TransactionsTab: React.FC = () => {
  const [viewMode, setViewMode] = useState<'search' | 'history'>('search');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AccountTransaction[]>([]);
  const [accountInfo, setAccountInfo] = useState<ClientAccount | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  
  // Pour l'historique global
  const [allTransactions, setAllTransactions] = useState<AccountTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    accountNumber: '',
    type: 'ALL',
    dateFrom: '',
    dateTo: '',
    branchId: '',
    minAmount: '',
    maxAmount: ''
  });

  const load = async () => {
    const num = accountNumber.trim();
    if (!num) {
      toast.error('Saisissez un numéro de compte');
      return;
    }
    setLoading(true);
    try {
      // Charger les informations du compte
      const account = await apiService.getAccountByNumber(num);
      setAccountInfo(account);
      
      // Charger les transactions
      const list = await apiService.getAccountTransactions(num);
      setItems(list || []);
      toast.success(`${list.length} transaction(s) chargée(s)`);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors du chargement des transactions');
      setAccountInfo(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger l'historique global
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const params: any = {};
      if (historyFilters.accountNumber) params.accountNumber = historyFilters.accountNumber;
      if (historyFilters.type && historyFilters.type !== 'ALL') params.type = historyFilters.type;
      if (historyFilters.dateFrom) params.startDate = historyFilters.dateFrom;
      if (historyFilters.dateTo) params.endDate = historyFilters.dateTo;
      if (historyFilters.branchId) params.branchId = historyFilters.branchId;
      if (historyFilters.minAmount) params.minAmount = historyFilters.minAmount;
      if (historyFilters.maxAmount) params.maxAmount = historyFilters.maxAmount;
      
      const list = await apiService.getAllTermSavingsTransactions(params);
      setAllTransactions(list || []);
      toast.success(`${list.length} transaction(s) trouvée(s)`);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors du chargement de l\'historique');
      setAllTransactions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Charger les branches au montage
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const list = await apiService.getAllBranches();
        setBranches(list);
      } catch (e) {
        console.error('Erreur lors du chargement des succursales:', e);
      }
    };
    fetchBranches();
  }, []);

  // Charger automatiquement l'historique au montage
  useEffect(() => {
    if (viewMode === 'history' && allTransactions.length === 0) {
      loadHistory();
    }
  }, [viewMode]);

  // Filtrer les transactions
  const filteredItems = useMemo(() => {
    let result = [...items];
    
    // Filtrer par type
    if (filterType !== 'ALL') {
      result = result.filter(t => t.type === filterType);
    }
    
    // Filtrer par date
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter(t => new Date(t.processedAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(t => new Date(t.processedAt) <= to);
    }
    
    // Filtrer par texte de recherche
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(t => 
        (t.description || '').toLowerCase().includes(search) ||
        (t.reference || '').toLowerCase().includes(search) ||
        String(t.amount).includes(search)
      );
    }
    
    return result;
  }, [items, filterType, dateFrom, dateTo, searchText]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const typeUpper = (t: AccountTransaction) => String(t.type || '').toUpperCase();
    const deposits = filteredItems.filter(t => {
      const tp = typeUpper(t);
      return tp === 'DEPOSIT' || tp.includes('OPENING');
    });
    const withdrawals = filteredItems.filter(t => typeUpper(t) === 'WITHDRAWAL');
    const interests = filteredItems.filter(t => typeUpper(t) === 'INTEREST');
    
    return {
      totalDeposits: deposits.reduce((sum, t) => sum + Number(t.amount || 0), 0),
      totalWithdrawals: withdrawals.reduce((sum, t) => sum + Number(t.amount || 0), 0),
      totalInterests: interests.reduce((sum, t) => sum + Number(t.amount || 0), 0),
      countDeposits: deposits.length,
      countWithdrawals: withdrawals.length,
      countInterests: interests.length
    };
  }, [filteredItems]);

  const exportCsv = () => {
    try {
      const branchMap = branches.reduce((map, b) => {
        map[b.id] = b.name;
        return map;
      }, {} as Record<number, string>);

      const data = filteredItems.map(t => ({
        id: t.id,
        date: t.processedAt,
        reference: t.reference,
        accountNumber: t.accountNumber,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        processedBy: (t as any).processedByName || t.processedBy || '',
        branch: branchMap[(t as any).branchId] || 'N/A',
        status: t.status
      }));
      const csv = unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${accountNumber}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export CSV terminé');
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export CSV");
    }
  };

  const exportPdf = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Veuillez autoriser les pop-ups pour exporter en PDF');
        return;
      }

      const dataToExport = filteredItems.length > 0 ? filteredItems : items;

      const rows = dataToExport.map(t => `
        <tr>
          <td style="padding:6px;border:1px solid #ddd">${new Date(t.processedAt).toLocaleString('fr-FR')}</td>
          <td style="padding:6px;border:1px solid #ddd">${t.type}</td>
          <td style="padding:6px;border:1px solid #ddd;text-align:right">${Number(t.amount).toFixed(2)}</td>
          <td style="padding:6px;border:1px solid #ddd">${(t.description || '').replaceAll('<','&lt;')}</td>
          <td style="padding:6px;border:1px solid #ddd;text-align:right">${Number(t.balanceAfter).toFixed(2)}</td>
          <td style="padding:6px;border:1px solid #ddd">${(t.reference || '').replaceAll('<','&lt;')}</td>
        </tr>
      `).join('');

      const html = `
        <html>
        <head>
          <meta charset="utf-8">
          <title>Transactions - ${accountNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; font-size: 20px; }
            .info { margin-bottom: 20px; background: #f5f5f5; padding: 10px; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #4a5568; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .right { text-align: right; }
            .stats { margin-top: 15px; padding: 10px; background: #e6f7ff; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Relevé de Transactions - Compte à Terme</h1>
          <div class="info">
            <strong>Compte:</strong> ${accountNumber}<br>
            ${accountInfo ? `<strong>Client:</strong> ${accountInfo.customerName}<br>
            <strong>Devise:</strong> ${accountInfo.currency}<br>
            <strong>Solde actuel:</strong> ${accountInfo.balance} ${accountInfo.currency}<br>` : ''}
            <strong>Date d'impression:</strong> ${new Date().toLocaleString('fr-FR')}<br>
            <strong>Période:</strong> ${dateFrom || 'Début'} - ${dateTo || 'Aujourd\'hui'}<br>
            <strong>Nombre de transactions:</strong> ${dataToExport.length}
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th class="right">Montant</th>
                <th>Description</th>
                <th class="right">Solde après</th>
                <th>Référence</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="stats">
            <strong>Statistiques:</strong><br>
            Dépôts: ${stats.countDeposits} (${stats.totalDeposits.toFixed(2)} ${accountInfo?.currency || ''})<br>
            Retraits: ${stats.countWithdrawals} (${stats.totalWithdrawals.toFixed(2)} ${accountInfo?.currency || ''})<br>
            Intérêts: ${stats.countInterests} (${stats.totalInterests.toFixed(2)} ${accountInfo?.currency || ''})
          </div>
          <script>window.onload = function(){ setTimeout(() => window.print(), 300); };</script>
        </body>
        </html>`;

      printWindow.document.write(html);
      printWindow.document.close();
      toast.success('Fenêtre d\'export ouverte - utilisez Imprimer pour sauver en PDF');
    } catch (e) {
      console.error('PDF export error', e);
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  return (
    <div className="space-y-4 tab-contrast-fix">
      {/* Toggle entre Recherche et Historique */}
      <div className="bg-white rounded-xl shadow-sm border p-2 flex gap-2">
        <button
          onClick={() => setViewMode('search')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            viewMode === 'search'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Search className="h-4 w-4 inline-block mr-2" />
          Recherche par compte
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            viewMode === 'history'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <FileText className="h-4 w-4 inline-block mr-2" />
          Historique global
        </button>
      </div>

      {/* Vue Recherche par compte */}
      {viewMode === 'search' && (
        <>
          {/* Barre de recherche de compte */}
          <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row gap-3 items-center">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Numéro de compte (ex: G12345678901)"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); load(); } }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={load} 
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Charger
          </button>
        </div>
      </div>

      {/* Informations du compte */}
      {accountInfo && (
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-xl shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm opacity-90">Client</p>
              <p className="text-lg font-semibold">{accountInfo.customerName}</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Compte</p>
              <p className="text-lg font-semibold">{accountInfo.accountNumber}</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Solde actuel</p>
              <p className="text-lg font-semibold">{Number(accountInfo.balance).toFixed(2)} {accountInfo.currency}</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Statut</p>
              <p className="text-lg font-semibold">{accountInfo.status}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtres et statistiques */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Statistiques */}
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Dépôts</p>
                <p className="text-2xl font-bold text-green-700">{stats.countDeposits}</p>
                <p className="text-xs text-green-600">{stats.totalDeposits.toFixed(2)} {accountInfo?.currency}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Retraits</p>
                <p className="text-2xl font-bold text-red-700">{stats.countWithdrawals}</p>
                <p className="text-xs text-red-600">{stats.totalWithdrawals.toFixed(2)} {accountInfo?.currency}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Intérêts</p>
                <p className="text-2xl font-bold text-blue-700">{stats.countInterests}</p>
                <p className="text-xs text-blue-600">{stats.totalInterests.toFixed(2)} {accountInfo?.currency}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Total</p>
                <p className="text-2xl font-bold text-purple-700">{filteredItems.length}</p>
                <p className="text-xs text-purple-600">transaction(s)</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filtres avancés */}
      {items.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-5 w-5 text-gray-500" />
            <h3 className="font-semibold text-gray-700">Filtres</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="ALL">Tous les types</option>
                <option value="Deposit">Dépôts</option>
                <option value="Withdrawal">Retraits</option>
                <option value="Interest">Intérêts</option>
                <option value="Fee">Frais</option>
                <option value="Other">Autres</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date début</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date fin</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recherche</label>
              <input
                type="text"
                placeholder="Description, référence..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          
          {(filterType !== 'ALL' || dateFrom || dateTo || searchText) && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {filteredItems.length} résultat(s) sur {items.length} transaction(s)
              </p>
              <button
                onClick={() => {
                  setFilterType('ALL');
                  setDateFrom('');
                  setDateTo('');
                  setSearchText('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Réinitialiser filtres
              </button>
            </div>
          )}
        </div>
      )}

      {/* Actions d'export et nouvelle transaction */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {items.length > 0 && (
            <>
              <button 
                onClick={exportCsv} 
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button 
                onClick={exportPdf} 
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Imprimer PDF
              </button>
            </>
          )}
        </div>
        
        {accountInfo && (
          <button
            onClick={() => setShowNewTransactionModal(true)}
            disabled={!accountInfo || (accountInfo.status || '').toUpperCase() !== 'ACTIVE'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title={(accountInfo.status || '').toUpperCase() !== 'ACTIVE' ? 'Le compte doit être actif pour effectuer une transaction' : 'Nouvelle transaction'}
          >
            <Plus className="h-4 w-4" />
            Nouvelle Transaction
          </button>
        )}
      </div>

      {/* Tableau des transactions */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-700">Chargement des transactions...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 text-lg mb-2">Aucune transaction</p>
            <p className="text-gray-700 text-sm">Entrez un numéro de compte et cliquez sur "Charger"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Heure</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Solde avant</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Solde après</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-700">
                      Aucune transaction ne correspond aux filtres
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(t => {
                    const typeUpper = String(t.type || '').toUpperCase();
                    const isDeposit = typeUpper === 'DEPOSIT' || typeUpper.includes('OPENING');
                    const isWithdrawal = typeUpper === 'WITHDRAWAL';
                    const isInterest = typeUpper === 'INTEREST';
                    
                    return (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {new Date(t.processedAt).toLocaleString('fr-FR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isDeposit ? 'bg-green-100 text-green-800' :
                            isWithdrawal ? 'bg-red-100 text-red-800' :
                            isInterest ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          { (isDeposit || isInterest) ? '+' : isWithdrawal ? '-' : '' }{Number(t.amount).toFixed(2)} {t.currency}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {t.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {Number(t.balanceBefore || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                          {Number(t.balanceAfter).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {t.reference || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

          {/* Modal Nouvelle Transaction */}
          {showNewTransactionModal && accountInfo && (
            <NewTransactionModal
              account={accountInfo}
              onClose={() => setShowNewTransactionModal(false)}
              onSuccess={() => {
                setShowNewTransactionModal(false);
                load(); // Recharger les transactions
              }}
            />
          )}
        </>
      )}

      {/* Vue Historique global */}
      {viewMode === 'history' && (
        <HistoryView
          transactions={allTransactions}
          loading={historyLoading}
          filters={historyFilters}
          onFiltersChange={setHistoryFilters}
          onRefresh={loadHistory}
          branches={branches}
        />
      )}
    </div>
  );
};

// Composant pour l'historique global
const HistoryView: React.FC<{
  transactions: AccountTransaction[];
  loading: boolean;
  filters: any;
  onFiltersChange: (filters: any) => void;
  onRefresh: () => void;
  branches: { id: number; name: string }[];
}> = ({ transactions, loading, filters, onFiltersChange, onRefresh, branches }) => {
  
  // Filtrer les transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    
    if (filters.accountNumber) {
      result = result.filter(t => 
        (t.accountNumber || '').toLowerCase().includes(filters.accountNumber.toLowerCase())
      );
    }
    
    if (filters.type && filters.type !== 'ALL') {
      result = result.filter(t => String(t.type || '').toUpperCase() === filters.type.toUpperCase());
    }
    
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter(t => new Date(t.processedAt) >= from);
    }
    
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(t => new Date(t.processedAt) <= to);
    }
    
    if (filters.minAmount) {
      result = result.filter(t => Number(t.amount || 0) >= Number(filters.minAmount));
    }
    
    if (filters.maxAmount) {
      result = result.filter(t => Number(t.amount || 0) <= Number(filters.maxAmount));
    }
    
    return result;
  }, [transactions, filters]);

  // Statistiques
  const stats = useMemo(() => {
    const typeUpper = (t: AccountTransaction) => String(t.type || '').toUpperCase();
    const deposits = filteredTransactions.filter(t => {
      const tp = typeUpper(t);
      return tp === 'DEPOSIT' || tp.includes('OPENING');
    });
    const withdrawals = filteredTransactions.filter(t => typeUpper(t) === 'WITHDRAWAL');
    const interests = filteredTransactions.filter(t => typeUpper(t) === 'INTEREST');
    
    return {
      totalDeposits: deposits.reduce((sum, t) => sum + Number(t.amount || 0), 0),
      totalWithdrawals: withdrawals.reduce((sum, t) => sum + Number(t.amount || 0), 0),
      totalInterests: interests.reduce((sum, t) => sum + Number(t.amount || 0), 0),
      countDeposits: deposits.length,
      countWithdrawals: withdrawals.length,
      countInterests: interests.length,
      totalCount: filteredTransactions.length
    };
  }, [filteredTransactions]);

  // Map pour les noms de succursales
  const branchMap = useMemo(() => {
    const map: Record<number, string> = {};
    branches.forEach(b => {
      map[b.id] = b.name;
    });
    return map;
  }, [branches]);

  const exportCsv = () => {
    try {
      const head = ['Date', 'Compte', 'Succursale', 'Type', 'Montant', 'Devise', 'Description', 'Solde après', 'Référence', 'Traité par'];
      const lines = [head.join(',')];
      filteredTransactions.forEach(t => {
        const row = [
          new Date(t.processedAt).toLocaleString('fr-FR'),
          t.accountNumber || '',
          branchMap[(t as any).branchId] || 'N/A',
          t.type,
          String(t.amount),
          t.currency,
          (t.description || '').replaceAll(',', ' '),
          String(t.balanceAfter),
          t.reference || '',
          (t as any).processedByName || t.processedBy || ''
        ];
        lines.push(row.map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(','));
      });
      const blob = new Blob(["\ufeff" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historique-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export CSV terminé');
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export CSV");
    }
  };

  const exportPdf = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Veuillez autoriser les pop-ups pour exporter en PDF');
        return;
      }

      const rows = filteredTransactions.map(t => {
        const typeUpper = String(t.type || '').toUpperCase();
        const isDeposit = typeUpper === 'DEPOSIT' || typeUpper.includes('OPENING');
        const sign = isDeposit ? '+' : typeUpper === 'WITHDRAWAL' ? '-' : '';

        return `
          <tr>
            <td style="padding:8px;border:1px solid #ddd">${new Date(t.processedAt).toLocaleString('fr-FR')}</td>
            <td style="padding:8px;border:1px solid #ddd">${t.accountNumber || ''}</td>
            <td style="padding:8px;border:1px solid #ddd">${branchMap[(t as any).branchId] || 'N/A'}</td>
            <td style="padding:8px;border:1px solid #ddd">${t.type}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${sign}${Number(t.amount).toFixed(2)} ${t.currency}</td>
            <td style="padding:8px;border:1px solid #ddd">${(t.description || '').substring(0, 30)}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${Number(t.balanceAfter).toFixed(2)}</td>
            <td style="padding:8px;border:1px solid #ddd">${(t as any).processedByName || t.processedBy || ''}</td>
          </tr>
        `;
      }).join('');

      const html = `
        <html><head><meta charset="utf-8"><title>Historique des Transactions - Comptes à Terme</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; padding: 20px; }
          h2 { color: #581c87; margin-bottom: 10px; }
          .info { margin-bottom: 20px; font-size: 14px; color: #666; }
          .stats { margin-bottom: 20px; padding: 10px; background: #f9fafb; border-radius: 8px; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #9333ea; color: white; font-weight: bold; }
          tr:nth-child(even) { background: #fdfdfe; }
          .amount { text-align: right; }
        </style>
        </head><body>
        <h2>Historique des Transactions - Comptes à Terme</h2>
        <div class="info">
          <p><strong>Généré le:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        </div>
        <div class="stats">
          <p><strong>Total transactions:</strong> ${filteredTransactions.length} | <strong>Dépôts:</strong> ${stats.countDeposits} | <strong>Retraits:</strong> ${stats.countWithdrawals}</p>
          <p><strong>Montant dépôts:</strong> ${stats.totalDeposits.toFixed(2)} | <strong>Montant retraits:</strong> ${stats.totalWithdrawals.toFixed(2)}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Compte</th>
              <th>Succursale</th>
              <th>Type</th>
              <th class="amount">Montant</th>
              <th>Description</th>
              <th class="amount">Solde après</th>
              <th>Traité par</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
        </body></html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      toast.success('Fenêtre d\'export ouverte - utilisez Imprimer pour sauver en PDF');
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-700">Filtres avancés</h3>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            Actualiser
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Numéro de compte</label>
            <input
              type="text"
              placeholder="G12345..."
              value={filters.accountNumber}
              onChange={(e) => onFiltersChange({ ...filters, accountNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Succursale</label>
            <select
              value={filters.branchId}
              onChange={(e) => onFiltersChange({ ...filters, branchId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="">Toutes les succursales</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="ALL">Tous les types</option>
              <option value="DEPOSIT">Dépôts</option>
              <option value="WITHDRAWAL">Retraits</option>
              <option value="INTEREST">Intérêts</option>
              <option value="FEE">Frais</option>
              <option value="OTHER">Autres</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date début</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date fin</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Montant min</label>
            <input
              type="number"
              placeholder="0.00"
              value={filters.minAmount}
              onChange={(e) => onFiltersChange({ ...filters, minAmount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Montant max</label>
            <input
              type="number"
              placeholder="0.00"
              value={filters.maxAmount}
              onChange={(e) => onFiltersChange({ ...filters, maxAmount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          
          <div className="lg:col-span-2 flex items-end gap-2">
            <button
              onClick={() => onFiltersChange({
                accountNumber: '',
                type: 'ALL',
                dateFrom: '',
                dateTo: '',
                branchId: '',
                minAmount: '',
                maxAmount: ''
              })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" />
              Réinitialiser filtres
            </button>
          </div>
        </div>
        
        {filteredTransactions.length < transactions.length && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-purple-600">{filteredTransactions.length}</span> résultat(s) sur <span className="font-semibold">{transactions.length}</span> transaction(s)
            </p>
            {filters.branchId && (
              <p className="text-sm text-purple-600">
                Succursale: <span className="font-semibold">{branchMap[Number(filters.branchId)]}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Dépôts</p>
              <p className="text-2xl font-bold text-green-700">{stats.countDeposits}</p>
              <p className="text-xs text-green-600">{stats.totalDeposits.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Retraits</p>
              <p className="text-2xl font-bold text-red-700">{stats.countWithdrawals}</p>
              <p className="text-xs text-red-600">{stats.totalWithdrawals.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Intérêts</p>
              <p className="text-2xl font-bold text-blue-700">{stats.countInterests}</p>
              <p className="text-xs text-blue-600">{stats.totalInterests.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Total</p>
              <p className="text-2xl font-bold text-purple-700">{stats.totalCount}</p>
              <p className="text-xs text-purple-600">transaction(s)</p>
            </div>
            <FileText className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Bouton Export */}
      {filteredTransactions.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV ({filteredTransactions.length} transactions)
          </button>
          <button
            onClick={exportPdf}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" />
            Export PDF ({filteredTransactions.length} transactions)
          </button>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader className="h-10 w-10 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-gray-500">Chargement de l'historique...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg mb-2">Aucune transaction trouvée</p>
            <p className="text-gray-400 text-sm">Modifiez les filtres ou actualisez les données</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-purple-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Date & Heure</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Compte</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Succursale</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase tracking-wider">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase tracking-wider">Solde après</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Référence</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Traité par</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((t, idx) => {
                  const typeUpper = String(t.type || '').toUpperCase();
                  const isDeposit = typeUpper === 'DEPOSIT' || typeUpper.includes('OPENING');
                  const isWithdrawal = typeUpper === 'WITHDRAWAL';
                  const isInterest = typeUpper === 'INTEREST';
                  
                  return (
                    <tr key={t.id || idx} className="hover:bg-purple-50 transition-colors">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {new Date(t.processedAt).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {t.accountNumber || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {branchMap[(t as any).branchId] || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          isDeposit ? 'bg-green-100 text-green-800' :
                          isWithdrawal ? 'bg-red-100 text-red-800' :
                          isInterest ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        isDeposit || isInterest ? 'text-green-600' :
                        isWithdrawal ? 'text-red-600' :
                        'text-gray-900'
                      }`}>
                        {isDeposit || isInterest ? '+' : isWithdrawal ? '-' : ''}
                        {Number(t.amount).toFixed(2)} {t.currency}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {t.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {Number(t.balanceAfter).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {t.reference || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {(t as any).processedByName || t.processedBy || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Modal pour nouvelle transaction
const NewTransactionModal: React.FC<{
  account: ClientAccount;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ account, onClose, onSuccess }) => {
  const [transactionType, setTransactionType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Montant invalide');
      return;
    }

    // Validation pour retrait
    if (transactionType === 'WITHDRAWAL') {
      if (amountNum > Number(account.availableBalance || 0)) {
        toast.error(`Solde disponible insuffisant (${Number(account.availableBalance || 0).toFixed(2)} ${account.currency})`);
        return;
      }
    }

    if (!window.confirm(
      `Confirmer cette transaction?\n\n` +
      `Type: ${transactionType === 'DEPOSIT' ? 'Dépôt' : 'Retrait'}\n` +
      `Montant: ${amountNum.toFixed(2)} ${account.currency}\n` +
      `Compte: ${account.accountNumber}\n` +
      `Client: ${account.customerName}\n\n` +
      `Cette action est irréversible.`
    )) {
      return;
    }

    setProcessing(true);
    try {
      await apiService.processTermSavingsTransaction({
        accountNumber: account.accountNumber || '',
        type: transactionType,
        amount: amountNum,
        currency: account.currency as 'HTG' | 'USD',
        description: description.trim() || undefined
      });
      
      toast.success(`${transactionType === 'DEPOSIT' ? 'Dépôt' : 'Retrait'} de ${amountNum.toFixed(2)} ${account.currency} effectué avec succès`);
      onSuccess();
    } catch (error: any) {
      console.error('Error processing transaction:', error);
      const msg = error?.response?.data?.message || error?.message || 'Erreur lors du traitement de la transaction';
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const maxWithdrawal = Number(account.availableBalance || 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Nouvelle Transaction</h3>
            <p className="text-blue-100 text-sm">{account.accountNumber} • {account.customerName}</p>
          </div>
          <button onClick={onClose} className="text-white/90 hover:text-white text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info compte */}
          <div className="bg-gray-50 rounded-lg p-4 border space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-900">Solde actuel:</span>
              <span className="font-semibold">{Number(account.balance).toFixed(2)} {account.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-900">Solde disponible:</span>
              <span className="font-semibold">{Number(account.availableBalance || 0).toFixed(2)} {account.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-900">Terme:</span>
              <span className="font-semibold">{getTermTypeLabel(account.termType || TermSavingsType.TWELVE_MONTHS)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-900">Échéance:</span>
              <span className="font-semibold">{account.maturityDate ? new Date(account.maturityDate).toLocaleDateString('fr-FR') : '—'}</span>
            </div>
          </div>

          {/* Type de transaction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de transaction</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTransactionType('DEPOSIT')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  transactionType === 'DEPOSIT'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <TrendingUp className="h-5 w-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Dépôt</span>
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('WITHDRAWAL')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  transactionType === 'WITHDRAWAL'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <TrendingDown className="h-5 w-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Retrait</span>
              </button>
            </div>
          </div>

          {/* Montant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Montant ({account.currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={transactionType === 'WITHDRAWAL' ? maxWithdrawal : undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
            />
            {transactionType === 'WITHDRAWAL' && (
              <p className="text-xs text-gray-500 mt-1">
                Maximum disponible: {maxWithdrawal.toFixed(2)} {account.currency}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optionnel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes ou remarques sur cette transaction..."
              rows={3}
              maxLength={200}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/200 caractères
            </p>
          </div>

          {/* Avertissement pour retrait */}
          {transactionType === 'WITHDRAWAL' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Attention!</p>
                <p className="text-xs mt-1">
                  Les retraits avant échéance peuvent entraîner des pénalités. Vérifiez la date d'échéance du compte.
                </p>
              </div>
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={processing || !amount}
              className={`flex-1 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${
                transactionType === 'DEPOSIT'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {processing ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirmer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// KPI: Accounts maturing soon, new accounts this month
const KpiMaturitySoon: React.FC<{ accounts: ClientAccount[] }> = ({ accounts }) => {
  const now = new Date();
  const inDays = (d: string) => Math.ceil((new Date(d).getTime() - now.getTime()) / (1000*60*60*24));
  const in7 = accounts.filter(a => a.maturityDate && inDays(a.maturityDate) >= 0 && inDays(a.maturityDate) <= 7).length;
  const in30 = accounts.filter(a => a.maturityDate && inDays(a.maturityDate) >= 0 && inDays(a.maturityDate) <= 30).length;
  const newThisMonth = accounts.filter(a => {
    const d = new Date(a.openingDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const avgRate = (() => {
    const rates = accounts.map(a => Number(a.interestRate ?? getTermMonthlyInterestPercent(a.termType || TermSavingsType.TWELVE_MONTHS, a.currency)));
    if (!rates.length) return 0;
    return rates.reduce((s, r) => s + r, 0) / rates.length;
  })();
  return (
    <div className="bg-gradient-to-br from-slate-500 to-slate-600 p-6 rounded-xl text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90">Échéances</p>
          <p className="text-lg font-semibold">7j: {in7} • 30j: {in30}</p>
          <p className="text-xs mt-1 opacity-75">Nouveaux (ce mois): {newThisMonth} • Taux moyen: {((avgRate*100)/12).toFixed(2)}%</p>
        </div>
        <Calendar className="h-10 w-10 opacity-80" />
      </div>
    </div>
  );
};

// Details modal for a term savings account
const TermSavingsDetailsModal: React.FC<{ account: ClientAccount; onClose: () => void; onRefresh: () => void }> = ({ account, onClose, onRefresh }) => {
  const [txLoading, setTxLoading] = useState(false);

  const opening = new Date(account.openingDate);
  const maturity = account.maturityDate ? new Date(account.maturityDate) : (() => {
    const d = new Date(opening);
    const m = getTermMonths(account.termType || TermSavingsType.TWELVE_MONTHS) || 12;
    d.setMonth(d.getMonth() + m);
    return d;
  })();
  const termMonths = getTermMonths(account.termType || TermSavingsType.TWELVE_MONTHS) || 12;
  const monthlyRate = getMonthlyInterestRatePercent({ interestRate: Number(account.interestRate), interestRateMonthly: account.interestRateMonthly, termType: account.termType });
  const principal = Number(account.balance || 0); // approximation if principal not provided
  const now = new Date();
  const elapsedDays = Math.max(0, Math.floor((now.getTime() - opening.getTime()) / (1000 * 60 * 60 * 24)));
  const totalDays = Math.max(1, Math.floor((maturity.getTime() - opening.getTime()) / (1000 * 60 * 60 * 24)));
  const projectedInterest = computeTermProjectedInterest(principal, monthlyRate, account.termType);
  const accruedInterest = computeAccruedInterestByDays(principal, monthlyRate, account.openingDate, now); // approximate monthly by days
  const totalAtMaturity = principal + projectedInterest;

  const format = (amount: number) => {
    return account.currency === 'HTG'
      ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' HTG'
      : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  };

  const handleViewTransactions = async () => {
    toast.success('Ouverture des transactions...');
    // TODO: Implement transaction viewing
  };

  const handleCalculateInterest = () => {
    toast.success(`Intérêt projeté: ${format(projectedInterest)}`);
  };

  const handleRenew = async () => {
    if (!window.confirm(`Confirmer le renouvellement du compte ${account.accountNumber} ?`)) return;
    const loadingId = toast.loading('Renouvellement en cours...');
    try {
      await apiService.renewTermSavingsAccount(String(account.id || account.accountNumber));
      toast.dismiss(loadingId);
      toast.success('Renouvellement effectué');
      onRefresh();
      onClose();
    } catch (e: any) {
      toast.dismiss(loadingId);
      const status = e?.response?.status;
      if (status === 404 || status === 501 || status === 400) {
        toast((t) => (
          <div className="text-sm">
            <p className="font-semibold">Renouvellement</p>
            <p>Cette action sera disponible lorsque l'API backend sera prête.</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 border rounded">Fermer</button>
            </div>
          </div>
        ));
        return;
      }
      const msg = e?.response?.data?.message || e?.message || 'Erreur lors du renouvellement';
      toast.error(msg);
    }
  };

  const handleEarlyClose = async () => {
    // Verifye si kont lan deja fermé
    if ((account.status || '').toUpperCase() === 'CLOSED') {
      toast.error('Ce compte est déjà fermé.');
      return;
    }
    
    if ((account.status || '').toUpperCase() === 'INACTIVE') {
      toast.error('Ce compte est inactif. Contactez un administrateur.');
      return;
    }
    
    const today = new Date();
    // Itilize dat echeance ki kalkile deja nan modal la
    const hasMatured = today >= maturity;
    
    if (hasMatured) {
      toast.error('Ce compte est déjà arrivé à échéance. Utilisez "Fermer compte" pour une fermeture normale.');
      return;
    }
    
    const daysRemaining = Math.ceil((maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const penaltyPct = window.prompt(
      `Le compte n'est pas encore échu (${daysRemaining} jours restants).\n\n` +
      `Pour un retrait anticipé, entrez le pourcentage de pénalité (%) à appliquer (ex: 2):`,
      '2'
    );
    
    if (!penaltyPct) return;
    
    const penalty = Number(penaltyPct);
    if (isNaN(penalty) || penalty < 0) {
      toast.error('Pourcentage de pénalité invalide');
      return;
    }
    
    const penaltyAmount = Number(account.balance || 0) * (penalty / 100);
    const netAmount = Number(account.balance || 0) - penaltyAmount;
    
    const reason = window.prompt(
      `RETRAIT ANTICIPÉ du compte ${account.accountNumber}\n\n` +
      `Balance actuelle: ${account.balance} ${account.currency}\n` +
      `Pénalité (${penalty}%): ${penaltyAmount.toFixed(2)} ${account.currency}\n` +
      `Montant net à verser: ${netAmount.toFixed(2)} ${account.currency}\n\n` +
      `Entrez la raison du retrait anticipé:`,
      'Retrait anticipé à la demande du client'
    );
    
    if (!reason) {
      toast.error('La raison est obligatoire');
      return;
    }
    
    if (!window.confirm(
      `⚠️ CONFIRMER LE RETRAIT ANTICIPÉ?\n\n` +
      `Compte: ${account.accountNumber}\n` +
      `Balance: ${account.balance} ${account.currency}\n` +
      `Pénalité (${penalty}%): ${penaltyAmount.toFixed(2)} ${account.currency}\n` +
      `Net à verser: ${netAmount.toFixed(2)} ${account.currency}\n\n` +
      `Cette action est IRRÉVERSIBLE et fermera définitivement le compte.`
    )) {
      return;
    }
    
    setTxLoading(true);
    try {
      await apiService.closeTermSavingsAccount(String(account.id), reason, penalty);
      toast.success(`Retrait anticipé effectué avec pénalité de ${penalty}%. Compte ${account.accountNumber} fermé.`);
      onRefresh();
      onClose();
    } catch (error: any) {
      console.error('Error during early withdrawal:', error);
      const msg = error?.response?.data?.message || error?.message || 'Erreur lors du retrait anticipé';
      toast.error(msg);
    } finally {
      setTxLoading(false);
    }
  };

  const handleCloseAccount = async () => {
    // Verifye si kont lan deja fermé
    if ((account.status || '').toUpperCase() === 'CLOSED') {
      toast.error('Ce compte est déjà fermé. Utilisez le bouton "Supprimer" pour l\'effacer définitivement.');
      return;
    }
    
    if ((account.status || '').toUpperCase() === 'INACTIVE') {
      toast.error('Ce compte est inactif. Contactez un administrateur pour le réactiver avant de le fermer.');
      return;
    }
    
    const today = new Date();
    const maturityDate = account.maturityDate ? new Date(account.maturityDate) : null;
    const hasMatured = maturityDate ? today >= maturityDate : false;
    
    if (!hasMatured && maturityDate) {
      const daysRemaining = Math.ceil((maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const penaltyPct = window.prompt(
        `Ce compte arrive à échéance dans ${daysRemaining} jours.\n\nPour un retrait anticipé, entrez le pourcentage de pénalité (%) à appliquer (ex: 2):`,
        '2'
      );
      
      if (!penaltyPct) return;
      
      const penalty = Number(penaltyPct);
      if (isNaN(penalty) || penalty < 0) {
        toast.error('Pourcentage de pénalité invalide');
        return;
      }
      
      const penaltyAmount = Number(account.balance || 0) * (penalty / 100);
      const netAmount = Number(account.balance || 0) - penaltyAmount;
      
      const reason = window.prompt(
        `Retrait anticipé du compte ${account.accountNumber}\n\nBalance: ${account.balance} ${account.currency}\nPénalité (${penalty}%): ${penaltyAmount.toFixed(2)} ${account.currency}\nMontant net: ${netAmount.toFixed(2)} ${account.currency}\n\nEntrez la raison:`,
        'Retrait anticipé à la demande du client'
      );
      
      if (!reason) {
        toast.error('La raison est obligatoire');
        return;
      }
      
      if (!window.confirm(`Confirmer le retrait anticipé?\n\nPénalité: ${penaltyAmount.toFixed(2)} ${account.currency}\nNet: ${netAmount.toFixed(2)} ${account.currency}\n\nCette action est irréversible.`)) {
        return;
      }
      
      setTxLoading(true);
      try {
        await apiService.closeTermSavingsAccount(String(account.id), reason, penalty);
        toast.success(`Compte ${account.accountNumber} fermé avec pénalité de ${penalty}%`);
        onRefresh();
        onClose();
      } catch (error: any) {
        console.error('Error closing account with penalty:', error);
        const msg = error?.response?.data?.message || error?.message || 'Erreur lors de la fermeture anticipée';
        toast.error(msg);
      } finally {
        setTxLoading(false);
      }
    } else {
      const reason = window.prompt(
        `Fermeture du compte ${account.accountNumber} de ${account.customerName}\n\nBalance actuelle: ${account.balance} ${account.currency}\n${hasMatured ? 'Compte arrivé à échéance' : ''}\n\nEntrez la raison de la fermeture:`,
        hasMatured ? 'Arrivée à échéance' : 'Fermeture demandée par le client'
      );
      
      if (!reason) {
        toast.error('La raison de fermeture est obligatoire');
        return;
      }
      
      if (!window.confirm(`Confirmer la fermeture du compte ${account.accountNumber}?\n\nRaison: ${reason}\n\nCette action est irréversible.`)) {
        return;
      }
      
      setTxLoading(true);
      try {
        await apiService.closeTermSavingsAccount(String(account.id), reason);
        toast.success(`Compte ${account.accountNumber} fermé avec succès`);
        onRefresh();
        onClose();
      } catch (error: any) {
        console.error('Error closing account:', error);
        const msg = error?.response?.data?.message || error?.message || 'Erreur lors de la fermeture du compte';
        toast.error(msg);
      } finally {
        setTxLoading(false);
      }
    }
  };

  const handleDelete = async () => {
    if (account.balance > 0) {
      toast.error('Impossible de supprimer un compte avec solde non-nul. Fermez-le d\'abord.');
      return;
    }
    if ((account.status || '').toUpperCase() === 'ACTIVE') {
      toast.error('Impossible de supprimer un compte actif. Fermez-le d\'abord.');
      return;
    }
    
    if (!window.confirm(`ATTENTION: Supprimer définitivement le compte ${account.accountNumber}?\n\nCette action est IRRÉVERSIBLE et effacera toutes les données associées.`)) {
      return;
    }
    
    setTxLoading(true);
    try {
      await apiService.deleteTermSavingsAccount(String(account.id));
      toast.success(`Compte ${account.accountNumber} supprimé`);
      onRefresh();
      onClose();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      const msg = error?.response?.data?.message || error?.message || 'Erreur lors de la suppression du compte';
      toast.error(msg);
    } finally {
      setTxLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    const currentStatus = (account.status || '').toUpperCase();
    const isSuspended = currentStatus === 'SUSPENDED' || currentStatus === 'INACTIVE';
    const action = isSuspended ? 'activer' : 'suspendre';
    const newStatus = isSuspended ? 'ACTIVE' : 'SUSPENDED';
    
    // Don't allow toggling closed accounts
    if (currentStatus === 'CLOSED') {
      toast.error('Impossible de modifier le statut d\'un compte fermé.');
      return;
    }
    
    if (!window.confirm(`Confirmer l'action : ${action} le compte ${account.accountNumber} ?\n\nLe statut passera de ${currentStatus} à ${newStatus}.`)) {
      return;
    }
    
    setTxLoading(true);
    try {
      // Call API to toggle account status
      await apiService.toggleTermSavingsAccountStatus(String(account.id));
      toast.success(`Compte ${account.accountNumber} ${isSuspended ? 'activé' : 'suspendu'} avec succès`);
      onRefresh();
      onClose();
    } catch (error: any) {
      console.error('Error toggling account status:', error);
      const msg = error?.response?.data?.message || error?.message || 'Erreur lors du changement de statut';
      toast.error(msg);
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Détails du Compte à Terme</h3>
            <p className="text-purple-100">{account.accountNumber} • {account.currency} • {getTermTypeLabel(account.termType || TermSavingsType.TWELVE_MONTHS)}</p>
          </div>
          <button onClick={onClose} className="text-white/90 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h4 className="font-semibold text-gray-900 mb-2">Informations</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li><span className="text-gray-500">Client: </span>{account.customerName || '—'}</li>
                <li><span className="text-gray-500">Succursale: </span>{account.branchName || '—'}</li>
                <li><span className="text-gray-500">Ouverture: </span>{new Date(account.openingDate).toLocaleDateString('fr-FR')}</li>
                <li><span className="text-gray-500">Échéance: </span>{maturity.toLocaleDateString('fr-FR')} ({Math.max(0, Math.ceil((maturity.getTime() - now.getTime()) / (1000*60*60*24)))} jours restants)</li>
                <li><span className="text-gray-500">Taux: </span>{monthlyRate.toFixed(2)}%/mois</li>
                <li><span className="text-gray-500">Statut: </span>{account.status}</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h4 className="font-semibold text-gray-900 mb-2">Montants</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li><span className="text-gray-500">Capital (approx.): </span><span className="font-medium">{format(principal)}</span></li>
                <li><span className="text-gray-500">Intérêt accumulé (estimé): </span><span className="font-medium text-purple-700">{format(accruedInterest)}</span></li>
                <li><span className="text-gray-500">Intérêt projeté à l'échéance: </span><span className="font-medium text-purple-700">{format(projectedInterest)}</span></li>
                <li><span className="text-gray-500">Total à l'échéance: </span><span className="font-semibold">{format(totalAtMaturity)}</span></li>
              </ul>
              <p className="text-xs text-gray-500 mt-2">Les calculs sont des estimations simples (intérêt simple) basées sur les données disponibles.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleViewTransactions}
              disabled={txLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
              title="Voir les transactions"
            >
              <FileText className="w-4 h-4" />
              Transactions
            </button>
            <button
              onClick={handleCalculateInterest}
              disabled={(account.status || '').toUpperCase() !== 'ACTIVE'}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
              title={(account.status || '').toUpperCase() !== 'ACTIVE' ? 'Disponible uniquement pour les comptes actifs' : 'Calculer les intérêts projetés'}
            >
              <Calculator className="w-4 h-4" />
              Calc. intérêts
            </button>
            <button
              onClick={handleRenew}
              disabled={txLoading || (account.status || '').toUpperCase() !== 'ACTIVE'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              title={(account.status || '').toUpperCase() !== 'ACTIVE' ? 'Disponible uniquement pour les comptes actifs' : 'Renouveler le compte à l\'échéance'}
            >
              <RotateCw className="w-4 h-4" />
              Renouveler
            </button>
            <button
              onClick={handleEarlyClose}
              disabled={(account.status || '').toUpperCase() !== 'ACTIVE'}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 disabled:opacity-50"
              title={(account.status || '').toUpperCase() !== 'ACTIVE' ? 'Disponible uniquement pour les comptes actifs' : 'Calculer retrait anticipé avec pénalité'}
            >
              <AlertCircle className="w-4 h-4" />
              Retrait anticipé
            </button>
            <button
              onClick={handleCloseAccount}
              disabled={txLoading || (account.status || '').toUpperCase() !== 'ACTIVE'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
              title={(account.status || '').toUpperCase() !== 'ACTIVE' ? 'Le compte est déjà fermé ou inactif' : 'Fermer définitivement le compte'}
            >
              <XCircle className="w-4 h-4" />
              Fermer compte
            </button>
            <button
              onClick={handleToggleStatus}
              disabled={txLoading || (account.status || '').toUpperCase() === 'CLOSED'}
              className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 ${
                ((account.status || '').toUpperCase() === 'SUSPENDED' || (account.status || '').toUpperCase() === 'INACTIVE')
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
              title={(account.status || '').toUpperCase() === 'CLOSED' ? 'Impossible de modifier un compte fermé' : 
                     ((account.status || '').toUpperCase() === 'SUSPENDED' || (account.status || '').toUpperCase() === 'INACTIVE') 
                       ? 'Activer le compte' 
                       : 'Suspendre le compte (bloquer temporairement)'}
            >
              {((account.status || '').toUpperCase() === 'SUSPENDED' || (account.status || '').toUpperCase() === 'INACTIVE') ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Activer
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Suspendre
                </>
              )}
            </button>
            <button
              onClick={() => printCertificate(account, { principal, rate: monthlyRate / 100 * 12, maturity, totalAtMaturity })}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              title="Imprimer le certificat"
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </button>
            <button
              onClick={handleDelete}
              disabled={txLoading || account.status === 'ACTIVE' || Number(account.balance || 0) > 0}
              className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-950 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                account.status === 'ACTIVE' 
                  ? "❌ Fermez d'abord le compte pour pouvoir le supprimer" 
                  : Number(account.balance || 0) > 0
                  ? `❌ Le compte doit avoir un solde de 0 pour être supprimé (Balance actuelle: ${account.balance} ${account.currency})`
                  : "✅ Supprimer définitivement le compte"
              }
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function printCertificate(account: ClientAccount, context: { principal: number; rate: number; maturity: Date; totalAtMaturity: number }) {
  try {
    const open = new Date(account.openingDate);
    const html = `<!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>Certificat de Dépôt</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; }
        .title { text-align:center; font-size:20px; margin-bottom: 12px; }
        .subtitle { text-align:center; color:#555; margin-bottom:24px; }
        .box { border:1px solid #ccc; border-radius:8px; padding:16px; }
        .row { display:flex; justify-content:space-between; margin:6px 0; }
        .label { color:#666; }
        .value { font-weight:600; }
        .footer { margin-top:24px; font-size:12px; color:#666; }
      </style>
    </head>
    <body>
      <div class="title">Certificat de Dépôt à Terme</div>
      <div class="subtitle">Kredi Ti Machann • ${account.branchName || 'Succursale'}</div>
      <div class="box">
        <div class="row"><div class="label">Numéro de compte</div><div class="value">${account.accountNumber}</div></div>
        <div class="row"><div class="label">Client</div><div class="value">${account.customerName || ''}</div></div>
        <div class="row"><div class="label">Devise</div><div class="value">${account.currency}</div></div>
        <div class="row"><div class="label">Montant (capital)</div><div class="value">${context.principal}</div></div>
  <div class="row"><div class="label">Taux</div><div class="value">${getMonthlyInterestRatePercent({ interestRate: context.rate, termType: account.termType }).toFixed(2)}% par mois</div></div>
        <div class="row"><div class="label">Ouverture</div><div class="value">${open.toLocaleDateString('fr-FR')}</div></div>
        <div class="row"><div class="label">Échéance</div><div class="value">${context.maturity.toLocaleDateString('fr-FR')}</div></div>
        <div class="row"><div class="label">Montant à l'échéance (estimé)</div><div class="value">${context.totalAtMaturity}</div></div>
      </div>
      <div class="footer">Ce certificat confirme le placement à terme auprès de Kredi Ti Machann. Les montants affichés peuvent varier selon les conditions contractuelles et les intérêts calculés.</div>
      <script>window.onload = function(){ window.print(); setTimeout(() => window.close(), 300); }</script>
    </body>
    </html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (e) {
    console.error('print certificate error', e);
    toast.error('Erreur lors de la génération du certificat');
  }
}

// Interest Simulator Modal


function renderSortableHeader(label: string, key: keyof ClientAccount | 'interestRate' | 'maturityDate' | 'balance' | 'termType' | 'customerName' | 'branchName' | 'accountNumber' | 'currency', align: 'left' | 'right' = 'left') {
  return (
    <th
      className={`px-6 py-3 text-${align} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none`}
      onClick={() => {
        // This will be overridden in component scope using closure inlined through bind
      }}
      data-sort-key={key as string}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-4 w-4 text-gray-400" />
      </span>
    </th>
  );
}

// Modal 1: Existing customer -> open term savings account
const OpenTermSavingsAccountModal: React.FC<{ onClose: () => void; onSuccess: () => void; initialCustomer?: any }> = ({ onClose, onSuccess, initialCustomer }) => {
  const [step, setStep] = useState<'customer' | 'account'>('customer');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const lastSearchedRef = useRef<string>('');

  const [form, setForm] = useState({
    branchId: 1,
    currency: 'HTG' as 'HTG' | 'USD',
    termType: TermSavingsType.TWELVE_MONTHS as TermSavingsType,
    initialDeposit: 0,
    interestRatePercent: ''
  });

  // Preselect customer when provided by Clients tab
  useEffect(() => {
    if (initialCustomer) {
      setSelectedCustomer(initialCustomer);
      setStep('account');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCustomer]);

  const searchCustomers = async () => {
    const raw = customerSearch?.trim();
    if (!raw || raw.length < 2) return;
    try {
      setLoading(true);
      const term = raw.toUpperCase();
      if (lastSearchedRef.current === term) return;
      lastSearchedRef.current = term;
      const list = await apiService.getSavingsCustomers(term);
      setCustomers(list || []);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la recherche du client');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customers.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [customers.length]);

  useEffect(() => {
    if (step !== 'customer') return;
    const raw = customerSearch?.trim();
    if (!raw || raw.length < 2) return;
    const upper = raw.toUpperCase();
    const delay = CODE_PATTERN.test(upper) ? 200 : 500;
    const handle = setTimeout(() => {
      if (lastSearchedRef.current !== upper) searchCustomers();
    }, delay);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerSearch, step]);

  useEffect(() => {
    if (step === 'account') {
      (async () => {
        try {
          const data = await apiService.getAllBranches();
          const mapped = (data || []).map((b: any) => ({ id: b.id || b.Id, name: b.name || b.Name }));
          setBranches(mapped);
          if (mapped.length) setForm((f) => ({ ...f, branchId: f.branchId || mapped[0].id }));
        } catch {}
      })();
    }
  }, [step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer?.id && !selectedCustomer?.Id) {
      toast.error('Veuillez sélectionner un client');
      return;
    }
    if (!form.initialDeposit || Number(form.initialDeposit) <= 0) {
      toast.error("Le dépôt initial doit être supérieur à 0");
      return;
    }
    if (!form.branchId) {
      toast.error('Veuillez sélectionner une succursale');
      return;
    }
  const monthlyRateFraction = form.interestRatePercent ? Number((Number(form.interestRatePercent) / 100).toFixed(6)) : undefined;
  const annualRateFraction = monthlyRateFraction !== undefined ? Number((monthlyRateFraction * 12).toFixed(6)) : undefined;
    const payload = {
      customerId: selectedCustomer.id || selectedCustomer.Id,
      currency: form.currency,
      initialDeposit: Number(form.initialDeposit),
      branchId: Number(form.branchId),
      termType: form.termType,
      // Maintain backward compatibility: send annual for existing backend, plus monthly field for new backend
      interestRate: annualRateFraction,
      interestRateMonthly: monthlyRateFraction
    };
    try {
      setLoading(true);
      await apiService.createTermSavingsAccount(payload);
      onSuccess();
    } catch (error: any) {
      // Surface backend validation messages when available
      console.error('Erreur ouverture compte à terme:', error, { payload });
      const serverData = error?.response?.data;
      const extracted = serverData?.message || (serverData?.errors ? Object.values(serverData.errors).flat().join('; ') : (typeof serverData === 'string' ? serverData : JSON.stringify(serverData)));
      toast.error(extracted || "Erreur lors de l'ouverture du compte à terme");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Ouvrir un Compte à Terme</h2>
              <p className="text-blue-100 mt-1">{step === 'customer' ? 'Étape 1: Sélectionner le client' : 'Étape 2: Configurer le compte'}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg">×</button>
          </div>
        </div>
        <div className="p-6 md:p-8">
          {step === 'customer' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher un client</label>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchCustomers(); } }}
                    placeholder="Nom, téléphone, code client (ex: TD5765) ou document..."
                    className="flex-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={searchCustomers}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Chercher
                  </button>
                </div>
                {loading && <div className="text-sm text-gray-500 mt-2">Recherche en cours...</div>}
                {!loading && customers.length === 0 && customerSearch.trim().length >= 2 && (
                  <div className="text-sm text-gray-500 mt-2">Aucun client trouvé</div>
                )}
              </div>
              {customers.length > 0 && (
                <div ref={resultsRef} className="space-y-2 max-h-[50vh] overflow-y-auto border border-gray-200 rounded-lg p-2 mt-2">
                  {customers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCustomer(c)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        (selectedCustomer?.id) === c.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{c.fullName || `${c.firstName} ${c.lastName}`}</p>
                          <p className="text-sm text-gray-500">{c.primaryPhone || c.phone}</p>
                          {(c.customerCode || c.CustomerCode) && (
                            <p className="text-xs text-gray-500">Code: {c.customerCode || c.CustomerCode}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">{c.documentType}: {c.documentNumber}</p>
                        </div>
                        {(selectedCustomer?.id) === c.id && (
                          <CheckCircle className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep('account')}
                  disabled={!selectedCustomer}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {step === 'account' && selectedCustomer && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Client sélectionné:</p>
                <p className="font-semibold text-gray-900">{selectedCustomer.fullName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`}</p>
                <button type="button" onClick={() => setStep('customer')} className="text-sm text-blue-600 hover:underline mt-1">Changer de client</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value as 'HTG' | 'USD' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="HTG">HTG (Gourdes)</option>
                    <option value="USD">USD (Dollars)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Succursale</label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {branches.length === 0 ? (
                      <option value={form.branchId}>#{form.branchId}</option>
                    ) : (
                      branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dépôt initial (requis)</label>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={form.initialDeposit}
                    onChange={(e) => setForm({ ...form, initialDeposit: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Terme</label>
                  <select
                    value={form.termType}
                    onChange={(e) => setForm({ ...form, termType: e.target.value as unknown as TermSavingsType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={TermSavingsType.THREE_MONTHS}>3 Mois</option>
                    <option value={TermSavingsType.SIX_MONTHS}>6 Mois</option>
                    <option value={TermSavingsType.TWELVE_MONTHS}>12 Mois</option>
                    <option value={TermSavingsType.TWENTY_FOUR_MONTHS}>24 Mois</option>
                  </select>
                </div>
                <div>
                  <label className="block text_sm font-medium text-gray-700 mb-2">Taux d'intérêt (% / mois)</label>
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    value={form.interestRatePercent || ''}
                    onChange={(e) => setForm({ ...form, interestRatePercent: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />

                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? 'Ouverture...' : 'Ouvrir le compte'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// Modal 2: New customer -> open term savings account
const CreateTermSavingsWithNewCustomerModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<'customer' | 'account'>('customer');
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [createdCustomer, setCreatedCustomer] = useState<any | null>(null);

  const [form, setForm] = useState({
    branchId: 1,
    currency: 'HTG' as 'HTG' | 'USD',
    termType: TermSavingsType.TWELVE_MONTHS as TermSavingsType,
    initialDeposit: 0,
    interestRatePercent: ''
  });

  useEffect(() => {
    if (step === 'account') {
      (async () => {
        try {
          const data = await apiService.getAllBranches();
          const mapped = (data || []).map((b: any) => ({ id: b.id || b.Id, name: b.name || b.Name }));
          setBranches(mapped);
          if (mapped.length) setForm((f) => ({ ...f, branchId: f.branchId || mapped[0].id }));
        } catch {}
      })();
    }
  }, [step]);

  // Map ClientCreationForm -> SavingsCustomerCreateDto
  const mapClientFormToSavingsCustomerDto = (clientData: any) => {
    const mapGender = (g: string) => (String(g).toUpperCase() === 'F' ? 1 : 0);
    const mapDocType = (t: any) => {
      // Ensure valid number 0-3; default to 0 (CIN) if invalid
      const parsed = Number(t);
      return isNaN(parsed) || parsed < 0 || parsed > 3 ? 0 : parsed;
    };
    return {
      isBusiness: !!clientData.isBusiness,
      companyName: clientData.companyName || undefined,
      legalForm: clientData.legalForm || undefined,
      tradeRegisterNumber: clientData.businessRegistrationNumber || undefined,
      taxId: clientData.companyNif || undefined,
      firstName: clientData.firstName,
      lastName: clientData.lastName,
      dateOfBirth: clientData.dateOfBirth,
      gender: mapGender(clientData.gender),
      street: clientData.street,
      commune: clientData.commune,
      department: clientData.department,
      postalCode: clientData.postalAddress || clientData.postalCode || undefined,
      primaryPhone: clientData.primaryPhone,
      secondaryPhone: clientData.secondaryPhone || undefined,
      email: clientData.email || undefined,
      emergencyContactName: clientData.emergencyContactName || clientData.emergencyContact?.name || undefined,
      emergencyContactPhone: clientData.emergencyContactPhone || clientData.emergencyContact?.phone || undefined,
      documentType: mapDocType(clientData.documentType),
      documentNumber: clientData.documentNumber,
      issuedDate: clientData.issuedDate,
      expiryDate: clientData.expiryDate || undefined,
      issuingAuthority: clientData.issuingAuthority,
      occupation: clientData.occupation || undefined,
      monthlyIncome: clientData.monthlyIncome ? Number(clientData.monthlyIncome) : undefined,
    };
  };

  const handleCustomerSubmit = async (clientData: any) => {
    setLoading(true);
    try {
      console.log('📥 Raw form data:', clientData);
      const dto = mapClientFormToSavingsCustomerDto(clientData);
      console.log('📤 Sending customer DTO:', dto);
      const created = await apiService.createSavingsCustomer(dto);
      setCreatedCustomer(created);
      toast.success('Client créé avec succès');
      setStep('account');
      return created;
    } catch (error: any) {
      console.error('Erreur création client:', error);
      console.error('❌ Response data:', error?.response?.data);
      toast.error(error?.response?.data?.message || 'Erreur lors de la création du client');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdCustomer?.id && !createdCustomer?.Id) {
      toast.error('Client invalide');
      return;
    }
    if (!form.initialDeposit || Number(form.initialDeposit) <= 0) {
      toast.error("Le dépôt initial doit être supérieur à 0");
      return;
    }
    if (!form.branchId) {
      toast.error('Veuillez sélectionner une succursale');
      return;
    }
    const monthlyRateFraction = form.interestRatePercent ? Number((Number(form.interestRatePercent) / 100).toFixed(6)) : undefined;
    const annualRateFraction = monthlyRateFraction !== undefined ? Number((monthlyRateFraction * 12).toFixed(6)) : undefined;

    const payload: any = {
      customerId: createdCustomer.id || createdCustomer.Id,
      currency: form.currency,
      initialDeposit: Number(form.initialDeposit),
      branchId: Number(form.branchId),
      termType: form.termType,
      // If user provided a monthly rate (as percent), send both monthly fraction and annual for compatibility
      interestRate: annualRateFraction,
      interestRateMonthly: monthlyRateFraction
    };
    setLoading(true);
    try {
      await apiService.createTermSavingsAccount(payload);
      onSuccess();
    } catch (error: any) {
      console.error('Erreur ouverture compte à terme (nouveau client):', error, { payload });
      const serverData = error?.response?.data;
      const extracted = serverData?.message || (serverData?.errors ? Object.values(serverData.errors).flat().join('; ') : (typeof serverData === 'string' ? serverData : JSON.stringify(serverData)));
      toast.error(extracted || "Erreur lors de l'ouverture du compte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Nouveau Client + Compte à Terme</h2>
              <p className="text-green-100 mt-1">{step === 'customer' ? 'Étape 1: Créer le client' : 'Étape 2: Configurer le compte'}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg">×</button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {step === 'customer' && (
            <ClientCreationForm onSubmit={handleCustomerSubmit} onCancel={onClose} isLoading={loading} />
          )}

          {step === 'account' && (
            <form onSubmit={handleSubmitAccount} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Succursale</label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value as 'HTG' | 'USD' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="HTG">HTG</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dépôt initial</label>
                  <input
                    type="number"
                    min={0}
                    value={form.initialDeposit}
                    onChange={(e) => setForm({ ...form, initialDeposit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Terme</label>
                  <select
                    value={form.termType}
                    onChange={(e) => setForm({ ...form, termType: e.target.value as unknown as TermSavingsType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={TermSavingsType.THREE_MONTHS}>3 Mois</option>
                    <option value={TermSavingsType.SIX_MONTHS}>6 Mois</option>
                    <option value={TermSavingsType.TWELVE_MONTHS}>12 Mois</option>
                    <option value={TermSavingsType.TWENTY_FOUR_MONTHS}>24 Mois</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Taux d'intérêt (% / mois)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.interestRatePercent || ''}
                    onChange={(e) => setForm({ ...form, interestRatePercent: e.target.value })}
                    placeholder=""
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Ouverture...' : 'Créer client et ouvrir compte'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export {}; // ensure module scope
