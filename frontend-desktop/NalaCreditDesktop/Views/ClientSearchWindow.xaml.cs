using System;
using System.Windows;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class ClientSearchWindow : Window
    {
        private readonly ApiService _apiService;
        private readonly string _branchName;
        private SearchBorrowerView? _searchBorrowerView;

        public ClientSearchWindow(ApiService apiService, string branchName)
        {
            InitializeComponent();
            _apiService = apiService ?? throw new ArgumentNullException(nameof(apiService));
            _branchName = branchName;

            // Set branch name in header
            if (!string.IsNullOrEmpty(_branchName))
            {
                BranchNameText.Text = $"Succursale: {_branchName}";
            }

            // Initialize the SearchBorrowerView with the ApiService
            InitializeSearchView();
        }

        private void InitializeSearchView()
        {
            try
            {
                // Create and add SearchBorrowerView programmatically
                _searchBorrowerView = new SearchBorrowerView(_apiService);
                ContentBorder.Child = _searchBorrowerView;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'initialisation de la recherche: {ex.Message}",
                    "Erreur",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        private void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Reinitialize the search view to refresh data
                InitializeSearchView();
                
                MessageBox.Show("Recherche actualisée avec succès!",
                    "Actualisation",
                    MessageBoxButton.OK,
                    MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'actualisation: {ex.Message}",
                    "Erreur",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        private void CloseButton_Click(object sender, RoutedEventArgs e)
        {
            this.Close();
        }
    }
}
