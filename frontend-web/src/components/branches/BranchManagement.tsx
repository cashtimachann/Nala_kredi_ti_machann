import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Eye, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Clock, 
  DollarSign,
  Power,
  PowerOff,
  History,
  UserCheck,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Branch, BranchStatus } from '../../types/branch';
import apiService from '../../services/apiService';
import BranchForm from './BranchForm';
import BranchDetailsModal from './BranchDetailsModal';

interface BranchManagementProps {}

const BranchManagement: React.FC<BranchManagementProps> = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BranchStatus | 'all'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsBranch, setDetailsBranch] = useState<Branch | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Sort state
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'department' | 'openingDate'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadBranches();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const branchData = await apiService.getAllBranches();
      setBranches(branchData);
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Erreur lors du chargement des succursales');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = () => {
    setSelectedBranch(null);
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleViewDetails = (branch: Branch) => {
    setDetailsBranch(branch);
    setShowDetailsModal(true);
  };

  const handleDeleteBranch = async (branchId: number) => {
    try {
      await apiService.deleteBranch(branchId);
      setBranches(branches.filter(b => b.id !== branchId));
      toast.success('Succursale supprimée avec succès');
      setShowDeleteConfirm(null);
    } catch (error: any) {
      console.error('Error deleting branch:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleToggleBranchStatus = async (branch: Branch) => {
    try {
      if (branch.status === BranchStatus.Active) {
        await apiService.deactivateBranch(branch.id);
        toast.success('Succursale désactivée');
      } else {
        await apiService.activateBranch(branch.id);
        toast.success('Succursale activée');
      }
      await loadBranches();
    } catch (error: any) {
      console.error('Error toggling branch status:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la modification du statut');
    }
  };

  const handleBranchSaved = async (savedBranch: Branch) => {
    // Reload all branches from API to ensure we have the latest data
    await loadBranches();
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const filteredBranches = branches.filter(branch => {
    const matchesSearch = 
      (branch.name && branch.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      (branch.code && branch.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      (branch.commune && branch.commune.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      (branch.department && branch.department.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || branch.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Sort logic
  const sortedBranches = [...filteredBranches].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'code':
        comparison = a.code.localeCompare(b.code);
        break;
      case 'department':
        comparison = a.department.localeCompare(b.department);
        break;
      case 'openingDate':
        comparison = new Date(a.openingDate).getTime() - new Date(b.openingDate).getTime();
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedBranches.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedBranches = sortedBranches.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter]);

  const getStatusBadge = (status: BranchStatus) => {
    const configs = {
      [BranchStatus.Active]: { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        label: 'Active' 
      },
      [BranchStatus.Inactive]: { 
        bg: 'bg-red-100', 
        text: 'text-red-800', 
        label: 'Inactive' 
      },
      [BranchStatus.UnderConstruction]: { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800', 
        label: 'En construction' 
      }
    };
    
    const config = configs[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatCurrency = (amount: number, currency: string = 'HTG') => {
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
    
    return currency === 'USD' ? `$ ${formatted}` : `${formatted} HTG`;
  };

  const exportToCSV = () => {
    const headers = [
      'Nom',
      'Code',
      'Département',
      'Commune',
      'Adresse',
      'Email',
      'Téléphone',
      'Statut',
      'Date Ouverture',
      'Max Employés',
      'Limite Retrait (HTG)',
      'Limite Dépôt (HTG)',
      'Crédit Max (HTG)',
      'Réserve HTG',
      'Réserve USD'
    ];

    const rows = sortedBranches.map(branch => [
      branch.name,
      branch.code,
      branch.department,
      branch.commune,
      branch.address,
      branch.email,
      branch.phones[0] || '',
      branch.status,
      new Date(branch.openingDate).toLocaleDateString('fr-FR'),
      branch.maxEmployees,
      branch.limits.dailyWithdrawalLimit,
      branch.limits.dailyDepositLimit,
      branch.limits.maxLocalCreditApproval,
      branch.limits.minCashReserveHTG,
      branch.limits.minCashReserveUSD
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `succursales_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${sortedBranches.length} succursales exportées en CSV`);
  };

  const exportToPDF = () => {
    try {
      // Create printable content
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Impossible d\'ouvrir la fenêtre d\'impression');
        return;
      }

      const today = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Liste des Succursales - Nala Kredi</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
            .header h1 { color: #2563eb; font-size: 28px; margin-bottom: 10px; }
            .header p { color: #666; font-size: 14px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; }
            .meta div { font-size: 13px; }
            .meta strong { color: #1f2937; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            thead { background: #2563eb; color: white; }
            th, td { padding: 10px; text-align: left; border: 1px solid #e5e7eb; }
            th { font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
            tbody tr:nth-child(even) { background: #f9fafb; }
            tbody tr:hover { background: #f3f4f6; }
            .status-active { color: #059669; font-weight: 600; }
            .status-inactive { color: #dc2626; font-weight: 600; }
            .status-construction { color: #d97706; font-weight: 600; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #6b7280; padding-top: 20px; border-top: 1px solid #e5e7eb; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .summary-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; text-align: center; }
            .summary-card h3 { font-size: 24px; margin-bottom: 5px; }
            .summary-card p { font-size: 12px; opacity: 0.9; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📍 NALA KREDI - Liste des Succursales</h1>
            <p>Rapport généré le ${today}</p>
          </div>

          <div class="summary">
            <div class="summary-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <h3>${branches.length}</h3>
              <p>Total Succursales</p>
            </div>
            <div class="summary-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
              <h3>${branches.filter(b => b.status === BranchStatus.Active).length}</h3>
              <p>Actives</p>
            </div>
            <div class="summary-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
              <h3>${branches.filter(b => b.status === BranchStatus.Inactive).length}</h3>
              <p>Inactives</p>
            </div>
            <div class="summary-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
              <h3>${branches.filter(b => b.status === BranchStatus.UnderConstruction).length}</h3>
              <p>En Construction</p>
            </div>
          </div>

          <div class="meta">
            <div><strong>Filtres appliqués:</strong> ${statusFilter === 'all' ? 'Tous les statuts' : statusFilter}</div>
            <div><strong>Tri:</strong> Par ${sortBy === 'name' ? 'Nom' : sortBy === 'code' ? 'Code' : sortBy === 'department' ? 'Département' : 'Date'} (${sortOrder === 'asc' ? 'Croissant' : 'Décroissant'})</div>
            <div><strong>Résultats:</strong> ${sortedBranches.length} succursale(s)</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%">#</th>
                <th style="width: 15%">Nom</th>
                <th style="width: 8%">Code</th>
                <th style="width: 12%">Localisation</th>
                <th style="width: 12%">Contact</th>
                <th style="width: 8%">Statut</th>
                <th style="width: 10%">Date Ouverture</th>
                <th style="width: 15%">Limites Financières</th>
                <th style="width: 15%">Horaires</th>
              </tr>
            </thead>
            <tbody>
              ${sortedBranches.map((branch, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${branch.name}</strong></td>
                  <td>${branch.code}</td>
                  <td>
                    <div>${branch.commune}</div>
                    <div style="color: #6b7280; font-size: 10px;">${branch.department}</div>
                  </td>
                  <td>
                    <div style="font-size: 10px;">${branch.email}</div>
                    <div style="color: #6b7280; font-size: 10px;">${branch.phones[0] || 'N/A'}</div>
                  </td>
                  <td class="status-${branch.status === BranchStatus.Active ? 'active' : branch.status === BranchStatus.Inactive ? 'inactive' : 'construction'}">
                    ${branch.status === BranchStatus.Active ? '✓ Active' : branch.status === BranchStatus.Inactive ? '✗ Inactive' : '🔨 Construction'}
                  </td>
                  <td>${new Date(branch.openingDate).toLocaleDateString('fr-FR')}</td>
                  <td style="font-size: 10px;">
                    <div>Retrait: ${formatCurrency(branch.limits.dailyWithdrawalLimit)}</div>
                    <div>Dépôt: ${formatCurrency(branch.limits.dailyDepositLimit)}</div>
                    <div>Crédit: ${formatCurrency(branch.limits.maxLocalCreditApproval)}</div>
                  </td>
                  <td style="font-size: 10px;">
                    <div>${branch.operatingHours.openTime} - ${branch.operatingHours.closeTime}</div>
                    <div style="color: #6b7280;">Max: ${branch.maxEmployees} employés</div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p><strong>NALA KREDI</strong> - Système de Gestion des Microcrédits</p>
            <p>Document confidentiel - Usage interne uniquement</p>
          </div>

          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="background: #2563eb; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
              🖨️ Imprimer / Sauvegarder en PDF
            </button>
            <button onclick="window.close()" style="background: #6b7280; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; margin-left: 10px;">
              ✕ Fermer
            </button>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      
      toast.success('Document PDF prêt à imprimer');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <div className="h-12 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-12 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-12 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
          <div className="h-12 bg-gray-200 rounded-lg w-64 animate-pulse"></div>
        </div>

        {/* Statistics Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        {/* List Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
                    <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-10 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Succursales</h2>
          <p className="text-gray-600 mt-1">
            Gérez les succursales, leurs limites et paramètres opérationnels
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <button
            onClick={exportToCSV}
            disabled={sortedBranches.length === 0}
            className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exporter en CSV"
          >
            <Download className="h-5 w-5" />
            <span>CSV</span>
          </button>
          <button
            onClick={exportToPDF}
            disabled={sortedBranches.length === 0}
            className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exporter en PDF"
          >
            <FileText className="h-5 w-5" />
            <span>PDF</span>
          </button>
          <button
            onClick={handleCreateBranch}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nouvelle Succursale</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, code, commune, département..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BranchStatus | 'all')}
            className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">Tous les statuts</option>
            <option value={BranchStatus.Active}>Active</option>
            <option value={BranchStatus.Inactive}>Inactive</option>
            <option value={BranchStatus.UnderConstruction}>En construction</option>
          </select>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg">
          <span className="text-sm text-gray-600">Trier par:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border-0 focus:ring-0 bg-transparent"
          >
            <option value="name">Nom</option>
            <option value="code">Code</option>
            <option value="department">Département</option>
            <option value="openingDate">Date ouverture</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
          >
            {sortOrder === 'asc' ? (
              <ArrowUp className="h-4 w-4 text-gray-600" />
            ) : (
              <ArrowDown className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Succursales</p>
              <p className="text-2xl font-bold text-gray-900">{branches.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Succursales Actives</p>
              <p className="text-2xl font-bold text-green-600">
                {branches.filter(b => b.status === BranchStatus.Active).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Power className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Succursales Inactives</p>
              <p className="text-2xl font-bold text-red-600">
                {branches.filter(b => b.status === BranchStatus.Inactive).length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <PowerOff className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Construction</p>
              <p className="text-2xl font-bold text-yellow-600">
                {branches.filter(b => b.status === BranchStatus.UnderConstruction).length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Branches List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {paginatedBranches.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune succursale trouvée</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Essayez de modifier vos critères de recherche.'
                : 'Commencez par créer votre première succursale.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paginatedBranches.map((branch) => (
              <div key={branch.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">{branch.name}</h3>
                      <span className="text-sm text-gray-500">({branch.code})</span>
                      {getStatusBadge(branch.status)}
                    </div>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">{branch.commune}, {branch.department}</div>
                          <div className="text-xs text-gray-500">{branch.address}</div>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">{branch.phones[0]}</div>
                          {branch.phones.length > 1 && (
                            <div className="text-xs text-gray-500">+{branch.phones.length - 1} autres</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        <div className="font-medium">{branch.email}</div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">Max {branch.maxEmployees} employés</div>
                          {branch.managerName && (
                            <div className="text-xs text-gray-500">Resp: {branch.managerName}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {branch.operatingHours.openTime} - {branch.operatingHours.closeTime}
                          </div>
                          <div className="text-xs text-gray-500">
                            Fermé: {branch.operatingHours.closedDays.length} jour(s)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            Retrait: {formatCurrency(branch.limits.dailyWithdrawalLimit)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Dépôt: {formatCurrency(branch.limits.dailyDepositLimit)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            Crédit: {formatCurrency(branch.limits.maxLocalCreditApproval)}
                          </div>
                          <div className="text-xs text-gray-500">Limite locale</div>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {formatCurrency(branch.limits.minCashReserveHTG)} / {formatCurrency(branch.limits.minCashReserveUSD, 'USD')}
                          </div>
                          <div className="text-xs text-gray-500">Réserves min</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative ml-4">
                    <div className="flex items-center space-x-2">
                      {/* View Details Button */}
                      <button
                        onClick={() => handleViewDetails(branch)}
                        className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                        title="Voir détails"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Quick Status Toggle */}
                      <button
                        onClick={() => handleToggleBranchStatus(branch)}
                        className={`p-2 rounded-lg transition-colors ${
                          branch.status === BranchStatus.Active
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                        title={branch.status === BranchStatus.Active ? 'Désactiver' : 'Activer'}
                      >
                        {branch.status === BranchStatus.Active ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleEditBranch(branch)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => setShowDeleteConfirm(branch.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {filteredBranches.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700">
                Affichage de {startIndex + 1} à {Math.min(endIndex, sortedBranches.length)} sur {sortedBranches.length} résultats
              </div>
              
              <div className="flex items-center gap-4">
                {/* Page Size Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Afficher:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Pagination Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    title="Première page"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Préc
                  </button>
                  
                  <div className="px-3 py-1 text-sm text-gray-700">
                    Page {currentPage} / {totalPages}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Suiv
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    title="Dernière page"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Branch Details Modal */}
      <BranchDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setDetailsBranch(null);
        }}
        branch={detailsBranch}
      />

      {/* Branch Form Modal */}
      <BranchForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedBranch(null);
          setIsEditing(false);
        }}
        onSave={handleBranchSaved}
        branch={selectedBranch}
        isEditing={isEditing}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Supprimer la succursale
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer cette succursale ? Cette action est irréversible.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteBranch(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManagement;