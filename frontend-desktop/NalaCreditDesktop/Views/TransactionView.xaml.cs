using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

namespace NalaCreditDesktop.Views
{
    public partial class TransactionView : UserControl
    {
        private DataGrid? _transactionsGrid;

        public TransactionView()
        {
            InitializeComponent();
            Loaded += TransactionView_Loaded;
        }

        private void TransactionView_Loaded(object sender, RoutedEventArgs e)
        {
            _transactionsGrid ??= FindName("TransactionsDataGrid") as DataGrid;
            _transactionsGrid?.Focus();
        }

        private void OnCopyExecuted(object sender, ExecutedRoutedEventArgs e)
        {
            var grid = GetTransactionsGrid(sender);
            if (grid == null)
            {
                return;
            }

            CopySelectedRowsToClipboard(grid);
            e.Handled = true;
        }

        private void OnCopyCanExecute(object sender, CanExecuteRoutedEventArgs e)
        {
            var grid = GetTransactionsGrid(sender);
            e.CanExecute = grid?.SelectedItems.Count > 0;
            e.Handled = true;
        }

        private void OnSelectAllExecuted(object sender, ExecutedRoutedEventArgs e)
        {
            var grid = GetTransactionsGrid(sender);
            grid?.SelectAll();
            e.Handled = true;
        }

        private void OnSelectAllCanExecute(object sender, CanExecuteRoutedEventArgs e)
        {
            var grid = GetTransactionsGrid(sender);
            e.CanExecute = grid is { Items.Count: > 0 };
            e.Handled = true;
        }

        private void CopySelectedRowsToClipboard(DataGrid grid)
        {
            if (grid.SelectedItems.Count == 0)
                return;

            grid.ClipboardCopyMode = DataGridClipboardCopyMode.IncludeHeader;
            ApplicationCommands.Copy.Execute(null, grid);
        }

        private DataGrid? GetTransactionsGrid(object sender)
        {
            if (sender is DataGrid dataGrid)
            {
                _transactionsGrid = dataGrid;
                return dataGrid;
            }

            _transactionsGrid ??= FindName("TransactionsDataGrid") as DataGrid;
            return _transactionsGrid;
        }
    }
}