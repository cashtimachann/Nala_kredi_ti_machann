using System.Windows;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop
{
    public partial class LoginWindow : Window
    {
        private readonly ApiService _apiService;

        public LoginWindow()
        {
            InitializeComponent();
            
            // Initialize ApiService with HttpClient
            var httpClient = new System.Net.Http.HttpClient();
            _apiService = new ApiService(httpClient);
            AppServices.InitializeApi(_apiService);
        }

        private async void LoginButton_Click(object sender, RoutedEventArgs e)
        {
            StatusText.Text = "Connexion en cours...";
            LoginButton.IsEnabled = false;
            ProgressIndicator.Visibility = Visibility.Visible;
            
            try
            {
                // Simple validation
                if (!EmailTextBox.Text.Contains("@") || string.IsNullOrEmpty(PasswordBox.Password))
                {
                    StatusText.Text = "Email ou mot de passe invalide";
                    return;
                }

                // Call backend API to authenticate
                var loginResponse = await _apiService.LoginAsync(EmailTextBox.Text, PasswordBox.Password);
                
                if (loginResponse == null || string.IsNullOrEmpty(loginResponse.Token))
                {
                    StatusText.Text = "Email ou mot de passe incorrect";
                    
                    var errorMsg = "Impossible de se connecter au serveur.\n\n";
                    errorMsg += $"URL API: {_apiService.BaseUrl}\n";
                    errorMsg += $"Email: {EmailTextBox.Text}\n\n";
                    errorMsg += "Vérifiez que:\n";
                    errorMsg += "1. Le backend est en cours d'exécution\n";
                    errorMsg += "2. L'URL de l'API est correcte\n";
                    errorMsg += "3. Vos identifiants sont valides";
                    
                    MessageBox.Show(errorMsg, "Erreur de connexion", 
                                  MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }

                // Successfully authenticated - determine dashboard based on user role
                string userRole = loginResponse.User.Role;
                StatusText.Text = $"Connexion réussie en tant que {userRole}...";
                
                // Backend uses: Cashier=0, Employee=1, Manager=2, Admin=3, Secretary=4, SuperAdmin=5
                // Map these to our dashboards (Employee = Agent de Crédit)
                Window? dashboardWindow = userRole switch
                {
                    // Backend Role: Cashier (0)
                    "Cashier" or "Caissier" => new Views.CashierDashboard(_apiService),

                    // Backend Role: Employee (1) → Agent de Crédit / Loan Officer
                    "Employee" or "LoanOfficer" or "AgentDeCredit" or "Agent de Credit" or "CreditAgent" => new Views.LoanOfficerDashboard(_apiService),

                    // Backend Role: Manager (2) → Chef de Succursale
                    "Manager" or "BranchManager" or "Chef de Succursale" or "ChefDeSuccursale" => new Views.BranchManagerDashboard(_apiService),

                    // Backend Role: Admin (3) → Administrateur Système
                    "Admin" or "Administrator" or "Administrateur" or "AdministrateurSysteme" => ShowUnderDevelopmentAndReturnDefault("Administrateur Système"),

                    // Backend Role: Secretary (4) → Secrétaire Administratif
                    "Secretary" or "Secretaire" or "Secrétaire" or "SecretaireAdministratif" or "SupportTechnique" or "Support" => new Views.SecretaryDashboard(_apiService),

                    // Backend Role: SuperAdmin (5) → Super Administrateur
                    "SuperAdmin" or "Direction" or "DirectionGenerale" => ShowUnderDevelopmentAndReturnDefault("Direction Générale"),

                    // Rôle inconnu
                    _ => throw new Exception($"Rôle non reconnu: {userRole}")
                };

                if (dashboardWindow != null)
                {
                    if (Application.Current != null)
                    {
                        Application.Current.MainWindow = dashboardWindow;
                    }

                    dashboardWindow.Show();
                    this.Close();
                }
            }
            catch (Exception ex)
            {
                StatusText.Text = "Erreur de connexion";
                
                // Show detailed error for troubleshooting
                var errorMessage = $"Erreur lors de la connexion:\n\n{ex.Message}";
                
                if (ex.InnerException != null)
                {
                    errorMessage += $"\n\nDétail: {ex.InnerException.Message}";
                }
                
                // Add connection info
                errorMessage += $"\n\nURL API: {_apiService.BaseUrl}";
                
                MessageBox.Show(errorMessage, "Erreur de connexion", 
                              MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                LoginButton.IsEnabled = true;
                ProgressIndicator.Visibility = Visibility.Collapsed;
            }
        }

        private Window ShowUnderDevelopmentAndReturnDefault(string roleName)
        {
            MessageBox.Show($"Dashboard {roleName} en développement", "Information", 
                          MessageBoxButton.OK, MessageBoxImage.Information);
            return new MainWindow();
        }

        private void EmailTextBox_GotFocus(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.TextBox textBox)
            {
                textBox.SelectAll();
            }
        }

        private void EmailTextBox_LostFocus(object sender, RoutedEventArgs e)
        {
            // Validation can be added here if needed
        }

        private void PasswordBox_GotFocus(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.PasswordBox passwordBox)
            {
                passwordBox.SelectAll();
            }
        }

        private void PasswordBox_LostFocus(object sender, RoutedEventArgs e)
        {
            // Validation can be added here if needed
        }

        private void ForgotPassword_MouseLeftButtonDown(object sender, System.Windows.Input.MouseButtonEventArgs e)
        {
            MessageBox.Show("Fonctionnalité 'Mot de passe oublié' bientôt disponible", "Information", MessageBoxButton.OK, MessageBoxImage.Information);
        }
    }
}