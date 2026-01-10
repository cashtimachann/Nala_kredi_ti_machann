using System;
using System.Windows;
using System.Windows.Threading;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;
using NalaCreditDesktop.ViewModels;

namespace NalaCreditDesktop.Views
{
    public partial class CreditAgentDashboard : Window
    {
        private readonly ApiService _apiService;
        private readonly CreditAgentDashboardViewModel _viewModel;
        private DispatcherTimer? _timer;

        public CreditAgentDashboard(ApiService? apiService = null)
        {
            InitializeComponent();
            
            _apiService = apiService ?? AppServices.GetRequiredApiService();
            _viewModel = new CreditAgentDashboardViewModel(_apiService);
            DataContext = _viewModel;
            
            InitializeDashboard();
            SetupEventHandlers();
            StartTimer();
            
            _ = LoadDashboardDataAsync();
        }

        private void InitializeDashboard()
        {
            var user = _apiService.CurrentUser;
            if (user != null)
            {
                OfficerNameText.Text = $"{user.FirstName} {user.LastName}";
                BranchNameText.Text = $"Succursale: {user.BranchName ?? "N/A"}";
            }

            UpdateDateTime();
        }

        private void SetupEventHandlers()
        {
            // Header buttons
            LogoutButton.Click += Logout_Click;
            RefreshButton.Click += Refresh_Click;

            // Menu buttons
            DashboardButton.Click += Dashboard_Click;
            NewApplicationButton.Click += NewApplication_Click;
            MyApplicationsButton.Click += MyApplications_Click;
            PendingReviewButton.Click += PendingReview_Click;
            ActiveLoansButton.Click += ActiveLoans_Click;
            OverdueLoansButton.Click += OverdueLoans_Click;
            PaymentsButton.Click += Payments_Click;
            BorrowersButton.Click += Borrowers_Click;
            SearchBorrowerButton.Click += SearchBorrower_Click;
            MyPerformanceButton.Click += MyPerformance_Click;
            PortfolioReportButton.Click += PortfolioReport_Click;

            // Quick action buttons
            QuickNewApplicationButton.Click += NewApplication_Click;
            QuickRecordPaymentButton.Click += RecordPayment_Click;
            QuickSearchButton.Click += SearchBorrower_Click;
            QuickReportButton.Click += MyPerformance_Click;

            // List buttons
            ViewAllApplicationsButton.Click += MyApplications_Click;
            ViewOverdueLoansButton.Click += OverdueLoans_Click;

            // Bind data grids to view model
            RecentApplicationsDataGrid.ItemsSource = _viewModel.RecentApplications;
            UpcomingPaymentsDataGrid.ItemsSource = _viewModel.UpcomingPayments;
            OverdueLoansDataGrid.ItemsSource = _viewModel.OverdueLoans;
            RecentActivitiesListView.ItemsSource = _viewModel.RecentActivities;
            BranchLoansDataGrid.ItemsSource = _viewModel.BranchLoans;
        }

        private void StartTimer()
        {
            _timer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(1)
            };
            _timer.Tick += Timer_Tick;
            _timer.Start();
        }

        private void Timer_Tick(object? sender, EventArgs e)
        {
            UpdateDateTime();
        }

        private void UpdateDateTime()
        {
            var now = DateTime.Now;
            TimeText.Text = now.ToString("HH:mm:ss");
            DateText.Text = now.ToString("dd/MM/yyyy");
        }

        private async System.Threading.Tasks.Task LoadDashboardDataAsync()
        {
            try
            {
                await _viewModel.LoadAsync();
                
                // Update UI with view model data
                PendingApplicationsText.Text = _viewModel.PendingApplicationsCount.ToString();
                ActiveLoansText.Text = _viewModel.ActiveLoansCount.ToString();
                OverdueLoansText.Text = _viewModel.OverdueLoansCount.ToString();
                RepaymentRateText.Text = $"{_viewModel.RepaymentRate:F0}%";
                
                PortfolioAmountText.Text = $"{_viewModel.TotalPortfolioAmount:N0} HTG";
                ApprovedThisMonthText.Text = _viewModel.ApprovedThisMonthCount.ToString();
                ApprovalRateText.Text = $"{_viewModel.ApprovalRatePercent}%";
                
                PendingCountBadge.Text = _viewModel.PendingApplicationsCount.ToString();
                OverdueCountBadge.Text = _viewModel.OverdueLoansCount.ToString();
                
                PaymentsThisWeekTotalText.Text = $"{_viewModel.PaymentsThisWeekAmount:N0} HTG";

                LastRefreshText.Text = $"Dernière mise à jour: {_viewModel.LastUpdated:HH:mm:ss}";

                ConnectionStatusText.Text = _viewModel.ConnectionStatus;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement du dashboard: {ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        #region Event Handlers

        private void Notification_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("🔔 Notifications\n\n" +
                          "• 3 demandes en attente de révision\n" +
                          "• 2 paiements attendus cette semaine\n" +
                          "• 1 crédit en retard nécessite suivi",
                          "Notifications",
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
                _timer?.Stop();
                
                var loginWindow = new LoginWindow();
                loginWindow.Show();
                this.Close();
            }
        }

        private async void Refresh_Click(object sender, RoutedEventArgs e)
        {
            await LoadDashboardDataAsync();
        }

        private void Dashboard_Click(object sender, RoutedEventArgs e)
        {
            // Already on dashboard
        }

        private void NewApplication_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var window = new CreateCreditRequestWindow(_apiService);
                window.Owner = this;
                var result = window.ShowDialog();
                
                if (result == true)
                {
                    // Refresh dashboard after creating new application
                    _ = LoadDashboardDataAsync();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur",
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void MyApplications_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var window = new MyApplicationsWindow(_apiService);
                window.Owner = this;
                window.ShowDialog();

                // Refresh after returning
                _ = LoadDashboardDataAsync();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur",
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void PendingReview_Click(object sender, RoutedEventArgs e)
        {
            // Open applications window with "Submitted" filter
            try
            {
                var user = _apiService.CurrentUser;
                var window = new MyApplicationsWindow(_apiService, user?.BranchId ?? 0, 
                    user?.BranchName ?? "Succursale", 
                    user?.Id ?? "", 
                    initialStatus: "Submitted");
                window.Owner = this;
                window.ShowDialog();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'ouverture des demandes en attente: {ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void ActiveLoans_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var branchId = _apiService.CurrentUser?.BranchId;
                var branchName = _apiService.CurrentUser?.BranchName;

                var window = new ActiveLoansWindow(_apiService, branchId, branchName);
                window.Owner = this;
                window.ShowDialog();

                // Refresh dashboard after closing
                _ = LoadDashboardDataAsync();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur",
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void OverdueLoans_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("⚠️ Crédits en Retard\n\n" +
                          "Cette fonctionnalité permet de:\n" +
                          "• Voir tous vos crédits en retard\n" +
                          "• Suivre les paiements manqués\n" +
                          "• Enregistrer les actions de recouvrement\n" +
                          "• Générer des rappels de paiement\n\n" +
                          "Fonctionnalité en cours de développement.",
                          "Crédits en Retard",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void Payments_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("💵 Gestion des Paiements\n\n" +
                          "Cette fonctionnalité permet de:\n" +
                          "• Enregistrer les paiements reçus\n" +
                          "• Voir l'historique des paiements\n" +
                          "• Gérer les échéanciers\n" +
                          "• Suivre les paiements anticipés\n\n" +
                          "Fonctionnalité en cours de développement.",
                          "Gestion des Paiements",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void RecordPayment_Click(object sender, RoutedEventArgs e)
        {
            Payments_Click(sender, e);
        }

        private void Borrowers_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("👥 Liste des Emprunteurs\n\n" +
                          "Cette fonctionnalité permet de:\n" +
                          "• Voir tous vos emprunteurs\n" +
                          "• Consulter leur historique de crédit\n" +
                          "• Voir les informations de contact\n" +
                          "• Suivre les performances\n\n" +
                          "Fonctionnalité en cours de développement.",
                          "Mes Emprunteurs",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void SearchBorrower_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("🔍 Recherche de Client\n\n" +
                          "Recherchez un client par:\n" +
                          "• Nom ou prénom\n" +
                          "• Numéro de compte\n" +
                          "• Numéro de téléphone\n" +
                          "• Numéro d'identification\n\n" +
                          "Fonctionnalité en cours de développement.",
                          "Recherche de Client",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void MyPerformance_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📈 Ma Performance\n\n" +
                          $"STATISTIQUES DU MOIS:\n" +
                          $"• Demandes soumises: {_viewModel.ApprovedThisMonthCount + _viewModel.PendingApplicationsCount}\n" +
                          $"• Demandes approuvées: {_viewModel.ApprovedThisMonthCount}\n" +
                          $"• Taux d'approbation: {_viewModel.ApprovalRatePercent}%\n" +
                          $"• Crédits actifs: {_viewModel.ActiveLoansCount}\n" +
                          $"• Portefeuille: {_viewModel.TotalPortfolioAmount:N0} HTG\n" +
                          $"• Taux de remboursement: {_viewModel.RepaymentRate:F1}%\n" +
                          $"• Montant moyen: {_viewModel.AverageLoanAmount:N0} HTG\n\n" +
                          "POINTS FORTS:\n" +
                          "✅ Excellent taux de remboursement\n" +
                          "✅ Bon suivi du portefeuille\n\n" +
                          "POINTS À AMÉLIORER:\n" +
                          $"⚠️ {_viewModel.OverdueLoansCount} crédit(s) en retard à suivre\n" +
                          $"💵 Paiements attendus cette semaine: {_viewModel.PaymentsThisWeekAmount:N0} HTG",
                          "Ma Performance",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void PortfolioReport_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📊 Rapport de Portefeuille\n\n" +
                          "RÉSUMÉ DU PORTEFEUILLE:\n" +
                          $"• Total crédits actifs: {_viewModel.ActiveLoansCount}\n" +
                          $"• Valeur totale: {_viewModel.TotalPortfolioAmount:N0} HTG\n" +
                          $"• En retard: {_viewModel.OverdueLoansCount}\n" +
                          $"• Taux remboursement: {_viewModel.RepaymentRate:F1}%\n\n" +
                          "PAIEMENTS À VENIR (7 jours):\n" +
                          $"• Montant: {_viewModel.PaymentsThisWeekAmount:N0} HTG\n\n" +
                          "Rapport détaillé en cours de développement.",
                          "Rapport de Portefeuille",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        #endregion

        protected override void OnClosed(EventArgs e)
        {
            base.OnClosed(e);
            _timer?.Stop();
        }
    }
}
