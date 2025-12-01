import React, { useEffect, useState } from 'react';
import { 
  X, 
  FileText, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Lock, 
  Unlock, 
  Download, 
  Users,
  Phone,
  Upload,
  Image as ImageIcon,
  PenTool,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  User,
  CreditCard,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/apiService';
import { savingsCustomerService } from '../../services/savingsCustomerService';
import { formatCurrency as savingsFormatCurrency, getStatusColor, getStatusIcon } from '../savings/CompleteSavingsAccountManagement';

interface Props {
  accountId: string | number;
  onClose: () => void;
  onUpdate?: () => void;
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

const CurrentAccountDetailsView: React.FC<Props> = ({ accountId, onClose, onUpdate }) => {
  const [account, setAccount] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'transactions' | 'history' | 'signers'>('info');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({
    status: 'ACTIVE',
    overdraftLimit: 0,
    minimumBalance: 0,
    dailyWithdrawalLimit: 0,
    monthlyWithdrawalLimit: 0,
    allowOverdraft: false,
  });
  const [editSigners, setEditSigners] = useState<AuthorizedSigner[]>([]);
  const [uploadingPhotoIdx, setUploadingPhotoIdx] = useState<number | null>(null);
  const [uploadingSignIdx, setUploadingSignIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [originalEditForm, setOriginalEditForm] = useState<any>(null);
  const [authorizedSigners, setAuthorizedSigners] = useState<AuthorizedSigner[]>([]);

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [accountId]);
  const load = async () => {
    setLoading(true);
    try {
      // Avoid coercing accountId to Number (can produce NaN). Use as-is.
      const acc = await apiService.getAccountDetails(accountId as any);
      // Debug: print the raw account object and its keys so we can discover unexpected field names
      try {
        console.log('Account raw:', acc);
        console.log('Account keys:', Object.keys(acc || {}));
      } catch (e) {
        console.log('Account debug error', e);
      }
      let enriched = acc || null;
      // If client/customer code isn't present but we have a backend customerId, try to enrich from customer service
      try {
        // Normalize potential id values and treat empty strings as missing
        const rawCustId = (enriched as any)?.customerId ?? (enriched as any)?.CustomerId ?? (enriched as any)?.clientId ?? (enriched as any)?.ClientId;
        const custId = rawCustId ? String(rawCustId).trim() : '';
        const hasCode = !!((enriched as any)?.clientId || (enriched as any)?.clientCode || (enriched as any)?.customerCode || (enriched as any)?.customerNumber);
        console.log('Enrichment check:', { rawCustId, custId, hasCode });

        let cust: any = null;
        if (!hasCode) {
          if (custId) {
            console.log('Fetching customer by id for enrichment...', custId);
            try { cust = await savingsCustomerService.getCustomer?.(String(custId)); } catch (err) { console.log('Customer fetch by id failed', err); cust = null; }
          }

          // If no id or id lookup failed, try by phone
          if (!cust) {
            const phone = (enriched as any)?.customerPhone || (enriched as any)?.primaryPhone || (enriched as any)?.contact?.primaryPhone || (enriched as any)?.phone;
            if (phone) {
              console.log('Attempting customer lookup by phone for enrichment...', phone);
              try { cust = await savingsCustomerService.getCustomerByPhone?.(String(phone)); } catch (err) { console.log('Customer fetch by phone failed', err); cust = null; }
            }
          }

          // As a last resort, try searching by customer name (may return multiple results; pick first)
          if (!cust) {
            const name = (enriched as any)?.customerName || (enriched as any)?.fullName || (enriched as any)?.name;
            if (name && String(name).trim().length > 2) {
              console.log('Attempting customer search by name for enrichment...', name);
              try {
                const results = await savingsCustomerService.searchCustomers?.(String(name));
                if (results && results.length > 0) {
                  cust = results[0];
                  console.log('Customer search results count:', results.length);
                }
              } catch (err) {
                console.log('Customer search by name failed', err);
                cust = null;
              }
            }
          }

          if (cust) {
            try {
              console.log('Customer raw:', cust);
              console.log('Customer keys:', Object.keys(cust || {}));
            } catch (e) {
              console.log('Customer debug error', e);
            }
            enriched = {
              ...enriched,
              clientId: (cust as any).clientId || (cust as any).customerId || (cust as any).id || (cust as any).CustomerId,
              clientCode: (cust as any).clientCode || (cust as any).customerCode || (cust as any).CustomerCode || (cust as any).code || (cust as any).client_number,
              customerName: (cust as any).fullName || (cust as any).customerName || (cust as any).name || (cust as any).FullName,
              customerCode: (cust as any).customerCode || (cust as any).CustomerCode || (cust as any).code || (cust as any).clientCode || (cust as any).client_number,
            } as any;
          }
        }
      } catch (e) {
        console.error('Enrichment error:', e);
        // enrichment is optional
      }
      try {
        console.log('Account after enrichment (raw):', enriched);
        console.log('Account after enrichment keys:', Object.keys(enriched || {}));
      } catch (e) {
        console.log('Account after enrichment debug error', e);
      }
      setAccount(enriched || null);
      const rawSigners = (enriched as any)?.authorizedSigners ?? (enriched as any)?.AuthorizedSigners ?? [];
      if (Array.isArray(rawSigners)) {
        const normalizedSigners: AuthorizedSigner[] = rawSigners.map((s: any) => {
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
          };
        });
        setAuthorizedSigners(normalizedSigners);
      } else {
        setAuthorizedSigners([]);
      }
      // Prefer returned accountNumber, otherwise fall back to provided accountId
      const accNum = (enriched as any)?.accountNumber || (enriched as any)?.AccountNumber || String(accountId || '');
      if (accNum) {
        const txs = await apiService.getAccountTransactions(accNum);
        setTransactions(txs || []);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error loading current account details', err);
      toast.error("Erreur lors du chargement du compte");
      setAccount(null);
      setTransactions([]);
      setAuthorizedSigners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!account?.id) return;
    const ok = window.confirm('Confirmer la suspension du compte ?');
    if (!ok) return;
    try {
      // account.id can be a GUID string; pass as string to the service which will encode it
  await apiService.updateAccountStatus(String(account.id), false, account.accountNumber || account.accountNumber || undefined);
      toast.success('Compte suspendu');
      await load();
      onUpdate?.();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la suspension');
    }
  };

  const handleReactivate = async () => {
    if (!account?.id) return;
    try {
      // account.id can be a GUID string; pass as string to the service which will encode it
  await apiService.updateAccountStatus(String(account.id), true, account.accountNumber || account.accountNumber || undefined);
      toast.success('Compte réactivé');
      await load();
      onUpdate?.();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la réactivation');
    }
  };

  const normalizeStatusForHelpers = (raw?: string) => {
    if (!raw) return '';
    const s = String(raw).toUpperCase();
    switch (s) {
      case 'ACTIVE':
      case 'ACTIVE ':
        return 'Active';
      case 'INACTIVE':
        return 'Inactive';
      case 'SUSPENDED':
      case 'SUSPENDU':
        return 'Suspended';
      case 'CLOSED':
      case 'FERMÉ':
        return 'Closed';
      default:
        // Title-case fallback: capitalize first letter
        return s.charAt(0) + s.slice(1).toLowerCase();
    }
  };

  const openEdit = () => {
    // store values as strings so comparisons with inputs are straightforward
    const initial = {
      status: account.status || 'ACTIVE',
      overdraftLimit: String(account.overdraftLimit ?? 0),
      minimumBalance: String(account.minimumBalance ?? 0),
      dailyWithdrawalLimit: String(account.dailyWithdrawalLimit ?? 0),
      monthlyWithdrawalLimit: String(account.monthlyWithdrawalLimit ?? 0),
      allowOverdraft: !!account.allowOverdraft,
    };
    setEditForm(initial);
    setOriginalEditForm(initial);
    setEditSigners(authorizedSigners.map(s => ({ ...s })));
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    setErrors({});
    // basic validation for signers
    for (let i = 0; i < editSigners.length; i++) {
      const s = editSigners[i];
      const nameOk = !!(s.fullName && s.fullName.trim().length >= 2);
      const dtOk = [0,1,2].includes(Number(s.documentType));
      const numOk = !!(s.documentNumber && s.documentNumber.trim().length >= 3);
      if (!nameOk) { toast.error(`Signataire #${i+1}: Nom complet requis`); return; }
      if (!dtOk) { toast.error(`Signataire #${i+1}: Type de document invalide`); return; }
      if (!numOk) { toast.error(`Signataire #${i+1}: Numéro de document requis`); return; }
    }
    
    // Map frontend status string to backend enum number
    const mapStatus = (s: string): number => {
      const st = (s || '').toUpperCase();
      if (st === 'INACTIVE') return 1;
      if (st === 'CLOSED') return 2;
      if (st === 'SUSPENDED') return 3;
      return 0; // ACTIVE
    };
    
    const parsed = {
      status: mapStatus(editForm.status || 'ACTIVE'),
      overdraftLimit: Number(editForm.overdraftLimit || 0),
      minimumBalance: Number(editForm.minimumBalance || 0),
      dailyWithdrawalLimit: Number(editForm.dailyWithdrawalLimit || 0),
      monthlyWithdrawalLimit: Number(editForm.monthlyWithdrawalLimit || 0),
      allowOverdraft: !!editForm.allowOverdraft,
    };

    const nextErrors: Record<string, string> = {};
    if (Number.isNaN(parsed.overdraftLimit) || parsed.overdraftLimit < 0) nextErrors.overdraftLimit = 'La limite de découvert doit être un nombre ≥ 0';
    if (Number.isNaN(parsed.minimumBalance) || parsed.minimumBalance < 0) nextErrors.minimumBalance = 'Le solde minimum doit être un nombre ≥ 0';
    if (Number.isNaN(parsed.dailyWithdrawalLimit) || parsed.dailyWithdrawalLimit < 0) nextErrors.dailyWithdrawalLimit = 'La limite journalière doit être un nombre ≥ 0';
    if (Number.isNaN(parsed.monthlyWithdrawalLimit) || parsed.monthlyWithdrawalLimit < 0) nextErrors.monthlyWithdrawalLimit = 'La limite mensuelle doit être un nombre ≥ 0';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      // focus first error - optional UX improvement
      return;
    }

    setSaving(true);
    try {
      const payload: any = { ...parsed };
      const cleaned = (editSigners || []).filter(s => (s.fullName || '').trim().length > 0);
      if (cleaned.length) {
        payload.authorizedSigners = cleaned.map(s => ({
          fullName: s.fullName?.trim() || '',
          role: s.relationshipToCustomer?.trim() || undefined,
          documentType: Number(s.documentType || 0),
          documentNumber: s.documentNumber?.trim() || '',
          relationshipToCustomer: s.relationshipToCustomer?.trim() || undefined,
          phone: s.phoneNumber?.trim() || undefined,
          authorizationLimit: (s.authorizationLimit !== undefined && s.authorizationLimit !== null) ? Number(s.authorizationLimit) : undefined,
          photoUrl: (s.photoUrl && String(s.photoUrl).trim()) ? String(s.photoUrl).trim() : undefined,
          signature: (s.signature && String(s.signature).trim()) ? String(s.signature).trim() : undefined,
        }));
      }
      await apiService.updateCurrentAccount(String(account.id), payload);
      toast.success('Compte mis à jour');
      setShowEditModal(false);
      await load();
      onUpdate?.();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const exportStatement = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) { toast.error('Veuillez autoriser les pop-ups pour exporter le relevé'); return; }
      const rows = transactions.map(tx => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd">${tx.reference || tx.id || ''}</td>
          <td style="padding:8px;border:1px solid #ddd">${new Date(tx.transactionDate || tx.processedAt || Date.now()).toLocaleString('fr-FR')}</td>
          <td style="padding:8px;border:1px solid #ddd">${tx.transactionType || tx.type || ''}</td>
          <td style="padding:8px;border:1px solid #ddd">${tx.performedBy || tx.processedBy || ''}</td>
          <td style="padding:8px;border:1px solid #ddd">${(tx.amount || tx.amount === 0) ? savingsFormatCurrency(Math.abs(Number(tx.amount || 0)), tx.currency || account.currency) : ''}</td>
          <td style="padding:8px;border:1px solid #ddd">${savingsFormatCurrency((tx.balanceAfter ?? tx.balance) || 0, tx.currency || account.currency)}</td>
        </tr>
      `).join('');

      const html = `
        <html><head><meta charset="utf-8"><title>Relevé ${account.accountNumber}</title>
        <style>table{border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif}th,td{border:1px solid #ddd;padding:8px}th{background:#f3f4f6;text-align:left}</style>
        </head><body>
        <h2>Relevé du compte ${account.accountNumber}</h2>
        <p>Client: ${account.customerName || '—'}</p>
        <p>Généré le ${new Date().toLocaleString('fr-FR')}</p>
        <table>
          <thead><tr><th>Réf</th><th>Date</th><th>Type</th><th>Opérateur</th><th>Montant</th><th>Solde</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.onload = ()=>{ setTimeout(()=>{ window.print(); },300); };</script>
        </body></html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      toast.success('Fenêtre d\'export ouverte - utilisez Imprimer pour sauver en PDF');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la génération du relevé');
    }
  };

  const handleClose = () => {
    setShowCloseConfirm(true);
    setCloseReason('');
  };

  const confirmClose = async () => {
    if (!closeReason) { toast.error('Veuillez indiquer une raison'); return; }
    try {
      await apiService.closeClientAccount(String(account.id), closeReason);
      toast.success('Compte fermé');
      setShowCloseConfirm(false);
      onUpdate?.();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la fermeture');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" /></div>
  );

  if (!account) return null;

  const normalizedStatus = normalizeStatusForHelpers(account.status);
  // compute last transaction date (safely) from transactions
  const lastTransactionDate = (() => {
    if (!transactions || transactions.length === 0) return null;
    try {
      const most = transactions.reduce((prev: any, cur: any) => {
        const p = new Date(prev.processedAt || prev.transactionDate || prev.date || 0).getTime();
        const c = new Date(cur.processedAt || cur.transactionDate || cur.date || 0).getTime();
        return c > p ? cur : prev;
      }, transactions[0]);
      return new Date(most.processedAt || most.transactionDate || most.date || null);
    } catch (e) {
      return null;
    }
  })();

  return (
    <>
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Fermer le compte</h3>
            <p className="text-sm text-gray-600 mb-3">Indiquez la raison de la fermeture :</p>
            <textarea className="w-full border rounded p-2" rows={4} value={closeReason} onChange={e => setCloseReason(e.target.value)} />
            <div className="flex gap-2 mt-4">
              <button className="flex-1 px-3 py-2 border rounded" onClick={() => setShowCloseConfirm(false)}>Annuler</button>
              <button className="flex-1 px-3 py-2 bg-red-600 text-white rounded" onClick={confirmClose}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          {/* constrain modal height and allow scrolling for long content (prevents it from growing beyond viewport) */}
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Modifier les paramètres du compte</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-600">Autoriser découvert</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="allowOverdraft"
                    type="checkbox"
                    checked={!!editForm.allowOverdraft}
                    onChange={e => setEditForm({ ...editForm, allowOverdraft: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <label htmlFor="allowOverdraft" className="text-sm">Autoriser le découvert pour ce compte</label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Limite de découvert</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.overdraftLimit ?? ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditForm({ ...editForm, overdraftLimit: val });
                      const num = Number(val);
                      setErrors(prev => {
                        const next = { ...prev };
                        if (Number.isNaN(num) || num < 0) next.overdraftLimit = 'La limite de découvert doit être un nombre ≥ 0';
                        else delete next.overdraftLimit;
                        return next;
                      });
                    }}
                    className="w-full border rounded px-2 py-2 mt-1"
                    disabled={!editForm.allowOverdraft}
                  />
                  <div className="mt-1 text-xs text-gray-500">{savingsFormatCurrency(Number(editForm.overdraftLimit || 0), account.currency)}</div>
                  {errors.overdraftLimit && <div className="text-red-600 text-xs mt-1">{errors.overdraftLimit}</div>}
                </div>
                <div>
                  <label className="text-xs text-gray-600">Solde minimum</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.minimumBalance ?? ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditForm({ ...editForm, minimumBalance: val });
                      const num = Number(val);
                      setErrors(prev => {
                        const next = { ...prev };
                        if (Number.isNaN(num) || num < 0) next.minimumBalance = 'Le solde minimum doit être un nombre ≥ 0';
                        else delete next.minimumBalance;
                        return next;
                      });
                    }}
                    className="w-full border rounded px-2 py-2 mt-1"
                  />
                  <div className="mt-1 text-xs text-gray-500">{savingsFormatCurrency(Number(editForm.minimumBalance || 0), account.currency)}</div>
                  {errors.minimumBalance && <div className="text-red-600 text-xs mt-1">{errors.minimumBalance}</div>}
                </div>
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
                                        const custId = (account as any)?.customerId || (account as any)?.clientId || (account as any)?.customerCode || account.id;
                                        if (!custId) { 
                                          toast.error('Identifiant client manquant pour upload'); 
                                          return; 
                                        }
                                        try {
                                          setUploadingSignIdx(idx);
                                          const url = await savingsCustomerService.uploadFile(file, String(custId), 'signature');
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
                                        // init drawing once
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
                                        // cleanup when unmount
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Limite retrait journalière</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.dailyWithdrawalLimit ?? ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditForm({ ...editForm, dailyWithdrawalLimit: val });
                      const num = Number(val);
                      setErrors(prev => {
                        const next = { ...prev };
                        if (Number.isNaN(num) || num < 0) next.dailyWithdrawalLimit = 'La limite journalière doit être un nombre ≥ 0';
                        else delete next.dailyWithdrawalLimit;
                        return next;
                      });
                    }}
                    className="w-full border rounded px-2 py-2 mt-1"
                  />
                  {errors.dailyWithdrawalLimit && <div className="text-red-600 text-xs mt-1">{errors.dailyWithdrawalLimit}</div>}
                </div>
                <div>
                  <label className="text-xs text-gray-600">Limite retrait mensuelle</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.monthlyWithdrawalLimit ?? ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditForm({ ...editForm, monthlyWithdrawalLimit: val });
                      const num = Number(val);
                      setErrors(prev => {
                        const next = { ...prev };
                        if (Number.isNaN(num) || num < 0) next.monthlyWithdrawalLimit = 'La limite mensuelle doit être un nombre ≥ 0';
                        else delete next.monthlyWithdrawalLimit;
                        return next;
                      });
                    }}
                    className="w-full border rounded px-2 py-2 mt-1"
                  />
                  {errors.monthlyWithdrawalLimit && <div className="text-red-600 text-xs mt-1">{errors.monthlyWithdrawalLimit}</div>}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border rounded" disabled={saving}>Annuler</button>
              {/* disable until the form is changed and valid */}
              {(() => {
                const hasErrors = Object.keys(errors).length > 0;
                const formDirty = originalEditForm ? JSON.stringify(editForm) !== JSON.stringify(originalEditForm) : false;
                // Also check if signers changed
                const signersDirty = JSON.stringify(editSigners) !== JSON.stringify(authorizedSigners);
                const dirty = formDirty || signersDirty;
                const disabled = saving || hasErrors || !dirty;
                return (
                  <button onClick={saveEdit} className={`px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={disabled}>
                    {saving ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" /> : null}
                    <span>{saving ? 'Enregistrement…' : 'Enregistrer'}</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{account.accountNumber}</h2>
              <div className="text-sm text-gray-600">{account.customerName}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={openEdit} className="px-2 py-1 rounded bg-blue-600 text-white text-sm">Modifier</button>
              <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <div className="border-b bg-gray-50 px-4">
            <div className="flex gap-2">
              <button onClick={() => setActiveTab('info')} className={`py-2 px-3 ${activeTab==='info'?'text-blue-600 border-b-2 border-blue-600':'text-gray-600'}`}>Informations</button>
              <button onClick={() => setActiveTab('transactions')} className={`py-2 px-3 ${activeTab==='transactions'?'text-blue-600 border-b-2 border-blue-600':'text-gray-600'}`}>Transactions ({transactions.length})</button>
              <button onClick={() => setActiveTab('history')} className={`py-2 px-3 ${activeTab==='history'?'text-blue-600 border-b-2 border-blue-600':'text-gray-600'}`}>Historique</button>
              <button onClick={() => setActiveTab('signers')} className={`py-2 px-3 ${activeTab==='signers'?'text-blue-600 border-b-2 border-blue-600':'text-gray-600'}`}>Signataires{authorizedSigners.length > 0 ? ` (${authorizedSigners.length})` : ''}</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'info' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Informations du compte</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Type de compte</div>
                    <div className="text-gray-900">{account.accountType || account.type || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Devise</div>
                    <div className="text-gray-900">{account.currency || '—'}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Date d'ouverture</div>
                    <div className="text-gray-900">{account.openingDate ? new Date(account.openingDate).toLocaleDateString('fr-FR') : '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Dernière transaction</div>
                    <div className="text-gray-900">{lastTransactionDate ? lastTransactionDate.toLocaleDateString('fr-FR') : '—'}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Solde minimum</div>
                    <div className="text-gray-900">{savingsFormatCurrency(account.minimumBalance ?? account.minBalance ?? 0, account.currency)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Limite de retrait</div>
                    <div className="text-gray-900">{savingsFormatCurrency(account.withdrawalLimit ?? account.dailyWithdrawalLimit ?? 0, account.currency)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Plafond retrait mensuel</div>
                    <div className="text-gray-900">{savingsFormatCurrency(account.monthlyWithdrawalLimit ?? account.monthlyLimit ?? 0, account.currency)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Solde maximum</div>
                    <div className="text-gray-900">{savingsFormatCurrency(account.maxBalance ?? account.maximumBalance ?? 0, account.currency)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Plafond dépôt quotidien</div>
                    <div className="text-gray-900">{savingsFormatCurrency(account.dailyDepositLimit ?? account.depositDailyLimit ?? 0, account.currency)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Montant max. retrait</div>
                    <div className="text-gray-900">{savingsFormatCurrency(account.maxWithdrawalAmount ?? account.maximumWithdrawal ?? 0, account.currency)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Montant min. retrait</div>
                    <div className="text-gray-900">{savingsFormatCurrency(account.minWithdrawalAmount ?? account.minimumWithdrawal ?? 0, account.currency)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Succursale</div>
                    <div className="text-gray-900">{account.branchName || account.branch || '—'}</div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold">Informations du client</h4>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <div className="text-xs text-gray-500">Nom complet</div>
                      <div className="text-gray-900">{account.customerName || account.fullName || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Code Client</div>
                      <div className="text-gray-900">{account.customerCode || (account as any).CustomerCode || account.clientId || account.clientCode || account.customerNumber || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="space-y-2">
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">Aucune transaction</div>
                ) : (
                  transactions.map((tx: any) => {
                    const credit = (String(tx.type || tx.transactionType || '').toLowerCase().includes('deposit') || (tx.amount >= 0));
                    const amount = Math.abs(Number(tx.amount ?? ((tx.balanceAfter != null && tx.balanceBefore != null) ? (tx.balanceAfter - tx.balanceBefore) : 0)));
                    const title = tx.type || tx.transactionType || (tx.description ? (String(tx.description).split('\n')[0]) : 'Transaction');
                    const subtitle = tx.subType || tx.memo || tx.note || (tx.description && String(tx.description).split('\n')[1]) || '';
                    const reference = tx.reference || tx.transactionReference || tx.id || '';
                    const branch = tx.branchName || tx.branch || account.branchName || '';
                    const operator = tx.performedBy || tx.processedBy || tx.operatorEmail || tx.userEmail || '';
                    const balance = (tx.balanceAfter ?? tx.balance ?? account.balance) || 0;

                    return (
                      <div key={tx.id || tx.reference} className="bg-white border rounded p-3 flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded ${credit ? 'bg-green-100' : 'bg-red-100'}`}>
                            {credit ? <ArrowUpRight className="h-5 w-5 text-green-600" /> : <ArrowDownLeft className="h-5 w-5 text-red-600" />}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{title}</div>
                            {subtitle && <div className="text-xs text-gray-600">{subtitle}</div>}
                            <div className="text-xs text-gray-500 mt-2">Réf: <span className="font-mono">{reference}</span></div>
                            <div className="text-xs text-gray-500 mt-1">{branch}</div>
                            {operator && <div className="text-xs text-gray-500">{operator}</div>}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`font-semibold text-lg ${credit ? 'text-green-600' : 'text-red-600'}`}>{credit ? '+' : '-'}{savingsFormatCurrency(amount, tx.currency || account.currency)}</div>
                          <div className="text-sm text-gray-600">Solde: {savingsFormatCurrency(balance, tx.currency || account.currency)}</div>
                          <div className="text-xs text-gray-500 mt-1">{new Date(tx.processedAt || tx.transactionDate || tx.date || Date.now()).toLocaleString('fr-FR')}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

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
                            Limite: {savingsFormatCurrency(Number(signer.authorizationLimit), account.currency)}
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
                                  : signer.documentType ?? '—'}
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
                        {/* Champs additionnels si disponibles */}
                        {(() => {
                          const extra: Array<{ label: string; value: any }> = [];
                          const sAny: any = signer as any;
                          // Statut
                          if (sAny.status || sAny.Status) {
                            extra.push({ label: 'Statut', value: sAny.status || sAny.Status });
                          }
                          // Email/contact
                          if (sAny.email || sAny.Email) {
                            extra.push({ label: 'Email', value: sAny.email || sAny.Email });
                          }
                          if (sAny.address || sAny.Address) {
                            extra.push({ label: 'Adresse', value: sAny.address || sAny.Address });
                          }
                          // Dates
                          if (sAny.createdAt || sAny.CreatedAt) {
                            const d = new Date(sAny.createdAt || sAny.CreatedAt);
                            extra.push({ label: 'Créé le', value: isNaN(d.getTime()) ? (sAny.createdAt || sAny.CreatedAt) : d.toLocaleString('fr-FR') });
                          }
                          if (sAny.updatedAt || sAny.UpdatedAt) {
                            const d = new Date(sAny.updatedAt || sAny.UpdatedAt);
                            extra.push({ label: 'Mis à jour le', value: isNaN(d.getTime()) ? (sAny.updatedAt || sAny.UpdatedAt) : d.toLocaleString('fr-FR') });
                          }
                          // Identifiants additionnels
                          if (sAny.nationalIdType) {
                            extra.push({ label: "Type d'ID national", value: sAny.nationalIdType });
                          }
                          if (sAny.nationalIdNumber) {
                            extra.push({ label: "Numéro d'ID national", value: sAny.nationalIdNumber });
                          }
                          if (sAny.notes || sAny.Notes) {
                            extra.push({ label: 'Notes', value: sAny.notes || sAny.Notes });
                          }

                          return extra.map((e, i) => (
                            <div key={`extra-${i}`}>
                              <div className="text-xs text-gray-500">{e.label}</div>
                              <div className="text-gray-900">{e.value ?? '—'}</div>
                            </div>
                          ));
                        })()}
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

            {activeTab === 'history' && (
              <div>
                <div className="text-sm text-gray-600">Historique simplifié — voir onglet Transactions pour plus de détails.</div>
                <div className="mt-4 space-y-3">
                  <div className="bg-white border rounded p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">Compte créé</div>
                      <div className="text-xs text-gray-500">{account.openingDate ? new Date(account.openingDate).toLocaleString('fr-FR') : '—'}</div>
                    </div>
                    <div className="text-xs text-gray-500">Succursale: {account.branchName || '—'}</div>
                  </div>
                  {account.closedDate && (
                    <div className="bg-white border rounded p-3">
                      <div className="font-medium">Compte fermé</div>
                      <div className="text-xs text-gray-500">{new Date(account.closedDate).toLocaleString('fr-FR')}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

              <div className="border-t p-4 bg-gray-50">
            <div className="flex gap-2">
              {normalizedStatus === 'Active' && (
                <button onClick={handleSuspend} className="px-3 py-2 bg-yellow-600 text-white rounded flex items-center gap-2"><Lock className="h-4 w-4" />Suspendre</button>
              )}
              {normalizedStatus === 'Suspended' && (
                <button onClick={handleReactivate} className="px-3 py-2 bg-green-600 text-white rounded flex items-center gap-2"><Unlock className="h-4 w-4" />Réactiver</button>
              )}
              {(normalizedStatus === 'Active' || normalizedStatus === 'Inactive') && (
                <button onClick={handleClose} className="px-3 py-2 bg-red-600 text-white rounded flex items-center gap-2"><X className="h-4 w-4" />Fermer</button>
              )}
              <button onClick={exportStatement} className="px-3 py-2 bg-gray-700 text-white rounded flex items-center gap-2"><FileText className="h-4 w-4" />Relevé</button>
              <div className="ml-auto text-sm text-gray-600 flex items-center gap-2"><Download className="h-4 w-4" />{account.accountNumber}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CurrentAccountDetailsView;


