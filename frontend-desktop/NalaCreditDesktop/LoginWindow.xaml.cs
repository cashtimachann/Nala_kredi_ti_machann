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
                    MessageBox.Show("Email ou mot de passe incorrect", "Erreur de connexion", 
                                  MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }

                // Successfully authenticated - determine dashboard based on user role
                string userRole = loginResponse.User.Role;
                StatusText.Text = $"Connexion réussie en tant que {userRole}...";
                
                // Backend uses: Cashier=0, Employee=1, Manager=2, Admin=3, SupportTechnique=4, SuperAdmin=5
                // Map these to our dashboards
                Window? dashboardWindow = userRole switch
                {
                    // Backend Role: Cashier (0)
                    "Cashier" or "Caissier" => new Views.CashierDashboard(_apiService),
                    
                    // Backend Role: Employee (1) → Secrétaire or Agent de Crédit
                    "Employee" or "Secretary" or "Secrétaire" or "SecretaireAdministratif" => new Views.SecretaryDashboard(),
                    
                    // Backend Role: Manager (2) → Chef de Succursale ⭐ FIXED!
                    "Manager" or "BranchManager" or "Chef de Succursale" or "ChefDeSuccursale" => new Views.BranchManagerDashboard(),
                    
                    // Backend Role: Admin (3) → Administrateur Système
                    "Admin" or "Administrator" or "Administrateur" or "AdministrateurSysteme" => ShowUnderDevelopmentAndReturnDefault("Administrateur Système"),
                    
                    // Backend Role: SupportTechnique (4) → Support Technique
                    "SupportTechnique" or "Support" or "Secretaire" => new Views.SecretaryDashboard(),
                    
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
                MessageBox.Show($"Erreur lors de la connexion: {ex.Message}", "Erreur", 
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