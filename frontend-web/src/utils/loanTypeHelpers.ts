import { LoanType } from '../types/microcredit';
import {
  ShoppingCart, Leaf, User, AlertCircle, Home, Car,
  Bike, Users, BookOpen, Sprout, Briefcase,
  HandMetal, Building
} from 'lucide-react';

export interface LoanTypeInfo {
  type: LoanType;
  name: string;
  description: string;
  icon: any; // Lucide React icon component
  color: string;
  bgColor: string;
  requiresCollateral: boolean;
  defaultMinAmount: number;
  defaultMaxAmount: number;
  defaultMinDuration: number;
  defaultMaxDuration: number;
  defaultInterestRate: number;
  category: 'personal' | 'business' | 'property' | 'vehicle' | 'education';
}

export const LOAN_TYPE_INFO: Record<LoanType, LoanTypeInfo> = {
  [LoanType.COMMERCIAL]: {
    type: LoanType.COMMERCIAL,
    name: 'Crédit Commercial',
    description: 'Financement pour activités commerciales',
    icon: ShoppingCart,
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    requiresCollateral: false,
    defaultMinAmount: 10000,
    defaultMaxAmount: 500000,
    defaultMinDuration: 6,
    defaultMaxDuration: 24,
    defaultInterestRate: 0.02,
    category: 'business'
  },
  [LoanType.AGRICULTURAL]: {
    type: LoanType.AGRICULTURAL,
    name: 'Crédit Agricole (Standard)',
    description: 'Financement pour activités agricoles',
    icon: Leaf,
    color: '#10B981',
    bgColor: '#ECFDF5',
    requiresCollateral: false,
    defaultMinAmount: 10000,
    defaultMaxAmount: 1000000,
    defaultMinDuration: 6,
    defaultMaxDuration: 24,
    defaultInterestRate: 0.012,
    category: 'business'
  },
  [LoanType.PERSONAL]: {
    type: LoanType.PERSONAL,
    name: 'Crédit Personnel (Standard)',
    description: 'Prêt personnel à usage général',
    icon: User,
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    requiresCollateral: false,
    defaultMinAmount: 5000,
    defaultMaxAmount: 500000,
    defaultMinDuration: 3,
    defaultMaxDuration: 24,
    defaultInterestRate: 0.025,
    category: 'personal'
  },
  [LoanType.EMERGENCY]: {
    type: LoanType.EMERGENCY,
    name: "Crédit d'Urgence",
    description: "Prêt d'urgence pour situations critiques",
    icon: AlertCircle,
    color: '#EF4444',
    bgColor: '#FEF2F2',
    requiresCollateral: false,
    defaultMinAmount: 5000,
    defaultMaxAmount: 200000,
    defaultMinDuration: 3,
    defaultMaxDuration: 18,
    defaultInterestRate: 0.03,
    category: 'personal'
  },
  [LoanType.CREDIT_LOYER]: {
    type: LoanType.CREDIT_LOYER,
    name: 'Crédit Loyer',
    description: 'Financement pour le paiement du loyer résidentiel ou commercial',
    icon: Home,
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    requiresCollateral: false,
    defaultMinAmount: 5000,
    defaultMaxAmount: 100000,
    defaultMinDuration: 3,
    defaultMaxDuration: 12,
    defaultInterestRate: 0.02,
    category: 'personal'
  },
  [LoanType.CREDIT_AUTO]: {
    type: LoanType.CREDIT_AUTO,
    name: 'Crédit Auto',
    description: "Financement pour l'achat d'un véhicule automobile",
    icon: Car,
    color: '#06B6D4',
    bgColor: '#ECFEFF',
    requiresCollateral: true,
    defaultMinAmount: 50000,
    defaultMaxAmount: 2000000,
    defaultMinDuration: 12,
    defaultMaxDuration: 60,
    defaultInterestRate: 0.015,
    category: 'vehicle'
  },
  [LoanType.CREDIT_MOTO]: {
    type: LoanType.CREDIT_MOTO,
    name: 'Crédit Moto',
    description: "Financement pour l'achat d'une motocyclette",
    icon: Bike,
    color: '#14B8A6',
    bgColor: '#F0FDFA',
    requiresCollateral: true,
    defaultMinAmount: 10000,
    defaultMaxAmount: 300000,
    defaultMinDuration: 6,
    defaultMaxDuration: 36,
    defaultInterestRate: 0.018,
    category: 'vehicle'
  },
  [LoanType.CREDIT_PERSONNEL]: {
    type: LoanType.CREDIT_PERSONNEL,
    name: 'Crédit Personnel',
    description: 'Prêt personnel pour besoins divers (événements, urgences, etc.)',
    icon: Users,
    color: '#A855F7',
    bgColor: '#FAF5FF',
    requiresCollateral: false,
    defaultMinAmount: 5000,
    defaultMaxAmount: 500000,
    defaultMinDuration: 3,
    defaultMaxDuration: 24,
    defaultInterestRate: 0.025,
    category: 'personal'
  },
  [LoanType.CREDIT_SCOLAIRE]: {
    type: LoanType.CREDIT_SCOLAIRE,
    name: 'Crédit Scolaire',
    description: 'Financement pour frais scolaires, universitaires et matériel éducatif',
    icon: BookOpen,
    color: '#6366F1',
    bgColor: '#EEF2FF',
    requiresCollateral: false,
    defaultMinAmount: 3000,
    defaultMaxAmount: 300000,
    defaultMinDuration: 6,
    defaultMaxDuration: 12,
    defaultInterestRate: 0.015,
    category: 'education'
  },
  [LoanType.CREDIT_AGRICOLE]: {
    type: LoanType.CREDIT_AGRICOLE,
    name: 'Crédit Agricole',
    description: 'Financement pour activités agricoles (semences, équipement, intrants)',
    icon: Sprout,
    color: '#22C55E',
    bgColor: '#F0FDF4',
    requiresCollateral: false,
    defaultMinAmount: 10000,
    defaultMaxAmount: 1000000,
    defaultMinDuration: 6,
    defaultMaxDuration: 24,
    defaultInterestRate: 0.012,
    category: 'business'
  },
  [LoanType.CREDIT_PROFESSIONNEL]: {
    type: LoanType.CREDIT_PROFESSIONNEL,
    name: 'Crédit Professionnel',
    description: 'Financement pour activités professionnelles et entrepreneuriales',
    icon: Briefcase,
    color: '#0EA5E9',
    bgColor: '#F0F9FF',
    requiresCollateral: true,
    defaultMinAmount: 25000,
    defaultMaxAmount: 3000000,
    defaultMinDuration: 12,
    defaultMaxDuration: 48,
    defaultInterestRate: 0.015,
    category: 'business'
  },
  [LoanType.CREDIT_APPUI]: {
    type: LoanType.CREDIT_APPUI,
    name: "Crédit d'Appui",
    description: "Prêt de soutien pour situations d'urgence ou besoins immédiats",
    icon: HandMetal,
    color: '#F97316',
    bgColor: '#FFF7ED',
    requiresCollateral: false,
    defaultMinAmount: 5000,
    defaultMaxAmount: 200000,
    defaultMinDuration: 3,
    defaultMaxDuration: 18,
    defaultInterestRate: 0.02,
    category: 'personal'
  },
  [LoanType.CREDIT_HYPOTHECAIRE]: {
    type: LoanType.CREDIT_HYPOTHECAIRE,
    name: 'Crédit Hypothécaire',
    description: 'Financement pour achat immobilier avec garantie hypothécaire',
    icon: Building,
    color: '#EC4899',
    bgColor: '#FDF2F8',
    requiresCollateral: true,
    defaultMinAmount: 500000,
    defaultMaxAmount: 10000000,
    defaultMinDuration: 60,
    defaultMaxDuration: 240,
    defaultInterestRate: 0.008,
    category: 'property'
  }
};

/**
 * Obtenir les informations d'un type de crédit
 */
export function getLoanTypeInfo(loanType: LoanType): LoanTypeInfo {
  return LOAN_TYPE_INFO[loanType];
}

/**
 * Obtenir tous les types de crédit par catégorie
 */
export function getLoanTypesByCategory() {
  const categories: Record<string, LoanTypeInfo[]> = {
    personal: [],
    business: [],
    property: [],
    vehicle: [],
    education: []
  };

  Object.values(LOAN_TYPE_INFO).forEach(info => {
    categories[info.category].push(info);
  });

  return categories;
}

/**
 * Vérifier si un type de crédit nécessite une garantie
 */
export function requiresCollateral(loanType: LoanType): boolean {
  return LOAN_TYPE_INFO[loanType].requiresCollateral;
}

/**
 * Obtenir la couleur d'un type de crédit
 */
export function getLoanTypeColor(loanType: LoanType): string {
  return LOAN_TYPE_INFO[loanType].color;
}

/**
 * Obtenir l'icône d'un type de crédit
 */
export function getLoanTypeIcon(loanType: LoanType) {
  return LOAN_TYPE_INFO[loanType].icon;
}

/**
 * Obtenir le pourcentage de garantie (épargne bloquée) pour un type de crédit
 * @param loanType Le type de crédit
 * @returns Le pourcentage de garantie (0.15 pour la plupart, 0.30 pour Auto et Moto)
 */
export function getGuaranteePercentage(loanType: LoanType): number {
  switch (loanType) {
    case LoanType.CREDIT_AUTO:
    case LoanType.CREDIT_MOTO:
      return 0.30; // 30% pour Auto & Moto
    default:
      return 0.15; // 15% pour tous les autres types
  }
}

/**
 * Obtenir la liste de tous les types de crédit disponibles
 */
export function getAllLoanTypes(): LoanTypeInfo[] {
  return Object.values(LOAN_TYPE_INFO);
}

/**
 * Filtrer les types de crédit par catégorie
 */
export function filterLoanTypesByCategory(category: string): LoanTypeInfo[] {
  return Object.values(LOAN_TYPE_INFO).filter(info => info.category === category);
}
