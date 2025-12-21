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
                
                // Navigate to main window
                Application.Current.Dispatcher.Invoke(() =>
                {
                    var dashboard = new NalaCreditDesktop.Views.CashierDashboard(_apiService);
                    dashboard.Show();
                    
                    // Close login window
                    Application.Current.Windows
                        .OfType<Window>()
                        .FirstOrDefault(w => w.GetType() == typeof(LoginWindow))
                        ?.Close();
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