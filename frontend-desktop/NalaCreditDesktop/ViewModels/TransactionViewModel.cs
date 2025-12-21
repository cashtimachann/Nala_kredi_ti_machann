using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.ViewModels
{
    public partial class TransactionViewModel : ObservableObject
    {
        private readonly ITransactionService _transactionService;

        [ObservableProperty]
        private ObservableCollection<TransactionSummary> _transactions = new();

        [ObservableProperty]
        private ObservableCollection<TransactionSummary> _filteredTransactions = new();

        [ObservableProperty]
        private bool _isLoading;

        [ObservableProperty]
        private string _searchText = string.Empty;

        [ObservableProperty]
        private string _selectedType = "Tous";

        [ObservableProperty]
        private string _selectedCurrency = "Toutes";

        [ObservableProperty]
        private string _selectedStatus = "Tous";

        [ObservableProperty]
        private DateTime? _dateFrom;

        [ObservableProperty]
        private DateTime? _dateTo;

        [ObservableProperty]
        private TransactionSummary? _selectedTransaction;

        // Quick transaction form
        [ObservableProperty]
        private string _quickAccountNumber = string.Empty;

        [ObservableProperty]
        private decimal _quickAmount;

        [ObservableProperty]
        private string _quickCurrency = "HTG";

        [ObservableProperty]
        private string _quickDescription = string.Empty;

        [ObservableProperty]
        private bool _showQuickDepositDialog;

        [ObservableProperty]
        private bool _showQuickWithdrawalDialog;

        // Statistics
        [ObservableProperty]
        private int _totalTransactions;

        [ObservableProperty]
        private decimal _totalDepositsHTG;

        [ObservableProperty]
        private decimal _totalWithdrawalsHTG;

        [ObservableProperty]
        private decimal _totalDepositsUSD;

        [ObservableProperty]
        private decimal _totalWithdrawalsUSD;

        public TransactionViewModel()
        {
            _transactionService = new TransactionService();

            try
            {
                AppServices.TransactionProcessed += OnExternalTransactionProcessed;
            }
            catch
            {
                // Ignore subscription failures
            }

            _ = LoadTransactionsAsync();
        }

        private void OnExternalTransactionProcessed()
        {
            _ = LoadTransactionsAsync();
        }

        [RelayCommand]
        private async Task LoadTransactionsAsync()
        {
            IsLoading = true;
            try
            {
                var transactions = await _transactionService.GetRecentTransactionsAsync(
                    200,
                    DateFrom,
                    DateTo,
                    SelectedType == "Tous" ? null : SelectedType);
                Transactions = new ObservableCollection<TransactionSummary>(transactions);
                ApplyFilters();
                UpdateStatistics();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement des transactions: {ex.Message}", 
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                IsLoading = false;
            }
        }

        [RelayCommand]
        private void ApplyFilters()
        {
            var filtered = Transactions.AsEnumerable();

            // Search filter
            if (!string.IsNullOrWhiteSpace(SearchText))
            {
                filtered = filtered.Where(t =>
                    t.AccountId.Contains(SearchText, StringComparison.OrdinalIgnoreCase) ||
                    t.CustomerName?.Contains(SearchText, StringComparison.OrdinalIgnoreCase) == true ||
                    t.ReferenceNumber.Contains(SearchText, StringComparison.OrdinalIgnoreCase));
            }

            // Type filter
            if (SelectedType != "Tous")
            {
                filtered = filtered.Where(t => t.TransactionType == SelectedType);
            }

            // Currency filter
            if (SelectedCurrency != "Toutes")
            {
                filtered = filtered.Where(t => t.Currency == SelectedCurrency);
            }

            // Status filter
            if (SelectedStatus != "Tous")
            {
                filtered = filtered.Where(t => t.Status == SelectedStatus);
            }

            // Date filter
            if (DateFrom.HasValue)
            {
                filtered = filtered.Where(t => t.CreatedAt >= DateFrom.Value);
            }

            if (DateTo.HasValue)
            {
                var endDate = DateTo.Value.AddDays(1).AddSeconds(-1);
                filtered = filtered.Where(t => t.CreatedAt <= endDate);
            }

            FilteredTransactions = new ObservableCollection<TransactionSummary>(filtered);
            TotalTransactions = FilteredTransactions.Count;
        }

        [RelayCommand]
        private void SetDateToday()
        {
            DateFrom = DateTime.Today;
            DateTo = DateTime.Today;
            ApplyFilters();
        }

        [RelayCommand]
        private void SetDateThisWeek()
        {
            DateFrom = DateTime.Today.AddDays(-(int)DateTime.Today.DayOfWeek);
            DateTo = DateTime.Today;
            ApplyFilters();
        }

        [RelayCommand]
        private void SetDateThisMonth()
        {
            DateFrom = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
            DateTo = DateTime.Today;
            ApplyFilters();
        }

        [RelayCommand]
        private void ClearFilters()
        {
            SearchText = string.Empty;
            SelectedType = "Tous";
            SelectedCurrency = "Toutes";
            SelectedStatus = "Tous";
            DateFrom = null;
            DateTo = null;
            ApplyFilters();
        }

        [RelayCommand]
        private void OpenQuickDeposit()
        {
            ShowQuickDepositDialog = true;
            ClearQuickForm();
        }

        [RelayCommand]
        private void OpenQuickWithdrawal()
        {
            ShowQuickWithdrawalDialog = true;
            ClearQuickForm();
        }

        [RelayCommand]
        private async Task ProcessQuickDeposit()
        {
            if (!ValidateQuickForm())
                return;

            try
            {
                IsLoading = true;
                var apiService = AppServices.GetRequiredApiService();
                var branchId = apiService?.CurrentUser?.BranchId;
                var cashierName = apiService?.CurrentUser == null ? null : string.IsNullOrWhiteSpace(apiService.CurrentUser.FirstName) ? apiService.CurrentUser.Email : (string.IsNullOrWhiteSpace(apiService.CurrentUser.LastName) ? apiService.CurrentUser.FirstName : apiService.CurrentUser.FirstName + " " + apiService.CurrentUser.LastName);

                var success = await _transactionService.ProcessDepositAsync(
                    QuickAccountNumber, QuickAmount, QuickCurrency, branchId, cashierName, null);

                if (success)
                {
                    MessageBox.Show(
                        $"Dépôt de {QuickAmount:N2} {QuickCurrency} effectué avec succès\nCompte: {QuickAccountNumber}",
                        "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
                    
                    ShowQuickDepositDialog = false;
                    ClearQuickForm();
                    await LoadTransactionsAsync();
                    // Notify dashboard and other components to refresh
                    try { AppServices.RaiseTransactionProcessed(); } catch { }
                }
                else
                {
                    MessageBox.Show("Échec du traitement du dépôt", 
                        "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", 
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                IsLoading = false;
            }
        }

        [RelayCommand]
        private async Task ProcessQuickWithdrawal()
        {
            if (!ValidateQuickForm())
                return;

            try
            {
                IsLoading = true;
                var apiService = AppServices.GetRequiredApiService();
                var branchId = apiService?.CurrentUser?.BranchId;
                var cashierName = apiService?.CurrentUser == null ? null : string.IsNullOrWhiteSpace(apiService.CurrentUser.FirstName) ? apiService.CurrentUser.Email : (string.IsNullOrWhiteSpace(apiService.CurrentUser.LastName) ? apiService.CurrentUser.FirstName : apiService.CurrentUser.FirstName + " " + apiService.CurrentUser.LastName);

                var success = await _transactionService.ProcessWithdrawalAsync(
                    QuickAccountNumber, QuickAmount, QuickCurrency, branchId, cashierName, null);

                if (success)
                {
                    MessageBox.Show(
                        $"Retrait de {QuickAmount:N2} {QuickCurrency} effectué avec succès\nCompte: {QuickAccountNumber}",
                        "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
                    
                    ShowQuickWithdrawalDialog = false;
                    ClearQuickForm();
                    await LoadTransactionsAsync();
                    // Notify dashboard and other components to refresh
                    try { AppServices.RaiseTransactionProcessed(); } catch { }
                }
                else
                {
                    MessageBox.Show("Échec du traitement du retrait", 
                        "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", 
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                IsLoading = false;
            }
        }

        [RelayCommand]
        private void CancelQuickTransaction()
        {
            ShowQuickDepositDialog = false;
            ShowQuickWithdrawalDialog = false;
            ClearQuickForm();
        }

        [RelayCommand]
        private void ViewTransactionDetails()
        {
            if (SelectedTransaction == null)
            {
                MessageBox.Show("Veuillez sélectionner une transaction", 
                    "Information", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            var details = $"Référence: {SelectedTransaction.ReferenceNumber}\n" +
                         $"Type: {SelectedTransaction.TransactionType}\n" +
                         $"Compte: {SelectedTransaction.AccountId}\n" +
                         $"Client: {SelectedTransaction.CustomerName}\n" +
                         $"Montant: {SelectedTransaction.Amount:N2} {SelectedTransaction.Currency}\n" +
                         $"Statut: {SelectedTransaction.Status}\n" +
                         $"Date: {SelectedTransaction.CreatedAt:dd/MM/yyyy HH:mm:ss}\n" +
                         $"Traité par: {SelectedTransaction.ProcessedBy}";

            MessageBox.Show(details, "Détails de la Transaction", 
                MessageBoxButton.OK, MessageBoxImage.Information);
        }

        [RelayCommand]
        private void PrintReceipt()
        {
            if (SelectedTransaction == null)
            {
                MessageBox.Show("Veuillez sélectionner une transaction", 
                    "Information", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            MessageBox.Show($"Impression du reçu pour la transaction {SelectedTransaction.ReferenceNumber}", 
                "Impression", MessageBoxButton.OK, MessageBoxImage.Information);
            
            // TODO: Implement actual receipt printing
        }

        [RelayCommand]
        private async Task ExportTransactions()
        {
            try
            {
                // TODO: Implement export to Excel/CSV
                MessageBox.Show($"Export de {FilteredTransactions.Count} transactions en cours...", 
                    "Export", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'export: {ex.Message}", 
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        [RelayCommand]
        private async Task RefreshTransactions()
        {
            await LoadTransactionsAsync();
        }

        private bool ValidateQuickForm()
        {
            if (string.IsNullOrWhiteSpace(QuickAccountNumber))
            {
                MessageBox.Show("Veuillez saisir un numéro de compte", 
                    "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                return false;
            }

            if (QuickAmount <= 0)
            {
                MessageBox.Show("Le montant doit être supérieur à zéro", 
                    "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                return false;
            }

            if (string.IsNullOrWhiteSpace(QuickCurrency))
            {
                MessageBox.Show("Veuillez sélectionner une devise", 
                    "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                return false;
            }

            return true;
        }

        private void ClearQuickForm()
        {
            QuickAccountNumber = string.Empty;
            QuickAmount = 0;
            QuickCurrency = "HTG";
            QuickDescription = string.Empty;
        }

        private void UpdateStatistics()
        {
            TotalTransactions = Transactions.Count;

            TotalDepositsHTG = Transactions
                .Where(t => t.TransactionType == "Dépôt" && t.Currency == "HTG")
                .Sum(t => t.Amount);

            TotalWithdrawalsHTG = Transactions
                .Where(t => t.TransactionType == "Retrait" && t.Currency == "HTG")
                .Sum(t => t.Amount);

            TotalDepositsUSD = Transactions
                .Where(t => t.TransactionType == "Dépôt" && t.Currency == "USD")
                .Sum(t => t.Amount);

            TotalWithdrawalsUSD = Transactions
                .Where(t => t.TransactionType == "Retrait" && t.Currency == "USD")
                .Sum(t => t.Amount);
        }

        partial void OnSearchTextChanged(string value)
        {
            ApplyFilters();
        }

        partial void OnSelectedTypeChanged(string value)
        {
            // Reload from API to apply server-side filtering when type changes
            _ = LoadTransactionsAsync();
        }

        partial void OnSelectedCurrencyChanged(string value)
        {
            // Currency is applied client-side
            ApplyFilters();
        }

        partial void OnSelectedStatusChanged(string value)
        {
            ApplyFilters();
        }

        partial void OnDateFromChanged(DateTime? value)
        {
            // Reload from API so the selected date range fetches the right data
            _ = LoadTransactionsAsync();
        }

        partial void OnDateToChanged(DateTime? value)
        {
            // Reload from API so the selected date range fetches the right data
            _ = LoadTransactionsAsync();
        }
    }
}
