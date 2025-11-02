using System;
using System.Windows;
using System.Windows.Controls;
using NalaCreditDesktop.ViewModels;

namespace NalaCreditDesktop.Views
{
    public partial class CashierDashboard : Window
    {
        private CashierDashboardViewModel _viewModel;

        public CashierDashboard()
        {
            InitializeComponent();
            _viewModel = new CashierDashboardViewModel();
            DataContext = _viewModel;
            
            InitializeChart();
            Loaded += CashierDashboard_Loaded;
        }

        private void CashierDashboard_Loaded(object sender, RoutedEventArgs e)
        {
            _viewModel.StartTimer();
            _viewModel.LoadInitialData();
        }

        private void InitializeChart()
        {
            try
            {
                // Le graphique est maintenant un Canvas simple avec des éléments visuels de base
                // Plus de configuration nécessaire - tout est défini en XAML
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'initialisation du graphique: {ex.Message}", 
                               "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }

        protected override void OnClosed(EventArgs e)
        {
            _viewModel?.StopTimer();
            base.OnClosed(e);
        }

        private void TransactionsButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var transactionWindow = new TransactionWindow();
                transactionWindow.ShowDialog();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'ouverture du module transactions: {ex.Message}", 
                               "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}