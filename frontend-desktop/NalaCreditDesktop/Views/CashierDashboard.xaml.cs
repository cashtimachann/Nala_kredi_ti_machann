using System;
using System.Windows;
using NalaCreditDesktop.Services;
using NalaCreditDesktop.ViewModels;

namespace NalaCreditDesktop.Views
{
    public partial class CashierDashboard : Window
    {
        private readonly ApiService _apiService;
        private readonly CashierDashboardViewModel _viewModel;

        public CashierDashboard(ApiService? apiService = null)
        {
            InitializeComponent();
            _apiService = apiService ?? AppServices.GetRequiredApiService();
            _viewModel = new CashierDashboardViewModel(_apiService);
            DataContext = _viewModel;
            
            InitializeChart();
            Loaded += CashierDashboard_Loaded;
        }

        private async void CashierDashboard_Loaded(object sender, RoutedEventArgs e)
        {
            _viewModel.StartTimer();
            await _viewModel.LoadInitialDataAsync();
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

        private void OpenQuickDeposit_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var depotWindow = new NouveauDepotWindow(_apiService)
                {
                    Owner = this
                };
                depotWindow.ShowDialog();

                // If the operation succeeded in the child window, refresh the dashboard immediately
                if (depotWindow.OperationReussie)
                {
                    // Fire-and-forget the refresh; any exceptions will be handled inside the viewmodel
                    _ = _viewModel.LoadInitialDataAsync();
                }
            }
            catch (Exception ex)
            {
                // Display the full exception string (message + stack trace) to aid debugging
                MessageBox.Show($"Erreur lors de l'ouverture du dépôt rapide:\n\n{ex}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void OpenQuickWithdrawal_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var retraitWindow = new NouveauRetraitWindow(_apiService)
                {
                    Owner = this
                };
                retraitWindow.ShowDialog();

                if (retraitWindow.OperationReussie)
                {
                    _ = _viewModel.LoadInitialDataAsync();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'ouverture du retrait rapide:\n\n{ex}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void OpenRecouvrement_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var win = new RecouvrementWindow(_apiService)
                {
                    Owner = this
                };
                win.ShowDialog();
                // Refresh after possible payment
                _ = _viewModel.LoadInitialDataAsync();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erè lè w ap louvri fenèt Recouvrement:\n\n{ex}", "Erè", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}