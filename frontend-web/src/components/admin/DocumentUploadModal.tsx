import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, Trash2, Download, Edit3, Save, Check } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import toast from 'react-hot-toast';
import savingsCustomerService, { 
  SavingsCustomerResponseDto, 
  SavingsCustomerDocumentType,
  SavingsCustomerDocumentResponseDto
} from '../../services/savingsCustomerService';

interface DocumentUploadModalProps {
  customer: SavingsCustomerResponseDto;
  onClose: () => void;
  onSuccess: () => void;
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ customer, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'signature'>('documents');
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<SavingsCustomerDocumentResponseDto[]>(customer.documents || []);
  
  // Document upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<SavingsCustomerDocumentType>(SavingsCustomerDocumentType.IdentityCard);
  const [documentName, setDocumentName] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  
  // Signature state
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [currentSignature, setCurrentSignature] = useState<string | null>(customer.signature || null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getDocumentTypeName = (t: any): string => {
    const n = typeof t === 'number' ? t : parseInt(t, 10);
    switch (n) {
      case 0: return "Carte d'Identité";
      case 1: return 'Justificatif de Résidence';
      case 2: return 'Justificatif de Revenu';
      case 3: return 'Photo';
      default: return 'Autre';
    }
  };

  useEffect(() => {
    loadDocuments();
    if (customer.signature) {
      setCurrentSignature(customer.signature);
      setHasSignature(true);
    }
  }, [customer.id]);

  const loadDocuments = async () => {
    try {
      const docs = await savingsCustomerService.getCustomerDocuments(customer.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Erreur lors du chargement des documents:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!documentName) {
        setDocumentName(file.name.split('.')[0]);
      }
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedFile || !documentName.trim()) {
      toast.error('Veuillez sélectionner un fichier et entrer un nom');
      return;
    }

    setUploading(true);
    try {
      await savingsCustomerService.uploadDocument(
        customer.id,
        selectedFile,
        documentType,
        documentName,
        documentDescription || undefined
      );

      toast.success('Document téléchargé avec succès!');
      
      // Reset form
      setSelectedFile(null);
      setDocumentName('');
      setDocumentDescription('');
      
      // Reload documents
      await loadDocuments();
      onSuccess();
    } catch (error: any) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error(error.message || 'Erreur lors de l\'upload du document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDocument = async (documentId: string, name: string) => {
    try {
      const blob = await savingsCustomerService.downloadDocument(customer.id, documentId);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Document téléchargé!');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Èske ou sèten ou vle efase dokiman sa a?')) return;

    try {
      setDeletingId(documentId);
      console.log('Deleting document from modal:', { customerId: customer.id, documentId });
      await savingsCustomerService.deleteDocument(customer.id, documentId);
      toast.success('Dokiman efase avèk siksè!');
      await loadDocuments();
      onSuccess();
    } catch (error: any) {
      console.error('Delete document error:', error);
      const msg = error?.response?.data?.message || error?.message || 'Erreur lors de la suppression';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveSignature = async () => {
    if (!sigCanvas.current) return;

    if (sigCanvas.current.isEmpty()) {
      toast.error('Veuillez signer d\'abord');
      return;
    }

    try {
      const signatureData = sigCanvas.current.toDataURL();
      await savingsCustomerService.saveSignature(customer.id, signatureData);
      
      setCurrentSignature(signatureData);
      setHasSignature(true);
      toast.success('Signature sauvegardée avec succès!');
      onSuccess();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde de la signature');
    }
  };

  const handleClearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const documentTypeOptions = [
    { value: SavingsCustomerDocumentType.IdentityCard, label: 'Carte d\'Identité' },
    { value: SavingsCustomerDocumentType.ProofOfResidence, label: 'Justificatif de Résidence' },
    { value: SavingsCustomerDocumentType.ProofOfIncome, label: 'Justificatif de Revenu' },
    { value: SavingsCustomerDocumentType.Photo, label: 'Photo' },
    { value: SavingsCustomerDocumentType.Other, label: 'Autre' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Documents & Signature</h2>
            <p className="text-sm text-gray-600 mt-1">{customer.fullName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'documents'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('signature')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'signature'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Edit3 className="h-4 w-4 inline mr-2" />
            Signature {hasSignature && <Check className="h-4 w-4 inline ml-1 text-green-600" />}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'documents' ? (
            <div className="space-y-6">
              {/* Upload Form */}
              <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Télécharger un Document</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de Document
                    </label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {documentTypeOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du Document
                    </label>
                    <input
                      type="text"
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      placeholder="Ex: CIN Jean Dupont"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (optionnel)
                    </label>
                    <textarea
                      value={documentDescription}
                      onChange={(e) => setDocumentDescription(e.target.value)}
                      placeholder="Description du document..."
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fichier (PDF, JPG, PNG - Max 5MB)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {selectedFile && (
                      <p className="text-sm text-gray-600 mt-2">
                        Fichier sélectionné: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleUploadDocument}
                    disabled={!selectedFile || uploading}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Upload className="h-5 w-5" />
                    {uploading ? 'Téléchargement...' : 'Télécharger le Document'}
                  </button>
                </div>
              </div>

              {/* Documents List */}
              {documents.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents Téléchargés</h3>
                  <div className="space-y-3">
                    {documents.map((doc) => {
                      const docId = (doc as any).Id || (doc as any).id;
                      const typeName = doc.documentTypeName || getDocumentTypeName((doc as any).DocumentType);
                      const rawSize = (doc as any).FileSize;
                      const sizeKb = typeof rawSize === 'number' && !isNaN(rawSize) ? (rawSize / 1024) : null;
                      const rawDate = (doc as any).UploadedAt;
                      const dateObj = rawDate ? new Date(rawDate) : null;
                      const hasValidDate = !!(dateObj && !isNaN(dateObj.getTime()));
                      const displayName = doc.name || (doc as any).name || ((doc as any).FilePath ? String((doc as any).FilePath).split(/[/\\]/).pop() : '') || 'Document';
                      const displayDesc = doc.description || (doc as any).description;
                      const isVerified = (doc as any).Verified ?? (doc as any).verified ?? false;
                      return (
                        <div key={docId || displayName} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <FileText className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate flex items-center gap-2">
                                  <span className="truncate">{displayName}</span>
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full whitespace-nowrap">{typeName}</span>
                                </p>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                  {sizeKb !== null && (
                                    <span>{sizeKb.toFixed(1)} KB</span>
                                  )}
                                  {sizeKb !== null && hasValidDate && <span>•</span>}
                                  {hasValidDate && (
                                    <span>{dateObj!.toLocaleDateString('fr-FR')}</span>
                                  )}
                                </div>
                                {displayDesc && (
                                  <p className="text-sm text-gray-600 mt-1">{displayDesc}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isVerified && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                  Vérifié
                                </span>
                              )}
                              <button
                                onClick={() => docId && handleDownloadDocument(docId, displayName)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Télécharger"
                                disabled={!docId}
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => docId && handleDeleteDocument(docId)}
                                className={`p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${deletingId === docId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={!docId || deletingId === docId}
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Signature */}
              {currentSignature && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Signature Actuelle</h3>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <img 
                      src={currentSignature} 
                      alt="Signature actuelle" 
                      className="max-h-32 mx-auto"
                    />
                  </div>
                </div>
              )}

              {/* Signature Pad */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {currentSignature ? 'Nouvelle Signature' : 'Capturer la Signature'}
                </h3>
                <div className="bg-white rounded-lg border-2 border-gray-300">
                  <SignatureCanvas
                    ref={sigCanvas}
                    canvasProps={{
                      className: 'w-full h-64 touch-action-none',
                      style: { border: '1px solid #e5e7eb' }
                    }}
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleClearSignature}
                    className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="h-5 w-5" />
                    Effacer
                  </button>
                  <button
                    onClick={handleSaveSignature}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="h-5 w-5" />
                    Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;


