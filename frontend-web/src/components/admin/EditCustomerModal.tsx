import React, { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import ClientEditForm from './ClientEditForm';
import savingsCustomerService from '../../services/savingsCustomerService';

interface Props {
  customer: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EditCustomerModal: React.FC<Props> = ({ customer, isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      // ClientEditForm already prepares an update-shaped payload.
      await savingsCustomerService.updateCustomer(customer.id || customer.Id, data);
      toast.success('Client modifié avec succès');
      onClose();
      await onSuccess();
    } catch (err: any) {
      console.error('Error updating customer:', err);
      toast.error(err?.response?.data?.message || 'Erreur lors de la modification');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">Modifier Client</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">×</button>
        </div>

        <ClientEditForm
          customer={customer}
          onSubmit={async (formData: any) => {
            await handleSubmit(formData);
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
};

export default EditCustomerModal;
