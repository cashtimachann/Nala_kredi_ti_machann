using System;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;
using NalaCreditDesktop.Views;
using NalaCreditDesktop.ViewModels;
using NalaCreditDesktop.Models;

namespace NalaCreditDesktop;

public partial class MainWindow : Window
{
    private DispatcherTimer? _timer;
    private CashierDashboardViewModel? _viewModel;

    public MainWindow()
    {
        InitializeComponent();
        InitializeDashboard();
        SetupEventHandlers();
        StartTimer();
    }

    private void InitializeDashboard()
    {
        try
        {
            // Initialiser le ViewModel
            _viewModel = new CashierDashboardViewModel();

            // Initialiser le timer pour les mises à jour temps réel
            _timer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(1)
            };
            _timer.Tick += Timer_Tick;
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erreur lors de l'initialisation: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void LoadSampleData()
    {
        try
        {
            // Données initiales pour les tests - seulement les contrôles qui existent
            var cashierNameText = FindName("CashierNameText") as TextBlock;
            if (cashierNameText != null) cashierNameText.Text = "Marie Dupont";

            var sessionStartTimeText = FindName("SessionStartTimeText") as TextBlock;
            if (sessionStartTimeText != null) sessionStartTimeText.Text = "Ouvert à 08:30";

            var branchNameText = FindName("BranchNameText") as TextBlock;
            if (branchNameText != null) branchNameText.Text = "Succursale Centre-Ville";

            var sessionIdText = FindName("SessionIdText") as TextBlock;
            if (sessionIdText != null) sessionIdText.Text = "Session: CS-2025-001";

            var currentTimeText = FindName("CurrentTimeText") as TextBlock;
            if (currentTimeText != null) currentTimeText.Text = $"Maintenant: {DateTime.Now:HH:mm:ss}";

            var lastTransactionTimeText = FindName("LastTransactionTimeText") as TextBlock;
            if (lastTransactionTimeText != null) lastTransactionTimeText.Text = $"Dernière transaction: {DateTime.Now.AddMinutes(-new Random().Next(1, 10)):HH:mm:ss}";

            // Charger des transactions d'exemple
            LoadSampleTransactions();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erreur lors du chargement des données: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void LoadSampleTransactions()
    {
        var transactions = new ObservableCollection<TransactionSummary>
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
                ReferenceNumber = "TRX-20251016-001",
                ProcessedBy = "Caissier Principal",
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
                ReferenceNumber = "TRX-20251016-002",
                ProcessedBy = "Caissier Principal",
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
                ReferenceNumber = "TRX-20251016-003",
                ProcessedBy = "Caissier Principal",
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
                ReferenceNumber = "TRX-20251016-004",
                ProcessedBy = "Caissier Principal",
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
                Amount = 312,
                Currency = "USD",
                Status = "Complété",
                ReferenceNumber = "TRX-20251016-005",
                ProcessedBy = "Caissier Principal",
                StatusColor = new SolidColorBrush(Colors.Green)
            }
        };

        // Essayer de définir la source des données si le contrôle existe
        try
        {
            var grid = FindName("RecentTransactionsGrid") as DataGrid;
            if (grid != null)
            {
                grid.ItemsSource = transactions;
            }
        }
        catch
        {
            // Ignorer les erreurs si le contrôle n'existe pas
        }
    }

    private void Timer_Tick(object? sender, EventArgs e)
    {
        // Mettre à jour l'horloge si les contrôles existent
        try
        {
            var currentTimeText = FindName("CurrentTimeText") as TextBlock;
            if (currentTimeText != null)
            {
                currentTimeText.Text = $"Maintenant: {DateTime.Now:HH:mm:ss}";
            }

            var lastTransactionText = FindName("LastTransactionTimeText") as TextBlock;
            if (lastTransactionText != null)
            {
                lastTransactionText.Text = $"Dernière transaction: {DateTime.Now.AddMinutes(-new Random().Next(1, 10)):HH:mm:ss}";
            }
        }
        catch
        {
            // Ignorer les erreurs si les contrôles n'existent pas
        }
    }

    private void StartTimer()
    {
        _timer?.Start();
    }

    private void SetupEventHandlers()
    {
        try
        {
            // Actions rapides - Utiliser FindName pour éviter les erreurs de compilation
            var exchangeOperationButton = FindName("ExchangeOperationButton") as Button;
            if (exchangeOperationButton != null)
                exchangeOperationButton.Click += OperationChange_Click;

            var pauseCashierButton = FindName("PauseCashierButton") as Button;
            if (pauseCashierButton != null)
            {
                pauseCashierButton.Click += (s, e) => HandlePauseCashier();
            }

            var closeCashierButton = FindName("CloseCashierButton") as Button;
            if (closeCashierButton != null)
                closeCashierButton.Click += ClotureCarriere_Click;

            var logoutButton = FindName("LogoutButton") as Button;
            if (logoutButton != null)
            {
                logoutButton.Click += (s, e) =>
                {
                    var loginWindow = new LoginWindow();
                    loginWindow.Show();
                    this.Close();
                };
            }

            // Navigation
            var dashboardButton = FindName("DashboardButton") as Button;
            if (dashboardButton != null)
            {
                dashboardButton.Click += (s, e) =>
                {
                    LoadDashboardView();
                    UpdateActiveButton(dashboardButton);
                };
            }

            var transactionsButton = FindName("TransactionsButton") as Button;
            if (transactionsButton != null)
            {
                transactionsButton.Click += (s, e) =>
                {
                    try
                    {
                        LoadTransactionView();
                        UpdateActiveButton(transactionsButton);
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show($"Erreur lors du chargement du module transactions: {ex.Message}", 
                                       "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                    }
                };
            }

            var reportsButton = FindName("ReportsButton") as Button;
            if (reportsButton != null)
                reportsButton.Click += Rapports_Click;

            var accountsButton = FindName("AccountsButton") as Button;
            if (accountsButton != null)
                accountsButton.Click += ComptesClients_Click;

            var configButton = FindName("ConfigButton") as Button;
            if (configButton != null)
            {
                configButton.Click += (s, e) =>
                {
                    MessageBox.Show("Configuration bientôt disponible", "Information");
                };
            }

            var supportButton = FindName("SupportButton") as Button;
            if (supportButton != null)
            {
                supportButton.Click += (s, e) =>
                {
                    MessageBox.Show("Support: contact@nalacredit.ht | Tel: +509 1234-5678", "Contact Support");
                };
            }

            var refreshTransactionsButton = FindName("RefreshTransactionsButton") as Button;
            if (refreshTransactionsButton != null)
            {
                refreshTransactionsButton.Click += (s, e) =>
                {
                    LoadSampleTransactions();
                    MessageBox.Show("Transactions actualisées", "Information");
                };
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erreur lors de la configuration des événements: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void UpdateActiveButton(Button activeButton)
    {
        try
        {
            // Reset all buttons to normal style
            var buttons = new[] { "DashboardButton", "TransactionsButton", "ReportsButton", "AccountsButton" };
            foreach (var buttonName in buttons)
            {
                var button = FindName(buttonName) as Button;
                if (button != null)
                {
                    button.Style = (Style)FindResource("SidebarButtonStyle");
                }
            }

            // Set active button style
            activeButton.Style = (Style)FindResource("ActiveSidebarButtonStyle");
        }
        catch
        {
            // Ignorer les erreurs de style
        }
    }

    private void HandlePauseCashier()
    {
        try
        {
            var sessionStatusText = FindName("SessionStatusText") as TextBlock;
            var sessionStatusBorder = FindName("SessionStatusBorder") as Border;
            var pauseCashierButton = FindName("PauseCashierButton") as Button;

            if (sessionStatusText != null)
            {
                var currentStatus = sessionStatusText.Text;

                if (currentStatus == "CAISSE OUVERTE")
                {
                    // Mettre en pause
                    var pauseDialog = new PauseConfirmationDialog();
                    if (pauseDialog.ShowDialog() == true)
                    {
                        sessionStatusText.Text = "CAISSE EN PAUSE";
                        if (sessionStatusBorder != null)
                            sessionStatusBorder.Background = new SolidColorBrush(Colors.Orange);
                        if (pauseCashierButton != null)
                            pauseCashierButton.Content = CreatePauseButtonContent("▶️", "Reprendre");
                        DisableCashierOperations();
                        MessageBox.Show("Caisse mise en pause. Cliquez sur 'Reprendre' pour continuer les opérations.",
                                       "Pause Activée", MessageBoxButton.OK, MessageBoxImage.Information);
                    }
                }
                else if (currentStatus == "CAISSE EN PAUSE")
                {
                    // Reprendre (demander authentification)
                    var unlockDialog = new UnlockCashierDialog();
                    if (unlockDialog.ShowDialog() == true)
                    {
                        sessionStatusText.Text = "CAISSE OUVERTE";
                        if (sessionStatusBorder != null)
                            sessionStatusBorder.Background = new SolidColorBrush(Colors.Green);
                        if (pauseCashierButton != null)
                            pauseCashierButton.Content = CreatePauseButtonContent("⏸️", "Pause");
                        EnableCashierOperations();
                        MessageBox.Show("Caisse déverrouillée avec succès!",
                                       "Session Reprise", MessageBoxButton.OK, MessageBoxImage.Information);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erreur lors de la gestion de la pause: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private StackPanel CreatePauseButtonContent(string icon, string text)
    {
        var stackPanel = new StackPanel { Orientation = Orientation.Horizontal };
        stackPanel.Children.Add(new TextBlock { Text = icon, FontSize = 16, Margin = new Thickness(0, 0, 5, 0) });
        stackPanel.Children.Add(new TextBlock { Text = text });
        return stackPanel;
    }

    private void DisableCashierOperations()
    {
        try
        {
            var buttons = new[] { "ExchangeOperationButton", "CloseCashierButton" };
            foreach (var buttonName in buttons)
            {
                var button = FindName(buttonName) as Button;
                if (button != null)
                {
                    button.IsEnabled = false;
                    button.Opacity = 0.5;
                }
            }
        }
        catch
        {
            // Ignorer les erreurs
        }
    }

    private void EnableCashierOperations()
    {
        try
        {
            var buttons = new[] { "ExchangeOperationButton", "CloseCashierButton" };
            foreach (var buttonName in buttons)
            {
                var button = FindName(buttonName) as Button;
                if (button != null)
                {
                    button.IsEnabled = true;
                    button.Opacity = 1.0;
                }
            }
        }
        catch
        {
            // Ignorer les erreurs
        }
    }

    #region Gestionnaires d'événements pour les nouvelles fenêtres

    private void NouveauDepot_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var depotWindow = new NouveauDepotWindow();
            depotWindow.Owner = this;

            if (depotWindow.ShowDialog() == true)
            {
                // Actualiser le dashboard après un dépôt réussi
                ActualiserDashboard();
                AfficherNotificationSucces("Dépôt enregistré avec succès!");
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erreur lors de l'ouverture du module de dépôt: {ex.Message}",
                "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void NouveauRetrait_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var retraitWindow = new NouveauRetraitWindow();
            retraitWindow.Owner = this;

            if (retraitWindow.ShowDialog() == true)
            {
                // Actualiser le dashboard après un retrait réussi
                ActualiserDashboard();
                AfficherNotificationSucces("Retrait traité avec succès!");
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erreur lors de l'ouverture du module de retrait: {ex.Message}",
                "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void OperationChange_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var changeWindow = new OperationChangeWindow();
            changeWindow.Owner = this;

            if (changeWindow.ShowDialog() == true)
            {
                // Actualiser le dashboard après un change réussi
                ActualiserDashboard();
                AfficherNotificationSucces("Opération de change validée!");
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erreur lors de l'ouverture du module de change: {ex.Message}",
                "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void ClotureCarriere_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var result = MessageBox.Show(
                "Êtes-vous sûr de vouloir procéder à la clôture de caisse?\n\n" +
                "Cette action nécessitera:\n" +
                "• Vérification de tous les comptes\n" +
                "• Comptage physique des fonds\n" +
                "• Validation superviseur si nécessaire\n" +
                "• Génération du bordereau de clôture",
                "Confirmation Clôture",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);

            if (result == MessageBoxResult.Yes)
            {
                var clotureWindow = new ClotureCaisseWindow();
                clotureWindow.Owner = this;

                if (clotureWindow.ShowDialog() == true)
                {
                    // La clôture a été validée
                    var finResult = MessageBox.Show(
                        "Clôture terminée avec succès!\n\nVoulez-vous fermer l'application?",
                        "Clôture Terminée",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Information);

                    if (finResult == MessageBoxResult.Yes)
                    {
                        Application.Current.Shutdown();
                    }
                }
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erreur lors de la clôture: {ex.Message}",
                "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void Rapports_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            LoadReportsView();
            var reportsButton = FindName("ReportsButton") as Button;
            if (reportsButton != null)
                UpdateActiveButton(reportsButton);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erreur lors de l'ouverture des rapports: {ex.Message}",
                "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void ComptesClients_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            LoadAccountsView();
            var accountsButton = FindName("AccountsButton") as Button;
            if (accountsButton != null)
                UpdateActiveButton(accountsButton);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erreur lors de l'ouverture de la consultation: {ex.Message}",
                "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    #endregion

    #region Navigation et Chargement des Vues

    private void LoadTransactionView()
    {
        try
        {
            var scrollViewer = FindName("MainContentScrollViewer") as ScrollViewer;
            
            if (scrollViewer != null)
            {
                // Remplacer le contenu par la TransactionView
                var transactionView = new TransactionView();
                scrollViewer.Content = transactionView;
                
                // Mise à jour du titre
                this.Title = "Gestion des Transactions - Nala Kredi Ti Machann";
            }
            else
            {
                MessageBox.Show("Impossible de trouver la zone de contenu", "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erreur lors du chargement de la vue: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void LoadReportsView()
    {
        try
        {
            var scrollViewer = FindName("MainContentScrollViewer") as ScrollViewer;
            
            if (scrollViewer != null)
            {
                // Remplacer le contenu par la ReportsView
                var reportsView = new ReportsView();
                scrollViewer.Content = reportsView;
                
                // Mise à jour du titre
                this.Title = "Rapports - Nala Kredi Ti Machann";
            }
            else
            {
                MessageBox.Show("Impossible de trouver la zone de contenu", "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erreur lors du chargement de la vue rapports: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void LoadAccountsView()
    {
        try
        {
            var scrollViewer = FindName("MainContentScrollViewer") as ScrollViewer;
            
            if (scrollViewer != null)
            {
                // Remplacer le contenu par la AccountsView
                var accountsView = new AccountsView();
                scrollViewer.Content = accountsView;
                
                // Mise à jour du titre
                this.Title = "Comptes Clients - Nala Kredi Ti Machann";
            }
            else
            {
                MessageBox.Show("Impossible de trouver la zone de contenu", "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erreur lors du chargement de la vue comptes: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void LoadDashboardView()
    {
        // Méthode pour recharger la vue dashboard originale
        try
        {
            var scrollViewer = FindName("MainContentScrollViewer") as ScrollViewer;
            var mainDashboardGrid = FindName("MainDashboardGrid") as Grid;
            
            if (scrollViewer != null && mainDashboardGrid != null)
            {
                // Restaurer le dashboard original
                scrollViewer.Content = mainDashboardGrid;
                
                // Recharger les données
                LoadSampleData();
                
                // Mise à jour du titre
                this.Title = "Dashboard Caissier - Nala Kredi Ti Machann";
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erreur lors du rechargement du dashboard: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    #endregion

    #region Utilitaires

    private void ActualiserDashboard()
    {
        // Dans un vrai système, ceci rechargerait les données depuis la base
        LoadSampleData();

        // Simuler une petite variation dans les soldes pour montrer l'activité
        AfficherNotificationInfo("Dashboard actualisé");
    }

    private void AfficherNotificationSucces(string message)
    {
        // Utiliser le titre de la fenêtre temporairement pour afficher les notifications
        string originalTitle = this.Title;
        this.Title = $"✅ {message}";

        // Restaurer après 3 secondes
        var timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(3) };
        timer.Tick += (s, e) =>
        {
            timer.Stop();
            this.Title = originalTitle;
        };
        timer.Start();
    }

    private void AfficherNotificationInfo(string message)
    {
        // Utiliser le titre de la fenêtre temporairement pour afficher les notifications
        string originalTitle = this.Title;
        this.Title = $"ℹ️ {message}";

        // Restaurer après 2 secondes
        var timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(2) };
        timer.Tick += (s, e) =>
        {
            timer.Stop();
            this.Title = originalTitle;
        };
        timer.Start();
    }

    #endregion

    protected override void OnClosed(EventArgs e)
    {
        _timer?.Stop();
        base.OnClosed(e);
    }
}