using Microsoft.AspNetCore.SignalR.Client;
using System.Windows;

namespace NalaCreditDesktop.Services;

public class NotificationService
{
    private HubConnection? _connection;
    private readonly string _hubUrl = "https://localhost:7001/notificationHub";
    
    public event Action<string>? TransactionProcessed;
    public event Action<string>? CreditApplicationUpdate;
    public event Action<string, string>? SystemAlert;
    public event Action<string>? CashSessionAlert;

    public async Task StartAsync(string authToken)
    {
        _connection = new HubConnectionBuilder()
            .WithUrl(_hubUrl, options =>
            {
                options.AccessTokenProvider = () => Task.FromResult(authToken)!;
            })
            .Build();

        // Register event handlers
        _connection.On<object>("TransactionProcessed", (data) =>
        {
            var message = $"Transaction processed: {data}";
            TransactionProcessed?.Invoke(message);
            
            // Show notification on UI thread
            Application.Current.Dispatcher.Invoke(() =>
            {
                ShowNotification("Transaction", message);
            });
        });

        _connection.On<object>("CreditApplicationUpdate", (data) =>
        {
            var message = $"Credit application update: {data}";
            CreditApplicationUpdate?.Invoke(message);
            
            Application.Current.Dispatcher.Invoke(() =>
            {
                ShowNotification("Credit Update", message);
            });
        });

        _connection.On<object>("SystemAlert", (data) =>
        {
            var message = $"System alert: {data}";
            SystemAlert?.Invoke(message, "info");
            
            Application.Current.Dispatcher.Invoke(() =>
            {
                ShowNotification("System Alert", message);
            });
        });

        _connection.On<object>("CashSessionAlert", (data) =>
        {
            var message = $"Cash session alert: {data}";
            CashSessionAlert?.Invoke(message);
            
            Application.Current.Dispatcher.Invoke(() =>
            {
                ShowNotification("Cash Session", message);
            });
        });

        // Handle connection events
        _connection.Closed += async (error) =>
        {
            await Task.Delay(5000);
            await StartAsync(authToken);
        };

        try
        {
            await _connection.StartAsync();
        }
        catch (Exception ex)
        {
            // Log error and retry
            await Task.Delay(5000);
            await StartAsync(authToken);
        }
    }

    public async Task StopAsync()
    {
        if (_connection != null)
        {
            await _connection.StopAsync();
            await _connection.DisposeAsync();
            _connection = null;
        }
    }

    private void ShowNotification(string title, string message)
    {
        // Simple notification - could be enhanced with toast notifications
        MessageBox.Show(message, title, MessageBoxButton.OK, MessageBoxImage.Information);
    }

    public bool IsConnected => _connection?.State == HubConnectionState.Connected;
}