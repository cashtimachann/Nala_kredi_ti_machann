import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Alert,
  IconButton,
  Divider,
} from '@mui/material';
import {
  AccountBalance as CashIcon,
  ArrowUpward as SupplyIcon,
  ArrowDownward as CollectIcon,
  SwapHoriz as TransferIcon,
  Assessment as ReportIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Receipt as ReceiptIcon,
  CurrencyExchange as ExchangeIcon,
} from '@mui/icons-material';

interface CashBalance {
  htg: number;
  usd: number;
  htgLimit: number;
  usdLimit: number;
  lastUpdate: string;
}

interface CashierCash {
  id: string;
  cashierName: string;
  htgBalance: number;
  usdBalance: number;
  htgLimit: number;
  usdLimit: number;
  sessionStart: string;
  todayStats: {
    deposits: number;
    withdrawals: number;
    exchanges: number;
  };
}

interface ExchangeRate {
  currency: string;
  buyRate: number;
  sellRate: number;
  lastUpdate: string;
}

const CashManagementModule: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [mainCash, setMainCash] = useState<CashBalance | null>(null);
  const [cashiers, setCashiers] = useState<CashierCash[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<CashierCash | null>(null);
  const [supplyAmount, setSupplyAmount] = useState({ htg: '', usd: '' });

  useEffect(() => {
    loadCashData();
  }, []);

  const loadCashData = async () => {
    // TODO: Replace with actual API calls
    const mockMainCash: CashBalance = {
      htg: 0,
      usd: 0,
      htgLimit: 3000000,
      usdLimit: 50000,
      lastUpdate: new Date().toLocaleTimeString('fr-HT'),
    };

    const mockCashiers: CashierCash[] = [];

    const mockRates: ExchangeRate[] = [];

    setMainCash(mockMainCash);
    setCashiers(mockCashiers);
    setExchangeRates(mockRates);
  };

  const handleSupplyCashier = (cashier: CashierCash) => {
    setSelectedCashier(cashier);
    setSupplyDialogOpen(true);
  };

  const handleConfirmSupply = () => {
    if (selectedCashier) {
      // TODO: API call to supply cashier
      console.log('Supplying cashier:', selectedCashier.id, supplyAmount);
      setSupplyDialogOpen(false);
      setSupplyAmount({ htg: '', usd: '' });
      loadCashData();
    }
  };

  const getStatusColor = (balance: number, limit: number): 'success' | 'warning' | 'error' => {
    const percentage = (balance / limit) * 100;
    if (percentage >= 80) return 'warning';
    if (percentage >= 95) return 'error';
    return 'success';
  };

  const getStatusLabel = (balance: number, limit: number): string => {
    const percentage = (balance / limit) * 100;
    if (percentage >= 95) return '🔴 Critique';
    if (percentage >= 80) return '🟡 Attention';
    if (percentage < 20) return '🔵 Faible';
    return '🟢 Normal';
  };

  if (!mainCash) {
    return <Typography>Chargement...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        💰 Gestion de Caisse
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
          <Tab label="Caisse Principale" />
          <Tab label="Caisses Caissiers" />
          <Tab label="Clôture de Caisse" />
          <Tab label="Bureau de Change" />
        </Tabs>
      </Paper>

      {/* Tab 0: Main Cash */}
      {currentTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CashIcon /> 💰 Caisse Principale Succursale
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mise à jour: {mainCash.lastUpdate}
                </Typography>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" gutterBottom>HTG: {mainCash.htg.toLocaleString()} Gds</Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(mainCash.htg / mainCash.htgLimit) * 100}
                    sx={{ height: 10, borderRadius: 5, mb: 1 }}
                    color={getStatusColor(mainCash.htg, mainCash.htgLimit)}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="caption">
                      {((mainCash.htg / mainCash.htgLimit) * 100).toFixed(1)}% de limite max
                    </Typography>
                    <Typography variant="caption">
                      Limite: {mainCash.htgLimit.toLocaleString()} Gds
                    </Typography>
                  </Box>
                  <Chip 
                    label={getStatusLabel(mainCash.htg, mainCash.htgLimit)} 
                    color={getStatusColor(mainCash.htg, mainCash.htgLimit)}
                    size="small"
                  />
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" gutterBottom>USD: ${mainCash.usd.toLocaleString()}</Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(mainCash.usd / mainCash.usdLimit) * 100}
                    sx={{ height: 10, borderRadius: 5, mb: 1 }}
                    color={getStatusColor(mainCash.usd, mainCash.usdLimit)}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="caption">
                      {((mainCash.usd / mainCash.usdLimit) * 100).toFixed(1)}% de limite max
                    </Typography>
                    <Typography variant="caption">
                      Limite: ${mainCash.usdLimit.toLocaleString()}
                    </Typography>
                  </Box>
                  <Chip 
                    label={getStatusLabel(mainCash.usd, mainCash.usdLimit)} 
                    color={getStatusColor(mainCash.usd, mainCash.usdLimit)}
                    size="small"
                  />
                </Box>

                {((mainCash.usd / mainCash.usdLimit) * 100) >= 90 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    ⚠️ Caisse USD proche de la limite - Action recommandée: Demander transfert au siège
                  </Alert>
                )}

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                  Seuils d'Alerte
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip label="🔴 Critique: > 95%" color="error" variant="outlined" />
                  <Chip label="🟡 Attention: 80-95%" color="warning" variant="outlined" />
                  <Chip label="🟢 Normal: < 80%" color="success" variant="outlined" />
                  <Chip label="🔵 Minimum: < 20%" color="info" variant="outlined" />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Opérations Disponibles
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<SupplyIcon />}
                      sx={{ height: 80, flexDirection: 'column' }}
                    >
                      <Typography variant="body2">Approvisionnement</Typography>
                      <Typography variant="caption">Caisse Caissier</Typography>
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<CollectIcon />}
                      sx={{ height: 80, flexDirection: 'column' }}
                    >
                      <Typography variant="body2">Récupération</Typography>
                      <Typography variant="caption">Caisse Caissier</Typography>
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<TransferIcon />}
                      sx={{ height: 80, flexDirection: 'column' }}
                    >
                      <Typography variant="body2">Transfert</Typography>
                      <Typography variant="caption">Inter-Caisses</Typography>
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<ReportIcon />}
                      sx={{ height: 80, flexDirection: 'column' }}
                    >
                      <Typography variant="body2">Rapport</Typography>
                      <Typography variant="caption">Mouvements</Typography>
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Cashier Cash */}
      {currentTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Vue d'Ensemble Caisses Individuelles
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Caissier</TableCell>
                        <TableCell>HTG</TableCell>
                        <TableCell>USD</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Transactions</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cashiers.map((cashier) => (
                        <TableRow key={cashier.id}>
                          <TableCell>
                            <Typography fontWeight="bold">{cashier.cashierName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Session: {cashier.sessionStart}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography>{cashier.htgBalance.toLocaleString()} Gds</Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={(cashier.htgBalance / cashier.htgLimit) * 100}
                              sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                              color={getStatusColor(cashier.htgBalance, cashier.htgLimit)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography>${cashier.usdBalance.toLocaleString()}</Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={(cashier.usdBalance / cashier.usdLimit) * 100}
                              sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                              color={getStatusColor(cashier.usdBalance, cashier.usdLimit)}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={getStatusLabel(cashier.htgBalance, cashier.htgLimit)} 
                              size="small"
                              color={getStatusColor(cashier.htgBalance, cashier.htgLimit)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" display="block">
                              Dépôts: {cashier.todayStats.deposits}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Retraits: {cashier.todayStats.withdrawals}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Changes: {cashier.todayStats.exchanges}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="small" 
                              variant="outlined"
                              onClick={() => handleSupplyCashier(cashier)}
                            >
                              Approvisionner
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="h6">
                    Total Caisses: {cashiers.reduce((sum, c) => sum + c.htgBalance, 0).toLocaleString()} Gds | ${cashiers.reduce((sum, c) => sum + c.usdBalance, 0).toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Cash Closing */}
      {currentTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🔐 Clôture de Caisse Journalière
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Date: {new Date().toLocaleDateString('fr-HT')}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  ÉTAPE 1: Récupération des Caisses Individuelles
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Caissier</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Marie Laurent</TableCell>
                        <TableCell><Chip label="✅ Fermée" color="success" size="small" /></TableCell>
                        <TableCell><Button size="small">Voir Rapport</Button></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Jean Pierre</TableCell>
                        <TableCell><Chip label="✅ Fermée" color="success" size="small" /></TableCell>
                        <TableCell><Button size="small">Voir Rapport</Button></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Sophie Michel</TableCell>
                        <TableCell><Chip label="⏳ En cours" color="warning" size="small" /></TableCell>
                        <TableCell><Button size="small" variant="outlined">Relancer</Button></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Pierre Dubois</TableCell>
                        <TableCell><Chip label="❌ Ouverte" color="error" size="small" /></TableCell>
                        <TableCell><Button size="small" variant="outlined" color="error">Forcer</Button></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  ÉTAPE 2: Consolidation Succursale
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary">Solde Théorique HTG</Typography>
                      <Typography variant="h6">2,498,500 Gds</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary">Solde Réel HTG</Typography>
                      <Typography variant="h6">2,500,000 Gds</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#e8f5e9' }}>
                      <Typography variant="body2" color="text.secondary">Écart HTG</Typography>
                      <Typography variant="h6" color="success.main">+1,500 Gds ✅</Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Alert severity="success" sx={{ mb: 3 }}>
                  🟢 Écarts dans les normes (Seuil tolérance: ±500 Gds / ±$10)
                </Alert>

                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  ÉTAPE 3: Validation Rapports Caissiers
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <Chip label="Marie L.: ✅ Approuvé (écart: +50 Gds)" color="success" sx={{ m: 0.5 }} />
                  <Chip label="Jean P.: ✅ Approuvé (écart: 0)" color="success" sx={{ m: 0.5 }} />
                  <Chip label="Sophie M.: ✅ Approuvé (écart: -25 Gds)" color="success" sx={{ m: 0.5 }} />
                  <Chip label="Pierre D.: ⚠️ Écart -750 Gds" color="warning" sx={{ m: 0.5 }} />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="contained" startIcon={<ReceiptIcon />}>
                    📄 Générer Rapport Final
                  </Button>
                  <Button variant="outlined" startIcon={<CheckIcon />}>
                    💾 Archiver Journée
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Bureau de Change */}
      {currentTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ExchangeIcon /> 💱 Taux de Change du Jour
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Dernière mise à jour: {new Date().toLocaleTimeString('fr-HT')}
                </Typography>

                <Box sx={{ mt: 3 }}>
                  {exchangeRates.map((rate) => (
                    <Paper key={rate.currency} variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {rate.currency} → HTG
                      </Typography>
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Achat</Typography>
                          <Typography variant="h6">{rate.buyRate} Gds</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Vente</Typography>
                          <Typography variant="h6">{rate.sellRate} Gds</Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Box>

                <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                  ✏️ Modifier Taux (Si autorisé)
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Stock Devises
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Devise</TableCell>
                        <TableCell>Stock</TableCell>
                        <TableCell>Limite</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>USD</TableCell>
                        <TableCell>$45,000</TableCell>
                        <TableCell>$50,000</TableCell>
                        <TableCell><Chip label="🟡 90%" color="warning" size="small" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>EUR</TableCell>
                        <TableCell>€5,200</TableCell>
                        <TableCell>€10,000</TableCell>
                        <TableCell><Chip label="🟢 52%" color="success" size="small" /></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>Transactions du Jour</Typography>
                <Typography variant="body2">Total changé: $2,300 | Marge: 3,220 Gds</Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>Limites Quotidiennes</Typography>
                <Typography variant="body2" gutterBottom>
                  Par client: $1,000 / transaction | Succursale: $10,000 / jour
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={23} 
                  sx={{ height: 10, borderRadius: 5 }}
                />
                <Typography variant="caption">Utilisé: $2,300 (23%)</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Supply Cashier Dialog */}
      <Dialog open={supplyDialogOpen} onClose={() => setSupplyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Approvisionnement Caisse - {selectedCashier?.cashierName}
        </DialogTitle>
        <DialogContent>
          {selectedCashier && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Solde actuel: {selectedCashier.htgBalance.toLocaleString()} Gds | ${selectedCashier.usdBalance.toLocaleString()}
                <br />
                Limite autorisée: {selectedCashier.htgLimit.toLocaleString()} Gds | ${selectedCashier.usdLimit.toLocaleString()}
              </Alert>

              <TextField
                fullWidth
                label="Montant HTG"
                type="number"
                value={supplyAmount.htg}
                onChange={(e) => setSupplyAmount({ ...supplyAmount, htg: e.target.value })}
                sx={{ mb: 2 }}
                InputProps={{
                  endAdornment: <Typography>Gds</Typography>
                }}
              />

              <TextField
                fullWidth
                label="Montant USD"
                type="number"
                value={supplyAmount.usd}
                onChange={(e) => setSupplyAmount({ ...supplyAmount, usd: e.target.value })}
                InputProps={{
                  startAdornment: <Typography>$</Typography>
                }}
              />

              <Alert severity="warning" sx={{ mt: 2 }}>
                ⚠️ Signature électronique requise pour valider le transfert
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplyDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleConfirmSupply}>
            ✅ Valider Transfert
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CashManagementModule;
