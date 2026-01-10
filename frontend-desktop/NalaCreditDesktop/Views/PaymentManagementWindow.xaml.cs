using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class PaymentManagementWindow : Window
    {
        private readonly ApiService _apiService;
        private readonly int _branchId;
        private readonly string _branchName;
        private List<LoanPayment> _allPayments = new List<LoanPayment>();

        public PaymentManagementWindow(ApiService apiService, int branchId, string branchName)
        {
            InitializeComponent();
            _apiService = apiService;
            _branchId = branchId;
            _branchName = branchName;
            BranchText.Text = $"Succursale: {branchName}";
        }

        private async void Window_Loaded(object sender, RoutedEventArgs e)
        {
            await LoadPayments();
        }

        private async Task LoadPayments()
        {
            try
            {
                StatusText.Text = "Chargement des paiements...";

                // Get period filter
                var periodTag = ((ComboBoxItem)PeriodCombo.SelectedItem).Tag.ToString();
                DateTime? fromDate = null;

                switch (periodTag)
                {
                    case "today":
                        fromDate = DateTime.Today;
                        break;
                    case "week":
                        fromDate = DateTime.Today.AddDays(-7);
                        break;
                    case "month":
                        fromDate = DateTime.Today.AddDays(-30);
                        break;
                }

                // Get currency filter
                var currencyTag = ((ComboBoxItem)CurrencyCombo.SelectedItem).Tag.ToString();
                string? currency = string.IsNullOrEmpty(currencyTag) ? null : currencyTag;

                // Fetch payments
                var result = await _apiService.GetBranchPaymentsAsync(_branchId, fromDate, currency);

                if (result.IsSuccess && result.Data != null)
                {
                    _allPayments = result.Data;
                    ApplyFilters();
                    UpdateSummary();
                    StatusText.Text = $"{_allPayments.Count} paiement(s) chargé(s)";
                }
                else
                {
                    MessageBox.Show($"Erreur lors du chargement des paiements: {result.ErrorMessage}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                    StatusText.Text = "Erreur de chargement";
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                StatusText.Text = "Erreur";
            }
        }

        private void ApplyFilters()
        {
            var filtered = _allPayments.AsEnumerable();

            // Search filter
            var searchText = SearchBox.Text.Trim().ToLower();
            if (!string.IsNullOrEmpty(searchText))
            {
                filtered = filtered.Where(p =>
                    (p.LoanNumber?.ToLower().Contains(searchText) ?? false) ||
                    (p.CustomerName?.ToLower().Contains(searchText) ?? false) ||
                    (p.ReceiptNumber?.ToLower().Contains(searchText) ?? false));
            }

            PaymentsDataGrid.ItemsSource = filtered.OrderByDescending(p => p.PaymentDate).ToList();
        }

        private void UpdateSummary()
        {
            var today = DateTime.Today;
            var todayPayments = _allPayments.Where(p => p.PaymentDate.Date == today).ToList();

            TotalPaymentsText.Text = _allPayments.Count.ToString();
            TotalPaymentsAmountText.Text = $"{_allPayments.Sum(p => p.Amount):N0} HTG";

            TodayPaymentsText.Text = todayPayments.Count.ToString();
            TodayPaymentsAmountText.Text = $"{todayPayments.Sum(p => p.Amount):N0} HTG";

            var avgPayment = _allPayments.Count > 0 ? _allPayments.Average(p => p.Amount) : 0;
            AveragePaymentText.Text = $"{avgPayment:N0} HTG";
        }

        private void ViewPaymentDetails_Click(object sender, RoutedEventArgs e)
        {
            var button = sender as Button;
            if (button?.Tag is Guid paymentId)
            {
                var payment = _allPayments.FirstOrDefault(p => p.Id == paymentId);
                if (payment != null)
                {
                    ShowPaymentDetails(payment);
                }
            }
        }

        private void PaymentsDataGrid_MouseDoubleClick(object sender, MouseButtonEventArgs e)
        {
            if (PaymentsDataGrid.SelectedItem is LoanPayment payment)
            {
                ShowPaymentDetails(payment);
            }
        }

        private void ShowPaymentDetails(LoanPayment payment)
        {
            var details = $"Détails du Paiement\n\n" +
                          $"N° Reçu: {payment.ReceiptNumber}\n" +
                          $"Date: {payment.PaymentDate:dd/MM/yyyy HH:mm}\n" +
                          $"N° Prêt: {payment.LoanNumber}\n" +
                          $"Client: {payment.CustomerName}\n" +
                          $"Montant: {payment.Amount:N2} {payment.Currency}\n" +
                          $"Méthode: {payment.PaymentMethod}\n" +
                          $"Reçu Par: {payment.ReceivedBy}\n";

            if (!string.IsNullOrWhiteSpace(payment.Notes))
            {
                details += $"\nNotes: {payment.Notes}";
            }

            MessageBox.Show(details, "Détails du Paiement", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private async void PeriodCombo_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (IsLoaded)
            {
                await LoadPayments();
            }
        }

        private async void ApplyFiltersButton_Click(object sender, RoutedEventArgs e)
        {
            await LoadPayments();
        }

        private void SearchBox_TextChanged(object sender, TextChangedEventArgs e)
        {
            ApplyFilters();
        }

        private async void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            await LoadPayments();
        }

        private void CloseButton_Click(object sender, RoutedEventArgs e)
        {
            Close();
        }
    }
}
