import React, { useState, useEffect } from 'react';
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
  Printer,
  Loader
} from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentRecording from './PaymentRecording';
import {
  roundCurrency,
  resolveMonthlyRatePercent,
  calculateMonthlyPaymentFromMonthlyRate,
  generateAmortizationSchedule
} from './loanRateUtils';
import { LoanType, LoanStatus } from '../../types/microcredit';
import { microcreditLoanService } from '../../services/microcreditLoanService';
import { microcreditLoanApplicationService } from '../../services/microcreditLoanApplicationService';
import { ApplicationDocument } from '../../types/microcredit';
import { microcreditPaymentService } from '../../services/microcreditPaymentService';

interface Loan {
  id: string;
  loanNumber: string;
  customerId: string;
  customerName: string;
  customerCode?: string;
  customerPhone?: string;
  customerEmail?: string;
  savingsAccountNumber?: string;
  customerAddress?: string;
  occupation?: string;
  monthlyIncome?: number;
  dependents?: number;
  loanType: LoanType;
  principalAmount: number;
  interestRate: number;
  monthlyInterestRate?: number;
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
  approvedByName?: string;
  approvedAt?: string;
  daysOverdue?: number;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
  loanRecordId?: string; // Backend loan ID
  applicationId?: string; // Application ID
}

interface PaymentScheduleItem {
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number | null;
  totalPayment: number | null;
  // Backend-derived fee portion per installment (optional)
  feePortion?: number;
  // Convenience total including fee (optional)
  totalAmountWithFee?: number;
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
  branchName?: string;
}

interface LoanDetailsProps {
  loan: Loan;
  onClose: () => void;
  onRecordPayment?: () => void;
}

const LoanDetails: React.FC<LoanDetailsProps> = ({ loan, onClose, onRecordPayment }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'history' | 'documents'>('overview');
  const [showPaymentRecording, setShowPaymentRecording] = useState(false);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [applicationDocuments, setApplicationDocuments] = useState<ApplicationDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [regeneratingSchedule, setRegeneratingSchedule] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const getMonthlyInterestRatePercent = (defaultValue = 3.5): number => {
    return resolveMonthlyRatePercent(loan.monthlyInterestRate, loan.interestRate, defaultValue);
  };

  // Load payment schedule from backend API
  useEffect(() => {
    if (loan.loanRecordId || loan.id) {
      loadPaymentSchedule();
    }
  }, [loan.loanRecordId, loan.id]);

  // Load payment history from backend API
  useEffect(() => {
    if (loan.loanRecordId || loan.id) {
      loadPaymentHistory();
    }
  }, [loan.loanRecordId, loan.id]);

  useEffect(() => {
    if (loan.applicationId) {
      loadApplicationDocuments();
    }
  }, [loan.applicationId]);

  const loadPaymentSchedule = async () => {
    const loanId = loan.loanRecordId || loan.id;
    if (!loanId) {
      setScheduleError('ID du prêt non disponible');
      return;
    }

    setLoadingSchedule(true);
    setScheduleError(null);
    
    try {
      const schedule = await microcreditLoanService.getPaymentSchedule(loanId);
      
      // Map backend data to component format
      const mappedSchedule: PaymentScheduleItem[] = (schedule || []).map(item => ({
        installmentNumber: item.installmentNumber,
        dueDate: item.dueDate,
        // Prefer explicit value, default to 0 if missing
        principalAmount: item.principalAmount ?? 0,
        // If backend provided interest amount, use it; otherwise compute from loan monthly rate
        interestAmount: typeof item.interestAmount === 'number' && item.interestAmount > 0 ? item.interestAmount : null,
        totalPayment: item.totalAmount ?? null,
        // Map backend fee fields through to the UI when available
        feePortion: typeof item.feePortion === 'number' ? item.feePortion : undefined,
        totalAmountWithFee: typeof item.totalAmountWithFee === 'number' ? item.totalAmountWithFee : undefined,
        remainingBalance: 0, // Will be calculated below
        status: mapPaymentStatus(item.status),
        paidDate: item.paidDate,
        paidAmount: item.paidAmount
      }));

      // If the backend schedule is missing values (interest/total/principal),
      // compute a full local amortization using the same PMT monthly-rate formula
      // and use it as a fallback for missing fields so the calendar is consistent.
      let remainingBalance = roundCurrency(loan.principalAmount);
      const monthlyRatePercent = getMonthlyInterestRatePercent();
      const monthlyRate = monthlyRatePercent / 100;
      const normalizedMonthlyPayment = roundCurrency(
        loan.monthlyPayment && loan.monthlyPayment > 0 ? loan.monthlyPayment : effectiveMonthlyPayment
      );

      // prepare an alternate fully-computed schedule to fill missing backend fields
      // Always compute a local amortization with the same number of installments
      // so we can render consistent principal/interest/remaining values.
      const fallbackLocal = generateAmortizationSchedule(
        loan.principalAmount,
        monthlyRatePercent,
        mappedSchedule.length || loan.termMonths,
        loan.disbursementDate || loan.createdAt
      );

      // Compute fee distribution locally if backend did not provide it
  const termCount = mappedSchedule.length || loan.termMonths;
  const totalFee = roundCurrency((loan.principalAmount || 0) * 0.05);
  const baseFeePerInstallment = termCount > 0 ? Math.floor((totalFee / termCount)) : 0; // integer rounding for HTG
  const feeResidual = Math.max(0, totalFee - (baseFeePerInstallment * termCount));

      mappedSchedule.forEach((item, index) => {
        const isLastInstallment = index === mappedSchedule.length - 1;
        
        // Intérêt calculé sur le solde au DÉBUT de la période
        // Use the amortization generator's value for principal/interest/total/remaining
        // to ensure consistency across UI tabs (we still keep backend status/payed info).
        const fallbackRow = fallbackLocal[index];
        const interest = fallbackRow ? fallbackRow.interest : (monthlyRate > 0 ? roundCurrency(remainingBalance * monthlyRate) : 0);
        
        let principalPortion: number;
        let totalPayment: number;
        
        if (isLastInstallment) {
          // Dernier versement: capital restant complet + intérêt
          principalPortion = roundCurrency(remainingBalance);
          totalPayment = roundCurrency(principalPortion + interest);
        } else {
          // Versements normaux: utiliser le paiement mensuel fixe
          const fallbackPayment = fallbackRow ? fallbackRow.payment : normalizedMonthlyPayment;
          
          totalPayment = fallbackPayment;
          principalPortion = roundCurrency(fallbackPayment - interest);
          
          // S'assurer que le capital ne dépasse pas le solde restant
          if (principalPortion > remainingBalance) {
            principalPortion = roundCurrency(remainingBalance);
          }
        }

        // Mettre à jour l'item avec les valeurs calculées
        // Use computed values from the amortization generator (consistent across UI)
        item.principalAmount = principalPortion;
        item.interestAmount = interest;
        item.totalPayment = totalPayment;

        // Ensure fee fields are set: prefer backend-provided values, else compute evenly
        if (typeof item.feePortion !== 'number') {
          // Distribute residual +1 to the first "feeResidual" installments for nicer equalization
          const addOne = index < feeResidual ? 1 : 0;
          const computedFee = baseFeePerInstallment + addOne;
          item.feePortion = roundCurrency(computedFee);
        }
        if (typeof item.totalAmountWithFee !== 'number') {
          item.totalAmountWithFee = roundCurrency((item.totalPayment || 0) + (item.feePortion || 0));
        }

        // Nouveau solde après paiement du capital
        remainingBalance = roundCurrency(Math.max(0, remainingBalance - principalPortion));
        // Prefer the computed remaining balance from our amortization generator
        item.remainingBalance = remainingBalance;
      });

      setPaymentSchedule(mappedSchedule);
    } catch (error: any) {
      console.error('Error loading payment schedule:', error);
      setScheduleError(error.message || 'Erreur lors du chargement du calendrier');
      setPaymentSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Fallback local amortization generator si backend pa voye calendrier oswa li enkonplè
  const generateLocalAmortization = (): PaymentScheduleItem[] => {
    const months = loan.termMonths;
    const principal = loan.principalAmount;
    if (!months || months <= 0 || !principal || principal <= 0) return [];

    const monthlyRatePercent = getMonthlyInterestRatePercent(3.5); // default 3.5%

    const rows = generateAmortizationSchedule(
      principal,
      monthlyRatePercent,
      months,
      loan.disbursementDate || loan.createdAt
    );

    return rows.map(r => ({
      installmentNumber: r.month,
      dueDate: r.dueDate || '',
      principalAmount: r.principalPayment,
      interestAmount: r.interest,
      totalPayment: r.payment,
      remainingBalance: r.endingBalance,
      status: 'UPCOMING'
    }));
  };

  const loadPaymentHistory = async () => {
    const loanId = loan.loanRecordId || loan.id;
    if (!loanId) {
      setHistoryError('ID du prêt non disponible');
      return;
    }

    setLoadingHistory(true);
    setHistoryError(null);
    
    try {
  const payments = await microcreditPaymentService.getLoanPayments(loanId);
      
      // Map backend data to component format
      const mappedHistory: PaymentHistory[] = payments.map(payment => ({
        id: payment.id,
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        principal: payment.principalAmount,
        interest: payment.interestAmount,
        penalty: payment.penaltyAmount || 0,
        paymentMethod: mapPaymentMethod(payment.paymentMethod),
        receiptNumber: payment.receiptNumber,
        receivedBy: payment.processedByName || payment.processedBy,
        notes: payment.notes,
        branchName: payment.branchName
      }));

      setPaymentHistory(mappedHistory.reverse()); // Most recent first
    } catch (error: any) {
      console.error('Error loading payment history:', error);
      setHistoryError(error.message || 'Erreur lors du chargement de l\'historique');
      setPaymentHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadApplicationDocuments = async () => {
    const applicationId = loan.applicationId || loan.id;
    if (!applicationId) {
      setDocumentsError('ID de la demande non disponible');
      setApplicationDocuments([]);
      return;
    }
    setLoadingDocuments(true);
    setDocumentsError(null);
    try {
      const docs = await microcreditLoanApplicationService.getDocuments(applicationId);
      setApplicationDocuments(docs || []);
    } catch (error: any) {
      console.error('Error loading application documents:', error);
      setDocumentsError(error?.message || 'Erreur lors du chargement des documents');
      setApplicationDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleDownloadApplicationDocument = async (doc: ApplicationDocument) => {
    try {
      const applicationId = loan.applicationId || loan.id;
      if (!applicationId) return;
      const blob = await microcreditLoanApplicationService.downloadDocument(applicationId, doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name || `${doc.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast.error('Échec du téléchargement du document');
    }
  };

  const mapPaymentStatus = (status: string): 'PAID' | 'PENDING' | 'OVERDUE' | 'UPCOMING' => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'PAID';
      case 'PENDING':
        return 'PENDING';
      case 'OVERDUE':
        return 'OVERDUE';
      case 'PARTIAL':
        return 'PENDING';
      default:
        return 'UPCOMING';
    }
  };

  const mapPaymentMethod = (method: string): 'CASH' | 'CHECK' | 'TRANSFER' | 'MOBILE_MONEY' => {
    switch (method) {
      case 'Cash':
        return 'CASH';
      case 'Check':
        return 'CHECK';
      case 'BankTransfer':
      case 'Transfer':
        return 'TRANSFER';
      case 'MobileMoney':
        return 'MOBILE_MONEY';
      default:
        return 'CASH';
    }
  };

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

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const calculateMonthlyPayment = (principal: number, annualInterestRatePercent: number, months: number) => {
    // Calculate monthly payment using the annual interest rate percent
    if (!principal || months <= 0) return 0;
    const monthlyRate = (annualInterestRatePercent || 0) / 100 / 12;
    if (monthlyRate === 0) return principal / months;
    const numerator = monthlyRate * Math.pow(1 + monthlyRate, months);
    const denominator = Math.pow(1 + monthlyRate, months) - 1;
    return principal * (numerator / denominator);
  };

  // Ensure we always use a normalized monthly rate percent (3.5 means 3.5%).
  // Some records store monthlyInterestRate as a decimal (0.035); getMonthlyInterestRatePercent
  // will normalize either format to the expected percent value.
  const normalizedMonthlyRatePercent = getMonthlyInterestRatePercent();
  
  // Force recalculation to ensure consistency with the displayed rate (3.5%)
  // ignoring potentially incorrect historical values in loan.monthlyPayment
  const effectiveMonthlyPayment = (typeof normalizedMonthlyRatePercent === 'number' && normalizedMonthlyRatePercent > 0)
      ? calculateMonthlyPaymentFromMonthlyRate(loan.principalAmount, normalizedMonthlyRatePercent, loan.termMonths)
      : (loan.monthlyPayment || calculateMonthlyPayment(loan.principalAmount, loan.interestRate, loan.termMonths));

  // If paymentSchedule is empty after loading and no scheduleError OR schedule has zero principals, generate fallback
  useEffect(() => {
    if (!loadingSchedule && paymentSchedule.length === 0 && !scheduleError) {
      const local = generateLocalAmortization();
      if (local.length > 0) {
        setPaymentSchedule(local);
      }
    } else if (!loadingSchedule && paymentSchedule.length > 0) {
      // Detect broken schedule (all principalAmount 0)
      const allZeroCapital = paymentSchedule.every(p => !p.principalAmount || p.principalAmount === 0);
      if (allZeroCapital) {
        const local = generateLocalAmortization();
        if (local.length > 0) setPaymentSchedule(local);
      }
    }
  }, [loadingSchedule, paymentSchedule, scheduleError]);

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
      PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      APPROVED: { label: 'Approuvé', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
      DISBURSED: { label: 'Décaissé', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: DollarSign },
      ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      OVERDUE: { label: 'En retard', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
      PAID: { label: 'Payé', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
      REJECTED: { label: 'Rejeté', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle }
    };
    const badge = badges[status] || badges.PENDING;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  // Helpers & derived values that were missing
  const getPaymentMethodLabel = (method: PaymentHistory['paymentMethod']) => {
    switch (method) {
      case 'CASH': return 'Espèces';
      case 'CHECK': return 'Chèque';
      case 'TRANSFER': return 'Virement';
      case 'MOBILE_MONEY': return 'Mobile Money';
      default: return method;
    }
  };

  const handlePrintReceipt = async (payment: PaymentHistory) => {
    try {
      const receipt = await microcreditPaymentService.getPaymentReceipt(payment.id);

      const fmt = (v: number, currency = loan.currency) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + (currency ? ` ${currency}` : '');
      const esc = (s?: string) => (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const methodLabel = (m: string) => {
        switch (m) {
          case 'CASH': return 'Espèces';
          case 'CHECK': return 'Chèque';
          case 'TRANSFER': return 'Virement';
          case 'MOBILE_MONEY': return 'Mobile Money';
          default: return m;
        }
      };

      // Prefer a human-friendly receiver name when available
      const receivedByDisplay = (receipt as any).receivedByName || payment.receivedBy || receipt.receivedBy;

      // Compute remaining balance including dossier fees at the time of this receipt
      const receiptDate = new Date((receipt as any).paymentDate || payment.paymentDate);
      const totalPaidUntil = paymentHistory
        .filter(p => {
          const d = new Date(p.paymentDate);
          return d.getTime() <= receiptDate.getTime() || p.id === payment.id;
        })
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const grandTotalWithFees = (scheduleFeeTotals?.totalWithFees ?? 0);
      const remainingWithFeesAtThisReceipt = Math.max(0, roundCurrency(grandTotalWithFees - totalPaidUntil));

      const html = `<!DOCTYPE html>
        <html lang="fr">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Reçu - ${esc(receipt.receiptNumber)}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; color:#111; }
              .header { text-align: center; margin-bottom: 16px }
              .muted { color:#666; font-size: 0.9rem }
              .grid { display:grid; grid-template-columns: 1fr 1fr; gap:8px 16px; }
              .row { display:flex; justify-content:space-between; margin:6px 0 }
              .section { border:1px solid #e5e7eb; border-radius:8px; padding:12px; margin-top:12px }
              h2 { margin: 0 0 4px 0; font-size: 18px; }
              h3 { margin: 0 0 8px 0; font-size: 14px; color:#374151 }
              @media print { .no-print { display: none; } }
            </style>
            <script>
              window.addEventListener('load', function(){
                try { window.print(); } catch(e) {}
                setTimeout(function(){ try { window.close(); } catch(e) {} }, 300);
              });
            </script>
          </head>
          <body>
            <div class="header">
              <h1>Nala Kredi Ti Machann</h1>
              <h2>Reçu de Paiement Microcrédit</h2>
              <div class="muted">N° Reçu: ${esc(receipt.receiptNumber)}</div>
            </div>

            <div class="grid">
              <div><strong>Date/Heure:</strong> ${new Date(receipt.paymentDate).toLocaleString('fr-FR')}</div>
              <div><strong>Généré le:</strong> ${new Date(receipt.generatedAt).toLocaleString('fr-FR')}</div>
              <div><strong>Client:</strong> ${esc(receipt.borrowerName)}</div>
              <div><strong>Prêt #:</strong> ${esc(receipt.loanNumber)}</div>
              <div><strong>Méthode:</strong> ${esc(methodLabel(receipt.paymentMethod))}</div>
              <div><strong>Référence:</strong> ${esc(receipt.transactionReference || '—')}</div>
              <div><strong>Succursale:</strong> ${esc(receipt.branchName || payment.branchName || (loan as any).branch || '')}</div>
              <div><strong>Reçu par:</strong> ${esc(receivedByDisplay)}</div>
            </div>

            <div class="section">
              <h3>Montant Payé</h3>
              <div class="row"><div>Total versé</div><div><strong>${fmt(receipt.paymentAmount)}</strong></div></div>
            </div>

            <div class="section">
              <h3>Détail de l'allocation</h3>
              <div class="row"><div>Capital</div><div>${fmt(receipt.allocation?.principalAmount || 0)}</div></div>
              <div class="row"><div>Intérêt</div><div>${fmt(receipt.allocation?.interestAmount || 0)}</div></div>
              <div class="row"><div>Pénalités</div><div>${fmt(receipt.allocation?.penaltyAmount || 0)}</div></div>
              <div class="row"><div>Frais</div><div>${fmt(receipt.allocation?.feesAmount || 0)}</div></div>
            </div>

            <div class="section">
              <h3>Résumé du prêt</h3>
              <div class="row"><div>Total à rembourser (+ Frais)</div><div>${fmt(grandTotalWithFees)}</div></div>
              <div class="row"><div>Total payé jusqu'à ce reçu</div><div>${fmt(totalPaidUntil)}</div></div>
              <div class="row"><div>Solde Restant (+ Frais)</div><div><strong>${fmt(remainingWithFeesAtThisReceipt)}</strong></div></div>
            </div>

            <div class="muted" style="margin-top:24px;">Merci pour votre paiement.</div>
            <div class="no-print" style="margin-top:12px; text-align:center; color:#666">Cette fenêtre se fermera après l'impression.</div>
          </body>
        </html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (w) {
        setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 2000);
        toast.success('Reçu prêt à imprimer');
        return;
      }

      // Fallback if popup blocked
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      const cleanup = () => { try { document.body.removeChild(iframe); } catch {} try { URL.revokeObjectURL(url); } catch {} };
      iframe.onload = () => {
        try { const win = iframe.contentWindow as Window | null; if (win) { win.focus(); win.print(); } } catch {}
        setTimeout(cleanup, 1000);
      };
      document.body.appendChild(iframe);
      toast.success('Reçu prêt à imprimer');
    } catch (error: any) {
      console.error('Error printing receipt:', error);
      toast.error(error?.message || "Erreur lors de la génération du reçu");
    }
  };

  const handleDownloadContract = () => {
    toast.error('Téléchargement du contrat non implémenté');
  };

  const handlePrintSchedule = () => {
    if (paymentSchedule.length === 0) {
      toast.error('Aucun calendrier à exporter');
      return;
    }

    try {
      // CSV header with UTF-8 BOM for Excel compatibility
      let csvContent = '\ufeff';
  csvContent += '"#","Date d\'Échéance","Capital","Intérêt","Frais","Total (hors frais)","Total + Frais","Solde Restant (+ Frais)","Statut"\n';

      // Add data rows
      let cumulativeWithFees = 0;
      const grandTotalWithFeesCsv = scheduleFeeTotals.totalWithFees || 0;
      paymentSchedule.forEach(item => {
        const statusText = 
          item.status === 'PAID' ? 'Payé' :
          item.status === 'PENDING' ? 'En cours' :
          item.status === 'OVERDUE' ? 'En retard' :
          item.status === 'UPCOMING' ? 'À venir' : '';

        const totalHorsFrais = item.totalPayment ?? roundCurrency((item.principalAmount || 0) + (item.interestAmount || 0));
        const totalAvecFrais = (item.totalAmountWithFee ?? (totalHorsFrais + (item.feePortion || 0)));
        cumulativeWithFees += totalAvecFrais;
        const remainingWithFees = Math.max(0, roundCurrency(grandTotalWithFeesCsv - cumulativeWithFees));

        csvContent += `${item.installmentNumber},`;
        csvContent += `"${formatDate(item.dueDate)}",`;
        csvContent += `"${formatCurrency(item.principalAmount, loan.currency)}",`;
        csvContent += `"${formatCurrency(item.interestAmount ?? 0, loan.currency)}",`;
        csvContent += `"${formatCurrency(item.feePortion ?? 0, loan.currency)}",`;
  csvContent += `"${formatCurrency(totalHorsFrais, loan.currency)}",`;
  csvContent += `"${formatCurrency(totalAvecFrais, loan.currency)}",`;
        csvContent += `"${formatCurrency(remainingWithFees, loan.currency)}",`;
        csvContent += `"${statusText}"\n`;
      });

      // Add totals row
      csvContent += '\n';
      csvContent += `"TOTAL","",`;
  // Totals row: sum of fee portions and total with fees
  const totalFees = paymentSchedule.reduce((sum, i) => sum + (i.feePortion || 0), 0);
  const totalWithFees = scheduleTotals.total + totalFees;
  csvContent += `"${formatCurrency(scheduleTotals.principal, loan.currency)}",`;
  csvContent += `"${formatCurrency(scheduleTotals.interest, loan.currency)}",`;
  csvContent += `"${formatCurrency(totalFees, loan.currency)}",`;
  csvContent += `"${formatCurrency(scheduleTotals.total, loan.currency)}",`;
  csvContent += `"${formatCurrency(totalWithFees, loan.currency)}","",""\n`;

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `calendrier_amortissement_${loan.loanNumber}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Calendrier exporté avec succès');
    } catch (error) {
      console.error('Error exporting schedule:', error);
      toast.error('Erreur lors de l\'export du calendrier');
    }
  };

  // Export PDF of loan details (current tab view: overview or schedule table)
  const handleExportPdf = () => {
    try {
      const openPrintWindow = (html: string) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) { toast.error('Veuillez autoriser les pop-ups pour exporter en PDF'); return; }
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      };

      const title = `Détails du Prêt — ${loan.loanNumber}`;
      let contentHtml = '';

      if (activeTab === 'schedule') {
        if (paymentSchedule.length === 0) { toast.error('Aucun calendrier à exporter'); return; }
        const header = '<tr><th>#</th><th>Date</th><th>Capital</th><th>Intérêt</th><th>Frais</th><th>Total</th><th>Total + Frais</th><th>Solde (+ Frais)</th><th>Statut</th></tr>';
        let cumulativeWithFees = 0;
        const grandTotalWithFeesPdf = scheduleFeeTotals.totalWithFees || 0;
        const rows = paymentSchedule.map(i => {
          const statusText = i.status === 'PAID' ? 'Payé' : i.status === 'OVERDUE' ? 'En retard' : i.status === 'UPCOMING' ? 'À venir' : 'En cours';
          const totalHorsFrais = i.totalPayment ?? roundCurrency((i.principalAmount || 0) + (i.interestAmount || 0));
          const totalAvecFrais = (i.totalAmountWithFee ?? (totalHorsFrais + (i.feePortion || 0)));
          cumulativeWithFees += totalAvecFrais;
          const remainingWithFees = Math.max(0, roundCurrency(grandTotalWithFeesPdf - cumulativeWithFees));
          return `<tr><td>${i.installmentNumber}</td><td>${formatDate(i.dueDate)}</td><td>${formatCurrency(i.principalAmount, loan.currency)}</td><td>${formatCurrency(i.interestAmount || 0, loan.currency)}</td><td>${formatCurrency(i.feePortion || 0, loan.currency)}</td><td>${formatCurrency(totalHorsFrais, loan.currency)}</td><td>${formatCurrency(totalAvecFrais, loan.currency)}</td><td>${formatCurrency(remainingWithFees, loan.currency)}</td><td>${statusText}</td></tr>`;
        }).join('');
        contentHtml = `<table><thead>${header}</thead><tbody>${rows}</tbody></table>`;
      } else {
        // Overview: basic key fields
        contentHtml = `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div><strong>Numéro:</strong> ${loan.loanNumber}</div>
            <div><strong>Client:</strong> ${loan.customerName}</div>
            <div><strong>Montant:</strong> ${formatCurrency(loan.principalAmount, loan.currency)}</div>
            <div><strong>Mensualité:</strong> ${formatCurrency(loan.monthlyPayment, loan.currency)}</div>
            <div><strong>Durée (mois):</strong> ${loan.termMonths}</div>
            <div><strong>Statut:</strong> ${loan.status}</div>
            <div><strong>Succursale:</strong> ${loan.branch}</div>
            <div><strong>Agent:</strong> ${loan.loanOfficer}</div>
          </div>`;
      }

      const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans',sans-serif;padding:24px}
          h1{font-size:18px;margin-bottom:12px}
          table{width:100%;border-collapse:collapse;margin-top:8px}
          th,td{border:1px solid #ddd;padding:6px;font-size:12px}
          th{background:#f3f4f6;text-align:left}
        </style>
      </head><body>
        <h1>${title}</h1>
        ${contentHtml}
      </body></html>`;

      openPrintWindow(html);
    } catch (error) {
      console.error('Error exporting loan PDF:', error);
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  // Trigger backend schedule regeneration then reload local schedule
  const handleRegenerateSchedule = async () => {
    const loanId = loan.loanRecordId || loan.id;
    if (!loanId) {
      toast.error("ID du prêt non disponible");
      return;
    }
    try {
      setRegeneratingSchedule(true);
      const result = await microcreditLoanService.regenerateSchedule(loanId);
      if ((result as any)?.success === false) {
        // Some backends may return plain ok; still proceed to reload
        toast('Régénération terminée');
      } else {
        toast.success('Calendrier régénéré avec succès');
      }
      // Reload schedule from backend to reflect recalculated lines
      await loadPaymentSchedule();
    } catch (error: any) {
      console.error('Error regenerating schedule:', error);
      toast.error(error?.message || "Erreur lors de la régénération du calendrier");
    } finally {
      setRegeneratingSchedule(false);
    }
  };

  // Totals & progress metrics
  const totalPrincipalPaid = paymentHistory.reduce((sum, p) => sum + (p.principal || 0), 0);
  const totalInterestPaid = paymentHistory.reduce((sum, p) => sum + (p.interest || 0), 0);
  const progressPercentage = loan.principalAmount > 0 ? Math.min(100, (totalPrincipalPaid / loan.principalAmount) * 100) : 0;

  // Interest totals derived from effective payment estimation
  const estimatedTotalInterest = roundCurrency((effectiveMonthlyPayment * loan.termMonths) - loan.principalAmount);

  const scheduleTotals = React.useMemo(() => {
    if (!paymentSchedule.length) {
      return { principal: 0, interest: 0, total: 0 };
    }
    const totals = paymentSchedule.reduce(
      (acc, item) => {
        acc.principal += item.principalAmount || 0;
        acc.interest += item.interestAmount || 0;
        acc.total += item.totalPayment || 0;
        return acc;
      },
      { principal: 0, interest: 0, total: 0 }
    );
    return {
      principal: roundCurrency(totals.principal),
      interest: roundCurrency(totals.interest),
      total: roundCurrency(totals.total)
    };
  }, [paymentSchedule]);

  // Fee totals and grand totals including fees
  const scheduleFeeTotals = React.useMemo(() => {
    const feeTotal = paymentSchedule.reduce((sum, i) => sum + (i.feePortion || 0), 0);
    return {
      fee: roundCurrency(feeTotal),
      totalWithFees: roundCurrency(scheduleTotals.total + feeTotal)
    };
  }, [paymentSchedule, scheduleTotals]);

  // Si on a un calendrier, utiliser ses totaux; sinon estimer
  const plannedInterestTotal = scheduleTotals.interest > 0
    ? scheduleTotals.interest
    : estimatedTotalInterest;

  // Le total à rembourser doit être basé sur le calendrier réel, pas mensualité × durée
  // car le dernier versement peut être différent
  const plannedTotalRepayment = scheduleTotals.total > 0
    ? scheduleTotals.total
    : roundCurrency(loan.principalAmount + estimatedTotalInterest);

  const remainingPlannedInterest = Math.max(0, roundCurrency(plannedInterestTotal - totalInterestPaid));

  // Remaining to pay including fees, based on schedule totals and payment history amounts
  const totalPaidAmount = paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remainingPlannedTotalWithFees = React.useMemo(() => {
    const grandTotal = (scheduleFeeTotals.totalWithFees || 0);
    return Math.max(0, roundCurrency(grandTotal - totalPaidAmount));
  }, [scheduleFeeTotals, totalPaidAmount]);

  // Convenience: dossier fee totals and monthly portion, plus monthly payment including fees
  const approvedAmountForFees = (loan as any).approvedAmount ?? loan.principalAmount ?? 0;
  const dossierFeeTotal = roundCurrency(approvedAmountForFees * 0.05);
  const monthlyFeePortion = roundCurrency(dossierFeeTotal / (loan.termMonths || 1));
  const monthlyPaymentWithFee = (loan as any).monthlyPaymentWithFee ?? roundCurrency(effectiveMonthlyPayment + monthlyFeePortion);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Détails du Prêt</h2>
            <div className="flex items-center gap-4">
              <p className="text-indigo-100">#{loan.loanNumber}</p>
              <div>{getStatusBadge(loan.status)}</div>
              {(loan as any).approvedAmount && loan.status === LoanStatus.APPROVED && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-900 border border-blue-200">
                  <CheckCircle className="w-4 h-4" />
                  Calendrier basé sur le Montant approuvé
                </span>
              )}
              <div className="ml-3">
                <p className="text-sm text-indigo-200">Numéro Compte Épargne</p>
                <p className="text-indigo-100 text-sm">{loan.savingsAccountNumber || loan.customerCode || loan.customerId}</p>
              </div>
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
                    {(loan as any).approvedAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Frais dossier (5%)</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(dossierFeeTotal, loan.currency)}
                        </span>
                      </div>
                    )}
                  <span className="text-2xl font-bold text-indigo-600">{progressPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 mb-4">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-6 rounded-full flex items-center justify-end pr-3"
                    style={{ width: `${Math.min(100, progressPercentage)}%` }}
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
                      <p className="text-sm text-gray-600 mb-1">Reste à Payer (+ Frais)</p>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(remainingPlannedTotalWithFees, loan.currency)}</p>
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
                      <span className="font-semibold text-indigo-600">{formatCurrency(loan.principalAmount, loan.currency)}</span>
                    </div>
                    {(loan as any).approvedAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Frais dossier (5%) réparti / mois:</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(monthlyFeePortion, loan.currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mensualité + Frais:</span>
                      <span className="font-semibold text-purple-600">{formatCurrency(monthlyPaymentWithFee, loan.currency)}</span>
                    </div>
                    {(loan as any).requestedAmount && (loan as any).requestedAmount !== loan.principalAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Montant demandé:</span>
                        <span className="font-semibold">{formatCurrency((loan as any).requestedAmount, loan.currency)}</span>
                      </div>
                    )}
                    {(loan as any).approvedAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Montant approuvé:</span>
                        <span className="font-semibold text-blue-600">{formatCurrency((loan as any).approvedAmount, loan.currency)}</span>
                      </div>
                    )}
                    {(loan as any).approvedAmount && (loan as any).requestedAmount && (loan as any).requestedAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Différence vs demandé:</span>
                        <span className="font-semibold text-blue-500">
                          {((((loan as any).approvedAmount - (loan as any).requestedAmount) / (loan as any).requestedAmount) * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taux mensuel (effectif):</span>
                      <span className="font-semibold">{getMonthlyInterestRatePercent().toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taux annuel (équivalent):</span>
                      <span className="font-semibold">{(getMonthlyInterestRatePercent() * 12).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée:</span>
                      <span className="font-semibold">{loan.termMonths} mois</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paiement Mensuel:</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(effectiveMonthlyPayment, loan.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Intérêt Total (estimé):</span>
                      <span className="font-semibold text-purple-600">{formatCurrency(plannedInterestTotal, loan.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Intérêt Payé:</span>
                      <span className="font-semibold">{formatCurrency(totalInterestPaid, loan.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Intérêt Restant (estimé):</span>
                      <span className="font-semibold text-red-600">{formatCurrency(remainingPlannedInterest, loan.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total (hors frais):</span>
                      <span className="font-semibold">{formatCurrency(plannedTotalRepayment, loan.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total à Rembourser (+ Frais):</span>
                      <span className="font-semibold text-indigo-700">{formatCurrency(scheduleFeeTotals.totalWithFees, loan.currency)}</span>
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
                      <p className="text-sm text-gray-600">Numéro Compte Épargne</p>
                      <p className="font-semibold text-gray-900">{loan.customerCode || loan.customerId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Téléphone</p>
                        <p className="font-semibold text-gray-900">{loan.customerPhone || 'N/A'}</p>
                      </div>
                    </div>
                    {loan.customerEmail && (
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-semibold text-gray-900">{loan.customerEmail}</p>
                      </div>
                    )}
                    {loan.customerAddress && (
                      <div>
                        <p className="text-sm text-gray-600">Adresse</p>
                        <p className="font-semibold text-gray-900">{loan.customerAddress}</p>
                      </div>
                    )}
                    {loan.occupation && (
                      <div>
                        <p className="text-sm text-gray-600">Profession</p>
                        <p className="font-semibold text-gray-900">{loan.occupation}</p>
                      </div>
                    )}
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
                        { (loan as any).approvedByName || loan.approvedBy ? (
                          <p className="text-xs text-gray-500">Par: {(loan as any).approvedByName || loan.approvedBy}</p>
                        ) : null }
                      </div>
                    )}
                    {loan.disbursementDate && (
                      <div>
                        <p className="text-sm text-gray-600">Date de Décaissement</p>
                        <p className="font-semibold text-gray-900">{formatDate(loan.disbursementDate)}</p>
                      </div>
                    )}
                    {loan.maturityDate && (
                      <div>
                        <p className="text-sm text-gray-600">Date d'Échéance Finale</p>
                        <p className="font-semibold text-gray-900">{formatDate(loan.maturityDate)}</p>
                      </div>
                    )}
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRegenerateSchedule}
                    disabled={regeneratingSchedule}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${regeneratingSchedule ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700'}`}
                    title="Régénérer le calendrier côté serveur"
                  >
                    {regeneratingSchedule ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span className="text-sm">Regénérer</span>
                  </button>
                  {paymentSchedule.length > 0 && !loadingSchedule && (
                    <button
                      onClick={handlePrintSchedule}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Exporter en CSV"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={handleExportPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Exporter PDF"
                  >
                    <Download className="w-4 h-4" />
                    Exporter PDF
                  </button>
                </div>
              </div>

              {paymentSchedule.length === 0 && !loadingSchedule ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                  <p className="text-yellow-700">
                    Le calendrier d'amortissement sera généré automatiquement après que l'administrateur 
                    ait approuvé le prêt et défini la date de décaissement.
                  </p>
                </div>
              ) : (
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
                        Frais
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total (hors frais)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total + Frais
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Solde Restant (+ Frais)
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      let cumulativeWithFees = 0;
                      const grandTotalWithFeesUi = scheduleFeeTotals.totalWithFees || 0;
                      return paymentSchedule.map((item) => {
                        const totalHorsFrais = item.totalPayment ?? roundCurrency((item.principalAmount || 0) + (item.interestAmount || 0));
                        const totalAvecFrais = (item.totalAmountWithFee ?? (totalHorsFrais + (item.feePortion || 0)));
                        cumulativeWithFees += totalAvecFrais;
                        const remainingWithFees = Math.max(0, roundCurrency(grandTotalWithFeesUi - cumulativeWithFees));
                        return (
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
                          {formatCurrency(item.interestAmount ?? 0, loan.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {formatCurrency(item.feePortion ?? 0, loan.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                          {formatCurrency(item.totalPayment ?? 0, loan.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-indigo-700">
                          {formatCurrency((item.totalAmountWithFee ?? ((item.totalPayment ?? 0) + (item.feePortion ?? 0))), loan.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {formatCurrency(remainingWithFees, loan.currency)}
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
                        );
                      });
                    })()}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td colSpan={2} className="px-6 py-4 text-sm text-gray-900">
                        TOTAL
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {formatCurrency(scheduleTotals.principal, loan.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {formatCurrency(scheduleTotals.interest, loan.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {formatCurrency(scheduleFeeTotals.fee, loan.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {formatCurrency(scheduleTotals.total, loan.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-indigo-700">
                        {formatCurrency(scheduleFeeTotals.totalWithFees, loan.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900"></td>
                      <td className="px-6 py-4 text-sm text-center text-gray-900"></td>
                    </tr>
                  </tfoot>
                </table>
                  {/* Totals summary below table */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Total Capital</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(scheduleTotals.principal, loan.currency)}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Total Intérêt</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(scheduleTotals.interest, loan.currency)}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Total Frais</p>
                      <p className="text-sm font-semibold text-indigo-700">{formatCurrency(scheduleFeeTotals.fee, loan.currency)}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Total (hors frais)</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(scheduleTotals.total, loan.currency)}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Total + Frais</p>
                      <p className="text-sm font-bold text-purple-700">{formatCurrency(scheduleFeeTotals.totalWithFees, loan.currency)}</p>
                    </div>
                  </div>
              </div>
              )}
            </div>
          )}

          {/* Tab: Payment History */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Historique des Paiements</h3>
                {loan.status === 'ACTIVE' && !loadingHistory && (
                  <button
                    onClick={() => setShowPaymentRecording(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    Enregistrer Paiement
                  </button>
                )}
              </div>

              {loadingHistory ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                  <Loader className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-spin" />
                  <h4 className="text-lg font-semibold text-blue-900 mb-2">
                    Chargement de l'historique...
                  </h4>
                  <p className="text-blue-700">
                    Veuillez patienter pendant que nous chargeons l'historique des paiements.
                  </p>
                </div>
              ) : historyError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-red-900 mb-2">
                    Erreur de chargement
                  </h4>
                  <p className="text-red-700 mb-4">{historyError}</p>
                  <button
                    onClick={loadPaymentHistory}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                  <Clock className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-blue-900 mb-2">
                    Aucun Paiement Enregistré
                  </h4>
                  <p className="text-blue-700">
                    {!loan.disbursementDate 
                      ? "L'historique des paiements sera disponible après l'approbation et le décaissement du prêt."
                      : "Aucun paiement n'a encore été effectué sur ce prêt."}
                  </p>
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
                            <span>Méthode: <span className="font-medium">{getPaymentMethodLabel(payment.paymentMethod)}</span></span>
                            <span>Reçu par: <span className="font-medium">{payment.receivedBy}</span></span>
                          </div>
                          {payment.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">{payment.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handlePrintReceipt(payment)}
                          className="text-indigo-600 hover:text-indigo-700 p-2"
                          title="Imprimer / Télécharger le reçu"
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
              {loadingDocuments ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                  <Loader className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-spin" />
                  <h4 className="text-lg font-semibold text-blue-900 mb-2">Chargement des documents...</h4>
                </div>
              ) : documentsError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-red-900 mb-2">Erreur de chargement</h4>
                  <p className="text-red-700 mb-4">{documentsError}</p>
                  <button
                    onClick={loadApplicationDocuments}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              ) : applicationDocuments.length === 0 ? (
                (loan.disbursementDate || loan.approvedAt || loan.collateral || (loan.guarantors && loan.guarantors.length > 0)) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={handleDownloadContract}
                  >
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

                  <div 
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={handleDownloadContract}
                  >
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

                  <div 
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={handleDownloadContract}
                  >
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

                  <div 
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={handleDownloadContract}
                  >
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
                ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                  <FileText className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-yellow-900 mb-2">Aucun document disponible</h4>
                  <p className="text-yellow-700">Aucun document n'a été uploadé pour cette demande.</p>
                </div>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {applicationDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{doc.name || 'Document'}</p>
                          <p className="text-sm text-gray-600">{doc.description || ''}</p>
                          <p className="text-xs text-gray-500">{formatDate(doc.uploadedAt)} • {Math.round(doc.fileSize/1024)} KB</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.verified && (
                            <span className="text-sm text-green-600">Vérifié</span>
                          )}
                          <button
                            onClick={() => handleDownloadApplicationDocument(doc)}
                            className="text-indigo-600 hover:text-indigo-700 p-2"
                            title="Télécharger"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

        {/* Payment Recording Modal */}
        {showPaymentRecording && (
          <PaymentRecording
            loan={loan}
            onClose={() => setShowPaymentRecording(false)}
            onSubmit={(payment) => {
              console.log('Payment submitted:', payment);
              toast.success('Paiement enregistré avec succès!');
              setShowPaymentRecording(false);
              loadPaymentSchedule();
              loadPaymentHistory();
              if (onRecordPayment) onRecordPayment();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default LoanDetails;