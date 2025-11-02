using Newtonsoft.Json;
using System.Net.Http;
using System.Text;

namespace NalaCreditDesktop.Services;

public class ApiService
{
    private readonly HttpClient _httpClient;
    private string? _baseUrl;
    private string? _authToken;

    public ApiService(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _baseUrl = "http://localhost:7001/api";
        
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
    }

    public void SetAuthToken(string token)
    {
        _authToken = token;
        _httpClient.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
    }

    public void ClearAuth()
    {
        _authToken = null;
        _httpClient.DefaultRequestHeaders.Authorization = null;
    }

    public bool IsAuthenticated => !string.IsNullOrEmpty(_authToken);

    // Authentication
    public async Task<LoginResponse?> LoginAsync(string email, string password)
    {
        var request = new LoginRequest { Email = email, Password = password };
        var response = await PostAsync<LoginResponse>("auth/login", request);
        
        if (response != null)
        {
            SetAuthToken(response.Token);
        }
        
        return response;
    }

    public async Task<bool> LogoutAsync()
    {
        try
        {
            await PostAsync<object>("auth/logout", null);
            ClearAuth();
            return true;
        }
        catch
        {
            ClearAuth();
            return false;
        }
    }

    // Dashboard APIs
    public async Task<CashierDashboard?> GetCashierDashboardAsync()
    {
        return await GetAsync<CashierDashboard>("dashboard/cashier");
    }

    public async Task<CreditAgentDashboard?> GetCreditAgentDashboardAsync()
    {
        return await GetAsync<CreditAgentDashboard>("dashboard/credit-agent");
    }

    public async Task<BranchSupervisorDashboard?> GetBranchSupervisorDashboardAsync()
    {
        return await GetAsync<BranchSupervisorDashboard>("dashboard/branch-supervisor");
    }

    // Transaction APIs
    public async Task<bool> ProcessDepositAsync(int accountId, decimal amount, Currency currency)
    {
        var request = new TransactionRequest
        {
            AccountId = accountId,
            Amount = amount,
            Currency = (int)currency,
            Type = 1 // Deposit
        };
        
        try
        {
            await PostAsync<object>("transaction/deposit", request);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> ProcessWithdrawalAsync(int accountId, decimal amount, Currency currency)
    {
        var request = new TransactionRequest
        {
            AccountId = accountId,
            Amount = amount,
            Currency = (int)currency,
            Type = 2 // Withdrawal
        };
        
        try
        {
            await PostAsync<object>("transaction/withdrawal", request);
            return true;
        }
        catch
        {
            return false;
        }
    }

    // Generic HTTP methods
    private async Task<T?> GetAsync<T>(string endpoint) where T : class
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/{endpoint}");
            
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<T>(json);
            }
            
            return null;
        }
        catch
        {
            return null;
        }
    }

    private async Task<T?> PostAsync<T>(string endpoint, object? data) where T : class
    {
        try
        {
            var json = data != null ? JsonConvert.SerializeObject(data) : string.Empty;
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PostAsync($"{_baseUrl}/{endpoint}", content);
            
            if (response.IsSuccessStatusCode)
            {
                var responseJson = await response.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<T>(responseJson);
            }
            
            return null;
        }
        catch
        {
            return null;
        }
    }
}

// DTOs
public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public UserInfo User { get; set; } = new();
}

public class UserInfo
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? BranchId { get; set; }
}

public class CashierDashboard
{
    public string CashSessionStatus { get; set; } = string.Empty;
    public decimal CashBalanceHTG { get; set; }
    public decimal CashBalanceUSD { get; set; }
    public decimal TodayDeposits { get; set; }
    public decimal TodayWithdrawals { get; set; }
    public int TodayExchanges { get; set; }
    public int ClientsServed { get; set; }
    public int TransactionCount { get; set; }
}

public class CreditAgentDashboard
{
    public int ActiveCreditsCount { get; set; }
    public decimal TotalPortfolioAmount { get; set; }
    public int PendingApplications { get; set; }
    public int PaymentsDueThisWeek { get; set; }
    public int OverdueCredits { get; set; }
    public double RepaymentRate { get; set; }
}

public class BranchSupervisorDashboard
{
    public decimal TodayTransactionVolume { get; set; }
    public int TodayTransactionCount { get; set; }
    public int ActiveCashiers { get; set; }
    public int NewAccountsToday { get; set; }
    public decimal BranchCreditPortfolio { get; set; }
    public int ActiveCredits { get; set; }
    public int PendingCreditApprovals { get; set; }
}

public class TransactionRequest
{
    public int AccountId { get; set; }
    public decimal Amount { get; set; }
    public int Currency { get; set; }
    public int Type { get; set; }
}

public enum Currency
{
    HTG = 1,
    USD = 2
}