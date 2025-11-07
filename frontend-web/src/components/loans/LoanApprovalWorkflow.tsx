import React, { useState } from 'react';
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
import { LoanType } from '../../types/microcredit';

interface LoanApplication {
  id: string;
  loanNumber: string;
  loanType: LoanType;
  customerId: string;
  customerCode?: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  occupation: string;
  monthlyIncome: number;
  dependents: number;
  requestedAmount: number;
  currency: 'HTG' | 'USD';
  termMonths: number;
  interestRate: number;
  monthlyPayment: number;
  purpose: string;
  collateralType?: string;
  collateralValue?: number;
  collateralDescription?: string;
  guarantor1Name?: string;
  guarantor1Phone?: string;
  guarantor1Relation?: string;
  guarantor2Name?: string;
  guarantor2Phone?: string;
  guarantor2Relation?: string;
  reference1Name?: string;
  reference1Phone?: string;
  reference2Name?: string;
  reference2Phone?: string;
  submittedDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  currentApprovalLevel: number;
  branchId: string;
}

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
  application: LoanApplication;
  onClose: () => void;
  onApprove: (applicationId: string, level: number, comment: string) => void;
  onReject: (applicationId: string, level: number, reason: string) => void;
}

type ApprovalFormData = {
  decision: 'APPROVE' | 'REJECT';
  comment: string;
};

// Note: Validation handled manually below with simple checks; schema resolver removed for now.

const LoanApprovalWorkflow: React.FC<LoanApprovalWorkflowProps> = ({
  application,
  onClose,
  onApprove,
  onReject
}) => {
  const [activeTab, setActiveTab] = useState<'application' | 'evaluation' | 'approval'>('application');
  
  // Simulation des niveaux d'approbation
  const [approvalLevels, setApprovalLevels] = useState<ApprovalLevel[]>([
    {
      level: 1,
      title: 'Superviseur de Succursale',
      approver: 'Marie Dupont',
      status: application.currentApprovalLevel > 1 ? 'APPROVED' : 'PENDING',
      decision: application.currentApprovalLevel > 1 ? 'APPROVE' : undefined,
      comment: application.currentApprovalLevel > 1 ? 'Dossier complet et conforme aux critères' : undefined,
      decidedAt: application.currentApprovalLevel > 1 ? '2025-10-14 10:30' : undefined,
      decidedBy: application.currentApprovalLevel > 1 ? 'Marie Dupont' : undefined
    },
    {
      level: 2,
      title: 'Gestionnaire Régional',
      approver: 'Jean Baptiste',
      status: application.currentApprovalLevel > 2 ? 'APPROVED' : application.currentApprovalLevel === 2 ? 'PENDING' : 'NOT_STARTED',
      decision: application.currentApprovalLevel > 2 ? 'APPROVE' : undefined,
      comment: application.currentApprovalLevel > 2 ? 'Garanties suffisantes, client solvable' : undefined,
      decidedAt: application.currentApprovalLevel > 2 ? '2025-10-14 14:15' : undefined,
      decidedBy: application.currentApprovalLevel > 2 ? 'Jean Baptiste' : undefined
    },
    {
      level: 3,
      title: 'Comité de Crédit',
      approver: 'Comité (3 membres)',
      status: application.currentApprovalLevel === 3 ? 'PENDING' : 'NOT_STARTED'
    }
  ]);

  // Calcul de l'évaluation de solvabilité
  const calculateSolvency = (): SolvencyEvaluation => {
    const monthlyPayment = application.monthlyPayment;
    const monthlyIncome = application.monthlyIncome;
    const debtToIncomeRatio = (monthlyPayment / monthlyIncome) * 100;
    
    const collateralCoverageRatio = application.collateralValue 
      ? (application.collateralValue / application.requestedAmount) * 100 
      : 0;
    
    // Score de capacité de paiement (sur 30 points)
    let paymentCapacityScore = 0;
    if (debtToIncomeRatio <= 30) paymentCapacityScore = 30;
    else if (debtToIncomeRatio <= 40) paymentCapacityScore = 20;
    else if (debtToIncomeRatio <= 50) paymentCapacityScore = 10;
    else paymentCapacityScore = 0;

    // Score de garantie (sur 30 points)
    let collateralScore = 0;
    // Pour épargne bloquée: critères différents (15% minimum)
    if (application.collateralType === 'Épargne bloquée') {
      if (collateralCoverageRatio >= 20) collateralScore = 30; // Excellent (20% ou plus)
      else if (collateralCoverageRatio >= 15) collateralScore = 25; // Bon (15-20%)
      else if (collateralCoverageRatio >= 10) collateralScore = 15; // Acceptable (10-15%)
      else collateralScore = 5; // Faible (moins de 10%)
    } else {
      // Pour autres garanties: critères standards (120% minimum)
      if (collateralCoverageRatio >= 150) collateralScore = 30;
      else if (collateralCoverageRatio >= 120) collateralScore = 25;
      else if (collateralCoverageRatio >= 100) collateralScore = 15;
      else collateralScore = 0;
    }

    // Score d'historique de crédit (sur 25 points) - simulé
    const creditHistoryScore = 20; // GOOD
    const creditHistory: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNKNOWN' = 'GOOD';

    // Score de stabilité professionnelle (sur 15 points) - simulé
    const stabilityScore = 12;

    const totalScore = paymentCapacityScore + collateralScore + creditHistoryScore + stabilityScore;
    const maxScore = 100;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    let recommendation: string;

    if (totalScore >= 75) {
      riskLevel = 'LOW';
      recommendation = 'Recommandation: APPROUVER - Excellent profil, risque faible';
    } else if (totalScore >= 50) {
      riskLevel = 'MEDIUM';
      recommendation = 'Recommandation: APPROUVER avec conditions - Profil acceptable, risque modéré';
    } else {
      riskLevel = 'HIGH';
      recommendation = 'Recommandation: REJETER ou demander garanties supplémentaires - Risque élevé';
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
  } = useForm({
    defaultValues: {
      decision: '' as 'APPROVE' | 'REJECT',
      comment: ''
    }
  });

  const decision = watch('decision') as 'APPROVE' | 'REJECT' | '';

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
    const types = {
      COMMERCIAL: { label: 'Commercial', color: 'blue', emoji: '🏪' },
      AGRICULTURAL: { label: 'Agricole', color: 'green', emoji: '🌾' },
      PERSONAL: { label: 'Personnel', color: 'purple', emoji: '👤' },
      EMERGENCY: { label: 'Urgence', color: 'red', emoji: '🚨' }
    };
    return types[type as keyof typeof types] || types.PERSONAL;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { label: 'En attente', color: 'yellow', icon: Clock },
      APPROVED: { label: 'Approuvé', color: 'green', icon: CheckCircle },
      REJECTED: { label: 'Rejeté', color: 'red', icon: XCircle },
      NOT_STARTED: { label: 'Non commencé', color: 'gray', icon: Clock }
    };
    const badge = badges[status as keyof typeof badges] || badges.PENDING;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-${badge.color}-100 text-${badge.color}-800`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const getRiskBadge = (level: string) => {
    const badges = {
      LOW: { label: 'Risque Faible', color: 'green' },
      MEDIUM: { label: 'Risque Modéré', color: 'yellow' },
      HIGH: { label: 'Risque Élevé', color: 'red' }
    };
    const badge = badges[level as keyof typeof badges] || badges.MEDIUM;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-${badge.color}-100 text-${badge.color}-800 border border-${badge.color}-200`}>
        <Shield className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const onSubmit = (data: any) => {
    if (!data.decision || !data.comment) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    
    if (data.comment.length < 10) {
      toast.error('Le commentaire doit contenir au moins 10 caractères');
      return;
    }

    if (data.decision === 'APPROVE') {
      onApprove(application.id, application.currentApprovalLevel, data.comment);
      toast.success('Demande approuvée avec succès');
    } else if (data.decision === 'REJECT') {
      onReject(application.id, application.currentApprovalLevel, data.comment);
      toast.error('Demande rejetée');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Approbation de Demande de Prêt</h2>
            <p className="text-indigo-100">
              Dossier #{application.loanNumber} - {application.customerName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
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
                      {formatCurrency(application.monthlyPayment, application.currency)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Durée</p>
                    <p className="font-semibold text-gray-900">{application.termMonths} mois</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Taux d'Intérêt</p>
                    <p className="text-xl font-bold text-purple-900">{application.interestRate}%</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total à Rembourser</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(application.monthlyPayment * application.termMonths, application.currency)}
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
                    <p className="font-semibold text-gray-900">{application.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Code Client</p>
                    <p className="font-semibold text-gray-900">{application.customerCode || application.customerId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Téléphone</p>
                      <p className="font-semibold text-gray-900">{application.phone}</p>
                    </div>
                  </div>
                  {application.email && (
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold text-gray-900">{application.email}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Adresse</p>
                      <p className="font-semibold text-gray-900">{application.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Profession</p>
                      <p className="font-semibold text-gray-900">{application.occupation}</p>
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Revenu Mensuel</p>
                    <p className="text-lg font-bold text-green-900">
                      {formatCurrency(application.monthlyIncome, application.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Personnes à Charge</p>
                    <p className="font-semibold text-gray-900">{application.dependents}</p>
                  </div>
                </div>
              </div>

              {/* Collateral Information */}
              {application.collateralType && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    Garanties
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Type de Garantie</p>
                      <p className="font-semibold text-gray-900">{application.collateralType}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Valeur Estimée</p>
                      <p className="text-lg font-bold text-blue-900">
                        {formatCurrency(application.collateralValue || 0, application.currency)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Couverture: {((application.collateralValue || 0) / application.requestedAmount * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  {application.collateralDescription && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Description</p>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{application.collateralDescription}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Guarantors Information */}
              {(application.guarantor1Name || application.guarantor2Name) && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Garants
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {application.guarantor1Name && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-600 mb-3">Garant Principal</p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-600">Nom</p>
                            <p className="font-semibold text-gray-900">{application.guarantor1Name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Téléphone</p>
                            <p className="font-semibold text-gray-900">{application.guarantor1Phone}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Relation</p>
                            <p className="font-semibold text-gray-900">{application.guarantor1Relation}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {application.guarantor2Name && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-600 mb-3">Garant Secondaire</p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-600">Nom</p>
                            <p className="font-semibold text-gray-900">{application.guarantor2Name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Téléphone</p>
                            <p className="font-semibold text-gray-900">{application.guarantor2Phone}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Relation</p>
                            <p className="font-semibold text-gray-900">{application.guarantor2Relation}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* References */}
              {(application.reference1Name || application.reference2Name) && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Références Personnelles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {application.reference1Name && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Référence 1</p>
                        <p className="font-semibold text-gray-900">{application.reference1Name}</p>
                        <p className="text-sm text-gray-600 mt-1">{application.reference1Phone}</p>
                      </div>
                    )}
                    {application.reference2Name && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Référence 2</p>
                        <p className="font-semibold text-gray-900">{application.reference2Name}</p>
                        <p className="text-sm text-gray-600 mt-1">{application.reference2Phone}</p>
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
                        solvency.score >= 75 ? 'bg-green-500' :
                        solvency.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
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
                      Paiement mensuel: {formatCurrency(application.monthlyPayment, application.currency)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Revenu mensuel: {formatCurrency(application.monthlyIncome, application.currency)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg ${solvency.debtToIncomeRatio <= 30 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                      <p className="text-sm">
                        <span className="font-medium">≤ 30%:</span> Excellent {solvency.debtToIncomeRatio <= 30 && '✓'}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${solvency.debtToIncomeRatio > 30 && solvency.debtToIncomeRatio <= 40 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                      <p className="text-sm">
                        <span className="font-medium">31-40%:</span> Acceptable {solvency.debtToIncomeRatio > 30 && solvency.debtToIncomeRatio <= 40 && '✓'}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${solvency.debtToIncomeRatio > 40 ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                      <p className="text-sm">
                        <span className="font-medium">&gt; 40%:</span> Risque élevé {solvency.debtToIncomeRatio > 40 && '⚠'}
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
                    <p className="text-lg font-semibold text-gray-900">{solvency.creditHistory}</p>
                    <p className="text-sm text-gray-600 mt-1">20/25 points</p>
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
                        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-300"></div>
                      )}
                      
                      <div className="flex gap-4">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                          level.status === 'APPROVED' ? 'bg-green-100' :
                          level.status === 'REJECTED' ? 'bg-red-100' :
                          level.status === 'PENDING' ? 'bg-yellow-100' :
                          'bg-gray-100'
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
              {application.currentApprovalLevel <= 3 && application.status === 'PENDING' && (
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
                      {errors.decision && (
                        <p className="text-red-600 text-sm mt-2">{errors.decision.message}</p>
                      )}
                    </div>

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
                      {errors.comment && (
                        <p className="text-red-600 text-sm mt-2">{errors.comment.message}</p>
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

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className={`px-6 py-2.5 rounded-lg font-medium text-white transition-colors ${
                          decision === 'APPROVE'
                            ? 'bg-green-600 hover:bg-green-700'
                            : decision === 'REJECT'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!decision}
                      >
                        {decision === 'APPROVE' ? 'Approuver la Demande' : 'Rejeter la Demande'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoanApprovalWorkflow;
