import React, { useState } from 'react';
import { Plus, User } from 'lucide-react';

const SavingsCustomerForm: React.FC = () => {
  const [showForm, setShowForm] = useState(false);

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        <Plus className="h-4 w-4 mr-2" />
        Nouveau Client
      </button>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-center mb-4">
        <User className="h-5 w-5 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Nouveau Client Épargnant</h3>
      </div>
      <p className="text-gray-500 mb-4">
        Le formulaire complet de création de client sera implémenté prochainement.
      </p>
      <button
        onClick={() => setShowForm(false)}
        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        Fermer
      </button>
    </div>
  );
};

export default SavingsCustomerForm;