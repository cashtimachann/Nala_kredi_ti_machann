using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.DTOs.ClientAccounts;
using NalaCreditAPI.Services.ClientAccounts;

namespace NalaCreditAPI.Controllers.ClientAccounts
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TermSavingsAccountController : ControllerBase
    {
        private readonly ITermSavingsAccountService _accountService;

        public TermSavingsAccountController(ITermSavingsAccountService accountService)
        {
            _accountService = accountService;
        }

        /// <summary>
        /// Ouvrir une nouvelle épargne à terme
        /// </summary>
        [HttpPost("open")]
        [Authorize(Roles = "Cashier,BranchSupervisor")]
        public async Task<ActionResult<TermSavingsAccountResponseDto>> OpenAccount([FromBody] TermSavingsAccountOpeningDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
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
        /// Obtenir une épargne à terme par ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<TermSavingsAccountResponseDto>> GetAccount(string id)
        {
            var account = await _accountService.GetAccountAsync(id);
            if (account == null)
                return NotFound(new { message = "Épargne à terme introuvable" });

            return Ok(account);
        }

        /// <summary>
        /// Obtenir une épargne à terme par numéro
        /// </summary>
        [HttpGet("by-number/{accountNumber}")]
        public async Task<ActionResult<TermSavingsAccountResponseDto>> GetAccountByNumber(string accountNumber)
        {
            try
            {
                var account = await _accountService.GetAccountByNumberAsync(accountNumber);
                if (account == null)
                    return NotFound(new { message = "Épargne à terme introuvable" });

                return Ok(account);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ERROR] GetAccountByNumber failed for accountNumber={accountNumber}: {ex.Message}\n{ex.StackTrace}");
                return StatusCode(500, new { message = "Erreur interne lors de la recherche du compte", error = "Erreur interne sur le serveur" });
            }
        }

        /// <summary>
        /// Lister les épargnes à terme avec filtres et pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<TermSavingsAccountListResponseDto>> GetAccounts([FromQuery] TermSavingsAccountFilterDto filter)
        {
            var result = await _accountService.GetAccountsAsync(filter);
            return Ok(result);
        }

        /// <summary>
        /// Mettre à jour une épargne à terme
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "BranchSupervisor,Admin,SuperAdmin")]
        public async Task<ActionResult<TermSavingsAccountResponseDto>> UpdateAccount(string id, [FromBody] TermSavingsAccountUpdateDto dto)
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
        /// Fermer une épargne à terme
        /// </summary>
        [HttpPost("{id}/close")]
        [Authorize(Roles = "BranchSupervisor,Admin,SuperAdmin")]
        public async Task<ActionResult> CloseAccount(string id, [FromBody] CloseAccountDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? throw new UnauthorizedAccessException("Utilisateur non identifié");

                var success = await _accountService.CloseAccountAsync(
                    id, 
                    dto.Reason, 
                    userId, 
                    dto.EarlyWithdrawalPenaltyPercent
                );
                
                if (!success)
                    return NotFound(new { message = "Épargne à terme introuvable" });

                var resultMessage = dto.EarlyWithdrawalPenaltyPercent.HasValue
                    ? $"Épargne à terme fermée avec pénalité de {dto.EarlyWithdrawalPenaltyPercent.Value}%"
                    : "Épargne à terme fermée avec succès";

                return Ok(new { message = resultMessage });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Supprimer une épargne à terme (seulement si fermée et solde = 0)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult> DeleteAccount(string id)
        {
            try
            {
                var success = await _accountService.DeleteAccountAsync(id);
                
                if (!success)
                    return NotFound(new { message = "Épargne à terme introuvable" });

                return Ok(new { message = "Épargne à terme supprimée avec succès" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Suspendre ou activer une épargne à terme (toggle entre ACTIVE et SUSPENDED)
        /// </summary>
        [HttpPut("{id}/toggle-status")]
        [Authorize(Roles = "BranchSupervisor,Admin,SuperAdmin")]
        public async Task<ActionResult> ToggleStatus(string id)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? throw new UnauthorizedAccessException("Utilisateur non identifié");

                var result = await _accountService.ToggleAccountStatusAsync(id, userId);
                return Ok(new { message = result });
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
        /// Traiter une transaction (dépôt ou retrait) sur une épargne à terme
        /// </summary>
        [HttpPost("transaction")]
        [Authorize(Roles = "Cashier,BranchSupervisor,Admin,SuperAdmin")]
        public async Task<ActionResult> ProcessTransaction([FromBody] TermSavingsTransactionDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? throw new UnauthorizedAccessException("Utilisateur non identifié");

                await _accountService.ProcessTransactionAsync(dto, userId);
                return Ok(new { message = "Transaction effectuée avec succès" });
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
        /// Obtenir toutes les transactions des épargnes à terme avec filtres optionnels
        /// </summary>
        [HttpGet("transactions")]
        [Authorize(Roles = "Cashier,BranchSupervisor,Admin,SuperAdmin")]
        public async Task<ActionResult<List<object>>> GetAllTransactions(
            [FromQuery] string? accountNumber = null,
            [FromQuery] string? type = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] int? branchId = null,
            [FromQuery] decimal? minAmount = null,
            [FromQuery] decimal? maxAmount = null)
        {
            try
            {
                var transactions = await _accountService.GetAllTransactionsAsync(
                    accountNumber, type, startDate, endDate, branchId, minAmount, maxAmount);
                return Ok(transactions);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Obtenir le solde d'une épargne à terme
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
        /// Calculer les intérêts pour une épargne à terme
        /// </summary>
        [HttpPost("{accountId}/calculate-interest")]
        [Authorize(Roles = "BranchSupervisor,Admin,SuperAdmin")]
        public async Task<ActionResult> CalculateInterest(string accountId)
        {
            var success = await _accountService.CalculateInterestAsync(accountId);
            if (!success)
                return BadRequest(new { message = "Impossible de calculer les intérêts pour cette épargne à terme" });

            return Ok(new { message = "Intérêts calculés avec succès" });
        }

        /// <summary>
        /// Renouveler une épargne à terme arrivée à échéance
        /// </summary>
        [HttpPost("{accountId}/renew")]
        [Authorize(Roles = "BranchSupervisor,Admin,SuperAdmin")]
        public async Task<ActionResult<TermSavingsAccountResponseDto>> Renew(string accountId, [FromBody] NalaCreditAPI.DTOs.ClientAccounts.TermSavingsAccountRenewDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? throw new UnauthorizedAccessException("Utilisateur non identifié");

                var result = await _accountService.RenewAccountAsync(accountId, dto, userId);
                return Ok(result);
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
        /// Calculer les intérêts pour toutes les épargnes à terme échuës
        /// </summary>
        [HttpPost("calculate-interest-all")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult> CalculateInterestForAll()
        {
            var processedCount = await _accountService.CalculateInterestForAllAccountsAsync();
            return Ok(new { message = $"Intérêts calculés pour {processedCount} épargnes à terme" });
        }

        /// <summary>
        /// Statistiques des épargnes à terme
        /// </summary>
        [HttpGet("statistics")]
        [Authorize(Roles = "BranchSupervisor,Admin,SuperAdmin")]
        public async Task<ActionResult<TermSavingsAccountStatisticsDto>> GetStatistics()
        {
            var statistics = await _accountService.GetStatisticsAsync();
            return Ok(statistics);
        }
    }
}