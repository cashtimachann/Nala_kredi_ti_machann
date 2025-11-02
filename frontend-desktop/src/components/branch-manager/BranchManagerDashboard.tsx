import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  IconButton,
  Tabs,
  Tab,
  Paper,
  Button,
  Badge,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import ValidationModule from './ValidationModule';
import CashManagementModule from './CashManagementModule';
import PersonnelModule from './PersonnelModule';
import ReportsModule from './ReportsModule';
import SpecialOperationsModule from './SpecialOperationsModule';
import SecurityAuditModule from './SecurityAuditModule';

interface DashboardStats {
  cashBalances: {
    htg: number;
    usd: number;
    lastUpdate: string;
  };
  activeClients: number;
  newClientsThisMonth: number;
  todayTransactions: {
    deposits: { count: number; amount: number };
    withdrawals: { count: number; amount: number };
    exchanges: { count: number; amount: number };
    loans: { count: number; amount: number };
  };
  loanPortfolio: {
    totalOutstanding: number;
    activeLoans: number;
    recoveryRate: number;
    par30: number;
  };
  kpis: {
    depositsVsWithdrawals: { deposits: number; withdrawals: number };
    newAccountsThisMonth: number;
    loansIssued: number;
    loansRepaid: number;
    recoveryRate: number;
  };
  alerts: Array<{
    id: string;
    type: 'error' | 'warning' | 'info' | 'success';
    title: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
    timestamp: string;
  }>;
}

const BranchManagerDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Refresh every 2 minutes
    const interval = setInterval(loadDashboardData, 120000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const mockData: DashboardStats = {
        cashBalances: {
          htg: 2500000,
          usd: 45000,
          lastUpdate: new Date().toLocaleTimeString('fr-HT'),
        },
        activeClients: 1247,
        newClientsThisMonth: 43,
        todayTransactions: {
          deposits: { count: 127, amount: 735000 },
          withdrawals: { count: 89, amount: 542000 },
          exchanges: { count: 34, amount: 2300 },
          loans: { count: 12, amount: 450000 },
        },
        loanPortfolio: {
          totalOutstanding: 15750000,
          activeLoans: 342,
          recoveryRate: 94.5,
          par30: 3.2,
        },
        kpis: {
          depositsVsWithdrawals: { deposits: 3250000, withdrawals: 2890000 },
          newAccountsThisMonth: 93,
          loansIssued: 2450000,
          loansRepaid: 2310000,
          recoveryRate: 94.5,
        },
        alerts: [
          {
            id: '1',
            type: 'error',
            title: 'Limite caisse atteinte',
            message: 'Caisse USD proche limite max (95%)',
            priority: 'high',
            timestamp: new Date().toISOString(),
          },
          {
            id: '2',
            type: 'warning',
            title: 'Demandes validation',
            message: '8 demandes en attente (5 crédits, 3 comptes)',
            priority: 'medium',
            timestamp: new Date().toISOString(),
          },
          {
            id: '3',
            type: 'warning',
            title: 'Retards importants',
            message: '12 crédits > 30 jours - Action recommandée',
            priority: 'medium',
            timestamp: new Date().toISOString(),
          },
        ],
      };
      setDashboardStats(mockData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  if (loading || !dashboardStats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Chargement du tableau de bord...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          🏢 Dashboard Chef de Succursale
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconButton color="primary" onClick={loadDashboardData}>
            <RefreshIcon />
          </IconButton>
          <IconButton color="primary">
            <Badge badgeContent={dashboardStats.alerts.length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Box>
      </Box>

      {/* Tabs Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="🏠 Tableau de Bord" />
          <Tab 
            label={
              <Badge badgeContent={8} color="error">
                ✅ Validations
              </Badge>
            } 
          />
          <Tab label="💰 Gestion Caisse" />
          <Tab label="👥 Personnel" />
          <Tab label="📊 Rapports" />
          <Tab label="🏦 Opérations Spéciales" />
          <Tab label="🔐 Sécurité & Audit" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {currentTab === 0 && <DashboardHome stats={dashboardStats} onRefresh={loadDashboardData} />}
      {currentTab === 1 && <ValidationModule />}
      {currentTab === 2 && <CashManagementModule />}
      {currentTab === 3 && <PersonnelModule />}
      {currentTab === 4 && <ReportsModule />}
      {currentTab === 5 && <SpecialOperationsModule />}
      {currentTab === 6 && <SecurityAuditModule />}
    </Box>
  );
};

// Dashboard Home Component
const DashboardHome: React.FC<{ stats: DashboardStats; onRefresh: () => void }> = ({ stats, onRefresh }) => {
  const depositWithdrawalData = [
    { day: 'Lun', deposits: 220000, withdrawals: 180000 },
    { day: 'Mar', deposits: 250000, withdrawals: 195000 },
    { day: 'Mer', deposits: 235000, withdrawals: 210000 },
    { day: 'Jeu', deposits: 280000, withdrawals: 225000 },
    { day: 'Ven', deposits: 265000, withdrawals: 240000 },
    { day: 'Sam', deposits: 180000, withdrawals: 120000 },
    { day: 'Dim', deposits: 90000, withdrawals: 60000 },
  ];

  const loanPortfolioData = [
    { name: 'Crédit Personnel', value: 45, amount: 7087500 },
    { name: 'Crédit Commerce', value: 35, amount: 5512500 },
    { name: 'Crédit Agricole', value: 15, amount: 2362500 },
    { name: 'Crédit Urgence', value: 5, amount: 787500 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Grid container spacing={3}>
      {/* Alertes Prioritaires */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="error" />
              🚨 Alertes Prioritaires ({stats.alerts.length})
            </Typography>
            <Grid container spacing={2}>
              {stats.alerts.map((alert) => (
                <Grid item xs={12} md={4} key={alert.id}>
                  <Alert 
                    severity={alert.type}
                    icon={alert.priority === 'high' ? <WarningIcon /> : undefined}
                  >
                    <Typography fontWeight="bold">{alert.title}</Typography>
                    <Typography variant="body2">{alert.message}</Typography>
                  </Alert>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Vue Globale Succursale */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AccountBalanceIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Solde Caisse HTG
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {stats.cashBalances.htg.toLocaleString()} Gds
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  USD: ${stats.cashBalances.usd.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PeopleIcon sx={{ fontSize: 40, color: 'success.main' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Clients Actifs
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {stats.activeClients.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="success.main">
                  +{stats.newClientsThisMonth} ce mois
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Transactions Aujourd'hui
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {stats.todayTransactions.deposits.count + stats.todayTransactions.withdrawals.count}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(stats.todayTransactions.deposits.amount + stats.todayTransactions.withdrawals.amount).toLocaleString()} Gds
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MoneyIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Portefeuille Crédit
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {(stats.loanPortfolio.totalOutstanding / 1000000).toFixed(1)}M Gds
                </Typography>
                <Typography variant="caption" color="success.main">
                  Taux: {stats.loanPortfolio.recoveryRate}%
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Transactions du Jour */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 Transactions du Jour
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ p: 2, backgroundColor: '#e3f2fd', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">Dépôts</Typography>
                  <Typography variant="h6">{stats.todayTransactions.deposits.count}</Typography>
                  <Typography variant="caption">{stats.todayTransactions.deposits.amount.toLocaleString()} Gds</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 2, backgroundColor: '#fff3e0', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">Retraits</Typography>
                  <Typography variant="h6">{stats.todayTransactions.withdrawals.count}</Typography>
                  <Typography variant="caption">{stats.todayTransactions.withdrawals.amount.toLocaleString()} Gds</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 2, backgroundColor: '#e8f5e9', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">Changes</Typography>
                  <Typography variant="h6">{stats.todayTransactions.exchanges.count}</Typography>
                  <Typography variant="caption">${stats.todayTransactions.exchanges.amount.toLocaleString()}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 2, backgroundColor: '#f3e5f5', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">Crédits</Typography>
                  <Typography variant="h6">{stats.todayTransactions.loans.count}</Typography>
                  <Typography variant="caption">{stats.todayTransactions.loans.amount.toLocaleString()} Gds</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* KPIs */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🎯 Indicateurs Clés (KPI)
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Nouveaux Comptes (Objectif: 100)</Typography>
                <Typography variant="body2" fontWeight="bold">{stats.kpis.newAccountsThisMonth}/100</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={stats.kpis.newAccountsThisMonth} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Taux de Recouvrement (Objectif: >90%)</Typography>
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  {stats.kpis.recoveryRate}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={stats.kpis.recoveryRate} 
                sx={{ height: 8, borderRadius: 4 }}
                color="success"
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">PAR 30 (Cible: <5%)</Typography>
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  {stats.loanPortfolio.par30}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={stats.loanPortfolio.par30 * 20} 
                sx={{ height: 8, borderRadius: 4 }}
                color={stats.loanPortfolio.par30 < 5 ? 'success' : 'warning'}
              />
            </Box>

            <Box>
              <Typography variant="body2" gutterBottom>Crédits Décaissés vs Remboursés</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Chip 
                  label={`Décaissés: ${(stats.kpis.loansIssued / 1000000).toFixed(1)}M`} 
                  color="primary" 
                  size="small" 
                />
                <Chip 
                  label={`Remboursés: ${(stats.kpis.loansRepaid / 1000000).toFixed(1)}M`} 
                  color="success" 
                  size="small" 
                />
                <Chip 
                  label={`Ratio: ${((stats.kpis.loansRepaid / stats.kpis.loansIssued) * 100).toFixed(1)}%`} 
                  color="info" 
                  size="small" 
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Évolution Dépôts/Retraits */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📈 Évolution Dépôts/Retraits (7 derniers jours)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={depositWithdrawalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value) => `${Number(value).toLocaleString()} Gds`} />
                <Legend />
                <Line type="monotone" dataKey="deposits" stroke="#0088FE" name="Dépôts" strokeWidth={2} />
                <Line type="monotone" dataKey="withdrawals" stroke="#FF8042" name="Retraits" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Distribution Portefeuille Crédit */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              💼 Portefeuille Crédit
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={loanPortfolioData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {loanPortfolioData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [`${props.payload.amount.toLocaleString()} Gds`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default BranchManagerDashboard;
