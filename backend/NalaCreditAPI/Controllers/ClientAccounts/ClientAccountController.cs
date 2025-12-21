using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.DTOs.ClientAccounts;
using NalaCreditAPI.Services.ClientAccounts;
using NalaCreditAPI.Models;
using NalaCreditAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace NalaCreditAPI.Controllers.ClientAccounts
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ClientAccountController : ControllerBase
    {
        private readonly IClientAccountService _accountService;
        private readonly ApplicationDbContext _context;

        public ClientAccountController(
            IClientAccountService accountService,
            ApplicationDbContext context)
        {
            _accountService = accountService;
            _context = context;
        }

        /// <summary>
        /// Créer un nouveau compte client (épargne, courant, ou épargne à terme)
        /// </summary>
    [HttpPost("create")]
    [Authorize(Roles = "Cashier,Manager,SuperAdmin,Manager")]
        public async Task<ActionResult<ClientAccountResponseDto>> CreateAccount([FromBody] ClientAccountCreationDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? throw new UnauthorizedAccessException("Utilisateur non identifié");

                var account = await _accountService.CreateAccountAsync(dto, userId);
                return CreatedAtAction(nameof(GetAccount), new { id = account.Id }, account);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Obtenir un compte client par ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<ClientAccountResponseDto>> GetAccount(string id)
        {
            try
            {
                var account = await _accountService.GetAccountAsync(id);
                if (account == null)
                    return NotFound(new { message = "Compte client introuvable" });

                // Adapter le résumé vers un DTO détaillé minimal pour cohérence frontend
                var dto = new ClientAccountResponseDto
                {
                    Id = account.Id,
                    AccountNumber = account.AccountNumber,
                    AccountType = account.AccountType,
                    CustomerId = account.CustomerId,
                    CustomerName = account.CustomerName,
                    CustomerPhone = account.CustomerPhone,
                    BranchId = account.BranchId,
                    BranchName = account.BranchName,
                    Currency = account.Currency,
                    Balance = account.Balance,
                    AvailableBalance = account.Balance,
                    OpeningDate = account.OpeningDate,
                    LastTransactionDate = account.LastTransactionDate,
                    Status = account.Status,
                    CreatedAt = account.OpeningDate,
                    UpdatedAt = account.LastTransactionDate ?? account.OpeningDate,
                    ClosedAt = null,
                    ClosedBy = null,
                    ClosureReason = null,
                    // Propriétés spécifiques non disponibles dans le résumé laissées null
                    MinimumBalance = null,
                    DailyWithdrawalLimit = null,
                    MonthlyWithdrawalLimit = null,
                    DailyDepositLimit = null,
                    OverdraftLimit = null,
                    InterestRate = null,
                    InterestRateMonthly = null,
                    TermType = null,
                    MaturityDate = null,
                    AccruedInterest = null
                };

                return Ok(dto);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ERROR] GetAccount failed for id={id}: {ex.Message}\n{ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.Error.WriteLine($"[ERROR] Inner: {ex.InnerException.Message}\n{ex.InnerException.StackTrace}");
                }
                return StatusCode(500, new { message = "Erreur lors du chargement du compte", error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        /// <summary>
        /// Obtenir un compte client par numéro
        /// </summary>
        [HttpGet("by-number/{accountNumber}")]
        public async Task<ActionResult<ClientAccountResponseDto>> GetAccountByNumber(string accountNumber)
        {
            try
            {
                var account = await _accountService.GetAccountByNumberAsync(accountNumber);
                if (account == null)
                    return NotFound(new { message = "Compte client introuvable" });

                return Ok(account);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ERROR] GetAccountByNumber failed for accountNumber={accountNumber}: {ex.Message}\n{ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.Error.WriteLine($"[ERROR] Inner: {ex.InnerException.Message}\n{ex.InnerException.StackTrace}");
                }
                // Avoid exposing internal exception messages to the client. Return a generic message and log the details.
                return StatusCode(500, new { message = "Erreur interne lors de la recherche du compte", error = "Erreur interne sur le serveur" });
            }
        }

        /// <summary>
        /// Lister tous les comptes clients avec filtres et pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<ClientAccountListResponseDto>> GetAccounts([FromQuery] ClientAccountFilterDto filter)
        {
            try
            {
                var result = await _accountService.GetAccountsAsync(filter);
                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ERROR] GetAccounts failed: {ex.Message}\n{ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.Error.WriteLine($"[ERROR] Inner: {ex.InnerException.Message}\n{ex.InnerException.StackTrace}");
                }
                return StatusCode(500, new { message = "Erreur lors du chargement des comptes", error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        /// <summary>
        /// Mettre à jour un compte client
        /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin,Manager")]
        public async Task<ActionResult<ClientAccountResponseDto>> UpdateAccount(string id, [FromBody] ClientAccountUpdateDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? throw new UnauthorizedAccessException("Utilisateur non identifié");

                var account = await _accountService.UpdateAccountAsync(id, dto, userId);
                return Ok(account);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Fermer un compte client
        /// </summary>
    [HttpPost("{id}/close")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin,Manager")]
        public async Task<ActionResult> CloseAccount(string id, [FromBody] CloseAccountDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? throw new UnauthorizedAccessException("Utilisateur non identifié");

                var success = await _accountService.CloseAccountAsync(id, dto.Reason, userId);
                if (!success)
                    return NotFound(new { message = "Compte client introuvable" });

                return Ok(new { message = "Compte client fermé avec succès" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Obtenir le solde d'un compte client
        /// </summary>
        [HttpGet("{accountNumber}/balance")]
        public async Task<ActionResult<ClientAccountBalanceDto>> GetBalance(string accountNumber)
        {
            try
            {
                var balance = await _accountService.GetBalanceAsync(accountNumber);
                return Ok(balance);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Obtenir l'historique des transactions d'un compte client
        /// </summary>
        [HttpGet("{accountNumber}/transactions")]
        public async Task<ActionResult<ClientAccountTransactionHistoryDto>> GetTransactionHistory(
            string accountNumber,
            [FromQuery] TransactionHistoryFilterDto filter)
        {
            try
            {
                var history = await _accountService.GetTransactionHistoryAsync(accountNumber, filter.DateFrom, filter.DateTo, filter.Page, filter.PageSize);
                return Ok(history);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Statistiques générales des comptes clients
        /// </summary>
    [HttpGet("statistics")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin,Manager")]
        public async Task<ActionResult<ClientAccountStatisticsDto>> GetStatistics()
        {
            try
            {
                var statistics = await _accountService.GetStatisticsAsync();
                return Ok(statistics);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ERROR] GetStatistics failed: {ex.Message}\n{ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.Error.WriteLine($"[ERROR] Inner: {ex.InnerException.Message}\n{ex.InnerException.StackTrace}");
                }
                return StatusCode(500, new { message = "Erreur lors du chargement des statistiques", error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        /// <summary>
        /// Statistiques par type de compte
        /// </summary>
    [HttpGet("statistics/by-type")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin,Manager")]
        public async Task<ActionResult<ClientAccountTypeStatisticsDto>> GetStatisticsByType()
        {
            var statistics = await _accountService.GetStatisticsByTypeAsync(ClientAccountType.Savings);
            return Ok(statistics);
        }

        /// <summary>
        /// Statistiques par devise
        /// </summary>
    [HttpGet("statistics/by-currency")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin,Manager")]
        public async Task<ActionResult<ClientAccountCurrencyStatisticsDto>> GetStatisticsByCurrency()
        {
            var statistics = await _accountService.GetStatisticsByCurrencyAsync(ClientCurrency.HTG);
            return Ok(statistics);
        }

        /// <summary>
        /// Recherche de comptes clients
        /// </summary>
        [HttpGet("search")]
        public async Task<ActionResult<ClientAccountSearchResponseDto>> SearchAccounts([FromQuery] ClientAccountSearchDto search)
        {
            var result = await _accountService.SearchAccountsAsync(search.Query, 1, search.MaxResults);
            return Ok(result);
        }

        /// <summary>
        /// Mettre à jour le statut d'un compte client (suspendre/réactiver)
        /// </summary>
        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Manager,Admin,SuperAdmin")]
        public async Task<ActionResult<ClientAccountResponseDto>> UpdateAccountStatus(string id, [FromBody] UpdateAccountStatusDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? throw new UnauthorizedAccessException("Utilisateur non identifié");

                var account = await _accountService.UpdateAccountStatusAsync(id, dto.IsActive, userId);
                return Ok(account);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Obtenir les comptes en attente de validation (pour les superviseurs de succursale)
        /// </summary>
        [HttpGet("pending-validation")]
        [Authorize(Roles = "Manager,Admin,SuperAdmin")]
        public async Task<ActionResult<List<ClientAccountPendingDto>>> GetPendingValidations()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "Utilisateur non identifié" });

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
                if (user?.BranchId == null)
                    return BadRequest(new { message = "Utilisateur non assigné à une succursale" });

                var branchId = user.BranchId.Value;

                // Get pending current accounts
                var pendingCurrentAccounts = await _context.CurrentAccounts
                    .Where(ca => ca.BranchId == branchId && ca.Status == ClientAccountStatus.PendingApproval)
                    .Include(ca => ca.Customer)
                    .Select(ca => new ClientAccountPendingDto
                    {
                        Id = ca.Id,
                        AccountNumber = ca.AccountNumber,
                        ClientName = $"{ca.Customer.FirstName} {ca.Customer.LastName}",
                        AccountType = "Courant",
                        SubmittedBy = ca.CreatedAt.ToString("yyyy-MM-dd"), // TODO: Add submitted by field
                        SubmittedDate = ca.CreatedAt.ToString("yyyy-MM-dd"),
                        Amount = ca.Balance,
                        Currency = ca.Currency.ToString(),
                        BranchId = ca.BranchId
                    })
                    .ToListAsync();

                // Get pending term savings accounts
                var pendingTermAccounts = await _context.TermSavingsAccounts
                    .Where(tsa => tsa.BranchId == branchId && tsa.Status == ClientAccountStatus.PendingApproval)
                    .Include(tsa => tsa.Customer)
                    .Select(tsa => new ClientAccountPendingDto
                    {
                        Id = tsa.Id,
                        AccountNumber = tsa.AccountNumber,
                        ClientName = $"{tsa.Customer.FirstName} {tsa.Customer.LastName}",
                        AccountType = "Épargne à terme",
                        SubmittedBy = tsa.CreatedAt.ToString("yyyy-MM-dd"), // TODO: Add submitted by field
                        SubmittedDate = tsa.CreatedAt.ToString("yyyy-MM-dd"),
                        Amount = tsa.Balance,
                        Currency = tsa.Currency.ToString(),
                        BranchId = tsa.BranchId
                    })
                    .ToListAsync();

                var allPending = pendingCurrentAccounts.Concat(pendingTermAccounts)
                    .OrderByDescending(p => p.SubmittedDate)
                    .ToList();

                return Ok(allPending);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors du chargement des validations en attente", error = ex.Message });
            }
        }

        /// <summary>
        /// Valider un compte en attente
        /// </summary>
        [HttpPost("{id}/validate")]
        [Authorize(Roles = "Manager,Admin,SuperAdmin")]
        public async Task<ActionResult> ValidateAccount(string id, [FromBody] ValidateAccountDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "Utilisateur non identifié" });

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
                if (user?.BranchId == null)
                    return BadRequest(new { message = "Utilisateur non assigné à une succursale" });

                var branchId = user.BranchId.Value;

                // Check current accounts
                var currentAccount = await _context.CurrentAccounts
                    .FirstOrDefaultAsync(ca => ca.Id == id && ca.BranchId == branchId && ca.Status == ClientAccountStatus.PendingApproval);

                if (currentAccount != null)
                {
                    if (dto.Approved)
                    {
                        currentAccount.Status = ClientAccountStatus.Active;
                    }
                    else
                    {
                        currentAccount.Status = ClientAccountStatus.Closed;
                        currentAccount.ClosureReason = dto.RejectionReason ?? "Rejeté par le superviseur";
                        currentAccount.ClosedAt = DateTime.UtcNow;
                        currentAccount.ClosedBy = userId;
                    }
                    await _context.SaveChangesAsync();
                    return Ok(new { message = dto.Approved ? "Compte approuvé avec succès" : "Compte rejeté" });
                }

                // Check term savings accounts
                var termAccount = await _context.TermSavingsAccounts
                    .FirstOrDefaultAsync(tsa => tsa.Id == id && tsa.BranchId == branchId && tsa.Status == ClientAccountStatus.PendingApproval);

                if (termAccount != null)
                {
                    if (dto.Approved)
                    {
                        termAccount.Status = ClientAccountStatus.Active;
                    }
                    else
                    {
                        termAccount.Status = ClientAccountStatus.Closed;
                        termAccount.ClosureReason = dto.RejectionReason ?? "Rejeté par le superviseur";
                        termAccount.ClosedAt = DateTime.UtcNow;
                        termAccount.ClosedBy = userId;
                    }
                    await _context.SaveChangesAsync();
                    return Ok(new { message = dto.Approved ? "Compte approuvé avec succès" : "Compte rejeté" });
                }

                return NotFound(new { message = "Compte en attente non trouvé" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors de la validation du compte", error = ex.Message });
            }
        }
    }
}