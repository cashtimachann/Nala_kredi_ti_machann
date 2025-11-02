import React from 'react';
import { Wallet } from 'lucide-react';
import AccountManagement from './AccountManagement';

const SavingsAccountManagement: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gestion des Comptes d'Épargne</h2>
          <p className="text-gray-600 mt-1">Ouvrir et gérer les comptes d'épargne</p>
        </div>
      </div>

      {/* Content */}
      <AccountManagement branches={[]} />
    </div>
  );
};

export default SavingsAccountManagement;