import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import {
  X, ChevronLeft, ChevronRight, Check, User, DollarSign,
  FileText, Users, ShieldCheck, AlertCircle, Info, TrendingUp,
  Building2, CheckCircle, Loader2, Calendar, CreditCard, Home,
  Car, Package, Sprout, Landmark, Upload, File, Trash2
} from 'lucide-react';
import { LoanType } from '../../types/microcredit';
import { getLoanTypeInfo, requiresCollateral, getGuaranteePercentage } from '../../utils/loanTypeHelpers';
import LoanTypeSelector from './LoanTypeSelector';
import { microcreditLoanApplicationService, CreateLoanApplicationRequest } from '../../services/microcreditLoanApplicationService';
import {
  calculateMonthlyPaymentFromMonthlyRate,
  roundCurrency
} from './loanRateUtils';

// Types
interface LoanApplicationFormData {
  loanType: LoanType;
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
  requestedAmount: number;
  currency: 'HTG' | 'USD';
  termMonths: number;
  interestRate: number;
  monthlyInterestRate: number;
  purpose: string;
  collateralType: string;
  collateralValue: number;
  collateralDescription: string;
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
  hasNationalId: boolean;
  hasProofOfResidence: boolean;
  hasProofOfIncome: boolean;
  hasCollateralDocs: boolean;
  branchId: string;
  notes?: string;
}

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
}

interface DocumentUpload {
  nationalId?: UploadedFile;
  proofOfResidence?: UploadedFile;
  proofOfIncome?: UploadedFile;
  collateralDocs?: UploadedFile;
}

interface LoanApplicationFormProps {
  onSubmit: (data: LoanApplicationFormData) => void;
  onCancel: () => void;
}

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

// Custom Hooks
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const useLoanCalculator = (amount: number, term: number, monthlyRatePercent: number) => {
  return useMemo(() => {
    if (!amount || !term) {
      return { monthlyPayment: 0, totalRepayment: 0, totalInterest: 0 };
    }

    const monthlyPayment = calculateMonthlyPaymentFromMonthlyRate(amount, monthlyRatePercent || 0, term);
    const totalRepayment = roundCurrency(monthlyPayment * term);
    const totalInterest = roundCurrency(totalRepayment - amount);

    return {
      monthlyPayment,
      totalRepayment,
      totalInterest
    };
  }, [amount, term, monthlyRatePercent]);
};

const useCustomerSearch = () => {
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCustomer = useCallback(async (accountNumber: string) => {
    if (!accountNumber || accountNumber.length < 12) {
      setCustomerInfo(null);
      setError(null);
      return null;
    }

    setLoading(true);
    setError(null);
    
    try {
      const accountInfo = await microcreditLoanApplicationService.getSavingsAccountByNumber(accountNumber);
      if (accountInfo && accountInfo.customerName) {
        setCustomerInfo(accountInfo);
        setError(null);
        return accountInfo;
      } else {
        setCustomerInfo(null);
        setError('Compte d\'épargne introuvable ou invalide');
        return null;
      }
    } catch (err: any) {
      console.error('Error fetching customer info:', err);
      setCustomerInfo(null);
      setError('Erreur lors de la recherche du compte. Vérifiez le numéro et réessayez.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { customerInfo, loading, error, searchCustomer };
};

const formatCurrency = (amount: number, currency: 'HTG' | 'USD') => {
  if (currency === 'HTG') {
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

const sanitizeFormData = (data: any): LoanApplicationFormData => {
  return {
    ...data,
    customerName: data.customerName?.replace(/[<>]/g, '') || '',
    purpose: data.purpose?.replace(/[<>]/g, '') || '',
    collateralDescription: data.collateralDescription?.replace(/[<>]/g, '') || '',
    requestedAmount: Math.abs(Number(data.requestedAmount) || 0),
    monthlyIncome: Math.abs(Number(data.monthlyIncome) || 0),
    monthlyExpenses: Math.abs(Number(data.monthlyExpenses) || 0),
    existingDebts: Math.abs(Number(data.existingDebts) || 0)
  };
};

// File handling utilities
const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

  if (file.size > maxSize) {
    return { isValid: false, error: 'Le fichier ne doit pas dépasser 5MB' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Format non supporté. Utilisez JPG, PNG ou PDF' };
  }

  return { isValid: true };
};

const generateFileId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Validation Schema
const loanApplicationSchema = z.object({
  loanType: z.nativeEnum(LoanType),
  savingsAccountNumber: z.string().min(12, 'Numéro de compte d\'épargne requis (12 caractères minimum)'),
  customerName: z.string().min(1, 'Nom requis'),
  phone: z.string().min(8, 'Téléphone requis (8 caractères minimum)'),
  email: z.string().email('Email invalide').or(z.string().length(0)).optional(),
  address: z.string().min(3, 'Adresse requise (minimum 3 caractères)'),
  occupation: z.string().min(2, 'Profession requise'),
  monthlyIncome: z.coerce.number().min(1, 'Revenu mensuel requis'),
  monthlyExpenses: z.coerce.number().min(0, 'Dépenses mensuelles requises'),
  existingDebts: z.coerce.number().min(0, 'Dettes existantes requises'),
  dependents: z.coerce.number().min(0).default(0),
  requestedAmount: z.coerce.number().min(1, 'Montant requis'),
  // Validate currency as HTG or USD using a regex to avoid Zod literal/union type issues
  currency: z.string().regex(/^(HTG|USD)$/, 'Devise invalide (HTG ou USD requis)'),
  termMonths: z.coerce.number().min(1, 'Durée requise'),
  interestRate: z.coerce.number().min(0.1, 'Taux d\'intérêt invalide').max(50, 'Taux d\'intérêt trop élevé'),
  monthlyInterestRate: z.coerce.number().min(0.01, 'Taux d\'intérêt mensuel invalide').max(5, 'Taux d\'intérêt mensuel trop élevé'),
  purpose: z.string().min(3, 'Objet du prêt requis (minimum 3 caractères)'),
  collateralType: z.string().min(1, 'Type de garantie requis'),
  collateralValue: z.coerce.number().min(0, 'Valeur de garantie invalide'),
  collateralDescription: z.string().min(5, 'Description requise (minimum 5 caractères)'),
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

// Notification Component
const Notification: React.FC<{
  notification: Notification;
  onDismiss: (id: number) => void;
}> = ({ notification, onDismiss }) => {
  const bgColor = {
    success: 'bg-green-50 border-green-200 text-green-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900'
  }[notification.type];

  const icon = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertCircle,
    info: Info
  }[notification.type];

  const IconComponent = icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`border rounded-lg p-4 flex gap-3 ${bgColor} animate-fadeIn`}>
      <IconComponent className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p>{notification.message}</p>
      </div>
      <button
        onClick={() => onDismiss(notification.id)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Main Component
const LoanApplicationForm: React.FC<LoanApplicationFormProps> = ({ onSubmit, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  // Savings account balances (from API)
  const [savingsBalance, setSavingsBalance] = useState<number>(0); // Available balance used for validations
  const [savingsBlockedBalance, setSavingsBlockedBalance] = useState<number>(0);
  const [savingsTotalBalance, setSavingsTotalBalance] = useState<number>(0);
  const [savingsAccountCurrency, setSavingsAccountCurrency] = useState<'HTG' | 'USD' | undefined>(undefined);
  const [uploadedFiles, setUploadedFiles] = useState<DocumentUpload>({});

  // Track which field was last manually changed to prevent sync loops
  const lastManualChange = useRef<'interestRate' | 'monthlyInterestRate' | null>(null);

  // Custom hooks
  const { customerInfo, loading: isLoadingCustomer, error: accountError, searchCustomer } = useCustomerSearch();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors }
  } = useForm<LoanApplicationFormData>({
    mode: 'onBlur'
  });

  // Form watchers
  const loanType = watch('loanType');
  const currency = watch('currency');
  const requestedAmount = watch('requestedAmount');
  const termMonths = watch('termMonths');
  const interestRate = watch('interestRate');
  const monthlyInterestRate = watch('monthlyInterestRate');
  const collateralType = watch('collateralType');
  const savingsAccountNumber = watch('savingsAccountNumber');

  // Guarantee (blocked savings) percentage based on loan type
  const guaranteePercentage = useMemo(() => {
    if (!loanType) return 0.15; // default minimum rule when not selected yet
    return getGuaranteePercentage(loanType);
  }, [loanType]);

  // Computed required guarantee amount (frontend display only; backend recalculates authoritative value)
  const requiredGuaranteeAmount = useMemo(() => {
    return (requestedAmount || 0) * guaranteePercentage;
  }, [requestedAmount, guaranteePercentage]);

  // Debounced account number for search
  const debouncedAccountNumber = useDebounce(savingsAccountNumber, 500);

  // Loan calculations
  const { monthlyPayment, totalRepayment, totalInterest } = useLoanCalculator(
    requestedAmount || 0,
    termMonths || 0,
    monthlyInterestRate || 0
  );

  // Notification system
  const showNotification = useCallback((message: string, type: Notification['type'] = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // File handling functions
  const handleFileUpload = useCallback((documentType: keyof DocumentUpload, file: File) => {
    const validation = validateFile(file);
    if (!validation.isValid) {
      showNotification(validation.error!, 'error');
      return;
    }

    const fileId = generateFileId();
    const uploadedFile: UploadedFile = {
      file,
      id: fileId,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    };

    setUploadedFiles(prev => ({
      ...prev,
      [documentType]: uploadedFile
    }));

    // Update the checkbox to true when file is uploaded
    const checkboxField = documentType === 'nationalId' ? 'hasNationalId' :
                         documentType === 'proofOfResidence' ? 'hasProofOfResidence' :
                         documentType === 'proofOfIncome' ? 'hasProofOfIncome' :
                         'hasCollateralDocs';
    setValue(checkboxField, true);

    showNotification(`Document ${documentType} téléchargé avec succès`, 'success');
  }, [setValue, showNotification]);

  const handleFileRemove = useCallback((documentType: keyof DocumentUpload) => {
    setUploadedFiles(prev => {
      const currentFile = prev[documentType];
      if (currentFile?.preview) {
        URL.revokeObjectURL(currentFile.preview);
      }
      const newFiles = { ...prev };
      delete newFiles[documentType];
      return newFiles;
    });

    // Update the checkbox to false when file is removed
    const checkboxField = documentType === 'nationalId' ? 'hasNationalId' :
                         documentType === 'proofOfResidence' ? 'hasProofOfResidence' :
                         documentType === 'proofOfIncome' ? 'hasProofOfIncome' :
                         'hasCollateralDocs';
    setValue(checkboxField, false);
  }, [setValue]);

  // Customer search effect
  useEffect(() => {
    if (debouncedAccountNumber) {
      searchCustomer(debouncedAccountNumber).then(accountInfo => {
        if (accountInfo) {
          setValue('customerName', accountInfo.customerName);
          // Prefer availableBalance for guarantee calculations; fallback to balance
          if (accountInfo.availableBalance !== undefined) {
            setSavingsBalance(Number(accountInfo.availableBalance) || 0);
          } else if (accountInfo.balance !== undefined) {
            setSavingsBalance(Number(accountInfo.balance) || 0);
          }
          if (accountInfo.blockedBalance !== undefined) {
            setSavingsBlockedBalance(Number(accountInfo.blockedBalance) || 0);
          } else {
            setSavingsBlockedBalance(0);
          }
          if (accountInfo.balance !== undefined) {
            setSavingsTotalBalance(Number(accountInfo.balance) || 0);
          }
          if (accountInfo.currency) {
            const cur = String(accountInfo.currency).toUpperCase();
            if (cur === 'HTG' || cur === 'USD') setSavingsAccountCurrency(cur as 'HTG' | 'USD');
          }
        }
      });
    }
  }, [debouncedAccountNumber, searchCustomer, setValue]);

  // Interest rate synchronization
  useEffect(() => {
    if (interestRate && interestRate > 0 && lastManualChange.current === 'interestRate') {
      const calculatedMonthly = interestRate / 12;
      setValue('monthlyInterestRate', Number(calculatedMonthly.toFixed(4)));
      lastManualChange.current = null; // Reset after sync
    }
  }, [interestRate, setValue]);

  useEffect(() => {
    if (monthlyInterestRate && monthlyInterestRate > 0 && lastManualChange.current === 'monthlyInterestRate') {
      const calculatedAnnual = monthlyInterestRate * 12;
      setValue('interestRate', Number(calculatedAnnual.toFixed(2)));
      lastManualChange.current = null; // Reset after sync
    }
  }, [monthlyInterestRate, setValue]);

  // Auto-fill collateral value for savings
  useEffect(() => {
    if (collateralType === 'Épargne bloquée' && savingsBalance > 0) {
      setValue('collateralValue', savingsBalance);
    }
  }, [collateralType, savingsBalance, setValue]);

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      setIsLoadingBranches(true);
      try {
        const branchList = await microcreditLoanApplicationService.getBranches();
        setBranches(branchList);
      } catch (error) {
        console.error('Error fetching branches:', error);
        setBranches([]);
        showNotification('Erreur lors du chargement des succursales', 'error');
      } finally {
        setIsLoadingBranches(false);
      }
    };

    fetchBranches();
  }, []);

  // Cleanup uploaded files on unmount
  useEffect(() => {
    return () => {
      Object.values(uploadedFiles).forEach(uploadedFile => {
        if (uploadedFile?.preview) {
          URL.revokeObjectURL(uploadedFile.preview);
        }
      });
    };
  }, [uploadedFiles]);

  // Collateral validation
  const collateralValidation = useMemo(() => {
    if (!collateralType || !requestedAmount) return null;

    if (collateralType === 'Épargne bloquée') {
        const minimumRequired = (requestedAmount || 0) * guaranteePercentage;
        if (savingsBalance < minimumRequired) {
          return {
            valid: false,
            message: `⚠️ Solde d'épargne insuffisant. Vous avez ${formatCurrency(savingsBalance, currency)} mais il faut au minimum ${formatCurrency(minimumRequired, currency)} (${Math.round(guaranteePercentage * 100)}% du montant demandé)`
          };
        }
        return { valid: true, message: null };
      } else {
      const minimumRequired = requestedAmount * 1.2;
      const collateralValue = watch('collateralValue') || 0;
      if (collateralValue < minimumRequired) {
        return {
          valid: false,
          message: `⚠️ Garantie insuffisante. Minimum requis: ${formatCurrency(minimumRequired, currency)} (120% du montant)`
        };
      }
      return { valid: true, message: null };
    }
  }, [collateralType, requestedAmount, savingsBalance, currency, watch]);

  // Step validation
  const validateStep = useCallback((step: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const data = watch();

    switch (step) {
      case 1:
        if (!data.loanType) errors.push('Veuillez sélectionner un type de crédit');
        break;

      case 2:
        if (!data.savingsAccountNumber || data.savingsAccountNumber.length < 12) {
          errors.push('Numéro de compte d\'épargne requis (12 caractères minimum)');
        }
        if (!data.customerName?.trim()) errors.push('Nom du client requis');
        if (!data.phone || data.phone.length < 8) errors.push('Numéro de téléphone requis (8 caractères minimum)');
        if (!data.address?.trim() || data.address.length < 3) errors.push('Adresse complète requise');
        if (!data.occupation?.trim() || data.occupation.length < 2) errors.push('Profession requise');
        if (!data.monthlyIncome || data.monthlyIncome <= 0) errors.push('Revenu mensuel requis');
        if (data.monthlyExpenses === undefined || data.monthlyExpenses < 0) errors.push('Dépenses mensuelles requises');
        if (data.existingDebts === undefined || data.existingDebts < 0) errors.push('Dettes existantes requises');
        if (!data.branchId) errors.push('Veuillez sélectionner une succursale');
        break;

      case 3:
        if (!data.requestedAmount || data.requestedAmount <= 0) errors.push('Montant demandé requis');
        if (!data.termMonths || data.termMonths <= 0) errors.push('Durée du prêt requise');
        if (!data.interestRate || data.interestRate <= 0) errors.push('Taux d\'intérêt requis');
        if (!data.purpose?.trim() || data.purpose.length < 3) errors.push('Objet du prêt requis');
        break;

      case 4:
        if (!data.collateralType) errors.push('Type de garantie requis');
        if (!data.collateralValue || data.collateralValue <= 0) errors.push('Valeur de la garantie requise');
        if (!data.collateralDescription?.trim() || data.collateralDescription.length < 5) {
          errors.push('Description détaillée de la garantie requise');
        }
        if (collateralValidation && !collateralValidation.valid) {
          // collateralValidation.message can be null, ensure we push a string
          errors.push(collateralValidation.message ?? 'Garantie insuffisante');
        }
        break;

      case 5:
        if (!data.guarantor1Name?.trim()) errors.push('Nom du garant principal requis');
        if (!data.guarantor1Phone || data.guarantor1Phone.length < 8) errors.push('Téléphone du garant principal requis');
        if (!data.guarantor1Relation) errors.push('Lien avec le garant principal requis');
        
        const hasGuarantor2 = data.guarantor2Name || data.guarantor2Phone || data.guarantor2Relation;
        if (hasGuarantor2) {
          if (!data.guarantor2Name?.trim()) errors.push('Nom du garant secondaire requis');
          if (!data.guarantor2Phone || data.guarantor2Phone.length < 8) errors.push('Téléphone du garant secondaire requis');
          if (!data.guarantor2Relation) errors.push('Lien avec le garant secondaire requis');
        }
        
        if (!data.reference1Name?.trim()) errors.push('Référence 1: Nom requis');
        if (!data.reference1Phone?.trim()) errors.push('Référence 1: Téléphone requis');
        if (!data.reference2Name?.trim()) errors.push('Référence 2: Nom requis');
        if (!data.reference2Phone?.trim()) errors.push('Référence 2: Téléphone requis');
        break;

      case 6:
        // Documents are optional but recommended
        break;
    }

    return { isValid: errors.length === 0, errors };
  }, [watch, collateralValidation]);

  // Navigation
  const nextStep = useCallback(() => {
    const validation = validateStep(currentStep);
    
    if (!validation.isValid) {
      showNotification(validation.errors.join('\n'), 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setNotifications([]);
    
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep, validateStep, showNotification]);

  const prevStep = useCallback(() => {
    setNotifications([]);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  // Form submission
  const handleStepSubmit = async (data: LoanApplicationFormData) => {
    if (currentStep === 6) {
      await submitApplication(data);
    } else {
      nextStep();
    }
  };

  const submitApplication = async (data: LoanApplicationFormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setNotifications([]);

    try {
      const sanitizedData = sanitizeFormData(data);
      
      const validationResult = loanApplicationSchema.safeParse(sanitizedData);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join('\n');
        showNotification(`Erreurs de validation:\n${errorMessages}`, 'error');
        setIsSubmitting(false);
        return;
      }

      const validatedData = validationResult.data;

      const requestData: CreateLoanApplicationRequest = {
  // Snapshot of applicant info - optional, used to persist form data
  customerName: validatedData.customerName,
  phone: validatedData.phone,
  email: validatedData.email,
  customerAddress: validatedData.address,
        occupation: validatedData.occupation,
        savingsAccountNumber: validatedData.savingsAccountNumber,
        loanType: validatedData.loanType,
        requestedAmount: validatedData.requestedAmount,
        requestedDurationMonths: validatedData.termMonths,
        purpose: validatedData.purpose,
        businessPlan: validatedData.notes,
        // validatedData.currency is validated by regex (HTG|USD) but Zod infers it as string,
        // so cast it to the expected literal union for TypeScript
        currency: validatedData.currency as 'HTG' | 'USD',
        branchId: parseInt(validatedData.branchId),
        monthlyIncome: validatedData.monthlyIncome,
        monthlyExpenses: validatedData.monthlyExpenses,
        existingDebts: validatedData.existingDebts,
        collateralValue: validatedData.collateralValue,
        // Add missing required fields
        dependents: validatedData.dependents || 0,
        // IMPORTANT: Convert percentage to decimal (15% → 0.15) for backend validation [Range(0, 1)]
        interestRate: (validatedData.interestRate || 0) / 100,
        monthlyInterestRate: (validatedData.monthlyInterestRate || 0) / 100,
        collateralType: validatedData.collateralType,
        collateralDescription: validatedData.collateralDescription,
        // Guarantor information
        guarantor1Name: validatedData.guarantor1Name,
        guarantor1Phone: validatedData.guarantor1Phone,
        guarantor1Relation: validatedData.guarantor1Relation,
        guarantor2Name: validatedData.guarantor2Name,
        guarantor2Phone: validatedData.guarantor2Phone,
        guarantor2Relation: validatedData.guarantor2Relation,
        // Reference information
        reference1Name: validatedData.reference1Name,
        reference1Phone: validatedData.reference1Phone,
        reference2Name: validatedData.reference2Name,
        reference2Phone: validatedData.reference2Phone,
        // Document verification flags
        hasNationalId: validatedData.hasNationalId,
        hasProofOfResidence: validatedData.hasProofOfResidence,
        hasProofOfIncome: validatedData.hasProofOfIncome,
        hasCollateralDocs: validatedData.hasCollateralDocs,
        notes: validatedData.notes,
        guarantees: [
          ...(validatedData.collateralType ? [{
            type: 0,
            description: validatedData.collateralDescription || validatedData.collateralType,
            value: validatedData.collateralValue,
            currency: validatedData.currency as 'HTG' | 'USD',
            guarantorInfo: undefined
          }] : []),
          ...(validatedData.guarantor1Name ? [{
            type: 1,
            description: `Garant principal: ${validatedData.guarantor1Name}`,
            value: 0,
            currency: validatedData.currency as 'HTG' | 'USD',
            guarantorInfo: {
              name: validatedData.guarantor1Name,
              phone: validatedData.guarantor1Phone,
              address: validatedData.address,
              occupation: '',
              monthlyIncome: undefined,
              relation: validatedData.guarantor1Relation
            }
          }] : []),
          ...(validatedData.guarantor2Name ? [{
            type: 1,
            description: `Garant secondaire: ${validatedData.guarantor2Name}`,
            value: 0,
            currency: validatedData.currency as 'HTG' | 'USD',
            guarantorInfo: {
              name: validatedData.guarantor2Name,
              phone: validatedData.guarantor2Phone || '',
              address: validatedData.address,
              occupation: '',
              monthlyIncome: undefined,
              relation: validatedData.guarantor2Relation || ''
            }
          }] : [])
        ]
      };

      const application = await microcreditLoanApplicationService.createApplication(requestData);
      
  if (application.submittedAt) {
        const percent = Math.round(guaranteePercentage * 100);
        const amountText = formatCurrency(requiredGuaranteeAmount, validatedData.currency as 'HTG' | 'USD');
        showNotification(
          `Demande de crédit soumise avec succès! Numéro: ${application.applicationNumber}\nLa garantie de ${percent}% (≈ ${amountText}) a été automatiquement bloquée sur votre compte d'épargne.`,
          'success'
        );
  } else {
        try {
          await microcreditLoanApplicationService.submitApplication(application.id);
          showNotification(`Demande de crédit soumise avec succès! Numéro: ${application.applicationNumber}`, 'success');
        } catch (submitError: any) {
          if (submitError.message?.includes('409') || submitError.message?.includes('Conflict')) {
            showNotification(`Demande de crédit créée avec succès! Numéro: ${application.applicationNumber}\nLa demande a déjà été validée automatiquement.`, 'success');
          } else {
            throw submitError;
          }
        }
      }
      
      // Upload any attached documents after creation/submission
      try {
        const uploads: Promise<any>[] = [];
        if (uploadedFiles.nationalId) {
          uploads.push(microcreditLoanApplicationService.uploadDocument(application.id, uploadedFiles.nationalId.file, 'IdCard', uploadedFiles.nationalId.file.name, 'Pièce d\'identité (recto)'));
        }
        if (uploadedFiles.proofOfResidence) {
          uploads.push(microcreditLoanApplicationService.uploadDocument(application.id, uploadedFiles.proofOfResidence.file, 'BankStatements', uploadedFiles.proofOfResidence.file.name, 'Justificatif de domicile'));
        }
        if (uploadedFiles.proofOfIncome) {
          uploads.push(microcreditLoanApplicationService.uploadDocument(application.id, uploadedFiles.proofOfIncome.file, 'ProofOfIncome', uploadedFiles.proofOfIncome.file.name, 'Preuve de revenu'));
        }
        if (uploadedFiles.collateralDocs) {
          uploads.push(microcreditLoanApplicationService.uploadDocument(application.id, uploadedFiles.collateralDocs.file, 'CollateralDocument', uploadedFiles.collateralDocs.file.name, 'Documents de garantie'));
        }
        if (uploads.length > 0) await Promise.all(uploads);
      } catch (uploadErr: any) {
        console.warn('One or more document uploads failed:', uploadErr);
        showNotification('Une ou plusieurs uploads de document ont échoué. Vous pouvez les télécharger depuis l\'onglet Documents plus tard.', 'warning');
      }

      // Wait a bit before calling onSubmit to show notification
      setTimeout(() => {
        onSubmit({
          ...validatedData,
          currency: validatedData.currency as 'HTG' | 'USD'
        });
      }, 2000);
      
    } catch (error: any) {
      console.error('Error submitting application:', error);
      showNotification(
        error?.message || error?.response?.data?.message || 'Erreur lors de la soumission de la demande',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Constants
  const totalSteps = 6;
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
    { value: 'Titre de propriété (maison/terrain)', icon: Home },
    { value: 'Stock de marchandises', icon: Package },
    { value: 'Véhicule', icon: Car },
    { value: 'Équipement professionnel', icon: CreditCard },
    { value: 'Récolte future', icon: Sprout },
    { value: 'Épargne bloquée', icon: Landmark },
    { value: 'Autre', icon: Building2 }
  ];

  const relationTypes = [
    { value: 'FAMILY', label: 'Membre de la famille' },
    { value: 'FRIEND', label: 'Ami(e)' },
    { value: 'COLLEAGUE', label: 'Collègue' },
    { value: 'BUSINESS_PARTNER', label: 'Partenaire d\'affaires' },
    { value: 'NEIGHBOR', label: 'Voisin(e)' },
    { value: 'OTHER', label: 'Autre' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Notifications */}
      <div className="absolute top-4 right-4 space-y-2 z-60 max-w-md">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            notification={notification}
            onDismiss={dismissNotification}
          />
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Demande de Crédit</h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Fermer le formulaire"
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
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-black mb-2">
                  Type de Crédit
                </h3>
                <p className="text-black">
                  Sélectionnez le type de crédit souhaité
                </p>
              </div>

              <LoanTypeSelector
                selectedType={loanType}
                onSelect={(type) => setValue('loanType', type)}
              />

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
                <h3 className="text-2xl font-bold text-black mb-2">Informations du Client</h3>
                <p className="text-black">Renseignez les informations personnelles</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Savings Account */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Numéro de Compte d'Épargne *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      {...register('savingsAccountNumber')}
                      placeholder="Ex: 001-123456-789"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10 ${
                        errors.savingsAccountNumber ? 'border-red-300' : 'border-gray-300'
                      }`}
                      aria-describedby="savingsAccountNumber-help"
                    />
                    {isLoadingCustomer && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                  {customerInfo && (
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Compte trouvé: {customerInfo.customerName}
                      </p>
                      <div className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded p-2">
                        <div className="flex flex-wrap gap-4">
                          <span>
                            Disponible: <span className="font-semibold">{formatCurrency(savingsBalance, (savingsAccountCurrency || currency || 'HTG'))}</span>
                          </span>
                          <span>
                            Bloqué: <span className="font-semibold">{formatCurrency(savingsBlockedBalance, (savingsAccountCurrency || currency || 'HTG'))}</span>
                          </span>
                          <span>
                            Total: <span className="font-semibold">{formatCurrency(savingsTotalBalance || (savingsBalance + savingsBlockedBalance), (savingsAccountCurrency || currency || 'HTG'))}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {accountError && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {accountError}
                    </p>
                  )}
                  {errors.savingsAccountNumber && (
                    <p className="text-xs text-red-600 mt-1">{errors.savingsAccountNumber.message}</p>
                  )}
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom Complet *
                  </label>
                  <input
                    type="text"
                    {...register('customerName')}
                    placeholder="Le nom sera automatiquement rempli"
                    readOnly={!!customerInfo}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      customerInfo ? 'bg-gray-50 text-gray-700' : ''
                    } ${errors.customerName ? 'border-red-300' : 'border-gray-300'}`}
                  />
                  {errors.customerName && (
                    <p className="text-xs text-red-600 mt-1">{errors.customerName.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    {...register('phone')}
                    placeholder="+509 XXXX XXXX"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.phone && (
                    <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="email@example.com"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse Complète *
                  </label>
                  <textarea
                    {...register('address')}
                    rows={2}
                    placeholder="Adresse résidentielle"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.address ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.address && (
                    <p className="text-xs text-red-600 mt-1">{errors.address.message}</p>
                  )}
                </div>

                {/* Occupation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profession / Activité *
                  </label>
                  <input
                    type="text"
                    {...register('occupation')}
                    placeholder="Ex: Commerçant, Agriculteur"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.occupation ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.occupation && (
                    <p className="text-xs text-red-600 mt-1">{errors.occupation.message}</p>
                  )}
                </div>

                {/* Monthly Income */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Revenu Mensuel * (en {currency || 'HTG'})
                  </label>
                  <input
                    type="number"
                    {...register('monthlyIncome')}
                    placeholder="0"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.monthlyIncome ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.monthlyIncome && (
                    <p className="text-xs text-red-600 mt-1">{errors.monthlyIncome.message}</p>
                  )}
                </div>

                {/* Monthly Expenses */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dépenses Mensuelles * (en {currency || 'HTG'})
                  </label>
                  <input
                    type="number"
                    {...register('monthlyExpenses')}
                    placeholder="0"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.monthlyExpenses ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.monthlyExpenses && (
                    <p className="text-xs text-red-600 mt-1">{errors.monthlyExpenses.message}</p>
                  )}
                </div>

                {/* Existing Debts */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dettes Existantes * (en {currency || 'HTG'})
                  </label>
                  <input
                    type="number"
                    {...register('existingDebts')}
                    placeholder="0"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.existingDebts ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.existingDebts && (
                    <p className="text-xs text-red-600 mt-1">{errors.existingDebts.message}</p>
                  )}
                </div>

                {/* Dependents */}
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

                {/* Branch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Succursale *
                  </label>
                  <select
                    {...register('branchId')}
                    disabled={isLoadingBranches}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      errors.branchId ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">
                      {isLoadingBranches ? 'Chargement...' : 'Sélectionner'}
                    </option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  {errors.branchId && (
                    <p className="text-xs text-red-600 mt-1">{errors.branchId.message}</p>
                  )}
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
                {/* Requested Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant Demandé * 
                    {loanType && getLoanTypeInfo(loanType) && (
                      <span className="text-xs text-gray-500">
                        {' '}(Min: {formatCurrency(getLoanTypeInfo(loanType)!.defaultMinAmount, currency || 'HTG')}, 
                        Max: {formatCurrency(getLoanTypeInfo(loanType)!.defaultMaxAmount, currency || 'HTG')})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    {...register('requestedAmount')}
                    placeholder="0"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.requestedAmount ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.requestedAmount && (
                    <p className="text-xs text-red-600 mt-1">{errors.requestedAmount.message}</p>
                  )}
                </div>

                {/* Term Months */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durée (mois) *
                  </label>
                  <select
                    {...register('termMonths')}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.termMonths ? 'border-red-300' : 'border-gray-300'
                    }`}
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
                  {errors.termMonths && (
                    <p className="text-xs text-red-600 mt-1">{errors.termMonths.message}</p>
                  )}
                </div>

                {/* Guarantee Percentage Display */}
                {loanType && requestedAmount > 0 && (
                  <div className="md:col-span-2">
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col gap-1">
                      <p className="text-sm font-medium text-blue-900">
                        Garantie (épargne bloquée)
                      </p>
                      <p className="text-sm text-blue-800">
                        Pour ce type de crédit: <span className="font-semibold">{Math.round(guaranteePercentage * 100)}%</span> du montant demandé
                        {requestedAmount ? (
                          <>
                            {' '}≈ <span className="font-semibold">{formatCurrency(requiredGuaranteeAmount, currency || 'HTG')}</span>
                          </>
                        ) : null}
                      </p>
                      <p className="text-xs text-blue-700">
                        Ce montant sera bloqué sur le compte d'épargne après approbation (calcul définitif côté serveur).
                      </p>
                    </div>
                  </div>
                )}

                {/* Annual Interest Rate */}
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
                    onChange={(e) => {
                      register('interestRate').onChange(e);
                      lastManualChange.current = 'interestRate';
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.interestRate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.interestRate && (
                    <p className="text-xs text-red-600 mt-1">{errors.interestRate.message}</p>
                  )}
                </div>

                {/* Monthly Interest Rate */}
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
                    onChange={(e) => {
                      register('monthlyInterestRate').onChange(e);
                      lastManualChange.current = 'monthlyInterestRate';
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.monthlyInterestRate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Calculé automatiquement à partir du taux annuel
                  </p>
                  {errors.monthlyInterestRate && (
                    <p className="text-xs text-red-600 mt-1">{errors.monthlyInterestRate.message}</p>
                  )}
                </div>

                {/* Purpose */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objet du Prêt *
                  </label>
                  <textarea
                    {...register('purpose')}
                    rows={3}
                    placeholder="Décrivez l'utilisation prévue des fonds..."
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.purpose ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.purpose && (
                    <p className="text-xs text-red-600 mt-1">{errors.purpose.message}</p>
                  )}
                </div>
              </div>

              {/* Loan Calculation Summary */}
              {requestedAmount && termMonths && monthlyInterestRate && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 space-y-4">
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Calcul du Prêt
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Taux d'Intérêt</p>
                      <p className="text-2xl font-bold text-primary-600">
                        {typeof monthlyInterestRate === 'number' && isFinite(monthlyInterestRate) 
                          ? `${monthlyInterestRate.toFixed(2)}%` 
                          : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        par mois ({typeof monthlyInterestRate === 'number' && isFinite(monthlyInterestRate) 
                          ? `${(monthlyInterestRate * 12).toFixed(1)}% annuel` 
                          : 'N/A'})
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Mensualité</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(monthlyPayment, currency || 'HTG')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">pendant {termMonths} mois</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Total à Rembourser</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(totalRepayment, currency || 'HTG')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Intérêts: {formatCurrency(totalInterest, currency || 'HTG')}
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
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Garanties
                </h3>
                <p className="text-gray-600">
                  Informations sur les garanties du prêt
                </p>
              </div>

              {loanType && requiresCollateral(loanType) ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-900">
                    <p className="font-medium mb-1">
                      Garanties requises
                    </p>
                    <p>
                      Les garanties doivent couvrir au minimum 120% du montant emprunté. Documents justificatifs requis.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-900">
                    <p className="font-medium mb-1">
                      Garanties non obligatoires
                    </p>
                    <p>
                      Ce type de crédit ne requiert pas de garanties obligatoires, mais vous pouvez en fournir pour améliorer vos chances d'approbation.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Collateral Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de Garantie *
                  </label>
                  <select
                    {...register('collateralType')}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.collateralType ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Sélectionner un type</option>
                    {collateralTypes.map(({ value, icon: Icon }) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  {errors.collateralType && (
                    <p className="text-xs text-red-600 mt-1">{errors.collateralType.message}</p>
                  )}
                  
                  {/* Message pour Épargne bloquée */}
                  {collateralType === 'Épargne bloquée' && (
                    <div className="mt-2">
                      {savingsBalance > 0 ? (
                        <div className={`text-sm p-3 rounded-lg ${
                          collateralValidation && !collateralValidation.valid
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : 'bg-green-50 text-green-700 border border-green-200'
                        }`}>
                          <p className="font-medium">
                            {collateralValidation && !collateralValidation.valid ? '⚠️ Attention' : '✓ Vérification du solde'}
                          </p>
                          {collateralValidation && !collateralValidation.valid ? (
                            <p className="mt-1">{collateralValidation.message}</p>
                          ) : (
                            <p className="mt-1">
                              Votre solde d'épargne de {formatCurrency(savingsBalance, currency || 'HTG')} est suffisant.
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

                {/* Collateral Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valeur Estimée de la Garantie * (en {currency || 'HTG'})
                  </label>
                  <input
                    type="number"
                    {...register('collateralValue')}
                    placeholder="0"
                    readOnly={collateralType === 'Épargne bloquée' && savingsBalance > 0}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      collateralType === 'Épargne bloquée' && savingsBalance > 0 ? 'bg-gray-50 text-gray-700' : ''
                    } ${errors.collateralValue ? 'border-red-300' : 'border-gray-300'}`}
                  />
                  {collateralType === 'Épargne bloquée' && savingsBalance > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Valeur automatiquement définie selon votre solde d'épargne
                    </p>
                  )}
                  {errors.collateralValue && (
                    <p className="text-xs text-red-600 mt-1">{errors.collateralValue.message}</p>
                  )}
                  {requestedAmount && watch('collateralValue') && collateralType !== 'Épargne bloquée' && (
                    <p className={`text-sm mt-1 ${
                      watch('collateralValue') >= requestedAmount * 1.2
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {watch('collateralValue') >= requestedAmount * 1.2
                        ? '✓ Garantie suffisante'
                        : `⚠ Minimum requis: ${formatCurrency(requestedAmount * 1.2, currency || 'HTG')}`
                      }
                    </p>
                  )}
                </div>

                {/* Collateral Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description Détaillée de la Garantie *
                  </label>
                  <textarea
                    {...register('collateralDescription')}
                    rows={4}
                    placeholder="Ex: Maison en béton, 3 chambres, située à [adresse], titre de propriété n°..."
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.collateralDescription ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Incluez les détails: numéro de titre, adresse exacte, dimensions, état, etc.
                  </p>
                  {errors.collateralDescription && (
                    <p className="text-xs text-red-600 mt-1">{errors.collateralDescription.message}</p>
                  )}
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
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.guarantor1Name ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.guarantor1Name && (
                      <p className="text-xs text-red-600 mt-1">{errors.guarantor1Name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      {...register('guarantor1Phone')}
                      placeholder="+509 XXXX XXXX"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.guarantor1Phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.guarantor1Phone && (
                      <p className="text-xs text-red-600 mt-1">{errors.guarantor1Phone.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lien avec l'Emprunteur *
                    </label>
                    <select
                      {...register('guarantor1Relation')}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.guarantor1Relation ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Sélectionner</option>
                      {relationTypes.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {errors.guarantor1Relation && (
                      <p className="text-xs text-red-600 mt-1">{errors.guarantor1Relation.message}</p>
                    )}
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
                      {relationTypes.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
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
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.reference1Name ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.reference1Name && (
                      <p className="text-xs text-red-600 mt-1">{errors.reference1Name.message}</p>
                    )}
                    <input
                      type="tel"
                      {...register('reference1Phone')}
                      placeholder="Téléphone"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.reference1Phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.reference1Phone && (
                      <p className="text-xs text-red-600 mt-1">{errors.reference1Phone.message}</p>
                    )}
                  </div>

                  {/* Référence 2 */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Référence 2 *</p>
                    <input
                      type="text"
                      {...register('reference2Name')}
                      placeholder="Nom complet"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.reference2Name ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.reference2Name && (
                      <p className="text-xs text-red-600 mt-1">{errors.reference2Name.message}</p>
                    )}
                    <input
                      type="tel"
                      {...register('reference2Phone')}
                      placeholder="Téléphone"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.reference2Phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.reference2Phone && (
                      <p className="text-xs text-red-600 mt-1">{errors.reference2Phone.message}</p>
                    )}
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

              {/* Document Checklist with File Upload */}
              <div className="space-y-4">
                {/* National ID Document */}
                <div className="border-2 border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
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

                      {/* File Upload Section */}
                      <div className="mt-3">
                        {!uploadedFiles.nationalId ? (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <div className="text-sm text-gray-600 mb-2">
                              Cliquez pour sélectionner ou glissez-déposez votre fichier
                            </div>
                            <label className="inline-block">
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload('nationalId', file);
                                }}
                                className="hidden"
                              />
                              <span className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer text-sm font-medium">
                                Choisir un fichier
                              </span>
                            </label>
                            <p className="text-xs text-gray-500 mt-2">
                              Formats acceptés: JPG, PNG, PDF (max 5MB)
                            </p>
                          </div>
                        ) : (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                            <File className="w-6 h-6 text-green-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-900">
                                {uploadedFiles.nationalId.file.name}
                              </p>
                              <p className="text-xs text-green-700">
                                {formatFileSize(uploadedFiles.nationalId.file.size)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleFileRemove('nationalId')}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proof of Residence Document */}
                <div className="border-2 border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
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

                      {/* File Upload Section */}
                      <div className="mt-3">
                        {!uploadedFiles.proofOfResidence ? (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <div className="text-sm text-gray-600 mb-2">
                              Cliquez pour sélectionner ou glissez-déposez votre fichier
                            </div>
                            <label className="inline-block">
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload('proofOfResidence', file);
                                }}
                                className="hidden"
                              />
                              <span className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer text-sm font-medium">
                                Choisir un fichier
                              </span>
                            </label>
                            <p className="text-xs text-gray-500 mt-2">
                              Formats acceptés: JPG, PNG, PDF (max 5MB)
                            </p>
                          </div>
                        ) : (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                            <File className="w-6 h-6 text-green-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-900">
                                {uploadedFiles.proofOfResidence.file.name}
                              </p>
                              <p className="text-xs text-green-700">
                                {formatFileSize(uploadedFiles.proofOfResidence.file.size)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleFileRemove('proofOfResidence')}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proof of Income Document */}
                <div className="border-2 border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
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

                      {/* File Upload Section */}
                      <div className="mt-3">
                        {!uploadedFiles.proofOfIncome ? (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <div className="text-sm text-gray-600 mb-2">
                              Cliquez pour sélectionner ou glissez-déposez votre fichier
                            </div>
                            <label className="inline-block">
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload('proofOfIncome', file);
                                }}
                                className="hidden"
                              />
                              <span className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer text-sm font-medium">
                                Choisir un fichier
                              </span>
                            </label>
                            <p className="text-xs text-gray-500 mt-2">
                              Formats acceptés: JPG, PNG, PDF (max 5MB)
                            </p>
                          </div>
                        ) : (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                            <File className="w-6 h-6 text-green-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-900">
                                {uploadedFiles.proofOfIncome.file.name}
                              </p>
                              <p className="text-xs text-green-700">
                                {formatFileSize(uploadedFiles.proofOfIncome.file.size)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleFileRemove('proofOfIncome')}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collateral Documents */}
                <div className="border-2 border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
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

                      {/* File Upload Section */}
                      <div className="mt-3">
                        {!uploadedFiles.collateralDocs ? (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <div className="text-sm text-gray-600 mb-2">
                              Cliquez pour sélectionner ou glissez-déposez votre fichier
                            </div>
                            <label className="inline-block">
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload('collateralDocs', file);
                                }}
                                className="hidden"
                              />
                              <span className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer text-sm font-medium">
                                Choisir un fichier
                              </span>
                            </label>
                            <p className="text-xs text-gray-500 mt-2">
                              Formats acceptés: JPG, PNG, PDF (max 5MB)
                            </p>
                          </div>
                        ) : (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                            <File className="w-6 h-6 text-green-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-900">
                                {uploadedFiles.collateralDocs.file.name}
                              </p>
                              <p className="text-xs text-green-700">
                                {formatFileSize(uploadedFiles.collateralDocs.file.size)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleFileRemove('collateralDocs')}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
                          ? getLoanTypeInfo(loanType)!.name
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
                        {requestedAmount ? formatCurrency(requestedAmount, currency || 'HTG') : 'N/A'}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Mensualité</p>
                      <p className="text-xl font-bold text-blue-600">
                        {monthlyPayment ? formatCurrency(monthlyPayment, currency || 'HTG') : 'N/A'}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Durée</p>
                      <p className="text-lg font-bold text-gray-900">{termMonths || 'N/A'} mois</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Taux d'Intérêt</p>
                      <p className="text-lg font-bold text-purple-600">
                        {typeof monthlyInterestRate === 'number' && isFinite(monthlyInterestRate) 
                          ? `${monthlyInterestRate.toFixed(2)}% mensuel` 
                          : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {typeof interestRate === 'number' && isFinite(interestRate) 
                          ? `(${interestRate.toFixed(1)}% annuel)` 
                          : ''}
                      </p>
                    </div>
                  </div>

                  {watch('collateralType') && (
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Garantie</p>
                      <p className="text-sm font-semibold text-gray-900">{watch('collateralType')}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Valeur: {watch('collateralValue') ? formatCurrency(watch('collateralValue'), currency || 'HTG') : 'N/A'}
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

              {/* Guarantee Summary */}
              {loanType && requestedAmount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" />
                    Résumé de la Garantie
                  </h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>
                      <span className="font-medium">Type de crédit:</span> {getLoanTypeInfo(loanType)?.name}
                    </p>
                    <p>
                      <span className="font-medium">Pourcentage garanti:</span> {Math.round(guaranteePercentage * 100)}%
                    </p>
                    <p>
                      <span className="font-medium">Montant garanti estimé:</span> {formatCurrency(requiredGuaranteeAmount, currency || 'HTG')}
                    </p>
                    <p className="text-xs text-blue-700 mt-2">
                      Ce montant sera bloqué sur votre compte d'épargne après approbation (calcul définitif côté serveur).
                    </p>
                  </div>
                </div>
              )}

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

              {/* Success Message */}
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