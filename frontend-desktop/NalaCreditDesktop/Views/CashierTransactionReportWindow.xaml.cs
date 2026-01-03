using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Media;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;
using CashierTransaction = NalaCreditDesktop.Services.CashierTransaction;

namespace NalaCreditDesktop.Views
{
    public partial class CashierTransactionReportWindow : Window
    {
        private readonly ApiService _apiService;
        private readonly string _cashierId;
        private readonly string _cashierName;

        public CashierTransactionReportWindow(ApiService apiService, string cashierId, string cashierName)
        {
            InitializeComponent();
            _apiService = apiService;
            _cashierId = cashierId;
            _cashierName = cashierName;
            
            // Initialize dates (guard in case controls are not yet initialized)
            if (StartDatePicker != null)
            {
                StartDatePicker.SelectedDate = DateTime.Today;
            }

            if (EndDatePicker != null)
            {
                EndDatePicker.SelectedDate = DateTime.Today;
            }

            // Log that the report window was opened for diagnostics
            Console.WriteLine($"[INFO] Opening CashierTransactionReportWindow for cashier {_cashierId} ({_cashierName}) at {DateTime.Now:O}");
            try
            {
                var folder = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                var appFolder = System.IO.Path.Combine(folder, "NalaCreditDesktop");
                if (!System.IO.Directory.Exists(appFolder))
                    System.IO.Directory.CreateDirectory(appFolder);

                var logFile = System.IO.Path.Combine(appFolder, "error.log");
                var sb = new System.Text.StringBuilder();
                sb.AppendLine("--- Opening CashierTransactionReportWindow ---");
                sb.AppendLine($"Time: {DateTime.Now:O}");
                sb.AppendLine($"CashierId: {_cashierId}");
                sb.AppendLine($"CashierName: {_cashierName}");
                sb.AppendLine();
                System.IO.File.AppendAllText(logFile, sb.ToString());
            }
            catch
            {
                // ignore logging failures
            }
        }

        private void ReportPeriodChanged(object sender, RoutedEventArgs e)
        {
            try
            {
                // Guard in case controls are not yet initialized during XAML load
                if (CustomRangeRadio == null || CustomDatePanel == null)
                {
                    Console.Error.WriteLine("[WARN] ReportPeriodChanged fired before controls were initialized.");
                    return;
                }

                CustomDatePanel.Visibility = CustomRangeRadio.IsChecked == true ? Visibility.Visible : Visibility.Collapsed;
            }
            catch (Exception ex)
            {
                // Log and continue - do not crash the UI during initialization
                Console.Error.WriteLine($"[ERROR] ReportPeriodChanged failed: {ex}");
                try
                {
                    var folder = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                    var appFolder = System.IO.Path.Combine(folder, "NalaCreditDesktop");
                    if (!System.IO.Directory.Exists(appFolder)) System.IO.Directory.CreateDirectory(appFolder);
                    var logFile = System.IO.Path.Combine(appFolder, "error.log");
                    var sb = new System.Text.StringBuilder();
                    sb.AppendLine("--- ReportPeriodChanged Exception ---");
                    sb.AppendLine($"Time: {DateTime.Now:O}");
                    sb.AppendLine(ex.ToString());
                    sb.AppendLine();
                    System.IO.File.AppendAllText(logFile, sb.ToString());
                }
                catch { }
            }
        }

        private async void PrintButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Get date range
                DateTime startDate;
                DateTime endDate;

                if (TodayRadio.IsChecked == true)
                {
                    startDate = DateTime.Today;
                    endDate = DateTime.Now;
                }
                else
                {
                    startDate = StartDatePicker.SelectedDate ?? DateTime.Today;
                    endDate = (EndDatePicker.SelectedDate ?? DateTime.Today).AddDays(1).AddSeconds(-1);
                }

                // Show loading status
                StatusMessage.Text = "Chargement des transactions...";
                StatusMessage.Foreground = new SolidColorBrush(Color.FromRgb(52, 152, 219));
                StatusMessage.Visibility = Visibility.Visible;

                // Load cashier transactions
                var result = await _apiService.GetCashierDashboardAsync();

                if (result == null || !result.IsSuccess || result.Data == null)
                {
                    StatusMessage.Text = "Erreur lors du chargement des transactions";
                    StatusMessage.Foreground = new SolidColorBrush(Color.FromRgb(231, 76, 60));
                    StatusMessage.Visibility = Visibility.Visible;
                    return;
                }

                // RecentTransactions can be null if backend omits the property; guard to avoid NullReference
                var sourceTransactions = result.Data.RecentTransactions ?? new List<CashierTransaction>();

                // Filter transactions by date range
                var transactions = sourceTransactions
                    .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate)
                    .OrderBy(t => t.CreatedAt)
                    .ToList();

                if (!transactions.Any())
                {
                    StatusMessage.Text = "Aucune transaction trouvée pour cette période";
                    StatusMessage.Foreground = new SolidColorBrush(Color.FromRgb(243, 156, 18));
                    return;
                }

                // Create dummy account for printing
                var dummyAccount = new SavingsAccountResponseDto
                {
                    AccountNumber = $"CAISSIER-{_cashierId}",
                    AccountType = SavingsAccountType.Savings,
                    Status = SavingsAccountStatus.Active,
                    Balance = result.Data.CashBalanceHTG + (result.Data.CashBalanceUSD * 100), // Approximation
                    OpeningDate = result.Data.SessionStartTime ?? DateTime.Today
                };

                var dummyCustomer = new SavingsCustomerResponseDto
                {
                    FirstName = _cashierName,
                    LastName = "- Rapport Caissier",
                    DateOfBirth = DateTime.Today,
                    Gender = SavingsGender.Male
                };

                // Convert to transaction format
                var savingsTransactions = ConvertToSavingsTransactions(transactions);

                // Print using DocumentPrinter
                CashierTransactionPrinter.PrintCashierTransactions(
                    dummyAccount,
                    dummyCustomer,
                    startDate,
                    endDate,
                    savingsTransactions,
                    result.Data.CashBalanceHTG,
                    result.Data.CashBalanceUSD,
                    result.Data.TransactionCount);

                StatusMessage.Text = "Document envoyé à l'imprimante";
                StatusMessage.Foreground = new SolidColorBrush(Color.FromRgb(39, 174, 96));
            }
            catch (Exception ex)
            {
                StatusMessage.Text = $"Erreur: {ex.Message}";
                StatusMessage.Foreground = new SolidColorBrush(Color.FromRgb(231, 76, 60));
                StatusMessage.Visibility = Visibility.Visible;

                // Log full exception for diagnostics
                Console.Error.WriteLine($"[ERROR] PrintButton_Click failed: {ex}");
                try
                {
                    var folder = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                    var appFolder = System.IO.Path.Combine(folder, "NalaCreditDesktop");
                    if (!System.IO.Directory.Exists(appFolder))
                        System.IO.Directory.CreateDirectory(appFolder);

                    var logFile = System.IO.Path.Combine(appFolder, "error.log");
                    var sb = new System.Text.StringBuilder();
                    sb.AppendLine("--- Exception in CashierTransactionReportWindow.PrintButton_Click ---");
                    sb.AppendLine($"Time: {DateTime.Now:O}");
                    sb.AppendLine(ex.ToString());
                    sb.AppendLine();
                    System.IO.File.AppendAllText(logFile, sb.ToString());
                }
                catch
                {
                    // ignore logging failures
                }

                // Provide short message to user and point to the log file for details
                MessageBox.Show($"Erreur lors de l'impression:\n\n{ex.Message}\n\nConsultez le fichier de journalisation pour plus de détails.", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void SavePdfButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Get date range
                DateTime startDate;
                DateTime endDate;

                if (TodayRadio.IsChecked == true)
                {
                    startDate = DateTime.Today;
                    endDate = DateTime.Now;
                }
                else
                {
                    startDate = StartDatePicker.SelectedDate ?? DateTime.Today;
                    endDate = (EndDatePicker.SelectedDate ?? DateTime.Today).AddDays(1).AddSeconds(-1);
                }

                // Show loading status
                StatusMessage.Text = "Chargement des transactions...";
                StatusMessage.Foreground = new SolidColorBrush(Color.FromRgb(52, 152, 219));
                StatusMessage.Visibility = Visibility.Visible;

                // Load cashier transactions
                var result = await _apiService.GetCashierDashboardAsync();

                if (result == null || !result.IsSuccess || result.Data == null)
                {
                    StatusMessage.Text = "Erreur lors du chargement des transactions";
                    StatusMessage.Foreground = new SolidColorBrush(Color.FromRgb(231, 76, 60));
                    StatusMessage.Visibility = Visibility.Visible;
                    return;
                }

                var sourceTransactions = (result.Data.RecentTransactions ?? new List<CashierTransaction>())
                    .Where(t => t != null)
                    .ToList();

                // Filter transactions by date range
                var transactions = sourceTransactions
                    .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate)
                    .OrderBy(t => t.CreatedAt)
                    .ToList();

                if (!transactions.Any())
                {
                    StatusMessage.Text = "Aucune transaction trouvée pour cette période";
                    StatusMessage.Foreground = new SolidColorBrush(Color.FromRgb(243, 156, 18));
                    return;
                }

                // Create dummy account for printing
                var dummyAccount = new SavingsAccountResponseDto
                {
                    AccountNumber = $"CAISSIER-{_cashierId}",
                    AccountType = SavingsAccountType.Savings,
                    Status = SavingsAccountStatus.Active,
                    Balance = result.Data.CashBalanceHTG + (result.Data.CashBalanceUSD * 100),
                    OpeningDate = result.Data.SessionStartTime ?? DateTime.Today
                };

                var dummyCustomer = new SavingsCustomerResponseDto
                {
                    FirstName = _cashierName,
                    LastName = "- Rapport Caissier",
                    DateOfBirth = DateTime.Today,
                    Gender = SavingsGender.Male
                };

                // Convert to transaction format
                var savingsTransactions = ConvertToSavingsTransactions(transactions);

                // Save PDF using CashierTransactionPrinter
                CashierTransactionPrinter.SaveCashierTransactionsPDF(
                    dummyAccount,
                    dummyCustomer,
                    startDate,
                    endDate,
                    savingsTransactions,
                    result.Data.CashBalanceHTG,
                    result.Data.CashBalanceUSD,
                    result.Data.TransactionCount);

                StatusMessage.Text = "Fichier PDF enregistré avec succès";
                StatusMessage.Foreground = new SolidColorBrush(Color.FromRgb(39, 174, 96));
            }
            catch (Exception ex)
            {
                StatusMessage.Text = $"Erreur: {ex.Message}";
                StatusMessage.Foreground = new SolidColorBrush(Color.FromRgb(231, 76, 60));
                StatusMessage.Visibility = Visibility.Visible;

                // Log full exception for diagnostics
                Console.Error.WriteLine($"[ERROR] SavePdfButton_Click failed: {ex}");
                try
                {
                    var folder = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                    var appFolder = System.IO.Path.Combine(folder, "NalaCreditDesktop");
                    if (!System.IO.Directory.Exists(appFolder))
                        System.IO.Directory.CreateDirectory(appFolder);

                    var logFile = System.IO.Path.Combine(appFolder, "error.log");
                    var sb = new System.Text.StringBuilder();
                    sb.AppendLine("--- Exception in CashierTransactionReportWindow.SavePdfButton_Click ---");
                    sb.AppendLine($"Time: {DateTime.Now:O}");
                    sb.AppendLine(ex.ToString());
                    sb.AppendLine();
                    System.IO.File.AppendAllText(logFile, sb.ToString());
                }
                catch
                {
                    // ignore logging failures
                }

                MessageBox.Show($"Erreur lors de la génération du PDF:\n\n{ex.Message}\n\nConsultez le fichier de journalisation pour plus de détails.", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private List<SavingsTransactionResponseDto> ConvertToSavingsTransactions(List<CashierTransaction> transactions)
        {
            return transactions.Select(t => new SavingsTransactionResponseDto
            {
                Id = t.Id,
                AccountId = t.AccountNumber,
                AccountNumber = t.AccountNumber,
                Type = MapTransactionType(t.Type),
                Amount = t.Amount,
                BalanceBefore = 0, // Not available from cashier data
                BalanceAfter = 0,  // Not available from cashier data
                ProcessedAt = t.CreatedAt,
                Reference = t.TransactionNumber,
                ReceiptNumber = t.TransactionNumber,
                ProcessedByName = t.ProcessedBy,
                Description = $"{t.Type} - {t.CustomerName}"
            }).ToList();
        }

        private SavingsTransactionType MapTransactionType(string type)
        {
            return type?.ToLower() switch
            {
                "deposit" or "dépôt" => SavingsTransactionType.Deposit,
                "withdrawal" or "retrait" => SavingsTransactionType.Withdrawal,
                "interest" or "intérêt" => SavingsTransactionType.Interest,
                "fee" or "frais" => SavingsTransactionType.Fee,
                "openingdeposit" => SavingsTransactionType.OpeningDeposit,
                _ => SavingsTransactionType.Deposit
            };
        }

        private void CloseButton_Click(object sender, RoutedEventArgs e)
        {
            Close();
        }
    }
}
