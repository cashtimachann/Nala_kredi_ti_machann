import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  ArrowRightLeft,
  DollarSign,
  Calendar,
  User,
  Building2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  InterBranchTransfer,
  TransferStatus,
  Currency,
  InterBranchTransferSearchDto,
  ProcessInterBranchTransferDto,
  DispatchInterBranchTransferDto,
  getTransferStatusInfo,
  getCurrencyInfo
} from '../../types/interBranchTransfer';
import ConfirmDialog from '../common/ConfirmDialog';
import InterBranchTransferForm from './InterBranchTransferForm';
import apiService from '../../services/apiService';

interface InterBranchTransferListProps {}

const InterBranchTransferList: React.FC<InterBranchTransferListProps> = () => {
  const [transfers, setTransfers] = useState<InterBranchTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'all'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<Currency | 'all'>('all');
  const [fromBranchFilter, setFromBranchFilter] = useState<number | 'all'>('all');
  const [toBranchFilter, setToBranchFilter] = useState<number | 'all'>('all');
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{ action: 'approve'|'reject'|'dispatch'|'process'; transfer: InterBranchTransfer|null }>({ action: 'approve', transfer: null });
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [showTransferForm, setShowTransferForm] = useState(false);

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const searchDto: InterBranchTransferSearchDto = {};
      const transferData = await apiService.getInterBranchTransfers(searchDto);
      setTransfers(transferData);
    } catch (error) {
      console.error('Error loading transfers:', error);
      toast.error('Erreur chargement transferts. Réessayez plus tard.');
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  const updateTransferInState = (updated: InterBranchTransfer) => {
    setTransfers(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const openDialog = (action: 'approve'|'reject'|'dispatch'|'process', transfer: InterBranchTransfer) => {
    setDialogConfig({ action, transfer });
    setDialogOpen(true);
  };

  const performAction = async () => {
    if (!dialogConfig.transfer) return;
    const transfer = dialogConfig.transfer;
    setLoadingActionId(transfer.id);
    setDialogOpen(false);
    // Optimistic status update
    const original = { ...transfer };
    const optimisticStatusMap: Record<string, TransferStatus> = {
      approve: TransferStatus.Approved,
      reject: TransferStatus.Rejected,
      dispatch: TransferStatus.InTransit,
      process: TransferStatus.Completed
    };
    const targetStatus = optimisticStatusMap[dialogConfig.action];
    updateTransferInState({ ...transfer, status: targetStatus, statusName: getTransferStatusInfo(targetStatus).label });
    try {
      let result: InterBranchTransfer;
      switch (dialogConfig.action) {
        case 'approve':
          result = await apiService.approveInterBranchTransfer({ id: transfer.id });
          toast.success('Transfert approuvé');
          break;
        case 'reject': {
          const reason = prompt('Entrez la raison du rejet (temporaire)');
          if (!reason) throw new Error('Raison requise');
          result = await apiService.rejectInterBranchTransfer(transfer.id, { id: transfer.id, reason });
          toast.success('Transfert rejeté');
          break; }
        case 'dispatch': {
          const dto: DispatchInterBranchTransferDto = { id: transfer.id, referenceNumber: transfer.referenceNumber, trackingNumber: transfer.trackingNumber, notes: transfer.notes };
          result = await apiService.dispatchInterBranchTransfer(dto);
          toast.success('Transfert en transit');
          break; }
        case 'process': {
          const dto: ProcessInterBranchTransferDto = { id: transfer.id, referenceNumber: transfer.referenceNumber, trackingNumber: transfer.trackingNumber, notes: transfer.notes };
          result = await apiService.processInterBranchTransfer(dto);
          toast.success('Transfert complété');
          break; }
        default:
          throw new Error('Action inconnue');
      }
      updateTransferInState(result);
    } catch (e) {
      console.error(e);
      // rollback
      updateTransferInState(original);
      toast.error('Action échouée');
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleViewDetails = (transferId: string) => {
    setShowDetails(showDetails === transferId ? null : transferId);
  };

  const handleNewTransfer = () => {
    setShowTransferForm(true);
  };

  const handleTransferSaved = (newTransfer: InterBranchTransfer) => {
    setTransfers(prev => [newTransfer, ...prev]);
    setShowTransferForm(false);
    toast.success('Transfert créé avec succès!');
  };

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch =
      (transfer.transferNumber && transfer.transferNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (transfer.fromBranchName && transfer.fromBranchName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (transfer.toBranchName && transfer.toBranchName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (transfer.requestedByName && transfer.requestedByName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (transfer.reason && transfer.reason.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || transfer.status === Number(statusFilter);
    const matchesCurrency = currencyFilter === 'all' || transfer.currency === Number(currencyFilter);
    const matchesFromBranch = fromBranchFilter === 'all' || transfer.fromBranchId === fromBranchFilter;
    const matchesToBranch = toBranchFilter === 'all' || transfer.toBranchId === toBranchFilter;

    return matchesSearch && matchesStatus && matchesCurrency && matchesFromBranch && matchesToBranch;
  });

  const formatCurrency = (amount: number, currency: Currency) => {
    const currencyInfo = getCurrencyInfo(currency);
    if (currencyInfo.code === 'HTG') {
      // For HTG, format without currency symbol and add HTG manually
      return `${new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(amount)} ${currencyInfo.symbol}`;
    }
    // For USD and others, use standard currency formatting
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyInfo.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: TransferStatus) => {
    const statusInfo = getTransferStatusInfo(status);
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getUniqueBranches = () => {
    const branches = new Map<number, string>();
    transfers.forEach(transfer => {
      branches.set(transfer.fromBranchId, transfer.fromBranchName);
      branches.set(transfer.toBranchId, transfer.toBranchName);
    });
    return Array.from(branches.entries());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={dialogOpen}
        title={
          dialogConfig.action === 'approve' ? 'Confirmer approbation' :
          dialogConfig.action === 'reject' ? 'Confirmer rejet' :
          dialogConfig.action === 'dispatch' ? 'Confirmer mise en transit' :
          'Confirmer traitement'
        }
        message={
          dialogConfig.action === 'approve' ? 'Voulez-vous approuver ce transfert ?' :
          dialogConfig.action === 'reject' ? 'Voulez-vous rejeter ce transfert ?' :
          dialogConfig.action === 'dispatch' ? 'Marquer ce transfert comme en transit ?' :
          'Marquer ce transfert comme terminé ?'
        }
        confirmLabel="Oui"
        cancelLabel="Non"
        onConfirm={performAction}
        onCancel={() => setDialogOpen(false)}
        loading={loadingActionId !== null}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transferts Inter-Succursales</h2>
          <p className="text-gray-600 mt-1">
            Gérez les transferts de fonds entre succursales
          </p>
        </div>
        <button
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          onClick={handleNewTransfer}
        >
          <Plus className="h-5 w-5" />
          <span>Nouveau Transfert</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TransferStatus | 'all')}
            className="w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">Tous les statuts</option>
            <option value={TransferStatus.Pending}>En attente</option>
            <option value={TransferStatus.Approved}>Approuvé</option>
            <option value={TransferStatus.InTransit}>En transit</option>
            <option value={TransferStatus.Completed}>Terminé</option>
            <option value={TransferStatus.Rejected}>Rejeté</option>
            <option value={TransferStatus.Cancelled}>Annulé</option>
          </select>
        </div>

        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value as Currency | 'all')}
            className="w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">Toutes devises</option>
            <option value={Currency.HTG}>HTG</option>
            <option value={Currency.USD}>USD</option>
          </select>
        </div>

        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={fromBranchFilter}
            onChange={(e) => setFromBranchFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">Toutes origines</option>
            {getUniqueBranches().map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={toBranchFilter}
            onChange={(e) => setToBranchFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">Toutes destinations</option>
            {getUniqueBranches().map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            setSearchTerm('');
            setStatusFilter('all');
            setCurrencyFilter('all');
            setFromBranchFilter('all');
            setToBranchFilter('all');
          }}
          className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Réinitialiser
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transferts</p>
              <p className="text-2xl font-bold text-gray-900">{transfers.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ArrowRightLeft className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Attente</p>
              <p className="text-2xl font-bold text-yellow-600">
                {transfers.filter(t => t.status === TransferStatus.Pending).length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Transit</p>
              <p className="text-2xl font-bold text-purple-600">
                {transfers.filter(t => t.status === TransferStatus.InTransit).length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Truck className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Terminés</p>
              <p className="text-2xl font-bold text-green-600">
                {transfers.filter(t => t.status === TransferStatus.Completed).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Transfers List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredTransfers.length === 0 ? (
          <div className="text-center py-12">
            <ArrowRightLeft className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun transfert trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || currencyFilter !== 'all'
                ? 'Essayez de modifier vos critères de recherche.'
                : 'Aucun transfert inter-succursales pour le moment.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTransfers.map((transfer) => (
              <div key={transfer.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        #{transfer.transferNumber}
                      </h3>
                      {getStatusBadge(transfer.status)}
                      <span className="text-sm text-gray-500">
                        {getCurrencyInfo(transfer.currency).code}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">De: {transfer.fromBranchName}</div>
                          <div className="text-xs text-gray-500">Vers: {transfer.toBranchName}</div>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">{formatCurrency(transfer.amount, transfer.currency)}</div>
                          {transfer.exchangeRate !== 1 && (
                            <div className="text-xs text-gray-500">
                              Taux: {transfer.exchangeRate} | Converti: {formatCurrency(transfer.convertedAmount, transfer.currency)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">{transfer.requestedByName || transfer.requestedBy}</div>
                          <div className="text-xs text-gray-500">
                            {formatDate(transfer.requestedAt || transfer.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">{transfer.reason}</div>
                          {transfer.referenceNumber && (
                            <div className="text-xs text-gray-500">Ref: {transfer.referenceNumber}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {transfer.notes && (
                      <div className="text-sm text-gray-600 mb-3">
                        <span className="font-medium">Notes:</span> {transfer.notes}
                      </div>
                    )}

                    {/* Expanded Details */}
                    {showDetails === transfer.id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Date de création:</span>
                            <span className="ml-2 text-gray-600">{formatDate(transfer.createdAt)}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Dernière modification:</span>
                            <span className="ml-2 text-gray-600">{formatDate(transfer.updatedAt)}</span>
                          </div>
                          {transfer.approvedAt && (
                            <div>
                              <span className="font-medium text-gray-700">Approuvé le:</span>
                              <span className="ml-2 text-gray-600">{formatDate(transfer.approvedAt)}</span>
                            </div>
                          )}
                          {transfer.approvedByName && (
                            <div>
                              <span className="font-medium text-gray-700">Approuvé par:</span>
                              <span className="ml-2 text-gray-600">{transfer.approvedByName}</span>
                            </div>
                          )}
                          {transfer.processedAt && (
                            <div>
                              <span className="font-medium text-gray-700">Traité le:</span>
                              <span className="ml-2 text-gray-600">{formatDate(transfer.processedAt)}</span>
                            </div>
                          )}
                          {transfer.processedByName && (
                            <div>
                              <span className="font-medium text-gray-700">Traité par:</span>
                              <span className="ml-2 text-gray-600">{transfer.processedByName}</span>
                            </div>
                          )}
                          {transfer.trackingNumber && (
                            <div>
                              <span className="font-medium text-gray-700">Numéro de suivi:</span>
                              <span className="ml-2 text-gray-600">{transfer.trackingNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex items-center space-x-2">
                    <button
                      onClick={() => handleViewDetails(transfer.id)}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Voir les détails"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {/* Action buttons based on status */}
                    {transfer.status === TransferStatus.Pending && (
                      <>
                        <button
                          disabled={loadingActionId === transfer.id}
                          onClick={() => openDialog('approve', transfer)}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                          title="Approuver"
                        >
                          {loadingActionId === transfer.id ? <span className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                        <button
                          disabled={loadingActionId === transfer.id}
                          onClick={() => openDialog('reject', transfer)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          title="Rejeter"
                        >
                          {loadingActionId === transfer.id ? <span className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /> : <XCircle className="h-4 w-4" />}
                        </button>
                      </>
                    )}

                    {transfer.status === TransferStatus.Approved && (
                      <button
                        disabled={loadingActionId === transfer.id}
                        onClick={() => openDialog('dispatch', transfer)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Marquer comme en transit"
                      >
                        {loadingActionId === transfer.id ? <span className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <Truck className="h-4 w-4" />}
                      </button>
                    )}

                    {transfer.status === TransferStatus.InTransit && (
                      <button
                        disabled={loadingActionId === transfer.id}
                        onClick={() => openDialog('process', transfer)}
                        className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                        title="Marquer comme terminé"
                      >
                        {loadingActionId === transfer.id ? <span className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transfer Form Modal */}
      <InterBranchTransferForm
        isOpen={showTransferForm}
        onClose={() => setShowTransferForm(false)}
        onSave={handleTransferSaved}
      />
    </div>
  );
};

export default InterBranchTransferList;