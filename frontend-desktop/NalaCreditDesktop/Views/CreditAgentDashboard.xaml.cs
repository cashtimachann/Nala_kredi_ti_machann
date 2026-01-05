using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Threading;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class CreditAgentDashboard : Window
    {
        private DispatcherTimer _timer;
        private readonly ApiService _apiService;

        public CreditAgentDashboard(ApiService? apiService = null)
        {
            InitializeComponent();
            _apiService = apiService ?? AppServices.GetRequiredApiService();
            InitializeTimer();
            _ = LoadDashboardDataAsync();
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

        private async System.Threading.Tasks.Task LoadDashboardDataAsync()
        {
            try
            {
                // Load dashboard data from API
                var dashboard = await _apiService.GetCreditAgentDashboardAsync();
                
                if (dashboard != null)
                {
                    // Update statistics
                    ActiveCreditsText.Text = dashboard.ActiveCreditsCount.ToString();
                    PortfolioAmountText.Text = $"{dashboard.TotalPortfolioAmount:N0} HTG";
                    PendingApplicationsText.Text = dashboard.PendingApplications.ToString();
                    RepaymentRateText.Text = $"{dashboard.RepaymentRate:F1}%";
                    NotificationBadge.Text = (dashboard.PendingApplications + dashboard.OverdueCredits).ToString();
                    
                    // Debug: Log payment count
                    System.Diagnostics.Debug.WriteLine($"PaymentsDueList count: {dashboard.PaymentsDueList?.Count ?? 0}");
                }
                else
                {
                    // Fallback to default values if API call fails
                    ActiveCreditsText.Text = "0";
                    PortfolioAmountText.Text = "0 HTG";
                    PendingApplicationsText.Text = "0";
                    RepaymentRateText.Text = "0%";
                    NotificationBadge.Text = "0";
                }

                // Set user name (will be updated from login session)
                UserNameText.Text = "Agent de Crédit";

                // Load applications from API
                var applicationsResult = await _apiService.GetMicrocreditApplicationsAsync(page: 1, pageSize: 5);
                if (applicationsResult?.Data?.Applications != null && applicationsResult.Data.Applications.Count > 0)
                {
                    var recentApps = new ObservableCollection<LoanApplication>();
                    foreach (var app in applicationsResult.Data.Applications)
                    {
                        recentApps.Add(new LoanApplication
                        {
                            ClientName = app.CustomerName ?? "N/A",
                            Amount = $"{app.RequestedAmount:N0} {app.Currency}",
                            Status = GetStatusText(app.Status)
                        });
                    }
                    RecentApplicationsGrid.ItemsSource = recentApps;
                }
                else
                {
                    RecentApplicationsGrid.ItemsSource = new ObservableCollection<LoanApplication>();
                }

                // Load payments due this week from dashboard
                if (dashboard?.PaymentsDueList != null && dashboard.PaymentsDueList.Count > 0)
                {
                    var paymentsDue = new ObservableCollection<PaymentDue>();
                    foreach (var payment in dashboard.PaymentsDueList)
                    {
                        // Debug logging
                        System.Diagnostics.Debug.WriteLine($"Payment - Borrower: '{payment.BorrowerName}', Amount: {payment.Amount}, Date: {payment.DueDate}");
                        
                        // Handle null or empty borrower name
                        var borrowerName = string.IsNullOrWhiteSpace(payment.BorrowerName) 
                            ? "N/A" 
                            : payment.BorrowerName;
                            
                        // Format due date, handle invalid dates
                        var dueDate = payment.DueDate != DateTime.MinValue 
                            ? payment.DueDate.ToString("dddd dd MMM", new System.Globalization.CultureInfo("fr-FR"))
                            : "N/A";
                            
                        // Format amount with currency
                        var amount = payment.Amount > 0 
                            ? $"{payment.Amount:N2} {payment.Currency}"
                            : "0 HTG";
                        
                        paymentsDue.Add(new PaymentDue
                        {
                            ClientName = borrowerName,
                            DueDate = dueDate,
                            Amount = amount
                        });
                    }
                    PaymentsDueList.ItemsSource = paymentsDue;
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("No payments due this week");
                    PaymentsDueList.ItemsSource = new ObservableCollection<PaymentDue>();
                }

                // Load visits (placeholder - would need specific API endpoint)
                TodayVisitsList.ItemsSource = new ObservableCollection<ScheduledVisit>();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement des données: {ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private string GetStatusText(string status)
        {
            return status switch
            {
                "Submitted" => "En Attente",
                "Approved" => "Approuvé",
                "UnderReview" => "En Révision",
                "Rejected" => "Rejeté",
                "Disbursed" => "Décaissé",
                _ => status
            };
        }

        // Menu Navigation Events
        private async void Dashboard_Click(object sender, RoutedEventArgs e)
        {
            await LoadDashboardDataAsync();
        }

        private void Transactions_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module Transactions - Accès aux fonctions de caissier\n\n" +
                          "Fonctionnalités disponibles:\n" +
                          "• Dépôts\n" +
                          "• Retraits\n" +
                          "• Transferts\n" +
                          "• Change de devises",
                          "Transactions",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void NewLoanApplication_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var createRequestWindow = new CreateCreditRequestWindow(_apiService);
                createRequestWindow.Owner = this;
                createRequestWindow.ShowDialog();
                
                // Refresh dashboard after creating a request
                _ = LoadDashboardDataAsync();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'ouverture du formulaire:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void MyApplications_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📋 Mes Demandes de Crédit\n\n" +
                          "Liste de toutes vos demandes:\n" +
                          "• En attente d'évaluation\n" +
                          "• En révision\n" +
                          "• Approuvées\n" +
                          "• Rejetées\n" +
                          "• Décaissées\n\n" +
                          "Filtres: Statut, Date, Montant, Client",
                          "Mes Demandes",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void RecordPayment_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var recouvrementWindow = new RecouvrementWindow(_apiService);
                recouvrementWindow.Owner = this;
                recouvrementWindow.ShowDialog();
                
                // Refresh dashboard after recording payment
                _ = LoadDashboardDataAsync();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'ouverture du module de recouvrement:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void MyPortfolio_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("👥 Mon Portefeuille Clients\n\n" +
                          "Vue d'ensemble:\n" +
                          "• Liste complète de vos clients\n" +
                          "• Crédits actifs par client\n" +
                          "• Historique de remboursement\n" +
                          "• Clients en retard\n" +
                          "• Performance globale\n\n" +
                          "Indicateurs:\n" +
                          "• Nombre de clients actifs\n" +
                          "• Encours total\n" +
                          "• Taux de remboursement\n" +
                          "• PAR (Portfolio At Risk)\n" +
                          "• Nombre de crédits",
                          "Mon Portefeuille",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void ScheduledVisits_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("🗺️ Visites Terrain Planifiées\n\n" +
                          "Gestion des visites:\n" +
                          "• Calendrier de visites\n" +
                          "• Planifier nouvelle visite\n" +
                          "• Itinéraire optimisé\n" +
                          "• Clients à visiter\n" +
                          "• Historique des visites\n\n" +
                          "Pour chaque visite:\n" +
                          "• Client et adresse\n" +
                          "• Objectif de la visite\n" +
                          "• GPS/Map intégré\n" +
                          "• Check-in/Check-out\n" +
                          "• Rapport de visite",
                          "Visites Planifiées",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void ClientEvaluation_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("✅ Évaluation Client\n\n" +
                          "Formulaire d'évaluation terrain:\n\n" +
                          "1. INFORMATIONS COMMERCIALES:\n" +
                          "   • Type d'activité\n" +
                          "   • Localisation du commerce\n" +
                          "   • Années d'expérience\n" +
                          "   • Chiffre d'affaires estimé\n\n" +
                          "2. CAPACITÉ DE REMBOURSEMENT:\n" +
                          "   • Revenus quotidiens\n" +
                          "   • Dépenses quotidiennes\n" +
                          "   • Marge bénéficiaire\n" +
                          "   • Autres sources de revenus\n\n" +
                          "3. ENVIRONNEMENT:\n" +
                          "   • Photos du commerce\n" +
                          "   • Photos du stock\n" +
                          "   • Photos du domicile\n" +
                          "   • Géolocalisation\n\n" +
                          "4. ÉVALUATION SOCIALE:\n" +
                          "   • Situation familiale\n" +
                          "   • Personnes à charge\n" +
                          "   • Références communautaires\n" +
                          "   • Historique de crédit\n\n" +
                          "5. RECOMMANDATION:\n" +
                          "   • Montant recommandé\n" +
                          "   • Durée suggérée\n" +
                          "   • Niveau de risque\n" +
                          "   • Commentaires",
                          "Évaluation Client",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void FieldDocuments_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📸 Photos et Documents Terrain\n\n" +
                          "Gestion des documents:\n\n" +
                          "PHOTOS:\n" +
                          "• Photo du commerce/activité\n" +
                          "• Photo du stock/inventaire\n" +
                          "• Photo du domicile\n" +
                          "• Photo avec le client\n" +
                          "• Photos des garanties\n\n" +
                          "DOCUMENTS:\n" +
                          "• Scan de la carte d'identité\n" +
                          "• Justificatifs de domicile\n" +
                          "• Références\n" +
                          "• Formulaires signés\n\n" +
                          "FONCTIONNALITÉS:\n" +
                          "• Prise de photo directe\n" +
                          "• Upload depuis galerie\n" +
                          "• Géolocalisation automatique\n" +
                          "• Date/Heure automatique\n" +
                          "• Commentaires sur photos\n" +
                          "• Envoi au serveur",
                          "Photos et Documents",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void Performance_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📊 Rapport de Performance\n\n" +
                          "VUE D'ENSEMBLE:\n" +
                          "• Nombre de demandes soumises\n" +
                          "• Taux d'approbation\n" +
                          "• Montant total décaissé\n" +
                          "• Nombre de clients actifs\n\n" +
                          "QUALITÉ DU PORTEFEUILLE:\n" +
                          "• Taux de remboursement\n" +
                          "• PAR 30 (Portfolio At Risk)\n" +
                          "• Nombre de clients en retard\n" +
                          "• Montant en retard\n\n" +
                          "ACTIVITÉ TERRAIN:\n" +
                          "• Nombre de visites effectuées\n" +
                          "• Évaluations complétées\n" +
                          "• Taux de conversion\n\n" +
                          "ÉVOLUTION:\n" +
                          "• Graphiques mensuels\n" +
                          "• Comparaison avec objectifs\n" +
                          "• Tendances",
                          "Performance Agent",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void RepaymentRate_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📉 Analyse Taux de Remboursement\n\n" +
                          "INDICATEURS GLOBAUX:\n" +
                          "• Taux de remboursement global: 94.5%\n" +
                          "• Nombre de crédits à jour: 21/23\n" +
                          "• Nombre de crédits en retard: 2\n\n" +
                          "DÉTAILS PAR RETARD:\n" +
                          "• Retard 1-7 jours: 1 client\n" +
                          "• Retard 8-30 jours: 1 client\n" +
                          "• Retard 30+ jours: 0 client\n\n" +
                          "ACTIONS REQUISES:\n" +
                          "• Clients à relancer\n" +
                          "• Visites de suivi nécessaires\n" +
                          "• Plans de restructuration\n\n" +
                          "ÉVOLUTION:\n" +
                          "• Graphique 6 derniers mois\n" +
                          "• Comparaison avec autres agents\n" +
                          "• Objectifs de performance",
                          "Taux de Remboursement",
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
    }

    // Data Models
    public class LoanApplication
    {
        public string ClientName { get; set; } = string.Empty;
        public string Amount { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public class PaymentDue
    {
        public string ClientName { get; set; } = string.Empty;
        public string DueDate { get; set; } = string.Empty;
        public string Amount { get; set; } = string.Empty;
    }

    public class ScheduledVisit
    {
        public string Time { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
    }
}
