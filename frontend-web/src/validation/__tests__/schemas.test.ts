import { describe, it, expect } from '@jest/globals';
import { createClientSchemaZ, loginSchema } from '../schemas';

describe('validation/schemas', () => {
  it('validates login schema happy path', () => {
    const data = { email: 'user@example.com', password: 'secret123', rememberMe: true };
    const res = loginSchema.safeParse(data);
    expect(res.success).toBe(true);
  });

  it('rejects invalid login email', () => {
    const data = { email: 'bad', password: 'secret123' } as any;
    const res = loginSchema.safeParse(data);
    expect(res.success).toBe(false);
  });

  it('createClientSchemaZ (individual) requires firstName/lastName/dateOfBirth/gender', () => {
    const schema = createClientSchemaZ(false);
    const good = {
      street: '123 Rue',
      commune: 'Commune',
      department: 'Ouest',
      primaryPhone: '+50937123456',
      email: 'a@b.com',
      documentType: 0, // CIN
      documentNumber: 'ABC12345',
      issuedDate: '2024-01-01',
      issuingAuthority: 'ONI',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      gender: 'M',
      acceptTerms: true,
      signaturePlace: 'PAP',
      signatureDate: '2024-01-01'
    };
    expect(schema.safeParse(good).success).toBe(true);

    const missing = { ...good } as any;
    delete missing.firstName;
    expect(schema.safeParse(missing).success).toBe(false);

    const missingDoc = { ...good } as any;
    delete missingDoc.documentType;
    expect(schema.safeParse(missingDoc).success).toBe(false);
  });

  it('createClientSchemaZ (business) requires company and representative fields, not individual ones', () => {
    const schema = createClientSchemaZ(true);
    const good = {
      street: '123 Rue',
      commune: 'Commune',
      department: 'Ouest',
      primaryPhone: '+50937123456',
      email: 'corp@example.com',
      // Required document fields for business
      documentType: 3, // TradeRegister
      documentNumber: 'RCC-12345',
      issuedDate: '2024-01-01',
      issuingAuthority: 'Chambre de Commerce',
      // Business specific
      companyName: 'ACME SA',
      legalForm: 'SA',
      headOfficeAddress: 'HQ Address',
      companyPhone: '+50938123456',
      companyEmail: 'contact@acme.com',
      legalRepresentativeName: 'Marie Pierre',
      legalRepresentativeTitle: 'Directeur Général',
      legalRepresentativeDocumentType: 'CIN',
      legalRepresentativeDocumentNumber: 'X12345',
      legalRepresentativeIssuedDate: '2024-01-01',
      legalRepresentativeIssuingAuthority: 'ONI',
      // Confirmation
      acceptTerms: true,
      signaturePlace: 'PAP',
      signatureDate: '2024-01-01'
    };
    const r = schema.safeParse(good);
    expect(r.success).toBe(true);

    const missingRep = { ...good } as any;
    delete missingRep.legalRepresentativeName;
    expect(schema.safeParse(missingRep).success).toBe(false);

    const missingDoc = { ...good } as any;
    delete missingDoc.documentType;
    expect(schema.safeParse(missingDoc).success).toBe(false);
  });
});
