using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.DTOs.Savings;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services.Savings;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers.Savings
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SavingsAccountController : ControllerBase
    {
        private readonly ISavingsAccountService _accountService;
        private readonly ISavingsTransactionService _transactionService;

        public SavingsAccountController(
            ISavingsAccountService accountService, 
            ISavingsTransactionService transactionService)
        {
            _accountService = accountService;
            _transactionService = transactionService;
        }

        /// <summary>
        /// Ouvrir un nouveau compte d'épargne
        /// </summary>
        [HttpPost("open")]
        // Allow Secretary/Employee to open savings accounts alongside Cashier and Manager
        [Authorize(Roles = "Cashier,Manager,Employee,Secretary,SecretaireAdministratif")]
        public async Task<ActionResult<SavingsAccountResponseDto>> OpenAccount([FromBody] SavingsAccountOpeningDto dto)
        {
            try
            {
                // DEBUG: Log all claims in the token
                Console.WriteLine("[DEBUG] SavingsAccount.OpenAccount - User Claims:");
                foreach (var claim in User.Claims)
                {
                    Console.WriteLine($"  {claim.Type}: {claim.Value}");
                }
                
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? throw new UnauthorizedAccessException("Utilisateur non identifié");

                var account = await _accountService.OpenAccountAsync(dto, userId);
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
        /// Obtenir un compte par ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<SavingsAccountResponseDto>> GetAccount(string id)
        {
            var account = await _accountService.GetAccountAsync(id);
            if (account == null)
                return NotFound(new { message = "Compte introuvable" });

            return Ok(account);
        }

        /// <summary>
        /// Obtenir un compte par numéro
        /// </summary>
        [HttpGet("by-number/{accountNumber}")]
        public async Task<ActionResult<SavingsAccountResponseDto>> GetAccountByNumber(string accountNumber)
        {
            try
            {
                var account = await _accountService.GetAccountByNumberAsync(accountNumber);
                if (account == null)
                    return NotFound(new { message = "Compte introuvable" });

                return Ok(account);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ERROR] GetAccountByNumber failed for accountNumber={accountNumber}: {ex.Message}\n{ex.StackTrace}");
                return StatusCode(500, new { message = "Erreur interne lors de la recherche du compte", error = "Erreur interne sur le serveur" });
            }
        }

        /// <summary>
        /// Lister les comptes avec filtres et pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<SavingsAccountListResponseDto>> GetAccounts([FromQuery] SavingsAccountFilterDto filter)
        {
            var result = await _accountService.GetAccountsAsync(filter);
            return Ok(result);
        }

        /// <summary>
        /// Mettre à jour un compte
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<SavingsAccountResponseDto>> UpdateAccount(string id, [FromBody] SavingsAccountUpdateDto dto)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
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
        /// Fermer un compte
        /// </summary>
        [HttpPost("{id}/close")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult> CloseAccount(string id, [FromBody] CloseAccountDto dto)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? throw new UnauthorizedAccessException("Utilisateur non identifié");

                var success = await _accountService.CloseAccountAsync(id, dto.Reason, userId);
                if (!success)
                    return NotFound(new { message = "Compte introuvable" });

                return Ok(new { message = "Compte fermé avec succès" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Obtenir le solde d'un compte
        /// </summary>
        [HttpGet("{accountNumber}/balance")]
        public async Task<ActionResult<SavingsAccountBalanceDto>> GetBalance(string accountNumber)
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
        /// Générer un relevé de compte
        /// </summary>
        [HttpPost("{accountId}/statement")]
        public async Task<ActionResult<SavingsAccountStatementResponseDto>> GenerateStatement(string accountId, [FromBody] SavingsAccountStatementRequestDto request)
        {
            try
            {
                request.AccountId = accountId; // S'assurer que l'ID correspond
                var statement = await _accountService.GenerateStatementAsync(request);
                return Ok(statement);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Calculer les intérêts pour un compte
        /// </summary>
        [HttpPost("{accountId}/calculate-interest")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult> CalculateInterest(string accountId)
        {
            var success = await _accountService.CalculateInterestAsync(accountId);
            if (!success)
                return BadRequest(new { message = "Impossible de calculer les intérêts pour ce compte" });

            return Ok(new { message = "Intérêts calculés avec succès" });
        }

        /// <summary>
        /// Calculer les intérêts pour tous les comptes éligibles
        /// </summary>
        [HttpPost("calculate-interest-all")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult> CalculateInterestForAll()
        {
            var processedCount = await _accountService.CalculateInterestForAllAccountsAsync();
            return Ok(new { message = $"Intérêts calculés pour {processedCount} comptes" });
        }

        /// <summary>
        /// Obtenir les transactions d'un compte
        /// </summary>
        [HttpGet("{accountId}/transactions")]
        public async Task<ActionResult<SavingsTransactionListResponseDto>> GetAccountTransactions(
            string accountId, 
            [FromQuery] SavingsTransactionFilterDto filter)
        {
            var result = await _transactionService.GetAccountTransactionsAsync(accountId, filter);
            return Ok(result);
        }

        /// <summary>
        /// Statistiques des comptes d'épargne
        /// </summary>
        [HttpGet("statistics")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<SavingsAccountStatisticsDto>> GetStatistics()
        {
            var filter = new SavingsAccountFilterDto { PageSize = int.MaxValue };
            var result = await _accountService.GetAccountsAsync(filter);
            return Ok(result.Statistics);
        }
    }

    /// <summary>
    /// DTO pour la fermeture de compte
    /// </summary>
    public class CloseAccountDto
    {
        public string Reason { get; set; } = string.Empty;
    }
}