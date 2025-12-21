import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Save, Calendar, DollarSign } from 'lucide-react';
import { 
  CurrencyExchangeRate, 
  CreateExchangeRateDto, 
  UpdateExchangeRateDto,
  CurrencyType,
  RateUpdateMethod,
  formatCurrencyType 
} from '../../types/currencyExchange';

interface ExchangeRateFormProps {
  rate?: CurrencyExchangeRate | null;
  branchId?: string;
  userRole?: string;
  branches?: any[];
  onSubmit: (data: CreateExchangeRateDto | UpdateExchangeRateDto) => void;
  onCancel: () => void;
}

const exchangeRateSchema = z.object({
  baseCurrency: z.preprocess(
    (v) => (typeof v === 'string' || typeof v === 'number' ? Number(v) : v),
    z.nativeEnum(CurrencyType)
  ),
  targetCurrency: z.preprocess(
    (v) => (typeof v === 'string' || typeof v === 'number' ? Number(v) : v),
    z.nativeEnum(CurrencyType)
  ),
  buyingRate: z.coerce.number().min(0, 'Taux invalide'),
  sellingRate: z.coerce.number().min(0, 'Taux invalide'),
  effectiveDate: z.string().min(1, "Date d'effet requise"),
  // empty string allowed; will be converted to undefined in onSubmit
  expiryDate: z.string().optional().nullable(),
  updateMethod: z.preprocess(
    (v) => (typeof v === 'string' || typeof v === 'number' ? Number(v) : v),
    z.nativeEnum(RateUpdateMethod)
  ),
  notes: z.string().optional().default(''),
  isActive: z.boolean().optional()
});

type ExchangeRateFormValues = z.infer<typeof exchangeRateSchema>;

const ExchangeRateForm: React.FC<ExchangeRateFormProps> = ({ rate, branchId, userRole, branches = [], onSubmit, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchId || rate?.branchId || '');
  const isEdit = !!rate;
  
  // Check if user is SuperAdmin or Director who can choose branch
  const isSuperAdmin = userRole === 'SuperAdmin' || userRole === 'Director' || userRole === 'SystemAdmin';
  const isBranchManager = !isSuperAdmin && !!branchId;

  const { register, handleSubmit, formState: { errors }, watch } = useForm<ExchangeRateFormValues>({
    resolver: async (data: any, context: any, options: any) => {
      try {
        const result = exchangeRateSchema.safeParse(data);
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
      baseCurrency: rate?.baseCurrency ?? CurrencyType.HTG,
      targetCurrency: rate?.targetCurrency ?? CurrencyType.USD,
      buyingRate: rate?.buyingRate || 0,
      sellingRate: rate?.sellingRate || 0,
      effectiveDate: rate?.effectiveDate ? new Date(rate.effectiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      expiryDate: rate?.expiryDate ? new Date(rate.expiryDate).toISOString().split('T')[0] : '',
      updateMethod: rate?.updateMethod ?? RateUpdateMethod.Manual,
      notes: rate?.notes || '',
      isActive: rate?.isActive ?? true
    }
  });

  const buyingRate = watch('buyingRate');
  const sellingRate = watch('sellingRate');
  const spread = buyingRate && sellingRate ? ((sellingRate - buyingRate) / buyingRate * 100) : 0;

  const onFormSubmit = async (data: ExchangeRateFormValues) => {
    setLoading(true);
    try {
      if (isEdit) {
        const formData: UpdateExchangeRateDto = {
          id: rate!.id,
          baseCurrency: data.baseCurrency,
          targetCurrency: data.targetCurrency,
          buyingRate: data.buyingRate,
          sellingRate: data.sellingRate,
          effectiveDate: new Date(data.effectiveDate).toISOString(),
          ...(data.expiryDate ? { expiryDate: new Date(data.expiryDate).toISOString() } : {}),
          updateMethod: data.updateMethod,
          ...(data.notes ? { notes: data.notes } : {}),
          isActive: data.isActive ?? (rate?.isActive ?? true),
        };
        onSubmit(formData);
      } else {
        const formData: CreateExchangeRateDto = {
          baseCurrency: data.baseCurrency,
          targetCurrency: data.targetCurrency,
          buyingRate: data.buyingRate,
          sellingRate: data.sellingRate,
          effectiveDate: new Date(data.effectiveDate).toISOString(),
          ...(data.expiryDate ? { expiryDate: new Date(data.expiryDate).toISOString() } : {}),
          updateMethod: data.updateMethod,
          ...(data.notes ? { notes: data.notes } : {}),
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        };
        onSubmit(formData);
      }
    } finally {
      setLoading(false);
    }
  };

  const onFormInvalid = (formErrors: any) => {
    const messages = Object.entries(formErrors)
      .map(([field, err]: [string, any]) => err?.message)
      .filter(Boolean)
      .slice(0, 3);
    if (messages.length > 0) {
      alert(`Veuillez corriger les erreurs:\n\n${messages.join('\n')}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <form onSubmit={handleSubmit(onFormSubmit, onFormInvalid)}>
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEdit ? 'Modifier le taux' : 'Nouveau taux de change'}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-6">
            {/* Branch Selection - Only for SuperAdmin when creating new rate */}
            {!isEdit && isSuperAdmin && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Succursale (Optionnel)
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Taux Global (Toutes les succursales)</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  {selectedBranchId 
                    ? 'Ce taux s\'appliquera uniquement à la succursale sélectionnée' 
                    : 'Ce taux s\'appliquera à toutes les succursales'}
                </p>
              </div>
            )}

            {/* Branch Info for Branch Managers */}
            {isBranchManager && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  📍 Ce taux sera créé pour votre succursale uniquement
                </p>
              </div>
            )}

            {/* Currency Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Paire de devises</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Devise de base *
                  </label>
                  <select
                    {...register('baseCurrency')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value={CurrencyType.HTG}>{formatCurrencyType(CurrencyType.HTG)}</option>
                    <option value={CurrencyType.USD}>{formatCurrencyType(CurrencyType.USD)}</option>
                    <option value={CurrencyType.EUR}>{formatCurrencyType(CurrencyType.EUR)}</option>
                    <option value={CurrencyType.CAD}>{formatCurrencyType(CurrencyType.CAD)}</option>
                    <option value={CurrencyType.DOP}>{formatCurrencyType(CurrencyType.DOP)}</option>
                    <option value={CurrencyType.JMD}>{formatCurrencyType(CurrencyType.JMD)}</option>
                  </select>
                  {errors.baseCurrency && (
                    <p className="text-red-500 text-sm mt-1">{errors.baseCurrency.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Devise cible *
                  </label>
                  <select
                    {...register('targetCurrency')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value={CurrencyType.HTG}>{formatCurrencyType(CurrencyType.HTG)}</option>
                    <option value={CurrencyType.USD}>{formatCurrencyType(CurrencyType.USD)}</option>
                    <option value={CurrencyType.EUR}>{formatCurrencyType(CurrencyType.EUR)}</option>
                    <option value={CurrencyType.CAD}>{formatCurrencyType(CurrencyType.CAD)}</option>
                    <option value={CurrencyType.DOP}>{formatCurrencyType(CurrencyType.DOP)}</option>
                    <option value={CurrencyType.JMD}>{formatCurrencyType(CurrencyType.JMD)}</option>
                  </select>
                  {errors.targetCurrency && (
                    <p className="text-red-500 text-sm mt-1">{errors.targetCurrency.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Exchange Rates */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Taux de change</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Taux d'achat *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    {...register('buyingRate')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="130.000000"
                  />
                  {errors.buyingRate && (
                    <p className="text-red-500 text-sm mt-1">{errors.buyingRate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Taux de vente *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    {...register('sellingRate')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="132.000000"
                  />
                  {errors.sellingRate && (
                    <p className="text-red-500 text-sm mt-1">{errors.sellingRate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spread
                  </label>
                  <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                    {spread.toFixed(4)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Validity Period */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Période de validité</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Date d'effet *
                  </label>
                  <input
                    type="date"
                    {...register('effectiveDate')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.effectiveDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.effectiveDate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Date d'expiration (optionnel)
                  </label>
                  <input
                    type="date"
                    {...register('expiryDate')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.expiryDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.expiryDate.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Méthode de mise à jour *
                  </label>
                  <select
                    {...register('updateMethod')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value={RateUpdateMethod.Manual}>Manuel</option>
                    <option value={RateUpdateMethod.Automatic}>Automatique</option>
                    <option value={RateUpdateMethod.External}>Externe</option>
                  </select>
                  {errors.updateMethod && (
                    <p className="text-red-500 text-sm mt-1">{errors.updateMethod.message}</p>
                  )}
                </div>

                {isEdit && (
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('isActive')}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Taux actif</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optionnel)
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Commentaires sur ce taux de change..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 flex items-center"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              <Save className="w-4 h-4 mr-2" />
              {isEdit ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExchangeRateForm;