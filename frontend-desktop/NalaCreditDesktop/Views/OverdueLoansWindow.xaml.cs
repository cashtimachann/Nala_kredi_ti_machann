using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class OverdueLoansWindow : Window
    {
        private readonly ApiService _apiService;
        private readonly int _branchId;
        private readonly string _branchName;
        private ObservableCollection<MicrocreditLoan> _allLoans = new();
        private ObservableCollection<MicrocreditLoan> _filteredLoans = new();
        
        private int _currentPage = 1;
        private int _pageSize = 50;
        private int _totalCount = 0;
        private string _searchText = "";
        private string _selectedCurrency = "";
        private string _selectedDaysOverdueRange = "0";

        public OverdueLoansWindow(ApiService apiService, int branchId, string branchName)
        {
            InitializeComponent();
            _apiService = apiService;
            _branchId = branchId;
            _branchName = branchName;
            
            BranchText.Text = _branchName;
            LoansDataGrid.ItemsSource = _filteredLoans;
        }

        private async void Window_Loaded(object sender, RoutedEventArgs e)
        {
            await LoadOverdueLoans();
        }

        private async Task LoadOverdueLoans()
        {
            try
            {
                StatusText.Text = "Chargement des crédits en retard...";
                RefreshButton.IsEnabled = false;
                ApplyFiltersButton.IsEnabled = false;
                
                var result = await _apiService.GetLoansAsync(
                    page: _currentPage,
                    pageSize: _pageSize,
                    status: "Active",
                    branchId: _branchId,
                    isOverdue: true
                );

                if (result != null)
                {
                    _allLoans = new ObservableCollection<MicrocreditLoan>(result.Loans);
                    _totalCount = result.TotalCount;
                    
                    ApplyLocalFilters();
                    UpdatePagination();
                    
                    int totalLoans = _filteredLoans.Count;
                    decimal totalPrincipal = _filteredLoans.Sum(l => l.PrincipalAmount);
                    decimal totalPenalties = _filteredLoans.Sum(l => l.PenaltyAmount);
                    
                    StatusText.Text = $"{totalLoans} crédit(s) en retard | Principal: {totalPrincipal:N0} | Pénalités: {totalPenalties:N2} | Taux: 0.11667%/jour";
                }
                else
                {
                    string errorMsg = _apiService.LastApiError ?? "Erreur inconnue";
                    StatusText.Text = $"Erreur: {errorMsg}";
                    MessageBox.Show($"Erreur lors du chargement des données: {errorMsg}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
            catch (Exception ex)
            {
                StatusText.Text = "Erreur";
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                RefreshButton.IsEnabled = true;
                ApplyFiltersButton.IsEnabled = true;
            }
        }

        private void ApplyLocalFilters()
        {
            _filteredLoans.Clear();
            
            IEnumerable<MicrocreditLoan> filtered = _allLoans;
            
            // Filter by days overdue range
            if (!string.IsNullOrEmpty(_selectedDaysOverdueRange) && _selectedDaysOverdueRange != "0")
            {
                if (_selectedDaysOverdueRange == "1-7")
                {
                    filtered = filtered.Where(l => l.DaysOverdue >= 1 && l.DaysOverdue <= 7);
                }
                else if (_selectedDaysOverdueRange == "8-30")
                {
                    filtered = filtered.Where(l => l.DaysOverdue >= 8 && l.DaysOverdue <= 30);
                }
                else if (_selectedDaysOverdueRange == "31")
                {
                    filtered = filtered.Where(l => l.DaysOverdue >= 31);
                }
            }
            
            // Add filtered loans to observable collection
            foreach (var loan in filtered.OrderByDescending(l => l.DaysOverdue))
            {
                _filteredLoans.Add(loan);
            }
        }

        private void UpdatePagination()
        {
            int totalPages = (int)Math.Ceiling((double)_totalCount / _pageSize);
            PageInfoText.Text = $"Page {_currentPage} sur {totalPages} ({_totalCount} total)";
            PrevPageButton.IsEnabled = _currentPage > 1;
            NextPageButton.IsEnabled = _currentPage < totalPages;
        }

        private async void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            _currentPage = 1;
            await LoadOverdueLoans();
        }

        private async void ApplyFiltersButton_Click(object sender, RoutedEventArgs e)
        {
            var selectedCurrency = (CurrencyCombo.SelectedItem as ComboBoxItem)?.Tag?.ToString();
            var selectedDaysOverdue = (DaysOverdueCombo.SelectedItem as ComboBoxItem)?.Tag?.ToString();
            
            _selectedCurrency = selectedCurrency ?? "";
            _selectedDaysOverdueRange = selectedDaysOverdue ?? "0";
            _currentPage = 1;
            
            await LoadOverdueLoans();
        }

        private void SearchBox_TextChanged(object sender, TextChangedEventArgs e)
        {
            _searchText = SearchBox.Text?.Trim() ?? "";
        }

        private async void PageSizeCombo_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (PageSizeCombo.SelectedItem is ComboBoxItem item && int.TryParse(item.Content.ToString(), out int size))
            {
                _pageSize = size;
                _currentPage = 1;
                if (IsLoaded)
                {
                    await LoadOverdueLoans();
                }
            }
        }

        private async void PrevPageButton_Click(object sender, RoutedEventArgs e)
        {
            if (_currentPage > 1)
            {
                _currentPage--;
                await LoadOverdueLoans();
            }
        }

        private async void NextPageButton_Click(object sender, RoutedEventArgs e)
        {
            int totalPages = (int)Math.Ceiling((double)_totalCount / _pageSize);
            if (_currentPage < totalPages)
            {
                _currentPage++;
                await LoadOverdueLoans();
            }
        }

        private void ViewDetails_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is Guid loanId)
            {
                OpenLoanDetails(loanId);
            }
        }

        private void LoansDataGrid_MouseDoubleClick(object sender, MouseButtonEventArgs e)
        {
            if (LoansDataGrid.SelectedItem is MicrocreditLoan loan)
            {
                OpenLoanDetails(loan.Id);
            }
        }

        private void OpenLoanDetails(Guid loanId)
        {
            var detailsWindow = new LoanDetailsWindow(_apiService, loanId)
            {
                Owner = this
            };
            
            detailsWindow.ShowDialog();
            
            // Refresh list in case loan status changed
            _ = LoadOverdueLoans();
        }

        private void CloseButton_Click(object sender, RoutedEventArgs e)
        {
            Close();
        }
    }
}
