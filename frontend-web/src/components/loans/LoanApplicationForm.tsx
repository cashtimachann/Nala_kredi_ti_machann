import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  X, ChevronLeft, ChevronRight, Check, User, DollarSign,
  FileText, Users, ShieldCheck, AlertCircle, Info, Calendar,
  TrendingUp, Building2, CheckCircle
} from 'lucide-react';
// import toast from 'react-hot-toast';

// Types
type LoanType = 'COMMERCIAL' | 'AGRICULTURAL' | 'PERSONAL' | 'EMERGENCY';

interface LoanApplicationFormData {
  // Step 1: Type de crédit
  loanType: LoanType;
  
  // Step 2: Informations client
  customerId: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  occupation: string;
  monthlyIncome: number;
  dependents: number;
  
  // Step 3: Détails du prêt
  requestedAmount: number;
  currency: 'HTG' | 'USD';
  termMonths: number;
  purpose: string;
  
  // Step 4: Garanties
  collateralType: string;
  collateralValue: number;
  collateralDescription: string;
  
  // Step 5: Références et garants
  guarantor1Name: string;
  guarantor1Phone: string;
  guarantor1Relation: string;
  guarantor2Name?: string;
  guarantor2Phone?: string;
  guarantor2Relation?: string;
  reference1Name: string;
  reference1Phone: string;
  reference2Name: string;
  reference2Phone: string;
  
  // Step 6: Documents
  hasNationalId: boolean;
  hasProofOfResidence: boolean;
  hasProofOfIncome: boolean;
  hasCollateralDocs: boolean;
  
  // Additional
  branchId: string;
  notes?: string;
}

interface LoanApplicationFormProps {
  onSubmit: (data: LoanApplicationFormData) => void;
  onCancel: () => void;
}

// Taux d'intérêt par type de crédit
const interestRates = {
  COMMERCIAL: { HTG: 18, USD: 15 },
  AGRICULTURAL: { HTG: 15, USD: 12 },
  PERSONAL: { HTG: 20, USD: 17 },
  EMERGENCY: { HTG: 22, USD: 19 }
};

// Montants max par type
const maxAmounts = {
  COMMERCIAL: { HTG: 500000, USD: 10000 },
  AGRICULTURAL: { HTG: 300000, USD: 6000 },
  PERSONAL: { HTG: 200000, USD: 4000 },
  EMERGENCY: { HTG: 50000, USD: 1000 }
};

// Validation (Zod)
const loanApplicationSchema = z.object({
  loanType: z.string().regex(/^(COMMERCIAL|AGRICULTURAL|PERSONAL|EMERGENCY)$/),
  customerId: z.string().min(1, 'Code client requis'),
  customerName: z.string().min(1, 'Nom requis'),
  phone: z.string().min(8, 'Téléphone requis'),
  email: z.string().email('Email invalide').optional(),
  address: z.string().min(3, 'Adresse requise'),
  occupation: z.string().min(2, 'Profession requise'),
  monthlyIncome: z.coerce.number().min(0, 'Revenu invalide'),
  dependents: z.coerce.number().min(0).default(0),
  requestedAmount: z.coerce.number().min(1, 'Montant requis'),
  currency: z.string().regex(/^(HTG|USD)$/),
  termMonths: z.coerce.number().min(1, 'Durée requise'),
  purpose: z.string().min(3, 'Objet du prêt requis'),
  collateralType: z.string().min(1, 'Type de garantie requis'),
  collateralValue: z.coerce.number().min(0, 'Valeur de garantie invalide'),
  collateralDescription: z.string().min(5, 'Description requise'),
  guarantor1Name: z.string().min(1, 'Nom du garant requis'),
  guarantor1Phone: z.string().min(8, 'Téléphone du garant requis'),
  guarantor1Relation: z.string().min(1, 'Lien requis'),
  guarantor2Name: z.string().optional(),
  guarantor2Phone: z.string().optional(),
  guarantor2Relation: z.string().optional(),
  reference1Name: z.string().min(1, 'Référence 1 requise'),
  reference1Phone: z.string().min(1, 'Téléphone référence 1 requis'),
  reference2Name: z.string().min(1, 'Référence 2 requise'),
  reference2Phone: z.string().min(1, 'Téléphone référence 2 requis'),
  hasNationalId: z.boolean(),
  hasProofOfResidence: z.boolean(),
  hasProofOfIncome: z.boolean(),
  hasCollateralDocs: z.boolean(),
  branchId: z.string().min(1, 'Succursale requise'),
  notes: z.string().optional(),
});

const LoanApplicationForm: React.FC<LoanApplicationFormProps> = ({ onSubmit, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<LoanApplicationFormData>>({
    loanType: 'COMMERCIAL',
    currency: 'HTG',
    hasNationalId: false,
    hasProofOfResidence: false,
    hasProofOfIncome: false,
    hasCollateralDocs: false
  });

  const totalSteps = 6;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<LoanApplicationFormData>({
    resolver: zodResolver(loanApplicationSchema) as any,
    defaultValues: formData as any,
    mode: 'onBlur'
  });

  const loanType = watch('loanType');
  const currency = watch('currency');
  const requestedAmount = watch('requestedAmount');
  const termMonths = watch('termMonths');

  const [interestRate, setInterestRate] = useState<number>(18);
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [totalRepayment, setTotalRepayment] = useState<number>(0);

  useEffect(() => {
    if (loanType && currency) {
      const rate = interestRates[loanType][currency];
      setInterestRate(rate);
    }
  }, [loanType, currency]);

  useEffect(() => {
    if (requestedAmount && termMonths && interestRate) {
      // Calcul de la mensualité avec intérêts composés
      const monthlyRate = interestRate / 100 / 12;
      const payment = requestedAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                      (Math.pow(1 + monthlyRate, termMonths) - 1);
      setMonthlyPayment(payment);
      setTotalRepayment(payment * termMonths);
    }
  }, [requestedAmount, termMonths, interestRate]);

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStepSubmit = (data: LoanApplicationFormData) => {
    setFormData({ ...formData, ...data });
    
    if (currentStep === totalSteps) {
      onSubmit(data);
    } else {
      nextStep();
    }
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

  const getLoanTypeInfo = (type: LoanType) => {
    const info = {
      COMMERCIAL: {
        icon: '🏪',
        title: 'Crédit Commercial',
        description: 'Pour petits commerces et activités génératrices de revenus',
        maxAmount: maxAmounts.COMMERCIAL,
        rate: interestRates.COMMERCIAL,
        term: '3-24 mois'
      },
      AGRICULTURAL: {
        icon: '🌾',
        title: 'Crédit Agricole',
        description: 'Pour activités agricoles et élevage',
        maxAmount: maxAmounts.AGRICULTURAL,
        rate: interestRates.AGRICULTURAL,
        term: '6-18 mois'
      },
      PERSONAL: {
        icon: '👤',
        title: 'Crédit Personnel',
        description: 'Pour besoins personnels et familiaux',
        maxAmount: maxAmounts.PERSONAL,
        rate: interestRates.PERSONAL,
        term: '3-18 mois'
      },
      EMERGENCY: {
        icon: '🚨',
        title: 'Crédit d\'Urgence',
        description: 'Crédit rapide pour situations urgentes',
        maxAmount: maxAmounts.EMERGENCY,
        rate: interestRates.EMERGENCY,
        term: '1-6 mois'
      }
    };
    return info[type];
  };

  const progress = (currentStep / totalSteps) * 100;

  const stepIcons = [
    { step: 1, icon: FileText, label: 'Type' },
    { step: 2, icon: User, label: 'Client' },
    { step: 3, icon: DollarSign, label: 'Prêt' },
    { step: 4, icon: Building2, label: 'Garanties' },
    { step: 5, icon: Users, label: 'Garants' },
    { step: 6, icon: ShieldCheck, label: 'Documents' }
  ];

  const branches = [
    { id: '1', name: 'Port-au-Prince - Centre' },
    { id: '2', name: 'Cap-Haïtien' },
    { id: '3', name: 'Gonaïves' },
    { id: '4', name: 'Les Cayes' },
    { id: '5', name: 'Saint-Marc' }
  ];

  const collateralTypes = [
    'Titre de propriété (maison/terrain)',
    'Stock de marchandises',
    'Véhicule',
    'Équipement professionnel',
    'Récolte future',
    'Épargne bloquée',
    'Autre'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Demande de Crédit</h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Étape {currentStep} sur {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Steps Navigator */}
        <div className="border-b border-gray-200 px-6 py-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {stepIcons.map(({ step, icon: Icon, label }) => (
              <div
                key={step}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  step === currentStep
                    ? 'bg-primary-100 text-primary-700'
                    : step < currentStep
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {step < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="text-sm font-medium whitespace-nowrap">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(handleStepSubmit)} className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Type de Crédit */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Type de Crédit</h3>
                <p className="text-gray-600">Sélectionnez le type de crédit souhaité</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['COMMERCIAL', 'AGRICULTURAL', 'PERSONAL', 'EMERGENCY'] as LoanType[]).map((type) => {
                  const info = getLoanTypeInfo(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setValue('loanType', type)}
                      className={`p-6 border-2 rounded-xl text-left transition-all hover:shadow-lg ${
                        loanType === type
                          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">{info.icon}</span>
                        {loanType === type && (
                          <div className="p-2 bg-primary-500 rounded-full">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 mb-2">{info.title}</h4>
                      <p className="text-sm text-gray-600 mb-3">{info.description}</p>
                      <div className="space-y-1 text-xs text-gray-500">
                        <p>• Max HTG: {formatCurrency(info.maxAmount.HTG, 'HTG')}</p>
                        <p>• Max USD: {formatCurrency(info.maxAmount.USD, 'USD')}</p>
                        <p>• Taux: {info.rate.HTG}% (HTG) / {info.rate.USD}% (USD)</p>
                        <p>• Durée: {info.term}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Conditions générales</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Garanties ou garants requis selon le montant</li>
                    <li>Documents d'identité à jour obligatoires</li>
                    <li>Évaluation de solvabilité avant approbation</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Informations Client */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Informations du Client</h3>
                <p className="text-gray-600">Renseignez les informations personnelles</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code Client *
                  </label>
                  <input
                    type="text"
                    {...register('customerId')}
                    placeholder="Ex: C001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom Complet *
                  </label>
                  <input
                    type="text"
                    {...register('customerName')}
                    placeholder="Nom et prénom"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    {...register('phone')}
                    placeholder="+509 XXXX XXXX"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="email@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse Complète *
                  </label>
                  <textarea
                    {...register('address')}
                    rows={2}
                    placeholder="Adresse résidentielle"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profession / Activité *
                  </label>
                  <input
                    type="text"
                    {...register('occupation')}
                    placeholder="Ex: Commerçant, Agriculteur"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Revenu Mensuel * (en {currency})
                  </label>
                  <input
                    type="number"
                    {...register('monthlyIncome')}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de Personnes à Charge
                  </label>
                  <input
                    type="number"
                    {...register('dependents')}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Succursale *
                  </label>
                  <select
                    {...register('branchId')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Détails du Prêt */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Détails du Prêt</h3>
                <p className="text-gray-600">Montant et conditions</p>
              </div>

              {/* Currency Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Devise *</label>
                <div className="flex gap-4">
                  {(['HTG', 'USD'] as const).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setValue('currency', curr)}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant Demandé * (Max: {formatCurrency(maxAmounts[loanType][currency], currency)})
                  </label>
                  <input
                    type="number"
                    {...register('requestedAmount')}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durée (mois) *
                  </label>
                  <select
                    {...register('termMonths')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    <option value="3">3 mois</option>
                    <option value="6">6 mois</option>
                    <option value="9">9 mois</option>
                    <option value="12">12 mois</option>
                    <option value="15">15 mois</option>
                    <option value="18">18 mois</option>
                    <option value="24">24 mois</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objet du Prêt *
                  </label>
                  <textarea
                    {...register('purpose')}
                    rows={3}
                    placeholder="Décrivez l'utilisation prévue des fonds..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Loan Calculation Summary */}
              {requestedAmount && termMonths && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 space-y-4">
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Calcul du Prêt
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Taux d'Intérêt</p>
                      <p className="text-2xl font-bold text-primary-600">{interestRate}%</p>
                      <p className="text-xs text-gray-500 mt-1">par an</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Mensualité</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(monthlyPayment, currency)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">pendant {termMonths} mois</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Total à Rembourser</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(totalRepayment, currency)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Intérêts: {formatCurrency(totalRepayment - requestedAmount, currency)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Garanties */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Garanties</h3>
                <p className="text-gray-600">Informations sur les garanties du prêt</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-900">
                  <p className="font-medium mb-1">Garanties requises</p>
                  <p>Les garanties doivent couvrir au minimum 120% du montant emprunté. Documents justificatifs requis.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de Garantie *
                  </label>
                  <select
                    {...register('collateralType')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner un type</option>
                    {collateralTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valeur Estimée de la Garantie * (en {currency})
                  </label>
                  <input
                    type="number"
                    {...register('collateralValue')}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {requestedAmount && watch('collateralValue') && (
                    <p className={`text-sm mt-1 ${
                      watch('collateralValue') >= requestedAmount * 1.2
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {watch('collateralValue') >= requestedAmount * 1.2
                        ? '✓ Garantie suffisante'
                        : `⚠ Minimum requis: ${formatCurrency(requestedAmount * 1.2, currency)}`
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description Détaillée de la Garantie *
                  </label>
                  <textarea
                    {...register('collateralDescription')}
                    rows={4}
                    placeholder="Ex: Maison en béton, 3 chambres, située à [adresse], titre de propriété n°..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Incluez les détails: numéro de titre, adresse exacte, dimensions, état, etc.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Documents requis pour les garanties:</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Titre de propriété original (pour biens immobiliers)</li>
                  <li>Facture d'achat et carte grise (pour véhicules)</li>
                  <li>Inventaire détaillé avec photos (pour marchandises)</li>
                  <li>Évaluation par expert (montants supérieurs à 100,000 HTG)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 5: Garants et Références */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Garants et Références</h3>
                <p className="text-gray-600">Personnes pouvant se porter garants</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-900">
                  <p className="font-medium mb-1">Garants obligatoires</p>
                  <p>Au moins 2 garants solvables requis. Ils doivent être en mesure de rembourser le prêt en cas de défaut.</p>
                </div>
              </div>

              {/* Garant 1 */}
              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-600" />
                  Garant Principal *
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom Complet *
                    </label>
                    <input
                      type="text"
                      {...register('guarantor1Name')}
                      placeholder="Nom et prénom"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      {...register('guarantor1Phone')}
                      placeholder="+509 XXXX XXXX"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lien avec l'Emprunteur *
                    </label>
                    <select
                      {...register('guarantor1Relation')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner</option>
                      <option value="FAMILY">Membre de la famille</option>
                      <option value="FRIEND">Ami(e)</option>
                      <option value="COLLEAGUE">Collègue</option>
                      <option value="BUSINESS_PARTNER">Partenaire d'affaires</option>
                      <option value="NEIGHBOR">Voisin(e)</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Garant 2 */}
              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-600" />
                  Garant Secondaire *
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom Complet *
                    </label>
                    <input
                      type="text"
                      {...register('guarantor2Name')}
                      placeholder="Nom et prénom"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      {...register('guarantor2Phone')}
                      placeholder="+509 XXXX XXXX"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lien avec l'Emprunteur *
                    </label>
                    <select
                      {...register('guarantor2Relation')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner</option>
                      <option value="FAMILY">Membre de la famille</option>
                      <option value="FRIEND">Ami(e)</option>
                      <option value="COLLEAGUE">Collègue</option>
                      <option value="BUSINESS_PARTNER">Partenaire d'affaires</option>
                      <option value="NEIGHBOR">Voisin(e)</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Références */}
              <div className="border-t-2 border-gray-200 pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Références Personnelles</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Référence 1 */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Référence 1 *</p>
                    <input
                      type="text"
                      {...register('reference1Name')}
                      placeholder="Nom complet"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <input
                      type="tel"
                      {...register('reference1Phone')}
                      placeholder="Téléphone"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {/* Référence 2 */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Référence 2 *</p>
                    <input
                      type="text"
                      {...register('reference2Name')}
                      placeholder="Nom complet"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <input
                      type="tel"
                      {...register('reference2Phone')}
                      placeholder="Téléphone"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Documents et Soumission */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Documents Requis</h3>
                <p className="text-gray-600">Vérification des documents à fournir</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">
                  <p className="font-medium mb-1">Documents obligatoires</p>
                  <p>Tous les documents cochés doivent être soumis avant le décaissement du prêt.</p>
                </div>
              </div>

              {/* Document Checklist */}
              <div className="space-y-4">
                <div className="border-2 border-gray-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('hasNationalId')}
                      className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Carte d'Identité Nationale (CIN) ou Passeport</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Document original à présenter. Photocopie recto-verso à fournir.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="border-2 border-gray-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('hasProofOfResidence')}
                      className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Justificatif de Domicile</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Facture d'électricité, d'eau ou attestation de résidence (moins de 3 mois).
                      </p>
                    </div>
                  </label>
                </div>

                <div className="border-2 border-gray-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('hasProofOfIncome')}
                      className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Justificatif de Revenus</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Bulletins de salaire (3 derniers mois), attestation de revenus, ou déclaration fiscale.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="border-2 border-gray-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('hasCollateralDocs')}
                      className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Documents de Garantie</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Titre de propriété, factures, photos, ou tout document justifiant la garantie.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Summary of Application */}
              <div className="border-t-2 border-gray-300 pt-6">
                <h4 className="font-semibold text-gray-900 mb-4 text-lg">Résumé de la Demande</h4>
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Type de Crédit</p>
                      <p className="text-lg font-bold text-gray-900">{getLoanTypeInfo(loanType).title}</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Client</p>
                      <p className="text-lg font-bold text-gray-900">{watch('customerName') || 'N/A'}</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Montant Demandé</p>
                      <p className="text-xl font-bold text-primary-600">
                        {requestedAmount ? formatCurrency(requestedAmount, currency) : 'N/A'}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Mensualité</p>
                      <p className="text-xl font-bold text-blue-600">
                        {monthlyPayment ? formatCurrency(monthlyPayment, currency) : 'N/A'}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Durée</p>
                      <p className="text-lg font-bold text-gray-900">{termMonths || 'N/A'} mois</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Taux d'Intérêt</p>
                      <p className="text-lg font-bold text-purple-600">{interestRate}%</p>
                    </div>
                  </div>

                  {watch('collateralType') && (
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Garantie</p>
                      <p className="text-sm font-semibold text-gray-900">{watch('collateralType')}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Valeur: {watch('collateralValue') ? formatCurrency(watch('collateralValue'), currency) : 'N/A'}
                      </p>
                    </div>
                  )}

                  {watch('guarantor1Name') && (
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-gray-600 mb-2">Garants</p>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">• {watch('guarantor1Name')}</p>
                        {watch('guarantor2Name') && (
                          <p className="text-sm font-medium text-gray-900">• {watch('guarantor2Name')}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes additionnelles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes Additionnelles
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  placeholder="Informations supplémentaires à communiquer..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-900">
                  <p className="font-medium mb-1">Prêt à soumettre</p>
                  <p>Votre demande sera examinée par notre comité de crédit. Vous recevrez une réponse sous 3-5 jours ouvrables.</p>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer - Navigation Buttons */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Précédent
            </button>

            <div className="text-sm text-gray-600">
              Étape {currentStep} / {totalSteps}
            </div>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleSubmit(handleStepSubmit)}
                className="flex items-center gap-2 px-6 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Suivant
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit(handleStepSubmit)}
                className="flex items-center gap-2 px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Check className="w-5 h-5" />
                Soumettre
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default LoanApplicationForm;
