using System.Windows;
using System.Windows.Input;

namespace NalaCreditDesktop.Views
{
    public partial class UnlockCashierDialog : Window
    {
        private const string DEMO_PASSWORD = "1234"; // En production, ceci viendrait de la base de données

        public UnlockCashierDialog()
        {
            InitializeComponent();
            WindowStartupLocation = WindowStartupLocation.CenterOwner;
            PasswordBox.Focus();
        }

        private void UnlockButton_Click(object sender, RoutedEventArgs e)
        {
            AttemptUnlock();
        }

        private void PasswordBox_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                AttemptUnlock();
            }
        }

        private void AttemptUnlock()
        {
            var enteredPassword = PasswordBox.Password;
            
            if (string.IsNullOrEmpty(enteredPassword))
            {
                MessageBox.Show("Veuillez saisir votre mot de passe.", "Mot de passe requis", 
                               MessageBoxButton.OK, MessageBoxImage.Warning);
                PasswordBox.Focus();
                return;
            }

            // Simulation de vérification du mot de passe
            // En production, ceci ferait appel à un service d'authentification
            if (enteredPassword == DEMO_PASSWORD)
            {
                DialogResult = true;
            }
            else
            {
                MessageBox.Show("Mot de passe incorrect. Veuillez réessayer.", "Authentification échouée", 
                               MessageBoxButton.OK, MessageBoxImage.Error);
                PasswordBox.Clear();
                PasswordBox.Focus();
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
        }
    }
}