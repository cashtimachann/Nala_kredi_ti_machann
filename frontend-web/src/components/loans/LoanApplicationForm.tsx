import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import {
  X, ChevronLeft, ChevronRight, Check, User, DollarSign,
  FileText, Users, ShieldCheck, AlertCircle, Info, TrendingUp,
  Building2, CheckCircle, Loader2
} from 'lucide-react';
import { LoanType } from '../../types/microcredit';
import { getLoanTypeInfo, requiresCollateral } from '../../utils/loanTypeHelpers';
import LoanTypeSelector from './LoanTypeSelector';
import { microcreditLoanApplicationService, CreateLoanApplicationRequest } from '../../services/microcreditLoanApplicationService';

interface LoanApplicationFormData {
  // Step 1: Type de crédit
  loanType: LoanType;
  
  // Step 2: Informations client
  savingsAccountNumber: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  occupation: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  existingDebts: number;
  dependents: number;
  
  // Step 3: Détails du prêt
  requestedAmount: number;
  currency: 'HTG' | 'USD';
  termMonths: number;
  interestRate: number;
  monthlyInterestRate: number;
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

// Validation (Zod)
const loanApplicationSchema = z.object({
  loanType: z.nativeEnum(LoanType),
  savingsAccountNumber: z.string().min(1, 'Numéro de compte d\'épargne requis'),
  customerName: z.string().min(1, 'Nom requis'),
  phone: z.string().min(8, 'Téléphone requis'),
  email: z.string().email().or(z.string().length(0)).optional(),
  address: z.string().min(3, 'Adresse requise'),
  occupation: z.string().min(2, 'Profession requise'),
  monthlyIncome: z.coerce.number().min(0, 'Revenu invalide'),
  monthlyExpenses: z.coerce.number().min(0, 'Dépenses invalides'),
  existingDebts: z.coerce.number().min(0, 'Dettes invalides'),
  dependents: z.coerce.number().min(0).default(0),
  requestedAmount: z.coerce.number().min(1, 'Montant requis'),
  currency: z.string().regex(/^(HTG|USD)$/),
  termMonths: z.coerce.number().min(1, 'Durée requise'),
  interestRate: z.coerce.number().min(0, 'Taux d\'intérêt invalide').max(50, 'Taux d\'intérêt trop élevé'),
  monthlyInterestRate: z.coerce.number().min(0, 'Taux d\'intérêt mensuel invalide').max(5, 'Taux d\'intérêt mensuel trop élevé'),
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
  const [useKreyol, setUseKreyol] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [savingsBalance, setSavingsBalance] = useState<number>(0);
  const [savingsBalanceError, setSavingsBalanceError] = useState<string | null>(null);

  // Fonction pour récupérer les informations du client par numéro de compte
  const fetchCustomerInfo = async (accountNumber: string) => {
    if (!accountNumber || accountNumber.length < 12) {
      setCustomerInfo(null);
      setAccountError(null);
      setValue('customerName', '');
      return;
    }

    setIsLoadingCustomer(true);
    setAccountError(null);
    try {
      const accountInfo = await microcreditLoanApplicationService.getSavingsAccountByNumber(accountNumber);
      if (accountInfo && accountInfo.customerName) {
        setCustomerInfo(accountInfo);
        setAccountError(null);
        setValue('customerName', accountInfo.customerName);
        // Récupérer le solde du compte d'épargne si disponible
        if (accountInfo.balance !== undefined) {
          setSavingsBalance(accountInfo.balance);
        }
      } else {
        setCustomerInfo(null);
        setAccountError('Compte d\'épargne introuvable ou invalide');
        setValue('customerName', '');
        setSavingsBalance(0);
      }
    } catch (error: any) {
      console.error('Error fetching customer info:', error);
      setCustomerInfo(null);
      setAccountError('Erreur lors de la recherche du compte. Vérifiez le numéro et réessayez.');
      setValue('customerName', '');
      setSavingsBalance(0);
    } finally {
      setIsLoadingCustomer(false);
    }
  };

  const [formData, setFormData] = useState<Partial<LoanApplicationFormData>>({
    loanType: LoanType.COMMERCIAL,
    currency: 'HTG',
    hasNationalId: false,
    hasProofOfResidence: false,
    hasProofOfIncome: false,
    hasCollateralDocs: false,
    monthlyExpenses: 0,
    existingDebts: 0
  });

  const totalSteps = 6;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control
  } = useForm<LoanApplicationFormData>({
    defaultValues: formData as any,
    mode: 'onBlur'
  });

  const loanType = watch('loanType') as LoanType;
  const currency = watch('currency');
  const requestedAmount = watch('requestedAmount');
  const termMonths = watch('termMonths');
  const interestRate = Number(watch('interestRate') || 42);
  const monthlyInterestRate = watch('monthlyInterestRate') ? Number(watch('monthlyInterestRate')) : (interestRate / 12);
  const collateralType = watch('collateralType');
  const savingsAccountNumber = watch('savingsAccountNumber');

  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [totalRepayment, setTotalRepayment] = useState<number>(0);

  // Debounce pour la recherche du compte d'épargne
  useEffect(() => {
    if (!savingsAccountNumber || savingsAccountNumber.length < 12) {
      setCustomerInfo(null);
      setAccountError(null);
      setValue('customerName', '');
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchCustomerInfo(savingsAccountNumber);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [savingsAccountNumber]);

  useEffect(() => {
    if (requestedAmount && termMonths && interestRate) {
      // Calcul de la mensualité avec intérêts composés
      const monthlyRate = monthlyInterestRate / 100;
      const payment = requestedAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                      (Math.pow(1 + monthlyRate, termMonths) - 1);
      setMonthlyPayment(payment);
      setTotalRepayment(payment * termMonths);
    }
  }, [requestedAmount, termMonths, monthlyInterestRate]);

  // Synchroniser les taux d'intérêt (annuel vers mensuel)
  useEffect(() => {
    if (interestRate !== undefined && interestRate !== null && interestRate > 0) {
      const calculatedMonthly = interestRate / 12;
      if (Math.abs(calculatedMonthly - monthlyInterestRate) > 0.01) {
        setValue('monthlyInterestRate', Number(calculatedMonthly.toFixed(4)));
      }
    }
  }, [interestRate]);

  // Synchroniser les taux d'intérêt (mensuel vers annuel)
  useEffect(() => {
    if (monthlyInterestRate !== undefined && monthlyInterestRate !== null && monthlyInterestRate > 0) {
      const calculatedAnnual = monthlyInterestRate * 12;
      if (Math.abs(calculatedAnnual - interestRate) > 0.01) {
        setValue('interestRate', Number(calculatedAnnual.toFixed(2)));
      }
    }
  }, [monthlyInterestRate]);

  // Fetch branches on component mount
  useEffect(() => {
    const fetchBranches = async () => {
      setIsLoadingBranches(true);
      try {
        const branchList = await microcreditLoanApplicationService.getBranches();
        setBranches(branchList);
      } catch (error) {
        console.error('Error fetching branches:', error);
        // Fallback to hardcoded branches if API fails
        setBranches([
          { id: 1, name: 'Port-au-Prince - Centre' },
          { id: 2, name: 'Cap-Haïtien' },
          { id: 3, name: 'Gonaïves' },
          { id: 4, name: 'Les Cayes' },
          { id: 5, name: 'Saint-Marc' }
        ]);
      } finally {
        setIsLoadingBranches(false);
      }
    };

    fetchBranches();
  }, []);

  // Vérifier le solde d'épargne lorsque "Épargne bloquée" est sélectionné
  useEffect(() => {
    if (collateralType === 'Épargne bloquée') {
      if (requestedAmount > 0 && savingsBalance > 0) {
        const minimumRequired = requestedAmount * 0.15; // 15% du montant demandé
        
        if (savingsBalance < minimumRequired) {
          setSavingsBalanceError(
            `⚠️ Solde d'épargne insuffisant. Vous avez ${formatCurrency(savingsBalance, currency)} ` +
            `mais il faut au minimum ${formatCurrency(minimumRequired, currency)} (15% du montant demandé) ` +
            `pour utiliser l'épargne bloquée comme garantie.`
          );
          // Ne pas mettre à jour la valeur si insuffisant
        } else {
          setSavingsBalanceError(null);
          // Mettre à jour automatiquement la valeur de la garantie seulement si suffisant
          setValue('collateralValue', savingsBalance);
        }
      } else if (requestedAmount > 0 && savingsBalance === 0) {
        setSavingsBalanceError('⚠️ Le solde de votre compte d\'épargne sera vérifié. Assurez-vous d\'avoir au moins 15% du montant demandé.');
      }
    } else {
      setSavingsBalanceError(null);
    }
  }, [collateralType, requestedAmount, savingsBalance, currency]);

  // Validation pour chaque étape
  const validateStep = (step: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const data = watch();

    switch (step) {
      case 1: // Type de crédit
        if (!data.loanType) {
          errors.push('Veuillez sélectionner un type de crédit');
        }
        break;

      case 2: // Informations client
        if (!data.savingsAccountNumber || data.savingsAccountNumber.length < 12) {
          errors.push('Numéro de compte d\'épargne requis (12 caractères minimum)');
        }
        if (!data.customerName || data.customerName.trim() === '') {
          errors.push('Nom du client requis');
        }
        if (!data.phone || data.phone.length < 8) {
          errors.push('Numéro de téléphone requis (8 caractères minimum)');
        }
        if (!data.address || data.address.trim().length < 3) {
          errors.push('Adresse complète requise');
        }
        if (!data.occupation || data.occupation.trim().length < 2) {
          errors.push('Profession requise');
        }
        if (!data.monthlyIncome || data.monthlyIncome <= 0) {
          errors.push('Revenu mensuel requis');
        }
        if (data.monthlyExpenses === undefined || data.monthlyExpenses < 0) {
          errors.push('Dépenses mensuelles requises');
        }
        if (data.existingDebts === undefined || data.existingDebts < 0) {
          errors.push('Dettes existantes requises (0 si aucune)');
        }
        if (!data.branchId) {
          errors.push('Veuillez sélectionner une succursale');
        }
        break;

      case 3: // Détails du prêt
        if (!data.requestedAmount || data.requestedAmount <= 0) {
          errors.push('Montant demandé requis');
        }
        if (!data.termMonths || data.termMonths <= 0) {
          errors.push('Durée du prêt requise');
        }
        if (!data.interestRate || data.interestRate <= 0) {
          errors.push('Taux d\'intérêt requis');
        }
        if (!data.purpose || data.purpose.trim().length < 3) {
          errors.push('Objet du prêt requis (minimum 3 caractères)');
        }
        break;

      case 4: // Garanties
        if (!data.collateralType || data.collateralType === '') {
          errors.push('Type de garantie requis');
        }
        if (!data.collateralValue || data.collateralValue <= 0) {
          errors.push('Valeur de la garantie requise');
        }
        if (!data.collateralDescription || data.collateralDescription.trim().length < 5) {
          errors.push('Description détaillée de la garantie requise (minimum 5 caractères)');
        }
        // Vérifier si la garantie est suffisante
        if (data.requestedAmount && data.collateralValue) {
          // Pour épargne bloquée: minimum 15% du montant demandé
          if (data.collateralType === 'Épargne bloquée') {
            const minimumRequired = data.requestedAmount * 0.15;
            if (data.collateralValue < minimumRequired) {
              errors.push(`Épargne insuffisante. Minimum requis: ${formatCurrency(minimumRequired, data.currency)} (15% du montant)`);
            }
          } else {
            // Pour autres garanties: minimum 120% du montant
            if (data.collateralValue < data.requestedAmount * 1.2) {
              errors.push(`Garantie insuffisante. Minimum requis: ${formatCurrency(data.requestedAmount * 1.2, data.currency)} (120% du montant)`);
            }
          }
        }
        break;

      case 5: // Garants et Références
        // Garant 1
        if (!data.guarantor1Name || data.guarantor1Name.trim() === '') {
          errors.push('Nom du garant principal requis');
        }
        if (!data.guarantor1Phone || data.guarantor1Phone.length < 8) {
          errors.push('Téléphone du garant principal requis');
        }
        if (!data.guarantor1Relation || data.guarantor1Relation === '') {
          errors.push('Lien avec le garant principal requis');
        }
        
        // Garant 2 (optionnel, mais si renseigné, tout doit être rempli)
        const hasGuarantor2 = data.guarantor2Name || data.guarantor2Phone || data.guarantor2Relation;
        if (hasGuarantor2) {
          if (!data.guarantor2Name || data.guarantor2Name.trim() === '') {
            errors.push('Nom du garant secondaire requis si vous fournissez un garant secondaire');
          }
          if (!data.guarantor2Phone || data.guarantor2Phone.length < 8) {
            errors.push('Téléphone du garant secondaire requis si vous fournissez un garant secondaire');
          }
          if (!data.guarantor2Relation || data.guarantor2Relation === '') {
            errors.push('Lien avec le garant secondaire requis si vous fournissez un garant secondaire');
          }
        }
        
        // Références
        if (!data.reference1Name || data.reference1Name.trim() === '') {
          errors.push('Référence 1: Nom requis');
        }
        if (!data.reference1Phone || data.reference1Phone.trim() === '') {
          errors.push('Référence 1: Téléphone requis');
        }
        if (!data.reference2Name || data.reference2Name.trim() === '') {
          errors.push('Référence 2: Nom requis');
        }
        if (!data.reference2Phone || data.reference2Phone.trim() === '') {
          errors.push('Référence 2: Téléphone requis');
        }
        break;

      case 6: // Documents
        // Pas de validation stricte pour les documents (checkboxes optionnels)
        break;
    }

    return { isValid: errors.length === 0, errors };
  };

  const nextStep = () => {
    const validation = validateStep(currentStep);
    
    if (!validation.isValid) {
      // Afficher les erreurs
      const errorMessage = validation.errors.join('\n');
      setSubmitError(errorMessage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Effacer les erreurs si tout est valide
    setSubmitError(null);

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    // Effacer les erreurs lors du retour en arrière
    setSubmitError(null);
    
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStepSubmit = async (data: LoanApplicationFormData) => {
    const currentFormData = { ...formData, ...data };
    setFormData(currentFormData);
    
    if (currentStep === totalSteps) {
      // Soumèt application la bay backend
      await submitApplication(currentFormData);
    } else {
      nextStep();
    }
  };

  const submitApplication = async (data: LoanApplicationFormData) => {
    // Empêcher la double soumission
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Validate the data using safeParse to avoid throwing
      const validationResult = loanApplicationSchema.safeParse(data);
      
      if (!validationResult.success) {
        // Handle validation errors without throwing
        const issues = validationResult.error.issues || [];
        const errorMessages = issues
          .map((err: any) => `${err.path?.join('.') || 'field'}: ${err.message}`)
          .join('\n');
        setSubmitError(`Erreurs de validation:\n${errorMessages}`);
        setIsSubmitting(false);
        return;
      }

      const validatedData = validationResult.data;

      // Prepare request data
      const requestData: CreateLoanApplicationRequest = {
        savingsAccountNumber: validatedData.savingsAccountNumber,
        loanType: validatedData.loanType as LoanType,
        requestedAmount: validatedData.requestedAmount,
        requestedDurationMonths: validatedData.termMonths,
        purpose: validatedData.purpose,
        businessPlan: validatedData.notes || undefined,
        currency: validatedData.currency as 'HTG' | 'USD',
        branchId: parseInt(validatedData.branchId),
        monthlyIncome: validatedData.monthlyIncome,
        monthlyExpenses: validatedData.monthlyExpenses,
        existingDebts: validatedData.existingDebts,
        collateralValue: validatedData.collateralValue || undefined,
        guarantees: [
          // Collateral guarantees (must come first if present)
          ...(validatedData.collateralType && validatedData.collateralValue ? [{
            type: 0, // Collateral enum value
            description: validatedData.collateralDescription || validatedData.collateralType,
            value: validatedData.collateralValue,
            currency: validatedData.currency as 'HTG' | 'USD',
            guarantorInfo: undefined
          }] : []),
          // Personal guarantors
          ...(validatedData.guarantor1Name ? [{
            type: 1, // Personal enum value
            description: `Garant principal: ${validatedData.guarantor1Name}`,
            value: 0, // Personal guarantees don't have monetary value
            currency: validatedData.currency as 'HTG' | 'USD',
            guarantorInfo: {
              name: validatedData.guarantor1Name,
              phone: validatedData.guarantor1Phone,
              address: validatedData.address || '', // Use borrower's address as fallback
              occupation: '',
              monthlyIncome: undefined,
              relation: validatedData.guarantor1Relation
            }
          }] : []),
          ...(validatedData.guarantor2Name ? [{
            type: 1, // Personal enum value
            description: `Garant secondaire: ${validatedData.guarantor2Name}`,
            value: 0,
            currency: validatedData.currency as 'HTG' | 'USD',
            guarantorInfo: {
              name: validatedData.guarantor2Name,
              phone: validatedData.guarantor2Phone || '',
              address: validatedData.address || '',
              occupation: '',
              monthlyIncome: undefined,
              relation: validatedData.guarantor2Relation || ''
            }
          }] : [])
        ]
      };

      // Créer l'application
      const application = await microcreditLoanApplicationService.createApplication(requestData);
      
      // Vérifier si l'application est déjà soumise (garantie bloquée automatiquement)
      if (application.submittedAt) {
        // L'application est déjà soumise avec la garantie bloquée
        alert(`Demande de crédit soumise avec succès! Numéro: ${application.applicationNumber}\n\nLa garantie de 15% a été automatiquement bloquée sur votre compte d'épargne.`);
        onSubmit(validatedData as LoanApplicationFormData);
        return;
      }
      
      // Soumettre automatiquement l'application seulement si elle n'est pas encore soumise
      try {
        await microcreditLoanApplicationService.submitApplication(application.id);
        
        // Show success message
        alert(`Demande de crédit soumise avec succès! Numéro: ${application.applicationNumber}`);
      } catch (submitError: any) {
        // Si l'erreur est 409 (déjà soumise), on considère que c'est un succès
        if (submitError.message?.includes('409') || submitError.message?.includes('Conflict') || submitError.message?.includes('validation failed')) {
          console.warn('Application already submitted or validated:', submitError);
          alert(`Demande de crédit créée avec succès! Numéro: ${application.applicationNumber}\n\nLa demande a déjà été validée automatiquement.`);
        } else {
          // Si c'est une autre erreur, on la propage
          throw submitError;
        }
      }
      
      // Appeler onSubmit callback après le message pour éviter la fermeture prématurée
      onSubmit(validatedData as LoanApplicationFormData);
      
    } catch (error: any) {
      // No more ZodError handling needed since we use safeParse
      console.error('Error submitting application:', error);
      setSubmitError(error?.message || error?.response?.data?.message || 'Erreur lors de la soumission de la demande');
    } finally {
      setIsSubmitting(false);
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

  const progress = (currentStep / totalSteps) * 100;

  const stepIcons = [
    { step: 1, icon: FileText, label: 'Type' },
    { step: 2, icon: User, label: 'Client' },
    { step: 3, icon: DollarSign, label: 'Prêt' },
    { step: 4, icon: Building2, label: 'Garanties' },
    { step: 5, icon: Users, label: 'Garants' },
    { step: 6, icon: ShieldCheck, label: 'Documents' }
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
              {/* Error Message */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-900">
                    <p className="font-medium mb-1">Erreurs de validation</p>
                    <div className="whitespace-pre-line">{submitError}</div>
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {useKreyol ? 'Tip Kredi' : 'Type de Crédit'}
                </h3>
                <p className="text-gray-600">
                  {useKreyol ? 'Chwazi tip kredi ou vle a' : 'Sélectionnez le type de crédit souhaité'}
                </p>
                
                {/* Language Toggle */}
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={() => setUseKreyol(!useKreyol)}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {useKreyol ? '🇫🇷 Français' : '🇭🇹 Kreyòl'}
                  </button>
                </div>
              </div>

              <LoanTypeSelector
                selectedType={loanType}
                onSelect={(type) => setValue('loanType', type)}
                useKreyol={useKreyol}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">
                    {useKreyol ? 'Kondisyon jeneral' : 'Conditions générales'}
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      {useKreyol 
                        ? 'Garanti oswa garan oblije selon montan an' 
                        : 'Garanties ou garants requis selon le montant'}
                    </li>
                    <li>
                      {useKreyol
                        ? 'Dokiman idantite obligatwa'
                        : 'Documents d\'identité à jour obligatoires'}
                    </li>
                    <li>
                      {useKreyol
                        ? 'Evalyasyon solvabilite avan apwobasyon'
                        : 'Évaluation de solvabilité avant approbation'}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Informations Client */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              {/* Error Message */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-900">
                    <p className="font-medium mb-1">Erreurs de validation</p>
                    <div className="whitespace-pre-line">{submitError}</div>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Informations du Client</h3>
                <p className="text-gray-600">Renseignez les informations personnelles</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de Compte d'Épargne *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      {...register('savingsAccountNumber')}
                      placeholder="Ex: 001-123456-789"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
                    />
                    {isLoadingCustomer && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                  {customerInfo && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Compte trouvé: {customerInfo.customerName}
                    </p>
                  )}
                  {accountError && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {accountError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom Complet *
                  </label>
                  <input
                    type="text"
                    {...register('customerName')}
                    placeholder="Le nom sera automatiquement rempli"
                    readOnly={!!customerInfo}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      customerInfo ? 'bg-gray-50 text-gray-700' : ''
                    }`}
                  />
                  {customerInfo && (
                    <p className="text-xs text-gray-500 mt-1">
                      Nom récupéré automatiquement depuis le compte d'épargne
                    </p>
                  )}
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
                    Dépenses Mensuelles * (en {currency})
                  </label>
                  <input
                    type="number"
                    {...register('monthlyExpenses')}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dettes Existantes * (en {currency})
                  </label>
                  <input
                    type="number"
                    {...register('existingDebts')}
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
                    disabled={isLoadingBranches}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {isLoadingBranches ? 'Chargement...' : 'Sélectionner'}
                    </option>
                    {branches && branches.length > 0 && branches.map((branch) => (
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
              {/* Error Message */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-900">
                    <p className="font-medium mb-1">Erreurs de validation</p>
                    <div className="whitespace-pre-line">{submitError}</div>
                  </div>
                </div>
              )}

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
                    Montant Demandé * 
                    {loanType && getLoanTypeInfo(loanType) && (
                      <span className="text-xs text-gray-500">
                        {' '}(Min: {formatCurrency(getLoanTypeInfo(loanType)!.defaultMinAmount, currency)}, 
                        Max: {formatCurrency(getLoanTypeInfo(loanType)!.defaultMaxAmount, currency)})
                      </span>
                    )}
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
                    {loanType && getLoanTypeInfo(loanType) && (
                      <span className="text-xs text-gray-500">
                        {' '}(Min: {getLoanTypeInfo(loanType)!.defaultMinDuration}, 
                        Max: {getLoanTypeInfo(loanType)!.defaultMaxDuration} mois)
                      </span>
                    )}
                  </label>
                  <select
                    {...register('termMonths')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    <option value="1">1 mois</option>
                    <option value="3">3 mois</option>
                    <option value="6">6 mois</option>
                    <option value="9">9 mois</option>
                    <option value="12">12 mois</option>
                    <option value="15">15 mois</option>
                    <option value="18">18 mois</option>
                    <option value="24">24 mois</option>
                    <option value="36">36 mois</option>
                    <option value="48">48 mois</option>
                    <option value="60">60 mois</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taux d'Intérêt Annuel * (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    {...register('interestRate')}
                    placeholder="42"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taux d'Intérêt Mensuel * (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    {...register('monthlyInterestRate')}
                    placeholder="3.5"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Calculé automatiquement à partir du taux annuel
                  </p>
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
                      <p className="text-2xl font-bold text-primary-600">{monthlyInterestRate.toFixed(2)}%</p>
                      <p className="text-xs text-gray-500 mt-1">par mois ({interestRate.toFixed(1)}% annuel)</p>
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
              {/* Error Message */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-900">
                    <p className="font-medium mb-1">Erreurs de validation</p>
                    <div className="whitespace-pre-line">{submitError}</div>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {useKreyol ? 'Garanti' : 'Garanties'}
                </h3>
                <p className="text-gray-600">
                  {useKreyol ? 'Enfòmasyon sou garanti kredi a' : 'Informations sur les garanties du prêt'}
                </p>
              </div>

              {loanType && requiresCollateral(loanType) ? (
                <>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-900">
                      <p className="font-medium mb-1">
                        {useKreyol ? 'Garanti oblije' : 'Garanties requises'}
                      </p>
                      <p>
                        {useKreyol
                          ? 'Garanti yo dwe kouvri omwen 120% montan ou prete a. Dokiman jistifikatif oblije.'
                          : 'Les garanties doivent couvrir au minimum 120% du montant emprunté. Documents justificatifs requis.'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-900">
                    <p className="font-medium mb-1">
                      {useKreyol ? 'Garanti pa obligatwa' : 'Garanties non obligatoires'}
                    </p>
                    <p>
                      {useKreyol
                        ? 'Tip kredi sa a pa mande garanti obligatwa, men ou ka bay youn pou amelyore chans apwobasyon.'
                        : 'Ce type de crédit ne requiert pas de garanties obligatoires, mais vous pouvez en fournir pour améliorer vos chances d\'approbation.'}
                    </p>
                  </div>
                </div>
              )}

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
                  
                  {/* Message pour Épargne bloquée */}
                  {collateralType === 'Épargne bloquée' && (
                    <div className="mt-2">
                      {savingsBalance > 0 ? (
                        <div className={`text-sm p-3 rounded-lg ${
                          savingsBalanceError 
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : 'bg-green-50 text-green-700 border border-green-200'
                        }`}>
                          <p className="font-medium">
                            {savingsBalanceError ? '⚠️ Attention' : '✓ Vérification du solde'}
                          </p>
                          {savingsBalanceError ? (
                            <p className="mt-1">{savingsBalanceError}</p>
                          ) : (
                            <p className="mt-1">
                              Votre solde d'épargne de {formatCurrency(savingsBalance, currency)} est suffisant 
                              pour couvrir 15% du montant demandé ({formatCurrency(requestedAmount * 0.15, currency)}).
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm p-3 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200">
                          <p className="font-medium">ℹ️ Information</p>
                          <p className="mt-1">
                            Le solde de votre compte d'épargne sera vérifié automatiquement. 
                            Vous devez avoir au minimum 15% du montant demandé en épargne.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valeur Estimée de la Garantie * (en {currency})
                  </label>
                  <input
                    type="number"
                    {...register('collateralValue')}
                    placeholder="0"
                    readOnly={collateralType === 'Épargne bloquée' && savingsBalance > 0}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      collateralType === 'Épargne bloquée' && savingsBalance > 0 ? 'bg-gray-50 text-gray-700' : ''
                    }`}
                  />
                  {collateralType === 'Épargne bloquée' && savingsBalance > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Valeur automatiquement définie selon votre solde d'épargne
                    </p>
                  )}
                  {requestedAmount && watch('collateralValue') && collateralType !== 'Épargne bloquée' && (
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
              {/* Error Message */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-900">
                    <p className="font-medium mb-1">Erreurs de validation</p>
                    <div className="whitespace-pre-line">{submitError}</div>
                  </div>
                </div>
              )}

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
                  Garant Secondaire <span className="text-sm font-normal text-gray-500">(Optionnel)</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom Complet
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
                      Téléphone
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
                      Lien avec l'Emprunteur
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
                    <Controller
                      name="hasNationalId"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                      )}
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
                    <Controller
                      name="hasProofOfResidence"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                      )}
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
                    <Controller
                      name="hasProofOfIncome"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                      )}
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
                    <Controller
                      name="hasCollateralDocs"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                      )}
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
                      <p className="text-lg font-bold text-gray-900">
                        {loanType && getLoanTypeInfo(loanType) 
                          ? (useKreyol ? getLoanTypeInfo(loanType)!.nameKreyol : getLoanTypeInfo(loanType)!.name)
                          : 'N/A'}
                      </p>
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
                      <p className="text-lg font-bold text-purple-600">{monthlyInterestRate.toFixed(2)}% mensuel</p>
                      <p className="text-xs text-gray-500">({interestRate.toFixed(1)}% annuel)</p>
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

              {/* Error Message */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-900">
                    <p className="font-medium mb-1">Erreur</p>
                    <p>{submitError}</p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {!submitError && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-900">
                    <p className="font-medium mb-1">Prêt à soumettre</p>
                    <p>Votre demande sera examinée par notre comité de crédit. Vous recevrez une réponse sous 3-5 jours ouvrables.</p>
                  </div>
                </div>
              )}
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
                onClick={nextStep}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Suivant
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit(handleStepSubmit)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Soumission en cours...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Soumettre
                  </>
                )}
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
