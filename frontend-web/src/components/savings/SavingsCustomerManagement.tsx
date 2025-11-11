import React, { useState, useEffect } from 'react';
import {
  Users,
  User,
  Search,
  Filter,
  Eye,
  Edit2,
  Download,
  UserPlus,
  ChevronDown,
  ChevronUp,
  X,
  MapPin,
  Phone,
  FileText,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { unparse } from 'papaparse';
import * as XLSX from 'xlsx';
import ClientCreationForm from '../admin/ClientCreationForm';
import ClientEditForm from '../admin/ClientEditForm';
import savingsCustomerService, { 
  SavingsCustomerResponseDto,
  SavingsCustomerCreateDto,
  SavingsIdentityDocumentType,
  SavingsGender
} from '../../services/savingsCustomerService';
import clientAccountCustomerLoader from '../../services/clientAccountCustomerLoader';
import { apiService } from '../../services/apiService';
import { parseGender, genderLabel } from '../../utils/gender';
import { Branch } from '../../types/branch';

const SavingsCustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<SavingsCustomerResponseDto[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [customerAccounts, setCustomerAccounts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    branchId: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDetailsView, setShowDetailsView] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SavingsCustomerResponseDto | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    setInitialLoading(true);
    loadCustomers().finally(() => setInitialLoading(false));
  }, []);

  // Search customers without showing initial spinner
  useEffect(() => {
    if (searchTerm && searchTerm.length >= 2) {
      loadCustomers();
    } else if (searchTerm.length === 0) {
      loadCustomers();
    }
  }, [searchTerm]);
  // Load branches for the branch filter dropdown
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await apiService.getAllBranches();
        if (!mounted) return;
        setBranches(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Error loading branches:', err);
        setBranches([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load customers on mount
  useEffect(() => {
    setInitialLoading(true);
    loadCustomers().finally(() => setInitialLoading(false));
  }, []);

  // Search customers without showing initial spinner
  useEffect(() => {
    if (searchTerm && searchTerm.length >= 2) {
      loadCustomers();
    } else if (searchTerm.length === 0) {
      loadCustomers();
    }
  }, [searchTerm]);

  // Fonction pour normaliser les données client
  const normalizeCustomer = (customer: any): SavingsCustomerResponseDto => {

    return {
      id: customer.id || '',
      customerCode: customer.customerCode || undefined,
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      fullName: customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      dateOfBirth: customer.dateOfBirth || '',
      gender: parseGender(customer.gender ?? customer.Gender ?? 0),
      address: {
        street: customer.address?.street || customer.street || '',
        commune: customer.address?.commune || customer.commune || '',
        department: customer.address?.department || customer.department || '',
        country: customer.address?.country || customer.country || 'Haïti',
        postalCode: customer.address?.postalCode || customer.postalCode || undefined
      },
      contact: {
        primaryPhone: customer.contact?.primaryPhone || customer.primaryPhone || '',
        secondaryPhone: customer.contact?.secondaryPhone || customer.secondaryPhone || undefined,
        email: customer.contact?.email || customer.email || undefined,
        emergencyContactName: customer.contact?.emergencyContactName || customer.emergencyContactName || undefined,
        emergencyContactPhone: customer.contact?.emergencyContactPhone || customer.emergencyContactPhone || undefined
      },
      identity: {
        documentType: customer.identity?.documentType ?? customer.documentType ?? 0,
        documentNumber: customer.identity?.documentNumber || customer.documentNumber || '',
        issuedDate: customer.identity?.issuedDate || customer.issuedDate || '',
        expiryDate: customer.identity?.expiryDate || customer.expiryDate || undefined,
        issuingAuthority: customer.identity?.issuingAuthority || customer.issuingAuthority || ''
      },
      birthPlace: customer.birthPlace || customer.BirthPlace || undefined,
      nationality: customer.nationality || customer.Nationality || undefined,
      personalNif: customer.personalNif || customer.PersonalNif || undefined,
  occupation: customer.occupation || customer.Occupation || undefined,
  monthlyIncome: customer.monthlyIncome ?? customer.MonthlyIncome ?? undefined,
  employerName: customer.employerName || customer.EmployerName || undefined,
  workAddress: customer.workAddress || customer.WorkAddress || undefined,
  incomeSource: customer.incomeSource || customer.IncomeSource || undefined,
  maritalStatus: customer.maritalStatus || customer.MaritalStatus || undefined,
  spouseName: customer.spouseName || customer.SpouseName || undefined,
  numberOfDependents: customer.numberOfDependents ?? customer.NumberOfDependents ?? undefined,
  educationLevel: customer.educationLevel || customer.EducationLevel || undefined,
  referencePersonName: customer.referencePersonName || customer.ReferencePersonName || undefined,
  referencePersonPhone: customer.referencePersonPhone || customer.ReferencePersonPhone || undefined,
  transactionFrequency: customer.transactionFrequency || customer.TransactionFrequency || undefined,
  accountPurpose: customer.accountPurpose || customer.AccountPurpose || undefined,
  acceptTerms: (customer.acceptTerms ?? customer.AcceptTerms) ?? false,
  signaturePlace: customer.signaturePlace || customer.SignaturePlace || undefined,
  signatureDate: customer.signatureDate || customer.SignatureDate || undefined,
      signature: customer.signature || undefined,
      documents: customer.documents || [],
      createdAt: customer.createdAt || '',
      updatedAt: customer.updatedAt || '',
      isActive: customer.isActive ?? true
    };
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      if (searchTerm && searchTerm.trim().length >= 2) {
        // Recherche avec terme (minimum 2 caractères)
        const results = await savingsCustomerService.searchCustomers(searchTerm.trim());
        
        // Filtrer pour ne garder que ceux qui ont des comptes d'épargne
        const accounts = await apiService.getSavingsAccounts({});
        const customerIdsWithAccounts = new Set(accounts.map((acc: any) => acc.customerId));
        const customersWithAccounts = results
          .filter(c => customerIdsWithAccounts.has(c.id))
          .map(normalizeCustomer);
        
        setCustomers(Array.isArray(customersWithAccounts) ? customersWithAccounts : []);
        setCustomerAccounts(accounts);
      } else {
        // Charger tous les clients qui ont des comptes d'épargne (partagé)
        const customersWithAccounts = await clientAccountCustomerLoader.loadCustomersHavingAccounts('SAVINGS');
        const accounts = await apiService.getSavingsAccounts({});
        setCustomers(Array.isArray(customersWithAccounts) ? customersWithAccounts : []);
        setCustomerAccounts(accounts);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      toast.error('Erreur lors du chargement des clients');
      setCustomers([]);
      setCustomerAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (clientData: any) => {
    try {
      // Convertir le genre (utilise le helper centralisé)

      // Convertir le type de document
      const convertDocumentType = (type: string): SavingsIdentityDocumentType => {
        const typeMap: { [key: string]: SavingsIdentityDocumentType } = {
          'CIN': SavingsIdentityDocumentType.CIN,
          'PASSPORT': SavingsIdentityDocumentType.Passport,
          'DRIVING_LICENSE': SavingsIdentityDocumentType.DrivingLicense,
          // Birth certificate retired on frontend — legacy numeric values will be tolerated but not emitted
        };
        return typeMap[type.toUpperCase()] || SavingsIdentityDocumentType.CIN;
      };

      const customerDto: SavingsCustomerCreateDto = {
        // Check if this is a business client
        isBusiness: clientData.isBusiness || false,
        
        // Individual client fields
        firstName: clientData.firstName,
        lastName: clientData.lastName,
  dateOfBirth: clientData.dateOfBirth,
  gender: parseGender(clientData.gender),
        street: clientData.street,
        commune: clientData.commune,
        department: clientData.department,
        postalCode: clientData.postalCode || undefined,
        primaryPhone: clientData.primaryPhone,
        secondaryPhone: clientData.secondaryPhone || undefined,
        email: clientData.email || undefined,
        emergencyContactName: clientData.emergencyContact?.name || undefined,
        emergencyContactPhone: clientData.emergencyContact?.phone || undefined,
        documentType: convertDocumentType(clientData.documentType),
        documentNumber: clientData.documentNumber,
        issuedDate: clientData.issuedDate,
        expiryDate: clientData.expiryDate || undefined,
        issuingAuthority: clientData.issuingAuthority,
        occupation: clientData.occupation || undefined,
        monthlyIncome: clientData.monthlyIncome ? parseFloat(clientData.monthlyIncome) : undefined,

        // Business client fields (only included if isBusiness is true)
        ...(clientData.isBusiness && {
          companyName: clientData.companyName,
          tradeRegisterNumber: clientData.tradeRegisterNumber,
          taxId: clientData.taxId,
          legalRepresentativeFirstName: clientData.legalRepresentativeFirstName,
          legalRepresentativeLastName: clientData.legalRepresentativeLastName
        })
      };

      const newCustomer = await savingsCustomerService.createCustomer(customerDto);
      const customerId = newCustomer.id;

      // Upload files if provided
      if (clientData.uploadedFiles) {
        try {
          // Upload photo if provided
          if (clientData.uploadedFiles.photo) {
            await savingsCustomerService.uploadFile(clientData.uploadedFiles.photo, customerId, 'photo');
            console.log('Photo uploaded successfully');
          }

          // Upload ID document if provided
          if (clientData.uploadedFiles.idDocument) {
            await savingsCustomerService.uploadDocument(customerId, clientData.uploadedFiles.idDocument, 0, 'Pièce d\'identité (recto)', 'Face de la carte d\'identité nationale');
            console.log('ID document uploaded successfully');
          }

          // Upload proof of residence if provided
          if (clientData.uploadedFiles.proofOfResidence) {
            // Use document type 2 = ProofOfResidence
            await savingsCustomerService.uploadDocument(customerId, clientData.uploadedFiles.proofOfResidence, 2, 'Justificatif de domicile', 'Facture d\'électricité, d\'eau ou autre document prouvant le domicile');
            console.log('Proof of residence uploaded successfully');
          }

          // Upload business registration document if provided
          if (clientData.uploadedFiles.businessRegistrationDocument) {
            await savingsCustomerService.uploadDocument(customerId, clientData.uploadedFiles.businessRegistrationDocument, 4, 'Registre de commerce', 'Extrait du registre de commerce');
            console.log('Business registration document uploaded successfully');
          }

          // Upload company proof of address if provided
          if (clientData.uploadedFiles.companyProofOfAddress) {
            // Use document type 2 = ProofOfResidence
            await savingsCustomerService.uploadDocument(customerId, clientData.uploadedFiles.companyProofOfAddress, 2, 'Justificatif domicile société', 'Facture d\'électricité, d\'eau ou autre document prouvant l\'adresse de l\'entreprise');
            console.log('Company proof of address uploaded successfully');
          }

          // Upload funds origin declaration if provided
          if (clientData.uploadedFiles.fundsOriginDeclaration) {
            await savingsCustomerService.uploadDocument(customerId, clientData.uploadedFiles.fundsOriginDeclaration, 4, 'Déclaration origine fonds', 'Déclaration d\'origine des fonds');
            console.log('Funds origin declaration uploaded successfully');
          }

          // Upload other documents if provided
          if (clientData.uploadedFiles.otherDocuments && clientData.uploadedFiles.otherDocuments.length > 0) {
            for (let i = 0; i < clientData.uploadedFiles.otherDocuments.length; i++) {
              const doc = clientData.uploadedFiles.otherDocuments[i];
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
      if (clientData.signature) {
        try {
          await savingsCustomerService.saveSignature(customerId, clientData.signature);
          console.log('Signature saved successfully');
        } catch (signatureError: any) {
          console.error('Error saving signature:', signatureError);
          toast.error('Client créé mais erreur lors de la sauvegarde de la signature');
          // Don't fail the entire operation, just warn about signature issues
        }
      }

      toast.success(`Client ${newCustomer.fullName} créé avec succès!`);
      setShowCreateForm(false);
      await loadCustomers();
      return newCustomer;
    } catch (error: any) {
      console.error('Erreur lors de la création du client:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la création du client';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleUpdateClient = async (clientData: any) => {
    if (!selectedCustomer) return;

    try {
      // Convertir le genre via le helper centralisé
      const convertDocumentType = (type: string): SavingsIdentityDocumentType => {
        const typeMap: { [key: string]: SavingsIdentityDocumentType } = {
          'CIN': SavingsIdentityDocumentType.CIN,
          'PASSPORT': SavingsIdentityDocumentType.Passport,
          'DRIVING_LICENSE': SavingsIdentityDocumentType.DrivingLicense,
          // Birth certificate retired from frontend mapping
        };
        return typeMap[type.toUpperCase()] || SavingsIdentityDocumentType.CIN;
      };

      const customerDto: SavingsCustomerCreateDto = {
        // Check if this is a business client
        isBusiness: clientData.isBusiness || false,
        
        // Individual client fields
        firstName: clientData.firstName,
        lastName: clientData.lastName,
  dateOfBirth: clientData.dateOfBirth,
  gender: parseGender(clientData.gender),
        street: clientData.street,
        commune: clientData.commune,
        department: clientData.department,
        postalCode: clientData.postalCode || undefined,
        primaryPhone: clientData.primaryPhone,
        secondaryPhone: clientData.secondaryPhone || undefined,
        email: clientData.email || undefined,
        emergencyContactName: clientData.emergencyContact?.name || undefined,
        emergencyContactPhone: clientData.emergencyContact?.phone || undefined,
        documentType: convertDocumentType(clientData.documentType),
        documentNumber: clientData.documentNumber,
        issuedDate: clientData.issuedDate,
        expiryDate: clientData.expiryDate || undefined,
        issuingAuthority: clientData.issuingAuthority,
        occupation: clientData.occupation || undefined,
        monthlyIncome: clientData.monthlyIncome ? parseFloat(clientData.monthlyIncome) : undefined,

        // Business client fields (only included if isBusiness is true)
        ...(clientData.isBusiness && {
          companyName: clientData.companyName,
          tradeRegisterNumber: clientData.tradeRegisterNumber,
          taxId: clientData.taxId,
          legalRepresentativeFirstName: clientData.legalRepresentativeFirstName,
          legalRepresentativeLastName: clientData.legalRepresentativeLastName
        })
      };

      await savingsCustomerService.updateCustomer(selectedCustomer.id, customerDto);

      // Upload files if provided (for updates)
      if (clientData.uploadedFiles) {
        try {
          // Upload photo if provided
          if (clientData.uploadedFiles.photo) {
            await savingsCustomerService.uploadFile(clientData.uploadedFiles.photo, selectedCustomer.id, 'photo');
            console.log('Photo uploaded successfully');
          }

          // Upload ID document if provided
          if (clientData.uploadedFiles.idDocument) {
            await savingsCustomerService.uploadDocument(selectedCustomer.id, clientData.uploadedFiles.idDocument, 0, 'Pièce d\'identité (recto)', 'Face de la carte d\'identité nationale');
            console.log('ID document uploaded successfully');
          }

          // Upload proof of residence if provided
          if (clientData.uploadedFiles.proofOfResidence) {
            // Use document type 2 = ProofOfResidence
            await savingsCustomerService.uploadDocument(selectedCustomer.id, clientData.uploadedFiles.proofOfResidence, 2, 'Justificatif de domicile', 'Facture d\'électricité, d\'eau ou autre document prouvant le domicile');
            console.log('Proof of residence uploaded successfully');
          }

          // Upload business registration document if provided
          if (clientData.uploadedFiles.businessRegistrationDocument) {
            await savingsCustomerService.uploadDocument(selectedCustomer.id, clientData.uploadedFiles.businessRegistrationDocument, 4, 'Registre de commerce', 'Extrait du registre de commerce');
            console.log('Business registration document uploaded successfully');
          }

          // Upload company proof of address if provided
          if (clientData.uploadedFiles.companyProofOfAddress) {
            // Use document type 2 = ProofOfResidence
            await savingsCustomerService.uploadDocument(selectedCustomer.id, clientData.uploadedFiles.companyProofOfAddress, 2, 'Justificatif domicile société', 'Facture d\'électricité, d\'eau ou autre document prouvant l\'adresse de l\'entreprise');
            console.log('Company proof of address uploaded successfully');
          }

          // Upload funds origin declaration if provided
          if (clientData.uploadedFiles.fundsOriginDeclaration) {
            await savingsCustomerService.uploadDocument(selectedCustomer.id, clientData.uploadedFiles.fundsOriginDeclaration, 4, 'Déclaration origine fonds', 'Déclaration d\'origine des fonds');
            console.log('Funds origin declaration uploaded successfully');
          }

          // Upload other documents if provided
          if (clientData.uploadedFiles.otherDocuments && clientData.uploadedFiles.otherDocuments.length > 0) {
            for (let i = 0; i < clientData.uploadedFiles.otherDocuments.length; i++) {
              const doc = clientData.uploadedFiles.otherDocuments[i];
              await savingsCustomerService.uploadDocument(selectedCustomer.id, doc, 4, `Document supplémentaire ${i + 1}`, 'Document supplémentaire');
            }
            console.log('Other documents uploaded successfully');
          }
        } catch (fileError: any) {
          console.error('Error uploading files:', fileError);
          toast.error('Client modifié mais erreur lors de l\'upload des fichiers');
          // Don't fail the entire operation, just warn about file upload issues
        }
      }

      // Save signature if provided
      if (clientData.signature) {
        try {
          await savingsCustomerService.saveSignature(selectedCustomer.id, clientData.signature);
          console.log('Signature saved successfully');
        } catch (signatureError: any) {
          console.error('Error saving signature:', signatureError);
          toast.error('Client modifié mais erreur lors de la sauvegarde de la signature');
          // Don't fail the entire operation, just warn about signature issues
        }
      }

      toast.success('Client modifié avec succès!');
      setShowEditForm(false);
      setSelectedCustomer(null);
      await loadCustomers();
    } catch (error: any) {
      console.error('Erreur lors de la modification du client:', error);
      const errorMessage = error.message || 'Erreur lors de la modification du client';
      toast.error(errorMessage);
    }
  };

  const handleEditCustomer = async (customerId: string) => {
    try {
      const customer = await savingsCustomerService.getCustomer(customerId);
      setSelectedCustomer(customer);
      setShowEditForm(true);
    } catch (error) {
      toast.error('Impossible de charger le client');
    }
  };

  const handleViewCustomerDetails = async (customerId: string) => {
    try {
      const customer = await savingsCustomerService.getCustomer(customerId);
      setSelectedCustomer(customer);
      setShowDetailsView(true);
      toast.success('Détails du client chargés');
    } catch (error) {
      toast.error('Impossible de charger les détails');
    }
  };

  const handleToggleCustomerStatus = async (customerId: string, currentStatus: boolean) => {
    try {
      // Si on veut désactiver, vérifier s'il y a des comptes d'épargne actifs
      if (currentStatus === true) {
        const activeAccounts = await apiService.getSavingsAccounts({ customerId, status: 1 }); // 1 = Active
        if (Array.isArray(activeAccounts) && activeAccounts.length > 0) {
          if (isSuperAdmin) {
            if (window.confirm("Ce client a des comptes actifs. Voulez-vous forcer la désactivation ? (Superadmin seulement)")) {
              await savingsCustomerService.toggleCustomerStatus(customerId, true);
              toast.success("Client désactivé de force (superadmin)");
              await loadCustomers();
            }
          } else {
            toast.error("Client gen kont épargne aktif - ou pa ka dezaktive li");
          }
          return;
        }
      }

      const action = currentStatus ? 'désactivé' : 'activé';
      await savingsCustomerService.toggleCustomerStatus(customerId);
      toast.success(`Client ${action} avec succès!`);
      await loadCustomers();
    } catch (error: any) {
      console.error('Erreur lors du changement de statut:', error);
      const message = error?.response?.data?.message || error.message || 'Erreur lors du changement de statut du client';
      toast.error(message);
    }
  };

  const handleExportClientPDF = (customer: SavingsCustomerResponseDto) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Veuillez autoriser les pop-ups pour exporter en PDF');
      return;
    }

    const documentTypeLabel = (type: SavingsIdentityDocumentType) => {
      switch (type) {
        case SavingsIdentityDocumentType.CIN:
          return 'CIN';
        case SavingsIdentityDocumentType.Passport:
          return 'Passeport';
        case SavingsIdentityDocumentType.DrivingLicense:
          return 'Permis de conduire';
        default:
          return 'Autre';
      }
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Profil Client - ${customer.fullName}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 40px; 
            line-height: 1.6;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
          }
          .header h1 { 
            color: #2563eb; 
            margin: 0;
            font-size: 28px;
          }
          .header p { 
            color: #666; 
            margin: 5px 0;
          }
          .section { 
            margin-bottom: 25px; 
            page-break-inside: avoid;
          }
          .section-title { 
            background: #2563eb; 
            color: white; 
            padding: 8px 12px; 
            margin-bottom: 15px;
            font-weight: bold;
            font-size: 16px;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
          }
          .info-item { 
            padding: 10px; 
            background: #f9fafb;
            border-left: 3px solid #2563eb;
          }
          .info-label { 
            font-weight: bold; 
            color: #555; 
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 3px;
          }
          .info-value { 
            color: #000;
            font-size: 14px;
          }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            color: #666; 
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PROFIL CLIENT</h1>
          <p>Kredi Ti Machann - Système de Micro-crédit</p>
          <p>Date d'émission: ${new Date().toLocaleDateString('fr-FR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>

        <div class="section">
          <div class="section-title">📋 INFORMATIONS PERSONNELLES</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Nom complet</div>
              <div class="info-value">${customer.fullName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Date de naissance</div>
              <div class="info-value">${new Date(customer.dateOfBirth).toLocaleDateString('fr-FR')}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Genre</div>
              <div class="info-value">${genderLabel(customer.gender)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Code Client</div>
              <div class="info-value">${customer.customerCode || customer.id}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">📍 ADRESSE</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Adresse</div>
              <div class="info-value">${customer.address.street}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Commune</div>
              <div class="info-value">${customer.address.commune}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Département</div>
              <div class="info-value">${customer.address.department}</div>
            </div>
            ${customer.address.postalCode ? `
            <div class="info-item">
              <div class="info-label">Code postal</div>
              <div class="info-value">${customer.address.postalCode}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">📞 CONTACT</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Téléphone principal</div>
              <div class="info-value">${customer.contact.primaryPhone}</div>
            </div>
            ${customer.contact.secondaryPhone ? `
            <div class="info-item">
              <div class="info-label">Téléphone secondaire</div>
              <div class="info-value">${customer.contact.secondaryPhone}</div>
            </div>
            ` : ''}
            ${customer.contact.email ? `
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${customer.contact.email}</div>
            </div>
            ` : ''}
            ${customer.contact.emergencyContactName ? `
            <div class="info-item">
              <div class="info-label">Contact d'urgence</div>
              <div class="info-value">${customer.contact.emergencyContactName} - ${customer.contact.emergencyContactPhone || ''}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">🪪 DOCUMENT D'IDENTITÉ</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Type de document</div>
              <div class="info-value">${documentTypeLabel(customer.identity.documentType)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Numéro</div>
              <div class="info-value">${customer.identity.documentNumber}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Date d'émission</div>
              <div class="info-value">${new Date(customer.identity.issuedDate).toLocaleDateString('fr-FR')}</div>
            </div>
            ${customer.identity.expiryDate ? `
            <div class="info-item">
              <div class="info-label">Date d'expiration</div>
              <div class="info-value">${new Date(customer.identity.expiryDate).toLocaleDateString('fr-FR')}</div>
            </div>
            ` : ''}
            <div class="info-item">
              <div class="info-label">Autorité émettrice</div>
              <div class="info-value">${customer.identity.issuingAuthority}</div>
            </div>
          </div>
        </div>

        ${customer.occupation || customer.monthlyIncome ? `
        <div class="section">
          <div class="section-title">💼 INFORMATIONS PROFESSIONNELLES</div>
          <div class="info-grid">
            ${customer.occupation ? `
            <div class="info-item">
              <div class="info-label">Profession</div>
              <div class="info-value">${customer.occupation}</div>
            </div>
            ` : ''}
            ${customer.monthlyIncome ? `
            <div class="info-item">
              <div class="info-label">Revenu mensuel</div>
              <div class="info-value">${new Intl.NumberFormat('fr-FR', { 
                style: 'currency', 
                currency: 'USD' 
              }).format(customer.monthlyIncome).replace('$', 'HTG ')}</div>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <p><strong>Kredi Ti Machann</strong> - Système de Micro-crédit pour Haïti</p>
          <p>Document généré automatiquement le ${new Date().toLocaleString('fr-FR')}</p>
          <p class="no-print">
            <button onclick="window.print()" style="
              background: #2563eb;
              color: white;
              padding: 10px 20px;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
              margin-top: 10px;
            ">🖨️ Imprimer / Enregistrer en PDF</button>
          </p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        toast.success('Fenêtre d\'export ouverte - Utilisez Ctrl+P ou le bouton Imprimer');
      }, 250);
    };
  };

  const filteredCustomers = Array.isArray(customers) ? customers.filter(customer => {
    // Filtre de recherche déjà appliqué par searchCustomers
    
    // Filtre par succursale (vérifier si le client a des comptes dans cette succursale)
    if (filters.branchId) {
      const customerAccount = customerAccounts.find(acc => acc.customerId === customer.id);
      if (!customerAccount || customerAccount.branchId !== parseInt(filters.branchId)) {
        return false;
      }
    }

    // Filtre par statut
    if (filters.status && (customer as any).status !== filters.status) {
      return false;
    }

    // Filtre par date de création
    if (filters.dateFrom || filters.dateTo) {
      const createdDate = new Date((customer as any).createdAt || customer.identity.issuedDate);
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        if (createdDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (createdDate > toDate) return false;
      }
    }

    return true;
  }) : [];

  // Pagination logic
  const totalFiltered = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  // Export helpers (export the filtered list)
  const exportCustomersCSV = () => {
    try {
      const data = filteredCustomers.map(c => ({
        id: c.id,
        customerCode: c.customerCode || '',
        fullName: c.fullName,
        phone: c.contact.primaryPhone,
        email: c.contact.email || '',
        commune: c.address.commune || '',
        department: c.address.department || '',
        status: c.isActive ? 'Actif' : 'Inactif',
        createdAt: c.createdAt || ''
      }));
      const csv = unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients_savings_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportCustomersExcel = () => {
    try {
      const data = filteredCustomers.map(c => ({
        ID: c.id,
        Code: c.customerCode || '',
        Nom: c.fullName,
        Téléphone: c.contact.primaryPhone,
        Email: c.contact.email || '',
        Commune: c.address.commune || '',
        Département: c.address.department || '',
        Statut: c.isActive ? 'Actif' : 'Inactif',
        CrééLe: c.createdAt || ''
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clients');
      XLSX.writeFile(wb, `clients_savings_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  const exportCustomersPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) { toast.error('Veuillez autoriser les pop-ups pour exporter en PDF'); return; }
      const rows = filteredCustomers.map(c => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd">${c.customerCode || c.id}</td>
          <td style="padding:8px;border:1px solid #ddd">${c.fullName}</td>
          <td style="padding:8px;border:1px solid #ddd">${c.contact.primaryPhone}</td>
          <td style="padding:8px;border:1px solid #ddd">${c.contact.email || ''}</td>
          <td style="padding:8px;border:1px solid #ddd">${c.address.commune || ''}</td>
          <td style="padding:8px;border:1px solid #ddd">${c.isActive ? 'Actif' : 'Inactif'}</td>
        </tr>
      `).join('');
      const html = `
        <html><head><meta charset="utf-8"><title>Clients Épargnants</title>
        <style>table{border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif}th,td{border:1px solid #ddd;padding:8px}th{background:#f3f4f6;text-align:left}</style>
        </head><body>
        <h2>Liste Clients Épargnants</h2>
        <p>Exporté le ${new Date().toLocaleString('fr-FR')}</p>
        <table>
          <thead><tr><th>Code</th><th>Nom</th><th>Téléphone</th><th>Email</th><th>Commune</th><th>Statut</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:16px">Imprimez ou enregistrez en PDF via la fenêtre d'impression.</p>
        <script>window.onload = ()=>{ setTimeout(()=>{ window.print(); },300); };</script>
        </body></html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      toast.success('Fenêtre d\'export ouverte - utilisez la fonction Imprimer pour sauver en PDF');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Clients Épargnants</h2>
          <p className="text-gray-600 mt-1">
            Rechercher, filtrer et gérer tous les clients épargnants
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => exportCustomersCSV()}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
              title="Exporter CSV"
            >
              <Download className="h-4 w-4" /> CSV
            </button>
            <button
              onClick={() => exportCustomersExcel()}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
              title="Exporter Excel"
            >
              <Download className="h-4 w-4" /> XLSX
            </button>
            <button
              onClick={() => exportCustomersPDF()}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
              title="Exporter PDF"
            >
              <Download className="h-4 w-4" /> PDF
            </button>
          </div>

          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <UserPlus className="h-5 w-5" />
            <span>Nouveau Client</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone, ou numéro de document..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="mt-3 flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
        >
          <Filter className="h-4 w-4" />
          <span>Filtres avancés</span>
          {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Branch Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Succursale
                </label>
                <select
                  value={filters.branchId}
                  onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Toutes les succursales</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tous les statuts</option>
                  <option value="ACTIVE">Actif</option>
                  <option value="INACTIVE">Inactif</option>
                  <option value="PENDING">En attente</option>
                </select>
              </div>

              {/* Date From Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Date To Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="mt-4 flex items-center space-x-3">
              <button
                onClick={() => setFilters({ branchId: '', status: '', dateFrom: '', dateTo: '' })}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Réinitialiser les filtres
              </button>
              <div className="text-sm text-gray-600">
                {totalFiltered} client{totalFiltered > 1 ? 's' : ''} trouvé{totalFiltered > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adresse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {initialLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-gray-600">Chargement des clients avec comptes d'épargne...</p>
                    </div>
                  </td>
                </tr>
              ) : loading ? (
                // Skeleton rows during incremental loads (e.g., search)
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td className="px-6 py-4">
                      <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-24 bg-gray-100 rounded mt-2 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-40 bg-gray-100 rounded mt-2 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="h-8 w-24 ml-auto bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        {searchTerm 
                          ? 'Aucun client trouvé correspondant à votre recherche'
                          : 'Aucun client avec compte d\'épargne trouvé'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{customer.fullName}</div>
                          <div className="text-sm text-gray-500">
                            ID: {customer.customerCode || customer.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{customer.contact.primaryPhone}</div>
                      {customer.contact.email && (
                        <div className="text-sm text-gray-500">{customer.contact.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {customer.documents && customer.documents.length > 0 ? (
                          <div className="flex flex-col space-y-1">
                            <span className="font-medium">{customer.documents.length} document(s)</span>
                            <div className="flex flex-wrap gap-1">
                              {customer.documents.slice(0, 2).map((doc: any, index: number) => (
                                <span key={index} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  {doc.documentTypeName || doc.documentType || 'Document'}
                                </span>
                              ))}
                              {customer.documents.length > 2 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  +{customer.documents.length - 2} autres
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">Aucun document</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{customer.address.commune}</div>
                      <div className="text-sm text-gray-500">{customer.address.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.isActive ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Actif
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditCustomer(customer.id)}
                          className="text-blue-600 hover:text-blue-900 transition-colors p-2 hover:bg-blue-50 rounded-lg"
                          title="Modifier"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleViewCustomerDetails(customer.id)}
                          className="text-gray-600 hover:text-gray-900 transition-colors p-2 hover:bg-gray-50 rounded-lg"
                          title="Voir les détails"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleExportClientPDF(customer)}
                          className="text-green-600 hover:text-green-900 transition-colors p-2 hover:bg-green-50 rounded-lg"
                          title="Exporter PDF"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalFiltered > 0 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Affichage de{' '}
                <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, totalFiltered)}</span>
                {' '}à{' '}
                <span className="font-medium">{Math.min(currentPage * pageSize, totalFiltered)}</span>
                {' '}sur{' '}
                <span className="font-medium">{totalFiltered}</span>
                {' '}résultats
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="pageSize" className="text-sm text-gray-700">
                  Éléments par page:
                </label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="h-5 w-5 rotate-90" />
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  Page {currentPage} sur {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="h-5 w-5 rotate-90" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Créer un Nouveau Client</h2>
                <p className="text-sm text-gray-600 mt-1">Formulaire complet de création de client épargnant</p>
              </div>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <ClientCreationForm
              onSubmit={handleCreateClient}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditForm && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Modifier Client</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedCustomer.fullName}</p>
              </div>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setSelectedCustomer(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <ClientEditForm
              customer={selectedCustomer}
              onSubmit={handleUpdateClient}
              onCancel={() => {
                setShowEditForm(false);
                setSelectedCustomer(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {showDetailsView && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
              <div className="text-white">
                <h2 className="text-2xl font-bold">{selectedCustomer.fullName}</h2>
                <p className="text-blue-100 mt-1">Code Client: {selectedCustomer.customerCode || selectedCustomer.id}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsView(false);
                  setSelectedCustomer(null);
                }}
                className="p-2 hover:bg-blue-500 rounded-lg transition-colors text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Informations Personnelles */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Informations Personnelles
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Code Client</label>
                    <p className="text-gray-900 font-medium mt-1">{selectedCustomer.customerCode || selectedCustomer.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Prénom</label>
                    <p className="text-gray-900 font-medium mt-1">{selectedCustomer.firstName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nom</label>
                    <p className="text-gray-900 font-medium mt-1">{selectedCustomer.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date de Naissance</label>
                    <p className="text-gray-900 font-medium mt-1">
                      {new Date(selectedCustomer.dateOfBirth).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Genre</label>
                    <p className="text-gray-900 font-medium mt-1">
                      {genderLabel(selectedCustomer.gender)}
                    </p>
                  </div>
                  {selectedCustomer.occupation && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Profession</label>
                      <p className="text-gray-900 font-medium mt-1">{selectedCustomer.occupation}</p>
                    </div>
                  )}
                  {selectedCustomer.monthlyIncome && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Revenu Mensuel</label>
                      <p className="text-gray-900 font-medium mt-1">
                        {selectedCustomer.monthlyIncome.toLocaleString('fr-FR')} HTG
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Adresse */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                  Adresse
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Rue</label>
                    <p className="text-gray-900 font-medium mt-1">{selectedCustomer.address.street}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Commune</label>
                    <p className="text-gray-900 font-medium mt-1">{selectedCustomer.address.commune}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Département</label>
                    <p className="text-gray-900 font-medium mt-1">{selectedCustomer.address.department}</p>
                  </div>
                  {selectedCustomer.address.postalCode && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Code Postal</label>
                      <p className="text-gray-900 font-medium mt-1">{selectedCustomer.address.postalCode}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-blue-600" />
                  Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Téléphone Principal</label>
                    <p className="text-gray-900 font-medium mt-1">{selectedCustomer.contact.primaryPhone}</p>
                  </div>
                  {selectedCustomer.contact.secondaryPhone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Téléphone Secondaire</label>
                      <p className="text-gray-900 font-medium mt-1">{selectedCustomer.contact.secondaryPhone}</p>
                    </div>
                  )}
                  {selectedCustomer.contact.email && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900 font-medium mt-1">{selectedCustomer.contact.email}</p>
                    </div>
                  )}
                  {selectedCustomer.contact.emergencyContactName && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Contact d'Urgence</label>
                        <p className="text-gray-900 font-medium mt-1">{selectedCustomer.contact.emergencyContactName}</p>
                      </div>
                      {selectedCustomer.contact.emergencyContactPhone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Téléphone d'Urgence</label>
                          <p className="text-gray-900 font-medium mt-1">{selectedCustomer.contact.emergencyContactPhone}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Document d'Identité */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Document d'Identité
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Type de Document</label>
                    <p className="text-gray-900 font-medium mt-1">
                      {selectedCustomer.identity.documentType === SavingsIdentityDocumentType.CIN && 'CIN'}
                      {selectedCustomer.identity.documentType === SavingsIdentityDocumentType.Passport && 'Passeport'}
                      {selectedCustomer.identity.documentType === SavingsIdentityDocumentType.DrivingLicense && 'Permis de conduire'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Numéro</label>
                    <p className="text-gray-900 font-medium mt-1">{selectedCustomer.identity.documentNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date d'Émission</label>
                    <p className="text-gray-900 font-medium mt-1">
                      {new Date(selectedCustomer.identity.issuedDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {selectedCustomer.identity.expiryDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date d'Expiration</label>
                      <p className="text-gray-900 font-medium mt-1">
                        {new Date(selectedCustomer.identity.expiryDate).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Autorité Émettrice</label>
                    <p className="text-gray-900 font-medium mt-1">{selectedCustomer.identity.issuingAuthority}</p>
                  </div>
                </div>
              </div>

              {/* Statut */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Statut du Compte</h3>
                <div className="flex items-center space-x-4">
                  <span className={`px-4 py-2 rounded-full font-semibold ${
                    selectedCustomer.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedCustomer.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  <div className="text-sm text-gray-600">
                    Créé le {new Date(selectedCustomer.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-between">
              <button
                onClick={() => handleExportClientPDF(selectedCustomer)}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-5 w-5" />
                <span>Exporter en PDF</span>
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDetailsView(false);
                    setSelectedCustomer(selectedCustomer);
                    setShowEditForm(true);
                  }}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="h-5 w-5" />
                  <span>Modifier</span>
                </button>
                <button
                  onClick={() => {
                    setShowDetailsView(false);
                    setSelectedCustomer(null);
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsCustomerManagement;


