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

interface Loan {
  id: string;
  loanNumber: string;
  customerName: string;
  principalAmount: number;
  interestRate: number;
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

const PaymentRecording: React.FC<PaymentRecordingProps> = ({ loan, onClose, onSubmit }) => {
  const [paymentBreakdown, setPaymentBreakdown] = useState({
    principal: 0,
    interest: 0,
    penalty: 0,
    total: 0,
    newBalance: loan.remainingBalance
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'CASH'
    }
  });

  const paymentAmount = watch('amount');
  const paymentMethod = watch('paymentMethod');

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
      return;
    }

    // Calculer la pénalité si en retard
    const penalty = loan.daysOverdue && loan.daysOverdue > 0
      ? calculatePenalty(loan.daysOverdue, loan.nextPaymentAmount || loan.monthlyPayment)
      : 0;

    // Calculer l'intérêt du mois en cours
    const monthlyRate = loan.interestRate / 100 / 12;
    const interestDue = loan.remainingBalance * monthlyRate;

    // Répartir le paiement: d'abord pénalité, puis intérêt, puis capital
    let remaining = amount;
    let penaltyPaid = Math.min(remaining, penalty);
    remaining -= penaltyPaid;

    let interestPaid = Math.min(remaining, interestDue);
    remaining -= interestPaid;

    let principalPaid = remaining;

    const newBalance = Math.max(0, loan.remainingBalance - principalPaid);

    setPaymentBreakdown({
      principal: principalPaid,
      interest: interestPaid,
      penalty: penaltyPaid,
      total: amount,
      newBalance
    });
  }, [paymentAmount, loan]);

  const calculatePenalty = (daysOverdue: number, paymentAmount: number): number => {
    // Pénalité: 2% du montant dû par tranche de 7 jours de retard
    const weeksOverdue = Math.ceil(daysOverdue / 7);
    const penaltyRate = 0.02 * weeksOverdue;
    return paymentAmount * penaltyRate;
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

  const handleQuickAmount = (amount: number) => {
    setValue('amount', amount.toString());
  };

  const onFormSubmit = (data: FormData) => {
    const amount = parseFloat(data.amount);

    if (amount <= 0) {
      toast.error('Le montant doit être supérieur à 0');
      return;
    }

    if (amount > loan.remainingBalance + paymentBreakdown.interest + paymentBreakdown.penalty) {
      toast.error('Le montant dépasse le solde total dû');
      return;
    }

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
      principalAmount: paymentBreakdown.principal,
      interestAmount: paymentBreakdown.interest,
      penaltyAmount: paymentBreakdown.penalty,
      newRemainingBalance: paymentBreakdown.newBalance
    };

    onSubmit(paymentData);
    toast.success('Paiement enregistré avec succès!');
    onClose();
  };

  const handlePrintReceipt = () => {
    toast.success('Impression du reçu en cours...');
    // TODO: Implement print receipt functionality
  };

  const totalDue = loan.remainingBalance + paymentBreakdown.interest + paymentBreakdown.penalty;
  const suggestedPayment = loan.nextPaymentAmount || loan.monthlyPayment;
  const penaltyAmount = loan.daysOverdue && loan.daysOverdue > 0 
    ? calculatePenalty(loan.daysOverdue, suggestedPayment) 
    : 0;

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
                  <p className="text-sm text-gray-600 mb-1">Solde du Capital</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(loan.remainingBalance)}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Paiement Mensuel</p>
                  <p className="text-xl font-bold text-blue-900">{formatCurrency(loan.monthlyPayment)}</p>
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
                    <p className="mt-1">Pénalité applicable: <span className="font-bold">{formatCurrency(calculatePenalty(loan.daysOverdue, suggestedPayment))}</span></p>
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
                        min: { value: 0.01, message: 'Le montant doit être positif' }
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
                      Paiement mensuel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(totalDue)}
                      className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      Solde complet
                    </button>
                    {loan.daysOverdue && loan.daysOverdue > 0 && (
                      <button
                        type="button"
                        onClick={() => handleQuickAmount(suggestedPayment + penaltyAmount)}
                        className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Avec pénalité
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
                      {...register('paymentMethod')}
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
                      {...register('paymentMethod')}
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
                      {...register('paymentMethod')}
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
                      {...register('paymentMethod')}
                      className="sr-only"
                    />
                    <Smartphone className={`w-8 h-8 ${paymentMethod === 'MOBILE_MONEY' ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium text-gray-900">Mobile Money</span>
                  </label>
                </div>
              </div>

              {/* Additional Fields Based on Payment Method */}
              {paymentMethod === 'CHECK' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de Chèque
                  </label>
                  <input
                    type="text"
                    {...register('checkNumber')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ex: 123456"
                  />
                </div>
              )}

              {paymentMethod === 'TRANSFER' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Référence du Virement
                  </label>
                  <input
                    type="text"
                    {...register('transferReference')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ex: TRF-20251016-001"
                  />
                </div>
              )}

              {paymentMethod === 'MOBILE_MONEY' && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opérateur
                    </label>
                    <select
                      {...register('mobileProvider')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="MONCASH">MonCash</option>
                      <option value="NATCASH">NatCash</option>
                      <option value="LAJANCASH">Lajancash</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Référence de Transaction
                    </label>
                    <input
                      type="text"
                      {...register('mobileReference')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Ex: MC-123456789"
                    />
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
                  
                  <div className="flex justify-between items-center bg-white rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Percent className="w-5 h-5 text-blue-600" />
                      <span className="text-gray-700">Intérêt</span>
                    </div>
                    <span className="text-lg font-semibold text-blue-600">
                      {formatCurrency(paymentBreakdown.interest)}
                    </span>
                  </div>

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
                      <span className="text-sm font-medium text-blue-900">Nouveau Solde du Capital</span>
                      <span className="text-lg font-bold text-blue-900">
                        {formatCurrency(paymentBreakdown.newBalance)}
                      </span>
                    </div>
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
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
              className={`px-6 py-2.5 rounded-lg font-medium text-white transition-colors ${
                paymentAmount && parseFloat(paymentAmount) > 0
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Enregistrer le Paiement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentRecording;
