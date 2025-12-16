using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;
using System.Windows.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;
using NalaCreditDesktop.Views;
using CashierDashboardDto = NalaCreditDesktop.Services.CashierDashboard;

namespace NalaCreditDesktop.ViewModels
{
    public partial class CashierDashboardViewModel : ObservableObject
    {
        private readonly DispatcherTimer _timer;
        private readonly ApiService _apiService;
        private readonly TimeSpan _refreshInterval = TimeSpan.FromSeconds(30);
        private DateTime _lastRefresh = DateTime.MinValue;
        private bool _isRefreshing;
        private bool _branchLoaded;
        private bool _branchLoading;

        #region Properties - Session Info

        [ObservableProperty]
        private string cashierName = string.Empty;

        [ObservableProperty]
        private DateTime sessionStartTime = DateTime.Now;

        [ObservableProperty]
        private DateTime currentTime = DateTime.Now;

        [ObservableProperty]
        private string sessionStatusText = "INCONNUE";

        [ObservableProperty]
        private Brush sessionStatusColor = new SolidColorBrush(Colors.Gray);

        [ObservableProperty]
        private string sessionId = "--";

        [ObservableProperty]
        private string branchName = string.Empty;

        [ObservableProperty]
        private string connectionStatus = "Déconnecté";

        [ObservableProperty]
        private Brush connectionStatusColor = new SolidColorBrush(Colors.Firebrick);

        [ObservableProperty]
        private DateTime lastTransactionTime = DateTime.Now;

        #endregion

        #region Properties - Cash Balances

        [ObservableProperty]
        private decimal currentBalanceHTG;

        [ObservableProperty]
        private decimal currentBalanceUSD;

        [ObservableProperty]
        private decimal openingBalanceHTG;

        [ObservableProperty]
        private decimal openingBalanceUSD;

        [ObservableProperty]
        private decimal totalIncoming;

        [ObservableProperty]
        private decimal totalOutgoing;

        [ObservableProperty]
        private string balanceIndicatorText = string.Empty;

        [ObservableProperty]
        private Brush balanceIndicatorColor = new SolidColorBrush(Colors.Gray);

        #endregion

        #region Properties - Transaction Summary

        [ObservableProperty]
        private decimal todayDeposits;

        [ObservableProperty]
        private decimal todayWithdrawals;

        [ObservableProperty]
        private int todayExchanges;

        [ObservableProperty]
        private int depositsCount;

        [ObservableProperty]
        private decimal depositsAmountHTG;

        [ObservableProperty]
        private decimal depositsAmountUSD;

        [ObservableProperty]
        private int withdrawalsCount;

        [ObservableProperty]
        private decimal withdrawalsAmountHTG;

        [ObservableProperty]
        private decimal withdrawalsAmountUSD;

        [ObservableProperty]
        private decimal usdSalesAmount;

        [ObservableProperty]
        private decimal usdPurchaseAmount;

        // Raw dashboard model for XAML bindings that expect a single DashboardData object
        [ObservableProperty]
        private CashierDashboardDto? dashboardData;

        #endregion

        #region Properties - Personal Statistics

        [ObservableProperty]
        private int clientsServedCount;

        [ObservableProperty]
        private int transactionsProcessedCount;

        [ObservableProperty]
        private string averageTransactionTime = string.Empty;

        [ObservableProperty]
        private double errorRate;

        [ObservableProperty]
        private Brush errorRateColor = new SolidColorBrush(Colors.Green);

        [ObservableProperty]
        private double dailyGoalProgress;

        [ObservableProperty]
        private string dailyGoalText = string.Empty;

        #endregion

        #region Properties - Alerts

        [ObservableProperty]
        private bool hasWarningAlerts;

        [ObservableProperty]
        private string warningMessage = string.Empty;

        [ObservableProperty]
        private bool hasCriticalAlerts;

        [ObservableProperty]
        private string criticalMessage = string.Empty;

        #endregion

        #region Properties - Account Search

        [ObservableProperty]
        private string accountSearchText = string.Empty;

        #endregion

        #region Recent Transactions

        [ObservableProperty]
        private ObservableCollection<TransactionSummary> recentTransactions = new();

        #endregion

        #region Exchange History

        public class ExchangeHistoryItem
        {
            public DateTime Time { get; set; }
            public string TransactionNumber { get; set; } = string.Empty;
            public string Type { get; set; } = string.Empty; // Purchase/Sale
            public string Pair { get; set; } = string.Empty; // e.g., USD→HTG
            public decimal FromAmount { get; set; }
            public decimal ToAmount { get; set; }
            public decimal ExchangeRate { get; set; }
            public decimal NetAmount { get; set; }
            public string Status { get; set; } = string.Empty;
            public string Customer { get; set; } = string.Empty;
        }

        [ObservableProperty]
        private ObservableCollection<ExchangeHistoryItem> exchangeHistory = new();

        #endregion

        #region State Management

        [ObservableProperty]
        private bool isLoading;

        [ObservableProperty]
        private string errorMessage = string.Empty;

        [ObservableProperty]
        private bool isTransactionModuleVisible = true;

        #endregion

        public string TransactionModuleToggleLabel => IsTransactionModuleVisible
            ? "Masquer Transactions"
            : "Afficher Transactions";

        partial void OnIsTransactionModuleVisibleChanged(bool value)
        {
            OnPropertyChanged(nameof(TransactionModuleToggleLabel));
        }

        public CashierDashboardViewModel(ApiService apiService)
        {
            _apiService = apiService ?? throw new ArgumentNullException(nameof(apiService));

            _timer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(1)
            };
            _timer.Tick += Timer_Tick;

            UpdateBalanceIndicator();
            CheckAlerts();
            // Subscribe to transaction processed events so the dashboard refreshes immediately
            AppServices.TransactionProcessed += OnTransactionProcessed;
            // Initial load of exchange history
            _ = LoadExchangeHistoryAsync();
        }

        private async void OnTransactionProcessed()
        {
            try
            {
                await RefreshDashboardAsync(force: true);
            }
            catch
            {
                // Ignore; refresh will be retried by timer
            }
        }

        private async void Timer_Tick(object? sender, EventArgs e)
        {
            CurrentTime = DateTime.Now;
            
            if (!_isRefreshing && DateTime.Now - _lastRefresh >= _refreshInterval)
            {
                await RefreshDashboardAsync();
            }
        }

        private void UpdateBalanceIndicator()
        {
            var totalBalance = CurrentBalanceHTG + (CurrentBalanceUSD * 160);

            if (CurrentBalanceHTG <= 0 && CurrentBalanceUSD <= 0)
            {
                BalanceIndicatorText = "Aucun mouvement enregistré";
                BalanceIndicatorColor = new SolidColorBrush(Colors.Gray);
                return;
            }

            if (CurrentBalanceHTG > CurrentBalanceUSD * 150)
            {
                BalanceIndicatorText = "Caisse majoritairement HTG";
                BalanceIndicatorColor = new SolidColorBrush(Colors.Green);
            }
            else if (CurrentBalanceUSD * 170 > CurrentBalanceHTG)
            {
                BalanceIndicatorText = "Caisse majoritairement USD";
                BalanceIndicatorColor = new SolidColorBrush(Colors.Blue);
            }
            else
            {
                BalanceIndicatorText = "Caisse équilibrée";
                BalanceIndicatorColor = new SolidColorBrush(Colors.Orange);
            }
        }

        private void CheckAlerts()
        {
            const decimal htgThreshold = 2_500_000m;
            const decimal usdThreshold = 15_000m;

            HasWarningAlerts = false;
            HasCriticalAlerts = false;
            WarningMessage = string.Empty;
            CriticalMessage = string.Empty;

            if (CurrentBalanceHTG > htgThreshold * 0.8m && CurrentBalanceHTG < htgThreshold)
            {
                HasWarningAlerts = true;
                WarningMessage = "Le solde HTG approche de la limite de sécurité";
            }
            else if (CurrentBalanceHTG >= htgThreshold)
            {
                HasCriticalAlerts = true;
                CriticalMessage = "ALERTE: Solde HTG au-dessus du seuil de sécurité!";
            }

            if (CurrentBalanceUSD > usdThreshold * 0.8m && CurrentBalanceUSD < usdThreshold)
            {
                HasWarningAlerts = true;
                WarningMessage = "Le solde USD approche de la limite de sécurité";
            }
            else if (CurrentBalanceUSD >= usdThreshold)
            {
                HasCriticalAlerts = true;
                CriticalMessage = "ALERTE: Solde USD au-dessus du seuil de sécurité!";
            }

            if (CurrentBalanceHTG < 100_000m)
            {
                HasCriticalAlerts = true;
                CriticalMessage = "ALERTE: Solde HTG très bas, besoin de fonds!";
            }

            if (CurrentBalanceUSD < 500m)
            {
                HasCriticalAlerts = true;
                CriticalMessage = "ALERTE: Solde USD très bas, besoin de fonds!";
            }
        }

        private async Task RefreshDashboardAsync(bool force = false)
        {
            if (_isRefreshing)
            {
                return;
            }

            if (!force && DateTime.Now - _lastRefresh < TimeSpan.FromSeconds(5))
            {
                return;
            }

            try
            {
                _isRefreshing = true;
                IsLoading = true;
                ErrorMessage = string.Empty;
                UpdateConnectionStatus(false, "Synchronisation...");

                await EnsureUserContextAsync();

                var dashboardResult = await _apiService.GetCashierDashboardAsync();
                if (!dashboardResult.IsSuccess)
                {
                    ErrorMessage = string.IsNullOrWhiteSpace(dashboardResult.ErrorMessage)
                        ? "Impossible de charger les données du dashboard."
                        : dashboardResult.ErrorMessage;
                    UpdateConnectionStatus(false, "Erreur de connexion");
                    return;
                }

                if (dashboardResult.Data == null)
                {
                    ErrorMessage = "Réponse vide reçue pour le dashboard caissier.";
                    UpdateConnectionStatus(false, "En attente de données");
                    return;
                }

                ApplyDashboardData(dashboardResult.Data);
                await EnsureBranchInfoAsync();

                _lastRefresh = DateTime.Now;
                UpdateConnectionStatus(true, "Connecté");
            }
            catch (Exception ex)
            {
                ErrorMessage = ex.Message;
                UpdateConnectionStatus(false, "Erreur de connexion");
            }
            finally
            {
                IsLoading = false;
                _isRefreshing = false;
            }
        }

        private void ApplyDashboardData(CashierDashboardDto dashboard)
        {
            // Make the raw dashboard model available for XAML bindings that reference DashboardData
            DashboardData = dashboard;
            SessionStatusText = FormatSessionStatus(dashboard.CashSessionStatus);
            SessionStatusColor = GetSessionBrush(dashboard.CashSessionStatus);
            SessionId = dashboard.CashSessionId?.ToString() ?? "--";
            SessionStartTime = dashboard.SessionStartTime ?? SessionStartTime;

            CurrentBalanceHTG = dashboard.CashBalanceHTG;
            CurrentBalanceUSD = dashboard.CashBalanceUSD;
            OpeningBalanceHTG = dashboard.OpeningBalanceHTG;
            OpeningBalanceUSD = dashboard.OpeningBalanceUSD;
            TotalIncoming = dashboard.TotalIncoming;
            TotalOutgoing = dashboard.TotalOutgoing;

            TodayDeposits = dashboard.TodayDeposits;
            TodayWithdrawals = dashboard.TodayWithdrawals;
            TodayExchanges = dashboard.TodayExchanges;
            DepositsCount = dashboard.DepositsCount;
            DepositsAmountHTG = dashboard.DepositsAmountHTG;
            DepositsAmountUSD = dashboard.DepositsAmountUSD;
            WithdrawalsCount = dashboard.WithdrawalsCount;
            WithdrawalsAmountHTG = dashboard.WithdrawalsAmountHTG;
            WithdrawalsAmountUSD = dashboard.WithdrawalsAmountUSD;
            UsdSalesAmount = dashboard.UsdSalesAmount;
            UsdPurchaseAmount = dashboard.UsdPurchaseAmount;

            ClientsServedCount = dashboard.ClientsServed;
            TransactionsProcessedCount = dashboard.TransactionCount;
            LastTransactionTime = dashboard.LastTransactionTime ?? LastTransactionTime;

            AverageTransactionTime = string.Empty;
            ErrorRate = 0;
            ErrorRateColor = new SolidColorBrush(Colors.Green);
            DailyGoalProgress = 0;
            DailyGoalText = string.Empty;

            var transactions = dashboard.RecentTransactions?
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new TransactionSummary
                {
                    Id = t.Id.ToString(),
                    Time = t.CreatedAt,
                    CreatedAt = t.CreatedAt,
                    Type = GetTransactionLabel(t.Type),
                    TransactionType = t.Type,
                    ClientAccount = !string.IsNullOrWhiteSpace(t.CustomerName) ? $"{t.CustomerName} ({t.AccountNumber})"
                        : (!string.IsNullOrWhiteSpace(t.AccountLabel) ? t.AccountLabel : (!string.IsNullOrWhiteSpace(t.AccountNumber) ? t.AccountNumber : string.Empty)),
                    AccountId = t.AccountNumber,
                    CustomerName = t.CustomerName,
                    Amount = t.Amount,
                    Currency = t.Currency,
                    Status = t.Status,
                    ReferenceNumber = t.TransactionNumber,
                    ProcessedBy = t.ProcessedBy,
                    Description = string.Empty,
                    StatusColor = GetStatusBrush(t.Status)
                })
                .ToList() ?? new();

            RecentTransactions = new ObservableCollection<TransactionSummary>(transactions);

            UpdateBalanceIndicator();
            CheckAlerts();
        }

        private async Task LoadExchangeHistoryAsync()
        {
            try
            {
                var today = DateTime.Today;
                var search = new ApiService.ExchangeTransactionSearch
                {
                    DateFrom = today,
                    DateTo = today.AddDays(1).AddTicks(-1),
                    Page = 1,
                    PageSize = 100
                };

                var list = await _apiService.GetExchangeTransactionsAsync(search);

                // Afficher l'historique du jour (toutes caisses de la succursale courante)
                var rows = list
                    .OrderByDescending(t => t.TransactionDate)
                    .Select(t => new ExchangeHistoryItem
                    {
                        Time = t.TransactionDate,
                        TransactionNumber = t.TransactionNumber ?? string.Empty,
                        Type = t.ExchangeRate > 0 && t.FromAmount > 0 ? (t.FromCurrencyName + "→" + t.ToCurrencyName) : (t.ExchangeTypeName ?? ""),
                        Pair = string.IsNullOrWhiteSpace(t.FromCurrencyName) || string.IsNullOrWhiteSpace(t.ToCurrencyName)
                            ? ""
                            : $"{t.FromCurrencyName}→{t.ToCurrencyName}",
                        FromAmount = t.FromAmount,
                        ToAmount = t.ToAmount,
                        ExchangeRate = t.ExchangeRate,
                        NetAmount = t.NetAmount,
                        Status = t.StatusName ?? string.Empty,
                        Customer = t.CustomerName ?? string.Empty
                    })
                    .ToList();

                ExchangeHistory = new ObservableCollection<ExchangeHistoryItem>(rows);
            }
            catch
            {
                // Keep silent; the rest of dashboard remains functional
            }
        }

        private async Task EnsureUserContextAsync()
        {
            var user = _apiService.CurrentUser;
            if (user == null)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(CashierName))
            {
                var fullName = $"{user.FirstName} {user.LastName}".Trim();
                CashierName = string.IsNullOrWhiteSpace(fullName) ? user.Email : fullName;
            }
        }

        private async Task EnsureBranchInfoAsync()
        {
            if (_branchLoaded || _branchLoading)
            {
                return;
            }

            var branchId = _apiService.CurrentUser?.BranchId;
            if (branchId == null)
            {
                return;
            }

            _branchLoading = true;
            try
            {
                var branch = await _apiService.GetBranchAsync(branchId.Value);
                if (branch != null)
                {
                    BranchName = string.IsNullOrWhiteSpace(branch.Name)
                        ? $"Succursale #{branch.Id}"
                        : branch.Name;
                    _branchLoaded = true;
                }
            }
            catch
            {
                // Ignorer les erreurs, sera retenté lors du prochain rafraîchissement
            }
            finally
            {
                _branchLoading = false;
            }
        }

        private void UpdateConnectionStatus(bool isConnected, string message)
        {
            ConnectionStatus = message;

            if (isConnected)
            {
                ConnectionStatusColor = new SolidColorBrush(Colors.LimeGreen);
            }
            else if (message.Contains("Synchronisation", StringComparison.OrdinalIgnoreCase))
            {
                ConnectionStatusColor = new SolidColorBrush(Colors.Goldenrod);
            }
            else
            {
                ConnectionStatusColor = new SolidColorBrush(Colors.Firebrick);
            }
        }

        private static Brush GetStatusBrush(string status)
        {
            return status?.ToLowerInvariant() switch
            {
                "complété" or "completed" or "success" => new SolidColorBrush(Colors.Green),
                "en attente" or "pending" => new SolidColorBrush(Colors.Orange),
                "échoué" or "failed" or "rejected" => new SolidColorBrush(Colors.IndianRed),
                _ => new SolidColorBrush(Colors.Gray)
            };
        }

        private static Brush GetSessionBrush(string? status)
        {
            return status?.ToLowerInvariant() switch
            {
                "open" or "ouverte" => new SolidColorBrush(Colors.Green),
                "closing" or "closingpending" or "pending" => new SolidColorBrush(Colors.Orange),
                _ => new SolidColorBrush(Colors.Firebrick)
            };
        }

        private static string FormatSessionStatus(string? status)
        {
            return status?.ToLowerInvariant() switch
            {
                "open" or "ouverte" => "CAISSE OUVERTE",
                "closing" or "closingpending" or "pending" => "EN COURS",
                "closed" or "fermee" or "fermée" => "CAISSE FERMÉE",
                _ => "STATUT INCONNU"
            };
        }

        private static string GetTransactionLabel(string type)
        {
            return type?.ToLowerInvariant() switch
            {
                "deposit" => "Dépôt",
                "withdrawal" => "Retrait",
                "currencyexchange" or "change" => "Change",
                "creditpayment" => "Paiement Crédit",
                "creditdisbursement" => "Décaissement Crédit",
                _ => type ?? string.Empty
            };
        }

        #region Commands

        [RelayCommand]
        private async Task NewDeposit()
        {
            try
            {
                // Ouvrir la fenêtre de dépôt
                MessageBox.Show("Ouverture de la fenêtre de nouveau dépôt...", "Info", 
                               MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur", 
                               MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        [RelayCommand]
        private async Task NewWithdrawal()
        {
            try
            {
                MessageBox.Show("Ouverture de la fenêtre de nouveau retrait...", "Info", 
                               MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur", 
                               MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        [RelayCommand]
        private async Task ExchangeOperation()
        {
            try
            {
                var owner = Application.Current?
                    .Windows
                    .OfType<Window>()
                    .FirstOrDefault(w => w.IsActive && w.IsVisible)
                    ?? Application.Current?.MainWindow;

                var changeWindow = new OperationChangeWindow(_apiService);

                if (owner != null && owner.IsVisible)
                {
                    changeWindow.Owner = owner;
                }
                else
                {
                    changeWindow.WindowStartupLocation = WindowStartupLocation.CenterScreen;
                }

                changeWindow.ShowDialog();

                if (changeWindow.OperationReussie)
                {
                    await RefreshDashboardAsync(force: true);
                    await LoadExchangeHistoryAsync();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur", 
                               MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        [RelayCommand]
        private async Task OpenCashSession()
        {
            try
            {
                var dialog = new OpenCashSessionDialog
                {
                    Owner = Application.Current?.MainWindow
                };

                dialog.InitializeBalances(
                    OpeningBalanceHTG > 0 ? OpeningBalanceHTG : 0m,
                    OpeningBalanceUSD > 0 ? OpeningBalanceUSD : 0m);

                var result = dialog.ShowDialog();
                if (result != true)
                {
                    return;
                }

                var resultOpen = await _apiService.OpenCashSessionAsync(dialog.OpeningBalanceHTG, dialog.OpeningBalanceUSD);
                if (resultOpen.IsSuccess)
                {
                    MessageBox.Show("Session de caisse ouverte avec succès!", "Succès", 
                                   MessageBoxButton.OK, MessageBoxImage.Information);
                    await RefreshDashboardAsync(force: true);
                }
                else
                {
                    var error = string.IsNullOrWhiteSpace(resultOpen.ErrorMessage)
                        ? "Erreur lors de l'ouverture de la session."
                        : resultOpen.ErrorMessage;

                    MessageBox.Show(error, "Erreur", 
                                   MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur", 
                               MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        [RelayCommand]
        private async Task CloseCashier()
        {
            try
            {
                var result = MessageBox.Show(
                    "Êtes-vous sûr de vouloir fermer la caisse?\nCette action nécessitera une vérification complète des fonds.",
                    "Confirmation de clôture",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Question);

                if (result == MessageBoxResult.Yes)
                {
                    var closeResult = await _apiService.CloseCashSessionAsync(
                        CurrentBalanceHTG,
                        CurrentBalanceUSD,
                        "Clôture initiée depuis le dashboard caissier");

                    if (closeResult.IsSuccess)
                    {
                        MessageBox.Show("Caisse fermée avec succès.", "Succès", 
                                       MessageBoxButton.OK, MessageBoxImage.Information);
                        await RefreshDashboardAsync(force: true);
                    }
                    else
                    {
                        var error = string.IsNullOrWhiteSpace(closeResult.ErrorMessage)
                            ? "Erreur lors de la fermeture de la caisse."
                            : closeResult.ErrorMessage;

                        MessageBox.Show(error, "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur", 
                               MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        [RelayCommand]
        private async Task ConsultAccount()
        {
            try
            {
                if (string.IsNullOrWhiteSpace(AccountSearchText))
                {
                    MessageBox.Show("Veuillez saisir un numéro de compte ou nom de client.", "Info", 
                                   MessageBoxButton.OK, MessageBoxImage.Information);
                    return;
                }

                // Log the action
                Console.WriteLine($"[INFO] Opening consultation window for: {AccountSearchText}");

                var owner = Application.Current?
                    .Windows
                    .OfType<Window>()
                    .FirstOrDefault(w => w.IsActive && w.IsVisible)
                    ?? Application.Current?.MainWindow;

                var window = new ConsultationCompteWindow(_apiService);

                if (owner != null && owner.IsVisible)
                {
                    window.Owner = owner;
                }
                else
                {
                    window.WindowStartupLocation = WindowStartupLocation.CenterScreen;
                    Console.WriteLine("[WARN] No active owner window found; centering consultation window on screen.");
                }

                window.PrefillSearch(AccountSearchText);
                window.ShowDialog();
                
                Console.WriteLine("[INFO] Consultation window closed successfully");
            }
            catch (Exception ex)
            {
                // Log full exception for diagnostics
                Console.Error.WriteLine($"[ERROR] ConsultAccount failed:");
                Console.Error.WriteLine($"Message: {ex.Message}");
                Console.Error.WriteLine($"Type: {ex.GetType().Name}");
                Console.Error.WriteLine($"StackTrace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.Error.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                
                // Show detailed error to user for debugging
                MessageBox.Show($"Erreur lors de la consultation du compte:\n\n{ex.Message}\n\nType: {ex.GetType().Name}\n\nVeuillez réessayer ou contacter le support.", 
                               "Erreur", 
                               MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        [RelayCommand]
        private async Task GenerateDailyReport()
        {
            try
            {
                MessageBox.Show("Génération du rapport journalier en cours...", "Info", 
                               MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur", 
                               MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        [RelayCommand]
        private async Task ExportToExcel()
        {
            try
            {
                MessageBox.Show("Export Excel en cours...", "Info", 
                               MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur", 
                               MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        [RelayCommand]
        private async Task RefreshTransactions()
        {
            try
            {
                await RefreshDashboardAsync(force: true);
                await LoadExchangeHistoryAsync();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur", 
                               MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        [RelayCommand]
        private async Task Configuration()
        {
            try
            {
                MessageBox.Show("Ouverture des paramètres de configuration...", "Info", 
                               MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur", 
                               MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        [RelayCommand]
        private async Task Support()
        {
            try
            {
                MessageBox.Show("Contact du support technique...", "Info", 
                               MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur", 
                               MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        [RelayCommand]
        private void ToggleTransactionModule()
        {
            IsTransactionModuleVisible = !IsTransactionModuleVisible;
        }

        #endregion

        #region Public Methods

        public void StartTimer()
        {
            _timer.Start();
            CurrentTime = DateTime.Now;
        }

        public void StopTimer()
        {
            _timer?.Stop();
        }

        public async Task LoadInitialDataAsync()
        {
            try
            {
                await RefreshDashboardAsync(force: true);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement des données: {ex.Message}", "Erreur", 
                               MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        #endregion
    }
}