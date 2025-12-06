import React, { useState, useEffect } from 'react';
import { 
  SavingsAccount, 
  Transaction, 
  TransactionType, 
  TransactionStatus,
  Currency,
  AccountStatement,
  InterestCalculation
} from '../../types/savings';
import TransactionForm from './TransactionForm';

interface AccountDetailsProps {
  account: SavingsAccount;
  onBack: () => void;
  onUpdate: (account: SavingsAccount) => void;
}

const AccountDetails: React.FC<AccountDetailsProps> = ({ account, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'statement'>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType.DEPOSIT | TransactionType.WITHDRAWAL | TransactionType.TRANSFER>(TransactionType.DEPOSIT);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Calculs pour les statistiques
  const monthlyStats = React.useMemo(() => {
    const now = new Date();
    const thisMonth = transactions.filter(t => {
      const txDate = new Date(t.processedAt);
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    const totalDeposits = thisMonth
      .filter(t => t.type === TransactionType.DEPOSIT || t.type === TransactionType.OPENING_DEPOSIT)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalWithdrawals = thisMonth
      .filter(t => t.type === TransactionType.WITHDRAWAL)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalInterest = thisMonth
      .filter(t => t.type === TransactionType.INTEREST)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalDeposits,
      totalWithdrawals,
      totalInterest,
      netChange: totalDeposits - totalWithdrawals + totalInterest,
      transactionCount: thisMonth.length
    };
  }, [transactions]);

  // Calcul d'intérêts simulé
  const interestCalculation: InterestCalculation = {
    period: 'Janvier 2024',
    rate: account.interestRate,
    principal: account.balance - account.accruedInterest,
    interest: account.accruedInterest,
    compound: false
  };

  const formatCurrency = (amount: number, currency: Currency = account.currency) => {
    return new Intl.NumberFormat('fr-HT', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-HT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionTypeColor = (type: TransactionType) => {
    switch (type) {
      case TransactionType.DEPOSIT:
      case TransactionType.OPENING_DEPOSIT:
        return 'text-green-600';
      case TransactionType.WITHDRAWAL:
        return 'text-red-600';
      case TransactionType.INTEREST:
        return 'text-blue-600';
      case TransactionType.FEE:
        return 'text-orange-600';
      case TransactionType.TRANSFER:
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTransactionTypeIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.DEPOSIT:
      case TransactionType.OPENING_DEPOSIT:
        return '↗';
      case TransactionType.WITHDRAWAL:
        return '↙';
      case TransactionType.INTEREST:
        return '💰';
      case TransactionType.FEE:
        return '💳';
      case TransactionType.TRANSFER:
        return '🔁';
      default:
        return '📄';
    }
  };

  const handleTransactionSubmit = async (transactionData: any) => {
    setIsLoading(true);
    try {
      // Simuler l'appel API
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Transaction soumise:', transactionData);
      
      // Simuler l'ajout de la nouvelle transaction
      const newTransaction: Transaction = {
        id: `txn${Date.now()}`,
        accountId: account.id,
        accountNumber: account.accountNumber,
        type: transactionData.type,
        amount: transactionData.amount,
        currency: account.currency,
        balanceBefore: account.balance,
        balanceAfter: transactionData.type === TransactionType.DEPOSIT
          ? account.balance + transactionData.amount
          : account.balance - transactionData.amount,
        description: transactionData.description || `${transactionData.type === TransactionType.DEPOSIT ? 'Dépôt' : transactionData.type === TransactionType.WITHDRAWAL ? 'Retrait' : 'Transfert'} en espèces`,
        reference: `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`,
        processedBy: 'current_user',
        processedByName: 'Utilisateur Actuel',
        branchId: account.branchId,
        branchName: account.branchName,
        status: TransactionStatus.COMPLETED,
        processedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        fees: 0,
        receiptNumber: `RCP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`
      };

      setTransactions(prev => [newTransaction, ...prev]);
      
      // Mettre à jour le solde du compte
      const updatedAccount = {
        ...account,
        balance: newTransaction.balanceAfter,
        availableBalance: newTransaction.balanceAfter,
        lastTransactionDate: newTransaction.processedAt,
        updatedAt: new Date().toISOString()
      };
      
      onUpdate(updatedAccount);
      setShowTransactionForm(false);
      setActiveTab('transactions');
    } catch (error) {
      console.error('Erreur lors de la transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Formulaire de transaction
  if (showTransactionForm) {
    return (
      <TransactionForm
        account={account}
        type={transactionType}
        onSubmit={handleTransactionSubmit}
        onCancel={() => setShowTransactionForm(false)}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Retour à la liste</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Compte {account.accountNumber}</h1>
          <p className="text-gray-600">{account.customer?.fullName}</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setTransactionType(TransactionType.DEPOSIT);
              setShowTransactionForm(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <span>💰</span>
            <span>Dépôt</span>
          </button>
          <button
            onClick={() => {
              setTransactionType(TransactionType.WITHDRAWAL);
              setShowTransactionForm(true);
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
          >
            <span>💸</span>
            <span>Retrait</span>
          </button>
          <button
            onClick={() => {
              setTransactionType(TransactionType.TRANSFER);
              setShowTransactionForm(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>🔁</span>
            <span>Transfert</span>
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
            { id: 'transactions', label: 'Transactions', icon: '📋' },
            { id: 'statement', label: 'Relevé', icon: '📄' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Cartes de statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">Solde Actuel</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(account.balance)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-black">Disponible</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(account.availableBalance)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Intérêts Accumulés</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(account.accruedInterest)}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <span className="text-2xl">📈</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Transactions ce mois</p>
                  <p className="text-2xl font-bold text-gray-900">{monthlyStats.transactionCount}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </div>
          </div>

          {/* Informations du compte et du client */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Informations du compte */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations du Compte</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Numéro de compte:</span>
                  <span className="font-medium">{account.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Devise:</span>
                  <span className="font-medium">{account.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">Statut:</span>
                  <span className={`font-medium px-2 py-1 rounded text-sm ${
                    account.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {account.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date d'ouverture:</span>
                  <span className="font-medium">{formatDate(account.openingDate + 'T00:00:00Z')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">Taux d'intérêt:</span>
                  <span className="font-medium">{(account.interestRate * 100).toFixed(2)}% annuel</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Solde minimum:</span>
                  <span className="font-medium">{formatCurrency(account.minimumBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Succursale:</span>
                  <span className="font-medium">{account.branchName}</span>
                </div>
              </div>
            </div>

            {/* Informations du client */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Client</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nom complet:</span>
                  <span className="font-medium">{account.customer?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date de naissance:</span>
                  <span className="font-medium">{formatDate(account.customer?.dateOfBirth + 'T00:00:00Z' || '')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Téléphone principal:</span>
                  <span className="font-medium">{account.customer?.contact.primaryPhone}</span>
                </div>
                {account.customer?.contact.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{account.customer.contact.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Commune:</span>
                  <span className="font-medium">{account.customer?.address.commune}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Département:</span>
                  <span className="font-medium">{account.customer?.address.department}</span>
                </div>
                <div className="border-t pt-4">
                  <span className="text-gray-600">Adresse:</span>
                  <p className="font-medium mt-1">{account.customer?.address.street}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Limites du compte */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Limites du Compte</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Retrait quotidien</p>
                <p className="font-semibold">{formatCurrency(account.accountLimits.dailyWithdrawalLimit)}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Dépôt quotidien</p>
                <p className="font-semibold">{formatCurrency(account.accountLimits.dailyDepositLimit)}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Retrait mensuel</p>
                <p className="font-semibold">{formatCurrency(account.accountLimits.monthlyWithdrawalLimit)}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Solde maximum</p>
                <p className="font-semibold">{formatCurrency(account.accountLimits.maxBalance)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Historique des Transactions ({transactions.length})
              </h3>
              <div className="flex items-center space-x-4">
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="px-3 py-1 text-sm border border-gray-300 rounded"
                />
                <span className="text-gray-500">à</span>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="px-3 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date / Référence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type / Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Solde Après
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Traité par
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(transaction.processedAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {transaction.reference}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getTransactionTypeIcon(transaction.type)}</span>
                        <div>
                          <div className={`text-sm font-medium ${getTransactionTypeColor(transaction.type)}`}>
                            {transaction.type}
                          </div>
                          <div className="text-xs text-gray-500">
                            {transaction.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-medium ${getTransactionTypeColor(transaction.type)}`}>
                        {transaction.type === TransactionType.WITHDRAWAL || transaction.type === TransactionType.TRANSFER ? '-' : '+'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.balanceAfter)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {transaction.processedByName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {transactions.length === 0 && (
            <div className="text-center py-12">
              <span className="text-4xl">📋</span>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune transaction</h3>
              <p className="mt-1 text-sm text-gray-500">
                Aucune transaction trouvée pour cette période.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'statement' && (
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="text-center">
            <span className="text-4xl">📄</span>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Génération de Relevé</h3>
            <p className="mt-1 text-sm text-gray-500 mb-6">
              Fonctionnalité de génération de relevé de compte en cours de développement.
            </p>
            
            <div className="max-w-md mx-auto space-y-4">
              <div className="flex space-x-4">
                <input
                  type="date"
                  placeholder="Date de début"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="date"
                  placeholder="Date de fin"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  disabled
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Générer PDF
                </button>
                <button
                  disabled
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Envoyer par Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountDetails;