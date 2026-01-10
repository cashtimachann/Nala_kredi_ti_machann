using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class OverdueLoansView : UserControl
    {
        private readonly ApiService _apiService;
        private ObservableCollection<OverdueLoanDisplayItem> _overdueLoans = new ObservableCollection<OverdueLoanDisplayItem>();
        private int _currentPage = 1;
        private int _totalPages = 1;
        private int _totalCount = 0;
        private const int _pageSize = 20;

        public OverdueLoansView(ApiService? apiService = null)
        {
            InitializeComponent();
            _apiService = apiService ?? AppServices.GetRequiredApiService();
            
            OverdueLoansDataGrid.ItemsSource = _overdueLoans;
            SetupEventHandlers();
            _ = LoadOverdueLoansAsync();
        }

        private void SetupEventHandlers()
        {
            RefreshButton.Click += RefreshButton_Click;
            ExportButton.Click += ExportButton_Click;
            ApplyFiltersButton.Click += ApplyFilters_Click;
            SearchTextBox.TextChanged += SearchTextBox_TextChanged;
            DaysOverdueFilterComboBox.SelectionChanged += FilterChanged;
            SortByComboBox.SelectionChanged += FilterChanged;
            PrevPageButton.Click += PrevPage_Click;
            NextPageButton.Click += NextPage_Click;
        }

        private async Task LoadOverdueLoansAsync()
        {
            try
            {
                ShowLoading(true);
                _overdueLoans.Clear();

                var branchId = _apiService.CurrentUser?.BranchId;
                if (!branchId.HasValue)
                {
                    MessageBox.Show(
                        "Kont itilizatè sa a pa gen succursale (BranchId).\n\nPou respekte règleman 'filtre pa succursale', sistèm nan pap chaje prè san BranchId. Kontakte administrateur.",
                        "Konfigirasyon Enkonplè",
                        MessageBoxButton.OK,
                        MessageBoxImage.Warning);
                    ShowEmptyState(true);
                    return;
                }

                // Get overdue loans (status: Overdue)
                var result = await _apiService.GetLoansAsync(
                    page: _currentPage,
                    pageSize: _pageSize,
                    status: "Overdue",
                    branchId: branchId,
                    isOverdue: true
                );

                if (result != null && result.Loans != null)
                {
                    _totalCount = result.TotalCount;
                    _totalPages = result.TotalPages;

                    foreach (var loan in result.Loans.Where(l => l.DaysOverdue > 0))
                    {
                        _overdueLoans.Add(new OverdueLoanDisplayItem
                        {
                            LoanId = loan.Id,
                            LoanNumber = loan.LoanNumber ?? "N/A",
                            CustomerName = $"{loan.BorrowerFirstName} {loan.BorrowerLastName}".Trim(),
                            CustomerPhone = loan.BorrowerPhone ?? "N/A",
                            DaysOverdue = loan.DaysOverdue,
                            DaysOverdueDisplay = $"{loan.DaysOverdue} jour{(loan.DaysOverdue > 1 ? "s" : "")} de retard",
                            OutstandingAmount = loan.RemainingBalance,
                            OutstandingAmountDisplay = $"{loan.RemainingBalance:N2} {loan.Currency}",
                            PenaltyAmount = CalculatePenalty(loan.RemainingBalance, loan.DaysOverdue),
                            PenaltyAmountDisplay = $"Pénalité: {CalculatePenalty(loan.RemainingBalance, loan.DaysOverdue):N2} {loan.Currency}",
                            LastPaymentDate = loan.NextPaymentDate?.AddMonths(-1),
                            LastPaymentDateDisplay = loan.NextPaymentDate?.AddMonths(-1).ToString("dd/MM/yyyy") ?? "Aucun",
                            LastPaymentAmountDisplay = $"Montant: {loan.MonthlyPayment:N2} {loan.Currency}",
                            SeverityLevel = GetSeverityLevel(loan.DaysOverdue),
                            LastContactDisplay = "Non contacté",
                            ContactCountDisplay = "0 appel"
                        });
                    }

                    // Sort by days overdue descending by default
                    var sorted = _overdueLoans.OrderByDescending(l => l.DaysOverdue).ToList();
                    _overdueLoans.Clear();
                    foreach (var item in sorted)
                    {
                        _overdueLoans.Add(item);
                    }

                    UpdateStatistics();
                    UpdatePagination();
                }

                ShowEmptyState(_overdueLoans.Count == 0);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement des prêts en retard:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                ShowEmptyState(true);
            }
            finally
            {
                ShowLoading(false);
            }
        }

        private decimal CalculatePenalty(decimal remainingBalance, int daysOverdue)
        {
            // Simple penalty calculation: 0.5% per month overdue (roughly 0.017% per day)
            if (daysOverdue <= 0) return 0;
            
            decimal dailyPenaltyRate = 0.00017m; // 0.017%
            return remainingBalance * dailyPenaltyRate * daysOverdue;
        }

        private string GetSeverityLevel(int daysOverdue)
        {
            if (daysOverdue >= 60) return "Critical";
            if (daysOverdue >= 31) return "Severe";
            return "Moderate";
        }

        private void UpdateStatistics()
        {
            var total = _overdueLoans.Count;
            TotalOverdueText.Text = total.ToString();
            TotalOverdueSubText.Text = total > 1 ? "prêts en retard" : "prêt en retard";

            // Critical (60+ days)
            var critical = _overdueLoans.Where(l => l.DaysOverdue >= 60).ToList();
            CriticalCountText.Text = critical.Count.ToString();
            var criticalAmount = critical.Sum(l => l.OutstandingAmount);
            CriticalAmountText.Text = $"{criticalAmount:N2} HTG";

            // Severe (31-60 days)
            var severe = _overdueLoans.Where(l => l.DaysOverdue >= 31 && l.DaysOverdue < 60).ToList();
            SevereCountText.Text = severe.Count.ToString();
            var severeAmount = severe.Sum(l => l.OutstandingAmount);
            SevereAmountText.Text = $"{severeAmount:N2} HTG";

            // Moderate (1-30 days)
            var moderate = _overdueLoans.Where(l => l.DaysOverdue < 31).ToList();
            ModerateCountText.Text = moderate.Count.ToString();
            var moderateAmount = moderate.Sum(l => l.OutstandingAmount);
            ModerateAmountText.Text = $"{moderateAmount:N2} HTG";
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
            OverdueLoansDataGrid.Visibility = show ? Visibility.Collapsed : Visibility.Visible;
        }

        private void ShowEmptyState(bool show)
        {
            EmptyStatePanel.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
            OverdueLoansDataGrid.Visibility = show ? Visibility.Collapsed : Visibility.Visible;
        }

        // Event Handlers
        private async void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            _currentPage = 1;
            await LoadOverdueLoansAsync();
            MessageBox.Show("Données actualisées!", "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void ExportButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var exportData = string.Join("\n", _overdueLoans.Select(l =>
                    $"{l.LoanNumber}\t{l.CustomerName}\t{l.CustomerPhone}\t" +
                    $"{l.DaysOverdue}\t{l.OutstandingAmount:N2}\t{l.PenaltyAmount:N2}"));

                var header = "N° Prêt\tEmprunteur\tTéléphone\tJours Retard\tMontant Dû\tPénalités\n";
                var fullData = header + exportData;

                Clipboard.SetText(fullData);
                MessageBox.Show($"Données de {_overdueLoans.Count} prêts en retard copiées dans le presse-papiers!\n\n" +
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
            // Filter locally
            var searchTerm = SearchTextBox.Text?.ToLower() ?? "";
            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                OverdueLoansDataGrid.ItemsSource = _overdueLoans;
                return;
            }

            var filtered = _overdueLoans.Where(l =>
                l.LoanNumber.ToLower().Contains(searchTerm) ||
                l.CustomerName.ToLower().Contains(searchTerm) ||
                l.CustomerPhone.Contains(searchTerm)
            ).ToList();

            OverdueLoansDataGrid.ItemsSource = filtered;
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

                var selectedDaysFilter = (DaysOverdueFilterComboBox.SelectedItem as ComboBoxItem)?.Content.ToString();
                var selectedSort = (SortByComboBox.SelectedItem as ComboBoxItem)?.Content.ToString();

                await LoadOverdueLoansAsync();

                // Apply days filter
                var filtered = _overdueLoans.ToList();
                if (!string.IsNullOrEmpty(selectedDaysFilter) && selectedDaysFilter != "Tous")
                {
                    filtered = selectedDaysFilter switch
                    {
                        "1-30 jours" => filtered.Where(l => l.DaysOverdue >= 1 && l.DaysOverdue <= 30).ToList(),
                        "31-60 jours" => filtered.Where(l => l.DaysOverdue >= 31 && l.DaysOverdue <= 60).ToList(),
                        "60+ jours (Critique)" => filtered.Where(l => l.DaysOverdue >= 60).ToList(),
                        _ => filtered
                    };
                }

                // Apply sorting
                filtered = selectedSort switch
                {
                    "Plus de retard" => filtered.OrderByDescending(l => l.DaysOverdue).ToList(),
                    "Moins de retard" => filtered.OrderBy(l => l.DaysOverdue).ToList(),
                    "Montant décroissant" => filtered.OrderByDescending(l => l.OutstandingAmount).ToList(),
                    "Montant croissant" => filtered.OrderBy(l => l.OutstandingAmount).ToList(),
                    _ => filtered
                };

                OverdueLoansDataGrid.ItemsSource = filtered;
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
                await LoadOverdueLoansAsync();
            }
        }

        private async void NextPage_Click(object sender, RoutedEventArgs e)
        {
            if (_currentPage < _totalPages)
            {
                _currentPage++;
                await LoadOverdueLoansAsync();
            }
        }

        private void ContactClient_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is string phone)
            {
                try
                {
                    Clipboard.SetText(phone);
                    
                    var result = MessageBox.Show(
                        $"📞 Contacter le client:\n{phone}\n\n" +
                        "Le numéro a été copié dans le presse-papiers.\n\n" +
                        "Actions recommandées:\n" +
                        "• Rappeler les conditions de remboursement\n" +
                        "• Proposer un plan de paiement\n" +
                        "• Écouter les difficultés du client\n" +
                        "• Fixer une date de paiement\n\n" +
                        "Voulez-vous enregistrer cet appel?",
                        "Contacter Client",
                        MessageBoxButton.YesNo,
                        MessageBoxImage.Question);

                    if (result == MessageBoxResult.Yes)
                    {
                        // TODO: Open dialog to log contact
                        MessageBox.Show("Fonctionnalité d'enregistrement d'appel à implémenter.",
                            "À venir", MessageBoxButton.OK, MessageBoxImage.Information);
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Erreur:\n{ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void RecordPayment_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is Guid loanId)
            {
                try
                {
                    var loan = _overdueLoans.FirstOrDefault(l => l.LoanId == loanId);
                    if (loan != null)
                    {
                        var recouvrementWindow = new RecouvrementWindow(_apiService);
                        recouvrementWindow.Owner = Window.GetWindow(this);
                        
                        recouvrementWindow.Loaded += (s, args) =>
                        {
                            try
                            {
                                var loanNumberField = recouvrementWindow.FindName("LoanNumberTextBox") as TextBox;
                                if (loanNumberField != null)
                                {
                                    loanNumberField.Text = loan.LoanNumber;
                                }
                            }
                            catch { }
                        };
                        
                        recouvrementWindow.ShowDialog();
                        _ = LoadOverdueLoansAsync();
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Erreur lors de l'ouverture du module de paiement:\n{ex.Message}",
                        "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void ViewHistory_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is Guid loanId)
            {
                var loan = _overdueLoans.FirstOrDefault(l => l.LoanId == loanId);
                if (loan != null)
                {
                    MessageBox.Show(
                        $"Historique du prêt: {loan.LoanNumber}\n\n" +
                        $"Emprunteur: {loan.CustomerName}\n" +
                        $"Retard: {loan.DaysOverdue} jours\n" +
                        $"Montant dû: {loan.OutstandingAmountDisplay}\n" +
                        $"Pénalités: {loan.PenaltyAmountDisplay}\n\n" +
                        "Module d'historique détaillé à implémenter:\n" +
                        "• Historique des paiements\n" +
                        "• Historique des contacts\n" +
                        "• Actions de recouvrement",
                        "Historique du Prêt",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                }
            }
        }

        private void ViewDetails_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is Guid loanId)
            {
                MessageBox.Show($"Affichage des détails du prêt:\n{loanId}\n\nModule de détails à implémenter.",
                    "Détails du Prêt", MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }
    }

    // Display Model for Overdue Loans
    public class OverdueLoanDisplayItem
    {
        public Guid LoanId { get; set; }
        public string LoanNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public int DaysOverdue { get; set; }
        public string DaysOverdueDisplay { get; set; } = string.Empty;
        public decimal OutstandingAmount { get; set; }
        public string OutstandingAmountDisplay { get; set; } = string.Empty;
        public decimal PenaltyAmount { get; set; }
        public string PenaltyAmountDisplay { get; set; } = string.Empty;
        public DateTime? LastPaymentDate { get; set; }
        public string LastPaymentDateDisplay { get; set; } = string.Empty;
        public string LastPaymentAmountDisplay { get; set; } = string.Empty;
        public string SeverityLevel { get; set; } = string.Empty; // Critical, Severe, Moderate
        public string LastContactDisplay { get; set; } = string.Empty;
        public string ContactCountDisplay { get; set; } = string.Empty;
    }
}
