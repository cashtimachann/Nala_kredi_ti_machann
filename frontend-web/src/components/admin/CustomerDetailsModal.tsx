import React from 'react';
import { X, Users, Building2, User } from 'lucide-react';

const formatDateDisplay = (raw?: string) => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR');
};

const genderLabel = (g: any) => {
  if (g === 1) return 'Féminin';
  return 'Masculin';
};

interface Props {
  customer: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (c: any) => void;
}

const CustomerDetailsModal: React.FC<Props> = ({ customer, isOpen, onClose, onEdit }) => {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Détails du Client</h2>
            <p className="text-sm text-gray-600 mt-1">{customer.fullName}</p>
          </div>
          <button
            onClick={() => { onClose(); }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Personal / Business info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              {((customer as any)?.isBusiness || (customer as any)?.companyName || (customer as any)?.legalForm) ? 'Informations de l\'Entreprise' : 'Informations Personnelles'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {((customer as any)?.isBusiness || (customer as any)?.companyName || (customer as any)?.legalForm) ? (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Raison sociale</label>
                    <p className="text-base text-gray-900">{(customer as any)?.companyName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Forme juridique</label>
                    <p className="text-base text-gray-900">{(customer as any)?.legalForm || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Numéro de registre commerce</label>
                    <p className="text-base text-gray-900">{(customer as any)?.tradeRegisterNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">NIF</label>
                    <p className="text-base text-gray-900">{(customer as any)?.taxId || 'N/A'}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Prénom</label>
                    <p className="text-base text-gray-900">{customer.firstName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Nom</label>
                    <p className="text-base text-gray-900">{customer.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Date de Naissance</label>
                    <p className="text-base text-gray-900">{customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString('fr-FR') : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Genre</label>
                    <p className="text-base text-gray-900">{genderLabel(customer.gender)}</p>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500">ID Client</label>
                <p className="text-base text-gray-900 font-mono bg-blue-50 px-2 py-1 rounded inline-block">{customer.customerCode || customer.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Statut</label>
                <p className="text-base">
                  {customer.isActive ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Actif</span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Inactif</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Legal representative (business) */}
          {((customer as any)?.isBusiness || (customer as any)?.companyName || (customer as any)?.legalForm) && (
            (() => {
              const rep = (customer as any)?.legalRepresentative || {};
              const repFirst = (rep?.firstName || (customer as any)?.representativeFirstName || '')?.toString().trim();
              const repLast = (rep?.lastName || (customer as any)?.representativeLastName || '')?.toString().trim();
              const repFull = (repFirst || repLast) ? `${repFirst} ${repLast}`.trim() : 'N/A';
              const repTitle = (rep?.title || (customer as any)?.representativeTitle) || 'N/A';
              const repDocTypeVal = rep?.documentType ?? (customer as any)?.representativeDocumentType;
              const docTypeMap: Record<number, string> = { 0: "CIN (Carte d'Identité Nationale)", 1: 'Passeport', 2: 'Permis de Conduire' };
              const repDocType = repDocTypeVal !== undefined && repDocTypeVal !== null ? (docTypeMap[repDocTypeVal] || String(repDocTypeVal)) : 'N/A';
              const repDocNumber = rep?.documentNumber || (customer as any)?.representativeDocumentNumber || 'N/A';
              const repIssued = rep?.issuedDate || (customer as any)?.representativeIssuedDate || null;
              const repExpiry = rep?.expiryDate || (customer as any)?.representativeExpiryDate || null;
              const repIssuingAuthority = rep?.issuingAuthority || (customer as any)?.representativeIssuingAuthority || 'N/A';

              return (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-blue-600" />
                    Représentant Légal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-500">Nom complet</label>
                      <p className="text-base text-gray-900">{repFull}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Titre/Fonction</label>
                      <p className="text-base text-gray-900">{repTitle}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Type de document</label>
                      <p className="text-base text-gray-900">{repDocType}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Numéro de document</label>
                      <p className="text-base text-gray-900 font-mono">{repDocNumber}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Date d'émission</label>
                      <p className="text-base text-gray-900">{repIssued ? new Date(repIssued).toLocaleDateString('fr-FR') : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Date d'expiration</label>
                      <p className="text-base text-gray-900">{repExpiry ? new Date(repExpiry).toLocaleDateString('fr-FR') : 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-500">Autorité d'émission</label>
                      <p className="text-base text-gray-900">{repIssuingAuthority}</p>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* Address */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-blue-600" />
              Adresse
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Adresse</label>
                <p className="text-base text-gray-900">{customer.address?.street || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Commune</label>
                <p className="text-base text-gray-900">{customer.address?.commune || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Département</label>
                <p className="text-base text-gray-900">{customer.address?.department || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-gray-50">Fermer</button>
          <button onClick={() => { onClose(); onEdit(customer); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Modifier</button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsModal;
