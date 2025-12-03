// Exemple d'intégration des rapports dans l'application desktop WPF
// Fichier: frontend-desktop/NalaCreditDesktop/ViewModels/BranchReportViewModel.cs

using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Net.Http;
using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;

namespace NalaCreditDesktop.ViewModels
{
    public class BranchReportViewModel : INotifyPropertyChanged
    {
        private readonly HttpClient _httpClient;
        private DailyBranchReport _currentReport;
        private DateTime _selectedDate;
        private bool _isLoading;

        public BranchReportViewModel(HttpClient httpClient)
        {
            _httpClient = httpClient;
            _selectedDate = DateTime.Today;
            
            // Commandes
            LoadReportCommand = new RelayCommand(async () => await LoadReportAsync());
            ExportCsvCommand = new RelayCommand(async () => await ExportCsvAsync());
            PrintCommand = new RelayCommand(() => PrintReport());
        }

        public ICommand LoadReportCommand { get; }
        public ICommand ExportCsvCommand { get; }
        public ICommand PrintCommand { get; }

        public DateTime SelectedDate
        {
            get => _selectedDate;
            set
            {
                _selectedDate = value;
                OnPropertyChanged();
            }
        }

        public bool IsLoading
        {
            get => _isLoading;
            set
            {
                _isLoading = value;
                OnPropertyChanged();
            }
        }

        public DailyBranchReport CurrentReport
        {
            get => _currentReport;
            set
            {
                _currentReport = value;
                OnPropertyChanged();
            }
        }

        public async Task LoadReportAsync()
        {
            try
            {
                IsLoading = true;
                
                var dateParam = SelectedDate.ToString("yyyy-MM-dd");
                var response = await _httpClient.GetAsync(
                    $"/api/BranchReport/my-branch/daily?date={dateParam}"
                );
                
                response.EnsureSuccessStatusCode();
                CurrentReport = await response.Content.ReadFromJsonAsync<DailyBranchReport>();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement du rapport: {ex.Message}", 
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                IsLoading = false;
            }
        }

        public async Task ExportCsvAsync()
        {
            try
            {
                var dateParam = SelectedDate.ToString("yyyy-MM-dd");
                var response = await _httpClient.GetAsync(
                    $"/api/BranchReport/export/daily/1?date={dateParam}"
                );
                
                response.EnsureSuccessStatusCode();
                var csvContent = await response.Content.ReadAsStringAsync();
                
                // Sauvegarder le fichier
                var saveDialog = new Microsoft.Win32.SaveFileDialog
                {
                    FileName = $"rapport_{SelectedDate:yyyy-MM-dd}.csv",
                    DefaultExt = ".csv",
                    Filter = "CSV files (.csv)|*.csv"
                };
                
                if (saveDialog.ShowDialog() == true)
                {
                    System.IO.File.WriteAllText(saveDialog.FileName, csvContent);
                    MessageBox.Show("Rapport exporté avec succès!", "Succès", 
                        MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'export: {ex.Message}", 
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        public void PrintReport()
        {
            // Implémenter l'impression
            MessageBox.Show("Fonctionnalité d'impression à implémenter", "Info");
        }

        public event PropertyChangedEventHandler PropertyChanged;

        protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }

    // Modèles de données
    public class DailyBranchReport
    {
        public int BranchId { get; set; }
        public string BranchName { get; set; }
        public DateTime ReportDate { get; set; }
        
        public List<CreditDisbursement> CreditsDisbursed { get; set; } = new();
        public decimal TotalCreditsDisbursedHTG { get; set; }
        public decimal TotalCreditsDisbursedUSD { get; set; }
        public int CreditsDisbursedCount { get; set; }
        
        public List<CreditPaymentSummary> PaymentsReceived { get; set; } = new();
        public decimal TotalPaymentsReceivedHTG { get; set; }
        public decimal TotalPaymentsReceivedUSD { get; set; }
        public int PaymentsReceivedCount { get; set; }
        
        public List<TransactionSummary> Deposits { get; set; } = new();
        public decimal TotalDepositsHTG { get; set; }
        public decimal TotalDepositsUSD { get; set; }
        public int DepositsCount { get; set; }
        
        public List<TransactionSummary> Withdrawals { get; set; } = new();
        public decimal TotalWithdrawalsHTG { get; set; }
        public decimal TotalWithdrawalsUSD { get; set; }
        public int WithdrawalsCount { get; set; }
        
        public CashBalance CashBalance { get; set; } = new();
        
        public int TotalTransactions { get; set; }
        public int ActiveCashSessions { get; set; }
        public int CompletedCashSessions { get; set; }
    }

    public class CreditDisbursement
    {
        public int CreditId { get; set; }
        public string CreditNumber { get; set; }
        public string CustomerName { get; set; }
        public string AccountNumber { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; }
        public DateTime DisbursementDate { get; set; }
    }

    public class CreditPaymentSummary
    {
        public int PaymentId { get; set; }
        public string CreditNumber { get; set; }
        public string CustomerName { get; set; }
        public decimal Amount { get; set; }
        public decimal PrincipalPaid { get; set; }
        public decimal InterestPaid { get; set; }
        public decimal? PenaltyPaid { get; set; }
        public string Currency { get; set; }
        public DateTime PaymentDate { get; set; }
    }

    public class TransactionSummary
    {
        public long TransactionId { get; set; }
        public string TransactionNumber { get; set; }
        public string AccountNumber { get; set; }
        public string CustomerName { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; }
        public DateTime TransactionDate { get; set; }
    }

    public class CashBalance
    {
        public decimal OpeningBalanceHTG { get; set; }
        public decimal OpeningBalanceUSD { get; set; }
        public decimal ClosingBalanceHTG { get; set; }
        public decimal ClosingBalanceUSD { get; set; }
        public decimal NetChangeHTG { get; set; }
        public decimal NetChangeUSD { get; set; }
    }

    // Classe utilitaire pour les commandes
    public class RelayCommand : ICommand
    {
        private readonly Action _execute;
        private readonly Func<bool> _canExecute;

        public RelayCommand(Action execute, Func<bool> canExecute = null)
        {
            _execute = execute ?? throw new ArgumentNullException(nameof(execute));
            _canExecute = canExecute;
        }

        public bool CanExecute(object parameter) => _canExecute == null || _canExecute();

        public void Execute(object parameter) => _execute();

        public event EventHandler CanExecuteChanged
        {
            add => CommandManager.RequerySuggested += value;
            remove => CommandManager.RequerySuggested -= value;
        }
    }
}
