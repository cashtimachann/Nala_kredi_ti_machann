import React, { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClientSchemaZ } from '../../validation/schemas';
import {
  CustomerFormData,
  IdentityDocumentType,
  HAITI_DEPARTMENTS,
  COMMUNES_BY_DEPARTMENT,
  HaitiDepartment,
  AuthorizedSigner
} from '../../types/savings';
import { Upload, X, Check, Camera, FileText, UserPlus, RotateCcw, Plus } from 'lucide-react';
import SignatureCanvas from '../savings/SignatureCanvas';
import savingsCustomerService, { 
  SavingsCustomerDocumentType,
  SavingsCustomerResponseDto 
} from '../../services/savingsCustomerService';

interface ClientCreationFormProps {
  onSubmit: (data: CustomerFormData) => Promise<SavingsCustomerResponseDto>;
  onCancel: () => void;
  isLoading?: boolean;
}

// Schéma centralisé
const createClientSchema = (isBusiness: boolean) => createClientSchemaZ(isBusiness);

const ClientCreationForm: React.FC<ClientCreationFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState<HaitiDepartment | ''>('');
  const [currentStep, setCurrentStep] = useState(1);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [customerSignature, setCustomerSignature] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<{
    photo?: File;
    idDocument?: File;
    proofOfResidence?: File;
    businessRegistrationDocument?: File; // Extrait registre commerce
    companyProofOfAddress?: File; // Justificatif domicile société
    fundsOriginDeclaration?: File; // Déclaration origine des fonds
    otherDocuments?: File[]; // Autres documents
  }>({});
  const [authorizedSigners, setAuthorizedSigners] = useState<AuthorizedSigner[]>([]);
  const [showSignerForm, setShowSignerForm] = useState(false);
  const [isBusiness, setIsBusiness] = useState<boolean>(false);
  const [currentSignerEdit, setCurrentSignerEdit] = useState<AuthorizedSigner | null>(null);
  const withGlobalLoading = useUIStore(s => s.withGlobalLoading);

  // Créer un schéma de validation réactif qui change avec isBusiness
  const validationSchema = React.useMemo(() => createClientSchema(isBusiness), [isBusiness]);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    reset
  } = useForm<CustomerFormData>({
    resolver: zodResolver(validationSchema) as any,
    defaultValues: {
  isBusiness: false,
  companyName: '',
  legalForm: '',
  businessRegistrationNumber: '',
  companyNif: '',
  headOfficeAddress: '',
  companyPhone: '',
  companyEmail: '',
  legalRepresentativeName: '',
  legalRepresentativeTitle: '',
  legalRepresentativeDocumentType: IdentityDocumentType.CIN,
  legalRepresentativeDocumentNumber: '',
  legalRepresentativeIssuedDate: '',
  legalRepresentativeExpiryDate: '',
  legalRepresentativeIssuingAuthority: '',

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
  monthlyIncome: 0,
  transactionFrequency: '',
  accountPurpose: '',
  referencePerson: '',
  maritalStatus: undefined,
  spouseName: '',
  numberOfDependents: 0,
      educationLevel: '',
      acceptTerms: false,
      signaturePlace: '',
      signatureDate: new Date().toISOString().split('T')[0]
    },
    mode: 'onSubmit' // Only validate on form submission, not on every change
  });

  const watchedDepartment = watch('department');

  React.useEffect(() => {
    if (watchedDepartment && watchedDepartment !== selectedDepartment) {
      setSelectedDepartment(watchedDepartment as HaitiDepartment);
      setValue('commune', '');
    }
  }, [watchedDepartment, selectedDepartment, setValue]);

  // Reset champs spécifiques quand on change de type de client
  React.useEffect(() => {
    if (isBusiness) {
      // Reset champs personne physique qui ne sont plus nécessaires
      setValue('firstName', '');
      setValue('lastName', '');
      setValue('dateOfBirth', '');  // garder contrôlé (input date) pour éviter warning
      setValue('gender', 'M');
    } else {
      // Reset champs personne morale qui ne sont plus nécessaires
      setValue('companyName', '');
      setValue('legalForm', '');
      setValue('businessRegistrationNumber', '');
      setValue('companyNif', '');
      setValue('headOfficeAddress', '');
      setValue('companyPhone', '');
      setValue('companyEmail', '');
      setValue('legalRepresentativeName', '');
      setValue('legalRepresentativeTitle', '');
      setValue('legalRepresentativeDocumentNumber', '');
      // Réinitialiser les signataires
      setAuthorizedSigners([]);
    }
    // Clear any validation errors when switching types
    // This prevents errors from appearing for fields that are now irrelevant
  }, [isBusiness, setValue]);

  const availableCommunes = selectedDepartment ? COMMUNES_BY_DEPARTMENT[selectedDepartment] : [];

  // Fonction pour uploader les documents après création du client
  const uploadDocumentsAfterCreation = async (customerId: string) => {
    const uploadPromises: Promise<any>[] = [];

    // Photo (seulement pour personne physique)
    if (!isBusiness && uploadedFiles.photo) {
      uploadPromises.push(
        savingsCustomerService.uploadDocument(
          customerId,
          uploadedFiles.photo,
          SavingsCustomerDocumentType.Photo,
          'Photo du client',
          'Photo d\'identité du client'
        )
      );
    }

    // Pièce d'identité
    if (uploadedFiles.idDocument) {
      uploadPromises.push(
        savingsCustomerService.uploadDocument(
          customerId,
          uploadedFiles.idDocument,
          SavingsCustomerDocumentType.IdentityCard,
          isBusiness ? 'Pièce d\'identité du représentant' : 'Carte d\'Identité',
          'Document d\'identification officiel'
        )
      );
    }

    // Preuve de résidence
    const proofOfResidence = isBusiness ? uploadedFiles.companyProofOfAddress : uploadedFiles.proofOfResidence;
    if (proofOfResidence) {
      uploadPromises.push(
        savingsCustomerService.uploadDocument(
          customerId,
          proofOfResidence,
          SavingsCustomerDocumentType.ProofOfResidence,
          isBusiness ? 'Justificatif domicile société' : 'Preuve de résidence',
          'Document justifiant l\'adresse de résidence'
        )
      );
    }

    // Registre de commerce (personne morale uniquement)
    if (isBusiness && uploadedFiles.businessRegistrationDocument) {
      uploadPromises.push(
        savingsCustomerService.uploadDocument(
          customerId,
          uploadedFiles.businessRegistrationDocument,
          SavingsCustomerDocumentType.Other,
          'Registre de Commerce',
          'Extrait du registre de commerce'
        )
      );
    }

    // Déclaration origine des fonds (personne morale uniquement)
    if (isBusiness && uploadedFiles.fundsOriginDeclaration) {
      uploadPromises.push(
        savingsCustomerService.uploadDocument(
          customerId,
          uploadedFiles.fundsOriginDeclaration,
          SavingsCustomerDocumentType.Other,
          'Déclaration Origine des Fonds',
          'Document déclarant l\'origine des fonds'
        )
      );
    }

    // Uploader la signature si elle existe
    if (customerSignature) {
      uploadPromises.push(
        savingsCustomerService.saveSignature(customerId, customerSignature)
      );
    }

    // Attendre que tous les uploads soient terminés
    try {
      await Promise.all(uploadPromises);
      console.log('Tous les documents ont été uploadés avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'upload des documents:', error);
      // Ne pas throw l'erreur pour ne pas bloquer la création du client
      // Les documents peuvent être uploadés plus tard via DocumentUploadModal
    }
  };

  const handleFormSubmit = async (data: CustomerFormData) => {
    return withGlobalLoading(async () => {
      try {
        // Validation finale pour l'étape 5
        if (!data.acceptTerms) {
          alert('Vous devez accepter la déclaration et les conditions');
          return;
        }
        if (!data.signaturePlace || !data.signatureDate) {
          alert('Veuillez remplir le lieu et la date de signature');
          return;
        }
        if (!customerSignature) {
          alert('La signature est obligatoire');
          return;
        }

        // Transformer les données pour correspondre au DTO backend SavingsCustomerCreateDto
        const transformedData: any = {
          ...data,
          // Signature sera uploadée séparément
          signature: undefined,
        };

        // Corrections spécifiques pour les entreprises
        if (data.isBusiness) {
          // Renommer businessRegistrationNumber en tradeRegisterNumber
          transformedData.tradeRegisterNumber = data.businessRegistrationNumber;
          delete transformedData.businessRegistrationNumber;

          // Renommer companyNif en taxId
          transformedData.taxId = data.companyNif;
          delete transformedData.companyNif;

          // Séparer legalRepresentativeName en firstName et lastName using safer logic.
          if (data.legalRepresentativeName) {
            const parts = data.legalRepresentativeName.trim().split(/\s+/);
            if (parts.length === 1) {
              // Single token -> prefer lastName
              transformedData.representativeFirstName = undefined;
              transformedData.representativeLastName = parts[0];
            } else if (parts.length > 1) {
              transformedData.representativeFirstName = parts.slice(0, -1).join(' ');
              transformedData.representativeLastName = parts.slice(-1)[0];
            }
          }
          // Map other legalRepresentative fields to the representative* names used elsewhere
          if (data.legalRepresentativeTitle) {
            transformedData.representativeTitle = data.legalRepresentativeTitle;
          }
          if (data.legalRepresentativeDocumentType) {
            transformedData.representativeDocumentType = data.legalRepresentativeDocumentType;
          }
          if (data.legalRepresentativeDocumentNumber) {
            transformedData.representativeDocumentNumber = data.legalRepresentativeDocumentNumber;
          }
          if (data.legalRepresentativeIssuedDate) {
            transformedData.representativeIssuedDate = data.legalRepresentativeIssuedDate;
          }
          if (data.legalRepresentativeExpiryDate) {
            transformedData.representativeExpiryDate = data.legalRepresentativeExpiryDate;
          }
          if (data.legalRepresentativeIssuingAuthority) {
            transformedData.representativeIssuingAuthority = data.legalRepresentativeIssuingAuthority;
          }

          // Clean up old form field names from the payload
          delete transformedData.legalRepresentativeName;
          delete transformedData.legalRepresentativeTitle;
          delete transformedData.legalRepresentativeDocumentType;
          delete transformedData.legalRepresentativeDocumentNumber;
          delete transformedData.legalRepresentativeIssuedDate;
          delete transformedData.legalRepresentativeExpiryDate;
          delete transformedData.legalRepresentativeIssuingAuthority;
        }

        // Ajouter les champs manquants requis par le backend
        transformedData.transactionFrequency = data.transactionFrequency || 'MONTHLY';
        transformedData.accountPurpose = data.accountPurpose || '';
        transformedData.referencePerson = data.referencePerson || '';
        transformedData.maritalStatus = data.maritalStatus || 'SINGLE';
        transformedData.numberOfDependents = data.numberOfDependents || 0;
        transformedData.educationLevel = data.educationLevel || 'SECONDARY';

        // Debug: log the transformed payload before sending (non-production only)
        try {
          if (process.env.NODE_ENV !== 'production') {
            console.debug('ClientCreationForm - transformed payload:', JSON.stringify({
              ...transformedData,
              signature: transformedData.signature ? '[SIGNATURE_DATA]' : undefined
            }, null, 2));
          }
        } catch (e) {
          console.debug('ClientCreationForm - transformed payload (raw):', transformedData);
        }

        // Créer le client d'abord
        const createdCustomer = await onSubmit(transformedData);

        // Après création réussie, uploader les documents et la signature
        if (createdCustomer && createdCustomer.id) {
          await uploadDocumentsAfterCreation(createdCustomer.id);
          
          // Rafraîchir les données du client pour inclure les documents uploadés
          const updatedCustomer = await savingsCustomerService.getCustomer(createdCustomer.id);
          
          // Rafraîchir la page après création réussie
          window.location.reload();
          
          return updatedCustomer;
        }

        // Rafraîchir la page après création réussie
        window.location.reload();

        return createdCustomer;

      } catch (error) {
        console.error('Erreur lors de la création du client:', error);
        throw error; // Re-throw pour que le formulaire gère l'erreur
      }
    });
  };

  // Validation avant d'avancer aux prochaines étapes
  const canProceedToNextStep = async () => {
    const currentValues = watch();
    
    // Étape 1: Validation des informations d'identité
    if (currentStep === 1) {
      if (isBusiness) {
        // Validation pour Personne Morale
        if (!currentValues.companyName || !currentValues.legalForm) {
          alert('Veuillez remplir la raison sociale et la forme juridique');
          return false;
        }
      } else {
        // Validation pour Personne Physique
        if (!currentValues.firstName || !currentValues.lastName || !currentValues.gender) {
          alert('Veuillez remplir tous les champs obligatoires (prénom, nom, genre)');
          return false;
        }
        if (!currentValues.dateOfBirth) {
          alert('Veuillez remplir la date de naissance');
          return false;
        }
      }
    }
    
    // Étape 2: Validation des coordonnées
    if (currentStep === 2) {
      if (!currentValues.street || !currentValues.department || !currentValues.commune || !currentValues.primaryPhone) {
        alert('Veuillez remplir tous les champs obligatoires (adresse, département, commune, téléphone)');
        return false;
      }
      
      // Validation du format du téléphone
      const phoneRegex = /^(\+509\s?)?[234579]\d{7}$/;
      if (!phoneRegex.test(currentValues.primaryPhone)) {
        alert('Format de numéro de téléphone invalide. Ex: +509 3712 3456');
        return false;
      }
    }
    
    // Étape 3: Validation des documents
    if (currentStep === 3) {
      // For business customers, validate the representative's document fields
      if (isBusiness) {
        if (!currentValues.legalRepresentativeDocumentType || !currentValues.legalRepresentativeDocumentNumber || !currentValues.legalRepresentativeIssuedDate || !currentValues.legalRepresentativeIssuingAuthority) {
          alert('Veuillez remplir toutes les informations du document d\'identité du représentant légal');
          return false;
        }

        // Validation spécifique pour Personne Morale: required uploads
        if (!uploadedFiles.businessRegistrationDocument) {
          alert('Le registre de commerce est obligatoire pour une personne morale');
          return false;
        }
        if (!uploadedFiles.fundsOriginDeclaration) {
          alert('La déclaration d\'origine des fonds est obligatoire pour une personne morale');
          return false;
        }
      } else {
        // For individuals validate the regular identity document fields
        if (!currentValues.documentType || !currentValues.documentNumber || !currentValues.issuedDate || !currentValues.issuingAuthority) {
          alert('Veuillez remplir toutes les informations du document d\'identité');
          return false;
        }
      }
    }
    
    // Étape 5: Validation finale
    if (currentStep === 5) {
      if (!currentValues.acceptTerms) {
        alert('Vous devez accepter la déclaration et les conditions');
        return false;
      }
      if (!currentValues.signaturePlace || !currentValues.signatureDate) {
        alert('Veuillez remplir le lieu et la date de signature');
        return false;
      }
      if (!customerSignature) {
        alert('La signature est obligatoire');
        return false;
      }
    }
    
    return true;
  };

  const handleNextStep = async () => {
    const canProceed = await canProceedToNextStep();
    if (canProceed) {
      setCurrentStep(currentStep + 1);
    }
  };

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

  const totalSteps = 5;

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4, 5].map((step) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  step === currentStep
                    ? 'bg-blue-600 text-white'
                    : step < currentStep
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step < currentStep ? <Check className="w-5 h-5" /> : step}
              </div>
              <span className="text-xs mt-2 text-gray-600">
                {step === 1 && 'Identité'}
                {step === 2 && 'Contact'}
                {step === 3 && 'Documents'}
                {step === 4 && 'Professionnel'}
                {step === 5 && 'Confirmation'}
              </span>
            </div>
            {step < totalSteps && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  step < currentStep ? 'bg-green-600' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Type de client */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Type de client</label>
        <div className="inline-flex rounded-md shadow-sm border border-gray-200">
          <button
            type="button"
            onClick={() => { setIsBusiness(false); setValue('isBusiness', false); }}
            className={`px-4 py-2 text-sm ${!isBusiness ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Personne Physique
          </button>
          <button
            type="button"
            onClick={() => { setIsBusiness(true); setValue('isBusiness', true); }}
            className={`px-4 py-2 text-sm border-l ${isBusiness ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Personne Morale
          </button>
        </div>
        {isBusiness && (
          <p className="mt-2 text-xs text-blue-600 font-medium">
            📋 Mode Entreprise : Documents additionnels requis (Registre commerce, Déclaration fonds)
          </p>
        )}
      </div>

      {renderStepIndicator()}

      <form onSubmit={(e) => {
        e.preventDefault();
        if (currentStep === totalSteps) {
          handleSubmit(handleFormSubmit, (errors) => {
            console.error('Form validation errors:', errors);
            // Show user-friendly error message
            const firstError = Object.values(errors)[0];
            if (firstError && firstError.message) {
              alert(`Erreur de validation: ${firstError.message}`);
            } else {
              alert('Veuillez vérifier que tous les champs obligatoires sont remplis correctement.');
            }
          })();
        } else {
          handleNextStep();
        }
      }} className="space-y-6">
        {/* ÉTAPE 1: Informations d'Identité */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Informations d'Identification du Client
            </h3>
            {isBusiness ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Raison sociale *</label>
                  <Controller name="companyName" control={control} render={({ field }) => (
                    <input
                      {...field}
                      value={field.value ?? ''}
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.companyName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nom de l'entreprise" 
                    />
                  )}/>
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Forme juridique *</label>
                  <Controller name="legalForm" control={control} render={({ field }) => (
                    <select
                      {...field}
                      value={field.value ?? ''}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.legalForm ? 'border-red-500' : 'border-gray-300'
                      }`}>
                      <option value="">Sélectionner...</option>
                      <option value="SA">S.A.</option>
                      <option value="SEM">S.E.M.</option>
                      <option value="INDIVIDUAL">Société individuelle</option>
                      <option value="COOP">Coopérative</option>
                    </select>
                  )}/>
                  {errors.legalForm && (
                    <p className="mt-1 text-sm text-red-600">{errors.legalForm.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de commerce</label>
                  <Controller name="businessRegistrationNumber" control={control} render={({ field }) => (
                    <input {...field} value={field.value ?? ''} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  )}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">NIF de l'entreprise</label>
                  <Controller name="companyNif" control={control} render={({ field }) => (
                    <input {...field} value={field.value ?? ''} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  )}/>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adresse du siège social *</label>
                  <Controller name="headOfficeAddress" control={control} render={({ field }) => (
                    <input {...field} value={field.value ?? ''} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  )}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone *</label>
                  <Controller name="companyPhone" control={control} render={({ field }) => (
                    <input {...field} value={field.value ?? ''} type="tel" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  )}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <Controller name="companyEmail" control={control} render={({ field }) => (
                    <input {...field} value={field.value ?? ''} type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  )}/>
                </div>
                <div className="md:col-span-2 pt-2">
                  <h4 className="font-medium text-gray-900 mb-2">Représentant légal</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet *</label>
                      <Controller name="legalRepresentativeName" control={control} render={({ field }) => (
                        <input {...field} value={field.value ?? ''} type="text" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          (errors as any).legalRepresentativeName ? 'border-red-500' : 'border-gray-300'
                        }`} />
                      )}/>
                      {(errors as any).legalRepresentativeName && (
                        <p className="mt-1 text-sm text-red-600">{(errors as any).legalRepresentativeName.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Titre/Fonction *</label>
                      <Controller name="legalRepresentativeTitle" control={control} render={({ field }) => (
                        <select {...field} value={field.value ?? ''} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          (errors as any).legalRepresentativeTitle ? 'border-red-500' : 'border-gray-300'
                        }`}>
                          <option value="">Sélectionner...</option>
                          <option value="Directeur Général">Directeur Général</option>
                          <option value="Président">Président</option>
                          <option value="Gérant">Gérant</option>
                          <option value="Administrateur">Administrateur</option>
                          <option value="Autre">Autre</option>
                        </select>
                      )}/>
                      {(errors as any).legalRepresentativeTitle && (
                        <p className="mt-1 text-sm text-red-600">{(errors as any).legalRepresentativeTitle.message}</p>
                      )}
                    </div>
                    {/* Les informations de pièce du représentant seront saisies à l'étape Documents */}
                  </div>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom * <span className="text-xs text-gray-500">(Non)</span>
                </label>
                <Controller
                  name="firstName"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      value={field.value ?? ''}
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.firstName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Entrez le prénom"
                    />
                  )}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de famille * <span className="text-xs text-gray-500">(Siyati)</span>
                </label>
                <Controller
                  name="lastName"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      value={field.value ?? ''}
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.lastName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Entrez le nom de famille"
                    />
                  )}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de naissance * <span className="text-xs text-gray-500">(Dat nesans)</span>
                </label>
                <Controller
                  name="dateOfBirth"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      value={field.value ?? ''}
                      type="date"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  )}
                />
                {errors.dateOfBirth && (
                  <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lieu de naissance <span className="text-xs text-gray-500">(Kote nesans)</span>
                </label>
                <Controller
                  name="birthPlace"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      value={field.value ?? ''}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Port-au-Prince, Haïti"
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Genre * <span className="text-xs text-gray-500">(Sèks)</span>
                </label>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      value={field.value ?? ''}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.gender ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Sélectionner...</option>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  )}
                />
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nationalité <span className="text-xs text-gray-500">(Nasyonalite)</span>
                </label>
                <Controller
                  name="nationality"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Haïtienne"
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NIF <span className="text-xs text-gray-500">(Nimewo Idantifikasyon Fiskal)</span>
                </label>
                <Controller
                  name="nif"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: NIF-123456789"
                    />
                  )}
                />
              </div>
            </div>
            )}
          </div>
        )}

        {/* ÉTAPE 2: Coordonnées */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Adresse et Coordonnées
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse complète * <span className="text-xs text-gray-500">(Adrès konplè)</span>
                </label>
                <Controller
                  name="street"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.street ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Numéro, rue, quartier"
                    />
                  )}
                />
                {errors.street && (
                  <p className="mt-1 text-sm text-red-600">{errors.street.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Département * <span className="text-xs text-gray-500">(Depatman)</span>
                </label>
                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.department ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Sélectionner...</option>
                      {HAITI_DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.department && (
                  <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commune * <span className="text-xs text-gray-500">(Komin)</span>
                </label>
                <Controller
                  name="commune"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.commune ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={!selectedDepartment}
                    >
                      <option value="">Sélectionner...</option>
                      {availableCommunes.map(commune => (
                        <option key={commune} value={commune}>{commune}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.commune && (
                  <p className="mt-1 text-sm text-red-600">{errors.commune.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone principal * <span className="text-xs text-gray-500">(Telefòn)</span>
                </label>
                <Controller
                  name="primaryPhone"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="tel"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.primaryPhone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="+509 3712 3456"
                    />
                  )}
                />
                {errors.primaryPhone && (
                  <p className="mt-1 text-sm text-red-600">{errors.primaryPhone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone secondaire <span className="text-xs text-gray-500">(Telefòn 2)</span>
                </label>
                <Controller
                  name="secondaryPhone"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="+509 2222 3333"
                    />
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-xs text-gray-500">(Adrès imel)</span>
                </label>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="email"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="email@exemple.com"
                    />
                  )}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact d'urgence
                </label>
                <Controller
                  name="emergencyContactName"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nom du contact"
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone d'urgence
                </label>
                <Controller
                  name="emergencyContactPhone"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="+509 1234 5678"
                    />
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 3: Documents */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Documents et Pièces d'Identité
              {isBusiness && (
                <span className="block text-xs text-blue-700 font-medium mt-1">Pièce d'identité du représentant légal</span>
              )}
            </h3>

            {/* Document Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isBusiness ? "Type de pièce (Représentant légal) *" : "Type de document *"}
                </label>
                {isBusiness ? (
                  <Controller
                    name="legalRepresentativeDocumentType"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        value={field.value ?? ''}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          (errors as any).legalRepresentativeDocumentType ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Sélectionner...</option>
                        <option value={IdentityDocumentType.CIN}>CIN (Carte d'Identité Nationale)</option>
                        <option value={IdentityDocumentType.PASSPORT}>Passeport</option>
                        <option value={IdentityDocumentType.DRIVING_LICENSE}>Permis de Conduire</option>
                      </select>
                    )}
                  />
                ) : (
                  <Controller
                    name="documentType"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.documentType ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value={IdentityDocumentType.CIN}>Carte d'Identité Nationale</option>
                        <option value={IdentityDocumentType.PASSPORT}>Passeport</option>
                        <option value={IdentityDocumentType.DRIVING_LICENSE}>Permis de Conduire</option>
                      </select>
                    )}
                  />
                )}
                {isBusiness ? (
                  (errors as any).legalRepresentativeDocumentType && (
                    <p className="mt-1 text-sm text-red-600">{(errors as any).legalRepresentativeDocumentType.message}</p>
                  )
                ) : (
                  errors.documentType && (
                    <p className="mt-1 text-sm text-red-600">{errors.documentType.message}</p>
                  )
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isBusiness ? "Numéro de pièce (Représentant légal) *" : "Numéro de document *"}
                </label>
                {isBusiness ? (
                  <Controller
                    name="legalRepresentativeDocumentNumber"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${(errors as any).legalRepresentativeDocumentNumber ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Numéro du document"
                      />
                    )}
                  />
                ) : (
                  <Controller
                    name="documentNumber"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.documentNumber ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Numéro du document"
                      />
                    )}
                  />
                )}
                {isBusiness ? (
                  (errors as any).legalRepresentativeDocumentNumber && (
                    <p className="mt-1 text-sm text-red-600">{(errors as any).legalRepresentativeDocumentNumber.message}</p>
                  )
                ) : (
                  errors.documentNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.documentNumber.message}</p>
                  )
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isBusiness ? "Date d'émission (Représentant) *" : "Date d'émission *"}
                </label>
                {isBusiness ? (
                  <Controller
                    name="legalRepresentativeIssuedDate"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        value={field.value ?? ''}
                        type="date"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${ (errors as any).legalRepresentativeIssuedDate ? 'border-red-500' : 'border-gray-300'}`}
                      />
                    )}
                  />
                ) : (
                  <Controller
                    name="issuedDate"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="date"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${ errors.issuedDate ? 'border-red-500' : 'border-gray-300'}`}
                      />
                    )}
                  />
                )}
                {isBusiness ? (
                  (errors as any).legalRepresentativeIssuedDate && (
                    <p className="mt-1 text-sm text-red-600">{(errors as any).legalRepresentativeIssuedDate.message}</p>
                  )
                ) : (
                  errors.issuedDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.issuedDate.message}</p>
                  )
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isBusiness ? "Date d'expiration (Représentant)" : "Date d'expiration"}
                </label>
                {isBusiness ? (
                  <Controller
                    name="legalRepresentativeExpiryDate"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        value={field.value ?? ''}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  />
                ) : (
                  <Controller
                    name="expiryDate"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  />
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isBusiness ? "Autorité d'émission (Représentant) *" : "Autorité d'émission *"}
                </label>
                {isBusiness ? (
                  <Controller
                    name="legalRepresentativeIssuingAuthority"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        value={field.value ?? ''}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${(errors as any).legalRepresentativeIssuingAuthority ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Ex: Office National d'Identification"
                      />
                    )}
                  />
                ) : (
                  <Controller
                    name="issuingAuthority"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.issuingAuthority ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Ex: Office National d'Identification"
                      />
                    )}
                  />
                )}
                {isBusiness ? (
                  (errors as any).legalRepresentativeIssuingAuthority && (
                    <p className="mt-1 text-sm text-red-600">{(errors as any).legalRepresentativeIssuingAuthority.message}</p>
                  )
                ) : (
                  errors.issuingAuthority && (
                    <p className="mt-1 text-sm text-red-600">{errors.issuingAuthority.message}</p>
                  )
                )}
              </div>
            </div>

            {/* Upload Documents */}
            <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
              <h4 className="font-semibold text-gray-900 mb-4">Télécharger les documents</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Photo - Seulement pour personne physique */}
                {!isBusiness && (
                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <Camera className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                    <h5 className="font-medium text-gray-900 mb-2">Photo</h5>
                    {uploadedFiles.photo ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center text-green-600">
                          <Check className="w-4 h-4 mr-1" />
                          <span className="text-sm">{uploadedFiles.photo.name}</span>
                        </div>
                        <label className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded cursor-pointer hover:bg-gray-700">
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Changer
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && file.size <= 5 * 1024 * 1024) {
                                setUploadedFiles({ ...uploadedFiles, photo: file });
                              }
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded cursor-pointer hover:bg-green-700">
                        <Upload className="w-4 h-4 mr-1" />
                        Charger
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.size <= 5 * 1024 * 1024) {
                              setUploadedFiles({ ...uploadedFiles, photo: file });
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
                )}

                {/* ID Document - Pour tout le monde */}
                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                    <h5 className="font-medium text-gray-900 mb-2">
                      {isBusiness ? "Pièce représentant" : "Pièce d'identité"}
                    </h5>
                    {uploadedFiles.idDocument ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center text-green-600">
                          <Check className="w-4 h-4 mr-1" />
                          <span className="text-sm">{uploadedFiles.idDocument.name}</span>
                        </div>
                        <label className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded cursor-pointer hover:bg-gray-700">
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Changer
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && file.size <= 5 * 1024 * 1024) {
                                setUploadedFiles({ ...uploadedFiles, idDocument: file });
                              }
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded cursor-pointer hover:bg-green-700">
                        <Upload className="w-4 h-4 mr-1" />
                        Charger
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.size <= 5 * 1024 * 1024) {
                              setUploadedFiles({ ...uploadedFiles, idDocument: file });
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Extrait registre du commerce - Personne morale uniquement */}
                {isBusiness && (
                  <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <FileText className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                      <h5 className="font-medium text-gray-900 mb-2">Registre de commerce *</h5>
                      {uploadedFiles.businessRegistrationDocument ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center text-green-600">
                            <Check className="w-4 h-4 mr-1" />
                            <span className="text-sm">{uploadedFiles.businessRegistrationDocument.name}</span>
                          </div>
                          <label className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded cursor-pointer hover:bg-gray-700">
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Changer
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && file.size <= 5 * 1024 * 1024) {
                                  setUploadedFiles({ ...uploadedFiles, businessRegistrationDocument: file });
                                }
                              }}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded cursor-pointer hover:bg-green-700">
                          <Upload className="w-4 h-4 mr-1" />
                          Charger
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && file.size <= 5 * 1024 * 1024) {
                                setUploadedFiles({ ...uploadedFiles, businessRegistrationDocument: file });
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {/* Justificatif de domicile - Entreprise ou particulier */}
                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                    <h5 className="font-medium text-gray-900 mb-2">
                      {isBusiness ? "Justificatif domicile société" : "Preuve de résidence"}
                    </h5>
                    {(isBusiness ? uploadedFiles.companyProofOfAddress : uploadedFiles.proofOfResidence) ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center text-green-600">
                          <Check className="w-4 h-4 mr-1" />
                          <span className="text-sm">
                            {(isBusiness ? uploadedFiles.companyProofOfAddress?.name : uploadedFiles.proofOfResidence?.name)}
                          </span>
                        </div>
                        <label className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded cursor-pointer hover:bg-gray-700">
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Changer
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && file.size <= 5 * 1024 * 1024) {
                                if (isBusiness) {
                                  setUploadedFiles({ ...uploadedFiles, companyProofOfAddress: file });
                                } else {
                                  setUploadedFiles({ ...uploadedFiles, proofOfResidence: file });
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded cursor-pointer hover:bg-green-700">
                        <Upload className="w-4 h-4 mr-1" />
                        Charger
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.size <= 5 * 1024 * 1024) {
                              if (isBusiness) {
                                setUploadedFiles({ ...uploadedFiles, companyProofOfAddress: file });
                              } else {
                                setUploadedFiles({ ...uploadedFiles, proofOfResidence: file });
                              }
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Déclaration origine des fonds - Personne morale uniquement */}
                {isBusiness && (
                  <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <FileText className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                      <h5 className="font-medium text-gray-900 mb-2">Origine des fonds *</h5>
                      {uploadedFiles.fundsOriginDeclaration ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center text-green-600">
                            <Check className="w-4 h-4 mr-1" />
                            <span className="text-sm">{uploadedFiles.fundsOriginDeclaration.name}</span>
                          </div>
                          <label className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded cursor-pointer hover:bg-gray-700">
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Changer
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && file.size <= 5 * 1024 * 1024) {
                                  setUploadedFiles({ ...uploadedFiles, fundsOriginDeclaration: file });
                                }
                              }}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded cursor-pointer hover:bg-green-700">
                          <Upload className="w-4 h-4 mr-1" />
                          Charger
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && file.size <= 5 * 1024 * 1024) {
                                setUploadedFiles({ ...uploadedFiles, fundsOriginDeclaration: file });
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {/* Signature */}
                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    {customerSignature ? (
                      <div>
                        <img src={customerSignature} alt="Signature" className="h-16 mx-auto mb-2" />
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                          onClick={() => setShowSignatureCanvas(true)}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Modifier
                        </button>
                      </div>
                    ) : (
                      <div>
                        <FileText className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                        <h5 className="font-medium text-gray-900 mb-2">Signature</h5>
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          onClick={() => setShowSignatureCanvas(true)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Signer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Signataires autorisés - Personne morale uniquement */}
            {isBusiness && (
              <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">Personnes autorisées à gérer le compte</h4>
                  <button
                    type="button"
                    onClick={() => { setCurrentSignerEdit(null); setShowSignerForm(true); }}
                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
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
                            onClick={() => handleEditSigner(signer)}
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
            )}
          </div>
        )}

        {/* ÉTAPE 4: Informations Professionnelles */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Informations Professionnelles et Financières (Optionnel)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profession
                </label>
                <Controller
                  name="occupation"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Enseignant, Commerçant"
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employeur / Entreprise
                </label>
                <Controller
                  name="employerName"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nom de l'employeur"
                    />
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse du travail/commerce</label>
                <Controller name="workAddress" control={control} render={({ field }) => (
                  <input {...field} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Adresse professionnelle" />
                )}/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source de revenu
                </label>
                <Controller
                  name="incomeSource"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      value={field.value ?? ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="SALARY">Salaire</option>
                      <option value="BUSINESS">Commerce</option>
                      <option value="TRANSFER">Transfert</option>
                      <option value="AGRICULTURE">Agriculture</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Revenu mensuel (HTG)
                </label>
                <Controller
                  name="monthlyIncome"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={field.value ?? ''}
                      placeholder="Montant du revenu"
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">But de l'ouverture du compte</label>
                <Controller name="accountPurpose" control={control} render={({ field }) => (
                  <input {...field} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ex: Dépôts commerciaux, Paiement salaires" />
                )}/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fréquence des transactions</label>
                <Controller name="transactionFrequency" control={control} render={({ field }) => (
                  <select {...field} value={field.value ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Sélectionner...</option>
                    <option value="DAILY">Quotidienne</option>
                    <option value="WEEKLY">Hebdomadaire</option>
                    <option value="MONTHLY">Mensuelle</option>
                    <option value="SEASONAL">Saisonnière</option>
                  </select>
                )}/>
              </div>

              {/* Champs personnels - Seulement pour les personnes physiques */}
              {!isBusiness && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Situation matrimoniale
                    </label>
                    <Controller
                      name="maritalStatus"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          value={field.value || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Sélectionner...</option>
                          <option value="SINGLE">Célibataire</option>
                          <option value="MARRIED">Marié(e)</option>
                          <option value="DIVORCED">Divorcé(e)</option>
                          <option value="WIDOWED">Veuf/Veuve</option>
                        </select>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de personnes à charge</label>
                    <Controller name="numberOfDependents" control={control} render={({ field }) => (
                      <input {...field} type="number" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    )}/>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Niveau d'éducation
                    </label>
                    <Controller
                      name="educationLevel"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          value={field.value ?? ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Sélectionner...</option>
                          <option value="PRIMARY">Primaire</option>
                          <option value="SECONDARY">Secondaire</option>
                          <option value="VOCATIONAL">Professionnel</option>
                          <option value="UNIVERSITY">Universitaire</option>
                          <option value="NONE">Aucun</option>
                        </select>
                      )}
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Personne de référence</label>
                <Controller name="referencePerson" control={control} render={({ field }) => (
                  <input {...field} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Nom et contact d'une référence" />
                )}/>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 5: Confirmation */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Vérification et Confirmation
            </h3>

            <div className="bg-gray-50 p-6 rounded-lg space-y-4">
              {isBusiness ? (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Informations de l'Entreprise</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Raison sociale:</span>
                      <p className="font-medium">{watch('companyName')}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Forme juridique:</span>
                      <p className="font-medium">{watch('legalForm')}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Numéro de commerce:</span>
                      <p className="font-medium">{watch('businessRegistrationNumber')}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">NIF entreprise:</span>
                      <p className="font-medium">{watch('companyNif')}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Adresse du siège:</span>
                      <p className="font-medium">{watch('headOfficeAddress')}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Téléphone entreprise:</span>
                      <p className="font-medium">{watch('companyPhone')}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email entreprise:</span>
                      <p className="font-medium">{watch('companyEmail')}</p>
                    </div>
                  </div>
                  {watch('legalRepresentativeName') && (
                    <div className="border-t pt-4 mt-4">
                      <h5 className="font-medium text-gray-900 mb-2">Représentant légal</h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Nom:</span>
                          <p className="font-medium">{watch('legalRepresentativeName')}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Titre:</span>
                          <p className="font-medium">{watch('legalRepresentativeTitle')}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Pièce:</span>
                          <p className="font-medium">{watch('legalRepresentativeDocumentType')} - {watch('legalRepresentativeDocumentNumber')}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Informations Personnelles</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Nom complet:</span>
                      <p className="font-medium">{watch('firstName')} {watch('lastName')}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Date de naissance:</span>
                      <p className="font-medium">{watch('dateOfBirth')}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Genre:</span>
                      <p className="font-medium">{watch('gender') === 'M' ? 'Masculin' : 'Féminin'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Téléphone:</span>
                      <p className="font-medium">{watch('primaryPhone')}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Adresse</h4>
                <p className="text-sm">{watch('street')}, {watch('commune')}, {watch('department')}</p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Document d'Identité</h4>
                <div className="text-sm">
                  {(() => {
                    // For businesses, the identity shown at confirmation should be the representative's document
                    const docTypeValue = isBusiness ? watch('legalRepresentativeDocumentType') : watch('documentType');
                    const docNumber = isBusiness ? watch('legalRepresentativeDocumentNumber') : watch('documentNumber');
                    const issuing = isBusiness ? watch('legalRepresentativeIssuingAuthority') : watch('issuingAuthority');

                    const docTypeMap: Record<string | number, string> = {
                      [IdentityDocumentType.CIN]: "CIN (Carte d'Identité Nationale)",
                      [IdentityDocumentType.PASSPORT]: 'Passeport',
                      [IdentityDocumentType.DRIVING_LICENSE]: 'Permis de Conduire',
                    };

                    const docLabel = docTypeValue ? (docTypeMap[docTypeValue] ?? String(docTypeValue)) : '';

                    return (
                      <>
                        <p>{docLabel}{docLabel && docNumber ? ' - ' : ''}{docNumber || ''}</p>
                        <p className="text-gray-600">Émis par: {issuing || '—'}</p>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Documents Uploadés</h4>
                <div className="space-y-2 text-sm">
                  {uploadedFiles.photo && (
                    <div className="flex items-center text-green-600">
                      <Check className="w-4 h-4 mr-2" />
                      <span>Photo du client</span>
                    </div>
                  )}
                  {uploadedFiles.idDocument && (
                    <div className="flex items-center text-green-600">
                      <Check className="w-4 h-4 mr-2" />
                      <span>Pièce d'identité</span>
                    </div>
                  )}
                  {uploadedFiles.businessRegistrationDocument && (
                    <div className="flex items-center text-green-600">
                      <Check className="w-4 h-4 mr-2" />
                      <span>Extrait du registre de commerce</span>
                    </div>
                  )}
                  {(uploadedFiles.companyProofOfAddress || uploadedFiles.proofOfResidence) && (
                    <div className="flex items-center text-green-600">
                      <Check className="w-4 h-4 mr-2" />
                      <span>Justificatif de domicile</span>
                    </div>
                  )}
                  {uploadedFiles.fundsOriginDeclaration && (
                    <div className="flex items-center text-green-600">
                      <Check className="w-4 h-4 mr-2" />
                      <span>Déclaration origine des fonds</span>
                    </div>
                  )}
                  {customerSignature && (
                    <div className="flex items-center text-green-600">
                      <Check className="w-4 h-4 mr-2" />
                      <span>Signature</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Signataires autorisés - Affichage */}
              {isBusiness && authorizedSigners.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Signataires autorisés</h4>
                  <div className="space-y-2 text-sm">
                    {authorizedSigners.map((signer, index) => (
                      <div key={signer.id} className="flex items-start">
                        <span className="font-medium text-gray-700 mr-2">{index + 1}.</span>
                        <div>
                          <p className="font-medium">{signer.fullName}</p>
                          <p className="text-gray-600">{signer.relationshipToCustomer} - {signer.phoneNumber}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Déclaration et Acceptation */}
            <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-200">
              <h4 className="font-semibold text-gray-900 mb-4">Déclaration et Acceptation</h4>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Controller
                    name="acceptTerms"
                    control={control}
                    render={({ field: { value, onChange, onBlur, name, ref } }) => (
                      <input
                        type="checkbox"
                        name={name}
                        ref={ref}
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        onBlur={onBlur}
                        className="mt-1 mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    )}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 font-medium mb-2">
                      Je certifie que les informations fournies dans ce formulaire sont exactes et complètes.
                    </p>
                    <p className="text-xs text-gray-600">
                      Je comprends que la banque se réserve le droit de demander des documents supplémentaires 
                      ou d'effectuer toute vérification jugée nécessaire.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fait à *</label>
                    <Controller
                      name="signaturePlace"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ville"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Le *</label>
                    <Controller
                      name="signatureDate"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    />
                  </div>
                </div>

                {customerSignature && (
                  <div className="pt-4 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Signature du {isBusiness ? 'représentant légal' : 'client'}
                    </label>
                    <img src={customerSignature} alt="Signature" className="h-20 border border-gray-300 rounded p-2 bg-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <button
            type="button"
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onCancel()}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            disabled={isLoading}
          >
            {currentStep === 1 ? 'Annuler' : 'Précédent'}
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Suivant
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>Créer le Client</span>
            </button>
          )}
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

      {/* Authorized Signer Form Modal */}
      {showSignerForm && (
        <AuthorizedSignerForm
          signer={currentSignerEdit}
          onSave={handleAddSigner}
          onCancel={() => { setShowSignerForm(false); setCurrentSignerEdit(null); }}
        />
      )}
    </div>
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
      documentType: IdentityDocumentType.CIN,
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
                onChange={(e) => setFormData({ ...formData, documentType: e.target.value as IdentityDocumentType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={IdentityDocumentType.CIN}>CIN</option>
                <option value={IdentityDocumentType.PASSPORT}>Passeport</option>
                <option value={IdentityDocumentType.DRIVING_LICENSE}>Permis de conduire</option>
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

export default ClientCreationForm;
