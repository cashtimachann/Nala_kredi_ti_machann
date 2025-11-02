import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Action {
  label: string;
  icon: LucideIcon;
  color: 'success' | 'warning' | 'danger' | 'primary' | 'secondary';
  onClick: () => void;
}

interface QuickActionsProps {
  actions: Action[];
}

const colorClasses = {
  success: 'bg-green-600 hover:bg-green-700 text-white',
  warning: 'bg-orange-600 hover:bg-orange-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
};

const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
      <div className="space-y-3">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all duration-200 ${colorClasses[action.color]}`}
          >
            <action.icon className="w-5 h-5 mr-2" />
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;