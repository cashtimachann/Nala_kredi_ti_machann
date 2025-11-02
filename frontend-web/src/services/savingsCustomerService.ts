import axios from 'axios';
import { BaseApiService } from './base/BaseApiService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Interface pour les types backend
export enum SavingsGender {
  Male = 0,
  Female = 1
}

export enum SavingsIdentityDocumentType {
  CIN = 0,          // Carte d'Identité Nationale
  Passport = 1,
  DrivingLicense = 2,
  BirthCertificate = 3
}

export enum SavingsCustomerDocumentType {
  IdentityCard = 0,
  ProofOfResidence = 1,
  ProofOfIncome = 2,
  Photo = 3,
  Other = 4
}

// Interface pour dokiman kliyan
export interface SavingsCustomerDocumentResponseDto {
  id: string;
  customerId: string;
  documentType: SavingsCustomerDocumentType;
  documentTypeName: string;
  name: string;
  description?: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  downloadUrl?: string;
}

// DTO pour la création de client
export interface SavingsCustomerCreateDto {
  // Identité de base
  customerCode?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // Format: YYYY-MM-DD (obligatoire côté backend, fournir une date valide même pour PM)
  gender: SavingsGender;

  // Adresse
  street: string;
  commune: string;
  department: string;
  postalCode?: string;

  // Contact
  primaryPhone: string;
  secondaryPhone?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  // Document d'identité (client ou représentant légal si PM)
  documentType: SavingsIdentityDocumentType;
  documentNumber: string;
  issuedDate: string; // Format: YYYY-MM-DD
  expiryDate?: string; // Format: YYYY-MM-DD
  issuingAuthority: string;

  // Informations professionnelles (PP ou générales)
  occupation?: string;
  monthlyIncome?: number;

  // Champs Personne Morale (PM)
  isBusiness?: boolean; // backend: IsBusiness (bool)
  companyName?: string;
  legalForm?: string;
  tradeRegisterNumber?: string; // Registre de commerce
  taxId?: string; // NIF entreprise
  headOfficeAddress?: string;
  companyPhone?: string;
  companyEmail?: string;

  // Représentant légal (PM)
  representativeFirstName?: string;
  representativeLastName?: string;
  representativeTitle?: string;
  representativeDocumentType?: SavingsIdentityDocumentType;
  representativeDocumentNumber?: string;
  representativeIssuedDate?: string; // YYYY-MM-DD
  representativeExpiryDate?: string; // YYYY-MM-DD
  representativeIssuingAuthority?: string;

  // Informations personnelles additionnelles (PP)
  birthPlace?: string;
  nationality?: string;
  personalNif?: string;

  // Informations pro étendues
  employerName?: string;
  workAddress?: string;
  incomeSource?: string;

  // Famille / social
  maritalStatus?: string;
  numberOfDependents?: number;
  educationLevel?: string;

  // Déclaration / signature
  acceptTerms?: boolean;
  signaturePlace?: string;
  signatureDate?: string; // YYYY-MM-DD

  // Référence
  referencePersonName?: string;
  referencePersonPhone?: string;
}

// Interface pour la réponse
export interface SavingsCustomerResponseDto {
  id: string;
  customerCode?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: SavingsGender;
  address: {
    street: string;
    commune: string;
    department: string;
    country: string;
    postalCode?: string;
  };
  contact: {
    primaryPhone: string;
    secondaryPhone?: string;
    email?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  };
  identity: {
    documentType: SavingsIdentityDocumentType;
    documentNumber: string;
    issuedDate: string;
    expiryDate?: string;
    issuingAuthority: string;
  };
  // Business / Personne Morale fields
  isBusiness?: boolean;
  companyName?: string;
  legalForm?: string;
  tradeRegisterNumber?: string;
  taxId?: string;
  headOfficeAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  representativeFirstName?: string;
  representativeLastName?: string;
  representativeTitle?: string;
  representativeDocumentNumber?: string;
  representativeIssuedDate?: string;
  representativeExpiryDate?: string;
  representativeIssuingAuthority?: string;
  // Convenience legacy field used by some UI codepaths
  legalRepresentativeName?: string;
  // Nested legal representative object for normalized frontend usage
  legalRepresentative?: {
    firstName?: string;
    lastName?: string;
    title?: string;
    documentType?: SavingsIdentityDocumentType | number;
    documentNumber?: string;
    issuedDate?: string;
    expiryDate?: string;
    issuingAuthority?: string;
  };
  occupation?: string;
  monthlyIncome?: number;
  signature?: string; // Base64 encoded signature
  documents?: SavingsCustomerDocumentResponseDto[]; // Lis dokiman
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Service pour gérer les clients d'épargne
// Tiny read-only API leveraging BaseApiService to get opt-in GET caching
class ReadonlySavingsApi extends BaseApiService {
  constructor(resourceBaseUrl: string) {
    super(process.env.REACT_APP_API_URL || 'http://localhost:5000/api');
    // Override baseURL to the resource for convenience when passing relative URLs
    (this as any).api.defaults.baseURL = resourceBaseUrl;
  }
  public async getJson<T>(url: string, config?: any): Promise<T> {
    return this.get<T>(url, config as any);
  }
}

class SavingsCustomerService {
  private baseUrl = `${API_BASE_URL}/SavingsCustomer`;
  private ro: ReadonlySavingsApi;

  constructor() {
    this.ro = new ReadonlySavingsApi(this.baseUrl);
  }

  // Normalize a phone number to Haitian E.164 format expected by backend (+509XXXXXXXX)
  private normalizePhoneForApi(raw: string): string {
    if (!raw) return raw;
    // Keep digits only
    const digits = (raw || '').replace(/\D+/g, '');
    // Already +509XXXXXXXX
    if (raw.startsWith('+509') && digits.length === 11) return `+${digits}`;
    // 509XXXXXXXX (10 digits)
    if (digits.length === 10 && digits.startsWith('509')) return `+${digits}`;
    // XXXXXXXX (8 digits)
    if (digits.length === 8) return `+509${digits}`;
    // Fallback: if it already starts with + and has digits, return as-is; else return original raw
    return raw.startsWith('+') ? raw : `+${digits}`;
  }

  // Obtenir le token d'authentification
  private getAuthToken(): string {
    return localStorage.getItem('token') || '';
  }

  // Headers avec authentification
  private getAuthHeaders() {
    return {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    };
  }

  // Normaliser certaines incohérences de casse côté backend (Id vs id)
  private normalizeCustomer<T = SavingsCustomerResponseDto>(dto: any): T {
    if (!dto) return dto as T;

    // Harmonize common casing differences
    if (dto.Id && !dto.id) dto.id = dto.Id;
    if (dto.CustomerCode && !dto.customerCode) dto.customerCode = dto.CustomerCode;

    // Compute fullName when missing or invalid
    const firstName = dto.firstName ?? dto.FirstName ?? '';
    const lastName = dto.lastName ?? dto.LastName ?? '';
    const computedFullName = `${firstName || ''} ${lastName || ''}`.trim();
    if (!dto.fullName || dto.fullName === 'undefined undefined' || dto.fullName === ' ') {
      dto.fullName = computedFullName;
    }

    // Normalize nested address
    const address = dto.address || {
      street: dto.street || '',
      commune: dto.commune || '',
      department: dto.department || '',
      country: dto.country || 'Haïti',
      postalCode: dto.postalCode || undefined
    };
    dto.address = {
      street: address.street || dto.street || '',
      commune: address.commune || dto.commune || '',
      department: address.department || dto.department || '',
      country: address.country || dto.country || 'Haïti',
      postalCode: address.postalCode || dto.postalCode || undefined
    };

    // Normalize nested contact
    const contact = dto.contact || {
      primaryPhone: dto.primaryPhone || '',
      secondaryPhone: dto.secondaryPhone || undefined,
      email: dto.email || undefined,
      emergencyContactName: dto.emergencyContactName || undefined,
      emergencyContactPhone: dto.emergencyContactPhone || undefined
    };
    dto.contact = {
      primaryPhone: contact.primaryPhone || dto.primaryPhone || '',
      secondaryPhone: contact.secondaryPhone || dto.secondaryPhone || undefined,
      email: contact.email || dto.email || undefined,
      emergencyContactName: contact.emergencyContactName || dto.emergencyContactName || undefined,
      emergencyContactPhone: contact.emergencyContactPhone || dto.emergencyContactPhone || undefined
    };

    // Normalize nested identity
    const identity = dto.identity || {
      documentType: dto.documentType ?? 0,
      documentNumber: dto.documentNumber || '',
      issuedDate: dto.issuedDate || '',
      expiryDate: dto.expiryDate || undefined,
      issuingAuthority: dto.issuingAuthority || ''
    };
    dto.identity = {
      documentType: identity.documentType ?? dto.documentType ?? 0,
      documentNumber: identity.documentNumber || dto.documentNumber || '',
      issuedDate: identity.issuedDate || dto.issuedDate || '',
      expiryDate: identity.expiryDate || dto.expiryDate || undefined,
      issuingAuthority: identity.issuingAuthority || dto.issuingAuthority || ''
    };

    // Defaults
    if (dto.isActive === undefined || dto.isActive === null) dto.isActive = true;
    dto.createdAt = dto.createdAt || new Date().toISOString();
    dto.updatedAt = dto.updatedAt || dto.createdAt;

    // Normalize gender into numeric enum (0 = Male, 1 = Female)
    const parseGender = (g: any): SavingsGender => {
      if (g === undefined || g === null || g === '') return SavingsGender.Male;
      if (typeof g === 'number') return (g === 1 ? SavingsGender.Female : SavingsGender.Male);
      const s = String(g).trim().toLowerCase();
      if (s === 'm' || s === 'male' || s === 'masculin' || s === 'gason') return SavingsGender.Male;
      if (s === 'f' || s === 'female' || s === 'feminin' || s === 'fanm') return SavingsGender.Female;
      const n = Number(s);
      if (!isNaN(n)) return n === 1 ? SavingsGender.Female : SavingsGender.Male;
      return SavingsGender.Male;
    };

    dto.gender = parseGender(dto.gender ?? dto.Gender ?? dto.Gender ?? dto.gender);

    // Debug: minimal safe log (avoid noisy logs in production builds)
    if (firstName || lastName) {
      console.debug?.('📋 Customer normalized:', {
        id: dto.id,
        fullName: dto.fullName,
        phone: dto.contact?.primaryPhone,
      });
    }

    return dto as T;
  }

  /**
   * Créer un nouveau client d'épargne
   */
  async createCustomer(customerData: SavingsCustomerCreateDto): Promise<SavingsCustomerResponseDto> {
    try {
      // Send JSON body; backend expects application/json for create
      const response = await axios.post<SavingsCustomerResponseDto>(
        this.baseUrl,
        customerData,
        this.getAuthHeaders()
      );
      return this.normalizeCustomer(response.data);
    } catch (error: any) {
      console.error('Error creating customer:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtenir un client par ID
   */
  async getCustomer(id: string): Promise<SavingsCustomerResponseDto> {
    try {
      // Cache briefly to smooth repeated reads after create/update flows
      const data = await this.ro.getJson<SavingsCustomerResponseDto>(`/${id}`, {
        headers: { 'x-cache-ttl': 30_000 },
      });
      return this.normalizeCustomer(data);
    } catch (error: any) {
      console.error('Error fetching customer:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Rechercher un client par numéro de téléphone
   */
  async getCustomerByPhone(phone: string): Promise<SavingsCustomerResponseDto | null> {
    try {
      const normalized = this.normalizePhoneForApi(phone);
      const encoded = encodeURIComponent(normalized);
      const data = await this.ro.getJson<SavingsCustomerResponseDto>(`/by-phone/${encoded}`, {
        headers: { 'x-cache-ttl': 60_000 },
      });
      return this.normalizeCustomer(data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching customer by phone:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Rechercher un client par document
   */
  async getCustomerByDocument(
    documentType: SavingsIdentityDocumentType,
    documentNumber: string
  ): Promise<SavingsCustomerResponseDto | null> {
    try {
      const data = await this.ro.getJson<SavingsCustomerResponseDto>(`/by-document`, {
        params: { documentType, documentNumber },
        headers: { 'x-cache-ttl': 60_000 },
      });
      return this.normalizeCustomer(data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching customer by document:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Rechercher des clients
   */
  async searchCustomers(searchTerm: string): Promise<SavingsCustomerResponseDto[]> {
    try {
      // Short TTL to dedupe rapid repeated searches
      const data = await this.ro.getJson<SavingsCustomerResponseDto[]>(`/search`, {
        params: { searchTerm },
        headers: { 'x-cache-ttl': 15_000 },
      });
      return (data || []).map((c: any) => this.normalizeCustomer(c));
    } catch (error: any) {
      console.error('Error searching customers:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtenir tous les clients (avec pagination)
   */
  async getAllCustomers(page: number = 1, pageSize: number = 50): Promise<SavingsCustomerResponseDto[]> {
    try {
      const data = await this.ro.getJson<SavingsCustomerResponseDto[]>(`/`, {
        params: { page, pageSize },
        headers: { 'x-cache-ttl': 30_000 },
      });
      return (data || []).map((c: any) => this.normalizeCustomer(c));
    } catch (error: any) {
      console.error('Error getting all customers:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Vérifier l'unicité d'un numéro de téléphone
   */
  async checkPhoneUnique(phone: string, excludeCustomerId?: string): Promise<{
    phone: string;
    isUnique: boolean;
    existingCustomerId?: string;
    existingCustomerName?: string;
  }> {
    try {
      const normalized = this.normalizePhoneForApi(phone);
      const response = await axios.get(
        `${this.baseUrl}/check-phone-unique`,
        {
          ...this.getAuthHeaders(),
          params: { phone: normalized, excludeCustomerId }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error checking phone uniqueness:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Vérifier l'unicité d'un document
   */
  async checkDocumentUnique(
    documentType: SavingsIdentityDocumentType,
    documentNumber: string,
    excludeCustomerId?: string
  ): Promise<{
    documentType: SavingsIdentityDocumentType;
    documentNumber: string;
    isUnique: boolean;
    existingCustomerId?: string;
    existingCustomerName?: string;
  }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/check-document-unique`,
        {
          ...this.getAuthHeaders(),
          params: { documentType, documentNumber, excludeCustomerId }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error checking document uniqueness:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Valider un client
   */
  async validateCustomer(id: string): Promise<{
    customerId: string;
    isValid: boolean;
    validationDate: string;
    message: string;
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${id}/validate`,
        {},
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error validating customer:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Gérer les erreurs
   */
  private handleError(error: any): Error {
    if (error.response) {
      // Erreur de réponse du serveur
      const data = error.response.data || {};
      if (data.errors && typeof data.errors === 'object') {
        const details: string[] = [];
        Object.entries<any>(data.errors).forEach(([field, msgs]) => {
          if (Array.isArray(msgs)) {
            msgs.forEach(m => details.push(`${field}: ${m}`));
          } else if (typeof msgs === 'string') {
            details.push(`${field}: ${msgs}`);
          }
        });
        if (details.length) {
          return new Error(details.join('\n'));
        }
      }
      const message = data.message || data.title || error.response.statusText || 'Requête invalide';
      return new Error(message);
    } else if (error.request) {
      // Pas de réponse du serveur
      return new Error('Aucune réponse du serveur. Vérifiez votre connexion.');
    } else {
      // Autre erreur
      return new Error(error.message || 'Une erreur inattendue s\'est produite');
    }
  }

  /**
   * Upload des fichiers (photo, documents)
   */
  async uploadFile(file: File, customerId: string, fileType: 'photo' | 'idDocument' | 'proofOfResidence' | 'signature'): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('customerId', customerId);
      formData.append('fileType', fileType);

      const response = await axios.post(
        `${API_BASE_URL}/FileUpload/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data.fileUrl;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Upload une signature en base64
   */
  async uploadSignature(base64Data: string, customerId: string): Promise<string> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/FileUpload/upload-signature`,
        {
          base64Data: base64Data,
          customerId: customerId
        },
        this.getAuthHeaders()
      );

      return response.data.fileUrl;
    } catch (error: any) {
      console.error('Error uploading signature:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Mettre à jour un client
   */
  async updateCustomer(id: string, customerData: SavingsCustomerCreateDto): Promise<SavingsCustomerResponseDto> {
    try {
      const response = await axios.put<SavingsCustomerResponseDto>(
        `${this.baseUrl}/${id}`,
        customerData,
        this.getAuthHeaders()
      );
      // Ensure we return a normalized DTO so callers always receive numeric enums (gender, etc.)
      return this.normalizeCustomer(response.data);
    } catch (error: any) {
      console.error('Error updating customer:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Activer/Désactiver un client
   */
  /**
   * Activer/Désactiver un client, avec option force pour superadmin
   */
  async toggleCustomerStatus(id: string, force?: boolean): Promise<SavingsCustomerResponseDto> {
    // Accept synthetic ids like "phone-+509XXXXXXXX" by resolving to real customer id first
    const tryToggle = async (realId: string, forceFlag?: boolean) => {
      const url = forceFlag
        ? `${this.baseUrl}/${realId}/toggle-status?force=true`
        : `${this.baseUrl}/${realId}/toggle-status`;
      const response = await axios.patch<SavingsCustomerResponseDto>(
        url,
        {},
        this.getAuthHeaders()
      );
      return this.normalizeCustomer(response.data);
    };

    const resolveIdFromPhone = async (raw: string) => {
      const phoneRaw = raw.toLowerCase().startsWith('phone-') ? raw.substring(6) : raw;
      const customer = await this.getCustomerByPhone(phoneRaw);
      if (!customer) {
        throw new Error('Client introuvable');
      }
      return customer.id;
    };

    try {
      // If id looks like a synthetic phone-based id, resolve first
      if (typeof id === 'string' && id.toLowerCase().startsWith('phone-')) {
        const realId = await resolveIdFromPhone(id);
        return await tryToggle(realId, force);
      }

      try {
        return await tryToggle(id, force);
      } catch (err: any) {
        // If not found and id is actually a phone, try resolving by phone then retry
        const is404 = err?.response?.status === 404;
        const hasPhonePattern = typeof id === 'string' && (/\+?509/).test(id) || /\d{8,11}/.test(id);
        if (is404 && hasPhonePattern) {
          const realId = await resolveIdFromPhone(id);
          return await tryToggle(realId, force);
        }
        throw err;
      }
    } catch (error: any) {
      console.error('Error toggling customer status:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtenir les fichiers d'un client
   */
  async getCustomerFiles(customerId: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/FileUpload/customer/${customerId}`,
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching customer files:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Convertir une image base64 en blob pour l'upload
   */
  static base64ToBlob(base64: string, mimeType: string = 'image/png'): Blob {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type: mimeType });
  }

  /**
   * Convertir le genre de l'interface frontend vers backend
   */
  static convertGender(gender: string): SavingsGender {
    return gender.toLowerCase() === 'male' || gender.toLowerCase() === 'gason' 
      ? SavingsGender.Male 
      : SavingsGender.Female;
  }

  /**
   * Convertir le type de document de l'interface frontend vers backend
   */
  static convertDocumentType(type: string): SavingsIdentityDocumentType {
    const typeMap: { [key: string]: SavingsIdentityDocumentType } = {
      'CIN': SavingsIdentityDocumentType.CIN,
      'PASSPORT': SavingsIdentityDocumentType.Passport,
      'DRIVING_LICENSE': SavingsIdentityDocumentType.DrivingLicense,
      'BIRTH_CERTIFICATE': SavingsIdentityDocumentType.BirthCertificate
    };
    return typeMap[type.toUpperCase()] || SavingsIdentityDocumentType.CIN;
  }

  /**
   * Upload yon dokiman pou yon kliyan
   */
  async uploadDocument(
    customerId: string, 
    file: File, 
    documentType: SavingsCustomerDocumentType,
    name: string,
    description?: string
  ): Promise<SavingsCustomerDocumentResponseDto> {
    try {
      const formData = new FormData();
      formData.append('File', file);
      formData.append('DocumentType', documentType.toString());
      formData.append('Name', name);
      if (description) {
        formData.append('Description', description);
      }

      const response = await axios.post<SavingsCustomerDocumentResponseDto>(
        `${this.baseUrl}/${customerId}/documents`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Jwenn tout dokiman pou yon kliyan
   */
  async getCustomerDocuments(customerId: string): Promise<SavingsCustomerDocumentResponseDto[]> {
    try {
      const response = await axios.get<SavingsCustomerDocumentResponseDto[]>(
        `${this.baseUrl}/${customerId}/documents`,
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Telechaje yon dokiman
   */
  async downloadDocument(customerId: string, documentId: string): Promise<Blob> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${customerId}/documents/${documentId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
          },
          responseType: 'blob'
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error downloading document:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Sipoze yon dokiman
   */
  async deleteDocument(customerId: string, documentId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/${customerId}/documents/${documentId}`,
        this.getAuthHeaders()
      );
    } catch (error: any) {
      console.error('Error deleting document:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Sove siyati kliyan
   */
  async saveSignature(customerId: string, signatureData: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/${customerId}/signature`,
        { SignatureData: signatureData },
        this.getAuthHeaders()
      );
    } catch (error: any) {
      console.error('Error saving signature:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Jwenn siyati kliyan
   */
  async getSignature(customerId: string): Promise<string | null> {
    try {
      const response = await axios.get<{ signature: string }>(
        `${this.baseUrl}/${customerId}/signature`,
        this.getAuthHeaders()
      );
      return response.data.signature;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Pa gen siyati
      }
      console.error('Error fetching signature:', error);
      throw this.handleError(error);
    }
  }
}

export const savingsCustomerService = new SavingsCustomerService();
export default savingsCustomerService;
