import React, { useState, useEffect, useMemo } from 'react';
import { 
  SavingsAccount, 
  AccountFilters, 
  AccountStatus, 
  Currency, 
  AccountStatistics,
  AccountListResponse,
  IdentityDocumentType
} from '../../types/savings';
import { Branch } from '../../types/branch';
import AccountOpeningForm from './AccountOpeningForm';
import AccountDetails from './AccountDetails';

interface AccountManagementProps {
  branches: Branch[];
}

const AccountManagement: React.FC<AccountManagementProps> = ({ branches }) => {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [statistics, setStatistics] = useState<AccountStatistics>({
    totalAccounts: 0,
    activeAccounts: 0,
    totalBalanceHTG: 0,
    totalBalanceUSD: 0,
    averageBalance: 0,
    accountsByStatus: {
      [AccountStatus.ACTIVE]: 0,
      [AccountStatus.INACTIVE]: 0,
      [AccountStatus.CLOSED]: 0,
      [AccountStatus.SUSPENDED]: 0
    },
    accountsByCurrency: {
      [Currency.HTG]: 0,
      [Currency.USD]: 0
    },
    newAccountsThisMonth: 0,
    dormantAccounts: 0
  });
  const [filters, setFilters] = useState<AccountFilters>({
    search: '',
    currency: '',
    status: '',
    branchId: '',
    dateFrom: '',
    dateTo: '',
    minBalance: undefined,
    maxBalance: undefined
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'accountNumber' | 'balance' | 'openingDate' | 'lastTransactionDate'>('accountNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filtrage et tri des comptes
  const filteredAccounts = useMemo(() => {
    let result = accounts.filter(account => {
      const matchesSearch = 
        filters.search === '' ||
        (account.accountNumber && account.accountNumber.toLowerCase().includes(filters.search.toLowerCase())) ||
        (account.customer?.fullName && account.customer.fullName.toLowerCase().includes(filters.search.toLowerCase())) ||
        (account.customer?.contact?.primaryPhone && account.customer.contact.primaryPhone.includes(filters.search));

      const matchesCurrency = 
        filters.currency === '' || account.currency === filters.currency;

      const matchesStatus = 
        filters.status === '' || account.status === filters.status;

      const matchesBranch = 
        filters.branchId === '' || account.branchId === Number(filters.branchId);

      const matchesDateRange = 
        (!filters.dateFrom || account.openingDate >= filters.dateFrom) &&
        (!filters.dateTo || account.openingDate <= filters.dateTo);

      const matchesBalanceRange = 
        (!filters.minBalance || account.balance >= filters.minBalance) &&
        (!filters.maxBalance || account.balance <= filters.maxBalance);

      return matchesSearch && matchesCurrency && matchesStatus && 
             matchesBranch && matchesDateRange && matchesBalanceRange;
    });

    // Tri
    result.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'accountNumber':
          aValue = a.accountNumber;
          bValue = b.accountNumber;
          break;
        case 'balance':
          aValue = a.balance;
          bValue = b.balance;
          break;
        case 'openingDate':
          aValue = new Date(a.openingDate);
          bValue = new Date(b.openingDate);
          break;
        case 'lastTransactionDate':
          aValue = a.lastTransactionDate ? new Date(a.lastTransactionDate) : new Date(0);
          bValue = b.lastTransactionDate ? new Date(b.lastTransactionDate) : new Date(0);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [accounts, filters, sortBy, sortDirection]);

  // Pagination
  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAccounts.slice(startIndex, startIndex + pageSize);
  }, [filteredAccounts, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAccounts.length / pageSize);

  // Gestionnaires d'événements
  const handleFilterChange = (newFilters: Partial<AccountFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const handleAccountSubmit = async (accountData: any) => {
    setIsLoading(true);
    try {
      // Simuler l'appel API
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Création de compte:', accountData);
      setShowAccountForm(false);
      // Recharger la liste des comptes
    } catch (error) {
      console.error('Erreur lors de la création du compte:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusToggle = async (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    const newStatus = account.status === AccountStatus.ACTIVE 
      ? AccountStatus.INACTIVE 
      : AccountStatus.ACTIVE;

    setAccounts(prev => 
      prev.map(a => 
        a.id === accountId 
          ? { ...a, status: newStatus, updatedAt: new Date().toISOString() }
          : a
      )
    );
  };

  const getStatusColor = (status: AccountStatus) => {
    switch (status) {
      case AccountStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case AccountStatus.INACTIVE:
        return 'bg-yellow-100 text-yellow-800';
      case AccountStatus.SUSPENDED:
        return 'bg-red-100 text-red-800';
      case AccountStatus.CLOSED:
        return 'bg-gray-100 text-black';
      default:
        return 'bg-gray-100 text-black';
    }
  };

  const formatCurrency = (amount: number, currency: Currency) => {
    return new Intl.NumberFormat('fr-HT', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-HT');
  };

  // Vue détaillée d'un compte
  if (selectedAccountId) {
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    if (selectedAccount) {
      return (
        <AccountDetails 
          account={selectedAccount}
          onBack={() => setSelectedAccountId(null)}
          onUpdate={(updatedAccount) => {
            setAccounts(prev => 
              prev.map(a => a.id === updatedAccount.id ? updatedAccount : a)
            );
            setSelectedAccountId(null);
          }}
        />
      );
    }
  }

  // Formulaire d'ouverture de compte
  if (showAccountForm) {
    return (
      <AccountOpeningForm
        onSubmit={handleAccountSubmit}
        onCancel={() => setShowAccountForm(false)}
        branches={branches}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black">Gestion des Comptes d'Épargne</h1>
          <p className="text-black mt-1">
            Gérez les comptes d'épargne, consultez les soldes et effectuez des transactions
          </p>
        </div>
        <button
          onClick={() => setShowAccountForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Ouvrir un Compte</span>
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black">Total Comptes</p>
              <p className="text-3xl font-bold text-black">{statistics.totalAccounts}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-black mt-2">
            {statistics.activeAccounts} actifs
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black">Solde Total HTG</p>
              <p className="text-3xl font-bold text-black">
                {formatCurrency(statistics.totalBalanceHTG, Currency.HTG)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black">Solde Total USD</p>
              <p className="text-3xl font-bold text-black">
                {formatCurrency(statistics.totalBalanceUSD, Currency.USD)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black">Nouveaux ce mois</p>
              <p className="text-3xl font-bold text-black">{statistics.newAccountsThisMonth}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold text-black mb-4">Filtres de Recherche</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Recherche</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              placeholder="Numéro, nom, téléphone..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Devise</label>
            <select
              value={filters.currency}
              onChange={(e) => handleFilterChange({ currency: e.target.value as Currency | '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes les devises</option>
              <option value={Currency.HTG}>HTG</option>
              <option value={Currency.USD}>USD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Statut</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange({ status: e.target.value as AccountStatus | '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les statuts</option>
              <option value={AccountStatus.ACTIVE}>Actif</option>
              <option value={AccountStatus.INACTIVE}>Inactif</option>
              <option value={AccountStatus.SUSPENDED}>Suspendu</option>
              <option value={AccountStatus.CLOSED}>Fermé</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Succursale</label>
            <select
              value={filters.branchId}
              onChange={(e) => handleFilterChange({ branchId: e.target.value ? Number(e.target.value) : '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes les succursales</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Solde minimum</label>
            <input
              type="number"
              value={filters.minBalance || ''}
              onChange={(e) => handleFilterChange({ minBalance: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={() => setFilters({
              search: '',
              currency: '',
              status: '',
              branchId: '',
              dateFrom: '',
              dateTo: '',
              minBalance: undefined,
              maxBalance: undefined
            })}
            className="px-4 py-2 text-black border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Liste des comptes */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-black">
              Comptes d'Épargne ({filteredAccounts.length})
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-black">Trier par:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value as typeof sortBy)}
                className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="accountNumber">Numéro de compte</option>
                <option value="balance">Solde</option>
                <option value="openingDate">Date d'ouverture</option>
                <option value="lastTransactionDate">Dernière transaction</option>
              </select>
              <button
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1 text-black hover:text-black"
              >
                <svg 
                  className={`w-4 h-4 transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Tableau des comptes */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Compte / Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Solde
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Succursale
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Dernière activité
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-black">
                        {account.accountNumber}
                      </div>
                      <div className="text-sm text-black">
                        {account.customer?.fullName}
                      </div>
                      <div className="text-xs text-black">
                        {account.customer?.contact.primaryPhone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-black">
                      {formatCurrency(account.balance, account.currency)}
                    </div>
                    <div className="text-xs text-black">
                      Disponible: {formatCurrency(account.availableBalance, account.currency)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(account.status)}`}>
                      {account.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-black">
                    {account.branchName}
                  </td>
                  <td className="px-6 py-4 text-sm text-black">
                    {account.lastTransactionDate 
                      ? formatDate(account.lastTransactionDate)
                      : 'Aucune transaction'
                    }
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => setSelectedAccountId(account.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Voir détails
                    </button>
                    <button
                      onClick={() => handleStatusToggle(account.id)}
                      className={`${
                        account.status === AccountStatus.ACTIVE 
                          ? 'text-red-600 hover:text-red-900' 
                          : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {account.status === AccountStatus.ACTIVE ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-black">
              Affichage de {((currentPage - 1) * pageSize) + 1} à {Math.min(currentPage * pageSize, filteredAccounts.length)} sur {filteredAccounts.length} comptes
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm border rounded ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          </div>
        )}

        {/* Message si aucun compte trouvé */}
        {filteredAccounts.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-black">Aucun compte trouvé</h3>
            <p className="mt-1 text-sm text-black">
              Aucun compte ne correspond à vos critères de recherche.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountManagement;