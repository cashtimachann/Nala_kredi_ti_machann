using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.DTOs.ClientAccounts;
using NalaCreditAPI.Services.ClientAccounts;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.Controllers.ClientAccounts
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ClientAccountController : ControllerBase
    {
        private readonly IClientAccountService _accountService;

        public ClientAccountController(IClientAccountService accountService)
        {
            _accountService = accountService;
        }

        /// <summary>
        /// Créer un nouveau compte client (épargne, courant, ou épargne à terme)
        /// </summary>
    [HttpPost("create")]
    [Authorize(Roles = "Cashier,Manager,SuperAdmin,BranchSupervisor")]
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
            var account = await _accountService.GetAccountAsync(id);
            if (account == null)
                return NotFound(new { message = "Compte client introuvable" });

            return Ok(account);
        }

        /// <summary>
        /// Obtenir un compte client par numéro
        /// </summary>
        [HttpGet("by-number/{accountNumber}")]
        public async Task<ActionResult<ClientAccountResponseDto>> GetAccountByNumber(string accountNumber)
        {
            var account = await _accountService.GetAccountByNumberAsync(accountNumber);
            if (account == null)
                return NotFound(new { message = "Compte client introuvable" });

            return Ok(account);
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
    [Authorize(Roles = "Manager,Admin,SuperAdmin,BranchSupervisor")]
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
    [Authorize(Roles = "Manager,Admin,SuperAdmin,BranchSupervisor")]
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
    [Authorize(Roles = "Manager,Admin,SuperAdmin,BranchSupervisor")]
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
    [Authorize(Roles = "Manager,Admin,SuperAdmin,BranchSupervisor")]
        public async Task<ActionResult<ClientAccountTypeStatisticsDto>> GetStatisticsByType()
        {
            var statistics = await _accountService.GetStatisticsByTypeAsync(ClientAccountType.Savings);
            return Ok(statistics);
        }

        /// <summary>
        /// Statistiques par devise
        /// </summary>
    [HttpGet("statistics/by-currency")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin,BranchSupervisor")]
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
        [Authorize(Roles = "BranchSupervisor,Admin,SuperAdmin")]
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
    }
}