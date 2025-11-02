// Wizard Steps Components for CurrentAccountWizard
import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';

interface StepProps {
  register: UseFormRegister<any>;
  errors: FieldErrors;
  watch: any;
  setValue: any;
}

// Step 2: Identification - Personne Physique
export const Step2Physique: React.FC<StepProps> = ({ register, errors }) => {
  const departments = [
    'Ouest', 'Artibonite', 'Nord', 'Nord-Est', 'Nord-Ouest',
    'Sud', 'Sud-Est', 'Grand-Anse', 'Nippes', 'Centre'
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Identification du Client</h3>
        <p className="text-gray-600">Informations personnelles du titulaire du compte</p>
      </div>

      {/* Informations Personnelles */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Informations Personnelles</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom Complet <span className="text-red-500">*</span>
            </label>
            <input
              {...register('fullName')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: Jean Baptiste Pierre"
            />
            {errors.fullName && (
              <p className="text-red-500 text-sm mt-1">{errors.fullName.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sexe <span className="text-red-500">*</span>
            </label>
            <select
              {...register('gender')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sélectionnez</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
            {errors.gender && (
              <p className="text-red-500 text-sm mt-1">{errors.gender.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de Naissance <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('birthDate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            {errors.birthDate && (
              <p className="text-red-500 text-sm mt-1">{errors.birthDate.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lieu de Naissance <span className="text-red-500">*</span>
            </label>
            <input
              {...register('birthPlace')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: Port-au-Prince"
            />
            {errors.birthPlace && (
              <p className="text-red-500 text-sm mt-1">{errors.birthPlace.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nationalité <span className="text-red-500">*</span>
            </label>
            <input
              {...register('nationality')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: Haïtienne"
              defaultValue="Haïtienne"
            />
            {errors.nationality && (
              <p className="text-red-500 text-sm mt-1">{errors.nationality.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NIF (Optionnel)
            </label>
            <input
              {...register('nif')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Numéro d'Identification Fiscale"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CIN (Optionnel)
            </label>
            <input
              {...register('cin')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Carte d'Identification Nationale"
            />
          </div>
        </div>
      </div>

      {/* Pièce d'Identité */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Pièce d'Identité</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de Pièce <span className="text-red-500">*</span>
            </label>
            <select
              {...register('idType')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sélectionnez</option>
              <option value="CIN">CIN - Carte d'Identité Nationale</option>
              <option value="PASSPORT">Passeport</option>
              <option value="PERMIS">Permis de Conduire</option>
            </select>
            {errors.idType && (
              <p className="text-red-500 text-sm mt-1">{errors.idType.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de Pièce <span className="text-red-500">*</span>
            </label>
            <input
              {...register('idNumber')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Numéro de la pièce"
            />
            {errors.idNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.idNumber.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de Délivrance <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('idIssueDate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            {errors.idIssueDate && (
              <p className="text-red-500 text-sm mt-1">{errors.idIssueDate.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date d'Expiration <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('idExpiryDate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            {errors.idExpiryDate && (
              <p className="text-red-500 text-sm mt-1">{errors.idExpiryDate.message as string}</p>
            )}
          </div>
        </div>
      </div>

      {/* Adresse et Contact */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Adresse et Contact</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse Complète <span className="text-red-500">*</span>
            </label>
            <input
              {...register('address')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Rue, numéro, quartier..."
            />
            {errors.address && (
              <p className="text-red-500 text-sm mt-1">{errors.address.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commune <span className="text-red-500">*</span>
            </label>
            <input
              {...register('commune')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: Pétion-Ville"
            />
            {errors.commune && (
              <p className="text-red-500 text-sm mt-1">{errors.commune.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Département <span className="text-red-500">*</span>
            </label>
            <select
              {...register('department')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sélectionnez</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            {errors.department && (
              <p className="text-red-500 text-sm mt-1">{errors.department.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse Postale (Si différente)
            </label>
            <input
              {...register('postalAddress')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Boîte postale..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone <span className="text-red-500">*</span>
            </label>
            <input
              {...register('phone')}
              type="tel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="+509 XXXX-XXXX"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="exemple@email.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message as string}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Documents requis</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Photocopie de la pièce d'identité valide</li>
            <li>Preuve de résidence (facture d'électricité, contrat de bail, etc.)</li>
            <li>Photo d'identité récente</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Step 2: Identification - Personne Morale
export const Step2Morale: React.FC<StepProps> = ({ register, errors }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Identification de l'Entreprise</h3>
        <p className="text-gray-600">Informations légales de la personne morale</p>
      </div>

      {/* Informations de l'Entreprise */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Informations de l'Entreprise</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Raison Sociale <span className="text-red-500">*</span>
            </label>
            <input
              {...register('companyName')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Nom légal de l'entreprise"
            />
            {errors.companyName && (
              <p className="text-red-500 text-sm mt-1">{errors.companyName.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Forme Juridique <span className="text-red-500">*</span>
            </label>
            <select
              {...register('legalForm')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sélectionnez</option>
              <option value="SA">S.A. - Société Anonyme</option>
              <option value="SEM">S.E.M. - Société d'Économie Mixte</option>
              <option value="INDIVIDUELLE">Société Individuelle</option>
              <option value="COOPERATIVE">Coopérative</option>
            </select>
            {errors.legalForm && (
              <p className="text-red-500 text-sm mt-1">{errors.legalForm.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de Commerce <span className="text-red-500">*</span>
            </label>
            <input
              {...register('commerceNumber')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Numéro d'immatriculation"
            />
            {errors.commerceNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.commerceNumber.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NIF de l'Entreprise <span className="text-red-500">*</span>
            </label>
            <input
              {...register('companyNif')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Numéro d'Identification Fiscale"
            />
            {errors.companyNif && (
              <p className="text-red-500 text-sm mt-1">{errors.companyNif.message as string}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse du Siège Social <span className="text-red-500">*</span>
            </label>
            <input
              {...register('companyAddress')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Adresse complète du siège social"
            />
            {errors.companyAddress && (
              <p className="text-red-500 text-sm mt-1">{errors.companyAddress.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone de l'Entreprise <span className="text-red-500">*</span>
            </label>
            <input
              {...register('companyPhone')}
              type="tel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="+509 XXXX-XXXX"
            />
            {errors.companyPhone && (
              <p className="text-red-500 text-sm mt-1">{errors.companyPhone.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email de l'Entreprise <span className="text-red-500">*</span>
            </label>
            <input
              {...register('companyEmail')}
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="contact@entreprise.com"
            />
            {errors.companyEmail && (
              <p className="text-red-500 text-sm mt-1">{errors.companyEmail.message as string}</p>
            )}
          </div>
        </div>
      </div>

      {/* Représentant Légal */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Représentant Légal</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du Représentant <span className="text-red-500">*</span>
            </label>
            <input
              {...register('legalRepName')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Nom complet"
            />
            {errors.legalRepName && (
              <p className="text-red-500 text-sm mt-1">{errors.legalRepName.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre/Fonction <span className="text-red-500">*</span>
            </label>
            <input
              {...register('legalRepTitle')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: Directeur Général, Président"
            />
            {errors.legalRepTitle && (
              <p className="text-red-500 text-sm mt-1">{errors.legalRepTitle.message as string}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de Pièce d'Identité <span className="text-red-500">*</span>
            </label>
            <input
              {...register('legalRepIdNumber')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="CIN, Passeport, ou Permis"
            />
            {errors.legalRepIdNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.legalRepIdNumber.message as string}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Documents requis pour entreprise</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Certificat d'immatriculation au commerce</li>
            <li>Statuts de l'entreprise</li>
            <li>Procès-verbal de nomination du représentant légal</li>
            <li>Pièce d'identité du représentant légal</li>
            <li>Patente commerciale à jour</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Step 3: Personne Autorisée (Optionnel)
export const Step3AuthorizedPerson: React.FC<StepProps> = ({ register, errors, watch }) => {
  const hasAuthorizedPerson = watch('hasAuthorizedPerson');

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Personne Autorisée à Signer</h3>
        <p className="text-gray-600">Ajouter une personne autorisée à effectuer des transactions (Optionnel)</p>
      </div>

      {/* Toggle pour activer/désactiver */}
      <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register('hasAuthorizedPerson')}
            className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <div>
            <span className="font-medium text-gray-900">Ajouter une personne autorisée</span>
            <p className="text-sm text-gray-600">Cette personne pourra effectuer des transactions au nom du titulaire</p>
          </div>
        </label>
      </div>

      {/* Champs conditionnels */}
      {hasAuthorizedPerson && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Signature requise</p>
              <p>La personne autorisée devra présenter une pièce d'identité valide et signer en présence d'un agent.</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom Complet
                </label>
                <input
                  {...register('authPersonName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Nom de la personne autorisée"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de Pièce d'Identité
                </label>
                <input
                  {...register('authPersonId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="CIN, Passeport, ou Permis"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relation avec le Titulaire
                </label>
                <select
                  {...register('authPersonRelation')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionnez</option>
                  <option value="CONJOINT">Conjoint(e)</option>
                  <option value="PARENT">Parent</option>
                  <option value="ENFANT">Enfant</option>
                  <option value="FRERE_SOEUR">Frère/Sœur</option>
                  <option value="EMPLOYE">Employé(e)</option>
                  <option value="ASSOCIE">Associé(e)</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  {...register('authPersonPhone')}
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="+509 XXXX-XXXX"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limite d'Autorité (Montant Maximum)
                </label>
                <input
                  {...register('authPersonLimit')}
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: 50000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Montant maximum que cette personne peut retirer ou transférer en une seule transaction
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!hasAuthorizedPerson && (
        <div className="text-center py-8 text-gray-500">
          <p>Aucune personne autorisée configurée</p>
          <p className="text-sm mt-1">Vous pouvez ajouter une personne autorisée plus tard si nécessaire</p>
        </div>
      )}
    </div>
  );
};
