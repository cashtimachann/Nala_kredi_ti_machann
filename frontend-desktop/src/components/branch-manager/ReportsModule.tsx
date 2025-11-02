import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Email as EmailIcon,
  Print as PrintIcon,
  FileDownload as DownloadIcon,
  TrendingUp as TrendingIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ReportsModule: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const dailyData = {
    date: new Date().toLocaleDateString('fr-HT'),
    cash: {
      opening: { htg: 2200000, usd: 42000 },
      incoming: { htg: 735000, usd: 5300 },
      outgoing: { htg: 542000, usd: 2300 },
      closing: { htg: 2393000, usd: 45000 },
      variance: { htg: 1500, usd: 150 },
    },
    transactions: {
      deposits: { count: 127, amount: 735000 },
      withdrawals: { count: 89, amount: 542000 },
      exchanges: { count: 34, amount: 2300 },
      transfers: { count: 12, amount: 285000 },
    },
    accounts: {
      checking: 2,
      savings: 5,
      total: 7,
    },
    loans: {
      disbursed: { count: 3, amount: 275000 },
      repayments: { count: 42, amount: 385000 },
      overdue: 2,
    },
  };

  const weeklyData = [
    { day: 'Lun', transactions: 245, amount: 1850000 },
    { day: 'Mar', transactions: 268, amount: 2100000 },
    { day: 'Mer', transactions: 252, amount: 1950000 },
    { day: 'Jeu', transactions: 289, amount: 2350000 },
    { day: 'Ven', transactions: 276, amount: 2180000 },
    { day: 'Sam', transactions: 142, amount: 980000 },
    { day: 'Dim', transactions: 75, amount: 520000 },
  ];

  const monthlyTrends = [
    { month: 'Juil', clients: 1169, deposits: 8500000, loans: 12200000 },
    { month: 'Août', clients: 1204, deposits: 9200000, loans: 13500000 },
    { month: 'Sept', clients: 1209, deposits: 8800000, loans: 14800000 },
    { month: 'Oct', clients: 1247, deposits: 9500000, loans: 15750000 },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        📊 Rapports et Analyses
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
          <Tab label="📄 Rapport Quotidien" />
          <Tab label="📈 Rapports Périodiques" />
          <Tab label="🔍 Analyses" />
        </Tabs>
      </Paper>

      {/* Tab 0: Daily Report */}
      {currentTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6">📄 Rapport Quotidien de Succursale</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Date: {dailyData.date}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" size="small" startIcon={<PrintIcon />}>
                      Imprimer
                    </Button>
                    <Button variant="outlined" size="small" startIcon={<EmailIcon />}>
                      Envoyer
                    </Button>
                    <Button variant="contained" size="small" startIcon={<PdfIcon />}>
                      PDF
                    </Button>
                  </Box>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* Cash Section */}
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>💰 CAISSE</Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6} md={3}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">Solde Initial HTG</Typography>
                      <Typography variant="h6">{dailyData.cash.opening.htg.toLocaleString()} Gds</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">Entrées HTG</Typography>
                      <Typography variant="h6" color="success.main">+{dailyData.cash.incoming.htg.toLocaleString()} Gds</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">Sorties HTG</Typography>
                      <Typography variant="h6" color="error.main">-{dailyData.cash.outgoing.htg.toLocaleString()} Gds</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#e3f2fd' }}>
                      <Typography variant="caption" color="text.secondary">Solde Final HTG</Typography>
                      <Typography variant="h6">{dailyData.cash.closing.htg.toLocaleString()} Gds</Typography>
                      <Chip label={`Écart: +${dailyData.cash.variance.htg} ✅`} color="success" size="small" />
                    </Paper>
                  </Grid>
                </Grid>

                {/* Transactions Section */}
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>📊 TRANSACTIONS</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell align="right"><strong>Nombre</strong></TableCell>
                        <TableCell align="right"><strong>Volume</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Dépôts</TableCell>
                        <TableCell align="right">{dailyData.transactions.deposits.count}</TableCell>
                        <TableCell align="right">{dailyData.transactions.deposits.amount.toLocaleString()} Gds</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Retraits</TableCell>
                        <TableCell align="right">{dailyData.transactions.withdrawals.count}</TableCell>
                        <TableCell align="right">{dailyData.transactions.withdrawals.amount.toLocaleString()} Gds</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Changes</TableCell>
                        <TableCell align="right">{dailyData.transactions.exchanges.count}</TableCell>
                        <TableCell align="right">${dailyData.transactions.exchanges.amount.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Virements</TableCell>
                        <TableCell align="right">{dailyData.transactions.transfers.count}</TableCell>
                        <TableCell align="right">{dailyData.transactions.transfers.amount.toLocaleString()} Gds</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>TOTAL</strong></TableCell>
                        <TableCell align="right"><strong>262</strong></TableCell>
                        <TableCell align="right">-</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* New Accounts */}
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>👥 NOUVEAUX COMPTES</Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Chip label={`Comptes Courants: ${dailyData.accounts.checking}`} color="primary" />
                  <Chip label={`Comptes Épargne: ${dailyData.accounts.savings}`} color="info" />
                  <Chip label={`Total: ${dailyData.accounts.total}`} color="success" />
                </Box>

                {/* Loans */}
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>💳 CRÉDITS</Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">Décaissés</Typography>
                      <Typography variant="h6">{dailyData.loans.disbursed.count} crédits</Typography>
                      <Typography variant="body2">{dailyData.loans.disbursed.amount.toLocaleString()} Gds</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">Remboursements</Typography>
                      <Typography variant="h6">{dailyData.loans.repayments.count} paiements</Typography>
                      <Typography variant="body2">{dailyData.loans.repayments.amount.toLocaleString()} Gds</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">En retard</Typography>
                      <Typography variant="h6">{dailyData.loans.overdue} clients</Typography>
                      <Typography variant="body2" color="text.secondary">(&lt; 30j)</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Periodic Reports */}
      {currentTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>📅 Hebdomadaire</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Période: 14-18 Octobre 2025
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2">✅ Performance: 91% objectif</Typography>
                <Typography variant="body2">📊 1,247 transactions (+5%)</Typography>
                <Typography variant="body2">👥 34 nouveaux comptes</Typography>
                <Typography variant="body2">💳 Crédits: 12 décaissés</Typography>
                <Button variant="outlined" fullWidth sx={{ mt: 2 }} startIcon={<DownloadIcon />}>
                  Télécharger
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>📆 Mensuel</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Octobre 2025 (18 jours écoulés)
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2">✅ Performance: 89% objectif</Typography>
                <Typography variant="body2">👥 Croissance: +43 clients (+3.6%)</Typography>
                <Typography variant="body2">💰 Portefeuille: 15.7M (+450K)</Typography>
                <Typography variant="body2">📈 Recouvrement: 94.5%</Typography>
                <Button variant="outlined" fullWidth sx={{ mt: 2 }} startIcon={<DownloadIcon />}>
                  Télécharger
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>📊 Trimestriel</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Q4 2025 (En cours)
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2">🎯 Objectif: 1,250 clients</Typography>
                <Typography variant="body2">📈 Progression: 1,247 (99.8%)</Typography>
                <Typography variant="body2">💹 Rentabilité: 8.5%</Typography>
                <Typography variant="body2">⭐ Satisfaction: 4.6/5</Typography>
                <Button variant="outlined" fullWidth sx={{ mt: 2 }} startIcon={<DownloadIcon />}>
                  Télécharger
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>📈 Évolution Hebdomadaire</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="transactions" fill="#8884d8" name="Transactions" />
                    <Bar yAxisId="right" dataKey="amount" fill="#82ca9d" name="Volume (Gds)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Analysis */}
      {currentTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>📈 Analyses et Tendances</Typography>
                
                <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }} fontWeight="bold">
                  Croissance Clientèle
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="clients" stroke="#8884d8" name="Clients" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>

                <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="body2"><strong>Juillet:</strong> +35 clients (+2.9%)</Typography>
                  <Typography variant="body2"><strong>Août:</strong> +41 clients (+3.4%)</Typography>
                  <Typography variant="body2"><strong>Septembre:</strong> +38 clients (+3.1%)</Typography>
                  <Typography variant="body2" color="success.main"><strong>Octobre:</strong> +43 clients (+3.6%) 📈 Tendance positive</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>💼 Qualité Portefeuille Crédit</Typography>
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">PAR 0 (À jour)</Typography>
                    <Chip label="96.8% 🟢" color="success" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">PAR 30</Typography>
                    <Chip label="3.2% 🟢" color="success" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">PAR 90</Typography>
                    <Chip label="1.1% 🟢" color="success" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Tendance</Typography>
                    <Chip label="Stable" color="info" size="small" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>💰 Rentabilité Succursale</Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">Revenus mensuels</Typography>
                  <Typography variant="h5">2,750,000 Gds</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Charges mensuelles</Typography>
                  <Typography variant="h5">2,517,500 Gds</Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary">Marge bénéficiaire</Typography>
                  <Typography variant="h4" color="success.main">232,500 Gds (8.5%) ✅</Typography>
                  <Typography variant="caption" color="success.main">Évolution: +0.8% vs mois précédent</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ReportsModule;
