using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Input;
using System.Windows.Threading;
using System.Windows.Media;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;
using System.Linq;
using System.Threading.Tasks;
using ScottPlot;
using System.Windows;

namespace NalaCreditDesktop.ViewModels
{
    public partial class CashierDashboardViewModel : ObservableObject
    {
        private readonly DispatcherTimer _timer;
        private readonly ICashierService _cashierService;
        private readonly ITransactionService _transactionService;
        private readonly IAlertService _alertService;

        #region Properties - Session Info

        [ObservableProperty]
        private string cashierName = "Marie Dupont";

        [ObservableProperty]
        private DateTime sessionStartTime = DateTime.Now.AddHours(-4);

        [ObservableProperty]
        private DateTime currentTime = DateTime.Now;

        [ObservableProperty]
        private string sessionStatusText = "CAISSE OUVERTE";

        [ObservableProperty]
        private Brush sessionStatusColor = new SolidColorBrush(Colors.Green);

        [ObservableProperty]
        private string sessionId = "CS-2025-001";

        [ObservableProperty]
        private string branchName = "Succursale Centre-Ville";

        [ObservableProperty]
        private string connectionStatus = "Connecté";

        [ObservableProperty]
        private Brush connectionStatusColor = new SolidColorBrush(Colors.LimeGreen);

        [ObservableProperty]
        private DateTime lastTransactionTime = DateTime.Now.AddMinutes(-5);

        #endregion

        #region Properties - Cash Balances

        [ObservableProperty]
        private decimal currentBalanceHTG = 2_580_750m;

        [ObservableProperty]
        private decimal currentBalanceUSD = 12_450.75m;

        [ObservableProperty]
        private decimal openingBalanceHTG = 1_500_000m;

        [ObservableProperty]
        private decimal openingBalanceUSD = 8_000m;

        [ObservableProperty]
        private decimal totalIncoming = 1_850_000m;

        [ObservableProperty]
        private decimal totalOutgoing = 769_250m;

        [ObservableProperty]
        private string balanceIndicatorText = "Caisse équilibrée";

        [ObservableProperty]
        private Brush balanceIndicatorColor = new SolidColorBrush(Colors.Orange);

        #endregion

        #region Properties - Transaction Summary

        [ObservableProperty]
        private int depositsCount = 23;

        [ObservableProperty]
        private decimal depositsAmountHTG = 1_250_000m;

        [ObservableProperty]
        private decimal depositsAmountUSD = 3_200m;

        [ObservableProperty]
        private int withdrawalsCount = 18;

        [ObservableProperty]
        private decimal withdrawalsAmountHTG = 560_000m;

        [ObservableProperty]
        private decimal withdrawalsAmountUSD = 1_850m;

        [ObservableProperty]
        private decimal usdSalesAmount = 600_000m;

        [ObservableProperty]
        private decimal usdPurchaseAmount = 1_450.75m;

        #endregion

        #region Properties - Personal Statistics

        [ObservableProperty]
        private int clientsServedCount = 41;

        [ObservableProperty]
        private int transactionsProcessedCount = 47;

        [ObservableProperty]
        private string averageTransactionTime = "2m 15s";

        [ObservableProperty]
        private double errorRate = 0.021;

        [ObservableProperty]
        private Brush errorRateColor = new SolidColorBrush(Colors.Green);

        [ObservableProperty]
        private double dailyGoalProgress = 78.5;

        [ObservableProperty]
        private string dailyGoalText = "Vous avez atteint 78.5% de votre objectif journalier";

        #endregion

        #region Properties - Alerts

        [ObservableProperty]
        private bool hasWarningAlerts = true;

        [ObservableProperty]
        private string warningMessage = "Le solde HTG approche de la limite (>80% du seuil)";

        [ObservableProperty]
        private bool hasCriticalAlerts = false;

        [ObservableProperty]
        private string criticalMessage = "";

        #endregion

        #region Properties - Account Search

        [ObservableProperty]
        private string accountSearchText = "";

        #endregion

        #region Recent Transactions

        [ObservableProperty]
        private ObservableCollection<TransactionSummary> recentTransactions;

        #endregion

        public CashierDashboardViewModel()
        {
            // Initialiser les services (normalement injectés)
            _cashierService = new CashierService();
            _transactionService = new TransactionService();
            _alertService = new AlertService();

            // Initialiser le timer
            _timer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(1)
            };
            _timer.Tick += Timer_Tick;

            // Initialiser les données
            InitializeRecentTransactions();
            UpdateBalanceIndicator();
            CheckAlerts();
        }

        private void Timer_Tick(object sender, EventArgs e)
        {
            CurrentTime = DateTime.Now;
            
            // Vérifier les alertes périodiquement
            if (DateTime.Now.Second % 30 == 0)
            {
                CheckAlerts();
            }

            // Simuler des mises à jour de données
            if (DateTime.Now.Second % 10 == 0)
            {
                SimulateDataUpdates();
            }
        }

        private void InitializeRecentTransactions()
        {
            RecentTransactions = new ObservableCollection<TransactionSummary>
            {
                new TransactionSummary
                {
                    Time = DateTime.Now.AddMinutes(-2),
                    CreatedAt = DateTime.Now.AddMinutes(-2),
                    Type = "Dépôt",
                    TransactionType = "Dépôt",
                    ClientAccount = "Jean Baptiste (AC-001)",
                    AccountId = "200100000001",
                    CustomerName = "Jean Baptiste",
                    Amount = 25000,
                    Currency = "HTG",
                    Status = "Complété",
                    ReferenceNumber = "TRX-001",
                    ProcessedBy = "Caissier",
                    StatusColor = new SolidColorBrush(Colors.Green)
                },
                new TransactionSummary
                {
                    Time = DateTime.Now.AddMinutes(-8),
                    CreatedAt = DateTime.Now.AddMinutes(-8),
                    Type = "Change",
                    TransactionType = "Change",
                    ClientAccount = "Marie Claire (AC-045)",
                    AccountId = "200100000045",
                    CustomerName = "Marie Claire",
                    Amount = 32000,
                    Currency = "HTG",
                    Status = "Complété",
                    ReferenceNumber = "TRX-002",
                    ProcessedBy = "Caissier",
                    StatusColor = new SolidColorBrush(Colors.Green)
                },
                new TransactionSummary
                {
                    Time = DateTime.Now.AddMinutes(-15),
                    CreatedAt = DateTime.Now.AddMinutes(-15),
                    Type = "Retrait",
                    TransactionType = "Retrait",
                    ClientAccount = "Pierre Moïse (AC-123)",
                    AccountId = "200100000123",
                    CustomerName = "Pierre Moïse",
                    Amount = 15000,
                    Currency = "HTG",
                    Status = "Complété",
                    ReferenceNumber = "TRX-003",
                    ProcessedBy = "Caissier",
                    StatusColor = new SolidColorBrush(Colors.Green)
                },
                new TransactionSummary
                {
                    Time = DateTime.Now.AddMinutes(-22),
                    CreatedAt = DateTime.Now.AddMinutes(-22),
                    Type = "Dépôt",
                    TransactionType = "Dépôt",
                    ClientAccount = "Rose Marie (AC-089)",
                    AccountId = "200100000089",
                    CustomerName = "Rose Marie",
                    Amount = 150,
                    Currency = "USD",
                    Status = "En attente",
                    ReferenceNumber = "TRX-004",
                    ProcessedBy = "Caissier",
                    StatusColor = new SolidColorBrush(Colors.Orange)
                },
                new TransactionSummary
                {
                    Time = DateTime.Now.AddMinutes(-28),
                    CreatedAt = DateTime.Now.AddMinutes(-28),
                    Type = "Change",
                    TransactionType = "Change",
                    ClientAccount = "Joseph Excellent (AC-067)",
                    AccountId = "200100000067",
                    CustomerName = "Joseph Excellent",
                    Amount = 50000,
                    Currency = "HTG",
                    Status = "Complété",
                    ReferenceNumber = "TRX-005",
                    ProcessedBy = "Caissier",
                    StatusColor = new SolidColorBrush(Colors.Green)
                }
            };
        }

        private void UpdateBalanceIndicator()
        {
            var totalBalance = CurrentBalanceHTG + (CurrentBalanceUSD * 160); // Taux approximatif

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
            // Seuils configurables (normalement depuis la configuration)
            const decimal htgThreshold = 2_500_000m;
            const decimal usdThreshold = 15_000m;

            // Vérifier les alertes HTG
            HasWarningAlerts = false;
            HasCriticalAlerts = false;

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

            // Vérifier les soldes trop bas
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

        private void SimulateDataUpdates()
        {
            // Simulation de légères variations dans les données
            var random = new Random();
            
            // Mettre à jour occasionnellement les statistiques
            if (random.Next(1, 100) <= 10) // 10% de chance
            {
                TransactionsProcessedCount++;
                ClientsServedCount = Math.Max(ClientsServedCount, TransactionsProcessedCount - 6);
                
                // Recalculer le taux d'objectif
                DailyGoalProgress = Math.Min(100, DailyGoalProgress + random.NextDouble() * 2);
                DailyGoalText = $"Vous avez atteint {DailyGoalProgress:F1}% de votre objectif journalier";
                
                LastTransactionTime = DateTime.Now;
            }
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
                MessageBox.Show("Ouverture de l'interface de change...", "Info", 
                               MessageBoxButton.OK, MessageBoxImage.Information);
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
                    MessageBox.Show("Processus de clôture de caisse initié...", "Info", 
                                   MessageBoxButton.OK, MessageBoxImage.Information);
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

                MessageBox.Show($"Consultation du compte: {AccountSearchText}", "Info", 
                               MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur", 
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
                // Simuler un rafraîchissement
                await Task.Delay(500);
                
                // Ajouter une nouvelle transaction simulée
                var random = new Random();
                var accountNum = random.Next(100, 999);
                var amount = random.Next(5000, 50000);
                var newTransaction = new TransactionSummary
                {
                    Time = DateTime.Now,
                    CreatedAt = DateTime.Now,
                    Type = "Dépôt",
                    TransactionType = "Dépôt",
                    ClientAccount = $"Client-{accountNum} (AC-{accountNum})",
                    AccountId = $"2001000000{accountNum}",
                    CustomerName = $"Client-{accountNum}",
                    Amount = amount,
                    Currency = "HTG",
                    Status = "Complété",
                    ReferenceNumber = $"TRX-{DateTime.Now:yyyyMMddHHmmss}",
                    ProcessedBy = "Caissier",
                    StatusColor = new SolidColorBrush(Colors.Green)
                };

                RecentTransactions.Insert(0, newTransaction);
                
                // Garder seulement les 10 dernières
                while (RecentTransactions.Count > 10)
                {
                    RecentTransactions.RemoveAt(RecentTransactions.Count - 1);
                }

                LastTransactionTime = DateTime.Now;
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

        #endregion

        #region Public Methods

        public void StartTimer()
        {
            _timer.Start();
        }

        public void StopTimer()
        {
            _timer?.Stop();
        }

        public async Task LoadInitialData()
        {
            try
            {
                // Charger les données initiales depuis les services
                await Task.Delay(1000); // Simulation
                
                // Mettre à jour les indicateurs
                UpdateBalanceIndicator();
                CheckAlerts();
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