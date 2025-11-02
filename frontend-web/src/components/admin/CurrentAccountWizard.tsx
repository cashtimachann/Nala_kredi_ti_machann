import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
  X, ChevronLeft, ChevronRight, Check,
  User, Building2, UserCheck, Briefcase, 
  DollarSign, Shield, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/apiService';
import { CreateCurrentAccountRequest } from '../../types/clientAccounts';
import { Step2Physique, Step2Morale, Step3AuthorizedPerson } from './WizardSteps';
import { Step4Professional, Step5AccountConfig, Step6SecurityReview } from './WizardStepsExtended';

// Types
type ClientType = 'PHYSIQUE' | 'MORALE';

interface WizardFormData {
  // Step 1: Type
  clientType: ClientType;
  
  // Step 2: Identification - Personne Physique
  fullName?: string;
  gender?: 'M' | 'F';
  birthDate?: string;
  birthPlace?: string;
  nationality?: string;
  nif?: string;
  cin?: string;
  idType?: 'CIN' | 'PASSPORT' | 'PERMIS';
  idNumber?: string;
  idIssueDate?: string;
  idExpiryDate?: string;
  address?: string;
  commune?: string;
  department?: string;
  postalAddress?: string;
  phone?: string;
  email?: string;
  
  // Step 2: Identification - Personne Morale
  companyName?: string;
  legalForm?: 'SA' | 'SEM' | 'INDIVIDUELLE' | 'COOPERATIVE';
  commerceNumber?: string;
  companyNif?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  legalRepName?: string;
  legalRepTitle?: string;
  legalRepIdNumber?: string;
  
  // Step 3: Personne Autorisée (optionnel)
  hasAuthorizedPerson?: boolean;
  authPersonName?: string;
  authPersonId?: string;
  authPersonRelation?: string;
  authPersonPhone?: string;
  authPersonLimit?: number;
  
  // Step 4: Informations Professionnelles
  profession?: string;
  employer?: string;
  workAddress?: string;
  incomeSource?: string;
  monthlyIncome?: number;
  fundsOrigin?: string;
  accountPurpose?: string;
  transactionFrequency?: 'JOURNALIER' | 'HEBDOMADAIRE' | 'MENSUEL' | 'OCCASIONNEL';
  
  // Step 5: Configuration du Compte
  branchId?: string;
  currency?: 'HTG' | 'USD';
  initialDeposit?: number;
  depositMode?: 'ESPECES' | 'CHEQUE' | 'VIREMENT';
  minimumBalance?: number;
  dailyWithdrawalLimit?: number;
  monthlyWithdrawalLimit?: number;
  allowOverdraft?: boolean;
  overdraftLimit?: number;
  maintenanceFee?: number;
  checkbookFee?: number;
  
  // Step 6: Sécurité
  pin?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  
  // Optionnel
  referenceName?: string;
  referencePhone?: string;
  maritalStatus?: 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF';
  dependents?: number;
  educationLevel?: 'PRIMAIRE' | 'SECONDAIRE' | 'UNIVERSITAIRE' | 'AUTRE';
}

interface CurrentAccountWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CurrentAccountWizard: React.FC<CurrentAccountWizardProps> = ({ onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>({
    clientType: 'PHYSIQUE',
    hasAuthorizedPerson: false,
    allowOverdraft: false,
    currency: 'HTG'
  });

  const totalSteps = 6;

  // Validation schemas for each step
  const step1Schema = yup.object().shape({
    clientType: yup.string().oneOf(['PHYSIQUE', 'MORALE']).required()
  });

  const step2PhysiqueSchema = yup.object().shape({
    fullName: yup.string().required('Nom complet requis'),
    gender: yup.string().oneOf(['M', 'F']).required('Sexe requis'),
    birthDate: yup.string().required('Date de naissance requise'),
    birthPlace: yup.string().required('Lieu de naissance requis'),
    nationality: yup.string().required('Nationalité requise'),
    idType: yup.string().oneOf(['CIN', 'PASSPORT', 'PERMIS']).required('Type de pièce requis'),
    idNumber: yup.string().required('Numéro de pièce requis'),
    idIssueDate: yup.string().required('Date de délivrance requise'),
    idExpiryDate: yup.string().required('Date d\'expiration requise'),
    address: yup.string().required('Adresse requise'),
    commune: yup.string().required('Commune requise'),
    department: yup.string().required('Département requis'),
    phone: yup.string().required('Téléphone requis'),
    email: yup.string().email('Email invalide').required('Email requis')
  });

  const step2MoraleSchema = yup.object().shape({
    companyName: yup.string().required('Raison sociale requise'),
    legalForm: yup.string().oneOf(['SA', 'SEM', 'INDIVIDUELLE', 'COOPERATIVE']).required('Forme juridique requise'),
    commerceNumber: yup.string().required('Numéro de commerce requis'),
    companyNif: yup.string().required('NIF requis'),
    companyAddress: yup.string().required('Adresse requise'),
    companyPhone: yup.string().required('Téléphone requis'),
    companyEmail: yup.string().email('Email invalide').required('Email requis'),
    legalRepName: yup.string().required('Nom du représentant requis'),
    legalRepTitle: yup.string().required('Titre du représentant requis'),
    legalRepIdNumber: yup.string().required('Pièce d\'identité du représentant requise')
  });

  const step4Schema = yup.object().shape({
    profession: yup.string().required('Profession requise'),
    incomeSource: yup.string().required('Source de revenus requise'),
    monthlyIncome: yup.number().min(0).required('Revenu mensuel requis'),
    fundsOrigin: yup.string().required('Origine des fonds requise'),
    accountPurpose: yup.string().required('But du compte requis'),
    transactionFrequency: yup.string().required('Fréquence requise')
  });

  const step5Schema = yup.object().shape({
    branchId: yup.string().required('Succursale requise'),
    currency: yup.string().oneOf(['HTG', 'USD']).required('Devise requise'),
    initialDeposit: yup.number().min(0).required('Dépôt initial requis'),
    depositMode: yup.string().required('Mode de versement requis')
  });

  const step6Schema = yup.object().shape({
    pin: yup.string().matches(/^\d{4}$/, 'Le PIN doit contenir 4 chiffres').required('PIN requis'),
    securityQuestion: yup.string().required('Question de sécurité requise'),
    securityAnswer: yup.string().required('Réponse de sécurité requise')
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<WizardFormData>({
    defaultValues: formData,
    mode: 'onBlur'
  });

  const clientType = watch('clientType');
  const hasAuthorizedPerson = watch('hasAuthorizedPerson');
  const allowOverdraft = watch('allowOverdraft');
  const currency = watch('currency');

  // Handle step navigation
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

  const handleStepSubmit = (data: WizardFormData) => {
    setFormData({ ...formData, ...data });
    
    if (currentStep === totalSteps) {
      // Final submission
      handleFinalSubmit(data);
    } else {
      nextStep();
    }
  };

  const handleFinalSubmit = async (data: WizardFormData) => {
    try {
      // Minimal mapping to backend request
      const req: CreateCurrentAccountRequest = {
        customerId: data.companyNif || data.nif || data.idNumber || data.phone || '',
        currency: (data.currency || 'HTG') as 'HTG' | 'USD',
        initialDeposit: Number(data.initialDeposit || 0),
        branchId: Number(data.branchId || 0),
        minimumBalance: data.minimumBalance ? Number(data.minimumBalance) : undefined,
        dailyWithdrawalLimit: data.dailyWithdrawalLimit ? Number(data.dailyWithdrawalLimit) : undefined,
        monthlyWithdrawalLimit: data.monthlyWithdrawalLimit ? Number(data.monthlyWithdrawalLimit) : undefined,
        overdraftLimit: data.allowOverdraft ? Number(data.overdraftLimit || 0) : undefined,
        dailyDepositLimit: data.dailyWithdrawalLimit ? Number(data.dailyWithdrawalLimit) : undefined,
        // Security & KYC
        pin: data.pin,
        securityQuestion: data.securityQuestion,
        securityAnswer: data.securityAnswer,
        depositMethod: data.depositMode,
        originOfFunds: data.fundsOrigin || data.incomeSource,
        transactionFrequency: data.transactionFrequency,
        accountPurpose: data.accountPurpose,
        // Authorized signer (single) if provided
        authorizedSigners: data.hasAuthorizedPerson && data.authPersonName ? [{
          fullName: data.authPersonName,
          role: data.authPersonRelation,
          documentNumber: data.authPersonId,
          phone: data.authPersonPhone
        }] : undefined
      };

      if (!req.customerId) {
        toast.error("Identifiant client manquant (NIF/CIN/ID)");
        return;
      }
      if (!req.branchId) {
        toast.error("Succursale requise");
        return;
      }

      await apiService.createCurrentAccount(req);
      toast.success('Compte courant créé avec succès!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Erreur lors de la création du compte');
    }
  };

  // Progress calculation
  const progress = (currentStep / totalSteps) * 100;

  // Step icons
  const stepIcons = [
    { step: 1, icon: User, label: 'Type' },
    { step: 2, icon: Building2, label: 'Identification' },
    { step: 3, icon: UserCheck, label: 'Personne Autorisée' },
    { step: 4, icon: Briefcase, label: 'Professionnel' },
    { step: 5, icon: DollarSign, label: 'Compte' },
    { step: 6, icon: Shield, label: 'Sécurité' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Ouverture de Compte Courant</h2>
            <button
              onClick={onClose}
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
          {/* Step 1: Type de Client */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Type de Client</h3>
                <p className="text-gray-600">Sélectionnez le type de compte à ouvrir</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personne Physique */}
                <button
                  type="button"
                  onClick={() => setValue('clientType', 'PHYSIQUE')}
                  className={`p-8 border-2 rounded-xl text-left transition-all hover:shadow-lg ${
                    clientType === 'PHYSIQUE'
                      ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <User className="w-8 h-8 text-blue-600" />
                    </div>
                    {clientType === 'PHYSIQUE' && (
                      <div className="p-2 bg-primary-500 rounded-full">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Personne Physique</h4>
                  <p className="text-gray-600 text-sm">
                    Pour les particuliers - Compte personnel avec gestion simplifiée
                  </p>
                </button>

                {/* Personne Morale */}
                <button
                  type="button"
                  onClick={() => setValue('clientType', 'MORALE')}
                  className={`p-8 border-2 rounded-xl text-left transition-all hover:shadow-lg ${
                    clientType === 'MORALE'
                      ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Building2 className="w-8 h-8 text-purple-600" />
                    </div>
                    {clientType === 'MORALE' && (
                      <div className="p-2 bg-primary-500 rounded-full">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Personne Morale</h4>
                  <p className="text-gray-600 text-sm">
                    Pour les entreprises - Compte commercial avec fonctionnalités avancées
                  </p>
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Information importante</p>
                  <p>Les informations requises varient selon le type de client sélectionné. Assurez-vous d'avoir tous les documents nécessaires avant de continuer.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Identification */}
          {currentStep === 2 && (
            <>
              {clientType === 'PHYSIQUE' ? (
                <Step2Physique register={register} errors={errors} watch={watch} setValue={setValue} />
              ) : (
                <Step2Morale register={register} errors={errors} watch={watch} setValue={setValue} />
              )}
            </>
          )}

          {/* Step 3: Personne Autorisée */}
          {currentStep === 3 && (
            <Step3AuthorizedPerson register={register} errors={errors} watch={watch} setValue={setValue} />
          )}

          {/* Step 4: Informations Professionnelles */}
          {currentStep === 4 && (
            <Step4Professional register={register} errors={errors} watch={watch} setValue={setValue} />
          )}

          {/* Step 5: Configuration du Compte */}
          {currentStep === 5 && (
            <Step5AccountConfig register={register} errors={errors} watch={watch} setValue={setValue} />
          )}

          {/* Step 6: Sécurité et Révision */}
          {currentStep === 6 && (
            <Step6SecurityReview register={register} errors={errors} watch={watch} setValue={setValue} />
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
                Créer le Compte
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

export default CurrentAccountWizard;
