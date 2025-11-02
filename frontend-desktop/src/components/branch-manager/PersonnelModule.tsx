import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle as PresentIcon,
  Schedule as LateIcon,
  Cancel as AbsentIcon,
  Star as StarIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';

const PersonnelModule: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const employees = [
    { name: 'Marie Laurent', entry: '08:00', exit: '--:--', status: 'present', hours: '6h35', position: 'Caissière' },
    { name: 'Jean Pierre', entry: '07:55', exit: '--:--', status: 'present', hours: '6h40', position: 'Caissier' },
    { name: 'Sophie Michel', entry: '08:15', exit: '--:--', status: 'late', hours: '6h20', position: 'Caissière' },
    { name: 'Pierre Dubois', entry: '08:02', exit: '--:--', status: 'present', hours: '6h33', position: 'Caissier' },
    { name: 'Anne Marie', entry: '--:--', exit: '--:--', status: 'absent', hours: '-', position: 'Secrétaire' },
    { name: 'Jacques Bernard', entry: '08:30', exit: '--:--', status: 'late', hours: '6h05', position: 'Agent Crédit' },
  ];

  const performance = [
    { name: 'Marie Laurent', transactions: 823, satisfaction: 5, position: 'Caissière', progress: 95 },
    { name: 'Jean Pierre', transactions: 756, satisfaction: 4, position: 'Caissier', progress: 88 },
    { name: 'Sophie Michel', transactions: 692, satisfaction: 4, position: 'Caissière', progress: 75 },
    { name: 'Pierre Dubois', transactions: 584, satisfaction: 3, position: 'Caissier', progress: 65 },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <Chip label="✅ Présent" color="success" size="small" icon={<PresentIcon />} />;
      case 'late': return <Chip label="🟡 Retard" color="warning" size="small" icon={<LateIcon />} />;
      case 'absent': return <Chip label="❌ Absent" color="error" size="small" icon={<AbsentIcon />} />;
      default: return null;
    }
  };

  const renderStars = (count: number) => {
    return '⭐'.repeat(count);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        👥 Gestion du Personnel
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
          <Tab label="📋 Présences" />
          <Tab label="📊 Performance" />
          <Tab label="📅 Planning" />
        </Tabs>
      </Paper>

      {/* Tab 0: Présences */}
      {currentTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📋 Gestion des Présences
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Date: {new Date().toLocaleDateString('fr-HT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>

                <TableContainer sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Employé</TableCell>
                        <TableCell>Poste</TableCell>
                        <TableCell>Entrée</TableCell>
                        <TableCell>Sortie</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell>Heures</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {employees.map((emp, idx) => (
                        <TableRow key={idx}>
                          <TableCell><strong>{emp.name}</strong></TableCell>
                          <TableCell>{emp.position}</TableCell>
                          <TableCell>{emp.entry}</TableCell>
                          <TableCell>{emp.exit}</TableCell>
                          <TableCell>{getStatusIcon(emp.status)}</TableCell>
                          <TableCell>{emp.hours}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="h6">Résumé:</Typography>
                  <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                    <Typography>✅ Présents: 5/6 (83%)</Typography>
                    <Typography>🟡 Retards: 2 (&lt; 30 min)</Typography>
                    <Typography>❌ Absents: 1 (Congé maladie)</Typography>
                    <Typography>⏰ Heures sup.: 0</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button variant="outlined">👁️ Détails</Button>
                  <Button variant="outlined">📊 Rapport Mensuel</Button>
                  <Button variant="outlined">📅 Planning</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Performance */}
      {currentTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 Performance du Personnel (Octobre 2025)
                </Typography>

                <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }} fontWeight="bold">
                  Caissiers
                </Typography>
                {performance.map((perf, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Grid container alignItems="center" spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle1" fontWeight="bold">{perf.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{perf.position}</Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary">Transactions</Typography>
                        <Typography variant="h6">{perf.transactions}</Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary">Satisfaction</Typography>
                        <Typography variant="h6">{renderStars(perf.satisfaction)}</Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Typography variant="body2" color="text.secondary">Objectif</Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={perf.progress}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption">{perf.progress}%</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}

                <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }} fontWeight="bold">
                  Évaluations Récentes
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Chip label="Marie L.: 4.8/5 - Excellente performance" color="success" />
                  <Chip label="Jean P.: 4.5/5 - Très bonne performance" color="success" />
                  <Chip label="Sophie M.: 4.2/5 - Bonne performance" color="info" />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                  <Button variant="outlined">📈 Détails</Button>
                  <Button variant="outlined">🎯 Objectifs</Button>
                  <Button variant="outlined">📝 Évaluations</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Planning */}
      {currentTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📅 Planning Hebdomadaire
                </Typography>

                <TableContainer sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Employé</TableCell>
                        <TableCell>Lun</TableCell>
                        <TableCell>Mar</TableCell>
                        <TableCell>Mer</TableCell>
                        <TableCell>Jeu</TableCell>
                        <TableCell>Ven</TableCell>
                        <TableCell>Sam</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>Marie L.</strong></TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell>9-13</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Jean P.</strong></TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell><Chip label="OFF" size="small" color="warning" /></TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell>8-12</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Sophie M.</strong></TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell><Chip label="OFF" size="small" color="warning" /></TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell><Chip label="OFF" size="small" color="warning" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Pierre D.</strong></TableCell>
                        <TableCell><Chip label="OFF" size="small" color="warning" /></TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell>8-17</TableCell>
                        <TableCell>9-13</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ mt: 3, p: 2, backgroundColor: '#fff3e0', borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">Congés à Venir (30 prochains jours)</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>25-27/10 - Marie Laurent (3 jours)</Typography>
                  <Typography variant="body2">05-12/11 - Jean Pierre (7 jours)</Typography>
                  <Typography variant="body2">20-22/11 - Sophie Michel (3 jours)</Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button variant="outlined">✏️ Modifier</Button>
                  <Button variant="outlined">👁️ Vue Mensuelle</Button>
                  <Button variant="outlined">📄 Imprimer</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default PersonnelModule;
