import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
  AccountOpeningFormData, 
  Currency, 
  IdentityDocumentType,
  HAITI_DEPARTMENTS,
  COMMUNES_BY_DEPARTMENT,
  HaitiDepartment,
  BUSINESS_RULES,
  AuthorizedSigner
} from '../../types/savings';
import { Branch } from '../../types/branch';
import { Upload, X, Plus, UserPlus, FileText, Camera, RotateCcw, Check } from 'lucide-react';
import SignatureCanvas from './SignatureCanvas';
import { genderLabel } from '../../utils/gender';

interface AccountOpeningFormProps {
  onSubmit: (data: AccountOpeningFormData) => void;
  onCancel: () => void;
  branches: Branch[];
  isLoading?: boolean;
}

// Schéma de validation complet
const accountOpeningSchema = yup.object({
  customer: yup.object({
    firstName: yup
      .string()
      .required('Le prénom est obligatoire')
      .min(2, 'Le prénom doit contenir au moins 2 caractères')
      .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
      .matches(/^[A-Za-zÀ-ÿ\s-']+$/, 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
    
    lastName: yup
      .string()
      .required('Le nom de famille est obligatoire')
      .min(2, 'Le nom doit contenir au moins 2 caractères')
      .max(50, 'Le nom ne peut pas dépasser 50 caractères')
      .matches(/^[A-Za-zÀ-ÿ\s-']+$/, 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
    
    dateOfBirth: yup
      .string()
      .required('La date de naissance est obligatoire')
      .test('valid-dob', 'Date de naissance invalide', (val) => !!val && !isNaN(Date.parse(val)))
      .test('min-age', `L'âge minimum requis est ${BUSINESS_RULES.MIN_AGE} ans`, (val) => {
        if (!val) return false;
        const dob = Date.parse(val);
        if (isNaN(dob)) return false;
        const minAgeMs = BUSINESS_RULES.MIN_AGE * 365 * 24 * 60 * 60 * 1000;
        return (Date.now() - dob) >= minAgeMs;
      })
      .test('not-too-old', 'Date de naissance invalide', (val) => {
        if (!val) return false;
        const dob = Date.parse(val);
        if (isNaN(dob)) return false;
        const earliest = Date.parse('1900-01-01');
        return dob >= earliest;
      }),
    
    birthPlace: yup
      .string()
      .optional()
      .max(100, 'Le lieu de naissance ne peut pas dépasser 100 caractères'),
    
    nationality: yup
      .string()
      .optional()
      .max(50, 'La nationalité ne peut pas dépasser 50 caractères'),
    
    nif: yup
      .string()
      .optional()
      .matches(/^[A-Z0-9-]+$/, 'Format NIF invalide'),
    
    gender: yup
      .string()
      .required('Le genre est obligatoire')
      .oneOf(['M', 'F'], 'Genre invalide'),
    
    street: yup
      .string()
      .required('L\'adresse est obligatoire')
      .min(5, 'L\'adresse doit contenir au moins 5 caractères')
      .max(200, 'L\'adresse ne peut pas dépasser 200 caractères'),
    
    postalAddress: yup
      .string()
      .optional()
      .max(200, 'L\'adresse postale ne peut pas dépasser 200 caractères'),
    
    commune: yup
      .string()
      .required('La commune est obligatoire'),
    
    department: yup
      .string()
      .required('Le département est obligatoire')
      .oneOf(HAITI_DEPARTMENTS as readonly string[], 'Département invalide'),
    
    primaryPhone: yup
      .string()
      .required('Le numéro de téléphone principal est obligatoire')
      .matches(/^(\+509\s?)?[234579]\d{7}$/, 'Format de numéro haïtien invalide (ex: +509 3712 3456)'),
    
    secondaryPhone: yup
      .string()
      .optional()
      .matches(/^(\+509\s?)?[234579]\d{7}$/, 'Format de numéro haïtien invalide')
      .test('different-from-primary', 'Le numéro secondaire doit être différent du principal', 
            function(value) {
              return !value || value !== this.parent.primaryPhone;
            }),
    
    email: yup
      .string()
      .optional()
      .email('Format d\'email invalide'),
    
    emergencyContactName: yup
      .string()
      .optional()
      .min(2, 'Le nom du contact d\'urgence doit contenir au moins 2 caractères')
      .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
    
    emergencyContactPhone: yup
      .string()
      .optional()
      .matches(/^(\+509\s?)?[234579]\d{7}$/, 'Format de numéro haïtien invalide'),
    
    documentType: yup
      .string()
      .required('Le type de document est obligatoire')
      .oneOf(Object.values(IdentityDocumentType), 'Type de document invalide'),
    
    documentNumber: yup
      .string()
      .required('Le numéro de document est obligatoire')
      .min(5, 'Le numéro de document doit contenir au moins 5 caractères')
      .max(20, 'Le numéro de document ne peut pas dépasser 20 caractères'),
    
    issuedDate: yup
      .string()
      .required('La date d\'émission est obligatoire')
      .test('valid-issued', 'Date d\'émission invalide', (val) => !!val && !isNaN(Date.parse(val)))
      .test('issued-not-future', 'La date d\'émission ne peut pas être dans le futur', (val) => {
        if (!val) return false;
        const d = Date.parse(val);
        return !isNaN(d) && d <= Date.now();
      }),
    
    expiryDate: yup
      .string()
      .optional()
      .test('valid-expiry', 'Date d\'expiration invalide', (val) => !val || !isNaN(Date.parse(val)))
      .test('after-issued', 'La date d\'expiration doit être postérieure à la date d\'émission', function(val) {
        if (!val) return true;
        const issued = this.parent.issuedDate as string;
        if (!issued) return true; // handled by issuedDate required
        const exp = Date.parse(val);
        const iss = Date.parse(issued);
        return !isNaN(exp) && !isNaN(iss) && exp >= iss;
      })
      .test('not-expired', 'Le document ne peut pas être expiré', (val) => !val || (Date.parse(val) >= Date.now())),
    
    issuingAuthority: yup
      .string()
      .required('L\'autorité d\'émission est obligatoire')
      .min(2, 'L\'autorité d\'émission doit contenir au moins 2 caractères')
      .max(100, 'L\'autorité d\'émission ne peut pas dépasser 100 caractères'),
    
    occupation: yup
      .string()
      .optional()
      .max(100, 'La profession ne peut pas dépasser 100 caractères'),
    
    employerName: yup
      .string()
      .optional()
      .max(100, 'Le nom de l\'employeur ne peut pas dépasser 100 caractères'),
    
    workAddress: yup
      .string()
      .optional()
      .max(200, 'L\'adresse de travail ne peut pas dépasser 200 caractères'),
    
    incomeSource: yup
      .string()
      .optional()
      .max(100, 'La source de revenu ne peut pas dépasser 100 caractères'),
    
    monthlyIncome: yup
      .number()
      .optional()
      .positive('Le revenu mensuel doit être positif')
      .max(1000000, 'Veuillez vérifier le montant du revenu mensuel'),
    
    transactionFrequency: yup
      .string()
      .optional(),
    
    accountPurpose: yup
      .string()
      .optional()
      .max(200, 'La raison d\'ouverture ne peut pas dépasser 200 caractères'),
    
    maritalStatus: yup
      .string()
      .optional()
      .oneOf(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'], 'Statut matrimonial invalide'),
    
    spouseName: yup
      .string()
      .optional()
      .max(100, 'Le nom du conjoint ne peut pas dépasser 100 caractères'),
    
    numberOfDependents: yup
      .number()
      .optional()
      .min(0, 'Le nombre de dépendants ne peut pas être négatif')
      .max(20, 'Nombre de dépendants trop élevé'),
    
    educationLevel: yup
      .string()
      .optional()
      .max(50, 'Le niveau d\'éducation ne peut pas dépasser 50 caractères')
  }),
  
  currency: yup
    .string()
    .required('La devise est obligatoire')
    .oneOf(Object.values(Currency), 'Devise invalide'),
  
  initialDeposit: yup
    .number()
    .required('Le dépôt initial est obligatoire')
    .positive('Le dépôt initial doit être positif')
    .test('minimum-deposit', 'Dépôt initial insuffisant', function(value) {
      const currency = this.parent.currency as Currency;
      const minDeposit = BUSINESS_RULES.MIN_OPENING_DEPOSIT[currency];
      return value >= minDeposit;
    }),
  
  branchId: yup
    .number()
    .required('La succursale est obligatoire')
    .positive('Succursale invalide'),
  
  interestRate: yup
    .number()
    .optional()
    .min(0, 'Le taux d\'intérêt ne peut pas être négatif')
    .max(0.15, 'Le taux d\'intérêt ne peut pas dépasser 15%'),
  
  depositMethod: yup
    .string()
    .optional(),
  
  securityPin: yup
    .string()
    .optional()
    .matches(/^\d{4,6}$/, 'Le PIN doit contenir 4 à 6 chiffres'),
  
  securityQuestion: yup
    .string()
    .optional()
    .max(200, 'La question de sécurité ne peut pas dépasser 200 caractères'),
  
  securityAnswer: yup
    .string()
    .optional()
    .max(100, 'La réponse ne peut pas dépasser 100 caractères'),
  
  privacyConsent: yup
    .boolean()
    .required('Le consentement de confidentialité est obligatoire')
    .oneOf([true], 'Vous devez accepter la politique de confidentialité'),
  
  termsAccepted: yup
    .boolean()
    .required('L\'acceptation des conditions est obligatoire')
    .oneOf([true], 'Vous devez accepter les conditions d\'utilisation')
});

const AccountOpeningForm: React.FC<AccountOpeningFormProps> = ({
  onSubmit,
  onCancel,
  branches,
  isLoading = false
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState<HaitiDepartment | ''>('');
  const [previewMode, setPreviewMode] = useState(false);
  const [authorizedSigners, setAuthorizedSigners] = useState<any[]>([]);
  const [showSignerForm, setShowSignerForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [customerSignature, setCustomerSignature] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<{
    photo?: File;
    idDocument?: File;
    proofOfResidence?: File;
  }>({});

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    reset,
    setValue
  } = useForm<AccountOpeningFormData>({
    resolver: yupResolver(accountOpeningSchema) as any,
    defaultValues: {
      customer: {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        birthPlace: '',
        nationality: 'Haïtienne',
        nif: '',
        gender: 'M',
        street: '',
        postalAddress: '',
        commune: '',
        department: '',
        primaryPhone: '',
        secondaryPhone: '',
        email: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        documentType: IdentityDocumentType.CIN,
        documentNumber: '',
        issuedDate: '',
        expiryDate: '',
        issuingAuthority: '',
        occupation: '',
        employerName: '',
        workAddress: '',
        incomeSource: '',
        monthlyIncome: undefined,
        transactionFrequency: '',
        accountPurpose: '',
        maritalStatus: undefined,
        spouseName: '',
        numberOfDependents: undefined,
        educationLevel: ''
      },
      authorizedSigners: [],
      currency: Currency.HTG,
      initialDeposit: 0,
      depositMethod: 'CASH',
      branchId: 0,
      interestRate: BUSINESS_RULES.INTEREST_RATES[Currency.HTG],
      securityPin: '',
      securityQuestion: '',
      securityAnswer: '',
      privacyConsent: false,
      termsAccepted: false
    },
    mode: 'onChange'
  });

  const watchedCurrency = watch('currency');
  const watchedDepartment = watch('customer.department');
  const watchedFormData = watch();

  // Mettre à jour les communes disponibles quand le département change
  React.useEffect(() => {
    if (watchedDepartment && watchedDepartment !== selectedDepartment) {
      setSelectedDepartment(watchedDepartment as HaitiDepartment);
      setValue('customer.commune', ''); // Reset commune selection
    }
  }, [watchedDepartment, selectedDepartment, setValue]);

  // Mettre à jour le taux d'intérêt par défaut quand la devise change
  React.useEffect(() => {
    if (watchedCurrency) {
      setValue('interestRate', BUSINESS_RULES.INTEREST_RATES[watchedCurrency as Currency]);
    }
  }, [watchedCurrency, setValue]);

  const getMinimumDeposit = () => {
    return BUSINESS_RULES.MIN_OPENING_DEPOSIT[watchedCurrency as Currency] || 0;
  };

  const availableCommunes = selectedDepartment ? COMMUNES_BY_DEPARTMENT[selectedDepartment] : [];

  const handleFormSubmit = (data: AccountOpeningFormData) => {
    const completeData: AccountOpeningFormData = {
      ...data,
      authorizedSigners: authorizedSigners.length > 0 ? authorizedSigners : undefined
    };
    console.log('Données du formulaire:', completeData);
    onSubmit(completeData);
  };

  const handleReset = () => {
    reset();
    setSelectedDepartment('');
    setPreviewMode(false);
  };

  if (previewMode) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Aperçu - Ouverture de Compte d'Épargne</h2>
          <p className="text-gray-600">Veuillez vérifier les informations avant de confirmer l'ouverture du compte.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informations Client */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Client</h3>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Nom complet:</span> {watchedFormData.customer.firstName} {watchedFormData.customer.lastName}
              </div>
              <div>
                <span className="font-medium">Date de naissance:</span> {watchedFormData.customer.dateOfBirth}
              </div>
              <div>
                <span className="font-medium">Genre:</span> {genderLabel(watchedFormData.customer.gender)}
              </div>
              <div>
                <span className="font-medium">Téléphone:</span> {watchedFormData.customer.primaryPhone}
              </div>
              {watchedFormData.customer.email && (
                <div>
                  <span className="font-medium">Email:</span> {watchedFormData.customer.email}
                </div>
              )}
              <div>
                <span className="font-medium">Adresse:</span> {watchedFormData.customer.street}, {watchedFormData.customer.commune}, {watchedFormData.customer.department}
              </div>
              <div>
                <span className="font-medium">Document:</span> {watchedFormData.customer.documentType} - {watchedFormData.customer.documentNumber}
              </div>
            </div>
          </div>

          {/* Informations Compte */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Compte</h3>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Devise:</span> {watchedFormData.currency}
              </div>
              <div>
                <span className="font-medium">Dépôt initial:</span> {watchedFormData.initialDeposit.toLocaleString()} {watchedFormData.currency}
              </div>
              <div>
                <span className="font-medium">Mode de versement:</span> {watchedFormData.depositMethod}
              </div>
              <div>
                <span className="font-medium">Succursale:</span> {branches.find(b => b.id === watchedFormData.branchId)?.name}
              </div>
              <div>
                <span className="font-medium">Taux d'intérêt:</span> {((watchedFormData.interestRate || 0) * 100).toFixed(2)}% annuel
              </div>
              <div>
                <span className="font-medium">Solde minimum:</span> {BUSINESS_RULES.MIN_BALANCE[watchedFormData.currency as Currency]} {watchedFormData.currency}
              </div>
            </div>
          </div>

          {/* Signataires autorisés */}
          {authorizedSigners.length > 0 && (
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Signataires Autorisés</h3>
              <div className="space-y-3">
                {authorizedSigners.map((signer, index) => (
                  <div key={index} className="bg-white p-3 rounded border border-purple-200">
                    <div className="font-medium">{signer.fullName}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {signer.relationshipToCustomer} - {signer.phoneNumber}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => setPreviewMode(false)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
          >
            Modifier
          </button>
          <button
            type="button"
            onClick={() => handleFormSubmit(watchedFormData)}
            disabled={isLoading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Création en cours...' : 'Confirmer l\'ouverture'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ouverture de Compte d'Épargne</h2>
        <p className="text-gray-600">Remplissez les informations du client et du compte à ouvrir.</p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit as (data: AccountOpeningFormData) => void)} className="space-y-8">
        {/* Section Informations Personnelles */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">I. Informations d'Identification du Client</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prénom * <span className="text-xs text-gray-500">(Non)</span>
              </label>
              <Controller
                name="customer.firstName"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Entrez le prénom"
                  />
                )}
              />
              {errors.customer?.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.firstName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de famille * <span className="text-xs text-gray-500">(Siyati)</span>
              </label>
              <Controller
                name="customer.lastName"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Entrez le nom de famille"
                  />
                )}
              />
              {errors.customer?.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.lastName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de naissance * <span className="text-xs text-gray-500">(Dat nesans)</span>
              </label>
              <Controller
                name="customer.dateOfBirth"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="date"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                )}
              />
              {errors.customer?.dateOfBirth && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.dateOfBirth.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lieu de naissance <span className="text-xs text-gray-500">(Kote nesans)</span>
              </label>
              <Controller
                name="customer.birthPlace"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.birthPlace ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Ex: Port-au-Prince, Haïti"
                  />
                )}
              />
              {errors.customer?.birthPlace && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.birthPlace.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Genre * <span className="text-xs text-gray-500">(Sèks)</span>
              </label>
              <Controller
                name="customer.gender"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.gender ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                )}
              />
              {errors.customer?.gender && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.gender.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nationalité <span className="text-xs text-gray-500">(Nasyonalite)</span>
              </label>
              <Controller
                name="customer.nationality"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.nationality ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Ex: Haïtienne"
                  />
                )}
              />
              {errors.customer?.nationality && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.nationality.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NIF <span className="text-xs text-gray-500">(Nimewo Idantifikasyon Fiskal)</span>
              </label>
              <Controller
                name="customer.nif"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.nif ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Ex: NIF-123456789"
                  />
                )}
              />
              {errors.customer?.nif && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.nif.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section Adresse et Contact */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Adresse et Contact</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse complète de résidence * <span className="text-xs text-gray-500">(Adrès konplè rezidans)</span>
              </label>
              <Controller
                name="customer.street"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.street ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Numéro, rue, quartier"
                  />
                )}
              />
              {errors.customer?.street && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.street.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse postale <span className="text-xs text-gray-500">(si différente - Adrès postal)</span>
              </label>
              <Controller
                name="customer.postalAddress"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.postalAddress ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Boîte postale ou adresse postale"
                  />
                )}
              />
              {errors.customer?.postalAddress && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.postalAddress.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Département *
              </label>
              <Controller
                name="customer.department"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.department ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Sélectionner un département</option>
                    {HAITI_DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                )}
              />
              {errors.customer?.department && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.department.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commune *
              </label>
              <Controller
                name="customer.commune"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.commune ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={!selectedDepartment}
                  >
                    <option value="">Sélectionner une commune</option>
                    {availableCommunes.map(commune => (
                      <option key={commune} value={commune}>{commune}</option>
                    ))}
                  </select>
                )}
              />
              {errors.customer?.commune && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.commune.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone principal * <span className="text-xs text-gray-500">(Nimewo telefòn prensipal)</span>
              </label>
              <Controller
                name="customer.primaryPhone"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="tel"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.primaryPhone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="+509 3712 3456"
                  />
                )}
              />
              {errors.customer?.primaryPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.primaryPhone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone secondaire <span className="text-xs text-gray-500">(Nimewo telefòn segondè)</span>
              </label>
              <Controller
                name="customer.secondaryPhone"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="tel"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.secondaryPhone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="+509 2222 3333"
                  />
                )}
              />
              {errors.customer?.secondaryPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.secondaryPhone.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-xs text-gray-500">(Adrès imel)</span>
              </label>
              <Controller
                name="customer.email"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="email"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="email@exemple.com"
                  />
                )}
              />
              {errors.customer?.email && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.email.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section Pièce d'Identité */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pièce d'Identité</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de document *
              </label>
              <Controller
                name="customer.documentType"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.documentType ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value={IdentityDocumentType.CIN}>Carte d'Identité Nationale</option>
                    <option value={IdentityDocumentType.PASSPORT}>Passeport</option>
                    <option value={IdentityDocumentType.DRIVING_LICENSE}>Permis de Conduire</option>
                  </select>
                )}
              />
              {errors.customer?.documentType && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.documentType.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de document *
              </label>
              <Controller
                name="customer.documentNumber"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.documentNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Numéro du document"
                  />
                )}
              />
              {errors.customer?.documentNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.documentNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date d'émission *
              </label>
              <Controller
                name="customer.issuedDate"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="date"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.issuedDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                )}
              />
              {errors.customer?.issuedDate && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.issuedDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date d'expiration
              </label>
              <Controller
                name="customer.expiryDate"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="date"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.expiryDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                )}
              />
              {errors.customer?.expiryDate && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.expiryDate.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Autorité d'émission *
              </label>
              <Controller
                name="customer.issuingAuthority"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.issuingAuthority ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Ex: Office National d'Identification"
                  />
                )}
              />
              {errors.customer?.issuingAuthority && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.issuingAuthority.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section Documents et Photos */}
        <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents Légaux et Photos</h3>
          <p className="text-sm text-gray-600 mb-6">Téléchargez les documents requis (Dokiman legal)</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Photo du client */}
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-500 transition-colors">
              <div className="text-center">
                <Camera className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <h4 className="font-medium text-gray-900 mb-2">Photo du client *</h4>
                <p className="text-sm text-gray-600 mb-4">Foto kliyan an (2 foto fòma paspo)</p>
                {uploadedFiles.photo ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2 text-green-600">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-medium">{uploadedFiles.photo.name}</span>
                    </div>
                    <label className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer">
                      <RotateCcw className="w-4 h-4" />
                      <span>Changer</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              alert('Le fichier ne doit pas dépasser 5 MB');
                              return;
                            }
                            setUploadedFiles({ ...uploadedFiles, photo: file });
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Charger photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            alert('Le fichier ne doit pas dépasser 5 MB');
                            return;
                          }
                          setUploadedFiles({ ...uploadedFiles, photo: file });
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Copie pièce d'identité */}
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-500 transition-colors">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <h4 className="font-medium text-gray-900 mb-2">Pièce d'identité *</h4>
                <p className="text-sm text-gray-600 mb-4">Fotokopi kat idantite oswa paswa</p>
                {uploadedFiles.idDocument ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2 text-green-600">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-medium">{uploadedFiles.idDocument.name}</span>
                    </div>
                    <label className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer">
                      <RotateCcw className="w-4 h-4" />
                      <span>Changer</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              alert('Le fichier ne doit pas dépasser 5 MB');
                              return;
                            }
                            setUploadedFiles({ ...uploadedFiles, idDocument: file });
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Charger document</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            alert('Le fichier ne doit pas dépasser 5 MB');
                            return;
                          }
                          setUploadedFiles({ ...uploadedFiles, idDocument: file });
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Preuve de résidence */}
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-500 transition-colors">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <h4 className="font-medium text-gray-900 mb-2">Preuve de résidence</h4>
                <p className="text-sm text-gray-600 mb-4">Prèv rezidans (faktir NATCOM, EDH)</p>
                {uploadedFiles.proofOfResidence ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2 text-green-600">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-medium">{uploadedFiles.proofOfResidence.name}</span>
                    </div>
                    <label className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer">
                      <RotateCcw className="w-4 h-4" />
                      <span>Changer</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              alert('Le fichier ne doit pas dépasser 5 MB');
                              return;
                            }
                            setUploadedFiles({ ...uploadedFiles, proofOfResidence: file });
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Charger document</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            alert('Le fichier ne doit pas dépasser 5 MB');
                            return;
                          }
                          setUploadedFiles({ ...uploadedFiles, proofOfResidence: file });
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Signature du client */}
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors">
              <div className="text-center">
                {customerSignature ? (
                  <div>
                    <img src={customerSignature} alt="Signature" className="max-w-full h-32 mx-auto mb-3 border rounded" />
                    <button
                      type="button"
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      onClick={() => setShowSignatureCanvas(true)}
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Modifier</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <h4 className="font-medium text-gray-900 mb-2">Signature *</h4>
                    <p className="text-sm text-gray-600 mb-4">Siyati kliyan an</p>
                    <button
                      type="button"
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      onClick={() => setShowSignatureCanvas(true)}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Signer maintenant</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Note importante:</span> Tous les documents doivent être clairs et lisibles. 
              Formats acceptés: JPG, PNG, PDF (maximum 5 MB par fichier).
            </p>
          </div>
        </div>

        {/* Section Moun ki Gen Dwa Siyati */}
        <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">II. Moun ki Gen Dwa Siyati (Optionnel)</h3>
              <p className="text-sm text-gray-600 mt-1">Personne autorisée à signer sur le compte</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSignerForm(!showSignerForm)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500"
            >
              <UserPlus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          </div>

          {/* Liste des signataires autorisés */}
          {authorizedSigners.length > 0 && (
            <div className="mb-4 space-y-3">
              {authorizedSigners.map((signer, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-purple-200 flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{signer.fullName}</h4>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      <p><span className="font-medium">Document:</span> {signer.documentType} - {signer.documentNumber}</p>
                      <p><span className="font-medium">Relation:</span> {signer.relationshipToCustomer}</p>
                      <p><span className="font-medium">Téléphone:</span> {signer.phoneNumber}</p>
                      {signer.authorizationLimit && (
                        <p><span className="font-medium">Limite:</span> {signer.authorizationLimit.toLocaleString()} {watchedCurrency}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = authorizedSigners.filter((_, i) => i !== index);
                      setAuthorizedSigners(updated);
                    }}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Formulaire d'ajout de signataire */}
          {showSignerForm && (
            <div className="bg-white p-6 rounded-lg border-2 border-purple-300 space-y-4">
              <h4 className="font-medium text-gray-900 mb-4">Ajouter un signataire autorisé</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom complet * <span className="text-xs text-gray-500">(Non konplè)</span>
                  </label>
                  <input
                    type="text"
                    id="signer-fullName"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Nom complet du signataire"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de document * <span className="text-xs text-gray-500">(Kalite dokiman)</span>
                  </label>
                  <select
                    id="signer-documentType"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={IdentityDocumentType.CIN}>Carte d'Identité Nationale</option>
                    <option value={IdentityDocumentType.PASSPORT}>Passeport</option>
                    <option value={IdentityDocumentType.DRIVING_LICENSE}>Permis de Conduire</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de document * <span className="text-xs text-gray-500">(Nimewo dokiman)</span>
                  </label>
                  <input
                    type="text"
                    id="signer-documentNumber"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Numéro du document"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relation avec le client * <span className="text-xs text-gray-500">(Relasyon)</span>
                  </label>
                  <select
                    id="signer-relationship"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="BENEFICIARY">Bénéficiaire (Benefisyè)</option>
                    <option value="CO_HOLDER">Co-titulaire (Ko-titilè)</option>
                    <option value="ATTORNEY">Mandataire (Mandatè)</option>
                    <option value="SPOUSE">Conjoint (Konjwen)</option>
                    <option value="CHILD">Enfant (Pitit)</option>
                    <option value="PARENT">Parent</option>
                    <option value="OTHER">Autre (Lòt)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse <span className="text-xs text-gray-500">(Adrès)</span>
                  </label>
                  <input
                    type="text"
                    id="signer-address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Adresse complète"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone * <span className="text-xs text-gray-500">(Telefòn)</span>
                  </label>
                  <input
                    type="tel"
                    id="signer-phone"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="+509 3712 3456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Limite d'autorisation ({watchedCurrency}) <span className="text-xs text-gray-500">(Limit)</span>
                  </label>
                  <input
                    type="number"
                    id="signer-limit"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Montant maximum autorisé"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowSignerForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fullName = (document.getElementById('signer-fullName') as HTMLInputElement)?.value;
                    const documentType = (document.getElementById('signer-documentType') as HTMLSelectElement)?.value;
                    const documentNumber = (document.getElementById('signer-documentNumber') as HTMLInputElement)?.value;
                    const relationship = (document.getElementById('signer-relationship') as HTMLSelectElement)?.value;
                    const address = (document.getElementById('signer-address') as HTMLInputElement)?.value;
                    const phone = (document.getElementById('signer-phone') as HTMLInputElement)?.value;
                    const limitValue = (document.getElementById('signer-limit') as HTMLInputElement)?.value;

                    if (!fullName || !documentType || !documentNumber || !relationship || !phone) {
                      alert('Veuillez remplir tous les champs obligatoires');
                      return;
                    }

                    const newSigner: AuthorizedSigner = {
                      fullName,
                      documentType: documentType as IdentityDocumentType,
                      documentNumber,
                      relationshipToCustomer: relationship,
                      address,
                      phoneNumber: phone,
                      authorizationLimit: limitValue ? parseFloat(limitValue) : undefined
                    };

                    setAuthorizedSigners([...authorizedSigners, newSigner]);
                    setShowSignerForm(false);

                    // Reset form
                    (document.getElementById('signer-fullName') as HTMLInputElement).value = '';
                    (document.getElementById('signer-documentNumber') as HTMLInputElement).value = '';
                    (document.getElementById('signer-address') as HTMLInputElement).value = '';
                    (document.getElementById('signer-phone') as HTMLInputElement).value = '';
                    (document.getElementById('signer-limit') as HTMLInputElement).value = '';
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Ajouter le signataire
                </button>
              </div>
            </div>
          )}

          {authorizedSigners.length === 0 && !showSignerForm && (
            <div className="text-center py-8 text-gray-500">
              <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Aucun signataire autorisé ajouté</p>
              <p className="text-sm mt-1">Cliquez sur "Ajouter" pour ajouter un signataire</p>
            </div>
          )}
        </div>

        {/* Section Informations Professionnelles */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">III. Informations Professionnelles et Financières</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profession/Occupation <span className="text-xs text-gray-500">(Pwofesyon)</span>
              </label>
              <Controller
                name="customer.occupation"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.occupation ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Ex: Enseignant, Commerçant, Fonctionnaire"
                  />
                )}
              />
              {errors.customer?.occupation && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.occupation.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'employeur/Entreprise <span className="text-xs text-gray-500">(Non anplwayè)</span>
              </label>
              <Controller
                name="customer.employerName"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.employerName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Ex: Ministère de l'Éducation"
                  />
                )}
              />
              {errors.customer?.employerName && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.employerName.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse du travail/Commerce <span className="text-xs text-gray-500">(Adrès travay)</span>
              </label>
              <Controller
                name="customer.workAddress"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.workAddress ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Adresse complète du lieu de travail"
                  />
                )}
              />
              {errors.customer?.workAddress && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.workAddress.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source principale de revenu <span className="text-xs text-gray-500">(Sous revni)</span>
              </label>
              <Controller
                name="customer.incomeSource"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.incomeSource ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Sélectionner...</option>
                    <option value="SALARY">Salaire (Salè)</option>
                    <option value="BUSINESS">Commerce (Komès)</option>
                    <option value="TRANSFER">Transfert/Remittance (Transfè)</option>
                    <option value="AGRICULTURE">Agriculture</option>
                    <option value="RENTAL">Loyer (Lwaye)</option>
                    <option value="PENSION">Pension</option>
                    <option value="OTHER">Autre (Lòt)</option>
                  </select>
                )}
              />
              {errors.customer?.incomeSource && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.incomeSource.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Revenu mensuel estimé ({watchedCurrency}) <span className="text-xs text-gray-500">(Revni mwayen)</span>
              </label>
              <Controller
                name="customer.monthlyIncome"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.monthlyIncome ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Montant du revenu mensuel"
                  />
                )}
              />
              {errors.customer?.monthlyIncome && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.monthlyIncome.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Raison d'ouverture du compte <span className="text-xs text-gray-500">(Rezon ouvèti)</span>
              </label>
              <Controller
                name="customer.accountPurpose"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.accountPurpose ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Sélectionner...</option>
                    <option value="SAVINGS">Épargne (Epay)</option>
                    <option value="LOAN">Crédit/Prêt (Kredi)</option>
                    <option value="BUSINESS">Transactions commerciales (Tranzaksyon biznis)</option>
                    <option value="TRANSFER">Transfert d'argent (Transfè lajan)</option>
                    <option value="SALARY">Recevoir salaire (Resevwa salè)</option>
                    <option value="OTHER">Autre (Lòt)</option>
                  </select>
                )}
              />
              {errors.customer?.accountPurpose && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.accountPurpose.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fréquence des transactions estimée <span className="text-xs text-gray-500">(Frekans tranzaksyon)</span>
              </label>
              <Controller
                name="customer.transactionFrequency"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.transactionFrequency ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Sélectionner...</option>
                    <option value="DAILY">Quotidien (Chak jou)</option>
                    <option value="WEEKLY">Hebdomadaire (Chak semèn)</option>
                    <option value="BIWEEKLY">Bihebdomadaire (De fwa pa semèn)</option>
                    <option value="MONTHLY">Mensuel (Chak mwa)</option>
                    <option value="OCCASIONAL">Occasionnel (Tan zan tan)</option>
                  </select>
                )}
              />
              {errors.customer?.transactionFrequency && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.transactionFrequency.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section Informations Additionnelles */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">VI. Informations Additionnelles (Optionnel)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Situation matrimoniale <span className="text-xs text-gray-500">(Sitiyasyon matrimonyal)</span>
              </label>
              <Controller
                name="customer.maritalStatus"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    value={field.value || ''}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.maritalStatus ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Sélectionner...</option>
                    <option value="SINGLE">Célibataire (Selibatè)</option>
                    <option value="MARRIED">Marié(e) (Marye)</option>
                    <option value="DIVORCED">Divorcé(e) (Divòse)</option>
                    <option value="WIDOWED">Veuf/Veuve (Vèf)</option>
                  </select>
                )}
              />
              {errors.customer?.maritalStatus && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.maritalStatus.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du conjoint <span className="text-xs text-gray-500">(Non konjwen)</span>
              </label>
              <Controller
                name="customer.spouseName"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.spouseName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nom complet du conjoint"
                  />
                )}
              />
              {errors.customer?.spouseName && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.spouseName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de dépendants <span className="text-xs text-gray-500">(Kantite depandan)</span>
              </label>
              <Controller
                name="customer.numberOfDependents"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.numberOfDependents ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nombre de personnes à charge"
                  />
                )}
              />
              {errors.customer?.numberOfDependents && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.numberOfDependents.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Niveau d'éducation <span className="text-xs text-gray-500">(Nivo edikasyon)</span>
              </label>
              <Controller
                name="customer.educationLevel"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.educationLevel ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Sélectionner...</option>
                    <option value="PRIMARY">Primaire</option>
                    <option value="SECONDARY">Secondaire</option>
                    <option value="VOCATIONAL">Professionnel</option>
                    <option value="UNIVERSITY">Universitaire</option>
                    <option value="GRADUATE">Études supérieures</option>
                    <option value="NONE">Aucun</option>
                  </select>
                )}
              />
              {errors.customer?.educationLevel && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.educationLevel.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du contact d'urgence <span className="text-xs text-gray-500">(Non referans)</span>
              </label>
              <Controller
                name="customer.emergencyContactName"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.emergencyContactName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nom complet du contact"
                  />
                )}
              />
              {errors.customer?.emergencyContactName && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.emergencyContactName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone du contact d'urgence <span className="text-xs text-gray-500">(Telefòn referans)</span>
              </label>
              <Controller
                name="customer.emergencyContactPhone"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="tel"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.customer?.emergencyContactPhone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="+509 1234 5678"
                  />
                )}
              />
              {errors.customer?.emergencyContactPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.customer.emergencyContactPhone.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section Sécurité et Conformité */}
        <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">V. Sécurité et Conformité</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code PIN (4-6 chiffres) <span className="text-xs text-gray-500">(Kòd sekrè)</span>
              </label>
              <Controller
                name="securityPin"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="password"
                    maxLength={6}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.securityPin ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Ex: 1234"
                  />
                )}
              />
              {errors.securityPin && (
                <p className="mt-1 text-sm text-red-600">{errors.securityPin.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question de sécurité <span className="text-xs text-gray-500">(Kesyon sekirite)</span>
              </label>
              <Controller
                name="securityQuestion"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.securityQuestion ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Sélectionner une question...</option>
                    <option value="BIRTH_CITY">Ville de naissance de votre mère?</option>
                    <option value="PET_NAME">Nom de votre premier animal?</option>
                    <option value="SCHOOL">Nom de votre école primaire?</option>
                    <option value="FRIEND">Nom de votre meilleur ami d'enfance?</option>
                    <option value="CUSTOM">Question personnalisée</option>
                  </select>
                )}
              />
              {errors.securityQuestion && (
                <p className="mt-1 text-sm text-red-600">{errors.securityQuestion.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Réponse à la question de sécurité <span className="text-xs text-gray-500">(Repons)</span>
              </label>
              <Controller
                name="securityAnswer"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.securityAnswer ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Réponse à votre question de sécurité"
                  />
                )}
              />
              {errors.securityAnswer && (
                <p className="mt-1 text-sm text-red-600">{errors.securityAnswer.message}</p>
              )}
            </div>

            {/* Consentements */}
            <div className="md:col-span-2 space-y-4 mt-4 p-4 bg-white rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-3">Consentements requis</h4>
              
              <div className="flex items-start space-x-3">
                <Controller
                  name="privacyConsent"
                  control={control}
                  render={({ field: { value, onChange, onBlur, name, ref } }) => (
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                      onBlur={onBlur}
                      name={name}
                      ref={ref}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  )}
                />
                <label className="text-sm text-gray-700">
                  <span className="font-medium">Politique de confidentialité *</span>
                  <p className="text-gray-600 mt-1">
                    J'accepte la politique de confidentialité et consens au traitement de mes données personnelles 
                    conformément aux lois haïtiennes sur la protection des données.
                  </p>
                </label>
              </div>
              {errors.privacyConsent && (
                <p className="text-sm text-red-600 ml-7">{errors.privacyConsent.message}</p>
              )}

              <div className="flex items-start space-x-3">
                <Controller
                  name="termsAccepted"
                  control={control}
                  render={({ field: { value, onChange, onBlur, name, ref } }) => (
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                      onBlur={onBlur}
                      name={name}
                      ref={ref}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  )}
                />
                <label className="text-sm text-gray-700">
                  <span className="font-medium">Conditions d'utilisation *</span>
                  <p className="text-gray-600 mt-1">
                    J'accepte les conditions générales d'utilisation du compte d'épargne et m'engage à respecter 
                    les règles de l'institution financière.
                  </p>
                </label>
              </div>
              {errors.termsAccepted && (
                <p className="text-sm text-red-600 ml-7">{errors.termsAccepted.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section Configuration du Compte */}
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">IV. Configuration du Compte d'Épargne</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Devise du compte * <span className="text-xs text-gray-500">(Lajan)</span>
              </label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.currency ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value={Currency.HTG}>Gourde Haïtienne (HTG)</option>
                    <option value={Currency.USD}>Dollar Américain (USD)</option>
                  </select>
                )}
              />
              {errors.currency && (
                <p className="mt-1 text-sm text-red-600">{errors.currency.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Succursale * <span className="text-xs text-gray-500">(Branch)</span>
              </label>
              <Controller
                name="branchId"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.branchId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value={0}>Sélectionner une succursale</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} - {branch.address}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.branchId && (
                <p className="mt-1 text-sm text-red-600">{errors.branchId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dépôt initial * <span className="text-xs text-gray-500">(Min: {getMinimumDeposit().toLocaleString()} {watchedCurrency})</span>
              </label>
              <Controller
                name="initialDeposit"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min={getMinimumDeposit()}
                    step="0.01"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.initialDeposit ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={`Minimum ${getMinimumDeposit()} ${watchedCurrency}`}
                  />
                )}
              />
              {errors.initialDeposit && (
                <p className="mt-1 text-sm text-red-600">{errors.initialDeposit.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mode de versement initial <span className="text-xs text-gray-500">(Mòd vèsman)</span>
              </label>
              <Controller
                name="depositMethod"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.depositMethod ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="CASH">Espèces (Kach)</option>
                    <option value="CHECK">Chèque (Chèk)</option>
                    <option value="TRANSFER">Transfert (Transfè)</option>
                    <option value="MOBILE_MONEY">Mobile Money (Lajan mobil)</option>
                  </select>
                )}
              />
              {errors.depositMethod && (
                <p className="mt-1 text-sm text-red-600">{errors.depositMethod.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taux d'intérêt annuel (%)
              </label>
              <Controller
                name="interestRate"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="0"
                    max="15"
                    step="0.001"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.interestRate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Ex: 3.5"
                  />
                )}
              />
              {errors.interestRate && (
                <p className="mt-1 text-sm text-red-600">{errors.interestRate.message}</p>
              )}
            </div>
          </div>

          {/* Informations sur les règles */}
          <div className="mt-6 p-4 bg-white rounded-lg border">
            <h4 className="font-medium text-gray-900 mb-2">Règles du compte d'épargne</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Solde minimum requis: {BUSINESS_RULES.MIN_BALANCE[watchedCurrency as Currency]} {watchedCurrency}</li>
              <li>• Limite de retrait quotidien: {BUSINESS_RULES.DEFAULT_DAILY_WITHDRAWAL_LIMIT[watchedCurrency as Currency].toLocaleString()} {watchedCurrency}</li>
              <li>• Taux d'intérêt par défaut: {(BUSINESS_RULES.INTEREST_RATES[watchedCurrency as Currency] * 100).toFixed(2)}% annuel</li>
              <li>• Maximum {BUSINESS_RULES.MAX_ACCOUNTS_PER_CUSTOMER} comptes par client</li>
            </ul>
          </div>
        </div>

        {/* Boutons d'Action */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
          >
            Réinitialiser
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
          >
            Annuler
          </button>
          
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            disabled={!isValid}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aperçu
          </button>
        </div>
      </form>

      {/* Signature Canvas Modal */}
      {showSignatureCanvas && (
        <SignatureCanvas
          onSave={(signature) => {
            setCustomerSignature(signature);
            setShowSignatureCanvas(false);
          }}
          onCancel={() => setShowSignatureCanvas(false)}
        />
      )}
    </div>
  );
};

export default AccountOpeningForm;