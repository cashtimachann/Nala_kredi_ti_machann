import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { X, Info, TrendingUp, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface TermSavingsFormData {
  customerId: string;
  customerName: string;
  branchId: string;
  currency: 'HTG' | 'USD';
  principalAmount: number;
  termMonths: 3 | 6 | 12 | 24 | 36;
  interestRate: number;
  startDate: string;
  autoRenew: boolean;
  depositMode: 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'TRANSFER';
}

interface TermSavingsFormProps {
  onSubmit: (data: TermSavingsFormData) => void;
  onCancel: () => void;
}

// Taux d'intérêt par durée
const interestRates = {
  HTG: {
    3: 6.0,
    6: 7.0,
    12: 8.5,
    24: 10.0,
    36: 11.5
  },
  USD: {
    3: 4.5,
    6: 5.5,
    12: 7.0,
    24: 8.5,
    36: 10.0
  }
};

const validationSchema: yup.ObjectSchema<TermSavingsFormData> = yup.object().shape({
  customerId: yup.string().required('Client requis'),
  customerName: yup.string().required('Nom du client requis'),
  branchId: yup.string().required('Succursale requise'),
  currency: yup.mixed<'HTG' | 'USD'>().oneOf(['HTG', 'USD']).required('Devise requise') as any,
  principalAmount: yup.number()
    .min(1000, 'Le montant minimum est de 1,000')
    .required('Montant requis'),
  termMonths: yup.mixed<3 | 6 | 12 | 24 | 36>().oneOf([3, 6, 12, 24, 36]).required('Durée requise') as any,
  interestRate: yup.number().required('Taux d\'intérêt requis'),
  startDate: yup.string().required('Date de début requise'),
  depositMode: yup.mixed<'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'TRANSFER'>().oneOf(['ESPECES', 'CHEQUE', 'VIREMENT', 'TRANSFER']).required('Mode de dépôt requis') as any,
  autoRenew: yup.boolean().required()
}) as any;

const TermSavingsForm: React.FC<TermSavingsFormProps> = ({ onSubmit, onCancel }) => {
  const [currency, setCurrency] = useState<'HTG' | 'USD'>('HTG');
  const [termMonths, setTermMonths] = useState<3 | 6 | 12 | 24 | 36>(12);
  const [principalAmount, setPrincipalAmount] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [projectedInterest, setProjectedInterest] = useState<number>(0);
  const [totalAtMaturity, setTotalAtMaturity] = useState<number>(0);
  const [maturityDate, setMaturityDate] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch
  } = useForm<TermSavingsFormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      currency: 'HTG',
      termMonths: 12,
      autoRenew: false,
      startDate: new Date().toISOString().split('T')[0]
    }
  });

  const watchedCurrency = watch('currency');
  const watchedTerm = watch('termMonths');
  const watchedAmount = watch('principalAmount');
  const watchedStartDate = watch('startDate');

  useEffect(() => {
    if (watchedCurrency && watchedTerm) {
      const rate = interestRates[watchedCurrency][watchedTerm];
      setInterestRate(rate);
      setValue('interestRate', rate);
    }
  }, [watchedCurrency, watchedTerm, setValue]);

  useEffect(() => {
    if (watchedAmount && interestRate && watchedTerm) {
      // Calcul des intérêts simples
      const interest = (watchedAmount * interestRate * (watchedTerm / 12)) / 100;
      setProjectedInterest(interest);
      setTotalAtMaturity(watchedAmount + interest);
    }
  }, [watchedAmount, interestRate, watchedTerm]);

  useEffect(() => {
    if (watchedStartDate && watchedTerm) {
      const start = new Date(watchedStartDate);
      const maturity = new Date(start);
      maturity.setMonth(maturity.getMonth() + watchedTerm);
      setMaturityDate(maturity.toISOString().split('T')[0]);
    }
  }, [watchedStartDate, watchedTerm]);

  const handleFormSubmit = (data: TermSavingsFormData) => {
    onSubmit({
      ...data,
      interestRate,
      currency,
      termMonths
    });
  };

  const handleCurrencyChange = (newCurrency: 'HTG' | 'USD') => {
    setCurrency(newCurrency);
    setValue('currency', newCurrency);
    const rate = interestRates[newCurrency][termMonths];
    setInterestRate(rate);
    setValue('interestRate', rate);
  };

  const handleTermChange = (newTerm: 3 | 6 | 12 | 24 | 36) => {
    setTermMonths(newTerm);
    setValue('termMonths', newTerm);
    const rate = interestRates[currency][newTerm];
    setInterestRate(rate);
    setValue('interestRate', rate);
  };

  const formatCurrency = (amount: number, curr: 'HTG' | 'USD') => {
    if (curr === 'HTG') {
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount) + ' HTG';
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const termOptions = [
    { value: 3, label: '3 mois', rate: interestRates[currency][3] },
    { value: 6, label: '6 mois', rate: interestRates[currency][6] },
    { value: 12, label: '12 mois', rate: interestRates[currency][12] },
    { value: 24, label: '24 mois', rate: interestRates[currency][24] },
    { value: 36, label: '36 mois', rate: interestRates[currency][36] }
  ];

  const branches = [
    { id: '1', name: 'Port-au-Prince - Centre' },
    { id: '2', name: 'Cap-Haïtien' },
    { id: '3', name: 'Gonaïves' },
    { id: '4', name: 'Les Cayes' },
    { id: '5', name: 'Saint-Marc' }
  ];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Information Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Compte d'Épargne à Terme</p>
          <p>Les fonds seront bloqués pendant la durée choisie. Un retrait anticipé entraînera des pénalités (perte de 50% des intérêts accumulés).</p>
        </div>
      </div>

      {/* Client Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Informations Client
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Code Client *
            </label>
            <input
              type="text"
              {...register('customerId')}
              placeholder="Ex: C001"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.customerId ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.customerId && (
              <p className="mt-1 text-sm text-red-600">{errors.customerId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du Client *
            </label>
            <input
              type="text"
              {...register('customerName')}
              placeholder="Nom complet"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.customerName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.customerName && (
              <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Succursale *
            </label>
            <select
              {...register('branchId')}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.branchId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Sélectionner une succursale</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            {errors.branchId && (
              <p className="mt-1 text-sm text-red-600">{errors.branchId.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Currency Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Devise *</h3>
        <div className="flex gap-4">
          {(['HTG', 'USD'] as const).map((curr) => (
            <button
              key={curr}
              type="button"
              onClick={() => handleCurrencyChange(curr)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                currency === curr
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
              }`}
            >
              {curr}
            </button>
          ))}
        </div>
      </div>

      {/* Term Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Durée du Placement *
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {termOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleTermChange(option.value as any)}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                termMonths === option.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <p className="font-bold text-lg text-gray-900">{option.label}</p>
              <p className={`text-sm mt-1 ${
                termMonths === option.value ? 'text-primary-700 font-semibold' : 'text-gray-600'
              }`}>
                {option.rate}% / an
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Amount and Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Montant du Dépôt * {currency === 'HTG' ? '(Min: 1,000 HTG)' : '(Min: 100 USD)'}
          </label>
          <input
            type="number"
            {...register('principalAmount')}
            onChange={(e) => {
              setValue('principalAmount', Number(e.target.value));
              setPrincipalAmount(Number(e.target.value));
            }}
            placeholder={currency === 'HTG' ? '10,000' : '500'}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.principalAmount ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.principalAmount && (
            <p className="mt-1 text-sm text-red-600">{errors.principalAmount.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date de Début *
          </label>
          <input
            type="date"
            {...register('startDate')}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.startDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mode de Dépôt *
          </label>
          <select
            {...register('depositMode')}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.depositMode ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Sélectionner un mode</option>
            <option value="ESPECES">Espèces</option>
            <option value="CHEQUE">Chèque</option>
            <option value="VIREMENT">Virement</option>
            <option value="TRANSFER">Transfert d'un autre compte</option>
          </select>
          {errors.depositMode && (
            <p className="mt-1 text-sm text-red-600">{errors.depositMode.message}</p>
          )}
        </div>
      </div>

      {/* Projection Summary */}
      {principalAmount > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Projection de Rendement
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Capital Initial</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(principalAmount, currency)}
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Intérêts Projetés ({interestRate}%)</p>
              <p className="text-2xl font-bold text-green-600">
                + {formatCurrency(projectedInterest, currency)}
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Total à l'Échéance</p>
              <p className="text-2xl font-bold text-primary-600">
                {formatCurrency(totalAtMaturity, currency)}
              </p>
            </div>
          </div>

          {maturityDate && (
            <div className="bg-white rounded-lg p-3 border border-green-200">
              <p className="text-sm text-gray-600">
                <strong>Date d'échéance:</strong> {new Date(maturityDate).toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Auto-Renewal Option */}
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
        <input
          type="checkbox"
          {...register('autoRenew')}
          id="autoRenew"
          className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
        />
        <label htmlFor="autoRenew" className="flex-1 text-sm text-gray-700">
          <span className="font-medium">Renouvellement automatique</span>
          <p className="text-gray-600 mt-1">
            À l'échéance, le capital + intérêts seront automatiquement réinvestis pour la même durée.
          </p>
        </label>
      </div>

      {/* Penalty Warning */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-orange-900">
          <p className="font-medium">Pénalités de retrait anticipé</p>
          <p className="mt-1">En cas de retrait avant l'échéance, 50% des intérêts accumulés seront perdus et des frais de fermeture anticipée peuvent s'appliquer.</p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-4 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Création en cours...' : 'Créer le Compte'}
        </button>
      </div>
    </form>
  );
};

export default TermSavingsForm;
