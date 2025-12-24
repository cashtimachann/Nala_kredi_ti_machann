import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Plus,
  LogOut
} from 'lucide-react';
import apiService from '../../services/apiService';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';

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
  totalAmountHTG?: number;
  totalAmountUSD?: number;
  varianceHTG?: number;
  varianceUSD?: number;
  durationMinutes?: number;
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

interface CashManagementProps {
  branchId: number;
  cashManagementStats?: CashManagementStats;
}

const CashManagement: React.FC<CashManagementProps> = ({ branchId, cashManagementStats }) => {
  const [activeSessions, setActiveSessions] = useState<CashSession[]>([]);
  const [todaySummary, setTodaySummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
  const [availableCashiers, setAvailableCashiers] = useState<Cashier[]>([]);
  const [selectedCashier, setSelectedCashier] = useState<string>('');
  const [openingBalanceHTG, setOpeningBalanceHTG] = useState<string>('');
  const [openingBalanceUSD, setOpeningBalanceUSD] = useState<string>('');
  const [closingBalanceHTG, setClosingBalanceHTG] = useState<string>('');
  const [closingBalanceUSD, setClosingBalanceUSD] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [sessionToClose, setSessionToClose] = useState<CashSession | null>(null);

  useEffect(() => {
    loadCashManagement();
  }, [branchId]);

  const loadCashManagement = async () => {
    try {
      setLoading(true);
      
      // Load active sessions
      const active = await apiService.getActiveCashSessions(branchId);
      // Normalize session data from PascalCase to camelCase if needed
      const normalizedSessions = (active || []).map((session: any) => ({
        id: session.id ?? session.Id,
        userId: session.userId ?? session.UserId,
        cashierName: session.cashierName ?? session.CashierName,
        openingBalanceHTG: session.openingBalanceHTG ?? session.OpeningBalanceHTG,
        openingBalanceUSD: session.openingBalanceUSD ?? session.OpeningBalanceUSD,
        sessionStart: session.sessionStart ?? session.SessionStart,
        durationMinutes: session.durationMinutes ?? session.DurationMinutes,
        transactionCount: session.transactionCount ?? session.TransactionCount,
        totalDepositHTG: session.totalDepositHTG ?? session.TotalDepositHTG ?? 0,
        totalDepositUSD: session.totalDepositUSD ?? session.TotalDepositUSD ?? 0,
        totalWithdrawalHTG: session.totalWithdrawalHTG ?? session.TotalWithdrawalHTG ?? 0,
        totalWithdrawalUSD: session.totalWithdrawalUSD ?? session.TotalWithdrawalUSD ?? 0,
        exchangeHTGIn: session.exchangeHTGIn ?? session.ExchangeHTGIn ?? 0,
        exchangeHTGOut: session.exchangeHTGOut ?? session.ExchangeHTGOut ?? 0,
        exchangeUSDIn: session.exchangeUSDIn ?? session.ExchangeUSDIn ?? 0,
        exchangeUSDOut: session.exchangeUSDOut ?? session.ExchangeUSDOut ?? 0,
        recoveriesHTG: session.recoveriesHTG ?? session.RecoveriesHTG ?? 0,
        recoveriesUSD: session.recoveriesUSD ?? session.RecoveriesUSD ?? 0,
        currentBalanceHTG: session.currentBalanceHTG ?? session.CurrentBalanceHTG ?? 0,
        currentBalanceUSD: session.currentBalanceUSD ?? session.CurrentBalanceUSD ?? 0,
        status: session.status ?? session.Status
      }));
      setActiveSessions(normalizedSessions);

      // Load today's summary
      const summary = await apiService.getTodayCashSessionSummary(branchId);
      setTodaySummary(summary || null);

    } catch (error: any) {
      console.error('Error loading cash management:', error);
      toast.error('Erreur lors du chargement des données de caisse');
    } finally {
      setLoading(false);
    }
  };

  const viewSessionDetails = async (sessionId: number) => {
    try {
      const details = await apiService.getCashSessionDetails(sessionId);
      setSessionDetails(details);
      setSelectedSession(sessionId);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading session details:', error);
      toast.error('Erreur lors du chargement des détails');
    }
  };

  const loadAvailableCashiers = async () => {
    try {
      const cashiers = await apiService.getAvailableCashiers(branchId);
      setAvailableCashiers(cashiers || []);
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
      await loadCashManagement();
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
      const result = await apiService.closeCashSessionByManager(
        sessionToClose.id,
        htg,
        usd,
        closingNotes
      );
      toast.success(`Session fermée pour ${result.cashierName}`);
      setShowCloseSessionModal(false);
      setSessionToClose(null);
      await loadCashManagement();
    } catch (error: any) {
      console.error('Error closing session:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la fermeture de la session');
    }
  };

  const formatCurrency = (amount: number, currency: string = 'HTG') => {
    return new Intl.NumberFormat('fr-HT', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Summary */}
      {todaySummary && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-red-50 text-red-600 rounded-full p-3">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Gestion Caisse - Aujourd'hui</h2>
                <p className="text-sm text-gray-600">
                  {new Date(todaySummary.date).toLocaleDateString('fr-HT', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={loadCashManagement}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>
          </div>

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

          {/* Detailed Cash Management Statistics */}
          {cashManagementStats && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Statistiques Détaillées</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Deposits */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-green-700">Dépôts</h4>
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-700 mb-2">
                    {cashManagementStats.depositsCount}
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm text-green-600">
                      HTG: {formatCurrency(cashManagementStats.depositsHTG, 'HTG')}
                    </p>
                    <p className="text-sm text-green-600">
                      USD: {formatCurrency(cashManagementStats.depositsUSD, 'USD')}
                    </p>
                  </div>
                </div>

                {/* Withdrawals */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-red-700">Retraits</h4>
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-red-700 mb-2">
                    {cashManagementStats.withdrawalsCount}
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm text-red-600">
                      HTG: {formatCurrency(cashManagementStats.withdrawalsHTG, 'HTG')}
                    </p>
                    <p className="text-sm text-red-600">
                      USD: {formatCurrency(cashManagementStats.withdrawalsUSD, 'USD')}
                    </p>
                  </div>
                </div>

                {/* Exchanges */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-blue-700">Changes</h4>
                    <RefreshCw className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-700 mb-2">
                    {cashManagementStats.exchangeCount}
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      HTG In: {formatCurrency(cashManagementStats.exchangeHTGIn, 'HTG')}
                    </p>
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      HTG Out: {formatCurrency(cashManagementStats.exchangeHTGOut, 'HTG')}
                    </p>
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      USD In: {formatCurrency(cashManagementStats.exchangeUSDIn, 'USD')}
                    </p>
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      USD Out: {formatCurrency(cashManagementStats.exchangeUSDOut, 'USD')}
                    </p>
                  </div>
                </div>

                {/* Recoveries */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-purple-700">Recouvrements</h4>
                    <DollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-700 mb-2">
                    {cashManagementStats.recoveriesCount}
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm text-purple-600">
                      HTG: {formatCurrency(cashManagementStats.recoveriesHTG, 'HTG')}
                    </p>
                    <p className="text-sm text-purple-600">
                      USD: {formatCurrency(cashManagementStats.recoveriesUSD, 'USD')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Net Balances */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Bilan Net HTG
                  </h4>
                  <p className={`text-3xl font-bold ${cashManagementStats.netHTG >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(cashManagementStats.netHTG, 'HTG')}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Dépôts + Changes In + Recouvrements - Retraits - Changes Out
                  </p>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Bilan Net USD
                  </h4>
                  <p className={`text-3xl font-bold ${cashManagementStats.netUSD >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(cashManagementStats.netUSD, 'USD')}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Dépôts + Changes In + Recouvrements - Retraits - Changes Out
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Sessions Actives</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">
                    {todaySummary.activeSessions}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Sessions Fermées</p>
                  <p className="text-3xl font-bold text-green-700 mt-1">
                    {todaySummary.closedSessions}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total Sessions</p>
                  <p className="text-3xl font-bold text-purple-700 mt-1">
                    {todaySummary.totalSessions}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Transactions</p>
                  <p className="text-3xl font-bold text-orange-700 mt-1">
                    {todaySummary.totalTransactions}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* HTG Summary */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Gourdes (HTG)
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Solde Ouverture:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(todaySummary.totalOpeningBalanceHTG, 'HTG')}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Dépôts:
                  </span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(cashManagementStats?.depositsHTG ?? todaySummary.totalDepositHTG, 'HTG')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-600 flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" />
                    Retraits:
                  </span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(cashManagementStats?.withdrawalsHTG ?? todaySummary.totalWithdrawalHTG, 'HTG')}
                  </span>
                </div>
                {cashManagementStats && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-600 flex items-center gap-1">
                        <RefreshCw className="h-4 w-4" />
                        Change (In/Out):
                      </span>
                      <span className="font-semibold text-blue-600">
                        {formatCurrency(cashManagementStats.exchangeHTGIn, 'HTG')} / {formatCurrency(cashManagementStats.exchangeHTGOut, 'HTG')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-600 flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Recouvrements:
                      </span>
                      <span className="font-semibold text-purple-600">
                        {formatCurrency(cashManagementStats.recoveriesHTG, 'HTG')}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm text-gray-600">Solde Fermeture:</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(
                      todaySummary.totalOpeningBalanceHTG + (cashManagementStats?.netHTG ?? 0),
                      'HTG'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* USD Summary */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Dollars (USD)
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Solde Ouverture:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(todaySummary.totalOpeningBalanceUSD, 'USD')}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Dépôts:
                  </span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(cashManagementStats?.depositsUSD ?? todaySummary.totalDepositUSD, 'USD')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-600 flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" />
                    Retraits:
                  </span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(cashManagementStats?.withdrawalsUSD ?? todaySummary.totalWithdrawalUSD, 'USD')}
                  </span>
                </div>
                {cashManagementStats && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-600 flex items-center gap-1">
                        <RefreshCw className="h-4 w-4" />
                        Change (In/Out):
                      </span>
                      <span className="font-semibold text-blue-600">
                        {formatCurrency(cashManagementStats.exchangeUSDIn, 'USD')} / {formatCurrency(cashManagementStats.exchangeUSDOut, 'USD')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-600 flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Recouvrements:
                      </span>
                      <span className="font-semibold text-purple-600">
                        {formatCurrency(cashManagementStats.recoveriesUSD, 'USD')}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm text-gray-600">Solde Fermeture:</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(
                      todaySummary.totalOpeningBalanceUSD + (cashManagementStats?.netUSD ?? 0),
                      'USD'
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Sessions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-6 w-6 text-red-600" />
          Caisses Ouvertes ({activeSessions.length})
        </h2>

        {activeSessions.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Aucune caisse ouverte actuellement</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{session.cashierName}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Ouvert depuis: {formatTime(session.sessionStart)}
                      {session.durationMinutes && ` (${formatDuration(session.durationMinutes)})`}
                    </p>
                  </div>
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
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Dépôts:</span>
                      <span className="font-semibold">
                        +{new Intl.NumberFormat('fr-HT').format(session.totalDepositHTG || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Retraits:</span>
                      <span className="font-semibold">
                        -{new Intl.NumberFormat('fr-HT').format(session.totalWithdrawalHTG || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>Change (In/Out):</span>
                      <span className="font-semibold text-xs">
                        +{new Intl.NumberFormat('fr-HT').format(session.exchangeHTGIn || 0)} / -{new Intl.NumberFormat('fr-HT').format(session.exchangeHTGOut || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-purple-600">
                      <span>Recouvrements:</span>
                      <span className="font-semibold">
                        +{new Intl.NumberFormat('fr-HT').format(session.recoveriesHTG || 0)}
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
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Dépôts:</span>
                      <span className="font-semibold">
                        +${new Intl.NumberFormat('en-US').format(session.totalDepositUSD || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Retraits:</span>
                      <span className="font-semibold">
                        -${new Intl.NumberFormat('en-US').format(session.totalWithdrawalUSD || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>Change (In/Out):</span>
                      <span className="font-semibold text-xs">
                        +${new Intl.NumberFormat('en-US').format(session.exchangeUSDIn || 0)} / -${new Intl.NumberFormat('en-US').format(session.exchangeUSDOut || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-purple-600">
                      <span>Recouvrements:</span>
                      <span className="font-semibold">
                        +${new Intl.NumberFormat('en-US').format(session.recoveriesUSD || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t mt-1 pt-1">
                      <span>Solde actuel:</span>
                      <span>${new Intl.NumberFormat('en-US').format(session.currentBalanceUSD || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => viewSessionDetails(session.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <Eye className="h-4 w-4" />
                    Détails
                  </button>
                  <button
                    onClick={() => handleCloseSessionModal(session)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                  >
                    <LogOut className="h-4 w-4" />
                    Fermer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open Session Modal */}
      {showOpenSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-t-xl">
              <h3 className="text-xl font-bold">Ouvrir une Session de Caisse</h3>
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
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleOpenSession}
                  disabled={!selectedCashier || availableCashiers.filter(c => !c.hasOpenSession).length === 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ouvrir la Caisse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Session Modal */}
      {showCloseSessionModal && sessionToClose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
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
                  Solde de Fermeture HTG (Réel) *
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
                  Solde de Fermeture USD (Réel) *
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

              {/* Variance Display */}
              {closingBalanceHTG && closingBalanceUSD && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-900 mb-2">Écarts</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-yellow-600">HTG</p>
                      <p className={`font-bold ${
                        (parseFloat(closingBalanceHTG) - (sessionToClose.currentBalanceHTG || 0)) >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {(parseFloat(closingBalanceHTG) - (sessionToClose.currentBalanceHTG || 0)).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-yellow-600">USD</p>
                      <p className={`font-bold ${
                        (parseFloat(closingBalanceUSD) - (sessionToClose.currentBalanceUSD || 0)) >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        ${(parseFloat(closingBalanceUSD) - (sessionToClose.currentBalanceUSD || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Commentaires sur la fermeture..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCloseSessionModal(false);
                    setSessionToClose(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCloseSession}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Fermer la Caisse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {showDetailsModal && sessionDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                Détails Session - {sessionDetails.cashierName}
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSessionDetails(null);
                  setSelectedSession(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Session Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Caissier:</p>
                  <p className="font-semibold">{sessionDetails.cashierName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Succursale:</p>
                  <p className="font-semibold">{sessionDetails.branchName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Début:</p>
                  <p className="font-semibold">
                    {new Date(sessionDetails.sessionStart).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Durée:</p>
                  <p className="font-semibold">{formatDuration(sessionDetails.durationMinutes)}</p>
                </div>
              </div>

              {/* Financial Summary */}
              {sessionDetails.summary && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Résumé Financier</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">HTG</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dépôts:</span>
                          <span className="text-green-600 font-semibold">
                            {formatCurrency(sessionDetails.summary.totalDepositHTG, 'HTG')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Retraits:</span>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(sessionDetails.summary.totalWithdrawalHTG, 'HTG')}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="font-medium">Net:</span>
                          <span className={`font-bold ${sessionDetails.summary.netChangeHTG >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(sessionDetails.summary.netChangeHTG, 'HTG')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">USD</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dépôts:</span>
                          <span className="text-green-600 font-semibold">
                            {formatCurrency(sessionDetails.summary.totalDepositUSD, 'USD')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Retraits:</span>
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(sessionDetails.summary.totalWithdrawalUSD, 'USD')}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="font-medium">Net:</span>
                          <span className={`font-bold ${sessionDetails.summary.netChangeUSD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(sessionDetails.summary.netChangeUSD, 'USD')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transactions List */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Transactions ({sessionDetails.transactionCount})
                </h4>
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Heure</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sessionDetails.transactions?.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-600">
                            {formatTime(tx.createdAt)}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              tx.type === 'Deposit' ? 'bg-green-100 text-green-700' :
                              tx.type === 'Withdrawal' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {tx.customerName}
                          </td>
                          <td className="px-3 py-2 text-sm text-right font-semibold">
                            {formatCurrency(tx.amount, tx.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashManagement;
