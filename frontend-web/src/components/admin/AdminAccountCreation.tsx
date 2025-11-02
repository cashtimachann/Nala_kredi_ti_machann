import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import {
  UserPlus,
  Mail,
  Phone,
  Calendar,
  Building2,
  Briefcase,
  Upload,
  X,
  Shield,
  Save,
  Eye,
  EyeOff,
  UserCog
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/apiService';
import { Branch, BranchStatus } from '../../types/branch';

// Types
// Align with backend AdminTypeDto enum values
enum AdminType {
  Caissier = 'CAISSIER',
  SecretaireAdministratif = 'SECRETAIRE_ADMINISTRATIF',
  AgentDeCredit = 'AGENT_DE_CREDIT',
  ChefDeSuccursale = 'CHEF_DE_SUCCURSALE',
  DirecteurRegional = 'DIRECTEUR_REGIONAL',
  AdministrateurSysteme = 'ADMINISTRATEUR_SYSTEME',
  DirectionGenerale = 'DIRECTION_GENERALE',
  ComptableFinance = 'COMPTABLE_FINANCE'
}

interface AdminAccountFormData {
  adminType: AdminType;
  fullName: string;
  email: string;
  phone: string;
  photo?: File;
  department?: string;
  branchId: number;
  hireDate: string;
  assignedBranches: number[];
  initialPassword: string;
  confirmPassword: string;
}

interface AdminAccountCreationProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AdminAccountCreation: React.FC<AdminAccountCreationProps> = ({
  onSuccess,
  onCancel
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<AdminAccountFormData>({
    defaultValues: {
      assignedBranches: []
    }
  });

  const selectedAdminType = watch('adminType');
  const selectedBranches = watch('assignedBranches') || [];

  // Load branches from API
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const branchData = await apiService.getAllBranches();
        setBranches(branchData.filter(b => b.status === BranchStatus.Active));
      } catch (error) {
        console.error('Error loading branches:', error);
        toast.error('Erreur lors du chargement des succursales');
      }
    };
    
    loadBranches();
  }, []);

  const adminTypes = [
    { value: AdminType.Caissier, label: 'Caissier', description: 'Gestion des transactions et caisse' },
    { value: AdminType.SecretaireAdministratif, label: 'Secrétaire Administratif', description: 'Support administratif' },
    { value: AdminType.AgentDeCredit, label: 'Agent de Crédit', description: 'Gestion des prêts et dossiers' },
    { value: AdminType.ChefDeSuccursale, label: 'Chef de Succursale', description: 'Gestion d\'une succursale' },
    { value: AdminType.DirecteurRegional, label: 'Directeur Régional', description: 'Gestion de plusieurs succursales' },
    { value: AdminType.AdministrateurSysteme, label: 'Administrateur Système', description: 'Configuration et support technique' },
    { value: AdminType.DirectionGenerale, label: 'Direction Générale', description: 'Accès complet au système' },
    { value: AdminType.ComptableFinance, label: 'Comptable/Finance', description: 'Gestion financière et comptabilité' }
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La photo ne doit pas dépasser 5 MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setValue('photo', undefined);
  };

  const toggleBranch = (branchId: number) => {
    const currentBranches = selectedBranches;
    if (currentBranches.includes(branchId)) {
      setValue('assignedBranches', currentBranches.filter(id => id !== branchId));
    } else {
      setValue('assignedBranches', [...currentBranches, branchId]);
    }
  };

  const validateForm = (data: AdminAccountFormData): string | null => {
    if (!data.adminType) return 'Le type d\'administrateur est requis';
    if (!data.fullName || data.fullName.length < 3) return 'Le nom doit contenir au moins 3 caractères';
    if (!data.email) return 'L\'email est requis';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Format d\'email invalide';
    if (!data.phone) return 'Le téléphone est requis';
    // Validate Haitian phone format: +509XXXXXXXX or 509XXXXXXXX or just 8 digits
    const phoneDigits = data.phone.replace(/[\s\-+()]/g, '');
    if (!/^(509)?[0-9]{8}$/.test(phoneDigits)) {
      return 'Format de téléphone invalide. Utilisez: +509 XXXX-XXXX ou 509XXXXXXXX';
    }
    if (!data.department) return 'Le département est requis';
    if (!data.branchId) return 'La succursale est requise';
    if (!data.hireDate) return 'La date d\'embauche est requise';
    
    if (data.adminType === AdminType.DirecteurRegional && data.assignedBranches.length === 0) {
      return 'Au moins une succursale doit être assignée pour un Directeur Régional';
    }
    
    if (!data.initialPassword) return 'Le mot de passe initial est requis';
    if (data.initialPassword.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
    if (!/[A-Z]/.test(data.initialPassword)) return 'Le mot de passe doit contenir au moins une majuscule';
    if (!/[a-z]/.test(data.initialPassword)) return 'Le mot de passe doit contenir au moins une minuscule';
    if (!/[0-9]/.test(data.initialPassword)) return 'Le mot de passe doit contenir au moins un chiffre';
    if (!/[@$!%*?&]/.test(data.initialPassword)) return 'Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&)';
    if (data.initialPassword !== data.confirmPassword) return 'Les mots de passe ne correspondent pas';
    
    return null;
  };

  const onSubmit: SubmitHandler<AdminAccountFormData> = async (data) => {
    try {
      const validationError = validateForm(data);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setLoading(true);
      
      // Split fullName into firstName and lastName
      const nameParts = data.fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];

      // Map frontend admin type (string) to backend enum numeric value
      const adminTypeMap: Record<AdminType, number> = {
        [AdminType.Caissier]: 0,
        [AdminType.SecretaireAdministratif]: 1,
        [AdminType.AgentDeCredit]: 2,
        [AdminType.ChefDeSuccursale]: 3,
        [AdminType.DirecteurRegional]: 4,
        [AdminType.AdministrateurSysteme]: 5,
        [AdminType.DirectionGenerale]: 6,
        [AdminType.ComptableFinance]: 7
      };
      const adminTypeValue = adminTypeMap[data.adminType];

      // Prepare data for backend API
      const adminCreateData = {
        firstName,
        lastName,
        email: data.email,
        phone: data.phone.replace(/[\s\-()]/g, ''), // Remove formatting, keep + if present
        adminType: adminTypeValue,
        department: data.department || 'Non spécifié',
        hireDate: data.hireDate,
        // If branchId is selected, add it to assignedBranches
        assignedBranches: data.branchId 
          ? [...data.assignedBranches, data.branchId.toString()]
          : data.assignedBranches.map(b => b.toString()),
        password: data.initialPassword
      };

      console.log('Creating admin account:', adminCreateData);
      
      // Call backend API
      await apiService.createAdmin(adminCreateData);
      
      toast.success('Compte administrateur créé avec succès!');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating admin account:', error);
      
      // Extract error message safely
      let errorMessage = 'Erreur lors de la création du compte';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.title) {
          errorMessage = error.response.data.title;
        } else if (error.response.data.errors) {
          // Handle validation errors
          const errors = error.response.data.errors;
          const errorMessages = Object.values(errors).flat();
          errorMessage = Array.isArray(errorMessages) ? errorMessages.join(', ') : 'Erreur de validation';
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <UserPlus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Création de Compte Administrateur</h1>
                <p className="text-gray-600 mt-1">Créez un nouveau compte pour accéder au système</p>
              </div>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Type d'administrateur */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Type d'Administrateur</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminTypes.map((type) => (
                <label
                  key={type.value}
                  className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedAdminType === type.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    {...register('adminType')}
                    value={type.value}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <UserCog className={`h-5 w-5 ${
                        selectedAdminType === type.value ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <span className={`font-medium ${
                        selectedAdminType === type.value ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {type.label}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${
                      selectedAdminType === type.value ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                      {type.description}
                    </p>
                  </div>
                  {selectedAdminType === type.value && (
                    <div className="flex-shrink-0 ml-2">
                      <div className="h-5 w-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <div className="h-2 w-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                  )}
                </label>
              ))}
            </div>
            {errors.adminType && (
              <p className="text-red-600 text-sm mt-2">{errors.adminType.message}</p>
            )}
          </div>

          {/* Informations Personnelles */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations Personnelles</h2>

            <div className="space-y-4">
              {/* Nom complet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom Complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('fullName', { required: true })}
                  placeholder="Ex: Jean Pierre Dupont"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Email et Téléphone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (Identifiant) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      {...register('email', { required: true })}
                      placeholder="jean.dupont@example.com"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      {...register('phone', { required: true })}
                      placeholder="+509 1234-5678"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo (Optionnel)
                </label>
                {!photoPreview ? (
                  <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        Cliquez pour télécharger une photo
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG jusqu'à 5 MB
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="sr-only"
                    />
                  </label>
                ) : (
                  <div className="relative inline-block">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Informations Professionnelles */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations Professionnelles</h2>

            <div className="space-y-4">
              {/* Département et Succursale */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Département/Service <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      {...register('department', { required: true })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="">Chwazi yon depatman</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  {errors.department && (
                    <p className="text-red-600 text-sm mt-1">Le département est requis</p>
                  )}
                </div>

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
                  <p className="text-xs text-gray-500 mt-1">
                    La succursale principale de l'utilisateur
                  </p>
                </div>
              </div>

              {/* Date d'embauche */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'Embauche <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    {...register('hireDate', { required: true })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Succursales assignées (pour Directeur Régional) */}
              {selectedAdminType === AdminType.DirecteurRegional && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Succursales Assignées <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-amber-600 mb-3 flex items-start">
                    <span className="font-semibold mr-2">⚠️</span>
                    <span>Au moins une succursale doit être sélectionnée pour un Directeur Régional</span>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {branches.map((branch) => (
                      <label
                        key={branch.id}
                        className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedBranches.includes(branch.id)
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedBranches.includes(branch.id)}
                          onChange={() => toggleBranch(branch.id)}
                          className="sr-only"
                        />
                        <div className="flex items-center space-x-3 flex-1">
                          <Building2 className={`h-5 w-5 ${
                            selectedBranches.includes(branch.id) ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                          <div>
                            <div className={`font-medium ${
                              selectedBranches.includes(branch.id) ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {branch.name}
                            </div>
                            <div className={`text-xs ${
                              selectedBranches.includes(branch.id) ? 'text-blue-700' : 'text-gray-500'
                            }`}>
                              {branch.code} - {branch.commune || branch.department}
                            </div>
                          </div>
                        </div>
                        {selectedBranches.includes(branch.id) && (
                          <div className="flex-shrink-0">
                            <div className="h-5 w-5 bg-blue-600 rounded flex items-center justify-center">
                              <div className="h-2 w-2 bg-white rounded-sm"></div>
                            </div>
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                  {errors.assignedBranches && (
                    <p className="text-red-600 text-sm mt-2">{errors.assignedBranches.message}</p>
                  )}
                  {selectedBranches.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      {selectedBranches.length} succursale(s) sélectionnée(s)
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mot de passe initial */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Mot de Passe Initial</h2>
            <p className="text-sm text-gray-600 mb-4">
              L'utilisateur devra changer ce mot de passe lors de sa première connexion.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de Passe <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('initialPassword')}
                      placeholder="Mot de passe"
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.initialPassword && (
                    <p className="text-red-600 text-sm mt-1">{errors.initialPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmer le Mot de Passe <span className="text-red-500">*</span>
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
                  {errors.confirmPassword && (
                    <p className="text-red-600 text-sm mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Exigences du mot de passe:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Au moins 8 caractères</li>
                  <li>• Au moins une lettre majuscule</li>
                  <li>• Au moins une lettre minuscule</li>
                  <li>• Au moins un chiffre</li>
                  <li>• Au moins un caractère spécial (@$!%*?&)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Création en cours...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Créer le Compte</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAccountCreation;
