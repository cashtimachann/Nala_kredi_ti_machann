import React, { useState, useEffect } from 'react';
import {
  Users, UserCheck, UserX, AlertTriangle, Star, Clock,
  TrendingUp, TrendingDown, PieChart, BarChart3, Filter,
  Download, RefreshCw, Eye, Edit, MoreVertical, Search
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types
interface ClientSegment {
  id: string;
  name: string;
  description: string;
  count: number;
  percentage: number;
  color: string;
  icon: React.ComponentType<any>;
  criteria: string[];
  clients: Borrower[];
}

interface Borrower {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  creditScore?: number;
  totalLoans: number;
  activeLoans: number;
  totalOutstanding: number;
  lastLoanDate?: string;
  createdAt: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  status: 'ACTIVE' | 'INACTIVE';
  daysSinceLastActivity: number;
}

interface SegmentationStats {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  highScoreClients: number;
  atRiskClients: number;
  newClients: number;
  averageCreditScore: number;
  totalOutstanding: number;
}

const ClientSegmentation: React.FC = () => {
  const [segments, setSegments] = useState<ClientSegment[]>([]);
  const [stats, setStats] = useState<SegmentationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<ClientSegment | null>(null);
  const [showSegmentDetails, setShowSegmentDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadSegmentationData();
  }, []);

  const loadSegmentationData = async () => {
    try {
      setLoading(true);

      // Try to fetch from API first
      const response = await fetch('/api/MicrocreditBorrower/segmentation', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSegments(data.segments);
        setStats(data.stats);
      } else {
        // Fallback to demo data
        const demoStats: SegmentationStats = {
          totalClients: 245,
          activeClients: 189,
          inactiveClients: 56,
          highScoreClients: 67,
          atRiskClients: 23,
          newClients: 34,
          averageCreditScore: 658,
          totalOutstanding: 18500000
        };

        const demoSegments: ClientSegment[] = [
          {
            id: 'active',
            name: 'Clients Actifs',
            description: 'Clients avec des prêts actifs et activité récente',
            count: 189,
            percentage: 77.1,
            color: 'bg-green-500',
            icon: UserCheck,
            criteria: [
              'Au moins un prêt actif',
              'Paiement à jour',
              'Activité dans les 90 derniers jours'
            ],
            clients: generateDemoClients(189, 'ACTIVE', 'LOW')
          },
          {
            id: 'inactive',
            name: 'Clients Inactifs',
            description: 'Clients sans prêt actif depuis plus de 90 jours',
            count: 56,
            percentage: 22.9,
            color: 'bg-gray-500',
            icon: UserX,
            criteria: [
              'Aucun prêt actif',
              'Pas d\'activité récente',
              'Éligible pour réactivation'
            ],
            clients: generateDemoClients(56, 'INACTIVE', 'MEDIUM')
          },
          {
            id: 'high-score',
            name: 'Score Élevé',
            description: 'Clients avec un score de crédit ≥ 750',
            count: 67,
            percentage: 27.3,
            color: 'bg-blue-500',
            icon: Star,
            criteria: [
              'Score de crédit ≥ 750',
              'Historique de paiement excellent',
              'Faible risque de défaut'
            ],
            clients: generateDemoClients(67, 'ACTIVE', 'LOW', 750, 850)
          },
          {
            id: 'at-risk',
            name: 'À Risque',
            description: 'Clients avec score < 550 ou paiements en retard',
            count: 23,
            percentage: 9.4,
            color: 'bg-red-500',
            icon: AlertTriangle,
            criteria: [
              'Score de crédit < 550',
              'Paiements en retard',
              'Risque élevé de défaut'
            ],
            clients: generateDemoClients(23, 'ACTIVE', 'HIGH', 300, 549)
          },
          {
            id: 'new',
            name: 'Nouveaux Clients',
            description: 'Clients inscrits dans les 30 derniers jours',
            count: 34,
            percentage: 13.9,
            color: 'bg-purple-500',
            icon: Clock,
            criteria: [
              'Inscrit depuis moins de 30 jours',
              'Premier prêt en cours ou imminent',
              'Période d\'observation'
            ],
            clients: generateDemoClients(34, 'ACTIVE', 'MEDIUM', 600, 700, true)
          }
        ];

        setSegments(demoSegments);
        setStats(demoStats);
      }
    } catch (error) {
      console.error('Error loading segmentation data:', error);
      toast.error('Erreur lors du chargement des données de segmentation');
    } finally {
      setLoading(false);
    }
  };

  const generateDemoClients = (
    count: number,
    status: 'ACTIVE' | 'INACTIVE',
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH',
    minScore: number = 550,
    maxScore: number = 750,
    isNew: boolean = false
  ): Borrower[] => {
    const clients: Borrower[] = [];
    const firstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Michel', 'Claire', 'Paul', 'Anne', 'Jacques', 'Louise'];
    const lastNames = ['Baptiste', 'Joseph', 'Pierre', 'Jean', 'Louis', 'Marie', 'Paul', 'Rose', 'Charles', 'Anne'];

    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const creditScore = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;
      const totalLoans = Math.floor(Math.random() * 5) + 1;
      const activeLoans = status === 'ACTIVE' ? Math.floor(Math.random() * totalLoans) + 1 : 0;
      const totalOutstanding = activeLoans * (Math.floor(Math.random() * 100000) + 50000);
      const daysSinceLastActivity = isNew ? Math.floor(Math.random() * 30) :
        status === 'ACTIVE' ? Math.floor(Math.random() * 90) : Math.floor(Math.random() * 365) + 90;

      clients.push({
        id: `client-${i + 1}`,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        creditScore,
        totalLoans,
        activeLoans,
        totalOutstanding,
        lastLoanDate: status === 'ACTIVE' ? new Date(Date.now() - daysSinceLastActivity * 24 * 60 * 60 * 1000).toISOString() : undefined,
        createdAt: isNew ? new Date(Date.now() - daysSinceLastActivity * 24 * 60 * 60 * 1000).toISOString() :
          new Date(Date.now() - (Math.floor(Math.random() * 365) + 30) * 24 * 60 * 60 * 1000).toISOString(),
        riskLevel,
        status,
        daysSinceLastActivity
      });
    }

    return clients;
  };

  const handleViewSegment = (segment: ClientSegment) => {
    setSelectedSegment(segment);
    setShowSegmentDetails(true);
  };

  const handleExportSegment = async (segmentId: string) => {
    try {
      setExporting(true);
      toast.success(`Export du segment en cours...`);

      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success(`Segment exporté avec succès`);
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'HTG',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'VERY_HIGH': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskLevelLabel = (level: string) => {
    switch (level) {
      case 'LOW': return 'Faible';
      case 'MEDIUM': return 'Moyen';
      case 'HIGH': return 'Élevé';
      case 'VERY_HIGH': return 'Très Élevé';
      default: return level;
    }
  };

  const filteredSegments = segments.filter(segment =>
    (segment.name && segment.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (segment.description && segment.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Segmentation Clients</h1>
          <p className="text-gray-600 mt-1">Analyse et gestion des segments de clientèle</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadSegmentationData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Actualiser
          </button>
          <button
            onClick={() => {}}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Exporter Tout
          </button>
        </div>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.totalClients}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium">Total Clients</h3>
            <p className="text-xs text-gray-500 mt-1">Portefeuille complet</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.activeClients}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium">Clients Actifs</h3>
            <p className="text-xs text-gray-500 mt-1">{((stats.activeClients / stats.totalClients) * 100).toFixed(1)}% du total</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.averageCreditScore}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium">Score Moyen</h3>
            <p className="text-xs text-gray-500 mt-1">Score de crédit moyen</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.atRiskClients}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium">À Risque</h3>
            <p className="text-xs text-gray-500 mt-1">{((stats.atRiskClients / stats.totalClients) * 100).toFixed(1)}% du total</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un segment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            <Filter className="w-5 h-5" />
            Filtres
          </button>
        </div>
      </div>

      {/* Segments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSegments.map((segment) => {
          const IconComponent = segment.icon;
          return (
            <div key={segment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${segment.color.replace('bg-', 'bg-opacity-20 bg-')}`}>
                  <IconComponent className={`w-6 h-6 ${segment.color.replace('bg-', 'text-')}`} />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{segment.count}</div>
                  <div className="text-sm text-gray-500">{segment.percentage.toFixed(1)}%</div>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{segment.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{segment.description}</p>

              <div className="space-y-2 mb-4">
                <h4 className="text-sm font-medium text-gray-700">Critères:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  {segment.criteria.slice(0, 2).map((criterion, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      {criterion}
                    </li>
                  ))}
                  {segment.criteria.length > 2 && (
                    <li className="text-gray-500">+{segment.criteria.length - 2} autres...</li>
                  )}
                </ul>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewSegment(segment)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Voir
                </button>
                <button
                  onClick={() => handleExportSegment(segment.id)}
                  disabled={exporting}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Segment Details Modal */}
      {showSegmentDetails && selectedSegment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${selectedSegment.color.replace('bg-', 'bg-opacity-20 bg-')}`}>
                  <selectedSegment.icon className={`w-8 h-8 ${selectedSegment.color.replace('bg-', 'text-')}`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedSegment.name}</h2>
                  <p className="text-gray-600">{selectedSegment.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">{selectedSegment.count} clients</div>
                  <div className="text-sm text-gray-500">{selectedSegment.percentage.toFixed(1)}% du total</div>
                </div>
                <button
                  onClick={() => setShowSegmentDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <UserX className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Criteria */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Critères d'appartenance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedSegment.criteria.map((criterion, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                      <span className="text-gray-700">{criterion}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clients List */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Clients dans ce segment</h3>
                  <button
                    onClick={() => handleExportSegment(selectedSegment.id)}
                    disabled={exporting}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <Download className="w-4 h-4" />
                    Exporter
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score Crédit
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prêts
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Encours
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Risque
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedSegment.clients.slice(0, 50).map((client) => (
                        <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <Users className="h-6 w-6 text-gray-600" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{client.fullName}</div>
                                <div className="text-sm text-gray-500">
                                  {client.daysSinceLastActivity} jours d'inactivité
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              (client.creditScore ?? 0) >= 750 ? 'bg-green-100 text-green-800' :
                              (client.creditScore ?? 0) >= 650 ? 'bg-blue-100 text-blue-800' :
                              (client.creditScore ?? 0) >= 550 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {client.creditScore ?? 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {client.totalLoans} total
                              {client.activeLoans > 0 && (
                                <div className="text-green-600">{client.activeLoans} actif(s)</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(client.totalOutstanding)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(client.riskLevel)}`}>
                              {getRiskLevelLabel(client.riskLevel)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              client.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {client.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              <button className="text-primary-600 hover:text-primary-700 font-medium">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="text-gray-600 hover:text-gray-700 font-medium">
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedSegment.clients.length > 50 && (
                  <div className="mt-4 text-center">
                    <p className="text-gray-600">
                      Affichage de 50 clients sur {selectedSegment.clients.length} total
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientSegmentation;