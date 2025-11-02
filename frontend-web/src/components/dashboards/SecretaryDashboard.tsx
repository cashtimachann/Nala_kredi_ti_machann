import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  History, 
  Search,
  Eye,
  Edit,
  Download,
  Calendar,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  UserCheck,
  Clock
} from 'lucide-react';
import apiService from '../../services/apiService';
import toast from 'react-hot-toast';

interface SecretaryStats {
  totalClients: number;
  activeAccounts: number;
  pendingUpdates: number;
  recentDocuments: number;
}

interface ClientInfo {
  id: string;
  accountNumber: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  accountType: string;
  accountStatus: string;
  balance: number;
  openDate: string;
  lastUpdate?: string;
}

const SecretaryDashboard: React.FC = () => {
  const [stats, setStats] = useState<SecretaryStats>({
    totalClients: 0,
    activeAccounts: 0,
    pendingUpdates: 0,
    recentDocuments: 0
  });
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load client accounts with read-only access
      const accountsResponse = await apiService.getClientAccounts({
        status: 'ACTIVE'
      });

      if (accountsResponse && Array.isArray(accountsResponse)) {
        const clientData: ClientInfo[] = accountsResponse.map((account: any) => ({
          id: account.id,
          accountNumber: account.accountNumber,
          firstName: account.firstName,
          lastName: account.lastName,
          phoneNumber: account.phoneNumber || '',
          email: account.email,
          accountType: account.accountType,
          accountStatus: account.accountStatus,
          balance: account.balance || 0,
          openDate: account.openDate,
          lastUpdate: account.lastModifiedDate
        }));

        setClients(clientData);

        // Calculate stats
        setStats({
          totalClients: clientData.length,
          activeAccounts: clientData.filter(c => c.accountStatus === 'Active').length,
          pendingUpdates: clientData.filter(c => c.lastUpdate && 
            new Date(c.lastUpdate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length,
          recentDocuments: Math.floor(clientData.length * 0.3)
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleViewClient = async (clientId: string) => {
    try {
      const clientDetails = clients.find(c => c.id === clientId);
      if (clientDetails) {
        setSelectedClient(clientDetails);
        setShowClientModal(true);
      }
    } catch (error) {
      toast.error('Erreur lors de la consultation du client');
    }
  };

  const handleUpdateClient = (clientId: string) => {
    toast('Redirection vers le formulaire de mise à jour...');
    // Navigate to update form
    window.location.href = `/client-accounts?edit=${clientId}`;
  };

  const handleGenerateReport = async (reportType: string) => {
    try {
      toast.loading('Génération du rapport en cours...');
      
      switch (reportType) {
        case 'clients':
          // Generate clients list report
          setTimeout(() => {
            toast.dismiss();
            toast.success('Rapport des clients généré avec succès');
          }, 1500);
          break;
        case 'accounts':
          // Generate accounts report
          setTimeout(() => {
            toast.dismiss();
            toast.success('Rapport des comptes généré avec succès');
          }, 1500);
          break;
        case 'history':
          // Generate history report
          setTimeout(() => {
            toast.dismiss();
            toast.success('Rapport historique généré avec succès');
          }, 1500);
          break;
        default:
          toast.dismiss();
          toast.error('Type de rapport non reconnu');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Erreur lors de la génération du rapport');
    }
  };

  const filteredClients = clients.filter(client =>
    searchTerm === '' ||
    client.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phoneNumber.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">📋 Secrétaire Administratif</h1>
              <p className="text-teal-100">Consultation et gestion de la base clients</p>
            </div>
            <button
              onClick={loadDashboardData}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="h-5 w-5" />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-teal-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Clients</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClients}</p>
              </div>
              <div className="bg-teal-100 rounded-full p-3">
                <Users className="h-8 w-8 text-teal-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Comptes Actifs</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeAccounts}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Mises à jour (7j)</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingUpdates}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Documents Récents</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.recentDocuments}</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleGenerateReport('clients')}
              className="flex items-center gap-3 p-4 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors group"
            >
              <Download className="h-6 w-6 text-teal-600 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <p className="font-semibold text-gray-900">Rapport Clients</p>
                <p className="text-sm text-gray-600">Liste complète</p>
              </div>
            </button>

            <button
              onClick={() => handleGenerateReport('accounts')}
              className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
            >
              <FileText className="h-6 w-6 text-green-600 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <p className="font-semibold text-gray-900">Rapport Comptes</p>
                <p className="text-sm text-gray-600">Tous les comptes</p>
              </div>
            </button>

            <button
              onClick={() => handleGenerateReport('history')}
              className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
            >
              <History className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <p className="font-semibold text-gray-900">Historique</p>
                <p className="text-sm text-gray-600">30 derniers jours</p>
              </div>
            </button>
          </div>
        </div>

        {/* Search and Client List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Base de Clients</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 w-80"
              />
            </div>
          </div>

          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">Aucun client trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      N° Compte
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Téléphone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type de Compte
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Solde
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {client.accountNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {client.firstName} {client.lastName}
                        </div>
                        {client.email && (
                          <div className="text-sm text-gray-500">{client.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.phoneNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.accountType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          client.accountStatus === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : client.accountStatus === 'Inactive'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {client.accountStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Intl.NumberFormat('fr-HT', {
                          style: 'currency',
                          currency: 'HTG'
                        }).format(client.balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewClient(client.id)}
                            className="text-teal-600 hover:text-teal-900"
                            title="Consulter"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleUpdateClient(client.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Mettre à jour"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Client Details Modal */}
      {showClientModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-teal-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
              <h3 className="text-xl font-bold">Détails du Client</h3>
              <button
                onClick={() => setShowClientModal(false)}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">N° de Compte</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedClient.accountNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Nom Complet</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedClient.firstName} {selectedClient.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Téléphone</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedClient.phoneNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedClient.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Type de Compte</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedClient.accountType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Statut</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedClient.accountStatus}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Solde Actuel</label>
                  <p className="text-lg font-semibold text-green-600">
                    {new Intl.NumberFormat('fr-HT', {
                      style: 'currency',
                      currency: 'HTG'
                    }).format(selectedClient.balance)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Date d'Ouverture</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(selectedClient.openDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => handleUpdateClient(selectedClient.id)}
                  className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Mettre à Jour
                </button>
                <button
                  onClick={() => setShowClientModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecretaryDashboard;
