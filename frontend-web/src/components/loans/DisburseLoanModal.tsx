import React, { useState } from 'react';
import { X, Calendar, DollarSign, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { microcreditLoanService } from '../../services/microcreditLoanService';
import {
  calculateMonthlyPaymentFromMonthlyRate,
  resolveMonthlyRatePercent,
  resolveAnnualRatePercent,
  roundCurrency
} from './loanRateUtils';

interface Loan {
  id: string;
  loanNumber: string;
  loanRecordId?: string;
  applicationId?: string;
  customerName: string;
  principalAmount: number;
  currency: 'HTG' | 'USD';
  termMonths: number;
  interestRate: number;
  monthlyInterestRate?: number;
  monthlyPayment: number;
  status: string;
  approvedAt?: string;
}

interface DisburseLoanModalProps {
  loan: Loan;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  disbursementDate: string;
  notes: string;
}

const DisburseLoanModal: React.FC<DisburseLoanModalProps> = ({ loan, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      disbursementDate: new Date().toISOString().split('T')[0],
      notes: ''
    }
  });

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

  const monthlyRatePercent = resolveMonthlyRatePercent(
    (loan as any).monthlyInterestRate ?? loan.monthlyInterestRate,
    loan.interestRate
  );

  const annualRatePercent = resolveAnnualRatePercent(
    monthlyRatePercent,
    loan.interestRate,
    monthlyRatePercent > 0 ? monthlyRatePercent * 12 : loan.interestRate
  );

  const effectiveMonthlyPayment = roundCurrency(
    loan.monthlyPayment && loan.monthlyPayment > 0
      ? loan.monthlyPayment
      : calculateMonthlyPaymentFromMonthlyRate(loan.principalAmount, monthlyRatePercent, loan.termMonths)
  );

  const onFormSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const loanId = loan.loanRecordId || loan.id;

      if (!loanId) {
        toast.error('Identifiant du prêt introuvable. Veuillez actualiser la page.');
        return;
      }

      await microcreditLoanService.disburseLoan(loanId, {
        disbursementDate: data.disbursementDate,
        notes: data.notes
      });

      toast.success('Prêt déboursé avec succès!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error disbursing loan:', error);
      toast.error(error.message || 'Erreur lors du déboursement du prêt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Débourser le Prêt</h2>
            <p className="text-green-100">Prêt #{loan.loanNumber}</p>
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
          {/* Loan Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Résumé du Prêt
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Client</p>
                <p className="font-semibold text-gray-900">{loan.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Montant du Prêt</p>
                <p className="font-semibold text-gray-900">{formatCurrency(loan.principalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Durée</p>
                <p className="font-semibold text-gray-900">{loan.termMonths} mois</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Mensualité</p>
                <p className="font-semibold text-gray-900">{formatCurrency(effectiveMonthlyPayment)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Taux d'Intérêt (annuel)</p>
                <p className="font-semibold text-gray-900">{(annualRatePercent || 0).toFixed(2)}%</p>
                <p className="text-xs text-gray-500 mt-1">Taux mensuel: {(monthlyRatePercent || 0).toFixed(2)}%</p>
              </div>
              {loan.approvedAt && (
                <div>
                  <p className="text-sm text-gray-600">Approuvé le</p>
                  <p className="font-semibold text-gray-900">{formatDate(loan.approvedAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-900">
              <p className="font-medium mb-1">Attention</p>
              <p>
                Le déboursement activera le prêt et déclenchera le calendrier de remboursement.
                Assurez-vous que les fonds ont bien été transférés au client.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            {/* Disbursement Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de Déboursement *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  {...register('disbursementDate', {
                    required: 'La date de déboursement est requise'
                  })}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.disbursementDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.disbursementDate && (
                <p className="mt-1 text-sm text-red-600">{errors.disbursementDate.message}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optionnel)
              </label>
              <textarea
                {...register('notes')}
                rows={4}
                placeholder="Ajouter des notes sur le déboursement..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Success Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-900">
                <p className="font-medium mb-1">Après le déboursement</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Le statut du prêt passera à "Actif"</li>
                  <li>Le calendrier de remboursement sera activé</li>
                  <li>Le premier paiement sera dû dans 1 mois</li>
                  <li>La garantie (15%) restera bloquée jusqu'au remboursement complet</li>
                </ul>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit(onFormSubmit)}
            disabled={isSubmitting}
            className={`px-6 py-2.5 rounded-lg font-medium text-white transition-colors ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isSubmitting ? 'Déboursement en cours...' : 'Confirmer le Déboursement'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisburseLoanModal;
