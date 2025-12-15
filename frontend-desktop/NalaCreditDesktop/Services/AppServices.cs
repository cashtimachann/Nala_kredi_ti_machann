using System;

namespace NalaCreditDesktop.Services;

public static class AppServices
{
    private static ApiService? _apiService;
    // Event fired when a transaction has been successfully processed. UI components can subscribe
    // to this event to refresh dashboards or trigger other updates.
    public static event Action? TransactionProcessed;

    public static void InitializeApi(ApiService apiService)
    {
        _apiService = apiService ?? throw new ArgumentNullException(nameof(apiService));
    }

    public static ApiService GetRequiredApiService()
    {
        return _apiService ?? throw new InvalidOperationException("ApiService has not been initialized.");
    }

    public static ApiService? ApiService => _apiService;

    public static void RaiseTransactionProcessed()
    {
        try
        {
            TransactionProcessed?.Invoke();
        }
        catch
        {
            // Ignore exceptions from event handlers to avoid crashing the app
        }
    }
}
