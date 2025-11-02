using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Collections.ObjectModel;
using System.Windows;

namespace NalaCreditDesktop.ViewModels;

public partial class CashierViewModel : ObservableObject
{
    [ObservableProperty]
    private bool _isLoading;

    [ObservableProperty]
    private string _accountNumber = string.Empty;

    [ObservableProperty]
    private decimal _transactionAmount;

    [ObservableProperty]
    private string _selectedCurrency = "HTG";

    [ObservableProperty]
    private ObservableCollection<string> _recentTransactions = new();

    [ObservableProperty]
    private string _totalDepositsToday = "5,000 HTG";

    [ObservableProperty]
    private string _totalWithdrawalsToday = "3,200 HTG";

    [ObservableProperty]
    private string _transactionsCount = "15";

    public CashierViewModel()
    {
        // Initialize with some demo data
        RecentTransactions.Add("12:30:15 - Dépôt de 500 HTG pour compte 12345");
        RecentTransactions.Add("12:25:43 - Retrait de 200 HTG pour compte 67890");
        RecentTransactions.Add("12:20:12 - Dépôt de 1000 HTG pour compte 11111");
    }

    [RelayCommand]
    private void ProcessDeposit()
    {
        if (string.IsNullOrWhiteSpace(AccountNumber) || TransactionAmount <= 0)
        {
            MessageBox.Show("Veuillez saisir un numéro de compte valide et un montant", "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        MessageBox.Show($"Dépôt de {TransactionAmount} {SelectedCurrency} traité avec succès pour le compte {AccountNumber}", "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
        
        // Add to recent transactions
        RecentTransactions.Insert(0, $"{DateTime.Now:HH:mm:ss} - Dépôt de {TransactionAmount} {SelectedCurrency} pour compte {AccountNumber}");
        
        // Clear form
        AccountNumber = string.Empty;
        TransactionAmount = 0;
    }

    [RelayCommand]
    private void ProcessWithdrawal()
    {
        if (string.IsNullOrWhiteSpace(AccountNumber) || TransactionAmount <= 0)
        {
            MessageBox.Show("Veuillez saisir un numéro de compte valide et un montant", "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        MessageBox.Show($"Retrait de {TransactionAmount} {SelectedCurrency} traité avec succès pour le compte {AccountNumber}", "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
        
        // Add to recent transactions
        RecentTransactions.Insert(0, $"{DateTime.Now:HH:mm:ss} - Retrait de {TransactionAmount} {SelectedCurrency} pour compte {AccountNumber}");
        
        // Clear form
        AccountNumber = string.Empty;
        TransactionAmount = 0;
    }
}