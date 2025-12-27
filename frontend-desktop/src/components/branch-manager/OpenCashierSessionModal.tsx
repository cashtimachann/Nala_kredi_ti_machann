import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography
} from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  cashier: {
    id: string;
    cashierName: string;
    htgBalance: number;
    usdBalance: number;
  } | null;
  availableBalance: { htg: number; usd: number } | null;
  onOpened?: () => void;
}

const OpenCashierSessionModal: React.FC<Props> = ({ open, onClose, cashier, availableBalance, onOpened }) => {
  const [htg, setHtg] = useState<string>('');
  const [usd, setUsd] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setHtg('');
      setUsd('');
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    setError(null);

    const reqHtg = parseFloat(htg || '0');
    const reqUsd = parseFloat(usd || '0');

    if (reqHtg < 0 || reqUsd < 0) {
      setError('Les montants doivent être positifs');
      return;
    }

    if (availableBalance) {
      if (reqHtg > availableBalance.htg) {
        setError(`Montant HTG demandé (${reqHtg}) dépasse solde disponible (${availableBalance.htg})`);
        return;
      }

      if (reqUsd > availableBalance.usd) {
        setError(`Montant USD demandé (${reqUsd}) dépasse solde disponible (${availableBalance.usd})`);
        return;
      }
    }

    if (!cashier) {
      setError('Caissier introuvable');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || (window as any).AUTH_TOKEN;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body = {
        cashierId: cashier.id,
        openingBalanceHTG: reqHtg,
        openingBalanceUSD: reqUsd
      };

      const resp = await fetch('/api/cashsession/open-for-cashier', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        setError(err?.message || `Erreur serveur (${resp.status})`);
        setLoading(false);
        return;
      }

      // success
      onClose();
      onOpened && onOpened();
    } catch (e: any) {
      setError(e?.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ouvrir session de caisse - {cashier?.cashierName}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {availableBalance && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Solde disponible succursale: HTG {availableBalance.htg.toLocaleString()} | USD ${availableBalance.usd.toLocaleString()}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Montant d'ouverture HTG"
            type="number"
            value={htg}
            onChange={(e) => setHtg(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{ inputMode: 'numeric' }}
          />

          <TextField
            fullWidth
            label="Montant d'ouverture USD"
            type="number"
            value={usd}
            onChange={(e) => setUsd(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{ inputMode: 'numeric' }}
          />

          {error && <Alert severity="error">{error}</Alert>}
          {!availableBalance && (
            <Typography variant="caption" color="text.secondary">Impossible de vérifier le solde succursale — vérifiez la connexion</Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Annuler</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          Confirmer et ouvrir
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OpenCashierSessionModal;
