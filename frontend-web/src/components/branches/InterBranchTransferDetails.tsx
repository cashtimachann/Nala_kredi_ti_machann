import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  Building2,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  AlertTriangle,
  History,
  ArrowRight
} from 'lucide-react';
import {
  InterBranchTransfer,
  InterBranchTransferLogDto,
  TransferStatus,
  Currency,
  getTransferStatusInfo,
  getCurrencyInfo
} from '../../types/interBranchTransfer';
import apiService from '../../services/apiService';

interface InterBranchTransferDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: InterBranchTransfer | null;
  onTransferUpdate?: (updatedTransfer: InterBranchTransfer) => void;
}

const InterBranchTransferDetails: React.FC<InterBranchTransferDetailsProps> = ({
  isOpen,
  onClose,
  transfer,
  onTransferUpdate
}) => {
  const [auditLogs, setAuditLogs] = useState<InterBranchTransferLogDto[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (isOpen && transfer) {
      loadAuditLogs();
    }
  }, [isOpen, transfer]);

  const loadAuditLogs = async () => {
    if (!transfer) return;

    try {
      setLoadingLogs(true);
      const logs = await apiService.getInterBranchTransferLogs(transfer.id);
      setAuditLogs(logs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const formatCurrency = (amount: number, currency: Currency) => {
    const currencyInfo = getCurrencyInfo(currency);
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyInfo.code === 'HTG' ? 'USD' : currencyInfo.code,
      minimumFractionDigits: 0
    }).format(amount).replace('$', currencyInfo.symbol);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusIcon = (status: TransferStatus) => {
    const statusInfo = getTransferStatusInfo(status);
    const iconClass = "h-5 w-5";

    switch (status) {
      case TransferStatus.Pending:
        return <Clock className={`${iconClass} text-yellow-500`} />;
      case TransferStatus.Approved:
        return <CheckCircle className={`${iconClass} text-blue-500`} />;
      case TransferStatus.InTransit:
        return <Truck className={`${iconClass} text-purple-500`} />;
      case TransferStatus.Completed:
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case TransferStatus.Rejected:
        return <XCircle className={`${iconClass} text-red-500`} />;
      case TransferStatus.Cancelled:
        return <AlertTriangle className={`${iconClass} text-gray-500`} />;
      default:
        return <Clock className={`${iconClass} text-gray-500`} />;
    }
  };

  const getActionIcon = (action: string) => {
    const iconClass = "h-4 w-4";
    switch (action.toLowerCase()) {
      case 'create':
        return <FileText className={`${iconClass} text-blue-500`} />;
      case 'approve':
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'reject':
        return <XCircle className={`${iconClass} text-red-500`} />;
      case 'process':
        return <Truck className={`${iconClass} text-purple-500`} />;
      case 'cancel':
        return <AlertTriangle className={`${iconClass} text-gray-500`} />;
      default:
        return <History className={`${iconClass} text-gray-500`} />;
    }
  };

  if (!isOpen || !transfer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              Détails du Transfert #{transfer.transferNumber}
            </h2>
            <div className="flex items-center space-x-2">
              {getStatusIcon(transfer.status)}
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransferStatusInfo(transfer.status).color}`}>
                {getTransferStatusInfo(transfer.status).label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Transfer Overview */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Générales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <Building2 className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">De</p>
                  <p className="font-medium text-gray-900">{transfer.fromBranchName}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <ArrowRight className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Vers</p>
                  <p className="font-medium text-gray-900">{transfer.toBranchName}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Montant</p>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(transfer.amount, transfer.currency)}
                  </p>
                  {transfer.exchangeRate !== 1 && (
                    <p className="text-xs text-gray-500">
                      Taux: {transfer.exchangeRate} | Converti: {formatCurrency(transfer.convertedAmount, transfer.currency)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Demandé par</p>
                  <p className="font-medium text-gray-900">{transfer.requestedByName || transfer.requestedBy}</p>
                  <p className="text-xs text-gray-500">{formatDate(transfer.requestedAt || transfer.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Motif</p>
                  <p className="font-medium text-gray-900">{transfer.reason}</p>
                </div>
              </div>

              {transfer.referenceNumber && (
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Référence</p>
                    <p className="font-medium text-gray-900">{transfer.referenceNumber}</p>
                  </div>
                </div>
              )}
            </div>

            {transfer.notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-gray-900 bg-white p-3 rounded border">{transfer.notes}</p>
              </div>
            )}
          </div>

          {/* Status Timeline */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Chronologie du Transfert</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Transfert créé</p>
                  <p className="text-sm text-gray-500">
                    Par {transfer.requestedByName || transfer.requestedBy} le {formatDate(transfer.createdAt)}
                  </p>
                </div>
              </div>

              {transfer.approvedAt && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Transfert approuvé</p>
                    <p className="text-sm text-gray-500">
                      Par {transfer.approvedByName || transfer.approvedBy} le {formatDate(transfer.approvedAt)}
                    </p>
                  </div>
                </div>
              )}

              {transfer.processedAt && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Truck className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Transfert traité</p>
                    <p className="text-sm text-gray-500">
                      Par {transfer.processedByName || transfer.processedBy} le {formatDate(transfer.processedAt)}
                      {transfer.trackingNumber && ` - Suivi: ${transfer.trackingNumber}`}
                    </p>
                  </div>
                </div>
              )}

              {(transfer.status === TransferStatus.Rejected || transfer.status === TransferStatus.Cancelled) && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      Transfert {transfer.status === TransferStatus.Rejected ? 'rejeté' : 'annulé'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {transfer.rejectionReason || 'Aucune raison spécifiée'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique des Actions</h3>
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun historique disponible</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log, index) => (
                  <div key={log.id || index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                    <div className="flex-shrink-0">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{log.action}</p>
                        <p className="text-sm text-gray-500">{formatDate(log.performedAt)}</p>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Par {log.performedByName || log.performedBy}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

export default InterBranchTransferDetails;