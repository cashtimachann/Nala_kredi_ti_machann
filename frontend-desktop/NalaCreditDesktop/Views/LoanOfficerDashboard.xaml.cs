using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class LoanOfficerDashboard : Window
    {
        private readonly ApiService _apiService;
        private DispatcherTimer? _timer;
        private ObservableCollection<ApplicationDisplayItem> _recentApplications = new ObservableCollection<ApplicationDisplayItem>();
        private ObservableCollection<ApplicationDisplayItem> _allApplications = new ObservableCollection<ApplicationDisplayItem>();
        private int _currentPage = 1;
        private int _totalPages = 1;
        private const int _pageSize = 20;

        public LoanOfficerDashboard(ApiService? apiService = null)
        {
            InitializeComponent();
            _apiService = apiService ?? AppServices.GetRequiredApiService();
            
            InitializeDashboard();
            SetupEventHandlers();
            StartTimer();
            
            RecentApplicationsDataGrid.ItemsSource = _recentApplications;
            AllApplicationsDataGrid.ItemsSource = _allApplications;
            
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
            NotificationButton.Click += Notification_Click;
            LogoutButton.Click += Logout_Click;

            // Menu buttons
            DashboardButton.Click += Dashboard_Click;
            NewApplicationButton.Click += NewApplication_Click;
            PendingApplicationsButton.Click += PendingApplications_Click;
            AllApplicationsButton.Click += AllApplications_Click;
            ActiveLoansButton.Click += ActiveLoans_Click;
            OverdueLoansButton.Click += OverdueLoans_Click;
            PortfolioStatsButton.Click += PortfolioStats_Click;
            BorrowersButton.Click += Borrowers_Click;
            SearchBorrowerButton.Click += SearchBorrower_Click;
            MyReportsButton.Click += MyReports_Click;

            // Quick action buttons
            QuickNewApplicationButton.Click += NewApplication_Click;
            QuickReviewButton.Click += PendingApplications_Click;
            QuickSearchButton.Click += SearchBorrower_Click;
            QuickReportsButton.Click += MyReports_Click;

            // Dashboard buttons
            RefreshDashboardButton.Click += RefreshDashboard_Click;
            ApplyFiltersButton.Click += ApplyFilters_Click;

            // Pagination
            AppPrevPageButton.Click += AppPrevPage_Click;
            AppNextPageButton.Click += AppNextPage_Click;
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

        private async Task LoadDashboardDataAsync()
        {
            try
            {
                await LoadStatisticsAsync();
                await LoadRecentApplicationsAsync();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement du dashboard: {ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async Task LoadStatisticsAsync()
        {
            try
            {
                var branchId = _apiService.CurrentUser?.BranchId;
                
                // Get dashboard stats
                var statsResult = await _apiService.GetMicrocreditApplicationsAsync(1, 1000, null, null, branchId);
                
                if (statsResult.IsSuccess && statsResult.Data != null)
                {
                    var apps = statsResult.Data.Applications;
                    var now = DateTime.Now;
                    var thisMonth = new DateTime(now.Year, now.Month, 1);

                    // Pending applications
                    var pending = apps.Count(a => a.Status == "Submitted" || a.Status == "UnderReview");
                    PendingCountText.Text = pending.ToString();

                    // Approved this month
                    var approvedThisMonth = apps.Where(a => 
                        a.Status == "Approved" && 
                        a.ApprovedAt.HasValue && 
                        a.ApprovedAt.Value >= thisMonth).ToList();
                    
                    ApprovedCountText.Text = approvedThisMonth.Count.ToString();
                    var totalApproved = approvedThisMonth.Sum(a => a.ApprovedAmount ?? 0);
                    ApprovedAmountText.Text = $"{totalApproved:N2} HTG";

                    // Active loans (placeholder - would need actual loan data)
                    ActiveLoansCountText.Text = "0";
                    ActiveLoansAmountText.Text = "0.00 HTG";

                    // Overdue (placeholder - would need actual loan data)
                    OverdueCountText.Text = "0";
                    OverdueAmountText.Text = "0.00 HTG";
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error loading statistics: {ex.Message}");
            }
        }

        private async Task LoadRecentApplicationsAsync()
        {
            try
            {
                var branchId = _apiService.CurrentUser?.BranchId;
                
                var result = await _apiService.GetMicrocreditApplicationsAsync(
                    1, 10, "Submitted", null, branchId);

                _recentApplications.Clear();

                if (result.IsSuccess && result.Data != null)
                {
                    foreach (var app in result.Data.Applications.Take(10))
                    {
                        _recentApplications.Add(new ApplicationDisplayItem
                        {
                            Id = app.Id,
                            ApplicationNumber = app.ApplicationNumber,
                            CustomerName = app.CustomerName,
                            LoanTypeDisplay = FormatLoanType(app.LoanType),
                            RequestedAmount = app.RequestedAmount,
                            RequestedDurationMonths = app.RequestedDurationMonths,
                            StatusDisplay = FormatStatus(app.Status),
                            CreatedAt = app.CreatedAt
                        });
                    }

                    NoApplicationsText.Visibility = _recentApplications.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error loading recent applications: {ex.Message}");
            }
        }

        private async Task LoadAllApplicationsAsync()
        {
            try
            {
                var branchId = _apiService.CurrentUser?.BranchId;
                string? status = null;
                string? loanType = null;

                if (FilterStatusComboBox?.SelectedItem is ComboBoxItem statusItem && statusItem.Tag != null)
                {
                    var statusTag = statusItem.Tag.ToString();
                    if (!string.IsNullOrEmpty(statusTag))
                        status = statusTag;
                }

                if (FilterTypeComboBox?.SelectedItem is ComboBoxItem typeItem && typeItem.Tag != null)
                {
                    var typeTag = typeItem.Tag.ToString();
                    if (!string.IsNullOrEmpty(typeTag))
                        loanType = typeTag;
                }

                var result = await _apiService.GetMicrocreditApplicationsAsync(
                    _currentPage, _pageSize, status, loanType, branchId);

                _allApplications.Clear();

                if (result.IsSuccess && result.Data != null)
                {
                    foreach (var app in result.Data.Applications)
                    {
                        _allApplications.Add(new ApplicationDisplayItem
                        {
                            Id = app.Id,
                            ApplicationNumber = app.ApplicationNumber,
                            CustomerName = app.CustomerName,
                            LoanTypeDisplay = FormatLoanType(app.LoanType),
                            RequestedAmount = app.RequestedAmount,
                            RequestedDurationMonths = app.RequestedDurationMonths,
                            StatusDisplay = FormatStatus(app.Status),
                            CreatedAt = app.CreatedAt
                        });
                    }

                    _totalPages = result.Data.TotalPages;
                    UpdatePagination();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement: {ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void UpdatePagination()
        {
            AppPrevPageButton.IsEnabled = _currentPage > 1;
            AppNextPageButton.IsEnabled = _currentPage < _totalPages;
            AppPageInfoText.Text = $"Page {_currentPage} sur {_totalPages}";
        }

        private string FormatLoanType(MicrocreditLoanType loanType)
        {
            return loanType switch
            {
                MicrocreditLoanType.Personal => "Personnel",
                MicrocreditLoanType.Business => "Commercial",
                MicrocreditLoanType.Agriculture => "Agricole",
                MicrocreditLoanType.Education => "Éducation",
                MicrocreditLoanType.Housing => "Logement",
                MicrocreditLoanType.CreditAuto => "Auto",
                MicrocreditLoanType.CreditMoto => "Moto",
                MicrocreditLoanType.Equipment => "Équipement",
                MicrocreditLoanType.WorkingCapital => "Fonds de roulement",
                _ => loanType.ToString()
            };
        }

        private string FormatStatus(string status)
        {
            return status switch
            {
                "Draft" => "Brouillon",
                "Submitted" => "Soumis",
                "UnderReview" => "En révision",
                "Approved" => "Approuvé",
                "Rejected" => "Rejeté",
                "Disbursed" => "Décaissé",
                "Active" => "Actif",
                "Closed" => "Fermé",
                _ => status
            };
        }

        private void ShowContent(Grid targetGrid)
        {
            MainDashboardGrid.Visibility = Visibility.Collapsed;
            ApplicationsListGrid.Visibility = Visibility.Collapsed;

            if (targetGrid != null)
                targetGrid.Visibility = Visibility.Visible;
        }

        // Event Handlers
        private void Dashboard_Click(object sender, RoutedEventArgs e)
        {
            // Restore main dashboard content if showing other views
            if (MainContentScrollViewer.Content != null && MainContentScrollViewer.Content is not Grid)
            {
                MainContentScrollViewer.Content = null;
                ShowContent(MainDashboardGrid);
            }
            else
            {
                ShowContent(MainDashboardGrid);
            }
            _ = LoadDashboardDataAsync();
        }

        private void NewApplication_Click(object sender, RoutedEventArgs e)
        {
            var createWindow = new CreateCreditRequestWindow(_apiService);
            createWindow.Owner = this;
            if (createWindow.ShowDialog() == true)
            {
                _ = LoadDashboardDataAsync();
            }
        }

        private void PendingApplications_Click(object sender, RoutedEventArgs e)
        {
            FilterStatusComboBox.SelectedIndex = 1; // En Attente
            ShowContent(ApplicationsListGrid);
            _currentPage = 1;
            _ = LoadAllApplicationsAsync();
        }

        private void AllApplications_Click(object sender, RoutedEventArgs e)
        {
            FilterStatusComboBox.SelectedIndex = 0; // Tous
            ShowContent(ApplicationsListGrid);
            _currentPage = 1;
            _ = LoadAllApplicationsAsync();
        }

        private void ActiveLoans_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Clear main content and show Active Loans view
                MainContentScrollViewer.Content = null;
                
                var activeLoansView = new ActiveLoansView(_apiService);
                MainContentScrollViewer.Content = activeLoansView;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'ouverture du module Crédits Actifs:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void OverdueLoans_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Clear main content and show Overdue Loans view
                MainContentScrollViewer.Content = null;
                
                var overdueLoansView = new OverdueLoansView(_apiService);
                MainContentScrollViewer.Content = overdueLoansView;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'ouverture du module Retards de Paiement:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void PortfolioStats_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module de statistiques de portefeuille\n\nCette fonctionnalité sera implémentée prochainement.",
                "Mes Statistiques", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void Borrowers_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                MainContentScrollViewer.Content = null;
                var borrowersView = new BorrowersView(_apiService);
                MainContentScrollViewer.Content = borrowersView;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'ouverture du module:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void SearchBorrower_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                MainContentScrollViewer.Content = null;
                var searchBorrowerView = new SearchBorrowerView(_apiService);
                MainContentScrollViewer.Content = searchBorrowerView;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'ouverture du module:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void MyReports_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                MainContentScrollViewer.Content = null;
                var myReportsView = new MyReportsView(_apiService);
                MainContentScrollViewer.Content = myReportsView;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'ouverture du module Mes Rapports:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void RefreshDashboard_Click(object sender, RoutedEventArgs e)
        {
            await LoadDashboardDataAsync();
            MessageBox.Show("Dashboard actualisé!", "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private async void ApplyFilters_Click(object sender, RoutedEventArgs e)
        {
            _currentPage = 1;
            await LoadAllApplicationsAsync();
        }

        private async void AppPrevPage_Click(object sender, RoutedEventArgs e)
        {
            if (_currentPage > 1)
            {
                _currentPage--;
                await LoadAllApplicationsAsync();
            }
        }

        private async void AppNextPage_Click(object sender, RoutedEventArgs e)
        {
            if (_currentPage < _totalPages)
            {
                _currentPage++;
                await LoadAllApplicationsAsync();
            }
        }

        public void ViewApplication_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is Guid applicationId)
            {
                var viewWindow = new ViewCreditRequestWindow(_apiService, applicationId);
                viewWindow.Owner = this;
                viewWindow.ShowDialog();
            }
        }

        // Note: Les fonctions d'approbation et de rejet ont été retirées
        // Seul le manager peut approuver ou rejeter les demandes de crédit

        // Les fonctions d'approbation et de rejet ont été retirées
        // L'agent de crédit peut seulement soumettre et suivre les demandes
        // L'approbation/rejet est réservée au Manager de la succursale

        private void Notification_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Centre de notifications\n\n" +
                          "• Nouvelles demandes\n" +
                          "• Demandes nécessitant une action\n" +
                          "• Retards de paiement\n" +
                          "• Alertes importantes",
                          "Notifications", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void Logout_Click(object sender, RoutedEventArgs e)
        {
            var result = MessageBox.Show("Êtes-vous sûr de vouloir vous déconnecter?",
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
    }

    public class ApplicationDisplayItem
    {
        public Guid Id { get; set; }
        public string ApplicationNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string LoanTypeDisplay { get; set; } = string.Empty;
        public decimal RequestedAmount { get; set; }
        public int RequestedDurationMonths { get; set; }
        public string StatusDisplay { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
