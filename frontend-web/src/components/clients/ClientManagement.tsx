import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Download, Eye, User, Phone, Mail,
  Calendar, MapPin, CreditCard, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, Users, FileText, BarChart3, RefreshCw,
  Edit, Trash2, MoreVertical, Star, Award, Clock, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types
interface Borrower {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  occupation: string;
  monthlyIncome: number;
  employmentType: string;
  creditScore?: number;
  createdAt: string;
  updatedAt: string;
  totalLoans: number;
  activeLoans: number;
  totalOutstanding: number;
  lastLoanDate?: string;
}

interface BorrowerListResponse {
  borrowers: Borrower[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

interface ClientFilters {
  searchTerm: string;
  status: 'ALL' | 'ACTIVE' | 'INACTIVE';
  minCreditScore?: number;
  maxCreditScore?: number;
  registrationFrom?: string;
  registrationTo?: string;
  sortBy: 'CreatedAt' | 'Name' | 'CreditScore';
  sortOrder: 'asc' | 'desc';
}

const ClientManagement: React.FC = () => {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [filteredBorrowers, setFilteredBorrowers] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [filters, setFilters] = useState<ClientFilters>({
    searchTerm: '',
    status: 'ALL',
    sortBy: 'CreatedAt',
    sortOrder: 'desc'
  });

  useEffect(() => {
    loadBorrowers();
  }, [currentPage, pageSize, filters]);

  useEffect(() => {
    setFilteredBorrowers(borrowers);
  }, [borrowers]);

  const loadBorrowers = async () => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      if (filters.searchTerm) queryParams.append('searchTerm', filters.searchTerm);
      if (filters.status !== 'ALL') queryParams.append('status', filters.status.toLowerCase());
      if (filters.minCreditScore) queryParams.append('minCreditScore', filters.minCreditScore.toString());
      if (filters.maxCreditScore) queryParams.append('maxCreditScore', filters.maxCreditScore.toString());
      if (filters.registrationFrom) queryParams.append('registrationFrom', filters.registrationFrom);
      if (filters.registrationTo) queryParams.append('registrationTo', filters.registrationTo);

      const response = await fetch(`/api/MicrocreditBorrower?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data: BorrowerListResponse = await response.json();
        setBorrowers(data.borrowers);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
      } else {
        // Fallback demo data - TODO: Remove in production
        const demoBorrowers: Borrower[] = [];
        setBorrowers(demoBorrowers);
        setTotalCount(demoBorrowers.length);
        setTotalPages(Math.ceil(demoBorrowers.length / pageSize));
      }
    } catch (error) {
      console.error('Error loading borrowers:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    setShowProfile(true);
  };

  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    try {
      setExporting(true);
      toast.success(`Export ${format.toUpperCase()} en cours...`);

      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success(`Export ${format.toUpperCase()} terminé`);
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<ClientFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const getCreditScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 750) return 'text-green-600';
    if (score >= 650) return 'text-blue-600';
    if (score >= 550) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCreditScoreBadge = (score?: number) => {
    if (!score) return <span className="text-gray-500">N/A</span>;

    let color = 'bg-gray-100 text-gray-800';
    let label = 'N/A';

    if (score >= 750) {
      color = 'bg-green-100 text-green-800';
      label = 'Excellent';
    } else if (score >= 650) {
      color = 'bg-blue-100 text-blue-800';
      label = 'Bon';
    } else if (score >= 550) {
      color = 'bg-yellow-100 text-yellow-800';
      label = 'Acceptable';
    } else {
      color = 'bg-red-100 text-red-800';
      label = 'Risqué';
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {score} - {label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'HTG',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Clients</h1>
          <p className="text-gray-600 mt-1">Portefeuille clients et informations détaillées</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filtres
          </button>
          <div className="relative">
            <button
              onClick={() => {}}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-5 h-5" />
              Exporter
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
              <div className="py-1">
                <button
                  onClick={() => handleExport('excel')}
                  disabled={exporting}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Excel
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={exporting}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  PDF
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  CSV
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => {}}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouveau Client
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{totalCount}</span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Total Clients</h3>
          <p className="text-xs text-gray-500 mt-1">Emprunteurs enregistrés</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {borrowers.filter(b => b.activeLoans > 0).length}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Clients Actifs</h3>
          <p className="text-xs text-gray-500 mt-1">Avec prêts en cours</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {borrowers.filter(b => (b.creditScore ?? 0) >= 750).length}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Score Élevé</h3>
          <p className="text-xs text-gray-500 mt-1">Score ≥ 750</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {borrowers.filter(b => (b.creditScore ?? 0) < 550).length}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">À Risque</h3>
          <p className="text-xs text-gray-500 mt-1">Score &lt; 550</p>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recherche
              </label>
              <input
                type="text"
                placeholder="Nom, téléphone..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange({ status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="ALL">Tous</option>
                <option value="ACTIVE">Actif</option>
                <option value="INACTIVE">Inactif</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Score Min
              </label>
              <input
                type="number"
                placeholder="300"
                value={filters.minCreditScore || ''}
                onChange={(e) => handleFilterChange({ minCreditScore: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Score Max
              </label>
              <input
                type="number"
                placeholder="900"
                value={filters.maxCreditScore || ''}
                onChange={(e) => handleFilterChange({ maxCreditScore: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="CreatedAt">Date d'inscription</option>
                <option value="Name">Nom</option>
                <option value="CreditScore">Score de crédit</option>
              </select>

              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange({ sortOrder: e.target.value as any })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="desc">Décroissant</option>
                <option value="asc">Croissant</option>
              </select>
            </div>

            <button
              onClick={() => {
                setFilters({
                  searchTerm: '',
                  status: 'ALL',
                  sortBy: 'CreatedAt',
                  sortOrder: 'desc'
                });
                setCurrentPage(1);
              }}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* Clients Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                  Inscription
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBorrowers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Users className="w-12 h-12 mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Aucun client trouvé</p>
                      <p className="text-sm mt-2">Modifiez vos filtres ou ajoutez un nouveau client</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBorrowers.map((borrower) => (
                  <tr key={borrower.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{borrower.fullName}</div>
                          <div className="text-sm text-gray-500">{borrower.occupation}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getCreditScoreBadge(borrower.creditScore)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>{borrower.totalLoans} total</div>
                        <div className="text-green-600">{borrower.activeLoans} actif(s)</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(borrower.totalOutstanding)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(borrower.createdAt)}</div>
                      {borrower.lastLoanDate && (
                        <div className="text-xs text-gray-500">
                          Dernier prêt: {formatDate(borrower.lastLoanDate)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewProfile(borrower)}
                          className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Profil
                        </button>
                        <button
                          onClick={() => {}}
                          className="text-gray-600 hover:text-gray-700 font-medium flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Modifier
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Affichage de{' '}
                  <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>
                  {' '}à{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, totalCount)}
                  </span>
                  {' '}sur{' '}
                  <span className="font-medium">{totalCount}</span>
                  {' '}résultats
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Précédent</span>
                    ‹
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum > totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === currentPage
                            ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Suivant</span>
                    ›
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Client Profile Modal Placeholder */}
      {showProfile && selectedBorrower && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Profil Client</h2>
              <button
                onClick={() => setShowProfile(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Informations Personnelles</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nom:</span>
                      <span className="font-medium">{selectedBorrower.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date de naissance:</span>
                      <span className="font-medium">{formatDate(selectedBorrower.dateOfBirth)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Genre:</span>
                      <span className="font-medium">{selectedBorrower.gender === 'M' ? 'Masculin' : 'Féminin'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Profession:</span>
                      <span className="font-medium">{selectedBorrower.occupation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenu mensuel:</span>
                      <span className="font-medium">{formatCurrency(selectedBorrower.monthlyIncome)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Statistiques</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Score de crédit:</span>
                      <span className={`font-medium ${getCreditScoreColor(selectedBorrower.creditScore)}`}>
                        {selectedBorrower.creditScore ?? 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total prêts:</span>
                      <span className="font-medium">{selectedBorrower.totalLoans}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prêts actifs:</span>
                      <span className="font-medium text-green-600">{selectedBorrower.activeLoans}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Encours total:</span>
                      <span className="font-medium">{formatCurrency(selectedBorrower.totalOutstanding)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowProfile(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {}}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Voir Profil Complet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;