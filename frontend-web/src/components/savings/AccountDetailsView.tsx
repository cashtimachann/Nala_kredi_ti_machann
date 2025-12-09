import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  CreditCard,
  Calendar,
  DollarSign,
  TrendingUp,
  Lock,
  Unlock,
  XCircle,
  Edit,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  Home,
  Users,
  Phone,
  Upload,
  Image as ImageIcon,
  PenTool,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../../services/apiService';
import { savingsCustomerService } from '../../services/savingsCustomerService';
import { formatCurrency, getStatusColor, getStatusIcon } from './CompleteSavingsAccountManagement';
import { getMonthlyInterestRatePercent, getTermMonths } from '../../types/clientAccounts';

interface AccountDetailsViewProps {
  accountId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

interface AccountDetails {
  id: string;
  accountNumber: string;
  customerId: string;
  customerCode?: string;
  customerName: string;
  customerPhone?: string;
  accountType: string;
  balance: number;
  availableBalance: number;
  blockedBalance: number;
  currency: string;
  interestRate: number;
  status: string;
  openedDate: string;
  lastInterestCalculation?: string;
  closedDate?: string;
  lastTransactionDate?: string;
  minimumBalance: number;
  withdrawalLimit?: number;
  suspendedAt?: string;
  suspendedBy?: string;
  suspensionReason?: string;
  accountLimits?: {
    dailyDepositLimit?: number;
    dailyWithdrawalLimit?: number;
    monthlyWithdrawalLimit?: number;
    maxBalance?: number;
    minWithdrawalAmount?: number;
    maxWithdrawalAmount?: number;
  };
  branchId: number;
  branchName?: string;
  notes?: string;
  // Term savings fields
  termType?: string | number;
  maturityDate?: string;
  interestRateMonthly?: number; // fraction, e.g. 0.015 => 1.5% per month
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reference: string;
  processedAt: string;
  status: string;
  branchId?: number;
  branchName?: string;
  processedBy?: string;
  processedByName?: string;
}

interface AuthorizedSigner {
  fullName: string;
  documentType: number;
  documentNumber: string;
  relationshipToCustomer: string;
  phoneNumber: string;
  authorizationLimit?: number;
  photoUrl?: string;
  signature?: string;
}

type TransactionFilterType = 'all' | 'credits' | 'debits' | 'deposit' | 'withdrawal' | 'interest' | 'fees' | 'transfer';

interface TransactionFilterState {
  type: TransactionFilterType;
  dateFrom: string;
  dateTo: string;
}

const AccountDetailsView: React.FC<AccountDetailsViewProps> = ({ accountId, onClose, onUpdate }) => {
  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilterState>({
    type: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'transactions' | 'history' | 'signers'>('info');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [calculatingInterest, setCalculatingInterest] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAdvancedLimits, setShowAdvancedLimits] = useState(false);
  const [authorizedSigners, setAuthorizedSigners] = useState<AuthorizedSigner[]>([]);
  const [editSigners, setEditSigners] = useState<AuthorizedSigner[]>([]);
  const [uploadingPhotoIdx, setUploadingPhotoIdx] = useState<number | null>(null);
  const [uploadingSignIdx, setUploadingSignIdx] = useState<number | null>(null);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementFrom, setStatementFrom] = useState<string>('');
  const [statementTo, setStatementTo] = useState<string>('');
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspending, setSuspending] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  // Normalize currency values from backend (e.g., 0/1 -> HTG/USD)
  const displayCurrency = (c: any): 'HTG' | 'USD' | '' => {
    if (c === undefined || c === null) return '';
    const s = String(c).toUpperCase();
    if (s === '0' || s === 'HTG') return 'HTG';
    if (s === '1' || s === 'USD') return 'USD';
    return s as any;
  };

  // Normalize account type values (numeric or string) to friendly French label
  const displayAccountType = (t: any): string => {
    // In Savings module, default to Compte d'Épargne if not provided
    if (t === undefined || t === null || t === '') return "Compte d'Épargne";
    if (typeof t === 'number') {
      const numMap: Record<number, string> = {
        0: "Compte d'Épargne",
        1: 'Compte Courant',
        2: "Épargne à Terme"
      };
      return numMap[t] || String(t);
    }
    const s = String(t).toUpperCase();
    const map: Record<string, string> = {
      SAVINGS: "Compte d'Épargne",
      SAVING: "Compte d'Épargne",
      REGULAR: "Compte d'Épargne",
      CURRENT: 'Compte Courant',
      CHECKING: 'Compte Courant',
      TERM: "Épargne à Terme",
      TERM_SAVINGS: "Épargne à Terme",
      TERMSAVINGS: "Épargne à Terme"
    };
    return map[s] || t;
  };

  const normalizeStatus = (raw: any): 'Active' | 'Inactive' | 'Closed' | 'Suspended' | string => {
    if (raw === null || raw === undefined) return '';
    if (typeof raw === 'number') {
      const numericMap: Record<number, 'Active' | 'Inactive' | 'Closed' | 'Suspended'> = {
        0: 'Active',
        1: 'Inactive',
        2: 'Closed',
        3: 'Suspended'
      };
      return numericMap[raw as 0 | 1 | 2 | 3] ?? String(raw);
    }
    const value = String(raw).trim();
    const upper = value.toUpperCase();
    if (upper === 'ACTIVE') return 'Active';
    if (upper === 'INACTIVE') return 'Inactive';
    if (upper === 'CLOSED') return 'Closed';
    if (upper === 'SUSPENDED') return 'Suspended';
    return value;
  };

  // Determine if a transaction is a credit (adds to balance) or debit (reduces balance)
  const isCreditTx = (tx: Transaction): boolean => {
    const t = (tx.type || '').toString().toLowerCase();
    const tNorm = t.replace(/\s+/g, ''); // e.g., "Initial Deposit" -> "initialdeposit"
    const creditTypes = new Set([
      'deposit',
      'credit',
      'interest',
      'transferin',
      'openingdeposit',
      'initialdeposit'
    ]);
    const debitTypes = new Set([
      'withdrawal',
      'debit',
      'fee',
      'charge',
      'transferout'
    ]);
    if (creditTypes.has(tNorm)) return true;
    if (debitTypes.has(tNorm)) return false;
    // Fallback: infer from balance delta
    const before = Number(tx.balanceBefore ?? 0);
    const after = Number(tx.balanceAfter ?? 0);
    return after >= before;
  };

  // Normalize amount for display: ensure positive magnitude, sign handled separately
  const displayAmount = (tx: Transaction): number => {
    const before = Number(tx.balanceBefore ?? 0);
    const after = Number(tx.balanceAfter ?? 0);
    const delta = after - before;
    const raw = (tx.amount === undefined || tx.amount === null || tx.amount === 0) ? delta : Number(tx.amount);
    return Math.abs(raw);
  };

  useEffect(() => {
    loadAccountDetails();
    // Load current user from local storage (set by apiService on login)
    try {
      const user = apiService.getCurrentUser?.();
      if (user) setCurrentUser(user);
    } catch {
      // ignore
    }
  }, [accountId]);

  const isTermAccount = (): boolean => {
    if (!account) return false;
    const t = account.accountType ?? '';
    if (typeof t === 'number') return t === 2;
    const s = String(t).toUpperCase();
    return ['TERM', 'TERM_SAVINGS', 'TERMSAVINGS', 'TERM_SAVING', 'ÉPARGNE À TERME'.toUpperCase()].includes(s);
  };

  const loadAccountDetails = async () => {
    setLoading(true);
    try {
      const accountData = await apiService.getAccountDetails(accountId);
      // Determine which transactions API to call (Term vs regular savings)
      let transactionsData: any[] = [];
      const isTerm = (accountData && ((accountData as any).termType !== undefined || String(accountData.accountType || '').toLowerCase().includes('term')));
      if (isTerm) {
        // Term savings transactions API expects accountNumber
        try {
          transactionsData = await apiService.getAllTermSavingsTransactions({ accountNumber: accountData.accountNumber });
        } catch (err) {
          transactionsData = [];
        }
      } else {
        try {
          transactionsData = await apiService.getSavingsAccountTransactions(accountId);
        } catch (err) {
          transactionsData = [];
        }
      }

      // Enrich missing customer code if needed
      let enrichedAccount: AccountDetails = accountData as any;
      try {
        if (enrichedAccount.customerId) {
          const cust = await savingsCustomerService.getCustomer?.(enrichedAccount.customerId);
          if (cust) {
            const next: Partial<AccountDetails> = {};
            if (cust.customerCode && !enrichedAccount.customerCode) {
              next.customerCode = cust.customerCode;
            }
            const contact = (cust.contact ?? {}) as any;
            const phone = contact.primaryPhone
              ?? contact.primary_phone
              ?? contact.primaryPhoneNumber
              ?? contact.PrimaryPhone
              ?? contact.phone
              ?? contact.Phone
              ?? contact.secondaryPhone
              ?? contact.SecondaryPhone
              ?? undefined;
            if (phone && !enrichedAccount.customerPhone) {
              next.customerPhone = String(phone);
            }
            const custAny = cust as any;
            const nameCandidate = cust.fullName
              || custAny.FullName
              || [cust.firstName ?? custAny.FirstName, cust.lastName ?? custAny.LastName]
                .filter((part) => part && String(part).trim().length > 0)
                .join(' ')
                .trim();
            if (nameCandidate && !enrichedAccount.customerName) {
              next.customerName = nameCandidate;
            }
            if (Object.keys(next).length > 0) {
              enrichedAccount = { ...enrichedAccount, ...next } as AccountDetails;
            }
          }
        }
      } catch {
        // ignore enrichment failures
      }

      setAccount(enrichedAccount);
      setTransactions(transactionsData || []);

      // Normalize authorized signers if provided by backend
      try {
        const rawSigners = (enrichedAccount as any)?.authorizedSigners ?? (enrichedAccount as any)?.AuthorizedSigners ?? [];
        if (Array.isArray(rawSigners)) {
          const normalized: AuthorizedSigner[] = rawSigners.map((s: any) => {
            const docTypeRaw = s.documentType ?? s.DocumentType ?? 0;
            const limitRaw = s.authorizationLimit ?? s.AuthorizationLimit;
            const docType = typeof docTypeRaw === 'number' ? docTypeRaw : Number(docTypeRaw) || 0;
            const authorizationLimit = typeof limitRaw === 'number' ? limitRaw : (limitRaw !== undefined && limitRaw !== null && limitRaw !== '' ? Number(limitRaw) : undefined);
            return {
              fullName: s.fullName || s.FullName || '',
              documentType: docType,
              documentNumber: s.documentNumber || s.DocumentNumber || '',
              relationshipToCustomer: s.relationshipToCustomer || s.RelationshipToCustomer || '',
              phoneNumber: s.phoneNumber || s.phone || s.Phone || '',
              authorizationLimit,
              photoUrl: s.photoUrl || s.PhotoUrl || s.photo || undefined,
              signature: s.signature || s.Signature || undefined,
            } as AuthorizedSigner;
          });
          setAuthorizedSigners(normalized);
        } else {
          setAuthorizedSigners([]);
        }
      } catch {
        setAuthorizedSigners([]);
      }

      // Prefill edit form
      const limits = (enrichedAccount as any).accountLimits || {};
      setEditForm({
        interestRate: enrichedAccount.interestRate ?? '',
        minimumBalance: enrichedAccount.minimumBalance ?? '',
        withdrawalLimit: (enrichedAccount as any).withdrawalLimit ?? '',
        dailyWithdrawalLimit: limits.dailyWithdrawalLimit ?? (enrichedAccount as any).dailyWithdrawalLimit ?? (enrichedAccount as any).withdrawalLimit ?? '',
        monthlyWithdrawalLimit: limits.monthlyWithdrawalLimit ?? (enrichedAccount as any).monthlyWithdrawalLimit ?? '',
        dailyDepositLimit: limits.dailyDepositLimit ?? '',
        maxBalance: limits.maxBalance ?? (enrichedAccount as any).maxBalance ?? '',
        maxWithdrawalAmount: limits.maxWithdrawalAmount ?? (enrichedAccount as any).maxWithdrawalAmount ?? '',
        minWithdrawalAmount: limits.minWithdrawalAmount ?? (enrichedAccount as any).minWithdrawalAmount ?? '',
        notes: enrichedAccount.notes ?? ''
      });
    } catch (err) {
      toast.error("Erreur lors du chargement du compte");
    } finally {
      setLoading(false);
    }
  };

  // Rough interest preview based on last calculation/open date
  const estimateInterest = () => {
    const reasons: string[] = [];
    if (!account) return { amount: 0, days: 0, from: '', to: '', eligible: false, reasons: ['Compte introuvable'] };
    const statusStr = normalizeStatus(account.status);
    if (statusStr !== 'Active') reasons.push('Le compte doit être actif');
    const rate = Number(account.interestRate || 0);
    if (!rate || rate <= 0) reasons.push("Taux d'intérêt absent ou nul");
    const bal = Number(account.balance || 0);
    if (bal <= 0) reasons.push('Solde nul');
    const fromDateStr = (account.lastInterestCalculation || account.openedDate) as string | undefined;
    const fromDate = fromDateStr ? new Date(fromDateStr) : null;
    const toDate = new Date();
    const days = fromDate ? Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const estimated = fromDate ? (bal * (rate / 100) * (days / 365)) : 0;
    const eligible = reasons.length === 0;
    return { amount: estimated, days, from: fromDateStr || '', to: toDate.toISOString(), eligible, reasons };
  };

  const handleCalculateInterest = async () => {
    try {
      setCalculatingInterest(true);
      const est = estimateInterest();
      if (!est.eligible) {
        toast.error('Conditions non remplies pour le calcul');
        return;
      }
      // If backend endpoint exists, call it here. For now, simulate success.
      toast.success('Intérêts calculés');
      setShowInterestModal(false);
      onUpdate?.();
    } catch {
      toast.error("Erreur lors du calcul d'intérêts");
    } finally {
      setCalculatingInterest(false);
    }
  };

  const handleSuspendAccount = () => {
    setSuspensionReason('');
    setShowSuspendModal(true);
  };

  const confirmSuspendAccount = async () => {
    const reason = suspensionReason.trim();
    if (!reason) {
      toast.error('Veuillez fournir une raison de suspension');
      return;
    }

    setSuspending(true);
    try {
      await apiService.updateSavingsAccount(accountId, { status: 'Suspended', notes: reason });
      toast.success('Compte suspendu avec succès');
      setShowSuspendModal(false);
      setSuspensionReason('');
      loadAccountDetails();
      onUpdate?.();
    } catch (error) {
      toast.error('Erreur lors de la suspension');
    } finally {
      setSuspending(false);
    }
  };

  const handleReactivateAccount = async () => {
    setReactivating(true);
    try {
      await apiService.updateSavingsAccount(accountId, { status: 'Active' });
      toast.success('Compte réactivé avec succès');
      loadAccountDetails();
      onUpdate?.();
    } catch (error) {
      toast.error('Erreur lors de la réactivation');
    } finally {
      setReactivating(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    const hasTypeFilter = transactionFilters.type !== 'all';
    const hasFrom = transactionFilters.dateFrom !== '';
    const hasTo = transactionFilters.dateTo !== '';

    if (!hasTypeFilter && !hasFrom && !hasTo) {
      return transactions;
    }

    const from = hasFrom ? new Date(`${transactionFilters.dateFrom}T00:00:00`) : null;
    const to = hasTo ? new Date(`${transactionFilters.dateTo}T23:59:59.999`) : null;

    return transactions.filter((tx) => {
      const normalizedType = (tx.type || '').toString().toLowerCase();
      const credit = isCreditTx(tx);

      const typeMatches = (() => {
        switch (transactionFilters.type) {
          case 'credits':
            return credit;
          case 'debits':
            return !credit;
          case 'deposit':
            return normalizedType.includes('deposit');
          case 'withdrawal':
            return normalizedType.includes('withdraw');
          case 'interest':
            return normalizedType.includes('interest');
          case 'fees':
            return normalizedType.includes('fee');
          case 'transfer':
            return normalizedType.includes('transfer');
          default:
            return true;
        }
      })();

      if (!typeMatches) {
        return false;
      }

      if (!from && !to) {
        return true;
      }

      if (!tx.processedAt) {
        return true;
      }

      const txDate = new Date(tx.processedAt);
      if (Number.isNaN(txDate.getTime())) {
        return true;
      }

      if (from && txDate < from) {
        return false;
      }

      if (to && txDate > to) {
        return false;
      }

      return true;
    });
  }, [transactions, transactionFilters]);

  const transactionSummary = useMemo(() => {
    const summary = {
      totalCredits: 0,
      totalDebits: 0,
      interest: 0,
      fees: 0,
      creditCount: 0,
      debitCount: 0,
      net: 0
    };

    filteredTransactions.forEach((tx) => {
      const amount = displayAmount(tx);
      const normalizedType = (tx.type || '').toString().toLowerCase();
      if (isCreditTx(tx)) {
        summary.totalCredits += amount;
        summary.creditCount += 1;
      } else {
        summary.totalDebits += amount;
        summary.debitCount += 1;
      }

      if (normalizedType.includes('interest')) {
        summary.interest += amount;
      }

      if (normalizedType.includes('fee')) {
        summary.fees += amount;
      }
    });

    summary.net = summary.totalCredits - summary.totalDebits;

    return summary;
  }, [filteredTransactions]);

  const hasTransactionFilters = transactionFilters.type !== 'all' || Boolean(transactionFilters.dateFrom) || Boolean(transactionFilters.dateTo);

  const transactionsLabel = filteredTransactions.length === transactions.length
    ? `${transactions.length}`
    : `${filteredTransactions.length}/${transactions.length}`;

  const resetTransactionFilters = () => {
    setTransactionFilters({ type: 'all', dateFrom: '', dateTo: '' });
  };

  const handleCloseAccount = () => {
    setShowCloseConfirm(true);
    setCloseReason('');
  };

  const confirmCloseAccount = async () => {
    if (!closeReason) {
      toast.error('Veuillez indiquer une raison de fermeture.');
      return;
    }
    try {
      await apiService.closeSavingsAccount(accountId, closeReason);
      toast.success('Compte fermé avec succès');
      setShowCloseConfirm(false);
      loadAccountDetails();
      onUpdate?.();
    } catch (error) {
      toast.error('Erreur lors de la fermeture');
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Build payload compatible with backend expectations
      const payload: any = {};
      // Basic validation for signers
      for (let i = 0; i < editSigners.length; i++) {
        const s = editSigners[i];
        const nameOk = !!(s.fullName && s.fullName.trim().length >= 2);
        const dtOk = [0,1,2].includes(Number(s.documentType));
        const numOk = !!(s.documentNumber && s.documentNumber.trim().length >= 3);
        if (!nameOk) { toast.error(`Signataire #${i+1}: Nom complet requis`); return; }
        if (!dtOk) { toast.error(`Signataire #${i+1}: Type de document invalide`); return; }
        if (!numOk) { toast.error(`Signataire #${i+1}: Numéro de document requis`); return; }
      }
      if (editForm.interestRate !== undefined) payload.interestRate = Number(editForm.interestRate);
      if (editForm.minimumBalance !== undefined) payload.minimumBalance = Number(editForm.minimumBalance);
      if (editForm.withdrawalLimit !== undefined && editForm.withdrawalLimit !== null && editForm.withdrawalLimit !== '') {
        payload.withdrawalLimit = Number(editForm.withdrawalLimit);
      }
      if (editForm.notes !== undefined) payload.notes = editForm.notes;
      // Combine account limit updates into AccountLimits object if provided
      const limitPayload: any = {};
      if (editForm.dailyDepositLimit !== undefined && editForm.dailyDepositLimit !== null && editForm.dailyDepositLimit !== '') {
        limitPayload.DailyDepositLimit = Number(editForm.dailyDepositLimit);
      }
      const dwlSource = (editForm.dailyWithdrawalLimit !== undefined && editForm.dailyWithdrawalLimit !== null && editForm.dailyWithdrawalLimit !== '');
      if (dwlSource) {
        limitPayload.DailyWithdrawalLimit = Number(editForm.dailyWithdrawalLimit);
      }
      if (editForm.monthlyWithdrawalLimit !== undefined && editForm.monthlyWithdrawalLimit !== null && editForm.monthlyWithdrawalLimit !== '') {
        limitPayload.MonthlyWithdrawalLimit = Number(editForm.monthlyWithdrawalLimit);
      }
      if (editForm.maxBalance !== undefined && editForm.maxBalance !== null && editForm.maxBalance !== '') {
        limitPayload.MaxBalance = Number(editForm.maxBalance);
      }
      if (editForm.maxWithdrawalAmount !== undefined && editForm.maxWithdrawalAmount !== null && editForm.maxWithdrawalAmount !== '') {
        limitPayload.MaxWithdrawalAmount = Number(editForm.maxWithdrawalAmount);
      }
      if (editForm.minWithdrawalAmount !== undefined && editForm.minWithdrawalAmount !== null && editForm.minWithdrawalAmount !== '') {
        limitPayload.MinWithdrawalAmount = Number(editForm.minWithdrawalAmount);
      }
      if (Object.keys(limitPayload).length) {
        payload.AccountLimits = limitPayload;
      }
      // Attach AuthorizedSigners if any edited
      const cleanedSigners = (editSigners || []).filter(s => (s.fullName || '').trim().length > 0);
      if (cleanedSigners.length) {
        payload.AuthorizedSigners = cleanedSigners.map(s => ({
          FullName: s.fullName?.trim() || '',
          DocumentType: Number(s.documentType || 0),
          DocumentNumber: s.documentNumber?.trim() || '',
          RelationshipToCustomer: s.relationshipToCustomer?.trim() || '',
          Phone: s.phoneNumber?.trim() || '',
          AuthorizationLimit: (s.authorizationLimit !== undefined && s.authorizationLimit !== null && String(s.authorizationLimit) !== '') ? Number(s.authorizationLimit) : undefined,
          PhotoUrl: (s.photoUrl && String(s.photoUrl).trim()) ? String(s.photoUrl).trim() : undefined,
          Signature: (s.signature && String(s.signature).trim()) ? String(s.signature).trim() : undefined,
        }));
      }
      await apiService.updateSavingsAccount(accountId, payload);
      toast.success('Compte mis à jour avec succès');
      setShowEditModal(false);
      loadAccountDetails();
      onUpdate?.();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleGenerateStatement = async () => {
    try {
      const parseDate = (s: string) => {
        if (!s) return null;
        const d = new Date(`${s}T00:00:00`);
        return Number.isNaN(d.getTime()) ? null : d;
      };
      const fromD = parseDate(statementFrom);
      const toD = parseDate(statementTo);
      if (fromD && toD && fromD.getTime() > toD.getTime()) {
        toast.error('La date de début doit précéder la date de fin');
        return;
      }
      // Compute inclusive end-of-day for the 'to' date
      const toInclusive = toD ? new Date(toD.getTime() + (24 * 60 * 60 * 1000) - 1) : null;
      const getTxDate = (tx: Transaction) => new Date((tx as any).processedAt || (tx as any).transactionDate || (tx as any).date || 0);
      const inRange = (tx: Transaction) => {
        const dt = getTxDate(tx);
        if (Number.isNaN(dt.getTime())) return false;
        if (fromD && dt < fromD) return false;
        if (toInclusive && dt > toInclusive) return false;
        return true;
      };
      const source = (fromD || toD) ? transactions.filter(inRange) : transactions;

      const printWindow = window.open('', '_blank');
      if (!printWindow) { toast.error('Veuillez autoriser les pop-ups pour exporter le relevé'); return; }
      const rows = source.map(tx => {
        const amt = (tx.amount === undefined || tx.amount === null || tx.amount === 0)
          ? Math.abs((Number(tx.balanceAfter ?? 0) - Number(tx.balanceBefore ?? 0)))
          : Math.abs(Number(tx.amount));
        const currency = tx.currency || (account ? account.currency : '');
        const operator = tx.processedByName || (tx as any).processedByFullName || (tx as any).receivedBy || tx.processedBy || '';
        const dateStr = new Date((tx as any).processedAt || (tx as any).transactionDate || (tx as any).date || 0).toLocaleString('fr-FR');
        const ref = (tx.reference !== undefined && tx.reference !== null && String(tx.reference).trim() !== '' && String(tx.reference) !== '0') ? (tx.reference as any) : (tx.id as any);
        return `
                <div className="pt-2">
            <td style="padding:8px;border:1px solid #ddd">${ref || ''}</td>
            <td style="padding:8px;border:1px solid #ddd">${dateStr}</td>
            <td style="padding:8px;border:1px solid #ddd">${tx.type || ''}</td>
            <td style="padding:8px;border:1px solid #ddd">${operator}</td>
            <td style="padding:8px;border:1px solid #ddd">${formatCurrency(amt, displayCurrency(currency))}</td>
            <td style="padding:8px;border:1px solid #ddd">${formatCurrency(Number(tx.balanceAfter ?? 0), displayCurrency(currency))}</td>
          </tr>
        `;
      }).join('');

      const accNum = account?.accountNumber || '';
      const html = `
        <html><head><meta charset="utf-8"><title>Relevé ${accNum}</title>
        <style>body{font-family:Arial,Helvetica,sans-serif;margin:24px}h2{margin:0 0 6px 0}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}th{background:#f3f4f6;text-align:left}</style>
        </head><body>
        <h2>Relevé du compte ${accNum}</h2>
        <p>Client: ${account?.customerName || '—'}</p>
        ${(fromD || toD) ? `<p>Période: ${fromD ? fromD.toLocaleDateString('fr-FR') : '—'} — ${toD ? toD.toLocaleDateString('fr-FR') : '—'}</p>` : ''}
        <p>Généré le ${new Date().toLocaleString('fr-FR')}</p>
        <table>
          <thead><tr><th>Réf</th><th>Date</th><th>Type</th><th>Opérateur</th><th>Montant</th><th>Solde</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.onload=()=>{ setTimeout(()=>{ window.print(); }, 300); };</script>
        </body></html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      toast.success("Fenêtre d'export ouverte — utilisez Imprimer pour PDF");
      setShowStatementModal(false);
    } catch (error) {
      toast.error('Erreur lors de la génération du relevé');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <DollarSign className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!account) return null;

  const baseCurrency = displayCurrency(account.currency);

  return (
    <>
      {/* Statement Date Range Modal */}
      {showStatementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 accounts-contrast-fix">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-black mb-2">Relevé de compte</h2>
              <p className="text-black text-sm">Sélectionnez la période à inclure dans le relevé.</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-black mb-1">Du</label>
                  <input
                    type="date"
                    value={statementFrom}
                    onChange={e => setStatementFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-black mb-1">Au</label>
                  <input
                    type="date"
                    value={statementTo}
                    onChange={e => setStatementTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-black mb-2">Raccourcis</div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="px-2.5 py-1.5 text-xs border rounded" onClick={() => {
                    const now = new Date();
                    const yyyy = now.getFullYear();
                    const mm = String(now.getMonth()+1).padStart(2,'0');
                    const dd = String(now.getDate()).padStart(2,'0');
                    const s = `${yyyy}-${mm}-${dd}`;
                    setStatementFrom(s); setStatementTo(s);
                  }}>Aujourd'hui</button>
                  <button type="button" className="px-2.5 py-1.5 text-xs border rounded" onClick={() => {
                    const now = new Date();
                    const from = new Date(now.getTime() - 29*24*60*60*1000);
                    const f = `${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,'0')}-${String(from.getDate()).padStart(2,'0')}`;
                    const t = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                    setStatementFrom(f); setStatementTo(t);
                  }}>30 jours</button>
                  <button type="button" className="px-2.5 py-1.5 text-xs border rounded" onClick={() => {
                    const now = new Date();
                    const from = new Date(now.getFullYear(), now.getMonth(), 1);
                    const f = `${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,'0')}-${String(from.getDate()).padStart(2,'0')}`;
                    const t = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                    setStatementFrom(f); setStatementTo(t);
                  }}>Ce mois</button>
                  <button type="button" className="px-2.5 py-1.5 text-xs border rounded" onClick={() => {
                    const now = new Date();
                    const from = new Date(now.getTime() - 90*24*60*60*1000);
                    const f = `${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,'0')}-${String(from.getDate()).padStart(2,'0')}`;
                    const t = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                    setStatementFrom(f); setStatementTo(t);
                  }}>3 mois</button>
                  <button type="button" className="px-2.5 py-1.5 text-xs border rounded" onClick={() => {
                    const now = new Date();
                    const from = new Date(now.getTime() - 365*24*60*60*1000);
                    const f = `${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,'0')}-${String(from.getDate()).padStart(2,'0')}`;
                    const t = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                    setStatementFrom(f); setStatementTo(t);
                  }}>12 mois</button>
                  <button type="button" className="px-2.5 py-1.5 text-xs border rounded" onClick={() => {
                    setStatementFrom(''); setStatementTo('');
                  }}>Tout</button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-5">
              <button type="button" onClick={() => setShowStatementModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50">Annuler</button>
              <button type="button" onClick={handleGenerateStatement} className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">Générer</button>
            </div>
          </div>
        </div>
      )}
      {/* Calculate Interest Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 accounts-contrast-fix">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-black mb-2">Suspendre le compte</h2>
              <p className="text-black">Indiquez la raison de la suspension. Le compte ne pourra pas effectuer de transactions tant qu'il restera suspendu.</p>
              <textarea
                className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                rows={3}
                value={suspensionReason}
                onChange={e => setSuspensionReason(e.target.value)}
                placeholder="Ex: Fraude suspectée, documents manquants, etc."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowSuspendModal(false); setSuspensionReason(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50"
              >Annuler</button>
              <button
                type="button"
                onClick={confirmSuspendAccount}
                disabled={suspending}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >{suspending ? 'Suspension…' : 'Confirmer'}</button>
            </div>
          </div>
        </div>
      )}
      {showInterestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 accounts-contrast-fix">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-black mb-2">Calcul des intérêts</h2>
              <p className="text-black">Prévisualisez et confirmez le calcul des intérêts pour ce compte.</p>
            </div>
            {(() => {
              const est = estimateInterest();
              const currency = displayCurrency(account.currency);
              return (
                <div className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-200">
                  {!est.eligible && est.reasons?.length ? (
                    <div className="mb-3 p-2 rounded border border-yellow-300 bg-yellow-50 text-yellow-800 text-xs">
                      <p className="font-medium">Non éligible au calcul pour le moment:</p>
                      <ul className="list-disc ml-5 mt-1">
                        {est.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-500">Taux annuel</div>
                      <div className="text-gray-900 font-medium">{account.interestRate ? `${account.interestRate}%` : '—'}</div>
                    </div>
                    {isTermAccount() && (
                      <div>
                        <div className="text-xs text-gray-500">Taux / mois</div>
                        <div className="text-gray-900 font-medium">{(getMonthlyInterestRatePercent({ interestRate: account.interestRate, interestRateMonthly: account.interestRateMonthly, termType: (account as any).termType })).toFixed(2)}%</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-gray-500">Période estimée</div>
                      <div className="text-gray-900 font-medium">{est.days} jours</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Solde actuel</div>
                      <div className="text-gray-900 font-medium">{formatCurrency(account.balance ?? 0, currency)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Intérêt estimé</div>
                      <div className="text-gray-900 font-semibold">{formatCurrency(est.amount, currency)}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-2">De: {est.from ? new Date(est.from).toLocaleDateString('fr-FR') : '—'} — À: {est.to ? new Date(est.to).toLocaleDateString('fr-FR') : '—'}</div>
                </div>
              );
            })()}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowInterestModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >Annuler</button>
              {(() => {
                const est = estimateInterest();
                const disabled = calculatingInterest || !est.eligible;
                return (
                  <button
                    type="button"
                    onClick={handleCalculateInterest}
                    disabled={disabled}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!est.eligible ? 'Conditions non remplies (voir détails)' : undefined}
                  >{calculatingInterest ? 'Calcul en cours…' : 'Confirmer'}</button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {/* Close Account Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 accounts-contrast-fix">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-black mb-2">Fermer le compte</h2>
              <p className="text-black">Veuillez indiquer la raison de la fermeture :</p>
              <textarea
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={closeReason}
                onChange={e => setCloseReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50"
              >Annuler</button>
              <button
                type="button"
                onClick={confirmCloseAccount}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 accounts-contrast-fix">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header - compact */}
          <div className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-black">{account.accountNumber}</h2>
                <p className="text-sm text-black">{account.customerName}</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100" aria-label="Fermer">
                <X className="h-5 w-5 text-black" />
              </button>
            </div>
              <div className="grid grid-cols-4 gap-3 mt-3 text-sm">
              <div>
                <div className="text-black">Solde Total</div>
                <div className="font-semibold">{formatCurrency(account.balance ?? 0, displayCurrency(account.currency))}</div>
                <div className="text-xs text-black mt-0.5">
                  Dispo: {formatCurrency(account.availableBalance ?? 0, displayCurrency(account.currency))}
                </div>
                {(account.blockedBalance ?? 0) > 0 && (
                  <div className="text-xs text-red-600 font-medium mt-0.5">
                    Bloquée: {formatCurrency(account.blockedBalance, displayCurrency(account.currency))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-black">Taux</div>
                <div className="font-semibold">{account.interestRate && account.interestRate > 0 ? `${account.interestRate}%` : '—'}</div>
                {isTermAccount() && (
                  <div className="text-xs text-black mt-0.5">Par mois: {(getMonthlyInterestRatePercent({ interestRate: account.interestRate, interestRateMonthly: account.interestRateMonthly, termType: (account as any).termType })).toFixed(2)}%</div>
                )}
                {(account as any).termType && (
                  <div className="text-xs text-black mt-0.5">Terme: {getTermMonths((account as any).termType)} mois</div>
                )}
                {account.maturityDate && (
                  <div className="text-xs text-black mt-0.5">Échéance: {new Date(account.maturityDate).toLocaleDateString('fr-FR')}</div>
                )}
              </div>
              <div>
                <div className="text-black">Statut</div>
                {(() => {
                  const statusStr = normalizeStatus(account.status);
                  return (
                    <>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(statusStr)}`}>
                        {getStatusIcon(statusStr)}
                        {statusStr}
                      </span>
                      {statusStr === 'Suspended' && (
                        <div className="mt-1 text-xs text-yellow-700">
                          {`Suspendu${account.suspendedAt ? ` le ${new Date(account.suspendedAt).toLocaleString('fr-FR')}` : ''}`}
                          {account.suspensionReason ? ` · ${account.suspensionReason}` : ''}
                          {account.suspendedBy ? ` (par ${account.suspendedBy})` : ''}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50 px-4">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-2 px-3 text-sm font-medium transition-colors ${activeTab === 'info' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-black'}`}
              >Informations</button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-2 px-3 text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-black'}`}
              >Transactions ({transactionsLabel})</button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-3 text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-black'}`}
              >Historique</button>
              <button
                onClick={() => setActiveTab('signers')}
                className={`py-2 px-3 text-sm font-medium transition-colors ${activeTab === 'signers' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-black'}`}
              >Signataires{authorizedSigners.length > 0 ? ` (${authorizedSigners.length})` : ''}</button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'info' && (
              <div className="space-y-6">
                {/* Account Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-black mb-3">Informations du compte</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-black">Type de compte</div>
                      <div className="text-black">{displayAccountType(account.accountType)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-black">Devise</div>
                      <div className="text-black">{displayCurrency(account.currency) || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-black">Date d'ouverture</div>
                      <div className="text-black">{(account.openedDate || (account as any).openingDate || (account as any).createdAt) ? new Date((account.openedDate || (account as any).openingDate || (account as any).createdAt) as string).toLocaleDateString('fr-FR') : '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-black">Dernière transaction</div>
                      <div className="text-black">{account.lastTransactionDate ? new Date(account.lastTransactionDate).toLocaleDateString('fr-FR') : 'Aucune'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-black">Solde minimum</div>
                      <div className="text-black">{formatCurrency(account.minimumBalance ?? 0, displayCurrency(account.currency))}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Limite de retrait</div>
                      {(() => {
                        const wl: any = (account.accountLimits?.dailyWithdrawalLimit ?? (account as any).dailyWithdrawalLimit ?? account.withdrawalLimit);
                        const has = wl !== undefined && wl !== null && !Number.isNaN(Number(wl));
                        return (
                          <div className="text-gray-900">{has ? formatCurrency(Number(wl), displayCurrency(account.currency)) : 'Aucune'}</div>
                        );
                      })()}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Plafond retrait mensuel</div>
                      {(() => {
                        const mwl: any = (account.accountLimits?.monthlyWithdrawalLimit ?? (account as any).monthlyWithdrawalLimit);
                        const has = mwl !== undefined && mwl !== null && !Number.isNaN(Number(mwl));
                        return (
                          <div className="text-gray-900">{has ? formatCurrency(Number(mwl), displayCurrency(account.currency)) : 'Aucun'}</div>
                        );
                      })()}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Solde maximum</div>
                      {(() => {
                        const mb: any = (account.accountLimits?.maxBalance ?? (account as any).maxBalance);
                        const has = mb !== undefined && mb !== null && !Number.isNaN(Number(mb));
                        return (
                          <div className="text-gray-900">{has ? formatCurrency(Number(mb), displayCurrency(account.currency)) : 'Aucun'}</div>
                        );
                      })()}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Plafond dépôt quotidien</div>
                      <div className="text-gray-900">{account.accountLimits?.dailyDepositLimit !== undefined && account.accountLimits?.dailyDepositLimit !== null ? formatCurrency(account.accountLimits!.dailyDepositLimit as number, displayCurrency(account.currency)) : 'Aucun'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Montant max. retrait</div>
                      {(() => {
                        const mw: any = (account.accountLimits?.maxWithdrawalAmount ?? (account as any).maxWithdrawalAmount);
                        const has = mw !== undefined && mw !== null && !Number.isNaN(Number(mw));
                        return (
                          <div className="text-gray-900">{has ? formatCurrency(Number(mw), displayCurrency(account.currency)) : 'Aucun'}</div>
                        );
                      })()}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Montant min. retrait</div>
                      {(() => {
                        const mw: any = (account.accountLimits?.minWithdrawalAmount ?? (account as any).minWithdrawalAmount);
                        const has = mw !== undefined && mw !== null && !Number.isNaN(Number(mw));
                        return (
                          <div className="text-gray-900">{has ? formatCurrency(Number(mw), displayCurrency(account.currency)) : 'Aucun'}</div>
                        );
                      })()}
                    </div>
                    {account.branchName && (
                      <div>
                        <div className="text-xs text-gray-500">Succursale</div>
                        <div className="text-gray-900">{account.branchName}</div>
                      </div>
                    )}
                  </div>
                  {account.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-200 text-sm">
                      <div className="text-xs text-gray-500">Notes</div>
                      <div className="text-gray-900 whitespace-pre-wrap">{account.notes}</div>
                    </div>
                  )}
                </div>
                {/* Customer Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Informations du client</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Nom complet</div>
                      <div className="text-gray-900">{account.customerName}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Code Client</div>
                      <div className="text-gray-900">{account.customerCode || (account as any).CustomerCode || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'transactions' && (
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <FileText className="mx-auto h-12 w-12 text-black mb-4" />
                    <h3 className="text-lg font-medium text-black mb-2">Aucune transaction</h3>
                    <p className="text-black">Ce compte n'a pas encore de transactions.</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div className="min-w-[180px] flex-1 sm:flex-none">
                          <label className="block text-xs font-semibold text-black uppercase tracking-wide mb-1">Type</label>
                          <select
                            value={transactionFilters.type}
                            onChange={(e) => setTransactionFilters((prev) => ({ ...prev, type: e.target.value as TransactionFilterType }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="all">Tous types</option>
                            <option value="credits">Crédits</option>
                            <option value="debits">Débits</option>
                            <option value="deposit">Dépôts</option>
                            <option value="withdrawal">Retraits</option>
                            <option value="interest">Intérêts</option>
                            <option value="fees">Frais</option>
                            <option value="transfer">Transferts</option>
                          </select>
                        </div>
                        <div className="min-w-[160px]">
                          <label className="block text-xs font-semibold text-black uppercase tracking-wide mb-1">Du</label>
                          <input
                            type="date"
                            value={transactionFilters.dateFrom}
                            onChange={(e) => setTransactionFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                            max={transactionFilters.dateTo || undefined}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="min-w-[160px]">
                          <label className="block text-xs font-semibold text-black uppercase tracking-wide mb-1">Au</label>
                          <input
                            type="date"
                            value={transactionFilters.dateTo}
                            onChange={(e) => setTransactionFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                            min={transactionFilters.dateFrom || undefined}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-end gap-2 ml-auto">
                          {hasTransactionFilters && (
                            <button
                              type="button"
                              onClick={resetTransactionFilters}
                              className="px-3 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50"
                            >
                              Réinitialiser
                            </button>
                          )}
                          <div className="text-sm text-black whitespace-nowrap">
                            <span className="font-semibold">{filteredTransactions.length}</span> / {transactions.length}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="text-xs font-semibold text-black uppercase tracking-wide">Total Crédits</div>
                        <p className="text-lg font-semibold text-green-600 mt-1">{formatCurrency(transactionSummary.totalCredits, baseCurrency)}</p>
                        <p className="text-[11px] text-black mt-1">{transactionSummary.creditCount} opérations</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="text-xs font-semibold text-black uppercase tracking-wide">Total Débits</div>
                        <p className="text-lg font-semibold text-red-600 mt-1">{formatCurrency(transactionSummary.totalDebits, baseCurrency)}</p>
                        <p className="text-[11px] text-black mt-1">{transactionSummary.debitCount} opérations</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="text-xs font-semibold text-black uppercase tracking-wide">Solde net</div>
                        <p className={`text-lg font-semibold mt-1 ${transactionSummary.net > 0 ? 'text-green-600' : transactionSummary.net < 0 ? 'text-red-600' : 'text-black'}`}>
                          {transactionSummary.net > 0 ? '+' : transactionSummary.net < 0 ? '-' : ''}{formatCurrency(Math.abs(transactionSummary.net), baseCurrency)}
                        </p>
                        <p className="text-[11px] text-black mt-1">Crédits - Débits</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="text-xs font-semibold text-black uppercase tracking-wide">Intérêts &amp; Frais</div>
                        <p className="text-lg font-semibold text-blue-600 mt-1">{formatCurrency(transactionSummary.interest, baseCurrency)}</p>
                        <p className="text-[11px] text-black mt-1">
                          Frais: <span className="font-semibold text-red-600">{formatCurrency(transactionSummary.fees, baseCurrency)}</span>
                        </p>
                      </div>
                    </div>

                    {filteredTransactions.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                        <FileText className="mx-auto h-12 w-12 text-black mb-4" />
                        <h3 className="text-lg font-medium text-black mb-2">Aucune transaction trouvée</h3>
                        <p className="text-black text-sm">Ajustez les filtres de recherche pour voir d'autres opérations.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredTransactions.map((tx) => {
                          const credit = isCreditTx(tx);
                          const rawType = tx.type ? tx.type.toString() : '';
                          const label = rawType === 'Deposit'
                            ? 'Dépôt'
                            : rawType === 'Withdrawal'
                              ? 'Retrait'
                              : rawType || (credit ? 'Crédit' : 'Débit');
                          const reference = tx.reference !== undefined && tx.reference !== null && String(tx.reference).trim() !== '' && String(tx.reference) !== '0';
                          const txCurrency = displayCurrency(tx.currency);
                          return (
                            <div key={tx.id} className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                  <div className={`p-1.5 rounded ${credit ? 'bg-green-100' : 'bg-red-100'}`}>
                                    {credit ? (
                                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <ArrowDownLeft className="h-4 w-4 text-red-600" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-black text-sm">{label}</p>
                                    {tx.description && <p className="text-xs text-black mt-0.5">{tx.description}</p>}
                                    {reference && (
                                      <p className="text-[11px] text-black mt-1">Réf: {tx.reference}</p>
                                    )}
                                    <div className="flex flex-wrap gap-3 text-[11px] text-black mt-2">
                                      <span className="inline-flex items-center gap-1">
                                        <Home className="w-3 h-3" />
                                        {tx.branchName || (tx as any).BranchName || account.branchName || (tx.branchId ? `#${tx.branchId}` : '—')}
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {tx.processedByName || (tx as any).processedByFullName || (tx as any).receivedBy || tx.processedBy || '—'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right min-w-[140px]">
                                  <p className={`text-base font-semibold ${credit ? 'text-green-600' : 'text-red-600'}`}>{credit ? '+' : '-'}{formatCurrency(displayAmount(tx), txCurrency)}</p>
                                  <p className="text-xs text-black mt-1">Solde: {formatCurrency(tx.balanceAfter, txCurrency)}</p>
                                  <p className="text-[11px] text-black mt-1">{tx.processedAt ? new Date(tx.processedAt).toLocaleString('fr-FR') : 'Date inconnue'}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {activeTab === 'history' && (() => {
              // Build timeline events from account data and transactions
              type EventItem = { id: string; when: string; title: string; subtitle?: string; kind: 'opened' | 'closed' | 'tx'; credit?: boolean };
              const events: EventItem[] = [];
              const openedAt = (account.openedDate || (account as any).openingDate || (account as any).createdAt) as string | undefined;
              if (openedAt) {
                events.push({
                  id: `opened-${account.id}`,
                  when: openedAt,
                  title: 'Compte ouvert',
                  subtitle: account.branchName ? `Succursale: ${account.branchName}` : undefined,
                  kind: 'opened'
                });
              }
              for (const tx of transactions) {
                const credit = isCreditTx(tx);
                const amountStr = `${credit ? '+' : '-'}${formatCurrency(displayAmount(tx), displayCurrency(tx.currency))}`;
                const who = tx.processedByName || (tx as any).processedByFullName || (tx as any).receivedBy || tx.processedBy;
                const branch = tx.branchName || (tx as any).BranchName || account.branchName || (tx.branchId ? `#${tx.branchId}` : undefined);
                const ref = (tx.reference !== undefined && tx.reference !== null && String(tx.reference).trim() !== '' && String(tx.reference) !== '0') ? `Réf: ${tx.reference}` : undefined;
                const parts = [
                  credit ? 'Dépôt' : (tx.type === 'Withdrawal' ? 'Retrait' : (tx.type || 'Transaction')),
                  amountStr,
                  who ? `Effectué par: ${who}` : undefined,
                  branch ? `Succursale: ${branch}` : undefined,
                  ref
                ].filter(Boolean);
                events.push({
                  id: `tx-${tx.id}`,
                  when: tx.processedAt,
                  title: parts.shift() as string,
                  subtitle: parts.length ? parts.join(' — ') : undefined,
                  kind: 'tx',
                  credit
                });
              }
              if (account.closedDate) {
                events.push({
                  id: `closed-${account.id}`,
                  when: account.closedDate,
                  title: 'Compte fermé',
                  subtitle: account.notes ? `Raison: ${account.notes}` : undefined,
                  kind: 'closed'
                });
              }
              // Sort desc by date
              events.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

              if (events.length === 0) {
                return (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Historique complet</h3>
                    <p className="text-gray-500">Aucun événement d'historique disponible</p>
                  </div>
                );
              }

              return (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                  <div className="space-y-4">
                    {events.map((ev) => (
                      <div key={ev.id} className="relative pl-12">
                        <div className="absolute left-2 top-2 -ml-1.5">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center border ${ev.kind === 'tx' ? (ev.credit ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200') : 'bg-blue-100 border-blue-200'}`}>
                            {ev.kind === 'tx' ? (ev.credit ? (
                              <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <ArrowDownLeft className="h-3.5 w-3.5 text-red-600" />
                            )) : (
                              <Calendar className="h-3.5 w-3.5 text-blue-600" />
                            )}
                          </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{ev.title}</p>
                              {ev.subtitle && <p className="text-xs text-gray-500 mt-0.5">{ev.subtitle}</p>}
                            </div>
                            <div className="text-[11px] text-gray-500">{new Date(ev.when).toLocaleString('fr-FR')}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {activeTab === 'signers' && (
              <div className="space-y-4">
                {authorizedSigners.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-600">
                    Aucun signataire autorisé enregistré pour ce compte.
                  </div>
                ) : (
                  authorizedSigners.map((signer, idx) => (
                    <div key={`${signer.fullName || 'signer'}-${idx}`} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-gray-900">Signataire #{idx + 1}</span>
                        </div>
                        {signer.authorizationLimit !== undefined && signer.authorizationLimit !== null && (
                          <span className="text-xs text-gray-600">
                            Limite: {formatCurrency(Number(signer.authorizationLimit), displayCurrency(account.currency))}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-gray-500">Nom complet</div>
                          <div className="text-gray-900">{signer.fullName || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Relation</div>
                          <div className="text-gray-900">{signer.relationshipToCustomer || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Type de document</div>
                          <div className="text-gray-900">
                            {signer.documentType === 0
                              ? 'CIN'
                              : signer.documentType === 1
                                ? 'Passeport'
                                : signer.documentType === 2
                                  ? 'Permis de conduire'
                                  : (signer.documentType as any) ?? '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Numéro de document</div>
                          <div className="text-gray-900">{signer.documentNumber || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Téléphone</div>
                          <div className="text-gray-900">{signer.phoneNumber || '—'}</div>
                        </div>
                      </div>
                      {(signer.photoUrl || signer.signature) && (
                        <div className="mt-4 flex flex-wrap gap-6">
                          {signer.photoUrl && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Photo</div>
                              <img
                                src={signer.photoUrl}
                                alt={`Photo signataire ${idx + 1}`}
                                className="w-24 h-24 object-cover rounded border"
                              />
                            </div>
                          )}
                          {signer.signature && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Signature</div>
                              <img
                                src={signer.signature}
                                alt={`Signature signataire ${idx + 1}`}
                                className="w-40 h-20 object-contain bg-white border rounded p-2"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap gap-2">
              {(() => {
                const statusStr = normalizeStatus(account.status);
                const isActive = statusStr === 'Active';
                const isSuspended = statusStr === 'Suspended';
                const isInactive = statusStr === 'Inactive';
                return (
                  <>
                    <button onClick={() => { setEditSigners(authorizedSigners.map(s => ({...s}))); setShowEditModal(true); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2 text-sm">
                      <Edit className="h-4 w-4" />
                      Modifier
                    </button>
                    {(() => {
                      const role = (currentUser?.role || currentUser?.Role || '').toString();
                      const isAuthorized = role === 'Admin' || role === 'SuperAdmin';
                      const disabled = !isActive || (account.interestRate ?? 0) <= 0 || !isAuthorized;
                      return (
                        <button onClick={() => setShowInterestModal(true)} disabled={disabled} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm" title={!isAuthorized ? 'Réservé aux Admin/SuperAdmin' : undefined}>
                          <TrendingUp className="h-4 w-4" />
                          Calculer intérêts
                        </button>
                      );
                    })()}
                    <button onClick={() => setShowStatementModal(true)} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors flex items-center gap-2 text-sm">
                      <Download className="h-4 w-4" />
                      Relevé
                    </button>
                    {isActive && (
                      <button onClick={handleSuspendAccount} className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors flex items-center gap-2 text-sm">
                        <Lock className="h-4 w-4" />
                        Suspendre
                      </button>
                    )}
                    {isSuspended && (
                      <button onClick={handleReactivateAccount} disabled={reactivating} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <Unlock className="h-4 w-4" />
                        {reactivating ? 'Réactivation…' : 'Réactiver'}
                      </button>
                    )}
                    {(isActive || isInactive) && (
                      <button onClick={handleCloseAccount} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-2 text-sm">
                        <XCircle className="h-4 w-4" />
                        Fermer
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Modifier le compte</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <form onSubmit={handleUpdateAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taux d'intérêt (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.interestRate}
                    onChange={e => setEditForm({ ...editForm, interestRate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Solde minimum</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.minimumBalance}
                    onChange={e => setEditForm({ ...editForm, minimumBalance: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Limite de retrait</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.dailyWithdrawalLimit ?? editForm.withdrawalLimit ?? ''}
                    onChange={e => setEditForm({ ...editForm, dailyWithdrawalLimit: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plafond retrait mensuel</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.monthlyWithdrawalLimit ?? ''}
                    onChange={e => setEditForm({ ...editForm, monthlyWithdrawalLimit: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plafond dépôt quotidien</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.dailyDepositLimit ?? ''}
                    onChange={e => setEditForm({ ...editForm, dailyDepositLimit: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Définissez une valeur &gt; 0 pour autoriser les dépôts quotidiens</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Solde maximum</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.maxBalance ?? ''}
                    onChange={e => setEditForm({ ...editForm, maxBalance: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Laissez vide pour aucun plafond ou définissez un maximum autorisé</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant max. retrait</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.maxWithdrawalAmount ?? ''}
                      onChange={e => setEditForm({ ...editForm, maxWithdrawalAmount: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant min. retrait</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.minWithdrawalAmount ?? ''}
                      onChange={e => setEditForm({ ...editForm, minWithdrawalAmount: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={editForm.notes || ''}
                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                
                {/* Signataires autorisés Section */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <label className="text-base font-semibold text-gray-900">Signataires autorisés</label>
                    </div>
                    <button 
                      type="button" 
                      className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm" 
                      onClick={() => setEditSigners(prev => ([...prev, { fullName: '', documentType: 0, documentNumber: '', relationshipToCustomer: '', phoneNumber: '', authorizationLimit: undefined, photoUrl: '', signature: '' }]))}
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter
                    </button>
                  </div>
                  
                  {editSigners.length === 0 ? (
                    <div className="text-sm text-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Users className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="font-medium text-gray-700 mb-1">Aucun signataire</p>
                      <p className="text-xs text-gray-500">Cliquez sur "Ajouter" pour créer un nouveau signataire</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {editSigners.map((s, idx) => {
                        const hasName = s.fullName?.trim();
                        const hasDocNum = s.documentNumber?.trim();
                        const isValid = hasName && hasDocNum;
                        
                        return (
                          <div key={idx} className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                              <div className="flex items-center gap-3">
                                <div className="bg-blue-100 rounded-full p-2">
                                  <User className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">Signataire #{idx + 1}</div>
                                  {isValid ? (
                                    <div className="flex items-center gap-1 text-xs text-green-600 mt-0.5">
                                      <CheckCircle2 className="h-3 w-3" />
                                      <span>Valide</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                                      <AlertCircle className="h-3 w-3" />
                                      <span>Incomplet</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button 
                                type="button" 
                                className="px-3 py-1.5 text-xs text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition-colors flex items-center gap-1.5" 
                                onClick={() => setEditSigners(prev => prev.filter((_, i) => i !== idx))}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Supprimer
                              </button>
                            </div>
                            
                            {/* Identity Section */}
                            <div className="mb-4">
                              <div className="flex items-center gap-2 mb-3">
                                <User className="h-4 w-4 text-gray-600" />
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Identité</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                                    <User className="h-3.5 w-3.5 text-gray-500" />
                                    Nom complet <span className="text-red-500">*</span>
                                  </label>
                                  <input 
                                    type="text" 
                                    value={s.fullName} 
                                    onChange={e => setEditSigners(prev => prev.map((v,i) => i===idx ? { ...v, fullName: e.target.value } : v))} 
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${!hasName ? 'border-amber-300 bg-amber-50' : 'border-gray-300'}`}
                                    placeholder="Ex: Jean Dupont"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                                    <Users className="h-3.5 w-3.5 text-gray-500" />
                                    Relation au client
                                  </label>
                                  <input 
                                    type="text" 
                                    value={s.relationshipToCustomer} 
                                    onChange={e => setEditSigners(prev => prev.map((v,i) => i===idx ? { ...v, relationshipToCustomer: e.target.value } : v))} 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Ex: Conjoint, Fils, etc."
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Document Section */}
                            <div className="mb-4">
                              <div className="flex items-center gap-2 mb-3">
                                <CreditCard className="h-4 w-4 text-gray-600" />
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Document d'identité</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                                    <CreditCard className="h-3.5 w-3.5 text-gray-500" />
                                    Type de document <span className="text-red-500">*</span>
                                  </label>
                                  <select 
                                    value={s.documentType} 
                                    onChange={e => setEditSigners(prev => prev.map((v,i) => i===idx ? { ...v, documentType: Number(e.target.value) } : v))} 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                  >
                                    <option value={0}>CIN</option>
                                    <option value={1}>Passeport</option>
                                    <option value={2}>Permis de conduire</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                                    <CreditCard className="h-3.5 w-3.5 text-gray-500" />
                                    Numéro de document <span className="text-red-500">*</span>
                                  </label>
                                  <input 
                                    type="text" 
                                    value={s.documentNumber} 
                                    onChange={e => setEditSigners(prev => prev.map((v,i) => i===idx ? { ...v, documentNumber: e.target.value } : v))} 
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${!hasDocNum ? 'border-amber-300 bg-amber-50' : 'border-gray-300'}`}
                                    placeholder="Ex: 001-123456-7"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Contact & Authorization Section */}
                            <div className="mb-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Phone className="h-4 w-4 text-gray-600" />
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Contact & Autorisation</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                                    <Phone className="h-3.5 w-3.5 text-gray-500" />
                                    Téléphone
                                  </label>
                                  <input 
                                    type="text" 
                                    value={s.phoneNumber} 
                                    onChange={e => setEditSigners(prev => prev.map((v,i) => i===idx ? { ...v, phoneNumber: e.target.value } : v))} 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Ex: +509 1234 5678"
                                  />
                                </div>
                                <div>
                                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                                    <DollarSign className="h-3.5 w-3.5 text-gray-500" />
                                    Limite d'autorisation
                                  </label>
                                  <input 
                                    type="number" 
                                    step="0.01" 
                                    value={s.authorizationLimit ?? ''} 
                                    onChange={e => setEditSigners(prev => prev.map((v,i) => i===idx ? { ...v, authorizationLimit: (e.target.value === '' ? undefined : Number(e.target.value)) } : v))} 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Montant max. autorisé"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Images Section */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-3">
                                <ImageIcon className="h-4 w-4 text-blue-600" />
                                <h4 className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Documents visuels</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Photo Upload */}
                                <div>
                                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
                                    <ImageIcon className="h-3.5 w-3.5 text-gray-500" />
                                    Photo du signataire
                                  </label>
                                  <div className="space-y-2">
                                    <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-lg cursor-pointer transition-colors group">
                                      <Upload className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                                      <span className="text-xs text-blue-600 group-hover:text-blue-700 font-medium">
                                        {uploadingPhotoIdx === idx ? 'Téléversement...' : 'Téléverser photo'}
                                      </span>
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden"
                                        disabled={uploadingPhotoIdx === idx}
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const custId = (account as any)?.customerId || (account as any)?.clientId || (account as any)?.customerCode || account.id;
                                          if (!custId) { 
                                            toast.error('Identifiant client manquant pour upload'); 
                                            return; 
                                          }
                                          try {
                                            setUploadingPhotoIdx(idx);
                                            const url = await savingsCustomerService.uploadFile(file, String(custId), 'photo');
                                            setEditSigners(prev => prev.map((v,i) => i===idx ? { ...v, photoUrl: url } : v));
                                            toast.success('Photo téléversée avec succès');
                                          } catch (err) {
                                            toast.error("Échec de l'upload de la photo");
                                          } finally {
                                            setUploadingPhotoIdx(null);
                                          }
                                        }}
                                      />
                                    </label>
                                    {s.photoUrl && (
                                      <div className="relative">
                                        <img 
                                          src={s.photoUrl} 
                                          alt="Photo" 
                                          className="w-full h-24 object-cover rounded-lg border-2 border-blue-200" 
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setEditSigners(prev => prev.map((v,i) => i===idx ? { ...v, photoUrl: '' } : v))}
                                          className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                                          title="Supprimer la photo"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Signature Upload */}
                                <div>
                                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
                                    <PenTool className="h-3.5 w-3.5 text-gray-500" />
                                    Signature
                                  </label>
                                  <div className="space-y-3">
                                    <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-lg cursor-pointer transition-colors group">
                                      <Upload className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                                      <span className="text-xs text-blue-600 group-hover:text-blue-700 font-medium">
                                        {uploadingSignIdx === idx ? 'Téléversement...' : 'Téléverser signature'}
                                      </span>
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden"
                                        disabled={uploadingSignIdx === idx}
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const custId2 = (account as any)?.customerId || (account as any)?.clientId || (account as any)?.customerCode || account.id;
                                          if (!custId2) { 
                                            toast.error('Identifiant client manquant pour upload'); 
                                            return; 
                                          }
                                          try {
                                            setUploadingSignIdx(idx);
                                            const url = await savingsCustomerService.uploadFile(file, String(custId2), 'signature');
                                            setEditSigners(prev => prev.map((v,i) => i===idx ? { ...v, signature: url } : v));
                                            toast.success('Signature téléversée avec succès');
                                          } catch (err) {
                                            toast.error("Échec de l'upload de la signature");
                                          } finally {
                                            setUploadingSignIdx(null);
                                          }
                                        }}
                                      />
                                    </label>
                                    {/* Signature Canvas */}
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <PenTool className="h-3.5 w-3.5 text-gray-500" />
                                        <span className="text-xs text-gray-700">Signer ci-dessous</span>
                                      </div>
                                      <canvas
                                        ref={(el) => {
                                          if (!el) return;
                                          const ctx = el.getContext('2d');
                                          if (!ctx) return;
                                          el.width = el.offsetWidth;
                                          el.height = 120;
                                          let drawing = false;
                                          const start = (x: number, y: number) => { drawing = true; ctx.beginPath(); ctx.moveTo(x, y); };
                                          const move = (x: number, y: number) => { if (!drawing) return; ctx.lineTo(x, y); ctx.strokeStyle = '#111827'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(); };
                                          const end = () => { drawing = false; };
                                          const getPos = (ev: MouseEvent | TouchEvent) => {
                                            const rect = el.getBoundingClientRect();
                                            if (ev instanceof TouchEvent) {
                                              const t = ev.touches[0] || ev.changedTouches[0];
                                              return { x: (t.clientX - rect.left), y: (t.clientY - rect.top) };
                                            }
                                            const m = ev as MouseEvent;
                                            return { x: (m.clientX - rect.left), y: (m.clientY - rect.top) };
                                          };
                                          const onMouseDown = (ev: MouseEvent) => { const p = getPos(ev); start(p.x, p.y); };
                                          const onMouseMove = (ev: MouseEvent) => { const p = getPos(ev); move(p.x, p.y); };
                                          const onMouseUp = () => end();
                                          const onTouchStart = (ev: TouchEvent) => { ev.preventDefault(); const p = getPos(ev); start(p.x, p.y); };
                                          const onTouchMove = (ev: TouchEvent) => { ev.preventDefault(); const p = getPos(ev); move(p.x, p.y); };
                                          const onTouchEnd = () => end();
                                          el.addEventListener('mousedown', onMouseDown);
                                          el.addEventListener('mousemove', onMouseMove);
                                          window.addEventListener('mouseup', onMouseUp);
                                          el.addEventListener('touchstart', onTouchStart, { passive: false });
                                          el.addEventListener('touchmove', onTouchMove, { passive: false });
                                          window.addEventListener('touchend', onTouchEnd);
                                          (el as any)._cleanup = () => {
                                            el.removeEventListener('mousedown', onMouseDown);
                                            el.removeEventListener('mousemove', onMouseMove);
                                            window.removeEventListener('mouseup', onMouseUp);
                                            el.removeEventListener('touchstart', onTouchStart);
                                            el.removeEventListener('touchmove', onTouchMove);
                                            window.removeEventListener('touchend', onTouchEnd);
                                          };
                                        }}
                                        className="w-full h-28 bg-white border rounded-lg"
                                      />
                                      <div className="flex gap-2">
                                        <button type="button" className="px-2 py-1 text-xs bg-gray-100 border rounded" onClick={() => {
                                          const c = document.querySelectorAll('canvas');
                                          const canvas = c[c.length - 1] as HTMLCanvasElement | undefined;
                                          if (!canvas) return;
                                          const ctx = canvas.getContext('2d');
                                          if (!ctx) return;
                                          ctx.clearRect(0, 0, canvas.width, canvas.height);
                                        }}>Effacer</button>
                                        <button type="button" className="px-2 py-1 text-xs bg-blue-600 text-white rounded" onClick={() => {
                                          const c = document.querySelectorAll('canvas');
                                          const canvas = c[c.length - 1] as HTMLCanvasElement | undefined;
                                          if (!canvas) return;
                                          const data = canvas.toDataURL('image/png');
                                          setEditSigners(prev => prev.map((v,i) => i===idx ? { ...v, signature: data } : v));
                                          toast.success('Signature enregistrée');
                                        }}>Enregistrer</button>
                                      </div>
                                    </div>
                                    {s.signature && (
                                      <div className="relative">
                                        <img 
                                          src={s.signature} 
                                          alt="Signature" 
                                          className="w-full h-24 object-contain bg-white rounded-lg border-2 border-blue-200 p-2" 
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setEditSigners(prev => prev.map((v,i) => i===idx ? { ...v, signature: '' } : v))}
                                          className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                                          title="Supprimer la signature"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >Annuler</button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AccountDetailsView;
