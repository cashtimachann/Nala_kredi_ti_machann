using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NalaCreditDesktop.Services;
using System.Windows;

namespace NalaCreditDesktop.ViewModels;

public partial class LoginViewModel : ObservableObject
{
    private readonly ApiService _apiService;
    private readonly NotificationService _notificationService;

    [ObservableProperty]
    private string _email = string.Empty;

    [ObservableProperty]
    private string _password = string.Empty;

    [ObservableProperty]
    private bool _isLogging;

    [ObservableProperty]
    private string _errorMessage = string.Empty;

    public LoginViewModel(ApiService apiService, NotificationService notificationService)
    {
        _apiService = apiService;
        _notificationService = notificationService;
        AppServices.InitializeApi(apiService);
    }

    [RelayCommand]
    private async Task LoginAsync()
    {
        if (string.IsNullOrWhiteSpace(Email) || string.IsNullOrWhiteSpace(Password))
        {
            ErrorMessage = "Veuillez saisir votre email et mot de passe";
            return;
        }

        IsLogging = true;
        ErrorMessage = string.Empty;

        try
        {
            var result = await _apiService.LoginAsync(Email, Password);
            
            if (result != null)
            {
                // Start notification service
                await _notificationService.StartAsync(result.Token);
                
                // Store user info
                CurrentUser = result.User;
                _apiService.SetAuthToken(result.Token);
                
                // Navigate to appropriate dashboard based on user role
                Application.Current.Dispatcher.Invoke(() =>
                {
                    string userRole = result.User.Role;
                    
                    // Map backend role to appropriate dashboard
                    Window? dashboardWindow = userRole switch
                    {
                        // Backend Role: Cashier (0)
                        "Cashier" or "Caissier" => new NalaCreditDesktop.Views.CashierDashboard(_apiService),
                        
                        // Backend Role: Employee (1) → Secrétaire or Agent de Crédit
                        "Employee" or "Secretary" or "Secrétaire" or "SecretaireAdministratif" => new NalaCreditDesktop.Views.SecretaryDashboard(),
                        
                        // Backend Role: Manager (2) → Chef de Succursale
                        "Manager" or "BranchManager" or "Chef de Succursale" or "ChefDeSuccursale" => new NalaCreditDesktop.Views.BranchManagerDashboard(_apiService),
                        
                        // Backend Role: Admin (3) → Administrateur Système
                        "Admin" or "Administrator" or "Administrateur" or "AdministrateurSysteme" => new NalaCreditDesktop.Views.CashierDashboard(_apiService), // Temp fallback
                        
                        // Backend Role: SupportTechnique (4) → Support Technique
                        "SupportTechnique" or "Support" or "Secretaire" => new NalaCreditDesktop.Views.SecretaryDashboard(),
                        
                        // Backend Role: SuperAdmin (5) → Super Administrateur
                        "SuperAdmin" or "Direction" or "DirectionGenerale" => new NalaCreditDesktop.Views.CashierDashboard(_apiService), // Temp fallback
                        
                        // Unknown role - show error
                        _ => null
                    };
                    
                    if (dashboardWindow != null)
                    {
                        if (Application.Current != null)
                        {
                            Application.Current.MainWindow = dashboardWindow;
                        }
                        
                        dashboardWindow.Show();
                        
                        // Close login window
                        Application.Current.Windows
                            .OfType<Window>()
                            .FirstOrDefault(w => w.GetType() == typeof(LoginWindow))
                            ?.Close();
                    }
                    else
                    {
                        ErrorMessage = $"Rôle non reconnu: {userRole}";
                    }
                });
            }
            else
            {
                ErrorMessage = "Email ou mot de passe incorrect";
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Erreur de connexion: {ex.Message}";
        }
        finally
        {
            IsLogging = false;
        }
    }

    public static UserInfo? CurrentUser { get; private set; }
}