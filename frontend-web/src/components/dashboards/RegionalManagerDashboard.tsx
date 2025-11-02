import React from 'react';

const RegionalManagerDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Manager Régional</h1>
        <p className="text-sm text-gray-600">Vue d'ensemble régionale</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Succursales</h3>
          <p className="text-2xl font-bold text-gray-900">12</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Volume régional</h3>
          <p className="text-2xl font-bold text-gray-900">15.2M HTG</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Employés</h3>
          <p className="text-2xl font-bold text-gray-900">96</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Performance</h3>
          <p className="text-2xl font-bold text-gray-900">94%</p>
        </div>
      </div>
    </div>
  );
};

export default RegionalManagerDashboard;