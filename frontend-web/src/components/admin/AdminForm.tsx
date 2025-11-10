import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  AdminFormData,
  AdminType,
  ADMIN_TYPE_LABELS,
  ADMIN_TYPE_DESCRIPTIONS,
  DEPARTMENTS,
  Department,
  ADMIN_PERMISSIONS,
  AdminLevel,
  AdminProfile
} from '../../types/admin';
import { Branch, BranchStatus } from '../../types/branch';

interface AdminFormProps {
  onSubmit: (data: AdminFormData) => void;
  onCancel: () => void;
  initialData?: AdminProfile;
  isEditing?: boolean;
  isLoading?: boolean;
  branches: Branch[];
}

// Schéma de validation
const adminValidationSchema: yup.ObjectSchema<AdminFormData> = yup.object({
  firstName: yup
    .string()
    .required('Le prénom est requis')
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères'),
  
  lastName: yup
    .string()
    .required('Le nom est requis')
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  
  email: yup
    .string()
    .required('L\'email est requis')
    .email('Format d\'email invalide')
    .max(100, 'L\'email ne peut pas dépasser 100 caractères'),
  
  phone: yup
    .string()
    .required('Le téléphone est requis')
    .matches(/^(\+509|509)?[0-9]{8}$/, 'Format de téléphone invalide (ex: +50912345678)'),
  
  adminType: yup
    .mixed<AdminType>()
    .oneOf(Object.values(AdminType), 'Type d\'administrateur invalide')
    .required('Le type d\'administrateur est requis'),
  
  department: yup
    .mixed<Department>()
    .oneOf(DEPARTMENTS, 'Département invalide')
    .optional(),

  branchId: yup
    .string()
    .required('La succursale est requise'),

  hireDate: yup
    .string()
    .required('La date d\'embauche est requise')
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),

  photo: yup
    .mixed<File | string>()
    .optional(),
  
  assignedBranches: yup
    .array()
    .of(yup.string().required())
    .default([])
    .when('adminType', {
      is: AdminType.MANAGER_REGIONAL,
      then: (schema) => schema.min(1, 'Au moins une succursale doit être assignée pour un Manager Régional'),
      otherwise: (schema) => schema
    }),
  
  password: yup
    .string()
    .default('')
    .when('$isEditing', {
      is: false,
      then: (schema) => schema
        .required('Le mot de passe est requis')
        .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
          'Le mot de passe doit contenir au moins: 1 minuscule, 1 majuscule, 1 chiffre, 1 caractère spécial'),
      otherwise: (schema) => schema.optional()
    }),
  
  confirmPassword: yup
    .string()
    .default('')
    .when(['password', '$isEditing'], {
      is: (password: string, isEditing: boolean) => !isEditing && password,
      then: (schema) => schema
        .required('Confirmer le mot de passe')
        .oneOf([yup.ref('password')], 'Les mots de passe ne correspondent pas'),
      otherwise: (schema) => schema.optional()
    })
});

const AdminForm: React.FC<AdminFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
  isLoading = false,
  branches = []
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [selectedAdminType, setSelectedAdminType] = useState<AdminType | ''>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    reset
  } = useForm<AdminFormData>({
    resolver: yupResolver(adminValidationSchema),
    context: { isEditing },
    mode: 'onSubmit', // Only validate on form submission
    defaultValues: initialData ? {
      firstName: initialData.firstName,
      lastName: initialData.lastName,
      email: initialData.email,
      phone: initialData.phone,
      adminType: initialData.adminType,
      department: initialData.department as Department | undefined,
      // set branchId if admin has a primary branch assigned
      branchId: initialData.branchId || '',
      hireDate: initialData.hireDate.split('T')[0],
      assignedBranches: initialData.assignedBranches,
      password: '',
      confirmPassword: ''
    } : {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      adminType: AdminType.SUPPORT_TECHNIQUE,
      department: undefined,
      branchId: '',
      hireDate: '',
      assignedBranches: [],
      password: '',
      confirmPassword: ''
    }
  });

  const watchedAdminType = watch('adminType');
  const watchedBranches = watch('assignedBranches');

  useEffect(() => {
    setSelectedAdminType(watchedAdminType);
  }, [watchedAdminType]);

  useEffect(() => {
    if (initialData?.photo) {
      setPhotoPreview(initialData.photo);
    }
  }, [initialData]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setValue('photo', file);
    }
  };

  const handleFormSubmit = (data: AdminFormData) => {
    if (selectedPhoto) {
      data.photo = selectedPhoto;
    }
    onSubmit(data);
  };

  const getPermissionsForType = (type: AdminType) => {
    return ADMIN_PERMISSIONS[type] || null;
  };

  const activeBranches = branches.filter(b => b.status === BranchStatus.Active);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Modifier l\'Administrateur' : 'Créer un Nouvel Administrateur'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
          disabled={isLoading}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Photo */}
        <div className="flex items-center space-x-6">
          <div className="flex-shrink-0">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Photo de profil"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <input
              type="file"
              id="photo"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <label
              htmlFor="photo"
              className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Changer la photo
            </label>
            <p className="text-sm text-gray-500 mt-1">JPG, PNG jusqu'à 2MB</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Prénom */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              Prénom *
            </label>
            <input
              {...register('firstName')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Entrez le prénom"
              disabled={isLoading}
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
            )}
          </div>

          {/* Nom */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
              Nom *
            </label>
            <input
              {...register('lastName')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Entrez le nom"
              disabled={isLoading}
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="admin@nalacredit.com"
              disabled={isLoading || isEditing}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Téléphone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone *
            </label>
            <input
              {...register('phone')}
              type="tel"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="+509 1234 5678"
              disabled={isLoading}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>
        </div>

        {/* Type d'administrateur */}
        <div>
          <label htmlFor="adminType" className="block text-sm font-medium text-gray-700 mb-2">
            Type d'Administrateur *
          </label>
          <select
            {...register('adminType')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="">Sélectionnez un type</option>
            {Object.entries(ADMIN_TYPE_LABELS).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
          {errors.adminType && (
            <p className="mt-1 text-sm text-red-600">{errors.adminType.message}</p>
          )}
          
          {/* Description du type */}
          {selectedAdminType && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Niveau {selectedAdminType === AdminType.SUPPORT_TECHNIQUE ? 3 : selectedAdminType === AdminType.SUPER_ADMINISTRATEUR ? 5 : 4}:</strong> {ADMIN_TYPE_DESCRIPTIONS[selectedAdminType]}
              </p>
              
              {/* Permissions */}
              {getPermissionsForType(selectedAdminType) && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-blue-800 mb-1">Permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(getPermissionsForType(selectedAdminType)!).map(([key, value]) => {
                      if (value === true) {
                        const permissionLabels: Record<string, string> = {
                          canCreateUsers: 'Créer utilisateurs',
                          canModifyUsers: 'Modifier utilisateurs',
                          canViewFinancialData: 'Voir finances',
                          canModifyFinancialData: 'Modifier finances',
                          canViewSystemLogs: 'Voir logs',
                          canManageBranches: 'Gérer succursales',
                          canValidateCredits: 'Valider crédits',
                          canManagePayroll: 'Gérer paie',
                          canManageEmployees: 'Gérer employés',
                          canProvideSupport: 'Support technique'
                        };
                        return (
                          <span key={key} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {permissionLabels[key] || key}
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Département/Service */}
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
              Département/Service
            </label>
            <select
              {...register('department')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              <option value="">Chwazi yon depatman (opsyonèl)</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            {errors.department && (
              <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
            )}
          </div>

          {/* Succursale (single) */}
          <div>
            <label htmlFor="branchId" className="block text-sm font-medium text-gray-700 mb-2">
              Succursale *
            </label>
            <select
              {...register('branchId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              <option value="">Chwazi yon succursale</option>
              {activeBranches.map((branch) => (
                <option key={branch.id} value={branch.id.toString()}>
                  {branch.name} - {branch.department}
                </option>
              ))}
            </select>
            {errors.branchId && (
              <p className="mt-1 text-sm text-red-600">{errors.branchId.message}</p>
            )}
          </div>

          {/* Date d'embauche */}
          <div>
            <label htmlFor="hireDate" className="block text-sm font-medium text-gray-700 mb-2">
              Date d'Embauche *
            </label>
            <input
              {...register('hireDate')}
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            {errors.hireDate && (
              <p className="mt-1 text-sm text-red-600">{errors.hireDate.message}</p>
            )}
          </div>
        </div>

        {/* Succursales assignées (pour Manager Régional) */}
        {selectedAdminType === AdminType.MANAGER_REGIONAL && (
          <div>
            <label htmlFor="assignedBranches" className="block text-sm font-medium text-gray-700 mb-2">
              Succursales Assignées *
            </label>
            <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
              {activeBranches.length > 0 ? (
                activeBranches.map((branch) => (
                  <label key={branch.id} className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      value={branch.id.toString()}
                      {...register('assignedBranches')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {branch.name} - {branch.department}
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-500">Aucune succursale disponible</p>
              )}
            </div>
            {errors.assignedBranches && (
              <p className="mt-1 text-sm text-red-600">{errors.assignedBranches.message}</p>
            )}
          </div>
        )}

        {/* Mots de passe (uniquement en création) */}
        {!isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de Passe *
              </label>
              <input
                {...register('password')}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mot de passe sécurisé"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le Mot de Passe *
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirmer le mot de passe"
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isLoading}
          >
            Annuler
          </button>
          <button
            type="submit"
            className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isLoading || !isValid
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={isLoading || !isValid}
          >
            {isLoading ? 'En cours...' : isEditing ? 'Mettre à Jour' : 'Créer l\'Administrateur'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminForm;