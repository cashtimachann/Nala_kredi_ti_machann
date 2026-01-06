using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Diagnostics;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class ActiveLoansView : UserControl
    {
        private readonly ApiService _apiService;
        private ObservableCollection<ActiveLoanDisplayItem> _activeLoans = new ObservableCollection<ActiveLoanDisplayItem>();
        private int _currentPage = 1;
        private int _totalPages = 1;
        private int _totalCount = 0;
        private const int _pageSize = 20;

        public ActiveLoansView(ApiService? apiService = null)
        {
            InitializeComponent();
            _apiService = apiService ?? AppServices.GetRequiredApiService();
            
            ActiveLoansDataGrid.ItemsSource = _activeLoans;
            SetupEventHandlers();
            _ = LoadActiveLoansAsync();
        }

        private void SetupEventHandlers()
        {
            RefreshButton.Click += RefreshButton_Click;
            ExportButton.Click += ExportButton_Click;
            ApplyFiltersButton.Click += ApplyFilters_Click;
            SearchTextBox.TextChanged += SearchTextBox_TextChanged;
            StatusFilterComboBox.SelectionChanged += FilterChanged;
            LoanTypeFilterComboBox.SelectionChanged += FilterChanged;
            PrevPageButton.Click += PrevPage_Click;
            NextPageButton.Click += NextPage_Click;
        }

        private async Task LoadActiveLoansAsync()
        {
            try
            {
                ShowLoading(true);
                _activeLoans.Clear();

                // Get the current user's branch ID to filter loans
                var userBranchId = _apiService.CurrentUser?.BranchId;

                Debug.WriteLine($"[ActiveLoansView] Current user branch ID: {userBranchId}");

                // Get active loans - fetch Active, Overdue, and Defaulted loans (like web app)
                // Filter by user's branch ID
                var activeTasks = new[]
                {
                    _apiService.GetLoansAsync(page: _currentPage, pageSize: _pageSize, status: "Active", branchId: userBranchId, isOverdue: null),
                    _apiService.GetLoansAsync(page: _currentPage, pageSize: _pageSize, status: "Overdue", branchId: userBranchId, isOverdue: null),
                    _apiService.GetLoansAsync(page: _currentPage, pageSize: _pageSize, status: "Defaulted", branchId: userBranchId, isOverdue: null)
                };

                var results = await Task.WhenAll(activeTasks);
                
                Debug.WriteLine($"[ActiveLoansView] Results received - Active: {results[0]?.Loans?.Count ?? 0}, Overdue: {results[1]?.Loans?.Count ?? 0}, Defaulted: {results[2]?.Loans?.Count ?? 0}");

                // Combine all loans from different statuses
                var allLoans = new List<MicrocreditLoan>();
                foreach (var result in results)
                {
                    if (result?.Loans != null && result.Loans.Any())
                    {
                        allLoans.AddRange(result.Loans);
                    }
                }

                Debug.WriteLine($"[ActiveLoansView] Total loans combined: {allLoans.Count}");

                if (!allLoans.Any())
                {
                    Debug.WriteLine("[ActiveLoansView] No loans found - showing empty state");
                    // Show debugging info to user
                    MessageBox.Show(
                        $"Aucun prêt actif trouvé.\n\n" +
                        $"Branch ID: {userBranchId?.ToString() ?? "NULL"}\n" +
                        $"Active: {results[0]?.Loans?.Count ?? 0}\n" +
                        $"Overdue: {results[1]?.Loans?.Count ?? 0}\n" +
                        $"Defaulted: {results[2]?.Loans?.Count ?? 0}\n" +
                        $"Total Count from results: {results[0]?.TotalCount ?? 0}",
                        "Debug Info",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                    ShowEmptyState(true);
                    return;
                }

                // Use the first non-null result for pagination info
                var paginationResult = results.FirstOrDefault(r => r != null);
                if (paginationResult != null)
                {
                    _totalCount = allLoans.Count; // Total from all statuses
                    _totalPages = Math.Max(1, (int)Math.Ceiling(_totalCount / (double)_pageSize));
                }

                foreach (var loan in allLoans)
                {
                    // Get borrower info from Borrower object if available, fallback to direct fields
                    var firstName = loan.Borrower?.FirstName ?? loan.BorrowerFirstName ?? "";
                    var lastName = loan.Borrower?.LastName ?? loan.BorrowerLastName ?? "";
                    var customerName = !string.IsNullOrWhiteSpace(firstName) || !string.IsNullOrWhiteSpace(lastName)
                        ? $"{firstName} {lastName}".Trim()
                        : loan.BorrowerName;
                    
                    var customerPhone = loan.Borrower?.Phone ?? loan.BorrowerPhone ?? "N/A";
                    
                    // Get loan officer name
                    var loanOfficer = !string.IsNullOrWhiteSpace(loan.LoanOfficerName) 
                        ? loan.LoanOfficerName 
                        : "N/A";
                    
                    // Use DurationMonths if TermMonths is 0 (backend sends DurationMonths)
                    var termMonths = loan.TermMonths > 0 ? loan.TermMonths : loan.DurationMonths;
                    if (termMonths <= 0) termMonths = 1; // Avoid division by zero
                    
                    // Use InstallmentAmount if MonthlyPayment is 0 (backend sends InstallmentAmount)
                    var monthlyPayment = loan.MonthlyPayment > 0 ? loan.MonthlyPayment : loan.InstallmentAmount;
                    
                    // Calculate processing fee (5% of principal)
                    var processingFee = loan.PrincipalAmount * 0.05m;
                    var monthlyFeePortion = processingFee / termMonths;
                    var monthlyPaymentWithFees = monthlyPayment + monthlyFeePortion;
                    
                    // Use OutstandingBalance if RemainingBalance is 0 (backend uses OutstandingBalance)
                    var outstandingBalance = loan.RemainingBalance > 0 ? loan.RemainingBalance : loan.OutstandingBalance;
                    
                    // Use InstallmentsPaid if PaymentsMade is 0
                    var paymentsMade = loan.PaymentsMade > 0 ? loan.PaymentsMade : loan.InstallmentsPaid;
                    
                    // Calculate remaining processing fees to add to outstanding balance
                    var installmentsRemaining = termMonths - paymentsMade;
                    var remainingProcessingFees = (processingFee * installmentsRemaining) / termMonths;
                    
                    // Total remaining balance = outstanding balance + remaining processing fees
                    var remainingBalance = outstandingBalance + remainingProcessingFees;
                    
                    // Use AmountPaid directly from backend
                    var amountPaid = loan.AmountPaid;
                    
                    // Get monthly interest rate: prefer MonthlyInterestRate, fallback to InterestRate / 12
                    var monthlyRate = loan.MonthlyInterestRate.HasValue && loan.MonthlyInterestRate.Value > 0
                        ? loan.MonthlyInterestRate.Value
                        : (loan.InterestRate / 12);
                    
                    // Convert to percentage for display (multiply by 100)
                    var monthlyRatePercent = monthlyRate * 100;
                    
                    _activeLoans.Add(new ActiveLoanDisplayItem
                    {
                        Id = loan.Id,
                        LoanNumber = loan.LoanNumber ?? "N/A",
                        CustomerName = customerName,
                        CustomerPhone = customerPhone,
                        Branch = loan.BranchName ?? "N/A",
                        LoanOfficer = loanOfficer,
                        LoanTypeDisplay = GetLoanTypeDisplay(loan.LoanType),
                        TermMonths = termMonths,
                        MonthlyInterestRate = monthlyRatePercent,
                        InterestRateDisplay = $"{termMonths} mois · Taux mensuel: {monthlyRatePercent:F2}%",
                        PrincipalAmountDisplay = $"{loan.PrincipalAmount:N2} {loan.Currency}",
                        ProcessingFeeDisplay = $"Frais dossier (5%): {processingFee:N2} {loan.Currency}",
                        RemainingBalanceDisplay = $"Reste: {remainingBalance:N2} {loan.Currency}",
                        AmountPaidDisplay = $"Payé: {amountPaid:N2} {loan.Currency}",
                        MonthlyPaymentDisplay = $"{monthlyPayment:N2} {loan.Currency}",
                        MonthlyPaymentWithFeesDisplay = $"{monthlyPaymentWithFees:N2} {loan.Currency}",
                        PaymentProgress = $"{paymentsMade}/{termMonths} versements",
                        NextPaymentDateDisplay = loan.NextPaymentDate?.ToString("dd/MM/yyyy") ?? "N/A",
                        StatusDisplay = GetStatusDisplay(loan.Status, loan.DaysOverdue),
                        Status = loan.Status ?? "Unknown",
                        DaysOverdue = loan.DaysOverdue,
                        DaysOverdueDisplay = loan.DaysOverdue > 0 ? $"{loan.DaysOverdue} jours de retard" : ""
                    });
                }

                UpdateStatistics();
                UpdatePagination();

                ShowEmptyState(_activeLoans.Count == 0);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement des crédits actifs:\n{ex.Message}",
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
            TotalLoansText.Text = _activeLoans.Count.ToString();
            TotalLoansSubText.Text = _activeLoans.Count > 1 ? "prêts actifs" : "prêt actif";

            var totalPortfolio = _activeLoans.Sum(l => 
            {
                var amount = l.RemainingBalanceDisplay
                    .Replace("Reste: ", "")
                    .Replace(" HTG", "")
                    .Replace(" USD", "")
                    .Replace(",", "");
                return decimal.TryParse(amount, out var value) ? value : 0;
            });
            TotalPortfolioText.Text = $"{totalPortfolio:N2} HTG";

            var overdueLoans = _activeLoans.Where(l => l.DaysOverdue > 0).ToList();
            OverdueCountText.Text = overdueLoans.Count.ToString();

            var overdueAmount = overdueLoans.Sum(l =>
            {
                var amount = l.RemainingBalanceDisplay
                    .Replace("Reste: ", "")
                    .Replace(" HTG", "")
                    .Replace(" USD", "")
                    .Replace(",", "");
                return decimal.TryParse(amount, out var value) ? value : 0;
            });
            OverdueAmountText.Text = $"{overdueAmount:N2} HTG en retard";

            // Calculate repayment rate (simplified)
            var loansWithPayments = _activeLoans.Where(l => l.PaymentProgress != "0/0 versements").ToList();
            if (loansWithPayments.Any())
            {
                var totalExpectedPayments = loansWithPayments.Sum(l =>
                {
                    var parts = l.PaymentProgress.Split('/');
                    return int.TryParse(parts[1].Replace(" versements", ""), out var total) ? total : 0;
                });

                var totalMadePayments = loansWithPayments.Sum(l =>
                {
                    var parts = l.PaymentProgress.Split('/');
                    return int.TryParse(parts[0], out var made) ? made : 0;
                });

                var rate = totalExpectedPayments > 0 ? (double)totalMadePayments / totalExpectedPayments * 100 : 0;
                RepaymentRateText.Text = $"{rate:F1}%";
            }
            else
            {
                RepaymentRateText.Text = "N/A";
            }
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

        private string GetLoanTypeDisplay(string? loanType)
        {
            return loanType switch
            {
                "PERSONAL" => "Personnel",
                "BUSINESS" => "Commerce",
                "AGRICULTURAL" => "Agricole",
                "EDUCATION" => "Éducation",
                "EMERGENCY" => "Urgence",
                _ => loanType ?? "N/A"
            };
        }

        private string GetStatusDisplay(string? status, int daysOverdue)
        {
            if (daysOverdue > 30)
                return "Critique";
            if (daysOverdue > 0)
                return "En Retard";
            
            return status switch
            {
                "Active" => "À Jour",
                "Overdue" => "En Retard",
                "Defaulted" => "Défaut",
                _ => status ?? "N/A"
            };
        }

        private void ShowLoading(bool show)
        {
            LoadingPanel.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
            ActiveLoansDataGrid.Visibility = show ? Visibility.Collapsed : Visibility.Visible;
        }

        private void ShowEmptyState(bool show)
        {
            EmptyStatePanel.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
            ActiveLoansDataGrid.Visibility = show ? Visibility.Collapsed : Visibility.Visible;
        }

        // Event Handlers
        private async void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            _currentPage = 1;
            await LoadActiveLoansAsync();
            MessageBox.Show("Données actualisées!", "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void ExportButton_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Fonctionnalité d'exportation à implémenter.\n\nPermettra d'exporter les données en Excel/PDF.",
                "Export", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private async void ApplyFilters_Click(object sender, RoutedEventArgs e)
        {
            _currentPage = 1;
            await ApplyFiltersAsync();
        }

        private async void SearchTextBox_TextChanged(object sender, TextChangedEventArgs e)
        {
            // Implement search debouncing if needed
            // For now, filter locally
            var searchTerm = SearchTextBox.Text?.ToLower() ?? "";
            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                ActiveLoansDataGrid.ItemsSource = _activeLoans;
                return;
            }

            var filtered = _activeLoans.Where(l =>
                l.LoanNumber.ToLower().Contains(searchTerm) ||
                l.CustomerName.ToLower().Contains(searchTerm) ||
                l.CustomerPhone.Contains(searchTerm)
            ).ToList();

            ActiveLoansDataGrid.ItemsSource = filtered;
        }

        private async void FilterChanged(object sender, SelectionChangedEventArgs e)
        {
            // Auto-apply filters when changed
            if (IsLoaded) // Only trigger if view is fully loaded
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
                var selectedType = (LoanTypeFilterComboBox.SelectedItem as ComboBoxItem)?.Content.ToString();

                string? statusFilter = selectedStatus switch
                {
                    "À Jour" => "Active",
                    "En Retard" => "Overdue",
                    "Critique" => "Defaulted",
                    _ => null
                };

                // For now, reload all and filter locally
                // TODO: Implement server-side filtering when API supports it
                await LoadActiveLoansAsync();

                if (!string.IsNullOrEmpty(selectedType) && selectedType != "Tous")
                {
                    var filtered = _activeLoans.Where(l =>
                        l.LoanTypeDisplay.Equals(selectedType, StringComparison.OrdinalIgnoreCase)
                    ).ToList();
                    ActiveLoansDataGrid.ItemsSource = filtered;
                }
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
                await LoadActiveLoansAsync();
            }
        }

        private async void NextPage_Click(object sender, RoutedEventArgs e)
        {
            if (_currentPage < _totalPages)
            {
                _currentPage++;
                await LoadActiveLoansAsync();
            }
        }

        private void ViewDetails_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is Guid loanId)
            {
                try
                {
                    // Open loan details window
                    var detailsWindow = new LoanDetailsWindow(_apiService, loanId);
                    detailsWindow.Owner = Window.GetWindow(this);
                    detailsWindow.ShowDialog();
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Erreur lors de l'ouverture des détails:\n{ex.Message}",
                        "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void ContactClient_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is string phone)
            {
                try
                {
                    // Try to open default phone dialer or copy to clipboard
                    Clipboard.SetText(phone);
                    MessageBox.Show($"Numéro copié dans le presse-papiers:\n{phone}\n\n" +
                        "Vous pouvez maintenant contacter le client.",
                        "Contacter Client", MessageBoxButton.OK, MessageBoxImage.Information);
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Erreur:\n{ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }
    }

    // Display Model for Active Loans
    public class ActiveLoanDisplayItem
    {
        public Guid Id { get; set; }
        public string LoanNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string Branch { get; set; } = string.Empty;
        public string LoanOfficer { get; set; } = string.Empty;
        public string LoanTypeDisplay { get; set; } = string.Empty;
        public int TermMonths { get; set; }
        public decimal MonthlyInterestRate { get; set; }
        public string InterestRateDisplay { get; set; } = string.Empty;
        public string PrincipalAmountDisplay { get; set; } = string.Empty;
        public string ProcessingFeeDisplay { get; set; } = string.Empty;
        public string RemainingBalanceDisplay { get; set; } = string.Empty;
        public string AmountPaidDisplay { get; set; } = string.Empty;
        public string MonthlyPaymentDisplay { get; set; } = string.Empty;
        public string MonthlyPaymentWithFeesDisplay { get; set; } = string.Empty;
        public string PaymentProgress { get; set; } = string.Empty;
        public string NextPaymentDateDisplay { get; set; } = string.Empty;
        public string StatusDisplay { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int DaysOverdue { get; set; }
        public string DaysOverdueDisplay { get; set; } = string.Empty;
    }
}
