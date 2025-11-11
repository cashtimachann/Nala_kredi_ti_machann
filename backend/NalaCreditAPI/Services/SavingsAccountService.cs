using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs.Savings;
using NalaCreditAPI.Models;
using System.Security.Cryptography;
using System.Text;

namespace NalaCreditAPI.Services.Savings
{
    public interface ISavingsAccountService
    {
        Task<SavingsAccountResponseDto> OpenAccountAsync(SavingsAccountOpeningDto dto, string userId);
        Task<SavingsAccountResponseDto?> GetAccountAsync(string accountId);
        Task<SavingsAccountResponseDto?> GetAccountByNumberAsync(string accountNumber);
        Task<SavingsAccountListResponseDto> GetAccountsAsync(SavingsAccountFilterDto filter);
        Task<SavingsAccountResponseDto> UpdateAccountAsync(string accountId, SavingsAccountUpdateDto dto, string userId);
        Task<bool> CloseAccountAsync(string accountId, string reason, string userId);
        Task<SavingsAccountBalanceDto> GetBalanceAsync(string accountNumber);
        Task<SavingsAccountStatementResponseDto> GenerateStatementAsync(SavingsAccountStatementRequestDto request);
        Task<bool> CalculateInterestAsync(string accountId);
        Task<int> CalculateInterestForAllAccountsAsync();
    }

    public class SavingsAccountService : ISavingsAccountService
    {
        private readonly ApplicationDbContext _context;
        private readonly ISavingsTransactionService _transactionService;
        private readonly ISavingsCustomerService _customerService;

        public SavingsAccountService(
            ApplicationDbContext context,
            ISavingsTransactionService transactionService,
            ISavingsCustomerService customerService)
        {
            _context = context;
            _transactionService = transactionService;
            _customerService = customerService;
        }

        public async Task<SavingsAccountResponseDto> OpenAccountAsync(SavingsAccountOpeningDto dto, string userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Debug logging
                Console.WriteLine($"[DEBUG] OpenAccountAsync - ExistingCustomerId: '{dto.ExistingCustomerId}' (IsNullOrWhiteSpace: {string.IsNullOrWhiteSpace(dto.ExistingCustomerId)})");
                Console.WriteLine($"[DEBUG] OpenAccountAsync - Customer is null: {dto.Customer == null}");
                
                // 1. Récupérer ou créer le client
                string customerId;
                if (!string.IsNullOrWhiteSpace(dto.ExistingCustomerId))
                {
                    Console.WriteLine($"[DEBUG] Using existing customer: {dto.ExistingCustomerId}");
                    var existing = await _context.SavingsCustomers.FindAsync(dto.ExistingCustomerId);
                    if (existing == null)
                        throw new ArgumentException("Client existant introuvable");
                    customerId = existing.Id;
                }
                else
                {
                    Console.WriteLine($"[DEBUG] Creating new customer...");
                    if (dto.Customer == null)
                        throw new ArgumentException("Les informations du client sont requises pour créer un nouveau client");
                    var customerDto = await _customerService.CreateCustomerAsync(dto.Customer, userId);
                    customerId = customerDto.Id;
                }

                // 2. Créer le compte
                // Vérifier qu'un compte d'épargne avec cette devise n'existe pas déjà pour ce client
                var existingAccount = await _context.SavingsAccounts
                    .FirstOrDefaultAsync(sa => sa.CustomerId == customerId &&
                                             sa.Currency == dto.Currency &&
                                             sa.Status == SavingsAccountStatus.Active);

                if (existingAccount != null)
                {
                    var currencyName = dto.Currency == SavingsCurrency.HTG ? "HTG" : "USD";
                    throw new InvalidOperationException($"Le client possède déjà un compte d'épargne en {currencyName}. Un client ne peut avoir qu'un seul compte par devise.");
                }

                var account = new SavingsAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    AccountNumber = await GenerateAccountNumberAsync(dto.Currency),
                    CustomerId = customerId,
                    BranchId = dto.BranchId,
                    Currency = dto.Currency,
                    Balance = 0, // Sera mis à jour par le dépôt initial
                    AvailableBalance = 0,
                    MinimumBalance = GetMinimumBalance(dto.Currency),
                    OpeningDate = DateTime.UtcNow,
                    Status = SavingsAccountStatus.Active,
                    InterestRate = dto.InterestRate ?? GetDefaultInterestRate(dto.Currency),
                    DailyWithdrawalLimit = dto.AccountLimits?.DailyWithdrawalLimit ?? GetDefaultDailyWithdrawalLimit(dto.Currency),
                    DailyDepositLimit = dto.AccountLimits?.DailyDepositLimit ?? GetDefaultDailyDepositLimit(dto.Currency),
                    MonthlyWithdrawalLimit = dto.AccountLimits?.MonthlyWithdrawalLimit ?? GetDefaultMonthlyWithdrawalLimit(dto.Currency),
                    MaxBalance = dto.AccountLimits?.MaxBalance ?? GetDefaultMaxBalance(dto.Currency),
                    MinWithdrawalAmount = dto.AccountLimits?.MinWithdrawalAmount ?? GetDefaultMinWithdrawalAmount(dto.Currency),
                    MaxWithdrawalAmount = dto.AccountLimits?.MaxWithdrawalAmount ?? GetDefaultMaxWithdrawalAmount(dto.Currency),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.SavingsAccounts.Add(account);
                await _context.SaveChangesAsync();

                // 3. Effectuer le dépôt initial (dans la même transaction, sans appeler ProcessTransactionAsync qui démarre sa propre transaction)
                var initialDepositTransaction = new SavingsTransaction
                {
                    Id = Guid.NewGuid().ToString(),
                    AccountId = account.Id,
                    AccountNumber = account.AccountNumber,
                    Type = SavingsTransactionType.Deposit,
                    Amount = dto.InitialDeposit,
                    Currency = account.Currency,
                    BalanceBefore = 0,
                    BalanceAfter = dto.InitialDeposit,
                    Description = "Dépôt initial d'ouverture",
                    Reference = $"DEP-{DateTime.UtcNow:yyyyMMdd}-{account.AccountNumber}",
                    ProcessedBy = userId,
                    BranchId = account.BranchId,
                    Status = SavingsTransactionStatus.Completed,
                    ProcessedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    VerificationMethod = "Document d'identité vérifié"
                };

                account.Balance = dto.InitialDeposit;
                account.AvailableBalance = dto.InitialDeposit;
                account.LastTransactionDate = DateTime.UtcNow;
                account.UpdatedAt = DateTime.UtcNow;

                _context.SavingsTransactions.Add(initialDepositTransaction);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                // Retourner le compte créé avec les informations complètes
                return await GetAccountAsync(account.Id) 
                    ?? throw new InvalidOperationException("Impossible de récupérer le compte créé");
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<SavingsAccountResponseDto?> GetAccountAsync(string accountId)
        {
            var account = await _context.SavingsAccounts
                .Include(a => a.Customer)
                .Include(a => a.Branch)
                .FirstOrDefaultAsync(a => a.Id == accountId);

            if (account == null) return null;

            return MapToResponseDto(account);
        }

        public async Task<SavingsAccountResponseDto?> GetAccountByNumberAsync(string accountNumber)
        {
            var account = await _context.SavingsAccounts
                .Include(a => a.Customer)
                .Include(a => a.Branch)
                .FirstOrDefaultAsync(a => a.AccountNumber == accountNumber);

            if (account == null) return null;

            return MapToResponseDto(account);
        }

        public async Task<SavingsAccountListResponseDto> GetAccountsAsync(SavingsAccountFilterDto filter)
        {
            var query = _context.SavingsAccounts
                .Include(a => a.Customer)
                .Include(a => a.Branch)
                .AsQueryable();

            // Filtres
            if (!string.IsNullOrEmpty(filter.Search))
            {
                var searchLower = filter.Search.ToLower();
                query = query.Where(a => 
                    a.AccountNumber.ToLower().Contains(searchLower) ||
                    (a.Customer.FirstName + " " + a.Customer.LastName).ToLower().Contains(searchLower) ||
                    a.Customer.PrimaryPhone.Contains(filter.Search));
            }

            if (filter.Currency.HasValue)
                query = query.Where(a => a.Currency == filter.Currency.Value);

            if (filter.Status.HasValue)
                query = query.Where(a => a.Status == filter.Status.Value);

            if (filter.BranchId.HasValue)
                query = query.Where(a => a.BranchId == filter.BranchId.Value);

            if (filter.DateFrom.HasValue)
                query = query.Where(a => a.OpeningDate >= filter.DateFrom.Value);

            if (filter.DateTo.HasValue)
                query = query.Where(a => a.OpeningDate <= filter.DateTo.Value.AddDays(1));

            if (filter.MinBalance.HasValue)
                query = query.Where(a => a.Balance >= filter.MinBalance.Value);

            if (filter.MaxBalance.HasValue)
                query = query.Where(a => a.Balance <= filter.MaxBalance.Value);

            // Tri
            query = filter.SortBy?.ToLower() switch
            {
                "accountnumber" => filter.SortDirection == "desc" 
                    ? query.OrderByDescending(a => a.AccountNumber)
                    : query.OrderBy(a => a.AccountNumber),
                "customername" => filter.SortDirection == "desc"
                    ? query.OrderByDescending(a => a.Customer.FirstName + " " + a.Customer.LastName)
                    : query.OrderBy(a => a.Customer.FirstName + " " + a.Customer.LastName),
                "balance" => filter.SortDirection == "desc"
                    ? query.OrderByDescending(a => a.Balance)
                    : query.OrderBy(a => a.Balance),
                "openingdate" => filter.SortDirection == "desc"
                    ? query.OrderByDescending(a => a.OpeningDate)
                    : query.OrderBy(a => a.OpeningDate),
                _ => query.OrderBy(a => a.AccountNumber)
            };

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(totalCount / (double)filter.PageSize);

            var accounts = await query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            var statistics = await GenerateStatisticsAsync();

            return new SavingsAccountListResponseDto
            {
                Accounts = accounts.Select(MapToResponseDto).ToList(),
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = totalPages,
                Statistics = statistics
            };
        }

        public async Task<SavingsAccountResponseDto> UpdateAccountAsync(string accountId, SavingsAccountUpdateDto dto, string userId)
        {
            var account = await _context.SavingsAccounts.FindAsync(accountId)
                ?? throw new ArgumentException("Compte introuvable");

            account.Status = dto.Status;
            if (dto.InterestRate.HasValue)
                account.InterestRate = dto.InterestRate.Value;

            if (dto.AccountLimits != null)
            {
                account.DailyWithdrawalLimit = dto.AccountLimits.DailyWithdrawalLimit;
                account.DailyDepositLimit = dto.AccountLimits.DailyDepositLimit;
                account.MonthlyWithdrawalLimit = dto.AccountLimits.MonthlyWithdrawalLimit;
                account.MaxBalance = dto.AccountLimits.MaxBalance;
                account.MinWithdrawalAmount = dto.AccountLimits.MinWithdrawalAmount;
                account.MaxWithdrawalAmount = dto.AccountLimits.MaxWithdrawalAmount;
            }

            account.UpdatedAt = DateTime.UtcNow;

            if (dto.Status == SavingsAccountStatus.Closed)
            {
                account.ClosedAt = DateTime.UtcNow;
                account.ClosedBy = userId;
                account.ClosureReason = dto.Notes;
            }

            await _context.SaveChangesAsync();

            return await GetAccountAsync(accountId)
                ?? throw new InvalidOperationException("Impossible de récupérer le compte mis à jour");
        }

        public async Task<bool> CloseAccountAsync(string accountId, string reason, string userId)
        {
            var account = await _context.SavingsAccounts.FindAsync(accountId);
            if (account == null) return false;

            if (account.Balance != 0)
                throw new InvalidOperationException("Impossible de fermer un compte avec un solde non-nul");

            account.Status = SavingsAccountStatus.Closed;
            account.ClosedAt = DateTime.UtcNow;
            account.ClosedBy = userId;
            account.ClosureReason = reason;
            account.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<SavingsAccountBalanceDto> GetBalanceAsync(string accountNumber)
        {
            var account = await _context.SavingsAccounts
                .FirstOrDefaultAsync(a => a.AccountNumber == accountNumber)
                ?? throw new ArgumentException("Compte introuvable");

            return new SavingsAccountBalanceDto
            {
                Current = account.Balance,
                Available = account.AvailableBalance,
                Currency = account.Currency,
                LastUpdated = account.UpdatedAt
            };
        }

        public async Task<SavingsAccountStatementResponseDto> GenerateStatementAsync(SavingsAccountStatementRequestDto request)
        {
            var account = await _context.SavingsAccounts
                .Include(a => a.Customer)
                .FirstOrDefaultAsync(a => a.Id == request.AccountId)
                ?? throw new ArgumentException("Compte introuvable");

            var transactions = new List<SavingsTransactionResponseDto>();

            if (request.IncludeTransactions)
            {
                var transactionFilter = new SavingsTransactionFilterDto
                {
                    AccountId = request.AccountId,
                    DateFrom = request.PeriodFrom,
                    DateTo = request.PeriodTo,
                    PageSize = int.MaxValue
                };

                var transactionResult = await _transactionService.GetTransactionsAsync(transactionFilter);
                transactions = transactionResult.Transactions;
            }

            // Calculer les totaux
            var totalCredits = transactions.Where(t => 
                t.Type == SavingsTransactionType.Deposit || 
                t.Type == SavingsTransactionType.Interest).Sum(t => t.Amount);

            var totalDebits = transactions.Where(t => 
                t.Type == SavingsTransactionType.Withdrawal ||
                t.Type == SavingsTransactionType.Fee).Sum(t => t.Amount);

            // Solde d'ouverture (approximatif)
            var openingBalance = account.Balance - totalCredits + totalDebits;

            return new SavingsAccountStatementResponseDto
            {
                AccountId = account.Id,
                AccountNumber = account.AccountNumber,
                CustomerName = $"{account.Customer.FirstName} {account.Customer.LastName}",
                PeriodFrom = request.PeriodFrom,
                PeriodTo = request.PeriodTo,
                OpeningBalance = openingBalance,
                ClosingBalance = account.Balance,
                Transactions = transactions,
                InterestEarned = transactions.Where(t => t.Type == SavingsTransactionType.Interest).Sum(t => t.Amount),
                TotalCredits = totalCredits,
                TotalDebits = totalDebits,
                GeneratedAt = DateTime.UtcNow,
                GeneratedBy = "System"
            };
        }

        public async Task<bool> CalculateInterestAsync(string accountId)
        {
            var account = await _context.SavingsAccounts.FindAsync(accountId);
            if (account == null || account.Status != SavingsAccountStatus.Active) 
                return false;

            var daysSinceLastCalculation = account.LastInterestCalculation.HasValue
                ? (DateTime.UtcNow - account.LastInterestCalculation.Value).Days
                : (DateTime.UtcNow - account.OpeningDate).Days;

            if (daysSinceLastCalculation < 30) return false; // Calcul mensuel

            var monthlyRate = account.InterestRate / 12;
            var interest = account.Balance * monthlyRate;

            if (interest > 0.01m) // Seuil minimal d'intérêt
            {
                account.AccruedInterest += interest;
                account.LastInterestCalculation = DateTime.UtcNow;
                account.UpdatedAt = DateTime.UtcNow;

                // Créer une transaction d'intérêt
                var interestTransaction = new SavingsTransaction
                {
                    Id = Guid.NewGuid().ToString(),
                    AccountId = account.Id,
                    Type = SavingsTransactionType.Interest,
                    Amount = interest,
                    Currency = account.Currency,
                    BalanceBefore = account.Balance,
                    BalanceAfter = account.Balance + interest,
                    Description = $"Intérêts calculés - Taux: {account.InterestRate:P2}",
                    Reference = $"INT-{DateTime.UtcNow:yyyyMMdd}-{account.AccountNumber}",
                    ProcessedBy = "SYSTEM",
                    BranchId = account.BranchId,
                    Status = SavingsTransactionStatus.Completed,
                    ProcessedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };

                account.Balance += interest;
                account.AvailableBalance += interest;
                account.LastTransactionDate = DateTime.UtcNow;

                _context.SavingsTransactions.Add(interestTransaction);
                await _context.SaveChangesAsync();

                return true;
            }

            return false;
        }

        public async Task<int> CalculateInterestForAllAccountsAsync()
        {
            var eligibleAccounts = await _context.SavingsAccounts
                .Where(a => a.Status == SavingsAccountStatus.Active)
                .Where(a => !a.LastInterestCalculation.HasValue || 
                           a.LastInterestCalculation.Value.AddDays(30) <= DateTime.UtcNow)
                .ToListAsync();

            int processed = 0;
            foreach (var account in eligibleAccounts)
            {
                if (await CalculateInterestAsync(account.Id))
                    processed++;
            }

            return processed;
        }

        // Méthodes privées d'aide
        private async Task<string> GenerateAccountNumberAsync(SavingsCurrency currency)
        {
            // Nouveau format demandé: 'G' + 11 chiffres pour HTG, 'D' + 11 chiffres pour USD
            // Longueur totale: 12 caractères (conforme à la contrainte DB)
            string accountNumber;
            var prefix = currency == SavingsCurrency.USD ? "D" : "G";

            do
            {
                // Générer 11 chiffres de manière cryptographiquement aléatoire
                var digits = new char[11];
                for (int i = 0; i < digits.Length; i++)
                {
                    digits[i] = (char)('0' + RandomNumberGenerator.GetInt32(10));
                }

                var numberPart = new string(digits);
                accountNumber = prefix + numberPart;
            }
            while (await _context.SavingsAccounts.AnyAsync(a => a.AccountNumber == accountNumber));

            return accountNumber;
        }

        private static decimal GetMinimumBalance(SavingsCurrency currency)
        {
            return currency == SavingsCurrency.HTG ? 500m : 10m;
        }

        private static decimal GetDefaultInterestRate(SavingsCurrency currency)
        {
            return currency == SavingsCurrency.HTG ? 0.02m : 0.015m; // 2% HTG, 1.5% USD
        }

        private static decimal GetDefaultDailyWithdrawalLimit(SavingsCurrency currency) =>
            currency == SavingsCurrency.HTG ? 50000m : 500m;

        private static decimal GetDefaultDailyDepositLimit(SavingsCurrency currency) =>
            currency == SavingsCurrency.HTG ? 500000m : 5000m;

        private static decimal GetDefaultMonthlyWithdrawalLimit(SavingsCurrency currency) =>
            currency == SavingsCurrency.HTG ? 1000000m : 10000m;

        private static decimal GetDefaultMaxBalance(SavingsCurrency currency) =>
            currency == SavingsCurrency.HTG ? 10000000m : 100000m;

        private static decimal GetDefaultMinWithdrawalAmount(SavingsCurrency currency) =>
            currency == SavingsCurrency.HTG ? 100m : 5m;

        private static decimal GetDefaultMaxWithdrawalAmount(SavingsCurrency currency) =>
            currency == SavingsCurrency.HTG ? 50000m : 500m;

        private async Task<SavingsAccountStatisticsDto> GenerateStatisticsAsync()
        {
            var totalAccounts = await _context.SavingsAccounts.CountAsync();
            var activeAccounts = await _context.SavingsAccounts.CountAsync(a => a.Status == SavingsAccountStatus.Active);
            
            var balances = await _context.SavingsAccounts
                .Where(a => a.Status == SavingsAccountStatus.Active)
                .GroupBy(a => a.Currency)
                .Select(g => new { Currency = g.Key, Total = g.Sum(a => a.Balance) })
                .ToListAsync();

            var totalBalanceHTG = balances.FirstOrDefault(b => b.Currency == SavingsCurrency.HTG)?.Total ?? 0;
            var totalBalanceUSD = balances.FirstOrDefault(b => b.Currency == SavingsCurrency.USD)?.Total ?? 0;

            var averageBalance = activeAccounts > 0 
                ? await _context.SavingsAccounts
                    .Where(a => a.Status == SavingsAccountStatus.Active)
                    .AverageAsync(a => a.Balance)
                : 0;

            var accountsByStatus = await _context.SavingsAccounts
                .GroupBy(a => a.Status)
                .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
                .ToDictionaryAsync(x => x.Status, x => x.Count);

            var accountsByCurrency = await _context.SavingsAccounts
                .Where(a => a.Status == SavingsAccountStatus.Active)
                .GroupBy(a => a.Currency)
                .Select(g => new { Currency = g.Key.ToString(), Count = g.Count() })
                .ToDictionaryAsync(x => x.Currency, x => x.Count);

            var firstOfMonth = DateTime.SpecifyKind(new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1), DateTimeKind.Utc);
            var newAccountsThisMonth = await _context.SavingsAccounts
                .CountAsync(a => a.OpeningDate >= firstOfMonth);

            var dormantAccounts = await _context.SavingsAccounts
                .CountAsync(a => a.Status == SavingsAccountStatus.Active &&
                    (!a.LastTransactionDate.HasValue || a.LastTransactionDate.Value.AddDays(90) < DateTime.UtcNow));

            return new SavingsAccountStatisticsDto
            {
                TotalAccounts = totalAccounts,
                ActiveAccounts = activeAccounts,
                TotalBalanceHTG = totalBalanceHTG,
                TotalBalanceUSD = totalBalanceUSD,
                AverageBalance = averageBalance,
                AccountsByStatus = accountsByStatus,
                AccountsByCurrency = accountsByCurrency,
                NewAccountsThisMonth = newAccountsThisMonth,
                DormantAccounts = dormantAccounts
            };
        }

        private SavingsAccountResponseDto MapToResponseDto(SavingsAccount account)
        {
            return new SavingsAccountResponseDto
            {
                Id = account.Id,
                AccountNumber = account.AccountNumber,
                CustomerId = account.CustomerId,
                Customer = account.Customer != null ? new SavingsCustomerResponseDto
                {
                    Id = account.Customer.Id,
                    FirstName = account.Customer.FirstName,
                    LastName = account.Customer.LastName,
                    FullName = $"{account.Customer.FirstName} {account.Customer.LastName}",
                    DateOfBirth = account.Customer.DateOfBirth,
                    Gender = account.Customer.Gender,
                    Address = new SavingsCustomerAddressDto
                    {
                        Street = account.Customer.Street,
                        Commune = account.Customer.Commune,
                        Department = account.Customer.Department,
                        Country = account.Customer.Country,
                        PostalCode = account.Customer.PostalCode
                    },
                    Contact = new SavingsCustomerContactDto
                    {
                        PrimaryPhone = account.Customer.PrimaryPhone,
                        SecondaryPhone = account.Customer.SecondaryPhone,
                        Email = account.Customer.Email,
                        EmergencyContactName = account.Customer.EmergencyContactName,
                        EmergencyContactPhone = account.Customer.EmergencyContactPhone
                    },
                    Identity = new SavingsCustomerIdentityDto
                    {
                        DocumentType = account.Customer.DocumentType,
                        DocumentNumber = account.Customer.DocumentNumber,
                        IssuedDate = account.Customer.IssuedDate,
                        ExpiryDate = account.Customer.ExpiryDate,
                        IssuingAuthority = account.Customer.IssuingAuthority
                    },
                    Occupation = account.Customer.Occupation,
                    MonthlyIncome = account.Customer.MonthlyIncome,
                    CreatedAt = account.Customer.CreatedAt,
                    UpdatedAt = account.Customer.UpdatedAt,
                    IsActive = account.Customer.IsActive
                } : null,
                CustomerName = account.Customer != null ? account.Customer.FirstName + " " + account.Customer.LastName : "",
                BranchId = account.BranchId,
                BranchName = account.Branch?.Name,
                Currency = account.Currency,
                Balance = account.Balance,
                AvailableBalance = account.AvailableBalance,
                MinimumBalance = account.MinimumBalance,
                OpeningDate = account.OpeningDate,
                LastTransactionDate = account.LastTransactionDate,
                Status = account.Status,
                InterestRate = account.InterestRate,
                AccruedInterest = account.AccruedInterest,
                LastInterestCalculation = account.LastInterestCalculation,
                AccountLimits = new SavingsAccountLimitsDto
                {
                    DailyWithdrawalLimit = account.DailyWithdrawalLimit,
                    DailyDepositLimit = account.DailyDepositLimit,
                    MonthlyWithdrawalLimit = account.MonthlyWithdrawalLimit,
                    MaxBalance = account.MaxBalance,
                    MinWithdrawalAmount = account.MinWithdrawalAmount,
                    MaxWithdrawalAmount = account.MaxWithdrawalAmount
                },
                CreatedAt = account.CreatedAt,
                UpdatedAt = account.UpdatedAt,
                ClosedAt = account.ClosedAt,
                ClosedBy = account.ClosedBy,
                ClosureReason = account.ClosureReason
            };
        }
    }
}