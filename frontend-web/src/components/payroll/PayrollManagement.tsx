import React, { useState } from 'react';
import {
  Users,
  DollarSign,
  FileText,
  TrendingUp,
  Calendar,
  CreditCard,
  BarChart3
} from 'lucide-react';
import EmployeeManagement from './EmployeeManagement';
import PayrollProcessing from './PayrollProcessing';
import SalaryAdvance from './SalaryAdvance';
import PayrollReports from './PayrollReports';

type PayrollView = 'dashboard' | 'employees' | 'processing' | 'advances' | 'reports';

const PayrollManagement: React.FC = () => {
  const [activeView, setActiveView] = useState<PayrollView>('dashboard');

  // Quick stats for dashboard
  const stats = {
    totalEmployees: 8,
    activeEmployees: 8,
    monthlyPayroll: 210800,
    pendingAdvances: 2,
    lastProcessedDate: '2024-10-31'
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-HT').format(amount) + ' HTG';
  };

  // Render content based on active view
  const renderContent = () => {
    if (activeView === 'employees') {
      return <EmployeeManagement />;
    }
    if (activeView === 'processing') {
      return <PayrollProcessing />;
    }
    if (activeView === 'advances') {
      return <SalaryAdvance />;
    }
    if (activeView === 'reports') {
      return <PayrollReports />;
    }
    return renderDashboard();
  };

  // Dashboard view
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestion de la Paie</h1>
        <p className="text-gray-600 mt-1">Tableau de bord et aperçu général</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employés</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalEmployees}</p>
              <p className="text-sm text-green-600 mt-1">
                {stats.activeEmployees} actifs
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Masse Salariale</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.monthlyPayroll / 1000)}K
              </p>
              <p className="text-sm text-blue-600 mt-1">Par mois</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avances en Attente</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.pendingAdvances}</p>
              <p className="text-sm text-yellow-600 mt-1">À traiter</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <CreditCard className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dernière Paie</p>
              <p className="text-lg font-bold text-gray-900 mt-1">31 Oct</p>
              <p className="text-sm text-purple-600 mt-1">Traitée</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveView('employees')}
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Employés</div>
                <div className="text-sm text-gray-600">Gérer les employés</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveView('processing')}
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Traiter Paie</div>
                <div className="text-sm text-gray-600">Calculer et payer</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveView('advances')}
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
                <CreditCard className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Avances</div>
                <div className="text-sm text-gray-600">Gérer les avances</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveView('reports')}
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Rapports</div>
                <div className="text-sm text-gray-600">Consulter les rapports</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activité Récente</h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-3 py-3 border-b border-gray-100">
            <div className="p-2 bg-green-100 rounded-full">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Paie d'octobre traitée</p>
              <p className="text-xs text-gray-500">8 employés payés - {formatCurrency(210800)} - Il y a 1 jour</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 py-3 border-b border-gray-100">
            <div className="p-2 bg-yellow-100 rounded-full">
              <CreditCard className="h-4 w-4 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">2 nouvelles demandes d'avance</p>
              <p className="text-xs text-gray-500">Jacques Hyppolite et Anne Joseph - Il y a 2 jours</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 py-3 border-b border-gray-100">
            <div className="p-2 bg-blue-100 rounded-full">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Nouvel employé ajouté</p>
              <p className="text-xs text-gray-500">Rose Marie Pierre - Agent de Crédit - Il y a 3 jours</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 py-3">
            <div className="p-2 bg-purple-100 rounded-full">
              <FileText className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Déclaration fiscale soumise</p>
              <p className="text-xs text-gray-500">Septembre 2024 - {formatCurrency(21150)} - Il y a 5 jours</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Prochaine Paie: 30 Novembre 2024</p>
          <p className="mt-1">
            Assurez-vous que toutes les informations des employés sont à jour avant le traitement.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Tabs (only show when not on dashboard) */}
      {(activeView === 'employees' || activeView === 'processing' || activeView === 'advances' || activeView === 'reports') && (
        <div className="bg-white border-b border-gray-200 mb-6">
          <div className="px-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveView('dashboard')}
                className="flex items-center space-x-2 py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm transition-colors"
              >
                <BarChart3 className="h-5 w-5" />
                <span>Tableau de bord</span>
              </button>

              <button
                onClick={() => setActiveView('employees')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'employees'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } transition-colors`}
              >
                <Users className="h-5 w-5" />
                <span>Employés</span>
              </button>

              <button
                onClick={() => setActiveView('processing')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'processing'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } transition-colors`}
              >
                <DollarSign className="h-5 w-5" />
                <span>Traitement de Paie</span>
              </button>

              <button
                onClick={() => setActiveView('advances')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'advances'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } transition-colors`}
              >
                <CreditCard className="h-5 w-5" />
                <span>Avances sur Salaire</span>
              </button>

              <button
                onClick={() => setActiveView('reports')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'reports'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } transition-colors`}
              >
                <FileText className="h-5 w-5" />
                <span>Rapports</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default PayrollManagement;
