using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using NalaCreditDesktop.Services;
using NalaCreditDesktop.Models;

namespace NalaCreditDesktop.Views
{
    public partial class ActiveLoansWindow : Window
    {
        private readonly ApiService _apiService;
        private readonly ObservableCollection<ActiveLoanItem> _items = new();
        private int _currentPage = 1;
        private int _totalPages = 1;
        private int _totalCount = 0;
        private int _pageSize = 50;

        public ActiveLoansWindow(ApiService apiService, int? branchId = null, string? branchName = null)
        {
            InitializeComponent();
            _apiService = apiService;

            // Set branch info if provided
            if (!string.IsNullOrEmpty(branchName))
            {
                BranchText.Text = $"Succursale: {branchName}";
            }

            LoansDataGrid.ItemsSource = _items;

            RefreshButton.Click += async (_, __) => await LoadAsync(_currentPage, _pageSize);
            CloseButton.Click += (_, __) => this.Close();
            SearchButton.Click += (_, __) => ApplySearch();

            ApplyFiltersButton.Click += async (_, __) => { _currentPage = 1; await LoadAsync(_currentPage, _pageSize); };
            PrevPageButton.Click += async (_, __) => { if (_currentPage > 1) { _currentPage--; await LoadAsync(_currentPage, _pageSize); } };
            NextPageButton.Click += async (_, __) => { if (_currentPage < _totalPages) { _currentPage++; await LoadAsync(_currentPage, _pageSize); } };

            StatusCombo.SelectionChanged += async (_, __) => { _currentPage = 1; await LoadAsync(_currentPage, _pageSize); };
            CurrencyCombo.SelectionChanged += async (_, __) => { _currentPage = 1; await LoadAsync(_currentPage, _pageSize); };
            PageSizeCombo.SelectionChanged += async (_, __) => { _pageSize = GetSelectedPageSize(); _currentPage = 1; await LoadAsync(_currentPage, _pageSize); };

            Loaded += async (_, __) => await InitializeAsync();
        }

        private async Task InitializeAsync()
        {
            var user = _apiService.CurrentUser;
            if (BranchText.Text == "Succursale")
            {
                BranchText.Text = user?.BranchName != null ? $"Succursale: {user.BranchName}" : "Succursale: N/A";
            }

            _pageSize = GetSelectedPageSize();
            await LoadAsync(_currentPage, _pageSize);
        }

        private async Task LoadAsync(int page = 1, int pageSize = 50)
        {
            try
            {
                StatusText.Text = "Chargement des crédits actifs...";
                var branchId = _apiService.CurrentUser?.BranchId;
                var status = GetSelectedStatus();
                var currency = GetSelectedCurrency();

                System.Diagnostics.Debug.WriteLine($"[ActiveLoansWindow] Loading loans - BranchId: {branchId}, Status: {status ?? "null"}, Currency: {currency ?? "null"}, Page: {page}, PageSize: {pageSize}");

                // DEBUG: Show what we're requesting
                var debugMsg = $"DEBUG REQUEST:\nBranchId: {branchId}\nStatus: {status ?? "(tous)"}\nCurrency: {currency ?? "(tous)"}\nPage: {page}\nPageSize: {pageSize}";
                System.Diagnostics.Debug.WriteLine(debugMsg);

                var result = await _apiService.GetLoansAsync(
                    page: page,
                    pageSize: pageSize,
                    status: status,
                    branchId: branchId,
                    isOverdue: status == "Overdue" ? true : null);

                _items.Clear();

                if (result != null)
                {
                    System.Diagnostics.Debug.WriteLine($"[ActiveLoansWindow] Result received - TotalCount: {result.TotalCount}, Loans: {result.Loans?.Count ?? 0}");

                    if (result.Loans != null && result.Loans.Count > 0)
                    {
                        foreach (var loan in result.Loans)
                        {
                            // Filter by currency if specified
                            if (!string.IsNullOrEmpty(currency) && loan.Currency != currency)
                                continue;

                            // Get customer info from Borrower object (new API structure)
                            string customerName = "N/A";
                            
                            if (loan.Borrower != null)
                            {
                                // Use FullName if available, otherwise combine FirstName + LastName
                                customerName = !string.IsNullOrWhiteSpace(loan.Borrower.FullName)
                                    ? loan.Borrower.FullName
                                    : $"{loan.Borrower.FirstName} {loan.Borrower.LastName}".Trim();
                            }
                            // Fallback to old structure if Borrower is null
                            else
                            {
                                customerName = loan.BorrowerName ?? "N/A";
                            }

                            // Calculate monthly rate (API returns values in decimal format already, e.g., 0.035 for 3.5%)
                            decimal monthlyRate = loan.MonthlyInterestRate ?? (loan.InterestRate / 12);

                            // DEBUG: Log loan values (using DurationMonths from API DTO)
                            System.Diagnostics.Debug.WriteLine($"[ActiveLoansWindow] Loan {loan.LoanNumber}: PrincipalAmount={loan.PrincipalAmount}, DurationMonths={loan.DurationMonths}, ApprovedAmount={loan.ApprovedAmount}, PaidAmount={loan.PaidAmount}, AmountPaid={loan.AmountPaid}, MonthlyRate={monthlyRate}");

                            // Recalculate monthly payment to ensure accuracy (same logic as web app)
                            // Use DurationMonths from API for term calculations
                            int termMonths = loan.DurationMonths;

                            decimal effectiveMonthlyPayment = CalculateMonthlyPayment(loan.PrincipalAmount, monthlyRate, termMonths);

                            // Calculate processing fee (5%) based on principal and distribute over term
                            decimal processingFee = loan.PrincipalAmount * 0.05m;
                            decimal distributedFeePortion = termMonths > 0 ? Math.Round(processingFee / termMonths, 2) : 0;
                            decimal effectiveMonthlyPaymentWithFee = Math.Round(effectiveMonthlyPayment + distributedFeePortion, 2);
                            
                            // DEBUG: Log calculated values
                            System.Diagnostics.Debug.WriteLine($"[ActiveLoansWindow] Loan {loan.LoanNumber}: effectiveMonthlyPayment={effectiveMonthlyPayment}, processingFee={processingFee}, distributedFeePortion={distributedFeePortion}, effectiveMonthlyPaymentWithFee={effectiveMonthlyPaymentWithFee}");
                            
                            // Recalculate remaining balance (total due with fees - amount paid)
                            decimal totalDueWithFees = Math.Round(effectiveMonthlyPaymentWithFee * termMonths, 2);
                            decimal paidAmount = loan.PaidAmount ?? loan.AmountPaid;
                            decimal effectiveRemainingBalance = Math.Max(0, totalDueWithFees - paidAmount);

                            // DEBUG: Log remaining balance calculation
                            System.Diagnostics.Debug.WriteLine($"[ActiveLoansWindow] Loan {loan.LoanNumber}: totalDueWithFees={totalDueWithFees}, paidAmount={paidAmount}, effectiveRemainingBalance={effectiveRemainingBalance}");


                            // Determine next payment date: prefer explicit NextPaymentDate, fallback to parsed NextPaymentDueRaw, or calculate
                            DateTime? nextPaymentDate = loan.NextPaymentDate;
                            System.Diagnostics.Debug.WriteLine($"[ActiveLoansWindow] Loan {loan.LoanNumber}: NextPaymentDate={loan.NextPaymentDate}, NextPaymentDueRaw='{loan.NextPaymentDueRaw}', InstallmentsPaid={loan.InstallmentsPaid}, FirstInstallmentDate={loan.FirstInstallmentDate}");
                            
                            if (!nextPaymentDate.HasValue && !string.IsNullOrWhiteSpace(loan.NextPaymentDueRaw))
                            {
                                if (DateTime.TryParse(loan.NextPaymentDueRaw, out var parsed))
                                {
                                    nextPaymentDate = parsed;
                                    System.Diagnostics.Debug.WriteLine($"[ActiveLoansWindow] Loan {loan.LoanNumber}: Parsed NextPaymentDueRaw to {parsed}");
                                }
                                else
                                {
                                    System.Diagnostics.Debug.WriteLine($"[ActiveLoansWindow] Loan {loan.LoanNumber}: Failed to parse NextPaymentDueRaw '{loan.NextPaymentDueRaw}'");
                                }
                            }
                            
                            // If still no next payment date, calculate from FirstInstallmentDate and payments made
                            if (!nextPaymentDate.HasValue && loan.FirstInstallmentDate.HasValue && loan.Status == "Active")
                            {
                                // Calculate which installment is next based on amount paid
                                // If monthly payment is known, we can estimate installments paid
                                int estimatedInstallmentsPaid = 0;
                                if (effectiveMonthlyPaymentWithFee > 0 && paidAmount > 0)
                                {
                                    estimatedInstallmentsPaid = (int)Math.Floor(paidAmount / effectiveMonthlyPaymentWithFee);
                                }
                                
                                // Next payment is FirstInstallmentDate + number of installments paid
                                // But don't go beyond the loan term
                                if (estimatedInstallmentsPaid < termMonths)
                                {
                                    nextPaymentDate = loan.FirstInstallmentDate.Value.AddMonths(estimatedInstallmentsPaid);
                                    System.Diagnostics.Debug.WriteLine($"[ActiveLoansWindow] Loan {loan.LoanNumber}: Calculated from FirstInstallmentDate. EstimatedPaid={estimatedInstallmentsPaid}, NextDate={nextPaymentDate}");
                                }
                            }
                            
                            // Fallback: try to get from PaymentSchedule if available
                            if (!nextPaymentDate.HasValue && loan.PaymentSchedule != null && loan.PaymentSchedule.Any())
                            {
                                var nextUnpaidSchedule = loan.PaymentSchedule.FirstOrDefault(ps => ps.Status != "Paid");
                                if (nextUnpaidSchedule != null)
                                {
                                    if (DateTime.TryParse(nextUnpaidSchedule.DueDate.ToString(), out var scheduleDate))
                                    {
                                        nextPaymentDate = scheduleDate;
                                        System.Diagnostics.Debug.WriteLine($"[ActiveLoansWindow] Loan {loan.LoanNumber}: Calculated from PaymentSchedule DueDate={nextPaymentDate}");
                                    }
                                }
                            }
                            
                            System.Diagnostics.Debug.WriteLine($"[ActiveLoansWindow] Loan {loan.LoanNumber}: Final NextPaymentDate={nextPaymentDate}");

                            _items.Add(new ActiveLoanItem
                            {
                                Id = loan.Id,
                                LoanNumber = loan.LoanNumber ?? "N/A",
                                CustomerName = customerName,
                                MonthlyRate = monthlyRate, // API already returns decimal format (0.035 = 3.5% with StringFormat=P2)
                                LoanTypeDisplay = FormatLoanType(loan.LoanType),
                                PrincipalAmount = loan.PrincipalAmount,
                                RemainingBalance = effectiveRemainingBalance,
                                MonthlyPayment = effectiveMonthlyPaymentWithFee,
                                TermMonths = termMonths,
                                StatusDisplay = FormatStatus(loan.Status),
                                NextPaymentDate = nextPaymentDate,
                                Currency = loan.Currency
                            });
                        }
                    }

                    _currentPage = result.CurrentPage;
                    _totalPages = result.TotalPages;
                    _totalCount = result.TotalCount;

                    UpdatePagination();

                    if (_items.Count == 0)
                    {
                        StatusText.Text = "Aucun crédit actif trouvé";
                        System.Diagnostics.Debug.WriteLine($"[ActiveLoansWindow] No loans found for current filters");
                    }
                    else
                    {
                        StatusText.Text = $"{_items.Count} crédit(s) trouvé(s)";
                    }
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine($"[ActiveLoansWindow] Result is null - API returned null response");
                    StatusText.Text = "Aucun crédit trouvé";
                    
                    // Show detailed debug info with HTTP status code
                    var statusInfo = _apiService.LastApiStatusCode.HasValue
                        ? $"HTTP {(int)_apiService.LastApiStatusCode.Value} ({_apiService.LastApiStatusCode.Value})"
                        : "Aucun status code";
                    var errorInfo = !string.IsNullOrWhiteSpace(_apiService.LastApiError)
                        ? $"\n• Erreur: {_apiService.LastApiError}"
                        : "";

                    var debugInfo = $"API a retounen NULL\n\nParamètres envoyés:\n• BranchId: {branchId}\n• Status: {status ?? "(tous)"}\n• Currency: {currency ?? "(tous)"}\n• Page: {page}\n• PageSize: {pageSize}\n\nRéponse API:\n• Status Code: {statusInfo}{errorInfo}\n\nCauses possibles:\n• Aucun crédit dans cette succursale\n• Erreur autorisation (401/403)\n• Erreur serveur (500)\n• Problème de connexion";
                    MessageBox.Show(debugInfo, "Debug - Résultat Null", MessageBoxButton.OK, MessageBoxImage.Warning);
                }

                ApplySearch();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[ActiveLoansWindow] Exception: {ex.Message}\n{ex.StackTrace}");
                StatusText.Text = $"Erreur: {ex.Message}";
                MessageBox.Show($"Erreur lors du chargement des crédits actifs:\n\n{ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void LoansDataGrid_MouseDoubleClick(object sender, System.Windows.Input.MouseButtonEventArgs e)
        {
            if (LoansDataGrid.SelectedItem is ActiveLoanItem selectedItem)
            {
                OpenLoanDetails(selectedItem.Id);
            }
        }

        private void ViewDetails_Click(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.Button button && button.Tag is Guid loanId)
            {
                OpenLoanDetails(loanId);
            }
        }

        private void OpenLoanDetails(Guid loanId)
        {
            try
            {
                var detailsWindow = new LoanDetailsWindow(_apiService, loanId)
                {
                    Owner = this
                };
                detailsWindow.ShowDialog();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'ouverture des détails: {ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private string? GetSelectedStatus()
        {
            try
            {
                if (StatusCombo.SelectedItem is System.Windows.Controls.ComboBoxItem item)
                {
                    var tag = item.Tag as string;
                    return string.IsNullOrWhiteSpace(tag) ? null : tag;
                }
            }
            catch { }
            return null;
        }

        private string? GetSelectedCurrency()
        {
            try
            {
                if (CurrencyCombo.SelectedItem is System.Windows.Controls.ComboBoxItem item)
                {
                    var tag = item.Tag as string;
                    return string.IsNullOrWhiteSpace(tag) ? null : tag;
                }
            }
            catch { }
            return null;
        }

        private int GetSelectedPageSize()
        {
            try
            {
                if (PageSizeCombo.SelectedItem is System.Windows.Controls.ComboBoxItem item)
                {
                    if (int.TryParse(item.Content?.ToString(), out int size))
                    {
                        return size;
                    }
                }
            }
            catch { }
            return 50;
        }

        private void UpdatePagination()
        {
            PageInfoText.Text = $"Page {_currentPage} sur {_totalPages} ({_totalCount} total)";
            PrevPageButton.IsEnabled = _currentPage > 1;
            NextPageButton.IsEnabled = _currentPage < _totalPages;
        }

        private void ApplySearch()
        {
            var searchTerm = SearchTextBox.Text?.ToLower() ?? "";
            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                foreach (var item in _items)
                {
                    // All items visible by default
                }
                return;
            }

            // Client-side filtering by loan number or customer name
            var filtered = _items.Where(item =>
                (item.LoanNumber?.ToLower().Contains(searchTerm) == true) ||
                (item.CustomerName?.ToLower().Contains(searchTerm) == true)
            ).ToList();

            StatusText.Text = $"{filtered.Count} crédit(s) trouvé(s) (filtré de {_totalCount})";
        }

        private static string FormatStatus(string? status)
        {
            return status?.ToUpper() switch
            {
                "ACTIVE" => "Actif",
                "OVERDUE" => "En retard",
                "COMPLETED" => "Complété",
                "PAID" => "Payé",
                "CLOSED" => "Fermé",
                _ => status ?? "N/A"
            };
        }

        private static decimal CalculateMonthlyPayment(decimal principal, decimal monthlyRate, int termMonths)
        {
            if (termMonths == 0 || principal == 0) return 0;
            if (monthlyRate == 0) return Math.Round(principal / termMonths, 2);

            // Standard loan payment formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
            // where P = principal, r = monthly rate, n = number of months
            decimal onePlusRate = 1 + monthlyRate;
            decimal powerTerm = (decimal)Math.Pow((double)onePlusRate, termMonths);
            decimal monthlyPayment = principal * monthlyRate * powerTerm / (powerTerm - 1);
            
            return Math.Round(monthlyPayment, 2);
        }

        private static string FormatLoanType(string? type)
        {
            return type?.ToUpper() switch
            {
                "COMMERCIAL" => "Crédit Commercial",
                "AGRICULTURAL" => "Crédit Agricole",
                "PERSONAL" => "Crédit Personnel",
                "EMERGENCY" => "Crédit d'Urgence",
                "CREDITLOYER" => "Crédit Loyer",
                "CREDITAUTO" => "Crédit Auto",
                "CREDITMOTO" => "Crédit Moto",
                "CREDITPERSONNEL" => "Crédit Personnel",
                "CREDITSCOLAIRE" => "Crédit Scolaire",
                "CREDITAGRICOLE" => "Crédit Agricole",
                "CREDITPROFESSIONNEL" => "Crédit Professionnel",
                "CREDITAPPUI" => "Crédit d'Appui",
                "CREDITHYPOTHECAIRE" => "Crédit Hypothécaire",
                _ => type ?? "N/A"
            };
        }
    }

    public class ActiveLoanItem
    {
        public Guid Id { get; set; }
        public string? LoanNumber { get; set; }
        public string? CustomerName { get; set; }
        public decimal MonthlyRate { get; set; }
        public string? LoanTypeDisplay { get; set; }
        public decimal PrincipalAmount { get; set; }
        public decimal RemainingBalance { get; set; }
        public decimal MonthlyPayment { get; set; }
        public int TermMonths { get; set; }
        public string? StatusDisplay { get; set; }
        public DateTime? NextPaymentDate { get; set; }
        public string? Currency { get; set; }
    }
}
