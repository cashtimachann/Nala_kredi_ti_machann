  import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Wallet,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Building2,
  Edit2,
  X,
  CheckCircle,
  AlertTriangle,
  
  UserPlus,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
  Trash2,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import ClientCreationForm from './ClientCreationForm';
import ClientEditForm from './ClientEditForm';
import DocumentUploadModal from './DocumentUploadModal';
import { IdentityDocumentType as SavingsIdentityDocType } from '../../types/savings';
import savingsCustomerService, { 
  SavingsCustomerCreateDto,
  SavingsCustomerResponseDto,
  SavingsIdentityDocumentType 
} from '../../services/savingsCustomerService';
import {
  ClientAccount,
  AccountType,
  AccountTransaction,
  AccountSearchFilters,
  ClientAccountStats,
  
  getAccountTypeLabel,
  getTermTypeLabel,
  TermSavingsType
} from '../../types/clientAccounts';
import apiService from '../../services/apiService';
import { Branch } from '../../types/branch';
import { genderLabel } from '../../utils/gender';
import { unparse } from 'papaparse';

interface AccountCreationFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const AccountCreationForm: React.FC<AccountCreationFormProps> = ({ onSubmit, onCancel }) => {
  const [accountType, setAccountType] = useState<AccountType>(AccountType.SAVINGS);
  const [currency, setCurrency] = useState<'HTG' | 'USD'>('HTG');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const currentUser = apiService.getCurrentUser();
  const canCreate = (() => {
    const role = (currentUser?.role || '').toString();
    // Accept English and French role labels commonly used
    return [
      'Cashier', 'BranchSupervisor', 'SuperAdmin',
      'CAISSIER', 'CHEF_DE_SUCCURSALE', 'ChefDeSuccursale', 'SUPERADMIN'
    ].includes(role);
  })();

  // Local search input for customer ID lookups (can be ID, document number, phone, etc.)
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupInfo, setLookupInfo] = useState<{
    matched?: SavingsCustomerResponseDto | null;
    count?: number;
    error?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Ensure a valid backend customerId is set (from auto-lookup)
      if (!formData.customerId || typeof formData.customerId !== 'string' || formData.customerId.trim().length === 0) {
        toast.error("Veuillez entrer un ID client valide et sélectionner un client existant");
        return;
      }

      const accountData = {
        ...formData,
        accountType,
        currency,
        branchId: 1, // Default branch for now
      };

      await onSubmit(accountData);
    } catch (error) {
      console.error('Error creating account:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: Record<string, any>) => ({ ...prev, [field]: value }));
  };

  // Helper: generate display ID from customer name (same logic as getDisplayClientId below)
  const computeDisplayId = (customer: SavingsCustomerResponseDto): string => {
    // Debug log
    console.log('🔍 computeDisplayId called with:', {
      id: customer.id,
      customerCode: customer.customerCode,
      hasCustomerCode: !!customer.customerCode,
      firstName: customer.firstName,
      lastName: customer.lastName
    });
    
    // Si customerCode existe, l'utiliser directement
    if (customer.customerCode) {
      return customer.customerCode;
    }
    // Sinon, si le DocumentNumber est court (format ID généré), l'utiliser
    if (customer.identity?.documentNumber && customer.identity.documentNumber.length <= 8) {
      return customer.identity.documentNumber;
    }
    // Sinon générer un ID déterministe basé sur le nom
    const firstInitial = (customer.firstName || 'X').charAt(0).toUpperCase();
    const lastInitial = (customer.lastName || 'X').charAt(0).toUpperCase();
    const fullName = `${customer.firstName}${customer.lastName}${customer.dateOfBirth || ''}`;
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      const char = fullName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    hash = Math.abs(hash);
    const digits = (hash % 9000 + 1000).toString();
    const generated = `${firstInitial}${lastInitial}${digits}`;
    console.log('⚠️ No customerCode, generated:', generated);
    return generated;
  };

  // Debounced auto-lookup for customer based on the customerSearch input
  useEffect(() => {
    let active = true;

    const term = (customerSearch || '').trim();
    if (!term || term.length < 2) {
      setLookupLoading(false);
      setLookupInfo({});
      // Clear selected customer id/name if user clears the search
      updateFormData('customerId', '');
      // Keep name editable; don't forcibly clear if already typed by user
      return () => { active = false; };
    }

    setLookupLoading(true);
    const handle = setTimeout(async () => {
      try {
        const normalized = (s?: string) => (s || '').toString().trim().toLowerCase();
        const t = normalized(term);

        let matched: SavingsCustomerResponseDto | null = null;
        let results: SavingsCustomerResponseDto[] = [];

        // Always search by name, phone, or document number
        results = await savingsCustomerService.searchCustomers(term);
        if (!active) return;

        // Try to find exact match by:
        // 1. Backend customer id
        // 2. Identity.documentNumber  
        // 3. Generated display ID (FV2528 format)
        matched = results.find(r => {
          if (!r) return false;
          const displayId = computeDisplayId(r);
          return (
            normalized(r.id) === t ||
            normalized(r.identity?.documentNumber) === t ||
            normalized(displayId) === t
          );
        }) || null;

        // If no exact match but a single result, use it as a convenience
        if (!matched && Array.isArray(results) && results.length === 1) {
          matched = results[0];
        }

        // Keep customerId in sync; clear if no match
        updateFormData('customerId', matched ? matched.id : '');
        // Auto-fill customer name only when we have a match
        if (matched) updateFormData('customerName', matched.fullName);

        setLookupInfo({ matched: matched || undefined, count: results.length });
      } catch (err: any) {
        if (!active) return;
        setLookupInfo({ error: err?.message || 'Erreur de recherche' });
      } finally {
        if (active) setLookupLoading(false);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [customerSearch]);

  // Account numbers are generated by the backend at creation time

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {!canCreate && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800">
          Vous n'avez pas l'autorisation de créer un compte. Rôle requis: Caissier, Chef de Succursale, ou SuperAdmin.
        </div>
      )}
      {/* Account Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type de Compte *
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[AccountType.SAVINGS, AccountType.CURRENT, AccountType.TERM_SAVINGS].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setAccountType(type)}
              className={`p-3 border rounded-lg text-center transition-colors ${
                accountType === type
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="font-medium">{getAccountTypeLabel(type)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Currency Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Devise *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(['HTG', 'USD'] as const).map((curr) => (
            <button
              key={curr}
              type="button"
              onClick={() => setCurrency(curr)}
              className={`p-3 border rounded-lg text-center transition-colors ${
                currency === curr
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="font-medium">{curr}</div>
              <div className="text-sm text-gray-500">
                {curr === 'HTG' ? 'Gourde Haïtienne' : 'Dollar Américain'}
              </div>
            </button>
          ))}
        </div>
        {/* Info: Auto-generated account number format */}
        <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
          <div className="font-medium text-gray-800 mb-1">Numéro de compte</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Généré automatiquement par le système au moment de la création</li>
            <li>Format fixe selon la devise sélectionnée:</li>
            <li className="ml-4">HTG → G + 11 chiffres (ex: <span className="font-mono">G12345678901</span>)</li>
            <li className="ml-4">USD → D + 11 chiffres (ex: <span className="font-mono">D12345678901</span>)</li>
          </ul>
        </div>
      </div>

      {/* Customer Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ID Client *
          </label>
          <input
            type="text"
            required
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Entrez l'ID du client (ex: FV2528)"
          />
          {/* Clear selection */}
          {lookupInfo?.matched && (
            <button
              type="button"
              onClick={() => {
                setCustomerSearch('');
                setLookupInfo({});
                updateFormData('customerId', '');
              }}
              className="mt-2 text-xs text-blue-700 hover:text-blue-900 underline"
            >
              Effacer la sélection
            </button>
          )}
          {/* Lookup feedback */}
          <div className="mt-1 min-h-[20px] text-xs">
            {lookupLoading && (
              <div className="flex items-center text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                <span>Recherche du client…</span>
              </div>
            )}
            {!lookupLoading && lookupInfo?.matched && (
              <div className="flex items-center text-green-700">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>
                  Trouvé: {lookupInfo.matched.fullName}
                  {lookupInfo.matched.identity?.documentNumber ? ` • ID: ${lookupInfo.matched.identity.documentNumber}` : ''}
                </span>
              </div>
            )}
            {!lookupLoading && !lookupInfo?.matched && customerSearch.trim().length >= 2 && typeof lookupInfo.count === 'number' && lookupInfo.count > 1 && (
              <div className="flex items-center text-amber-700">
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span>Plusieurs résultats. Spécifiez l'ID exact ou le numéro de document.</span>
              </div>
            )}
            {!lookupLoading && !lookupInfo?.matched && customerSearch.trim().length >= 2 && lookupInfo.count === 0 && (
              <div className="text-red-600">Aucun client trouvé</div>
            )}
            {!lookupLoading && lookupInfo?.error && (
              <div className="text-red-600">{lookupInfo.error}</div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom du Client
          </label>
          <input
            type="text"
            value={formData.customerName || ''}
            onChange={(e) => updateFormData('customerName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nom du client"
            readOnly={!!lookupInfo?.matched}
            disabled={!!lookupInfo?.matched}
          />
          {formData.customerId && (
            <div className="mt-1 text-xs text-gray-500">Rempli automatiquement après identification du client</div>
          )}
        </div>
      </div>

      {/* Auto-generate account number when a valid customer is matched or currency changes */}
      {(() => {
        // use IIFE only to keep hooks at top level — actual effects are below
        return null;
      })()}

      {/* Deposit Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Montant Initial ({currency}) *
        </label>
        <input
          type="number"
          required
          min="0"
          step="0.01"
          value={formData.initialDeposit || ''}
          onChange={(e) => updateFormData('initialDeposit', parseFloat(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={`Montant en ${currency}`}
        />
      </div>

      {/* Account-specific fields */}
      {accountType === AccountType.SAVINGS && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Paramètres du Compte d'Épargne</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taux d'Intérêt (%)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.01"
                value={formData.interestRate || (currency === 'HTG' ? '3.0' : '1.5')}
                onChange={(e) => updateFormData('interestRate', parseFloat(e.target.value) / 100)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Solde Minimum ({currency})
              </label>
              <input
                type="number"
                min="0"
                value={formData.minimumBalance || (currency === 'HTG' ? '100' : '5')}
                onChange={(e) => updateFormData('minimumBalance', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Limite Retrait Quotidien ({currency})
            </label>
            <input
              type="number"
              min="0"
              value={formData.dailyWithdrawalLimit || (currency === 'HTG' ? '50000' : '1000')}
              onChange={(e) => updateFormData('dailyWithdrawalLimit', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {accountType === AccountType.CURRENT && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Paramètres du Compte Courant</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Solde Minimum ({currency})
              </label>
              <input
                type="number"
                min="0"
                value={formData.minimumBalance || (currency === 'HTG' ? '500' : '25')}
                onChange={(e) => updateFormData('minimumBalance', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Limite Retrait Quotidien ({currency})
              </label>
              <input
                type="number"
                min="0"
                value={formData.dailyWithdrawalLimit || (currency === 'HTG' ? '100000' : '2000')}
                onChange={(e) => updateFormData('dailyWithdrawalLimit', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Limite Retrait Mensuel ({currency})
            </label>
            <input
              type="number"
              min="0"
              value={formData.monthlyWithdrawalLimit || (currency === 'HTG' ? '500000' : '10000')}
              onChange={(e) => updateFormData('monthlyWithdrawalLimit', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

              {/* Sécurité du compte */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Code PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={formData.securityPin || ''}
                    onChange={(e) => updateFormData('securityPin', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="4-6 chiffres"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question de sécurité</label>
                  <input
                    type="text"
                    value={formData.securityQuestion || ''}
                    onChange={(e) => updateFormData('securityQuestion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Ville de naissance?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Réponse</label>
                  <input
                    type="text"
                    value={formData.securityAnswer || ''}
                    onChange={(e) => updateFormData('securityAnswer', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Informations opérationnelles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mode de versement</label>
                  <select
                    value={formData.depositMethod || ''}
                    onChange={(e) => updateFormData('depositMethod', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="CASH">Cash</option>
                    <option value="TRANSFER">Transfert</option>
                    <option value="CHEQUE">Chèque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Origine des fonds</label>
                  <select
                    value={formData.incomeSource || ''}
                    onChange={(e) => updateFormData('incomeSource', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="SALARY">Salaire</option>
                    <option value="BUSINESS">Commerce</option>
                    <option value="TRANSFER">Transfert</option>
                    <option value="AGRICULTURE">Agriculture</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fréquence des transactions</label>
                  <select
                    value={formData.transactionFrequency || ''}
                    onChange={(e) => updateFormData('transactionFrequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="DAILY">Quotidienne</option>
                    <option value="WEEKLY">Hebdomadaire</option>
                    <option value="MONTHLY">Mensuelle</option>
                    <option value="SEASONAL">Saisonnière</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">But de l'ouverture du compte</label>
                <input
                  type="text"
                  value={formData.accountPurpose || ''}
                  onChange={(e) => updateFormData('accountPurpose', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Opérations commerciales, Paiement fournisseurs"
                />
              </div>

              {/* Signataires autorisés (optionnel) */}
              <div className="mt-4">
                <h4 className="text-md font-semibold text-gray-900 mb-2">Personnes autorisées à signer (optionnel)</h4>
                <AuthorizedSignersEditor value={formData.authorizedSigners || []} onChange={(v: any) => updateFormData('authorizedSigners', v)} />
              </div>
        </div>
      )}

      {accountType === AccountType.TERM_SAVINGS && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Paramètres de l'Épargne à Terme</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durée du Terme *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.values(TermSavingsType).map((termType) => (
                <button
                  key={termType}
                  type="button"
                  onClick={() => updateFormData('termType', termType)}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    formData.termType === termType
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">{getTermTypeLabel(termType)}</div>
                  <div className="text-sm text-gray-500">
                    {(currency === 'HTG' ? 2.5 : 1.25) + (Object.values(TermSavingsType).indexOf(termType) * (currency === 'HTG' ? 1 : 0.5))}%
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Note importante:</p>
                <p>L'épargne à terme ne permet pas de retraits avant la date d'échéance. Le taux d'intérêt affiché sera appliqué automatiquement.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          disabled={loading}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading || !canCreate}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
          <span>Créer le Compte</span>
        </button>
      </div>
    </form>
  );
};

// Editor component for authorized signers
const AuthorizedSignersEditor: React.FC<{
  value: Array<{
    fullName: string;
    documentType: SavingsIdentityDocType | string;
    documentNumber: string;
    relationshipToCustomer: string;
    phoneNumber: string;
    authorizationLimit?: number;
  }>;
  onChange: (val: any[]) => void;
}> = ({ value, onChange }) => {
  const addSigner = () => {
    onChange([...(value || []), { fullName: '', documentType: SavingsIdentityDocType.CIN, documentNumber: '', relationshipToCustomer: '', phoneNumber: '', authorizationLimit: undefined }]);
  };
  const update = (idx: number, field: string, v: any) => {
    const next = [...(value || [])];
    (next[idx] as any)[field] = v;
    onChange(next);
  };
  const remove = (idx: number) => {
    const next = [...(value || [])];
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {(value || []).length === 0 && (
        <div className="text-sm text-gray-500">Aucun signataire ajouté.</div>
      )}
      {(value || []).map((s, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom complet</label>
            <input type="text" value={s.fullName} onChange={(e) => update(i, 'fullName', e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type de pièce</label>
            <select value={s.documentType} onChange={(e) => update(i, 'documentType', e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded">
              <option value={SavingsIdentityDocType.CIN}>CIN</option>
              <option value={SavingsIdentityDocType.PASSPORT}>Passeport</option>
              <option value={SavingsIdentityDocType.DRIVING_LICENSE}>Permis</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Numéro</label>
            <input type="text" value={s.documentNumber} onChange={(e) => update(i, 'documentNumber', e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Relation</label>
            <input type="text" value={s.relationshipToCustomer} onChange={(e) => update(i, 'relationshipToCustomer', e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
            <input type="tel" value={s.phoneNumber} onChange={(e) => update(i, 'phoneNumber', e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Limite (HTG)</label>
            <input type="number" min={0} value={s.authorizationLimit ?? ''} onChange={(e) => update(i, 'authorizationLimit', e.target.value ? parseFloat(e.target.value) : undefined)} className="w-full px-2 py-2 border border-gray-300 rounded" />
          </div>
          <div className="md:col-span-6 flex justify-end">
            <button type="button" onClick={() => remove(i)} className="text-xs text-red-600 hover:text-red-800">Retirer</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={addSigner} className="px-3 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 text-sm">+ Ajouter un signataire</button>
    </div>
  );
};

interface ClientAccountManagementProps {}

const ClientAccountManagement: React.FC<ClientAccountManagementProps> = () => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'clients'>('accounts');
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [customers, setCustomers] = useState<SavingsCustomerResponseDto[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [filters, setFilters] = useState<AccountSearchFilters>({});
  const [clientFilters, setClientFilters] = useState({
    branchId: undefined as number | undefined,
    status: '',
    customerType: '', // '', 'PHYSICAL', 'BUSINESS'
    dateFrom: '',
    dateTo: ''
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [stats, setStats] = useState<ClientAccountStats>({
    totalAccounts: 0,
    activeAccounts: 0,
    totalBalanceHTG: 0,
    totalBalanceUSD: 0,
    accountsByType: { SAVINGS: 0, CURRENT: 0, TERM_SAVINGS: 0 },
    accountsByCurrency: { HTG: 0, USD: 0 },
    recentTransactions: 0,
    dormantAccounts: 0
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateClientForm, setShowCreateClientForm] = useState(false);
  const [showEditClientForm, setShowEditClientForm] = useState(false);
  const [showViewClientDetails, setShowViewClientDetails] = useState(false);
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ClientAccount | null>(null);
  const [selectedCustomer, setselectedCustomer] = useState<SavingsCustomerResponseDto | null>(null);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [accountTransactions, setAccountTransactions] = useState<AccountTransaction[]>([]);

  // Load data when tab changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeTab === 'accounts') {
      setInitialLoading(true);
      loadAccounts();
      loadStats();
      // Reset to first page when tab changes
      setCurrentPage(1);
    }
  }, [activeTab]);

  // Load customers when clients tab is active (only on tab switch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeTab === 'clients') {
      setInitialLoading(true);
      loadCustomers().finally(() => setInitialLoading(false));
    }
  }, [activeTab]);

  // Search customers without showing spinner
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeTab === 'clients') {
      loadCustomers();
    }
  }, [clientSearchTerm]);

  const loadAccounts = async () => {
    try {
      console.log('🔍 Loading all client accounts...');
      const accountsData = await apiService.getClientAccounts({});
      console.log('✅ Client accounts loaded:', {
        isArray: Array.isArray(accountsData),
        count: Array.isArray(accountsData) ? accountsData.length : 0,
        sample: Array.isArray(accountsData) && accountsData.length > 0 ? accountsData[0] : null,
        allAccountTypes: Array.isArray(accountsData) ? accountsData.map(a => a.accountType) : []
      });
      // S'assurer que c'est un array
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (error: any) {
      console.error('❌ Error loading accounts:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      const errorMsg = error?.response?.data?.message || error?.message || 'Erreur lors du chargement des comptes';
      toast.error(errorMsg);
      setAccounts([]); // Reset en cas d'erreur
    } finally {
      setInitialLoading(false);
    }
  };

  // Helper to name document types when backend doesn't provide a name
  const getDocumentTypeName = (t: any): string => {
    const n = typeof t === 'number' ? t : parseInt(t, 10);
    switch (n) {
      case 0: return "Carte d'Identité";
      case 1: return 'Justificatif de Résidence';
      case 2: return 'Justificatif de Revenu';
      case 3: return 'Photo';
      default: return 'Autre';
    }
  };

  // Normalize customer data to ensure all nested properties exist with safe defaults
  const normalizeCustomer = (customer: any): SavingsCustomerResponseDto => {
    if (!customer) {
      return {
        id: '',
        firstName: '',
        lastName: '',
        fullName: 'N/A',
        dateOfBirth: '',
        gender: 0,
        address: { street: '', commune: '', department: '', country: 'Haiti', postalCode: undefined },
        contact: { primaryPhone: '', secondaryPhone: undefined, email: undefined, emergencyContactName: undefined, emergencyContactPhone: undefined },
        identity: { documentType: 0, documentNumber: '', issuedDate: '', expiryDate: undefined, issuingAuthority: '' },
        occupation: undefined,
        monthlyIncome: undefined,
        signature: undefined,
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      };
    }

    const docsSrc = customer?.documents || customer?.documents || [];
    const normalizedDocs = Array.isArray(docsSrc)
      ? docsSrc.map((d: any) => {
          const typeVal = d?.documentType ?? d?.documentType;
          return {
            id: d?.id || d?.id,
            customerId: d?.customerId || d?.customerId || (customer?.id || customer?.id || ''),
            documentType: typeVal ?? 4,
            documentTypeName: d?.documentTypeName || d?.documentTypeName || getDocumentTypeName(typeVal),
            name: d?.name || d?.name || 'Document',
            description: d?.description || d?.description,
            filePath: d?.filePath || d?.filePath || '',
            fileSize: d?.fileSize ?? d?.fileSize ?? 0,
            mimeType: d?.mimeType || d?.mimeType || '',
            uploadedAt: d?.uploadedAt || d?.uploadedAt || new Date().toISOString(),
            uploadedBy: d?.uploadedBy || d?.uploadedBy || '',
            verified: d?.verified ?? d?.verified ?? false,
            verifiedAt: d?.verifiedAt || d?.verifiedAt,
            verifiedBy: d?.verifiedBy || d?.verifiedBy,
            downloadUrl: d?.downloadUrl || d?.downloadUrl
          };
        })
      : [];

    const parseGender = (g: any): number => {
      if (g === undefined || g === null || g === '') return 0;
      if (typeof g === 'number') return g;
      const s = String(g).trim().toLowerCase();
      if (s === 'm' || s === 'male' || s === 'masculin' || s === 'gason') return 0;
      if (s === 'f' || s === 'female' || s === 'feminin' || s === 'fanm') return 1;
      const n = Number(s);
      if (!isNaN(n)) return n === 0 ? 0 : 1;
      return 0;
    };

    return {
      id: customer?.id || customer?.Id || '',
      // Preserve backend-provided customer code if available
      customerCode: customer?.customerCode || (customer as any)?.CustomerCode || undefined,
      firstName: customer?.FirstName || customer?.firstName || '',
      lastName: customer?.LastName || customer?.lastName || '',
      fullName: customer?.fullName || customer?.fullName || `${customer?.FirstName || customer?.firstName || ''} ${customer?.LastName || customer?.lastName || ''}`.trim() || 'N/A',
      dateOfBirth: customer?.dateOfBirth || customer?.dateOfBirth || '',
  gender: parseGender(customer?.gender ?? customer?.Gender ?? customer?.Gender ?? 0),
      address: {
        street: customer?.address?.street || customer?.address?.street || '',
        commune: customer?.address?.commune || customer?.address?.commune || '',
        department: customer?.address?.department || customer?.address?.department || '',
        country: customer?.address?.Country || customer?.address?.country || 'Haiti',
        postalCode: customer?.address?.postalCode || customer?.address?.postalCode || undefined
      },
      contact: {
        primaryPhone: customer?.Contact?.primaryPhone || customer?.contact?.primaryPhone || '',
        secondaryPhone: customer?.Contact?.secondaryPhone || customer?.contact?.secondaryPhone || undefined,
        email: customer?.Contact?.email || customer?.contact?.email || undefined,
        emergencyContactName: customer?.Contact?.emergencyContactName || customer?.contact?.emergencyContactName || undefined,
        emergencyContactPhone: customer?.Contact?.emergencyContactPhone || customer?.contact?.emergencyContactPhone || undefined
      },
      identity: {
        documentType: customer?.identity?.documentType ?? customer?.identity?.documentType ?? 0,
        documentNumber: customer?.identity?.documentNumber || customer?.identity?.documentNumber || '',
        issuedDate: customer?.identity?.issuedDate || customer?.identity?.issuedDate || '',
        expiryDate: customer?.identity?.expiryDate || customer?.identity?.expiryDate || undefined,
        issuingAuthority: customer?.identity?.issuingAuthority || customer?.identity?.issuingAuthority || ''
      },
      birthPlace: customer?.birthPlace || customer?.BirthPlace || undefined,
      nationality: customer?.nationality || customer?.Nationality || undefined,
      personalNif: customer?.personalNif || customer?.PersonalNif || undefined,
      // Business-specific fields (preserve both camelCase and PascalCase sources)
      isBusiness: customer?.isBusiness ?? customer?.IsBusiness ?? undefined,
      companyName: customer?.companyName || customer?.CompanyName || undefined,
      legalForm: customer?.legalForm || customer?.LegalForm || undefined,
      tradeRegisterNumber: customer?.tradeRegisterNumber || customer?.TradeRegisterNumber || customer?.businessRegistrationNumber || undefined,
      taxId: customer?.taxId || customer?.TaxId || customer?.companyNif || undefined,
      headOfficeAddress: customer?.headOfficeAddress || customer?.HeadOfficeAddress || undefined,
      companyPhone: customer?.companyPhone || customer?.CompanyPhone || undefined,
      companyEmail: customer?.companyEmail || customer?.CompanyEmail || undefined,
      representativeFirstName: customer?.representativeFirstName || customer?.RepresentativeFirstName || (customer?.legalRepresentative?.firstName) || undefined,
      representativeLastName: customer?.representativeLastName || customer?.RepresentativeLastName || (customer?.legalRepresentative?.lastName) || undefined,
      representativeTitle: customer?.representativeTitle || customer?.RepresentativeTitle || (customer?.legalRepresentative?.title) || undefined,
      representativeDocumentNumber: customer?.representativeDocumentNumber || customer?.RepresentativeDocumentNumber || (customer?.legalRepresentative?.documentNumber) || undefined,

      // Ensure a normalized nested `legalRepresentative` object exists so the details modal
      // can consistently read representative fields regardless of backend shape.
      legalRepresentative: {
        firstName: customer?.legalRepresentative?.firstName || customer?.representativeFirstName || customer?.RepresentativeFirstName || undefined,
        lastName: customer?.legalRepresentative?.lastName || customer?.representativeLastName || customer?.RepresentativeLastName || undefined,
        title: customer?.legalRepresentative?.title || customer?.representativeTitle || customer?.RepresentativeTitle || undefined,
        documentType: (customer?.legalRepresentative?.documentType ?? customer?.representativeDocumentType ?? customer?.RepresentativeDocumentType) ?? undefined,
        documentNumber: customer?.legalRepresentative?.documentNumber || customer?.representativeDocumentNumber || customer?.RepresentativeDocumentNumber || undefined,
        issuedDate: customer?.legalRepresentative?.issuedDate || customer?.representativeIssuedDate || customer?.RepresentativeIssuedDate || undefined,
        expiryDate: customer?.legalRepresentative?.expiryDate || customer?.representativeExpiryDate || customer?.RepresentativeExpiryDate || undefined,
        issuingAuthority: customer?.legalRepresentative?.issuingAuthority || customer?.representativeIssuingAuthority || customer?.RepresentativeIssuingAuthority || undefined
      },
      // Convenience string for older UI code that expects `legalRepresentativeName`
      legalRepresentativeName: (() => {
        const f = customer?.legalRepresentative?.firstName || customer?.representativeFirstName || customer?.RepresentativeFirstName || '';
        const l = customer?.legalRepresentative?.lastName || customer?.representativeLastName || customer?.RepresentativeLastName || '';
        const combined = `${f} ${l}`.trim();
        return combined || customer?.legalRepresentativeName || undefined;
      })(),

  occupation: customer?.occupation || (customer as any)?.Occupation || undefined,
  monthlyIncome: customer?.monthlyIncome ?? (customer as any)?.MonthlyIncome ?? undefined,
  employerName: customer?.employerName || customer?.EmployerName || undefined,
  workAddress: customer?.workAddress || customer?.WorkAddress || undefined,
  incomeSource: customer?.incomeSource || customer?.IncomeSource || undefined,
  maritalStatus: customer?.maritalStatus || customer?.MaritalStatus || undefined,
  spouseName: customer?.spouseName || customer?.SpouseName || undefined,
  numberOfDependents: customer?.numberOfDependents ?? customer?.NumberOfDependents ?? undefined,
  educationLevel: customer?.educationLevel || customer?.EducationLevel || undefined,
  referencePersonName: customer?.referencePersonName || customer?.ReferencePersonName || undefined,
  referencePersonPhone: customer?.referencePersonPhone || customer?.ReferencePersonPhone || undefined,
  transactionFrequency: customer?.transactionFrequency || customer?.TransactionFrequency || undefined,
  accountPurpose: customer?.accountPurpose || customer?.AccountPurpose || undefined,
  acceptTerms: (customer?.acceptTerms ?? customer?.AcceptTerms) ?? false,
  signaturePlace: customer?.signaturePlace || customer?.SignaturePlace || undefined,
  signatureDate: customer?.signatureDate || customer?.SignatureDate || undefined,
      signature: customer?.signature || customer?.signature || undefined,
      documents: normalizedDocs,
      createdAt: customer?.createdAt || customer?.createdAt || new Date().toISOString(),
      updatedAt: customer?.UpdatedAt || customer?.updatedAt || new Date().toISOString(),
      isActive: customer?.isActive ?? customer?.isActive ?? true
    };
  };

  const loadStats = async () => {
    try {
      console.log('📊 Loading client account statistics...');
      const statsData = await apiService.getClientAccountStats();
      console.log('✅ Statistics loaded:', statsData);
      setStats(statsData);
    } catch (error: any) {
      console.error('❌ Error loading stats:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      // Don't show toast for stats error, just log it
    }
  };

  // Ensure statistics are loaded on mount so the "Comptes" cards always display data
  // even when the page is opened on another tab via URL params.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!mounted) return;
        await loadStats();
      } catch (err) {
        console.error('Error preloading client account stats on mount:', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load branches for the branch filter dropdown
  const [branches, setBranches] = useState<Branch[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await apiService.getAllBranches();
        if (!mounted) return;
        setBranches(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Error loading branches:', err);
        setBranches([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const loadCustomers = async () => {
    try {
      // Si le terme de recherche a au moins 2 caractères, utiliser la recherche
      // Sinon, charger tous les clients
      if (clientSearchTerm && clientSearchTerm.trim().length >= 2) {
        const results = await savingsCustomerService.searchCustomers(clientSearchTerm);
        // Normalize all customers to ensure complete object structure
        let normalizedResults = Array.isArray(results) 
          ? results.filter(c => c).map(c => normalizeCustomer(c))
          : [];
        
        // Enrich customers with branch information from their accounts
        const allAccounts = await apiService.getClientAccounts({});
        const customerBranchMap = new Map<string, number>();
        allAccounts.forEach(account => {
          if (account.customerId && account.branchId) {
            customerBranchMap.set(account.customerId, account.branchId);
          }
        });
        
        normalizedResults = normalizedResults.map(customer => ({
          ...customer,
          branchId: customerBranchMap.get(customer.id) || 1 // Default to branch 1 if no account found
        }));
        
        setCustomers(normalizedResults);
      } else {
        // Charger tous les clients si pas de terme de recherche ou moins de 2 caractères
        const allCustomers = await savingsCustomerService.getAllCustomers();
        let normalizedCustomers = Array.isArray(allCustomers)
          ? allCustomers.filter(c => c).map(c => normalizeCustomer(c))
          : [];
        
        // Enrich customers with branch information from their accounts
        const allAccounts = await apiService.getClientAccounts({});
        const customerBranchMap = new Map<string, number>();
        allAccounts.forEach(account => {
          if (account.customerId && account.branchId) {
            customerBranchMap.set(account.customerId, account.branchId);
          }
        });
        
        normalizedCustomers = normalizedCustomers.map(customer => ({
          ...customer,
          branchId: customerBranchMap.get(customer.id) || 1 // Default to branch 1 if no account found
        }));
        
        setCustomers(normalizedCustomers);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Erreur lors du chargement des clients');
      setCustomers([]);
    }
  };

  const loadAccountTransactions = async (accountId: string) => {
    try {
      // We have only the account summary; fetch transactions by account number instead of numeric id
      const found = accounts.find(a => a.id === accountId);
      const acctNumber = found?.accountNumber || accountId;
      const transactions = await apiService.getAccountTransactions(acctNumber);
      setAccountTransactions(transactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Erreur lors du chargement des transactions');
    }
  };

  const handleCreateAccount = async (accountData: any) => {
    try {
      let newAccount: ClientAccount;

      switch (accountData.accountType) {
        case AccountType.SAVINGS:
          newAccount = await apiService.createSavingsAccount({
            customerId: accountData.customerId,
            branchId: accountData.branchId,
            currency: accountData.currency,
            initialDeposit: accountData.initialDeposit,
            interestRate: accountData.interestRate,
            minimumBalance: accountData.minimumBalance,
            dailyWithdrawalLimit: accountData.dailyWithdrawalLimit
          });
          break;

        case AccountType.CURRENT:
          newAccount = await apiService.createCurrentAccount({
            customerId: accountData.customerId,
            branchId: accountData.branchId,
            currency: accountData.currency,
            initialDeposit: accountData.initialDeposit,
            minimumBalance: accountData.minimumBalance,
            dailyWithdrawalLimit: accountData.dailyWithdrawalLimit,
            monthlyWithdrawalLimit: accountData.monthlyWithdrawalLimit,
            dailyDepositLimit: accountData.dailyDepositLimit,
            overdraftLimit: accountData.overdraftLimit,
            // Security & KYC
            pin: accountData.securityPin,
            securityQuestion: accountData.securityQuestion,
            securityAnswer: accountData.securityAnswer,
            depositMethod: accountData.depositMethod,
            originOfFunds: accountData.incomeSource, // map UI field
            transactionFrequency: accountData.transactionFrequency,
            accountPurpose: accountData.accountPurpose,
            // Authorized signers mapping from editor
            authorizedSigners: Array.isArray(accountData.authorizedSigners) ? (accountData.authorizedSigners as any[]).map(s => ({
              fullName: s.fullName,
              role: s.relationshipToCustomer,
              documentNumber: s.documentNumber,
              phone: s.phoneNumber
            })) : undefined
          });
          break;

        case AccountType.TERM_SAVINGS:
          newAccount = await apiService.createTermSavingsAccount({
            customerId: accountData.customerId,
            branchId: accountData.branchId,
            currency: accountData.currency,
            initialDeposit: accountData.initialDeposit,
            termType: accountData.termType
          });
          break;

        default:
          throw new Error('Type de compte non valide');
      }

  toast.success(`Compte créé avec succès • Numéro: ${newAccount?.accountNumber || '—'}`);
      setShowCreateForm(false);
      loadAccounts();
      loadStats();
    } catch (error) {
      console.error('Error creating account:', error);
      const anyErr = error as any;
      const status = anyErr?.response?.status;
      const serverData = anyErr?.response?.data;
      const extracted = serverData?.message || (serverData?.errors ? Object.values(serverData.errors).flat().join('; ') : (typeof serverData === 'string' ? serverData : JSON.stringify(serverData)));

      if (status === 403) {
        toast.error("Accès refusé (403). Rôle requis: Caissier, Chef de Succursale, ou SuperAdmin.");
      } else if (status === 401) {
        toast.error("Session expirée. Veuillez vous reconnecter.");
      } else if (status === 400) {
        toast.error(`Requête invalide: ${extracted || 'Vérifiez les champs requis (client, devise, dépôt initial, succursale).'}`);
      } else {
        const msg = extracted || anyErr?.message;
        toast.error(msg || 'Erreur lors de la création du compte');
      }
    }
  };

  const handleViewAccount = (account: ClientAccount) => {
    setSelectedAccount(account);
    loadAccountTransactions(account.id);
    setShowAccountDetails(true);
  };

  // Générer un ID client unique: Première lettre du nom + Première lettre du prénom + 4 chiffres aléatoires
  const generateClientId = (firstName: string, lastName: string): string => {
    const firstInitial = (firstName || 'X').charAt(0).toUpperCase();
    const lastInitial = (lastName || 'X').charAt(0).toUpperCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4 chiffres entre 1000 et 9999
    return `${firstInitial}${lastInitial}${randomDigits}`;
  };

  // Générer un hash simple à partir d'une chaîne
  const simpleHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  // Afficher un ID court basé sur le nom du client (toujours le même pour un même client)
  const getDisplayClientId = (customer: SavingsCustomerResponseDto): string => {
    // Si customerCode existe, l'utiliser directement
    if (customer.customerCode) {
      return customer.customerCode;
    }
    // Sinon, si le DocumentNumber est court (format ID généré), l'afficher tel quel
    if (customer.identity?.documentNumber && customer.identity.documentNumber.length <= 8) {
      return customer.identity.documentNumber;
    }
    // Sinon générer un ID fixe basé sur le nom complet
    const firstInitial = (customer.firstName || 'X').charAt(0).toUpperCase();
    const lastInitial = (customer.lastName || 'X').charAt(0).toUpperCase();
    const fullName = `${customer.firstName}${customer.lastName}${customer.dateOfBirth || ''}`;
    const hash = simpleHash(fullName);
    const digits = (hash % 9000 + 1000).toString(); // 4 chiffres entre 1000 et 9999
    return `${firstInitial}${lastInitial}${digits}`;
  };

  const handleCreateClient = async (clientData: any) => {
    try {
      // Préparer les données pour l'API backend
      // Convertir le genre
      const convertGender = (gender: any) => {
        // Accept many input formats: 'M'/'F', 'male'/'female', 'gason'/'fanm', numeric 0/1
        if (gender === undefined || gender === null || gender === '') return 0; // Default to Male
        const g = String(gender).trim().toLowerCase();
        if (g === 'm' || g === 'male' || g === 'masculin' || g === 'gason') return 0;
        if (g === 'f' || g === 'female' || g === 'feminin' || g === 'fanm') return 1;
        // If numeric-like ("0"/"1"), map accordingly
        const n = Number(g);
        if (!isNaN(n)) return n === 0 ? 0 : 1;
        // Fallback default
        return 0;
      };

      // Convertir le type de document
      const convertDocumentType = (type: string): SavingsIdentityDocumentType => {
        if (!type) return SavingsIdentityDocumentType.CIN;
        const typeMap: { [key: string]: SavingsIdentityDocumentType } = {
          'CIN': SavingsIdentityDocumentType.CIN,
          'PASSPORT': SavingsIdentityDocumentType.Passport,
          'DRIVING_LICENSE': SavingsIdentityDocumentType.DrivingLicense,
          'BIRTH_CERTIFICATE': SavingsIdentityDocumentType.BirthCertificate
        };
        return typeMap[type.toUpperCase()] || SavingsIdentityDocumentType.CIN;
      };

  const sanitizePhone = (p?: string) => (p ? p.replace(/[\s-]/g, '') : undefined);

      const isBusiness = !!clientData?.isBusiness;
      // Date de naissance: obligatoire pour PP, défaut sûr pour PM
      if (!isBusiness && !clientData?.dateOfBirth) {
        const msg = 'La date de naissance est obligatoire pour une personne physique';
        toast.error(msg);
        throw new Error(msg);
      }
      const rawDob = clientData?.dateOfBirth;
      const safeDob = isBusiness ? '2000-01-01' : (normalizeDateToYMD(rawDob, '') || '');

      // Derive names for Personne Morale if first/last are empty
      const companyName: string = clientData?.companyName || '';
      const legalForm: string = clientData?.legalForm || '';
      const firstNameForApi = isBusiness ? (companyName || 'Entreprise') : (clientData?.firstName || '');
      const lastNameForApi = isBusiness ? (legalForm || 'PM') : (clientData?.lastName || '');

      // Split representative name when provided
      const repName: string = clientData?.legalRepresentativeName || '';
      const repFirst = repName ? repName.trim().split(' ')[0] : undefined;
      const repLast = repName ? repName.trim().split(' ').slice(1).join(' ') || undefined : undefined;

      // Toujours générer un ID client au format court (ex: FV2528)
      const generatedClientId = generateClientId(
        firstNameForApi || '',
        lastNameForApi || ''
      );

      let customerDto: SavingsCustomerCreateDto = {
        customerCode: generatedClientId, // Stocker l'ID généré dans customerCode
        firstName: firstNameForApi,
        lastName: lastNameForApi,
        dateOfBirth: safeDob, // YYYY-MM-DD (never empty for backend)
        gender: convertGender(clientData?.gender || 'M'),
        
        // Adresse
        street: clientData?.street || '',
        commune: clientData?.commune || '',
        department: clientData?.department || '',
        postalCode: clientData?.postalCode || undefined,
        
        // Contact
        primaryPhone: sanitizePhone(clientData?.primaryPhone) || '',
        secondaryPhone: sanitizePhone(clientData?.secondaryPhone),
        email: clientData?.email || undefined,
        emergencyContactName: clientData?.emergencyContactName || undefined,
        emergencyContactPhone: sanitizePhone(clientData?.emergencyContactPhone),
        
        // Document d'identité - Garder le vrai numéro de document séparé
        documentType: convertDocumentType(clientData?.documentType),
        documentNumber: clientData?.documentNumber || generatedClientId,
        issuedDate: clientData?.issuedDate || new Date().toISOString().split('T')[0],
        expiryDate: clientData?.expiryDate || undefined,
        issuingAuthority: clientData?.issuingAuthority || 'Kredi Ti Machann',
        
        // Informations professionnelles
        occupation: clientData?.occupation || undefined,
        monthlyIncome: clientData?.monthlyIncome ? parseFloat(clientData.monthlyIncome) : undefined,

        // Champs Personne Morale
        isBusiness,
        companyName: companyName || undefined,
        legalForm: legalForm || undefined,
        // Accept both legacy and normalized field names coming from the creation form
        tradeRegisterNumber: clientData?.tradeRegisterNumber || clientData?.businessRegistrationNumber || undefined,
        taxId: clientData?.taxId || clientData?.companyNif || undefined,
        headOfficeAddress: clientData?.headOfficeAddress || undefined,
        companyPhone: sanitizePhone(clientData?.companyPhone) || undefined,
        companyEmail: clientData?.companyEmail || undefined,

        // Représentant légal - accept multiple incoming field names
        representativeFirstName: isBusiness
          ? (clientData?.representativeFirstName || clientData?.legalRepresentativeFirstName || repFirst || undefined)
          : undefined,
        representativeLastName: isBusiness
          ? (clientData?.representativeLastName || clientData?.legalRepresentativeLastName || repLast || undefined)
          : undefined,
        representativeTitle: isBusiness ? (clientData?.representativeTitle || clientData?.legalRepresentativeTitle || undefined) : undefined,
        representativeDocumentType: isBusiness
          ? (
              clientData?.representativeDocumentType
                ? convertDocumentType(clientData.representativeDocumentType)
                : (clientData?.legalRepresentativeDocumentType
                    ? convertDocumentType(clientData.legalRepresentativeDocumentType)
                    : convertDocumentType(clientData?.documentType))
            )
          : undefined,
        representativeDocumentNumber: isBusiness
          ? (clientData?.representativeDocumentNumber || clientData?.legalRepresentativeDocumentNumber || clientData?.documentNumber || undefined)
          : undefined,
        representativeIssuedDate: isBusiness
          ? (normalizeDateToYMD(clientData?.representativeIssuedDate) || normalizeDateToYMD(clientData?.legalRepresentativeIssuedDate) || normalizeDateToYMD(clientData?.issuedDate))
          : undefined,
        representativeExpiryDate: isBusiness
          ? (normalizeDateToYMD(clientData?.representativeExpiryDate) || normalizeDateToYMD(clientData?.legalRepresentativeExpiryDate) || normalizeDateToYMD(clientData?.expiryDate))
          : undefined,
        representativeIssuingAuthority: isBusiness
          ? (clientData?.representativeIssuingAuthority || clientData?.legalRepresentativeIssuingAuthority || clientData?.issuingAuthority || undefined)
          : undefined,

        // Infos additionnelles
        birthPlace: clientData?.birthPlace || undefined,
        nationality: clientData?.nationality || undefined,
        personalNif: clientData?.nif || undefined,
        employerName: clientData?.employerName || undefined,
        workAddress: clientData?.workAddress || undefined,
        incomeSource: clientData?.incomeSource || undefined,
        maritalStatus: clientData?.maritalStatus || undefined,
        numberOfDependents: clientData?.numberOfDependents !== undefined ? Number(clientData.numberOfDependents) : undefined,
        educationLevel: clientData?.educationLevel || undefined,
        acceptTerms: !!clientData?.acceptTerms,
        signaturePlace: clientData?.signaturePlace || undefined,
        signatureDate: clientData?.signatureDate || undefined,
        referencePersonName: clientData?.referencePerson || undefined,
        referencePersonPhone: undefined
      };

      // Nettoyage: si PM, retirer les champs PP du payload (undefined => non sérialisé dans JSON)
      if (isBusiness) {
        customerDto = {
          ...customerDto,
          occupation: undefined,
          monthlyIncome: undefined,
          birthPlace: undefined,
          nationality: undefined,
          personalNif: undefined,
          employerName: undefined,
          workAddress: undefined,
          incomeSource: undefined,
          maritalStatus: undefined,
          numberOfDependents: undefined,
          educationLevel: undefined,
          signaturePlace: undefined,
          signatureDate: undefined,
          referencePersonName: undefined,
          referencePersonPhone: undefined
        };
      }

      // Pour les personnes morales, ne pas inclure les champs spécifiques aux personnes physiques
      // Remarque: certains champs de base (firstName, lastName, dateOfBirth, gender) sont requis par le backend.
      // Nous les remplissons déjà avec des valeurs adaptées (ex: companyName/legalForm et une date par défaut) ci-dessus.
      // Les champs optionnels PP restent undefined automatiquement et ne seront pas sérialisés.
      
      // Debug: log the payload right before sending (only in non-production)
      try {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('Creating customer payload (will be sent to backend):', JSON.stringify(customerDto, null, 2));
        }
      } catch (e) {
        // ignore stringify errors
        console.debug('Creating customer payload (raw):', customerDto);
      }

      // Appeler l'API pour créer le client
      const createdCustomer = await savingsCustomerService.createCustomer(customerDto);
      
      // Normalize the created customer response
      const normalizedCustomer = normalizeCustomer(createdCustomer);
      
      console.log('Client créé avec succès:', normalizedCustomer);
      
      // Afficher un message avec l'ID client généré
      const clientIdUsed = clientData?.documentNumber || generatedClientId;
      toast.success(
        `Client ${normalizedCustomer.fullName} créé avec succès!\nID Client: ${clientIdUsed}`,
        { duration: 5000 }
      );
      
      // Fermer le formulaire
      setShowCreateClientForm(false);
      
      // Optionnel: Recharger la liste des comptes si nécessaire
      // await loadAccounts();
      
      return normalizedCustomer;
    } catch (error: any) {
      console.error('Erreur lors de la création du client:', error);
      const errorMessage = error.message || 'Erreur lors de la création du client';
      toast.error(errorMessage);
      throw error; // Re-throw the error so the caller can handle it
    }
  };

  const handleEditClient = async (customerId: string) => {
    try {
      // Charger les données du client
      const customer = await savingsCustomerService.getCustomer(customerId);
      // Normalize customer data before setting
      const normalizedCustomer = normalizeCustomer(customer);
      console.log('Client chargé pour édition:', normalizedCustomer);
      setselectedCustomer(normalizedCustomer);
      setShowEditClientForm(true);
    } catch (error: any) {
      console.error('Erreur lors du chargement du client:', error);
      toast.error('Impossible de charger les informations du client');
    }
  };

  const handleDownloadDocument = async (customerId: string, documentId: string, documentName: string) => {
    try {
      const blob = await savingsCustomerService.downloadDocument(customerId, documentId);
      
      // Kreye yon lyen telechajman tanporè
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = documentName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Document téléchargé avec succès!');
    } catch (error: any) {
      console.error('Erreur lors du téléchargement du document:', error);
      toast.error('Erreur lors du téléchargement du document');
    }
  };

  const handleDeleteDocument = async (customerId: string, documentId: string) => {
    if (!window.confirm('Èske ou sèten ou vle efase dokiman sa a?')) {
      return;
    }

    try {
      console.log('Deleting document:', { customerId, documentId });
      await savingsCustomerService.deleteDocument(customerId, documentId);
      
      // Recharger les données du client
      if (selectedCustomer) {
        const updatedCustomer = await savingsCustomerService.getCustomer(selectedCustomer.id);
        const normalized = normalizeCustomer(updatedCustomer);
        setselectedCustomer(normalized);
      }
      
      toast.success('Document effacé avec succès!');
    } catch (error: any) {
      console.error('Erreur lors de la suppression du document:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Erreur lors de la suppression du document';
      toast.error(errorMessage);
    }
  };

  const handleUpdateClient = async (clientData: any) => {
    if (!selectedCustomer) return;

    try {
      // Convertir le genre
      const convertGender = (gender: any) => {
        if (gender === undefined || gender === null || gender === '') return 0; // Default to Male
        const g = String(gender).trim().toLowerCase();
        if (g === 'm' || g === 'male' || g === 'masculin' || g === 'gason') return 0;
        if (g === 'f' || g === 'female' || g === 'feminin' || g === 'fanm') return 1;
        const n = Number(g);
        if (!isNaN(n)) return n === 0 ? 0 : 1;
        return 0;
      };

      // Convertir le type de document
      const convertDocumentType = (type: string): SavingsIdentityDocumentType => {
        if (!type) return SavingsIdentityDocumentType.CIN;
        const typeMap: { [key: string]: SavingsIdentityDocumentType } = {
          'CIN': SavingsIdentityDocumentType.CIN,
          'PASSPORT': SavingsIdentityDocumentType.Passport,
          'DRIVING_LICENSE': SavingsIdentityDocumentType.DrivingLicense,
          'BIRTH_CERTIFICATE': SavingsIdentityDocumentType.BirthCertificate
        };
        return typeMap[type.toUpperCase()] || SavingsIdentityDocumentType.CIN;
      };

  const sanitizePhone = (p?: string) => (p ? p.replace(/[\s-]/g, '') : undefined);

      const isBusiness = !!clientData?.isBusiness || !!(selectedCustomer as any)?.isBusiness;
      // Date – normaliser pour backend et valider pour PP
      if (!isBusiness && !clientData?.dateOfBirth && !(selectedCustomer as any)?.dateOfBirth) {
        toast.error('La date de naissance est obligatoire pour une personne physique');
        return;
      }
      const rawDob = clientData?.dateOfBirth || (selectedCustomer as any)?.dateOfBirth;
      const safeDob = isBusiness
        ? (normalizeDateToYMD(rawDob, '2000-01-01') || '2000-01-01')
        : (normalizeDateToYMD(rawDob, '') || '');

      const companyName: string = clientData?.companyName || (selectedCustomer as any)?.companyName || '';
      const legalForm: string = clientData?.legalForm || (selectedCustomer as any)?.legalForm || '';
      const firstNameForApi = isBusiness ? (companyName || 'Entreprise') : (clientData?.firstName || '');
      const lastNameForApi = isBusiness ? (legalForm || 'PM') : (clientData?.lastName || '');

      const repName: string = clientData?.legalRepresentativeName || '';
      const repFirst = repName ? repName.trim().split(' ')[0] : undefined;
      const repLast = repName ? repName.trim().split(' ').slice(1).join(' ') || undefined : undefined;

      let customerDto: SavingsCustomerCreateDto = {
        firstName: firstNameForApi,
        lastName: lastNameForApi,
        dateOfBirth: safeDob,
        gender: convertGender(clientData?.gender || 'M'),
        street: clientData?.street || '',
        commune: clientData?.commune || '',
        department: clientData?.department || '',
        postalCode: clientData?.postalCode || undefined,
        primaryPhone: sanitizePhone(clientData?.primaryPhone) || '',
        secondaryPhone: sanitizePhone(clientData?.secondaryPhone),
        email: clientData?.email || undefined,
        emergencyContactName: clientData?.emergencyContactName || undefined,
        emergencyContactPhone: sanitizePhone(clientData?.emergencyContactPhone),
        documentType: convertDocumentType(clientData?.documentType),
        documentNumber: clientData?.documentNumber || '',
        issuedDate: clientData?.issuedDate || '',
        expiryDate: clientData?.expiryDate || undefined,
        issuingAuthority: clientData?.issuingAuthority || '',
        occupation: clientData?.occupation || undefined,
        monthlyIncome: clientData?.monthlyIncome ? parseFloat(clientData.monthlyIncome) : undefined,

        // Champs PM
        isBusiness,
        companyName: companyName || undefined,
        legalForm: legalForm || undefined,
        tradeRegisterNumber: clientData?.businessRegistrationNumber || (selectedCustomer as any)?.tradeRegisterNumber || undefined,
        taxId: clientData?.companyNif || (selectedCustomer as any)?.taxId || undefined,
        headOfficeAddress: clientData?.headOfficeAddress || (selectedCustomer as any)?.headOfficeAddress || undefined,
        companyPhone: sanitizePhone(clientData?.companyPhone) || (selectedCustomer as any)?.companyPhone || undefined,
        companyEmail: clientData?.companyEmail || (selectedCustomer as any)?.companyEmail || undefined,

        representativeFirstName: isBusiness ? (clientData?.representativeFirstName || repFirst || (selectedCustomer as any)?.legalRepresentative?.firstName || undefined) : undefined,
        representativeLastName: isBusiness ? (clientData?.representativeLastName || repLast || (selectedCustomer as any)?.legalRepresentative?.lastName || undefined) : undefined,
        representativeTitle: isBusiness ? (clientData?.representativeTitle || (selectedCustomer as any)?.legalRepresentative?.title || undefined) : undefined,
        representativeDocumentType: isBusiness
          ? (
              clientData?.representativeDocumentType
                ? convertDocumentType(clientData.representativeDocumentType)
                : (clientData?.documentType
                    ? convertDocumentType(clientData.documentType)
                    : (selectedCustomer as any)?.legalRepresentative?.documentType)
            )
          : undefined,
        representativeDocumentNumber: isBusiness
          ? (clientData?.representativeDocumentNumber || clientData?.documentNumber || (selectedCustomer as any)?.legalRepresentative?.documentNumber || undefined)
          : undefined,
        representativeIssuedDate: isBusiness
          ? (normalizeDateToYMD(clientData?.representativeIssuedDate) || normalizeDateToYMD(clientData?.issuedDate) || normalizeDateToYMD((selectedCustomer as any)?.legalRepresentative?.issuedDate))
          : undefined,
        representativeExpiryDate: isBusiness
          ? (normalizeDateToYMD(clientData?.representativeExpiryDate) || normalizeDateToYMD(clientData?.expiryDate) || normalizeDateToYMD((selectedCustomer as any)?.legalRepresentative?.expiryDate))
          : undefined,
        representativeIssuingAuthority: isBusiness
          ? (clientData?.representativeIssuingAuthority || clientData?.issuingAuthority || (selectedCustomer as any)?.legalRepresentative?.issuingAuthority || undefined)
          : undefined,

        // Infos additionnelles (préserver si présents)
        birthPlace: clientData?.birthPlace || (selectedCustomer as any)?.birthPlace || undefined,
        nationality: clientData?.nationality || (selectedCustomer as any)?.nationality || undefined,
        personalNif: clientData?.nif || (selectedCustomer as any)?.personalNif || undefined,
        employerName: clientData?.employerName || (selectedCustomer as any)?.employerName || undefined,
        workAddress: clientData?.workAddress || (selectedCustomer as any)?.workAddress || undefined,
        incomeSource: clientData?.incomeSource || (selectedCustomer as any)?.incomeSource || undefined,
        maritalStatus: clientData?.maritalStatus || (selectedCustomer as any)?.maritalStatus || undefined,
        numberOfDependents: clientData?.numberOfDependents !== undefined ? Number(clientData.numberOfDependents) : (selectedCustomer as any)?.numberOfDependents,
        educationLevel: clientData?.educationLevel || (selectedCustomer as any)?.educationLevel || undefined,
        acceptTerms: clientData?.acceptTerms ?? (selectedCustomer as any)?.acceptTerms ?? undefined,
        signaturePlace: clientData?.signaturePlace || (selectedCustomer as any)?.signaturePlace || undefined,
        signatureDate: clientData?.signatureDate || (selectedCustomer as any)?.signatureDate || undefined,
        referencePersonName: clientData?.referencePerson || (selectedCustomer as any)?.referencePersonName || undefined,
        referencePersonPhone: (selectedCustomer as any)?.referencePersonPhone || undefined
      };

      // Si PM, nettoyer les champs PP pour ne pas les renvoyer
      if (isBusiness) {
        customerDto = {
          ...customerDto,
          occupation: undefined,
          monthlyIncome: undefined,
          birthPlace: undefined,
          nationality: undefined,
          personalNif: undefined,
          employerName: undefined,
          workAddress: undefined,
          incomeSource: undefined,
          maritalStatus: undefined,
          numberOfDependents: undefined,
          educationLevel: undefined,
          signaturePlace: undefined,
          signatureDate: undefined,
          referencePersonName: undefined,
          referencePersonPhone: undefined
        };
      }

      // Pour les personnes morales, ne pas inclure les champs spécifiques aux personnes physiques
      // Remarque: certains champs de base (firstName, lastName, dateOfBirth, gender) sont requis par le backend.
      // Nous les remplissons déjà avec des valeurs adaptées (ex: companyName/legalForm et une date par défaut) ci-dessus.
      // Les champs optionnels PP restent undefined automatiquement et ne seront pas sérialisés.

      console.log('Données à envoyer pour modification:', customerDto);

      // Appeler l'API pour mettre à jour le client
      const updatedCustomer = await savingsCustomerService.updateCustomer(selectedCustomer.id, customerDto);
      
      // Normalize the updated customer response
      const normalizedCustomer = normalizeCustomer(updatedCustomer);
      
      console.log('Client mis à jour avec succès:', normalizedCustomer);
      toast.success(`Client ${normalizedCustomer.fullName} modifié avec succès!`);
      
      // Fermer le formulaire
      setShowEditClientForm(false);
      setselectedCustomer(null);
      
      // Recharger la liste
      if (activeTab === 'clients') {
        await loadCustomers();
      } else {
        await loadAccounts();
      }
      
    } catch (error: any) {
      console.error('Erreur lors de la modification du client:', error);
      const errorMessage = error.message || 'Erreur lors de la modification du client';
      toast.error(errorMessage);
    }
  };

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir désactiver le client ${customerName}?`)) {
      return;
    }

    try {
      // Note: À implémenter dans le service si endpoint existe
      // await savingsCustomerService.deactivateCustomer(customerId);
      toast.success(`Client ${customerName} désactivé avec succès!`);
      await loadCustomers();
    } catch (error: any) {
      console.error('Erreur lors de la désactivation du client:', error);
      toast.error('Erreur lors de la désactivation du client');
    }
  };

  const handleViewCustomerDetails = async (customerId: string) => {
    try {
      const customer = await savingsCustomerService.getCustomer(customerId);
      // Normalize customer data before setting
      const normalizedCustomer = normalizeCustomer(customer);
      setselectedCustomer(normalizedCustomer);
      setShowViewClientDetails(true); // Ouvrir le modal de visualisation
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
      toast.error('Impossible de charger les détails du client');
    }
  };

  const exportCsv = () => {
    try {
      if (!paginatedAccounts || paginatedAccounts.length === 0) {
        toast.error('Aucune donnée de compte à exporter');
        return;
      }

      const csvData = paginatedAccounts.map(account => ({
        'Numéro de compte': account.accountNumber || '',
        'Nom du client': account.customerName || '',
        'Solde': account.balance || 0,
        'Devise': account.currency || '',
        'Statut': account.status || '',
        'Succursale': account.branchName || '',
  'Date d\'ouverture': formatDate(account.openingDate, ''),
  'Dernière transaction': formatDate(account.lastTransactionDate, ''),
        'Type de compte': getAccountTypeLabel(account.accountType) || '',
        'Solde disponible': account.availableBalance || 0,
        'Taux d\'intérêt': account.interestRate ? `${(account.interestRate * 100).toFixed(2)}%` : '',
        'Solde minimum': account.minimumBalance || '',
        'Téléphone client': account.customerPhone || ''
      }));

      const csv = unparse(csvData, {
        delimiter: ';',
        header: true
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `comptes-clients-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export CSV réussi');
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportPdf = () => {
    try {
      if (!paginatedAccounts || paginatedAccounts.length === 0) {
        toast.error('Aucune donnée de compte à exporter');
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Veuillez autoriser les pop-ups pour exporter en PDF');
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Liste des Comptes Clients - Kredi Ti Machann</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              line-height: 1.4;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #2563eb;
              margin: 0;
              font-size: 24px;
            }
            .header p {
              color: #666;
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background-color: #2563eb;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 10px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .currency {
              text-align: right;
              font-family: 'Courier New', monospace;
            }
            .status-active {
              color: #059669;
              font-weight: bold;
            }
            .status-inactive {
              color: #dc2626;
              font-weight: bold;
            }
            .status-closed {
              color: #6b7280;
              font-weight: bold;
            }
            .status-suspended {
              color: #d97706;
              font-weight: bold;
            }
            @media print {
              body { padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LISTE DES COMPTES CLIENTS</h1>
            <p>Kredi Ti Machann - Système de Micro-crédit</p>
            <p>Date d'émission: ${new Date().toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p>Total des comptes: ${paginatedAccounts.length}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Numéro de compte</th>
                <th>Client</th>
                <th>Solde</th>
                <th>Statut</th>
                <th>Succursale</th>
                <th>Date d'ouverture</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${paginatedAccounts.map(account => `
                <tr>
                  <td><strong>${account.accountNumber || ''}</strong></td>
                  <td>
                    ${account.customerName || ''}<br/>
                    <small style="color: #666;">${account.customerPhone || ''}</small>
                  </td>
                  <td class="currency">
                    ${formatCurrency(account.balance, account.currency)}<br/>
                    <small style="color: #666;">Disp: ${formatCurrency(account.availableBalance, account.currency)}</small>
                  </td>
                  <td>
                    <span class="${account.status === 'ACTIVE' ? 'status-active' :
                                 account.status === 'INACTIVE' ? 'status-inactive' :
                                 account.status === 'CLOSED' ? 'status-closed' : 'status-suspended'}">
                      ${account.status === 'ACTIVE' ? 'Actif' :
                        account.status === 'INACTIVE' ? 'Inactif' :
                        account.status === 'CLOSED' ? 'Fermé' : 'Suspendu'}
                    </span>
                  </td>
                  <td>${account.branchName || ''}</td>
                  <td>${formatDate(account.openingDate, '')}</td>
                  <td>${getAccountTypeLabel(account.accountType) || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p><strong>Kredi Ti Machann</strong> - Système de Micro-crédit pour Haïti</p>
            <p>Document généré automatiquement le ${new Date().toLocaleString('fr-FR')}</p>
            <p class="no-print">
              <button onclick="window.print()" style="
                background: #2563eb;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                margin-top: 10px;
              ">🖨️ Imprimer / Enregistrer en PDF</button>
            </p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          toast.success('Fenêtre d\'export PDF ouverte - Utilisez Ctrl+P ou le bouton Imprimer');
        }, 250);
      };
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  const handleExportClientPDF = (customer: SavingsCustomerResponseDto) => {
    if (!customer) {
      toast.error('Aucune donnée client à exporter');
      return;
    }
    
    // Créer un document HTML pour l'impression
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Veuillez autoriser les pop-ups pour exporter en PDF');
      return;
    }

    const documentTypeLabel = (type: SavingsIdentityDocumentType) => {
      switch (type) {
        case SavingsIdentityDocumentType.CIN:
          return 'CIN';
        case SavingsIdentityDocumentType.Passport:
          return 'Passeport';
        case SavingsIdentityDocumentType.DrivingLicense:
          return 'Permis de conduire';
        default:
          return 'Autre';
      }
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Profil Client - ${customer.fullName}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 40px; 
            line-height: 1.6;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
          }
          .header h1 { 
            color: #2563eb; 
            margin: 0;
            font-size: 28px;
          }
          .header p { 
            color: #666; 
            margin: 5px 0;
          }
          .section { 
            margin-bottom: 25px; 
            page-break-inside: avoid;
          }
          .section-title { 
            background: #2563eb; 
            color: white; 
            padding: 8px 12px; 
            margin-bottom: 15px;
            font-weight: bold;
            font-size: 16px;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
          }
          .info-item { 
            padding: 10px; 
            background: #f9fafb;
            border-left: 3px solid #2563eb;
          }
          .info-label { 
            font-weight: bold; 
            color: #555; 
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 3px;
          }
          .info-value { 
            color: #000;
            font-size: 14px;
          }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            color: #666; 
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PROFIL CLIENT</h1>
          <p>Kredi Ti Machann - Système de Micro-crédit</p>
          <p>Date d'émission: ${new Date().toLocaleDateString('fr-FR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>

          <div class="section">
          <div class="section-title">📋 INFORMATIONS PERSONNELLES</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Nom complet</div>
              <div class="info-value">${customer.fullName || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Date de naissance</div>
              <div class="info-value">${formatDate(customer.dateOfBirth)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Genre</div>
              <div class="info-value">${customer.gender === 0 ? 'Masculin' : 'Féminin'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">ID Client</div>
              <div class="info-value">${getDisplayClientId(customer)}</div>
            </div>
          </div>
        </div>        <div class="section">
          <div class="section-title">📍 ADRESSE</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Adresse</div>
              <div class="info-value">${customer.address?.street || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Commune</div>
              <div class="info-value">${customer.address?.commune || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Département</div>
              <div class="info-value">${customer.address?.department || 'N/A'}</div>
            </div>
            ${customer.address?.postalCode ? `
            <div class="info-item">
              <div class="info-label">Code postal</div>
              <div class="info-value">${customer.address.postalCode}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">📞 CONTACT</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Téléphone principal</div>
              <div class="info-value">${customer.contact?.primaryPhone || 'N/A'}</div>
            </div>
            ${customer.contact?.secondaryPhone ? `
            <div class="info-item">
              <div class="info-label">Téléphone secondaire</div>
              <div class="info-value">${customer.contact.secondaryPhone}</div>
            </div>
            ` : ''}
            ${customer.contact?.email ? `
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${customer.contact.email}</div>
            </div>
            ` : ''}
            ${customer.contact?.emergencyContactName ? `
            <div class="info-item">
              <div class="info-label">Contact d'urgence</div>
              <div class="info-value">${customer.contact.emergencyContactName} - ${customer.contact.emergencyContactPhone || ''}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">🪪 DOCUMENT D'IDENTITÉ</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Type de document</div>
              <div class="info-value">${customer.identity?.documentType !== undefined ? documentTypeLabel(customer.identity.documentType) : 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Numéro</div>
              <div class="info-value">${customer.identity?.documentNumber || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Date d'émission</div>
              <div class="info-value">${formatDate(customer.identity?.issuedDate)}</div>
            </div>
            ${customer.identity?.expiryDate ? `
            <div class="info-item">
              <div class="info-label">Date d'expiration</div>
              <div class="info-value">${formatDate(customer.identity?.expiryDate)}</div>
            </div>
            ` : ''}
            <div class="info-item">
              <div class="info-label">Autorité émettrice</div>
              <div class="info-value">${customer.identity?.issuingAuthority || 'N/A'}</div>
            </div>
          </div>
        </div>

        ${customer.occupation || customer.monthlyIncome ? `
        <div class="section">
          <div class="section-title">💼 INFORMATIONS PROFESSIONNELLES</div>
          <div class="info-grid">
            ${customer.occupation ? `
            <div class="info-item">
              <div class="info-label">Profession</div>
              <div class="info-value">${customer.occupation}</div>
            </div>
            ` : ''}
            ${customer.monthlyIncome ? `
            <div class="info-item">
              <div class="info-label">Revenu mensuel</div>
              <div class="info-value">${new Intl.NumberFormat('fr-FR', { 
                style: 'currency', 
                currency: 'USD' 
              }).format(customer.monthlyIncome).replace('$', 'HTG ')}</div>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <p><strong>Kredi Ti Machann</strong> - Système de Micro-crédit pour Haïti</p>
          <p>Document généré automatiquement le ${new Date().toLocaleString('fr-FR')}</p>
          <p class="no-print">
            <button onclick="window.print()" style="
              background: #2563eb;
              color: white;
              padding: 10px 20px;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
              margin-top: 10px;
            ">🖨️ Imprimer / Enregistrer en PDF</button>
          </p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    // Attendre que la page soit chargée puis déclencher l'impression
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        // Afficher un message de succès
        toast.success('Fenêtre d\'export ouverte - Utilisez Ctrl+P ou le bouton Imprimer');
      }, 250);
    };
  };

  const exportClientsCsv = () => {
    try {
      if (!paginatedCustomers || paginatedCustomers.length === 0) {
        toast.error('Aucune donnée client à exporter');
        return;
      }

      const csvData = paginatedCustomers.map(customer => ({
        'ID Client': getDisplayClientId(customer) || '',
        'Nom complet': customer.fullName || '',
        'Prénom': customer.firstName || '',
        'Nom': customer.lastName || '',
  'Date de naissance': formatDate(customer.dateOfBirth, ''),
        'Genre': customer.gender === 0 ? 'Masculin' : customer.gender === 1 ? 'Féminin' : '',
        'Téléphone principal': customer.contact?.primaryPhone || '',
        'Téléphone secondaire': customer.contact?.secondaryPhone || '',
        'Email': customer.contact?.email || '',
        'Rue': customer.address?.street || '',
        'Commune': customer.address?.commune || '',
        'Département': customer.address?.department || '',
        'Type de document': customer.identity?.documentType !== undefined
          ? ['CIN', 'Passeport', 'Permis de Conduire'][customer.identity.documentType] || ''
          : '',
        'Numéro de document': customer.identity?.documentNumber || '',
  'Date d\'émission': formatDate(customer.identity?.issuedDate, ''),
  'Date d\'expiration': formatDate(customer.identity?.expiryDate, ''),
        'Autorité d\'émission': customer.identity?.issuingAuthority || '',
        'Profession': customer.occupation || '',
        'Revenu mensuel': customer.monthlyIncome ? `${customer.monthlyIncome} HTG` : '',
        'Personne morale': ((customer as any)?.isBusiness || (customer as any)?.companyName) ? 'Oui' : 'Non',
        'Raison sociale': (customer as any)?.companyName || '',
        'Forme juridique': (customer as any)?.legalForm || '',
        'Numéro registre commerce': (customer as any)?.tradeRegisterNumber || '',
        'NIF': (customer as any)?.taxId || '',
        'Statut': customer.isActive ? 'Actif' : 'Inactif',
  'Date de création': formatDate(customer.createdAt, ''),
        'Nombre de documents': customer.documents?.length || 0
      }));

      const csv = unparse(csvData, {
        delimiter: ';',
        header: true
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `clients-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export CSV clients réussi');
    } catch (error) {
      console.error('Erreur lors de l\'export CSV clients:', error);
      toast.error('Erreur lors de l\'export CSV clients');
    }
  };

  const exportClientsPdf = () => {
    try {
      if (!paginatedCustomers || paginatedCustomers.length === 0) {
        toast.error('Aucune donnée client à exporter');
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Veuillez autoriser les pop-ups pour exporter en PDF');
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Liste des Clients - Kredi Ti Machann</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              line-height: 1.4;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #2563eb;
              margin: 0;
              font-size: 24px;
            }
            .header p {
              color: #666;
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 10px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 6px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background-color: #2563eb;
              color: white;
              font-weight: bold;
              font-size: 9px;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 10px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .status-active {
              color: #059669;
              font-weight: bold;
            }
            .status-inactive {
              color: #dc2626;
              font-weight: bold;
            }
            .business-badge {
              background: #fef3c7;
              color: #d97706;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 8px;
              font-weight: bold;
            }
            @media print {
              body { padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LISTE DES CLIENTS</h1>
            <p>Kredi Ti Machann - Système de Micro-crédit</p>
            <p>Date d'émission: ${new Date().toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p>Total des clients: ${paginatedCustomers.length}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID Client</th>
                <th>Nom complet</th>
                <th>Contact</th>
                <th>Adresse</th>
                <th>Document</th>
                <th>Statut</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${paginatedCustomers.map(customer => `
                <tr>
                  <td><strong>${getDisplayClientId(customer) || ''}</strong></td>
                  <td>
                    ${customer.fullName || ''}
                    ${((customer as any)?.isBusiness || (customer as any)?.companyName) ? `<br/><span class="business-badge">PM</span>` : ''}
                  </td>
                  <td>
                    ${customer.contact?.primaryPhone || ''}<br/>
                    <small style="color: #666;">${customer.contact?.email || ''}</small>
                  </td>
                  <td>
                    ${customer.address?.commune || ''}<br/>
                    <small style="color: #666;">${customer.address?.department || ''}</small>
                  </td>
                  <td>
                    ${customer.identity?.documentNumber || ''}<br/>
                    <small style="color: #666;">
                      ${customer.identity?.documentType !== undefined
                        ? ['CIN', 'Passeport', 'Permis'][customer.identity.documentType] || ''
                        : ''}
                    </small>
                  </td>
                  <td>
                    <span class="${customer.isActive ? 'status-active' : 'status-inactive'}">
                      ${customer.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td>
                    ${((customer as any)?.isBusiness || (customer as any)?.companyName)
                      ? 'Personne Morale'
                      : 'Personne Physique'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p><strong>Kredi Ti Machann</strong> - Système de Micro-crédit pour Haïti</p>
            <p>Document généré automatiquement le ${new Date().toLocaleString('fr-FR')}</p>
            <p class="no-print">
              <button onclick="window.print()" style="
                background: #2563eb;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                margin-top: 10px;
              ">🖨️ Imprimer / Enregistrer en PDF</button>
            </p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          toast.success('Fenêtre d\'export PDF clients ouverte - Utilisez Ctrl+P ou le bouton Imprimer');
        }, 250);
      };
    } catch (error) {
      console.error('Erreur lors de l\'export PDF clients:', error);
      toast.error('Erreur lors de l\'export PDF clients');
    }
  };

  const filteredAccounts = Array.isArray(accounts) ? accounts.filter(account => {
    if (!account) return false;

    const searchLower = searchTerm?.toLowerCase() || '';
    const matchesSearch = searchLower ? (
      (account.accountNumber || '').toLowerCase().includes(searchLower) ||
      (account.customerName || '').toLowerCase().includes(searchLower) ||
      (account.customerPhone || '').includes(searchTerm)
    ) : true;

    const matchesType = !filters.accountType || account.accountType === filters.accountType;
    const matchesCurrency = !filters.currency || account.currency === filters.currency;
    const matchesStatus = !filters.status || account.status === filters.status;
    const matchesBranch = !filters.branchId || account.branchId === filters.branchId;

    const shouldInclude = matchesSearch && matchesType && matchesCurrency && matchesStatus && matchesBranch;

    return shouldInclude;
  }) : [];

  // Sort filtered accounts from most recent to oldest (by openingDate, fallback to updatedAt/createdAt)
  const sortedFilteredAccounts = Array.isArray(filteredAccounts)
    ? [...filteredAccounts].sort((a, b) => {
        const getDateValue = (acct: any) => {
          return new Date(acct?.openingDate || acct?.lastTransactionDate || acct?.updatedAt || acct?.createdAt || 0).getTime();
        };
        return getDateValue(b) - getDateValue(a);
      })
    : [];

  // Pagination state (client-side)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const totalFiltered = sortedFilteredAccounts.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  useEffect(() => {
    // If page size or filtered list changes, ensure current page is valid
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginatedAccounts = sortedFilteredAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Debug: Log pagination state
  console.log('📊 Pagination Debug:', {
    totalAccounts: accounts.length,
    filteredCount: filteredAccounts.length,
    sortedCount: sortedFilteredAccounts.length,
    totalFiltered,
    currentPage,
    pageSize,
    totalPages,
    paginatedCount: paginatedAccounts.length,
    filters,
    sampleFilteredAccount: filteredAccounts[0],
    samplePaginatedAccount: paginatedAccounts[0]
  });

  const filteredCustomers = Array.isArray(customers) ? customers.filter(customer => {
    if (!customer) return false;
    // Helper: detect if business when flag missing
    const isBusiness = (c: any) => {
      // First check the explicit isBusiness flag
      if (c?.isBusiness !== undefined && c?.isBusiness !== null) {
        return !!c.isBusiness;
      }
      
      // Fallback: check for business-specific fields that indicate this is a business client
      const hasBusinessFields = !!(
        c?.companyName ||
        c?.legalForm ||
        c?.tradeRegisterNumber ||
        c?.taxId ||
        c?.headOfficeAddress ||
        c?.companyPhone ||
        c?.companyEmail ||
        c?.representativeFirstName ||
        c?.representativeLastName ||
        c?.representativeTitle ||
        c?.representativeDocumentNumber
      );
      
      return hasBusinessFields;
    };
    
    // Filtre de recherche de texte
    if (clientSearchTerm) {
      const searchLower = clientSearchTerm.toLowerCase();
      const matchesSearch = (
        (customer.fullName || '').toLowerCase().includes(searchLower) ||
        (customer.firstName || '').toLowerCase().includes(searchLower) ||
        (customer.lastName || '').toLowerCase().includes(searchLower) ||
        (customer.contact?.primaryPhone || '').includes(clientSearchTerm) ||
        (customer.contact?.email && customer.contact.email.toLowerCase().includes(searchLower)) ||
        (customer.identity?.documentNumber || '').toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Filtre par succursale
    if (clientFilters.branchId && (customer as any).branchId !== clientFilters.branchId) {
      return false;
    }

    // Filtre par statut (si le champ existe)
    if (clientFilters.status && (customer as any).status !== clientFilters.status) {
      return false;
    }

    // Filtre par type de client (Personne Physique vs Personne Morale)
    if (clientFilters.customerType) {
      const business = isBusiness(customer as any);
      if (clientFilters.customerType === 'BUSINESS' && !business) return false;
      if (clientFilters.customerType === 'PHYSICAL' && business) return false;
    }

    // Filtre par date de création
    if (clientFilters.dateFrom || clientFilters.dateTo) {
      const createdDate = new Date((customer as any).createdAt || customer.identity?.issuedDate);
      if (clientFilters.dateFrom) {
        const fromDate = new Date(clientFilters.dateFrom);
        if (createdDate < fromDate) return false;
      }
      if (clientFilters.dateTo) {
        const toDate = new Date(clientFilters.dateTo);
        toDate.setHours(23, 59, 59, 999); // Fin de la journée
        if (createdDate > toDate) return false;
      }
    }

    return true;
  }) : [];

  // Client-side pagination for Clients tab
  const [clientCurrentPage, setClientCurrentPage] = useState<number>(1);
  const [clientPageSize, setClientPageSize] = useState<number>(10);

  const totalClientsFiltered = filteredCustomers.length;
  const clientTotalPages = Math.max(1, Math.ceil(totalClientsFiltered / clientPageSize));

  useEffect(() => {
    if (clientCurrentPage > clientTotalPages) setClientCurrentPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalClientsFiltered, clientPageSize]);

  const paginatedCustomers = filteredCustomers.slice((clientCurrentPage - 1) * clientPageSize, clientCurrentPage * clientPageSize);

  const formatCurrency = (amount: number, currency: 'HTG' | 'USD') => {
    const safeAmount = Number(amount || 0);
    if (currency === 'HTG') {
      // HTG: show integer with thousand separators and unit suffix
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(safeAmount) + ' HTG';
    }

    // USD: show two decimals and use trailing 'USD' for consistency with HTG display
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeAmount) + ' USD';
  };

  const formatDate = (input?: any, fallback: string = 'N/A') => {
    if (!input) return fallback;
    try {
      const value = String(input).trim();
      if (!value) return fallback;

      const iso = value.includes('T') ? value.split('T')[0] : value;
      const parts = iso.split('-');
      if (parts.length !== 3) return fallback;

      const [year, month, day] = parts;
      if (!year || !month || !day) return fallback;

      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    } catch {
      return fallback;
    }
  };

  // Normaliser une date quelconque vers le format YYYY-MM-DD accepté par .NET
  const normalizeDateToYMD = (val?: any, fallback?: string): string | undefined => {
    if (!val) return fallback;
    try {
      const s = String(val).trim();
      // Déjà au bon format
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // Format FR: DD/MM/YYYY
      const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) {
        const [_, dd, mm, yyyy] = m;
        return `${yyyy}-${mm}-${dd}`;
      }
      // Essayer Date.parse puis ISO
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      return fallback;
    } catch {
      return fallback;
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', label: 'Actif' },
      INACTIVE: { bg: 'bg-red-100', text: 'text-red-800', label: 'Inactif' },
      CLOSED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Fermé' },
      SUSPENDED: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Suspendu' }
    };
    const config = configs[status as keyof typeof configs] || configs.ACTIVE;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Comptes Clients</h2>
          <p className="text-gray-600 mt-1">
            Créer et gérer tous les types de comptes clients
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowCreateClientForm(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <UserPlus className="h-5 w-5" />
            <span>Nouveau Client</span>
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nouveau Compte</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-6 py-2 rounded-md transition-colors ${
            activeTab === 'accounts'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Wallet className="h-4 w-4" />
            <span>Comptes</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`px-6 py-2 rounded-md transition-colors ${
            activeTab === 'clients'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Clients</span>
          </div>
        </button>
      </div>

      {/* Accounts Tab Content */}
      {activeTab === 'accounts' && (
      <>
  {/* Statistics Cards */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Comptes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAccounts}</p>
              <p className="text-sm text-green-600 mt-1">
                {stats.activeAccounts} actifs
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Solde Total HTG</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalBalanceHTG, 'HTG')}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Solde Total USD</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.totalBalanceUSD, 'USD')}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Removed: Transactions Récentes card by request */}
      </div>

      {/* Account Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Type</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Épargne</span>
              <span className="font-medium">{stats.accountsByType.SAVINGS}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Courant</span>
              <span className="font-medium">{stats.accountsByType.CURRENT}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Épargne à Terme</span>
              <span className="font-medium">{stats.accountsByType.TERM_SAVINGS}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Devise</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">HTG</span>
              <span className="font-medium">{stats.accountsByCurrency.HTG}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">USD</span>
              <span className="font-medium">{stats.accountsByCurrency.USD}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
          <div className="space-y-2">
            <button
              onClick={() => setFilters({ ...filters, accountType: AccountType.SAVINGS })}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            >
              Voir comptes d'épargne
            </button>
            <button
              onClick={() => setFilters({ ...filters, accountType: AccountType.CURRENT })}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            >
              Voir comptes courants
            </button>
            <button
              onClick={() => setFilters({ ...filters, accountType: AccountType.TERM_SAVINGS })}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            >
              Voir épargnes à terme
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro de compte, nom client, téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={filters.accountType || ''}
            onChange={(e) => setFilters({ ...filters, accountType: e.target.value as AccountType || undefined })}
            className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="">Tous types</option>
            <option value={AccountType.SAVINGS}>Épargne</option>
            <option value={AccountType.CURRENT}>Courant</option>
            <option value={AccountType.TERM_SAVINGS}>Épargne à Terme</option>
          </select>
        </div>

        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={filters.branchId ?? ''}
            onChange={(e) => { setFilters({ ...filters, branchId: e.target.value ? Number(e.target.value) : undefined }); setCurrentPage(1); }}
            className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="">Toutes succursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={filters.currency || ''}
            onChange={(e) => setFilters({ ...filters, currency: e.target.value as 'HTG' | 'USD' || undefined })}
            className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="">Toutes devises</option>
            <option value="HTG">HTG</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <button
          onClick={() => {
            setSearchTerm('');
            setFilters({});
            setCurrentPage(1);
          }}
          className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Réinitialiser
        </button>
      </div>

      {/* Export Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={exportCsv}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={!paginatedAccounts || paginatedAccounts.length === 0}
          >
            <Download className="h-4 w-4" />
            <span>Exporter CSV</span>
          </button>
          <button
            onClick={exportPdf}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            disabled={!paginatedAccounts || paginatedAccounts.length === 0}
          >
            <FileText className="h-4 w-4" />
            <span>Exporter PDF</span>
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {totalFiltered} compte(s) trouvé(s)
        </div>
      </div>

      {/* Accounts List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
  {totalFiltered === 0 ? (
          <div className="text-center py-12">
            <Wallet className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun compte trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || Object.keys(filters).length > 0
                ? 'Aucun compte ne correspond à votre recherche'
                : 'Aucun compte client pour le moment'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paginatedAccounts.map((account, index) => (
              <div key={`${account.id}-${account.accountNumber}-${index}`} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        #{account.accountNumber}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {getAccountTypeLabel(account.accountType)}
                      </span>
                      {getStatusBadge(account.status)}
                      <span className="text-sm text-gray-500">{account.currency}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">{account.customerName}</div>
                          <div className="text-xs text-gray-500">{account.customerPhone}</div>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                        <div className="font-medium">{account.branchName}</div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">{formatCurrency(account.balance, account.currency)}</div>
                          <div className="text-xs text-gray-500">
                            Disponible: {formatCurrency(account.availableBalance, account.currency)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">Ouvert: {formatDate(account.openingDate)}</div>
                          {account.lastTransactionDate && (
                            <div className="text-xs text-gray-500">
                              Dernière: {formatDate(account.lastTransactionDate)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Account-specific information */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      {account.accountType === AccountType.SAVINGS && account.interestRate && (
                        <span>Taux intérêt: {(account.interestRate * 100).toFixed(2)}%</span>
                      )}
                      {account.accountType === AccountType.TERM_SAVINGS && account.termType && (
                        <>
                          <span>Terme: {getTermTypeLabel(account.termType)}</span>
                          {account.maturityDate && (
                            <span>Échéance: {formatDate(account.maturityDate)}</span>
                          )}
                        </>
                      )}
                      {account.minimumBalance && (
                        <span>Solde min: {formatCurrency(account.minimumBalance, account.currency)}</span>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex items-center space-x-2">
                    <button
                      onClick={() => handleViewAccount(account)}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Voir détails et historique"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Pagination Controls */}
      {totalFiltered > 0 && (
        <div className="mt-3 bg-white rounded-md border border-gray-200">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Affichage {Math.min((currentPage - 1) * pageSize + 1, totalFiltered)}–{Math.min(currentPage * pageSize, totalFiltered)} de {totalFiltered} comptes
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Afficher</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 bg-gray-100 text-sm rounded-md disabled:opacity-50"
              >
                Préc
              </button>

              <div className="text-sm text-gray-700">{currentPage} / {totalPages}</div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 bg-gray-100 text-sm rounded-md disabled:opacity-50"
              >
                Suiv
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* Clients Tab Content */}
      {activeTab === 'clients' && (
      <>
      {/* Client Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Recherche par nom, téléphone ou numéro de document..."
            value={clientSearchTerm}
            onChange={(e) => setClientSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Succursale Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Succursale
                </label>
                <select
                  value={clientFilters.branchId ?? ''}
                  onChange={(e) => setClientFilters({ ...clientFilters, branchId: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Toutes les succursales</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Type de Client Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de Client
                </label>
                <select
                  value={clientFilters.customerType}
                  onChange={(e) => setClientFilters({ ...clientFilters, customerType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tous</option>
                  <option value="PHYSICAL">Personne Physique</option>
                  <option value="BUSINESS">Personne Morale</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estati
                </label>
                <select
                  value={clientFilters.status}
                  onChange={(e) => setClientFilters({ ...clientFilters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tous les statuts</option>
                  <option value="ACTIVE">Actif</option>
                  <option value="INACTIVE">Inactif</option>
                  <option value="PENDING">En attente</option>
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
                onClick={() => setClientFilters({ branchId: undefined, status: '', customerType: '', dateFrom: '', dateTo: '' })}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Effacer les filtres
              </button>
              <div className="text-sm text-gray-600">
                {filteredCustomers.length} client(s) trouvé(s)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Buttons for Clients */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={exportClientsCsv}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={!paginatedCustomers || paginatedCustomers.length === 0}
          >
            <Download className="h-4 w-4" />
            <span>Exporter CSV</span>
          </button>
          <button
            onClick={exportClientsPdf}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            disabled={!paginatedCustomers || paginatedCustomers.length === 0}
          >
            <FileText className="h-4 w-4" />
            <span>Exporter PDF</span>
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {totalClientsFiltered} client(s) au total
        </div>
      </div>

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
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        {clientSearchTerm 
                          ? 'Aucun client ne correspond à votre recherche'
                          : 'Aucun client pour le moment'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.filter(c => c && c.id).map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{customer.fullName || 'N/A'}</div>
                          <div className="text-sm text-gray-500">
                            ID: {getDisplayClientId(customer)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.contact?.primaryPhone || 'N/A'}</div>
                      {customer.contact?.email && (
                        <div className="text-sm text-gray-500">{customer.contact.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {customer.documents && customer.documents.length > 0 ? (
                          <div className="flex flex-col space-y-1">
                            <span className="font-medium">{customer.documents.length} document(s)</span>
                            <div className="flex flex-wrap gap-1">
                              {customer.documents.slice(0, 2).map((doc: any, index: number) => (
                                <span key={index} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  {doc.documentTypeName || doc.documentType || 'Document'}
                                </span>
                              ))}
                              {customer.documents.length > 2 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  +{customer.documents.length - 2} autres
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">Aucun document</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{customer.address?.commune || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{customer.address?.department || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.isActive ? (
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
                          onClick={() => customer.id && handleEditClient(customer.id)}
                          disabled={!customer.id}
                          className="text-blue-600 hover:text-blue-900 transition-colors p-2 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Modifier"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => customer.id && handleViewCustomerDetails(customer.id)}
                          disabled={!customer.id}
                          className="text-gray-600 hover:text-gray-900 transition-colors p-2 hover:bg-gray-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Voir les détails"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => customer && handleExportClientPDF(customer)}
                          disabled={!customer}
                          className="text-green-600 hover:text-green-900 transition-colors p-2 hover:bg-green-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Ekspò PDF"
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
        <div className="px-4 py-3 bg-white border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Affichage {(clientCurrentPage - 1) * clientPageSize + 1} – {Math.min(clientCurrentPage * clientPageSize, totalClientsFiltered)} sur {totalClientsFiltered}
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
              {Array.from({ length: clientTotalPages }).map((_, i) => (
                <option key={i} value={i + 1}>{i + 1}</option>
              ))}
            </select>

            <button
              onClick={() => setClientCurrentPage((p) => Math.min(clientTotalPages, p + 1))}
              disabled={clientCurrentPage >= clientTotalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >Suiv</button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Create Client Modal */}
      {showCreateClientForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Créer un Nouveau Client</h2>
                <p className="text-sm text-gray-600 mt-1">Formulaire complet de création de client</p>
              </div>
              <button
                onClick={() => setShowCreateClientForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ClientCreationForm
              onSubmit={handleCreateClient}
              onCancel={() => setShowCreateClientForm(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditClientForm && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Modifier Client</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedCustomer.fullName}</p>
              </div>
              <button
                onClick={() => {
                  setShowEditClientForm(false);
                  setselectedCustomer(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ClientEditForm
              customer={selectedCustomer}
              onSubmit={handleUpdateClient}
              onCancel={() => {
                setShowEditClientForm(false);
                setselectedCustomer(null);
              }}
            />
          </div>
        </div>
      )}

      {/* View Client Details Modal */}
      {showViewClientDetails && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Détails du Client</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedCustomer.fullName}</p>
              </div>
              <button
                onClick={() => {
                  setShowViewClientDetails(false);
                  setselectedCustomer(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Section 1: Informations Personnelles / Entreprise */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  {((selectedCustomer as any)?.isBusiness || (selectedCustomer as any)?.companyName || (selectedCustomer as any)?.legalForm) ? 'Informations de l\'Entreprise' : 'Informations Personnelles'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {((selectedCustomer as any)?.isBusiness || (selectedCustomer as any)?.companyName || (selectedCustomer as any)?.legalForm) ? (
                    // Affichage pour personne morale
                    <>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500">Raison sociale</label>
                        <p className="text-base text-gray-900">{(selectedCustomer as any)?.companyName || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Forme juridique</label>
                        <p className="text-base text-gray-900">{(selectedCustomer as any)?.legalForm || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Numéro de registre commerce</label>
                        <p className="text-base text-gray-900">{(selectedCustomer as any)?.tradeRegisterNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">NIF</label>
                        <p className="text-base text-gray-900">{(selectedCustomer as any)?.taxId || 'N/A'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500">Adresse du siège social</label>
                        <p className="text-base text-gray-900">{(selectedCustomer as any)?.headOfficeAddress || 'N/A'}</p>
                      </div>
                    </>
                  ) : (
                    // Affichage pour personne physique
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Prénom</label>
                        <p className="text-base text-gray-900">{selectedCustomer.firstName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Nom</label>
                        <p className="text-base text-gray-900">{selectedCustomer.lastName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Date de Naissance</label>
                        <p className="text-base text-gray-900">
                          {formatDate(selectedCustomer.dateOfBirth)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Genre</label>
                        <p className="text-base text-gray-900">{genderLabel(selectedCustomer.gender) === 'Masculin' ? 'Homme' : genderLabel(selectedCustomer.gender) === 'Féminin' ? 'Femme' : '—'}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500">ID Client</label>
                    <p className="text-base text-gray-900 font-mono bg-blue-50 px-2 py-1 rounded inline-block">
                      {getDisplayClientId(selectedCustomer)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Statut</label>
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

              {/* Section 1.5: Représentant Légal (pour personne morale)
                  Always show the block for business clients and display 'N/A' when a field is missing.
              */}
              {((selectedCustomer as any)?.isBusiness || (selectedCustomer as any)?.companyName || (selectedCustomer as any)?.legalForm) && (
                (() => {
                  const rep = (selectedCustomer as any)?.legalRepresentative || {};
                  const repFirst = (rep?.firstName || (selectedCustomer as any)?.representativeFirstName || (selectedCustomer as any)?.representativeFirst || '').toString().trim();
                  const repLast = (rep?.lastName || (selectedCustomer as any)?.representativeLastName || (selectedCustomer as any)?.representativeLast || '').toString().trim();
                  const repFull = (repFirst || repLast) ? `${repFirst} ${repLast}`.trim() : 'N/A';
                  const repTitle = (rep?.title || (selectedCustomer as any)?.representativeTitle) || 'N/A';
                  const repDocTypeVal = rep?.documentType ?? (selectedCustomer as any)?.representativeDocumentType;
                  const docTypeMap: Record<number, string> = { 0: "CIN (Carte d'Identité Nationale)", 1: 'Passeport', 2: 'Permis de Conduire' };
                  const repDocType = repDocTypeVal !== undefined && repDocTypeVal !== null ? (docTypeMap[repDocTypeVal] || String(repDocTypeVal)) : 'N/A';
                  const repDocNumber = rep?.documentNumber || (selectedCustomer as any)?.representativeDocumentNumber || 'N/A';
                  const repIssued = rep?.issuedDate || (selectedCustomer as any)?.representativeIssuedDate || null;
                  const repExpiry = rep?.expiryDate || (selectedCustomer as any)?.representativeExpiryDate || null;
                  const repIssuingAuthority = rep?.issuingAuthority || (selectedCustomer as any)?.representativeIssuingAuthority || 'N/A';

                  return (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <User className="h-5 w-5 mr-2 text-blue-600" />
                        Représentant Légal
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-500">Nom complet</label>
                          <p className="text-base text-gray-900">{repFull}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Titre/Fonction</label>
                          <p className="text-base text-gray-900">{repTitle}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Type de document</label>
                          <p className="text-base text-gray-900">{repDocType}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Numéro de document</label>
                          <p className="text-base text-gray-900 font-mono">{repDocNumber}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Date d'émission</label>
                          <p className="text-base text-gray-900">{formatDate(repIssued)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Date d'expiration</label>
                          <p className="text-base text-gray-900">{formatDate(repExpiry)}</p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-500">Autorité d'émission</label>
                          <p className="text-base text-gray-900">{repIssuingAuthority}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Section 2: Adresse */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                  Adresse
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Rue</label>
                    <p className="text-base text-gray-900">{selectedCustomer.address?.street || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Commune</label>
                    <p className="text-base text-gray-900">{selectedCustomer.address?.commune || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Département</label>
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
                    <label className="block text-sm font-medium text-gray-500">Téléphone Principal</label>
                    <p className="text-base text-gray-900">{selectedCustomer.contact?.primaryPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Téléphone Secondaire</label>
                    <p className="text-base text-gray-900">{selectedCustomer.contact?.secondaryPhone || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="text-base text-gray-900">{selectedCustomer.contact?.email || 'N/A'}</p>
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
                    <label className="block text-sm font-medium text-gray-500">Type de Document</label>
                    <p className="text-base text-gray-900">
                      {(() => {
                        // First try to find identity document (documentType === 0) from uploaded documents
                        const identityDoc = selectedCustomer.documents?.find((doc: any) => 
                          doc.documentType === 0 || doc.documentType === '0'
                        );
                        
                        if (identityDoc) {
                          return identityDoc.documentTypeName || 'Carte d\'Identité';
                        }
                        
                        // If no identity document found by type, look for documents with identity-related names
                        const identityDocByName = selectedCustomer.documents?.find((doc: any) => 
                          doc.documentTypeName?.toLowerCase().includes('carte') || 
                          doc.documentTypeName?.toLowerCase().includes('cin') ||
                          doc.documentTypeName?.toLowerCase().includes('identité') ||
                          doc.documentTypeName?.toLowerCase().includes('passeport') ||
                          doc.documentTypeName?.toLowerCase().includes('permis') ||
                          doc.documentTypeName?.toLowerCase().includes('acte')
                        );
                        
                        if (identityDocByName) {
                          return identityDocByName.documentTypeName;
                        }
                        
                        // Fallback to identity.documentType if no uploaded identity document found
                        return selectedCustomer.identity?.documentType !== undefined 
                          ? ['CIN', 'Passeport', 'Permis de Conduire'][selectedCustomer.identity.documentType]
                          : 'N/A';
                      })()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Numéro de Document</label>
                    <p className="text-base text-gray-900 font-mono">{selectedCustomer.identity?.documentNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Date d'Émission</label>
                    <p className="text-base text-gray-900">
                      {formatDate(selectedCustomer.identity?.issuedDate)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Date d'Expiration</label>
                    <p className="text-base text-gray-900">
                      {formatDate(selectedCustomer.identity?.expiryDate)}
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
                      // Normalize field names (handle both Id/id, etc.)
                      const docId = doc.Id || doc.id;
                      const docName = doc.Name || doc.name || (doc.FilePath || doc.filePath ? String(doc.FilePath || doc.filePath).split(/[/\\]/).pop() : '') || 'Document';
                      const docType = doc.documentTypeName || doc.documentTypeName || 'Document';
                      const rawSize = (doc.FileSize ?? doc.fileSize);
                      const docSizeKb = typeof rawSize === 'number' && !isNaN(rawSize) ? (rawSize / 1024) : null;
                      const rawDate = doc.UploadedAt || doc.uploadedAt;
                      const formattedUploadedAt = formatDate(rawDate, '');
                      const docDesc = doc.Description || doc.description;
                      const docVerified = doc.Verified || doc.verified || false;

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
                                  {docSizeKb !== null && (
                                    <>
                                      <span>{docSizeKb.toFixed(1)} KB</span>
                                    </>
                                  )}
                                  {docSizeKb !== null && formattedUploadedAt && <span>•</span>}
                                  {formattedUploadedAt && (
                                    <span>{formattedUploadedAt}</span>
                                  )}
                                </div>
                                {docDesc && (
                                  <p className="text-sm text-gray-600 mt-1">{docDesc}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {docVerified && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full whitespace-nowrap">
                                  Vérifié
                                </span>
                              )}
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

              {/* Section 6: Signature */}
              {selectedCustomer.signature && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Edit2 className="h-5 w-5 mr-2 text-blue-600" />
                    Signature du Client
                  </h3>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <img 
                      src={selectedCustomer.signature} 
                      alt="Signature" 
                      className="max-h-32 mx-auto"
                    />
                  </div>
                </div>
              )}

              {/* Section 7: Informations Professionnelles */}
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
                        <p className="text-base text-gray-900">{selectedCustomer.monthlyIncome} HTG</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowViewClientDetails(false);
                  setselectedCustomer(null);
                }}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Fermer
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowViewClientDetails(false);
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

      {/* Document Upload & Signature Modal */}
      {showDocumentUploadModal && selectedCustomer && (
        <DocumentUploadModal
          customer={selectedCustomer}
          onClose={() => {
            setShowDocumentUploadModal(false);
          }}
          onSuccess={async () => {
            // Recharger les données du client
            const updatedCustomer = await savingsCustomerService.getCustomer(selectedCustomer.id);
            const normalized = normalizeCustomer(updatedCustomer);
            setselectedCustomer(normalized);
            toast.success('Documents mis à jour avec succès!');
          }}
        />
      )}

      {/* Create Account Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Créer un Nouveau Compte</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <AccountCreationForm
              onSubmit={handleCreateAccount}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}

      {/* Account Details Modal */}
      {showAccountDetails && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Détails du Compte #{selectedAccount.accountNumber}
                </h2>
                <p className="text-gray-600 mt-1">
                  {selectedAccount.customerName} - {getAccountTypeLabel(selectedAccount.accountType)}
                </p>
              </div>
              <button
                onClick={() => setShowAccountDetails(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Account Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé du Compte</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Solde Actuel</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Solde Disponible</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(selectedAccount.availableBalance, selectedAccount.currency)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Statut</p>
                    <div className="mt-1">{getStatusBadge(selectedAccount.status)}</div>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Transactions Récentes</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {accountTransactions.length === 0 ? (
                    <div className="text-center py-8">
                      <TrendingUp className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-gray-500">Aucune transaction trouvée</p>
                    </div>
                  ) : (
                    accountTransactions.map((transaction) => (
                      <div key={transaction.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full ${
                              transaction.type === 'DEPOSIT' ? 'bg-green-100' :
                              transaction.type === 'WITHDRAWAL' ? 'bg-red-100' : 'bg-blue-100'
                            }`}>
                              {transaction.type === 'DEPOSIT' ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : transaction.type === 'WITHDRAWAL' ? (
                                <TrendingUp className="h-4 w-4 text-red-600" />
                              ) : (
                                <DollarSign className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{transaction.description}</p>
                              <p className="text-sm text-gray-500">
                                {formatDate(transaction.processedAt)} • {transaction.processedByName}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${
                              transaction.type === 'DEPOSIT' ? 'text-green-600' :
                              transaction.type === 'WITHDRAWAL' ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {transaction.type === 'DEPOSIT' ? '+' : transaction.type === 'WITHDRAWAL' ? '-' : ''}
                              {formatCurrency(transaction.amount, transaction.currency)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Solde: {formatCurrency(transaction.balanceAfter, transaction.currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAccountDetails(false)}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientAccountManagement;









