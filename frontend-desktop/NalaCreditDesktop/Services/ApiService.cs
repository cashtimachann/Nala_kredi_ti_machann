using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
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

    public ApiService() : this(new HttpClient())
    {
        // Default constructor for views that directly instantiate the service
    }

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
        // First check environment variable
        var configuredUrl = Environment.GetEnvironmentVariable("NALACREDIT_API_URL");
        if (!string.IsNullOrWhiteSpace(configuredUrl))
        {
            var trimmed = configuredUrl.Trim();
            return trimmed.Contains("/api", StringComparison.OrdinalIgnoreCase)
                ? EnsureTrailingSlash(trimmed)
                : EnsureApiBase(trimmed);
        }

        // Determine environment name for config selection
        var environmentName = (Environment.GetEnvironmentVariable("NALACREDIT_ENV")
            ?? Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
            ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? "Production").Trim();

        // Try environment-specific appsettings first, then default
        var appDirectory = AppDomain.CurrentDomain.BaseDirectory;
        var configCandidates = new[]
        {
            System.IO.Path.Combine(appDirectory, $"appsettings.{environmentName}.json"),
            System.IO.Path.Combine(appDirectory, "appsettings.json")
        };

        foreach (var appsettingsPath in configCandidates)
        {
            try
            {
                if (System.IO.File.Exists(appsettingsPath))
                {
                    var jsonContent = System.IO.File.ReadAllText(appsettingsPath);
                    var jsonDoc = System.Text.Json.JsonDocument.Parse(jsonContent);

                    if (jsonDoc.RootElement.TryGetProperty("ApiSettings", out var apiSettings) &&
                        apiSettings.TryGetProperty("BaseUrl", out var baseUrl))
                    {
                        var url = baseUrl.GetString();
                        if (!string.IsNullOrWhiteSpace(url))
                        {
                            return EnsureTrailingSlash(url);
                        }
                    }
                }
            }
            catch
            {
                // If reading config fails, fall through to next candidate
            }
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

    private static string? GetMimeTypeFromExtension(string? extension)
    {
        if (string.IsNullOrWhiteSpace(extension)) return null;

        return extension.ToLowerInvariant() switch
        {
            ".jpg" => "image/jpeg",
            ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".pdf" => "application/pdf",
            _ => null
        };
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
        try
        {
            System.Diagnostics.Debug.WriteLine($"=== LOGIN ATTEMPT ===");
            System.Diagnostics.Debug.WriteLine($"BaseUrl: {_baseUrl}");
            System.Diagnostics.Debug.WriteLine($"HttpClient.BaseAddress: {_httpClient.BaseAddress}");
            System.Diagnostics.Debug.WriteLine($"Email: {email}");
            
            var request = new LoginRequest { Email = email, Password = password };
            
            var json = JsonConvert.SerializeObject(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            System.Diagnostics.Debug.WriteLine($"Sending POST to: auth/login");
            var response = await _httpClient.PostAsync("auth/login", content);
            var responseBody = await response.Content.ReadAsStringAsync();

            System.Diagnostics.Debug.WriteLine($"Response Status: {response.StatusCode}");
            System.Diagnostics.Debug.WriteLine($"Response Body: {responseBody}");

            if (!response.IsSuccessStatusCode)
            {
                // Log error for debugging
                System.Diagnostics.Debug.WriteLine($"Login failed: {response.StatusCode}");
                System.Diagnostics.Debug.WriteLine($"Response: {responseBody}");
                
                // If backend returns error message, we could parse it
                // For now, just return null to indicate failure
                return null;
            }

            if (string.IsNullOrWhiteSpace(responseBody))
            {
                return null;
            }

            var loginResponse = JsonConvert.DeserializeObject<LoginResponse>(responseBody);
            
            if (loginResponse != null && !string.IsNullOrEmpty(loginResponse.Token))
            {
                SetAuthToken(loginResponse.Token);
                CurrentUser = loginResponse.User;
            }

            return loginResponse;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"=== LOGIN EXCEPTION ===");
            System.Diagnostics.Debug.WriteLine($"Message: {ex.Message}");
            System.Diagnostics.Debug.WriteLine($"Type: {ex.GetType().Name}");
            System.Diagnostics.Debug.WriteLine($"StackTrace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                System.Diagnostics.Debug.WriteLine($"Inner Exception: {ex.InnerException.Message}");
            }
            return null;
        }
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

    // Get a daily report for the current cashier (optional date in yyyy-MM-dd)
    public async Task<ApiResult<DailyReportDto?>> GetDailyReportAsync(DateTime? date = null)
    {
        var endpoint = new StringBuilder("reports/daily");
        if (date.HasValue)
        {
            endpoint.Append("?date=").Append(Uri.EscapeDataString(date.Value.ToString("yyyy-MM-dd")));
        }

        return await GetAsyncResult<DailyReportDto>(endpoint.ToString());
    }

    public async Task<CreditAgentDashboard?> GetCreditAgentDashboardAsync() =>
        await GetAsync<CreditAgentDashboard>("dashboard/credit-agent");

    public async Task<BranchSupervisorDashboard?> GetBranchSupervisorDashboardAsync() =>
        await GetAsync<BranchSupervisorDashboard>("dashboard/branch-supervisor");

    // ========================================
    // BRANCH MANAGER DASHBOARD ENDPOINTS
    // ========================================

    public async Task<BranchManagerStats?> GetBranchManagerStatsAsync() =>
        await GetAsync<BranchManagerStats>("branch/dashboard/stats");

    public async Task<List<PendingValidation>?> GetPendingValidationsAsync() =>
        await GetAsync<List<PendingValidation>>("branch/validations/pending");

    public async Task<List<CashSession>?> GetActiveCashSessionsAsync() =>
        await GetAsync<List<CashSession>>("branch/cash-sessions/active");

    public async Task<List<TeamMember>?> GetTeamPerformanceAsync() =>
        await GetAsync<List<TeamMember>>("branch/team/performance");

    public async Task<List<PendingLoan>?> GetPendingLoansAsync() =>
        await GetAsync<List<PendingLoan>>("branch/loans/pending");

        // NOTE: Client account DTOs (transaction history and item) were previously
        // nested inside the ApiService class which made them unavailable to other
        // files that reference them (they must be referenced as ApiService.T). Move
        // them to top-level types below so other views can reference them directly.

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

    // Manager methods for opening/closing cashier sessions
    public async Task<ApiResult<List<CashierInfo>?>> GetCashiersAsync()
    {
        return await GetAsyncResult<List<CashierInfo>>("users/cashiers");
    }

    public async Task<ApiResult<object?>> OpenCashSessionForCashierAsync(string cashierId, decimal openingBalanceHTG, decimal openingBalanceUSD)
    {
        var payload = new
        {
            CashierId = cashierId,
            OpeningBalanceHTG = openingBalanceHTG,
            OpeningBalanceUSD = openingBalanceUSD
        };

        return await PostAsync<object>("cashsession/open-for-cashier", payload);
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

    // --- Currency Exchange Rates ---
    public class ApiEnvelope<T>
    {
        [JsonProperty("success")] public bool Success { get; set; }
        [JsonProperty("data")] public T? Data { get; set; }
        [JsonProperty("message")] public string? Message { get; set; }
    }

    // --- Microcredit (Recouvrement) ---
    public async Task<List<NalaCreditDesktop.Models.OverdueLoan>> GetOverdueLoansAsync(int daysOverdue = 1)
    {
        try
        {
            var endpoint = $"microcreditloan/overdue?daysOverdue={daysOverdue}";
            var response = await _httpClient.GetAsync(endpoint);
            var raw = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                return new List<NalaCreditDesktop.Models.OverdueLoan>();
            }
            var list = string.IsNullOrWhiteSpace(raw)
                ? new List<NalaCreditDesktop.Models.OverdueLoan>()
                : JsonConvert.DeserializeObject<List<NalaCreditDesktop.Models.OverdueLoan>>(raw) ?? new List<NalaCreditDesktop.Models.OverdueLoan>();
            return list;
        }
        catch
        {
            return new List<NalaCreditDesktop.Models.OverdueLoan>();
        }
    }

    public async Task<NalaCreditDesktop.Models.MicrocreditLoanListResponse?> GetLoansAsync(int page = 1, int pageSize = 100, string? status = null, int? branchId = null, bool? isOverdue = null)
    {
        var qs = new StringBuilder($"microcreditloan?page={page}&pageSize={pageSize}");
        if (!string.IsNullOrWhiteSpace(status)) qs.Append("&status=").Append(Uri.EscapeDataString(status));
        if (branchId.HasValue) qs.Append("&branchId=").Append(branchId.Value);
        if (isOverdue.HasValue && isOverdue.Value) qs.Append("&isOverdue=true");

        try
        {
            var resp = await _httpClient.GetAsync(qs.ToString());
            var raw = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode) return null;
            return string.IsNullOrWhiteSpace(raw)
                ? null
                : JsonConvert.DeserializeObject<NalaCreditDesktop.Models.MicrocreditLoanListResponse>(raw);
        }
        catch
        {
            return null;
        }
    }

    public async Task<NalaCreditDesktop.Models.MicrocreditLoan?> SearchLoanByNumberAsync(string loanNumber)
    {
        if (string.IsNullOrWhiteSpace(loanNumber)) return null;

        // Try first page with a bigger pageSize to reduce round-trips
        var result = await GetLoansAsync(1, 200);
        var match = result?.Loans?.FirstOrDefault(l => string.Equals(l.LoanNumber, loanNumber, StringComparison.OrdinalIgnoreCase));
        return match;
    }

    public async Task<NalaCreditDesktop.Models.LoanSummary?> GetLoanSummaryAsync(Guid loanId)
    {
        try
        {
            var resp = await _httpClient.GetAsync($"microcreditloan/{loanId}/summary");
            var raw = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode) return null;
            if (string.IsNullOrWhiteSpace(raw)) return null;
            var settings = new JsonSerializerSettings
            {
                DateParseHandling = DateParseHandling.DateTime,
                DateTimeZoneHandling = DateTimeZoneHandling.Unspecified
            };
            return JsonConvert.DeserializeObject<NalaCreditDesktop.Models.LoanSummary>(raw, settings);
        }
        catch { return null; }
    }

    public async Task<NalaCreditDesktop.Models.MicrocreditPayment?> RecordPaymentAsync(NalaCreditDesktop.Models.CreateMicrocreditPaymentRequest request)
    {
        if (request == null) return null;
        try
        {
            // Backend expects DateOnly; send ISO date without time for compatibility
            var payload = new
            {
                loanId = request.LoanId,
                amount = request.Amount,
                paymentDate = request.PaymentDate.ToString("yyyy-MM-dd"),
                paymentMethod = (int)request.PaymentMethod,
                reference = request.Reference,
                notes = request.Notes
            };
            var json = JsonConvert.SerializeObject(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var resp = await _httpClient.PostAsync("microcreditpayment", content);
            var raw = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode) return null;
            return string.IsNullOrWhiteSpace(raw) ? null : JsonConvert.DeserializeObject<NalaCreditDesktop.Models.MicrocreditPayment>(raw);
        }
        catch { return null; }
    }

    public async Task<NalaCreditDesktop.Models.MicrocreditPayment?> ConfirmPaymentAsync(Guid paymentId, string? notes = null)
    {
        try
        {
            var payload = new { notes };
            var json = JsonConvert.SerializeObject(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var resp = await _httpClient.PostAsync($"microcreditpayment/{paymentId}/confirm", content);
            var raw = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode)
            {
                var message = ExtractErrorMessage(raw) ?? resp.ReasonPhrase ?? "Erreur inconnue";
                throw new Exception(message);
            }
            return string.IsNullOrWhiteSpace(raw) ? null : JsonConvert.DeserializeObject<NalaCreditDesktop.Models.MicrocreditPayment>(raw);
        }
        catch (Exception)
        {
            throw;
        }
    }

    public async Task<NalaCreditDesktop.Models.PaymentReceipt?> GetPaymentReceiptAsync(Guid paymentId)
    {
        try
        {
            var resp = await _httpClient.GetAsync($"microcreditpayment/{paymentId}/receipt");
            var raw = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode) return null;
            return string.IsNullOrWhiteSpace(raw) ? null : JsonConvert.DeserializeObject<NalaCreditDesktop.Models.PaymentReceipt>(raw);
        }
        catch { return null; }
    }

    public class CurrencyExchangeRateInfo
    {
        [JsonProperty("id")] public Guid Id { get; set; }
        [JsonProperty("buyingRate")] public decimal BuyingRate { get; set; }
        [JsonProperty("sellingRate")] public decimal SellingRate { get; set; }
        [JsonProperty("effectiveDate")] public DateTime EffectiveDate { get; set; }
        [JsonProperty("updatedAt")] public DateTime UpdatedAt { get; set; }
        [JsonProperty("baseCurrencyName")] public string? BaseCurrencyName { get; set; }
        [JsonProperty("targetCurrencyName")] public string? TargetCurrencyName { get; set; }
        [JsonProperty("isActive")] public bool IsActive { get; set; }
        [JsonProperty("notes")] public string? Notes { get; set; }
    }

    // DTOs for Daily Report
    public class DailyTransactionDto
    {
        [JsonProperty("date")] public DateTime Date { get; set; }
        [JsonProperty("type")] public string? Type { get; set; }
        [JsonProperty("reference")] public string? Reference { get; set; }
        [JsonProperty("amount")] public decimal Amount { get; set; }
        [JsonProperty("currency")] public string? Currency { get; set; }
        [JsonProperty("description")] public string? Description { get; set; }
        [JsonProperty("cashier")] public string? Cashier { get; set; }
    }

    public class DailyReportDto
    {
        [JsonProperty("date")] public DateTime Date { get; set; }
        [JsonProperty("cashierName")] public string? CashierName { get; set; }
        [JsonProperty("cashierId")] public string? CashierId { get; set; }

        [JsonProperty("depositsCount")] public int DepositsCount { get; set; }
        [JsonProperty("withdrawalsCount")] public int WithdrawalsCount { get; set; }
        [JsonProperty("changesCount")] public int ChangesCount { get; set; }
        [JsonProperty("consultationsCount")] public int ConsultationsCount { get; set; }

        [JsonProperty("totalDepotsHTG")] public decimal TotalDepotsHTG { get; set; }
        [JsonProperty("totalRetraitsHTG")] public decimal TotalRetraitsHTG { get; set; }
        [JsonProperty("totalChangeHTG")] public decimal TotalChangeHTG { get; set; }

        [JsonProperty("totalDepotsUSD")] public decimal TotalDepotsUSD { get; set; }
        [JsonProperty("totalRetraitsUSD")] public decimal TotalRetraitsUSD { get; set; }
        [JsonProperty("totalChangeUSD")] public decimal TotalChangeUSD { get; set; }

        [JsonProperty("commissionDepots")] public decimal CommissionDepots { get; set; }
        [JsonProperty("commissionRetraits")] public decimal CommissionRetraits { get; set; }
        [JsonProperty("commissionChanges")] public decimal CommissionChanges { get; set; }

        [JsonProperty("transactions")] public List<DailyTransactionDto>? Transactions { get; set; }
    }

    public async Task<CurrencyExchangeRateInfo?> GetCurrentExchangeRateAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync("currency-exchange/rates/current");
            var raw = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var envelope = JsonConvert.DeserializeObject<ApiEnvelope<CurrencyExchangeRateInfo>>(raw);
            if (envelope != null && envelope.Success)
            {
                return envelope.Data;
            }

            // Sometimes the API may return the DTO directly without envelope
            var dto = JsonConvert.DeserializeObject<CurrencyExchangeRateInfo>(raw);
            return dto;
        }
        catch
        {
            return null;
        }
    }

    public class ExchangeCalculationRequest
    {
        [JsonProperty("branchId")] public string? BranchId { get; set; }
        // Send enum name strings ("Purchase" or "Sale") for compatibility
        [JsonProperty("exchangeType")] public string ExchangeType { get; set; } = "Sale";
        [JsonProperty("amount")] public decimal Amount { get; set; }
    }

    public class ExchangeCalculationResult
    {
        [JsonProperty("exchangeType")] public string? ExchangeType { get; set; }
        [JsonProperty("fromCurrency")] public int FromCurrency { get; set; }
        [JsonProperty("fromCurrencyName")] public string? FromCurrencyName { get; set; }
        [JsonProperty("toCurrency")] public int ToCurrency { get; set; }
        [JsonProperty("toCurrencyName")] public string? ToCurrencyName { get; set; }
        [JsonProperty("fromAmount")] public decimal FromAmount { get; set; }
        [JsonProperty("exchangeRate")] public decimal ExchangeRate { get; set; }
        [JsonProperty("toAmount")] public decimal ToAmount { get; set; }
        [JsonProperty("commissionRate")] public decimal CommissionRate { get; set; }
        [JsonProperty("commissionAmount")] public decimal CommissionAmount { get; set; }
        [JsonProperty("netAmount")] public decimal NetAmount { get; set; }
        [JsonProperty("availableBalance")] public decimal AvailableBalance { get; set; }
        [JsonProperty("isValid")] public bool IsValid { get; set; }
        [JsonProperty("errorMessage")] public string? ErrorMessage { get; set; }
    }

    public async Task<ExchangeCalculationResult?> CalculateExchangeAsync(ExchangeCalculationRequest request)
    {
        if (request == null) return null;

        try
        {
            // Ensure branch context is provided when possible
            if ((request.BranchId == null || string.IsNullOrWhiteSpace(request.BranchId)) && CurrentUser?.BranchId != null)
            {
                request.BranchId = CurrentUser.BranchId.Value.ToString();
            }
            var json = JsonConvert.SerializeObject(request);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("currency-exchange/calculate", content);
            var raw = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var envelope = JsonConvert.DeserializeObject<ApiEnvelope<ExchangeCalculationResult>>(raw);
            if (envelope != null && envelope.Success)
            {
                return envelope.Data;
            }

            var dto = JsonConvert.DeserializeObject<ExchangeCalculationResult>(raw);
            return dto;
        }
        catch
        {
            return null;
        }
    }

    // Exchange transaction DTOs and API call
    public class ExchangeTransactionRequest
    {
        [JsonProperty("branchId")] public string? BranchId { get; set; }
        // Send enum name strings ("Purchase" or "Sale") for compatibility
        [JsonProperty("exchangeType")] public string ExchangeType { get; set; } = "Sale";
        [JsonProperty("amount")] public decimal Amount { get; set; }
        [JsonProperty("customerName")] public string CustomerName { get; set; } = string.Empty;
        [JsonProperty("customerDocument")] public string? CustomerDocument { get; set; }
        [JsonProperty("customerPhone")] public string? CustomerPhone { get; set; }
        [JsonProperty("notes")] public string? Notes { get; set; }
    }

    public class ExchangeTransaction
    {
        [JsonProperty("id")] public Guid Id { get; set; }
        [JsonProperty("transactionNumber")] public string? TransactionNumber { get; set; }
        [JsonProperty("processedBy")] public string? ProcessedBy { get; set; }
        [JsonProperty("processedByName")] public string? ProcessedByName { get; set; }
        [JsonProperty("fromCurrencyName")] public string? FromCurrencyName { get; set; }
        [JsonProperty("toCurrencyName")] public string? ToCurrencyName { get; set; }
        [JsonProperty("exchangeTypeName")] public string? ExchangeTypeName { get; set; }
        [JsonProperty("exchangeRate")] public decimal ExchangeRate { get; set; }
        [JsonProperty("fromAmount")] public decimal FromAmount { get; set; }
        [JsonProperty("toAmount")] public decimal ToAmount { get; set; }
        [JsonProperty("commissionAmount")] public decimal CommissionAmount { get; set; }
        [JsonProperty("commissionRate")] public decimal CommissionRate { get; set; }
        [JsonProperty("netAmount")] public decimal NetAmount { get; set; }
        [JsonProperty("customerName")] public string? CustomerName { get; set; }
        [JsonProperty("customerDocument")] public string? CustomerDocument { get; set; }
        [JsonProperty("statusName")] public string? StatusName { get; set; }
        [JsonProperty("transactionDate")] public DateTime TransactionDate { get; set; }
    }

    public async Task<ApiResult<ExchangeTransaction?>> ProcessExchangeTransactionAsync(ExchangeTransactionRequest request)
    {
        if (request == null)
        {
            return ApiResult<ExchangeTransaction?>.Failure("Requête invalide");
        }

        try
        {
            // Ensure branch context is provided when possible
            if ((request.BranchId == null || string.IsNullOrWhiteSpace(request.BranchId)) && CurrentUser?.BranchId != null)
            {
                request.BranchId = CurrentUser.BranchId.Value.ToString();
            }
            // Some API deployments treat non-nullable strings as implicitly required.
            // Provide a safe placeholder when phone is not collected in the desktop UI.
            if (string.IsNullOrWhiteSpace(request.CustomerPhone))
            {
                request.CustomerPhone = "N/A";
            }
            var json = JsonConvert.SerializeObject(request);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("currency-exchange/transactions", content);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                // Try envelope first
                try
                {
                    var envelope = JsonConvert.DeserializeObject<ApiEnvelope<ExchangeTransaction>>(raw);
                    if (envelope != null && envelope.Success)
                    {
                        return ApiResult<ExchangeTransaction?>.Success(envelope.Data);
                    }
                }
                catch { /* fall back below */ }

                // Direct DTO fallback
                var dto = string.IsNullOrWhiteSpace(raw) ? null : JsonConvert.DeserializeObject<ExchangeTransaction>(raw);
                return ApiResult<ExchangeTransaction?>.Success(dto);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<ExchangeTransaction?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<ExchangeTransaction?>.Failure(ex.Message);
        }
    }

    public class ExchangeTransactionSearch
    {
        public string? BranchId { get; set; }
        public string? ExchangeType { get; set; } // optional: "Purchase" or "Sale"
        public int? FromCurrency { get; set; }
        public int? ToCurrency { get; set; }
        public string? Status { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }

    public async Task<List<ExchangeTransaction>> GetExchangeTransactionsAsync(ExchangeTransactionSearch? search = null)
    {
        var qs = new StringBuilder("currency-exchange/transactions");
        var sep = '?';

        void AddParam(string key, string value)
        {
            qs.Append(sep).Append(key).Append('=').Append(Uri.EscapeDataString(value));
            sep = '&';
        }

        search ??= new ExchangeTransactionSearch();

        // Default to current user's branch if present, else let backend try from claims
        if (!string.IsNullOrWhiteSpace(search.BranchId))
        {
            AddParam("branchId", search.BranchId);
        }
        else if (CurrentUser?.BranchId != null)
        {
            AddParam("branchId", CurrentUser.BranchId.Value.ToString());
        }

        if (!string.IsNullOrWhiteSpace(search.ExchangeType)) AddParam("exchangeType", search.ExchangeType);
        if (search.FromCurrency.HasValue) AddParam("fromCurrency", search.FromCurrency.Value.ToString());
        if (search.ToCurrency.HasValue) AddParam("toCurrency", search.ToCurrency.Value.ToString());
        if (!string.IsNullOrWhiteSpace(search.Status)) AddParam("status", search.Status);

        if (search.DateFrom.HasValue)
        {
            var iso = search.DateFrom.Value.ToString("o");
            // Try both param names for compatibility
            AddParam("transactionDateFrom", iso);
            AddParam("startDate", iso);
        }
        if (search.DateTo.HasValue)
        {
            var iso = search.DateTo.Value.ToString("o");
            AddParam("transactionDateTo", iso);
            AddParam("endDate", iso);
        }

        AddParam("page", search.Page.ToString());
        AddParam("pageSize", search.PageSize.ToString());

        try
        {
            var response = await _httpClient.GetAsync(qs.ToString());
            var raw = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                return new List<ExchangeTransaction>();
            }

            // Try envelope first
            try
            {
                var env = JsonConvert.DeserializeObject<ApiEnvelope<List<ExchangeTransaction>>>(raw);
                if (env != null && env.Success && env.Data != null)
                {
                    return env.Data;
                }
            }
            catch { }

            var list = JsonConvert.DeserializeObject<List<ExchangeTransaction>>(raw) ?? new List<ExchangeTransaction>();
            return list;
        }
        catch
        {
            return new List<ExchangeTransaction>();
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

    // Client account helpers (unified for savings/current/term)
    public async Task<ApiResult<ClientAccountResponse?>> GetClientAccountByNumberAsync(string accountNumber)
    {
        if (string.IsNullOrWhiteSpace(accountNumber))
            return ApiResult<ClientAccountResponse?>.Failure("Numéro de compte requis");

        try
        {
            var response = await _httpClient.GetAsync($"clientaccount/by-number/{Uri.EscapeDataString(accountNumber)}");
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var dto = string.IsNullOrWhiteSpace(raw) ? null : JsonConvert.DeserializeObject<ClientAccountResponse>(raw);
                return ApiResult<ClientAccountResponse?>.Success(dto);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<ClientAccountResponse?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<ClientAccountResponse?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<ClientAccountTransactionHistory?>> GetClientAccountTransactionsAsync(string accountNumber, DateTime? startDate = null, DateTime? endDate = null, int page = 1, int pageSize = 20)
    {
        if (string.IsNullOrWhiteSpace(accountNumber))
            return ApiResult<ClientAccountTransactionHistory?>.Failure("Numéro de compte requis");

        var query = new StringBuilder($"clientaccount/{Uri.EscapeDataString(accountNumber)}/transactions?page={page}&pageSize={pageSize}");
        if (startDate.HasValue) query.Append("&dateFrom=").Append(Uri.EscapeDataString(startDate.Value.ToString("o")));
        if (endDate.HasValue) query.Append("&dateTo=").Append(Uri.EscapeDataString(endDate.Value.ToString("o")));

        try
        {
            var response = await _httpClient.GetAsync(query.ToString());
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                ClientAccountTransactionHistory? dto = null;

                if (!string.IsNullOrWhiteSpace(raw))
                {
                    // Preferred: structured history object
                    try
                    {
                        dto = JsonConvert.DeserializeObject<ClientAccountTransactionHistory>(raw);
                    }
                    catch
                    {
                        // Ignore and try fallback
                    }

                    // Fallback: some endpoints return a bare array of transactions
                    if (dto == null && raw.TrimStart().StartsWith("["))
                    {
                        try
                        {
                            var items = JsonConvert.DeserializeObject<List<ClientAccountTransactionItem>>(raw) ?? new List<ClientAccountTransactionItem>();
                            dto = new ClientAccountTransactionHistory
                            {
                                Transactions = items,
                                TotalCount = items.Count,
                                TransactionCount = items.Count,
                                Page = page,
                                PageSize = pageSize,
                                TotalPages = (int)Math.Ceiling(items.Count / (double)pageSize)
                            };
                        }
                        catch
                        {
                            // leave dto null
                        }
                    }
                }

                return ApiResult<ClientAccountTransactionHistory?>.Success(dto);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<ClientAccountTransactionHistory?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<ClientAccountTransactionHistory?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<ClientAccountSearchResponse?>> SearchClientAccountsAsync(string queryText, int maxResults = 50)
    {
        if (string.IsNullOrWhiteSpace(queryText))
            return ApiResult<ClientAccountSearchResponse?>.Failure("Terme de recherche requis");

        try
        {
            var response = await _httpClient.GetAsync($"clientaccount/search?query={Uri.EscapeDataString(queryText)}&maxResults={maxResults}");
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var dto = string.IsNullOrWhiteSpace(raw) ? null : JsonConvert.DeserializeObject<ClientAccountSearchResponse>(raw);
                return ApiResult<ClientAccountSearchResponse?>.Success(dto);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<ClientAccountSearchResponse?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<ClientAccountSearchResponse?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<List<ClientAccountResponse>>> GetClientAccountsByCustomerIdAsync(string customerId, int maxResults = 50)
    {
        if (string.IsNullOrWhiteSpace(customerId))
        {
            return ApiResult<List<ClientAccountResponse>>.Failure("Identifiant client requis");
        }

        var searchResult = await SearchClientAccountsAsync(customerId, maxResults);
        if (!searchResult.IsSuccess)
        {
            return ApiResult<List<ClientAccountResponse>>.Failure(searchResult.ErrorMessage ?? "Impossible de vérifier les comptes client");
        }

        var accounts = searchResult.Data?.Results
            .Where(acc => string.Equals(acc.CustomerId, customerId, StringComparison.OrdinalIgnoreCase))
            .ToList() ?? new List<ClientAccountResponse>();

        return ApiResult<List<ClientAccountResponse>>.Success(accounts);
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

    public async Task<ApiResult<T?>> PostAsync<T>(string endpoint, object? data) where T : class
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
                var errorRaw = await response.Content.ReadAsStringAsync();
                var message = ExtractErrorMessage(errorRaw) ?? response.ReasonPhrase ?? "Erreur inconnue";
                return ApiResult<T?>.Failure(message);
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            var resultData = string.IsNullOrWhiteSpace(responseJson)
                ? default(T)
                : JsonConvert.DeserializeObject<T>(responseJson);
            
            return ApiResult<T?>.Success(resultData);
        }
        catch (Exception ex)
        {
            return ApiResult<T?>.Failure(ex.Message);
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
            // Try to parse standard envelopes and ValidationProblemDetails
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

            // ASP.NET Core ValidationProblemDetails: { title, status, errors: { field: [messages] } }
            if (parsed.TryGetValue("errors", out var errorsObj) && errorsObj != null)
            {
                try
                {
                    var errorsJson = errorsObj.ToString();
                    if (!string.IsNullOrWhiteSpace(errorsJson))
                    {
                        var errors = JsonConvert.DeserializeObject<Dictionary<string, string[]>>(errorsJson!);
                        if (errors != null && errors.Count > 0)
                        {
                            var first = errors.First();
                            var details = (first.Value != null && first.Value.Length > 0)
                                ? string.Join("; ", first.Value)
                                : first.Key;

                            // Prefer detailed error, otherwise fall back to title
                            if (parsed.TryGetValue("title", out var titleVal) && titleVal != null)
                            {
                                return string.IsNullOrWhiteSpace(details)
                                    ? titleVal.ToString()
                                    : details;
                            }

                            return details;
                        }
                    }
                }
                catch
                {
                    // Ignore parsing errors and continue to other fallbacks
                }
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

    // Secretary Dashboard API methods
    public async Task<ApiResult<SavingsCustomerResponseDto?>> CreateSavingsCustomerAsync(SavingsCustomerCreateDto dto)
    {
        if (dto == null)
        {
            return ApiResult<SavingsCustomerResponseDto?>.Failure("Données client invalides");
        }

        try
        {
            var json = JsonConvert.SerializeObject(dto);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("SavingsCustomer", content);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var customer = string.IsNullOrWhiteSpace(raw)
                    ? null
                    : JsonConvert.DeserializeObject<SavingsCustomerResponseDto>(raw);

                return ApiResult<SavingsCustomerResponseDto?>.Success(customer);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<SavingsCustomerResponseDto?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<SavingsCustomerResponseDto?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<SavingsCustomerDocumentResponseDto?>> UploadSavingsCustomerDocumentAsync(
        string customerId,
        SavingsCustomerDocumentType documentType,
        string name,
        string? description,
        string filePath)
    {
        if (string.IsNullOrWhiteSpace(customerId))
            return ApiResult<SavingsCustomerDocumentResponseDto?>.Failure("Identifiant client requis");
        if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
            return ApiResult<SavingsCustomerDocumentResponseDto?>.Failure("Fichier introuvable");

        try
        {
            using var fileStream = File.OpenRead(filePath);
            using var content = new MultipartFormDataContent();

            content.Add(new StringContent(((int)documentType).ToString()), "DocumentType");
            content.Add(new StringContent(string.IsNullOrWhiteSpace(name) ? "Document" : name), "Name");
            if (!string.IsNullOrWhiteSpace(description))
            {
                content.Add(new StringContent(description), "Description");
            }

            var fileContent = new StreamContent(fileStream);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue(GetMimeTypeFromExtension(Path.GetExtension(filePath)) ?? "application/octet-stream");
            content.Add(fileContent, "File", Path.GetFileName(filePath));

            var endpoint = $"SavingsCustomer/{Uri.EscapeDataString(customerId)}/documents";
            var response = await _httpClient.PostAsync(endpoint, content);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var document = string.IsNullOrWhiteSpace(raw)
                    ? null
                    : JsonConvert.DeserializeObject<SavingsCustomerDocumentResponseDto>(raw);

                return ApiResult<SavingsCustomerDocumentResponseDto?>.Success(document);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<SavingsCustomerDocumentResponseDto?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<SavingsCustomerDocumentResponseDto?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult> UploadSavingsCustomerSignatureAsync(string customerId, string signatureData)
    {
        if (string.IsNullOrWhiteSpace(customerId))
            return ApiResult.Failure("Identifiant client requis");
        if (string.IsNullOrWhiteSpace(signatureData))
            return ApiResult.Failure("Signature manquante");

        try
        {
            var payload = new SavingsCustomerSignatureDto { SignatureData = signatureData };
            var json = JsonConvert.SerializeObject(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            var endpoint = $"SavingsCustomer/{Uri.EscapeDataString(customerId)}/signature";
            var response = await _httpClient.PostAsync(endpoint, content);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                return ApiResult.Success();
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<SavingsCustomerResponseDto?>> GetSavingsCustomerByIdAsync(string customerId)
    {
        if (string.IsNullOrWhiteSpace(customerId))
            return ApiResult<SavingsCustomerResponseDto?>.Failure("Identifiant client requis");

        try
        {
            var response = await _httpClient.GetAsync($"SavingsCustomer/{Uri.EscapeDataString(customerId)}");
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var customer = string.IsNullOrWhiteSpace(raw)
                    ? null
                    : JsonConvert.DeserializeObject<SavingsCustomerResponseDto>(raw);

                return ApiResult<SavingsCustomerResponseDto?>.Success(customer);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<SavingsCustomerResponseDto?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<SavingsCustomerResponseDto?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<SavingsCustomerResponseDto?>> UpdateSavingsCustomerAsync(string customerId, SavingsCustomerUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(customerId))
            return ApiResult<SavingsCustomerResponseDto?>.Failure("Identifiant client requis");

        try
        {
            var json = JsonConvert.SerializeObject(dto);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PutAsync($"SavingsCustomer/{Uri.EscapeDataString(customerId)}", content);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var customer = string.IsNullOrWhiteSpace(raw)
                    ? null
                    : JsonConvert.DeserializeObject<SavingsCustomerResponseDto>(raw);

                return ApiResult<SavingsCustomerResponseDto?>.Success(customer);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<SavingsCustomerResponseDto?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<SavingsCustomerResponseDto?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<List<SavingsCustomerResponseDto>?>> SearchSavingsCustomersAsync(string searchTerm)
    {
        if (string.IsNullOrWhiteSpace(searchTerm) || searchTerm.Length < 2)
            return ApiResult<List<SavingsCustomerResponseDto>?>.Failure("Terme de recherche trop court");

        try
        {
            var response = await _httpClient.GetAsync($"SavingsCustomer/search?searchTerm={Uri.EscapeDataString(searchTerm)}");
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var customers = string.IsNullOrWhiteSpace(raw)
                    ? new List<SavingsCustomerResponseDto>()
                    : JsonConvert.DeserializeObject<List<SavingsCustomerResponseDto>>(raw) ?? new List<SavingsCustomerResponseDto>();

                return ApiResult<List<SavingsCustomerResponseDto>?>.Success(customers);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<List<SavingsCustomerResponseDto>?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<List<SavingsCustomerResponseDto>?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<List<SavingsCustomerResponseDto>?>> GetSavingsCustomersAsync(int page = 1, int pageSize = 200)
    {
        if (page < 1) page = 1;
        if (pageSize <= 0 || pageSize > 500) pageSize = 200;

        try
        {
            var response = await _httpClient.GetAsync($"SavingsCustomer?page={page}&pageSize={pageSize}");
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var customers = string.IsNullOrWhiteSpace(raw)
                    ? new List<SavingsCustomerResponseDto>()
                    : JsonConvert.DeserializeObject<List<SavingsCustomerResponseDto>>(raw) ?? new List<SavingsCustomerResponseDto>();

                return ApiResult<List<SavingsCustomerResponseDto>?>.Success(customers);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<List<SavingsCustomerResponseDto>?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<List<SavingsCustomerResponseDto>?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<SavingsAccountResponseDto?>> OpenSavingsAccountAsync(SavingsAccountOpeningDto dto)
    {
        if (dto == null)
        {
            return ApiResult<SavingsAccountResponseDto?>.Failure("Données compte invalides");
        }

        try
        {
            var json = JsonConvert.SerializeObject(dto);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("SavingsAccount/open", content);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var account = string.IsNullOrWhiteSpace(raw)
                    ? null
                    : JsonConvert.DeserializeObject<SavingsAccountResponseDto>(raw);

                return ApiResult<SavingsAccountResponseDto?>.Success(account);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<SavingsAccountResponseDto?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<SavingsAccountResponseDto?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<SavingsTransactionListResponseDto?>> GetSavingsTransactionsAsync(
        string? accountId = null,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        int page = 1,
        int pageSize = 100)
    {
        try
        {
            var queryParams = new List<string>
            {
                $"page={page}",
                $"pageSize={pageSize}",
                "sortBy=ProcessedAt",
                "sortDirection=desc"
            };

            if (!string.IsNullOrWhiteSpace(accountId))
                queryParams.Add($"accountId={Uri.EscapeDataString(accountId)}");

            if (dateFrom.HasValue)
                queryParams.Add($"dateFrom={Uri.EscapeDataString(dateFrom.Value.ToString("yyyy-MM-dd"))}");

            if (dateTo.HasValue)
                queryParams.Add($"dateTo={Uri.EscapeDataString(dateTo.Value.AddDays(1).ToString("yyyy-MM-dd"))}");

            var query = string.Join("&", queryParams);
            var response = await _httpClient.GetAsync($"SavingsTransaction?{query}");
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var result = string.IsNullOrWhiteSpace(raw)
                    ? null
                    : JsonConvert.DeserializeObject<SavingsTransactionListResponseDto>(raw);
                return ApiResult<SavingsTransactionListResponseDto?>.Success(result);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<SavingsTransactionListResponseDto?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<SavingsTransactionListResponseDto?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<string>> CreateMicrocreditLoanApplicationAsync(CreateMicrocreditLoanApplicationDto dto)
    {
        if (dto == null)
        {
            return ApiResult<string>.Failure("Données demande crédit invalides");
        }

        try
        {
            var json = JsonConvert.SerializeObject(dto);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("MicrocreditLoanApplication", content);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                // Parse response to get application ID
                var result = JsonConvert.DeserializeObject<dynamic>(raw);
                var applicationId = result?.id?.ToString();
                return ApiResult<string>.Success(applicationId ?? "");
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<string>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<string>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<string>> UploadMicrocreditDocumentAsync(string applicationId, string filePath, string documentType, string? description = null)
    {
        if (string.IsNullOrWhiteSpace(applicationId) || string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
        {
            return ApiResult<string>.Failure("Paramètres invalides ou fichier inexistant");
        }

        try
        {
            using var form = new MultipartFormDataContent();
            
            // Read file and add to form
            var fileBytes = await File.ReadAllBytesAsync(filePath);
            var fileName = Path.GetFileName(filePath);
            var fileContent = new ByteArrayContent(fileBytes);
            
            // Set content type based on file extension
            var extension = Path.GetExtension(filePath).ToLower();
            var contentType = extension switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".pdf" => "application/pdf",
                _ => "application/octet-stream"
            };
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
            form.Add(fileContent, "file", fileName);
            
            // Add document type
            form.Add(new StringContent(documentType), "documentType");
            
            // Add optional description
            if (!string.IsNullOrWhiteSpace(description))
            {
                form.Add(new StringContent(description), "description");
            }

            var response = await _httpClient.PostAsync($"MicrocreditLoanApplication/{applicationId}/documents", form);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                return ApiResult<string>.Success("Document uploadé avec succès");
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur upload document";
            return ApiResult<string>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<string>.Failure($"Erreur upload: {ex.Message}");
        }
    }

    public async Task<ApiResult<MicrocreditApplicationListResponseDto?>> GetMicrocreditApplicationsAsync(
        int page = 1, 
        int pageSize = 20, 
        string? status = null, 
        string? loanType = null, 
        int? branchId = null)
    {
        try
        {
            var queryParams = new List<string>
            {
                $"page={page}",
                $"pageSize={pageSize}"
            };

            if (!string.IsNullOrEmpty(status))
                queryParams.Add($"status={status}");

            if (!string.IsNullOrEmpty(loanType))
                queryParams.Add($"loanType={loanType}");

            if (branchId.HasValue)
                queryParams.Add($"branchId={branchId.Value}");

            var queryString = string.Join("&", queryParams);
            var url = $"MicrocreditLoanApplication?{queryString}";

            var response = await _httpClient.GetAsync(url);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var result = JsonConvert.DeserializeObject<MicrocreditApplicationListResponseDto>(raw);
                return ApiResult<MicrocreditApplicationListResponseDto?>.Success(result);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur récupération demandes crédit";
            return ApiResult<MicrocreditApplicationListResponseDto?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<MicrocreditApplicationListResponseDto?>.Failure($"Erreur: {ex.Message}");
        }
    }

    public async Task<ApiResult<MicrocreditLoanApplicationDto?>> GetMicrocreditApplicationAsync(Guid applicationId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"MicrocreditLoanApplication/{applicationId}");
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var result = JsonConvert.DeserializeObject<MicrocreditLoanApplicationDto>(raw);
                return ApiResult<MicrocreditLoanApplicationDto?>.Success(result);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur récupération demande crédit";
            return ApiResult<MicrocreditLoanApplicationDto?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<MicrocreditLoanApplicationDto?>.Failure($"Erreur: {ex.Message}");
        }
    }

    public async Task<ApiResult<MicrocreditLoanApplicationDto?>> ApproveMicrocreditApplicationAsync(Guid applicationId, ApproveMicrocreditApplicationDto approvalData)
    {
        try
        {
            var json = JsonConvert.SerializeObject(approvalData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PostAsync(
                $"microcredit/applications/{applicationId}/approve",
                content);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                var application = JsonConvert.DeserializeObject<MicrocreditLoanApplicationDto>(responseContent);
                return ApiResult<MicrocreditLoanApplicationDto?>.Success(application);
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                return ApiResult<MicrocreditLoanApplicationDto?>.Failure($"Erreur HTTP {response.StatusCode}: {error}");
            }
        }
        catch (Exception ex)
        {
            return ApiResult<MicrocreditLoanApplicationDto?>.Failure($"Erreur lors de l'approbation: {ex.Message}");
        }
    }

    public async Task<ApiResult<MicrocreditLoanApplicationDto?>> RejectMicrocreditApplicationAsync(Guid applicationId, RejectMicrocreditApplicationDto rejectionData)
    {
        try
        {
            var json = JsonConvert.SerializeObject(rejectionData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PostAsync(
                $"microcredit/applications/{applicationId}/reject",
                content);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                var application = JsonConvert.DeserializeObject<MicrocreditLoanApplicationDto>(responseContent);
                return ApiResult<MicrocreditLoanApplicationDto?>.Success(application);
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                return ApiResult<MicrocreditLoanApplicationDto?>.Failure($"Erreur HTTP {response.StatusCode}: {error}");
            }
        }
        catch (Exception ex)
        {
            return ApiResult<MicrocreditLoanApplicationDto?>.Failure($"Erreur lors du rejet: {ex.Message}");
        }
    }

    // --- Secretary dashboard helpers --------------------------------------
    public async Task<ApiResult<SavingsAccountStatisticsDto?>> GetSavingsAccountStatisticsAsync() =>
        await GetAsyncResult<SavingsAccountStatisticsDto>("SavingsAccount/statistics");

    public async Task<ApiResult<MicrocreditDashboardStatsDto?>> GetMicrocreditDashboardStatsAsync() =>
        await GetAsyncResult<MicrocreditDashboardStatsDto>("microcreditdashboard/stats");

    public async Task<ApiResult<DailyBranchReportDto?>> GetMyBranchDailyReportAsync() =>
        await GetAsyncResult<DailyBranchReportDto>("reports/my-branch/daily");

    public async Task<ApiResult<ClientAccountListResponse?>> GetClientAccountsAsync(ClientAccountFilter? filter = null)
    {
        var queryString = "clientaccount";
        if (filter != null)
        {
            var parameters = new List<string>();

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                parameters.Add($"accountNumber={Uri.EscapeDataString(filter.Search)}");
                parameters.Add($"customerName={Uri.EscapeDataString(filter.Search)}");
            }

            if (!string.IsNullOrWhiteSpace(filter.Status))
                parameters.Add($"status={Uri.EscapeDataString(filter.Status)}");

            if (filter.BranchId.HasValue)
                parameters.Add($"branchId={filter.BranchId.Value}");

            if (filter.AccountType.HasValue)
                parameters.Add($"accountType={(int)filter.AccountType.Value}");

            if (filter.Currency.HasValue)
                parameters.Add($"currency={(int)filter.Currency.Value}");

            if (filter.Page > 0) parameters.Add($"page={filter.Page}");
            if (filter.PageSize > 0) parameters.Add($"pageSize={filter.PageSize}");

            if (!string.IsNullOrWhiteSpace(filter.SortBy))
                parameters.Add($"sortBy={Uri.EscapeDataString(filter.SortBy)}");

            if (!string.IsNullOrWhiteSpace(filter.SortDirection))
                parameters.Add($"sortDirection={Uri.EscapeDataString(filter.SortDirection)}");

            if (parameters.Any())
            {
                queryString += "?" + string.Join("&", parameters);
            }
        }

        return await GetAsyncResult<ClientAccountListResponse>(queryString);
    }

    public async Task<ApiResult<SavingsAccountListResponseDto?>> GetSavingsAccountsAsync(SavingsAccountFilterDto? filter = null)
    {
        var queryString = "SavingsAccount";
        if (filter != null)
        {
            var parameters = new List<string>();
            if (!string.IsNullOrWhiteSpace(filter.Search)) parameters.Add($"search={Uri.EscapeDataString(filter.Search)}");
            if (filter.Currency.HasValue) parameters.Add($"currency={(int)filter.Currency.Value}");
            if (filter.Status.HasValue) parameters.Add($"status={(int)filter.Status.Value}");
            if (filter.BranchId.HasValue) parameters.Add($"branchId={filter.BranchId.Value}");
            if (filter.DateFrom.HasValue) parameters.Add($"dateFrom={filter.DateFrom.Value:yyyy-MM-dd}");
            if (filter.DateTo.HasValue) parameters.Add($"dateTo={filter.DateTo.Value:yyyy-MM-dd}");
            if (filter.MinBalance.HasValue) parameters.Add($"minBalance={filter.MinBalance.Value}");
            if (filter.MaxBalance.HasValue) parameters.Add($"maxBalance={filter.MaxBalance.Value}");
            parameters.Add($"page={filter.Page}");
            parameters.Add($"pageSize={filter.PageSize}");
            if (!string.IsNullOrWhiteSpace(filter.SortBy)) parameters.Add($"sortBy={Uri.EscapeDataString(filter.SortBy)}");
            if (!string.IsNullOrWhiteSpace(filter.SortDirection)) parameters.Add($"sortDirection={Uri.EscapeDataString(filter.SortDirection)}");

            if (parameters.Any())
            {
                queryString += "?" + string.Join("&", parameters);
            }
        }

        return await GetAsyncResult<SavingsAccountListResponseDto>(queryString);
    }

    public async Task<ApiResult<TermSavingsAccountResponseDto?>> OpenTermSavingsAccountAsync(TermSavingsAccountOpeningDto dto)
    {
        if (dto == null)
        {
            return ApiResult<TermSavingsAccountResponseDto?>.Failure("Données compte épargne à terme invalides");
        }

        try
        {
            var json = JsonConvert.SerializeObject(dto);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("TermSavingsAccount/open", content);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var account = string.IsNullOrWhiteSpace(raw)
                    ? null
                    : JsonConvert.DeserializeObject<TermSavingsAccountResponseDto>(raw);

                return ApiResult<TermSavingsAccountResponseDto?>.Success(account);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<TermSavingsAccountResponseDto?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<TermSavingsAccountResponseDto?>.Failure(ex.Message);
        }
    }
}

public class ClientAccountSearchResponse
{
    public List<ClientAccountResponse> Results { get; set; } = new();
    public int TotalCount { get; set; }
    public string Query { get; set; } = string.Empty;
    public TimeSpan SearchTime { get; set; }
}

public class ClientAccountResponse
{
    public string Id { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty; // server uses enum-as-string
    public string CustomerId { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty; // server sends "HTG" or "USD"
    public decimal Balance { get; set; }
    public decimal AvailableBalance { get; set; }
    public DateTime OpeningDate { get; set; }
    public DateTime? LastTransactionDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public string? ClosedBy { get; set; }
    public string? ClosureReason { get; set; }

    // Optional / type-specific
    public decimal? MinimumBalance { get; set; }
    public decimal? DailyWithdrawalLimit { get; set; }
    public decimal? MonthlyWithdrawalLimit { get; set; }
    public decimal? DailyDepositLimit { get; set; }
    public decimal? InterestRate { get; set; }
    public DateTime? MaturityDate { get; set; }
    public string? TermType { get; set; }
}

public class ClientAccountFilter
{
    public string? Search { get; set; }
    public string? Status { get; set; }
    public int? BranchId { get; set; }
    public ClientAccountType? AccountType { get; set; }
    public ClientCurrency? Currency { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 200;
    public string? SortBy { get; set; } = "AccountNumber";
    public string? SortDirection { get; set; } = "asc";
}

public class ClientAccountSummary
{
    public string Id { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public string CustomerId { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime OpeningDate { get; set; }
    public DateTime? LastTransactionDate { get; set; }
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
}

public class ClientAccountListResponse
{
    public List<ClientAccountSummary> Accounts { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public ClientAccountStatistics? Statistics { get; set; }
}

public class ClientAccountStatistics
{
    public int TotalAccounts { get; set; }
    public int ActiveAccounts { get; set; }
    public decimal TotalBalanceHTG { get; set; }
    public decimal TotalBalanceUSD { get; set; }
    public decimal AverageBalance { get; set; }
    public Dictionary<string, int> AccountsByType { get; set; } = new();
    public Dictionary<string, int> AccountsByStatus { get; set; } = new();
    public Dictionary<string, int> AccountsByCurrency { get; set; } = new();
    public int NewAccountsThisMonth { get; set; }
    public int DormantAccounts { get; set; }
}

public enum ClientAccountType
{
    Savings = 0,
    Current = 1,
    TermSavings = 2
}

public enum ClientAccountStatus
{
    Active = 0,
    Inactive = 1,
    Closed = 2,
    Suspended = 3,
    Locked = 4,
    PendingApproval = 5
}

public enum ClientCurrency
{
    HTG = 0,
    USD = 1
}

public class ClientAccountTransactionHistory
{
    public List<ClientAccountTransactionItem> Transactions { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public decimal TotalCredits { get; set; }
    public decimal TotalDebits { get; set; }
    public int TransactionCount { get; set; }
}

public class ClientAccountTransactionItem
{
    public string Id { get; set; } = string.Empty;
    public string AccountId { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public string? Type { get; set; }
    public decimal Amount { get; set; }
    public string? Currency { get; set; }
    public decimal BalanceBefore { get; set; }
    public decimal BalanceAfter { get; set; }
    public string? Description { get; set; }
    public string? Reference { get; set; }
    public string? ProcessedBy { get; set; }
    public string? ProcessedByName { get; set; }
    public DateTime ProcessedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SavingsAccountStatisticsDto
{
    public int TotalAccounts { get; set; }
    public int ActiveAccounts { get; set; }
    public decimal TotalBalanceHTG { get; set; }
    public decimal TotalBalanceUSD { get; set; }
    public decimal AverageBalance { get; set; }
    public Dictionary<string, int> AccountsByStatus { get; set; } = new();
    public Dictionary<string, int> AccountsByCurrency { get; set; } = new();
    public int NewAccountsThisMonth { get; set; }
    public int DormantAccounts { get; set; }
}

public class DailyBranchReportDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public DateTime ReportDate { get; set; }
    public decimal TotalDepositsHTG { get; set; }
    public decimal TotalWithdrawalsHTG { get; set; }
    public CashBalanceDto CashBalance { get; set; } = new();
    public int TotalTransactions { get; set; }
}

public class CashBalanceDto
{
    public decimal OpeningBalanceHTG { get; set; }
    public decimal ClosingBalanceHTG { get; set; }
    public decimal NetChangeHTG { get; set; }
}

public class MicrocreditDashboardStatsDto
{
    public int TotalClients { get; set; }
    public int ActiveLoans { get; set; }
    public CurrencyAmountDto TotalOutstanding { get; set; } = new();
    public CurrencyAmountDto TotalDisbursed { get; set; } = new();
    public decimal RepaymentRate { get; set; }
    public OverdueStatsDto OverdueLoans { get; set; } = new();
    public CurrencyAmountDto InterestRevenue { get; set; } = new();
    public int LoansCompletedThisMonth { get; set; }
    public int NewLoansThisMonth { get; set; }
    public List<BranchPerformanceSummaryDto> BranchPerformance { get; set; } = new();
    public DateTime GeneratedAt { get; set; }
}

public class CurrencyAmountDto
{
    public decimal HTG { get; set; }
    public decimal USD { get; set; }
}

public class OverdueStatsDto
{
    public int Count { get; set; }
    public CurrencyAmountDto Amount { get; set; } = new();
}

public class BranchPerformanceSummaryDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public int TotalLoans { get; set; }
    public CurrencyAmountDto TotalDisbursed { get; set; } = new();
    public CurrencyAmountDto TotalOutstanding { get; set; } = new();
    public decimal RepaymentRate { get; set; }
    public decimal Par30 { get; set; }
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
    public string? BranchName { get; set; }
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
    public int CreditPaymentsCount { get; set; }
    public decimal CreditPaymentsAmountHTG { get; set; }
    public decimal CreditPaymentsAmountUSD { get; set; }
    public DateTime? LastTransactionTime { get; set; }
    public List<CashierTransaction> RecentTransactions { get; set; } = new();
    public List<CreditPaymentHistory> CreditPaymentHistory { get; set; } = new();
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

public class CreditPaymentHistory
{
    public string PaymentNumber { get; set; } = string.Empty;
    public string ReceiptNumber { get; set; } = string.Empty;
    public string LoanNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal PrincipalAmount { get; set; }
    public decimal InterestAmount { get; set; }
    public decimal PenaltyAmount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
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

// BranchSupervisorDashboard is now defined in Models/BranchManagerModels.cs

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

    // Cashier Info for Manager
    public class CashierInfo
    {
        public string Id { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool HasActiveSession { get; set; }
        public string DisplayName => $"{FirstName} {LastName}{(HasActiveSession ? " (Session active)" : "")}";
    }

    // Secretary Dashboard API methods
    /*
    public async Task<ApiResult<SavingsCustomerResponseDto?>> CreateSavingsCustomerAsync(SavingsCustomerCreateDto dto)
    {
        if (dto == null)
        {
            return ApiResult<SavingsCustomerResponseDto?>.Failure("Données client invalides");
        }

        try
        {
            var json = JsonConvert.SerializeObject(dto);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("SavingsCustomer", content);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var customer = string.IsNullOrWhiteSpace(raw)
                    ? null
                    : JsonConvert.DeserializeObject<SavingsCustomerResponseDto>(raw);

                return ApiResult<SavingsCustomerResponseDto?>.Success(customer);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<SavingsCustomerResponseDto?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<SavingsCustomerResponseDto?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<SavingsAccountResponseDto?>> OpenSavingsAccountAsync(SavingsAccountOpeningDto dto)
    {
        if (dto == null)
        {
            return ApiResult<SavingsAccountResponseDto?>.Failure("Données compte invalides");
        }

        try
        {
            var json = JsonConvert.SerializeObject(dto);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("SavingsAccount/open", content);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var account = string.IsNullOrWhiteSpace(raw)
                    ? null
                    : JsonConvert.DeserializeObject<SavingsAccountResponseDto>(raw);

                return ApiResult<SavingsAccountResponseDto?>.Success(account);
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<SavingsAccountResponseDto?>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<SavingsAccountResponseDto?>.Failure(ex.Message);
        }
    }

    public async Task<ApiResult<string>> CreateMicrocreditLoanApplicationAsync(CreateMicrocreditLoanApplicationDto dto)
    {
        if (dto == null)
        {
            return ApiResult<string>.Failure("Données demande crédit invalides");
        }

        try
        {
            var json = JsonConvert.SerializeObject(dto);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("MicrocreditLoanApplication", content);
            var raw = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                // The response might be a MicrocreditLoanApplicationDto, but for now return success
                return ApiResult<string>.Success("Demande crédit créée avec succès");
            }

            var message = ExtractErrorMessage(raw) ?? response.ReasonPhrase ?? "Erreur inconnue";
            return ApiResult<string>.Failure(message);
        }
        catch (Exception ex)
        {
            return ApiResult<string>.Failure(ex.Message);
        }
    }
    */
