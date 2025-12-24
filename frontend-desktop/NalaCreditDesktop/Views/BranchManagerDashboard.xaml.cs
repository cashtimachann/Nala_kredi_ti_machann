using System;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Threading;
using NalaCreditDesktop.Services;
using NalaCreditDesktop.Models;
using System.Threading.Tasks;

namespace NalaCreditDesktop.Views
{
    public partial class BranchManagerDashboard : Window
    {
        private DispatcherTimer _timer;
        private readonly ApiService _apiService;

        public BranchManagerDashboard(ApiService? apiService = null)
        {
            InitializeComponent();
            _apiService = apiService ?? new ApiService(new System.Net.Http.HttpClient());
            InitializeTimer();
            LoadDashboardDataAsync();
        }

        private void InitializeTimer()
        {
            _timer = new DispatcherTimer();
            _timer.Interval = TimeSpan.FromSeconds(1);
            _timer.Tick += Timer_Tick;
            _timer.Start();
        }

        private void Timer_Tick(object? sender, EventArgs e)
        {
            CurrentTimeText.Text = DateTime.Now.ToString("HH:mm:ss");
            CurrentDateText.Text = DateTime.Now.ToString("dddd, dd MMMM yyyy");
        }

        private async void LoadDashboardDataAsync()
        {
            try
            {
                // Get user info from authentication service
                var user = _apiService.CurrentUser;
                if (user != null)
                {
                    UserNameText.Text = $"{user.FirstName} {user.LastName} - Manager";
                }
                else
                {
                    UserNameText.Text = "Chef de Succursale";
                }

                // Load real statistics from API
                await LoadStatisticsAsync();
                await LoadPendingValidationsAsync();
                await LoadActiveCashSessionsAsync();
                await LoadTeamPerformanceAsync();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Erreur lors du chargement du dashboard:\n{ex.Message}",
                    "Erreur",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        private async Task LoadStatisticsAsync()
        {
            try
            {
                // Show loading state
                TotalTransactionsText.Text = "...";
                ActiveCashiersText.Text = "...";
                PendingApprovalsText.Text = "...";
                PerformanceScoreText.Text = "...";
                CashBalanceHTGText.Text = "...";
                CashBalanceUSDText.Text = "...";
                NewAccountsText.Text = "...";
                ActiveLoansText.Text = "...";
                StaffPresentText.Text = "...";
                AlertBadge.Text = "...";

                // Use branch-supervisor endpoint like web dashboard for comprehensive data
                var dashboard = await _apiService.GetBranchSupervisorDashboardAsync();

                if (dashboard != null)
                {
                    // Display data from branch-supervisor endpoint
                    TotalTransactionsText.Text = dashboard.TodayTransactionCount.ToString();
                    
                    // Active cashiers from dashboard
                    var activeCashiers = dashboard.ActiveCashiers;
                    ActiveCashiersText.Text = activeCashiers > 0 ? $"{activeCashiers}" : "0";
                    
                    // Pending approvals
                    var pendingApprovals = dashboard.PendingCreditApprovals;
                    PendingApprovalsText.Text = pendingApprovals.ToString();
                    
                    // Performance based on average transaction time
                    var avgTime = dashboard.AverageTransactionTime;
                    PerformanceScoreText.Text = avgTime > 0 ? $"{avgTime:F1}min" : "N/A";
                    
                    // Cash management stats if available
                    if (dashboard.CashManagement != null)
                    {
                        var netHTG = dashboard.CashManagement.NetHTG;
                        var netUSD = dashboard.CashManagement.NetUSD;
                        CashBalanceHTGText.Text = $"{netHTG:N0} HTG";
                        CashBalanceUSDText.Text = $"{netUSD:N2} USD";
                    }
                    else
                    {
                        CashBalanceHTGText.Text = "0 HTG";
                        CashBalanceUSDText.Text = "0 USD";
                    }
                    
                    // Use new accounts today
                    NewAccountsText.Text = dashboard.NewAccountsToday.ToString();
                    
                    // Active credits
                    ActiveLoansText.Text = dashboard.ActiveCredits.ToString();
                    
                    // Staff present (use transaction count as indicator of activity)
                    var txCount = dashboard.TodayTransactionCount;
                    StaffPresentText.Text = txCount > 0 ? $"{activeCashiers}" : "0";
                    
                    // Alerts based on pending approvals
                    var alerts = pendingApprovals > 5 ? 1 : 0;
                    AlertBadge.Text = alerts > 0 ? alerts.ToString() : "0";
                    AlertBadge.Visibility = alerts > 0 ? Visibility.Visible : Visibility.Collapsed;
                }
                else
                {
                    // Show error or empty state
                    TotalTransactionsText.Text = "0";
                    ActiveCashiersText.Text = "0";
                    PendingApprovalsText.Text = "0";
                    PerformanceScoreText.Text = "N/A";
                    CashBalanceHTGText.Text = "0 HTG";
                    CashBalanceUSDText.Text = "0 USD";
                    NewAccountsText.Text = "0";
                    ActiveLoansText.Text = "0";
                    StaffPresentText.Text = "0";
                    AlertBadge.Text = "0";
                    AlertBadge.Visibility = Visibility.Collapsed;
                }
            }
            catch (Exception ex)
            {
                // Show error with more details
                TotalTransactionsText.Text = "0";
                ActiveCashiersText.Text = "0";
                PendingApprovalsText.Text = "0";
                PerformanceScoreText.Text = "Erreur";
                CashBalanceHTGText.Text = "0 HTG";
                CashBalanceUSDText.Text = "0 USD";
                NewAccountsText.Text = "0";
                ActiveLoansText.Text = "0";
                StaffPresentText.Text = "0";
                AlertBadge.Text = "!";
                AlertBadge.Visibility = Visibility.Visible;
                
                MessageBox.Show(
                    $"Erreur lors du chargement des statistiques:\n{ex.Message}\n\nVérifiez que le backend est démarré et que vous êtes connecté.",
                    "Erreur de Connexion",
                    MessageBoxButton.OK,
                    MessageBoxImage.Warning);
            }
        }

        private async Task LoadPendingValidationsAsync()
        {
            try
            {
                // Call API to get pending validations
                var validations = await _apiService.GetPendingValidationsAsync();

                if (validations != null && validations.Count > 0)
                {
                    var validationsList = new ObservableCollection<PendingValidation>(validations);
                    PendingValidationsList.ItemsSource = validationsList;
                }
                else
                {
                    // Show empty list
                    var emptyList = new ObservableCollection<PendingValidation>();
                    PendingValidationsList.ItemsSource = emptyList;
                }
            }
            catch (Exception ex)
            {
                // Fail silently, show empty list
                var emptyList = new ObservableCollection<PendingValidation>();
                PendingValidationsList.ItemsSource = emptyList;
            }
        }

        private async Task LoadActiveCashSessionsAsync()
        {
            try
            {
                // Call API to get active cash sessions
                var sessions = await _apiService.GetActiveCashSessionsAsync();

                if (sessions != null && sessions.Count > 0)
                {
                    var sessionsList = new ObservableCollection<CashSession>(sessions);
                    ActiveCashSessionsGrid.ItemsSource = sessionsList;
                }
                else
                {
                    // Show empty grid
                    var emptySessions = new ObservableCollection<CashSession>();
                    ActiveCashSessionsGrid.ItemsSource = emptySessions;
                }
            }
            catch (Exception ex)
            {
                // Fail silently, show empty grid
                var emptySessions = new ObservableCollection<CashSession>();
                ActiveCashSessionsGrid.ItemsSource = emptySessions;
            }
        }

        private async Task LoadTeamPerformanceAsync()
        {
            try
            {
                // Call API to get team performance
                var performance = await _apiService.GetTeamPerformanceAsync();

                if (performance != null && performance.Count > 0)
                {
                    var performanceList = new ObservableCollection<TeamMember>(performance);
                    TeamPerformanceList.ItemsSource = performanceList;
                }
                else
                {
                    // Show empty list
                    var emptyTeam = new ObservableCollection<TeamMember>();
                    TeamPerformanceList.ItemsSource = emptyTeam;
                }
            }
            catch (Exception ex)
            {
                // Fail silently, show empty list
                var emptyTeam = new ObservableCollection<TeamMember>();
                TeamPerformanceList.ItemsSource = emptyTeam;
            }
        }

        // ========================================
        // MENU NAVIGATION EVENTS
        // ========================================
        
        private void Dashboard_Click(object sender, RoutedEventArgs e)
        {
            // Reload dashboard data
            LoadDashboardDataAsync();
        }

        private void ValidateAccounts_Click(object sender, RoutedEventArgs e)
        {
            // TODO: Navigate to ValidationModule
            MessageBox.Show(
                "Module de Validation en développement\n\n" +
                "Fonctionnalités prévues:\n" +
                "• Validation nouveaux comptes\n" +
                "• Approbation demandes de prêt\n" +
                "• Vérification documents KYC\n\n" +
                "Backend API à implémenter:\n" +
                "GET /api/branch/accounts/pending\n" +
                "POST /api/branch/accounts/{id}/approve\n" +
                "POST /api/branch/accounts/{id}/reject",
                "En Développement",
                MessageBoxButton.OK,
                MessageBoxImage.Information);
        }

        private void ApproveLoan_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("💰 Approbation de Prêts\n\n" +
                          "LIMITES D'APPROBATION (Chef de Succursale):\n" +
                          "• Microcrédits: jusqu'à 50,000 HTG\n" +
                          "• Prêts agricoles: jusqu'à 75,000 HTG\n" +
                          "• Prêts commerce: jusqu'à 100,000 HTG\n\n" +
                          "CRITÈRES D'ÉVALUATION:\n" +
                          "✅ Score d'évaluation agent > 70%\n" +
                          "✅ Historique de crédit positif\n" +
                          "✅ Capacité de remboursement vérifiée\n" +
                          "✅ Garanties conformes\n" +
                          "✅ Documents complets\n\n" +
                          "DÉCISIONS POSSIBLES:\n" +
                          "• Approuver: Prêt disponible pour décaissement\n" +
                          "• Approuver avec conditions: Montant/durée ajusté\n" +
                          "• Rejeter: Motif détaillé requis\n" +
                          "• Escalader: >100,000 HTG → Directeur Régional\n\n" +
                          "En attente: 5 demandes\n" +
                          "Montant total: 285,000 HTG",
                          "Approbation Prêts",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void PendingDocuments_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📄 Documents en Attente de Validation\n\n" +
                          "TYPES DE DOCUMENTS:\n" +
                          "• Documents KYC nouveaux clients\n" +
                          "• Photos terrain (évaluations)\n" +
                          "• Contrats de prêt signés\n" +
                          "• Justificatifs garanties\n" +
                          "• Documents modificatifs\n\n" +
                          "VÉRIFICATIONS:\n" +
                          "✅ Qualité et lisibilité\n" +
                          "✅ Authenticité\n" +
                          "✅ Conformité réglementaire\n" +
                          "✅ Signatures présentes\n" +
                          "✅ Date de validité\n\n" +
                          "En attente: 8 documents",
                          "Documents en Attente",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void DailyOperations_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("🔍 Supervision Opérations Quotidiennes\n\n" +
                          "VUE D'ENSEMBLE TEMPS RÉEL:\n" +
                          "• Transactions en cours\n" +
                          "• Alertes système\n" +
                          "• Files d'attente\n" +
                          "• Performance caissiers\n\n" +
                          "INDICATEURS:\n" +
                          "✅ Temps moyen transaction: 3.5 min\n" +
                          "✅ Taux d'erreur: 0.2%\n" +
                          "✅ Satisfaction client: 4.5/5\n" +
                          "✅ Disponibilité système: 99.8%\n\n" +
                          "ACTIONS DISPONIBLES:\n" +
                          "• Intervenir sur transaction bloquée\n" +
                          "• Réaffecter personnel\n" +
                          "• Gérer incidents\n" +
                          "• Débloquer opérations",
                          "Opérations Quotidiennes",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void CashReport_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("💵 Rapport de Caisse Journalier\n\n" +
                          "SYNTHÈSE DU JOUR:\n" +
                          "Date: 16 Octobre 2025\n\n" +
                          "ENCAISSEMENTS:\n" +
                          "• Dépôts: 1,250,000 HTG\n" +
                          "• Remboursements crédits: 450,000 HTG\n" +
                          "• Change (achat devises): 280,000 HTG\n" +
                          "Total entrées: 1,980,000 HTG\n\n" +
                          "DÉCAISSEMENTS:\n" +
                          "• Retraits: 875,000 HTG\n" +
                          "• Décaissements crédits: 350,000 HTG\n" +
                          "• Change (vente devises): 205,000 HTG\n" +
                          "Total sorties: 1,430,000 HTG\n\n" +
                          "SOLDE NET: +550,000 HTG\n\n" +
                          "PAR CAISSIER:\n" +
                          "• Jean Baptiste: 247 trans, 485,000 HTG\n" +
                          "• Marie Claire: 198 trans, 392,000 HTG\n" +
                          "• Autres: 3 caissiers\n\n" +
                          "ANOMALIES: 0\n" +
                          "ÉCARTS: 0 HTG",
                          "Rapport Caisse",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void CloseCash_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("🔒 Clôture de Caisse\n\n" +
                          "PROCESSUS DE CLÔTURE:\n\n" +
                          "1. VÉRIFICATION SESSIONS:\n" +
                          "   ✅ Toutes sessions caissiers fermées\n" +
                          "   ⏳ 5 sessions actives (à fermer d'abord)\n\n" +
                          "2. COMPTAGE PHYSIQUE:\n" +
                          "   • HTG: Billets et pièces\n" +
                          "   • USD: Billets uniquement\n" +
                          "   • Autres devises (si applicable)\n\n" +
                          "3. RAPPROCHEMENT:\n" +
                          "   • Solde théorique vs réel\n" +
                          "   • Identification écarts\n" +
                          "   • Justification différences\n\n" +
                          "4. SÉCURISATION:\n" +
                          "   • Mise en coffre fonds excédentaires\n" +
                          "   • Fonds de roulement jour suivant\n" +
                          "   • Dépôt bancaire (si nécessaire)\n\n" +
                          "5. VALIDATION FINALE:\n" +
                          "   • Signature chef succursale\n" +
                          "   • Envoi rapport à la direction\n" +
                          "   • Archivage documents\n\n" +
                          "⚠️ Clôture non réalisée hier!\n" +
                          "Action requise: Régulariser avant 18h",
                          "Clôture de Caisse",
                          MessageBoxButton.OK,
                          MessageBoxImage.Warning);
        }

        private void Attendance_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📅 Gestion des Présences\n\n" +
                          "AUJOURD'HUI (16 Oct 2025):\n\n" +
                          "PRÉSENTS: 12/15 employés (80%)\n" +
                          "✅ Jean Baptiste - 08:00 (à l'heure)\n" +
                          "✅ Marie Claire - 08:15 (à l'heure)\n" +
                          "✅ Paul André - 09:05 (retard: 5 min)\n" +
                          "✅ Sophie Laurent - 08:30 (à l'heure)\n" +
                          "✅ Rose Dupont - 08:00 (à l'heure)\n" +
                          "[...7 autres présents]\n\n" +
                          "ABSENTS: 3 employés\n" +
                          "❌ Marc Joseph - Congé maladie (justifié)\n" +
                          "❌ Claire Dubois - Congé annuel (approuvé)\n" +
                          "⚠️ Pierre Simon - Absence non justifiée\n\n" +
                          "STATISTIQUES SEMAINE:\n" +
                          "• Taux présence: 92%\n" +
                          "• Retards: 8 incidents\n" +
                          "• Absences justifiées: 5\n" +
                          "• Absences non justifiées: 1\n\n" +
                          "ACTIONS:\n" +
                          "• Marquer présence/absence\n" +
                          "• Justifier absence\n" +
                          "• Approuver congés\n" +
                          "• Générer rapport mensuel",
                          "Présences",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void Schedules_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("⏰ Gestion des Horaires\n\n" +
                          "PLANNING HEBDOMADAIRE:\n\n" +
                          "ÉQUIPE CAISSIERS (Rotation):\n" +
                          "• Équipe A (Matin): 8h-14h\n" +
                          "  Jean Baptiste, Marie Claire, Paul André\n" +
                          "• Équipe B (Après-midi): 14h-20h\n" +
                          "  Sophie Laurent, Marc Joseph, Claire Dubois\n" +
                          "• Équipe C (Samedi): 8h-16h\n" +
                          "  Rotation hebdomadaire\n\n" +
                          "PERSONNEL ADMINISTRATIF:\n" +
                          "• Secrétaire: 8h-17h (Lun-Ven)\n" +
                          "• Agent Crédit: 9h-18h (terrain flexible)\n" +
                          "• Chef Succursale: 7h30-18h30\n\n" +
                          "CONGÉS PLANIFIÉS (Prochains 30 jours):\n" +
                          "• Claire Dubois: 16-20 Oct (congé annuel)\n" +
                          "• Marc Joseph: 23-24 Oct (congé maladie)\n" +
                          "• Rose Dupont: 28 Oct-1 Nov (congé annuel)\n\n" +
                          "ACTIONS:\n" +
                          "• Modifier planning\n" +
                          "• Approuver changements\n" +
                          "• Gérer remplacements\n" +
                          "• Valider congés",
                          "Horaires",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void TeamPerformance_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📊 Performance de l'Équipe\n\n" +
                          "ÉVALUATION MENSUELLE (Octobre 2025):\n\n" +
                          "CAISSIERS:\n" +
                          "• Jean Baptiste: 95%\n" +
                          "  - Transactions: 1,247 (4.5 min/moyenne)\n" +
                          "  - Exactitude: 99.9%\n" +
                          "  - Satisfaction client: 4.8/5\n\n" +
                          "• Marie Claire: 92%\n" +
                          "  - Transactions: 1,089\n" +
                          "  - Exactitude: 99.7%\n" +
                          "  - Satisfaction client: 4.6/5\n\n" +
                          "AGENTS CRÉDIT:\n" +
                          "• Sophie Laurent: 88%\n" +
                          "  - Demandes traitées: 45\n" +
                          "  - Taux approbation: 82%\n" +
                          "  - Taux remboursement portfolio: 94%\n" +
                          "  - Visites terrain: 28\n\n" +
                          "SECRÉTAIRES:\n" +
                          "• Rose Dupont: 94%\n" +
                          "  - Nouveaux comptes: 67\n" +
                          "  - Documents traités: 245\n" +
                          "  - Délai traitement: 1.2 jours\n\n" +
                          "PERFORMANCE GLOBALE SUCCURSALE:\n" +
                          "Score: 92% (Excellent)\n" +
                          "Objectif: 85%\n" +
                          "Classement régional: 2/12 succursales",
                          "Performance Équipe",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void ExchangeManagement_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("💱 Gestion du Bureau de Change\n\n" +
                          "ACTIVITÉ DU JOUR:\n\n" +
                          "ACHATS (HTG → USD):\n" +
                          "• Nombre transactions: 45\n" +
                          "• Montant HTG reçu: 2,850,000 HTG\n" +
                          "• USD vendus: 21,750 USD\n" +
                          "• Taux moyen: 131.03 HTG/USD\n\n" +
                          "VENTES (USD → HTG):\n" +
                          "• Nombre transactions: 38\n" +
                          "• USD reçus: 18,500 USD\n" +
                          "• HTG vendus: 2,425,000 HTG\n" +
                          "• Taux moyen: 131.08 HTG/USD\n\n" +
                          "POSITION DE CHANGE:\n" +
                          "• Stock USD début: 45,000 USD\n" +
                          "• Mouvements jour: -3,250 USD\n" +
                          "• Stock USD actuel: 41,750 USD\n" +
                          "• Limite max: 50,000 USD\n" +
                          "• Limite min: 10,000 USD\n" +
                          "✅ Position dans limites\n\n" +
                          "MARGE RÉALISÉE:\n" +
                          "• Spread moyen: 0.05 HTG/USD\n" +
                          "• Profit estimé: 2,125 HTG\n\n" +
                          "ACTIONS:\n" +
                          "• Ajuster taux de change\n" +
                          "• Commander devises\n" +
                          "• Vendre excédent à banque\n" +
                          "• Gérer limites exposition",
                          "Gestion Change",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void ExchangeRates_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📈 Taux de Change du Jour\n\n" +
                          "MIS À JOUR: 16 Oct 2025 - 08:45\n\n" +
                          "USD (Dollar Américain):\n" +
                          "• Achat (nous achetons): 130.50 HTG\n" +
                          "• Vente (nous vendons): 131.50 HTG\n" +
                          "• Spread: 1.00 HTG (0.76%)\n" +
                          "• Taux référence BRH: 131.00 HTG\n\n" +
                          "EUR (Euro):\n" +
                          "• Achat: 142.00 HTG\n" +
                          "• Vente: 144.00 HTG\n" +
                          "• Spread: 2.00 HTG\n\n" +
                          "CAD (Dollar Canadien):\n" +
                          "• Achat: 95.00 HTG\n" +
                          "• Vente: 97.00 HTG\n" +
                          "• Spread: 2.00 HTG\n\n" +
                          "HISTORIQUE (7 derniers jours):\n" +
                          "• 15 Oct: 130.75 HTG/USD\n" +
                          "• 14 Oct: 130.25 HTG/USD\n" +
                          "• 13 Oct: 129.80 HTG/USD\n" +
                          "• Tendance: ↗️ Hausse USD\n\n" +
                          "⚠️ ALERTE:\n" +
                          "Taux non mis à jour depuis hier!\n" +
                          "Action requise: Mettre à jour maintenant\n\n" +
                          "ACTIONS:\n" +
                          "• Modifier taux\n" +
                          "• Consulter BRH\n" +
                          "• Notifier équipe\n" +
                          "• Afficher au public",
                          "Taux de Change",
                          MessageBoxButton.OK,
                          MessageBoxImage.Warning);
        }

        private void DailyReport_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📊 Rapport Journalier\n\n" +
                          "SUCCURSALE PORT-AU-PRINCE\n" +
                          "Date: 16 Octobre 2025\n\n" +
                          "═══════════════════════════════\n" +
                          "ACTIVITÉ GLOBALE\n" +
                          "═══════════════════════════════\n" +
                          "Transactions: 247\n" +
                          "Volume total: 2,450,000 HTG\n" +
                          "Clients servis: 189\n" +
                          "Temps moyen: 3.5 min\n\n" +
                          "═══════════════════════════════\n" +
                          "COMPTES\n" +
                          "═══════════════════════════════\n" +
                          "Nouveaux: 6\n" +
                          "Validations: 3\n" +
                          "Actifs total: 1,247\n\n" +
                          "═══════════════════════════════\n" +
                          "CRÉDITS\n" +
                          "═══════════════════════════════\n" +
                          "Demandes reçues: 8\n" +
                          "Approuvées: 4 (185,000 HTG)\n" +
                          "Décaissées: 3 (125,000 HTG)\n" +
                          "Remboursements: 450,000 HTG\n\n" +
                          "═══════════════════════════════\n" +
                          "PERSONNEL\n" +
                          "═══════════════════════════════\n" +
                          "Présents: 12/15\n" +
                          "Caissiers actifs: 5\n" +
                          "Performance moyenne: 91%\n\n" +
                          "═══════════════════════════════\n" +
                          "INCIDENTS\n" +
                          "═══════════════════════════════\n" +
                          "Aucun incident majeur\n" +
                          "Alertes mineures: 2\n\n" +
                          "ACTIONS REQUISES DEMAIN:\n" +
                          "• Commander espèces banque\n" +
                          "• Valider 5 demandes prêts\n" +
                          "• Formation nouveaux caissiers",
                          "Rapport Journalier",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void WeeklyReport_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📅 Rapport Hebdomadaire\n\n" +
                          "SEMAINE DU 14-20 OCTOBRE 2025\n" +
                          "SUCCURSALE PORT-AU-PRINCE\n\n" +
                          "═══════════════════════════════\n" +
                          "PERFORMANCE GLOBALE\n" +
                          "═══════════════════════════════\n" +
                          "Transactions: 1,247 (+8% vs semaine précédente)\n" +
                          "Volume: 12,450,000 HTG (+12%)\n" +
                          "Clients: 945 clients uniques\n\n" +
                          "═══════════════════════════════\n" +
                          "NOUVEAUX COMPTES\n" +
                          "═══════════════════════════════\n" +
                          "Ouverts: 28\n" +
                          "Validés: 25\n" +
                          "En attente: 3\n" +
                          "Taux conversion: 89%\n\n" +
                          "═══════════════════════════════\n" +
                          "PORTEFEUILLE CRÉDIT\n" +
                          "═══════════════════════════════\n" +
                          "Demandes: 45\n" +
                          "Approuvées: 32 (71%)\n" +
                          "Montant approuvé: 1,450,000 HTG\n" +
                          "Décaissées: 28\n" +
                          "Remboursements: 2,150,000 HTG\n" +
                          "Taux remboursement: 94.5%\n\n" +
                          "═══════════════════════════════\n" +
                          "ÉQUIPE\n" +
                          "═══════════════════════════════\n" +
                          "Présence moyenne: 92%\n" +
                          "Performance: 91%\n" +
                          "Satisfaction client: 4.6/5\n\n" +
                          "═══════════════════════════════\n" +
                          "OBJECTIFS\n" +
                          "═══════════════════════════════\n" +
                          "Volume transactions: 105% ✅\n" +
                          "Nouveaux comptes: 112% ✅\n" +
                          "Crédits décaissés: 93% ⚠️\n" +
                          "Qualité service: 92% ✅",
                          "Rapport Hebdomadaire",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void MonthlyReport_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📈 Rapport Mensuel\n\n" +
                          "OCTOBRE 2025 (1-15)\n" +
                          "SUCCURSALE PORT-AU-PRINCE\n\n" +
                          "═══════════════════════════════\n" +
                          "RÉSUMÉ EXÉCUTIF\n" +
                          "═══════════════════════════════\n" +
                          "Performance globale: 92%\n" +
                          "Classement régional: 2/12\n" +
                          "Objectifs atteints: 4/5\n\n" +
                          "═══════════════════════════════\n" +
                          "ACTIVITÉ COMMERCIALE\n" +
                          "═══════════════════════════════\n" +
                          "Transactions: 5,247 (+15% vs Sept)\n" +
                          "Volume: 52,450,000 HTG (+18%)\n" +
                          "Clients actifs: 1,247 (+45)\n\n" +
                          "═══════════════════════════════\n" +
                          "COMPTES\n" +
                          "═══════════════════════════════\n" +
                          "Nouveaux: 112 (objectif: 100) ✅\n" +
                          "Épargne moyenne: 8,500 HTG\n" +
                          "Taux rétention: 96%\n\n" +
                          "═══════════════════════════════\n" +
                          "CRÉDITS\n" +
                          "═══════════════════════════════\n" +
                          "Décaissés: 145 prêts\n" +
                          "Montant: 6,250,000 HTG\n" +
                          "Portfolio: 4,750,000 HTG\n" +
                          "PAR 30: 2.8% (excellent)\n" +
                          "Taux remboursement: 94.2%\n\n" +
                          "═══════════════════════════════\n" +
                          "RENTABILITÉ\n" +
                          "═══════════════════════════════\n" +
                          "Revenus: 285,000 HTG\n" +
                          "Charges: 198,000 HTG\n" +
                          "Résultat: +87,000 HTG\n" +
                          "Marge: 30.5%\n\n" +
                          "═══════════════════════════════\n" +
                          "RECOMMANDATIONS\n" +
                          "═══════════════════════════════\n" +
                          "• Augmenter objectifs crédits +10%\n" +
                          "• Former 2 nouveaux caissiers\n" +
                          "• Élargir horaires samedi\n" +
                          "• Campaign promotion épargne",
                          "Rapport Mensuel",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void Logout_Click(object sender, RoutedEventArgs e)
        {
            var result = MessageBox.Show(
                "Êtes-vous sûr de vouloir vous déconnecter?",
                "Déconnexion",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);

            if (result == MessageBoxResult.Yes)
            {
                _timer.Stop();
                // Return to login window
                var loginWindow = new LoginWindow();
                loginWindow.Show();
                this.Close();
            }
        }
        private async void OpenCashierSession_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var dialog = new OpenCashierSessionDialog(_apiService)
                {
                    Owner = this
                };

                var result = dialog.ShowDialog();
                if (result != true || string.IsNullOrEmpty(dialog.SelectedCashierId))
                {
                    return;
                }

                // Call API to open cash session for cashier
                var apiResult = await _apiService.OpenCashSessionForCashierAsync(
                    dialog.SelectedCashierId,
                    dialog.OpeningBalanceHTG,
                    dialog.OpeningBalanceUSD
                );
                
                if (apiResult.IsSuccess)
                {
                    MessageBox.Show(
                        "Session de caisse ouverte avec succès pour le caissier!",
                        "Succès",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                    
                    // Refresh the dashboard to show the new session
                    await LoadActiveCashSessionsAsync();
                }
                else
                {
                    MessageBox.Show(
                        apiResult.ErrorMessage ?? "Erreur lors de l'ouverture de la session",
                        "Erreur",
                        MessageBoxButton.OK,
                        MessageBoxImage.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Erreur: {ex.Message}",
                    "Erreur",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }    }
}
