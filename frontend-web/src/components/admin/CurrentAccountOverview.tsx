import React, { useEffect, useMemo, useState } from 'react';
import { Wallet, DollarSign, Plus, Users, CreditCard, TrendingUp } from 'lucide-react';
import apiService from '../../services/apiService';
import { AccountType, ClientAccount } from '../../types/clientAccounts';
import { useSearchParams } from 'react-router-dom';

interface CurrencyBreakdown {
  htg: { accounts: number; balance: number; percentage: number };
  usd: { accounts: number; balance: number; percentage: number };
} 

interface CurrentAccountOverviewProps {
  effectiveBranchId?: number | string;
  isBranchLocked?: boolean;
}

const CurrentAccountOverview: React.FC<CurrentAccountOverviewProps> = ({ effectiveBranchId, isBranchLocked }) => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [currencyBreakdown, setCurrencyBreakdown] = useState<CurrencyBreakdown>({
    htg: { accounts: 0, balance: 0, percentage: 0 },
    usd: { accounts: 0, balance: 0, percentage: 0 }
  });
  const [params, setParams] = useSearchParams();

  const normalizedBranchId = useMemo(() => {
    if (effectiveBranchId == null) return undefined;
    const parsed = Number(effectiveBranchId);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [effectiveBranchId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await apiService.getClientAccounts({
          accountType: AccountType.CURRENT,
          ...(normalizedBranchId != null ? { branchId: normalizedBranchId } : {}),
        });
        // Filter for CURRENT accounts client-side as a safety net in case backend ignores filter
        const currentAccounts = (list || []).filter((account: ClientAccount) => account.accountType === AccountType.CURRENT);
        setAccounts(currentAccounts);
        const totalBalance = currentAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0);
        const htgAccounts = currentAccounts.filter((a: any) => (String(a.currency || '').toUpperCase() === 'HTG' || a.currency === 0 || String(a.currency) === '0'));
        const usdAccounts = currentAccounts.filter((a: any) => (String(a.currency || '').toUpperCase() === 'USD' || a.currency === 1 || String(a.currency) === '1'));
        const htgBalance = htgAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0);
        const usdBalance = usdAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0);
        const htgPct = totalBalance > 0 ? (htgBalance / totalBalance * 100) : 0;
        const usdPct = totalBalance > 0 ? (usdBalance / totalBalance * 100) : 0;
        setCurrencyBreakdown({
          htg: { accounts: htgAccounts.length, balance: htgBalance, percentage: htgPct },
          usd: { accounts: usdAccounts.length, balance: usdBalance, percentage: usdPct }
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [normalizedBranchId]);

  const formatCurrency = (amount: number, currency: string = 'HTG') => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount) + ' ' + currency;
  };

  const goTab = (tab: 'clients' | 'accounts' | 'transactions') => {
    const next: Record<string, string> = { tab };
    const acc = params.get('account');
    if (acc) next.account = acc;
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vue d'ensemble - Comptes Courants</h1>
        <p className="text-gray-600 mt-1">Résumé des comptes courants, par devise et actions rapides</p>
        {isBranchLocked && (
          <p className="text-xs font-medium text-amber-600 mt-1">Succursale verrouillée — vous voyez uniquement les comptes de votre agence.</p>
        )}
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des comptes...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {/* Comptes Courants HTG */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Comptes Courants HTG</p>
                  <p className="text-2xl font-bold text-gray-900">{currencyBreakdown.htg.accounts}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Comptes Courants USD */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Comptes Courants USD</p>
                  <p className="text-2xl font-bold text-gray-900">{currencyBreakdown.usd.accounts}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Wallet className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Solde total HTG */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Solde Total HTG</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(currencyBreakdown.htg.balance, 'HTG')}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Solde total USD */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Solde Total USD</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(currencyBreakdown.usd.balance, 'USD')}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Total Comptes */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Comptes</p>
                  <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Taux de dominance HTG */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">HTG Dominance</p>
                  <p className="text-2xl font-bold text-blue-700">{currencyBreakdown.htg.percentage.toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Currency Breakdown */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
              Répartition par Devise
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* HTG */}
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      HTG
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Gourde Haïtienne</p>
                      <p className="text-xs text-gray-500">{currencyBreakdown.htg.accounts} comptes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{currencyBreakdown.htg.percentage.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500" style={{ width: `${currencyBreakdown.htg.percentage}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Solde total</span>
                  <span className="font-bold text-blue-600">{formatCurrency(currencyBreakdown.htg.balance, 'HTG')}</span>
                </div>
              </div>

              {/* USD */}
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      USD
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Dollar Américain</p>
                      <p className="text-xs text-gray-500">{currencyBreakdown.usd.accounts} comptes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{currencyBreakdown.usd.percentage.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500" style={{ width: `${currencyBreakdown.usd.percentage}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Solde total</span>
                  <span className="font-bold text-green-600">{formatCurrency(currencyBreakdown.usd.balance, 'USD')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => goTab('clients')}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Users className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Rechercher Client</span>
              </button>
              <button
                onClick={() => goTab('accounts')}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
              >
                <Plus className="h-8 w-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Ouvrir Compte</span>
              </button>
              <button
                onClick={() => goTab('transactions')}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Transactions</span>
              </button>
              <button
                onClick={() => goTab('accounts')}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                <CreditCard className="h-8 w-8 text-indigo-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Gérer Comptes</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CurrentAccountOverview;
