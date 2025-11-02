import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tabs,
  Tab,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  AttachFile as AttachmentIcon,
  Warning as WarningIcon,
  CheckCircleOutline as CheckIcon,
  ErrorOutline as ErrorIcon,
  Send as SendIcon,
  ArrowUpward as EscalateIcon,
} from '@mui/icons-material';

interface AccountValidation {
  id: string;
  clientName: string;
  accountType: string;
  submittedDate: string;
  initialDeposit: number;
  kycStatus: {
    identityCard: boolean;
    proofOfAddress: boolean;
    photo: boolean;
    references: boolean;
  };
  status: 'pending' | 'approved' | 'rejected';
}

interface LoanValidation {
  id: string;
  clientName: string;
  amount: number;
  duration: number;
  interestRate: number;
  loanType: string;
  clientHistory: {
    memberSince: string;
    previousLoans: number;
    rating: number;
  };
  guarantee: {
    type: string;
    value: number;
  };
  autoScore: number;
  agentComment: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
}

const ValidationModule: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [accounts, setAccounts] = useState<AccountValidation[]>([]);
  const [loans, setLoans] = useState<LoanValidation[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountValidation | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<LoanValidation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadValidations();
  }, []);

  const loadValidations = async () => {
    // TODO: Replace with actual API calls
    const mockAccounts: AccountValidation[] = [
      {
        id: 'ACC-001',
        clientName: 'Jean Baptiste',
        accountType: 'Compte Courant',
        submittedDate: '2025-10-18T09:30:00',
        initialDeposit: 5000,
        kycStatus: {
          identityCard: true,
          proofOfAddress: true,
          photo: true,
          references: true,
        },
        status: 'pending',
      },
      {
        id: 'ACC-002',
        clientName: 'Marie Dupont',
        accountType: 'Compte Épargne à Terme',
        submittedDate: '2025-10-18T10:15:00',
        initialDeposit: 50000,
        kycStatus: {
          identityCard: true,
          proofOfAddress: false,
          photo: true,
          references: true,
        },
        status: 'pending',
      },
      {
        id: 'ACC-003',
        clientName: 'Sophie Laurent',
        accountType: 'Compte Courant Personnel',
        submittedDate: '2025-10-18T11:00:00',
        initialDeposit: 10000,
        kycStatus: {
          identityCard: true,
          proofOfAddress: true,
          photo: true,
          references: true,
        },
        status: 'pending',
      },
    ];

    const mockLoans: LoanValidation[] = [
      {
        id: '4521',
        clientName: 'Pierre Louis',
        amount: 75000,
        duration: 12,
        interestRate: 18,
        loanType: 'Commerce',
        clientHistory: {
          memberSince: '2 ans 3 mois',
          previousLoans: 3,
          rating: 5,
        },
        guarantee: {
          type: 'Équipement commercial',
          value: 95000,
        },
        autoScore: 780,
        agentComment: 'Client fiable, excellent historique. Activité commerciale florissante. Garantie solide. Recommande approbation.',
        status: 'pending',
      },
      {
        id: '4522',
        clientName: 'Anne Marie Joseph',
        amount: 25000,
        duration: 6,
        interestRate: 18,
        loanType: 'Personnel',
        clientHistory: {
          memberSince: '1 an 5 mois',
          previousLoans: 1,
          rating: 4,
        },
        guarantee: {
          type: 'Bijoux',
          value: 35000,
        },
        autoScore: 680,
        agentComment: 'Bon historique de remboursement. Première demande de crédit personnel.',
        status: 'pending',
      },
      {
        id: '4523',
        clientName: 'Jacques Bernard',
        amount: 150000,
        duration: 18,
        interestRate: 16,
        loanType: 'Agricole',
        clientHistory: {
          memberSince: '4 ans 2 mois',
          previousLoans: 5,
          rating: 5,
        },
        guarantee: {
          type: 'Terrain agricole',
          value: 250000,
        },
        autoScore: 850,
        agentComment: 'Client exemplaire. Projet agricole bien structuré. Montant élevé nécessite attention particulière.',
        status: 'pending',
      },
    ];

    setAccounts(mockAccounts);
    setLoans(mockLoans);
  };

  const handleAccountClick = (account: AccountValidation) => {
    setSelectedAccount(account);
    setDialogOpen(true);
  };

  const handleLoanClick = (loan: LoanValidation) => {
    setSelectedLoan(loan);
    setLoanDialogOpen(true);
  };

  const handleApproveAccount = async () => {
    if (selectedAccount) {
      // TODO: API call to approve account
      console.log('Approving account:', selectedAccount.id, comment);
      setDialogOpen(false);
      setComment('');
      loadValidations();
    }
  };

  const handleRejectAccount = async () => {
    if (selectedAccount && comment.trim()) {
      // TODO: API call to reject account
      console.log('Rejecting account:', selectedAccount.id, comment);
      setDialogOpen(false);
      setComment('');
      loadValidations();
    } else {
      alert('Un motif de rejet est obligatoire');
    }
  };

  const handleApproveLoan = async () => {
    if (selectedLoan) {
      // TODO: API call to approve loan
      console.log('Approving loan:', selectedLoan.id, comment);
      setLoanDialogOpen(false);
      setComment('');
      loadValidations();
    }
  };

  const handleRejectLoan = async () => {
    if (selectedLoan && comment.trim()) {
      // TODO: API call to reject loan
      console.log('Rejecting loan:', selectedLoan.id, comment);
      setLoanDialogOpen(false);
      setComment('');
      loadValidations();
    } else {
      alert('Un motif de rejet est obligatoire');
    }
  };

  const handleEscalateLoan = async () => {
    if (selectedLoan) {
      // TODO: API call to escalate loan to regional director
      console.log('Escalating loan:', selectedLoan.id, comment);
      setLoanDialogOpen(false);
      setComment('');
      loadValidations();
    }
  };

  const pendingAccounts = accounts.filter(a => a.status === 'pending');
  const pendingLoans = loans.filter(l => l.status === 'pending');

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        ✅ Module de Validation
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Comptes
                {pendingAccounts.length > 0 && (
                  <Chip label={pendingAccounts.length} color="error" size="small" />
                )}
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Crédits
                {pendingLoans.length > 0 && (
                  <Chip label={pendingLoans.length} color="error" size="small" />
                )}
              </Box>
            } 
          />
          <Tab label="Autres Validations" />
        </Tabs>
      </Paper>

      {/* Tab 0: Account Validations */}
      {currentTab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Type de Compte</TableCell>
                <TableCell>Date Soumission</TableCell>
                <TableCell>Dépôt Initial</TableCell>
                <TableCell>KYC</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.id}</TableCell>
                  <TableCell>{account.clientName}</TableCell>
                  <TableCell>{account.accountType}</TableCell>
                  <TableCell>{new Date(account.submittedDate).toLocaleString('fr-HT')}</TableCell>
                  <TableCell>{account.initialDeposit.toLocaleString()} Gds</TableCell>
                  <TableCell>
                    {Object.values(account.kycStatus).every(v => v) ? (
                      <Chip label="Complet" color="success" size="small" icon={<CheckIcon />} />
                    ) : (
                      <Chip label="Incomplet" color="warning" size="small" icon={<WarningIcon />} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => handleAccountClick(account)}
                    >
                      Examiner
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 1: Loan Validations */}
      {currentTab === 1 && (
        <Grid container spacing={2}>
          {pendingLoans.map((loan) => (
            <Grid item xs={12} key={loan.id}>
              <Card>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <Typography variant="h6">
                        #{loan.id} - {loan.clientName}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                        <Chip label={`${loan.amount.toLocaleString()} Gds`} color="primary" />
                        <Chip label={`${loan.duration} mois`} variant="outlined" />
                        <Chip label={loan.loanType} color="info" />
                        <Chip 
                          label={`Score: ${loan.autoScore}/1000`} 
                          color={loan.autoScore >= 700 ? 'success' : 'warning'} 
                        />
                      </Box>
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        <strong>Historique:</strong> {loan.clientHistory.memberSince} - {loan.clientHistory.previousLoans} crédit(s) précédent(s)
                      </Typography>
                      <Typography variant="body2">
                        <strong>Garantie:</strong> {loan.guarantee.type} ({loan.guarantee.value.toLocaleString()} Gds)
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        startIcon={<ViewIcon />}
                        onClick={() => handleLoanClick(loan)}
                      >
                        Examiner Dossier
                      </Button>
                      {loan.amount > 100000 && (
                        <Alert severity="info" icon={<WarningIcon />}>
                          Montant élevé - Escalade possible
                        </Alert>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 2: Other Validations */}
      {currentTab === 2 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Annulation de Transaction
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Demandes d'annulation nécessitant validation
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Alert severity="info">Aucune demande en attente</Alert>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Modifications Majeures
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Changements importants nécessitant approbation
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Alert severity="info">Aucune demande en attente</Alert>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Clôture de Comptes
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Demandes de clôture de compte
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Alert severity="info">Aucune demande en attente</Alert>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Déblocage de Compte
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Comptes bloqués nécessitant déblocage
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Alert severity="info">Aucune demande en attente</Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Account Validation Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Validation de Compte - {selectedAccount?.clientName}
        </DialogTitle>
        <DialogContent>
          {selectedAccount && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>📋 Informations du Compte</Typography>
                  <Typography><strong>ID:</strong> {selectedAccount.id}</Typography>
                  <Typography><strong>Type:</strong> {selectedAccount.accountType}</Typography>
                  <Typography><strong>Dépôt initial:</strong> {selectedAccount.initialDeposit.toLocaleString()} Gds</Typography>
                  <Typography><strong>Date soumission:</strong> {new Date(selectedAccount.submittedDate).toLocaleString('fr-HT')}</Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>📄 Documents KYC</Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        {selectedAccount.kycStatus.identityCard ? <CheckIcon color="success" /> : <ErrorIcon color="error" />}
                      </ListItemIcon>
                      <ListItemText primary="Carte d'identité" secondary={selectedAccount.kycStatus.identityCard ? 'Vérifié' : 'Manquant'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        {selectedAccount.kycStatus.proofOfAddress ? <CheckIcon color="success" /> : <ErrorIcon color="error" />}
                      </ListItemIcon>
                      <ListItemText primary="Justificatif de domicile" secondary={selectedAccount.kycStatus.proofOfAddress ? 'Vérifié' : 'Manquant'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        {selectedAccount.kycStatus.photo ? <CheckIcon color="success" /> : <ErrorIcon color="error" />}
                      </ListItemIcon>
                      <ListItemText primary="Photo 2x2" secondary={selectedAccount.kycStatus.photo ? 'Conforme' : 'Manquant'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        {selectedAccount.kycStatus.references ? <CheckIcon color="success" /> : <ErrorIcon color="error" />}
                      </ListItemIcon>
                      <ListItemText primary="Références" secondary={selectedAccount.kycStatus.references ? '2 fournies' : 'Manquant'} />
                    </ListItem>
                  </List>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Commentaire / Motif"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ajoutez un commentaire (obligatoire pour rejet)"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<RejectIcon />}
            onClick={handleRejectAccount}
          >
            Rejeter
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<ApproveIcon />}
            onClick={handleApproveAccount}
          >
            Approuver
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loan Validation Dialog */}
      <Dialog open={loanDialogOpen} onClose={() => setLoanDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Validation de Crédit #{selectedLoan?.id} - {selectedLoan?.clientName}
        </DialogTitle>
        <DialogContent>
          {selectedLoan && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>📝 Informations Client</Typography>
                      <Typography><strong>Nom:</strong> {selectedLoan.clientName}</Typography>
                      <Typography><strong>Client depuis:</strong> {selectedLoan.clientHistory.memberSince}</Typography>
                      <Typography><strong>Crédits précédents:</strong> {selectedLoan.clientHistory.previousLoans} (tous remboursés à temps)</Typography>
                      <Typography>
                        <strong>Évaluation:</strong> {'⭐'.repeat(selectedLoan.clientHistory.rating)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>💰 Détails de la Demande</Typography>
                      <Typography><strong>Montant:</strong> {selectedLoan.amount.toLocaleString()} Gds</Typography>
                      <Typography><strong>Durée:</strong> {selectedLoan.duration} mois</Typography>
                      <Typography><strong>Taux:</strong> {selectedLoan.interestRate}% annuel</Typography>
                      <Typography><strong>Type:</strong> {selectedLoan.loanType}</Typography>
                      <Typography><strong>Garantie:</strong> {selectedLoan.guarantee.type} ({selectedLoan.guarantee.value.toLocaleString()} Gds)</Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ backgroundColor: '#f5f5f5' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>📊 Évaluation Automatique</Typography>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                        <Typography>Score crédit: <strong>{selectedLoan.autoScore}/1000</strong></Typography>
                        <Chip 
                          label={selectedLoan.autoScore >= 700 ? 'Très bon' : 'Acceptable'} 
                          color={selectedLoan.autoScore >= 700 ? 'success' : 'warning'} 
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Capacité de remboursement: 85% | Ratio endettement: 42% (Acceptable)
                      </Typography>
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Recommandation système: ✅ APPROUVER
                      </Alert>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>💵 Simulation Remboursement</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">Mensualité</Typography>
                          <Typography variant="h6">{((selectedLoan.amount * (1 + selectedLoan.interestRate / 100)) / selectedLoan.duration).toLocaleString()} Gds</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">Total à rembourser</Typography>
                          <Typography variant="h6">{(selectedLoan.amount * (1 + selectedLoan.interestRate / 100)).toLocaleString()} Gds</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">Intérêts</Typography>
                          <Typography variant="h6">{(selectedLoan.amount * selectedLoan.interestRate / 100).toLocaleString()} Gds</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info" icon={<AttachmentIcon />}>
                    <Typography variant="body2">
                      <strong>Documents joints (5):</strong> ✅ Demande signée | ✅ Pièce d'identité | ✅ Justificatif activité | ✅ Photos garantie | ✅ Plan remboursement
                    </Typography>
                  </Alert>
                </Grid>

                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ backgroundColor: '#e3f2fd' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>💬 Commentaire Agent de Crédit</Typography>
                      <Typography variant="body2">{selectedLoan.agentComment}</Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  {selectedLoan.amount <= 100000 ? (
                    <Alert severity="success">
                      ✅ Dans votre limite d'approbation (100,000 Gds)
                    </Alert>
                  ) : (
                    <Alert severity="warning">
                      ⚠️ Montant supérieur à votre limite - Possibilité d'escalade au Directeur Régional
                    </Alert>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Votre Commentaire"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ajoutez votre analyse et recommandation..."
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoanDialogOpen(false)}>Annuler</Button>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<RejectIcon />}
            onClick={handleRejectLoan}
          >
            Rejeter
          </Button>
          {selectedLoan && selectedLoan.amount > 100000 && (
            <Button 
              variant="outlined" 
              color="info" 
              startIcon={<EscalateIcon />}
              onClick={handleEscalateLoan}
            >
              Renvoyer Niveau Supérieur
            </Button>
          )}
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<ApproveIcon />}
            onClick={handleApproveLoan}
          >
            Approuver
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ValidationModule;
