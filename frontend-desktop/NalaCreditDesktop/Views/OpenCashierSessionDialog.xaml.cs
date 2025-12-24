using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Windows;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views;

public partial class OpenCashierSessionDialog : Window
{
    private readonly ApiService _apiService;
    private List<CashierInfo> _cashiers = new();
    
    public string? SelectedCashierId { get; private set; }
    public decimal OpeningBalanceHTG { get; private set; }
    public decimal OpeningBalanceUSD { get; private set; }
    public string? Notes { get; private set; }

    public OpenCashierSessionDialog(ApiService apiService)
    {
        InitializeComponent();
        _apiService = apiService;
        LoadCashiersAsync();
    }

    private async void LoadCashiersAsync()
    {
        try
        {
            // Get list of cashiers from API
            var result = await _apiService.GetCashiersAsync();
            
            if (result.IsSuccess && result.Data != null)
            {
                _cashiers = result.Data;
                CashierComboBox.ItemsSource = _cashiers;
                
                if (_cashiers.Any())
                {
                    CashierComboBox.SelectedIndex = 0;
                }
            }
            else
            {
                MessageBox.Show(
                    result.ErrorMessage ?? "Impossible de charger la liste des caissiers",
                    "Erreur",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                $"Erreur lors du chargement des caissiers: {ex.Message}",
                "Erreur",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
        }
    }

    private void CashierComboBox_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
    {
        if (CashierComboBox.SelectedItem is CashierInfo cashier)
        {
            SelectedCashierId = cashier.Id;
        }
    }

    private void Validate_Click(object sender, RoutedEventArgs e)
    {
        // Validate cashier selection
        if (string.IsNullOrEmpty(SelectedCashierId))
        {
            MessageBox.Show(
                "Veuillez sélectionner un caissier",
                "Validation",
                MessageBoxButton.OK,
                MessageBoxImage.Warning);
            return;
        }

        // Validate HTG amount
        if (!decimal.TryParse(HtgTextBox.Text, NumberStyles.Number, CultureInfo.InvariantCulture, out var htg) || htg < 0)
        {
            MessageBox.Show(
                "Montant HTG invalide. Veuillez entrer un nombre positif.",
                "Validation",
                MessageBoxButton.OK,
                MessageBoxImage.Warning);
            HtgTextBox.Focus();
            return;
        }

        // Validate USD amount
        if (!decimal.TryParse(UsdTextBox.Text, NumberStyles.Number, CultureInfo.InvariantCulture, out var usd) || usd < 0)
        {
            MessageBox.Show(
                "Montant USD invalide. Veuillez entrer un nombre positif.",
                "Validation",
                MessageBoxButton.OK,
                MessageBoxImage.Warning);
            UsdTextBox.Focus();
            return;
        }

        OpeningBalanceHTG = htg;
        OpeningBalanceUSD = usd;
        Notes = NotesTextBox.Text;
        
        DialogResult = true;
        Close();
    }

    private void Cancel_Click(object sender, RoutedEventArgs e)
    {
        DialogResult = false;
        Close();
    }
}
