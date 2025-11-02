import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import {
  X,
  Save,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Shield,
  Calendar,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../../services/apiService';
import { Branch, BranchStatus } from '../../types/branch';

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

interface EditAdminFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department?: string;
  branchId?: number;
  adminType?: AdminType;
  newPassword?: string;
  confirmPassword?: string;
}

interface EditAdminModalProps {
  userId: string;
  currentData: {
    fullName: string;
    email: string;
    phone: string;
    department: string;
    adminType: AdminType;
    hireDate?: string;  // ADD THIS
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const EditAdminModal: React.FC<EditAdminModalProps> = ({
  userId,
  currentData,
  onSuccess,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<EditAdminFormData>({
    defaultValues: {
      firstName: currentData.fullName.split(' ')[0],
      lastName: currentData.fullName.split(' ').slice(1).join(' '),
      email: currentData.email,
      phone: currentData.phone,
      department: currentData.department,
      adminType: currentData.adminType
    }
  });

  const adminTypes = [
    { value: AdminType.CAISSIER, label: 'Caissier' },
    { value: AdminType.SECRETAIRE_ADMINISTRATIF, label: 'Secrétaire Administratif' },
    { value: AdminType.AGENT_DE_CREDIT, label: 'Agent de Crédit' },
    { value: AdminType.CHEF_DE_SUCCURSALE, label: 'Chef de Succursale' },
    { value: AdminType.DIRECTEUR_REGIONAL, label: 'Directeur Régional' },
    { value: AdminType.ADMINISTRATEUR_SYSTEME, label: 'Administrateur Système' },
    { value: AdminType.DIRECTION_GENERALE, label: 'Direction Générale' },
    { value: AdminType.COMPTABLE_FINANCE, label: 'Comptable/Finance' }
  ];

  const departments = [
    'Direction Générale',
    'Opérations',
    'Finance & Comptabilité',
    'Ressources Humaines',
    'Technologie',
    'Marketing',
    'Service Client',
    'Audit & Conformité',
    'Crédit & Recouvrement'
  ];

  // Load branches
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const branchData = await apiService.getAllBranches();
        setBranches(branchData.filter(b => b.status === BranchStatus.Active));
      } catch (error) {
        console.error('Error loading branches:', error);
      }
    };
    
    loadBranches();
  }, []);

  const onSubmit: SubmitHandler<EditAdminFormData> = async (data) => {
    try {
      // Validate password if provided
      if (showResetPassword) {
        if (!data.newPassword) {
          toast.error('Le nouveau mot de passe est requis');
          return;
        }
        if (data.newPassword.length < 8) {
          toast.error('Le mot de passe doit contenir au moins 8 caractères');
          return;
        }
        if (!/[A-Z]/.test(data.newPassword)) {
          toast.error('Le mot de passe doit contenir au moins une majuscule');
          return;
        }
        if (!/[a-z]/.test(data.newPassword)) {
          toast.error('Le mot de passe doit contenir au moins une minuscule');
          return;
        }
        if (!/[0-9]/.test(data.newPassword)) {
          toast.error('Le mot de passe doit contenir au moins un chiffre');
          return;
        }
        if (!/[@$!%*?&]/.test(data.newPassword)) {
          toast.error('Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&)');
          return;
        }
        if (data.newPassword !== data.confirmPassword) {
          toast.error('Les mots de passe ne correspondent pas');
          return;
        }
      }

      setLoading(true);

      // Map AdminType enum to numeric value (0-7)
      const adminTypeMap: { [key: string]: number } = {
        'CAISSIER': 0,
        'SECRETAIRE_ADMINISTRATIF': 1,
        'AGENT_DE_CREDIT': 2,
        'CHEF_DE_SUCCURSALE': 3,
        'DIRECTEUR_REGIONAL': 4,
        'ADMINISTRATEUR_SYSTEME': 5,
        'DIRECTION_GENERALE': 6,
        'COMPTABLE_FINANCE': 7
      };

      // Clean phone number - remove spaces, dashes, parentheses
    const cleanPhone = data.phone.replace(/[\s-()]/g, '');

      // Get AdminType - CRITICAL: Use original if not changed!
      const adminTypeValue = data.adminType 
        ? adminTypeMap[data.adminType] 
        : adminTypeMap[currentData.adminType]; // Use original, not default to 0!

      console.log('AdminType mapping:', {
        formValue: data.adminType,
        originalValue: currentData.adminType,
        mappedValue: adminTypeValue
      });

      // Prepare update data matching AdminUpdateDto
      const updateData: any = {
        FirstName: data.firstName,
        LastName: data.lastName,
        Phone: cleanPhone,
        Department: data.department || 'Non spécifié',
        AdminType: adminTypeValue,
        HireDate: currentData.hireDate || new Date().toISOString(), // Use original hireDate!
        AssignedBranches: data.branchId ? [data.branchId.toString()] : []
      };

      // Add password if reset is requested
      if (showResetPassword && data.newPassword) {
        updateData.Password = data.newPassword;
      }

      console.log('Updating user:', userId, updateData);
      
      // Call backend API
      await apiService.updateUser(userId, updateData);
      
      toast.success('Compte modifié avec succès!');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating user:', error);
      
      let errorMessage = 'Erreur lors de la modification du compte';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.title) {
          errorMessage = error.response.data.title;
        } else if (error.response.data.errors) {
          // ValidationErrors from backend
          const errors = error.response.data.errors;
          errorMessage = Object.values(errors).flat().join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Modifier le Compte</h2>
              <p className="text-sm text-gray-600">{currentData.fullName}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Informations Personnelles */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Personnelles</h3>
            
            <div className="space-y-4">
              {/* Prénom et Nom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('firstName', { required: 'Le prénom est requis' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.firstName && (
                    <p className="text-red-600 text-sm mt-1">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('lastName', { required: 'Le nom est requis' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.lastName && (
                    <p className="text-red-600 text-sm mt-1">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* Email et Téléphone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      {...register('email', { 
                        required: 'L\'email est requis',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Format d\'email invalide'
                        }
                      })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      {...register('phone', { required: 'Le téléphone est requis' })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Informations Professionnelles */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Professionnelles</h3>
            
            <div className="space-y-4">
              {/* Type d'administrateur */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type d'Administrateur <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    {...register('adminType', { required: 'Le type est requis' })}
                    disabled
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-gray-100 text-gray-500 cursor-not-allowed"
                  >
                    {adminTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.adminType && (
                  <p className="text-red-600 text-sm mt-1">{errors.adminType.message}</p>
                )}
                <p className="text-xs text-amber-600 mt-1 flex items-center space-x-1">
                  <Shield className="h-3 w-3" />
                  <span>Le type d'administrateur ne peut pas être modifié pour des raisons de sécurité</span>
                </p>
              </div>

              {/* Département */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Département/Service
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    {...register('department')}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">Sélectionner un département</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Succursale */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Succursale <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    {...register('branchId', { 
                      valueAsNumber: true,
                      required: 'La succursale est requise'
                    })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">Sélectionner une succursale</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} - {branch.commune || branch.department}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.branchId && (
                  <p className="text-red-600 text-sm mt-1">{errors.branchId.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Réinitialisation du mot de passe */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Mot de Passe</h3>
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <Key className="h-4 w-4" />
                <span>{showResetPassword ? 'Annuler la réinitialisation' : 'Réinitialiser le mot de passe'}</span>
              </button>
            </div>

            {showResetPassword && (
              <div className="space-y-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-2 mb-3">
                  <Key className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Réinitialisation du mot de passe</p>
                    <p className="text-xs text-amber-700 mt-1">
                      L'utilisateur devra utiliser ce nouveau mot de passe pour se connecter
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nouveau mot de passe <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        {...register('newPassword')}
                        placeholder="Nouveau mot de passe"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmer le mot de passe <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...register('confirmPassword')}
                        placeholder="Confirmer le mot de passe"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-blue-900 text-sm mb-2">Exigences du mot de passe:</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Au moins 8 caractères</li>
                    <li>• Au moins une lettre majuscule</li>
                    <li>• Au moins une lettre minuscule</li>
                    <li>• Au moins un chiffre</li>
                    <li>• Au moins un caractère spécial (@$!%*?&)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Enregistrer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAdminModal;
