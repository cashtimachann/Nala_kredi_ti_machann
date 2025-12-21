import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { Users, LayoutGrid, CreditCard, List, Search, Plus } from 'lucide-react';
import apiService from '../../services/apiService';
import clientAccountCustomerLoader from '../../services/clientAccountCustomerLoader';
import { useSearchParams, useNavigate } from 'react-router-dom';
const CurrentAccountManagement = React.lazy(() => import('./CurrentAccountManagement'));
const CurrentAccountTransactions = React.lazy(() => import('./CurrentAccountTransactions'));
const CurrentAccountOverview = React.lazy(() => import('./CurrentAccountOverview'));

type TabKey = 'overview' | 'clients' | 'accounts' | 'transactions';

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: "Vue d'ensemble", icon: LayoutGrid },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'accounts', label: 'Comptes', icon: CreditCard },
  { key: 'transactions', label: 'Transactions', icon: List },
];

const CurrentAccounts: React.FC = () => {
  const currentUser = apiService.getCurrentUser();
  const userBranchId = currentUser?.branchId;
  const roleNorm = (currentUser?.role || '').toString().toLowerCase().replace(/[\s_-]+/g, '');
  const isBranchHead = ['manager','branchsupervisor','chefdesuccursale','branchmanager','assistantmanager','chefdesuccursal'].includes(roleNorm);
  const effectiveBranchId = isBranchHead ? userBranchId : undefined;
  const isBranchLocked = Boolean(effectiveBranchId);
  const [params, setParams] = useSearchParams();
  const initialTab = useMemo<TabKey>(() => {
    const t = (params.get('tab') || '').toLowerCase();
    if (t === 'clients' || t === 'accounts' || t === 'transactions') return t as TabKey;
    return 'overview';
  }, []);
  const [active, setActive] = useState<TabKey>(initialTab);

  // Sync active tab when URL param changes externally (e.g., child sets tab)
  useEffect(() => {
    const t = (params.get('tab') || '').toLowerCase();
    if (t === 'overview' || t === 'clients' || t === 'accounts' || t === 'transactions') {
      if (t !== active) setActive(t as TabKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Simple clients tab implementation (search + results)
  const [clientSearch, setClientSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [branchCustomers, setBranchCustomers] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Keep URL in sync with active tab (preserve account param if present)
    const currentAccount = params.get('account') || undefined;
    const next: Record<string, string> = { tab: active };
    if (currentAccount) next.account = currentAccount;
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    // Optionally auto-load some clients when opening tab
    if (active === 'clients' && clients.length === 0 && clientSearch.trim().length >= 2) {
      void handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    const loadBranchCustomers = async () => {
      if (!isBranchLocked || effectiveBranchId == null) {
        setBranchCustomers([]);
        return;
      }
      try {
        const branchIdNum = Number(effectiveBranchId);
        if (Number.isNaN(branchIdNum)) {
          setBranchCustomers([]);
          return;
        }
        const list = await clientAccountCustomerLoader.loadCustomersHavingAccounts('CURRENT', { branchId: branchIdNum });
        setBranchCustomers(list || []);
      } catch (error) {
        console.error('Erreur lors du chargement des clients de la succursale', error);
        setBranchCustomers([]);
      }
    };
    void loadBranchCustomers();
  }, [isBranchLocked, effectiveBranchId]);

  // Debounce client search input
  useEffect(() => {
    if (active !== 'clients') return;
    if (!clientSearch || clientSearch.trim().length < 2) return;
    const t = setTimeout(() => {
      void handleSearch();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSearch, active]);

  const handleSearch = async () => {
    if (!clientSearch || clientSearch.trim().length < 2) return;
    setSearching(true);
    try {
      if (isBranchLocked) {
        const q = clientSearch.trim().toLowerCase();
        const digits = clientSearch.replace(/\D+/g, '');
        const filtered = branchCustomers.filter((customer) => {
          const fullName = (customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`).toLowerCase();
          const phone = (customer.contact?.primaryPhone || '').replace(/\D+/g, '');
          const doc = (customer.identity?.documentNumber || '').toString().toLowerCase();
          const code = (customer.customerCode || '').toString().toLowerCase();
          return (
            fullName.includes(q) ||
            (!!digits && phone.includes(digits)) ||
            doc.includes(q) ||
            code.includes(q)
          );
        });
        setClients(filtered);
      } else {
        const res = await apiService.getSavingsCustomers(clientSearch.trim());
        setClients(Array.isArray(res) ? res : []);
      }
    } catch (e) {
      setClients([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap">
          {tabs.map(({ key, label, icon: Icon }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-700 bg-primary-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {active === 'overview' && (
        <Suspense fallback={<div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">Chargement...</div>}>
          <CurrentAccountOverview effectiveBranchId={effectiveBranchId} isBranchLocked={isBranchLocked} />
        </Suspense>
      )}

      {active === 'clients' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Clients</h2>
          {isBranchLocked && (
            <p className="text-xs text-amber-600">Succursale verrouillée — la recherche est limitée aux clients de votre agence.</p>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un client (nom, téléphone, document)"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || clientSearch.trim().length < 2}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300"
            >
              {searching ? 'Recherche...' : 'Chercher'}
            </button>
            <button
              onClick={() => navigate('/clients/new?from=current-accounts')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Client
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">Aucun résultat</td>
                  </tr>
                ) : (
                  clients.map((c: any) => (
                    <tr key={c.id || c.Id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">{c.fullName || c.name}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{c.primaryPhone || c.phone}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{c.documentType ? `${c.documentType}: ${c.documentNumber}` : ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {active === 'accounts' && (
        <Suspense fallback={<div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">Chargement des comptes...</div>}>
          <CurrentAccountManagement showTabs={false} effectiveBranchId={effectiveBranchId} isBranchLocked={isBranchLocked} />
        </Suspense>
      )}

      {active === 'transactions' && (
        <Suspense fallback={<div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">Chargement des transactions...</div>}>
          <CurrentAccountTransactions effectiveBranchId={effectiveBranchId} isBranchLocked={isBranchLocked} />
        </Suspense>
      )}
    </div>
  );
};

export default CurrentAccounts;
