import React, { useState } from 'react';
import { LoanType } from '../../types/microcredit';
import { getAllLoanTypes, getLoanTypesByCategory, LoanTypeInfo, LOAN_TYPE_INFO } from '../../utils/loanTypeHelpers';
import { Check, Info } from 'lucide-react';

interface LoanTypeSelectorProps {
  selectedType?: LoanType;
  onSelect: (loanType: LoanType) => void;
  useKreyol?: boolean;
  disabled?: boolean;
}

type ViewMode = 'grid' | 'category';

const LoanTypeSelector: React.FC<LoanTypeSelectorProps> = ({
  selectedType,
  onSelect,
  useKreyol = false,
  disabled = false
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('category');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hoveredType, setHoveredType] = useState<LoanType | null>(null);

  const allTypes = getAllLoanTypes();
  const categorizedTypes = getLoanTypesByCategory();

  const categories = [
    { id: 'all', name: useKreyol ? 'Tout Kalite' : 'Tous les types', nameKreyol: 'Tout Kalite' },
    { id: 'personal', name: useKreyol ? 'Pèsonèl' : 'Personnel', nameKreyol: 'Pèsonèl' },
    { id: 'business', name: useKreyol ? 'Biznis' : 'Affaires', nameKreyol: 'Biznis' },
    { id: 'vehicle', name: useKreyol ? 'Transpò' : 'Véhicule', nameKreyol: 'Transpò' },
    { id: 'property', name: useKreyol ? 'Pwopriyete' : 'Propriété', nameKreyol: 'Pwopriyete' },
    { id: 'education', name: useKreyol ? 'Edikasyon' : 'Éducation', nameKreyol: 'Edikasyon' }
  ];

  const getTypesToDisplay = (): LoanTypeInfo[] => {
    if (selectedCategory === 'all') {
      return allTypes;
    }
    return categorizedTypes[selectedCategory] || [];
  };

  const renderLoanTypeCard = (typeInfo: LoanTypeInfo) => {
    const isSelected = selectedType === typeInfo.type;
    const isHovered = hoveredType === typeInfo.type;
    const Icon = typeInfo.icon;

    return (
      <div
        key={typeInfo.type}
        onClick={() => !disabled && onSelect(typeInfo.type)}
        onMouseEnter={() => setHoveredType(typeInfo.type)}
        onMouseLeave={() => setHoveredType(null)}
        className={`
          relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer
          ${isSelected
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : isHovered
              ? 'border-gray-300 bg-gray-50 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{
          backgroundColor: isSelected ? typeInfo.bgColor : undefined
        }}
      >
        {/* Badge de sélection */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
            <Check className="w-4 h-4" />
          </div>
        )}

        {/* Badge de garantie requise */}
        {typeInfo.requiresCollateral && (
          <div className="absolute top-2 left-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
            {useKreyol ? 'Garanti' : 'Garantie'}
          </div>
        )}

        {/* Icône */}
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 mx-auto"
          style={{ backgroundColor: typeInfo.bgColor }}
        >
          <Icon className="w-6 h-6" style={{ color: typeInfo.color }} />
        </div>

        {/* Nom */}
        <h3 className="text-center font-semibold text-gray-900 mb-2">
          {useKreyol ? typeInfo.nameKreyol : typeInfo.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 text-center mb-3 line-clamp-2">
          {useKreyol ? typeInfo.descriptionKreyol : typeInfo.description}
        </p>

        {/* Informations clés */}
        <div className="space-y-1 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>{useKreyol ? 'Montan:' : 'Montant:'}</span>
            <span className="font-medium">
              {typeInfo.defaultMinAmount.toLocaleString()} - {typeInfo.defaultMaxAmount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{useKreyol ? 'Dire:' : 'Durée:'}</span>
            <span className="font-medium">
              {typeInfo.defaultMinDuration}-{typeInfo.defaultMaxDuration} {useKreyol ? 'mwa' : 'mois'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{useKreyol ? 'Enterè:' : 'Intérêt:'}</span>
            <span className="font-medium">
              ~{(typeInfo.defaultInterestRate * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Info détaillée au survol */}
        {isHovered && (
          <div className="absolute inset-0 bg-black bg-opacity-90 rounded-lg p-4 flex flex-col justify-center z-10 transition-opacity">
            <p className="text-white text-sm text-center">
              {useKreyol ? typeInfo.descriptionKreyol : typeInfo.description}
            </p>
            {typeInfo.requiresCollateral && (
              <p className="text-yellow-300 text-xs text-center mt-2">
                {useKreyol
                  ? '⚠️ Sa mande garanti'
                  : '⚠️ Garantie requise'}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {useKreyol ? 'Chwazi Tip Kredi' : 'Choisir le type de crédit'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {useKreyol
              ? 'Seleksyone tip kredi ki pi bon pou bezwen ou'
              : 'Sélectionnez le type de crédit qui correspond à vos besoins'}
          </p>
        </div>
      </div>

      {/* Filtres par catégorie */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${selectedCategory === category.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {useKreyol ? category.nameKreyol : category.name}
          </button>
        ))}
      </div>

      {/* Grille de types de crédit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {getTypesToDisplay().map(typeInfo => renderLoanTypeCard(typeInfo))}
      </div>

      {/* Information supplémentaire */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">
            {useKreyol ? 'Enfòmasyon enpòtan' : 'Information importante'}
          </p>
          <p>
            {useKreyol
              ? 'Kondisyon ak enterè ka varye selon monta ak dire kredi a. Yon ajan ap ede w finalizer detay yo.'
              : 'Les conditions et taux d\'intérêt peuvent varier selon le montant et la durée. Un agent vous aidera à finaliser les détails.'}
          </p>
        </div>
      </div>

      {/* Crédit sélectionné */}
      {selectedType && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <Check className="w-5 h-5" />
            <span className="font-medium">
              {useKreyol ? 'Seleksyone:' : 'Sélectionné:'}{' '}
              {useKreyol
                ? LOAN_TYPE_INFO[selectedType].nameKreyol
                : LOAN_TYPE_INFO[selectedType].name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanTypeSelector;
