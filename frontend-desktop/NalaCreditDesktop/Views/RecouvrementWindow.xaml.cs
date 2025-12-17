using System.Windows;
using System.Windows.Input;
using NalaCreditDesktop.Services;
using NalaCreditDesktop.ViewModels;

namespace NalaCreditDesktop.Views
{
    public partial class RecouvrementWindow : Window
    {
        private readonly ApiService _api;
        private readonly RecouvrementViewModel _vm;

        public RecouvrementWindow(ApiService? api = null)
        {
            InitializeComponent();
            _api = api ?? AppServices.GetRequiredApiService();
            _vm = new RecouvrementViewModel(_api);
            DataContext = _vm;

            Loaded += async (_, __) =>
            {
                await _vm.LoadOverdueCommand.ExecuteAsync(null);
            };
        }

        private async void OverdueGrid_MouseDoubleClick(object sender, MouseButtonEventArgs e)
        {
            // On double click, copy the selected loan number into the search box and search
            if (sender is System.Windows.Controls.DataGrid dg && dg.SelectedItem is NalaCreditDesktop.Models.OverdueLoan row)
            {
                _vm.SearchLoanNumber = row.LoanNumber;
                await _vm.SearchLoanCommand.ExecuteAsync(null);
            }
        }
    }
}
