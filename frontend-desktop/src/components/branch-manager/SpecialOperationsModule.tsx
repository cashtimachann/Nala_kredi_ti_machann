import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  SwapHoriz as TransferIcon,
  AttachMoney as MoneyIcon,
  Lock as VaultIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Send as SendIcon,
} from '@mui/icons-material';

const SpecialOperationsModule: React.FC = () => {
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    toBranch: '',
    amount: '',
    currency: 'HTG',
    reason: '',
  });

  const handleTransfer = () => {
    // TODO: API call to process transfer
    console.log('Processing transfer:', transferData);
    setTransferDialogOpen(false);
    setTransferData({ toBranch: '', amount: '', currency: 'HTG', reason: '' });
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        🏦 Opérations Spéciales
      </Typography>

      <Grid container spacing={3}>
        {/* Inter-Branch Transfers */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TransferIcon /> 🔄 Transferts Inter-Succursales
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Transfert de fonds entre succursales
              </Typography>

              <List>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Envoi vers autre succursale" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Réception depuis autre succursale" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText primary="Suivi en temps réel" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><WarningIcon color="warning" /></ListItemIcon>
                  <ListItemText 
                    primary="Validation requise (> 100,000 Gds)" 
                    secondary="Nécessite approbation niveau supérieur"
                  />
                </ListItem>
              </List>

              <Button
                variant="contained"
                fullWidth
                startIcon={<SendIcon />}
                onClick={() => setTransferDialogOpen(true)}
                sx={{ mt: 2 }}
              >
                Nouveau Transfert
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Large Transfers */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MoneyIcon /> 💼 Virements Importants
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Opérations de montants élevés
              </Typography>

              <List>
                <ListItem>
                  <ListItemIcon><WarningIcon color="warning" /></ListItemIcon>
                  <ListItemText 
                    primary="Montant > 500,000 Gds"
                    secondary="Vérification renforcée obligatoire"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="info" /></ListItemIcon>
                  <ListItemText primary="Validation double requise" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="info" /></ListItemIcon>
                  <ListItemText primary="Traçabilité complète" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="info" /></ListItemIcon>
                  <ListItemText primary="Notification automatique siège" />
                </ListItem>
              </List>

              <Alert severity="info" sx={{ mt: 2 }}>
                Aucun virement important en attente
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Exceptional Operations */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚡ Opérations Exceptionnelles
              </Typography>
              
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Déblocage Compte Urgent</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Réactivation rapide d'un compte bloqué
                </Typography>
                <Button variant="outlined" size="small" fullWidth>
                  Débloquer un Compte
                </Button>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Restructuration Crédit</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Modification échéancier ou conditions
                </Typography>
                <Button variant="outlined" size="small" fullWidth>
                  Restructurer
                </Button>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Compensation Erreurs</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Correction d'erreurs comptables
                </Typography>
                <Button variant="outlined" size="small" fullWidth>
                  Compenser
                </Button>
              </Paper>

              <Alert severity="warning" icon={<WarningIcon />}>
                Justification obligatoire pour toute opération exceptionnelle
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Vault Management */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VaultIcon /> 🔒 Gestion Coffre-Fort
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
                <Typography variant="subtitle2" gutterBottom>Statut Coffre</Typography>
                <Chip label="🔒 Fermé" color="success" />
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Dernière ouverture: Aujourd'hui 08:00
                </Typography>
              </Paper>

              <List dense>
                <ListItem>
                  <ListItemIcon><CheckIcon color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="Ouverture/Fermeture"
                    secondary="Accès double clé requis"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="Inventaire Contenu"
                    secondary="Journalier obligatoire"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="Log Automatique"
                    secondary="Traçabilité complète"
                  />
                </ListItem>
              </List>

              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button variant="outlined" size="small" fullWidth>
                  Ouvrir Coffre
                </Button>
                <Button variant="outlined" size="small" fullWidth>
                  Inventaire
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Special Requests */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Demandes Spéciales en Attente
              </Typography>

              <Alert severity="info">
                Aucune demande spéciale en attente de traitement
              </Alert>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>Types de demandes:</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  <Chip label="Augmentation limites" variant="outlined" size="small" />
                  <Chip label="Approbation siège" variant="outlined" size="small" />
                  <Chip label="Modifications exceptionnelles" variant="outlined" size="small" />
                  <Chip label="Opérations hors limites" variant="outlined" size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          🔄 Nouveau Transfert Inter-Succursale
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              select
              label="Succursale Destinataire"
              value={transferData.toBranch}
              onChange={(e) => setTransferData({ ...transferData, toBranch: e.target.value })}
              sx={{ mb: 2 }}
              SelectProps={{ native: true }}
            >
              <option value="">Sélectionnez...</option>
              <option value="cap-haitien">Cap-Haïtien</option>
              <option value="gonaives">Gonaïves</option>
              <option value="saint-marc">Saint-Marc</option>
              <option value="jacmel">Jacmel</option>
            </TextField>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={8}>
                <TextField
                  fullWidth
                  label="Montant"
                  type="number"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  select
                  label="Devise"
                  value={transferData.currency}
                  onChange={(e) => setTransferData({ ...transferData, currency: e.target.value })}
                  SelectProps={{ native: true }}
                >
                  <option value="HTG">HTG</option>
                  <option value="USD">USD</option>
                </TextField>
              </Grid>
            </Grid>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Motif du Transfert"
              value={transferData.reason}
              onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
              sx={{ mb: 2 }}
            />

            {Number(transferData.amount) > 100000 && (
              <Alert severity="warning">
                ⚠️ Montant élevé - Une validation du Directeur Régional sera requise
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)}>Annuler</Button>
          <Button 
            variant="contained" 
            onClick={handleTransfer}
            disabled={!transferData.toBranch || !transferData.amount || !transferData.reason}
          >
            Initier Transfert
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SpecialOperationsModule;
