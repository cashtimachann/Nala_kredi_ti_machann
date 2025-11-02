import React from 'react';

const SystemAdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Administrateur Système</h1>
        <p className="text-sm text-gray-600">Administration et maintenance du système</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Serveurs actifs</h3>
          <p className="text-2xl font-bold text-gray-900">3</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Utilisateurs connectés</h3>
          <p className="text-2xl font-bold text-gray-900">47</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Taille de la DB</h3>
          <p className="text-2xl font-bold text-gray-900">2.4 GB</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Sauvegardes</h3>
          <p className="text-2xl font-bold text-gray-900">Jour</p>
        </div>
      </div>
    </div>
  );
};

export default SystemAdminDashboard;