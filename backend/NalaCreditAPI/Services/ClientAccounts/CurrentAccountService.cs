using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs.ClientAccounts;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.Services.ClientAccounts
{
    public interface ICurrentAccountService
    {
        Task<CurrentAccountResponseDto> OpenAccountAsync(CurrentAccountOpeningDto dto, string userId);
        Task<CurrentAccountResponseDto?> GetAccountAsync(string id);
        Task<CurrentAccountResponseDto?> GetAccountByNumberAsync(string accountNumber);
        Task<CurrentAccountListResponseDto> GetAccountsAsync(CurrentAccountFilterDto filter);
        Task<CurrentAccountResponseDto> UpdateAccountAsync(string id, CurrentAccountUpdateDto dto, string userId);
        Task<CurrentAccountResponseDto> UpdateAccountStatusAsync(string id, bool isActive, string userId);
        Task<bool> CloseAccountAsync(string id, string reason, string userId);
        Task<ClientAccountBalanceDto> GetBalanceAsync(string accountNumber);
        Task<CurrentAccountStatisticsDto> GetStatisticsAsync();
        Task<CurrentAccountTransactionResponseDto> ProcessTransactionAsync(CurrentAccountTransactionRequestDto dto, string userId);
        Task<CurrentAccountTransferResponseDto> ProcessTransferAsync(CurrentAccountTransferRequestDto dto, string userId);
        Task<bool> CancelTransactionAsync(string transactionId, string reason, string userId);
    }

    public class CurrentAccountService : ICurrentAccountService
    {
        private readonly ApplicationDbContext _context;

        public CurrentAccountService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<CurrentAccountResponseDto> OpenAccountAsync(CurrentAccountOpeningDto dto, string userId)
        {
            // Vérifier que le client existe
            var customer = await _context.SavingsCustomers.FindAsync(dto.CustomerId);
            if (customer == null)
                throw new ArgumentException("Client introuvable");

            // Vérifier qu'un compte courant avec cette devise n'existe pas déjà pour ce client
            var existingAccount = await _context.CurrentAccounts
                .FirstOrDefaultAsync(ca => ca.CustomerId == dto.CustomerId &&
                                         ca.Currency == dto.Currency &&
                                         ca.Status == ClientAccountStatus.Active);

            if (existingAccount != null)
            {
                var currencyName = dto.Currency == ClientCurrency.HTG ? "HTG" : "USD";
                throw new InvalidOperationException($"Le client possède déjà un compte courant en {currencyName}. Un client ne peut avoir qu'un seul compte par devise.");
            }

            // Générer le numéro de compte selon la devise: G + 11 chiffres (HTG) ou D + 11 chiffres (USD)
            var accountNumber = await GenerateAccountNumber(dto.Currency);

            var account = new CurrentAccount
            {
                AccountNumber = accountNumber,
                CustomerId = dto.CustomerId,
                BranchId = dto.BranchId,
                Currency = dto.Currency,
                Balance = dto.InitialDeposit,
                AvailableBalance = dto.InitialDeposit,
                MinimumBalance = dto.MinimumBalance ?? GetDefaultMinimumBalance(dto.Currency),
                DailyWithdrawalLimit = dto.DailyWithdrawalLimit ?? GetDefaultDailyWithdrawalLimit(dto.Currency),
                MonthlyWithdrawalLimit = dto.MonthlyWithdrawalLimit ?? GetDefaultMonthlyWithdrawalLimit(dto.Currency),
                DailyDepositLimit = dto.DailyDepositLimit ?? GetDefaultDailyDepositLimit(dto.Currency),
                OverdraftLimit = dto.OverdraftLimit ?? 0,
                OpeningDate = DateTime.UtcNow,
                // Security/KYC
                PinHash = string.IsNullOrWhiteSpace(dto.Pin) ? null : HashSecret(dto.Pin.Trim()),
                SecurityQuestion = string.IsNullOrWhiteSpace(dto.SecurityQuestion) ? null : dto.SecurityQuestion.Trim(),
                SecurityAnswerHash = string.IsNullOrWhiteSpace(dto.SecurityAnswer) ? null : HashSecret(dto.SecurityAnswer.Trim()),
                DepositMethod = string.IsNullOrWhiteSpace(dto.DepositMethod) ? null : dto.DepositMethod.Trim(),
                OriginOfFunds = string.IsNullOrWhiteSpace(dto.OriginOfFunds) ? null : dto.OriginOfFunds.Trim(),
                TransactionFrequency = string.IsNullOrWhiteSpace(dto.TransactionFrequency) ? null : dto.TransactionFrequency.Trim(),
                AccountPurpose = string.IsNullOrWhiteSpace(dto.AccountPurpose) ? null : dto.AccountPurpose.Trim()
            };

            _context.CurrentAccounts.Add(account);
            await _context.SaveChangesAsync();

            // Ajouter les signataires autorisés s'ils existent
            if (dto.AuthorizedSigners != null && dto.AuthorizedSigners.Count > 0)
            {
                foreach (var s in dto.AuthorizedSigners)
                {
                    var signer = new CurrentAccountAuthorizedSigner
                    {
                        AccountId = account.Id,
                        FullName = s.FullName.Trim(),
                        Role = string.IsNullOrWhiteSpace(s.Role) ? null : s.Role.Trim(),
                        DocumentType = s.DocumentType,
                        DocumentNumber = string.IsNullOrWhiteSpace(s.DocumentNumber) ? null : s.DocumentNumber.Trim().ToUpper(),
                        Phone = string.IsNullOrWhiteSpace(s.Phone) ? null : NormalizePhoneNumber(s.Phone),
                        RelationshipToCustomer = string.IsNullOrWhiteSpace(s.RelationshipToCustomer) ? null : s.RelationshipToCustomer.Trim(),
                        Address = string.IsNullOrWhiteSpace(s.Address) ? null : s.Address.Trim(),
                        AuthorizationLimit = s.AuthorizationLimit,
                        Signature = s.Signature,
                        PhotoUrl = s.PhotoUrl,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CurrentAccountAuthorizedSigners.Add(signer);
                }
                await _context.SaveChangesAsync();
            }

            // Créer la transaction d'ouverture
            var transaction = new CurrentAccountTransaction
            {
                AccountId = account.Id,
                AccountNumber = account.AccountNumber,
                Type = SavingsTransactionType.Deposit,
                Amount = dto.InitialDeposit,
                Currency = dto.Currency,
                BalanceBefore = 0,
                BalanceAfter = dto.InitialDeposit,
                Description = "Dépôt initial - Ouverture de compte",
                Reference = $"OPEN-{account.AccountNumber}",
                ProcessedBy = userId,
                BranchId = dto.BranchId,
                ProcessedAt = DateTime.UtcNow
            };

            _context.CurrentAccountTransactions.Add(transaction);
            await _context.SaveChangesAsync();

            return await MapToResponseDto(account);
        }

        public async Task<CurrentAccountTransactionResponseDto> ProcessTransactionAsync(CurrentAccountTransactionRequestDto dto, string userId)
        {
            if (dto.Amount <= 0) throw new ArgumentException("Montant invalide");
            var account = await _context.CurrentAccounts.FirstOrDefaultAsync(a => a.AccountNumber == dto.AccountNumber);
            if (account == null) throw new ArgumentException("Compte introuvable");
            if (account.Status != ClientAccountStatus.Active) throw new InvalidOperationException("Compte inactif ou fermé");
            if (account.Currency != dto.Currency) throw new InvalidOperationException("Devise du compte et de la transaction ne correspondent pas");

            var now = DateTime.UtcNow;
            var balanceBefore = account.Balance;
            decimal balanceAfter;

            switch (dto.Type)
            {
                case SavingsTransactionType.Deposit:
                    balanceAfter = balanceBefore + dto.Amount;
                    account.Balance = balanceAfter;
                    account.AvailableBalance = balanceAfter;
                    break;
                case SavingsTransactionType.Withdrawal:
                    balanceAfter = balanceBefore - dto.Amount;
                    // Règles: si découvert autorisé (OverdraftLimit>0), autoriser jusqu'à -OverdraftLimit, sinon respecter MinimumBalance
                    if (account.OverdraftLimit > 0)
                    {
                        if (balanceAfter < -account.OverdraftLimit)
                            throw new InvalidOperationException("Fonds insuffisants (limite de découvert dépassée)");
                    }
                    else
                    {
                        if (balanceAfter < account.MinimumBalance)
                            throw new InvalidOperationException("Fonds insuffisants (solde minimal requis)");
                    }
                    account.Balance = balanceAfter;
                    account.AvailableBalance = balanceAfter;
                    break;
                default:
                    throw new ArgumentException("Type de transaction non supporté");
            }

            var tx = new CurrentAccountTransaction
            {
                AccountId = account.Id,
                AccountNumber = account.AccountNumber,
                Type = dto.Type,
                Amount = dto.Amount,
                Currency = dto.Currency,
                BalanceBefore = balanceBefore,
                BalanceAfter = balanceAfter,
                Description = string.IsNullOrWhiteSpace(dto.Description)
                    ? (dto.Type == SavingsTransactionType.Deposit ? "Dépôt compte courant" : "Retrait compte courant")
                    : dto.Description!,
                Reference = $"CACC-{(dto.Type == SavingsTransactionType.Deposit ? "DEP" : "WDR")}-{now:yyyyMMddHHmmssfff}",
                ProcessedBy = userId,
                BranchId = account.BranchId,
                Status = SavingsTransactionStatus.Completed,
                ProcessedAt = now,
                CreatedAt = now,
                Fees = null,
                ExchangeRate = null
            };

            account.LastTransactionDate = now;
            account.UpdatedAt = now;

            _context.CurrentAccountTransactions.Add(tx);
            await _context.SaveChangesAsync();

            // Map to response dto
            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == tx.BranchId);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

            return new CurrentAccountTransactionResponseDto
            {
                Id = tx.Id,
                AccountId = tx.AccountId,
                AccountNumber = tx.AccountNumber,
                Type = tx.Type,
                Amount = tx.Amount,
                Currency = tx.Currency,
                BalanceBefore = tx.BalanceBefore,
                BalanceAfter = tx.BalanceAfter,
                Description = tx.Description,
                Reference = tx.Reference,
                ProcessedBy = tx.ProcessedBy,
                ProcessedByName = user != null ? ($"{user.FirstName} {user.LastName}") : null,
                BranchId = tx.BranchId,
                BranchName = branch?.Name,
                Status = tx.Status,
                ProcessedAt = tx.ProcessedAt,
                CreatedAt = tx.CreatedAt,
                Fees = tx.Fees,
                ExchangeRate = tx.ExchangeRate
            };
        }

        public async Task<CurrentAccountTransferResponseDto> ProcessTransferAsync(CurrentAccountTransferRequestDto dto, string userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (dto.Amount <= 0) throw new ArgumentException("Montant invalide");

                var source = await _context.CurrentAccounts.FirstOrDefaultAsync(a => a.AccountNumber == dto.SourceAccountNumber)
                    ?? throw new ArgumentException("Numéro de compte source invalide");

                var destination = await _context.CurrentAccounts.FirstOrDefaultAsync(a => a.AccountNumber == dto.DestinationAccountNumber)
                    ?? throw new ArgumentException("Numéro de compte destinataire invalide");

                if (source.Id == destination.Id) throw new ArgumentException("Le compte source et le compte destinataire ne peuvent pas être identiques");

                if (source.Status != ClientAccountStatus.Active) throw new InvalidOperationException("Le compte source n'est pas actif");
                if (destination.Status != ClientAccountStatus.Active) throw new InvalidOperationException("Le compte destinataire n'est pas actif");

                if (source.Currency != destination.Currency) throw new InvalidOperationException("Les devises des comptes doivent correspondre pour un transfert");

                // Validate withdrawal rules for source
                // reuse existing logic from ProcessTransactionAsync
                var balanceBeforeSource = source.Balance;
                var afterSource = balanceBeforeSource - dto.Amount;
                if (source.OverdraftLimit > 0)
                {
                    if (afterSource < -source.OverdraftLimit) throw new InvalidOperationException("Fonds insuffisants (limite de découvert dépassée)");
                }
                else
                {
                    if (afterSource < source.MinimumBalance) throw new InvalidOperationException("Fonds insuffisants (solde minimal requis)");
                }

                // Build transaction entries and IDs
                var sourceTxId = Guid.NewGuid().ToString();
                var destTxId = Guid.NewGuid().ToString();

                var now = DateTime.UtcNow;

                var sourceTx = new CurrentAccountTransaction
                {
                    Id = sourceTxId,
                    AccountId = source.Id,
                    AccountNumber = source.AccountNumber,
                    Type = SavingsTransactionType.Withdrawal,
                    Amount = dto.Amount,
                    Currency = source.Currency,
                    BalanceBefore = source.Balance,
                    Description = string.IsNullOrWhiteSpace(dto.Description) ? "Transfert sortie" : dto.Description!,
                    Reference = $"CACC-WDR-{now:yyyyMMddHHmmssfff}",
                    ProcessedBy = userId,
                    BranchId = source.BranchId,
                    Status = SavingsTransactionStatus.Processing,
                    ProcessedAt = now,
                    CreatedAt = now,
                };

                var destTx = new CurrentAccountTransaction
                {
                    Id = destTxId,
                    AccountId = destination.Id,
                    AccountNumber = destination.AccountNumber,
                    Type = SavingsTransactionType.Deposit,
                    Amount = dto.Amount,
                    Currency = destination.Currency,
                    BalanceBefore = destination.Balance,
                    Description = string.IsNullOrWhiteSpace(dto.Description) ? "Transfert entrée" : dto.Description!,
                    Reference = $"CACC-DEP-{now:yyyyMMddHHmmssfff}",
                    ProcessedBy = userId,
                    BranchId = destination.BranchId,
                    Status = SavingsTransactionStatus.Processing,
                    ProcessedAt = now,
                    CreatedAt = now,
                };

                // Update balances
                source.Balance = source.Balance - dto.Amount;
                source.AvailableBalance = source.Balance;
                source.LastTransactionDate = now;
                source.UpdatedAt = now;

                destTx.BalanceAfter = destination.Balance + dto.Amount;
                destination.Balance = destination.Balance + dto.Amount;
                destination.AvailableBalance = destination.Balance;
                destination.LastTransactionDate = now;
                destination.UpdatedAt = now;

                sourceTx.BalanceAfter = source.Balance;

                // Cross-link
                sourceTx.RelatedTransactionId = destTxId;
                destTx.RelatedTransactionId = sourceTxId;

                sourceTx.Status = SavingsTransactionStatus.Completed;
                destTx.Status = SavingsTransactionStatus.Completed;

                _context.CurrentAccountTransactions.Add(sourceTx);
                _context.CurrentAccountTransactions.Add(destTx);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                // Map to response DTOs
                var branch1 = await _context.Branches.FirstOrDefaultAsync(b => b.Id == sourceTx.BranchId);
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
                var branch2 = await _context.Branches.FirstOrDefaultAsync(b => b.Id == destTx.BranchId);

                var srcDto = new CurrentAccountTransactionResponseDto
                {
                    Id = sourceTx.Id,
                    AccountId = sourceTx.AccountId,
                    AccountNumber = sourceTx.AccountNumber,
                    Type = sourceTx.Type,
                    Amount = sourceTx.Amount,
                    Currency = sourceTx.Currency,
                    BalanceBefore = sourceTx.BalanceBefore,
                    BalanceAfter = sourceTx.BalanceAfter,
                    Description = sourceTx.Description,
                    Reference = sourceTx.Reference,
                    ProcessedBy = sourceTx.ProcessedBy,
                    ProcessedByName = user != null ? ($"{user.FirstName} {user.LastName}") : null,
                    BranchId = sourceTx.BranchId,
                    BranchName = branch1?.Name,
                    Status = sourceTx.Status,
                    ProcessedAt = sourceTx.ProcessedAt,
                    CreatedAt = sourceTx.CreatedAt,
                    Fees = sourceTx.Fees,
                    ExchangeRate = sourceTx.ExchangeRate
                };

                var dstDto = new CurrentAccountTransactionResponseDto
                {
                    Id = destTx.Id,
                    AccountId = destTx.AccountId,
                    AccountNumber = destTx.AccountNumber,
                    Type = destTx.Type,
                    Amount = destTx.Amount,
                    Currency = destTx.Currency,
                    BalanceBefore = destTx.BalanceBefore,
                    BalanceAfter = destTx.BalanceAfter,
                    Description = destTx.Description,
                    Reference = destTx.Reference,
                    ProcessedBy = destTx.ProcessedBy,
                    ProcessedByName = user != null ? ($"{user.FirstName} {user.LastName}") : null,
                    BranchId = destTx.BranchId,
                    BranchName = branch2?.Name,
                    Status = destTx.Status,
                    ProcessedAt = destTx.ProcessedAt,
                    CreatedAt = destTx.CreatedAt,
                    Fees = destTx.Fees,
                    ExchangeRate = destTx.ExchangeRate
                };

                return new CurrentAccountTransferResponseDto
                {
                    SourceTransaction = srcDto,
                    DestinationTransaction = dstDto
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> CancelTransactionAsync(string transactionId, string reason, string userId)
        {
            var transaction = await _context.CurrentAccountTransactions
                .Include(t => t.Account)
                .FirstOrDefaultAsync(t => t.Id == transactionId);

            if (transaction == null)
                throw new ArgumentException("Transaction introuvable");

            if (transaction.Status == SavingsTransactionStatus.Cancelled)
                throw new InvalidOperationException("Transaction déjà annulée");

            if (transaction.Status != SavingsTransactionStatus.Completed)
                throw new InvalidOperationException("Seules les transactions complétées peuvent être annulées");

            var account = transaction.Account;
            if (account == null)
                throw new InvalidOperationException("Compte associé introuvable");

            // Build reversal transaction so history shows an explicit opposite entry
            var now = DateTime.UtcNow;
            var balanceBefore = account.Balance;

            // Determine opposite type and resulting balance
            SavingsTransactionType reversalType;
            decimal balanceAfter;
            if (transaction.Type == SavingsTransactionType.Deposit)
            {
                reversalType = SavingsTransactionType.Withdrawal;
                balanceAfter = balanceBefore - transaction.Amount;
            }
            else if (transaction.Type == SavingsTransactionType.Withdrawal)
            {
                reversalType = SavingsTransactionType.Deposit;
                balanceAfter = balanceBefore + transaction.Amount;
            }
            else
            {
                throw new InvalidOperationException("Type de transaction non supporté pour annulation");
            }

            // Update account balances
            account.Balance = balanceAfter;
            account.AvailableBalance = balanceAfter;
            account.LastTransactionDate = now;
            account.UpdatedAt = now;

            // Generate a human-friendly reversal reference like REV-DEP-YYYYMMDD-HHMMSS-####
            var kind = transaction.Type == SavingsTransactionType.Deposit ? "DEP" : "WDR";
            var rand = System.Security.Cryptography.RandomNumberGenerator.GetInt32(1000, 9999);
            var reversalRef = $"REV-{kind}-{now:yyyyMMdd}-{now:HHmmss}-{rand}";

            // Create reversal transaction entry
            var reversalTx = new CurrentAccountTransaction
            {
                AccountId = account.Id,
                AccountNumber = account.AccountNumber,
                Type = reversalType,
                Amount = transaction.Amount,
                Currency = account.Currency,
                BalanceBefore = balanceBefore,
                BalanceAfter = balanceAfter,
                Description = transaction.Type == SavingsTransactionType.Deposit
                    ? $"Annulation de dépôt - Réf. {transaction.Reference}"
                    : $"Annulation de retrait - Réf. {transaction.Reference}",
                Reference = reversalRef,
                ProcessedBy = userId,
                BranchId = account.BranchId,
                Status = SavingsTransactionStatus.Completed,
                ProcessedAt = now,
                CreatedAt = now,
                Fees = null,
                ExchangeRate = null
            };

            _context.CurrentAccountTransactions.Add(reversalTx);

            // Mark original transaction as cancelled (keep original reference and details)
            transaction.Status = SavingsTransactionStatus.Cancelled;
            transaction.Description = string.IsNullOrWhiteSpace(reason)
                ? $"{transaction.Description} [ANNULÉE]"
                : $"{transaction.Description} [ANNULÉE: {reason}]";

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<CurrentAccountResponseDto?> GetAccountAsync(string id)
        {
            var account = await _context.CurrentAccounts
                .Include(a => a.Customer)
                .Include(a => a.Branch)
                .FirstOrDefaultAsync(a => a.Id == id);

            return account != null ? await MapToResponseDto(account) : null;
        }

        public async Task<CurrentAccountResponseDto?> GetAccountByNumberAsync(string accountNumber)
        {
            var account = await _context.CurrentAccounts
                .Include(a => a.Customer)
                .Include(a => a.Branch)
                .FirstOrDefaultAsync(a => a.AccountNumber == accountNumber);

            return account != null ? await MapToResponseDto(account) : null;
        }

        public async Task<CurrentAccountListResponseDto> GetAccountsAsync(CurrentAccountFilterDto filter)
        {
            var query = _context.CurrentAccounts
                .Include(a => a.Customer)
                .Include(a => a.Branch)
                .AsQueryable();

            // Sanitize pagination parameters to avoid invalid Skip/Take operations
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

            // Clamp page to available range (keep at least 1 when no data)
            var totalPages = pageSize > 0 ? (int)Math.Ceiling((double)totalCount / pageSize) : 0;
            var page = totalPages == 0 ? 1 : Math.Min(requestedPage, totalPages);

            // Apply deterministic sorting with a whitelist of supported columns
            var sortBy = string.IsNullOrWhiteSpace(filter.SortBy) ? "AccountNumber" : filter.SortBy.Trim();
            var sortDescending = string.Equals(filter.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);

            query = sortBy switch
            {
                var s when s.Equals("Balance", StringComparison.OrdinalIgnoreCase)
                    => sortDescending ? query.OrderByDescending(a => a.Balance) : query.OrderBy(a => a.Balance),
                var s when s.Equals("OpeningDate", StringComparison.OrdinalIgnoreCase)
                    => sortDescending ? query.OrderByDescending(a => a.OpeningDate) : query.OrderBy(a => a.OpeningDate),
                var s when s.Equals("LastTransactionDate", StringComparison.OrdinalIgnoreCase)
                    => sortDescending
                        ? query.OrderByDescending(a => a.LastTransactionDate ?? a.OpeningDate)
                        : query.OrderBy(a => a.LastTransactionDate ?? a.OpeningDate),
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
                var s when s.Equals("BranchId", StringComparison.OrdinalIgnoreCase)
                    => sortDescending ? query.OrderByDescending(a => a.BranchId) : query.OrderBy(a => a.BranchId),
                var s when s.Equals("Currency", StringComparison.OrdinalIgnoreCase)
                    => sortDescending ? query.OrderByDescending(a => a.Currency) : query.OrderBy(a => a.Currency),
                _
                    => sortDescending ? query.OrderByDescending(a => a.AccountNumber) : query.OrderBy(a => a.AccountNumber)
            };

            // Apply pagination
            var accounts = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var accountDtos = new List<CurrentAccountResponseDto>();
            foreach (var account in accounts)
            {
                accountDtos.Add(await MapToResponseDto(account));
            }

            return new CurrentAccountListResponseDto
            {
                Accounts = accountDtos,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages,
                Statistics = await GetStatisticsAsync()
            };
        }

        public async Task<CurrentAccountResponseDto> UpdateAccountAsync(string id, CurrentAccountUpdateDto dto, string userId)
        {
            var account = await _context.CurrentAccounts.FindAsync(id);
            if (account == null)
                throw new ArgumentException("Compte introuvable");

            account.Status = dto.Status;
            if (dto.MinimumBalance.HasValue) account.MinimumBalance = dto.MinimumBalance.Value;
            if (dto.DailyWithdrawalLimit.HasValue) account.DailyWithdrawalLimit = dto.DailyWithdrawalLimit.Value;
            if (dto.MonthlyWithdrawalLimit.HasValue) account.MonthlyWithdrawalLimit = dto.MonthlyWithdrawalLimit.Value;
            if (dto.DailyDepositLimit.HasValue) account.DailyDepositLimit = dto.DailyDepositLimit.Value;
            if (dto.OverdraftLimit.HasValue) account.OverdraftLimit = dto.OverdraftLimit.Value;
            account.UpdatedAt = DateTime.UtcNow;

            // Update authorized signers if provided
            if (dto.AuthorizedSigners != null)
            {
                // Remove existing signers
                var existingSigners = await _context.CurrentAccountAuthorizedSigners
                    .Where(s => s.AccountId == id)
                    .ToListAsync();
                _context.CurrentAccountAuthorizedSigners.RemoveRange(existingSigners);

                // Add new signers
                foreach (var signerDto in dto.AuthorizedSigners)
                {
                    if (string.IsNullOrWhiteSpace(signerDto.FullName) || string.IsNullOrWhiteSpace(signerDto.DocumentNumber))
                        continue; // Skip invalid signers

                    var signer = new CurrentAccountAuthorizedSigner
                    {
                        Id = Guid.NewGuid().ToString(),
                        AccountId = id,
                        FullName = signerDto.FullName.Trim(),
                        Role = string.IsNullOrWhiteSpace(signerDto.Role) ? null : signerDto.Role.Trim(),
                        DocumentType = signerDto.DocumentType,
                        DocumentNumber = signerDto.DocumentNumber.Trim(),
                        Phone = string.IsNullOrWhiteSpace(signerDto.Phone) ? null : signerDto.Phone.Trim(),
                        RelationshipToCustomer = string.IsNullOrWhiteSpace(signerDto.RelationshipToCustomer) ? null : signerDto.RelationshipToCustomer.Trim(),
                        Address = string.IsNullOrWhiteSpace(signerDto.Address) ? null : signerDto.Address.Trim(),
                        AuthorizationLimit = signerDto.AuthorizationLimit,
                        Signature = string.IsNullOrWhiteSpace(signerDto.Signature) ? null : signerDto.Signature,
                        PhotoUrl = string.IsNullOrWhiteSpace(signerDto.PhotoUrl) ? null : signerDto.PhotoUrl,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CurrentAccountAuthorizedSigners.Add(signer);
                }
            }

            await _context.SaveChangesAsync();

            return await MapToResponseDto(account);
        }

        public async Task<CurrentAccountResponseDto> UpdateAccountStatusAsync(string id, bool isActive, string userId)
        {
            var account = await _context.CurrentAccounts.FindAsync(id);
            if (account == null)
                throw new ArgumentException("Compte introuvable");

            if (account.Status == ClientAccountStatus.Closed)
                throw new InvalidOperationException("Impossible de modifier le statut d'un compte fermé");

            // Toggle between Active and Suspended
            account.Status = isActive ? ClientAccountStatus.Active : ClientAccountStatus.Suspended;
            account.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await MapToResponseDto(account);
        }

        public async Task<bool> CloseAccountAsync(string id, string reason, string userId)
        {
            var account = await _context.CurrentAccounts.FindAsync(id);
            if (account == null)
                return false;

            if (account.Balance != 0)
                throw new InvalidOperationException("Le compte doit avoir un solde nul pour être fermé");

            account.Status = ClientAccountStatus.Closed;
            account.ClosedAt = DateTime.UtcNow;
            account.ClosedBy = userId;
            account.ClosureReason = reason;
            account.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<ClientAccountBalanceDto> GetBalanceAsync(string accountNumber)
        {
            var account = await _context.CurrentAccounts
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

        public async Task<CurrentAccountStatisticsDto> GetStatisticsAsync()
        {
            var accounts = await _context.CurrentAccounts.ToListAsync();

            var totalAccounts = accounts.Count;
            var activeAccounts = accounts.Count(a => a.Status == ClientAccountStatus.Active);
            var totalBalanceHTG = accounts.Where(a => a.Currency == ClientCurrency.HTG).Sum(a => a.Balance);
            var totalBalanceUSD = accounts.Where(a => a.Currency == ClientCurrency.USD).Sum(a => a.Balance);
            var averageBalance = accounts.Any() ? accounts.Average(a => a.Balance) : 0;

            var accountsByStatus = accounts.GroupBy(a => a.Status.ToString())
                .ToDictionary(g => g.Key, g => g.Count());

            var accountsByCurrency = accounts.GroupBy(a => a.Currency.ToString())
                .ToDictionary(g => g.Key, g => g.Count());

            var newAccountsThisMonth = accounts.Count(a =>
                a.CreatedAt >= DateTime.SpecifyKind(new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1), DateTimeKind.Utc));

            var dormantAccounts = accounts.Count(a =>
                a.LastTransactionDate.HasValue &&
                a.LastTransactionDate.Value < DateTime.UtcNow.AddMonths(-6));

            return new CurrentAccountStatisticsDto
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
            while (await _context.CurrentAccounts.AnyAsync(a => a.AccountNumber == accountNumber));

            return accountNumber;
        }

        private decimal GetDefaultMinimumBalance(ClientCurrency currency)
        {
            return currency == ClientCurrency.HTG ? 500 : 25;
        }

        private decimal GetDefaultDailyWithdrawalLimit(ClientCurrency currency)
        {
            return currency == ClientCurrency.HTG ? 100000 : 2000;
        }

        private decimal GetDefaultMonthlyWithdrawalLimit(ClientCurrency currency)
        {
            return currency == ClientCurrency.HTG ? 500000 : 10000;
        }

        private decimal GetDefaultDailyDepositLimit(ClientCurrency currency)
        {
            return currency == ClientCurrency.HTG ? 1000000 : 20000;
        }

        private async Task<CurrentAccountResponseDto> MapToResponseDto(CurrentAccount account)
        {
            var customer = await _context.SavingsCustomers.FindAsync(account.CustomerId);
            var branch = await _context.Branches.FindAsync(account.BranchId);
            var signers = await _context.CurrentAccountAuthorizedSigners
                .Where(s => s.AccountId == account.Id)
                .OrderBy(s => s.FullName)
                .ToListAsync();

            return new CurrentAccountResponseDto
            {
                Id = account.Id,
                AccountNumber = account.AccountNumber,
                CustomerId = account.CustomerId,
                CustomerName = customer != null ? $"{customer.FirstName} {customer.LastName}" : string.Empty,
                CustomerCode = customer?.CustomerCode ?? string.Empty,
                CustomerPhone = customer?.PrimaryPhone ?? string.Empty,
                BranchId = account.BranchId,
                BranchName = branch?.Name ?? string.Empty,
                Currency = account.Currency,
                Balance = account.Balance,
                AvailableBalance = account.AvailableBalance,
                MinimumBalance = account.MinimumBalance,
                OpeningDate = account.OpeningDate,
                LastTransactionDate = account.LastTransactionDate,
                Status = account.Status,
                DailyWithdrawalLimit = account.DailyWithdrawalLimit,
                MonthlyWithdrawalLimit = account.MonthlyWithdrawalLimit,
                DailyDepositLimit = account.DailyDepositLimit,
                OverdraftLimit = account.OverdraftLimit,
                MaintenanceFee = account.MaintenanceFee,
                TransactionFee = account.TransactionFee,
                CreatedAt = account.CreatedAt,
                UpdatedAt = account.UpdatedAt,
                ClosedAt = account.ClosedAt,
                ClosedBy = account.ClosedBy,
                ClosureReason = account.ClosureReason,
                // New fields
                HasPin = !string.IsNullOrWhiteSpace(account.PinHash),
                SecurityQuestion = account.SecurityQuestion,
                DepositMethod = account.DepositMethod,
                OriginOfFunds = account.OriginOfFunds,
                TransactionFrequency = account.TransactionFrequency,
                AccountPurpose = account.AccountPurpose,
                AuthorizedSigners = signers.Select(s => new AuthorizedSignerResponseDto
                {
                    Id = s.Id,
                    FullName = s.FullName,
                    Role = s.Role,
                    DocumentType = s.DocumentType,
                    DocumentNumber = s.DocumentNumber,
                    Phone = s.Phone,
                    RelationshipToCustomer = s.RelationshipToCustomer,
                    Address = s.Address,
                    AuthorizationLimit = s.AuthorizationLimit,
                    Signature = s.Signature,
                    PhotoUrl = s.PhotoUrl,
                    IsActive = s.IsActive,
                    CreatedAt = s.CreatedAt
                }).ToList()
            };
        }

        private static string HashSecret(string input)
        {
            using var sha = System.Security.Cryptography.SHA256.Create();
            var bytes = System.Text.Encoding.UTF8.GetBytes(input);
            var hash = sha.ComputeHash(bytes);
            return Convert.ToHexString(hash);
        }

        private static string NormalizePhoneNumber(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone)) return phone;
            var normalized = phone.Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "");
            if (normalized.StartsWith("509")) normalized = "+" + normalized;
            else if (!normalized.StartsWith("+509")) normalized = "+509" + normalized;
            return normalized;
        }
    }
}