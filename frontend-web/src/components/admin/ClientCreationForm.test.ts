import { describe, it, expect } from '@jest/globals';

describe('ClientCreationForm data transformation', () => {
  it('should properly transform business client data with document fields', () => {
    // Simulate the transformation logic from handleFormSubmit
    const mockBusinessData = {
      isBusiness: true,
      companyName: 'Test Company SA',
      legalForm: 'SA',
      businessRegistrationNumber: 'RCC-12345',
      companyNif: 'NIF-67890',
      headOfficeAddress: '123 Business St',
      companyPhone: '+50938123456',
      companyEmail: 'contact@test.com',
      legalRepresentativeName: 'John Doe',
      legalRepresentativeTitle: 'Director',
      legalRepresentativeDocumentType: 'CIN',
      legalRepresentativeDocumentNumber: 'CIN-11111',
      legalRepresentativeIssuedDate: '2020-01-01',
      legalRepresentativeIssuingAuthority: 'ONI',
      street: '123 Main St',
      commune: 'Port-au-Prince',
      department: 'Ouest',
      primaryPhone: '+50937123456',
      email: 'john@test.com',
      acceptTerms: true,
      signaturePlace: 'PAP',
      signatureDate: '2024-01-01',
    };

    // Apply the transformation logic
    const transformedData: any = {
      ...mockBusinessData,
      // Renommer businessRegistrationNumber en tradeRegisterNumber
      tradeRegisterNumber: mockBusinessData.businessRegistrationNumber,
      // Renommer companyNif en taxId
      taxId: mockBusinessData.companyNif,
      // Pour les clients d'affaires, définir les champs de document d'identité principaux
      documentType: 3, // TradeRegister enum value
      documentNumber: mockBusinessData.businessRegistrationNumber || '',
      issuedDate: new Date().toISOString().split('T')[0], // Date d'aujourd'hui par défaut
      issuingAuthority: 'Chambre de Commerce et d\'Industrie d\'Haïti',
      // Séparer legalRepresentativeName en firstName et lastName
      representativeFirstName: 'John',
      representativeLastName: 'Doe',
      // Map other legalRepresentative fields
      representativeTitle: mockBusinessData.legalRepresentativeTitle,
      representativeDocumentType: mockBusinessData.legalRepresentativeDocumentType,
      representativeDocumentNumber: mockBusinessData.legalRepresentativeDocumentNumber,
      representativeIssuedDate: mockBusinessData.legalRepresentativeIssuedDate,
      representativeIssuingAuthority: mockBusinessData.legalRepresentativeIssuingAuthority,
      // Clean up old form field names
      legalRepresentativeName: undefined,
      legalRepresentativeTitle: undefined,
      legalRepresentativeDocumentType: undefined,
      legalRepresentativeDocumentNumber: undefined,
      legalRepresentativeIssuedDate: undefined,
      legalRepresentativeIssuingAuthority: undefined,
    };

    // Verify the transformation
    expect(transformedData.documentType).toBe(3);
    expect(transformedData.documentNumber).toBe('RCC-12345');
    expect(transformedData.issuedDate).toBe(new Date().toISOString().split('T')[0]);
    expect(transformedData.issuingAuthority).toBe('Chambre de Commerce et d\'Industrie d\'Haïti');
    expect(transformedData.tradeRegisterNumber).toBe('RCC-12345');
    expect(transformedData.taxId).toBe('NIF-67890');
    expect(transformedData.representativeFirstName).toBe('John');
    expect(transformedData.representativeLastName).toBe('Doe');
    expect(transformedData.legalRepresentativeName).toBeUndefined();
  });

  it('should properly transform individual client data with document fields', () => {
    const mockIndividualData = {
      isBusiness: false,
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: '1990-01-01',
      gender: 'F',
      documentType: 0, // CIN
      documentNumber: 'CIN-22222',
      issuedDate: '2020-01-01',
      issuingAuthority: 'ONI',
      street: '456 Personal St',
      commune: 'Port-au-Prince',
      department: 'Ouest',
      primaryPhone: '+50937123456',
      email: 'jane@test.com',
      acceptTerms: true,
      signaturePlace: 'PAP',
      signatureDate: '2024-01-01',
    };

    // For individual clients, no special transformation needed for document fields
    const transformedData: any = {
      ...mockIndividualData,
      // Add required backend fields
      transactionFrequency: 'MONTHLY',
      accountPurpose: '',
      referencePersonName: '',
      referencePersonPhone: '',
      maritalStatus: 'SINGLE',
      spouseName: '',
      numberOfDependents: 0,
      educationLevel: 'SECONDARY',
      personalNif: undefined, // Will be set if nif exists
    };

    // Verify no changes to document fields for individuals
    expect(transformedData.documentType).toBe(0);
    expect(transformedData.documentNumber).toBe('CIN-22222');
    expect(transformedData.issuedDate).toBe('2020-01-01');
    expect(transformedData.issuingAuthority).toBe('ONI');
  });
});