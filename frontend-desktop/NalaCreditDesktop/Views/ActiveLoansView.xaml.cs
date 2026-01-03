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

                // Get active loans (status: Active, Overdue, Defaulted)
                var result = await _apiService.GetLoansAsync(
                    page: _currentPage,
                    pageSize: _pageSize,
                    status: "Active",
                    branchId: null,
                    isOverdue: null
                );

                if (result == null || result.Loans == null || !result.Loans.Any())
                {
                    // Try to get overdue loans too
                    var overdueResult = await _apiService.GetLoansAsync(
                        page: _currentPage,
                        pageSize: _pageSize,
                        status: "Overdue",
                        branchId: null,
                        isOverdue: null
                    );

                    if (overdueResult != null && overdueResult.Loans != null && overdueResult.Loans.Any())
                    {
                        result = overdueResult;
                    }
                }

                if (result != null && result.Loans != null)
                {
                    _totalCount = result.TotalCount;
                    _totalPages = result.TotalPages;

                    foreach (var loan in result.Loans)
                    {
                        _activeLoans.Add(new ActiveLoanDisplayItem
                        {
                            Id = loan.Id,
                            LoanNumber = loan.LoanNumber ?? "N/A",
                            CustomerName = $"{loan.BorrowerFirstName} {loan.BorrowerLastName}".Trim(),
                            CustomerPhone = loan.BorrowerPhone ?? "N/A",
                            LoanTypeDisplay = GetLoanTypeDisplay(loan.LoanType),
                            PrincipalAmountDisplay = $"{loan.PrincipalAmount:N2} {loan.Currency}",
                            RemainingBalanceDisplay = $"Reste: {loan.RemainingBalance:N2} {loan.Currency}",
                            MonthlyPaymentDisplay = $"{loan.MonthlyPayment:N2} {loan.Currency}",
                            PaymentProgress = $"{loan.PaymentsMade}/{loan.TermMonths} versements",
                            NextPaymentDateDisplay = loan.NextPaymentDate?.ToString("dd/MM/yyyy") ?? "N/A",
                            StatusDisplay = GetStatusDisplay(loan.Status, loan.DaysOverdue),
                            Status = loan.Status,
                            DaysOverdue = loan.DaysOverdue
                        });
                    }

                    UpdateStatistics();
                    UpdatePagination();
                }

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
                // TODO: Open loan details window
                MessageBox.Show($"Affichage des détails du prêt:\n{loanId}\n\nModule de détails à implémenter.",
                    "Détails du Prêt", MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }

        private void RecordPayment_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is Guid loanId)
            {
                try
                {
                    // Find the loan in the collection
                    var loan = _activeLoans.FirstOrDefault(l => l.Id == loanId);
                    if (loan != null)
                    {
                        // Open Recouvrement window - it will prompt for loan number
                        var recouvrementWindow = new RecouvrementWindow(_apiService);
                        recouvrementWindow.Owner = Window.GetWindow(this);
                        
                        // Pre-fill loan number in the window after it loads
                        recouvrementWindow.Loaded += (s, args) =>
                        {
                            // Try to set the loan number field if accessible
                            try
                            {
                                var loanNumberField = recouvrementWindow.FindName("LoanNumberTextBox") as TextBox;
                                if (loanNumberField != null)
                                {
                                    loanNumberField.Text = loan.LoanNumber;
                                }
                            }
                            catch { /* Ignore if field not found */ }
                        };
                        
                        recouvrementWindow.ShowDialog();

                        // Refresh after payment
                        _ = LoadActiveLoansAsync();
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Erreur lors de l'ouverture du module de paiement:\n{ex.Message}",
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
        public string LoanTypeDisplay { get; set; } = string.Empty;
        public string PrincipalAmountDisplay { get; set; } = string.Empty;
        public string RemainingBalanceDisplay { get; set; } = string.Empty;
        public string MonthlyPaymentDisplay { get; set; } = string.Empty;
        public string PaymentProgress { get; set; } = string.Empty;
        public string NextPaymentDateDisplay { get; set; } = string.Empty;
        public string StatusDisplay { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int DaysOverdue { get; set; }
    }
}
