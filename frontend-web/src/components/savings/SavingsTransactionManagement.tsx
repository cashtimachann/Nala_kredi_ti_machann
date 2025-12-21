import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  RefreshCw,
  DollarSign,
  User,
  XCircle,
  CheckCircle,
  Clock,
  FileText,
  AlertCircle,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  TrendingUp
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import toast from 'react-hot-toast';
import { unparse } from 'papaparse';
import * as XLSX from 'xlsx';

interface Transaction {
  id: string;
  accountNumber: string;
  type: string;
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reference: string;
  processedBy: string;
  branchId: number;
  status: string;
  processedAt: string;
  fees?: number;
}

interface SavingsTransactionManagementProps {
  effectiveBranchId?: number;
  isBranchLocked?: boolean;
}

const SavingsTransactionManagement: React.FC<SavingsTransactionManagementProps> = ({ effectiveBranchId, isBranchLocked }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>(() => (effectiveBranchId ? { branchId: effectiveBranchId } : {}));
  const [statistics, setStatistics] = useState<any>(null);
  // Branches for mapping branchId -> branch name
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  // Admins for mapping processedBy (id) -> full name
  const [admins, setAdmins] = useState<{ id: string; fullName: string }[]>([]);
  // Employees for mapping processedBy (id) -> full name (fallback)
  const [employees, setEmployees] = useState<{ id: string; fullName: string }[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [processForm, setProcessForm] = useState({
    accountNumber: '',
    type: 0,
    destinationAccountNumber: '',
    amount: 0,
    currency: 0,
    description: '',
    customerPresent: true,
    verificationMethod: 'Pièce d\'identité',
    notes: ''
  });

  // Resolved account info based on entered account number
  const [resolvedAccount, setResolvedAccount] = useState<any | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [resolvedDestAccount, setResolvedDestAccount] = useState<any | null>(null);
  const [destLookupLoading, setDestLookupLoading] = useState(false);
  const [destLookupError, setDestLookupError] = useState<string | null>(null);

  const branchFilterId = useMemo(() => {
    if (filters.branchId != null && filters.branchId !== '') {
      const parsed = Number(filters.branchId);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    if (effectiveBranchId != null) {
      const parsed = Number(effectiveBranchId);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }, [filters.branchId, effectiveBranchId]);
  const branchSelectValue = branchFilterId ?? '';

  useEffect(() => {
    if (effectiveBranchId) {
      setFilters((prev: any) => {
        if (prev?.branchId === effectiveBranchId) {
          return prev;
        }
        return { ...prev, branchId: effectiveBranchId };
      });
    }
  }, [effectiveBranchId]);

  // Map various currency representations to form code (0=HTG, 1=USD)
  const currencyCodeFrom = (c: any): number => {
    if (c === undefined || c === null) return 0;
    const s = String(c).toUpperCase();
    if (s === '0' || s === 'HTG') return 0;
    if (s === '1' || s === 'USD') return 1;
    const n = Number(c);
    if (!Number.isNaN(n)) return n;
    return 0;
  };

  // When user enters a full account number (12 chars), look up account to show holder name and prefill currency
  useEffect(() => {
    const acct = (processForm.accountNumber || '').trim();
    if (!acct || acct.length !== 12) {
      setResolvedAccount(null);
      setLookupError(null);
      setLookupLoading(false);
      return;
    }
    let cancelled = false;
    const doLookup = async () => {
      try {
        setLookupLoading(true);
        setLookupError(null);
        const data = await apiService.getSavingsAccountByNumber(acct);
        if (cancelled) return;
        setResolvedAccount(data);
        // Prefill currency to match the account's currency
        const code = currencyCodeFrom((data && (data.currency ?? data.Currency)) ?? 0);
        setProcessForm(prev => ({ ...prev, currency: code }));
      } catch (err: any) {
        if (cancelled) return;
        setResolvedAccount(null);
        setLookupError('Compte introuvable');
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    };
    // Small debounce to avoid spamming API if user pastes/types quickly
    const t = setTimeout(doLookup, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [processForm.accountNumber]);

  useEffect(() => {
    const acct = (processForm.destinationAccountNumber || '').trim();
    if (!acct || acct.length !== 12) {
      setResolvedDestAccount(null);
      setDestLookupError(null);
      setDestLookupLoading(false);
      return;
    }
    let cancelled = false;
    const doLookup = async () => {
      try {
        setDestLookupLoading(true);
        setDestLookupError(null);
        const data = await apiService.getSavingsAccountByNumber(acct);
        if (cancelled) return;
        setResolvedDestAccount(data);
      } catch (err: any) {
        if (cancelled) return;
        setResolvedDestAccount(null);
        setDestLookupError('Compte destinataire introuvable');
      } finally {
        if (!cancelled) setDestLookupLoading(false);
      }
    };
    const t = setTimeout(doLookup, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [processForm.destinationAccountNumber]);

  useEffect(() => {
    loadTransactions();
    loadStatistics();
  }, [filters]);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Load branches once for display mapping
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await apiService.getAllBranches();
        const mapped = (data || []).map((b: any) => ({
          id: Number(b.id ?? b.branchId ?? b.BranchId),
          name: String(b.name ?? b.branchName ?? b.BranchName ?? b.code ?? `#${b.id ?? b.branchId ?? b.BranchId}`)
        })).filter((b: any) => !Number.isNaN(b.id));
        setBranches(mapped);
      } catch (err) {
        console.warn('Unable to load branches for display:', err);
      }
    };
    loadBranches();
  }, []);

  // Load admins once for display mapping (processedBy -> full name)
  useEffect(() => {
    const loadAdmins = async () => {
      try {
        const resp = await apiService.getAllAdmins?.({ page: 1, pageSize: 500 });
        const list = resp?.admins || resp || [];
        const mapped = (list || []).map((a: any) => ({ id: String(a.id), fullName: String(a.fullName || a.name || '') }))
          .filter((a: any) => a.id && a.fullName);
        setAdmins(mapped);
      } catch (err) {
        console.warn('Unable to load admins for display:', err);
      }
    };
    loadAdmins();
  }, []);

  // Load employees as additional source of names
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const resp: any = await apiService.getEmployees?.({});
        const list: any[] = Array.isArray(resp) ? resp : (resp?.employees ?? resp?.items ?? resp?.results ?? []);
        const mapped = (list || []).map((e: any) => ({
          id: String(e.id || e.employeeId || e.userId || ''),
          fullName: String(
            e.fullName || [e.firstName, e.lastName].filter(Boolean).join(' ') || e.name || ''
          )
        })).filter((e: any) => e.id && e.fullName);
        setEmployees(mapped);
      } catch (err) {
        // Not critical if employees endpoint is unavailable
        console.warn('Unable to load employees for display:', err);
      }
    };
    loadEmployees();
  }, []);

  const branchNameById = useMemo(() => {
    const map: Record<number, string> = {};
    for (const b of branches) map[b.id] = b.name;
    return map;
  }, [branches]);

  const adminNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of admins) map[a.id] = a.fullName;
    return map;
  }, [admins]);

  const employeeNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of employees) map[e.id] = e.fullName;
    return map;
  }, [employees]);

  const getBranchDisplay = (tx: Transaction): string => {
    const anyTx = tx as any;
    return (
      anyTx.branchName || anyTx.BranchName || branchNameById[tx.branchId] || (tx.branchId ? `#${tx.branchId}` : '—')
    );
  };

  const getProcessedByDisplay = (processedBy: any): string => {
    if (!processedBy && processedBy !== 0) return '—';
    const id = String(processedBy);
    // Try lookup by id first
    if (adminNameById[id]) return adminNameById[id];
    if (employeeNameById[id]) return employeeNameById[id];
    // Try common alternate fields if processedBy already contains a name
    if (/\s/.test(id) && !/^\s*$/.test(id)) return id;
    // If looks like a name (contains space), return as-is; if GUID-like, hide
    return '—';
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const scopedFilters = branchFilterId != null ? { ...filters, branchId: branchFilterId } : filters;
      const data = await apiService.getSavingsTransactions(scopedFilters);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const scopedFilters = branchFilterId != null ? { ...filters, branchId: branchFilterId } : filters;
      const stats = await apiService.getSavingsTransactionStatistics(scopedFilters);
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleProcessTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const accountNumber = (processForm.accountNumber || '').trim();
    const description = (processForm.description || '').trim();
    const verificationMethod = (processForm.verificationMethod || '').trim();
    const notes = (processForm.notes || '').trim();
    const amount = Number(processForm.amount);
    const type = Number(processForm.type);
    const currency = Number(processForm.currency);

    // Validate account number length (backend expects 12 chars)
    if (!accountNumber || accountNumber.length !== 12) {
      toast.error('Numéro de compte invalide (12 caractères requis)');
      return;
    }

    if (!isFinite(amount) || amount <= 0) {
      toast.error('Veuillez saisir un montant valide (> 0)');
      return;
    }

    // Transfers are now handled by the dedicated transfer endpoint (/SavingsTransaction/transfer)

    if (!verificationMethod) {
      toast.error('Veuillez sélectionner une méthode de vérification');
      return;
    }

    const payload: any = { 
      accountNumber, 
      amount, 
      type, 
      currency,
      customerPresent: Boolean(processForm.customerPresent),
      verificationMethod
    };
    if (description) payload.description = description; // description is optional
    if (notes) payload.notes = notes; // optional notes

    // -- Client-side business rule checks (limits) --
    try {
      // Fetch account by number to read configured limits and balances
      const acct = await apiService.getSavingsAccountByNumber(accountNumber);
      const acctId = acct?.id || acct?.accountId || acct?.accountNumber || accountNumber;

      // Helper to safely read numeric limit fields
      const readLimit = (obj: any, key: string) => {
        const v = obj?.accountLimits?.[key] ?? obj?.[key] ?? obj?.AccountLimits?.[key];
        return v === undefined || v === null ? undefined : Number(v);
      };

  const dailyDepositLimit = readLimit(acct, 'dailyDepositLimit') ?? readLimit(acct, 'DailyDepositLimit');
  const dailyWithdrawalLimit = readLimit(acct, 'dailyWithdrawalLimit') ?? readLimit(acct, 'DailyWithdrawalLimit');
  const monthlyWithdrawalLimit = readLimit(acct, 'monthlyWithdrawalLimit') ?? readLimit(acct, 'MonthlyWithdrawalLimit');
  const maxWithdrawalAmount = readLimit(acct, 'maxWithdrawalAmount') ?? readLimit(acct, 'MaxWithdrawalAmount');
  const minWithdrawalAmount = readLimit(acct, 'minWithdrawalAmount') ?? readLimit(acct, 'MinWithdrawalAmount');
      const maxBalance = readLimit(acct, 'maxBalance') ?? readLimit(acct, 'MaxBalance');
      const minBalance = readLimit(acct, 'minimumBalance') ?? readLimit(acct, 'MinimumBalance') ?? acct?.minimumBalance ?? 0;
      const currentBalance = Number(acct?.balance ?? 0);
      const availableBalance = Number(acct?.availableBalance ?? acct?.balance ?? 0);

      const today = new Date().toISOString().slice(0,10);

      // Deposit checks
      if (type === 0) {
        // max balance
        if (maxBalance !== undefined && !Number.isNaN(maxBalance)) {
          if (currentBalance + amount > maxBalance) {
            toast.error(`Solde maximum dépassé. Limite: ${formatCurrency(maxBalance, displayCurrency(currency))}`);
            return;
          }
        }

        // daily deposit limit
        if (dailyDepositLimit !== undefined && !Number.isNaN(dailyDepositLimit)) {
          try {
            const totalResp: any = await apiService.getSavingsDailyTransactionTotal(acctId, 0, today);
            const total = (totalResp && (totalResp.total ?? totalResp.amount ?? totalResp.value)) ? Number(totalResp.total ?? totalResp.amount ?? totalResp.value) : Number(totalResp || 0);
            const remaining = dailyDepositLimit - (Number(total) || 0);
            if (remaining < amount) {
              toast.error(`Limite quotidienne de dépôt dépassée. Limite: ${formatCurrency(dailyDepositLimit, displayCurrency(currency))} — Reste: ${formatCurrency(Math.max(0, remaining), displayCurrency(currency))}`);
              return;
            }
          } catch (err) {
            // If daily total query fails, continue and let backend validate; don't block client.
            console.warn('Could not fetch daily deposit total:', err);
          }
        }
      }

      // Transfer checks
      if (type === 4) {
        const destNum = (processForm.destinationAccountNumber || '').trim();
        if (!destNum || destNum.length !== 12) {
          toast.error('Numéro du compte destinataire invalide');
          return;
        }

        // fetch destination account
        let destAcct: any = resolvedDestAccount;
        try {
          if (!destAcct) destAcct = await apiService.getSavingsAccountByNumber(destNum);
        } catch (err) {
          destAcct = null;
        }

        if (!destAcct) {
          toast.error('Compte destinataire introuvable');
          return;
        }

        if ((destAcct?.currency || destAcct?.Currency) !== (acct?.currency || acct?.Currency)) {
          toast.error('Les devises des comptes source et destinataire doivent correspondre');
          return;
        }

        if ((acct?.availableBalance ?? acct?.balance ?? 0) - amount < (acct?.minimumBalance ?? 0)) {
          toast.error('Fonds insuffisants sur le compte source pour effectuer le transfert');
          return;
        }

        // add destination and source keys (backend will accept case-insensitive JSON)
        payload.sourceAccountNumber = accountNumber;
        payload.destinationAccountNumber = destNum;
      }

      // Withdrawal checks
      if (type === 1) {
        // available balance and minimum balance enforcement
        if (availableBalance - amount < (minBalance || 0)) {
          toast.error('Solde insuffisant ou dépasser le solde minimum requis');
          return;
        }

        // per-transaction min/max withdrawal amount
        if (maxWithdrawalAmount !== undefined && !Number.isNaN(maxWithdrawalAmount) && amount > maxWithdrawalAmount) {
          toast.error(`Montant maximum de retrait: ${formatCurrency(Number(maxWithdrawalAmount), displayCurrency(currency))}`);
          return;
        }
        if (minWithdrawalAmount !== undefined && !Number.isNaN(minWithdrawalAmount) && amount < minWithdrawalAmount) {
          toast.error(`Montant minimum de retrait: ${formatCurrency(Number(minWithdrawalAmount), displayCurrency(currency))}`);
          return;
        }

        // daily withdrawal limit
        if (dailyWithdrawalLimit !== undefined && !Number.isNaN(dailyWithdrawalLimit)) {
          try {
            const totalResp: any = await apiService.getSavingsDailyTransactionTotal(acctId, 1, today);
            const total = (totalResp && (totalResp.total ?? totalResp.amount ?? totalResp.value)) ? Number(totalResp.total ?? totalResp.amount ?? totalResp.value) : Number(totalResp || 0);
            const remaining = dailyWithdrawalLimit - (Number(total) || 0);
            if (remaining < amount) {
              toast.error(`Limite quotidienne de retrait dépassée. Limite: ${formatCurrency(dailyWithdrawalLimit, displayCurrency(currency))} — Reste: ${formatCurrency(Math.max(0, remaining), displayCurrency(currency))}`);
              return;
            }
          } catch (err) {
            console.warn('Could not fetch daily withdrawal total:', err);
          }
        }

        // monthly withdrawal limit
        if (monthlyWithdrawalLimit !== undefined && !Number.isNaN(monthlyWithdrawalLimit)) {
          try {
            const totalResp: any = await apiService.getSavingsMonthlyTransactionTotal(acctId, 1, today);
            const total = (totalResp && (totalResp.total ?? totalResp.amount ?? totalResp.value)) ? Number(totalResp.total ?? totalResp.amount ?? totalResp.value) : Number(totalResp || 0);
            const remaining = monthlyWithdrawalLimit - (Number(total) || 0);
            if (remaining < amount) {
              toast.error(`Limite mensuelle de retrait dépassée. Limite: ${formatCurrency(monthlyWithdrawalLimit, displayCurrency(currency))} — Reste: ${formatCurrency(Math.max(0, remaining), displayCurrency(currency))}`);
              return;
            }
          } catch (err) {
            console.warn('Could not fetch monthly withdrawal total:', err);
          }
        }
      }

    } catch (acctErr) {
      // If fetching account fails, we still allow submission and rely on backend errors to surface.
      console.warn('Could not fetch account for pre-checks:', acctErr);
    }

    try {
      setSubmitting(true);
      if (type === 4) {
        // Transfer flow - call new backend endpoint that processes both withdrawal + deposit atomically
        await apiService.processSavingsTransfer({
          sourceAccountNumber: payload.sourceAccountNumber || accountNumber,
          destinationAccountNumber: payload.destinationAccountNumber,
          amount: payload.amount,
          description: payload.description,
          customerPresent: payload.customerPresent,
          customerSignature: payload.customerSignature,
          verificationMethod: payload.verificationMethod,
          notes: payload.notes
        });
        toast.success('Transfert traité avec succès');
      } else {
        await apiService.processSavingsTransaction(payload);
        toast.success('Transaction traitée avec succès');
      }
      setShowProcessModal(false);
      setProcessForm({ 
        accountNumber: '', 
        type: 0, 
        destinationAccountNumber: '',
        amount: 0, 
        currency: 0, 
        description: '',
        customerPresent: true,
        verificationMethod: 'Pièce d\'identité',
        notes: ''
      });
      loadTransactions();
      loadStatistics();
    } catch (error: any) {
      // Try to extract detailed validation errors from ASP.NET Core (ValidationProblemDetails)
      const data = error?.response?.data;
      let message = data?.message || error?.message || 'Erreur lors du traitement';
      if (data?.errors && typeof data.errors === 'object') {
        const parts: string[] = [];
        for (const key of Object.keys(data.errors)) {
          const arr = data.errors[key];
          if (Array.isArray(arr)) parts.push(...arr);
        }
        if (parts.length) message = parts.join('\n');
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelTransaction = async (id: string) => {
    const reason = prompt('Raison de l\'annulation:');
    if (!reason) return;

    try {
      await apiService.cancelSavingsTransaction(id, reason);
      toast.success('Transaction annulée avec succès');
      loadTransactions();
    } catch (error) {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const handlePrintReceipt = async (id: string) => {
    try {
      const receipt = await apiService.generateSavingsTransactionReceipt(id);
      console.log('Receipt:', receipt);
      toast.success('Reçu généré');
    } catch (error) {
      toast.error('Erreur lors de la génération du reçu');
    }
  };

  const formatCurrency = (amount: number, currency: any) => {
    const cur = displayCurrency(currency);
    return (
      new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount) + (cur ? ' ' + cur : '')
    );
  };

  const displayCurrency = (c: any): 'HTG' | 'USD' | '' => {
    if (c === undefined || c === null) return '';
    const s = String(c).toUpperCase();
    if (s === '0' || s === 'HTG') return 'HTG';
    if (s === '1' || s === 'USD') return 'USD';
    return s as any;
  };

  const isDeposit = (t: string) => {
    const s = (t || '').toString().toLowerCase();
    return s === 'deposit' || s === 'openingdeposit';
  };

  const isWithdrawal = (t: string) => {
    const s = (t || '').toString().toLowerCase();
    return s === 'withdrawal';
  };

  // Normalize type/status coming from backend (can be numeric codes or various strings)
  const normalizeType = (t: any): 'Deposit' | 'Withdrawal' | 'Interest' | 'OpeningDeposit' | string => {
    if (t === undefined || t === null) return '';
    const s = String(t).trim();
    // Numeric codes commonly used by backend: 0=Deposit, 1=Withdrawal, 2=Interest, 3=OpeningDeposit
    if (s === '0') return 'Deposit';
    if (s === '1') return 'Withdrawal';
    if (s === '2') return 'Interest';
    if (s === '4') return 'Transfer';
    if (s === '3') return 'OpeningDeposit';
    const norm = s.replace(/\s+/g, '').toLowerCase();
    if (norm === 'deposit') return 'Deposit';
    if (norm === 'withdrawal') return 'Withdrawal';
    if (norm === 'interest') return 'Interest';
    if (norm === 'openingdeposit' || norm === 'initialdeposit') return 'OpeningDeposit';
    return s;
  };

  const normalizeStatus = (st: any): 'Completed' | 'Pending' | 'Processing' | 'Cancelled' | 'Failed' | string => {
    if (st === undefined || st === null) return '' as any;
    const s = String(st).trim().toUpperCase();
    // Numeric codes guess: 0=Pending, 1=Processing, 2=Completed, 3=Cancelled, 4=Failed
    if (s === '0') return 'Pending';
    if (s === '1') return 'Processing';
    if (s === '2') return 'Completed';
    if (s === '3') return 'Cancelled';
    if (s === '4') return 'Failed';
    if (s === 'COMPLETED') return 'Completed';
    if (s === 'PENDING') return 'Pending';
    if (s === 'PROCESSING' || s === 'IN_PROGRESS') return 'Processing';
    if (s === 'CANCELLED' || s === 'CANCELED') return 'Cancelled';
    if (s === 'FAILED' || s === 'ERROR') return 'Failed';
    // Title-case fallback
    return s.charAt(0) + s.slice(1).toLowerCase();
  };

  const translateStatusFr = (st: string) => {
    switch (st) {
      case 'Completed':
        return 'Complété';
      case 'Pending':
        return 'En attente';
      case 'Processing':
        return 'En cours';
      case 'Cancelled':
        return 'Annulé';
      case 'Failed':
        return 'Échoué';
      default:
        return st || '';
    }
  };

  // Daily totals (today) for deposits/withdrawals by currency
  const todayTotals = useMemo(() => {
    const totals = {
      deposits: { HTG: 0, USD: 0 },
      withdrawals: { HTG: 0, USD: 0 }
    } as { deposits: Record<'HTG'|'USD', number>; withdrawals: Record<'HTG'|'USD', number> };
    if (!transactions?.length) return totals;
    const todayKey = new Date().toDateString();
    for (const tx of transactions) {
      if (!tx?.processedAt) continue;
      const d = new Date(tx.processedAt);
      if (d.toDateString() !== todayKey) continue; // only today
      const cur = displayCurrency(tx.currency);
      if (cur !== 'HTG' && cur !== 'USD') continue;
      const amt = Math.max(0, Number(tx.amount || 0));
      if (amt === 0) continue;
      const t = normalizeType(tx.type);
      if (isDeposit(t)) totals.deposits[cur] += amt;
      else if (isWithdrawal(t)) totals.withdrawals[cur] += amt;
    }
    return totals;
  }, [transactions]);

  const getTypeColor = (type: string) => {
    if (type === 'Deposit' || type === 'OpeningDeposit') return 'bg-green-100 text-green-800';
    if (type === 'Withdrawal') return 'bg-red-100 text-red-800';
    if (type === 'Interest') return 'bg-purple-100 text-purple-800';
    if (type === 'Transfer') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    if (type === 'Deposit' || type === 'OpeningDeposit') return <ArrowUpRight className="h-4 w-4" />;
    if (type === 'Withdrawal') return <ArrowDownLeft className="h-4 w-4" />;
    if (type === 'Interest') return <TrendingUp className="h-4 w-4" />;
    if (type === 'Transfer') return <TrendingUp className="h-4 w-4" />;
    return <DollarSign className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'Completed') return 'bg-green-100 text-green-800';
    if (status === 'Pending') return 'bg-yellow-100 text-yellow-800';
    if (status === 'Processing') return 'bg-blue-100 text-blue-800';
    if (status === 'Cancelled') return 'bg-gray-100 text-gray-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Completed') return <CheckCircle className="h-4 w-4" />;
    if (status === 'Pending') return <Clock className="h-4 w-4" />;
    if (status === 'Processing') return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (status === 'Cancelled') return <XCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const filteredTransactions = transactions.filter(tx => {
    if (branchFilterId != null) {
      const txBranch = tx.branchId ?? (tx as any)?.BranchId;
      if (txBranch == null || Number(txBranch) !== branchFilterId) {
        return false;
      }
    }
    const query = searchTerm.toLowerCase();
    return (
      (tx.accountNumber && tx.accountNumber.toLowerCase().includes(query)) ||
      (tx.reference && tx.reference.toLowerCase().includes(query)) ||
      (tx.description && tx.description.toLowerCase().includes(query))
    );
  });

  // Pagination calculations
  const totalFiltered = filteredTransactions.length;
  const totalPages = Math.ceil(totalFiltered / pageSize);
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Export helpers (use filteredTransactions)
  const exportTransactionsCSV = () => {
    try {
      const data = filteredTransactions.map(t => ({
        id: t.id,
        date: t.processedAt,
        reference: t.reference,
        accountNumber: t.accountNumber,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        processedBy: getProcessedByDisplay(t.processedBy),
        branch: getBranchDisplay(t),
        status: t.status
      }));
      const csv = unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_savings_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportTransactionsExcel = () => {
    try {
      const data = filteredTransactions.map(t => ({
        Date: t.processedAt,
        Reference: t.reference,
        Compte: t.accountNumber,
        Type: t.type,
        Montant: t.amount,
        Devise: t.currency,
        Statut: t.status,
        TraitePar: getProcessedByDisplay(t.processedBy),
        Succursale: getBranchDisplay(t)
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      XLSX.writeFile(wb, `transactions_savings_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  const exportTransactionsPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) { toast.error('Veuillez autoriser les pop-ups pour exporter en PDF'); return; }
      const rows = filteredTransactions.map(t => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd">${new Date(t.processedAt).toLocaleString('fr-FR')}</td>
          <td style="padding:8px;border:1px solid #ddd">${t.reference}</td>
          <td style="padding:8px;border:1px solid #ddd">${t.accountNumber}</td>
          <td style="padding:8px;border:1px solid #ddd">${getProcessedByDisplay(t.processedBy)}</td>
          <td style="padding:8px;border:1px solid #ddd">${getBranchDisplay(t)}</td>
          <td style="padding:8px;border:1px solid #ddd">${t.type}</td>
          <td style="padding:8px;border:1px solid #ddd">${t.amount}</td>
          <td style="padding:8px;border:1px solid #ddd">${t.currency}</td>
          <td style="padding:8px;border:1px solid #ddd">${t.status}</td>
        </tr>
      `).join('');
      const html = `
        <html><head><meta charset="utf-8"><title>Transactions Épargne</title>
        <style>table{border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif}th,td{border:1px solid #ddd;padding:8px}th{background:#f3f4f6;text-align:left}</style>
        </head><body>
        <h2>Liste Transactions Épargne</h2>
        <p>Exporté le ${new Date().toLocaleString('fr-FR')}</p>
        <table>
          <thead><tr><th>Date</th><th>Ref</th><th>Compte</th><th>Par</th><th>Succursale</th><th>Type</th><th>Montant</th><th>Devise</th><th>Statut</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.onload = ()=>{ setTimeout(()=>{ window.print(); },300); };</script>
        </body></html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      toast.success('Fenêtre d\'export ouverte - utilisez Imprimer pour sauver en PDF');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'export PDF');
    }
  };


  return (
    <div className="space-y-6">
      {/* Today's Totals Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-green-200 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Dépôts HTG</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(todayTotals.deposits.HTG, 'HTG')}</p>
              <p className="text-xs mt-1 text-gray-500">Pour aujourd'hui</p>
            </div>
            <ArrowUpRight className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <div className="bg-white border border-green-200 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Dépôts USD</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(todayTotals.deposits.USD, 'USD')}</p>
              <p className="text-xs mt-1 text-gray-500">Pour aujourd'hui</p>
            </div>
            <ArrowUpRight className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <div className="bg-white border border-red-200 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Retraits HTG</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(todayTotals.withdrawals.HTG, 'HTG')}</p>
              <p className="text-xs mt-1 text-gray-500">Pour aujourd'hui</p>
            </div>
            <ArrowDownLeft className="h-10 w-10 text-red-600" />
          </div>
        </div>
        <div className="bg-white border border-red-200 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Retraits USD</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(todayTotals.withdrawals.USD, 'USD')}</p>
              <p className="text-xs mt-1 text-gray-500">Pour aujourd'hui</p>
            </div>
            <ArrowDownLeft className="h-10 w-10 text-red-600" />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Rechercher par compte, référence ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border-2 transition-colors flex items-center gap-2 text-black ${
                showFilters ? 'bg-blue-100 border-blue-500' : 'border-gray-300 hover:border-blue-500 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filtres
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <button onClick={loadTransactions} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => exportTransactionsCSV()}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                title="Exporter CSV"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
              <button
                onClick={() => exportTransactionsExcel()}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                title="Exporter Excel"
              >
                <Download className="h-4 w-4" /> XLSX
              </button>
              <button
                onClick={() => exportTransactionsPDF()}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                title="Exporter PDF"
              >
                <Download className="h-4 w-4" /> PDF
              </button>
            </div>

            <button onClick={() => setShowProcessModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Nouvelle Transaction
            </button>

            
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-5 gap-4">
            <select value={filters.type ?? ''} onChange={(e) => setFilters({...filters, type: e.target.value ? parseInt(e.target.value) : undefined})} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Tous types</option>
              <option value="0">Dépôt</option>
              <option value="1">Retrait</option>
              <option value="2">Intérêt</option>
              <option value="4">Transfert</option>
            </select>

            <input type="date" value={filters.dateFrom || ''} onChange={(e) => setFilters({...filters, dateFrom: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />

            <input type="date" value={filters.dateTo || ''} onChange={(e) => setFilters({...filters, dateTo: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />

            <select
              value={branchSelectValue}
              onChange={(e) => setFilters({
                ...filters,
                branchId: e.target.value ? parseInt(e.target.value) : undefined
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isBranchLocked}
              title={isBranchLocked ? 'Succursale verrouillée' : 'Filtrer par succursale'}
            >
              {!isBranchLocked && <option value="">Toutes succursales</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <button
              onClick={() => setFilters(isBranchLocked && branchFilterId != null ? { branchId: branchFilterId } : {})}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune transaction trouvée</h3>
            <p className="text-gray-500">Essayez de modifier vos critères de recherche</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Heure</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compte</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Par</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Succursale</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solde Avant</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solde Après</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{new Date(tx.processedAt).toLocaleDateString('fr-FR')}</div>
                      <div className="text-xs text-gray-500">{new Date(tx.processedAt).toLocaleTimeString('fr-FR')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{tx.reference}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tx.accountNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getProcessedByDisplay(tx.processedBy)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getBranchDisplay(tx)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {(() => {
                        const t = normalizeType(tx.type);
                        return (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(t)}`}>
                            {getTypeIcon(t)}
                            {t === 'Deposit'
                          ? 'Dépôt'
                          : t === 'OpeningDeposit'
                          ? 'Dépôt initial'
                          : t === 'Withdrawal'
                          ? 'Retrait'
                          : t === 'Interest'
                          ? 'Intérêt'
                          : t}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {(() => {
                        const t = normalizeType(tx.type);
                        const isCredit = isDeposit(t) || t === 'Interest';
                        return (
                          <div className={`text-sm font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                            {isCredit ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {formatCurrency(tx.balanceBefore, tx.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {formatCurrency(tx.balanceAfter, tx.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {(() => {
                        const st = normalizeStatus(tx.status);
                        return (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(st)}`}>
                            {getStatusIcon(st)}
                            {translateStatusFr(st)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handlePrintReceipt(tx.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Imprimer">
                          <Printer className="h-4 w-4" />
                        </button>
                        {normalizeStatus(tx.status) === 'Completed' && (
                          <button onClick={() => handleCancelTransaction(tx.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Annuler">
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalFiltered > 0 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="pageSize" className="text-sm text-gray-700">
                  Éléments par page:
                </label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="text-sm text-gray-700">
                Affichage de {Math.min((currentPage - 1) * pageSize + 1, totalFiltered)} à {Math.min(currentPage * pageSize, totalFiltered)} sur {totalFiltered} résultats
              </div>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Précédent</span>
                  <ChevronUp className="h-5 w-5 rotate-[-90deg]" />
                </button>
                <div className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  Page {currentPage} sur {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Suivant</span>
                  <ChevronUp className="h-5 w-5 rotate-90" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Process Transaction Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Nouvelle Transaction</h2>
              <button onClick={() => setShowProcessModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleProcessTransaction} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de compte</label>
                <input type="text" value={processForm.accountNumber} onChange={(e) => setProcessForm({...processForm, accountNumber: e.target.value})}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50" placeholder="Ex: 200100000001" required />
                {/* Inline account lookup feedback */}
                <div className="mt-1 min-h-[20px]">
                  {lookupLoading && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Recherche du compte...
                    </div>
                  )}
                  {!lookupLoading && resolvedAccount && (
                    <div className="flex items-center gap-2 text-xs text-blue-700">
                      <User className="h-3.5 w-3.5" />
                      <span className="font-medium">Titulaire du compte:</span>
                      <span>{String(resolvedAccount.customerName || resolvedAccount.accountHolder || resolvedAccount.ownerName || '—')}</span>
                    </div>
                  )}
                  {!lookupLoading && !resolvedAccount && lookupError && (
                    <div className="text-xs text-red-600">{lookupError}</div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={processForm.type} onChange={(e) => setProcessForm({...processForm, type: parseInt(e.target.value)})}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50" required>
                  <option value={0}>Dépôt</option>
                  <option value={1}>Retrait</option>
                  <option value={4}>Transfert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
                <select value={processForm.currency} onChange={(e) => setProcessForm({...processForm, currency: parseInt(e.target.value)})}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50" required>
                  <option value={0}>HTG</option>
                  <option value={1}>USD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
                <input type="number" step="0.01" min="0" value={processForm.amount || ''} onChange={(e) => setProcessForm({...processForm, amount: parseFloat(e.target.value)})}
                  disabled={submitting}
                  inputMode="decimal"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50" placeholder="0.00" required />
              </div>

                {/* Destination account for transfers */}
                {processForm.type === 4 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Compte destinataire</label>
                    <input type="text" value={processForm.destinationAccountNumber} onChange={(e) => setProcessForm({...processForm, destinationAccountNumber: e.target.value})}
                      disabled={submitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50" placeholder="Ex: G01234567891" required />
                    <div className="mt-1 min-h-[20px]">
                      {destLookupLoading && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Recherche du compte destinataire...
                        </div>
                      )}
                      {!destLookupLoading && resolvedDestAccount && (
                        <div className="flex items-center gap-2 text-xs text-blue-700">
                          <User className="h-3.5 w-3.5" />
                          <span className="font-medium">Titulaire destinataire:</span>
                          <span>{String(resolvedDestAccount.customerName || resolvedDestAccount.accountHolder || resolvedDestAccount.ownerName || '—')}</span>
                        </div>
                      )}
                      {!destLookupLoading && !resolvedDestAccount && destLookupError && (
                        <div className="text-xs text-red-600">{destLookupError}</div>
                      )}
                    </div>
                  </div>
                )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
                <textarea value={processForm.description} onChange={(e) => setProcessForm({...processForm, description: e.target.value})}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50" rows={3} placeholder="Description..." />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="cust-present"
                  type="checkbox"
                  checked={processForm.customerPresent}
                  onChange={(e) => setProcessForm({ ...processForm, customerPresent: e.target.checked })}
                  disabled={submitting}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="cust-present" className="text-sm text-gray-700">Client présent</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Méthode de vérification</label>
                <select
                  value={processForm.verificationMethod}
                  onChange={(e) => setProcessForm({ ...processForm, verificationMethod: e.target.value })}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  required
                >
                  <option value="Pièce d'identité">Pièce d'identité</option>
                  <option value="PIN">PIN</option>
                  <option value="Signature">Signature</option>
                  <option value="Photo">Photo</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <textarea
                  value={processForm.notes}
                  onChange={(e) => setProcessForm({ ...processForm, notes: e.target.value })}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  rows={2}
                  placeholder="Notes internes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowProcessModal(false)} disabled={submitting} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                  Annuler
                </button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Traitement...' : 'Traiter'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsTransactionManagement;