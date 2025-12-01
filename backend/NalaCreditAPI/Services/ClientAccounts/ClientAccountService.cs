using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs.ClientAccounts;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services.Savings;

namespace NalaCreditAPI.Services.ClientAccounts
{
    public interface IClientAccountService
    {
        Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountListResponseDto> GetAccountsAsync(NalaCreditAPI.DTOs.ClientAccounts.ClientAccountFilterDto filter);
        Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary?> GetAccountAsync(string id);
        Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary?> GetAccountByNumberAsync(string accountNumber);
        Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountStatistics> GetStatisticsAsync();
        Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary> CreateAccountAsync(NalaCreditAPI.DTOs.ClientAccounts.ClientAccountCreationDto dto, string userId);
        Task<bool> CloseAccountAsync(string accountId, string reason, string userId);
        Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountBalanceDto> GetBalanceAsync(string accountNumber);
        Task<List<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountTransactionResponseDto>> GetAccountTransactionsAsync(string accountId, int page = 1, int pageSize = 20);
        Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary> UpdateAccountAsync(string id, NalaCreditAPI.DTOs.ClientAccounts.ClientAccountUpdateDto dto, string userId);
        Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountResponseDto> UpdateAccountStatusAsync(string id, bool isActive, string userId);
        Task<List<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountTransactionResponseDto>> GetTransactionHistoryAsync(string accountId, DateTime? fromDate = null, DateTime? toDate = null, int page = 1, int pageSize = 20);
        Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountStatistics> GetStatisticsByTypeAsync(ClientAccountType accountType);
        Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountStatistics> GetStatisticsByCurrencyAsync(ClientCurrency currency);
        Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountListResponseDto> SearchAccountsAsync(string searchTerm, int page = 1, int pageSize = 10);
    }

    public class ClientAccountService : IClientAccountService
    {
    private readonly ApplicationDbContext _context;
    private readonly ISavingsAccountService _savingsAccountService;
    private readonly ICurrentAccountService _currentAccountService;
    private readonly ITermSavingsAccountService _termSavingsAccountService;

        public ClientAccountService(
            ApplicationDbContext context,
            ISavingsAccountService savingsAccountService,
            ICurrentAccountService currentAccountService,
            ITermSavingsAccountService termSavingsAccountService)
        {
            _context = context;
            _savingsAccountService = savingsAccountService;
            _currentAccountService = currentAccountService;
            _termSavingsAccountService = termSavingsAccountService;
        }

        public async Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountListResponseDto> GetAccountsAsync(NalaCreditAPI.DTOs.ClientAccounts.ClientAccountFilterDto filter)
        {
            var allAccounts = new List<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary>();

            // Récupérer les comptes d'épargne
            if (!filter.AccountType.HasValue || filter.AccountType.Value == ClientAccountType.Savings)
            {
                var savingsFilter = new NalaCreditAPI.DTOs.Savings.SavingsAccountFilterDto
                {
                    Search = filter.CustomerName,
                    Currency = filter.Currency.HasValue ? (NalaCreditAPI.Models.SavingsCurrency)filter.Currency.Value : null,
                    Status = filter.Status.HasValue ? (NalaCreditAPI.Models.SavingsAccountStatus)filter.Status.Value : null,
                    BranchId = filter.BranchId,
                    DateFrom = filter.DateFrom,
                    DateTo = filter.DateTo,
                    MinBalance = filter.MinBalance,
                    MaxBalance = filter.MaxBalance,
                    Page = 1,
                    PageSize = int.MaxValue
                };

                var savingsResult = await _savingsAccountService.GetAccountsAsync(savingsFilter);
                foreach (var account in savingsResult.Accounts)
                {
                    allAccounts.Add(new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary
                    {
                        Id = account.Id,
                        AccountNumber = account.AccountNumber,
                        AccountType = ClientAccountType.Savings,
                        CustomerId = account.CustomerId,
                        CustomerName = account.Customer?.FullName ?? string.Empty,
                        CustomerCode = account.Customer?.CustomerCode ?? string.Empty,
                        CustomerPhone = account.Customer?.Contact.PrimaryPhone ?? string.Empty,
                        BranchId = account.BranchId,
                        BranchName = account.BranchName ?? string.Empty,
                        Currency = (ClientCurrency)account.Currency,
                        Balance = account.Balance,
                        Status = (ClientAccountStatus)account.Status,
                        OpeningDate = account.OpeningDate,
                        LastTransactionDate = account.LastTransactionDate
                    });
                }
            }

            // Récupérer les comptes courants
            if (!filter.AccountType.HasValue || filter.AccountType.Value == ClientAccountType.Current)
            {
                var currentFilter = new NalaCreditAPI.DTOs.ClientAccounts.CurrentAccountFilterDto
                {
                    Search = filter.CustomerName,
                    Currency = filter.Currency,
                    Status = filter.Status,
                    BranchId = filter.BranchId,
                    DateFrom = filter.DateFrom,
                    DateTo = filter.DateTo,
                    MinBalance = filter.MinBalance,
                    MaxBalance = filter.MaxBalance,
                    Page = 1,
                    PageSize = int.MaxValue
                };

                var currentResult = await _currentAccountService.GetAccountsAsync(currentFilter);
                foreach (var account in currentResult.Accounts)
                {
                    allAccounts.Add(new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary
                    {
                        Id = account.Id,
                        AccountNumber = account.AccountNumber,
                        AccountType = ClientAccountType.Current,
                        CustomerId = account.CustomerId,
                        CustomerName = account.CustomerName,
                        CustomerCode = account.CustomerCode ?? string.Empty,
                        CustomerPhone = account.CustomerPhone,
                        BranchId = account.BranchId,
                        BranchName = account.BranchName,
                        Currency = account.Currency,
                        Balance = account.Balance,
                        Status = account.Status,
                        OpeningDate = account.OpeningDate,
                        LastTransactionDate = account.LastTransactionDate
                    });
                }
            }

            // Appliquer les filtres supplémentaires
            if (!string.IsNullOrEmpty(filter.AccountNumber))
            {
                allAccounts = allAccounts.Where(a => a.AccountNumber.Contains(filter.AccountNumber)).ToList();
            }

            // Récupérer les comptes à terme
            if (!filter.AccountType.HasValue || filter.AccountType.Value == ClientAccountType.TermSavings)
            {
                var termFilter = new NalaCreditAPI.DTOs.ClientAccounts.TermSavingsAccountFilterDto
                {
                    Search = filter.CustomerName,
                    Currency = filter.Currency,
                    Status = filter.Status,
                    BranchId = filter.BranchId,
                    DateFrom = filter.DateFrom,
                    DateTo = filter.DateTo,
                    MinBalance = filter.MinBalance,
                    MaxBalance = filter.MaxBalance,
                    Page = 1,
                    PageSize = int.MaxValue
                };

                try
                {
                    var termResult = await _termSavingsAccountService.GetAccountsAsync(termFilter);
                    foreach (var account in termResult.Accounts)
                    {
                        allAccounts.Add(new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary
                        {
                            Id = account.Id,
                            AccountNumber = account.AccountNumber,
                            AccountType = ClientAccountType.TermSavings,
                            CustomerId = account.CustomerId,
                            CustomerName = account.CustomerName,
                            CustomerCode = account.CustomerCode ?? string.Empty,
                            CustomerPhone = account.CustomerPhone,
                            BranchId = account.BranchId,
                            BranchName = account.BranchName,
                            Currency = account.Currency,
                            Balance = account.Balance,
                            Status = account.Status,
                            OpeningDate = account.OpeningDate,
                            LastTransactionDate = account.LastTransactionDate
                        });
                    }
                }
                catch (Exception ex)
                {
                    // Don't fail the entire aggregation if term service has issues; log and continue
                    Console.Error.WriteLine($"[WARN] Unable to load term savings accounts: {ex.Message}");
                }
            }

            var totalCount = allAccounts.Count;

            // Appliquer la pagination
            var paginatedAccounts = allAccounts
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToList();

            return new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountListResponseDto
            {
                Accounts = paginatedAccounts,
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize),
                Statistics = await GetStatisticsAsync()
            };
        }

        public async Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary?> GetAccountAsync(string id)
        {
            // Essayer de trouver dans les comptes d'épargne
            var savingsAccount = await _savingsAccountService.GetAccountAsync(id);
            if (savingsAccount != null)
            {
                return new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary
                {
                    Id = savingsAccount.Id,
                    AccountNumber = savingsAccount.AccountNumber,
                    AccountType = ClientAccountType.Savings,
                    CustomerId = savingsAccount.CustomerId,
                    CustomerName = savingsAccount.Customer?.FullName ?? string.Empty,
                    CustomerCode = savingsAccount.Customer?.CustomerCode ?? string.Empty,
                    CustomerPhone = savingsAccount.Customer?.Contact.PrimaryPhone ?? string.Empty,
                    BranchId = savingsAccount.BranchId,
                    BranchName = savingsAccount.BranchName ?? string.Empty,
                    Currency = (ClientCurrency)savingsAccount.Currency,
                    Balance = savingsAccount.Balance,
                    Status = (ClientAccountStatus)savingsAccount.Status,
                    OpeningDate = savingsAccount.OpeningDate,
                    LastTransactionDate = savingsAccount.LastTransactionDate
                };
            }

            // Essayer de trouver dans les comptes courants
            var currentAccount = await _currentAccountService.GetAccountAsync(id);
            if (currentAccount != null)
            {
                return new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary
                {
                    Id = currentAccount.Id,
                    AccountNumber = currentAccount.AccountNumber,
                    AccountType = ClientAccountType.Current,
                    CustomerId = currentAccount.CustomerId,
                    CustomerName = currentAccount.CustomerName,
                    CustomerCode = currentAccount.CustomerCode ?? string.Empty,
                    CustomerPhone = currentAccount.CustomerPhone,
                    BranchId = currentAccount.BranchId,
                    BranchName = currentAccount.BranchName,
                    Currency = currentAccount.Currency,
                    Balance = currentAccount.Balance,
                    Status = currentAccount.Status,
                    OpeningDate = currentAccount.OpeningDate,
                    LastTransactionDate = currentAccount.LastTransactionDate
                };
            }

            return null;
        }

        public async Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary?> GetAccountByNumberAsync(string accountNumber)
        {
            // Supporter le nouveau format (G/D + 11 chiffres) et l'ancien format
            // Pour l'instant, on recherche d'abord dans les comptes d'épargne
            var savingsAccount = await _savingsAccountService.GetAccountByNumberAsync(accountNumber);
            if (savingsAccount != null)
            {
                return new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary
                {
                    Id = savingsAccount.Id,
                    AccountNumber = savingsAccount.AccountNumber,
                    AccountType = ClientAccountType.Savings,
                    CustomerId = savingsAccount.CustomerId,
                    CustomerName = savingsAccount.Customer?.FullName ?? string.Empty,
                    CustomerCode = savingsAccount.Customer?.CustomerCode ?? string.Empty,
                    CustomerPhone = savingsAccount.Customer?.Contact.PrimaryPhone ?? string.Empty,
                    BranchId = savingsAccount.BranchId,
                    BranchName = savingsAccount.BranchName ?? string.Empty,
                    Currency = (ClientCurrency)savingsAccount.Currency,
                    Balance = savingsAccount.Balance,
                    Status = (ClientAccountStatus)savingsAccount.Status,
                    OpeningDate = savingsAccount.OpeningDate,
                    LastTransactionDate = savingsAccount.LastTransactionDate
                };
            }

            // Essayer dans les comptes courants
            var currentAccount = await _currentAccountService.GetAccountByNumberAsync(accountNumber);
            if (currentAccount != null)
            {
                return new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary
                {
                    Id = currentAccount.Id,
                    AccountNumber = currentAccount.AccountNumber,
                    AccountType = ClientAccountType.Current,
                    CustomerId = currentAccount.CustomerId,
                    CustomerName = currentAccount.CustomerName,
                    CustomerCode = currentAccount.CustomerCode ?? string.Empty,
                    CustomerPhone = currentAccount.CustomerPhone,
                    BranchId = currentAccount.BranchId,
                    BranchName = currentAccount.BranchName,
                    Currency = currentAccount.Currency,
                    Balance = currentAccount.Balance,
                    Status = currentAccount.Status,
                    OpeningDate = currentAccount.OpeningDate,
                    LastTransactionDate = currentAccount.LastTransactionDate
                };
            }

            // À l'avenir: essayer épargnes à terme si nécessaire
            return null;
        }

        public async Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountStatistics> GetStatisticsAsync()
        {
            // Aggregate basic statistics from available account tables (Savings/Current/TermSavings)
            // Use UTC-only DateTimes to satisfy Npgsql timestamp with time zone requirements
            var todayUtc = DateTime.UtcNow.Date;
            var monthStartUtc = new DateTime(todayUtc.Year, todayUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var dayStartUtc = new DateTime(todayUtc.Year, todayUtc.Month, todayUtc.Day, 0, 0, 0, DateTimeKind.Utc);
            var nextDayStartUtc = dayStartUtc.AddDays(1);

            // Savings accounts
            var savingsTotal = await _context.SavingsAccounts.CountAsync();
            var savingsActive = await _context.SavingsAccounts.CountAsync(a => a.Status == NalaCreditAPI.Models.SavingsAccountStatus.Active);
            var savingsHtgBalance = await _context.SavingsAccounts
                .Where(a => a.Currency == NalaCreditAPI.Models.SavingsCurrency.HTG)
                .SumAsync(a => (decimal?)a.Balance) ?? 0m;
            var savingsUsdBalance = await _context.SavingsAccounts
                .Where(a => a.Currency == NalaCreditAPI.Models.SavingsCurrency.USD)
                .SumAsync(a => (decimal?)a.Balance) ?? 0m;
            var savingsNewThisMonth = await _context.SavingsAccounts.CountAsync(a => a.OpeningDate >= monthStartUtc);
            var savingsDormant = await _context.SavingsAccounts.CountAsync(a => a.LastTransactionDate != null && a.LastTransactionDate < dayStartUtc.AddDays(-90));

            // Current accounts
            var currentTotal = await _context.CurrentAccounts.CountAsync();
            var currentActive = await _context.CurrentAccounts.CountAsync(a => a.Status == NalaCreditAPI.Models.ClientAccountStatus.Active);
            var currentHtgBalance = await _context.CurrentAccounts
                .Where(a => a.Currency == NalaCreditAPI.Models.ClientCurrency.HTG)
                .SumAsync(a => (decimal?)a.Balance) ?? 0m;
            var currentUsdBalance = await _context.CurrentAccounts
                .Where(a => a.Currency == NalaCreditAPI.Models.ClientCurrency.USD)
                .SumAsync(a => (decimal?)a.Balance) ?? 0m;
            var currentNewThisMonth = await _context.CurrentAccounts.CountAsync(a => a.OpeningDate >= monthStartUtc);
            var currentDormant = await _context.CurrentAccounts.CountAsync(a => a.LastTransactionDate != null && a.LastTransactionDate < dayStartUtc.AddDays(-90));

            // Term savings accounts
            var termTotal = await _context.TermSavingsAccounts.CountAsync();
            var termActive = await _context.TermSavingsAccounts.CountAsync(a => a.Status == NalaCreditAPI.Models.ClientAccountStatus.Active);
            var termHtgBalance = await _context.TermSavingsAccounts
                .Where(a => a.Currency == NalaCreditAPI.Models.ClientCurrency.HTG)
                .SumAsync(a => (decimal?)a.Balance) ?? 0m;
            var termUsdBalance = await _context.TermSavingsAccounts
                .Where(a => a.Currency == NalaCreditAPI.Models.ClientCurrency.USD)
                .SumAsync(a => (decimal?)a.Balance) ?? 0m;
            var termNewThisMonth = await _context.TermSavingsAccounts.CountAsync(a => a.OpeningDate >= monthStartUtc);
            var termDormant = await _context.TermSavingsAccounts.CountAsync(a => a.LastTransactionDate != null && a.LastTransactionDate < dayStartUtc.AddDays(-90));

            // Recent transactions today
            // Use range comparison to avoid Date property client evaluation and ensure UTC boundaries
            var savingsTxToday = await _context.SavingsTransactions.CountAsync(t => t.ProcessedAt >= dayStartUtc && t.ProcessedAt < nextDayStartUtc);
            var currentTxToday = await _context.CurrentAccountTransactions.CountAsync(t => t.ProcessedAt >= dayStartUtc && t.ProcessedAt < nextDayStartUtc);
            var termTxToday = await _context.TermSavingsTransactions.CountAsync(t => t.ProcessedAt >= dayStartUtc && t.ProcessedAt < nextDayStartUtc);

            var totalAccounts = savingsTotal + currentTotal + termTotal;
            var totalActive = savingsActive + currentActive + termActive;
            var totalHtg = savingsHtgBalance + currentHtgBalance + termHtgBalance;
            var totalUsd = savingsUsdBalance + currentUsdBalance + termUsdBalance;
            var totalNewThisMonth = savingsNewThisMonth + currentNewThisMonth + termNewThisMonth;
            var totalDormant = savingsDormant + currentDormant + termDormant;
            var totalBalance = totalHtg + totalUsd;

            var stats = new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountStatistics
            {
                TotalAccounts = totalAccounts,
                ActiveAccounts = totalActive,
                TotalBalanceHTG = totalHtg,
                TotalBalanceUSD = totalUsd,
                AverageBalance = totalAccounts > 0 ? (totalBalance / totalAccounts) : 0,
                AccountsByType = new Dictionary<string, int>
                {
                    ["Savings"] = savingsTotal,
                    ["Current"] = currentTotal,
                    ["TermSavings"] = termTotal
                },
                AccountsByStatus = new Dictionary<string, int>
                {
                    ["Active"] = totalActive,
                    ["Inactive"] = totalAccounts - totalActive
                },
                AccountsByCurrency = new Dictionary<string, int>
                {
                    ["HTG"] = await _context.SavingsAccounts.CountAsync(a => a.Currency == NalaCreditAPI.Models.SavingsCurrency.HTG)
                                + await _context.CurrentAccounts.CountAsync(a => a.Currency == NalaCreditAPI.Models.ClientCurrency.HTG)
                                + await _context.TermSavingsAccounts.CountAsync(a => a.Currency == NalaCreditAPI.Models.ClientCurrency.HTG),
                    ["USD"] = await _context.SavingsAccounts.CountAsync(a => a.Currency == NalaCreditAPI.Models.SavingsCurrency.USD)
                                + await _context.CurrentAccounts.CountAsync(a => a.Currency == NalaCreditAPI.Models.ClientCurrency.USD)
                                + await _context.TermSavingsAccounts.CountAsync(a => a.Currency == NalaCreditAPI.Models.ClientCurrency.USD),
                },
                NewAccountsThisMonth = totalNewThisMonth,
                DormantAccounts = totalDormant
            };

            return stats;
        }

        public async Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary> CreateAccountAsync(NalaCreditAPI.DTOs.ClientAccounts.ClientAccountCreationDto dto, string userId)
        {
            // Debug logging
            Console.WriteLine($"[DEBUG] CreateAccountAsync - CustomerId received: '{dto.CustomerId}' (IsNullOrEmpty: {string.IsNullOrEmpty(dto.CustomerId)}, IsNullOrWhiteSpace: {string.IsNullOrWhiteSpace(dto.CustomerId)})");
            
            switch (dto.AccountType)
            {
                case ClientAccountType.Savings:
                    // Supporter soit un client existant (CustomerId), soit la création d'un nouveau client via d'autres écrans.
                    var savingsDto = new NalaCreditAPI.DTOs.Savings.SavingsAccountOpeningDto
                    {
                        ExistingCustomerId = dto.CustomerId,
                        Currency = (NalaCreditAPI.Models.SavingsCurrency)dto.Currency,
                        InitialDeposit = dto.InitialDeposit,
                        BranchId = dto.BranchId,
                        InterestRate = dto.InterestRate,
                        AccountLimits = new NalaCreditAPI.DTOs.Savings.SavingsAccountLimitsDto
                        {
                            DailyWithdrawalLimit = dto.DailyWithdrawalLimit ?? 0
                        },
                        AuthorizedSigners = dto.AuthorizedSigners?.Select(s => new NalaCreditAPI.DTOs.Savings.SavingsAccountAuthorizedSignerDto
                        {
                            FullName = s.FullName,
                            Role = s.Role,
                            DocumentType = s.DocumentNumber != null ? NalaCreditAPI.Models.SavingsIdentityDocumentType.CIN : (NalaCreditAPI.Models.SavingsIdentityDocumentType?)null,
                            DocumentNumber = s.DocumentNumber,
                            Phone = s.Phone
                        }).ToList()
                    };
                    
                    Console.WriteLine($"[DEBUG] SavingsAccountOpeningDto - ExistingCustomerId: '{savingsDto.ExistingCustomerId}'");

                    var savingsAccount = await _savingsAccountService.OpenAccountAsync(savingsDto, userId);
                    return new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary
                    {
                        Id = savingsAccount.Id,
                        AccountNumber = savingsAccount.AccountNumber,
                        AccountType = ClientAccountType.Savings,
                        CustomerId = savingsAccount.CustomerId,
                        CustomerName = savingsAccount.Customer?.FullName ?? string.Empty,
                        CustomerCode = savingsAccount.Customer?.CustomerCode ?? string.Empty,
                        CustomerPhone = savingsAccount.Customer?.Contact.PrimaryPhone ?? string.Empty,
                        BranchId = savingsAccount.BranchId,
                        BranchName = savingsAccount.BranchName ?? string.Empty,
                        Currency = (ClientCurrency)savingsAccount.Currency,
                        Balance = savingsAccount.Balance,
                        Status = (ClientAccountStatus)savingsAccount.Status,
                        OpeningDate = savingsAccount.OpeningDate
                    };

                case ClientAccountType.Current:
                    var currentDto = new NalaCreditAPI.DTOs.ClientAccounts.CurrentAccountOpeningDto
                    {
                        CustomerId = dto.CustomerId,
                        Currency = dto.Currency,
                        InitialDeposit = dto.InitialDeposit,
                        BranchId = dto.BranchId,
                        MinimumBalance = dto.MinimumBalance,
                        DailyWithdrawalLimit = dto.DailyWithdrawalLimit,
                        MonthlyWithdrawalLimit = dto.MonthlyWithdrawalLimit,
                        DailyDepositLimit = dto.DailyDepositLimit,
                        OverdraftLimit = dto.OverdraftLimit,
                        Pin = dto.Pin,
                        SecurityQuestion = dto.SecurityQuestion,
                        SecurityAnswer = dto.SecurityAnswer,
                        DepositMethod = dto.DepositMethod,
                        OriginOfFunds = dto.OriginOfFunds,
                        TransactionFrequency = dto.TransactionFrequency,
                        AccountPurpose = dto.AccountPurpose,
                        AuthorizedSigners = dto.AuthorizedSigners
                    };

                    var currentAccount = await _currentAccountService.OpenAccountAsync(currentDto, userId);
                    return new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary
                    {
                        Id = currentAccount.Id,
                        AccountNumber = currentAccount.AccountNumber,
                        AccountType = ClientAccountType.Current,
                        CustomerId = currentAccount.CustomerId,
                        CustomerName = currentAccount.CustomerName,
                        CustomerCode = currentAccount.CustomerCode ?? string.Empty,
                        CustomerPhone = currentAccount.CustomerPhone,
                        BranchId = currentAccount.BranchId,
                        BranchName = currentAccount.BranchName,
                        Currency = currentAccount.Currency,
                        Balance = currentAccount.Balance,
                        Status = currentAccount.Status,
                        OpeningDate = currentAccount.OpeningDate
                    };

                case ClientAccountType.TermSavings:
                    // Create a term savings account using the term savings service
                    if (!dto.TermType.HasValue)
                        throw new ArgumentException("TermType is requis pour un compte à terme");

                    var termDto = new NalaCreditAPI.DTOs.ClientAccounts.TermSavingsAccountOpeningDto
                    {
                        CustomerId = dto.CustomerId,
                        Currency = dto.Currency,
                        InitialDeposit = dto.InitialDeposit,
                        BranchId = dto.BranchId,
                        TermType = dto.TermType.Value,
                        InterestRate = dto.InterestRate,
                        InterestRateMonthly = dto.InterestRateMonthly,
                        AuthorizedSigners = dto.AuthorizedSigners
                    };

                    var termAccount = await _termSavingsAccountService.OpenAccountAsync(termDto, userId);
                    return new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary
                    {
                        Id = termAccount.Id,
                        AccountNumber = termAccount.AccountNumber,
                        AccountType = ClientAccountType.TermSavings,
                        CustomerId = termAccount.CustomerId,
                        CustomerName = termAccount.CustomerName,
                        CustomerCode = termAccount.CustomerCode ?? string.Empty,
                        CustomerPhone = termAccount.CustomerPhone,
                        BranchId = termAccount.BranchId,
                        BranchName = termAccount.BranchName,
                        Currency = termAccount.Currency,
                        Balance = termAccount.Balance,
                        Status = termAccount.Status,
                        OpeningDate = termAccount.OpeningDate
                    };

                default:
                    throw new ArgumentException("Type de compte non supporté");
            }
        }

        public async Task<bool> CloseAccountAsync(string accountId, string reason, string userId)
        {
            return await _savingsAccountService.CloseAccountAsync(accountId, reason, userId);
        }

        public async Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountBalanceDto> GetBalanceAsync(string accountNumber)
        {
            var balance = await _savingsAccountService.GetBalanceAsync(accountNumber);
            return new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountBalanceDto
            {
                Current = balance.Current,
                Available = balance.Available,
                Currency = (ClientCurrency)balance.Currency,
                LastUpdated = balance.LastUpdated
            };
        }

        public async Task<List<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountTransactionResponseDto>> GetAccountTransactionsAsync(string accountId, int page = 1, int pageSize = 20)
        {
            var transactions = new List<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountTransactionResponseDto>();

            var savingsTransactions = await _context.SavingsTransactions
                .Where(t => t.AccountId == accountId)
                .Include(t => t.ProcessedByUser)
                .Include(t => t.Branch)
                .OrderByDescending(t => t.ProcessedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            foreach (var t in savingsTransactions)
            {
                transactions.Add(new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountTransactionResponseDto
                {
                    Id = t.Id,
                    AccountId = t.AccountId,
                    AccountNumber = t.AccountNumber,
                    AccountType = ClientAccountType.Savings,
                    Type = t.Type,
                    Amount = t.Amount,
                    Currency = (ClientCurrency)t.Currency,
                    BalanceBefore = t.BalanceBefore,
                    BalanceAfter = t.BalanceAfter,
                    Description = t.Description,
                    Reference = t.Reference,
                    ProcessedBy = t.ProcessedBy,
                    ProcessedByName = t.ProcessedByUser?.UserName ?? t.ProcessedBy,
                    BranchId = t.BranchId,
                    BranchName = t.Branch?.Name ?? string.Empty,
                    Status = (NalaCreditAPI.Models.SavingsTransactionStatus)t.Status,
                    ProcessedAt = t.ProcessedAt,
                    CreatedAt = t.CreatedAt,
                    Fees = t.Fees,
                    ExchangeRate = t.ExchangeRate
                });
            }

            return transactions;
        }

        public async Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary> UpdateAccountAsync(string id, NalaCreditAPI.DTOs.ClientAccounts.ClientAccountUpdateDto dto, string userId)
        {
            // For now, only support savings accounts
            var savingsDto = new NalaCreditAPI.DTOs.Savings.SavingsAccountUpdateDto
            {
                Status = (NalaCreditAPI.Models.SavingsAccountStatus)dto.Status,
                InterestRate = dto.InterestRate,
                AccountLimits = new NalaCreditAPI.DTOs.Savings.SavingsAccountLimitsDto
                {
                    DailyWithdrawalLimit = dto.DailyWithdrawalLimit ?? 0,
                    DailyDepositLimit = dto.DailyDepositLimit ?? 0,
                    MonthlyWithdrawalLimit = dto.MonthlyWithdrawalLimit ?? 0,
                    MaxBalance = 0, // Not in ClientAccountUpdateDto
                    MinWithdrawalAmount = 0, // Not in ClientAccountUpdateDto
                    MaxWithdrawalAmount = 0 // Not in ClientAccountUpdateDto
                },
                Notes = dto.Notes
            };

            var updatedAccount = await _savingsAccountService.UpdateAccountAsync(id, savingsDto, userId);
            return new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountSummary
            {
                Id = updatedAccount.Id,
                AccountNumber = updatedAccount.AccountNumber,
                AccountType = ClientAccountType.Savings,
                CustomerId = updatedAccount.CustomerId,
                CustomerName = updatedAccount.Customer?.FullName ?? string.Empty,
                CustomerCode = updatedAccount.Customer?.CustomerCode ?? string.Empty,
                CustomerPhone = updatedAccount.Customer?.Contact.PrimaryPhone ?? string.Empty,
                BranchId = updatedAccount.BranchId,
                BranchName = updatedAccount.BranchName ?? string.Empty,
                Currency = (ClientCurrency)updatedAccount.Currency,
                Balance = updatedAccount.Balance,
                Status = (ClientAccountStatus)updatedAccount.Status,
                OpeningDate = updatedAccount.OpeningDate,
                LastTransactionDate = updatedAccount.LastTransactionDate
            };
        }

        public async Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountResponseDto> UpdateAccountStatusAsync(string id, bool isActive, string userId)
        {
            // Try to find the account in current accounts first
            var currentAccount = await _currentAccountService.GetAccountAsync(id);
            if (currentAccount != null)
            {
                var updatedAccount = await _currentAccountService.UpdateAccountStatusAsync(id, isActive, userId);
                return new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountResponseDto
                {
                    Id = updatedAccount.Id,
                    AccountNumber = updatedAccount.AccountNumber,
                    AccountType = ClientAccountType.Current,
                    CustomerId = updatedAccount.CustomerId,
                    CustomerName = updatedAccount.CustomerName,
                    CustomerPhone = updatedAccount.CustomerPhone,
                    BranchId = updatedAccount.BranchId,
                    BranchName = updatedAccount.BranchName,
                    Currency = updatedAccount.Currency,
                    Balance = updatedAccount.Balance,
                    AvailableBalance = updatedAccount.AvailableBalance,
                    OpeningDate = updatedAccount.OpeningDate,
                    LastTransactionDate = updatedAccount.LastTransactionDate,
                    Status = updatedAccount.Status,
                    CreatedAt = updatedAccount.CreatedAt,
                    UpdatedAt = updatedAccount.UpdatedAt,
                    ClosedAt = updatedAccount.ClosedAt,
                    ClosedBy = updatedAccount.ClosedBy,
                    ClosureReason = updatedAccount.ClosureReason
                };
            }

            // If not found in current accounts, try savings accounts
            // For now, assume it's a current account since that's what the frontend is trying to update
            throw new ArgumentException("Account not found or account type not supported for status updates");
        }

        public async Task<List<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountTransactionResponseDto>> GetTransactionHistoryAsync(string accountId, DateTime? fromDate = null, DateTime? toDate = null, int page = 1, int pageSize = 20)
        {
                // The controller passes an account number (not necessarily the internal GUID id).
                // Query transactions across SavingsTransactions, CurrentAccountTransactions and TermSavingsTransactions
                // by AccountNumber, combine and return ordered by ProcessedAt with pagination.

                var results = new List<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountTransactionResponseDto>();

                // Savings transactions matching account number
                var savingsQuery = _context.SavingsTransactions
                    .Where(t => t.AccountNumber == accountId);

                if (fromDate.HasValue) savingsQuery = savingsQuery.Where(t => t.ProcessedAt >= fromDate.Value);
                if (toDate.HasValue) savingsQuery = savingsQuery.Where(t => t.ProcessedAt <= toDate.Value);

                var savingsTransactions = await savingsQuery
                    .Include(t => t.ProcessedByUser)
                    .Include(t => t.Branch)
                    .ToListAsync();

                foreach (var t in savingsTransactions)
                {
                    results.Add(new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountTransactionResponseDto
                    {
                        Id = t.Id,
                        AccountId = t.AccountId,
                        AccountNumber = t.AccountNumber,
                        AccountType = ClientAccountType.Savings,
                        Type = t.Type,
                        Amount = t.Amount,
                        Currency = (ClientCurrency)t.Currency,
                        BalanceBefore = t.BalanceBefore,
                        BalanceAfter = t.BalanceAfter,
                        Description = t.Description,
                        Reference = t.Reference,
                        ProcessedBy = t.ProcessedBy,
                        ProcessedByName = t.ProcessedByUser?.UserName ?? t.ProcessedBy,
                        BranchId = t.BranchId,
                        BranchName = t.Branch?.Name ?? string.Empty,
                        Status = (NalaCreditAPI.Models.SavingsTransactionStatus)t.Status,
                        ProcessedAt = t.ProcessedAt,
                        CreatedAt = t.CreatedAt,
                        Fees = t.Fees,
                        ExchangeRate = t.ExchangeRate
                    });
                }

                // Current account transactions matching account number
                var currentQuery = _context.CurrentAccountTransactions
                    .Where(t => t.AccountNumber == accountId);

                if (fromDate.HasValue) currentQuery = currentQuery.Where(t => t.ProcessedAt >= fromDate.Value);
                if (toDate.HasValue) currentQuery = currentQuery.Where(t => t.ProcessedAt <= toDate.Value);

                var currentTransactions = await currentQuery
                    .Include(t => t.ProcessedByUser)
                    .Include(t => t.Branch)
                    .ToListAsync();

                foreach (var t in currentTransactions)
                {
                    results.Add(new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountTransactionResponseDto
                    {
                        Id = t.Id,
                        AccountId = t.AccountId,
                        AccountNumber = t.AccountNumber,
                        AccountType = ClientAccountType.Current,
                        Type = t.Type,
                        Amount = t.Amount,
                        Currency = (ClientCurrency)t.Currency,
                        BalanceBefore = t.BalanceBefore,
                        BalanceAfter = t.BalanceAfter,
                        Description = t.Description,
                        Reference = t.Reference,
                        ProcessedBy = t.ProcessedBy,
                        ProcessedByName = t.ProcessedByUser?.UserName ?? t.ProcessedBy,
                        BranchId = t.BranchId,
                        BranchName = t.Branch?.Name ?? string.Empty,
                        Status = t.Status,
                        ProcessedAt = t.ProcessedAt,
                        CreatedAt = t.CreatedAt,
                        Fees = t.Fees,
                        ExchangeRate = t.ExchangeRate
                    });
                }

                // Term savings transactions matching account number
                var termQuery = _context.TermSavingsTransactions
                    .Where(t => t.AccountNumber == accountId);

                if (fromDate.HasValue) termQuery = termQuery.Where(t => t.ProcessedAt >= fromDate.Value);
                if (toDate.HasValue) termQuery = termQuery.Where(t => t.ProcessedAt <= toDate.Value);

                var termTransactions = await termQuery
                    .Include(t => t.ProcessedByUser)
                    .Include(t => t.Branch)
                    .ToListAsync();

                foreach (var t in termTransactions)
                {
                    results.Add(new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountTransactionResponseDto
                    {
                        Id = t.Id,
                        AccountId = t.AccountId,
                        AccountNumber = t.AccountNumber,
                        AccountType = ClientAccountType.TermSavings,
                        Type = t.Type,
                        Amount = t.Amount,
                        Currency = (ClientCurrency)t.Currency,
                        BalanceBefore = t.BalanceBefore,
                        BalanceAfter = t.BalanceAfter,
                        Description = t.Description,
                        Reference = t.Reference,
                        ProcessedBy = t.ProcessedBy,
                        ProcessedByName = t.ProcessedByUser?.UserName ?? t.ProcessedBy,
                        BranchId = t.BranchId,
                        BranchName = t.Branch?.Name ?? string.Empty,
                        Status = t.Status,
                        ProcessedAt = t.ProcessedAt,
                        CreatedAt = t.CreatedAt,
                        Fees = t.Fees,
                        ExchangeRate = t.ExchangeRate
                    });
                }

                // Order combined results by ProcessedAt desc and apply pagination
                var ordered = results.OrderByDescending(r => r.ProcessedAt).ToList();
                var paged = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();
                return paged;
        }

        public async Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountStatistics> GetStatisticsByTypeAsync(ClientAccountType accountType)
        {
            // For now, return general statistics
            return await GetStatisticsAsync();
        }

        public async Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountStatistics> GetStatisticsByCurrencyAsync(ClientCurrency currency)
        {
            // For now, return general statistics
            return await GetStatisticsAsync();
        }

        public async Task<NalaCreditAPI.DTOs.ClientAccounts.ClientAccountListResponseDto> SearchAccountsAsync(string searchTerm, int page = 1, int pageSize = 10)
        {
            var filter = new NalaCreditAPI.DTOs.ClientAccounts.ClientAccountFilterDto
            {
                CustomerName = searchTerm,
                Page = page,
                PageSize = pageSize
            };
            return await GetAccountsAsync(filter);
        }
    }
}