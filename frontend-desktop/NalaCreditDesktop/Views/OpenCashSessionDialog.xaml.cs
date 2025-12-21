using System;
using System.Globalization;
using System.Windows;

namespace NalaCreditDesktop.Views;

public partial class OpenCashSessionDialog : Window
{
    public decimal OpeningBalanceHTG { get; private set; }
    public decimal OpeningBalanceUSD { get; private set; }

    public OpenCashSessionDialog()
    {
        InitializeComponent();
    }

    public void InitializeBalances(decimal htg, decimal usd)
    {
        HtgTextBox.Text = htg.ToString("N0", CultureInfo.InvariantCulture);
        UsdTextBox.Text = usd.ToString("N2", CultureInfo.InvariantCulture);
    }

    private void Validate_Click(object sender, RoutedEventArgs e)
    {
        if (!decimal.TryParse(HtgTextBox.Text, NumberStyles.Number, CultureInfo.InvariantCulture, out var htg))
        {
            MessageBox.Show("Montant HTG invalide", "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        if (!decimal.TryParse(UsdTextBox.Text, NumberStyles.Number, CultureInfo.InvariantCulture, out var usd))
        {
            MessageBox.Show("Montant USD invalide", "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        OpeningBalanceHTG = htg;
        OpeningBalanceUSD = usd;
        DialogResult = true;
        Close();
    }

    private void Cancel_Click(object sender, RoutedEventArgs e)
    {
        DialogResult = false;
        Close();
    }
}
