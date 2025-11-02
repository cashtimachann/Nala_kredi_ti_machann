import React from 'react';
import { useUIStore } from '../../stores/uiStore';

const GlobalLoadingOverlay: React.FC = () => {
  const globalLoading = useUIStore((s) => s.globalLoading);

  if (!globalLoading) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-40">
      <div className="flex flex-col items-center bg-white rounded-lg p-6 shadow-lg">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-3" />
        <p className="text-gray-700 text-sm">Chargement...</p>
      </div>
    </div>
  );
};

export default GlobalLoadingOverlay;
