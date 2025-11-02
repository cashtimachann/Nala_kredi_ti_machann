import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Clock, 
  DollarSign,
  Calendar,
  Shield,
  TrendingUp,
  Activity,
  History,
  User,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Branch, BranchStatus } from '../../types/branch';
import apiService from '../../services/apiService';
import toast from 'react-hot-toast';

interface BranchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
}

interface BranchAdmin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  adminType: number;
  adminTypeName: string;
  department: string;
  isActive: boolean;
}

const BranchDetailsModal: React.FC<BranchDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  branch 
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'limits' | 'employees' | 'history'>('info');
  const [admins, setAdmins] = useState<BranchAdmin[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  useEffect(() => {
    if (isOpen && branch && activeTab === 'employees') {
      loadBranchAdmins();
    }
  }, [isOpen, branch, activeTab]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const loadBranchAdmins = async () => {
    if (!branch) return;
    
    try {
      setLoadingAdmins(true);
      // Fetch admins assigned to this branch
      const response = await apiService.getAllAdmins({
        assignedBranch: branch.id.toString(),
        isActive: undefined // Get both active and inactive
      });
      
      // Handle different response structures
      let adminArray: any[] = [];
      if (Array.isArray(response)) {
        adminArray = response;
      } else if (response && Array.isArray(response.items)) {
        adminArray = response.items;
      } else if (response && Array.isArray(response.data)) {
        adminArray = response.data;
      } else if (response && Array.isArray(response.admins)) {
        adminArray = response.admins;
      } else {
        console.warn('Unexpected response structure:', response);
        adminArray = [];
      }
      
      // Map the response to our interface
      const adminList: BranchAdmin[] = adminArray.map((admin: any) => ({
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        phone: admin.phone || '',
        adminType: admin.adminType,
        adminTypeName: getAdminTypeName(admin.adminType),
        department: admin.department || 'N/A',
        isActive: admin.isActive
      }));
      
      setAdmins(adminList);
    } catch (error) {
      console.error('Error loading admins:', error);
      toast.error('Erreur lors du chargement des administrateurs');
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const getAdminTypeName = (adminType: number): string => {
    const types: { [key: number]: string } = {
      0: 'Caissier',
      1: 'Secrétaire Administratif',
      2: 'Agent de Crédit',
      3: 'Chef de Succursale',
      4: 'Directeur Régional',
      5: 'Administrateur Système',
      6: 'Direction Générale',
      7: 'Comptable Finance',
      8: 'Super Admin',
      9: 'Manager',
      10: 'Auditeur',
      11: 'RH Manager'
    };
    return types[adminType] !== undefined ? types[adminType] : `Rôle ${adminType}`;
  };

  if (!isOpen || !branch) return null;

  const formatCurrency = (amount: number, currency: string = 'HTG') => {
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
    
    return currency === 'USD' ? `$ ${formatted}` : `${formatted} HTG`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: BranchStatus) => {
    const configs = {
      [BranchStatus.Active]: { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        icon: CheckCircle,
        label: 'Active' 
      },
      [BranchStatus.Inactive]: { 
        bg: 'bg-red-100', 
        text: 'text-red-800',
        icon: XCircle, 
        label: 'Inactive' 
      },
      [BranchStatus.UnderConstruction]: { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800',
        icon: AlertCircle, 
        label: 'En construction' 
      }
    };
    
    const config = configs[status];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-4 w-4 mr-1" />
        {config.label}
      </span>
    );
  };

  const tabs = [
    { id: 'info', label: 'Informations', icon: Building2 },
    { id: 'limits', label: 'Limites', icon: DollarSign },
    { id: 'employees', label: 'Administrateurs', icon: Users },
    { id: 'history', label: 'Historique', icon: History }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{branch.name}</h2>
              <p className="text-sm text-gray-600 mt-1">Code: {branch.code}</p>
            </div>
            {getStatusBadge(branch.status)}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex space-x-1 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-white'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Location */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                  Localisation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Département</label>
                    <p className="text-gray-900 mt-1">{branch.department}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Commune</label>
                    <p className="text-gray-900 mt-1">{branch.commune}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">Adresse complète</label>
                    <p className="text-gray-900 mt-1">{branch.address}</p>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-green-600" />
                  Contact
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-900 mt-1 flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {branch.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Téléphones</label>
                    <div className="mt-1 space-y-1">
                      {branch.phones.map((phone, index) => (
                        <p key={index} className="text-gray-900 flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {phone}
                          {index === 0 && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Principal</span>}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Management */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-purple-600" />
                  Gestion
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Responsable</label>
                    <p className="text-gray-900 mt-1">
                      {branch.managerName || 'Non assigné'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Capacité employés</label>
                    <p className="text-gray-900 mt-1">{branch.maxEmployees} employés maximum</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date d'ouverture</label>
                    <p className="text-gray-900 mt-1 flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {formatDate(branch.openingDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-orange-600" />
                  Heures d'opération
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Heures d'ouverture</label>
                    <p className="text-gray-900 mt-1 text-lg font-semibold">
                      {branch.operatingHours.openTime} - {branch.operatingHours.closeTime}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Jours fermés</label>
                    <p className="text-gray-900 mt-1">
                      {branch.operatingHours.closedDays.length === 0 
                        ? 'Ouvert tous les jours'
                        : `${branch.operatingHours.closedDays.length} jour(s) par semaine`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Limits Tab */}
          {activeTab === 'limits' && (
            <div className="space-y-6">
              {/* Transaction Limits */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Limites de transactions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                    <label className="text-sm font-medium text-blue-900">Retrait journalier</label>
                    <p className="text-2xl font-bold text-blue-600 mt-2">
                      {formatCurrency(branch.limits.dailyWithdrawalLimit)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                    <label className="text-sm font-medium text-green-900">Dépôt journalier</label>
                    <p className="text-2xl font-bold text-green-600 mt-2">
                      {formatCurrency(branch.limits.dailyDepositLimit)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Credit Limits */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-purple-600" />
                  Limites de crédit
                </h3>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                  <label className="text-sm font-medium text-purple-900">Approbation locale maximum</label>
                  <p className="text-2xl font-bold text-purple-600 mt-2">
                    {formatCurrency(branch.limits.maxLocalCreditApproval)}
                  </p>
                  <p className="text-sm text-purple-700 mt-2">
                    Montants supérieurs requièrent approbation régionale
                  </p>
                </div>
              </div>

              {/* Cash Reserves */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                  Réserves de caisse minimum
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
                    <label className="text-sm font-medium text-orange-900">Réserve HTG</label>
                    <p className="text-2xl font-bold text-orange-600 mt-2">
                      {formatCurrency(branch.limits.minCashReserveHTG)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
                    <label className="text-sm font-medium text-indigo-900">Réserve USD</label>
                    <p className="text-2xl font-bold text-indigo-600 mt-2">
                      {formatCurrency(branch.limits.minCashReserveUSD, 'USD')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Administrators Tab */}
          {activeTab === 'employees' && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-purple-600" />
                    Administrateurs de la succursale
                  </h3>
                  <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                    {admins.length} {admins.length > 1 ? 'administrateurs' : 'administrateur'}
                  </span>
                </div>
                
                {loadingAdmins ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4">Chargement des administrateurs...</p>
                  </div>
                ) : admins.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto" />
                    <h3 className="mt-4 text-sm font-medium text-gray-900">Aucun administrateur assigné</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Cette succursale n'a pas encore d'administrateurs assignés.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {admins.map((admin) => (
                      <div key={admin.id} className="py-4 hover:bg-gray-50 transition-colors rounded-lg px-3 -mx-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                              admin.isActive ? 'bg-purple-100' : 'bg-gray-100'
                            }`}>
                              <Shield className={`h-6 w-6 ${
                                admin.isActive ? 'text-purple-600' : 'text-gray-400'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <p className="font-semibold text-gray-900">
                                  {admin.firstName} {admin.lastName}
                                </p>
                                {admin.isActive ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-0.5 flex items-center">
                                <Mail className="h-3.5 w-3.5 mr-1.5" />
                                {admin.email}
                              </p>
                              {admin.phone && (
                                <p className="text-sm text-gray-600 mt-0.5 flex items-center">
                                  <Phone className="h-3.5 w-3.5 mr-1.5" />
                                  {admin.phone}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  admin.adminType === 0 || admin.adminType === 1
                                    ? 'bg-red-100 text-red-700'
                                    : admin.adminType === 2
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {admin.adminTypeName}
                                </span>
                                {admin.department && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                    {admin.department}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats Summary */}
              {admins.length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {admins.filter(a => a.isActive).length}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Actifs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-600">
                        {admins.filter(a => !a.isActive).length}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Inactifs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {admins.filter(a => a.adminType === 2).length}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Responsables</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {admins.filter(a => [3, 4, 5, 6].includes(a.adminType)).length}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Autres</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <History className="h-5 w-5 mr-2 text-blue-600" />
                  Historique des modifications
                </h3>
                
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto" />
                  <h3 className="mt-4 text-sm font-medium text-gray-900">Historique non disponible</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    L'historique des modifications sera affiché ici.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Créé le {formatDate(branch.createdAt)} • Mis à jour le {formatDate(branch.updatedAt)}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default BranchDetailsModal;
