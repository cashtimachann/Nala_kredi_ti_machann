import React, { useState, useEffect } from 'react';
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
  Home
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../../services/apiService';
import { savingsCustomerService } from '../../services/savingsCustomerService';
import { formatCurrency, getStatusColor, getStatusIcon } from './CompleteSavingsAccountManagement';

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

const AccountDetailsView: React.FC<AccountDetailsViewProps> = ({ accountId, onClose, onUpdate }) => {
  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'transactions' | 'history'>('info');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [calculatingInterest, setCalculatingInterest] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAdvancedLimits, setShowAdvancedLimits] = useState(false);

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

  const loadAccountDetails = async () => {
    setLoading(true);
    try {
      const [accountData, transactionsData] = await Promise.all([
        apiService.getSavingsAccount(accountId),
        apiService.getSavingsTransactions({ accountId })
      ]);

      // Enrich missing customer code if needed
      let enrichedAccount: AccountDetails = accountData as any;
      try {
        if (!enrichedAccount.customerCode && enrichedAccount.customerId) {
          const cust = await savingsCustomerService.getCustomer?.(enrichedAccount.customerId);
          if (cust?.customerCode) {
            enrichedAccount = { ...enrichedAccount, customerCode: cust.customerCode } as AccountDetails;
          }
        }
      } catch {
        // ignore enrichment failures
      }

      setAccount(enrichedAccount);
      setTransactions(transactionsData || []);

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
    const statusMap = { 0: 'Active', 1: 'Inactive', 2: 'Closed', 3: 'Suspended' } as const;
    const raw: any = account.status;
    const statusStr = typeof raw === 'number' ? statusMap[raw as 0|1|2|3] : raw;
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

  const handleSuspendAccount = async () => {
    const reason = prompt('Raison de la suspension:');
    if (!reason) return;
    try {
      await apiService.updateSavingsAccount(accountId, { status: 'Suspended', notes: reason });
      toast.success('Compte suspendu avec succès');
      loadAccountDetails();
      onUpdate?.();
    } catch (error) {
      toast.error('Erreur lors de la suspension');
    }
  };

  const handleReactivateAccount = async () => {
    try {
      await apiService.updateSavingsAccount(accountId, { status: 'Active' });
      toast.success('Compte réactivé avec succès');
      loadAccountDetails();
      onUpdate?.();
    } catch (error) {
      toast.error('Erreur lors de la réactivation');
    }
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
      toast.success('Relevé généré (fonctionnalité à venir)');
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

  return (
    <>
      {/* Calculate Interest Modal */}
      {showInterestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Calcul des intérêts</h2>
              <p className="text-gray-600">Prévisualisez et confirmez le calcul des intérêts pour ce compte.</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Fermer le compte</h2>
              <p className="text-gray-600">Veuillez indiquer la raison de la fermeture :</p>
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
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header - compact */}
          <div className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{account.accountNumber}</h2>
                <p className="text-sm text-gray-500">{account.customerName}</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100" aria-label="Fermer">
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 mt-3 text-sm">
              <div>
                <div className="text-gray-500">Solde Total</div>
                <div className="font-semibold">{formatCurrency(account.balance ?? 0, displayCurrency(account.currency))}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Dispo: {formatCurrency(account.availableBalance ?? 0, displayCurrency(account.currency))}
                </div>
                {(account.blockedBalance ?? 0) > 0 && (
                  <div className="text-xs text-red-600 font-medium mt-0.5">
                    Blokè: {formatCurrency(account.blockedBalance, displayCurrency(account.currency))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-gray-500">Taux</div>
                <div className="font-semibold">{account.interestRate && account.interestRate > 0 ? `${account.interestRate}%` : '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Statut</div>
                {(() => {
                  const statusMap = { 0: 'Active', 1: 'Inactive', 2: 'Closed', 3: 'Suspended' } as const;
                  const raw: any = account.status;
                  const statusStr = typeof raw === 'number' ? statusMap[raw as 0|1|2|3] : raw;
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(statusStr)}`}>
                      {getStatusIcon(statusStr)}
                      {statusStr}
                    </span>
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
                className={`py-2 px-3 text-sm font-medium transition-colors ${activeTab === 'info' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >Informations</button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-2 px-3 text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >Transactions ({transactions.length})</button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-3 text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >Historique</button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'info' && (
              <div className="space-y-6">
                {/* Account Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Informations du compte</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Type de compte</div>
                      <div className="text-gray-900">{displayAccountType(account.accountType)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Devise</div>
                      <div className="text-gray-900">{displayCurrency(account.currency) || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Date d'ouverture</div>
                      <div className="text-gray-900">{(account.openedDate || (account as any).openingDate || (account as any).createdAt) ? new Date((account.openedDate || (account as any).openingDate || (account as any).createdAt) as string).toLocaleDateString('fr-FR') : '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Dernière transaction</div>
                      <div className="text-gray-900">{account.lastTransactionDate ? new Date(account.lastTransactionDate).toLocaleDateString('fr-FR') : 'Aucune'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Solde minimum</div>
                      <div className="text-gray-900">{formatCurrency(account.minimumBalance ?? 0, displayCurrency(account.currency))}</div>
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
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune transaction</h3>
                    <p className="text-gray-500">Ce compte n'a pas encore de transactions</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-1.5 rounded ${isCreditTx(tx) ? 'bg-green-100' : 'bg-red-100'}`}>
                              {isCreditTx(tx) ? (
                                <ArrowUpRight className="h-4 w-4 text-green-600" />
                              ) : (
                                <ArrowDownLeft className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{tx.type === 'Deposit' ? 'Dépôt' : tx.type === 'Withdrawal' ? 'Retrait' : tx.type}</p>
                              <p className="text-xs text-gray-500">{tx.description}</p>
                              {tx.reference !== undefined && tx.reference !== null && String(tx.reference).trim() !== '' && String(tx.reference) !== '0' && (
                                <p className="text-[11px] text-gray-400 mt-1">Réf: {tx.reference}</p>
                              )}
                              <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
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
                          <div className="text-right">
                            <p className={`text-base font-semibold ${isCreditTx(tx) ? 'text-green-600' : 'text-red-600'}`}>{isCreditTx(tx) ? '+' : '-'}{formatCurrency(displayAmount(tx), displayCurrency(tx.currency))}</p>
                            <p className="text-xs text-gray-600 mt-1">Solde: {formatCurrency(tx.balanceAfter, displayCurrency(tx.currency))}</p>
                            <p className="text-[11px] text-gray-400 mt-1">{new Date(tx.processedAt).toLocaleString('fr-FR')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
          </div>

          {/* Actions Footer */}
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap gap-2">
              {(() => {
                const statusMap = { 0: 'Active', 1: 'Inactive', 2: 'Closed', 3: 'Suspended' } as const;
                const raw: any = account.status;
                const statusStr = typeof raw === 'number' ? statusMap[raw as 0|1|2|3] : raw;
                const isActive = statusStr === 'Active';
                const isSuspended = statusStr === 'Suspended';
                const isInactive = statusStr === 'Inactive';
                return (
                  <>
                    <button onClick={() => setShowEditModal(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2 text-sm">
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
                    <button onClick={handleGenerateStatement} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors flex items-center gap-2 text-sm">
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
                      <button onClick={handleReactivateAccount} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-2 text-sm">
                        <Unlock className="h-4 w-4" />
                        Réactiver
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
