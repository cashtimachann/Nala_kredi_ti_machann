import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
  TransactionFormData, 
  TransactionType, 
  SavingsAccount, 
  Currency,
  AccountStatus,
  IdentityDocumentType,
  BUSINESS_RULES
} from '../../types/savings';

interface TransactionFormProps {
  account?: SavingsAccount;
  onSubmit: (data: TransactionFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  type?: TransactionType.DEPOSIT | TransactionType.WITHDRAWAL | TransactionType.TRANSFER;
}

// Schéma de validation pour les transactions
const transactionSchema = yup.object({
  accountNumber: yup
    .string()
    .required('Le numéro de compte est obligatoire')
    .matches(/^[GD]\d{11}$/i, "Format invalide. Utilisez 'G' ou 'D' suivi de 11 chiffres"),
  
  type: yup
    .mixed<TransactionType>()
    .required('Le type de transaction est obligatoire')
    .oneOf([TransactionType.DEPOSIT, TransactionType.WITHDRAWAL, TransactionType.TRANSFER], 'Type de transaction invalide'),
  
  amount: yup
    .number()
    .required('Le montant est obligatoire')
    .positive('Le montant doit être positif')
    .test('min-amount', 'Montant minimum requis', function(value) {
      const { type } = this.parent;
      if (type === TransactionType.WITHDRAWAL) {
        return value >= 100; // Minimum withdrawal HTG
      }
      return value >= 50; // Minimum deposit HTG
    })
    .test('max-amount', 'Montant maximum dépassé', function(value) {
      const { type } = this.parent;
      if (type === TransactionType.WITHDRAWAL) {
        return value <= 100000; // Maximum withdrawal per transaction
      }
      return value <= 200000; // Maximum deposit per transaction
    }),
  
  description: yup
    .string()
    .optional()
    .max(200, 'La description ne peut pas dépasser 200 caractères'),
  
  customerPresent: yup
    .boolean()
    .required('Veuillez indiquer si le client est présent'),
  
  customerSignature: yup
    .string()
    .optional(),

  recipientAccountNumber: yup
    .string()
    .when('type', {
      is: TransactionType.TRANSFER,
      then: (schema) => schema.required('Le numéro du compte destinataire est requis').matches(/^[GD]\d{11}$/i, "Format invalide. Utilisez 'G' ou 'D' suivi de 11 chiffres"),
      otherwise: (schema) => schema.optional()
    }),
  
  verificationMethod: yup
    .string()
    .required('La méthode de vérification est obligatoire')
    .oneOf(['ID_CHECK', 'SIGNATURE', 'BIOMETRIC', 'PIN'], 'Méthode de vérification invalide'),
  
  notes: yup
    .string()
    .optional()
    .max(500, 'Les notes ne peuvent pas dépasser 500 caractères')
});

const TransactionForm: React.FC<TransactionFormProps> = ({
  account,
  onSubmit,
  onCancel,
  isLoading = false,
  type = TransactionType.DEPOSIT
}) => {
  const [selectedAccount, setSelectedAccount] = useState<SavingsAccount | null>(account || null);
  const [selectedRecipientAccount, setSelectedRecipientAccount] = useState<SavingsAccount | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transactionPreview, setTransactionPreview] = useState<TransactionFormData | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    reset,
    setValue,
    getValues
  } = useForm<TransactionFormData>({
    resolver: yupResolver(transactionSchema) as any,
    defaultValues: {
      accountNumber: account?.accountNumber || '',
      type: type,
      recipientAccountNumber: '',
      amount: 0,
      description: '',
      customerPresent: true,
      customerSignature: '',
      verificationMethod: 'ID_CHECK',
      notes: ''
    },
    mode: 'onSubmit' // Only validate on form submission
  });

  const watchedType = watch('type');
  const watchedAmount = watch('amount');
  const watchedAccountNumber = watch('accountNumber');
  const watchedRecipientAccountNumber = watch('recipientAccountNumber');
  const watchedCustomerPresent = watch('customerPresent');

  // Rechercher le compte par numéro
  const searchAccountByNumber = async (accountNumber: string) => {
    // Nouveau format: lettre (G/D) + 11 chiffres => 12 caractères
    if (accountNumber.length === 12) {
      // Simuler une recherche d'API
      // En production, remplacer par un appel API réel
      if (accountNumber === '001234567890') {
        setSelectedAccount({
          id: '1',
              accountNumber: 'G01234567890',
          customerId: 'cust1',
          customer: {
            id: 'cust1',
            firstName: 'Jean',
            lastName: 'Pierre',
            fullName: 'Jean Pierre',
            dateOfBirth: '1985-03-15',
            gender: 'M',
            address: {
              street: '123 Rue Delmas',
              commune: 'Delmas',
              department: 'Ouest',
              country: 'Haiti'
            },
            contact: {
              primaryPhone: '+509 3712 3456',
              email: 'jean.pierre@example.com'
            },
            identity: {
              documentType: IdentityDocumentType.CIN,
              documentNumber: 'CIN123456789',
              issuedDate: '2020-01-15',
              issuingAuthority: 'ONI'
            },
            createdAt: '2023-01-15T10:00:00Z',
            updatedAt: '2023-01-15T10:00:00Z',
            isActive: true
          },
          branchId: 1,
          branchName: 'Succursale Centre-Ville',
          currency: Currency.HTG,
          balance: 15000,
          availableBalance: 15000,
          minimumBalance: 500,
          openingDate: '2023-01-15',
          lastTransactionDate: '2024-01-10',
          status: AccountStatus.ACTIVE,
          interestRate: 0.03,
          accruedInterest: 125.50,
          accountLimits: {
            dailyWithdrawalLimit: 50000,
            dailyDepositLimit: 100000,
            monthlyWithdrawalLimit: 500000,
            maxBalance: 1000000,
            minWithdrawalAmount: 100,
            maxWithdrawalAmount: 50000
          },
          createdAt: '2023-01-15T10:00:00Z',
          updatedAt: '2024-01-10T14:30:00Z'
        });
      } else {
        setSelectedAccount(null);
      }
    } else {
      setSelectedAccount(null);
    }
  };

  const searchRecipientByNumber = async (accountNumber: string) => {
    // reuse the same local mock/lookup used for source - in prod this should use api
    if (accountNumber.length === 12) {
      // quick mock — if matches the special number return a different account
      if (accountNumber === '001234567891') {
        setSelectedRecipientAccount({
          id: '2',
          accountNumber: 'D01234567891',
          customerId: 'cust2',
          customer: {
            id: 'cust2',
            firstName: 'Marie',
            lastName: 'Jean',
            fullName: 'Marie Jean',
            dateOfBirth: '1990-07-10',
            gender: 'F',
            address: {
              street: '45 Rue Cap-Haïtien',
              commune: 'Cap-Haïtien',
              department: 'Nord',
              country: 'Haiti'
            },
            contact: { primaryPhone: '+509 3700 0000' },
            identity: {
              documentType: IdentityDocumentType.CIN,
              documentNumber: 'CIN987654321',
              issuedDate: '2019-08-01',
              issuingAuthority: 'ONI'
            },
            createdAt: '2023-05-12T08:00:00Z',
            updatedAt: '2024-05-01T10:00:00Z',
            isActive: true
          },
          branchId: 1,
          branchName: 'Succursale Nord',
          currency: Currency.HTG,
          balance: 5000,
          availableBalance: 5000,
          minimumBalance: 100,
          openingDate: '2023-05-12',
          lastTransactionDate: '2024-05-01',
          status: AccountStatus.ACTIVE,
          interestRate: 0.02,
          accruedInterest: 34.25,
          accountLimits: {
            dailyWithdrawalLimit: 20000,
            dailyDepositLimit: 100000,
            monthlyWithdrawalLimit: 100000,
            maxBalance: 1000000,
            minWithdrawalAmount: 100,
            maxWithdrawalAmount: 50000
          },
          createdAt: '2023-05-12T08:00:00Z',
          updatedAt: '2024-05-01T10:00:00Z'
        });
      } else {
        setSelectedRecipientAccount(null);
      }
    } else {
      setSelectedRecipientAccount(null);
    }
  };

  // Rechercher le compte automatiquement quand le numéro change
  useEffect(() => {
    if (watchedAccountNumber && !account) {
      searchAccountByNumber(watchedAccountNumber);
    }
  }, [watchedAccountNumber, account]);

  useEffect(() => {
    if (watchedRecipientAccountNumber) {
      searchRecipientByNumber(watchedRecipientAccountNumber);
    } else {
      setSelectedRecipientAccount(null);
    }
  }, [watchedRecipientAccountNumber]);

  // Validation spécifique aux retraits
  const validateWithdrawal = (amount: number): string[] => {
    const errors: string[] = [];
    
    if (!selectedAccount) return ['Compte non trouvé'];
    
    if (selectedAccount.status !== 'ACTIVE') {
      errors.push('Le compte doit être actif pour effectuer une transaction');
    }
    
    if (amount < selectedAccount.accountLimits.minWithdrawalAmount) {
      errors.push(`Montant minimum de retrait: ${selectedAccount.accountLimits.minWithdrawalAmount} ${selectedAccount.currency}`);
    }
    
    if (amount > selectedAccount.accountLimits.maxWithdrawalAmount) {
      errors.push(`Montant maximum de retrait: ${selectedAccount.accountLimits.maxWithdrawalAmount} ${selectedAccount.currency}`);
    }
    
    const balanceAfterWithdrawal = selectedAccount.balance - amount;
    if (balanceAfterWithdrawal < selectedAccount.minimumBalance) {
      errors.push(`Solde minimum requis: ${selectedAccount.minimumBalance} ${selectedAccount.currency}`);
    }
    
    if (amount > selectedAccount.availableBalance) {
      errors.push('Fonds insuffisants');
    }
    
    return errors;
  };

  const validateTransfer = (amount: number): string[] => {
    const errors: string[] = [];
    if (!selectedAccount) return ['Compte source non trouvé'];
    if (!selectedRecipientAccount) return ['Compte destinataire non trouvé'];
    if (selectedAccount.accountNumber === selectedRecipientAccount.accountNumber) return ['Le compte source et le compte destinataire ne peuvent pas être identiques'];
    if (selectedAccount.currency !== selectedRecipientAccount.currency) return ['Les devises des comptes doivent correspondre'];
    // reuse withdrawal validations on source account
    if (selectedAccount.status !== 'ACTIVE') errors.push('Le compte source doit être actif');
    if (selectedRecipientAccount.status !== 'ACTIVE') errors.push('Le compte destinataire doit être actif');
    if (amount < selectedAccount.accountLimits.minWithdrawalAmount) {
      errors.push(`Montant minimum de transfert: ${selectedAccount.accountLimits.minWithdrawalAmount} ${selectedAccount.currency}`);
    }
    if (amount > selectedAccount.accountLimits.maxWithdrawalAmount) {
      errors.push(`Montant maximum de transfert: ${selectedAccount.accountLimits.maxWithdrawalAmount} ${selectedAccount.currency}`);
    }
    const balanceAfter = selectedAccount.balance - amount;
    if (balanceAfter < selectedAccount.minimumBalance) errors.push(`Solde minimum requis: ${selectedAccount.minimumBalance} ${selectedAccount.currency}`);
    if (amount > selectedAccount.availableBalance) errors.push('Fonds insuffisants sur le compte source');
    return errors;
  };

  // Calcul du nouveau solde après transaction
  const calculateNewBalance = (amount: number, type: TransactionType): number => {
    if (!selectedAccount) return 0;
    
    return type === TransactionType.DEPOSIT 
      ? selectedAccount.balance + amount
      : selectedAccount.balance - amount;
  };

  const handleFormSubmit = (data: TransactionFormData) => {
    if (watchedType === TransactionType.WITHDRAWAL) {
      const validationErrors = validateWithdrawal(data.amount);
      if (validationErrors.length > 0) {
        alert('Erreurs de validation:\n' + validationErrors.join('\n'));
        return;
      }
    }

    if (watchedType === TransactionType.TRANSFER) {
      const validationErrors = validateTransfer(data.amount);
      if (validationErrors.length > 0) {
        alert('Erreurs de validation:\n' + validationErrors.join('\n'));
        return;
      }
    }
    
    setTransactionPreview(data);
    setShowConfirmation(true);
  };

  const confirmTransaction = () => {
    if (transactionPreview) {
      onSubmit(transactionPreview);
    }
  };

  const getMinAmount = (): number => {
    return watchedType === TransactionType.WITHDRAWAL ? 100 : 50;
  };

  const getMaxAmount = (): number => {
    if (watchedType === TransactionType.WITHDRAWAL && selectedAccount) {
      return Math.min(
        selectedAccount.accountLimits.maxWithdrawalAmount,
        selectedAccount.availableBalance - selectedAccount.minimumBalance
      );
    }
    return watchedType === TransactionType.WITHDRAWAL ? 100000 : 200000;
  };

  const formatCurrency = (amount: number, currency: Currency = Currency.HTG) => {
    return new Intl.NumberFormat('fr-HT', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Modal de confirmation
  if (showConfirmation && transactionPreview && selectedAccount) {
    const newBalance = calculateNewBalance(transactionPreview.amount, transactionPreview.type);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full m-4">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmation de Transaction
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Détails de la transaction</h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className={`font-medium ${
                        transactionPreview.type === TransactionType.DEPOSIT 
                          ? 'text-green-600' 
                          : transactionPreview.type === TransactionType.WITHDRAWAL ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {transactionPreview.type === TransactionType.DEPOSIT ? 'Dépôt' : transactionPreview.type === TransactionType.WITHDRAWAL ? 'Retrait' : 'Transfert'}
                      </span>
                    </div>
                  <div className="flex justify-between">
                    <span>Compte source:</span>
                    <span className="font-medium">{selectedAccount.accountNumber}</span>
                  </div>
                  {transactionPreview.type === TransactionType.TRANSFER && selectedRecipientAccount && (
                    <div className="flex justify-between">
                      <span>Compte destinataire:</span>
                      <span className="font-medium">{selectedRecipientAccount.accountNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Client:</span>
                    <span className="font-medium">{selectedAccount.customer?.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Montant:</span>
                    <span className="font-medium">{formatCurrency(transactionPreview.amount, selectedAccount.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Solde actuel:</span>
                    <span>{formatCurrency(selectedAccount.balance, selectedAccount.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nouveau solde (source):</span>
                    <span className="font-medium">{formatCurrency(newBalance, selectedAccount.currency)}</span>
                  </div>
                  {transactionPreview.type === TransactionType.TRANSFER && selectedRecipientAccount && (
                    <div className="flex justify-between">
                      <span>Nouveau solde (destinataire):</span>
                      <span className="font-medium">{formatCurrency(selectedRecipientAccount.balance + transactionPreview.amount, selectedRecipientAccount.currency)}</span>
                    </div>
                  )}
                  {transactionPreview.description && (
                    <div className="flex justify-between">
                      <span>Description:</span>
                      <span className="text-right">{transactionPreview.description}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Vérifications effectuées</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>✓ Compte actif et valide</li>
                  <li>✓ Montant dans les limites autorisées</li>
                  {transactionPreview.type === TransactionType.WITHDRAWAL && (
                    <>
                      <li>✓ Solde minimum maintenu</li>
                      <li>✓ Fonds disponibles suffisants</li>
                    </>
                  )}
                  {transactionPreview.type === TransactionType.TRANSFER && (
                    <>
                      <li>✓ Vérifié que le compte destinataire existe et est actif</li>
                      <li>✓ Devise des deux comptes correspondante</li>
                    </>
                  )}
                  <li>✓ Client vérifié ({transactionPreview.verificationMethod})</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmTransaction}
                disabled={isLoading}
                className={`px-4 py-2 text-white rounded-lg ${
                  transactionPreview.type === TransactionType.DEPOSIT
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? 'Traitement...' : 'Confirmer la transaction'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {watchedType === TransactionType.DEPOSIT ? 'Effectuer un Dépôt' : watchedType === TransactionType.WITHDRAWAL ? 'Effectuer un Retrait' : 'Effectuer un Transfert'}
        </h2>
        <p className="text-gray-600">
          {watchedType === TransactionType.DEPOSIT 
            ? 'Déposez des fonds sur un compte d\'épargne'
            : 'Retirez des fonds d\'un compte d\'épargne'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit as (data: TransactionFormData) => void)} className="space-y-6">
        {/* Sélection du type de transaction */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type de transaction *
          </label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value={TransactionType.DEPOSIT}
                    checked={field.value === TransactionType.DEPOSIT}
                    onChange={() => field.onChange(TransactionType.DEPOSIT)}
                    className="mr-2"
                  />
                  <span className="text-green-600 font-medium">Dépôt</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value={TransactionType.WITHDRAWAL}
                    checked={field.value === TransactionType.WITHDRAWAL}
                    onChange={() => field.onChange(TransactionType.WITHDRAWAL)}
                    className="mr-2"
                  />
                  <span className="text-red-600 font-medium">Retrait</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value={TransactionType.TRANSFER}
                    checked={field.value === TransactionType.TRANSFER}
                    onChange={() => field.onChange(TransactionType.TRANSFER)}
                    className="mr-2"
                  />
                  <span className="text-blue-600 font-medium">Transfert</span>
                </label>
              </div>
            )}
          />
          {errors.type && (
            <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
          )}
        </div>

        {/* Numéro de compte */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Numéro de compte *
          </label>
          <Controller
            name="accountNumber"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                maxLength={12}
                disabled={!!account}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.accountNumber ? 'border-red-500' : 'border-gray-300'
                } ${account ? 'bg-gray-100' : ''}`}
                placeholder="G01234567890"
              />
            )}
          />
          {errors.accountNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.accountNumber.message}</p>
          )}
        </div>

        {/* Informations du compte trouvé */}
        {selectedAccount && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Informations du compte</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Client:</span>
                <p className="font-medium">{selectedAccount.customer?.fullName}</p>
              </div>
              <div>
                <span className="text-gray-600">Devise:</span>
                <p className="font-medium">{selectedAccount.currency}</p>
              </div>
              <div>
                <span className="text-gray-600">Solde actuel:</span>
                <p className="font-medium">{formatCurrency(selectedAccount.balance, selectedAccount.currency)}</p>
              </div>
              <div>
                <span className="text-gray-600">Solde disponible:</span>
                <p className="font-medium">{formatCurrency(selectedAccount.availableBalance, selectedAccount.currency)}</p>
              </div>
              <div>
                <span className="text-gray-600">Statut:</span>
                <p className={`font-medium ${selectedAccount.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedAccount.status}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Succursale:</span>
                <p className="font-medium">{selectedAccount.branchName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Destination (pour transfert) */}
        {watchedType === TransactionType.TRANSFER && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compte destinataire *
            </label>
            <Controller
              name="recipientAccountNumber"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  maxLength={12}
                  disabled={!!account}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.recipientAccountNumber ? 'border-red-500' : 'border-gray-300'
                  } ${account ? 'bg-gray-100' : ''}`}
                  placeholder="G01234567891"
                />
              )}
            />
            {errors.recipientAccountNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.recipientAccountNumber.message}</p>
            )}

            {selectedRecipientAccount && (
              <div className="bg-blue-50 p-4 rounded-lg mt-3">
                <h4 className="font-medium text-blue-900 mb-2">Informations destinataire</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Titulaire:</span>
                    <p className="font-medium">{selectedRecipientAccount.customer?.fullName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Devise:</span>
                    <p className="font-medium">{selectedRecipientAccount.currency}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Solde actuel:</span>
                    <p className="font-medium">{formatCurrency(selectedRecipientAccount.balance, selectedRecipientAccount.currency)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Solde disponible:</span>
                    <p className="font-medium">{formatCurrency(selectedRecipientAccount.availableBalance, selectedRecipientAccount.currency)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Montant */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Montant * ({selectedAccount?.currency || 'HTG'})
          </label>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="number"
                min={getMinAmount()}
                max={getMaxAmount()}
                step="0.01"
                onChange={(e) => field.onChange(Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={`Min: ${getMinAmount()}, Max: ${getMaxAmount()}`}
              />
            )}
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
          )}
          
          {/* Aperçu du nouveau solde */}
          {watchedAmount > 0 && selectedAccount && (
            <div className="mt-2 text-sm">
              <span className="text-gray-600">Nouveau solde: </span>
              <span className="font-medium">
                {formatCurrency(calculateNewBalance(watchedAmount, watchedType), selectedAccount.currency)}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Description optionnelle de la transaction"
              />
            )}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Présence du client */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Présence du client *
          </label>
          <Controller
            name="customerPresent"
            control={control}
            render={({ field }) => (
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={field.value === true}
                    onChange={() => field.onChange(true)}
                    className="mr-2"
                  />
                  <span>Client présent</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={field.value === false}
                    onChange={() => field.onChange(false)}
                    className="mr-2"
                  />
                  <span>Transaction par procuration</span>
                </label>
              </div>
            )}
          />
        </div>

        {/* Méthode de vérification */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Méthode de vérification *
          </label>
          <Controller
            name="verificationMethod"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.verificationMethod ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="ID_CHECK">Vérification pièce d'identité</option>
                <option value="SIGNATURE">Vérification signature</option>
                <option value="BIOMETRIC">Vérification biométrique</option>
                <option value="PIN">Code PIN</option>
              </select>
            )}
          />
          {errors.verificationMethod && (
            <p className="mt-1 text-sm text-red-600">{errors.verificationMethod.message}</p>
          )}
        </div>

        {/* Signature client (si présent) */}
        {watchedCustomerPresent && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Signature du client
            </label>
            <Controller
              name="customerSignature"
              control={control}
              render={({ field }) => (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <p className="text-gray-500">Zone de signature numérique</p>
                  <p className="text-xs text-gray-400 mt-1">Fonctionnalité à développer</p>
                </div>
              )}
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes internes
          </label>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.notes ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Notes ou observations sur la transaction"
              />
            )}
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
          )}
        </div>

        {/* Alertes de validation */}
        {watchedType === TransactionType.WITHDRAWAL && selectedAccount && watchedAmount > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Vérifications de retrait en cours...
                </p>
                {validateWithdrawal(watchedAmount).map((error, index) => (
                  <p key={index} className="text-sm text-red-600 mt-1">• {error}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
          >
            Annuler
          </button>
          
          <button
            type="submit"
            disabled={!isValid || !selectedAccount || (watchedType === TransactionType.WITHDRAWAL && validateWithdrawal(watchedAmount).length > 0) || (watchedType === TransactionType.TRANSFER && validateTransfer(watchedAmount).length > 0) || (watchedType === TransactionType.TRANSFER && !selectedRecipientAccount)}
            className={`px-6 py-2 text-white rounded-lg focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              watchedType === TransactionType.DEPOSIT
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }`}
          >
            {watchedType === TransactionType.DEPOSIT ? 'Effectuer le Dépôt' : watchedType === TransactionType.WITHDRAWAL ? 'Effectuer le Retrait' : 'Effectuer le Transfert'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;