using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.DTOs.ClientAccounts;
using NalaCreditAPI.Services.ClientAccounts;

namespace NalaCreditAPI.Controllers.ClientAccounts
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CurrentAccountController : ControllerBase
    {
        private readonly ICurrentAccountService _accountService;

        public CurrentAccountController(ICurrentAccountService accountService)
        {
            _accountService = accountService;
        }

        /// <summary>
        /// Ouvrir un nouveau compte courant
        /// </summary>
    [HttpPost("open")]
    public async Task<ActionResult<CurrentAccountResponseDto>> OpenAccount([FromBody] CurrentAccountOpeningDto dto)
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
        /// Obtenir un compte courant par ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<CurrentAccountResponseDto>> GetAccount(string id)
        {
            var account = await _accountService.GetAccountAsync(id);
            if (account == null)
                return NotFound(new { message = "Compte introuvable" });

            return Ok(account);
        }

        /// <summary>
        /// Obtenir un compte courant par numéro
        /// </summary>
        [HttpGet("by-number/{accountNumber}")]
        public async Task<ActionResult<CurrentAccountResponseDto>> GetAccountByNumber(string accountNumber)
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
        /// Lister les comptes courants avec filtres et pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<CurrentAccountListResponseDto>> GetAccounts([FromQuery] CurrentAccountFilterDto filter)
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
                return StatusCode(500, new { message = "Erreur lors du chargement des comptes courants", error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        /// <summary>
        /// Mettre à jour un compte courant
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Manager,Admin,SuperAdmin")]
        public async Task<ActionResult<CurrentAccountResponseDto>> UpdateAccount(string id, [FromBody] CurrentAccountUpdateDto dto)
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
        /// Fermer un compte courant
        /// </summary>
        [HttpPost("{id}/close")]
        [Authorize(Roles = "Manager,Admin,SuperAdmin")]
        public async Task<ActionResult> CloseAccount(string id, [FromBody] CloseAccountDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
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
        /// Obtenir le solde d'un compte courant
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
        /// Statistiques des comptes courants
        /// </summary>
        [HttpGet("statistics")]
        [Authorize(Roles = "Manager,Admin,SuperAdmin")]
        public async Task<ActionResult<CurrentAccountStatisticsDto>> GetStatistics()
        {
            var statistics = await _accountService.GetStatisticsAsync();
            return Ok(statistics);
        }

        /// <summary>
        /// Traiter une transaction (dépôt/retrait) sur un compte courant
        /// </summary>
        [HttpPost("{accountNumber}/transactions")]
        public async Task<ActionResult<CurrentAccountTransactionResponseDto>> ProcessTransaction(string accountNumber, [FromBody] CurrentAccountTransactionRequestDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? throw new UnauthorizedAccessException("Utilisateur non identifié");

                dto.AccountNumber = string.IsNullOrWhiteSpace(dto.AccountNumber) ? accountNumber : dto.AccountNumber;
                var result = await _accountService.ProcessTransactionAsync(dto, userId);
                return Ok(result);
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
        /// Traiter un transfert entre deux comptes courants (source -> destination)
        /// </summary>
        [HttpPost("{accountNumber}/transfer")]
        public async Task<ActionResult<CurrentAccountTransferResponseDto>> ProcessTransfer(string accountNumber, [FromBody] CurrentAccountTransferRequestDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? throw new UnauthorizedAccessException("Utilisateur non identifié");

                dto.SourceAccountNumber = string.IsNullOrWhiteSpace(dto.SourceAccountNumber) ? accountNumber : dto.SourceAccountNumber;
                var result = await _accountService.ProcessTransferAsync(dto, userId);
                return Ok(result);
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
        /// Annuler une transaction sur un compte courant
        /// </summary>
        [HttpPost("transactions/{transactionId}/cancel")]
        [Authorize(Roles = "Cashier,Manager,Admin,SuperAdmin,Manager")]
        public async Task<ActionResult> CancelTransaction(string transactionId, [FromBody] CancelTransactionDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? throw new UnauthorizedAccessException("Utilisateur non identifié");

                var success = await _accountService.CancelTransactionAsync(transactionId, dto.Reason ?? "Annulation", userId);
                if (!success)
                    return NotFound(new { message = "Transaction introuvable" });

                return Ok(new { message = "Transaction annulée avec succès" });
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
        /// Mettre à jour le statut d'un compte courant (suspendre/réactiver)
        /// </summary>
        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Manager,Admin,SuperAdmin")]
        public async Task<ActionResult<CurrentAccountResponseDto>> UpdateAccountStatus(string id, [FromBody] UpdateAccountStatusDto dto)
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
    }
}