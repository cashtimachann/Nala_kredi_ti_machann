using System.Windows;

namespace NalaCreditDesktop.Views
{
    public partial class PauseConfirmationDialog : Window
    {
        public PauseConfirmationDialog()
        {
            InitializeComponent();
            WindowStartupLocation = WindowStartupLocation.CenterOwner;
        }

        private void ConfirmButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = true;
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
        }
    }
}