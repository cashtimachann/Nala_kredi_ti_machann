import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Shield,
  Mail,
  Phone,
  Calendar,
  Lock,
  Unlock,
  Download,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminAccountCreation from './AdminAccountCreation';
import EditAdminModal from './EditAdminModal';
import { apiService } from '../../services/apiService';
import { unparse } from 'papaparse';

// Types - Aligned with backend AdminTypeDto
enum AdminType {
  CAISSIER = 'CAISSIER',
  SECRETAIRE_ADMINISTRATIF = 'SECRETAIRE_ADMINISTRATIF',
  AGENT_DE_CREDIT = 'AGENT_DE_CREDIT',
  CHEF_DE_SUCCURSALE = 'CHEF_DE_SUCCURSALE',
  DIRECTEUR_REGIONAL = 'DIRECTEUR_REGIONAL',
  ADMINISTRATEUR_SYSTEME = 'ADMINISTRATEUR_SYSTEME',
  DIRECTION_GENERALE = 'DIRECTION_GENERALE',
  COMPTABLE_FINANCE = 'COMPTABLE_FINANCE'
}

enum AdminStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Suspended = 'SUSPENDED'
}

interface AdminAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  adminType: AdminType;
  department: string;
  hireDate: string;
  status: AdminStatus;
  photoUrl?: string;
  assignedBranches?: string[];
  lastLogin?: string;
}

const AdminAccountList: React.FC = () => {
  const [showCreationForm, setShowCreationForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AdminType | 'all'>('all');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<AdminAccount[]>([]);

  // Branches for filtering
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Load accounts from backend
  useEffect(() => {
    loadAccounts();
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await apiService.getAllBranches();
      setBranches(response);
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Erreur lors du chargement des succursales');
    }
  };

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getAllAdmins({
        page: 1,
        pageSize: 100 // Get all accounts
      });
      
      // Map backend AdminDto to AdminAccount
      const mappedAccounts: AdminAccount[] = response.admins.map((admin: any) => {
        // Backend can return AdminType as either number (0-7) or string ('CAISSIER', etc.)
        let adminType = AdminType.CAISSIER; // default
        
        // If it's a string, map directly
        if (typeof admin.adminType === 'string') {
          const adminTypeStr = admin.adminType.toUpperCase();
          switch (adminTypeStr) {
            case 'CAISSIER':
              adminType = AdminType.CAISSIER;
              break;
            case 'SECRETAIRE_ADMINISTRATIF':
              adminType = AdminType.SECRETAIRE_ADMINISTRATIF;
              break;
            case 'AGENT_DE_CREDIT':
              adminType = AdminType.AGENT_DE_CREDIT;
              break;
            case 'CHEF_DE_SUCCURSALE':
              adminType = AdminType.CHEF_DE_SUCCURSALE;
              break;
            case 'DIRECTEUR_REGIONAL':
              adminType = AdminType.DIRECTEUR_REGIONAL;
              break;
            case 'ADMINISTRATEUR_SYSTEME':
              adminType = AdminType.ADMINISTRATEUR_SYSTEME;
              break;
            case 'DIRECTION_GENERALE':
              adminType = AdminType.DIRECTION_GENERALE;
              break;
            case 'COMPTABLE_FINANCE':
              adminType = AdminType.COMPTABLE_FINANCE;
              break;
            default:
              console.warn(`Invalid adminType string "${admin.adminType}" for user ${admin.id}, defaulting to CAISSIER`);
              adminType = AdminType.CAISSIER;
              break;
          }
        } else {
          // If it's a number, use original mapping
          switch (admin.adminType) {
            case 0:
              adminType = AdminType.CAISSIER;
              break;
            case 1:
              adminType = AdminType.SECRETAIRE_ADMINISTRATIF;
              break;
            case 2:
              adminType = AdminType.AGENT_DE_CREDIT;
              break;
            case 3:
              adminType = AdminType.CHEF_DE_SUCCURSALE;
              break;
            case 4:
              adminType = AdminType.DIRECTEUR_REGIONAL;
              break;
            case 5:
              adminType = AdminType.ADMINISTRATEUR_SYSTEME;
              break;
            case 6:
              adminType = AdminType.DIRECTION_GENERALE;
              break;
            case 7:
              adminType = AdminType.COMPTABLE_FINANCE;
              break;
            default:
              console.warn(`Invalid adminType number ${admin.adminType} for user ${admin.id}, defaulting to CAISSIER`);
              adminType = AdminType.CAISSIER;
              break;
          }
        }

        return {
          id: admin.id,
          fullName: admin.fullName,
          email: admin.email,
          phone: admin.phone || '-',
          adminType,
          department: admin.department || 'Non spécifié',
          hireDate: admin.hireDate,
          status: admin.isActive ? AdminStatus.Active : AdminStatus.Inactive,
          assignedBranches: admin.assignedBranches || [],
          lastLogin: admin.lastLogin
        };
      });

      setAccounts(mappedAccounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Erreur lors du chargement des comptes');
    } finally {
      setIsLoading(false);
    }
  };

  const getAdminTypeLabel = (type: AdminType): string => {
    const labels: Record<AdminType, string> = {
      [AdminType.CAISSIER]: 'Caissier',
      [AdminType.SECRETAIRE_ADMINISTRATIF]: 'Secrétaire Administratif',
      [AdminType.AGENT_DE_CREDIT]: 'Agent de Crédit',
      [AdminType.CHEF_DE_SUCCURSALE]: 'Chef de Succursale',
      [AdminType.DIRECTEUR_REGIONAL]: 'Directeur Régional',
      [AdminType.ADMINISTRATEUR_SYSTEME]: 'Administrateur Système',
      [AdminType.DIRECTION_GENERALE]: 'Direction Générale',
      [AdminType.COMPTABLE_FINANCE]: 'Comptable/Finance'
    };
    return labels[type];
  };

  const getStatusBadge = (status: AdminStatus) => {
    const config = {
      [AdminStatus.Active]: { label: 'Actif', class: 'bg-green-100 text-green-800' },
      [AdminStatus.Inactive]: { label: 'Inactif', class: 'bg-gray-100 text-gray-800' },
      [AdminStatus.Suspended]: { label: 'Suspendu', class: 'bg-red-100 text-red-800' }
    };
    const { label, class: className } = config[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
        {label}
      </span>
    );
  };

  const getAdminTypeBadge = (type: AdminType) => {
    const config: Record<AdminType, { class: string }> = {
      [AdminType.CAISSIER]: { class: 'bg-yellow-100 text-yellow-800' },
      [AdminType.SECRETAIRE_ADMINISTRATIF]: { class: 'bg-pink-100 text-pink-800' },
      [AdminType.AGENT_DE_CREDIT]: { class: 'bg-green-100 text-green-800' },
      [AdminType.CHEF_DE_SUCCURSALE]: { class: 'bg-indigo-100 text-indigo-800' },
      [AdminType.DIRECTEUR_REGIONAL]: { class: 'bg-blue-100 text-blue-800' },
      [AdminType.ADMINISTRATEUR_SYSTEME]: { class: 'bg-purple-100 text-purple-800' },
      [AdminType.DIRECTION_GENERALE]: { class: 'bg-red-100 text-red-800' },
      [AdminType.COMPTABLE_FINANCE]: { class: 'bg-orange-100 text-orange-800' }
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config[type].class}`}>
        {getAdminTypeLabel(type)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportCsv = () => {
    try {
      if (!filteredAccounts || filteredAccounts.length === 0) {
        toast.error('Aucune donnée administrateur à exporter');
        return;
      }

      const csvData = filteredAccounts.map(account => ({
        'Nom complet': account.fullName || '',
        'Email': account.email || '',
        'Téléphone': account.phone || '',
        'Type d\'administrateur': getAdminTypeLabel(account.adminType) || '',
        'Département': account.department || '',
        'Date d\'embauche': account.hireDate ? formatDate(account.hireDate) : '',
        'Statut': account.status === AdminStatus.Active ? 'Actif' :
                 account.status === AdminStatus.Inactive ? 'Inactif' : 'Suspendu',
        'Succursales assignées': account.assignedBranches ? account.assignedBranches.join('; ') : '',
        'Dernière connexion': account.lastLogin ? formatDateTime(account.lastLogin) : ''
      }));

      const csv = unparse(csvData, {
        delimiter: ';',
        header: true
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `comptes-administrateurs-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export CSV réussi');
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportPdf = () => {
    try {
      if (!filteredAccounts || filteredAccounts.length === 0) {
        toast.error('Aucune donnée administrateur à exporter');
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Veuillez autoriser les pop-ups pour exporter en PDF');
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Liste des Comptes Administrateurs - Kredi Ti Machann</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              line-height: 1.4;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #2563eb;
              margin: 0;
              font-size: 24px;
            }
            .header p {
              color: #666;
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background-color: #2563eb;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 10px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .status-active {
              color: #059669;
              font-weight: bold;
            }
            .status-inactive {
              color: #6b7280;
              font-weight: bold;
            }
            .status-suspended {
              color: #d97706;
              font-weight: bold;
            }
            @media print {
              body { padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LISTE DES COMPTES ADMINISTRATEURS</h1>
            <p>Kredi Ti Machann - Système de Micro-crédit</p>
            <p>Date d'émission: ${new Date().toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p>Total des comptes: ${filteredAccounts.length}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nom complet</th>
                <th>Type</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Département</th>
                <th>Statut</th>
                <th>Succursales</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAccounts.map(account => `
                <tr>
                  <td><strong>${account.fullName || ''}</strong></td>
                  <td>${getAdminTypeLabel(account.adminType) || ''}</td>
                  <td>${account.email || ''}</td>
                  <td>${account.phone || ''}</td>
                  <td>${account.department || ''}</td>
                  <td>
                    <span class="${
                      account.status === AdminStatus.Active ? 'status-active' :
                      account.status === AdminStatus.Inactive ? 'status-inactive' : 'status-suspended'
                    }">
                      ${account.status === AdminStatus.Active ? 'Actif' :
                        account.status === AdminStatus.Inactive ? 'Inactif' : 'Suspendu'}
                    </span>
                  </td>
                  <td>${account.assignedBranches ? account.assignedBranches.join(', ') : 'Aucune'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p><strong>Kredi Ti Machann</strong> - Système de Micro-crédit pour Haïti</p>
            <p>Document généré automatiquement le ${new Date().toLocaleString('fr-FR')}</p>
            <p class="no-print">
              <button onclick="window.print()" style="
                background: #2563eb;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                margin-top: 10px;
              ">🖨️ Imprimer / Enregistrer en PDF</button>
            </p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          toast.success('Fenêtre d\'export PDF ouverte - Utilisez Ctrl+P ou le bouton Imprimer');
        }, 250);
      };
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch =
      (account.fullName && account.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (account.email && account.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (account.phone && account.phone.includes(searchTerm)) ||
      (account.department && account.department.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || account.status === statusFilter;
    const matchesType = typeFilter === 'all' || account.adminType === typeFilter;
    const matchesBranch = branchFilter === 'all' || 
      (account.assignedBranches && account.assignedBranches.some(branch => branch === branchFilter));

    return matchesSearch && matchesStatus && matchesType && matchesBranch;
  });

  // Pagination logic
  const totalFiltered = filteredAccounts.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  useEffect(() => {
    // If page size or filtered list changes, ensure current page is valid
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginatedAccounts = filteredAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleToggleStatus = async (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    if (actionLoading) return; // Prevent multiple simultaneous actions

    try {
      setActionLoading(accountId);
      const newStatus = account.status === AdminStatus.Active ? false : true;
      
      // Call backend API to update status
      await apiService.updateUserStatus(accountId, newStatus);
      
      // Update local state
      setAccounts(prev =>
        prev.map(acc =>
          acc.id === accountId
            ? {
                ...acc,
                status: newStatus ? AdminStatus.Active : AdminStatus.Inactive
              }
            : acc
        )
      );
      
      toast.success(`Compte ${newStatus ? 'activé' : 'désactivé'} avec succès`);
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la modification du statut';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    if (account.adminType === AdminType.DIRECTION_GENERALE || account.adminType === AdminType.ADMINISTRATEUR_SYSTEME) {
      toast.error('Impossible de supprimer un compte Direction Générale ou Administrateur Système');
      return;
    }

    if (actionLoading) return; // Prevent multiple simultaneous actions

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le compte de ${account.fullName}? Cette action est irréversible.`)) {
      try {
        setActionLoading(accountId);
        
        // Call backend API to delete user
        await apiService.deleteUser(accountId);
        
        // Update local state
        setAccounts(prev => prev.filter(acc => acc.id !== accountId));
        
        toast.success('Compte supprimé avec succès');
      } catch (error: any) {
        console.error('Error deleting user:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la suppression du compte';
        toast.error(errorMessage);
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleEdit = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    setEditingAccount(account);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingAccount(null);
    loadAccounts(); // Reload the accounts list
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditingAccount(null);
  };

  if (showCreationForm) {
    return (
      <AdminAccountCreation
        onSuccess={() => {
          setShowCreationForm(false);
          loadAccounts(); // Reload accounts list
          toast.success('Compte créé avec succès!');
        }}
        onCancel={() => setShowCreationForm(false)}
      />
    );
  }

  return (
    <>
      {/* Edit Modal */}
      {showEditModal && editingAccount && (
        <EditAdminModal
          userId={editingAccount.id}
          currentData={{
            fullName: editingAccount.fullName,
            email: editingAccount.email,
            phone: editingAccount.phone,
            department: editingAccount.department,
            adminType: editingAccount.adminType,
            hireDate: editingAccount.hireDate  // ADD THIS!
          }}
          onSuccess={handleEditSuccess}
          onCancel={handleEditCancel}
        />
      )}

      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Comptes Administrateurs</h2>
          <p className="text-gray-600 mt-1">
            Gérez les accès et permissions des utilisateurs du système
          </p>
        </div>
        <button
          onClick={() => setShowCreationForm(true)}
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nouveau Compte</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Comptes</p>
              <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Actifs</p>
              <p className="text-2xl font-bold text-green-600">
                {accounts.filter(a => a.status === AdminStatus.Active).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Unlock className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inactifs</p>
              <p className="text-2xl font-bold text-gray-600">
                {accounts.filter(a => a.status === AdminStatus.Inactive).length}
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <Lock className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Direction Générale</p>
              <p className="text-2xl font-bold text-red-600">
                {accounts.filter(a => a.adminType === AdminType.DIRECTION_GENERALE).length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AdminStatus | 'all')}
              className="w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value={AdminStatus.Active}>Actifs</option>
              <option value={AdminStatus.Inactive}>Inactifs</option>
              <option value={AdminStatus.Suspended}>Suspendus</option>
            </select>
          </div>

          <div className="relative">
            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as AdminType | 'all')}
              className="w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Tous les types</option>
              <option value={AdminType.CAISSIER}>Caissier</option>
              <option value={AdminType.SECRETAIRE_ADMINISTRATIF}>Secrétaire Administratif</option>
              <option value={AdminType.AGENT_DE_CREDIT}>Agent de Crédit</option>
              <option value={AdminType.CHEF_DE_SUCCURSALE}>Chef de Succursale</option>
              <option value={AdminType.DIRECTEUR_REGIONAL}>Directeur Régional</option>
              <option value={AdminType.ADMINISTRATEUR_SYSTEME}>Administrateur Système</option>
              <option value={AdminType.DIRECTION_GENERALE}>Direction Générale</option>
              <option value={AdminType.COMPTABLE_FINANCE}>Comptable/Finance</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Toutes les succursales</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={exportCsv}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={!filteredAccounts || filteredAccounts.length === 0}
          >
            <Download className="h-4 w-4" />
            <span>Exporter CSV</span>
          </button>
          <button
            onClick={exportPdf}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            disabled={!filteredAccounts || filteredAccounts.length === 0}
          >
            <FileText className="h-4 w-4" />
            <span>Exporter PDF</span>
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {totalFiltered} compte(s) trouvé(s)
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {totalFiltered === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun compte trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || branchFilter !== 'all'
                ? 'Essayez de modifier vos critères de recherche.'
                : 'Commencez par créer un nouveau compte administrateur.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Administrateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type / Département
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Succursale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Embauche / Dernière connexion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {account.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {account.fullName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {getAdminTypeBadge(account.adminType)}
                        <div className="text-xs text-gray-500">{account.department}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {account.assignedBranches && account.assignedBranches.length > 0
                          ? account.assignedBranches.join(', ')
                          : 'Aucune succursale'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Mail className="h-3 w-3 mr-1 text-gray-400" />
                          {account.email}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone className="h-3 w-3 mr-1 text-gray-400" />
                          {account.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                          {formatDate(account.hireDate)}
                        </div>
                        {account.lastLogin && (
                          <div className="text-xs text-gray-500">
                            Connexion: {formatDateTime(account.lastLogin)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(account.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleStatus(account.id)}
                          disabled={actionLoading === account.id || account.status === AdminStatus.Suspended}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            account.status === AdminStatus.Active
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              : 'bg-green-100 text-green-600 hover:bg-green-200'
                          }`}
                          title={account.status === AdminStatus.Suspended ? 'Impossible de basculer un compte suspendu' : account.status === AdminStatus.Active ? 'Désactiver' : 'Activer'}
                        >
                          {actionLoading === account.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          ) : account.status === AdminStatus.Active ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Unlock className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(account.id)}
                          disabled={actionLoading !== null}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(account.id)}
                          disabled={account.adminType === AdminType.DIRECTION_GENERALE || account.adminType === AdminType.ADMINISTRATEUR_SYSTEME || actionLoading !== null}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={account.adminType === AdminType.DIRECTION_GENERALE || account.adminType === AdminType.ADMINISTRATEUR_SYSTEME ? 'Impossible de supprimer Direction Générale ou Administrateur Système' : 'Supprimer'}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Pagination Controls */}
      {totalFiltered > 0 && (
        <div className="mt-3 bg-white rounded-md border border-gray-200">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-black">
              Affichage {Math.min((currentPage - 1) * pageSize + 1, totalFiltered)}–{Math.min(currentPage * pageSize, totalFiltered)} de {totalFiltered} comptes
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-black">Afficher</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm text-black"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 bg-gray-100 text-sm rounded-md disabled:opacity-50 text-black"
              >
                Préc
              </button>

              <div className="text-sm text-black">{currentPage} / {totalPages}</div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 bg-gray-100 text-sm rounded-md disabled:opacity-50 text-black"
              >
                Suiv
              </button>
            </div>
          </div>
        </div>
      )}

      </div>

    </>
  );
};

export default AdminAccountList;
