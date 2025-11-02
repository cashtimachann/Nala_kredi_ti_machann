import React from 'react';

const AccountingDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Comptabilité</h1>
        <p className="text-sm text-gray-600">Gestion financière et comptable</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Revenus du mois</h3>
          <p className="text-2xl font-bold text-gray-900">892,340 HTG</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Dépenses</h3>
          <p className="text-2xl font-bold text-gray-900">156,780 HTG</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Bénéfice net</h3>
          <p className="text-2xl font-bold text-gray-900">735,560 HTG</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Marge</h3>
          <p className="text-2xl font-bold text-gray-900">82.4%</p>
        </div>
      </div>
    </div>
  );
};

export default AccountingDashboard;