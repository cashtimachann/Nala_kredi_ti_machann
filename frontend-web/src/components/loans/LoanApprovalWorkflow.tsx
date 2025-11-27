import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  User,
  FileText,
  DollarSign,
  Calendar,
  Shield,
  TrendingUp,
  Users,
  Home,
  Briefcase,
  Phone,
  ChevronRight,
  Info
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { LoanType, ApplicationStatus } from '../../types/microcredit';
import {
  calculateMonthlyPaymentFromMonthlyRate,
  resolveMonthlyRatePercent,
  resolveAnnualRatePercent,
  roundCurrency
} from './loanRateUtils';

import type { LoanApplication as LoanApplicationType, ApprovalStep as ApprovalStepType } from '../../types/microcredit';

// Using LoanApplicationType imported from our shared types to ensure we use backend fields

interface ApprovalLevel {
  level: number;
  title: string;
  approver: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_STARTED';
  decision?: string;
  comment?: string;
  decidedAt?: string;
  decidedBy?: string;
}

interface SolvencyEvaluation {
  debtToIncomeRatio: number;
  collateralCoverageRatio: number;
  creditHistory: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNKNOWN';
  paymentCapacity: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number;
  maxScore: number;
  recommendation: string;
}

interface LoanApprovalWorkflowProps {
  application: LoanApplicationType;
  onClose: () => void;
  onApprove: (applicationId: string, level: number, comment: string, approvedAmount?: number, disbursementDate?: string) => void;
  onReject: (applicationId: string, level: number, reason: string) => void;
}

type ApprovalFormData = {
  decision: 'APPROVE' | 'REJECT' | '';
  disbursementDate?: string;
  comment: string;
  approvedAmount?: number;
};

type GuarantorRelation = 'FAMILY' | 'FRIEND' | 'COLLEAGUE' | 'BUSINESS_PARTNER' | 'NEIGHBOR' | 'OTHER';

const LoanApprovalWorkflow: React.FC<LoanApprovalWorkflowProps> = ({
  application,
  onClose,
  onApprove,
  onReject
}) => {
  const [activeTab, setActiveTab] = useState<'application' | 'evaluation' | 'approval'>('application');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Approval steps coming from the backend application; use real data
  const [approvalLevels, setApprovalLevels] = useState<ApprovalLevel[]>([]);

  useEffect(() => {
    if (!application) return;
    // Map backend ApprovalSteps to local ApprovalLevel format used by UI
    const mapped: ApprovalLevel[] = ((application as any).ApprovalSteps || (application as any).approvals || application.approvals || []).map((s: any, idx: number) => ({
      level: s.Level ? parseInt(s.Level as string, 10) || idx + 1 : idx + 1,
      title: s.Level || `Niveau ${idx + 1}`,
      approver: s.ApproverName || s.approverName || 'Comité de Crédit',
      status: (s.Status || s.status || 'NOT_STARTED').toUpperCase() as any,
      decision: s.Status || s.status,
      comment: s.Comments || s.comments,
      decidedAt: s.ProcessedAt || s.processedAt ? new Date(s.ProcessedAt || s.processedAt).toLocaleString('fr-FR') : undefined,
      decidedBy: s.ApproverName || s.approverName
    }));

    setApprovalLevels(mapped);
  }, [application]);

  // Consolidate borrower / snapshot fields into local variables (prefer backend returned borrower snapshot)
  const borrower = application.borrower;
  const customerName = (application as any).customerName ?? (borrower ? `${borrower.firstName} ${borrower.lastName}` : 'Client');
  const customerPhone = (application as any).customerPhone ?? borrower?.contact?.primaryPhone ?? '';
  const customerAddress = (application as any).customerAddress ?? (borrower ? `${borrower.address?.street ?? ''} ${borrower.address?.city ?? ''}`.trim() : '');
  const occupation = (application as any).occupation ?? borrower?.occupation ?? '';
  const monthlyIncome = (application as any).monthlyIncome ?? borrower?.monthlyIncome ?? 0;
  const dependents = (application as any).dependents ?? 0;
  // Collateral and guarantors normalization
  const collateralType = (application as any).collateralType ?? application.guarantees?.find((g: any) => (g.type || g.Type || '').toString().toLowerCase().includes('collat'))?.description ?? undefined;
  const collateralValue = (application as any).collateralValue ?? application.guarantees?.find((g: any) => (g.type || g.Type || '').toString().toLowerCase().includes('collat'))?.value ?? 0;
  const collateralDescription = (application as any).collateralDescription ?? application.guarantees?.find((g: any) => (g.type || g.Type || '').toString().toLowerCase().includes('collat'))?.description ?? undefined;
  const guarantors = (application as any).guarantees?.filter((g: any) => (g.type || g.Type || '').toString().toLowerCase().includes('personal'))?.map((g: any) => ({ name: g.guarantorInfo?.name || g.contactName || g.description, phone: g.guarantorInfo?.phone || g.contactPhone })) ?? [];
  const referencesArr = (application as any).references ?? [];

  // Extract guarantor and reference fields from backend snapshot
  const guarantor1Name = (application as any).guarantor1Name ?? '';
  const guarantor1Phone = (application as any).guarantor1Phone ?? '';
  const guarantor1Relation = (application as any).guarantor1Relation ?? '';
  const guarantor2Name = (application as any).guarantor2Name ?? '';
  const guarantor2Phone = (application as any).guarantor2Phone ?? '';
  const guarantor2Relation = (application as any).guarantor2Relation ?? '';
  const reference1Name = (application as any).reference1Name ?? '';
  const reference1Phone = (application as any).reference1Phone ?? '';
  const reference2Name = (application as any).reference2Name ?? '';
  const reference2Phone = (application as any).reference2Phone ?? '';

  // Calculate current numeric approval level from approval steps
  const currentLevel = approvalLevels.find(lvl => lvl.status === 'PENDING' || lvl.status === 'NOT_STARTED');
  const currentApprovalLevelNumber = currentLevel ? currentLevel.level : (approvalLevels.length > 0 ? approvalLevels[approvalLevels.length - 1].level + 1 : 1);

  // Derive a displayable monthly interest rate and compute monthly payment if not provided
  const monthlyRatePercent = resolveMonthlyRatePercent(
    (application as any).monthlyInterestRate,
    (application as any).interestRate ?? (application as any).annualInterestRate
  );

  const annualRatePercent = resolveAnnualRatePercent(
    monthlyRatePercent,
    (application as any).interestRate ?? (application as any).annualInterestRate,
    monthlyRatePercent > 0 ? monthlyRatePercent * 12 : 0
  );

  const durationMonths = application.requestedDurationMonths ?? 12;
  const requestedAmount = application.requestedAmount ?? 0;
  
  // Calculate monthly payment using amortization formula: P * [r(1+r)^n] / [(1+r)^n - 1]
  // where P = principal, r = monthly interest rate (as decimal), n = number of months
  // Track approved amount input when approving; default to requested amount
  const [approvedAmountInput, setApprovedAmountInput] = useState<number>(requestedAmount);

  const computedMonthlyPayment = roundCurrency(
    (application as any).monthlyPayment && (application as any).monthlyPayment > 0
      ? (application as any).monthlyPayment
      : calculateMonthlyPaymentFromMonthlyRate(approvedAmountInput || requestedAmount, monthlyRatePercent, durationMonths)
  );
  // Frais dossier (processing fee) 5% du montant approuvé réparti sur la durée (information seulement)
  const processingFee = approvedAmountInput ? roundCurrency(approvedAmountInput * 0.05) : 0;
  const distributedFeePortion = durationMonths > 0 ? roundCurrency(processingFee / durationMonths) : 0;
  const monthlyPaymentWithFee = roundCurrency(computedMonthlyPayment + distributedFeePortion);
  const deltaPct = requestedAmount > 0 ? ((approvedAmountInput - requestedAmount) / requestedAmount) * 100 : 0;
  const netDisbursement = approvedAmountInput ? roundCurrency(approvedAmountInput - processingFee) : 0;
  const showVarianceWarning = Math.abs(deltaPct) >= 20; // >20% difference threshold

  // Calcul de l'évaluation de solvabilité
  const calculateSolvency = (): SolvencyEvaluation => {
    const monthlyPayment = computedMonthlyPayment;
    // Use the consolidated monthlyIncome value (derived from application or borrower snapshot)
    const monthlyIncomeUsed = monthlyIncome;
    const debtToIncomeRatio = monthlyIncomeUsed > 0 ? (monthlyPayment / monthlyIncomeUsed) * 100 : Infinity;
    
    const collateralCoverageRatio = collateralValue > 0
      ? (collateralValue / requestedAmount) * 100 
      : 0;
    
    // Score de capacité de paiement (sur 30 points) - amélioré
    let paymentCapacityScore = 0;
    if (debtToIncomeRatio <= 25) paymentCapacityScore = 30;
    else if (debtToIncomeRatio <= 35) paymentCapacityScore = 25;
    else if (debtToIncomeRatio <= 45) paymentCapacityScore = 15;
    else if (debtToIncomeRatio <= 55) paymentCapacityScore = 5;
    else paymentCapacityScore = 0;

    // Score de garantie (sur 30 points) - amélioré
    let collateralScore = 0;
  const isSavingsCollateral = collateralType === 'Épargne bloquée';
    
    if (isSavingsCollateral) {
      // Pour épargne bloquée: critères plus stricts
      if (collateralCoverageRatio >= 25) collateralScore = 30;
      else if (collateralCoverageRatio >= 20) collateralScore = 25;
      else if (collateralCoverageRatio >= 15) collateralScore = 20;
      else if (collateralCoverageRatio >= 10) collateralScore = 10;
      else collateralScore = 0;
    } else {
      // Pour autres garanties
      if (collateralCoverageRatio >= 200) collateralScore = 30;
      else if (collateralCoverageRatio >= 150) collateralScore = 25;
      else if (collateralCoverageRatio >= 120) collateralScore = 20;
      else if (collateralCoverageRatio >= 100) collateralScore = 10;
      else collateralScore = 0;
    }

    // Score d'historique de crédit (sur 25 points) - utilisez les données réelles si disponibles
    const creditHistoryMap = {
      EXCELLENT: 25,
      GOOD: 20,
      FAIR: 15,
      POOR: 5,
      UNKNOWN: 10
    };
    const creditHistory = application.creditScore && application.creditScore >= 800 ? 'EXCELLENT' :
                         application.creditScore && application.creditScore >= 700 ? 'GOOD' :
                         application.creditScore && application.creditScore >= 600 ? 'FAIR' : 'UNKNOWN';
    const creditHistoryScore = creditHistoryMap[creditHistory];

    // Score de stabilité (sur 15 points) - basé sur la profession et dépendants
    let stabilityScore = 10; // Base
    const stableProfessions = ['Fonctionnaire', 'Cadre', 'Enseignant', 'Infirmier', 'Médecin', 'Ingénieur'];
    if (stableProfessions.some(prof => occupation.toLowerCase().includes(prof.toLowerCase()))) {
      stabilityScore += 3;
    }
    const dependents = (application as any).dependents ?? 0;
    if (dependents <= 3) stabilityScore += 2;

    const totalScore = paymentCapacityScore + collateralScore + creditHistoryScore + stabilityScore;
    const maxScore = 100;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    let recommendation: string;

    if (totalScore >= 80) {
      riskLevel = 'LOW';
      recommendation = 'Recommandation: APPROUVER - Excellent profil, risque faible';
    } else if (totalScore >= 60) {
      riskLevel = 'MEDIUM';
      recommendation = 'Recommandation: APPROUVER avec conditions - Profil acceptable, risque modéré';
    } else if (totalScore >= 40) {
      riskLevel = 'MEDIUM';
      recommendation = 'Recommandation: APPROUVER avec garanties supplémentaires - Risque modéré-élevé';
    } else {
      riskLevel = 'HIGH';
      recommendation = 'Recommandation: REJETER - Risque trop élevé';
    }

    return {
      debtToIncomeRatio,
      collateralCoverageRatio,
      creditHistory,
      paymentCapacity: paymentCapacityScore,
      riskLevel,
      score: totalScore,
      maxScore,
      recommendation
    };
  };

  const solvency = calculateSolvency();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<ApprovalFormData>({
    defaultValues: {
      decision: '',
      comment: ''
    }
  });

  const decision = watch('decision');

  // (definitions moved earlier so remove duplicates here)

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'HTG') {
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount) + ' HTG';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getLoanTypeInfo = (type: string) => {
    const types: Record<string, { label: string; color: string; emoji: string }> = {
      COMMERCIAL: { label: 'Commercial', color: 'blue', emoji: '🏪' },
      AGRICULTURAL: { label: 'Agricole', color: 'green', emoji: '🌾' },
      PERSONAL: { label: 'Personnel', color: 'purple', emoji: '👤' },
      EMERGENCY: { label: 'Urgence', color: 'red', emoji: '🚨' },
      CREDIT_LOYER: { label: 'Crédit Loyer', color: 'indigo', emoji: '🏠' },
      CREDIT_AUTO: { label: 'Crédit Auto', color: 'cyan', emoji: '🚗' },
      CREDIT_MOTO: { label: 'Crédit Moto', color: 'teal', emoji: '🏍️' },
      CREDIT_PERSONNEL: { label: 'Crédit Personnel', color: 'pink', emoji: '💳' },
      CREDIT_SCOLAIRE: { label: 'Crédit Scolaire', color: 'amber', emoji: '📚' },
      CREDIT_AGRICOLE: { label: 'Crédit Agricole', color: 'lime', emoji: '🚜' },
      CREDIT_PROFESSIONNEL: { label: 'Crédit Professionnel', color: 'violet', emoji: '💼' },
      CREDIT_APPUI: { label: 'Crédit d\'Appui', color: 'orange', emoji: '🤝' },
      CREDIT_HYPOTHECAIRE: { label: 'Crédit Hypothécaire', color: 'slate', emoji: '🏡' }
    };
    return types[type] || types.PERSONAL;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
      PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-800', icon: XCircle },
      NOT_STARTED: { label: 'Non commencé', color: 'bg-gray-100 text-gray-800', icon: Clock }
    };
    
    const badge = badges[status] || badges.PENDING;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const getRiskBadge = (level: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      LOW: { label: 'Risque Faible', color: 'bg-green-100 text-green-800 border-green-200' },
      MEDIUM: { label: 'Risque Modéré', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      HIGH: { label: 'Risque Élevé', color: 'bg-red-100 text-red-800 border-red-200' }
    };
    
    const badge = badges[level] || badges.MEDIUM;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${badge.color}`}>
        <Shield className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const onSubmit = async (data: ApprovalFormData) => {
    try {
      setIsSubmitting(true);

      if (!data.decision || !data.comment) {
        toast.error('Veuillez remplir tous les champs');
        return;
      }
      
      if (data.comment.length < 10) {
        toast.error('Le commentaire doit contenir au moins 10 caractères');
        return;
      }

      // Validate disbursement date if approving
      if (data.decision === 'APPROVE' && !data.disbursementDate) {
        toast.error('Veuillez sélectionner une date de décaissement');
        return;
      }

      if (data.decision === 'APPROVE') {
        const amt = typeof data.approvedAmount === 'number' ? data.approvedAmount : approvedAmountInput;
        if (!amt || amt <= 0) {
          toast.error('Montant approuvé invalide');
          return;
        }
      }

      const toastId = toast.loading('Traitement en cours...');

      if (data.decision === 'APPROVE') {
        const amt = typeof data.approvedAmount === 'number' ? data.approvedAmount : approvedAmountInput;
        await onApprove(application.id, currentApprovalLevelNumber, data.comment, amt, data.disbursementDate);
        toast.success('Demande approuvée avec succès', { id: toastId });
      } else {
        await onReject(application.id, currentApprovalLevelNumber, data.comment);
        toast.error('Demande rejetée', { id: toastId });
      }
      
      onClose();
    } catch (error) {
      console.error('Error in approval workflow:', error);
      toast.error('Erreur lors du traitement de la demande');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRelationLabel = (relation?: string) => {
    const relations: Record<string, string> = {
      FAMILY: 'Famille',
      FRIEND: 'Ami',
      COLLEAGUE: 'Collègue',
      BUSINESS_PARTNER: 'Partenaire',
      NEIGHBOR: 'Voisin',
      OTHER: 'Autre'
    };
    return relation ? relations[relation] || relation : 'Non spécifié';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Approbation de Demande de Prêt</h2>
            <p className="text-indigo-100">
              Dossier #{(application as any).applicationNumber ?? (application as any).loanNumber} - {customerName}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-indigo-200 text-sm">
                Soumis le {new Date((application as any).submittedAt ?? application.submittedAt ?? application.createdAt).toLocaleDateString('fr-FR')}
              </span>
              <span className="text-indigo-200 text-sm">
                Succursale: {application.branchName ?? application.branchId ?? (application as any).branch}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('application')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'application'
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-5 h-5 inline-block mr-2" />
              Demande
            </button>
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'evaluation'
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <TrendingUp className="w-5 h-5 inline-block mr-2" />
              Évaluation
            </button>
            <button
              onClick={() => setActiveTab('approval')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'approval'
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <CheckCircle className="w-5 h-5 inline-block mr-2" />
              Approbation
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab: Application Details */}
          {activeTab === 'application' && (
            <div className="space-y-6">
              {/* Loan Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-indigo-600" />
                  Informations sur le Prêt
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Type de Prêt</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getLoanTypeInfo(application.loanType).emoji}</span>
                      <p className="font-semibold text-gray-900">{getLoanTypeInfo(application.loanType).label}</p>
                    </div>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Montant Demandé</p>
                    <p className="text-xl font-bold text-indigo-900">
                      {formatCurrency(application.requestedAmount, application.currency)}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Paiement Mensuel</p>
                    <p className="text-xl font-bold text-blue-900">
                      {formatCurrency(computedMonthlyPayment, application.currency ?? (application as any).currency ?? 'HTG')}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Mensualité + Frais</p>
                    <p className="text-xl font-bold text-purple-900">
                      {formatCurrency(monthlyPaymentWithFee, application.currency ?? (application as any).currency ?? 'HTG')}
                    </p>
                    {processingFee > 0 && (
                      <p className="text-xs text-gray-700 mt-1">Frais dossier total: {formatCurrency(processingFee, application.currency)} (≈ {formatCurrency(distributedFeePortion, application.currency)} / mois)</p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Durée</p>
                    <p className="font-semibold text-gray-900">{durationMonths} mois</p>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Montant Approuvé (saisie)</p>
                    <p className="text-xl font-bold text-green-900">
                      {formatCurrency(approvedAmountInput, application.currency)}
                    </p>
                    {showVarianceWarning && (
                      <p className="text-xs mt-1 text-red-700 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Écart {deltaPct.toFixed(1)}% par rapport au demandé
                      </p>
                    )}
                    {!showVarianceWarning && deltaPct !== 0 && (
                      <p className="text-xs mt-1 text-gray-700">
                        Différence {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}%
                      </p>
                    )}
                  </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Taux d'Intérêt Mensuel</p>
                    <p className="text-xl font-bold text-purple-900">{(monthlyRatePercent || 0).toFixed(2)}%</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total à Rembourser</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(computedMonthlyPayment * durationMonths, application.currency ?? (application as any).currency ?? 'HTG')}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total + Frais (estimé)</p>
                    <p className="font-semibold text-gray-900">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Frais dossier (5%)</p>
                    <p className="font-semibold text-orange-900">
                      {formatCurrency(processingFee, application.currency)}
                    </p>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Net à Verser (après frais)</p>
                    <p className="text-xl font-bold text-teal-900">
                      {formatCurrency(netDisbursement, application.currency)}
                    </p>
                  </div>
                      {formatCurrency((monthlyPaymentWithFee * durationMonths), application.currency ?? (application as any).currency ?? 'HTG')}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Objectif du Prêt</p>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{application.purpose}</p>
                </div>
              </div>

              {/* Client Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  Informations sur le Client
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Nom Complet</p>
                    <p className="font-semibold text-gray-900">{customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Numéro Compte Épargne</p>
                    <p className="font-semibold text-gray-900">{(application as any).savingsAccountNumber || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Téléphone</p>
                      <p className="font-semibold text-gray-900">{customerPhone}</p>
                    </div>
                  </div>
                  {(application as any).email && (
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold text-gray-900">{(application as any).email}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Adresse</p>
                      <p className="font-semibold text-gray-900">{customerAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Profession</p>
                      <p className="font-semibold text-gray-900">{occupation}</p>
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Revenu Mensuel</p>
                    <p className="text-lg font-bold text-green-900">
                      {formatCurrency(monthlyIncome, application.currency || (application as any).currency || 'HTG')}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Personnes à Charge</p>
                    <p className="text-lg font-bold text-blue-900">{dependents}</p>
                  </div>
                </div>
              </div>

              {/* Collateral Information: display when either a type, description, or a value is present */}
              {(collateralType || collateralValue > 0 || collateralDescription) && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    Garanties
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Type de Garantie</p>
                      <p className="font-semibold text-gray-900">{collateralType}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${
                      collateralValue >= requestedAmount * 1.2 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className="text-sm text-gray-600">Valeur Estimée</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(collateralValue, application.currency)}
                      </p>
                      <p className={`text-sm mt-1 ${
                        collateralValue >= requestedAmount * 1.2 
                          ? 'text-green-700' 
                          : 'text-red-700'
                      }`}>
                        Couverture: {(collateralValue / requestedAmount * 100).toFixed(0)}%
                        {collateralValue >= requestedAmount * 1.2 
                          ? ' ✓ Suffisant' 
                          : ' ⚠ Insuffisant'}
                      </p>
                    </div>
                  </div>
                  {collateralDescription && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Description</p>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{collateralDescription}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Guarantors Information */}
              {(guarantor1Name || guarantor2Name) && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Garants
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {guarantor1Name && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-600 mb-3">Garant Principal</p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-600">Nom</p>
                            <p className="font-semibold text-gray-900">{guarantor1Name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Téléphone</p>
                            <p className="font-semibold text-gray-900">{guarantor1Phone}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Relation</p>
                            <p className="font-semibold text-gray-900">
                              {getRelationLabel(guarantor1Relation)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {guarantor2Name && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-600 mb-3">Garant Secondaire</p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-600">Nom</p>
                            <p className="font-semibold text-gray-900">{guarantor2Name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Téléphone</p>
                            <p className="font-semibold text-gray-900">{guarantor2Phone}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Relation</p>
                            <p className="font-semibold text-gray-900">
                              {getRelationLabel(guarantor2Relation)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* References */}
              {(reference1Name || reference2Name) && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Références Personnelles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reference1Name && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Référence 1</p>
                        <p className="font-semibold text-gray-900">{reference1Name}</p>
                        <p className="text-sm text-gray-600 mt-1">{reference1Phone}</p>
                      </div>
                    )}
                    {reference2Name && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Référence 2</p>
                        <p className="font-semibold text-gray-900">{reference2Name}</p>
                        <p className="text-sm text-gray-600 mt-1">{reference2Phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Solvency Evaluation */}
          {activeTab === 'evaluation' && (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Score de Solvabilité</h3>
                    <p className="text-gray-600">Évaluation basée sur plusieurs critères</p>
                  </div>
                  {getRiskBadge(solvency.riskLevel)}
                </div>
                
                <div className="bg-white rounded-lg p-6 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-5xl font-bold text-indigo-600">{solvency.score}</span>
                    <span className="text-2xl text-gray-400">/ {solvency.maxScore}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                    <div
                      className={`h-4 rounded-full ${
                        solvency.score >= 80 ? 'bg-green-500' :
                        solvency.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(solvency.score / solvency.maxScore) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900 font-medium">{solvency.recommendation}</p>
                  </div>
                </div>
              </div>

              {/* Detailed Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Debt to Income Ratio */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    Ratio Dette/Revenu
                  </h4>
                  <div className="text-center mb-4">
                    <p className="text-4xl font-bold text-gray-900">{solvency.debtToIncomeRatio.toFixed(1)}%</p>
                    <p className="text-sm text-gray-600 mt-2">
                      Paiement mensuel: {formatCurrency(computedMonthlyPayment, application.currency ?? (application as any).currency ?? 'HTG')}
                    </p>
                    <p className="text-sm text-gray-600">
                      Revenu mensuel: {formatCurrency(monthlyIncome, application.currency ?? (application as any).currency ?? 'HTG')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg ${solvency.debtToIncomeRatio <= 25 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                      <p className="text-sm">
                        <span className="font-medium">≤ 25%:</span> Excellent {solvency.debtToIncomeRatio <= 25 && '✓'}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${solvency.debtToIncomeRatio > 25 && solvency.debtToIncomeRatio <= 35 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                      <p className="text-sm">
                        <span className="font-medium">26-35%:</span> Très bon {solvency.debtToIncomeRatio > 25 && solvency.debtToIncomeRatio <= 35 && '✓'}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${solvency.debtToIncomeRatio > 35 && solvency.debtToIncomeRatio <= 45 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                      <p className="text-sm">
                        <span className="font-medium">36-45%:</span> Acceptable {solvency.debtToIncomeRatio > 35 && solvency.debtToIncomeRatio <= 45 && '✓'}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${solvency.debtToIncomeRatio > 45 ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                      <p className="text-sm">
                        <span className="font-medium">&gt; 45%:</span> Risque élevé {solvency.debtToIncomeRatio > 45 && '⚠'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Collateral Coverage */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    Couverture des Garanties
                  </h4>
                  <div className="text-center mb-4">
                    <p className="text-4xl font-bold text-gray-900">{solvency.collateralCoverageRatio.toFixed(0)}%</p>
                    <p className="text-sm text-gray-600 mt-2">
                      Valeur garantie: {formatCurrency(application.collateralValue || 0, application.currency)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Montant demandé: {formatCurrency(application.requestedAmount, application.currency)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg ${solvency.collateralCoverageRatio >= 150 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                      <p className="text-sm">
                        <span className="font-medium">≥ 150%:</span> Excellent {solvency.collateralCoverageRatio >= 150 && '✓'}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${solvency.collateralCoverageRatio >= 120 && solvency.collateralCoverageRatio < 150 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                      <p className="text-sm">
                        <span className="font-medium">120-149%:</span> Acceptable {solvency.collateralCoverageRatio >= 120 && solvency.collateralCoverageRatio < 150 && '✓'}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${solvency.collateralCoverageRatio < 120 ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                      <p className="text-sm">
                        <span className="font-medium">&lt; 120%:</span> Insuffisant {solvency.collateralCoverageRatio < 120 && '⚠'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Factors */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Facteurs Additionnels</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Historique de Crédit</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">{solvency.creditHistory.toLowerCase()}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {solvency.creditHistory === 'EXCELLENT' && '25/25 points'}
                      {solvency.creditHistory === 'GOOD' && '20/25 points'}
                      {solvency.creditHistory === 'FAIR' && '15/25 points'}
                      {solvency.creditHistory === 'POOR' && '5/25 points'}
                      {solvency.creditHistory === 'UNKNOWN' && '10/25 points'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Capacité de Paiement</p>
                    <p className="text-lg font-semibold text-gray-900">{solvency.paymentCapacity}/30</p>
                    <p className="text-sm text-gray-600 mt-1">Points obtenus</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Stabilité Professionnelle</p>
                    <p className="text-lg font-semibold text-gray-900">12/15</p>
                    <p className="text-sm text-gray-600 mt-1">Points obtenus</p>
                  </div>
                </div>
              </div>

              {/* Risk Analysis */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Analyse du Risque</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Niveau de risque</span>
                    {getRiskBadge(solvency.riskLevel)}
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Score total</span>
                    <span className="font-semibold text-gray-900">{solvency.score}/{solvency.maxScore}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Recommandation</span>
                    <span className={`font-medium ${
                      solvency.riskLevel === 'LOW' ? 'text-green-600' :
                      solvency.riskLevel === 'MEDIUM' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {solvency.riskLevel === 'LOW' ? 'APPROUVER' :
                       solvency.riskLevel === 'MEDIUM' ? 'APPROUVER AVEC CONDITIONS' : 'REJETER'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Approval Workflow */}
          {activeTab === 'approval' && (
            <div className="space-y-6">
              {/* Approval Timeline */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-6">Processus d'Approbation</h3>
                <div className="space-y-6">
                  {approvalLevels.map((level, index) => (
                    <div key={level.level} className="relative">
                      {/* Connector Line */}
                      {index < approvalLevels.length - 1 && (
                        <div className={`absolute left-6 top-12 bottom-0 w-0.5 ${
                          level.status === 'APPROVED' ? 'bg-green-300' :
                          level.status === 'REJECTED' ? 'bg-red-300' :
                          level.status === 'PENDING' ? 'bg-yellow-300' : 'bg-gray-300'
                        }`}></div>
                      )}
                      
                      <div className="flex gap-4">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                          level.status === 'APPROVED' ? 'bg-green-100 border-2 border-green-300' :
                          level.status === 'REJECTED' ? 'bg-red-100 border-2 border-red-300' :
                          level.status === 'PENDING' ? 'bg-yellow-100 border-2 border-yellow-300' :
                          'bg-gray-100 border-2 border-gray-300'
                        }`}>
                          {level.status === 'APPROVED' && <CheckCircle className="w-6 h-6 text-green-600" />}
                          {level.status === 'REJECTED' && <XCircle className="w-6 h-6 text-red-600" />}
                          {level.status === 'PENDING' && <Clock className="w-6 h-6 text-yellow-600" />}
                          {level.status === 'NOT_STARTED' && <Clock className="w-6 h-6 text-gray-400" />}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900">{level.title}</p>
                              <p className="text-sm text-gray-600">Niveau {level.level} - {level.approver}</p>
                            </div>
                            {getStatusBadge(level.status)}
                          </div>
                          
                          {level.decidedAt && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                <Calendar className="w-4 h-4" />
                                <span>{level.decidedAt} par {level.decidedBy}</span>
                              </div>
                              {level.comment && (
                                <p className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                                  {level.comment}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Form */}
              {currentApprovalLevelNumber <= 3 && application.status === ApplicationStatus.SUBMITTED && (
                <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-6">Votre Décision</h3>
                  
                  <div className="space-y-6">
                    {/* Decision Radio Buttons */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Décision <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <label className={`flex items-center justify-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          decision === 'APPROVE' 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            value="APPROVE"
                            {...register('decision')}
                            className="w-5 h-5 text-green-600"
                          />
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          <span className="font-medium text-gray-900">Approuver</span>
                        </label>
                        
                        <label className={`flex items-center justify-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          decision === 'REJECT' 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            value="REJECT"
                            {...register('decision')}
                            className="w-5 h-5 text-red-600"
                          />
                          <XCircle className="w-6 h-6 text-red-600" />
                          <span className="font-medium text-gray-900">Rejeter</span>
                        </label>
                      </div>
                    </div>

                    {/* Approved Amount - Only shown if APPROVE is selected */}
                    {decision === 'APPROVE' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <DollarSign className="w-4 h-4 inline-block mr-2" />
                          Montant approuvé <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            defaultValue={approvedAmountInput}
                            onChange={(e) => setApprovedAmountInput(Number(e.target.value))}
                            className="w-1/2 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <span className="text-sm text-gray-600">
                            Montant demandé: {formatCurrency(requestedAmount, (application as any).currency || application.currency)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                          Vous pouvez ajuster le montant approuvé. Les mensualités estimées seront mises à jour.
                        </p>
                      </div>
                    )}

                    {/* Disbursement Date - Only shown if APPROVE is selected */}
                    {decision === 'APPROVE' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline-block mr-2" />
                          Date de Décaissement <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          {...register('disbursementDate')}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p className="mt-2 text-sm text-gray-500">
                          📅 Sélectionnez la date à laquelle les fonds seront décaissés au client
                        </p>
                      </div>
                    )}

                    {/* Comment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Commentaire / Justification <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        {...register('comment')}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder={decision === 'APPROVE' 
                          ? "Expliquez pourquoi vous approuvez cette demande..." 
                          : "Expliquez les raisons du rejet..."}
                      />
                      {!errors.comment && (
                        <p className="text-xs text-gray-500 mt-1">
                          Minimum 10 caractères. Ce commentaire sera visible dans l'historique.
                        </p>
                      )}
                    </div>

                    {/* Warning Alert */}
                    {decision === 'REJECT' && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-900">
                          <p className="font-medium mb-1">Attention</p>
                          <p>Le rejet de cette demande sera définitif et le client sera notifié immédiatement.</p>
                        </div>
                      </div>
                    )}

                    {/* Success Alert for Approval */}
                    {decision === 'APPROVE' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-900">
                          <p className="font-medium mb-1">Prêt à approuver</p>
                          <p>Cette demande passera au niveau d'approbation suivant après votre validation.</p>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={!decision || isSubmitting}
                        className={`px-6 py-2.5 rounded-lg font-medium text-white transition-colors ${
                          decision === 'APPROVE'
                            ? 'bg-green-600 hover:bg-green-700'
                            : decision === 'REJECT'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-gray-400 cursor-not-allowed'
                        } disabled:opacity-50`}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Traitement...
                          </div>
                        ) : (
                          decision === 'APPROVE' ? 'Approuver la Demande' : 'Rejeter la Demande'
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Read-only view if already processed */}
              {application.status !== ApplicationStatus.SUBMITTED && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Demande {application.status === ApplicationStatus.APPROVED ? 'Approuvée' : 'Rejetée'}
                  </h3>
                  <p className="text-gray-600">
                    Cette demande a déjà été traitée et ne peut plus être modifiée.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoanApprovalWorkflow;