import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save, Building2, MapPin, Phone, Mail, Clock, Users, DollarSign, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  Branch, 
  BranchFormData, 
  BranchStatus, 
  DayOfWeek, 
  HAITI_DEPARTMENTS, 
  COMMUNES_BY_DEPARTMENT 
} from '../../types/branch';
import { branchSchema } from '../../validation/schemas';
import { UserInfo } from '../../services';
import apiService from '../../services/apiService';

interface BranchFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (branch: Branch) => void;
  branch?: Branch | null;
  isEditing?: boolean;
}

// Using shared Zod schema instead of Yup

const BranchForm: React.FC<BranchFormProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  branch, 
  isEditing = false 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [availableManagers, setAvailableManagers] = useState<UserInfo[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [availableCommunes, setAvailableCommunes] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty }
  } = useForm<BranchFormData>({
    resolver: async (data: any, context: any, options: any) => {
      try {
        const result = branchSchema.safeParse(data);
        if (!result.success) {
          const fieldErrors: Record<string, any> = {};
          result.error.issues.forEach((err: any) => {
            const fieldPath = err.path.join('.');
            if (!fieldErrors[fieldPath]) {
              fieldErrors[fieldPath] = {
                type: err.code,
                message: err.message,
              };
            }
          });
          return { values: {} as any, errors: fieldErrors };
        }
        return { values: result.data as any, errors: {} };
      } catch (error) {
        console.error('Form validation error:', error);
        return { values: {} as any, errors: {} };
      }
    },
    defaultValues: {
      name: '',
      code: '',
      address: '',
      commune: '',
      department: '',
      phone1: '',
      phone2: '',
      phone3: '',
      email: '',
      openingDate: new Date().toISOString().split('T')[0],
      managerId: '',
      maxEmployees: 5,
      status: BranchStatus.Active,
      dailyWithdrawalLimit: 100000,
      dailyDepositLimit: 500000,
      maxLocalCreditApproval: 50000,
      minCashReserveHTG: 50000,
      minCashReserveUSD: 1000,
      openTime: '08:00',
      closeTime: '16:00',
      closedDays: [DayOfWeek.Sunday]
    } satisfies BranchFormData
  });

  const watchedName = watch('name');
  const watchedDepartment = watch('department');

  useEffect(() => {
    if (isOpen) {
      loadAvailableManagers();
      if (branch && isEditing) {
        populateForm(branch);
      } else {
        // Reset form and clear department/commune states for new branch
        reset();
        setSelectedDepartment('');
        setAvailableCommunes([]);
      }
    }
  }, [isOpen, branch, isEditing, reset]);

  // Handle close with confirmation if form is dirty
  const handleClose = () => {
    if (isDirty && !isLoading) {
      if (window.confirm('Vous avez des modifications non enregistrées. Voulez-vous vraiment fermer?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        handleClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, isLoading, isDirty]);

  useEffect(() => {
    if (watchedDepartment) {
      const newCommunes = COMMUNES_BY_DEPARTMENT[watchedDepartment] || [];
      
      // Only update if department actually changed (not just being set during form population)
      if (selectedDepartment !== watchedDepartment) {
        setSelectedDepartment(watchedDepartment);
        setAvailableCommunes(newCommunes);
        
        // Reset commune only if it's not in the new department's communes
        const currentCommune = watch('commune');
        if (currentCommune && !newCommunes.includes(currentCommune)) {
          setValue('commune', '', { shouldValidate: false });
        }
      } else if (availableCommunes.length === 0 && newCommunes.length > 0) {
        // Edge case: if availableCommunes is empty but should have values, update it
        // This can happen during initial form population
        setAvailableCommunes(newCommunes);
      }
    } else {
      setSelectedDepartment('');
      setAvailableCommunes([]);
      const currentCommune = watch('commune');
      if (currentCommune) {
        setValue('commune', '', { shouldValidate: false });
      }
    }
  }, [watchedDepartment, selectedDepartment, availableCommunes.length, watch, setValue]);

  useEffect(() => {
    if (watchedName && !isEditing) {
      generateBranchCode(watchedName);
    }
  }, [watchedName, isEditing]);

  const loadAvailableManagers = async () => {
    try {
      const managers = await apiService.getAvailableManagers();
      setAvailableManagers(managers);
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  };

  const generateBranchCode = async (name: string) => {
    if (name.length >= 3) {
      try {
        const code = await apiService.generateBranchCode(name);
        setValue('code', code);
      } catch (error) {
        console.error('Error generating code:', error);
      }
    }
  };

  const populateForm = (branchData: Branch) => {
    const phones = branchData.phones || ['', '', ''];
    
    // CRITICAL: Set department and commune states BEFORE calling setValue
    // This prevents the useEffect from resetting the commune
    const deptCommunes = COMMUNES_BY_DEPARTMENT[branchData.department] || [];
    setSelectedDepartment(branchData.department);
    setAvailableCommunes(deptCommunes);
    
    // Now set all form values - department and commune together
    setValue('name', branchData.name);
    setValue('code', branchData.code);
    setValue('address', branchData.address);
    setValue('department', branchData.department, { shouldValidate: false });
    // Set commune immediately after department with shouldValidate: false to avoid triggering validation
    setValue('commune', branchData.commune, { shouldValidate: false });
    setValue('phone1', phones[0] || '');
    setValue('phone2', phones[1] || '');
    setValue('phone3', phones[2] || '');
    setValue('email', branchData.email);
    setValue('openingDate', branchData.openingDate.split('T')[0]);
    setValue('managerId', branchData.managerId || '');
    setValue('maxEmployees', branchData.maxEmployees);
    setValue('status', branchData.status);
    setValue('dailyWithdrawalLimit', branchData.limits.dailyWithdrawalLimit);
    setValue('dailyDepositLimit', branchData.limits.dailyDepositLimit);
    setValue('maxLocalCreditApproval', branchData.limits.maxLocalCreditApproval);
    setValue('minCashReserveHTG', branchData.limits.minCashReserveHTG);
    setValue('minCashReserveUSD', branchData.limits.minCashReserveUSD);
    setValue('openTime', branchData.operatingHours.openTime);
    setValue('closeTime', branchData.operatingHours.closeTime);
    setValue('closedDays', branchData.operatingHours.closedDays || []);
  };

  const onFormInvalid = (formErrors: any) => {
    const messages = Object.entries(formErrors)
      .map(([field, err]: [string, any]) => err?.message)
      .filter(Boolean)
      .slice(0, 4);
    if (messages.length > 0) {
      toast.error(`Veuillez corriger les erreurs:\n${messages.join('\n')}`);
    }
  };

  const onSubmit: (data: BranchFormData) => Promise<void> = async (data: BranchFormData) => {
    setIsLoading(true);
    try {
      const phones = [data.phone1, data.phone2 || '', data.phone3 || ''].filter(p => p.trim() !== '');
      
      const branchData = {
        name: data.name,
        code: data.code,
        address: data.address,
        commune: data.commune,
        department: data.department,
        phones,
        email: data.email,
        openingDate: data.openingDate,
        managerId: data.managerId || undefined,
        maxEmployees: data.maxEmployees,
        status: data.status,
        limits: {
          dailyWithdrawalLimit: data.dailyWithdrawalLimit,
          dailyDepositLimit: data.dailyDepositLimit,
          maxLocalCreditApproval: data.maxLocalCreditApproval,
          minCashReserveHTG: data.minCashReserveHTG,
          minCashReserveUSD: data.minCashReserveUSD
        },
        operatingHours: {
          openTime: data.openTime,
          closeTime: data.closeTime,
          closedDays: data.closedDays || []
        }
      };

      let savedBranch: Branch;
      if (isEditing && branch) {
        savedBranch = await apiService.updateBranch(branch.id, { id: branch.id, ...branchData });
        toast.success('Succursale modifiée avec succès');
      } else {
        savedBranch = await apiService.createBranch(branchData);
        toast.success('Succursale créée avec succès');
      }

      onSave(savedBranch);
      onClose();
      reset();
    } catch (error: any) {
      console.error('Error saving branch:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Modifier la succursale' : 'Nouvelle succursale'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit(onSubmit, onFormInvalid)} className="p-6 space-y-8">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                Informations générales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de la succursale *
                  </label>
                  <input
                    {...register('name')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Port-au-Prince Centre"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code succursale *
                  </label>
                  <input
                    {...register('code')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: PAP-001"
                  />
                  {errors.code && (
                    <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Département *
                  </label>
                  <select
                    {...register('department')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner un département</option>
                    {HAITI_DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {errors.department && (
                    <p className="text-red-500 text-sm mt-1">{errors.department.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commune/Ville *
                  </label>
                  <select
                    {...register('commune')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!selectedDepartment}
                  >
                    <option value="">Sélectionner une commune</option>
                    {availableCommunes.map(commune => (
                      <option key={commune} value={commune}>{commune}</option>
                    ))}
                  </select>
                  {errors.commune && (
                    <p className="text-red-500 text-sm mt-1">{errors.commune.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Adresse complète *
                  </label>
                  <textarea
                    {...register('address')}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Adresse complète avec numéro, rue, quartier..."
                  />
                  {errors.address && (
                    <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Phone className="h-5 w-5 mr-2 text-green-600" />
                Informations de contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone principal *
                  </label>
                  <input
                    {...register('phone1')}
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: +509 1234 5678"
                  />
                  {errors.phone1 && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone1.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone secondaire
                  </label>
                  <input
                    {...register('phone2')}
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: +509 1234 5679"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone d'urgence
                  </label>
                  <input
                    {...register('phone3')}
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: +509 1234 5680"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email *
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: succursale@nalacredit.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Management & Operations */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-purple-600" />
                Gestion et opérations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date d'ouverture *
                  </label>
                  <input
                    {...register('openingDate')}
                    type="date"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.openingDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.openingDate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsable de succursale
                  </label>
                  <select
                    {...register('managerId')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Aucun responsable assigné</option>
                    {availableManagers.map(manager => (
                      <option key={manager.id} value={manager.id}>
                        {manager.firstName} {manager.lastName} - {manager.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre d'employés autorisés *
                  </label>
                  <input
                    {...register('maxEmployees', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.maxEmployees && (
                    <p className="text-red-500 text-sm mt-1">{errors.maxEmployees.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut *
                  </label>
                  <select
                    {...register('status')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={BranchStatus.Active}>Active</option>
                    <option value={BranchStatus.Inactive}>Inactive</option>
                    <option value={BranchStatus.UnderConstruction}>En construction</option>
                  </select>
                  {errors.status && (
                    <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Operating Hours */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-orange-600" />
                Heures d'ouverture
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heure d'ouverture *
                  </label>
                  <input
                    {...register('openTime')}
                    type="time"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.openTime && (
                    <p className="text-red-500 text-sm mt-1">{errors.openTime.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heure de fermeture *
                  </label>
                  <input
                    {...register('closeTime')}
                    type="time"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.closeTime && (
                    <p className="text-red-500 text-sm mt-1">{errors.closeTime.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jours de fermeture
                  </label>
                  <Controller
                    name="closedDays"
                    control={control}
                    render={({ field }) => (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { value: DayOfWeek.Sunday, label: 'Dimanche' },
                          { value: DayOfWeek.Monday, label: 'Lundi' },
                          { value: DayOfWeek.Tuesday, label: 'Mardi' },
                          { value: DayOfWeek.Wednesday, label: 'Mercredi' },
                          { value: DayOfWeek.Thursday, label: 'Jeudi' },
                          { value: DayOfWeek.Friday, label: 'Vendredi' },
                          { value: DayOfWeek.Saturday, label: 'Samedi' }
                        ].map(day => (
                          <label key={day.value} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.value?.includes(day.value) || false}
                              onChange={(e) => {
                                const currentDays = field.value || [];
                                if (e.target.checked) {
                                  field.onChange([...currentDays, day.value]);
                                } else {
                                  field.onChange(currentDays.filter(d => d !== day.value));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{day.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Financial Limits */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                Limites financières
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 mb-1">
                      Configuration des limites
                    </h4>
                    <p className="text-sm text-yellow-700">
                      Ces limites déterminent les montants maximum pour les opérations journalières 
                      et les réserves de caisse requises pour cette succursale.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Limite de retrait journalier (HTG) *
                  </label>
                  <input
                    {...register('dailyWithdrawalLimit', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="1000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="100000"
                  />
                  {errors.dailyWithdrawalLimit && (
                    <p className="text-red-500 text-sm mt-1">{errors.dailyWithdrawalLimit.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Limite de dépôt journalier (HTG) *
                  </label>
                  <input
                    {...register('dailyDepositLimit', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="1000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="500000"
                  />
                  {errors.dailyDepositLimit && (
                    <p className="text-red-500 text-sm mt-1">{errors.dailyDepositLimit.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant max crédit approuvable (HTG) *
                  </label>
                  <input
                    {...register('maxLocalCreditApproval', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="1000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="50000"
                  />
                  {errors.maxLocalCreditApproval && (
                    <p className="text-red-500 text-sm mt-1">{errors.maxLocalCreditApproval.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Réserve minimum caisse HTG *
                  </label>
                  <input
                    {...register('minCashReserveHTG', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="1000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="50000"
                  />
                  {errors.minCashReserveHTG && (
                    <p className="text-red-500 text-sm mt-1">{errors.minCashReserveHTG.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Réserve minimum caisse USD *
                  </label>
                  <input
                    {...register('minCashReserveUSD', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1000"
                  />
                  {errors.minCashReserveUSD && (
                    <p className="text-red-500 text-sm mt-1">{errors.minCashReserveUSD.message}</p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit(onSubmit, onFormInvalid)}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isLoading ? 'Enregistrement...' : 'Enregistrer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BranchForm;