import React from 'react';
import { Wallet } from 'lucide-react';
import AccountManagement from './AccountManagement';

const SavingsAccountManagement: React.FC = () => {
  return (
    <div className="space-y-6 accounts-contrast-fix">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Gestion des Comptes d'Épargne</h2>
          <p className="text-black mt-1">Ouvrir et gérer les comptes d'épargne</p>
        </div>
      </div>

      {/* Content */}
      <AccountManagement branches={[]} />
    </div>
  );
};

export default SavingsAccountManagement;