using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class TransactionsWindow : Window
    {
        private readonly ApiService _apiService;
        private ObservableCollection<TransactionDisplayItem> _transactions = new ObservableCollection<TransactionDisplayItem>();

        public TransactionsWindow(ApiService? apiService = null)
        {
            InitializeComponent();
            _apiService = apiService ?? AppServices.GetRequiredApiService();
            
            TransactionsDataGrid.ItemsSource = _transactions;
            
            // Set default date range (last 30 days)
            DateToPicker.SelectedDate = DateTime.Now;
            DateFromPicker.SelectedDate = DateTime.Now.AddDays(-30);
            
            _ = LoadTransactionsAsync();
        }

        private async Task LoadTransactionsAsync()
        {
            try
            {
                ShowLoading(true);
                _transactions.Clear();

                var fromDate = DateFromPicker.SelectedDate;
                var toDate = DateToPicker.SelectedDate;
                
                // Validate date range
                if (fromDate.HasValue && toDate.HasValue)
                {
                    if (fromDate.Value > toDate.Value)
                    {
                        MessageBox.Show("La date de début ne peut pas être supérieure à la date de fin.\n\nVeuillez corriger les dates.",
                            "Date invalide", MessageBoxButton.OK, MessageBoxImage.Warning);
                        ShowLoading(false);
                        return;
                    }
                    
                    if (toDate.Value > DateTime.Now)
                    {
                        MessageBox.Show("La date de fin ne peut pas être dans le futur.\n\nVeuillez choisir une date déjà passée.",
                            "Date invalide", MessageBoxButton.OK, MessageBoxImage.Warning);
                        ShowLoading(false);
                        return;
                    }
                    
                    var daysDiff = (toDate.Value - fromDate.Value).Days;
                    if (daysDiff > 365)
                    {
                        var confirmResult = MessageBox.Show($"Cette période est trop longue ({daysDiff} jours).\n\nCela peut prendre du temps pour charger.\n\nVoulez-vous continuer?",
                            "Avertissement", MessageBoxButton.YesNo, MessageBoxImage.Question);
                        if (confirmResult == MessageBoxResult.No)
                        {
                            ShowLoading(false);
                            return;
                        }
                    }
                }
                
                var branchId = _apiService.CurrentUser?.BranchId;

                System.Diagnostics.Debug.WriteLine($"[TransactionsWindow] Loading payments: branchId={branchId}, from={fromDate}, to={toDate}");

                // Get payment history from API
                const int pageSize = 100; // backend max
                var page = 1;
                var allPayments = new List<MicrocreditPayment>();

                while (true)
                {
                    var result = await _apiService.GetPaymentHistoryAsync(
                        page: page,
                        pageSize: pageSize,
                        fromDate: fromDate,
                        toDate: toDate,
                        branchId: branchId
                    );

                    if (result?.Payments != null && result.Payments.Count > 0)
                        allPayments.AddRange(result.Payments);

                    var totalPages = result?.TotalPages > 0 ? result.TotalPages : 1;
                    if (page >= totalPages) break;
                    page++;
                }

                if (allPayments.Count > 0)
                {
                    System.Diagnostics.Debug.WriteLine($"[TransactionsWindow] Received {allPayments.Count} payments");

                    foreach (var payment in allPayments)
                    {
                        _transactions.Add(new TransactionDisplayItem
                        {
                            PaymentDate = payment.PaymentDate.ToString("dd/MM/yyyy"),
                            LoanNumber = payment.LoanNumber ?? "N/A",
                            BorrowerName = payment.CustomerName ?? "N/A",
                            Amount = $"{payment.Amount:N2} {payment.Currency}",
                            PaymentMethod = GetPaymentMethodText(payment.PaymentMethod),
                            Reference = payment.Reference ?? "-",
                            RecordedBy = string.IsNullOrWhiteSpace(payment.ProcessedByName)
                                ? (string.IsNullOrWhiteSpace(payment.ProcessedBy) ? "N/A" : payment.ProcessedBy)
                                : payment.ProcessedByName
                        });
                    }

                    // Update statistics
                    UpdateStatistics(allPayments);
                    ShowEmptyState(false);
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("[TransactionsWindow] Aucune transaction pour cette période");
                    ShowEmptyState(true);
                    ResetStatistics();
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[TransactionsWindow] Error loading transactions: {ex.Message}");
                var result = MessageBox.Show($"Erreur lors du chargement des transactions:\n\n{ex.Message}\n\nVoulez-vous réessayer?",
                    "Erreur", MessageBoxButton.YesNo, MessageBoxImage.Error);
                
                if (result == MessageBoxResult.Yes)
                {
                    await LoadTransactionsAsync();
                    return;
                }
                
                ShowEmptyState(true);
                ResetStatistics();
            }
            finally
            {
                ShowLoading(false);
            }
        }

        private void UpdateStatistics(System.Collections.Generic.List<NalaCreditDesktop.Models.MicrocreditPayment> payments)
        {
            TotalTransactionsText.Text = payments.Count.ToString();
            
            var totalAmount = payments.Sum(p => p.Amount);
            TotalAmountText.Text = $"{totalAmount:N0} HTG";

            var cashPayments = payments.Where(p => p.PaymentMethod == "Cash").Sum(p => p.Amount);
            CashPaymentsText.Text = $"{cashPayments:N0} HTG";

            var mobileMoneyPayments = payments.Where(p => p.PaymentMethod == "MobileMoney").Sum(p => p.Amount);
            MobileMoneyText.Text = $"{mobileMoneyPayments:N0} HTG";
        }

        private void ResetStatistics()
        {
            TotalTransactionsText.Text = "0";
            TotalAmountText.Text = "0 HTG";
            CashPaymentsText.Text = "0 HTG";
            MobileMoneyText.Text = "0 HTG";
        }

        private string GetPaymentMethodText(string method)
        {
            return method switch
            {
                "Cash" => "Cash",
                "BankTransfer" => "Virement Bancaire",
                "MobileMoney" => "Mobile Money",
                "Check" => "Chèque",
                _ => method
            };
        }

        private void ShowLoading(bool show)
        {
            LoadingPanel.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
            TransactionsDataGrid.Visibility = show ? Visibility.Collapsed : Visibility.Visible;
        }

        private void ShowEmptyState(bool show)
        {
            EmptyPanel.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
            TransactionsDataGrid.Visibility = show ? Visibility.Collapsed : Visibility.Visible;
        }

        private async void ApplyFilters_Click(object sender, RoutedEventArgs e)
        {
            await LoadTransactionsAsync();
        }

        private async void Refresh_Click(object sender, RoutedEventArgs e)
        {
            await LoadTransactionsAsync();
        }

        private void Export_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (_transactions.Count == 0)
                {
                    MessageBox.Show("Aucune transaction à exporter.", "Information", 
                        MessageBoxButton.OK, MessageBoxImage.Information);
                    return;
                }

                var dialog = new Microsoft.Win32.SaveFileDialog
                {
                    FileName = $"Transactions_{DateTime.Now:yyyyMMdd}",
                    DefaultExt = ".csv",
                    Filter = "Fichiers CSV (*.csv)|*.csv|Tous les fichiers (*.*)|*.*"
                };

                if (dialog.ShowDialog() == true)
                {
                    var csv = new System.Text.StringBuilder();
                    csv.AppendLine("Date,N° Prêt,Client,Montant,Méthode,Référence,Enregistré Par");

                    foreach (var transaction in _transactions)
                    {
                        csv.AppendLine($"{transaction.PaymentDate},{transaction.LoanNumber}," +
                                     $"{transaction.BorrowerName},{transaction.Amount}," +
                                     $"{transaction.PaymentMethod},{transaction.Reference}," +
                                     $"{transaction.RecordedBy}");
                    }

                    System.IO.File.WriteAllText(dialog.FileName, csv.ToString());
                    MessageBox.Show($"Transactions exportées avec succès!\n\n{dialog.FileName}",
                        "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'exportation:\n\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }

    public class TransactionDisplayItem
    {
        public string PaymentDate { get; set; } = string.Empty;
        public string LoanNumber { get; set; } = string.Empty;
        public string BorrowerName { get; set; } = string.Empty;
        public string Amount { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public string RecordedBy { get; set; } = string.Empty;
    }
}
