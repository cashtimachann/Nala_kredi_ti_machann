using System;
using System.Collections.ObjectModel;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using System.Windows.Data;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class SecretaryDashboard : Window
    {
        private readonly ApiService _apiService;
        private DispatcherTimer? _timer;
        private ObservableCollection<RecentActivity> _recentActivities = new ObservableCollection<RecentActivity>();
        private ObservableCollection<Appointment> _appointments = new ObservableCollection<Appointment>();
        private ObservableCollection<SavingsCustomerResponseDto> _customers = new ObservableCollection<SavingsCustomerResponseDto>();
        private ObservableCollection<ClientAccountSummary> _accounts = new ObservableCollection<ClientAccountSummary>();
        private ObservableCollection<CreditRequestDisplayItem> _creditRequests = new ObservableCollection<CreditRequestDisplayItem>();
        private int _currentPage = 1;
        private int _totalPages = 1;
        private int _creditCurrentPage = 1;
        private int _creditTotalPages = 1;
        private const int _pageSize = 20;

        public SecretaryDashboard(ApiService? apiService = null)
        {
            InitializeComponent();
            _apiService = apiService ?? AppServices.GetRequiredApiService();
            InitializeDashboard();
            SetupEventHandlers();
            StartTimer();
            if (RecentActivitiesGrid != null)
                RecentActivitiesGrid.ItemsSource = _recentActivities;

            if (AppointmentsList != null)
                AppointmentsList.ItemsSource = _appointments;

            if (CustomersDataGrid != null)
                CustomersDataGrid.ItemsSource = _customers;

            if (AccountsDataGrid != null)
                AccountsDataGrid.ItemsSource = _accounts;
                
            if (CreditRequestsDataGrid != null)
                CreditRequestsDataGrid.ItemsSource = _creditRequests;
                
            _ = LoadDashboardDataAsync();
        }

        private void InitializeDashboard()
        {
            // Initialiser le nom du secrétaire et la succursale
            var user = _apiService.CurrentUser;
            var fullName = user != null
                ? $"{user.FirstName} {user.LastName}".Trim()
                : "Secrétaire";

            SecretaryNameText.Text = string.IsNullOrWhiteSpace(fullName) ? "Secrétaire" : fullName;
            BranchNameText.Text = user?.BranchName != null
                ? $"Succursale: {user.BranchName}"
                : "Succursale: --";

            // Mettre à jour la date et l'heure
            UpdateDateTime();
        }

        private void SetupEventHandlers()
        {
            // Menu principal
            if (DashboardButton != null)
                DashboardButton.Click += Dashboard_Click;

            // Gestion clients
            if (CreateCustomerButton != null)
                CreateCustomerButton.Click += CreateCustomer_Click;

            if (ClientListButton != null)
                ClientListButton.Click += ClientList_Click;

            if (NewAccountButton != null)
                NewAccountButton.Click += NewAccount_Click;

            if (UpdateClientButton != null)
                UpdateClientButton.Click += UpdateClient_Click;

            if (ConsultAccountButton != null)
                ConsultAccountButton.Click += ConsultAccount_Click;

            if (AccountListButton != null)
                AccountListButton.Click += AccountList_Click;

            // Documents
            if (KYCButton != null)
                KYCButton.Click += KYC_Click;

            if (DigitizationButton != null)
                DigitizationButton.Click += Digitization_Click;

            if (PassbookButton != null)
                PassbookButton.Click += Passbook_Click;

            if (PrintButton != null)
                PrintButton.Click += Print_Click;

            if (CustomerSearchButton != null)
                CustomerSearchButton.Click += CustomerSearchButton_Click;

            if (CustomerRefreshButton != null)
                CustomerRefreshButton.Click += CustomerRefreshButton_Click;

            if (AccountSearchButton != null)
                AccountSearchButton.Click += AccountSearchButton_Click;

            if (PrevPageButton != null)
                PrevPageButton.Click += PrevPageButton_Click;

            if (NextPageButton != null)
                NextPageButton.Click += NextPageButton_Click;

            if (FindName("ActualiserListeButton") is Button actualiserButton)
                actualiserButton.Click += AccountRefreshButton_Click;

            // Microcredit
            if (CreateCreditRequestButton != null)
                CreateCreditRequestButton.Click += CreateCreditRequest_Click;

            if (CreditRequestListButton != null)
                CreditRequestListButton.Click += CreditRequestList_Click;

            if (CreditSearchButton != null)
                CreditSearchButton.Click += CreditSearchButton_Click;

            if (CreditPrevPageButton != null)
                CreditPrevPageButton.Click += CreditPrevPageButton_Click;

            if (CreditNextPageButton != null)
                CreditNextPageButton.Click += CreditNextPageButton_Click;

            // Organisation
            if (AppointmentButton != null)
                AppointmentButton.Click += Appointment_Click;

            if (RequestsButton != null)
                RequestsButton.Click += Requests_Click;

            // Rapports
            if (ReportsButton != null)
                ReportsButton.Click += Reports_Click;

            // Header buttons
            if (NotificationButton != null)
                NotificationButton.Click += Notification_Click;

            if (LogoutButton != null)
                LogoutButton.Click += Logout_Click;
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
            if (TimeText != null)
                TimeText.Text = DateTime.Now.ToString("HH:mm:ss");

            if (DateText != null)
                DateText.Text = DateTime.Now.ToString("dd/MM/yyyy");
        }

        private async Task LoadDashboardDataAsync()
        {
            try
            {
                var savingsStatsResult = await _apiService.GetSavingsAccountStatisticsAsync();
                if (savingsStatsResult.IsSuccess && savingsStatsResult.Data != null)
                {
                    var stats = savingsStatsResult.Data;
                    if (AccountsCreatedText != null)
                        AccountsCreatedText.Text = stats.NewAccountsThisMonth.ToString("N0");

                    if (DocumentsProcessedText != null)
                        DocumentsProcessedText.Text = stats.TotalAccounts.ToString("N0");
                }
                else
                {
                    if (AccountsCreatedText != null)
                        AccountsCreatedText.Text = "--";

                    if (DocumentsProcessedText != null)
                        DocumentsProcessedText.Text = "--";
                }

                var microcreditStatsResult = await _apiService.GetMicrocreditDashboardStatsAsync();
                if (microcreditStatsResult.IsSuccess && microcreditStatsResult.Data != null)
                {
                    var micro = microcreditStatsResult.Data;

                    if (AppointmentsText != null)
                        AppointmentsText.Text = micro.NewLoansThisMonth.ToString("N0");

                    if (PendingRequestsText != null)
                        PendingRequestsText.Text = micro.OverdueLoans?.Count.ToString("N0") ?? "0";

                    // Map branch performance to lightweight “activities” and “appointments” lists
                    if (micro.BranchPerformance != null)
                    {
                        _recentActivities.Clear();
                        foreach (var branch in micro.BranchPerformance)
                        {
                            _recentActivities.Add(new RecentActivity
                            {
                                Time = micro.GeneratedAt.ToLocalTime().ToString("HH:mm"),
                                Type = "Performance succursale",
                                Description = $"{branch.BranchName}: {branch.TotalLoans} prêts, remboursements {branch.RepaymentRate:P0}",
                                Status = branch.Par30 > 0 ? "⚠️ Suivi" : "✅ Stable"
                            });
                        }

                        if (RecentActivitiesGrid != null)
                            RecentActivitiesGrid.ItemsSource = _recentActivities;

                        _appointments.Clear();
                        foreach (var branch in micro.BranchPerformance)
                        {
                            _appointments.Add(new Appointment
                            {
                                Time = micro.GeneratedAt.ToLocalTime().ToString("dd/MM HH:mm"),
                                ClientName = branch.BranchName,
                                Purpose = $"Nouv. prêts: {branch.TotalLoans}, PAR30: {branch.Par30:P0}"
                            });
                        }

                        if (AppointmentsList != null)
                            AppointmentsList.ItemsSource = _appointments;
                    }
                }
                else
                {
                    if (AppointmentsText != null)
                        AppointmentsText.Text = "--";

                    if (PendingRequestsText != null)
                        PendingRequestsText.Text = "--";
                }

                // Branch daily report (net cash change today)
                var branchReportResult = await _apiService.GetMyBranchDailyReportAsync();
                if (branchReportResult.IsSuccess && branchReportResult.Data != null)
                {
                    var report = branchReportResult.Data;
                    if (NetCashTodayText != null)
                    {
                        // Use NetChangeHTG from cash balance if available, otherwise fallback to TotalDeposits - TotalWithdrawals
                        var net = report.CashBalance?.NetChangeHTG ?? (report.TotalDepositsHTG - report.TotalWithdrawalsHTG);
                        NetCashTodayText.Text = net.ToString("N0");
                    }
                }
                else
                {
                    if (NetCashTodayText != null)
                        NetCashTodayText.Text = "--";
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Échec du chargement du tableau de bord: {ex.Message}",
                                "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void LoadDashboardView()
        {
            try
            {
                var scrollViewer = MainContentScrollViewer;
                var mainDashboard = MainDashboardGrid;

                if (scrollViewer != null && mainDashboard != null)
                {
                    mainDashboard.Visibility = Visibility.Visible;
                    if (CustomersGrid != null) CustomersGrid.Visibility = Visibility.Collapsed;
                    _ = LoadDashboardDataAsync();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement du dashboard: {ex.Message}", 
                              "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        #region Event Handlers

        private void Dashboard_Click(object sender, RoutedEventArgs e)
        {
            LoadDashboardView();
        }

        private void CreateCustomer_Click(object sender, RoutedEventArgs e)
        {
            var createCustomerWindow = new CreateCustomerWindow(_apiService);
            createCustomerWindow.Owner = this;
            createCustomerWindow.ShowDialog();
        }

        private void ClientList_Click(object sender, RoutedEventArgs e)
        {
            ShowCustomersView();
        }

        private void NewAccount_Click(object sender, RoutedEventArgs e)
        {
            var openAccountWindow = new OpenAccountWindow(_apiService);
            openAccountWindow.Owner = this;
            openAccountWindow.ShowDialog();
        }

        private void UpdateClient_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var window = new UpdateCustomerWindow(_apiService);
                window.Owner = this;
                window.ShowDialog();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Impossible d'ouvrir la mise à jour client: {ex.Message}", "Mise à Jour Client", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void ConsultAccount_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var window = new ConsultationCompteWindow(_apiService);
                window.Owner = this;

                var term = AccountSearchTextBox?.Text?.Trim();
                if (!string.IsNullOrWhiteSpace(term))
                {
                    window.PrefillSearch(term);
                }

                window.ShowDialog();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'ouverture de la consultation:\n{ex.Message}", "Consultation compte", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void AccountList_Click(object sender, RoutedEventArgs e)
        {
            ShowAccountsView();
        }

        private void KYC_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module de gestion des documents KYC\n\nFonctionnalités:\n" +
                          "• Gestion des pièces d'identité\n" +
                          "• Justificatifs de domicile\n" +
                          "• Documents professionnels\n" +
                          "• Validation et conformité\n" +
                          "• Archivage sécurisé", 
                          "Documents KYC", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void Digitization_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module de numérisation et archivage\n\nFonctionnalités:\n" +
                          "• Scan de documents\n" +
                          "• OCR (reconnaissance de texte)\n" +
                          "• Indexation automatique\n" +
                          "• Stockage sécurisé\n" +
                          "• Recherche rapide", 
                          "Numérisation", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void Passbook_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module d'émission de livrets d'épargne\n\nFonctionnalités:\n" +
                          "• Création de livrets\n" +
                          "• Impression personnalisée\n" +
                          "• Numérotation automatique\n" +
                          "• Suivi des émissions\n" +
                          "• Renouvellement", 
                          "Livrets d'Épargne", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void Print_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                MainContentScrollViewer.Content = null;
                var printDocumentsView = new PrintDocumentsView(_apiService);
                MainContentScrollViewer.Content = printDocumentsView;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'ouverture du module Impression:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void Appointment_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module de gestion des rendez-vous\n\nFonctionnalités:\n" +
                          "• Planification de rendez-vous\n" +
                          "• Calendrier interactif\n" +
                          "• Rappels automatiques\n" +
                          "• Gestion des salles\n" +
                          "• Confirmation et annulation", 
                          "Rendez-vous", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void CreateCreditRequest_Click(object sender, RoutedEventArgs e)
        {
            var createCreditRequestWindow = new CreateCreditRequestWindow(_apiService);
            createCreditRequestWindow.Owner = this;
            if (createCreditRequestWindow.ShowDialog() == true)
            {
                // Reload credit requests if on that view
                if (CreditRequestListGrid.Visibility == Visibility.Visible)
                {
                    _ = LoadCreditRequestsAsync();
                }
            }
        }

        private void CreditRequestList_Click(object sender, RoutedEventArgs e)
        {
            ShowContent(CreditRequestListGrid);
            _ = LoadCreditRequestsAsync();
        }

        private async void CreditSearchButton_Click(object sender, RoutedEventArgs e)
        {
            _creditCurrentPage = 1;
            await LoadCreditRequestsAsync();
        }

        private async void CreditPrevPageButton_Click(object sender, RoutedEventArgs e)
        {
            if (_creditCurrentPage > 1)
            {
                _creditCurrentPage--;
                await LoadCreditRequestsAsync();
            }
        }

        private async void CreditNextPageButton_Click(object sender, RoutedEventArgs e)
        {
            if (_creditCurrentPage < _creditTotalPages)
            {
                _creditCurrentPage++;
                await LoadCreditRequestsAsync();
            }
        }

        private void ViewCreditRequest_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is Guid applicationId)
            {
                var viewWindow = new ViewCreditRequestWindow(_apiService, applicationId);
                viewWindow.Owner = this;
                viewWindow.ShowDialog();
            }
        }

        private async Task LoadCreditRequestsAsync()
        {
            try
            {
                CreditRequestsDataGrid.IsEnabled = false;
                
                // Get filters
                var searchText = CreditSearchTextBox?.Text?.Trim();
                string? status = null;
                string? loanType = null;

                if (CreditStatusComboBox?.SelectedItem is ComboBoxItem statusItem && statusItem.Tag != null)
                {
                    var statusTag = statusItem.Tag.ToString();
                    if (!string.IsNullOrEmpty(statusTag))
                        status = statusTag;
                }

                if (CreditTypeComboBox?.SelectedItem is ComboBoxItem typeItem && typeItem.Tag != null)
                {
                    var typeTag = typeItem.Tag.ToString();
                    if (!string.IsNullOrEmpty(typeTag))
                        loanType = typeTag;
                }

                // Get branch ID from current user
                var branchId = _apiService.CurrentUser?.BranchId;

                // Call API to get credit requests
                var result = await _apiService.GetMicrocreditApplicationsAsync(
                    _creditCurrentPage, 
                    _pageSize, 
                    status, 
                    loanType, 
                    branchId);

                _creditRequests.Clear();

                if (result.IsSuccess && result.Data != null)
                {
                    foreach (var app in result.Data.Applications)
                    {
                        // Filter by search text if provided
                        if (!string.IsNullOrEmpty(searchText))
                        {
                            if (!app.SavingsAccountNumber.Contains(searchText, StringComparison.OrdinalIgnoreCase) &&
                                !app.CustomerName.Contains(searchText, StringComparison.OrdinalIgnoreCase))
                            {
                                continue;
                            }
                        }

                        _creditRequests.Add(new CreditRequestDisplayItem
                        {
                            Id = app.Id,
                            ApplicationNumber = app.ApplicationNumber,
                            SavingsAccountNumber = app.SavingsAccountNumber,
                            CustomerName = app.CustomerName,
                            LoanTypeDisplay = FormatLoanType(app.LoanType),
                            RequestedAmount = app.RequestedAmount,
                            RequestedDurationMonths = app.RequestedDurationMonths,
                            StatusDisplay = FormatStatus(app.Status),
                            CreatedAt = app.CreatedAt
                        });
                    }

                    // Update pagination
                    _creditTotalPages = result.Data.TotalPages;
                }
                else
                {
                    MessageBox.Show($"Erreur: {result.ErrorMessage}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }

                CreditPrevPageButton.IsEnabled = _creditCurrentPage > 1;
                CreditNextPageButton.IsEnabled = _creditCurrentPage < _creditTotalPages;
                CreditPageInfoText.Text = $"Page {_creditCurrentPage} sur {_creditTotalPages} ({_creditRequests.Count} demandes)";
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement des demandes de crédit: {ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                CreditRequestsDataGrid.IsEnabled = true;
            }
        }

        private string FormatLoanType(MicrocreditLoanType loanType)
        {
            return loanType switch
            {
                MicrocreditLoanType.Commercial => "Crédit Commercial",
                MicrocreditLoanType.Agricultural => "Crédit Agricole",
                MicrocreditLoanType.Personal => "Crédit Personnel",
                MicrocreditLoanType.Emergency => "Crédit d'Urgence",
                MicrocreditLoanType.CreditLoyer => "Crédit Loyer",
                MicrocreditLoanType.CreditAuto => "Crédit Auto",
                MicrocreditLoanType.CreditMoto => "Crédit Moto",
                MicrocreditLoanType.CreditPersonnel => "Crédit Personnel (Alt)",
                MicrocreditLoanType.CreditScolaire => "Crédit Scolaire",
                MicrocreditLoanType.CreditAgricole => "Crédit Agricole (Alt)",
                MicrocreditLoanType.CreditProfessionnel => "Crédit Professionnel",
                MicrocreditLoanType.CreditAppui => "Crédit d'Appui",
                MicrocreditLoanType.CreditHypothecaire => "Crédit Hypothécaire",
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

        private void Requests_Click(object sender, RoutedEventArgs e)
        {
            var createCreditRequestWindow = new CreateCreditRequestWindow(_apiService);
            createCreditRequestWindow.Owner = this;
            createCreditRequestWindow.ShowDialog();
        }

        private void Reports_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module de rapports\n\nFonctionnalités:\n" +
                          "• Rapport d'activité quotidien\n" +
                          "• Statistiques de création de comptes\n" +
                          "• Documents traités\n" +
                          "• Performance individuelle\n" +
                          "• Export Excel/PDF", 
                          "Rapports", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void Notification_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Centre de notifications\n\n" +
                          "• Nouvelles demandes clients\n" +
                          "• Rappels de rendez-vous\n" +
                          "• Documents à valider\n" +
                          "• Alertes système", 
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

        private void CustomerSearchButton_Click(object sender, RoutedEventArgs e)
        {
            var term = CustomerSearchTextBox?.Text?.Trim();
            _ = LoadCustomersAsync(term);
        }

        private void CustomerRefreshButton_Click(object sender, RoutedEventArgs e)
        {
            if (CustomerSearchTextBox != null)
            {
                CustomerSearchTextBox.Text = string.Empty;
            }
            _ = LoadCustomersAsync();
        }

        private void ShowCustomersView()
        {
            try
            {
                if (MainDashboardGrid != null)
                    MainDashboardGrid.Visibility = Visibility.Collapsed;

                if (AccountsGrid != null)
                    AccountsGrid.Visibility = Visibility.Collapsed;

                if (CreditRequestListGrid != null)
                    CreditRequestListGrid.Visibility = Visibility.Collapsed;

                if (CustomersGrid != null)
                {
                    CustomersGrid.Visibility = Visibility.Visible;
                    _ = LoadCustomersAsync();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement de la liste clients: {ex.Message}",
                                "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void ShowAccountsView()
        {
            try
            {
                if (MainDashboardGrid != null)
                    MainDashboardGrid.Visibility = Visibility.Collapsed;

                if (CustomersGrid != null)
                    CustomersGrid.Visibility = Visibility.Collapsed;

                if (CreditRequestListGrid != null)
                    CreditRequestListGrid.Visibility = Visibility.Collapsed;

                if (AccountsGrid != null)
                {
                    AccountsGrid.Visibility = Visibility.Visible;
                    _ = LoadAccountsAsync();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement de la liste comptes: {ex.Message}",
                                "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void ShowContent(Grid targetGrid)
        {
            // Hide all grids
            if (MainDashboardGrid != null)
                MainDashboardGrid.Visibility = Visibility.Collapsed;
            if (CustomersGrid != null)
                CustomersGrid.Visibility = Visibility.Collapsed;
            if (AccountsGrid != null)
                AccountsGrid.Visibility = Visibility.Collapsed;
            if (CreditRequestListGrid != null)
                CreditRequestListGrid.Visibility = Visibility.Collapsed;

            // Show target grid
            if (targetGrid != null)
                targetGrid.Visibility = Visibility.Visible;
        }

        private async Task LoadCustomersAsync(string? searchTerm = null)
        {
            try
            {
                _customers.Clear();

                // Keep a small set to avoid duplicates when combining ID + search results
                var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                if (!string.IsNullOrWhiteSpace(searchTerm) && searchTerm.Length >= 2)
                {
                    // 1) Try direct lookup by ID/code
                    var byId = await _apiService.GetSavingsCustomerByIdAsync(searchTerm);
                    if (byId.IsSuccess && byId.Data != null)
                    {
                        _customers.Add(byId.Data);
                        if (!string.IsNullOrWhiteSpace(byId.Data.Id))
                            seen.Add(byId.Data.Id);
                    }

                    // 2) Fuzzy search (name, phone, doc)
                    var searchResult = await _apiService.SearchSavingsCustomersAsync(searchTerm);
                    if (searchResult.IsSuccess && searchResult.Data != null)
                    {
                        foreach (var customer in searchResult.Data)
                        {
                            var key = string.IsNullOrWhiteSpace(customer.Id) ? Guid.NewGuid().ToString() : customer.Id;
                            if (seen.Add(key))
                            {
                                _customers.Add(customer);
                            }
                        }
                    }

                    if (_customers.Count == 0 && !string.IsNullOrWhiteSpace(searchResult.ErrorMessage))
                    {
                        MessageBox.Show(searchResult.ErrorMessage, "Clients", MessageBoxButton.OK, MessageBoxImage.Warning);
                    }
                }
                else
                {
                    var listResult = await _apiService.GetSavingsCustomersAsync(1, 200);
                    if (listResult.IsSuccess && listResult.Data != null)
                    {
                        foreach (var customer in listResult.Data)
                        {
                            var key = string.IsNullOrWhiteSpace(customer.Id) ? Guid.NewGuid().ToString() : customer.Id;
                            if (seen.Add(key))
                            {
                                _customers.Add(customer);
                            }
                        }
                    }
                    else if (!string.IsNullOrWhiteSpace(listResult.ErrorMessage))
                    {
                        MessageBox.Show(listResult.ErrorMessage, "Clients", MessageBoxButton.OK, MessageBoxImage.Warning);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Impossible de charger les clients: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async Task LoadAccountsAsync(string? searchTerm = null, SavingsAccountStatus? status = null, ClientAccountType? accountType = null, int? page = null)
        {
            try
            {
                _accounts.Clear();

                _currentPage = page ?? _currentPage;

                var filter = new ClientAccountFilter
                {
                    Page = _currentPage,
                    PageSize = _pageSize,
                    SortBy = "AccountNumber",
                    SortDirection = "asc",
                    BranchId = _apiService.CurrentUser?.BranchId
                };

                if (!string.IsNullOrWhiteSpace(searchTerm))
                {
                    filter.Search = searchTerm;
                }

                if (status.HasValue)
                {
                    filter.Status = status.Value switch
                    {
                        SavingsAccountStatus.Active => "Active",
                        SavingsAccountStatus.Inactive => "Inactive",
                        SavingsAccountStatus.Suspended => "Suspended",
                        _ => null
                    };
                }

                if (accountType.HasValue)
                {
                    filter.AccountType = accountType.Value;
                }

                var result = await _apiService.GetClientAccountsAsync(filter);
                if (result.IsSuccess && result.Data != null)
                {
                    _totalPages = Math.Max(1, result.Data.TotalPages);
                    foreach (var account in result.Data.Accounts)
                    {
                        _accounts.Add(account);
                    }
                    UpdatePaginationControls();
                }
                else if (!string.IsNullOrWhiteSpace(result.ErrorMessage))
                {
                    MessageBox.Show(result.ErrorMessage, "Comptes", MessageBoxButton.OK, MessageBoxImage.Warning);
                    UpdatePaginationControls();
                }
                else
                {
                    _totalPages = 1;
                    UpdatePaginationControls();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Impossible de charger les comptes: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                _totalPages = 1;
                UpdatePaginationControls();
            }
        }

        private void AccountSearchButton_Click(object sender, RoutedEventArgs e)
        {
            var term = AccountSearchTextBox?.Text?.Trim();
            var statusText = (AccountStatusComboBox?.SelectedItem as ComboBoxItem)?.Content?.ToString();
            SavingsAccountStatus? status = null;
            if (!string.IsNullOrEmpty(statusText) && statusText != "Tous")
            {
                status = statusText switch
                {
                    "Actif" => SavingsAccountStatus.Active,
                    "Inactif" => SavingsAccountStatus.Inactive,
                    "Suspendu" => SavingsAccountStatus.Suspended,
                    _ => null
                };
            }
            var accountType = GetSelectedAccountType();
            _currentPage = 1;
            _ = LoadAccountsAsync(term, status, accountType, _currentPage);
        }

        private void AccountRefreshButton_Click(object sender, RoutedEventArgs e)
        {
            if (AccountSearchTextBox != null)
            {
                AccountSearchTextBox.Text = string.Empty;
            }
            if (AccountStatusComboBox != null)
            {
                AccountStatusComboBox.SelectedIndex = 0; // Select "Tous"
            }
            if (AccountTypeComboBox != null)
            {
                AccountTypeComboBox.SelectedIndex = 0;
            }
            _currentPage = 1;
            _ = LoadAccountsAsync();
        }

        private ClientAccountType? GetSelectedAccountType()
        {
            var typeText = (AccountTypeComboBox?.SelectedItem as ComboBoxItem)?.Content?.ToString();
            if (string.IsNullOrWhiteSpace(typeText) || typeText == "Tous")
                return null;

            return typeText switch
            {
                "Épargne" => ClientAccountType.Savings,
                "Courant" => ClientAccountType.Current,
                "Épargne à Terme" => ClientAccountType.TermSavings,
                _ => null
            };
        }

        private void PrevPageButton_Click(object sender, RoutedEventArgs e)
        {
            if (_currentPage > 1)
            {
                _currentPage--;
                TriggerAccountReloadForCurrentFilters();
            }
        }

        private void NextPageButton_Click(object sender, RoutedEventArgs e)
        {
            if (_currentPage < _totalPages)
            {
                _currentPage++;
                TriggerAccountReloadForCurrentFilters();
            }
        }

        private void TriggerAccountReloadForCurrentFilters()
        {
            var term = AccountSearchTextBox?.Text?.Trim();
            var statusText = (AccountStatusComboBox?.SelectedItem as ComboBoxItem)?.Content?.ToString();
            SavingsAccountStatus? status = null;
            if (!string.IsNullOrEmpty(statusText) && statusText != "Tous")
            {
                status = statusText switch
                {
                    "Actif" => SavingsAccountStatus.Active,
                    "Inactif" => SavingsAccountStatus.Inactive,
                    "Suspendu" => SavingsAccountStatus.Suspended,
                    _ => null
                };
            }
            var accountType = GetSelectedAccountType();
            _ = LoadAccountsAsync(term, status, accountType, _currentPage);
        }

        private void UpdatePaginationControls()
        {
            if (PageInfoText != null)
            {
                PageInfoText.Text = $"Page {_currentPage} / {_totalPages}";
            }

            if (PrevPageButton != null)
                PrevPageButton.IsEnabled = _currentPage > 1;

            if (NextPageButton != null)
                NextPageButton.IsEnabled = _currentPage < _totalPages;
        }

        #endregion

        protected override void OnClosed(EventArgs e)
        {
            _timer?.Stop();
            base.OnClosed(e);
        }
    }

    // Chooses customer code when available, otherwise falls back to Id
    public class CustomerIdConverter : IMultiValueConverter
    {
        public object Convert(object[] values, Type targetType, object parameter, CultureInfo culture)
        {
            var code = values.Length > 0 ? values[0] as string : null;
            var id = values.Length > 1 ? values[1] as string : null;

            if (!string.IsNullOrWhiteSpace(code))
                return code;

            // Do not expose raw UUIDs in the secretary UI. If no customer code is available,
            // show an empty value so only the canonical customer code is displayed.
            return string.Empty;
        }

        public object[] ConvertBack(object value, Type[] targetTypes, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }

    // Converts account type enum to French display text
    public class AccountTypeConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is SavingsAccountType accountType)
            {
                return accountType switch
                {
                    SavingsAccountType.Savings => "Compte d'Épargne",
                    SavingsAccountType.Current => "Compte Courant",
                    SavingsAccountType.TermSavings => "Épargne à Terme",
                    _ => accountType.ToString()
                };
            }

            if (value is string accountTypeText && !string.IsNullOrWhiteSpace(accountTypeText))
            {
                return accountTypeText.ToLowerInvariant() switch
                {
                    "savings" => "Compte d'Épargne",
                    "current" => "Compte Courant",
                    "termsavings" => "Épargne à Terme",
                    _ => accountTypeText
                };
            }
            return value?.ToString() ?? string.Empty;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }

    // Modèles de données
    public class RecentActivity
    {
        public string Time { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public class Appointment
    {
        public string Time { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
    }

    public class CreditRequestDisplayItem
    {
        public Guid Id { get; set; }
        public string ApplicationNumber { get; set; } = string.Empty;
        public string SavingsAccountNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string LoanTypeDisplay { get; set; } = string.Empty;
        public decimal RequestedAmount { get; set; }
        public int RequestedDurationMonths { get; set; }
        public string StatusDisplay { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
