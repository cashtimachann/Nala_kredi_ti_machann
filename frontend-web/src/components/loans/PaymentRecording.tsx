import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  Calendar,
  CreditCard,
  Smartphone,
  Banknote,
  CheckCircle,
  AlertTriangle,
  Info,
  Printer,
  Calculator,
  TrendingDown,
  Percent
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { microcreditPaymentService, PaymentMethod } from '../../services/microcreditPaymentService';
import {
  calculateMonthlyPaymentFromMonthlyRate,
  resolveMonthlyRatePercent,
  roundCurrency
} from './loanRateUtils';

interface Loan {
  id: string;
  loanNumber: string;
  customerName: string;
  principalAmount: number;
  interestRate: number;
  monthlyInterestRate?: number;
  termMonths: number;
  monthlyPayment: number;
  remainingBalance: number;
  paidAmount: number;
  currency: 'HTG' | 'USD';
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
  daysOverdue?: number;
}

interface PaymentRecordingProps {
  loan: Loan;
  onClose: () => void;
  onSubmit: (payment: PaymentData) => void;
  initialAmount?: number; // optional prefilled amount (e.g., next installment + fees)
}

interface PaymentData {
  loanId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'CASH' | 'CHECK' | 'TRANSFER' | 'MOBILE_MONEY';
  checkNumber?: string;
  transferReference?: string;
  mobileProvider?: string;
  mobileReference?: string;
  notes?: string;
  principalAmount: number;
  interestAmount: number;
  penaltyAmount: number;
  newRemainingBalance: number;
}

interface FormData {
  paymentDate: string;
  amount: string;
  paymentMethod: 'CASH' | 'CHECK' | 'TRANSFER' | 'MOBILE_MONEY';
  checkNumber?: string;
  transferReference?: string;
  mobileProvider?: string;
  mobileReference?: string;
  notes?: string;
}

interface PaymentBreakdown {
  principal: number;
  interest: number;
  penalty: number;
  total: number;
  newBalance: number;
}

const PaymentRecording: React.FC<PaymentRecordingProps> = ({ loan, onClose, onSubmit, initialAmount }) => {
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown>({
    principal: 0,
    interest: 0,
    penalty: 0,
    total: 0,
    newBalance: loan.remainingBalance
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partialInfo, setPartialInfo] = useState<{ installmentTotal: number; isPartial: boolean; remainingPortion: number } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'CASH',
      amount: initialAmount ? initialAmount.toString() : ''
    }
  });
  // If initialAmount changes while modal is open (e.g., user clicked quick capture), update form amount
  useEffect(() => {
    if (initialAmount && (!paymentAmount || parseFloat(paymentAmount) === 0)) {
      setValue('amount', initialAmount.toString());
    }
  }, [initialAmount]);

  const paymentAmount = watch('amount');
  const paymentMethod = watch('paymentMethod');

  // compute monthly rate and fallback using multiple fields
  // Force 3.5% as default if not specified, matching LoanManagement logic
  const monthlyRatePercent = resolveMonthlyRatePercent((loan as any).monthlyInterestRate, loan.interestRate, 3.5);
  
  const termMonths = (loan as any).termMonths ?? (loan as any).durationMonths ?? 12;
  
  // Force recalculation to ensure consistency with 3.5% rate, ignoring potentially outdated stored values
  const effectiveMonthlyPayment = roundCurrency(
    calculateMonthlyPaymentFromMonthlyRate(loan.principalAmount, monthlyRatePercent, termMonths)
  );

  // Fee-inclusive monthly payment and remaining with fees
  const processingFee = (loan as any).approvedAmount ? roundCurrency((loan as any).approvedAmount * 0.05) : 0;
  const distributedFeePortion = termMonths > 0 ? roundCurrency(processingFee / termMonths) : 0;
  const monthlyWithFee = roundCurrency(effectiveMonthlyPayment + distributedFeePortion);
  const totalDueWithFees = roundCurrency(monthlyWithFee * termMonths);
  const remainingWithFees = roundCurrency(Math.max(0, totalDueWithFees - (loan.paidAmount || 0)));

  // Calculer la répartition du paiement
  useEffect(() => {
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) {
      setPaymentBreakdown({
        principal: 0,
        interest: 0,
        penalty: 0,
        total: 0,
        newBalance: loan.remainingBalance
      });
      setPartialInfo(null);
      return;
    }

    // Calculer la pénalité si en retard
    const penalty = loan.daysOverdue && loan.daysOverdue > 0
      ? calculatePenalty(loan.daysOverdue, effectiveMonthlyPayment)
      : 0;
    const penaltyRounded = roundCurrency(penalty);

  const interestDue = 0; // Le solde inclut déjà les intérêts, pas de calcul additionnel

    // Répartir le paiement: d'abord pénalité, puis intérêt, puis capital
    let remaining = amount;
    const penaltyPaid = Math.min(remaining, penaltyRounded);
    remaining -= penaltyPaid;

    const interestPaid = Math.min(remaining, interestDue);
    remaining -= interestPaid;

    const principalPaid = Math.min(remaining, loan.remainingBalance);
    remaining -= principalPaid;

    // Since remainingWithFees already includes dossier fees for the remaining schedule,
    // reduce it by the portion of the payment applied to scheduled dues (amount minus penalty).
    const coreApplied = Math.max(0, amount - penaltyPaid);
    const newBalance = roundCurrency(Math.max(0, remainingWithFees - coreApplied));

    setPaymentBreakdown({
      principal: roundCurrency(principalPaid),
      interest: roundCurrency(interestPaid),
      penalty: roundCurrency(penaltyPaid),
      total: roundCurrency(amount),
      newBalance
    });

    // Intelligent partial installment detection (excluding penalty portion for comparison)
  const installmentTotal = monthlyWithFee; // expected regular installment including fee
  const corePaid = coreApplied; // amount applied to scheduled dues (excl. penalty)
  const isPartial = corePaid < installmentTotal && newBalance > 0;
  const remainingPortion = isPartial ? roundCurrency(Math.max(0, installmentTotal - corePaid)) : 0;
    setPartialInfo({ installmentTotal, isPartial, remainingPortion });
  }, [paymentAmount, loan, monthlyRatePercent]);

  const calculatePenalty = (daysOverdue: number, paymentAmount: number): number => {
    // Pénalité: 1% par mois = 0.0333% par jour (aligné avec backend)
    const penaltyRate = 0.01 / 30; // 1% monthly penalty converted to daily rate
    return roundCurrency(paymentAmount * penaltyRate * daysOverdue);
  };

  const formatCurrency = (amount: number) => {
    if (loan.currency === 'HTG') {
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

  // Try to get the current authenticated user's display name from JWT
  const getCurrentUserName = (): string | undefined => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return undefined;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload: any = JSON.parse(json);
      const composed = (payload.given_name && payload.family_name)
        ? `${payload.given_name} ${payload.family_name}`
        : undefined;
      return (
        payload.name || payload.fullname || composed ||
        payload.preferred_username || payload.unique_name ||
        payload.username || payload.email || payload.sub
      );
    } catch {
      return undefined;
    }
  };

  const handleQuickAmount = (amount: number) => {
    setValue('amount', amount.toString());
  };

  const onFormSubmit = async (data: FormData) => {
    const amount = parseFloat(data.amount);

    if (amount <= 0) {
      toast.error('Le montant doit être supérieur à 0');
      return;
    }

    if (amount > loan.remainingBalance + paymentBreakdown.interest + paymentBreakdown.penalty) {
      toast.error('Le montant dépasse le solde total dû');
      return;
    }

    setIsSubmitting(true);

    try {
      // Mapper le payment method du frontend au backend
      const paymentMethodMap: Record<string, PaymentMethod> = {
        'CASH': PaymentMethod.CASH,
        'CHECK': PaymentMethod.CHECK,
        'TRANSFER': PaymentMethod.TRANSFER,
        'MOBILE_MONEY': PaymentMethod.MOBILE_MONEY
      };

      // Construire la référence selon le type de paiement
      let reference = data.notes || '';
      if (data.paymentMethod === 'CHECK' && data.checkNumber) {
        reference = `Chèque #${data.checkNumber}${data.notes ? ` - ${data.notes}` : ''}`;
      } else if (data.paymentMethod === 'TRANSFER' && data.transferReference) {
        reference = `Transfert: ${data.transferReference}${data.notes ? ` - ${data.notes}` : ''}`;
      } else if (data.paymentMethod === 'MOBILE_MONEY' && data.mobileProvider && data.mobileReference) {
        reference = `${data.mobileProvider}: ${data.mobileReference}${data.notes ? ` - ${data.notes}` : ''}`;
      }

      // Enregistrer le paiement via l'API
      const payment = await microcreditPaymentService.recordPayment({
        loanId: loan.id,
        amount,
        paymentDate: data.paymentDate,
        paymentMethod: paymentMethodMap[data.paymentMethod] || PaymentMethod.CASH,
        reference,
        notes: data.notes
      });

      // ✅ Confirmer le paiement automatiquement pour mettre à jour les balances
      await microcreditPaymentService.confirmPayment(payment.id, {
        notes: 'Confirmation automatique après enregistrement'
      });

      toast.success('Paiement enregistré et confirmé avec succès!');

      // Préparer les données pour le callback parent
      const paymentData: PaymentData = {
        loanId: loan.id,
        paymentDate: data.paymentDate,
        amount,
        paymentMethod: data.paymentMethod,
        checkNumber: data.checkNumber,
        transferReference: data.transferReference,
        mobileProvider: data.mobileProvider,
        mobileReference: data.mobileReference,
        notes: data.notes,
        principalAmount: payment.principalAmount,
        interestAmount: payment.interestAmount,
        penaltyAmount: payment.penaltyAmount,
        newRemainingBalance: paymentBreakdown.newBalance
      };

      onSubmit(paymentData);
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    const amount = parseFloat(paymentAmount || '0') || 0;
    if (amount <= 0) {
      toast.error('Veuillez saisir un montant valide avant l\'aperçu');
      return;
    }

    const methodLabel = (m: string) => {
      switch (m) {
        case 'CASH': return 'Espèces';
        case 'CHECK': return 'Chèque';
        case 'TRANSFER': return 'Virement';
        case 'MOBILE_MONEY': return 'Mobile Money';
        default: return m;
      }
    };
    const esc = (s?: string) => (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmt = (v: number) => formatCurrency(v);

    // Build reference similar to submit
    const checkNumber = watch('checkNumber');
    const transferReference = watch('transferReference');
    const mobileProvider = watch('mobileProvider');
    const mobileReference = watch('mobileReference');
    const notes = watch('notes');
    const pDate = watch('paymentDate');

  let reference = notes || '';
    if (paymentMethod === 'CHECK' && checkNumber) {
      reference = `Chèque #${checkNumber}${notes ? ` - ${notes}` : ''}`;
    } else if (paymentMethod === 'TRANSFER' && transferReference) {
      reference = `Transfert: ${transferReference}${notes ? ` - ${notes}` : ''}`;
    } else if (paymentMethod === 'MOBILE_MONEY' && mobileProvider && mobileReference) {
      reference = `${mobileProvider}: ${mobileReference}${notes ? ` - ${notes}` : ''}`;
    }

    // Estimate fees portion as the remainder after penalty/interest/principal
    const feesPortionPaid = roundCurrency(Math.max(0, amount - (paymentBreakdown.principal + paymentBreakdown.interest + paymentBreakdown.penalty)));
    const remainingAfter = paymentBreakdown.newBalance; // already fee-inclusive per our logic

    const receivedByDisplay = getCurrentUserName() || '—';
    const html = `<!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Aperçu du Reçu — ${esc(loan.loanNumber)}</title>
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
            <h2>Aperçu du Reçu (Non enregistré)</h2>
            <div class="muted">Prêt: ${esc(loan.loanNumber)}</div>
          </div>

          <div class="grid">
            <div><strong>Date/Heure:</strong> ${formatDate(pDate)}</div>
            <div><strong>Client:</strong> ${esc(loan.customerName)}</div>
            <div><strong>Méthode:</strong> ${esc(methodLabel(paymentMethod))}</div>
            <div><strong>Référence:</strong> ${esc(reference || '—')}</div>
            <div><strong>Succursale:</strong> ${esc((loan as any).branch || '—')}</div>
            <div><strong>Reçu par:</strong> ${esc(receivedByDisplay)}</div>
          </div>

          <div class="section">
            <h3>Montant Payé</h3>
            <div class="row"><div>Total saisi</div><div><strong>${fmt(amount)}</strong></div></div>
          </div>

          <div class="section">
            <h3>Détail de l'allocation (estimée)</h3>
            <div class="row"><div>Capital</div><div>${fmt(paymentBreakdown.principal)}</div></div>
            <div class="row"><div>Intérêt</div><div>${fmt(paymentBreakdown.interest)}</div></div>
            <div class="row"><div>Pénalités</div><div>${fmt(paymentBreakdown.penalty)}</div></div>
            <div class="row"><div>Frais</div><div>${fmt(feesPortionPaid)}</div></div>
          </div>

          <div class="section">
            <h3>Résumé du prêt</h3>
            <div class="row"><div>Mensualité + Frais</div><div>${fmt(monthlyWithFee)}</div></div>
            <div class="row"><div>Solde Restant (+ Frais) après paiement</div><div><strong>${fmt(remainingAfter)}</strong></div></div>
          </div>

          <div class="muted" style="margin-top:24px;">Ceci est un aperçu; le numéro de reçu final sera généré après enregistrement.</div>
          <div class="no-print" style="margin-top:12px; text-align:center; color:#666">Cette fenêtre se fermera après l'impression.</div>
        </body>
      </html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) {
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 2000);
      toast.success('Aperçu du reçu prêt à imprimer');
      return;
    }

    // Fallback iframe
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
    toast.success('Aperçu du reçu prêt à imprimer');
  };

  // Use effectiveMonthlyPayment as the base for suggested payment to ensure 3.5% rate consistency
  const suggestedPayment = monthlyWithFee;
  
  const penaltyAmount = loan.daysOverdue && loan.daysOverdue > 0 
    ? calculatePenalty(loan.daysOverdue, suggestedPayment) 
    : 0;

  const totalDue = roundCurrency(remainingWithFees + penaltyAmount);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Enregistrer un Paiement</h2>
            <p className="text-green-100">Prêt #{loan.loanNumber} - {loan.customerName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            {/* Loan Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Résumé du Prêt
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Solde Total Restant (+ Frais)</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(remainingWithFees)}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Mensualité + Frais</p>
                  <p className="text-xl font-bold text-blue-900">{formatCurrency(monthlyWithFee)}</p>
                  <p className="text-xs text-gray-500">Hors frais: {formatCurrency(effectiveMonthlyPayment)}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Prochain Paiement</p>
                  <p className="text-xl font-bold text-green-900">{formatCurrency(suggestedPayment)}</p>
                  {loan.nextPaymentDate && (
                    <p className="text-xs text-gray-600 mt-1">Dû: {formatDate(loan.nextPaymentDate)}</p>
                  )}
                </div>
              </div>

              {/* Overdue Warning */}
              {loan.daysOverdue && loan.daysOverdue > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-900">
                    <p className="font-medium mb-1">Paiement en Retard</p>
                    <p>Ce prêt est en retard de <span className="font-bold">{loan.daysOverdue} jours</span>.</p>
                    <p className="mt-1">Pénalité applicable: <span className="font-bold">{formatCurrency(penaltyAmount)}</span></p>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Détails du Paiement
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date du Paiement <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      {...register('paymentDate', { required: 'La date est requise' })}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  {errors.paymentDate && (
                    <p className="text-red-600 text-sm mt-1">{errors.paymentDate.message}</p>
                  )}
                </div>

                {/* Payment Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant du Paiement <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      {...register('amount', { 
                        required: 'Le montant est requis',
                        min: { value: 0.01, message: 'Le montant doit être positif' },
                        max: { value: totalDue, message: `Le montant ne peut pas dépasser ${formatCurrency(totalDue)}` }
                      })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-red-600 text-sm mt-1">{errors.amount.message}</p>
                  )}

                  {/* Quick Amount Buttons */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(suggestedPayment)}
                      className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      Mensualité + Frais
                      <span className="block text-xs text-green-700">
                        {formatCurrency(monthlyWithFee)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(totalDue)}
                      className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      Solde complet (+ frais)
                      <span className="block text-xs text-blue-700">
                        {formatCurrency(totalDue)}
                      </span>
                    </button>
                    {loan.daysOverdue && loan.daysOverdue > 0 && (
                      <button
                        type="button"
                        onClick={() => handleQuickAmount(roundCurrency(suggestedPayment + penaltyAmount))}
                        className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Avec pénalité
                        <span className="block text-xs text-red-700">
                          {formatCurrency(roundCurrency(suggestedPayment + penaltyAmount))}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Mode de Paiement <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'CASH' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      value="CASH"
                      {...register('paymentMethod', { required: 'Le mode de paiement est requis' })}
                      className="sr-only"
                    />
                    <Banknote className={`w-8 h-8 ${paymentMethod === 'CASH' ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium text-gray-900">Espèces</span>
                  </label>

                  <label className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'CHECK' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      value="CHECK"
                      {...register('paymentMethod', { required: 'Le mode de paiement est requis' })}
                      className="sr-only"
                    />
                    <CheckCircle className={`w-8 h-8 ${paymentMethod === 'CHECK' ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium text-gray-900">Chèque</span>
                  </label>

                  <label className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'TRANSFER' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      value="TRANSFER"
                      {...register('paymentMethod', { required: 'Le mode de paiement est requis' })}
                      className="sr-only"
                    />
                    <CreditCard className={`w-8 h-8 ${paymentMethod === 'TRANSFER' ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium text-gray-900">Virement</span>
                  </label>

                  <label className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'MOBILE_MONEY' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      value="MOBILE_MONEY"
                      {...register('paymentMethod', { required: 'Le mode de paiement est requis' })}
                      className="sr-only"
                    />
                    <Smartphone className={`w-8 h-8 ${paymentMethod === 'MOBILE_MONEY' ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium text-gray-900">Mobile Money</span>
                  </label>
                </div>
                {errors.paymentMethod && (
                  <p className="text-red-600 text-sm mt-1">{errors.paymentMethod.message}</p>
                )}
              </div>

              {/* Additional Fields Based on Payment Method */}
              {paymentMethod === 'CHECK' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de Chèque <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('checkNumber', { 
                      required: paymentMethod === 'CHECK' ? 'Le numéro de chèque est requis' : false 
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ex: 123456"
                  />
                  {errors.checkNumber && (
                    <p className="text-red-600 text-sm mt-1">{errors.checkNumber.message}</p>
                  )}
                </div>
              )}

              {paymentMethod === 'TRANSFER' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Référence du Virement <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('transferReference', { 
                      required: paymentMethod === 'TRANSFER' ? 'La référence de virement est requise' : false 
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ex: TRF-20251016-001"
                  />
                  {errors.transferReference && (
                    <p className="text-red-600 text-sm mt-1">{errors.transferReference.message}</p>
                  )}
                </div>
              )}

              {paymentMethod === 'MOBILE_MONEY' && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opérateur <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('mobileProvider', { 
                        required: paymentMethod === 'MOBILE_MONEY' ? 'L\'opérateur est requis' : false 
                      })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="MONCASH">MonCash</option>
                      <option value="NATCASH">NatCash</option>
                      <option value="LAJANCASH">Lajancash</option>
                      <option value="OTHER">Autre</option>
                    </select>
                    {errors.mobileProvider && (
                      <p className="text-red-600 text-sm mt-1">{errors.mobileProvider.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Référence de Transaction <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('mobileReference', { 
                        required: paymentMethod === 'MOBILE_MONEY' ? 'La référence de transaction est requise' : false 
                      })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Ex: MC-123456789"
                    />
                    {errors.mobileReference && (
                      <p className="text-red-600 text-sm mt-1">{errors.mobileReference.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optionnel)
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Ajoutez des notes sur ce paiement..."
                />
              </div>
            </div>

            {/* Payment Breakdown */}
            {paymentBreakdown.total > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-green-600" />
                  Répartition du Paiement
                </h3>
                {partialInfo && partialInfo.isPartial && (
                  <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-900">
                      <p className="font-medium">Paiement Partiel de l'Échéance</p>
                      <p>Montant échéance attendue (Mensualité + Frais): <span className="font-semibold">{formatCurrency(partialInfo.installmentTotal)}</span></p>
                      <p>Reste à payer pour compléter cette échéance: <span className="font-semibold">{formatCurrency(partialInfo.remainingPortion)}</span></p>
                      <p className="mt-1 text-xs text-yellow-700">Une fois le reste encaissé, la ligne d'échéance pourra être marquée comme complétée.</p>
                    </div>
                  </div>
                )}
                {partialInfo && !partialInfo.isPartial && paymentBreakdown.newBalance > 0 && (
                  <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                    Paiement couvre l'échéance courante. Prochain paiement requis pour les échéances suivantes.
                  </div>
                )}
                <div className="space-y-3">
                  {paymentBreakdown.penalty > 0 && (
                    <div className="flex justify-between items-center bg-white rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="text-gray-700">Pénalité de Retard</span>
                      </div>
                      <span className="text-lg font-semibold text-red-600">
                        {formatCurrency(paymentBreakdown.penalty)}
                      </span>
                    </div>
                  )}
                  
                  {paymentBreakdown.interest > 0 && (
                  <div className="flex justify-between items-center bg-white rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Percent className="w-5 h-5 text-blue-600" />
                      <span className="text-gray-700">Intérêt</span>
                    </div>
                    <span className="text-lg font-semibold text-blue-600">
                      {formatCurrency(paymentBreakdown.interest)}
                    </span>
                  </div>
                  )}

                  <div className="flex justify-between items-center bg-white rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Capital</span>
                    </div>
                    <span className="text-lg font-semibold text-green-600">
                      {formatCurrency(paymentBreakdown.principal)}
                    </span>
                  </div>

                  <div className="border-t-2 border-gray-300 pt-3 mt-3">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-semibold text-gray-900">Total du Paiement</span>
                      <span className="text-2xl font-bold text-green-600">
                        {formatCurrency(paymentBreakdown.total)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <span className="text-sm font-medium text-blue-900">Nouveau Solde Restant</span>
                      <span className="text-lg font-bold text-blue-900">
                        {formatCurrency(paymentBreakdown.newBalance)}
                      </span>
                    </div>
                    {partialInfo && partialInfo.isPartial && (
                      <div className="mt-2 text-xs text-gray-600">
                        Après encaissement du reste (<span className="font-semibold">{formatCurrency(partialInfo.remainingPortion)}</span>), cette échéance sera complète.
                      </div>
                    )}
                  </div>

                  {/* Full Payment Message */}
                  {paymentBreakdown.newBalance === 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-green-900">
                        <p className="font-medium">Remboursement Complet!</p>
                        <p>Ce paiement soldera complètement le prêt.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
          <button
            type="button"
            onClick={handlePrintReceipt}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Aperçu du Reçu
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit(onFormSubmit)}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isSubmitting}
              className={`px-6 py-2.5 rounded-lg font-medium text-white transition-colors ${
                paymentAmount && parseFloat(paymentAmount) > 0 && !isSubmitting
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Enregistrement en cours...' : 'Enregistrer le Paiement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentRecording;