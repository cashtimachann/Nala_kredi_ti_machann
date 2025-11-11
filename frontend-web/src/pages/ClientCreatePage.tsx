import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import ClientCreationForm from '../components/admin/ClientCreationForm';
import savingsCustomerService, { SavingsCustomerCreateDto, SavingsIdentityDocumentType } from '../services/savingsCustomerService';

// Simple mapping borrowed from ClientAccountManagement logic
const convertGender = (gender: string) => {
  if (!gender) return 0; // Default to Male
  const g = gender.toLowerCase();
  return g === 'male' || g === 'gason' || g === 'm' ? 0 : 1;
};

const convertDocumentType = (type?: string | number | null): SavingsIdentityDocumentType => {
  if (type === null || type === undefined || type === '') {
    return SavingsIdentityDocumentType.CIN;
  }

  if (typeof type === 'number' && SavingsIdentityDocumentType[type] !== undefined) {
    return type as SavingsIdentityDocumentType;
  }

  const t = type.toString().toUpperCase();
  switch (t) {
    case 'PASSPORT':
      return SavingsIdentityDocumentType.Passport;
    case 'DRIVING_LICENSE':
      return SavingsIdentityDocumentType.DrivingLicense;
    // Birth certificate retired from frontend options - do not map frontend input to that value
    default:
      return SavingsIdentityDocumentType.CIN;
  }
};

const sanitizePhone = (p?: string) => (p ? p.replace(/\s|\-/g, '') : undefined);

const ClientCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (clientData: any) => {
    try {
      setLoading(true);

      // Extract file data and signature from the client data
      const { uploadedFiles, signature, ...basicData } = clientData;

      // Build DTO based on client type (without files)
      const dto: SavingsCustomerCreateDto = {
        // Common fields for both individual and business clients
        firstName: basicData?.firstName || basicData?.legalRepresentativeFirstName || '',
        lastName: basicData?.lastName || basicData?.legalRepresentativeLastName || '',
        dateOfBirth: basicData?.dateOfBirth || '1900-01-01', // Required by backend, use default for business
        gender: convertGender(basicData?.gender || 'M'),

        // Address
        street: basicData?.street || '',
        commune: basicData?.commune || '',
        department: basicData?.department || '',
        postalCode: basicData?.postalCode || undefined,

        // Contact
        primaryPhone: sanitizePhone(basicData?.primaryPhone || basicData?.companyPhone) || '',
        secondaryPhone: sanitizePhone(basicData?.secondaryPhone),
        email: basicData?.email || basicData?.companyEmail || undefined,
        emergencyContactName: basicData?.emergencyContactName || undefined,
        emergencyContactPhone: sanitizePhone(basicData?.emergencyContactPhone),

        // Identity (use representative's document for business clients)
        documentType: convertDocumentType(basicData?.documentType || basicData?.legalRepresentativeDocumentType),
        documentNumber: basicData?.documentNumber || basicData?.legalRepresentativeDocumentNumber || '',
        issuedDate: basicData?.issuedDate || basicData?.legalRepresentativeIssuedDate || '',
        expiryDate: basicData?.expiryDate || basicData?.legalRepresentativeExpiryDate || undefined,
        issuingAuthority: basicData?.issuingAuthority || basicData?.legalRepresentativeIssuingAuthority || 'Kredi Ti Machann',

        // Professional info
        occupation: basicData?.occupation || undefined,
        monthlyIncome: basicData?.monthlyIncome ? parseFloat(basicData.monthlyIncome) : undefined,

        // Business client fields
        isBusiness: basicData?.isBusiness || false,
        ...(basicData?.isBusiness && {
          companyName: basicData?.companyName || '',
          legalForm: basicData?.legalForm || '',
          tradeRegisterNumber: basicData?.tradeRegisterNumber || '',
          taxId: basicData?.taxId || '',
          headOfficeAddress: basicData?.headOfficeAddress || '',
          companyPhone: sanitizePhone(basicData?.companyPhone),
          companyEmail: basicData?.companyEmail || undefined,

          // Representative info (already handled in common fields above)
          representativeFirstName: basicData?.legalRepresentativeFirstName || '',
          representativeLastName: basicData?.legalRepresentativeLastName || '',
          representativeTitle: basicData?.legalRepresentativeTitle || '',
          representativeDocumentType: convertDocumentType(basicData?.legalRepresentativeDocumentType),
          representativeDocumentNumber: basicData?.legalRepresentativeDocumentNumber || '',
          representativeIssuedDate: basicData?.legalRepresentativeIssuedDate || '',
          representativeExpiryDate: basicData?.legalRepresentativeExpiryDate || undefined,
          representativeIssuingAuthority: basicData?.legalRepresentativeIssuingAuthority || '',
        }),

        // Additional individual client fields
        birthPlace: basicData?.birthPlace || undefined,
        nationality: basicData?.nationality || 'Haïtienne',
        personalNif: basicData?.nif || undefined,

        // Extended professional info
        employerName: basicData?.employerName || undefined,
        workAddress: basicData?.workAddress || undefined,
        incomeSource: basicData?.incomeSource || undefined,

        // Family/Social info
        maritalStatus: basicData?.maritalStatus || undefined,
        numberOfDependents: basicData?.numberOfDependents || undefined,
        educationLevel: basicData?.educationLevel || undefined,

        // Declaration/Signature
        acceptTerms: basicData?.acceptTerms || false,
        signaturePlace: basicData?.signaturePlace || undefined,
        signatureDate: basicData?.signatureDate || undefined,

        // Reference
        referencePersonName: basicData?.referencePerson || undefined,
        referencePersonPhone: sanitizePhone(basicData?.referencePersonPhone),
      };

      console.log('Client creation DTO:', dto);

      // Create the customer first
      const created = await savingsCustomerService.createCustomer(dto);
      const customerId = created.id;
      const fullName = created?.fullName || `${created?.firstName || ''} ${created?.lastName || ''}`.trim();

      // Now upload files and documents if any
      if (uploadedFiles) {
        try {
          // Upload photo if provided
          if (uploadedFiles.photo) {
            await savingsCustomerService.uploadFile(uploadedFiles.photo, customerId, 'photo');
            console.log('Photo uploaded successfully');
          }

          // Upload ID document if provided
          if (uploadedFiles.idDocument) {
            const idDocName = basicData?.isBusiness ? 'Pièce d\'identité du représentant légal' : 'Pièce d\'identité';
            const idDocDesc = basicData?.isBusiness ? 'Document d\'identité du représentant légal' : 'Document d\'identité du client';
            await savingsCustomerService.uploadDocument(customerId, uploadedFiles.idDocument, 0, idDocName, idDocDesc);
            console.log('ID document uploaded successfully');
          }

          // Upload proof of residence if provided
          if (uploadedFiles.proofOfResidence) {
            await savingsCustomerService.uploadDocument(customerId, uploadedFiles.proofOfResidence, 2, 'Justificatif de domicile', 'Preuve de résidence du client');
            console.log('Proof of residence uploaded successfully');
          }

          // Upload business registration document if provided
          if (uploadedFiles.businessRegistrationDocument) {
            await savingsCustomerService.uploadDocument(customerId, uploadedFiles.businessRegistrationDocument, 4, 'Registre de commerce', 'Extrait du registre de commerce de l\'entreprise');
            console.log('Business registration document uploaded successfully');
          }

          // Upload company proof of address if provided
          if (uploadedFiles.companyProofOfAddress) {
            await savingsCustomerService.uploadDocument(customerId, uploadedFiles.companyProofOfAddress, 2, 'Justificatif de domicile de l\'entreprise', 'Preuve d\'adresse du siège social');
            console.log('Company proof of address uploaded successfully');
          }

          // Upload funds origin declaration if provided
          if (uploadedFiles.fundsOriginDeclaration) {
            await savingsCustomerService.uploadDocument(customerId, uploadedFiles.fundsOriginDeclaration, 4, 'Déclaration d\'origine des fonds', 'Document déclarant l\'origine des fonds de l\'entreprise');
            console.log('Funds origin declaration uploaded successfully');
          }

          // Upload other documents if provided
          if (uploadedFiles.otherDocuments && uploadedFiles.otherDocuments.length > 0) {
            for (let i = 0; i < uploadedFiles.otherDocuments.length; i++) {
              const doc = uploadedFiles.otherDocuments[i];
              await savingsCustomerService.uploadDocument(customerId, doc, 4, `Document supplémentaire ${i + 1}`, 'Document supplémentaire');
            }
            console.log('Other documents uploaded successfully');
          }
        } catch (fileError: any) {
          console.error('Error uploading files:', fileError);
          toast.error('Client créé mais erreur lors de l\'upload des fichiers');
          // Don't fail the entire operation, just warn about file upload issues
        }
      }

      // Save signature if provided
      if (signature) {
        try {
          await savingsCustomerService.saveSignature(customerId, signature);
          console.log('Signature saved successfully');
        } catch (signatureError: any) {
          console.error('Error saving signature:', signatureError);
          toast.error('Client créé mais erreur lors de la sauvegarde de la signature');
          // Don't fail the entire operation, just warn about signature issues
        }
      }

      toast.success(`Client ${fullName || ''} créé avec succès!`);

      // Go back to originating context (default to Current Accounts → Clients tab)
      const from = new URLSearchParams(location.search).get('from');
      if (from === 'current-accounts') {
        navigate('/current-accounts?tab=clients', { replace: true });
      } else if (from === 'client-accounts') {
        navigate('/client-accounts', { replace: true });
      } else {
        navigate('/current-accounts?tab=clients', { replace: true });
      }
      return created;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) toast.error('Session expirée. Veuillez vous reconnecter.');
      else if (status === 403) toast.error('Accès refusé (403).');
      else toast.error(err?.response?.data?.message || err?.message || 'Erreur lors de la création du client');
      console.error('Client creation error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const from = new URLSearchParams(location.search).get('from');
    if (from === 'current-accounts') {
      navigate('/current-accounts?tab=clients');
    } else if (from === 'client-accounts') {
      navigate('/client-accounts');
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Créer un Nouveau Client</h1>
        <p className="text-gray-600">Renseignez les informations du client puis validez.</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <ClientCreationForm onSubmit={handleSubmit} onCancel={handleCancel} isLoading={loading} />
      </div>
    </div>
  );
};

export default ClientCreatePage;
