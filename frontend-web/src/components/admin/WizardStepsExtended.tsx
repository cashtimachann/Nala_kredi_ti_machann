// Wizard Steps 4-6 for CurrentAccountWizard
import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { AlertCircle, Check, X } from 'lucide-react';

interface StepProps {
  register: UseFormRegister<any>;
  errors: FieldErrors;
  watch: any;
  setValue: any;
}

// Step 4: Informations Professionnelles
export const Step4Professional: React.FC<StepProps> = ({ register, errors, watch }) => {
  const clientType = watch('clientType');

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Informations Professionnelles et Financières</h3>
        <p className="text-gray-600">Détails sur la situation professionnelle et les revenus</p>
      </div>

      {/* Activité Professionnelle */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Activité Professionnelle</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profession / Secteur d'Activité <span className="text-red-500">*</span>
            </label>
            <input
              {...register('profession')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: Commerçant, Enseignant, Médecin..."
            />
            {errors.profession && (
              <p className="text-red-500 text-sm mt-1">{errors.profession.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {clientType === 'PHYSIQUE' ? 'Nom de l\'Employeur' : 'Secteur Commercial'}
            </label>
            <input
              {...register('employer')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder={clientType === 'PHYSIQUE' ? 'Nom de l\'entreprise' : 'Ex: Import/Export, Services...'}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse du Lieu de Travail/Commerce
            </label>
            <input
              {...register('workAddress')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Adresse complète"
            />
          </div>
        </div>
      </div>

      {/* Informations Financières */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Informations Financières</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source Principale de Revenus <span className="text-red-500">*</span>
            </label>
            <select
              {...register('incomeSource')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sélectionnez</option>
              <option value="SALAIRE">Salaire</option>
              <option value="COMMERCE">Commerce</option>
              <option value="AGRICULTURE">Agriculture</option>
              <option value="ARTISANAT">Artisanat</option>
              <option value="TRANSPORT">Transport</option>
              <option value="INVESTISSEMENT">Investissements</option>
              <option value="PENSION">Pension/Retraite</option>
              <option value="TRANSFERT">Transferts de l'étranger</option>
              <option value="AUTRE">Autre</option>
            </select>
            {errors.incomeSource && (
              <p className="text-red-500 text-sm mt-1">{errors.incomeSource.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Revenu Mensuel Estimé (HTG) <span className="text-red-500">*</span>
            </label>
            <input
              {...register('monthlyIncome')}
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: 50000"
            />
            {errors.monthlyIncome && (
              <p className="text-red-500 text-sm mt-1">{errors.monthlyIncome.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Origine des Fonds <span className="text-red-500">*</span>
            </label>
            <select
              {...register('fundsOrigin')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sélectionnez</option>
              <option value="REVENUS_PROFESSIONNELS">Revenus professionnels</option>
              <option value="EPARGNE">Épargne personnelle</option>
              <option value="VENTE_BIENS">Vente de biens</option>
              <option value="HERITAGE">Héritage</option>
              <option value="PRET">Prêt</option>
              <option value="TRANSFERT">Transfert familial</option>
              <option value="AUTRE">Autre</option>
            </select>
            {errors.fundsOrigin && (
              <p className="text-red-500 text-sm mt-1">{errors.fundsOrigin.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fréquence des Transactions <span className="text-red-500">*</span>
            </label>
            <select
              {...register('transactionFrequency')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sélectionnez</option>
              <option value="JOURNALIER">Quotidien</option>
              <option value="HEBDOMADAIRE">Hebdomadaire</option>
              <option value="MENSUEL">Mensuel</option>
              <option value="OCCASIONNEL">Occasionnel</option>
            </select>
            {errors.transactionFrequency && (
              <p className="text-red-500 text-sm mt-1">{errors.transactionFrequency.message as string}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              But de l'Ouverture du Compte <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('accountPurpose')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: Gestion des opérations commerciales, épargne, paiement des employés..."
            />
            {errors.accountPurpose && (
              <p className="text-red-500 text-sm mt-1">{errors.accountPurpose.message as string}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-900">
          <p className="font-medium mb-1">Conformité réglementaire</p>
          <p>Ces informations sont requises par la loi pour la prévention du blanchiment d'argent et du financement du terrorisme.</p>
        </div>
      </div>
    </div>
  );
};

// Step 5: Configuration du Compte
export const Step5AccountConfig: React.FC<StepProps> = ({ register, errors, watch, setValue }) => {
  const currency = watch('currency');
  const allowOverdraft = watch('allowOverdraft');

  const handleCurrencyChange = (newCurrency: 'HTG' | 'USD') => {
    setValue('currency', newCurrency);
    // Set default values based on currency
    if (newCurrency === 'HTG') {
      setValue('minimumBalance', 5000);
      setValue('dailyWithdrawalLimit', 50000);
      setValue('monthlyWithdrawalLimit', 500000);
      setValue('maintenanceFee', 100);
      setValue('checkbookFee', 500);
    } else {
      setValue('minimumBalance', 50);
      setValue('dailyWithdrawalLimit', 500);
      setValue('monthlyWithdrawalLimit', 5000);
      setValue('maintenanceFee', 5);
      setValue('checkbookFee', 25);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Configuration du Compte</h3>
        <p className="text-gray-600">Paramètres et limites du compte courant</p>
      </div>

      {/* Informations de Base */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Informations de Base</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Succursale <span className="text-red-500">*</span>
            </label>
            <select
              {...register('branchId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sélectionnez une succursale</option>
              <option value="1">Siège Principal - Port-au-Prince</option>
              <option value="2">Succursale Pétion-Ville</option>
              <option value="3">Succursale Cap-Haïtien</option>
              <option value="4">Succursale Jacmel</option>
              <option value="5">Succursale Les Cayes</option>
            </select>
            {errors.branchId && (
              <p className="text-red-500 text-sm mt-1">{errors.branchId.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Devise du Compte <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleCurrencyChange('HTG')}
                className={`flex-1 px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                  currency === 'HTG'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                HTG - Gourde
              </button>
              <button
                type="button"
                onClick={() => handleCurrencyChange('USD')}
                className={`flex-1 px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                  currency === 'USD'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                USD - Dollar
              </button>
            </div>
            {errors.currency && (
              <p className="text-red-500 text-sm mt-1">{errors.currency.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dépôt Initial <span className="text-red-500">*</span>
            </label>
            <input
              {...register('initialDeposit')}
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder={currency === 'HTG' ? 'Min: 5,000 HTG' : 'Min: 50 USD'}
            />
            {errors.initialDeposit && (
              <p className="text-red-500 text-sm mt-1">{errors.initialDeposit.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mode de Versement <span className="text-red-500">*</span>
            </label>
            <select
              {...register('depositMode')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sélectionnez</option>
              <option value="ESPECES">Espèces</option>
              <option value="CHEQUE">Chèque</option>
              <option value="VIREMENT">Virement</option>
            </select>
            {errors.depositMode && (
              <p className="text-red-500 text-sm mt-1">{errors.depositMode.message as string}</p>
            )}
          </div>
        </div>
      </div>

      {/* Limites et Restrictions */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Limites et Restrictions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Solde Minimum Requis
            </label>
            <input
              {...register('minimumBalance')}
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Solde à maintenir pour éviter des frais supplémentaires
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite de Retrait Journalier
            </label>
            <input
              {...register('dailyWithdrawalLimit')}
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite de Retrait Mensuel
            </label>
            <input
              {...register('monthlyWithdrawalLimit')}
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Découvert Autorisé */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <label className="flex items-start gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            {...register('allowOverdraft')}
            className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-0.5"
          />
          <div>
            <span className="font-medium text-gray-900">Autoriser le Découvert</span>
            <p className="text-sm text-gray-600">Permettre au client de retirer plus que son solde disponible</p>
          </div>
        </label>

        {allowOverdraft && (
          <div className="animate-fadeIn">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite de Découvert Autorisé
            </label>
            <input
              {...register('overdraftLimit')}
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder={currency === 'HTG' ? 'Ex: 10,000 HTG' : 'Ex: 100 USD'}
            />
            <p className="text-xs text-gray-500 mt-1">
              Montant maximum que le client peut utiliser en découvert
            </p>
          </div>
        )}
      </div>

      {/* Frais */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Frais et Tarification</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frais de Maintenance Mensuel
            </label>
            <input
              {...register('maintenanceFee')}
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frais de Chéquier
            </label>
            <input
              {...register('checkbookFee')}
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Caractéristiques du Compte Courant</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Retraits et dépôts illimités</li>
            <li>Émission de chéquiers disponible</li>
            <li>Accès aux services en ligne et mobile</li>
            <li>Carte bancaire disponible (frais supplémentaires)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Step 6: Sécurité et Révision
export const Step6SecurityReview: React.FC<StepProps> = ({ register, errors, watch }) => {
  const formData = watch();
  const clientType = formData.clientType;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Sécurité et Révision</h3>
        <p className="text-gray-600">Paramètres de sécurité et vérification des informations</p>
      </div>

      {/* Sécurité */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Paramètres de Sécurité</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code PIN (4 chiffres) <span className="text-red-500">*</span>
            </label>
            <input
              {...register('pin')}
              type="password"
              maxLength={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="****"
            />
            {errors.pin && (
              <p className="text-red-500 text-sm mt-1">{errors.pin.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question de Sécurité <span className="text-red-500">*</span>
            </label>
            <select
              {...register('securityQuestion')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sélectionnez une question</option>
              <option value="VILLE_NAISSANCE">Ville de naissance de votre mère?</option>
              <option value="ANIMAL">Nom de votre premier animal?</option>
              <option value="ECOLE">Nom de votre école primaire?</option>
              <option value="COULEUR">Votre couleur préférée?</option>
              <option value="AMI">Prénom de votre meilleur ami d'enfance?</option>
            </select>
            {errors.securityQuestion && (
              <p className="text-red-500 text-sm mt-1">{errors.securityQuestion.message as string}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Réponse de Sécurité <span className="text-red-500">*</span>
            </label>
            <input
              {...register('securityAnswer')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Réponse à la question de sécurité"
            />
            {errors.securityAnswer && (
              <p className="text-red-500 text-sm mt-1">{errors.securityAnswer.message as string}</p>
            )}
          </div>
        </div>
      </div>

      {/* Révision des Données */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 p-6 rounded-lg border border-primary-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" />
          Révision des Informations
        </h4>
        
        <div className="space-y-4">
          {/* Type de Client */}
          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">Type de Client:</span>
            <span className="text-sm text-gray-900">
              {clientType === 'PHYSIQUE' ? 'Personne Physique' : 'Personne Morale'}
            </span>
          </div>

          {/* Nom/Raison Sociale */}
          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">
              {clientType === 'PHYSIQUE' ? 'Nom Complet:' : 'Raison Sociale:'}
            </span>
            <span className="text-sm text-gray-900">
              {clientType === 'PHYSIQUE' ? formData.fullName : formData.companyName}
            </span>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">Email:</span>
            <span className="text-sm text-gray-900">
              {clientType === 'PHYSIQUE' ? formData.email : formData.companyEmail}
            </span>
          </div>

          {/* Téléphone */}
          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">Téléphone:</span>
            <span className="text-sm text-gray-900">
              {clientType === 'PHYSIQUE' ? formData.phone : formData.companyPhone}
            </span>
          </div>

          {/* Devise */}
          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">Devise du Compte:</span>
            <span className="text-sm font-bold text-primary-600">
              {formData.currency} {formData.currency === 'HTG' ? '(Gourde)' : '(Dollar)'}
            </span>
          </div>

          {/* Dépôt Initial */}
          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">Dépôt Initial:</span>
            <span className="text-sm font-bold text-green-600">
              {formData.initialDeposit ? `${formData.initialDeposit} ${formData.currency}` : 'Non spécifié'}
            </span>
          </div>

          {/* Découvert */}
          {formData.allowOverdraft && (
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">Découvert Autorisé:</span>
              <span className="text-sm text-orange-600">
                {formData.overdraftLimit ? `${formData.overdraftLimit} ${formData.currency}` : 'Activé'}
              </span>
            </div>
          )}

          {/* Personne Autorisée */}
          {formData.hasAuthorizedPerson && (
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">Personne Autorisée:</span>
              <span className="text-sm text-gray-900">{formData.authPersonName || 'Configurée'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Déclaration */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-900">
            <p className="font-bold mb-2">Déclaration et Consentement</p>
            <p className="mb-3">
              En soumettant ce formulaire, je déclare que toutes les informations fournies sont exactes et complètes.
              Je comprends que toute fausse déclaration peut entraîner la fermeture du compte.
            </p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                required
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-0.5"
              />
              <span className="font-medium">
                J'accepte les termes et conditions et autorise l'utilisation de mes données conformément à la politique de confidentialité.
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-green-900">
          <p className="font-medium mb-1">Prêt à soumettre</p>
          <p>Veuillez vérifier toutes les informations avant de cliquer sur "Créer le Compte".</p>
        </div>
      </div>
    </div>
  );
};
