import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { X, Save, Building2, DollarSign, FileText, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  InterBranchTransfer,
  CreateInterBranchTransferDto,
  Currency,
  InterBranchTransferFormData,
  getCurrencyInfo
} from '../../types/interBranchTransfer';
import { Branch } from '../../types/branch';
import apiService from '../../services/apiService';

interface InterBranchTransferFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transfer: InterBranchTransfer) => void;
  transfer?: InterBranchTransfer | null;
  isEditing?: boolean;
}

const transferSchema: yup.ObjectSchema<InterBranchTransferFormData> = yup.object({
  fromBranchId: yup.number().optional(),
  toBranchId: yup.number().required('La succursale de destination est requise'),
  currency: yup.mixed<Currency>().oneOf([Currency.HTG, Currency.USD]).required('La devise est requise'),
  amount: yup.number().min(0.01, 'Le montant doit être positif').required('Le montant est requis'),
  exchangeRate: yup.number().min(0.01, 'Le taux doit être positif').default(1),
  reason: yup.string().required('Le motif est requis').min(5, 'Minimum 5 caractères'),
  notes: yup.string().default('')
});

const InterBranchTransferForm: React.FC<InterBranchTransferFormProps> = ({
  isOpen,
  onClose,
  onSave,
  transfer,
  isEditing = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<InterBranchTransferFormData>({
    resolver: yupResolver(transferSchema),
    defaultValues: {
      fromBranchId: 0,
      toBranchId: 0,
      currency: Currency.HTG,
      amount: 0,
      exchangeRate: 1,
      reason: '',
      notes: ''
    }
  });

  const watchedAmount = watch('amount');
  const watchedExchangeRate = watch('exchangeRate');
  const watchedCurrency = watch('currency');

  useEffect(() => {
    if (isOpen) {
      loadBranches();
      if (transfer && isEditing) {
        reset({
          toBranchId: transfer.toBranchId,
          currency: transfer.currency,
          amount: transfer.amount,
          exchangeRate: transfer.exchangeRate,
          reason: transfer.reason,
          notes: transfer.notes || ''
        });
      } else {
        reset({
          fromBranchId: 0,
          toBranchId: 0,
          currency: Currency.HTG,
          amount: 0,
          exchangeRate: 1,
          reason: '',
          notes: ''
        });
      }
    }
  }, [isOpen, transfer, isEditing, reset]);

  useEffect(() => {
    const amount = watchedAmount || 0;
    const exchangeRate = watchedExchangeRate || 1;
    setCalculatedAmount(amount * exchangeRate);
  }, [watchedAmount, watchedExchangeRate]);

  const loadBranches = async () => {
    try {
      const branches = await apiService.getAllBranches();
      // Filter out the current user's branch if we have user info
      const currentUser = apiService.getCurrentUser();
      if (currentUser?.branchId) {
        setAvailableBranches(branches.filter(b => b.id !== currentUser.branchId));
      } else {
        setAvailableBranches(branches);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Erreur lors du chargement des succursales');
    }
  };

  const onSubmit = async (data: InterBranchTransferFormData) => {
    try {
      setIsLoading(true);

      // Get current user to determine if we need to specify fromBranchId
      const currentUser = apiService.getCurrentUser();
      
      const transferData: CreateInterBranchTransferDto = {
        fromBranchId: data.fromBranchId || currentUser?.branchId, // Use form value or user's branchId
        toBranchId: data.toBranchId,
        currency: data.currency,
        amount: data.amount,
        exchangeRate: data.exchangeRate,
        reason: data.reason,
        notes: data.notes
      };

      let savedTransfer: InterBranchTransfer;
      if (isEditing && transfer) {
        const updateData = {
          id: transfer.id,
          ...transferData
        };
        savedTransfer = await apiService.updateInterBranchTransfer(updateData);
        toast.success('Transfert modifié avec succès');
      } else {
        savedTransfer = await apiService.createInterBranchTransfer(transferData);
        toast.success('Transfert créé avec succès');
      }

      onSave(savedTransfer);
      onClose();
    } catch (error: any) {
      console.error('Error saving transfer:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde du transfert');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: Currency) => {
    const currencyInfo = getCurrencyInfo(currency);
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyInfo.code === 'HTG' ? 'USD' : currencyInfo.code,
      minimumFractionDigits: 0
    }).format(amount).replace('$', currencyInfo.symbol);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Modifier le Transfert' : 'Nouveau Transfert Inter-Succursales'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Source Branch - Only show for users without branchId (e.g., SuperAdmin) */}
          {!apiService.getCurrentUser()?.branchId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Succursale Source (De) *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  {...register('fromBranchId', { valueAsNumber: true })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={0}>Sélectionner la succursale source</option>
                  {availableBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} - {branch.commune}, {branch.department}
                    </option>
                  ))}
                </select>
              </div>
              {errors.fromBranchId && (
                <p className="mt-1 text-sm text-red-600">{errors.fromBranchId.message}</p>
              )}
            </div>
          )}

          {/* Destination Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Succursale de Destination *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                {...register('toBranchId', { valueAsNumber: true })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>Sélectionner une succursale</option>
                {availableBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} - {branch.commune}, {branch.department}
                  </option>
                ))}
              </select>
            </div>
            {errors.toBranchId && (
              <p className="mt-1 text-sm text-red-600">{errors.toBranchId.message}</p>
            )}
          </div>

          {/* Currency and Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Devise *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  {...register('currency', { valueAsNumber: true })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={Currency.HTG}>HTG - Gourdes Haitiennes</option>
                  <option value={Currency.USD}>USD - US Dollar</option>
                </select>
              </div>
              {errors.currency && (
                <p className="mt-1 text-sm text-red-600">{errors.currency.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('amount', { valueAsNumber: true })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>
          </div>

          {/* Exchange Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Taux de Change
            </label>
            <div className="relative">
              <Calculator className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                {...register('exchangeRate', { valueAsNumber: true })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1.0000"
              />
            </div>
            {errors.exchangeRate && (
              <p className="mt-1 text-sm text-red-600">{errors.exchangeRate.message}</p>
            )}
            {watchedExchangeRate !== 1 && (
              <p className="mt-2 text-sm text-blue-600">
                Montant converti: {formatCurrency(calculatedAmount, watchedCurrency)}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motif du Transfert *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <textarea
                {...register('reason')}
                rows={3}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Expliquez le motif de ce transfert..."
              />
            </div>
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optionnel)
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notes supplémentaires..."
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isEditing ? 'Modifier' : 'Créer'} le Transfert</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InterBranchTransferForm;