import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Transaction {
  id: number;
  type: 'Deposit' | 'Withdrawal' | 'Transfer' | 'CurrencyExchange';
  amount: number;
  currency: 'HTG' | 'USD';
  time: string;
  customer: string;
  status: 'Completed' | 'Pending' | 'Failed';
}

const RecentTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual API call
    setTimeout(() => {
      setTransactions([]);
      setLoading(false);
    }, 1000);
  }, []);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'Deposit':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'Withdrawal':
        return <ArrowDownRight className="w-4 h-4 text-red-600" />;
      default:
        return <DollarSign className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-green-600 bg-green-100';
      case 'Pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'Failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Clock className="w-5 h-5 mr-2" />
        Transactions Récentes
      </h3>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-sm font-medium text-gray-900">Aucune transaction</h3>
          <p className="text-sm text-gray-500">Les transactions récentes apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  {getTransactionIcon(transaction.type)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {transaction.customer}
                  </p>
                  <p className="text-xs text-gray-500">
                    {transaction.type} • {new Date(transaction.time).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {transaction.amount.toLocaleString()} {transaction.currency}
                </p>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                  {transaction.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {transactions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
            Voir toutes les transactions
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentTransactions;