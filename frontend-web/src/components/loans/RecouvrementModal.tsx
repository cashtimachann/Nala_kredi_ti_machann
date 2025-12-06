import React, { useEffect, useState } from 'react';
import { X, Phone, MessageSquare, Calendar, Edit } from 'lucide-react';
import PaymentRecording from './PaymentRecording';
import toast from 'react-hot-toast';
import { microcreditLoanService, CollectionNoteResponse } from '../../services/microcreditLoanService';
import { calculateMonthlyPaymentFromMonthlyRate, resolveMonthlyRatePercent, roundCurrency } from './loanRateUtils';

// Accept a full loan object from LoanManagement; we deliberately use any to accept normalized Loan types
type LoanBrief = any;

interface Props {
  loan: LoanBrief;
  onClose: () => void;
  onSuccess?: () => void;
}

const RecouvrementModal: React.FC<Props> = ({ loan, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'payment' | 'notes' | 'schedule'>('payment');
  const [showPayment, setShowPayment] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [notes, setNotes] = useState<CollectionNoteResponse[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [prefillAmount, setPrefillAmount] = useState<number | undefined>(undefined);

  const handleSaveNote = async () => {
    if (!noteText || !noteText.trim()) {
      toast.error('Veuillez saisir une note.');
      return;
    }

    setIsSavingNote(true);
    try {
      // Persist note to backend
      if (!loan?.id) throw new Error('Loan id missing');
      const created = await microcreditLoanService.addCollectionNote(loan.id, noteText.trim());
      setNotes((s) => [created, ...s]);
      setNoteText('');
      toast.success('Note de recouvrement enregistrée');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error saving note', err);
      toast.error(err?.message || 'Erreur lors de l\'enregistrement de la note');
    } finally {
      setIsSavingNote(false);
    }
  };

  useEffect(() => {
    const loadNotes = async () => {
      if (!loan?.id) return;
      setLoadingNotes(true);
      try {
        const fetched = await microcreditLoanService.getCollectionNotes(loan.id);
        setNotes(fetched || []);
      } catch (e) {
        console.error('Could not load collection notes', e);
        toast.error('Impossible de charger les notes de recouvrement');
      } finally {
        setLoadingNotes(false);
      }
    };

    loadNotes();
  }, [loan?.id]);

  useEffect(() => {
    const loadSchedule = async () => {
      if (!loan?.id) return;
      setLoadingSchedule(true);
      try {
        const s = await microcreditLoanService.getPaymentSchedule(loan.id);
        setSchedule(s || []);
      } catch (e) {
        console.error('Could not load payment schedule', e);
      } finally {
        setLoadingSchedule(false);
      }
    };
    loadSchedule();
  }, [loan?.id]);

  // Derived amounts: mensualité + frais and remaining including fees
  const monthlyRatePercent = resolveMonthlyRatePercent(loan?.monthlyInterestRate, loan?.interestRate, 3.5);
  const baseMonthly = roundCurrency(calculateMonthlyPaymentFromMonthlyRate(loan?.principalAmount || 0, monthlyRatePercent, loan?.termMonths || 0));
  const processingFee = (loan?.approvedAmount ?? loan?.principalAmount) ? roundCurrency((loan?.approvedAmount ?? loan?.principalAmount) * 0.05) : 0;
  const distributedFeePortion = (loan?.termMonths || 0) > 0 ? roundCurrency(processingFee / (loan?.termMonths || 1)) : 0;
  const monthlyWithFee = roundCurrency(baseMonthly + distributedFeePortion);
  const totalDueWithFees = roundCurrency(monthlyWithFee * (loan?.termMonths || 0));
  const paidAmount = roundCurrency(loan?.paidAmount || 0);
  const remainingWithFees = roundCurrency(Math.max(0, totalDueWithFees - paidAmount));

  // Next unpaid installment from schedule
  const nextInstallment = (schedule || []).find((i) => (i.status || '').toUpperCase() !== 'COMPLETED' && (i.status || '').toUpperCase() !== 'PAID');

  const onPaymentRecorded = (payment: any) => {
    toast.success('Paiement de recouvrement enregistré');
    setShowPayment(false);
    if (onSuccess) onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Workflow de Recouvrement</h2>
            <p className="text-rose-100">Prêt #{loan.loanNumber} — {loan.customerName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs + Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setActiveTab('payment')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === 'payment' ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-white border border-gray-200 text-black hover:bg-gray-50'}`}
            >
              <Phone className="w-4 h-4" />
              Paiement
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === 'notes' ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-white border border-gray-200 text-black hover:bg-gray-50'}`}
            >
              <MessageSquare className="w-4 h-4" />
              Notes
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === 'schedule' ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-white border border-gray-200 text-black hover:bg-gray-50'}`}
            >
              <Calendar className="w-4 h-4" />
              Planifier
            </button>
          </div>

          {activeTab === 'payment' && (
            <div className="space-y-4">
              <p className="text-sm text-black">Enregistrer un paiement de recouvrement pour le prêt.</p>
              <div className="flex gap-3 items-center">
                <button
                  onClick={() => setShowPayment(true)}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                >
                  <Edit className="w-4 h-4 inline-block mr-2" />
                  Ouvrir Paiement de Recouvrement
                </button>
                <span className="text-sm text-black">Mensualité + Frais: <strong>{monthlyWithFee}</strong> {loan.currency}</span>
                <span className="text-sm text-black">Reste à payer (+ frais): <strong>{remainingWithFees}</strong> {loan.currency}</span>
                {loan.daysOverdue && loan.daysOverdue > 0 && (
                  <span className="text-sm text-red-600">{loan.daysOverdue} jours de retard</span>
                )}
              </div>
              {nextInstallment && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <p className="text-sm text-rose-700 font-medium">Prochaine Échéance</p>
                  <div className="text-xs text-rose-800">
                    <span>Capital: {roundCurrency(nextInstallment.principalAmount)} · Intérêt: {roundCurrency(nextInstallment.interestAmount || 0)} · Frais: {roundCurrency(nextInstallment.feePortion || distributedFeePortion)} {loan.currency}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        const totalInstallment = roundCurrency(
                          (nextInstallment.totalAmountWithFee) ||
                          ((nextInstallment.totalPayment || nextInstallment.totalAmount || (nextInstallment.principalAmount + (nextInstallment.interestAmount || 0))) + (nextInstallment.feePortion || distributedFeePortion))
                        );
                        setPrefillAmount(totalInstallment);
                        setShowPayment(true);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-md"
                    >Encaisser échéance ({roundCurrency(
                          (nextInstallment.totalAmountWithFee) ||
                          ((nextInstallment.totalPayment || nextInstallment.totalAmount || (nextInstallment.principalAmount + (nextInstallment.interestAmount || 0))) + (nextInstallment.feePortion || distributedFeePortion))
                        )} {loan.currency})</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <p className="text-sm text-black">Ajouter une note à l'historique de recouvrement.</p>

              {/* Existing notes */}
              <div className="space-y-3 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-3 bg-white">
                {loadingNotes ? (
                  <p className="text-sm text-black">Chargement des notes...</p>
                ) : notes.length === 0 ? (
                  <p className="text-sm text-black">Aucune note de recouvrement enregistrée.</p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="border-b last:border-b-0 pb-2 mb-2">
                      <div className="flex items-center justify-between text-xs text-black">
                        <div>{n.createdByName || n.createdBy}</div>
                        <div>{new Date(n.createdAt).toLocaleString('fr-FR')}</div>
                      </div>
                      <div className="text-sm text-black mt-1">{n.note}</div>
                    </div>
                  ))
                )}
              </div>
              <textarea
                rows={5}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                placeholder="Notes sur contact, tentative d'appel, promesse de paiement..."
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setNoteText('')}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-100"
                >Annuler</button>
                <button
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                >{isSavingNote ? 'Enregistrement...' : 'Enregistrer la note'}</button>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <p className="text-sm text-black">Planifier la prochaine action de recouvrement.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Date de Suivi</label>
                  <input type="date" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Action</label>
                  <select className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                    <option>Rappel Appel</option>
                    <option>Visite</option>
                    <option>Envoyer SMS</option>
                    <option>Enregistrer Promesse de Paiement</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => toast.success('Plan enregistré localement')} className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700">Planifier</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div></div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-black hover:bg-gray-100">Fermer</button>
          </div>
        </div>

        {/* Payment Recording overlay (re-use PaymentRecording) */}
        {showPayment && (
          <PaymentRecording
            loan={loan}
            initialAmount={prefillAmount}
            onClose={() => { setShowPayment(false); setPrefillAmount(undefined); }}
            onSubmit={onPaymentRecorded}
          />
        )}
      </div>
    </div>
  );
};

export default RecouvrementModal;
