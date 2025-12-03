import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
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
import InterBranchTransferModal from './InterBranchTransferModal';

const SpecialOperationsModule: React.FC = () => {
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  const handleTransferSubmit = (transferData: any) => {
    // TODO: API call to process transfer
    console.log('Processing transfer:', transferData);
    // The modal will close itself after submission
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

      {/* Transfer Modal */}
      <InterBranchTransferModal
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
        onSubmit={handleTransferSubmit}
      />
    </Box>
  );
};

export default SpecialOperationsModule;
