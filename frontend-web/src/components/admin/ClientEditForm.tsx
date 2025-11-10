import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { X, Save, Loader2, FileText, Edit3, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import savingsCustomerService, { SavingsCustomerResponseDto } from '../../services/savingsCustomerService';
import DocumentUploadModal from './DocumentUploadModal';
import { genderToMF } from '../../utils/gender';
import { HAITI_DEPARTMENTS, COMMUNES_BY_DEPARTMENT, HaitiDepartment } from '../../types/savings';

// Types
interface AuthorizedSigner {
  id?: string;
  fullName: string;
  documentType: string;
  documentNumber: string;
  relationshipToCustomer: string;
  address: string;
  phoneNumber: string;
  authorizationLimit?: number;
}

// Schema de validation dynamique
const createValidationSchema = (isBusiness: boolean) => yup.object().shape({
  // Champs communs
  street: yup.string().required('Adresse obligatoire'),
  department: yup.string().required('Département obligatoire'),
  commune: yup.string().required('Commune obligatoire'),
  postalCode: yup.string().nullable(),
  primaryPhone: yup.string()
    .required('Téléphone obligatoire')
    .matches(/^(\+509\s?)?[234579]\d{7}$/, 'Format de téléphone invalide'),
  secondaryPhone: yup.string()
    .nullable()
    .transform((value, originalValue) => originalValue === '' ? null : value)
    .matches(/^(\+509\s?)?[234579]\d{7}$/, {
      message: 'Format de téléphone invalide',
      excludeEmptyString: true
    }),
  email: yup.string().email('Format email invalide').nullable(),
  emergencyContactName: yup.string().nullable(),
  emergencyContactPhone: yup.string()
    .nullable()
    .transform((value, originalValue) => originalValue === '' ? null : value)
    .matches(/^(\+509\s?)?[234579]\d{7}$/, {
      message: 'Format de téléphone invalide',
      excludeEmptyString: true
    }),
  documentType: yup.string().required('Type de document obligatoire'),
  documentNumber: yup.string().required('Numéro de document obligatoire').min(5, 'Au moins 5 caractères'),
  issuedDate: yup.string().required('Date d\'émission obligatoire'),
  expiryDate: yup.string().nullable(),
  issuingAuthority: yup.string().required('Autorité d\'émission obligatoire'),

  // Champs conditionnels selon le type de client
  ...(isBusiness ? {
    // Champs pour personne morale
    companyName: yup.string().required('Raison sociale obligatoire').min(2, 'Au moins 2 caractères'),
    legalForm: yup.string().required('Forme juridique obligatoire'),
    businessRegistrationNumber: yup.string().nullable(),
    companyNif: yup.string().nullable(),
    headOfficeAddress: yup.string().required('Adresse du siège social obligatoire'),
    companyPhone: yup.string()
      .required('Téléphone de l\'entreprise obligatoire')
      .matches(/^(\+509\s?)?[234579]\d{7}$/, 'Format de téléphone invalide'),
    companyEmail: yup.string().email('Format email invalide').required('Email de l\'entreprise obligatoire'),
    legalRepresentativeName: yup.string().required('Nom du représentant obligatoire'),
    legalRepresentativeTitle: yup.string().required('Titre du représentant obligatoire'),
    legalRepresentativeDocumentType: yup.string().required('Type de document du représentant obligatoire'),
    legalRepresentativeDocumentNumber: yup.string().required('Numéro de document du représentant obligatoire').min(5, 'Au moins 5 caractères'),
    legalRepresentativeIssuedDate: yup.string().required('Date d\'émission du document obligatoire'),
    legalRepresentativeExpiryDate: yup.string().nullable(),
    legalRepresentativeIssuingAuthority: yup.string().required('Autorité d\'émission obligatoire'),
  } : {
    // Champs pour personne physique
    firstName: yup.string().required('Prénom obligatoire').min(2, 'Au moins 2 caractères'),
    lastName: yup.string().required('Nom obligatoire').min(2, 'Au moins 2 caractères'),
    dateOfBirth: yup.string().required('Date de naissance obligatoire'),
    birthPlace: yup.string().nullable(),
    nationality: yup.string().nullable(),
    nif: yup.string().nullable(),
    gender: yup.string().required('Genre obligatoire'),
    occupation: yup.string().nullable(),
    employerName: yup.string().nullable(),
    workAddress: yup.string().nullable(),
    incomeSource: yup.string().nullable(),
    monthlyIncome: yup.number().nullable(),
    transactionFrequency: yup.string().nullable(),
    accountPurpose: yup.string().nullable(),
    maritalStatus: yup.string().nullable(),
    spouseName: yup.string().nullable(),
    numberOfDependents: yup.number().nullable(),
    educationLevel: yup.string().nullable(),
    referencePerson: yup.string().nullable(),
    referencePersonPhone: yup.string()
      .nullable()
      .transform((value, originalValue) => originalValue === '' ? null : value)
      .matches(/^(\+509\s?)?[234579]\d{7}$/, {
        message: 'Format de téléphone invalide',
        excludeEmptyString: true
      }),
  })
});

interface ClientEditFormProps {
  customer: SavingsCustomerResponseDto;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const ClientEditForm: React.FC<ClientEditFormProps> = ({ customer, onSubmit, onCancel }) => {
  const [selectedDepartment, setSelectedDepartment] = useState(customer?.address?.department || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [updatedCustomer, setUpdatedCustomer] = useState<SavingsCustomerResponseDto | null>(customer);
  // Authorized signers state
  const [authorizedSigners, setAuthorizedSigners] = useState<AuthorizedSigner[]>((customer as any)?.authorizedSigners || []);
  const [showSignerForm, setShowSignerForm] = useState(false);
  const [currentSignerEdit, setCurrentSignerEdit] = useState<AuthorizedSigner | null>(null);
  // Helper: detect type from populated business fields if flag is missing
  const detectCustomerType = React.useCallback((cust: SavingsCustomerResponseDto | null | undefined) => {
    const c: any = cust as any;
    return !!(c?.companyName || c?.legalForm || c?.representativeFirstName || c?.representativeLastName || c?.taxId || c?.tradeRegisterNumber);
  }, []);

  const initialIsBusiness = ((customer as any)?.isBusiness ?? detectCustomerType(customer)) as boolean;
  const initialTypeSource: 'explicit' | 'detected' = ((customer as any)?.isBusiness === undefined || (customer as any)?.isBusiness === null)
    ? 'detected'
    : 'explicit';

  const [isBusiness, setIsBusiness] = useState<boolean>(!!initialIsBusiness);
  const [typeSource, setTypeSource] = useState<'explicit' | 'detected'>(initialTypeSource);

  // Créer un schéma de validation réactif qui change avec isBusiness
  const validationSchema = React.useMemo(() => createValidationSchema(isBusiness), [isBusiness]);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      // Champs communs
      street: customer?.address?.street || '',
      department: customer?.address?.department || '',
      commune: customer?.address?.commune || '',
      postalCode: customer?.address?.postalCode || '',
      primaryPhone: customer?.contact?.primaryPhone || '',
      secondaryPhone: customer?.contact?.secondaryPhone || '',
      email: customer?.contact?.email || '',
      emergencyContactName: customer?.contact?.emergencyContactName || '',
      emergencyContactPhone: customer?.contact?.emergencyContactPhone || '',
      documentType: customer?.identity?.documentType !== undefined 
        ? ['CIN', 'Passport', 'DrivingLicense'][customer.identity.documentType] || 'CIN'
        : 'CIN',
      documentNumber: customer?.identity?.documentNumber || '',
      issuedDate: customer?.identity?.issuedDate ? customer.identity.issuedDate.split('T')[0] : '',
      expiryDate: customer?.identity?.expiryDate ? customer.identity.expiryDate.split('T')[0] : '',
      issuingAuthority: customer?.identity?.issuingAuthority || '',

      // Champs personne physique
      firstName: customer?.firstName || '',
      lastName: customer?.lastName || '',
      dateOfBirth: customer?.dateOfBirth ? customer.dateOfBirth.split('T')[0] : '',
      birthPlace: (customer as any)?.birthPlace || '',
      nationality: (customer as any)?.nationality || 'Haïtienne',
      nif: (customer as any)?.personalNif || '',
      gender: genderToMF(customer?.gender),
      occupation: customer?.occupation || '',
      employerName: (customer as any)?.employerName || '',
      workAddress: (customer as any)?.workAddress || '',
      incomeSource: (customer as any)?.incomeSource || '',
      monthlyIncome: customer?.monthlyIncome || undefined,
      transactionFrequency: (customer as any)?.transactionFrequency || '',
      accountPurpose: (customer as any)?.accountPurpose || '',
      maritalStatus: (customer as any)?.maritalStatus || '',
      spouseName: (customer as any)?.spouseName || '',
      numberOfDependents: (customer as any)?.numberOfDependents || 0,
      educationLevel: (customer as any)?.educationLevel || '',
      referencePerson: (customer as any)?.referencePersonName || '',
      referencePersonPhone: (customer as any)?.referencePersonPhone || '',

      // Champs personne morale
      companyName: (customer as any)?.companyName || '',
      legalForm: (customer as any)?.legalForm || '',
      businessRegistrationNumber: (customer as any)?.tradeRegisterNumber || (customer as any)?.businessRegistrationNumber || '',
      companyNif: (customer as any)?.taxId || (customer as any)?.companyNif || '',
      headOfficeAddress: (customer as any)?.headOfficeAddress || '',
      companyPhone: (customer as any)?.companyPhone || '',
      companyEmail: (customer as any)?.companyEmail || '',
      legalRepresentativeName: customer?.legalRepresentative?.firstName && customer?.legalRepresentative?.lastName 
        ? `${customer.legalRepresentative.firstName} ${customer.legalRepresentative.lastName}`
        : (customer as any)?.legalRepresentativeName || '',
      legalRepresentativeTitle: customer?.legalRepresentative?.title || (customer as any)?.legalRepresentativeTitle || '',
      legalRepresentativeDocumentType: (() => {
        // Priorité: legalRepresentative.documentType (normalisé) -> representativeDocumentType -> legalRepresentativeDocumentType
        const docType = customer?.legalRepresentative?.documentType ?? (customer as any)?.representativeDocumentType ?? (customer as any)?.legalRepresentativeDocumentType;
        if (docType === 0 || docType === 'CIN') return 'CIN';
        if (docType === 1 || docType === 'Passport') return 'Passport';
        if (docType === 2 || docType === 'DrivingLicense') return 'DrivingLicense';
        return '';
      })(),
      legalRepresentativeDocumentNumber: customer?.legalRepresentative?.documentNumber || (customer as any)?.legalRepresentativeDocumentNumber || '',
      legalRepresentativeIssuedDate: customer?.legalRepresentative?.issuedDate ? customer.legalRepresentative.issuedDate.split('T')[0] : (customer as any)?.legalRepresentativeIssuedDate ? (customer as any).legalRepresentativeIssuedDate.split('T')[0] : '',
      legalRepresentativeExpiryDate: customer?.legalRepresentative?.expiryDate ? customer.legalRepresentative.expiryDate.split('T')[0] : (customer as any)?.legalRepresentativeExpiryDate ? (customer as any).legalRepresentativeExpiryDate.split('T')[0] : '',
      legalRepresentativeIssuingAuthority: customer?.legalRepresentative?.issuingAuthority || (customer as any)?.legalRepresentativeIssuingAuthority || '',
    }
  });

  const department = watch('department');

  // Calculate available communes based on selected department
  const availableCommunes = selectedDepartment ? (COMMUNES_BY_DEPARTMENT[selectedDepartment as HaitiDepartment] || []) : [];

  // Reset form when customer changes
  useEffect(() => {
    if (customer) {
      const customerIsBusiness = ((customer as any)?.isBusiness ?? detectCustomerType(customer)) as boolean;
      setIsBusiness(!!customerIsBusiness);
      setTypeSource(((customer as any)?.isBusiness === undefined || (customer as any)?.isBusiness === null) ? 'detected' : 'explicit');
      
      reset({
        // Champs communs
        street: customer?.address?.street || '',
        department: customer?.address?.department || '',
        commune: customer?.address?.commune || '',
        postalCode: customer?.address?.postalCode || '',
        primaryPhone: customer?.contact?.primaryPhone || '',
        secondaryPhone: customer?.contact?.secondaryPhone || '',
        email: customer?.contact?.email || '',
        emergencyContactName: customer?.contact?.emergencyContactName || '',
        emergencyContactPhone: customer?.contact?.emergencyContactPhone || '',
        documentType: customer?.identity?.documentType !== undefined 
          ? ['CIN', 'Passport', 'DrivingLicense'][customer.identity.documentType] || (customerIsBusiness ? 'TradeRegister' : 'CIN')
          : (customerIsBusiness ? 'TradeRegister' : 'CIN'),
        documentNumber: customer?.identity?.documentNumber || '',
        issuedDate: customer?.identity?.issuedDate ? customer.identity.issuedDate.split('T')[0] : '',
        expiryDate: customer?.identity?.expiryDate ? customer.identity.expiryDate.split('T')[0] : '',
        issuingAuthority: customer?.identity?.issuingAuthority || '',

        // Champs personne physique
        firstName: customer?.firstName || '',
        lastName: customer?.lastName || '',
        dateOfBirth: customer?.dateOfBirth ? customer.dateOfBirth.split('T')[0] : '',
        birthPlace: (customer as any)?.birthPlace || '',
        nationality: (customer as any)?.nationality || 'Haïtienne',
        nif: (customer as any)?.personalNif || '',
        gender: customer?.gender !== undefined ? genderToMF(customer.gender) : 'M',
        occupation: customer?.occupation || '',
        employerName: (customer as any)?.employerName || '',
        workAddress: (customer as any)?.workAddress || '',
        incomeSource: (customer as any)?.incomeSource || '',
        monthlyIncome: customer?.monthlyIncome || undefined,
        transactionFrequency: (customer as any)?.transactionFrequency || '',
        accountPurpose: (customer as any)?.accountPurpose || '',
        maritalStatus: (customer as any)?.maritalStatus || '',
        spouseName: (customer as any)?.spouseName || '',
        numberOfDependents: (customer as any)?.numberOfDependents || 0,
        educationLevel: (customer as any)?.educationLevel || '',
        referencePerson: (customer as any)?.referencePersonName || '',
        referencePersonPhone: (customer as any)?.referencePersonPhone || '',

        // Champs personne morale
        companyName: (customer as any)?.companyName || '',
        legalForm: (customer as any)?.legalForm || '',
        businessRegistrationNumber: (customer as any)?.tradeRegisterNumber || (customer as any)?.businessRegistrationNumber || '',
        companyNif: (customer as any)?.taxId || (customer as any)?.companyNif || '',
        headOfficeAddress: (customer as any)?.headOfficeAddress || '',
        companyPhone: (customer as any)?.companyPhone || '',
        companyEmail: (customer as any)?.companyEmail || '',
        legalRepresentativeName: customer?.legalRepresentative?.firstName && customer?.legalRepresentative?.lastName 
          ? `${customer.legalRepresentative.firstName} ${customer.legalRepresentative.lastName}`
          : (customer as any)?.legalRepresentativeName || '',
        legalRepresentativeTitle: customer?.legalRepresentative?.title || (customer as any)?.legalRepresentativeTitle || '',
        legalRepresentativeDocumentType: (() => {
          // Priorité: legalRepresentative.documentType (normalisé) -> representativeDocumentType -> legalRepresentativeDocumentType
          const docType = customer?.legalRepresentative?.documentType ?? (customer as any)?.representativeDocumentType ?? (customer as any)?.legalRepresentativeDocumentType;
          if (docType === 0 || docType === 'CIN') return 'CIN';
          if (docType === 1 || docType === 'Passport') return 'Passport';
          if (docType === 2 || docType === 'DrivingLicense') return 'DrivingLicense';
          return '';
        })(),
        legalRepresentativeDocumentNumber: customer?.legalRepresentative?.documentNumber || (customer as any)?.legalRepresentativeDocumentNumber || '',
        legalRepresentativeIssuedDate: customer?.legalRepresentative?.issuedDate ? customer.legalRepresentative.issuedDate.split('T')[0] : (customer as any)?.legalRepresentativeIssuedDate ? (customer as any).legalRepresentativeIssuedDate.split('T')[0] : '',
        legalRepresentativeExpiryDate: customer?.legalRepresentative?.expiryDate ? customer.legalRepresentative.expiryDate.split('T')[0] : (customer as any)?.legalRepresentativeExpiryDate ? (customer as any).legalRepresentativeExpiryDate.split('T')[0] : '',
        legalRepresentativeIssuingAuthority: customer?.legalRepresentative?.issuingAuthority || (customer as any)?.legalRepresentativeIssuingAuthority || '',
      });
      setSelectedDepartment(customer?.address?.department || '');
    }
  }, [customer, reset]);

  useEffect(() => {
    if (department !== selectedDepartment) {
      setSelectedDepartment(department);
    }
  }, [department]);

  // Reset form fields when switching between business/individual
  useEffect(() => {
    const currentValues = watch();
    reset({
      ...currentValues,
      // Clear business fields when switching to individual
      ...(isBusiness ? {} : {
        companyName: '',
        legalForm: '',
        businessRegistrationNumber: '',
        companyNif: '',
        headOfficeAddress: '',
        companyPhone: '',
        companyEmail: '',
        legalRepresentativeName: '',
        legalRepresentativeTitle: '',
        legalRepresentativeDocumentType: '',
        legalRepresentativeDocumentNumber: '',
        legalRepresentativeIssuedDate: '',
        legalRepresentativeExpiryDate: '',
        legalRepresentativeIssuingAuthority: '',
      }),
      // Clear individual fields when switching to business
      ...(!isBusiness ? {} : {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        birthPlace: '',
        nationality: '',
        nif: '',
        gender: '',
        occupation: '',
        employerName: '',
        workAddress: '',
        incomeSource: '',
        monthlyIncome: '',
        transactionFrequency: '',
        accountPurpose: '',
        maritalStatus: '',
        spouseName: '',
        numberOfDependents: '',
        educationLevel: '',
        referencePerson: '',
        referencePersonPhone: '',
      }),
      // Update document type options
      documentType: isBusiness ? (currentValues.documentType && !['CIN','Passport','DrivingLicense'].includes(currentValues.documentType) ? currentValues.documentType : 'TradeRegister') : (currentValues.documentType && ['CIN','Passport','DrivingLicense'].includes(currentValues.documentType) ? currentValues.documentType : 'CIN'),
    });
  }, [isBusiness, reset, watch]);

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      // Préparer les données pour la mise à jour
      const updateData = {
        // Champs communs
        street: data.street,
        department: data.department,
        commune: data.commune,
        postalCode: data.postalCode,
        primaryPhone: data.primaryPhone,
        secondaryPhone: data.secondaryPhone,
        email: data.email,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        issuedDate: data.issuedDate,
        expiryDate: data.expiryDate,
        issuingAuthority: data.issuingAuthority,
        
        // Indicateur du type de client
        isBusiness: isBusiness,
        
        // Champs conditionnels
        ...(isBusiness ? {
          // Champs personne morale
          companyName: data.companyName,
          legalForm: data.legalForm,
          tradeRegisterNumber: data.businessRegistrationNumber,
          taxId: data.companyNif,
          headOfficeAddress: data.headOfficeAddress,
          companyPhone: data.companyPhone,
          companyEmail: data.companyEmail,
          // Split legalRepresentativeName into first and last name.
          // If the name is not provided, leave these fields undefined so the backend
          // will not overwrite existing values. Use a safer split to handle single-token names.
          ...(data.legalRepresentativeName ? (() => {
            const parts = data.legalRepresentativeName.trim().split(/\s+/);
            if (parts.length === 1) {
              // Single token -> treat as last name
              return {
                representativeFirstName: undefined,
                representativeLastName: parts[0]
              };
            }
            return {
              representativeFirstName: parts.slice(0, -1).join(' '),
              representativeLastName: parts.slice(-1)[0]
            };
          })() : {}),
          representativeTitle: data.legalRepresentativeTitle,
          representativeDocumentType: data.legalRepresentativeDocumentType,
          representativeDocumentNumber: data.legalRepresentativeDocumentNumber,
          representativeIssuedDate: data.legalRepresentativeIssuedDate,
          representativeExpiryDate: data.legalRepresentativeExpiryDate,
          representativeIssuingAuthority: data.legalRepresentativeIssuingAuthority,
          
          // Authorized signers are handled at account level, not customer level
          
          // Réinitialiser les champs personne physique
          firstName: '',
          lastName: '',
          dateOfBirth: null,
          birthPlace: null,
          nationality: null,
          personalNif: null,
          gender: null,
          occupation: null,
          employerName: null,
          workAddress: null,
          incomeSource: null,
          monthlyIncome: null,
          transactionFrequency: null,
          accountPurpose: null,
          referencePersonName: null,
          referencePersonPhone: null,
          maritalStatus: null,
          spouseName: null,
          numberOfDependents: null,
          educationLevel: null,
        } : {
          // Champs personne physique
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth,
          birthPlace: data.birthPlace,
          nationality: data.nationality,
          personalNif: data.nif, // Backend utilise personalNif
          gender: data.gender,
          occupation: data.occupation,
          employerName: data.employerName,
          workAddress: data.workAddress,
          incomeSource: data.incomeSource,
          monthlyIncome: data.monthlyIncome,
          transactionFrequency: data.transactionFrequency,
          accountPurpose: data.accountPurpose,
          referencePersonName: data.referencePerson, // Backend utilise referencePersonName
          referencePersonPhone: data.referencePersonPhone,
          maritalStatus: data.maritalStatus,
          spouseName: data.spouseName,
          numberOfDependents: data.numberOfDependents,
          educationLevel: data.educationLevel,
          
          // Réinitialiser les champs personne morale
          companyName: '',
          legalForm: '',
          tradeRegisterNumber: '',
          taxId: '',
          headOfficeAddress: '',
          companyPhone: '',
          companyEmail: '',
          representativeFirstName: '',
          representativeLastName: '',
          representativeTitle: '',
          representativeDocumentType: '',
          representativeDocumentNumber: '',
          representativeIssuedDate: null,
          representativeExpiryDate: null,
          representativeIssuingAuthority: '',
        })
      };
      
      await onSubmit(updateData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Authorized signers handlers
  const handleAddSigner = (signer: AuthorizedSigner) => {
    if (currentSignerEdit) {
      // Modifier un signataire existant
      setAuthorizedSigners(authorizedSigners.map(s => 
        s.id === currentSignerEdit.id ? signer : s
      ));
    } else {
      // Ajouter un nouveau signataire
      setAuthorizedSigners([...authorizedSigners, { ...signer, id: Date.now().toString() }]);
    }
    setShowSignerForm(false);
    setCurrentSignerEdit(null);
  };

  const handleEditSigner = (signer: AuthorizedSigner) => {
    setCurrentSignerEdit(signer);
    setShowSignerForm(true);
  };

  const handleDeleteSigner = (id: string) => {
    setAuthorizedSigners(authorizedSigners.filter(s => s.id !== id));
  };

  return (
    <>
    <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
      <div className="space-y-6">
        {/* Section 0: Type de Client */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Type de Client
            <span
              className={`ml-3 align-middle text-xs px-2 py-0.5 rounded-full border ${
                typeSource === 'detected'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200'
              }`}
              title={typeSource === 'detected' ? 'Détecté automatiquement à partir des données existantes' : 'Défini manuellement'}
            >
              {typeSource === 'detected' ? 'Détecté automatiquement' : 'Modifié manuellement'}
            </span>
          </h3>
          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input
                type="radio"
                name="clientType"
                checked={!isBusiness}
                onChange={() => { setIsBusiness(false); setTypeSource('explicit'); }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Personne Physique</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="clientType"
                checked={isBusiness}
                onChange={() => { setIsBusiness(true); setTypeSource('explicit'); }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Personne Morale</span>
            </label>
          </div>
        </div>

        {/* Section 1: Identité */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            1. Informations d'Identification
          </h3>
          
          {isBusiness ? (
            // Champs pour personne morale
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Raison Sociale <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('companyName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {(errors as any).companyName && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).companyName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forme Juridique <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('legalForm')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner...</option>
                  <option value="SA">S.A. - Société Anonyme</option>
                  <option value="SEM">S.E.M. - Société d'Économie Mixte</option>
                  <option value="INDIVIDUELLE">Société Individuelle</option>
                  <option value="COOPERATIVE">Coopérative</option>
                </select>
                {(errors as any).legalForm && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).legalForm.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro Registre Commerce
                </label>
                <input
                  type="text"
                  {...register('businessRegistrationNumber')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NIF
                </label>
                <input
                  type="text"
                  {...register('companyNif')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          ) : (
            // Champs pour personne physique
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('firstName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {(errors as any).firstName && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).firstName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('lastName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {(errors as any).lastName && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).lastName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de Naissance <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('dateOfBirth')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {(errors as any).dateOfBirth && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).dateOfBirth.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lieu de Naissance
                </label>
                <input
                  type="text"
                  {...register('birthPlace')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Port-au-Prince, Haïti"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Genre <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('gender')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner...</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                </select>
                {(errors as any).gender && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).gender.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nationalité
                </label>
                <input
                  type="text"
                  {...register('nationality')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Haïtienne"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NIF <span className="text-xs text-gray-500">(Numéro d'Identification Fiscale)</span>
                </label>
                <input
                  type="text"
                  {...register('nif')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: NIF-123456789"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Représentant Légal (pour personnes morales) */}
        {isBusiness && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              2. Représentant Légal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet du Représentant <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('legalRepresentativeName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {(errors as any).legalRepresentativeName && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).legalRepresentativeName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre/Fonction <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('legalRepresentativeTitle')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner...</option>
                  <option value="Directeur Général">Directeur Général</option>
                  <option value="Président">Président</option>
                  <option value="Gérant">Gérant</option>
                  <option value="Administrateur">Administrateur</option>
                  <option value="Autre">Autre</option>
                </select>
                {(errors as any).legalRepresentativeTitle && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).legalRepresentativeTitle.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de Document <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('legalRepresentativeDocumentType')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner type...</option>
                  <option value="CIN">CIN (Carte d'Identité Nationale)</option>
                  <option value="Passport">Passeport</option>
                  <option value="DrivingLicense">Permis de Conduire</option>
                </select>
                {(errors as any).legalRepresentativeDocumentType && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).legalRepresentativeDocumentType.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de Document <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('legalRepresentativeDocumentNumber')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {(errors as any).legalRepresentativeDocumentNumber && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).legalRepresentativeDocumentNumber.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'Émission <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('legalRepresentativeIssuedDate')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {(errors as any).legalRepresentativeIssuedDate && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).legalRepresentativeIssuedDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'Expiration
                </label>
                <input
                  type="date"
                  {...register('legalRepresentativeExpiryDate')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Autorité d'Émission <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('legalRepresentativeIssuingAuthority')}
                  placeholder="Ex: ONI, Direction de l'Immigration"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {(errors as any).legalRepresentativeIssuingAuthority && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).legalRepresentativeIssuingAuthority.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Informations Professionnelles (repositionnée avant Documents) */}
        {!isBusiness && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              3. Informations Professionnelles et Financières
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
                <input
                  type="text"
                  {...register('occupation')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Enseignant, Commerçant"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employeur / Entreprise</label>
                <input
                  type="text"
                  {...register('employerName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom de l'employeur"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse Professionnelle</label>
                <input
                  type="text"
                  {...register('workAddress')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Adresse du lieu de travail"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source de Revenu</label>
                <select
                  {...register('incomeSource')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner...</option>
                  <option value="SALARY">Salaire</option>
                  <option value="BUSINESS">Commerce/Affaires</option>
                  <option value="AGRICULTURE">Agriculture</option>
                  <option value="RENTAL">Loyers</option>
                  <option value="PENSION">Pension/Retraite</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Revenu Mensuel (HTG)</label>
                <input
                  type="number"
                  {...register('monthlyIncome')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Montant du revenu mensuel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objectif du Compte</label>
                <input
                  type="text"
                  {...register('accountPurpose')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Épargne, Dépôts commerciaux"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence des Transactions</label>
                <select
                  {...register('transactionFrequency')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner...</option>
                  <option value="DAILY">Quotidienne</option>
                  <option value="WEEKLY">Hebdomadaire</option>
                  <option value="MONTHLY">Mensuelle</option>
                  <option value="OCCASIONAL">Occasionnelle</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <h4 className="font-medium text-gray-900 mb-3 mt-2">Informations Familiales</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut Marital</label>
                <select
                  {...register('maritalStatus')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner...</option>
                  <option value="SINGLE">Célibataire</option>
                  <option value="MARRIED">Marié(e)</option>
                  <option value="DIVORCED">Divorcé(e)</option>
                  <option value="WIDOWED">Veuf/Veuve</option>
                  <option value="UNION">Union libre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du Conjoint</label>
                <input
                  type="text"
                  {...register('spouseName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom du conjoint (si applicable)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Personnes à Charge</label>
                <input
                  type="number"
                  min="0"
                  {...register('numberOfDependents')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niveau d'Éducation</label>
                <select
                  {...register('educationLevel')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner...</option>
                  <option value="PRIMARY">Primaire</option>
                  <option value="SECONDARY">Secondaire</option>
                  <option value="VOCATIONAL">Professionnel</option>
                  <option value="UNIVERSITY">Universitaire</option>
                  <option value="GRADUATE">Postuniversitaire</option>
                  <option value="NONE">Aucun</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Personne de Référence</label>
                <input
                  type="text"
                  {...register('referencePerson')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom de la personne de référence"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone de Référence</label>
                <input
                  type="tel"
                  {...register('referencePersonPhone')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+509 XXXX XXXX"
                />
                {(errors as any).referencePersonPhone && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).referencePersonPhone.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 3 (entreprise): Siège Social déplacé après Professionnel */}
        {isBusiness && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              3. Siège Social
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse du Siège Social <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  {...register('headOfficeAddress')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {(errors as any).headOfficeAddress && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).headOfficeAddress.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone de l'Entreprise <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  {...register('companyPhone')}
                  placeholder="+509 XXXX XXXX"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {(errors as any).companyPhone && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).companyPhone.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de l'Entreprise <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  {...register('companyEmail')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {(errors as any).companyEmail && (
                  <p className="mt-1 text-sm text-red-600">{(errors as any).companyEmail.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section Signataires autorisés (pour personnes morales) */}
        {isBusiness && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Signataires autorisés
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Ajouter les personnes autorisées à gérer le compte de l'entreprise
                </p>
                <button
                  type="button"
                  onClick={() => { setCurrentSignerEdit(null); setShowSignerForm(true); }}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4" />
                  Ajouter signataire
                </button>
              </div>

              {authorizedSigners.length > 0 ? (
                <div className="space-y-3">
                  {authorizedSigners.map((signer) => (
                    <div key={signer.id} className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{signer.fullName}</p>
                        <p className="text-sm text-gray-600">
                          {signer.relationshipToCustomer} | {signer.documentType}: {signer.documentNumber}
                        </p>
                        <p className="text-sm text-gray-500">{signer.phoneNumber}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => { setCurrentSignerEdit(signer); setShowSignerForm(true); }}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSigner(signer.id!)}
                          className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Aucun signataire autorisé ajouté</p>
              )}
            </div>
          </div>
        )}

  {/* Section {isBusiness ? '4' : '2'}: Adresse et Contact (garde numérotation) */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            {isBusiness ? '4' : '2'}. Adresse et Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse Rue <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('street')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Numéro, rue, quartier"
              />
              {errors.street && (
                <p className="mt-1 text-sm text-red-600">{errors.street.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Département <span className="text-red-500">*</span>
              </label>
              <select
                {...register('department')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner département...</option>
                {HAITI_DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {errors.department && (
                <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commune <span className="text-red-500">*</span>
              </label>
              <select
                {...register('commune')}
                disabled={!selectedDepartment}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Sélectionner commune...</option>
                {availableCommunes.map(commune => (
                  <option key={commune} value={commune}>{commune}</option>
                ))}
              </select>
              {errors.commune && (
                <p className="mt-1 text-sm text-red-600">{errors.commune.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone Principal <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                {...register('primaryPhone')}
                placeholder="+509 XXXX XXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.primaryPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.primaryPhone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone Secondaire
              </label>
              <input
                type="tel"
                {...register('secondaryPhone')}
                placeholder="+509 XXXX XXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.secondaryPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.secondaryPhone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="email@exemple.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <h4 className="font-medium text-gray-900 mb-3 mt-2">Contact d'Urgence</h4>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du Contact d'Urgence
              </label>
              <input
                type="text"
                {...register('emergencyContactName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nom complet"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone d'Urgence
              </label>
              <input
                type="tel"
                {...register('emergencyContactPhone')}
                placeholder="+509 XXXX XXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.emergencyContactPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.emergencyContactPhone.message}</p>
              )}
            </div>
          </div>
        </div>

  {/* Section {isBusiness ? '5' : '3'}: Documents (reste après Contact) */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            {isBusiness ? '5' : '3'}. Documents {isBusiness ? 'de l\'Entreprise' : 'd\'Identification'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de Document <span className="text-red-500">*</span>
              </label>
              <select
                {...register('documentType')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner type...</option>
                {isBusiness ? (
                  <>
                    <option value="TradeRegister">Registre du Commerce</option>
                    <option value="TaxId">NIF (Numéro d'Identification Fiscale)</option>
                    <option value="Statutes">Statuts de l'Entreprise</option>
                    <option value="Other">Autre</option>
                  </>
                ) : (
                  <>
                    <option value="CIN">CIN (Carte d'Identité Nationale)</option>
                    <option value="Passport">Passeport</option>
                    <option value="DrivingLicense">Permis de Conduire</option>
                  </>
                )}
              </select>
              {errors.documentType && (
                <p className="mt-1 text-sm text-red-600">{errors.documentType.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de Document <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('documentNumber')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.documentNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.documentNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'Émission <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('issuedDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.issuedDate && (
                <p className="mt-1 text-sm text-red-600">{errors.issuedDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'Expiration
              </label>
              <input
                type="date"
                {...register('expiryDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Autorité d'Émission <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('issuingAuthority')}
                placeholder={isBusiness ? "Ex: Chambre de Commerce, Ministère des Finances" : "Ex: ONI, Direction de l'Immigration"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.issuingAuthority && (
                <p className="mt-1 text-sm text-red-600">{errors.issuingAuthority.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section professionnelle pour personnes physiques déplacée en Section 3 plus haut */}
      </div>

      {/* Section Informations Professionnelles (pour personnes morales) déplacée en Section 3 via occupation/chiffre d'affaires? Conservée déjà plus haut */}

      {/* Section Documents & Signature */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Documents & Signature
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {updatedCustomer?.documents && updatedCustomer.documents.length > 0 
                ? `${updatedCustomer.documents.length} document(s) téléchargé(s)`
                : 'Aucun document téléchargé'}
              {updatedCustomer?.signature && ' • Signature enregistrée'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDocumentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Edit3 className="h-4 w-4" />
            Gérer Documents
          </button>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Enregistrement...</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Enregistrer les Modifications</span>
            </>
          )}
        </button>
      </div>
    </form>

    {/* Document Upload Modal */}
    {showDocumentModal && updatedCustomer && (
      <DocumentUploadModal
        customer={updatedCustomer}
        onClose={() => setShowDocumentModal(false)}
        onSuccess={async () => {
          // Recharger les données du client
          if (updatedCustomer) {
            const refreshed = await savingsCustomerService.getCustomer(updatedCustomer.id);
            setUpdatedCustomer(refreshed);
            toast.success('Documents mis à jour!');
          }
        }}
      />
    )}

    {/* Authorized Signer Form Modal */}
    {showSignerForm && (
      <AuthorizedSignerForm
        signer={currentSignerEdit}
        onSave={handleAddSigner}
        onCancel={() => { setShowSignerForm(false); setCurrentSignerEdit(null); }}
      />
    )}
    </>
  );
};

// Composant pour le formulaire de signataire autorisé
interface AuthorizedSignerFormProps {
  signer: AuthorizedSigner | null;
  onSave: (signer: AuthorizedSigner) => void;
  onCancel: () => void;
}

const AuthorizedSignerForm: React.FC<AuthorizedSignerFormProps> = ({ signer, onSave, onCancel }) => {
  const [formData, setFormData] = React.useState<AuthorizedSigner>(
    signer || {
      fullName: '',
      documentType: 'CIN',
      documentNumber: '',
      relationshipToCustomer: '',
      address: '',
      phoneNumber: '',
      authorizationLimit: undefined,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            {signer ? 'Modifier le signataire' : 'Ajouter un signataire autorisé'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Prénom et nom"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fonction/Relation *</label>
              <select
                required
                value={formData.relationshipToCustomer}
                onChange={(e) => setFormData({ ...formData, relationshipToCustomer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner...</option>
                <option value="Directeur Général">Directeur Général</option>
                <option value="Directeur Financier">Directeur Financier</option>
                <option value="Administrateur">Administrateur</option>
                <option value="Co-gérant">Co-gérant</option>
                <option value="Mandataire">Mandataire</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de téléphone *</label>
              <input
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="+509 3712 3456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de pièce *</label>
              <select
                required
                value={formData.documentType}
                onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="CIN">CIN</option>
                <option value="Passport">Passeport</option>
                <option value="DrivingLicense">Permis de conduire</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de pièce *</label>
              <input
                type="text"
                required
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Numéro du document"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Adresse *</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Adresse complète"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Limite d'autorisation (HTG) <span className="text-xs text-gray-500">(Optionnel)</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.authorizationLimit || ''}
                onChange={(e) => setFormData({ ...formData, authorizationLimit: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Montant maximum autorisé par transaction"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {signer ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientEditForm;



