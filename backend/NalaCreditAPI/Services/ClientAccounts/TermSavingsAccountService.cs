using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs.ClientAccounts;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.Services.ClientAccounts
{
    public interface ITermSavingsAccountService
    {
        Task<TermSavingsAccountResponseDto> OpenAccountAsync(TermSavingsAccountOpeningDto dto, string userId);
        Task<TermSavingsAccountResponseDto?> GetAccountAsync(string id);
        Task<TermSavingsAccountResponseDto?> GetAccountByNumberAsync(string accountNumber);
        Task<TermSavingsAccountListResponseDto> GetAccountsAsync(TermSavingsAccountFilterDto filter);
        Task<TermSavingsAccountResponseDto> UpdateAccountAsync(string id, TermSavingsAccountUpdateDto dto, string userId);
        Task<bool> CloseAccountAsync(string id, string reason, string userId, decimal? earlyWithdrawalPenaltyPercent = null);
        Task<bool> DeleteAccountAsync(string id);
        Task<ClientAccountBalanceDto> GetBalanceAsync(string accountNumber);
        Task<TermSavingsAccountStatisticsDto> GetStatisticsAsync();
        Task<bool> CalculateInterestAsync(string accountId);
        Task<int> CalculateInterestForAllAccountsAsync();
        Task<TermSavingsAccountResponseDto> RenewAccountAsync(string accountId, NalaCreditAPI.DTOs.ClientAccounts.TermSavingsAccountRenewDto dto, string userId);
        Task<string> ToggleAccountStatusAsync(string id, string userId);
        Task ProcessTransactionAsync(TermSavingsTransactionDto dto, string userId);
        Task<List<object>> GetAllTransactionsAsync(string? accountNumber, string? type, DateTime? startDate, DateTime? endDate, int? branchId, decimal? minAmount, decimal? maxAmount);
    }

    public class TermSavingsAccountService : ITermSavingsAccountService
    {
        private readonly ApplicationDbContext _context;

        public TermSavingsAccountService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<TermSavingsAccountResponseDto> OpenAccountAsync(TermSavingsAccountOpeningDto dto, string userId)
        {
            // Vérifier que le client existe
            var customer = await _context.SavingsCustomers.FindAsync(dto.CustomerId);
            if (customer == null)
                throw new ArgumentException("Client introuvable");

            // Vérifier qu'un compte d'épargne à terme avec cette devise n'existe pas déjà pour ce client
            var existingAccount = await _context.TermSavingsAccounts
                .FirstOrDefaultAsync(tsa => tsa.CustomerId == dto.CustomerId &&
                                          tsa.Currency == dto.Currency &&
                                          tsa.Status == ClientAccountStatus.Active);

            if (existingAccount != null)
            {
                var currencyName = dto.Currency == ClientCurrency.HTG ? "HTG" : "USD";
                throw new InvalidOperationException($"Le client possède déjà un compte d'épargne à terme en {currencyName}. Un client ne peut avoir qu'un seul compte par devise.");
            }

            // Générer le numéro de compte selon la devise: G + 11 chiffres (HTG) ou D + 11 chiffres (USD)
            var accountNumber = await GenerateAccountNumber(dto.Currency);

            // Calculer la date d'échéance
            var maturityDate = CalculateMaturityDate(DateTime.UtcNow, dto.TermType);

            // Déterminer le taux d'intérêt
            var interestRate = dto.InterestRate ?? GetDefaultInterestRate(dto.TermType, dto.Currency);

            var account = new TermSavingsAccount
            {
                AccountNumber = accountNumber,
                CustomerId = dto.CustomerId,
                BranchId = dto.BranchId,
                Currency = dto.Currency,
                Balance = dto.InitialDeposit,
                AvailableBalance = 0, // Verrouillé jusqu'à l'échéance
                TermType = dto.TermType,
                OpeningDate = DateTime.UtcNow,
                MaturityDate = maturityDate,
                InterestRate = interestRate,
                EarlyWithdrawalPenalty = GetEarlyWithdrawalPenalty(dto.TermType)
            };

            _context.TermSavingsAccounts.Add(account);
            await _context.SaveChangesAsync();

            // Créer la transaction d'ouverture
            var transaction = new TermSavingsTransaction
            {
                AccountId = account.Id,
                AccountNumber = account.AccountNumber,
                Type = SavingsTransactionType.Deposit,
                Amount = dto.InitialDeposit,
                Currency = dto.Currency,
                BalanceBefore = 0,
                BalanceAfter = dto.InitialDeposit,
                Description = $"Dépôt initial - Épargne à terme {GetTermTypeLabel(dto.TermType)}",
                Reference = $"OPEN-{account.AccountNumber}",
                ProcessedBy = userId,
                BranchId = dto.BranchId,
                ProcessedAt = DateTime.UtcNow
            };

            _context.TermSavingsTransactions.Add(transaction);
            await _context.SaveChangesAsync();

            return await MapToResponseDto(account);
        }

        public async Task<TermSavingsAccountResponseDto?> GetAccountAsync(string id)
        {
            var account = await _context.TermSavingsAccounts
                .Include(a => a.Customer)
                .Include(a => a.Branch)
                .FirstOrDefaultAsync(a => a.Id == id);

            return account != null ? await MapToResponseDto(account) : null;
        }

        public async Task<TermSavingsAccountResponseDto?> GetAccountByNumberAsync(string accountNumber)
        {
            var account = await _context.TermSavingsAccounts
                .Include(a => a.Customer)
                .Include(a => a.Branch)
                .FirstOrDefaultAsync(a => a.AccountNumber == accountNumber);

            return account != null ? await MapToResponseDto(account) : null;
        }

        public async Task<TermSavingsAccountListResponseDto> GetAccountsAsync(TermSavingsAccountFilterDto filter)
        {
            var query = _context.TermSavingsAccounts
                .Include(a => a.Customer)
                .Include(a => a.Branch)
                .AsQueryable();

            var requestedPage = filter.Page < 1 ? 1 : filter.Page;
            var pageSize = filter.PageSize < 1 ? 10 : Math.Min(filter.PageSize, 100);

            // Apply filters
            if (!string.IsNullOrEmpty(filter.Search))
            {
                query = query.Where(a =>
                    a.AccountNumber.Contains(filter.Search) ||
                    a.Customer.FirstName.Contains(filter.Search) ||
                    a.Customer.LastName.Contains(filter.Search));
            }

            if (filter.Currency.HasValue)
                query = query.Where(a => a.Currency == filter.Currency.Value);

            if (filter.Status.HasValue)
                query = query.Where(a => a.Status == filter.Status.Value);

            if (filter.TermType.HasValue)
                query = query.Where(a => a.TermType == filter.TermType.Value);

            if (filter.BranchId.HasValue)
                query = query.Where(a => a.BranchId == filter.BranchId.Value);

            if (filter.DateFrom.HasValue)
                query = query.Where(a => a.OpeningDate >= filter.DateFrom.Value);

            if (filter.DateTo.HasValue)
                query = query.Where(a => a.OpeningDate <= filter.DateTo.Value);

            if (filter.MinBalance.HasValue)
                query = query.Where(a => a.Balance >= filter.MinBalance.Value);

            if (filter.MaxBalance.HasValue)
                query = query.Where(a => a.Balance <= filter.MaxBalance.Value);

            var totalCount = await query.CountAsync();
            var totalPages = pageSize > 0 ? (int)Math.Ceiling((double)totalCount / pageSize) : 0;
            var page = totalPages == 0 ? 1 : Math.Min(requestedPage, totalPages);

            var sortBy = string.IsNullOrWhiteSpace(filter.SortBy) ? "AccountNumber" : filter.SortBy.Trim();
            var sortDescending = string.Equals(filter.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);

            query = sortBy switch
            {
                var s when s.Equals("Balance", StringComparison.OrdinalIgnoreCase)
                    => sortDescending ? query.OrderByDescending(a => a.Balance) : query.OrderBy(a => a.Balance),
                var s when s.Equals("OpeningDate", StringComparison.OrdinalIgnoreCase)
                    => sortDescending ? query.OrderByDescending(a => a.OpeningDate) : query.OrderBy(a => a.OpeningDate),
                var s when s.Equals("MaturityDate", StringComparison.OrdinalIgnoreCase)
                    => sortDescending ? query.OrderByDescending(a => a.MaturityDate) : query.OrderBy(a => a.MaturityDate),
                var s when s.Equals("CreatedAt", StringComparison.OrdinalIgnoreCase)
                    => sortDescending ? query.OrderByDescending(a => a.CreatedAt) : query.OrderBy(a => a.CreatedAt),
                var s when s.Equals("UpdatedAt", StringComparison.OrdinalIgnoreCase)
                    => sortDescending ? query.OrderByDescending(a => a.UpdatedAt) : query.OrderBy(a => a.UpdatedAt),
                var s when s.Equals("CustomerName", StringComparison.OrdinalIgnoreCase)
                    => sortDescending
                        ? query.OrderByDescending(a => a.Customer != null ? a.Customer.FirstName : string.Empty)
                               .ThenByDescending(a => a.Customer != null ? a.Customer.LastName : string.Empty)
                        : query.OrderBy(a => a.Customer != null ? a.Customer.FirstName : string.Empty)
                               .ThenBy(a => a.Customer != null ? a.Customer.LastName : string.Empty),
                var s when s.Equals("TermType", StringComparison.OrdinalIgnoreCase)
                    => sortDescending ? query.OrderByDescending(a => a.TermType) : query.OrderBy(a => a.TermType),
                var s when s.Equals("Status", StringComparison.OrdinalIgnoreCase)
                    => sortDescending ? query.OrderByDescending(a => a.Status) : query.OrderBy(a => a.Status),
                var s when s.Equals("Currency", StringComparison.OrdinalIgnoreCase)
                    => sortDescending ? query.OrderByDescending(a => a.Currency) : query.OrderBy(a => a.Currency),
                _
                    => sortDescending ? query.OrderByDescending(a => a.AccountNumber) : query.OrderBy(a => a.AccountNumber)
            };

            var accounts = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var accountDtos = new List<TermSavingsAccountResponseDto>();
            foreach (var account in accounts)
            {
                accountDtos.Add(await MapToResponseDto(account));
            }

            return new TermSavingsAccountListResponseDto
            {
                Accounts = accountDtos,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages,
                Statistics = await GetStatisticsAsync()
            };
        }

        public async Task<TermSavingsAccountResponseDto> UpdateAccountAsync(string id, TermSavingsAccountUpdateDto dto, string userId)
        {
            var account = await _context.TermSavingsAccounts.FindAsync(id);
            if (account == null)
                throw new ArgumentException("Compte introuvable");

            account.Status = dto.Status;
            if (dto.InterestRate.HasValue) account.InterestRate = dto.InterestRate.Value;
            account.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await MapToResponseDto(account);
        }

        public async Task<bool> CloseAccountAsync(string id, string reason, string userId, decimal? earlyWithdrawalPenaltyPercent = null)
        {
            var account = await _context.TermSavingsAccounts.FindAsync(id);
            if (account == null)
                return false;

            var isEarlyWithdrawal = account.MaturityDate > DateTime.UtcNow;

            // Si retrait anticipé sans pénalité fournie (ou pénalité = 0), rejeter
            if (isEarlyWithdrawal && (!earlyWithdrawalPenaltyPercent.HasValue || earlyWithdrawalPenaltyPercent.Value <= 0))
                throw new InvalidOperationException("Le compte n'est pas encore échu. Appliquez d'abord la pénalité de retrait anticipé.");

            // Appliquer la pénalité si fournie et > 0
            if (earlyWithdrawalPenaltyPercent.HasValue && earlyWithdrawalPenaltyPercent.Value > 0)
            {
                var penaltyAmount = account.Balance * (earlyWithdrawalPenaltyPercent.Value / 100);
                var netAmount = account.Balance - penaltyAmount;
                
                // Créer une transaction de retrait pour le montant net
                var withdrawal = new TermSavingsTransaction
                {
                    AccountId = account.Id,
                    AccountNumber = account.AccountNumber,
                    Type = SavingsTransactionType.Withdrawal,
                    Amount = netAmount,
                    Currency = account.Currency,
                    BalanceBefore = account.Balance,
                    BalanceAfter = 0,
                    Description = $"Retrait anticipé avec pénalité de {earlyWithdrawalPenaltyPercent.Value}% ({penaltyAmount:N2} {account.Currency})",
                    Reference = $"EARLY-CLOSE-{account.AccountNumber}",
                    ProcessedBy = userId,
                    BranchId = account.BranchId,
                    ProcessedAt = DateTime.UtcNow
                };
                _context.TermSavingsTransactions.Add(withdrawal);
                
                // Mettre le solde à 0
                account.Balance = 0;
                account.AvailableBalance = 0;
                
                // Ajouter note dans la raison
                reason = $"{reason} [Pénalité de {earlyWithdrawalPenaltyPercent.Value}% appliquée: {penaltyAmount:N2} {account.Currency}, Montant retiré: {netAmount:N2} {account.Currency}]";
            }
            else
            {
                // Fermeture normale à échéance - retirer tout le solde
                if (account.Balance > 0)
                {
                    var withdrawal = new TermSavingsTransaction
                    {
                        AccountId = account.Id,
                        AccountNumber = account.AccountNumber,
                        Type = SavingsTransactionType.Withdrawal,
                        Amount = account.Balance,
                        Currency = account.Currency,
                        BalanceBefore = account.Balance,
                        BalanceAfter = 0,
                        Description = "Retrait à l'échéance",
                        Reference = $"MATURE-CLOSE-{account.AccountNumber}",
                        ProcessedBy = userId,
                        BranchId = account.BranchId,
                        ProcessedAt = DateTime.UtcNow
                    };
                    _context.TermSavingsTransactions.Add(withdrawal);
                    
                    account.Balance = 0;
                    account.AvailableBalance = 0;
                }
            }

            account.Status = ClientAccountStatus.Closed;
            account.ClosedAt = DateTime.UtcNow;
            account.ClosedBy = userId;
            account.ClosureReason = reason;
            account.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAccountAsync(string id)
        {
            var account = await _context.TermSavingsAccounts.FindAsync(id);
            if (account == null)
                return false;

            // Vérifier que le compte est fermé ou inactif
            if (account.Status == ClientAccountStatus.Active)
                throw new InvalidOperationException("Impossible de supprimer un compte actif. Fermez-le d'abord.");

            // Vérifier que le solde est à 0
            if (account.Balance != 0)
                throw new InvalidOperationException($"Impossible de supprimer un compte avec un solde non nul ({account.Balance} {account.Currency}). Le solde doit être à 0.");

            // Supprimer les transactions associées
            var transactions = await _context.TermSavingsTransactions
                .Where(t => t.AccountId == id)
                .ToListAsync();
            _context.TermSavingsTransactions.RemoveRange(transactions);

            // Supprimer le compte
            _context.TermSavingsAccounts.Remove(account);
            
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<ClientAccountBalanceDto> GetBalanceAsync(string accountNumber)
        {
            var account = await _context.TermSavingsAccounts
                .FirstOrDefaultAsync(a => a.AccountNumber == accountNumber);

            if (account == null)
                throw new ArgumentException("Compte introuvable");

            return new ClientAccountBalanceDto
            {
                Current = account.Balance,
                Available = account.AvailableBalance,
                Currency = account.Currency,
                LastUpdated = account.LastTransactionDate ?? account.OpeningDate
            };
        }

        public async Task<TermSavingsAccountStatisticsDto> GetStatisticsAsync()
        {
            var accounts = await _context.TermSavingsAccounts.ToListAsync();

            var totalAccounts = accounts.Count;
            var activeAccounts = accounts.Count(a => a.Status == ClientAccountStatus.Active);
            var totalBalanceHTG = accounts.Where(a => a.Currency == ClientCurrency.HTG).Sum(a => a.Balance);
            var totalBalanceUSD = accounts.Where(a => a.Currency == ClientCurrency.USD).Sum(a => a.Balance);
            var averageBalance = accounts.Any() ? accounts.Average(a => a.Balance) : 0;

            var accountsByStatus = accounts.GroupBy(a => a.Status.ToString())
                .ToDictionary(g => g.Key, g => g.Count());

            var accountsByCurrency = accounts.GroupBy(a => a.Currency.ToString())
                .ToDictionary(g => g.Key, g => g.Count());

            var accountsByTermType = accounts.GroupBy(a => a.TermType.ToString())
                .ToDictionary(g => g.Key, g => g.Count());

            var newAccountsThisMonth = accounts.Count(a =>
                a.CreatedAt >= DateTime.SpecifyKind(new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1), DateTimeKind.Utc));

            var dormantAccounts = accounts.Count(a =>
                a.LastTransactionDate.HasValue &&
                a.LastTransactionDate.Value < DateTime.UtcNow.AddMonths(-6));

            var maturedAccounts = accounts.Count(a =>
                a.MaturityDate <= DateTime.UtcNow && a.Status == ClientAccountStatus.Active);

            return new TermSavingsAccountStatisticsDto
            {
                TotalAccounts = totalAccounts,
                ActiveAccounts = activeAccounts,
                TotalBalanceHTG = totalBalanceHTG,
                TotalBalanceUSD = totalBalanceUSD,
                AverageBalance = averageBalance,
                AccountsByStatus = accountsByStatus,
                AccountsByCurrency = accountsByCurrency,
                AccountsByTermType = accountsByTermType,
                NewAccountsThisMonth = newAccountsThisMonth,
                DormantAccounts = dormantAccounts,
                MaturedAccounts = maturedAccounts
            };
        }

        public async Task<bool> CalculateInterestAsync(string accountId)
        {
            var account = await _context.TermSavingsAccounts.FindAsync(accountId);
            if (account == null)
                return false;

            // Calculer les intérêts seulement si le compte est actif et à l'échéance
            if (account.Status != ClientAccountStatus.Active || account.MaturityDate > DateTime.UtcNow)
                return false;

            var days = (DateTime.UtcNow - account.OpeningDate).TotalDays;
            var years = days / 365.25;
            var interest = account.Balance * account.InterestRate * (decimal)years;

            account.AccruedInterest += interest;
            account.LastInterestCalculation = DateTime.UtcNow;
            account.UpdatedAt = DateTime.UtcNow;

            // Créer la transaction d'intérêt
            var transaction = new TermSavingsTransaction
            {
                AccountId = account.Id,
                AccountNumber = account.AccountNumber,
                Type = SavingsTransactionType.Interest,
                Amount = interest,
                Currency = account.Currency,
                BalanceBefore = account.Balance,
                BalanceAfter = account.Balance + interest,
                Description = $"Intérêts calculés - Échéance {GetTermTypeLabel(account.TermType)}",
                Reference = $"INT-{account.AccountNumber}-{DateTime.UtcNow:yyyyMMdd}",
                ProcessedBy = "SYSTEM",
                BranchId = account.BranchId,
                ProcessedAt = DateTime.UtcNow
            };

            account.Balance += interest;
            account.AvailableBalance = account.Balance; // Débloquer à l'échéance

            _context.TermSavingsTransactions.Add(transaction);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<int> CalculateInterestForAllAccountsAsync()
        {
            var maturedAccounts = await _context.TermSavingsAccounts
                .Where(a => a.Status == ClientAccountStatus.Active && a.MaturityDate <= DateTime.UtcNow)
                .ToListAsync();

            var processedCount = 0;
            foreach (var account in maturedAccounts)
            {
                if (await CalculateInterestAsync(account.Id))
                    processedCount++;
            }

            return processedCount;
        }

        public async Task<TermSavingsAccountResponseDto> RenewAccountAsync(string accountId, NalaCreditAPI.DTOs.ClientAccounts.TermSavingsAccountRenewDto dto, string userId)
        {
            var account = await _context.TermSavingsAccounts.FindAsync(accountId);
            if (account == null)
                throw new ArgumentException("Compte introuvable");

            if (account.Status != ClientAccountStatus.Active)
                throw new InvalidOperationException("Le compte doit être actif pour être renouvelé");

            if (account.MaturityDate > DateTime.UtcNow)
                throw new InvalidOperationException("Le compte n'est pas encore échu");

            // Calculate interest and mark available (this will create interest transaction)
            var interestCalculated = await CalculateInterestAsync(account.Id);
            if (!interestCalculated)
                throw new InvalidOperationException("Impossible de calculer les intérêts au moment du renouvellement");

            // Reload account to get updated balances
            _context.Entry(account).State = Microsoft.EntityFrameworkCore.EntityState.Detached;
            account = await _context.TermSavingsAccounts.FindAsync(accountId);
            if (account == null)
                throw new ArgumentException("Compte introuvable après calcul");

            // Optionally change term type
            if (dto?.RenewalTermType != null)
                account.TermType = dto.RenewalTermType.Value;

            // Optionally override interest rate
            if (dto?.InterestRate != null)
                account.InterestRate = dto.InterestRate.Value;

            // Re-start the term: set new opening/maturity dates
            var now = DateTime.UtcNow;
            account.OpeningDate = now;
            account.MaturityDate = CalculateMaturityDate(now, account.TermType);

            // Lock funds again until next maturity
            account.AvailableBalance = 0;
            account.AccruedInterest = 0;
            account.LastInterestCalculation = null;
            account.UpdatedAt = DateTime.UtcNow;

            // Optionally store auto-renew flag if model supports it (not present on model now)

            await _context.SaveChangesAsync();

            return await MapToResponseDto(account);
        }

        public async Task<string> ToggleAccountStatusAsync(string id, string userId)
        {
            var account = await _context.TermSavingsAccounts.FindAsync(id);
            if (account == null)
                throw new ArgumentException("Compte introuvable");

            // Ne peut pas suspendre/activer un compte fermé
            if (account.Status == ClientAccountStatus.Closed)
                throw new InvalidOperationException("Impossible de modifier le statut d'un compte fermé");

            // Ne peut pas suspendre/activer un compte inactif
            if (account.Status == ClientAccountStatus.Inactive)
                throw new InvalidOperationException("Impossible de modifier le statut d'un compte inactif");

            // Toggle entre ACTIVE et SUSPENDED
            var previousStatus = account.Status;
            if (account.Status == ClientAccountStatus.Active)
            {
                account.Status = ClientAccountStatus.Suspended;
                account.UpdatedAt = DateTime.UtcNow;
                
                // Créer une transaction de note pour l'historique
                var suspendTransaction = new TermSavingsTransaction
                {
                    AccountId = account.Id,
                    AccountNumber = account.AccountNumber,
                    Type = SavingsTransactionType.Other,
                    Amount = 0,
                    Currency = account.Currency,
                    BalanceBefore = account.Balance,
                    BalanceAfter = account.Balance,
                    Description = "Compte suspendu par l'administrateur",
                    Reference = $"SUSPEND-{account.AccountNumber}-{DateTime.UtcNow:yyyyMMddHHmmss}",
                    ProcessedBy = userId,
                    BranchId = account.BranchId,
                    ProcessedAt = DateTime.UtcNow
                };
                _context.TermSavingsTransactions.Add(suspendTransaction);
                
                await _context.SaveChangesAsync();
                return "Compte suspendu avec succès";
            }
            else if (account.Status == ClientAccountStatus.Suspended)
            {
                account.Status = ClientAccountStatus.Active;
                account.UpdatedAt = DateTime.UtcNow;
                
                // Créer une transaction de note pour l'historique
                var activateTransaction = new TermSavingsTransaction
                {
                    AccountId = account.Id,
                    AccountNumber = account.AccountNumber,
                    Type = SavingsTransactionType.Other,
                    Amount = 0,
                    Currency = account.Currency,
                    BalanceBefore = account.Balance,
                    BalanceAfter = account.Balance,
                    Description = "Compte réactivé par l'administrateur",
                    Reference = $"ACTIVATE-{account.AccountNumber}-{DateTime.UtcNow:yyyyMMddHHmmss}",
                    ProcessedBy = userId,
                    BranchId = account.BranchId,
                    ProcessedAt = DateTime.UtcNow
                };
                _context.TermSavingsTransactions.Add(activateTransaction);
                
                await _context.SaveChangesAsync();
                return "Compte réactivé avec succès";
            }

            throw new InvalidOperationException($"Statut du compte invalide: {account.Status}");
        }

        public async Task<List<object>> GetAllTransactionsAsync(
            string? accountNumber, 
            string? type, 
            DateTime? startDate, 
            DateTime? endDate, 
            int? branchId, 
            decimal? minAmount, 
            decimal? maxAmount)
        {
            var query = _context.TermSavingsTransactions.AsQueryable();

            // Appliquer les filtres
            if (!string.IsNullOrEmpty(accountNumber))
                query = query.Where(t => t.AccountNumber.Contains(accountNumber));

            if (!string.IsNullOrEmpty(type) && type.ToUpper() != "ALL")
            {
                if (Enum.TryParse<SavingsTransactionType>(type, true, out var transactionType))
                    query = query.Where(t => t.Type == transactionType);
            }

            if (startDate.HasValue)
                query = query.Where(t => t.ProcessedAt >= startDate.Value);

            if (endDate.HasValue)
            {
                var endOfDay = endDate.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(t => t.ProcessedAt <= endOfDay);
            }

            if (branchId.HasValue)
                query = query.Where(t => t.BranchId == branchId.Value);

            if (minAmount.HasValue)
                query = query.Where(t => t.Amount >= minAmount.Value);

            if (maxAmount.HasValue)
                query = query.Where(t => t.Amount <= maxAmount.Value);

            // Ordonner par date décroissante (plus récent d'abord)
            query = query.OrderByDescending(t => t.ProcessedAt);

            var transactions = await query
                .Include(t => t.ProcessedByUser)
                .Include(t => t.Branch)
                .ToListAsync();

            // Mapper vers des objets anonymes pour le retour
            return transactions.Select(t => new
            {
                id = t.Id,
                accountId = t.AccountId,
                accountNumber = t.AccountNumber,
                type = t.Type.ToString(),
                amount = t.Amount,
                currency = t.Currency.ToString(),
                balanceBefore = t.BalanceBefore,
                balanceAfter = t.BalanceAfter,
                description = t.Description,
                reference = t.Reference,
                processedBy = t.ProcessedBy,
                processedByName = t.ProcessedByUser?.UserName ?? t.ProcessedBy,
                processedAt = t.ProcessedAt,
                branchId = t.BranchId,
                branchName = t.Branch?.Name ?? string.Empty
            } as object).ToList();
        }

        public async Task ProcessTransactionAsync(TermSavingsTransactionDto dto, string userId)
        {
            // Trouver le compte
            var account = await _context.TermSavingsAccounts
                .FirstOrDefaultAsync(a => a.AccountNumber == dto.AccountNumber);

            if (account == null)
                throw new ArgumentException("Compte introuvable");

            // Vérifier que le compte est actif
            if (account.Status != ClientAccountStatus.Active)
                throw new InvalidOperationException("Le compte doit être actif pour effectuer une transaction");

            // Vérifier la devise
            if (account.Currency != dto.Currency)
                throw new InvalidOperationException($"Devise incorrecte. Ce compte utilise {account.Currency}");

            // Traiter selon le type
            if (dto.Type == SavingsTransactionType.Deposit)
            {
                // Dépôt
                var balanceBefore = account.Balance;
                account.Balance += dto.Amount;
                account.LastTransactionDate = DateTime.UtcNow;
                account.UpdatedAt = DateTime.UtcNow;

                // Créer la transaction
                var transaction = new TermSavingsTransaction
                {
                    AccountId = account.Id,
                    AccountNumber = account.AccountNumber,
                    Type = SavingsTransactionType.Deposit,
                    Amount = dto.Amount,
                    Currency = dto.Currency,
                    BalanceBefore = balanceBefore,
                    BalanceAfter = account.Balance,
                    Description = dto.Description ?? "Dépôt sur compte à terme",
                    Reference = $"DEP-{account.AccountNumber}-{DateTime.UtcNow:yyyyMMddHHmmss}",
                    ProcessedBy = userId,
                    BranchId = account.BranchId,
                    ProcessedAt = DateTime.UtcNow
                };

                _context.TermSavingsTransactions.Add(transaction);
                await _context.SaveChangesAsync();
            }
            else if (dto.Type == SavingsTransactionType.Withdrawal)
            {
                // Retrait
                // Vérifier le solde disponible
                if (dto.Amount > account.AvailableBalance)
                    throw new InvalidOperationException($"Solde disponible insuffisant. Disponible: {account.AvailableBalance} {account.Currency}");

                // Vérifier si le compte est échu
                var today = DateTime.UtcNow;
                var isMatured = account.MaturityDate <= today;

                if (!isMatured)
                {
                    throw new InvalidOperationException(
                        $"Retrait non autorisé avant échéance ({account.MaturityDate:dd/MM/yyyy}). " +
                        "Utilisez la fonctionnalité 'Retrait anticipé' avec pénalité."
                    );
                }

                var balanceBefore = account.Balance;
                account.Balance -= dto.Amount;
                account.AvailableBalance -= dto.Amount;
                account.LastTransactionDate = DateTime.UtcNow;
                account.UpdatedAt = DateTime.UtcNow;

                // Créer la transaction
                var transaction = new TermSavingsTransaction
                {
                    AccountId = account.Id,
                    AccountNumber = account.AccountNumber,
                    Type = SavingsTransactionType.Withdrawal,
                    Amount = dto.Amount,
                    Currency = dto.Currency,
                    BalanceBefore = balanceBefore,
                    BalanceAfter = account.Balance,
                    Description = dto.Description ?? "Retrait sur compte à terme",
                    Reference = $"WTH-{account.AccountNumber}-{DateTime.UtcNow:yyyyMMddHHmmss}",
                    ProcessedBy = userId,
                    BranchId = account.BranchId,
                    ProcessedAt = DateTime.UtcNow
                };

                _context.TermSavingsTransactions.Add(transaction);
                await _context.SaveChangesAsync();
            }
            else
            {
                throw new InvalidOperationException("Type de transaction non supporté. Utilisez Deposit ou Withdrawal.");
            }
        }

        private async Task<string> GenerateAccountNumber(ClientCurrency currency)
        {
            // Nouveau format: 12 caractères au total
            // HTG => préfixe 'G' + 11 chiffres ; USD => préfixe 'D' + 11 chiffres
            string accountNumber;
            var prefix = currency == ClientCurrency.USD ? "D" : "G";

            do
            {
                var digits = new char[11];
                for (int i = 0; i < digits.Length; i++)
                {
                    digits[i] = (char)('0' + System.Security.Cryptography.RandomNumberGenerator.GetInt32(10));
                }
                accountNumber = prefix + new string(digits);
            }
            while (await _context.TermSavingsAccounts.AnyAsync(a => a.AccountNumber == accountNumber));

            return accountNumber;
        }

        private DateTime CalculateMaturityDate(DateTime openingDate, TermSavingsType termType)
        {
            return termType switch
            {
                TermSavingsType.ThreeMonths => openingDate.AddMonths(3),
                TermSavingsType.SixMonths => openingDate.AddMonths(6),
                TermSavingsType.TwelveMonths => openingDate.AddMonths(12),
                TermSavingsType.TwentyFourMonths => openingDate.AddMonths(24),
                _ => openingDate.AddMonths(12)
            };
        }

        private decimal GetDefaultInterestRate(TermSavingsType termType, ClientCurrency currency)
        {
            var baseRates = termType switch
            {
                TermSavingsType.ThreeMonths => 0.025m,    // 2.5%
                TermSavingsType.SixMonths => 0.035m,      // 3.5%
                TermSavingsType.TwelveMonths => 0.045m,   // 4.5%
                TermSavingsType.TwentyFourMonths => 0.055m, // 5.5%
                _ => 0.045m
            };

            // Ajuster selon la devise (USD a des taux légèrement inférieurs)
            return currency == ClientCurrency.USD ? baseRates * 0.5m : baseRates;
        }

        private decimal GetEarlyWithdrawalPenalty(TermSavingsType termType)
        {
            return termType switch
            {
                TermSavingsType.ThreeMonths => 0.05m,     // 5%
                TermSavingsType.SixMonths => 0.075m,      // 7.5%
                TermSavingsType.TwelveMonths => 0.10m,    // 10%
                TermSavingsType.TwentyFourMonths => 0.15m, // 15%
                _ => 0.10m
            };
        }

        private string GetTermTypeLabel(TermSavingsType termType)
        {
            return termType switch
            {
                TermSavingsType.ThreeMonths => "3 Mois",
                TermSavingsType.SixMonths => "6 Mois",
                TermSavingsType.TwelveMonths => "12 Mois",
                TermSavingsType.TwentyFourMonths => "24 Mois",
                _ => "12 Mois"
            };
        }

        private async Task<TermSavingsAccountResponseDto> MapToResponseDto(TermSavingsAccount account)
        {
            var customer = await _context.SavingsCustomers.FindAsync(account.CustomerId);
            var branch = await _context.Branches.FindAsync(account.BranchId);

            return new TermSavingsAccountResponseDto
            {
                Id = account.Id,
                AccountNumber = account.AccountNumber,
                CustomerId = account.CustomerId,
                CustomerName = customer != null ? $"{customer.FirstName} {customer.LastName}" : string.Empty,
                CustomerPhone = customer?.PrimaryPhone ?? string.Empty,
                BranchId = account.BranchId,
                BranchName = branch?.Name ?? string.Empty,
                Currency = account.Currency,
                Balance = account.Balance,
                AvailableBalance = account.AvailableBalance,
                TermType = account.TermType,
                OpeningDate = account.OpeningDate,
                MaturityDate = account.MaturityDate,
                LastTransactionDate = account.LastTransactionDate,
                Status = account.Status,
                InterestRate = account.InterestRate,
                AccruedInterest = account.AccruedInterest,
                LastInterestCalculation = account.LastInterestCalculation,
                EarlyWithdrawalPenalty = account.EarlyWithdrawalPenalty,
                CreatedAt = account.CreatedAt,
                UpdatedAt = account.UpdatedAt,
                ClosedAt = account.ClosedAt,
                ClosedBy = account.ClosedBy,
                ClosureReason = account.ClosureReason
            };
        }
    }
}