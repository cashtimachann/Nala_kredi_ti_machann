using NalaCreditDesktop.ViewModels;
using System.Windows.Controls;

namespace NalaCreditDesktop.Views
{
    public partial class CashierDashboardView : UserControl
    {
        public CashierDashboardView()
        {
            InitializeComponent();
            
            // Create a simple ViewModel for demonstration
            var viewModel = new CashierViewModel();
            DataContext = viewModel;
        }
    }
}