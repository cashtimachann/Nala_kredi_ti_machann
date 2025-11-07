import React, { useState } from 'react';
import {
  X,
  Download,
  Calendar,
  DollarSign,
  User,
  Phone,
  Home,
  Briefcase,
  Shield,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Percent,
  CreditCard,
  Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentRecording from './PaymentRecording';
import { LoanType, LoanStatus } from '../../types/microcredit';

interface Loan {
  id: string;
  loanNumber: string;
  customerId: string;
  customerName: string;
  customerCode?: string;
  loanType: LoanType;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  disbursementDate: string;
  maturityDate: string;
  remainingBalance: number;
  paidAmount: number;
  status: LoanStatus;
  currency: 'HTG' | 'USD';
  collateral?: string;
  guarantors?: string[];
  branch: string;
  loanOfficer: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  daysOverdue?: number;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
}

interface PaymentScheduleItem {
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalPayment: number;
  remainingBalance: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'UPCOMING';
  paidDate?: string;
  paidAmount?: number;
}

interface PaymentHistory {
  id: string;
  paymentDate: string;
  amount: number;
  principal: number;
  interest: number;
  penalty?: number;
  paymentMethod: 'CASH' | 'CHECK' | 'TRANSFER' | 'MOBILE_MONEY';
  receiptNumber: string;
  receivedBy: string;
  notes?: string;
}

interface LoanDetailsProps {
  loan: Loan;
  onClose: () => void;
  onRecordPayment?: () => void;
}

const LoanDetails: React.FC<LoanDetailsProps> = ({ loan, onClose, onRecordPayment }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'history' | 'documents'>('overview');
  const [showPaymentRecording, setShowPaymentRecording] = useState(false);

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
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
      APPROVED: { label: 'Approuvé', color: 'blue', icon: CheckCircle },
      DISBURSED: { label: 'Décaissé', color: 'indigo', icon: DollarSign },
      ACTIVE: { label: 'Actif', color: 'green', icon: CheckCircle },
      OVERDUE: { label: 'En retard', color: 'red', icon: AlertTriangle },
      PAID: { label: 'Payé', color: 'emerald', icon: CheckCircle },
      REJECTED: { label: 'Rejeté', color: 'gray', icon: XCircle }
    };
    const badge = badges[status as keyof typeof badges] || badges.PENDING;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-${badge.color}-100 text-${badge.color}-800 border border-${badge.color}-200`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  // Générer le calendrier d'amortissement
  const generatePaymentSchedule = (): PaymentScheduleItem[] => {
    const schedule: PaymentScheduleItem[] = [];
    const monthlyRate = loan.interestRate / 100 / 12;
    let remainingBalance = loan.principalAmount;
    const startDate = new Date(loan.disbursementDate);

    for (let i = 1; i <= loan.termMonths; i++) {
      const interestAmount = remainingBalance * monthlyRate;
      const principalAmount = loan.monthlyPayment - interestAmount;
      remainingBalance -= principalAmount;

      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      // Déterminer le statut (simulé pour la démo)
      let status: 'PAID' | 'PENDING' | 'OVERDUE' | 'UPCOMING' = 'UPCOMING';
      const today = new Date();
      
      if (dueDate < today) {
        // Pour la démo, marquer les premiers paiements comme payés
        status = i <= Math.floor(loan.termMonths * (loan.paidAmount / (loan.principalAmount + (loan.principalAmount * loan.interestRate / 100 * loan.termMonths / 12)))) ? 'PAID' : 'OVERDUE';
      } else if (dueDate.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000) {
        status = 'PENDING';
      }

      schedule.push({
        installmentNumber: i,
        dueDate: dueDate.toISOString().split('T')[0],
        principalAmount: Math.max(0, principalAmount),
        interestAmount,
        totalPayment: loan.monthlyPayment,
        remainingBalance: Math.max(0, remainingBalance),
        status,
        paidDate: status === 'PAID' ? dueDate.toISOString().split('T')[0] : undefined,
        paidAmount: status === 'PAID' ? loan.monthlyPayment : undefined
      });
    }

    return schedule;
  };

  // Générer l'historique des paiements (démo)
  const generatePaymentHistory = (): PaymentHistory[] => {
    const history: PaymentHistory[] = [];
    const schedule = generatePaymentSchedule();
    
    schedule.filter(s => s.status === 'PAID').forEach((payment, index) => {
      history.push({
        id: `PAY-${index + 1}`,
        paymentDate: payment.paidDate!,
        amount: payment.paidAmount!,
        principal: payment.principalAmount,
        interest: payment.interestAmount,
        paymentMethod: index % 3 === 0 ? 'CASH' : index % 3 === 1 ? 'TRANSFER' : 'MOBILE_MONEY',
        receiptNumber: `REC-${loan.loanNumber}-${String(index + 1).padStart(3, '0')}`,
        receivedBy: loan.loanOfficer,
        notes: index === 0 ? 'Premier paiement' : undefined
      });
    });

    return history.reverse(); // Plus récent en premier
  };

  const paymentSchedule = generatePaymentSchedule();
  const paymentHistory = generatePaymentHistory();

  const handleDownloadContract = () => {
    toast.success('Téléchargement du contrat en cours...');
    // TODO: Implement PDF generation
  };

  const handlePrintSchedule = () => {
    toast.success('Impression du calendrier de paiement...');
    // TODO: Implement print functionality
  };

  const handleDownloadReceipt = (receiptNumber: string) => {
    toast.success(`Téléchargement du reçu ${receiptNumber}...`);
    // TODO: Implement receipt download
  };

  // Calculer les statistiques
  const totalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);
  const totalPrincipalPaid = paymentHistory.reduce((sum, p) => sum + p.principal, 0);
  const totalInterestPaid = paymentHistory.reduce((sum, p) => sum + p.interest, 0);
  const progressPercentage = (totalPrincipalPaid / loan.principalAmount) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Détails du Prêt</h2>
            <div className="flex items-center gap-4">
              <p className="text-indigo-100">#{loan.loanNumber}</p>
              <div>{getStatusBadge(loan.status)}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadContract}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              title="Télécharger le contrat"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-5 h-5 inline-block mr-2" />
              Vue d'ensemble
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'schedule'
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-5 h-5 inline-block mr-2" />
              Calendrier ({paymentSchedule.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <TrendingUp className="w-5 h-5 inline-block mr-2" />
              Historique ({paymentHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'documents'
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Shield className="w-5 h-5 inline-block mr-2" />
              Documents
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Progression du Remboursement</h3>
                  <span className="text-2xl font-bold text-indigo-600">{progressPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 mb-4">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-6 rounded-full flex items-center justify-end pr-3"
                    style={{ width: `${progressPercentage}%` }}
                  >
                    {progressPercentage > 10 && (
                      <span className="text-white text-xs font-medium">{progressPercentage.toFixed(0)}%</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Capital Payé</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(totalPrincipalPaid, loan.currency)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Intérêts Payés</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(totalInterestPaid, loan.currency)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Reste à Payer</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(loan.remainingBalance, loan.currency)}</p>
                  </div>
                </div>
              </div>

              {/* Loan Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Loan Details */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-indigo-600" />
                    Détails du Prêt
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-semibold flex items-center gap-2">
                        <span>{getLoanTypeInfo(loan.loanType).emoji}</span>
                        {getLoanTypeInfo(loan.loanType).label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant Principal:</span>
                      <span className="font-semibold text-indigo-600">
                        {formatCurrency(loan.principalAmount, loan.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taux d'Intérêt:</span>
                      <span className="font-semibold">{loan.interestRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée:</span>
                      <span className="font-semibold">{loan.termMonths} mois</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paiement Mensuel:</span>
                      <span className="font-semibold text-blue-600">
                        {formatCurrency(loan.monthlyPayment, loan.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total à Rembourser:</span>
                      <span className="font-semibold">
                        {formatCurrency(loan.monthlyPayment * loan.termMonths, loan.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Client Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-600" />
                    Information Client
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Nom</p>
                      <p className="font-semibold text-gray-900">{loan.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Code Client</p>
                      <p className="font-semibold text-gray-900">{loan.customerCode || loan.customerId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Téléphone</p>
                        <p className="font-semibold text-gray-900">509-XXXX-XXXX</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Succursale</p>
                        <p className="font-semibold text-gray-900">{loan.branch}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Agent de Crédit</p>
                        <p className="font-semibold text-gray-900">{loan.loanOfficer}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Dates Importantes
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Date de Demande</p>
                      <p className="font-semibold text-gray-900">{formatDate(loan.createdAt)}</p>
                    </div>
                    {loan.approvedAt && (
                      <div>
                        <p className="text-sm text-gray-600">Date d'Approbation</p>
                        <p className="font-semibold text-gray-900">{formatDate(loan.approvedAt)}</p>
                        {loan.approvedBy && (
                          <p className="text-xs text-gray-500">Par: {loan.approvedBy}</p>
                        )}
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Date de Décaissement</p>
                      <p className="font-semibold text-gray-900">{formatDate(loan.disbursementDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date d'Échéance Finale</p>
                      <p className="font-semibold text-gray-900">{formatDate(loan.maturityDate)}</p>
                    </div>
                    {loan.nextPaymentDate && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-yellow-800 mb-1">Prochain Paiement</p>
                        <p className="font-semibold text-yellow-900">{formatDate(loan.nextPaymentDate)}</p>
                        <p className="text-sm text-yellow-700">
                          Montant: {formatCurrency(loan.nextPaymentAmount || 0, loan.currency)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Collateral & Guarantors */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    Garanties
                  </h3>
                  <div className="space-y-3">
                    {loan.collateral && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-600 font-medium mb-1">Garantie Matérielle</p>
                        <p className="font-semibold text-blue-900">{loan.collateral}</p>
                      </div>
                    )}
                    {loan.guarantors && loan.guarantors.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Garants ({loan.guarantors.length})
                        </p>
                        <div className="space-y-2">
                          {loan.guarantors.map((guarantor, index) => (
                            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <p className="font-semibold text-gray-900">{guarantor}</p>
                              <p className="text-sm text-gray-600">Garant {index === 0 ? 'Principal' : 'Secondaire'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Payment Schedule */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Calendrier d'Amortissement</h3>
                <button
                  onClick={handlePrintSchedule}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Imprimer
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date d'Échéance
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capital
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Intérêt
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Solde Restant
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentSchedule.map((item) => (
                      <tr key={item.installmentNumber} className={item.status === 'OVERDUE' ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.installmentNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(item.dueDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatCurrency(item.principalAmount, loan.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {formatCurrency(item.interestAmount, loan.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                          {formatCurrency(item.totalPayment, loan.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {formatCurrency(item.remainingBalance, loan.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {item.status === 'PAID' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3" />
                              Payé
                            </span>
                          )}
                          {item.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Clock className="w-3 h-3" />
                              En cours
                            </span>
                          )}
                          {item.status === 'OVERDUE' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertTriangle className="w-3 h-3" />
                              En retard
                            </span>
                          )}
                          {item.status === 'UPCOMING' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <Calendar className="w-3 h-3" />
                              À venir
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td colSpan={2} className="px-6 py-4 text-sm text-gray-900">
                        TOTAL
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {formatCurrency(loan.principalAmount, loan.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {formatCurrency((loan.monthlyPayment * loan.termMonths) - loan.principalAmount, loan.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-indigo-600">
                        {formatCurrency(loan.monthlyPayment * loan.termMonths, loan.currency)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Payment History */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Historique des Paiements</h3>
                {loan.status === 'ACTIVE' && (
                  <button
                    onClick={() => setShowPaymentRecording(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    Enregistrer Paiement
                  </button>
                )}
              </div>

              {paymentHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun paiement enregistré</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3" />
                              Payé
                            </span>
                            <span className="text-sm text-gray-600">{formatDate(payment.paymentDate)}</span>
                            <span className="text-xs text-gray-500">Reçu: {payment.receiptNumber}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mb-2">
                            <div>
                              <p className="text-xs text-gray-600">Montant Total</p>
                              <p className="text-lg font-bold text-gray-900">{formatCurrency(payment.amount, loan.currency)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Capital</p>
                              <p className="text-sm font-semibold text-gray-900">{formatCurrency(payment.principal, loan.currency)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Intérêt</p>
                              <p className="text-sm font-semibold text-gray-600">{formatCurrency(payment.interest, loan.currency)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span>Méthode: <span className="font-medium">{payment.paymentMethod}</span></span>
                            <span>Reçu par: <span className="font-medium">{payment.receivedBy}</span></span>
                          </div>
                          {payment.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">{payment.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDownloadReceipt(payment.receiptNumber)}
                          className="text-indigo-600 hover:text-indigo-700 p-2"
                          title="Télécharger le reçu"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Documents */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Documents du Dossier</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Contrat de Prêt</p>
                      <p className="text-sm text-gray-600">PDF • {formatDate(loan.disbursementDate)}</p>
                    </div>
                    <Download className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Document d'Approbation</p>
                      <p className="text-sm text-gray-600">PDF • {loan.approvedAt ? formatDate(loan.approvedAt) : 'N/A'}</p>
                    </div>
                    <Download className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Shield className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Documents de Garantie</p>
                      <p className="text-sm text-gray-600">PDF • {loan.collateral || 'N/A'}</p>
                    </div>
                    <Download className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Info Garants</p>
                      <p className="text-sm text-gray-600">PDF • {loan.guarantors?.length || 0} garant(s)</p>
                    </div>
                    <Download className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Fermer
          </button>
          {loan.status === 'ACTIVE' && (
            <button
              onClick={() => setShowPaymentRecording(true)}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Enregistrer Paiement
            </button>
          )}
        </div>
      </div>

      {/* Payment Recording Modal */}
      {showPaymentRecording && (
        <PaymentRecording
          loan={loan}
          onClose={() => setShowPaymentRecording(false)}
          onSubmit={(payment) => {
            console.log('Payment submitted:', payment);
            toast.success('Paiement enregistré avec succès!');
            setShowPaymentRecording(false);
            // TODO: Refresh loan data
            if (onRecordPayment) {
              onRecordPayment();
            }
          }}
        />
      )}
    </div>
  );
};

export default LoanDetails;
