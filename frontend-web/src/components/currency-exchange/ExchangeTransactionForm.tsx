import React, { useState, useEffect } from 'react';
import { X, Calculator, DollarSign, User, Phone, FileText, ArrowRight } from 'lucide-react';
import {
  CurrencyType,
  ExchangeType,
  ExchangeCalculationDto,
  ExchangeCalculationResult,
  ProcessExchangeDto,
  formatCurrencySymbol,
  formatExchangeType
} from '../../types/currencyExchange';
import apiService from '../../services/apiService';
import toast from 'react-hot-toast';

interface ExchangeTransactionFormProps {
  branchId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const ExchangeTransactionForm: React.FC<ExchangeTransactionFormProps> = ({
  branchId,
  onSuccess,
  onCancel
}) => {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchId || '');
  const [exchangeType, setExchangeType] = useState<ExchangeType>(ExchangeType.Sale);
  const [fromAmount, setFromAmount] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<ExchangeCalculationResult | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  const sourceCurrency =
    exchangeType === ExchangeType.Purchase ? CurrencyType.HTG : CurrencyType.USD;
  const targetCurrency =
    exchangeType === ExchangeType.Purchase ? CurrencyType.USD : CurrencyType.HTG;
  const amountValue = parseFloat(fromAmount);
  const isAmountValid = !Number.isNaN(amountValue) && amountValue > 0;

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    const amountValue = parseFloat(fromAmount);
    const hasValidAmount = !Number.isNaN(amountValue) && amountValue > 0;

    if (!selectedBranchId || !hasValidAmount) {
      setCalculationResult(null);
      setCalculationError(null);
      setCalculating(false);
      return;
    }

    let isCancelled = false;
    setCalculating(true);
    setCalculationError(null);

    const payload: ExchangeCalculationDto = {
      branchId: selectedBranchId,
      exchangeType,
      amount: amountValue
    };

    const timer = setTimeout(async () => {
      try {
        const result = await apiService.calculateExchange(payload);
        if (isCancelled) {
          return;
        }

        if (!result?.isValid) {
          const message =
            result?.errorMessage || result?.message || 'Le calcul ne peut pas être effectué.';
          setCalculationResult(result);
          setCalculationError(message);
          return;
        }

        setCalculationResult(result);
      } catch (error: any) {
        if (isCancelled) {
          return;
        }

        const message =
          error?.parsedMessage ||
          error?.response?.data?.message ||
          'Erreur lors du calcul du taux de change.';
        setCalculationResult(null);
        setCalculationError(message);
      } finally {
        if (!isCancelled) {
          setCalculating(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [selectedBranchId, exchangeType, fromAmount]);

  const loadBranches = async () => {
    try {
      const data = await apiService.getAllBranches();
      setBranches(data);
      if (data.length > 0 && !selectedBranchId) {
        setSelectedBranchId(String(data[0].id));
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Erreur lors du chargement des succursales');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBranchId) {
      toast.error('Veuillez sélectionner une succursale');
      return;
    }

    const parsedAmount = parseFloat(fromAmount);
    if (!fromAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    if (!customerName.trim()) {
      toast.error('Veuillez entrer le nom du client');
      return;
    }

    if (!calculationResult?.isValid) {
      toast.error(calculationError || 'Le calcul doit être valide avant de confirmer.');
      return;
    }

    try {
      setProcessing(true);
      const amountToSend = calculationResult.fromAmount ?? parsedAmount;
      const exchangeDto: ProcessExchangeDto = {
        branchId: selectedBranchId,
        fromCurrency: sourceCurrency,
        toCurrency: targetCurrency,
        fromAmount: amountToSend,
        exchangeType,
        customerName: customerName.trim(),
        customerDocument: customerDocument.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined
      };

      await apiService.processExchange(exchangeDto);
      toast.success('Transaction créée avec succès!');
      onSuccess();
    } catch (error: any) {
      console.error('Error processing exchange:', error);
      toast.error(error.response?.data?.message || 'Erreur lors du traitement de la transaction');
    } finally {
      setProcessing(false);
    }
  };

  const swapCurrencies = () => {
    setExchangeType((current) =>
      current === ExchangeType.Purchase ? ExchangeType.Sale : ExchangeType.Purchase
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-black flex items-center">
            <DollarSign className="w-6 h-6 mr-2 text-primary-600" />
            Nouvelle Transaction de Change
          </h2>
          <button
            onClick={onCancel}
            className="text-black hover:text-black"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Branch Selection */}
          {!branchId && (
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Succursale *
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black"
              >
                <option value="">Sélectionner une succursale</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Exchange Type */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Type de transaction *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setExchangeType(ExchangeType.Purchase)}
                className={`px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
                  exchangeType === ExchangeType.Purchase
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400 text-black'
                }`}
              >
                Achat USD (client achète)
              </button>
              <button
                type="button"
                onClick={() => setExchangeType(ExchangeType.Sale)}
                className={`px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
                  exchangeType === ExchangeType.Sale
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400 text-black'
                }`}
              >
                Vente USD (client vend)
              </button>
            </div>
            <p className="mt-2 text-xs text-black">{formatExchangeType(exchangeType)}</p>
          </div>

          {/* Currency Exchange Section */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* From Currency */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Devise source *
                </label>
                <select
                  value={sourceCurrency}
                  onChange={(e) =>
                    setExchangeType(
                      Number(e.target.value) === CurrencyType.HTG
                        ? ExchangeType.Purchase
                        : ExchangeType.Sale
                    )
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black"
                >
                  <option value={CurrencyType.HTG}>HTG - Gourde</option>
                  <option value={CurrencyType.USD}>USD - Dollar US</option>
                </select>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={swapCurrencies}
                  className="p-2 text-black hover:text-primary-600 hover:bg-white rounded-full transition-colors"
                  title="Inverser les devises"
                  aria-label="Inverser les devises"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* To Currency */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Devise cible *
                </label>
                <select
                  value={targetCurrency}
                  onChange={(e) =>
                    setExchangeType(
                      Number(e.target.value) === CurrencyType.USD
                        ? ExchangeType.Purchase
                        : ExchangeType.Sale
                    )
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black"
                >
                  <option value={CurrencyType.USD}>USD - Dollar US</option>
                  <option value={CurrencyType.HTG}>HTG - Gourde</option>
                </select>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Montant à échanger *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-black">
                  {formatCurrencySymbol(sourceCurrency)}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  required
                  className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black"
                  placeholder="0.00"
                />
              </div>
              <p className="mt-1 text-xs text-black">
                {exchangeType === ExchangeType.Purchase
                  ? 'Le client paie en HTG et reçoit des USD.'
                  : 'Le client paie en USD et reçoit des HTG.'}
              </p>
            </div>
          </div>

          {/* Calculation Result */}
          {calculating && isAmountValid && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center">
              <Calculator className="w-5 h-5 mr-2 text-blue-600 animate-spin" />
              <span className="text-blue-700">Calcul du taux en cours...</span>
            </div>
          )}

          {!calculating && calculationResult?.isValid && isAmountValid && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-green-900 flex items-center">
                <Calculator className="w-5 h-5 mr-2" />
                Résultat estimé
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-black">Montant remis par le client:</span>
                  <p className="font-medium text-black">
                    {formatCurrencySymbol(calculationResult.fromCurrency)}{' '}
                    {calculationResult.fromAmount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-black">Taux appliqué:</span>
                  <p className="font-medium text-black">
                    {calculationResult.exchangeRate.toFixed(6)}
                  </p>
                </div>
                <div>
                  <span className="text-black">Montant brut:</span>
                  <p className="font-medium text-black">
                    {formatCurrencySymbol(calculationResult.toCurrency)}{' '}
                    {calculationResult.toAmount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-black">Commission ({(calculationResult.commissionRate * 100).toFixed(2)}%):</span>
                  <p className="font-medium text-black">
                    {formatCurrencySymbol(calculationResult.toCurrency)}{' '}
                    {calculationResult.commissionAmount.toFixed(2)}
                  </p>
                </div>
                <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-green-300">
                  <div>
                    <span className="text-black">Montant net à remettre:</span>
                    <p className="text-xl font-bold text-green-700">
                      {formatCurrencySymbol(calculationResult.toCurrency)}{' '}
                      {calculationResult.netAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-black">Solde total disponible (succursale):</span>
                    <p className="font-semibold text-black">
                      {typeof calculationResult.availableBalance === 'number' ? (
                        <>
                          {formatCurrencySymbol(calculationResult.toCurrency)}{' '}
                          {calculationResult.availableBalance.toFixed(2)}
                        </>
                      ) : (
                        <span className="text-sm text-black">Non disponible</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!calculating && calculationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              <p className="text-red-700 text-sm">{calculationError}</p>
              {typeof calculationResult?.availableBalance === 'number' && calculationResult && (
                <p className="text-xs text-black">
                  Solde total disponible: {formatCurrencySymbol(calculationResult.toCurrency)}{' '}
                  {calculationResult.availableBalance.toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-black flex items-center">
              <User className="w-5 h-5 mr-2" />
              Informations client
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Nom du client *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black"
                placeholder="Nom complet"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Document d'identité
                </label>
                <input
                  type="text"
                  value={customerDocument}
                  onChange={(e) => setCustomerDocument(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black"
                  placeholder="CIN, Passport, etc."
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-black mb-1">
                  <Phone className="w-4 h-4 mr-1" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black"
                  placeholder="+509 1234 5678"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center text-sm font-medium text-black mb-1">
              <FileText className="w-4 h-4 mr-1" />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black"
              placeholder="Notes additionnelles..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-md text-black hover:bg-gray-50"
              disabled={processing}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                processing ||
                !isAmountValid ||
                !customerName.trim() ||
                !calculationResult?.isValid
              }
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Traitement...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Confirmer la transaction
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExchangeTransactionForm;
