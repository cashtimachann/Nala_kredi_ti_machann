using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using NalaCreditDesktop.Models;

namespace NalaCreditDesktop.Services;

public class ApiService
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;
    private string? _authToken;

    public ApiService(HttpClient httpClient)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _baseUrl = ResolveBaseUrl();

        if (_httpClient.BaseAddress == null)
        {
            _httpClient.BaseAddress = new Uri(_baseUrl);
        }

        if (!_httpClient.DefaultRequestHeaders.Accept.Any(h => h.MediaType == "application/json"))
        {
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }
    }

    private static string ResolveBaseUrl()
    {
        var configuredUrl = Environment.GetEnvironmentVariable("NALACREDIT_API_URL");
        if (!string.IsNullOrWhiteSpace(configuredUrl))
        {
            var trimmed = configuredUrl.Trim();
            return trimmed.Contains("/api", StringComparison.OrdinalIgnoreCase)
                ? EnsureTrailingSlash(trimmed)
                : EnsureApiBase(trimmed);
        }

        var aspnetUrls = Environment.GetEnvironmentVariable("ASPNETCORE_URLS");
        if (!string.IsNullOrWhiteSpace(aspnetUrls))
        {
            var firstUrl = aspnetUrls
                .Split(';', StringSplitOptions.RemoveEmptyEntries)
                .Select(url => url.Trim())
                .FirstOrDefault(url => !string.IsNullOrWhiteSpace(url));

            if (!string.IsNullOrWhiteSpace(firstUrl))
            {
                return EnsureApiBase(firstUrl);
            }
        }

        return EnsureApiBase("http://localhost:5000");
    }

    private static string EnsureTrailingSlash(string value) =>
        value.EndsWith("/", StringComparison.Ordinal) ? value : $"{value}/";

    private static string EnsureApiBase(string baseUrl)
    {
        var normalized = baseUrl.Trim().TrimEnd('/');

        if (!normalized.EndsWith("/api", StringComparison.OrdinalIgnoreCase))
        {
            normalized = $"{normalized}/api";
        }

        return EnsureTrailingSlash(normalized);
    }

    public void SetAuthToken(string token)
    {
        _authToken = token;
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
    }

    public void ClearAuth()
    {
        _authToken = null;
        _httpClient.DefaultRequestHeaders.Authorization = null;
        CurrentUser = null;
    }

    public bool IsAuthenticated => !string.IsNullOrEmpty(_authToken);
    public string? AuthToken => _authToken;
    public string BaseUrl => _baseUrl;
    public UserInfo? CurrentUser { get; private set; }

    public async Task<LoginResponse?> LoginAsync(string email, string password)
    {
        var request = new LoginRequest { Email = email, Password = password };
        var response = await PostAsync<LoginResponse>("auth/login", request);

        if (response != null)
        {
            SetAuthToken(response.Token);
            CurrentUser = response.User;
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

    public async Task<ApiResult<CashierDashboard?>> GetCashierDashboardAsync() =>
        await GetAsyncResult<CashierDashboard>("dashboard/cashier");

    public async Task<CreditAgentDashboard?> GetCreditAgentDashboardAsync() =>
        await GetAsync<CreditAgentDashboard>("dashboard/credit-agent");

    public async Task<BranchSupervisorDashboard?> GetBranchSupervisorDashboardAsync() =>
        await GetAsync<BranchSupervisorDashboard>("dashboard/branch-supervisor");

    public async Task<BranchDto?> GetBranchAsync(int branchId) =>
        await GetAsync<BranchDto>($"branch/{branchId}");

    public async Task<ApiResult> OpenCashSessionAsync(decimal openingBalanceHTG, decimal openingBalanceUSD)
    {
        var payload = new
        {
            OpeningBalanceHTG = openingBalanceHTG,
            OpeningBalanceUSD = openingBalanceUSD
        };

        try
        {
            var json = JsonConvert.SerializeObject(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("transaction/cash-session/open", content);

            if (response.IsSuccessStatusCode)
            {
                return ApiResult.Success();
            }

            var errorContent = await response.Content.ReadAsStringAsync();
            var friendlyMessage = ExtractErrorMessage(errorContent) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult.Failure(friendlyMessage);
        }
        catch (Exception ex)
        {
            return ApiResult.Failure(ex.Message);
        }
    }

    public async Task<ApiResult> CloseCashSessionAsync(decimal closingBalanceHTG, decimal closingBalanceUSD, string? notes = null)
    {
        var payload = new
        {
            ClosingBalanceHTG = closingBalanceHTG,
            ClosingBalanceUSD = closingBalanceUSD,
            Notes = notes
        };

        try
        {
            var json = JsonConvert.SerializeObject(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("transaction/cash-session/close", content);

            if (response.IsSuccessStatusCode)
            {
                return ApiResult.Success();
            }

            var errorContent = await response.Content.ReadAsStringAsync();
            var friendlyMessage = ExtractErrorMessage(errorContent) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult.Failure(friendlyMessage);
        }
        catch (Exception ex)
        {
            return ApiResult.Failure(ex.Message);
        }
    }

    public async Task<bool> ProcessDepositAsync(int accountId, decimal amount, Currency currency, int? branchId = null, string? cashierName = null, string? cashierCaisseNumber = null)
    {
        var request = new TransactionRequest
        {
            AccountId = accountId,
            Amount = amount,
            Currency = (int)currency,
            Type = 1
            , BranchId = branchId
            , CashierName = cashierName
            , CashierCaisseNumber = cashierCaisseNumber
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

    public async Task<bool> ProcessWithdrawalAsync(int accountId, decimal amount, Currency currency, int? branchId = null, string? cashierName = null, string? cashierCaisseNumber = null)
    {
        var request = new TransactionRequest
        {
            AccountId = accountId,
            Amount = amount,
            Currency = (int)currency,
            Type = 2
            , BranchId = branchId
            , CashierName = cashierName
            , CashierCaisseNumber = cashierCaisseNumber
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

    public async Task<BranchTransactionHistoryResult?> GetBranchTransactionHistoryAsync(
        int branchId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? transactionType = null,
        int page = 1,
        int pageSize = 200)
    {
        var query = new StringBuilder($"transaction/branch/{branchId}/history?page={page}&pageSize={pageSize}");

        if (startDate.HasValue)
        {
            query.Append("&startDate=").Append(Uri.EscapeDataString(startDate.Value.ToString("o")));
        }

        if (endDate.HasValue)
        {
            query.Append("&endDate=").Append(Uri.EscapeDataString(endDate.Value.ToString("o")));
        }

        if (transactionType.HasValue)
        {
            query.Append("&transactionType=").Append(transactionType.Value);
        }

        return await GetAsync<BranchTransactionHistoryResult>(query.ToString());
    }

    public async Task<ApiResult<SavingsAccountInfo?>> GetSavingsAccountByNumberAsync(string accountNumber)
    {
        if (string.IsNullOrWhiteSpace(accountNumber))
        {
            return ApiResult<SavingsAccountInfo?>.Failure("Numéro de compte requis");
        }

        try
        {
            var response = await _httpClient.GetAsync($"savingsaccount/by-number/{Uri.EscapeDataString(accountNumber)}");
            var content = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var account = string.IsNullOrWhiteSpace(content)
                    ? null
                    : JsonConvert.DeserializeObject<SavingsAccountInfo>(content);

                return ApiResult<SavingsAccountInfo?>.Success(account);
            }

            var message = ExtractErrorMessage(content) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<SavingsAccountInfo?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<SavingsAccountInfo?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<SavingsTransactionResponse?>> ProcessSavingsTransactionAsync(SavingsTransactionRequest request)
    {
        if (request == null)
        {
            return ApiResult<SavingsTransactionResponse?>.Failure("Requête invalide");
        }

        try
        {
            var json = JsonConvert.SerializeObject(request);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("savingstransaction/process", content);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var transaction = string.IsNullOrWhiteSpace(raw)
                    ? null
                    : JsonConvert.DeserializeObject<SavingsTransactionResponse>(raw);

                return ApiResult<SavingsTransactionResponse?>.Success(transaction);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<SavingsTransactionResponse?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<SavingsTransactionResponse?>.Failure(ex.Message);
        }
    }

    // Term Savings - account and transaction support
    public async Task<ApiResult<TermSavingsAccountInfo?>> GetTermSavingsAccountByNumberAsync(string accountNumber)
    {
        if (string.IsNullOrWhiteSpace(accountNumber))
        {
            return ApiResult<TermSavingsAccountInfo?>.Failure("Numéro de compte requis");
        }

        try
        {
            var response = await _httpClient.GetAsync($"termsavingsaccount/by-number/{Uri.EscapeDataString(accountNumber)}");
            var content = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var account = string.IsNullOrWhiteSpace(content) ? null : JsonConvert.DeserializeObject<TermSavingsAccountInfo>(content);
                return ApiResult<TermSavingsAccountInfo?>.Success(account);
            }

            var message = ExtractErrorMessage(content) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<TermSavingsAccountInfo?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<TermSavingsAccountInfo?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<TermSavingsTransactionResponse?>> ProcessTermSavingsTransactionAsync(TermSavingsTransactionRequest request)
    {
        if (request == null)
        {
            return ApiResult<TermSavingsTransactionResponse?>.Failure("Requête invalide");
        }

        try
        {
            var json = JsonConvert.SerializeObject(request);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("termsavingsaccount/transaction", content);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                return ApiResult<TermSavingsTransactionResponse?>.Success(null);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<TermSavingsTransactionResponse?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<TermSavingsTransactionResponse?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<CurrentAccountInfo?>> GetCurrentAccountByNumberAsync(string accountNumber)
    {
        if (string.IsNullOrWhiteSpace(accountNumber))
        {
            return ApiResult<CurrentAccountInfo?>.Failure("Numéro de compte requis");
        }

        try
        {
            var response = await _httpClient.GetAsync($"currentaccount/by-number/{Uri.EscapeDataString(accountNumber)}");
            var content = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                    if (string.IsNullOrWhiteSpace(content))
                    {
                        return ApiResult<CurrentAccountInfo?>.Success(null);
                    }

                    try
                    {
                        var account = JsonConvert.DeserializeObject<CurrentAccountInfo>(content);
                        return ApiResult<CurrentAccountInfo?>.Success(account);
                    }
                    catch (Exception ex)
                    {
                        // Return a helpful error including the raw payload to aid debugging
                        var msg = $"Erreur de désérialisation du compte courant: {ex.Message}. Payload: {content}";
                        return ApiResult<CurrentAccountInfo?>.Failure(msg);
                    }
            }

            var message = ExtractErrorMessage(content) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<CurrentAccountInfo?>.Failure(message);
        }
        catch (Exception ex)
        {
                return ApiResult<CurrentAccountInfo?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<CurrentAccountTransactionResponse?>> ProcessCurrentAccountTransactionAsync(CurrentAccountTransactionRequest request)
    {
        if (request == null)
        {
            return ApiResult<CurrentAccountTransactionResponse?>.Failure("Requête invalide");
        }

        try
        {
            var json = JsonConvert.SerializeObject(request);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync($"currentaccount/{Uri.EscapeDataString(request.AccountNumber)}/transactions", content);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                    if (string.IsNullOrWhiteSpace(raw))
                    {
                        return ApiResult<CurrentAccountTransactionResponse?>.Success(null);
                    }

                    try
                    {
                        var transaction = JsonConvert.DeserializeObject<CurrentAccountTransactionResponse>(raw);
                        return ApiResult<CurrentAccountTransactionResponse?>.Success(transaction);
                    }
                    catch (Exception ex)
                    {
                        var msg = $"Erreur de désérialisation transaction compte courant: {ex.Message}. Payload: {raw}";
                        return ApiResult<CurrentAccountTransactionResponse?>.Failure(msg);
                    }
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<CurrentAccountTransactionResponse?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<CurrentAccountTransactionResponse?>.Failure(ex.Message);
        }
    }

    private async Task<ApiResult<T?>> GetAsyncResult<T>(string endpoint) where T : class
    {
        try
        {
            var response = await _httpClient.GetAsync(endpoint);

            if (!response.IsSuccessStatusCode)
            {
                var errorRaw = await response.Content.ReadAsStringAsync();
                var message = ExtractErrorMessage(errorRaw) ?? response.ReasonPhrase ?? "Erreur inconnue";
                return ApiResult<T?>.Failure(message);
            }

            var json = await response.Content.ReadAsStringAsync();
            var data = string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<T>(json);
            return ApiResult<T?>.Success(data);
        }
        catch (Exception ex)
        {
            return ApiResult<T?>.Failure(ex.Message);
        }
    }

    private async Task<T?> GetAsync<T>(string endpoint) where T : class
    {
        var result = await GetAsyncResult<T>(endpoint);
        return result.IsSuccess ? result.Data : null;
    }

    private async Task<T?> PostAsync<T>(string endpoint, object? data) where T : class
    {
        try
        {
            HttpContent content;

            if (data == null)
            {
                content = new StringContent(string.Empty, Encoding.UTF8, "application/json");
            }
            else
            {
                var json = JsonConvert.SerializeObject(data);
                content = new StringContent(json, Encoding.UTF8, "application/json");
            }

            var response = await _httpClient.PostAsync(endpoint, content);

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }
            var responseJson = await response.Content.ReadAsStringAsync();
            return string.IsNullOrWhiteSpace(responseJson)
                ? null
                : JsonConvert.DeserializeObject<T>(responseJson);
        }
        catch
        {
            return null;
        }
    }

    private static string? ExtractErrorMessage(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        try
        {
            var parsed = JsonConvert.DeserializeObject<Dictionary<string, object>>(raw);
            if (parsed == null)
            {
                return raw.Trim();
            }

            if (parsed.TryGetValue("message", out var message) && message != null)
            {
                return message.ToString();
            }

            if (parsed.TryGetValue("error", out var error) && error != null)
            {
                return error.ToString();
            }

            if (parsed.TryGetValue("title", out var title) && title != null)
            {
                return title.ToString();
            }

            return raw.Trim();
        }
        catch
        {
            return raw.Trim();
        }
    }
}

public sealed class ApiResult
{
    private ApiResult(bool isSuccess, string? errorMessage = null)
    {
        IsSuccess = isSuccess;
        ErrorMessage = errorMessage;
    }

    public bool IsSuccess { get; }
    public string? ErrorMessage { get; }

    public static ApiResult Success() => new ApiResult(true);

    public static ApiResult Failure(string? message) => new ApiResult(false, string.IsNullOrWhiteSpace(message) ? "Operation échouée" : message);
}

public sealed class ApiResult<T>
{
    private ApiResult(bool isSuccess, T? data, string? errorMessage)
    {
        IsSuccess = isSuccess;
        Data = data;
        ErrorMessage = errorMessage;
    }

    public bool IsSuccess { get; }
    public T? Data { get; }
    public string? ErrorMessage { get; }

    public static ApiResult<T> Success(T? data) => new ApiResult<T>(true, data, null);

    public static ApiResult<T> Failure(string? message) =>
        new ApiResult<T>(false, default, string.IsNullOrWhiteSpace(message) ? "Operation échouée" : message);
}

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
    public int? CashSessionId { get; set; }
    public DateTime? SessionStartTime { get; set; }
    public decimal CashBalanceHTG { get; set; }
    public decimal CashBalanceUSD { get; set; }
    public decimal OpeningBalanceHTG { get; set; }
    public decimal OpeningBalanceUSD { get; set; }
    public decimal TodayDeposits { get; set; }
    public decimal TodayWithdrawals { get; set; }
    public int TodayExchanges { get; set; }
    public int ClientsServed { get; set; }
    public int TransactionCount { get; set; }
    public int DepositsCount { get; set; }
    public decimal DepositsAmountHTG { get; set; }
    public decimal DepositsAmountUSD { get; set; }
    public int WithdrawalsCount { get; set; }
    public decimal WithdrawalsAmountHTG { get; set; }
    public decimal WithdrawalsAmountUSD { get; set; }
    public decimal TotalIncoming { get; set; }
    public decimal TotalOutgoing { get; set; }
    public decimal UsdSalesAmount { get; set; }
    public decimal UsdPurchaseAmount { get; set; }
    public DateTime? LastTransactionTime { get; set; }
    public List<CashierTransaction> RecentTransactions { get; set; } = new();
}

public class CashierTransaction
{
    public string Id { get; set; } = string.Empty;
    public string TransactionNumber { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountLabel { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string ProcessedBy { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
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

public class BranchDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Commune { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public List<string> Phones { get; set; } = new();
    public string Email { get; set; } = string.Empty;
}

public class TransactionRequest
{
    public int AccountId { get; set; }
    public decimal Amount { get; set; }
    public int Currency { get; set; }
    public int Type { get; set; }
    public int? BranchId { get; set; }
    public string? BranchName { get; set; }
    public string? CashierName { get; set; }
    public string? CashierCaisseNumber { get; set; }
}

public class BranchTransactionHistoryResult
{
    public int TotalTransactions { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public List<BranchTransactionHistoryItem> Transactions { get; set; } = new();
}

public class BranchTransactionHistoryItem
{
    public long Id { get; set; }
    public string TransactionNumber { get; set; } = string.Empty;
    public int AccountId { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? Currency { get; set; }
    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Customer { get; set; } = string.Empty;
    public string Cashier { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal BalanceAfter { get; set; }
}

public enum Currency
{
    HTG = 1,
    USD = 2
}

// Current Account models
    public class CurrentAccountInfo
    {
        // Use string for Currency to handle either numeric or string enum values returned by the API
        public string Id { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public string CustomerId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerCode { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string Currency { get; set; } = "0"; // "0" = HTG, "1" = USD or names like "HTG"/"USD"
        public decimal Balance { get; set; }
        public decimal AvailableBalance { get; set; }
        public decimal MinimumBalance { get; set; }
        public DateTime OpeningDate { get; set; }
        public DateTime? LastTransactionDate { get; set; }
        // Status may be returned as string (e.g. "Active") or numeric code; keep as string for robustness
        public string Status { get; set; } = string.Empty;
        public decimal DailyWithdrawalLimit { get; set; }
        public decimal MonthlyWithdrawalLimit { get; set; }
        public decimal DailyDepositLimit { get; set; }
        public decimal OverdraftLimit { get; set; }
        public decimal MaintenanceFee { get; set; }
        public decimal TransactionFee { get; set; }
    }

public class CurrentAccountTransactionRequest
{
    public string AccountNumber { get; set; } = string.Empty;
    public int Type { get; set; } // 0=Deposit, 1=Withdrawal
    public decimal Amount { get; set; }
    public int Currency { get; set; } // 0=HTG, 1=USD
    public string? Description { get; set; }
    public bool? ClientPresent { get; set; }
    public string? VerificationMethod { get; set; }
    public string? Notes { get; set; }
}

    public class CurrentAccountTransactionResponse
    {
        public string Id { get; set; } = string.Empty;
        public string AccountId { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        // Use string types for fields that may be serialized as either numeric codes or textual enum names
        // to make deserialization resilient to API changes that emit enum names instead of numbers.
        public string Type { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "0"; // "0" = HTG, "1" = USD or names like "HTG"/"USD"
        public decimal BalanceBefore { get; set; }
        public decimal BalanceAfter { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public string ProcessedBy { get; set; } = string.Empty;
        public string? ProcessedByName { get; set; }
        public int BranchId { get; set; }
        public string? BranchName { get; set; }
        // Status may also be an enum name (string) from API, store as string
        public string Status { get; set; } = string.Empty;
        public DateTime ProcessedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal? Fees { get; set; }
        public decimal? ExchangeRate { get; set; }
    }

    // Term Savings models (client-side)
    public class TermSavingsAccountInfo
    {
        public string Id { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string Currency { get; set; } = "0"; // "0" = HTG, "1" = USD or names like "HTG"/"USD"
        public decimal Balance { get; set; }
        public decimal AvailableBalance { get; set; }
        public string TermType { get; set; } = string.Empty;
        public DateTime OpeningDate { get; set; }
        public DateTime MaturityDate { get; set; }
    }

    public class TermSavingsTransactionRequest
    {
        public string AccountNumber { get; set; } = string.Empty;
        public SavingsTransactionType Type { get; set; }
        public decimal Amount { get; set; }
        // Use int for currency to allow numeric codes (0=HTG,1=USD) or string names serialized by API
        public int Currency { get; set; }
        public string? Description { get; set; }
        public bool CustomerPresent { get; set; }
        public string VerificationMethod { get; set; } = "Caisse";
        public string? Notes { get; set; }
    }

    public class TermSavingsTransactionResponse
    {
        public string Id { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public SavingsTransactionType Type { get; set; }
        public decimal Amount { get; set; }
        public decimal BalanceAfter { get; set; }
        public string Reference { get; set; } = string.Empty;
    }
