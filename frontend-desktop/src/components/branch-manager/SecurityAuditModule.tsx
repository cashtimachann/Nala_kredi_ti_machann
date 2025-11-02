import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  Button,
  Alert,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Lock as LockIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  status: 'success' | 'failed' | 'warning';
}

const SecurityAuditModule: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const auditLogs: AuditLog[] = [
    {
      id: '1',
      timestamp: '2025-10-18 14:25:00',
      user: 'Chef Succursale',
      action: 'Validation crédit 75K',
      details: 'Crédit #4521 - Pierre Louis',
      status: 'success',
    },
    {
      id: '2',
      timestamp: '2025-10-18 12:30:00',
      user: 'Chef Succursale',
      action: 'Modification taux change',
      details: 'USD: 137.50 → 138.00',
      status: 'success',
    },
    {
      id: '3',
      timestamp: '2025-10-18 10:15:00',
      user: 'Marie Laurent',
      action: 'Annulation transaction',
      details: 'Transaction #7841',
      status: 'success',
    },
    {
      id: '4',
      timestamp: '2025-10-18 09:45:00',
      user: 'Chef Succursale',
      action: 'Déblocage compte',
      details: 'Compte #ACC-1234',
      status: 'success',
    },
    {
      id: '5',
      timestamp: '2025-10-18 08:30:00',
      user: 'Jean Pierre',
      action: 'Tentative accès admin',
      details: 'Accès refusé - Permissions insuffisantes',
      status: 'failed',
    },
  ];

  const systemStatus = {
    lastBackup: '2025-10-18 14:25:00',
    databaseStatus: 'healthy',
    apiStatus: 'operational',
    cashierSessions: 4,
    activeSessions: 6,
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'success':
        return <Chip label="✅ Succès" color="success" size="small" />;
      case 'failed':
        return <Chip label="❌ Échec" color="error" size="small" />;
      case 'warning':
        return <Chip label="⚠️ Avertissement" color="warning" size="small" />;
      default:
        return null;
    }
  };

  const filteredLogs = auditLogs.filter(log =>
    log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        🔐 Sécurité et Audit
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
          <Tab label="📜 Journal d'Audit" />
          <Tab label="🔒 Sécurité" />
          <Tab label="⚙️ Configuration" />
        </Tabs>
      </Paper>

      {/* Tab 0: Audit Logs */}
      {currentTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">🔐 Journal de Sécurité et Audit</Typography>
                  <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                    Exporter
                  </Button>
                </Box>

                <TextField
                  fullWidth
                  size="small"
                  placeholder="Rechercher dans les logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  sx={{ mb: 3 }}
                />

                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Opérations Sensibles (Dernières 24h)
                </Typography>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Heure</TableCell>
                        <TableCell>Utilisateur</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Détails</TableCell>
                        <TableCell>Résultat</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{new Date(log.timestamp).toLocaleTimeString('fr-HT')}</TableCell>
                          <TableCell>{log.user}</TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>{log.details}</TableCell>
                          <TableCell>{getStatusChip(log.status)}</TableCell>
                          <TableCell>
                            <IconButton size="small">
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Security */}
      {currentTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🚨 Tentatives d'Accès Non Autorisé
                </Typography>

                <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2 }}>
                  Aucune tentative détectée aujourd'hui ✅
                </Alert>

                <Typography variant="body2" color="text.secondary">
                  Dernière vérification: {new Date().toLocaleTimeString('fr-HT')}
                </Typography>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>Paramètres de Sécurité</Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      ✅ Authentification à deux facteurs: Activée
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      ✅ Verrouillage automatique: 15 minutes
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      ✅ Complexité mot de passe: Forte
                    </Typography>
                    <Typography variant="body2">
                      ✅ Expiration session: 8 heures
                    </Typography>
                  </Paper>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🔐 Sessions Actives
                </Typography>

                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Total Sessions</Typography>
                  <Typography variant="h4">{systemStatus.activeSessions}</Typography>
                </Paper>

                <Typography variant="subtitle2" gutterBottom>Détails par Type</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Chip label={`Caissiers: ${systemStatus.cashierSessions}`} color="primary" />
                  <Chip label="Admin: 1" color="success" />
                  <Chip label="Agent Crédit: 1" color="info" />
                </Box>

                <Button variant="outlined" fullWidth sx={{ mt: 3 }}>
                  Voir Toutes les Sessions
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 Modifications Système
                </Typography>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Heure</TableCell>
                        <TableCell>Modification</TableCell>
                        <TableCell>Par</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>13:45</TableCell>
                        <TableCell>Ajout utilisateur "Pierre D."</TableCell>
                        <TableCell>Chef Succursale</TableCell>
                        <TableCell><Chip label="✅" color="success" size="small" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>09:30</TableCell>
                        <TableCell>Modification limite caisse</TableCell>
                        <TableCell>Chef Succursale</TableCell>
                        <TableCell><Chip label="✅" color="success" size="small" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>08:00</TableCell>
                        <TableCell>Ouverture session journalière</TableCell>
                        <TableCell>Système</TableCell>
                        <TableCell><Chip label="✅" color="success" size="small" /></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ⚠️ Alertes Sécurité
                </Typography>
                <Alert severity="success" icon={<CheckIcon />}>
                  🟢 Aucune alerte active - Tous les systèmes opérationnels
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Configuration */}
      {currentTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  💾 Sauvegarde et Backup
                </Typography>

                <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#e3f2fd' }}>
                  <Typography variant="body2" color="text.secondary">Dernier Backup</Typography>
                  <Typography variant="h6">{systemStatus.lastBackup}</Typography>
                  <Chip label="✅ Succès" color="success" size="small" sx={{ mt: 1 }} />
                </Paper>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom><strong>Fréquence:</strong> Toutes les 2 heures</Typography>
                  <Typography variant="body2" gutterBottom><strong>Emplacement:</strong> D:\Backups\NalaCredit</Typography>
                  <Typography variant="body2" gutterBottom><strong>Rétention:</strong> 30 jours</Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="outlined" fullWidth startIcon={<DownloadIcon />}>
                    Backup Manuel
                  </Button>
                  <Button variant="outlined" fullWidth>
                    Configuration
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 Statut Système
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Base de Données</Typography>
                      <Chip label="🟢 Opérationnelle" color="success" size="small" />
                    </Box>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">API Backend</Typography>
                      <Chip label="🟢 Opérationnelle" color="success" size="small" />
                    </Box>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Connexion Réseau</Typography>
                      <Chip label="🟢 Stable" color="success" size="small" />
                    </Box>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Imprimantes</Typography>
                      <Chip label="🟢 En ligne (3/3)" color="success" size="small" />
                    </Box>
                  </Paper>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🔔 Notifications
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Email Chef Succursale</Typography>
                      <Chip label="✅ Activé" color="success" size="small" />
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        chef.pap@nalacredit.ht
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>SMS Alertes</Typography>
                      <Chip label="✅ Activé" color="success" size="small" />
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        +509 3XXX XXXX
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom">Notifications Push</Typography>
                      <Chip label="✅ Activé" color="success" size="small" />
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Application Desktop
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Button variant="outlined" sx={{ mt: 2 }}>
                  ⚙️ Configurer Notifications
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default SecurityAuditModule;
