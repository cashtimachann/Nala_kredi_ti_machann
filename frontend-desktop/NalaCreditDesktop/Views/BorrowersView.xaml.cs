using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class BorrowersView : UserControl
    {
        private readonly ApiService _apiService;
        private ObservableCollection<BorrowerDisplayItem> _borrowers = new ObservableCollection<BorrowerDisplayItem>();
        private Dictionary<Guid, List<MicrocreditLoan>> _borrowerLoans = new Dictionary<Guid, List<MicrocreditLoan>>();
        private int _currentPage = 1;
        private int _totalPages = 1;
        private int _totalCount = 0;
        private const int _pageSize = 20;

        public BorrowersView(ApiService? apiService = null)
        {
            InitializeComponent();
            _apiService = apiService ?? AppServices.GetRequiredApiService();
            
            BorrowersDataGrid.ItemsSource = _borrowers;
            SetupEventHandlers();
            _ = LoadBorrowersAsync();
        }

        private void SetupEventHandlers()
        {
            RefreshButton.Click += RefreshButton_Click;
            ExportButton.Click += ExportButton_Click;
            ApplyFiltersButton.Click += ApplyFilters_Click;
            SearchTextBox.TextChanged += SearchTextBox_TextChanged;
            StatusFilterComboBox.SelectionChanged += FilterChanged;
            SortByComboBox.SelectionChanged += FilterChanged;
            PrevPageButton.Click += PrevPage_Click;
            NextPageButton.Click += NextPage_Click;
        }

        private async Task LoadBorrowersAsync()
        {
            try
            {
                ShowLoading(true);
                _borrowers.Clear();
                _borrowerLoans.Clear();

                // Get all active and overdue loans to find unique borrowers
                var activeLoans = await _apiService.GetLoansAsync(
                    page: 1,
                    pageSize: 500,
                    status: "Active",
                    branchId: null,
                    isOverdue: null
                );

                var overdueLoans = await _apiService.GetLoansAsync(
                    page: 1,
                    pageSize: 500,
                    status: "Overdue",
                    branchId: null,
                    isOverdue: true
                );

                // Combine all loans
                var allLoans = new List<MicrocreditLoan>();
                if (activeLoans?.Loans != null)
                    allLoans.AddRange(activeLoans.Loans);
                if (overdueLoans?.Loans != null)
                    allLoans.AddRange(overdueLoans.Loans);

                // Group loans by borrower (using BorrowerName as key since we don't have CustomerId)
                var borrowerGroups = allLoans
                    .GroupBy(l => new { 
                        Name = $"{l.BorrowerFirstName} {l.BorrowerLastName}".Trim(), 
                        Phone = l.BorrowerPhone 
                    })
                    .ToList();

                foreach (var group in borrowerGroups)
                {
                    var loans = group.ToList();
                    var firstLoan = loans.First();
                    
                    // Generate a unique ID for this borrower based on name and phone
                    var customerId = Guid.NewGuid();
                    _borrowerLoans[customerId] = loans;

                    var activeLoansCount = loans.Count(l => l.Status == "Active" || l.Status == "Overdue");
                    var totalOutstanding = loans.Sum(l => l.RemainingBalance);
                    var hasOverdue = loans.Any(l => l.DaysOverdue > 0);
                    
                    // Calculate repayment rate (simplified)
                    var totalExpected = loans.Sum(l => l.PrincipalAmount);
                    var totalPaid = loans.Sum(l => l.PrincipalAmount - l.RemainingBalance);
                    var repaymentRate = totalExpected > 0 ? (totalPaid / totalExpected * 100) : 0;

                    var lastPaymentDate = loans.Max(l => l.NextPaymentDate);

                    _borrowers.Add(new BorrowerDisplayItem
                    {
                        CustomerId = customerId,
                        CustomerName = group.Key.Name,
                        CustomerPhone = group.Key.Phone ?? "N/A",
                        CustomerEmail = "N/A",
                        SavingsAccountNumber = "N/A",
                        TotalLoans = loans.Count,
                        TotalLoansDisplay = $"{loans.Count} prêt{(loans.Count > 1 ? "s" : "")}",
                        ActiveLoans = activeLoansCount,
                        ActiveLoansDisplay = $"{activeLoansCount} actif{(activeLoansCount > 1 ? "s" : "")}",
                        OutstandingAmount = totalOutstanding,
                        OutstandingAmountDisplay = $"{totalOutstanding:N2} HTG",
                        LastPaymentDisplay = lastPaymentDate.HasValue ? $"Prochain: {lastPaymentDate:dd/MM/yy}" : "Aucun",
                        RepaymentRate = repaymentRate,
                        RepaymentRateDisplay = $"{repaymentRate:F0}%",
                        HasIssues = hasOverdue,
                        StatusDisplay = hasOverdue ? "En Retard" : (activeLoansCount > 0 ? "À Jour" : "Inactif")
                    });
                }

                // Sort by name A-Z by default
                var sorted = _borrowers.OrderBy(b => b.CustomerName).ToList();
                _borrowers.Clear();
                foreach (var item in sorted)
                {
                    _borrowers.Add(item);
                }

                _totalCount = _borrowers.Count;
                _totalPages = (int)Math.Ceiling((double)_totalCount / _pageSize);

                UpdateStatistics();
                UpdatePagination();
                ShowEmptyState(_borrowers.Count == 0);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement des emprunteurs:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                ShowEmptyState(true);
            }
            finally
            {
                ShowLoading(false);
            }
        }

        private void UpdateStatistics()
        {
            var total = _borrowers.Count;
            TotalClientsText.Text = total.ToString();

            var activeClients = _borrowers.Count(b => b.ActiveLoans > 0);
            ActiveClientsText.Text = activeClients.ToString();
            ActiveClientsSubText.Text = activeClients > 1 ? "avec prêts actifs" : "avec prêt actif";

            var withIssues = _borrowers.Count(b => b.HasIssues);
            WithIssuesText.Text = withIssues.ToString();
            WithIssuesSubText.Text = withIssues > 1 ? "nécessitent attention" : "nécessite attention";

            var goodStanding = _borrowers.Count(b => b.ActiveLoans > 0 && !b.HasIssues);
            GoodStandingText.Text = goodStanding.ToString();
        }

        private void UpdatePagination()
        {
            CurrentPageText.Text = $"Page {_currentPage} / {Math.Max(1, _totalPages)}";

            var startItem = _totalCount == 0 ? 0 : ((_currentPage - 1) * _pageSize) + 1;
            var endItem = Math.Min(_currentPage * _pageSize, _totalCount);
            PageInfoText.Text = $"{startItem}-{endItem} sur {_totalCount}";

            PrevPageButton.IsEnabled = _currentPage > 1;
            NextPageButton.IsEnabled = _currentPage < _totalPages;
        }

        private void ShowLoading(bool show)
        {
            LoadingPanel.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
            BorrowersDataGrid.Visibility = show ? Visibility.Collapsed : Visibility.Visible;
        }

        private void ShowEmptyState(bool show)
        {
            EmptyStatePanel.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
            BorrowersDataGrid.Visibility = show ? Visibility.Collapsed : Visibility.Visible;
        }

        // Event Handlers
        private async void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            _currentPage = 1;
            await LoadBorrowersAsync();
            MessageBox.Show("Données actualisées!", "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void ExportButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var exportData = string.Join("\n", _borrowers.Select(b =>
                    $"{b.CustomerName}\t{b.CustomerPhone}\t{b.SavingsAccountNumber}\t" +
                    $"{b.TotalLoans}\t{b.ActiveLoans}\t{b.OutstandingAmount:N2}\t" +
                    $"{b.RepaymentRate:F1}%\t{b.StatusDisplay}"));

                var header = "Nom\tTéléphone\tN° Compte\tTotal Prêts\tActifs\tEncours\tTaux Remb.\tStatut\n";
                var fullData = header + exportData;

                Clipboard.SetText(fullData);
                MessageBox.Show($"Données de {_borrowers.Count} emprunteurs copiées dans le presse-papiers!\n\n" +
                    "Vous pouvez maintenant les coller dans Excel.",
                    "Export Réussi", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'export:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void ApplyFilters_Click(object sender, RoutedEventArgs e)
        {
            _currentPage = 1;
            await ApplyFiltersAsync();
        }

        private void SearchTextBox_TextChanged(object sender, TextChangedEventArgs e)
        {
            var searchTerm = SearchTextBox.Text?.ToLower() ?? "";
            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                BorrowersDataGrid.ItemsSource = _borrowers;
                return;
            }

            var filtered = _borrowers.Where(b =>
                b.CustomerName.ToLower().Contains(searchTerm) ||
                b.CustomerPhone.Contains(searchTerm) ||
                b.SavingsAccountNumber.ToLower().Contains(searchTerm)
            ).ToList();

            BorrowersDataGrid.ItemsSource = filtered;
        }

        private async void FilterChanged(object sender, SelectionChangedEventArgs e)
        {
            if (IsLoaded)
            {
                await ApplyFiltersAsync();
            }
        }

        private async Task ApplyFiltersAsync()
        {
            try
            {
                ShowLoading(true);

                var selectedStatus = (StatusFilterComboBox.SelectedItem as ComboBoxItem)?.Content.ToString();
                var selectedSort = (SortByComboBox.SelectedItem as ComboBoxItem)?.Content.ToString();

                await LoadBorrowersAsync();

                // Apply status filter
                var filtered = _borrowers.ToList();
                if (!string.IsNullOrEmpty(selectedStatus) && selectedStatus != "Tous")
                {
                    filtered = selectedStatus switch
                    {
                        "Avec prêts actifs" => filtered.Where(b => b.ActiveLoans > 0).ToList(),
                        "Avec retards" => filtered.Where(b => b.HasIssues).ToList(),
                        "À jour" => filtered.Where(b => b.ActiveLoans > 0 && !b.HasIssues).ToList(),
                        "Sans prêt actif" => filtered.Where(b => b.ActiveLoans == 0).ToList(),
                        _ => filtered
                    };
                }

                // Apply sorting
                filtered = selectedSort switch
                {
                    "Nom A-Z" => filtered.OrderBy(b => b.CustomerName).ToList(),
                    "Nom Z-A" => filtered.OrderByDescending(b => b.CustomerName).ToList(),
                    "Plus de prêts" => filtered.OrderByDescending(b => b.TotalLoans).ToList(),
                    "Dernier prêt" => filtered.OrderByDescending(b => b.OutstandingAmount).ToList(),
                    _ => filtered
                };

                BorrowersDataGrid.ItemsSource = filtered;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'application des filtres:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                ShowLoading(false);
            }
        }

        private async void PrevPage_Click(object sender, RoutedEventArgs e)
        {
            if (_currentPage > 1)
            {
                _currentPage--;
                await LoadBorrowersAsync();
            }
        }

        private async void NextPage_Click(object sender, RoutedEventArgs e)
        {
            if (_currentPage < _totalPages)
            {
                _currentPage++;
                await LoadBorrowersAsync();
            }
        }

        private void ViewProfile_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is Guid customerId)
            {
                var borrower = _borrowers.FirstOrDefault(b => b.CustomerId == customerId);
                if (borrower != null && _borrowerLoans.ContainsKey(customerId))
                {
                    var loans = _borrowerLoans[customerId];
                    var loanDetails = string.Join("\n", loans.Select(l => 
                        $"  • {l.LoanNumber}: {l.RemainingBalance:N2} HTG ({l.Status})"));

                    MessageBox.Show(
                        $"Profil de l'emprunteur\n\n" +
                        $"Nom: {borrower.CustomerName}\n" +
                        $"Téléphone: {borrower.CustomerPhone}\n" +
                        $"Compte: {borrower.SavingsAccountNumber}\n\n" +
                        $"Statistiques:\n" +
                        $"  • Total prêts: {borrower.TotalLoans}\n" +
                        $"  • Prêts actifs: {borrower.ActiveLoans}\n" +
                        $"  • Encours total: {borrower.OutstandingAmountDisplay}\n" +
                        $"  • Taux remboursement: {borrower.RepaymentRateDisplay}\n" +
                        $"  • Statut: {borrower.StatusDisplay}\n\n" +
                        $"Prêts:\n{loanDetails}",
                        "Profil Client",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                }
            }
        }

        private void ViewLoanHistory_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is Guid customerId)
            {
                var borrower = _borrowers.FirstOrDefault(b => b.CustomerId == customerId);
                if (borrower != null && _borrowerLoans.ContainsKey(customerId))
                {
                    var loans = _borrowerLoans[customerId];
                    var loanHistory = string.Join("\n", loans.Select(l =>
                        $"• {l.LoanNumber}\n" +
                        $"  Type: {l.LoanType}\n" +
                        $"  Montant: {l.PrincipalAmount:N2} HTG\n" +
                        $"  Reste: {l.RemainingBalance:N2} HTG\n" +
                        $"  Statut: {l.Status}\n" +
                        $"  Durée: {l.TermMonths} mois\n" +
                        $"  Retard: {l.DaysOverdue} jour(s)\n"));

                    MessageBox.Show(
                        $"Historique des prêts\n\n" +
                        $"Client: {borrower.CustomerName}\n" +
                        $"Total: {loans.Count} prêt(s)\n\n" +
                        $"{loanHistory}",
                        "Historique des Prêts",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                }
            }
        }

        private void ContactClient_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is string phone)
            {
                try
                {
                    Clipboard.SetText(phone);
                    MessageBox.Show(
                        $"📞 Numéro copié:\n{phone}\n\n" +
                        "Le numéro a été copié dans le presse-papiers.",
                        "Contacter Client",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Erreur:\n{ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void NewLoan_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is string accountNumber)
            {
                try
                {
                    var createWindow = new CreateCreditRequestWindow(_apiService);
                    createWindow.Owner = Window.GetWindow(this);
                    
                    // Try to pre-fill account number if possible
                    createWindow.Loaded += (s, args) =>
                    {
                        try
                        {
                            var accountField = createWindow.FindName("AccountNumberTextBox") as TextBox;
                            if (accountField != null && accountNumber != "N/A")
                            {
                                accountField.Text = accountNumber;
                            }
                        }
                        catch { }
                    };
                    
                    if (createWindow.ShowDialog() == true)
                    {
                        _ = LoadBorrowersAsync();
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Erreur lors de l'ouverture du formulaire:\n{ex.Message}",
                        "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }
    }

    // Display Model for Borrowers
    public class BorrowerDisplayItem
    {
        public Guid CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string SavingsAccountNumber { get; set; } = string.Empty;
        public int TotalLoans { get; set; }
        public string TotalLoansDisplay { get; set; } = string.Empty;
        public int ActiveLoans { get; set; }
        public string ActiveLoansDisplay { get; set; } = string.Empty;
        public decimal OutstandingAmount { get; set; }
        public string OutstandingAmountDisplay { get; set; } = string.Empty;
        public string LastPaymentDisplay { get; set; } = string.Empty;
        public decimal RepaymentRate { get; set; }
        public string RepaymentRateDisplay { get; set; } = string.Empty;
        public bool HasIssues { get; set; }
        public string StatusDisplay { get; set; } = string.Empty;
    }
}
