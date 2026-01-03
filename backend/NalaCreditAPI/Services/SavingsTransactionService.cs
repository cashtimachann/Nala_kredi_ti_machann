using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs.Savings;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.Services.Savings
{
    public interface ISavingsTransactionService
    {
        Task<SavingsTransactionResponseDto> ProcessTransactionAsync(SavingsTransactionCreateDto dto, string userId);
        Task<SavingsTransferResponseDto> ProcessTransferAsync(SavingsTransferCreateDto dto, string userId);
        Task<SavingsTransactionResponseDto?> GetTransactionAsync(string transactionId);
        Task<SavingsTransactionListResponseDto> GetTransactionsAsync(SavingsTransactionFilterDto filter);
        Task<SavingsTransactionListResponseDto> GetAccountTransactionsAsync(string accountId, SavingsTransactionFilterDto filter);
        Task<SavingsTransactionReceiptDto> GenerateReceiptAsync(string transactionId);
        Task<bool> CancelTransactionAsync(string transactionId, string reason, string userId);
        Task<decimal> GetDailyTransactionTotalAsync(string accountId, SavingsTransactionType type, DateTime date);
        Task<decimal> GetMonthlyTransactionTotalAsync(string accountId, SavingsTransactionType type, DateTime date);
    }

    public class SavingsTransactionService : ISavingsTransactionService
    {
        private readonly ApplicationDbContext _context;

        public SavingsTransactionService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<SavingsTransactionResponseDto> ProcessTransactionAsync(SavingsTransactionCreateDto dto, string userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // 1. Récupérer et valider le compte
                var account = await _context.SavingsAccounts
                    .FirstOrDefaultAsync(a => a.AccountNumber == dto.AccountNumber)
                    ?? throw new ArgumentException("Numéro de compte invalide");

                if (account.Status != SavingsAccountStatus.Active)
                    throw new InvalidOperationException("Le compte n'est pas actif");

                // 2. Valider la transaction selon le type
                await ValidateTransactionAsync(account, dto);

                // 3. Créer la transaction
                var savingsTransaction = new SavingsTransaction
                {
                    Id = Guid.NewGuid().ToString(),
                    AccountId = account.Id,
                    AccountNumber = account.AccountNumber,
                    Type = dto.Type,
                    Amount = dto.Amount,
                    Currency = account.Currency,
                    BalanceBefore = account.Balance,
                    Description = dto.Description ?? GetDefaultDescription(dto.Type),
                    Reference = await GenerateReferenceAsync(dto.Type, account.AccountNumber),
                    ProcessedBy = userId,
                    BranchId = account.BranchId,
                    Status = SavingsTransactionStatus.Processing,
                    ProcessedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    CustomerSignature = dto.CustomerSignature,
                    ReceiptNumber = await GenerateReceiptNumberAsync(),
                    VerificationMethod = dto.VerificationMethod,
                    Notes = dto.Notes
                };

                // 4. Pas de frais pour les comptes d'épargne
                var fees = 0m; // Comptes d'épargne sans frais
                savingsTransaction.Fees = fees;

                // 5. Mettre à jour le solde du compte
                var balanceChange = dto.Type switch
                {
                    SavingsTransactionType.Deposit or SavingsTransactionType.Interest => dto.Amount,
                    SavingsTransactionType.Withdrawal or SavingsTransactionType.Fee => -dto.Amount, // Pas de frais
                    _ => throw new ArgumentException("Type de transaction non supporté")
                };

                account.Balance += balanceChange;
                // ✅ FIX: Respect blocked balance - Balance = AvailableBalance + BlockedBalance
                account.AvailableBalance = account.Balance - account.BlockedBalance;
                account.LastTransactionDate = DateTime.UtcNow;
                account.UpdatedAt = DateTime.UtcNow;

                savingsTransaction.BalanceAfter = account.Balance;
                savingsTransaction.Status = SavingsTransactionStatus.Completed;

                // 6. Sauvegarder
                _context.SavingsTransactions.Add(savingsTransaction);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return await GetTransactionAsync(savingsTransaction.Id)
                    ?? throw new InvalidOperationException("Impossible de récupérer la transaction créée");
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<SavingsTransferResponseDto> ProcessTransferAsync(SavingsTransferCreateDto dto, string userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // 1. Find both accounts
                var source = await _context.SavingsAccounts.FirstOrDefaultAsync(a => a.AccountNumber == dto.SourceAccountNumber)
                    ?? throw new ArgumentException("Numéro de compte source invalide");

                var destination = await _context.SavingsAccounts.FirstOrDefaultAsync(a => a.AccountNumber == dto.DestinationAccountNumber)
                    ?? throw new ArgumentException("Numéro de compte destinataire invalide");

                if (source.Id == destination.Id)
                    throw new ArgumentException("Le compte source et le compte destinataire ne peuvent pas être identiques");

                if (source.Status != SavingsAccountStatus.Active)
                    throw new InvalidOperationException("Le compte source n'est pas actif");

                if (destination.Status != SavingsAccountStatus.Active)
                    throw new InvalidOperationException("Le compte destinataire n'est pas actif");

                if (source.Currency != destination.Currency)
                    throw new InvalidOperationException("Les devises des comptes doivent correspondre pour un transfert");

                var today = DateTime.UtcNow.Date;

                // Reuse existing validation helpers
                var withdrawDto = new SavingsTransactionCreateDto
                {
                    AccountNumber = dto.SourceAccountNumber,
                    Type = SavingsTransactionType.Withdrawal,
                    Amount = dto.Amount,
                    CustomerPresent = dto.CustomerPresent,
                    VerificationMethod = dto.VerificationMethod,
                    Description = dto.Description,
                    CustomerSignature = dto.CustomerSignature,
                    Notes = dto.Notes
                };

                var depositDto = new SavingsTransactionCreateDto
                {
                    AccountNumber = dto.DestinationAccountNumber,
                    Type = SavingsTransactionType.Deposit,
                    Amount = dto.Amount,
                    CustomerPresent = dto.CustomerPresent,
                    VerificationMethod = dto.VerificationMethod,
                    Description = dto.Description,
                    CustomerSignature = dto.CustomerSignature,
                    Notes = dto.Notes
                };

                await ValidateWithdrawalAsync(source, withdrawDto, today);
                await ValidateDepositAsync(destination, depositDto, today);

                // Prepare transaction records (create IDs so we can cross-link)
                var sourceTxId = Guid.NewGuid().ToString();
                var destTxId = Guid.NewGuid().ToString();

                var sourceFees = 0m; // Pas de frais pour transferts entre comptes d'épargne

                var sourceTransaction = new SavingsTransaction
                {
                    Id = sourceTxId,
                    AccountId = source.Id,
                    AccountNumber = source.AccountNumber,
                    Type = SavingsTransactionType.Withdrawal,
                    Amount = dto.Amount,
                    Currency = source.Currency,
                    BalanceBefore = source.Balance,
                    Description = dto.Description ?? GetDefaultDescription(SavingsTransactionType.Withdrawal),
                    Reference = await GenerateReferenceAsync(SavingsTransactionType.Withdrawal, source.AccountNumber),
                    ProcessedBy = userId,
                    BranchId = source.BranchId,
                    Status = SavingsTransactionStatus.Processing,
                    ProcessedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    CustomerSignature = dto.CustomerSignature,
                    ReceiptNumber = await GenerateReceiptNumberAsync(),
                    VerificationMethod = dto.VerificationMethod,
                    Notes = dto.Notes,
                    Fees = sourceFees
                };

                var destTransaction = new SavingsTransaction
                {
                    Id = destTxId,
                    AccountId = destination.Id,
                    AccountNumber = destination.AccountNumber,
                    Type = SavingsTransactionType.Deposit,
                    Amount = dto.Amount,
                    Currency = destination.Currency,
                    BalanceBefore = destination.Balance,
                    Description = dto.Description ?? GetDefaultDescription(SavingsTransactionType.Deposit),
                    Reference = await GenerateReferenceAsync(SavingsTransactionType.Deposit, destination.AccountNumber),
                    ProcessedBy = userId,
                    BranchId = destination.BranchId,
                    Status = SavingsTransactionStatus.Processing,
                    ProcessedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    CustomerSignature = dto.CustomerSignature,
                    ReceiptNumber = await GenerateReceiptNumberAsync(),
                    VerificationMethod = dto.VerificationMethod,
                    Notes = dto.Notes,
                    Fees = 0m
                };

                // Update balances atomically
                var sourceBalanceChange = -dto.Amount; // Pas de frais
                source.Balance += sourceBalanceChange;
                source.AvailableBalance = source.Balance - source.BlockedBalance;
                source.LastTransactionDate = DateTime.UtcNow;
                source.UpdatedAt = DateTime.UtcNow;

                destTransaction.BalanceAfter = destination.Balance + dto.Amount;
                destination.Balance += dto.Amount;
                destination.AvailableBalance = destination.Balance - destination.BlockedBalance;
                destination.LastTransactionDate = DateTime.UtcNow;
                destination.UpdatedAt = DateTime.UtcNow;

                sourceTransaction.BalanceAfter = source.Balance;

                // assign cross referencing ids
                sourceTransaction.RelatedTransactionId = destTxId;
                destTransaction.RelatedTransactionId = sourceTxId;

                sourceTransaction.Status = SavingsTransactionStatus.Completed;
                destTransaction.Status = SavingsTransactionStatus.Completed;

                // Save both
                _context.SavingsTransactions.Add(sourceTransaction);
                _context.SavingsTransactions.Add(destTransaction);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return new SavingsTransferResponseDto
                {
                    SourceTransaction = await GetTransactionAsync(sourceTxId),
                    DestinationTransaction = await GetTransactionAsync(destTxId)
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<SavingsTransactionResponseDto?> GetTransactionAsync(string transactionId)
        {
            var transaction = await _context.SavingsTransactions
                .Include(t => t.Account)
                    .ThenInclude(a => a.Branch)
                .Include(t => t.ProcessedByUser)
                .FirstOrDefaultAsync(t => t.Id == transactionId);

            if (transaction == null) return null;

            return MapToResponseDto(transaction);
        }

        public async Task<SavingsTransactionListResponseDto> GetTransactionsAsync(SavingsTransactionFilterDto filter)
        {
            var query = _context.SavingsTransactions
                .Include(t => t.Account)
                .Include(t => t.ProcessedByUser)
                .AsQueryable();

            return await ApplyFiltersAndExecuteQuery(query, filter);
        }

        public async Task<SavingsTransactionListResponseDto> GetAccountTransactionsAsync(string accountId, SavingsTransactionFilterDto filter)
        {
            var query = _context.SavingsTransactions
                .Include(t => t.Account)
                .Include(t => t.ProcessedByUser)
                .Where(t => t.AccountId == accountId);

            return await ApplyFiltersAndExecuteQuery(query, filter);
        }

        public async Task<SavingsTransactionReceiptDto> GenerateReceiptAsync(string transactionId)
        {
            var transaction = await _context.SavingsTransactions
                .Include(t => t.Account)
                    .ThenInclude(a => a.Customer)
                .Include(t => t.Account)
                    .ThenInclude(a => a.Branch)
                .Include(t => t.ProcessedByUser)
                .FirstOrDefaultAsync(t => t.Id == transactionId)
                ?? throw new ArgumentException("Transaction introuvable");

            return new SavingsTransactionReceiptDto
            {
                TransactionId = transaction.Id,
                ReceiptNumber = transaction.ReceiptNumber ?? "N/A",
                AccountNumber = transaction.Account.AccountNumber,
                CustomerName = $"{transaction.Account.Customer.FirstName} {transaction.Account.Customer.LastName}",
                Type = transaction.Type,
                Amount = transaction.Amount,
                Currency = transaction.Currency,
                BalanceAfter = transaction.BalanceAfter,
                ProcessedAt = transaction.ProcessedAt,
                ProcessedBy = transaction.ProcessedByUser?.UserName ?? "System",
                BranchName = transaction.Account.Branch?.Name ?? "N/A",
                Signature = transaction.CustomerSignature
            };
        }

        public async Task<bool> CancelTransactionAsync(string transactionId, string reason, string userId)
        {
            var transaction = await _context.SavingsTransactions
                .Include(t => t.Account)
                .FirstOrDefaultAsync(t => t.Id == transactionId);

            if (transaction == null) return false;

            if (transaction.Status != SavingsTransactionStatus.Completed)
                throw new InvalidOperationException("Seules les transactions complétées peuvent être annulées");

            // Vérifier la limite de temps pour annulation (24h)
            if (transaction.ProcessedAt.AddHours(24) < DateTime.UtcNow)
                throw new InvalidOperationException("Impossible d'annuler une transaction de plus de 24h");

            using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Créer la transaction inverse
                var reversalTransaction = new SavingsTransaction
                {
                    Id = Guid.NewGuid().ToString(),
                    AccountId = transaction.AccountId,
                    Type = GetReversalType(transaction.Type),
                    Amount = transaction.Amount,
                    Currency = transaction.Currency,
                    BalanceBefore = transaction.Account.Balance,
                    Description = $"Annulation de {transaction.Reference} - {reason}",
                    Reference = $"REV-{transaction.Reference}",
                    ProcessedBy = userId,
                    BranchId = transaction.BranchId,
                    Status = SavingsTransactionStatus.Completed,
                    ProcessedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    RelatedTransactionId = transactionId,
                    ReceiptNumber = await GenerateReceiptNumberAsync(),
                    VerificationMethod = "Annulation administrative",
                    Notes = reason
                };

                // Inverser le solde
                var balanceChange = transaction.Type switch
                {
                    SavingsTransactionType.Deposit or SavingsTransactionType.Interest => -transaction.Amount,
                    SavingsTransactionType.Withdrawal or SavingsTransactionType.Fee => transaction.Amount + (transaction.Fees ?? 0),
                    _ => throw new ArgumentException("Type de transaction non supporté pour annulation")
                };

                transaction.Account.Balance += balanceChange;
                // ✅ FIX: Respect blocked balance - Balance = AvailableBalance + BlockedBalance
                transaction.Account.AvailableBalance = transaction.Account.Balance - transaction.Account.BlockedBalance;
                transaction.Account.UpdatedAt = DateTime.UtcNow;

                reversalTransaction.BalanceAfter = transaction.Account.Balance;

                // Marquer la transaction originale comme annulée
                transaction.Status = SavingsTransactionStatus.Cancelled;
                transaction.Notes = $"{transaction.Notes}\nANNULÉE: {reason} par {userId} le {DateTime.UtcNow:dd/MM/yyyy HH:mm}";

                _context.SavingsTransactions.Add(reversalTransaction);
                await _context.SaveChangesAsync();

                await dbTransaction.CommitAsync();
                return true;
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        public async Task<decimal> GetDailyTransactionTotalAsync(string accountId, SavingsTransactionType type, DateTime date)
        {
            var startOfDay = date.Date;
            var endOfDay = startOfDay.AddDays(1);

            // Use nullable decimal to avoid SUM on empty sequence returning null and causing exceptions
            var total = await _context.SavingsTransactions
                .Where(t => t.AccountId == accountId
                    && t.Type == type
                    && t.Status == SavingsTransactionStatus.Completed
                    && t.ProcessedAt >= startOfDay
                    && t.ProcessedAt < endOfDay)
                .Select(t => (decimal?)t.Amount)
                .SumAsync();

            return total ?? 0m;
        }

        public async Task<decimal> GetMonthlyTransactionTotalAsync(string accountId, SavingsTransactionType type, DateTime date)
        {
            var startOfMonth = DateTime.SpecifyKind(new DateTime(date.Year, date.Month, 1), DateTimeKind.Utc);
            var endOfMonth = startOfMonth.AddMonths(1);

            var total = await _context.SavingsTransactions
                .Where(t => t.AccountId == accountId
                    && t.Type == type
                    && t.Status == SavingsTransactionStatus.Completed
                    && t.ProcessedAt >= startOfMonth
                    && t.ProcessedAt < endOfMonth)
                .Select(t => (decimal?)t.Amount)
                .SumAsync();

            return total ?? 0m;
        }

        // Méthodes privées d'aide
        private async Task ValidateTransactionAsync(SavingsAccount account, SavingsTransactionCreateDto dto)
        {
            // Validation commune
            if (dto.Amount <= 0)
                throw new ArgumentException("Le montant doit être positif");

            var today = DateTime.UtcNow.Date;

            switch (dto.Type)
            {
                case SavingsTransactionType.Deposit:
                    await ValidateDepositAsync(account, dto, today);
                    break;

                case SavingsTransactionType.Withdrawal:
                    await ValidateWithdrawalAsync(account, dto, today);
                    break;

                default:
                    throw new ArgumentException("Type de transaction non autorisé pour traitement manuel");
            }
        }

        private async Task ValidateDepositAsync(SavingsAccount account, SavingsTransactionCreateDto dto, DateTime today)
        {
            // Vérifier la limite quotidienne de dépôt
            var dailyDeposits = await GetDailyTransactionTotalAsync(account.Id, SavingsTransactionType.Deposit, today);
            if (dailyDeposits + dto.Amount > account.DailyDepositLimit)
                throw new InvalidOperationException($"Limite quotidienne de dépôt dépassée. Limite: {account.DailyDepositLimit:C}");

            // Vérifier le solde maximum
            if (account.Balance + dto.Amount > account.MaxBalance)
                throw new InvalidOperationException($"Solde maximum dépassé. Limite: {account.MaxBalance:C}");
        }

        private async Task ValidateWithdrawalAsync(SavingsAccount account, SavingsTransactionCreateDto dto, DateTime today)
        {
            var fees = CalculateFees(SavingsTransactionType.Withdrawal, dto.Amount, account.Currency);
            var totalAmount = dto.Amount + fees;

            // Vérifier le solde disponible
            if (account.AvailableBalance < totalAmount)
                throw new InvalidOperationException("Solde insuffisant");

            // Vérifier le solde minimum
            if (account.Balance - totalAmount < account.MinimumBalance)
                throw new InvalidOperationException($"Transaction refusée - solde minimum requis: {account.MinimumBalance:C}");

            // Vérifier les limites de montant
            if (dto.Amount < account.MinWithdrawalAmount)
                throw new InvalidOperationException($"Montant minimum de retrait: {account.MinWithdrawalAmount:C}");

            if (dto.Amount > account.MaxWithdrawalAmount)
                throw new InvalidOperationException($"Montant maximum de retrait: {account.MaxWithdrawalAmount:C}");

            // Limites de retrait désactivées - pas de restriction quotidienne ou mensuelle
        }

        private static decimal CalculateFees(SavingsTransactionType type, decimal amount, SavingsCurrency currency)
        {
            // Comptes d'épargne sans frais - toujours retourner 0
            return 0m;
        }

        private static SavingsTransactionType GetReversalType(SavingsTransactionType originalType)
        {
            return originalType switch
            {
                SavingsTransactionType.Deposit => SavingsTransactionType.Withdrawal,
                SavingsTransactionType.Withdrawal => SavingsTransactionType.Deposit,
                SavingsTransactionType.Interest => SavingsTransactionType.Fee,
                SavingsTransactionType.Fee => SavingsTransactionType.Deposit,
                _ => throw new ArgumentException("Type de transaction non réversible")
            };
        }

        private static string GetDefaultDescription(SavingsTransactionType type)
        {
            return type switch
            {
                SavingsTransactionType.Deposit => "Dépôt en espèces",
                SavingsTransactionType.Withdrawal => "Retrait en espèces",
                SavingsTransactionType.Interest => "Intérêts créditeurs",
                SavingsTransactionType.Fee => "Frais bancaires",
                _ => "Transaction"
            };
        }

    private Task<string> GenerateReferenceAsync(SavingsTransactionType type, string accountNumber)
        {
            var prefix = type switch
            {
                SavingsTransactionType.Deposit => "DEP",
                SavingsTransactionType.Withdrawal => "WDL",
                SavingsTransactionType.Interest => "INT",
                SavingsTransactionType.Fee => "FEE",
                _ => "TXN"
            };

            var dateStr = DateTime.UtcNow.ToString("yyyyMMdd");
            var timeStr = DateTime.UtcNow.ToString("HHmmss");
            var accountSuffix = accountNumber.Substring(Math.Max(0, accountNumber.Length - 4));
            
            return Task.FromResult($"{prefix}-{dateStr}-{timeStr}-{accountSuffix}");
        }

        private async Task<string> GenerateReceiptNumberAsync()
        {
            var today = DateTime.UtcNow.ToString("yyyyMMdd");
            var count = await _context.SavingsTransactions
                .CountAsync(t => t.CreatedAt.Date == DateTime.UtcNow.Date) + 1;
            
            return $"RCT-{today}-{count:D6}";
        }

        private async Task<SavingsTransactionListResponseDto> ApplyFiltersAndExecuteQuery(
            IQueryable<SavingsTransaction> query, 
            SavingsTransactionFilterDto filter)
        {
            // Appliquer les filtres
            if (!string.IsNullOrEmpty(filter.AccountId))
                query = query.Where(t => t.AccountId == filter.AccountId);

            if (filter.Type.HasValue)
                query = query.Where(t => t.Type == filter.Type.Value);

            if (filter.Status.HasValue)
                query = query.Where(t => t.Status == filter.Status.Value);

            // Normalize date bounds to UTC to satisfy Npgsql timestamptz requirements
            DateTime? dateFromUtc = null;
            DateTime? dateToUtc = null;
            if (filter.DateFrom.HasValue)
            {
                var df = filter.DateFrom.Value;
                dateFromUtc = df.Kind == DateTimeKind.Utc ? df : DateTime.SpecifyKind(df, DateTimeKind.Utc);
                query = query.Where(t => t.ProcessedAt >= dateFromUtc.Value);
            }

            if (filter.DateTo.HasValue)
            {
                var dt = filter.DateTo.Value;
                dateToUtc = dt.Kind == DateTimeKind.Utc ? dt : DateTime.SpecifyKind(dt, DateTimeKind.Utc);
                var exclusiveEnd = dateToUtc.Value.AddDays(1); // end is exclusive of next day midnight
                query = query.Where(t => t.ProcessedAt < exclusiveEnd);
            }

            if (filter.MinAmount.HasValue)
                query = query.Where(t => t.Amount >= filter.MinAmount.Value);

            if (filter.MaxAmount.HasValue)
                query = query.Where(t => t.Amount <= filter.MaxAmount.Value);

            if (filter.BranchId.HasValue)
                query = query.Where(t => t.BranchId == filter.BranchId.Value);

            // Tri
            query = filter.SortBy?.ToLower() switch
            {
                "amount" => filter.SortDirection == "desc" 
                    ? query.OrderByDescending(t => t.Amount)
                    : query.OrderBy(t => t.Amount),
                "type" => filter.SortDirection == "desc"
                    ? query.OrderByDescending(t => t.Type)
                    : query.OrderBy(t => t.Type),
                "processedat" => filter.SortDirection == "asc"
                    ? query.OrderBy(t => t.ProcessedAt)
                    : query.OrderByDescending(t => t.ProcessedAt),
                _ => query.OrderByDescending(t => t.ProcessedAt)
            };

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(totalCount / (double)filter.PageSize);

            var transactions = await query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            var summary = await GenerateTransactionSummaryAsync(query);

            return new SavingsTransactionListResponseDto
            {
                Transactions = transactions.Select(MapToResponseDto).ToList(),
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = totalPages,
                Summary = summary
            };
        }

        private async Task<SavingsTransactionSummaryDto> GenerateTransactionSummaryAsync(IQueryable<SavingsTransaction> query)
        {
            var completedQuery = query.Where(t => t.Status == SavingsTransactionStatus.Completed);

            var totalTransactions = await completedQuery.CountAsync();
            var totalDeposits = await completedQuery.CountAsync(t => t.Type == SavingsTransactionType.Deposit);
            var totalWithdrawals = await completedQuery.CountAsync(t => t.Type == SavingsTransactionType.Withdrawal);

            var totalVolume = await completedQuery.SumAsync(t => t.Amount);
            var averageTransaction = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

            var transactionsByType = await completedQuery
                .GroupBy(t => t.Type)
                .Select(g => new { Type = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Type.ToString(), x => x.Count);

            // Perform date formatting client-side/in-memory to avoid provider translation issues
            var dailyVolumeRaw = await completedQuery
                .GroupBy(t => t.ProcessedAt.Date)
                .Select(g => new { Date = g.Key, Volume = g.Sum(x => x.Amount) })
                .ToListAsync();

            var dailyVolume = dailyVolumeRaw
                .ToDictionary(x => x.Date.ToString("yyyy-MM-dd"), x => x.Volume);

            return new SavingsTransactionSummaryDto
            {
                TotalTransactions = totalTransactions,
                TotalDeposits = totalDeposits,
                TotalWithdrawals = totalWithdrawals,
                TotalVolume = totalVolume,
                AverageTransaction = averageTransaction,
                TransactionsByType = transactionsByType,
                DailyVolume = dailyVolume
            };
        }

        private SavingsTransactionResponseDto MapToResponseDto(SavingsTransaction transaction)
        {
            return new SavingsTransactionResponseDto
            {
                Id = transaction.Id,
                AccountId = transaction.AccountId,
                AccountNumber = transaction.Account?.AccountNumber ?? "N/A",
                Type = transaction.Type,
                Amount = transaction.Amount,
                Currency = transaction.Currency,
                BalanceBefore = transaction.BalanceBefore,
                BalanceAfter = transaction.BalanceAfter,
                Description = transaction.Description,
                Reference = transaction.Reference,
                ProcessedBy = transaction.ProcessedBy,
                ProcessedByName = transaction.ProcessedByUser?.UserName,
                BranchId = transaction.BranchId,
                BranchName = transaction.Account?.Branch?.Name,
                Status = transaction.Status,
                ProcessedAt = transaction.ProcessedAt,
                CreatedAt = transaction.CreatedAt,
                Fees = transaction.Fees,
                ExchangeRate = transaction.ExchangeRate,
                RelatedTransactionId = transaction.RelatedTransactionId,
                CustomerSignature = transaction.CustomerSignature,
                ReceiptNumber = transaction.ReceiptNumber,
                VerificationMethod = transaction.VerificationMethod,
                Notes = transaction.Notes
            };
        }
    }
}