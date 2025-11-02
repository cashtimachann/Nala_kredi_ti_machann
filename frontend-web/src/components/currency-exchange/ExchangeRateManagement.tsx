import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Edit, 
  Eye, 
  Search,
  Filter,
  Calendar,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { 
  CurrencyExchangeRate,
  CreateExchangeRateDto,
  UpdateExchangeRateDto,
  ExchangeRateSearchDto,
  CurrencyType,
  RateUpdateMethod,
  formatCurrencyType,
  formatRateUpdateMethod,
  formatCurrencySymbol
} from '../../types/currencyExchange';
import apiService from '../../services/apiService';
import ExchangeRateForm from './ExchangeRateForm';
import toast from 'react-hot-toast';

interface ExchangeRateManagementProps {
  branchId?: string;
}

const ExchangeRateManagement: React.FC<ExchangeRateManagementProps> = ({ branchId }) => {
  const [rates, setRates] = useState<CurrencyExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [baseCurrencyFilter, setBaseCurrencyFilter] = useState<CurrencyType | ''>('');
  const [targetCurrencyFilter, setTargetCurrencyFilter] = useState<CurrencyType | ''>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [showRateForm, setShowRateForm] = useState(false);
  const [editingRate, setEditingRate] = useState<CurrencyExchangeRate | null>(null);
  const [selectedRate, setSelectedRate] = useState<CurrencyExchangeRate | null>(null);

  useEffect(() => {
    loadExchangeRates();
  }, [baseCurrencyFilter, targetCurrencyFilter, activeFilter]);

  const loadExchangeRates = async () => {
    try {
      setLoading(true);
      // Map frontend enums to backend values
      const mapCurrencyType = (val: CurrencyType | '') => {
        if (val === '') return undefined;
        if (val === CurrencyType.HTG) return 1;
        if (val === CurrencyType.USD) return 2;
        return val;
      };
      const searchDto: ExchangeRateSearchDto = {
        baseCurrency: mapCurrencyType(baseCurrencyFilter),
        targetCurrency: mapCurrencyType(targetCurrencyFilter),
        isActive: activeFilter !== '' ? activeFilter === 'true' : undefined
      };
  const data = await apiService.getExchangeRates(searchDto);
  setRates(data);
    } catch (error) {
      console.error('Error loading exchange rates:', error);
      toast.error('Erreur lors du chargement des taux');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentRates = async () => {
    try {
      setLoading(true);
      // Use getExchangeRates with active filter as workaround for getCurrentRates type issue
      const data = await apiService.getExchangeRates({ isActive: true });
      setRates(data);
    } catch (error) {
      console.error('Error loading current rates:', error);
      toast.error('Erreur lors du chargement des taux actuels');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRate = () => {
    setEditingRate(null);
    setShowRateForm(true);
  };

  const handleEditRate = (rate: CurrencyExchangeRate) => {
    setEditingRate(rate);
    setShowRateForm(true);
  };

  const handleDeactivateRate = async (rate: CurrencyExchangeRate) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir désactiver ce taux de change?`)) {
      return;
    }

    try {
      await apiService.deactivateExchangeRate(rate.id);
      toast.success('Taux désactivé avec succès');
      loadExchangeRates();
    } catch (error) {
      console.error('Error deactivating rate:', error);
      toast.error('Erreur lors de la désactivation');
    }
  };

  const handleRateSubmit = async (rateData: CreateExchangeRateDto | UpdateExchangeRateDto) => {
    try {
      if (editingRate) {
        await apiService.updateExchangeRate(rateData as UpdateExchangeRateDto);
        toast.success('Taux modifié avec succès');
      } else {
        await apiService.createExchangeRate(rateData as CreateExchangeRateDto);
        toast.success('Taux créé avec succès');
      }
      setShowRateForm(false);
      setEditingRate(null);
      loadExchangeRates();
    } catch (error) {
      console.error('Error saving rate:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />;
  };

  const formatRate = (rate: number) => {
    return rate.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="w-8 h-8 mr-3 text-primary-600" />
            Gestion des Taux de Change
          </h2>
          <p className="text-gray-600 mt-1">
            Gérez les taux de change pour toutes les devises
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadCurrentRates}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Taux Actuels
          </button>
          <button
            onClick={handleCreateRate}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau Taux
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Base Currency Filter */}
          <select
            value={baseCurrencyFilter}
            onChange={(e) => setBaseCurrencyFilter(e.target.value as CurrencyType | '')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Devise de base</option>
            <option value={CurrencyType.HTG}>HTG - Gourde</option>
            <option value={CurrencyType.USD}>USD - Dollar US</option>
            <option value={CurrencyType.EUR}>EUR - Euro</option>
            <option value={CurrencyType.CAD}>CAD - Dollar CA</option>
            <option value={CurrencyType.DOP}>DOP - Peso DO</option>
            <option value={CurrencyType.JMD}>JMD - Dollar JM</option>
          </select>

          {/* Target Currency Filter */}
          <select
            value={targetCurrencyFilter}
            onChange={(e) => setTargetCurrencyFilter(e.target.value as CurrencyType | '')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Devise cible</option>
            <option value={CurrencyType.HTG}>HTG - Gourde</option>
            <option value={CurrencyType.USD}>USD - Dollar US</option>
            <option value={CurrencyType.EUR}>EUR - Euro</option>
            <option value={CurrencyType.CAD}>CAD - Dollar CA</option>
            <option value={CurrencyType.DOP}>DOP - Peso DO</option>
            <option value={CurrencyType.JMD}>JMD - Dollar JM</option>
          </select>

          {/* Active Filter */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Tous les statuts</option>
            <option value="true">Actifs</option>
            <option value="false">Inactifs</option>
          </select>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setBaseCurrencyFilter('');
              setTargetCurrencyFilter('');
              setActiveFilter('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Réinitialiser
          </button>

          {/* Refresh */}
          <button
            onClick={loadExchangeRates}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Exchange Rates List */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : rates.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            Aucun taux de change trouvé
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paire de devises
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taux d'achat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taux de vente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spread
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Période de validité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Méthode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rates.map((rate) => {
                  const spread = ((rate.sellingRate - rate.buyingRate) / rate.buyingRate * 100);
                  const expiringSoon = isExpiringSoon(rate.expiryDate);
                  const expired = isExpired(rate.expiryDate);
                  
                  return (
                    <tr key={rate.id} className={`hover:bg-gray-50 ${expired ? 'bg-red-50' : expiringSoon ? 'bg-yellow-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrencySymbol(rate.baseCurrency)} → {formatCurrencySymbol(rate.targetCurrency)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatCurrencyType(rate.baseCurrency)} / {formatCurrencyType(rate.targetCurrency)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          <TrendingDown className="w-4 h-4 mr-1 text-red-500" />
                          {formatRate(rate.buyingRate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                          {formatRate(rate.sellingRate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {spread.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          <div>
                            <div>{new Date(rate.effectiveDate).toLocaleDateString()}</div>
                            {rate.expiryDate && (
                              <div className={`text-xs ${expired ? 'text-red-600' : expiringSoon ? 'text-yellow-600' : 'text-gray-500'}`}>
                                → {new Date(rate.expiryDate).toLocaleDateString()}
                                {expired && ' (Expiré)'}
                                {expiringSoon && !expired && ' (Expire bientôt)'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatRateUpdateMethod(rate.updateMethod)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Par: {rate.createdByName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rate.isActive && !expired)}`}>
                          {getStatusIcon(rate.isActive && !expired)}
                          <span className="ml-1">
                            {expired ? 'Expiré' : rate.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setSelectedRate(rate)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditRate(rate)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {rate.isActive && (
                            <button
                              onClick={() => handleDeactivateRate(rate)}
                              className="text-red-600 hover:text-red-900"
                              title="Désactiver"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rate Form Modal */}
      {showRateForm && (
        <ExchangeRateForm
          rate={editingRate}
          onSubmit={handleRateSubmit}
          onCancel={() => {
            setShowRateForm(false);
            setEditingRate(null);
          }}
        />
      )}

      {/* Rate Details Modal */}
      {selectedRate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Détails du taux de change
                </h3>
                <button
                  onClick={() => setSelectedRate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Devise de base</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {formatCurrencyType(selectedRate.baseCurrency)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Devise cible</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {formatCurrencyType(selectedRate.targetCurrency)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Taux d'achat</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {formatRate(selectedRate.buyingRate)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Taux de vente</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {formatRate(selectedRate.sellingRate)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Date d'effet</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(selectedRate.effectiveDate).toLocaleString()}
                  </p>
                </div>

                {selectedRate.expiryDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date d'expiration</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {new Date(selectedRate.expiryDate).toLocaleString()}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Méthode de mise à jour</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {formatRateUpdateMethod(selectedRate.updateMethod)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Créé par</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedRate.createdByName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedRate.createdAt).toLocaleString()}
                  </p>
                </div>

                {selectedRate.notes && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedRate.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeRateManagement;