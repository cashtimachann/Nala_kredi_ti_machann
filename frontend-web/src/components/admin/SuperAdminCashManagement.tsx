import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  RefreshCw, 
  Plus, 
  X, 
  DollarSign,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Eye,
  XCircle
} from 'lucide-react';
import apiService from '../../services/apiService';
import toast from 'react-hot-toast';
import { Branch } from '../../types/branch';

interface CashSession {
  id: number;
  userId: string;
  cashierName: string;
  openingBalanceHTG: number;
  openingBalanceUSD: number;
  closingBalanceHTG?: number;
  closingBalanceUSD?: number;
  sessionStart: string;
  sessionEnd?: string;
  status: string;
  notes?: string;
  transactionCount?: number;
  totalDepositHTG?: number;
  totalDepositUSD?: number;
  totalWithdrawalHTG?: number;
  totalWithdrawalUSD?: number;
  exchangeHTGIn?: number;
  exchangeHTGOut?: number;
  exchangeUSDIn?: number;
  exchangeUSDOut?: number;
  recoveriesHTG?: number;
  recoveriesUSD?: number;
  currentBalanceHTG?: number;
  currentBalanceUSD?: number;
}

interface Cashier {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  hasOpenSession: boolean;
}

interface CashManagementStats {
  depositsCount: number;
  depositsHTG: number;
  depositsUSD: number;
  withdrawalsCount: number;
  withdrawalsHTG: number;
  withdrawalsUSD: number;
  exchangeCount: number;
  exchangeHTGIn: number;
  exchangeHTGOut: number;
  exchangeUSDIn: number;
  exchangeUSDOut: number;
  recoveriesCount: number;
  recoveriesHTG: number;
  recoveriesUSD: number;
  netHTG: number;
  netUSD: number;
}

const SuperAdminCashManagement: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [activeSessions, setActiveSessions] = useState<CashSession[]>([]);
  const [availableCashiers, setAvailableCashiers] = useState<Cashier[]>([]);
  const [cashManagementStats, setCashManagementStats] = useState<CashManagementStats | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Modals
  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Form states
  const [selectedCashier, setSelectedCashier] = useState<string>('');
  const [openingBalanceHTG, setOpeningBalanceHTG] = useState<string>('');
  const [openingBalanceUSD, setOpeningBalanceUSD] = useState<string>('');
  const [closingBalanceHTG, setClosingBalanceHTG] = useState<string>('');
  const [closingBalanceUSD, setClosingBalanceUSD] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [sessionToClose, setSessionToClose] = useState<CashSession | null>(null);
  const [sessionDetails, setSessionDetails] = useState<CashSession | null>(null);

  // Load branches on mount
  useEffect(() => {
    loadBranches();
  }, []);

  // Load cash management data when branch is selected
  useEffect(() => {
    if (selectedBranchId) {
      loadCashManagementData();
    }
  }, [selectedBranchId]);

  const loadBranches = async () => {
    try {
      const data = await apiService.getAllBranches();
      setBranches(data.filter((b) => b.status === 'Active'));
      if (data.length > 0 && !selectedBranchId) {
        setSelectedBranchId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Erreur lors du chargement des succursales');
    }
  };

  const loadCashManagementData = async () => {
    if (!selectedBranchId) return;
    
    setLoading(true);
    try {
      // Load active sessions
      const sessionsData = await apiService.getActiveCashSessions(selectedBranchId);
      setActiveSessions(sessionsData);

      // Load today's summary for stats
      const summaryData = await apiService.getTodayCashSessionSummary(selectedBranchId);
      
      // Transform data to match expected format
      const transformedStats: CashManagementStats = {
        depositsCount: summaryData.TotalTransactions || 0,
        depositsHTG: summaryData.TotalDepositHTG || 0,
        depositsUSD: summaryData.TotalDepositUSD || 0,
        withdrawalsCount: summaryData.TotalTransactions || 0,
        withdrawalsHTG: summaryData.TotalWithdrawalHTG || 0,
        withdrawalsUSD: summaryData.TotalWithdrawalUSD || 0,
        exchangeCount: 0,
        exchangeHTGIn: 0,
        exchangeHTGOut: 0,
        exchangeUSDIn: 0,
        exchangeUSDOut: 0,
        recoveriesCount: 0,
        recoveriesHTG: 0,
        recoveriesUSD: 0,
        netHTG: (summaryData.TotalDepositHTG || 0) - (summaryData.TotalWithdrawalHTG || 0),
        netUSD: (summaryData.TotalDepositUSD || 0) - (summaryData.TotalWithdrawalUSD || 0)
      };
      
      setCashManagementStats(transformedStats);
    } catch (error) {
      console.error('Error loading cash management data:', error);
      toast.error('Erreur lors du chargement des données de caisse');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCashiers = async () => {
    if (!selectedBranchId) return;
    
    try {
      const data = await apiService.getAvailableCashiers(selectedBranchId);
      setAvailableCashiers(data);
    } catch (error) {
      console.error('Error loading cashiers:', error);
      toast.error('Erreur lors du chargement des caissiers');
    }
  };

  const handleOpenSessionModal = async () => {
    await loadAvailableCashiers();
    setShowOpenSessionModal(true);
    setSelectedCashier('');
    setOpeningBalanceHTG('');
    setOpeningBalanceUSD('');
  };

  const handleOpenSession = async () => {
    if (!selectedCashier) {
      toast.error('Veuillez sélectionner un caissier');
      return;
    }

    const htg = parseFloat(openingBalanceHTG) || 0;
    const usd = parseFloat(openingBalanceUSD) || 0;

    if (htg < 0 || usd < 0) {
      toast.error('Les montants doivent être positifs');
      return;
    }

    try {
      const result = await apiService.openCashSessionForCashier(selectedCashier, htg, usd);
      toast.success(`Session ouverte pour ${result.cashierName}`);
      setShowOpenSessionModal(false);
      await loadCashManagementData();
    } catch (error: any) {
      console.error('Error opening session:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de l\'ouverture de la session');
    }
  };

  const handleCloseSessionModal = (session: CashSession) => {
    setSessionToClose(session);
    setClosingBalanceHTG(session.currentBalanceHTG?.toString() || '');
    setClosingBalanceUSD(session.currentBalanceUSD?.toString() || '');
    setClosingNotes('');
    setShowCloseSessionModal(true);
  };

  const handleCloseSession = async () => {
    if (!sessionToClose) return;

    const htg = parseFloat(closingBalanceHTG) || 0;
    const usd = parseFloat(closingBalanceUSD) || 0;

    if (htg < 0 || usd < 0) {
      toast.error('Les montants doivent être positifs');
      return;
    }

    try {
      await apiService.closeCashSessionByManager(sessionToClose.id, htg, usd, closingNotes);
      toast.success('Session fermée avec succès');
      setShowCloseSessionModal(false);
      await loadCashManagementData();
    } catch (error: any) {
      console.error('Error closing session:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la fermeture de la session');
    }
  };

  const handleViewDetails = async (session: CashSession) => {
    setSessionDetails(session);
    setShowDetailsModal(true);
  };

  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-8 rounded-xl shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <DollarSign className="h-8 w-8" />
              Gestion de Caisse - SuperAdmin
            </h1>
            <p className="text-indigo-100">Contrôle total des caisses de toutes les succursales</p>
          </div>
          <button
            onClick={loadCashManagementData}
            disabled={!selectedBranchId}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Branch Selector */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sélectionner une Succursale
        </label>
        <select
          value={selectedBranchId || ''}
          onChange={(e) => setSelectedBranchId(parseInt(e.target.value))}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">-- Choisir une succursale --</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name} ({branch.code}) - {branch.department}
            </option>
          ))}
        </select>
      </div>

      {selectedBranchId && (
        <>
          {/* Stats Cards */}
          {cashManagementStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-xl text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Dépôts HTG</p>
                    <p className="text-2xl font-bold">{new Intl.NumberFormat('fr-HT').format(cashManagementStats.depositsHTG)}</p>
                    <p className="text-xs opacity-75 mt-1">{cashManagementStats.depositsCount} transactions</p>
                  </div>
                  <TrendingUp className="h-8 w-8 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-6 rounded-xl text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Dépôts USD</p>
                    <p className="text-2xl font-bold">${new Intl.NumberFormat('en-US').format(cashManagementStats.depositsUSD)}</p>
                    <p className="text-xs opacity-75 mt-1">{cashManagementStats.depositsCount} transactions</p>
                  </div>
                  <TrendingUp className="h-8 w-8 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-xl text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Retraits HTG</p>
                    <p className="text-2xl font-bold">{new Intl.NumberFormat('fr-HT').format(cashManagementStats.withdrawalsHTG)}</p>
                    <p className="text-xs opacity-75 mt-1">{cashManagementStats.withdrawalsCount} transactions</p>
                  </div>
                  <TrendingUp className="h-8 w-8 opacity-80 rotate-180" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-6 rounded-xl text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Retraits USD</p>
                    <p className="text-2xl font-bold">${new Intl.NumberFormat('en-US').format(cashManagementStats.withdrawalsUSD)}</p>
                    <p className="text-xs opacity-75 mt-1">{cashManagementStats.withdrawalsCount} transactions</p>
                  </div>
                  <TrendingUp className="h-8 w-8 opacity-80 rotate-180" />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleOpenSessionModal}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
            >
              <Plus className="h-5 w-5" />
              Ouvrir une Caisse
            </button>
          </div>

          {/* Active Sessions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-6 w-6 text-indigo-600" />
              Sessions de Caisse Actives ({activeSessions.length})
            </h2>

            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                <p className="text-gray-600 mt-2">Chargement...</p>
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucune session de caisse active pour cette succursale</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeSessions.map((session) => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{session.cashierName}</h3>
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                        Actif
                      </span>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Transactions:</span>
                        <span className="font-semibold">{session.transactionCount || 0}</span>
                      </div>
                      
                      <div className="border-t pt-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">HTG:</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Ouverture:</span>
                          <span className="font-semibold">
                            {new Intl.NumberFormat('fr-HT').format(session.openingBalanceHTG)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-bold border-t mt-1 pt-1">
                          <span>Solde actuel:</span>
                          <span>{new Intl.NumberFormat('fr-HT').format(session.currentBalanceHTG || 0)}</span>
                        </div>
                      </div>

                      <div className="border-t pt-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">USD:</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Ouverture:</span>
                          <span className="font-semibold">
                            ${new Intl.NumberFormat('en-US').format(session.openingBalanceUSD)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-bold border-t mt-1 pt-1">
                          <span>Solde actuel:</span>
                          <span>${new Intl.NumberFormat('en-US').format(session.currentBalanceUSD || 0)}</span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 pt-2 border-t">
                        Ouvert: {new Date(session.sessionStart).toLocaleString('fr-FR')}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(session)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                      >
                        <Eye className="h-4 w-4" />
                        Détails
                      </button>
                      <button
                        onClick={() => handleCloseSessionModal(session)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                      >
                        <XCircle className="h-4 w-4" />
                        Fermer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Open Session Modal */}
      {showOpenSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-t-xl">
              <h3 className="text-xl font-bold">Ouvrir une Session de Caisse</h3>
              <p className="text-sm text-green-100 mt-1">{selectedBranch?.name}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Cashier Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner un Caissier *
                </label>
                <select
                  value={selectedCashier}
                  onChange={(e) => setSelectedCashier(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">-- Choisir un caissier --</option>
                  {availableCashiers
                    .filter(c => !c.hasOpenSession)
                    .map((cashier) => (
                      <option key={cashier.id} value={cashier.id}>
                        {cashier.name}
                      </option>
                    ))}
                </select>
                {availableCashiers.filter(c => !c.hasOpenSession).length === 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    Tous les caissiers ont déjà une session ouverte
                  </p>
                )}
              </div>

              {/* Opening Balance HTG */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solde d'Ouverture HTG *
                </label>
                <input
                  type="number"
                  value={openingBalanceHTG}
                  onChange={(e) => setOpeningBalanceHTG(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Opening Balance USD */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solde d'Ouverture USD *
                </label>
                <input
                  type="number"
                  value={openingBalanceUSD}
                  onChange={(e) => setOpeningBalanceUSD(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowOpenSessionModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleOpenSession}
                  disabled={!selectedCashier}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ouvrir Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Session Modal */}
      {showCloseSessionModal && sessionToClose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-4 rounded-t-xl flex-shrink-0">
              <h3 className="text-xl font-bold">Fermer Session de Caisse</h3>
              <p className="text-sm text-red-100 mt-1">{sessionToClose.cashierName}</p>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Current Balances */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Soldes Actuels (Calculés)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-blue-600">HTG</p>
                    <p className="font-bold text-blue-900">
                      {new Intl.NumberFormat('fr-HT').format(sessionToClose.currentBalanceHTG || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">USD</p>
                    <p className="font-bold text-blue-900">
                      ${new Intl.NumberFormat('en-US').format(sessionToClose.currentBalanceUSD || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Closing Balance HTG */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solde de Fermeture HTG *
                </label>
                <input
                  type="number"
                  value={closingBalanceHTG}
                  onChange={(e) => setClosingBalanceHTG(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Closing Balance USD */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solde de Fermeture USD *
                </label>
                <input
                  type="number"
                  value={closingBalanceUSD}
                  onChange={(e) => setClosingBalanceUSD(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Observations, écarts constatés..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCloseSessionModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCloseSession}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Fermer Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && sessionDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-xl sticky top-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Détails de la Session</h3>
                  <p className="text-sm text-blue-100 mt-1">{sessionDetails.cashierName}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Session Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Informations de Session</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Session ID:</p>
                    <p className="font-semibold">{sessionDetails.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Statut:</p>
                    <p className="font-semibold text-green-600">Actif</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">Ouvert le:</p>
                    <p className="font-semibold">{new Date(sessionDetails.sessionStart).toLocaleString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Transactions:</p>
                    <p className="font-semibold">{sessionDetails.transactionCount || 0}</p>
                  </div>
                </div>
              </div>

              {/* HTG Details */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-3">Gourdes (HTG)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Solde d'ouverture:</span>
                    <span className="font-bold">{new Intl.NumberFormat('fr-HT').format(sessionDetails.openingBalanceHTG)}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>Dépôts:</span>
                    <span className="font-bold">+{new Intl.NumberFormat('fr-HT').format(sessionDetails.totalDepositHTG || 0)}</span>
                  </div>
                  <div className="flex justify-between text-red-700">
                    <span>Retraits:</span>
                    <span className="font-bold">-{new Intl.NumberFormat('fr-HT').format(sessionDetails.totalWithdrawalHTG || 0)}</span>
                  </div>
                  <div className="flex justify-between text-blue-700">
                    <span>Change (entrées):</span>
                    <span className="font-bold">+{new Intl.NumberFormat('fr-HT').format(sessionDetails.exchangeHTGIn || 0)}</span>
                  </div>
                  <div className="flex justify-between text-orange-700">
                    <span>Change (sorties):</span>
                    <span className="font-bold">-{new Intl.NumberFormat('fr-HT').format(sessionDetails.exchangeHTGOut || 0)}</span>
                  </div>
                  <div className="flex justify-between text-purple-700">
                    <span>Recouvrements:</span>
                    <span className="font-bold">+{new Intl.NumberFormat('fr-HT').format(sessionDetails.recoveriesHTG || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-green-300 font-bold text-green-900">
                    <span>Solde actuel:</span>
                    <span>{new Intl.NumberFormat('fr-HT').format(sessionDetails.currentBalanceHTG || 0)}</span>
                  </div>
                </div>
              </div>

              {/* USD Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Dollars (USD)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Solde d'ouverture:</span>
                    <span className="font-bold">${new Intl.NumberFormat('en-US').format(sessionDetails.openingBalanceUSD)}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>Dépôts:</span>
                    <span className="font-bold">+${new Intl.NumberFormat('en-US').format(sessionDetails.totalDepositUSD || 0)}</span>
                  </div>
                  <div className="flex justify-between text-red-700">
                    <span>Retraits:</span>
                    <span className="font-bold">-${new Intl.NumberFormat('en-US').format(sessionDetails.totalWithdrawalUSD || 0)}</span>
                  </div>
                  <div className="flex justify-between text-blue-700">
                    <span>Change (entrées):</span>
                    <span className="font-bold">+${new Intl.NumberFormat('en-US').format(sessionDetails.exchangeUSDIn || 0)}</span>
                  </div>
                  <div className="flex justify-between text-orange-700">
                    <span>Change (sorties):</span>
                    <span className="font-bold">-${new Intl.NumberFormat('en-US').format(sessionDetails.exchangeUSDOut || 0)}</span>
                  </div>
                  <div className="flex justify-between text-purple-700">
                    <span>Recouvrements:</span>
                    <span className="font-bold">+${new Intl.NumberFormat('en-US').format(sessionDetails.recoveriesUSD || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-300 font-bold text-blue-900">
                    <span>Solde actuel:</span>
                    <span>${new Intl.NumberFormat('en-US').format(sessionDetails.currentBalanceUSD || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {sessionDetails.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-700">{sessionDetails.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminCashManagement;
