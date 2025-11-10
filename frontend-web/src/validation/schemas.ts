import { z } from 'zod';
import { BranchStatus, DayOfWeek } from '../types/branch';

// Login schema with French messages (single error per field)
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Veuillez saisir votre email')
    .refine((val) => {
      if (!val || val.trim().length === 0) return true; // empty handled by min
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val);
    }, { message: 'Email invalide' }),
  password: z
    .string()
    .min(1, 'Veuillez saisir votre mot de passe')
    .refine((val) => {
      if (!val || val.length === 0) return true; // empty handled by min
      return val.length >= 6;
    }, { message: 'Le mot de passe doit contenir au moins 6 caractères' }),
  rememberMe: z.boolean().optional(),
});

export type LoginFormDataZ = z.infer<typeof loginSchema>;

// Coerced number helper
const num = (min?: number, max?: number) => {
  let schema = z.coerce.number();
  if (min !== undefined) schema = schema.min(min);
  if (max !== undefined) schema = schema.max(max);
  return schema;
};

// Phone validation helper for Haitian numbers
const haitiPhoneRegex = /^(\+?509\s?)?[234579]\d{7}$/;

export const branchSchema = z.object({
  name: z.string().min(3, 'Minimum 3 caractères').nonempty("Le nom de la succursale est requis"),
  code: z.string().min(2, 'Minimum 2 caractères').nonempty('Le code succursale est requis'),
  address: z.string().nonempty("L'adresse est requise"),
  commune: z.string().nonempty('La commune est requise'),
  department: z.string().nonempty('Le département est requis'),
  phone1: z.string()
    .nonempty('Au moins un téléphone est requis')
    .regex(haitiPhoneRegex, 'Format de numéro haïtien invalide'),
  phone2: z.string()
    .optional()
    .default('')
    .refine((val) => !val || haitiPhoneRegex.test(val), 'Format de numéro haïtien invalide'),
  phone3: z.string()
    .optional()
    .default('')
    .refine((val) => !val || haitiPhoneRegex.test(val), 'Format de numéro haïtien invalide'),
  email: z.string().email('Email invalide'),
  openingDate: z.string().nonempty("La date d'ouverture est requise"),
  managerId: z.string().optional(),
  maxEmployees: num(1, 100),
  status: z.nativeEnum(BranchStatus),
  dailyWithdrawalLimit: num(0),
  dailyDepositLimit: num(0),
  maxLocalCreditApproval: num(0),
  minCashReserveHTG: num(0),
  minCashReserveUSD: num(0),
  openTime: z.string().nonempty("Heure d'ouverture requise"),
  closeTime: z.string().nonempty('Heure de fermeture requise'),
  closedDays: z.array(z.nativeEnum(DayOfWeek)).optional().default([]),
});

export type BranchFormDataZ = z.infer<typeof branchSchema>;

// Dynamic client creation schema (Personne Physique vs Personne Morale)
export const createClientSchemaZ = (isBusiness: boolean) =>
  z.object({
    // Common fields
    street: z.string().min(5, "L'adresse doit contenir au moins 5 caractères"),
    commune: z.string().min(1, 'La commune est obligatoire'),
    department: z.string().min(1, 'Le département est obligatoire'),
    primaryPhone: z
      .string()
      .regex(/^(\+509\s?)?[234579]\d{7}$/i, 'Format de numéro haïtien invalide (ex: +509 3712 3456)'),
    email: z.string().email("Format d'email invalide").optional(),

    documentType: isBusiness ? z.string().optional() : z.string().min(1, 'Le type de document est obligatoire'),
    documentNumber: isBusiness ? z.string().optional() : z.string().min(5, 'Le numéro de document doit contenir au moins 5 caractères'),
    issuedDate: isBusiness ? z.string().optional() : z.string().min(1, "La date d'émission est obligatoire"),
    issuingAuthority: isBusiness ? z.string().optional() : z.string().min(1, "L'autorité d'émission est obligatoire"),

    // Confirmation step
    acceptTerms: z.boolean().refine((v) => v === true, 'Vous devez accepter les conditions'),
    signaturePlace: z.string().min(1, 'Le lieu de signature est obligatoire'),
    signatureDate: z.string().min(1, 'La date de signature est obligatoire'),

    // Conditional fields
    ...(isBusiness
      ? {
          companyName: z.string().min(2, 'La raison sociale doit contenir au moins 2 caractères'),
          legalForm: z.string().min(1, 'La forme juridique est obligatoire'),
          headOfficeAddress: z.string().min(1, "L'adresse du siège social est obligatoire"),
          companyPhone: z.string().min(1, "Le téléphone de l'entreprise est obligatoire"),
          companyEmail: z.string().email("Format d'email invalide"),
          legalRepresentativeName: z.string().min(1, 'Nom du représentant obligatoire'),
          legalRepresentativeTitle: z.string().min(1, 'Titre du représentant obligatoire'),
          legalRepresentativeDocumentType: z.string().min(1, 'Type de document du représentant obligatoire'),
          legalRepresentativeDocumentNumber: z
            .string()
            .min(5, 'Le numéro de document doit contenir au moins 5 caractères'),
          legalRepresentativeIssuedDate: z.string().min(1, "La date d'émission du document est obligatoire"),
          legalRepresentativeExpiryDate: z.string().optional().nullable(),
          legalRepresentativeIssuingAuthority: z.string().min(1, "L'autorité d'émission est obligatoire"),
        }
      : {
          firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
          lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
          dateOfBirth: z.string().min(1, 'La date de naissance est obligatoire'),
          gender: z.string().regex(/^(M|F)$/),
        }),
  });
