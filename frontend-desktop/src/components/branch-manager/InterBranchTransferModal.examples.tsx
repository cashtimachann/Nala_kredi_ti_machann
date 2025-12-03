/**
 * Example Usage of InterBranchTransferModal
 * Egzanp Itilizasyon Modal Transfè Ant Siksale
 */

import React, { useState } from 'react';
import { Button, Box } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import InterBranchTransferModal from './InterBranchTransferModal';
import { TransferFormData } from '../../types/interBranchTransfer';

/**
 * Example 1: Basic usage - Create new transfer
 * Egzanp 1: Itilizasyon debaz - Kreye nouvo transfè
 */
export const BasicTransferExample: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleTransferSubmit = (data: TransferFormData) => {
    console.log('New transfer data:', data);
    
    // TODO: Send data to API
    // await apiService.createInterBranchTransfer(data);
    
    // Show success message
    alert('Transfert créé avec succès!');
  };

  return (
    <Box>
      <Button
        variant="contained"
        startIcon={<SendIcon />}
        onClick={() => setModalOpen(true)}
      >
        Nouveau Transfert
      </Button>

      <InterBranchTransferModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleTransferSubmit}
      />
    </Box>
  );
};

/**
 * Example 2: Edit existing transfer
 * Egzanp 2: Modifye transfè ki egziste
 */
export const EditTransferExample: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  
  // Example of existing transfer data
  const existingTransfer: TransferFormData = {
    toBranchId: '2',
    toBranchName: 'Cap-Haïtien',
    amount: '50000',
    currency: 'HTG',
    exchangeRate: '1',
    reason: 'Renforcement de liquidité',
    notes: 'Transfert urgent pour fin de mois'
  };

  const handleTransferUpdate = (data: TransferFormData) => {
    console.log('Updated transfer data:', data);
    
    // TODO: Send updated data to API
    // await apiService.updateInterBranchTransfer(transferId, data);
    
    alert('Transfert modifié avec succès!');
  };

  return (
    <Box>
      <Button
        variant="outlined"
        onClick={() => setModalOpen(true)}
      >
        Modifier Transfert
      </Button>

      <InterBranchTransferModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleTransferUpdate}
        isEditing={true}
        initialData={existingTransfer}
      />
    </Box>
  );
};

/**
 * Example 3: Complete integration with API calls
 * Egzanp 3: Entegrasyon konplè ak apèl API
 */
export const CompleteTransferExample: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTransferSubmit = async (data: TransferFormData) => {
    try {
      setLoading(true);
      setError(null);

      // Convert form data to API format
      const transferData = {
        toBranchId: parseInt(data.toBranchId),
        currency: data.currency,
        amount: parseFloat(data.amount),
        exchangeRate: parseFloat(data.exchangeRate),
        reason: data.reason,
        notes: data.notes
      };

      // TODO: Replace with actual API call
      // const result = await apiService.createInterBranchTransfer(transferData);
      console.log('Sending to API:', transferData);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Success notification
      alert('✅ Transfert initié avec succès!\n\n' +
            `Destination: ${data.toBranchName}\n` +
            `Montant: ${data.amount} ${data.currency}\n` +
            `Référence: #TRF-${Date.now()}`);

      setModalOpen(false);

    } catch (err: any) {
      console.error('Transfer error:', err);
      setError(err.message || 'Erreur lors de la création du transfert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Button
        variant="contained"
        color="primary"
        startIcon={<SendIcon />}
        onClick={() => setModalOpen(true)}
        disabled={loading}
      >
        {loading ? 'Traitement...' : 'Nouveau Transfert'}
      </Button>

      {error && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', color: 'error.dark', borderRadius: 1 }}>
          {error}
        </Box>
      )}

      <InterBranchTransferModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleTransferSubmit}
      />
    </Box>
  );
};

/**
 * Example 4: With validation and notifications
 * Egzanp 4: Ak validasyon ak notifikasyon
 */
export const TransferWithValidationExample: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleTransferSubmit = (data: TransferFormData) => {
    const amount = parseFloat(data.amount);
    
    // Additional validation
    if (amount > 1000000) {
      const confirmed = window.confirm(
        '⚠️ Montant très élevé!\n\n' +
        'Ce transfert nécessite une approbation spéciale.\n' +
        'Voulez-vous continuer?'
      );
      
      if (!confirmed) {
        return;
      }
    }

    // Check for weekend/holiday (example)
    const today = new Date().getDay();
    if (today === 0 || today === 6) {
      alert('ℹ️ Transfert weekend\n\n' +
            'Les transferts du weekend seront traités le prochain jour ouvrable.');
    }

    console.log('Transfer validated and submitted:', data);
    
    // TODO: Process transfer
    alert('✅ Transfert enregistré avec succès!');
    setModalOpen(false);
  };

  return (
    <Box>
      <Button
        variant="contained"
        startIcon={<SendIcon />}
        onClick={() => setModalOpen(true)}
      >
        Transfert avec Validation
      </Button>

      <InterBranchTransferModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleTransferSubmit}
      />
    </Box>
  );
};

/**
 * Example 5: Integration in a dashboard or list view
 * Egzanp 5: Entegrasyon nan yon dashboard oswa lis
 */
export const DashboardIntegrationExample: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferFormData | undefined>();
  const [isEditing, setIsEditing] = useState(false);

  const handleNewTransfer = () => {
    setSelectedTransfer(undefined);
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleEditTransfer = (transfer: TransferFormData) => {
    setSelectedTransfer(transfer);
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleTransferSubmit = (data: TransferFormData) => {
    if (isEditing) {
      console.log('Updating transfer:', data);
      // TODO: Update API call
    } else {
      console.log('Creating new transfer:', data);
      // TODO: Create API call
    }
    
    setModalOpen(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <h2>Transferts Inter-Succursales</h2>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={handleNewTransfer}
        >
          Nouveau Transfert
        </Button>
      </Box>

      {/* Example: Transfer list would go here */}
      <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
        <p>Liste des transferts...</p>
        <Button 
          size="small" 
          onClick={() => handleEditTransfer({
            toBranchId: '2',
            toBranchName: 'Cap-Haïtien',
            amount: '50000',
            currency: 'HTG',
            exchangeRate: '1',
            reason: 'Test transfer',
            notes: ''
          })}
        >
          Modifier
        </Button>
      </Box>

      <InterBranchTransferModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleTransferSubmit}
        isEditing={isEditing}
        initialData={selectedTransfer}
      />
    </Box>
  );
};

/**
 * Example 6: Using with toast notifications
 * Egzanp 6: Itilize ak notifikasyon toast
 */
export const TransferWithToastExample: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    // TODO: Integrate with your toast/notification library
    // For example: toast.success(message) or similar
    console.log(`[${type.toUpperCase()}] ${message}`);
    alert(`${type.toUpperCase()}: ${message}`);
  };

  const handleTransferSubmit = async (data: TransferFormData) => {
    try {
      showToast('Traitement du transfert en cours...', 'info');

      // TODO: API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      showToast(
        `Transfert de ${data.amount} ${data.currency} vers ${data.toBranchName} créé avec succès!`,
        'success'
      );

      setModalOpen(false);
    } catch (error) {
      showToast('Erreur lors de la création du transfert', 'error');
    }
  };

  return (
    <Box>
      <Button
        variant="contained"
        startIcon={<SendIcon />}
        onClick={() => setModalOpen(true)}
      >
        Transfert avec Toast
      </Button>

      <InterBranchTransferModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleTransferSubmit}
      />
    </Box>
  );
};

export default {
  BasicTransferExample,
  EditTransferExample,
  CompleteTransferExample,
  TransferWithValidationExample,
  DashboardIntegrationExample,
  TransferWithToastExample
};
