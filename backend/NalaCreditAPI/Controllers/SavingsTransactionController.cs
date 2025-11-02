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
    public class SavingsTransactionController : ControllerBase
    {
        private readonly ISavingsTransactionService _transactionService;

        public SavingsTransactionController(ISavingsTransactionService transactionService)
        {
            _transactionService = transactionService;
        }

        /// <summary>
        /// Traiter une nouvelle transaction (dépôt ou retrait)
        /// </summary>
        [HttpPost("process")]
        public async Task<ActionResult<SavingsTransactionResponseDto>> ProcessTransaction([FromBody] SavingsTransactionCreateDto dto)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? throw new UnauthorizedAccessException("Utilisateur non identifié");

                var transaction = await _transactionService.ProcessTransactionAsync(dto, userId);
                return CreatedAtAction(nameof(GetTransaction), new { id = transaction.Id }, transaction);
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
        /// Obtenir une transaction par ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<SavingsTransactionResponseDto>> GetTransaction(string id)
        {
            var transaction = await _transactionService.GetTransactionAsync(id);
            if (transaction == null)
                return NotFound(new { message = "Transaction introuvable" });

            return Ok(transaction);
        }

        /// <summary>
        /// Lister toutes les transactions avec filtres et pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<SavingsTransactionListResponseDto>> GetTransactions([FromQuery] SavingsTransactionFilterDto filter)
        {
            var result = await _transactionService.GetTransactionsAsync(filter);
            return Ok(result);
        }

        /// <summary>
        /// Générer un reçu pour une transaction
        /// </summary>
        [HttpGet("{id}/receipt")]
        public async Task<ActionResult<SavingsTransactionReceiptDto>> GenerateReceipt(string id)
        {
            try
            {
                var receipt = await _transactionService.GenerateReceiptAsync(id);
                return Ok(receipt);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Annuler une transaction
        /// </summary>
        [HttpPost("{id}/cancel")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult> CancelTransaction(string id, [FromBody] CancelTransactionDto dto)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? throw new UnauthorizedAccessException("Utilisateur non identifié");

                var success = await _transactionService.CancelTransactionAsync(id, dto.Reason, userId);
                if (!success)
                    return NotFound(new { message = "Transaction introuvable" });

                return Ok(new { message = "Transaction annulée avec succès" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Obtenir le total des transactions quotidiennes pour un compte
        /// </summary>
        [HttpGet("daily-total")]
        public async Task<ActionResult<DailyTransactionTotalDto>> GetDailyTotal(
            [FromQuery] string accountId,
            [FromQuery] SavingsTransactionType type,
            [FromQuery] DateTime? date = null)
        {
            if (string.IsNullOrEmpty(accountId))
                return BadRequest(new { message = "L'ID du compte est requis" });

            var targetDate = date ?? DateTime.UtcNow;
            var total = await _transactionService.GetDailyTransactionTotalAsync(accountId, type, targetDate);

            return Ok(new DailyTransactionTotalDto
            {
                AccountId = accountId,
                TransactionType = type,
                Date = targetDate.Date,
                TotalAmount = total
            });
        }

        /// <summary>
        /// Obtenir le total des transactions mensuelles pour un compte
        /// </summary>
        [HttpGet("monthly-total")]
        public async Task<ActionResult<MonthlyTransactionTotalDto>> GetMonthlyTotal(
            [FromQuery] string accountId,
            [FromQuery] SavingsTransactionType type,
            [FromQuery] DateTime? date = null)
        {
            if (string.IsNullOrEmpty(accountId))
                return BadRequest(new { message = "L'ID du compte est requis" });

            var targetDate = date ?? DateTime.UtcNow;
            var total = await _transactionService.GetMonthlyTransactionTotalAsync(accountId, type, targetDate);

            return Ok(new MonthlyTransactionTotalDto
            {
                AccountId = accountId,
                TransactionType = type,
                Month = DateTime.SpecifyKind(new DateTime(targetDate.Year, targetDate.Month, 1), DateTimeKind.Utc),
                TotalAmount = total
            });
        }

        /// <summary>
        /// Valider une transaction avant traitement
        /// </summary>
        [HttpPost("validate")]
        public async Task<ActionResult<TransactionValidationDto>> ValidateTransaction([FromBody] SavingsTransactionCreateDto dto)
        {
            try
            {
                // Ici on pourrait ajouter une méthode de validation sans traitement réel
                // Pour l'instant, on fait une validation basique
                if (dto.Amount <= 0)
                    return BadRequest(new { message = "Le montant doit être positif" });

                if (string.IsNullOrEmpty(dto.AccountNumber))
                    return BadRequest(new { message = "Le numéro de compte est requis" });

                return Ok(new TransactionValidationDto
                {
                    IsValid = true,
                    Message = "Transaction valide",
                    EstimatedFees = dto.Type == SavingsTransactionType.Withdrawal 
                        ? Math.Max(1m, dto.Amount * 0.005m) 
                        : 0m
                });
            }
            catch (Exception ex)
            {
                return Ok(new TransactionValidationDto
                {
                    IsValid = false,
                    Message = ex.Message,
                    EstimatedFees = 0m
                });
            }
        }

        /// <summary>
        /// Statistiques des transactions d'épargne
        /// </summary>
        [HttpGet("statistics")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<SavingsTransactionSummaryDto>> GetStatistics([FromQuery] SavingsTransactionFilterDto? filter = null)
        {
            filter ??= new SavingsTransactionFilterDto { PageSize = int.MaxValue };
            filter.PageSize = int.MaxValue; // Pour obtenir toutes les transactions pour les stats

            var result = await _transactionService.GetTransactionsAsync(filter);
            return Ok(result.Summary);
        }

        /// <summary>
        /// Rapport des transactions par période
        /// </summary>
        [HttpGet("report")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<TransactionReportDto>> GetTransactionReport(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] int? branchId = null)
        {
            var filter = new SavingsTransactionFilterDto
            {
                DateFrom = startDate ?? DateTime.UtcNow.AddDays(-30),
                DateTo = endDate ?? DateTime.UtcNow,
                BranchId = branchId,
                PageSize = int.MaxValue
            };

            var result = await _transactionService.GetTransactionsAsync(filter);

            return Ok(new TransactionReportDto
            {
                Period = $"{filter.DateFrom:yyyy-MM-dd} au {filter.DateTo:yyyy-MM-dd}",
                BranchId = branchId,
                Summary = result.Summary,
                TransactionCount = result.TotalCount,
                GeneratedAt = DateTime.UtcNow
            });
        }
    }

    // DTOs pour les réponses spécifiques aux contrôleurs
    public class CancelTransactionDto
    {
        public string Reason { get; set; } = string.Empty;
    }

    public class DailyTransactionTotalDto
    {
        public string AccountId { get; set; } = string.Empty;
        public SavingsTransactionType TransactionType { get; set; }
        public DateTime Date { get; set; }
        public decimal TotalAmount { get; set; }
    }

    public class MonthlyTransactionTotalDto
    {
        public string AccountId { get; set; } = string.Empty;
        public SavingsTransactionType TransactionType { get; set; }
        public DateTime Month { get; set; }
        public decimal TotalAmount { get; set; }
    }

    public class TransactionValidationDto
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = string.Empty;
        public decimal EstimatedFees { get; set; }
    }

    public class TransactionReportDto
    {
        public string Period { get; set; } = string.Empty;
        public int? BranchId { get; set; }
        public SavingsTransactionSummaryDto Summary { get; set; } = new();
        public int TransactionCount { get; set; }
        public DateTime GeneratedAt { get; set; }
    }
}