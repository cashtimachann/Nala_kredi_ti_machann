import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Grid,
  Alert,
  Typography,
  MenuItem,
  InputAdornment,
  Divider,
  Chip,
  Paper,
} from '@mui/material';
import {
  SwapHoriz as TransferIcon,
  Building as BuildingIcon,
  AttachMoney as MoneyIcon,
  Description as DescriptionIcon,
  Calculate as CalculateIcon,
  Warning as WarningIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import {
  Branch,
  TransferFormData,
  Currency,
  formatCurrency,
  calculateConvertedAmount,
  validateTransferAmount
} from '../../types/interBranchTransfer';

interface InterBranchTransferModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TransferFormData) => void;
  isEditing?: boolean;
  initialData?: TransferFormData;
}

const InterBranchTransferModal: React.FC<InterBranchTransferModalProps> = ({
  open,
  onClose,
  onSubmit,
  isEditing = false,
  initialData,
}) => {
  const [formData, setFormData] = useState<TransferFormData>({
    toBranchId: '',
    toBranchName: '',
    amount: '',
    currency: Currency.HTG,
    exchangeRate: '1',
    reason: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TransferFormData, string>>>({});
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0);
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([
    { id: 1, name: 'Port-au-Prince (Siège)', code: 'PAP-001', commune: 'Port-au-Prince', department: 'Ouest' },
    { id: 2, name: 'Cap-Haïtien', code: 'CAP-002', commune: 'Cap-Haïtien', department: 'Nord' },
    { id: 3, name: 'Gonaïves', code: 'GON-003', commune: 'Gonaïves', department: 'Artibonite' },
    { id: 4, name: 'Saint-Marc', code: 'STM-004', commune: 'Saint-Marc', department: 'Artibonite' },
    { id: 5, name: 'Jacmel', code: 'JAC-005', commune: 'Jacmel', department: 'Sud-Est' },
    { id: 6, name: 'Les Cayes', code: 'CAY-006', commune: 'Les Cayes', department: 'Sud' },
  ]);

  useEffect(() => {
    if (open) {
      if (initialData && isEditing) {
        setFormData(initialData);
      } else {
        resetForm();
      }
      loadBranches();
    }
  }, [open, initialData, isEditing]);

  useEffect(() => {
    const amount = parseFloat(formData.amount) || 0;
    const exchangeRate = parseFloat(formData.exchangeRate) || 1;
    setCalculatedAmount(amount * exchangeRate);
  }, [formData.amount, formData.exchangeRate]);

  const loadBranches = async () => {
    // TODO: Replace with actual API call
    // const branches = await apiService.getAllBranches();
    // setAvailableBranches(branches);
  };

  const resetForm = () => {
    setFormData({
      toBranchId: '',
      toBranchName: '',
      amount: '',
      currency: Currency.HTG,
      exchangeRate: '1',
      reason: '',
      notes: '',
    });
    setErrors({});
    setCalculatedAmount(0);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TransferFormData, string>> = {};

    if (!formData.toBranchId) {
      newErrors.toBranchId = 'Succursale de destination requise';
    }

    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Montant invalide';
    }

    if (!formData.reason || formData.reason.trim().length < 5) {
      newErrors.reason = 'Motif requis (minimum 5 caractères)';
    }

    const exchangeRate = parseFloat(formData.exchangeRate);
    if (!formData.exchangeRate || isNaN(exchangeRate) || exchangeRate <= 0) {
      newErrors.exchangeRate = 'Taux de change invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
      handleClose();
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleBranchChange = (branchId: string) => {
    const branch = availableBranches.find((b: Branch) => b.id.toString() === branchId);
    setFormData({
      ...formData,
      toBranchId: branchId,
      toBranchName: branch?.name || '',
    });
  };

  const formatCurrencyDisplay = (amount: number, currencyType: string) => {
    const symbol = currencyType === Currency.HTG ? 'Gds' : '$';
    return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
  };

  const isHighAmount = parseFloat(formData.amount) > 100000;
  const isDisabled = !formData.toBranchId || !formData.amount || !formData.reason;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TransferIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" component="span">
            {isEditing ? 'Modifier le Transfert' : 'Nouveau Transfert Inter-Succursales'}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Transférer des fonds entre succursales de manière sécurisée
        </Typography>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Succursale de Destination */}
          <TextField
            fullWidth
            select
            label="Succursale de Destination"
            value={formData.toBranchId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleBranchChange(e.target.value)}
            error={!!errors.toBranchId}
            helperText={errors.toBranchId}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <BuildingIcon />
                </InputAdornment>
              ),
            }}
          >
            <MenuItem value="">
              <em>Sélectionnez une succursale</em>
            </MenuItem>
            {availableBranches.map((branch: Branch) => (
              <MenuItem key={branch.id} value={branch.id.toString()}>
                <Box>
                  <Typography variant="body1">{branch.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {branch.commune}, {branch.department} • Code: {branch.code}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>

          {/* Devise et Montant */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                label="Devise"
                value={formData.currency}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, currency: e.target.value as Currency })}
                required
              >
                <MenuItem value="HTG">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="HTG" size="small" color="primary" />
                    <Typography variant="body2">Gourdes</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="USD">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="USD" size="small" color="success" />
                    <Typography variant="body2">Dollars US</Typography>
                  </Box>
                </MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Montant"
                type="number"
                value={formData.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount: e.target.value })}
                error={!!errors.amount}
                helperText={errors.amount}
                required
                inputProps={{ min: 0, step: '0.01' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Chip label={formData.currency} size="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          {/* Taux de Change */}
          <TextField
            fullWidth
            label="Taux de Change"
            type="number"
            value={formData.exchangeRate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, exchangeRate: e.target.value })}
            error={!!errors.exchangeRate}
            helperText={errors.exchangeRate || 'Utiliser 1 si pas de conversion'}
            inputProps={{ min: 0, step: '0.0001' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalculateIcon />
                </InputAdornment>
              ),
            }}
          />

          {/* Montant Converti */}
          {parseFloat(formData.exchangeRate) !== 1 && calculatedAmount > 0 && (
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
              <Typography variant="body2" color="info.dark" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalculateIcon fontSize="small" />
                <strong>Montant converti:</strong> {formatCurrencyDisplay(calculatedAmount, formData.currency)}
              </Typography>
            </Paper>
          )}

          {/* Motif du Transfert */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Motif du Transfert"
            value={formData.reason}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, reason: e.target.value })}
            error={!!errors.reason}
            helperText={errors.reason || 'Expliquez la raison de ce transfert'}
            required
            placeholder="Ex: Renforcement de liquidité pour fin de mois"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                  <DescriptionIcon />
                </InputAdornment>
              ),
            }}
          />

          {/* Notes Additionnelles */}
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Notes Additionnelles (Optionnel)"
            value={formData.notes}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Informations complémentaires..."
          />

          {/* Alertes */}
          {isHighAmount && (
            <Alert severity="warning" icon={<WarningIcon />}>
              <Typography variant="body2" fontWeight="medium">
                Montant élevé détecté (&gt; 100,000 Gds)
              </Typography>
              <Typography variant="caption">
                Une validation du Directeur Régional sera requise avant l'exécution
              </Typography>
            </Alert>
          )}

          {formData.toBranchId && formData.amount && (
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
              <Typography variant="subtitle2" color="success.dark" gutterBottom>
                📋 Résumé du Transfert
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Destination:</strong> {formData.toBranchName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Montant:</strong> {formatCurrencyDisplay(parseFloat(formData.amount) || 0, formData.currency)}
                </Typography>
                {parseFloat(formData.exchangeRate) !== 1 && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Montant converti:</strong> {formatCurrencyDisplay(calculatedAmount, formData.currency)}
                  </Typography>
                )}
              </Box>
            </Paper>
          )}
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit">
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={isDisabled}
          startIcon={<SendIcon />}
        >
          {isEditing ? 'Modifier le Transfert' : 'Initier le Transfert'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InterBranchTransferModal;
