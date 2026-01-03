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
    public partial class SearchBorrowerView : UserControl
    {
        private readonly ApiService _apiService;
        private ObservableCollection<SearchResultDisplayItem> _searchResults = new ObservableCollection<SearchResultDisplayItem>();
        private Dictionary<Guid, List<MicrocreditLoan>> _borrowerLoans = new Dictionary<Guid, List<MicrocreditLoan>>();
        private int _currentPage = 1;
        private int _totalPages = 1;
        private int _totalCount = 0;
        private const int _pageSize = 20;
        private bool _isAdvancedSearchVisible = false;

        public SearchBorrowerView(ApiService? apiService = null)
        {
            InitializeComponent();
            _apiService = apiService ?? AppServices.GetRequiredApiService();
            
            ResultsDataGrid.ItemsSource = _searchResults;
            SetupEventHandlers();
        }

        private void SetupEventHandlers()
        {
            ClearButton.Click += ClearButton_Click;
            QuickSearchButton.Click += QuickSearchButton_Click;
            AdvancedToggleButton.Click += AdvancedToggleButton_Click;
            AdvancedSearchButton.Click += AdvancedSearchButton_Click;
            ExportButton.Click += ExportButton_Click;
            PrevPageButton.Click += PrevPage_Click;
            NextPageButton.Click += NextPage_Click;
            
            QuickSearchTextBox.KeyDown += (s, e) => 
            {
                if (e.Key == System.Windows.Input.Key.Enter)
                {
                    _ = PerformQuickSearchAsync();
                }
            };
        }

        private void AdvancedToggleButton_Click(object sender, RoutedEventArgs e)
        {
            _isAdvancedSearchVisible = !_isAdvancedSearchVisible;
            AdvancedSearchPanel.Visibility = _isAdvancedSearchVisible ? Visibility.Visible : Visibility.Collapsed;
            AdvancedToggleButton.Content = _isAdvancedSearchVisible ? "▲ Masquer Recherche Avancée" : "▼ Recherche Avancée";
        }

        private async void QuickSearchButton_Click(object sender, RoutedEventArgs e)
        {
            await PerformQuickSearchAsync();
        }

        private async void AdvancedSearchButton_Click(object sender, RoutedEventArgs e)
        {
            await PerformAdvancedSearchAsync();
        }

        private async Task PerformQuickSearchAsync()
        {
            var searchTerm = QuickSearchTextBox.Text?.Trim();
            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                MessageBox.Show("Veuillez entrer un terme de recherche.", 
                    "Recherche Vide", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            await SearchBorrowersAsync(searchTerm: searchTerm);
        }

        private async Task PerformAdvancedSearchAsync()
        {
            var firstName = FirstNameTextBox.Text?.Trim();
            var lastName = LastNameTextBox.Text?.Trim();
            var phone = PhoneTextBox.Text?.Trim();
            var accountNumber = AccountNumberTextBox.Text?.Trim();
            var email = EmailTextBox.Text?.Trim();
            var loanStatus = (LoanStatusComboBox.SelectedItem as ComboBoxItem)?.Content.ToString();

            if (string.IsNullOrWhiteSpace(firstName) && 
                string.IsNullOrWhiteSpace(lastName) && 
                string.IsNullOrWhiteSpace(phone) &&
                string.IsNullOrWhiteSpace(accountNumber) &&
                string.IsNullOrWhiteSpace(email))
            {
                MessageBox.Show("Veuillez remplir au moins un critère de recherche.", 
                    "Critères Vides", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            await SearchBorrowersAsync(
                firstName: firstName,
                lastName: lastName,
                phone: phone,
                accountNumber: accountNumber,
                email: email,
                loanStatus: loanStatus
            );
        }

        private async Task SearchBorrowersAsync(
            string? searchTerm = null,
            string? firstName = null,
            string? lastName = null,
            string? phone = null,
            string? accountNumber = null,
            string? email = null,
            string? loanStatus = null)
        {
            try
            {
                ShowLoading(true);
                _searchResults.Clear();
                _borrowerLoans.Clear();

                // Get all active and overdue loans to find borrowers
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

                // Apply filters
                var filteredLoans = allLoans.AsEnumerable();

                if (!string.IsNullOrWhiteSpace(searchTerm))
                {
                    var term = searchTerm.ToLower();
                    filteredLoans = filteredLoans.Where(l =>
                        (l.BorrowerFirstName?.ToLower().Contains(term) ?? false) ||
                        (l.BorrowerLastName?.ToLower().Contains(term) ?? false) ||
                        (l.BorrowerPhone?.Contains(term) ?? false) ||
                        (l.LoanNumber?.ToLower().Contains(term) ?? false)
                    );
                }

                if (!string.IsNullOrWhiteSpace(firstName))
                {
                    filteredLoans = filteredLoans.Where(l =>
                        l.BorrowerFirstName?.ToLower().Contains(firstName.ToLower()) ?? false);
                }

                if (!string.IsNullOrWhiteSpace(lastName))
                {
                    filteredLoans = filteredLoans.Where(l =>
                        l.BorrowerLastName?.ToLower().Contains(lastName.ToLower()) ?? false);
                }

                if (!string.IsNullOrWhiteSpace(phone))
                {
                    filteredLoans = filteredLoans.Where(l =>
                        l.BorrowerPhone?.Contains(phone) ?? false);
                }

                // Group by borrower
                var borrowerGroups = filteredLoans
                    .GroupBy(l => new { 
                        Name = $"{l.BorrowerFirstName} {l.BorrowerLastName}".Trim(), 
                        Phone = l.BorrowerPhone 
                    })
                    .ToList();

                // Apply loan status filter
                if (!string.IsNullOrWhiteSpace(loanStatus) && loanStatus != "Tous")
                {
                    if (loanStatus == "Avec prêts actifs")
                    {
                        borrowerGroups = borrowerGroups.Where(g => g.Any(l => l.Status == "Active" || l.Status == "Overdue")).ToList();
                    }
                    else if (loanStatus == "Avec retards")
                    {
                        borrowerGroups = borrowerGroups.Where(g => g.Any(l => l.DaysOverdue > 0)).ToList();
                    }
                    else if (loanStatus == "Sans prêt")
                    {
                        borrowerGroups.Clear(); // Cannot filter this way
                    }
                }

                foreach (var group in borrowerGroups)
                {
                    var loans = group.ToList();
                    var firstLoan = loans.First();
                    
                    var customerId = Guid.NewGuid();
                    _borrowerLoans[customerId] = loans;

                    var activeLoansCount = loans.Count(l => l.Status == "Active" || l.Status == "Overdue");
                    var totalOutstanding = loans.Sum(l => l.RemainingBalance);
                    var hasOverdue = loans.Any(l => l.DaysOverdue > 0);
                    var lastPaymentDate = loans.Max(l => l.NextPaymentDate);

                    _searchResults.Add(new SearchResultDisplayItem
                    {
                        CustomerId = customerId,
                        CustomerName = group.Key.Name,
                        CustomerPhone = group.Key.Phone ?? "N/A",
                        CustomerEmail = email ?? "N/A",
                        SavingsAccountNumber = accountNumber ?? "N/A",
                        TotalLoans = loans.Count,
                        TotalLoansDisplay = $"{loans.Count} prêt{(loans.Count > 1 ? "s" : "")}",
                        ActiveLoans = activeLoansCount,
                        ActiveLoansDisplay = $"{activeLoansCount} actif{(activeLoansCount > 1 ? "s" : "")}",
                        OutstandingAmount = totalOutstanding,
                        OutstandingAmountDisplay = $"{totalOutstanding:N2} HTG",
                        LastPaymentDisplay = lastPaymentDate.HasValue ? $"Prochain: {lastPaymentDate:dd/MM/yy}" : "Aucun",
                        HasIssues = hasOverdue,
                        StatusDisplay = hasOverdue ? "En Retard" : (activeLoansCount > 0 ? "À Jour" : "Inactif")
                    });
                }

                _totalCount = _searchResults.Count;
                _totalPages = (int)Math.Ceiling((double)_totalCount / _pageSize);

                UpdateResultsDisplay();
                UpdatePagination();

                if (_searchResults.Count == 0)
                {
                    ShowNoResults(true);
                }
                else
                {
                    ShowResults(true);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de la recherche:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                ShowEmptyState(true);
            }
            finally
            {
                ShowLoading(false);
            }
        }

        private void UpdateResultsDisplay()
        {
            ResultsCountNumber.Text = $"({_totalCount} trouvé{(_totalCount > 1 ? "s" : "")})";
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
            if (show)
            {
                EmptyStatePanel.Visibility = Visibility.Collapsed;
                NoResultsPanel.Visibility = Visibility.Collapsed;
                ResultsDataGrid.Visibility = Visibility.Collapsed;
            }
        }

        private void ShowEmptyState(bool show)
        {
            EmptyStatePanel.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
            if (show)
            {
                LoadingPanel.Visibility = Visibility.Collapsed;
                NoResultsPanel.Visibility = Visibility.Collapsed;
                ResultsDataGrid.Visibility = Visibility.Collapsed;
            }
        }

        private void ShowNoResults(bool show)
        {
            NoResultsPanel.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
            if (show)
            {
                LoadingPanel.Visibility = Visibility.Collapsed;
                EmptyStatePanel.Visibility = Visibility.Collapsed;
                ResultsDataGrid.Visibility = Visibility.Collapsed;
            }
        }

        private void ShowResults(bool show)
        {
            ResultsDataGrid.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
            if (show)
            {
                LoadingPanel.Visibility = Visibility.Collapsed;
                EmptyStatePanel.Visibility = Visibility.Collapsed;
                NoResultsPanel.Visibility = Visibility.Collapsed;
            }
        }

        // Event Handlers
        private void ClearButton_Click(object sender, RoutedEventArgs e)
        {
            QuickSearchTextBox.Clear();
            FirstNameTextBox.Clear();
            LastNameTextBox.Clear();
            PhoneTextBox.Clear();
            AccountNumberTextBox.Clear();
            EmailTextBox.Clear();
            LoanStatusComboBox.SelectedIndex = 0;

            _searchResults.Clear();
            _borrowerLoans.Clear();
            ShowEmptyState(true);
            
            ResultsCountNumber.Text = "";
            MessageBox.Show("Critères de recherche effacés.", "Effacé", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void ExportButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (_searchResults.Count == 0)
                {
                    MessageBox.Show("Aucun résultat à exporter.", "Export", MessageBoxButton.OK, MessageBoxImage.Information);
                    return;
                }

                var exportData = string.Join("\n", _searchResults.Select(r =>
                    $"{r.CustomerName}\t{r.CustomerPhone}\t{r.CustomerEmail}\t{r.SavingsAccountNumber}\t" +
                    $"{r.TotalLoans}\t{r.ActiveLoans}\t{r.OutstandingAmount:N2}\t{r.StatusDisplay}"));

                var header = "Nom\tTéléphone\tEmail\tN° Compte\tTotal Prêts\tActifs\tEncours\tStatut\n";
                var fullData = header + exportData;

                Clipboard.SetText(fullData);
                MessageBox.Show($"Résultats de recherche ({_searchResults.Count} entrées) copiés!\n\n" +
                    "Vous pouvez maintenant les coller dans Excel.",
                    "Export Réussi", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'export:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void PrevPage_Click(object sender, RoutedEventArgs e)
        {
            if (_currentPage > 1)
            {
                _currentPage--;
                UpdatePagination();
            }
        }

        private async void NextPage_Click(object sender, RoutedEventArgs e)
        {
            if (_currentPage < _totalPages)
            {
                _currentPage++;
                UpdatePagination();
            }
        }

        private void ViewProfile_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is Guid customerId)
            {
                var result = _searchResults.FirstOrDefault(r => r.CustomerId == customerId);
                if (result != null && _borrowerLoans.ContainsKey(customerId))
                {
                    var loans = _borrowerLoans[customerId];
                    var loanDetails = string.Join("\n", loans.Select(l => 
                        $"  • {l.LoanNumber}: {l.RemainingBalance:N2} HTG ({l.Status})"));

                    MessageBox.Show(
                        $"Profil du Client\n\n" +
                        $"Nom: {result.CustomerName}\n" +
                        $"Téléphone: {result.CustomerPhone}\n" +
                        $"Email: {result.CustomerEmail}\n" +
                        $"Compte: {result.SavingsAccountNumber}\n\n" +
                        $"Statistiques:\n" +
                        $"  • Total prêts: {result.TotalLoans}\n" +
                        $"  • Prêts actifs: {result.ActiveLoans}\n" +
                        $"  • Encours total: {result.OutstandingAmountDisplay}\n" +
                        $"  • Statut: {result.StatusDisplay}\n\n" +
                        $"Prêts:\n{loanDetails}",
                        "Profil Client",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                }
            }
        }

        private void ViewLoans_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is Guid customerId)
            {
                var result = _searchResults.FirstOrDefault(r => r.CustomerId == customerId);
                if (result != null && _borrowerLoans.ContainsKey(customerId))
                {
                    var loans = _borrowerLoans[customerId];
                    var loanHistory = string.Join("\n\n", loans.Select(l =>
                        $"📋 {l.LoanNumber}\n" +
                        $"  Type: {l.LoanType}\n" +
                        $"  Montant: {l.PrincipalAmount:N2} HTG\n" +
                        $"  Reste: {l.RemainingBalance:N2} HTG\n" +
                        $"  Statut: {l.Status}\n" +
                        $"  Durée: {l.TermMonths} mois\n" +
                        $"  Retard: {l.DaysOverdue} jour(s)"));

                    MessageBox.Show(
                        $"Historique des Prêts\n\n" +
                        $"Client: {result.CustomerName}\n" +
                        $"Total: {loans.Count} prêt(s)\n\n" +
                        $"{loanHistory}",
                        "Historique des Prêts",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                }
            }
        }

        private void Contact_Click(object sender, RoutedEventArgs e)
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
                        MessageBox.Show("Demande de prêt créée avec succès!", 
                            "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
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

    // Display Model for Search Results
    public class SearchResultDisplayItem
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
        public bool HasIssues { get; set; }
        public string StatusDisplay { get; set; } = string.Empty;
    }
}
