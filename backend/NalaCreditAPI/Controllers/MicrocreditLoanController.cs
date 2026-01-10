using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MicrocreditLoanController : ControllerBase
    {
        private readonly IMicrocreditLoanApplicationService _loanApplicationService;
        private readonly IMicrocreditFinancialCalculatorService _calculatorService;
        private readonly ILogger<MicrocreditLoanController> _logger;
        private readonly ApplicationDbContext _context;

        public MicrocreditLoanController(
            IMicrocreditLoanApplicationService loanApplicationService,
            IMicrocreditFinancialCalculatorService calculatorService,
            ILogger<MicrocreditLoanController> logger,
            ApplicationDbContext context)
        {
            _loanApplicationService = loanApplicationService;
            _calculatorService = calculatorService;
            _logger = logger;
            _context = context;
        }

        /// <summary>
        /// Obtenir un prêt par ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<MicrocreditLoanDto>> GetLoan(Guid id)
        {
            try
            {
                var loan = await _loanApplicationService.GetLoanAsync(id);
                if (loan == null)
                {
                    return NotFound($"Loan with ID {id} not found");
                }

                return Ok(loan);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving loan {LoanId}", id);
                return StatusCode(500, "An error occurred while retrieving the loan");
            }
        }

        /// <summary>
        /// Obtenir la liste des prêts avec filtres et pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<MicrocreditLoanListResponseDto>> GetLoans(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] MicrocreditLoanStatus? status = null,
            [FromQuery] MicrocreditLoanType? loanType = null,
            [FromQuery] int? branchId = null,
            [FromQuery] bool? isOverdue = null)
        {
            try
            {
                // Defense-in-depth: for branch-scoped roles, never allow cross-branch listing.
                if (User.IsInRole("CreditAgent") || User.IsInRole("Employee") || User.IsInRole("LoanOfficer"))
                {
                    branchId = await ResolveEffectiveBranchIdAsync();
                    if (!branchId.HasValue)
                    {
                        return BadRequest("User not assigned to a branch");
                    }
                }

                _logger.LogInformation("GetLoans called - Page: {Page}, PageSize: {PageSize}, Status: {Status}, BranchId: {BranchId}, IsOverdue: {IsOverdue}", 
                    page, pageSize, status, branchId, isOverdue);
                    
                if (page < 1) page = 1;
                if (pageSize < 1 || pageSize > 100) pageSize = 10;

                var result = await _loanApplicationService.GetLoansAsync(page, pageSize, status, loanType, branchId, isOverdue);
                
                _logger.LogInformation("GetLoans returning {Count} loans out of {Total}", result?.Loans?.Count ?? 0, result?.TotalCount ?? 0);
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving loans");
                return StatusCode(500, "An error occurred while retrieving loans");
            }
        }

        private async Task<int?> ResolveEffectiveBranchIdAsync()
        {
            var branchIdClaim = User.FindFirst("BranchId")?.Value;
            if (!string.IsNullOrWhiteSpace(branchIdClaim) && int.TryParse(branchIdClaim, out var parsedBranchId))
            {
                return parsedBranchId;
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(userId))
            {
                return null;
            }

            var user = await _context.Users.FindAsync(userId);
            return user?.BranchId;
        }

        /// <summary>
        /// Obtenir les prêts par IDs d'application
        /// </summary>
        [HttpGet("by-application-ids")]
        public async Task<ActionResult<IList<MicrocreditLoanDto>>> GetLoansByApplicationIds([FromQuery] string applicationIds)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(applicationIds))
                {
                    return BadRequest("Application IDs are required");
                }

                var ids = applicationIds.Split(',')
                    .Select(id => Guid.TryParse(id.Trim(), out var guid) ? guid : (Guid?)null)
                    .Where(id => id.HasValue)
                    .Select(id => id!.Value)
                    .ToList();

                if (!ids.Any())
                {
                    return BadRequest("No valid application IDs provided");
                }

                var loans = await _loanApplicationService.GetLoansByApplicationIdsAsync(ids);
                return Ok(loans);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving loans by application IDs");
                return StatusCode(500, "An error occurred while retrieving loans");
            }
        }

        /// <summary>
        /// Obtenir les prêts par une liste d'IDs d'application (POST body)
        /// Utilisé pour éviter les problèmes de longueur d'URL quand la liste est grande
        /// </summary>
        [HttpPost("by-application-ids")]
        public async Task<ActionResult<IList<MicrocreditLoanDto>>> GetLoansByApplicationIdsPost([FromBody] List<Guid> applicationIds)
        {
            try
            {
                if (applicationIds == null || !applicationIds.Any())
                    return BadRequest("No application IDs provided");

                var loans = await _loanApplicationService.GetLoansByApplicationIdsAsync(applicationIds);
                return Ok(loans);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving loans by application IDs (POST)");
                return StatusCode(500, "An error occurred while retrieving loans by application IDs");
            }
        }

        /// <summary>
        /// Débourser un prêt approuvé
        /// </summary>
        [HttpPost("{id}/disburse")]
        [Authorize(Roles = "SuperAdmin,Admin,Manager,Employee")]
        public async Task<ActionResult<MicrocreditLoanDto>> DisburseLoan(Guid id, [FromBody] DisburseLoanDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var disbursedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(disbursedBy))
                {
                    return Unauthorized("User ID not found in token");
                }

                var loan = await _loanApplicationService.DisburseLoanAsync(id, disbursedBy, dto.DisbursementDate, dto.Notes);
                return Ok(loan);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disbursing loan {LoanId}", id);
                return StatusCode(500, "An error occurred while disbursing the loan");
            }
        }

        /// <summary>
        /// Obtenir le calendrier de paiement d'un prêt
        /// </summary>
        [HttpGet("{id}/payment-schedule")]
        public async Task<ActionResult<IList<MicrocreditPaymentScheduleDto>>> GetPaymentSchedule(Guid id)
        {
            try
            {
                var schedule = await _loanApplicationService.GetPaymentScheduleAsync(id);
                return Ok(schedule);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving payment schedule for loan {LoanId}", id);
                return StatusCode(500, "An error occurred while retrieving payment schedule");
            }
        }

        /// <summary>
        /// Régénérer le calendrier de paiement d'un prêt
        /// </summary>
        [HttpPost("{id}/regenerate-schedule")]
        public async Task<ActionResult> RegenerateSchedule(Guid id)
        {
            try
            {
                var ok = await _loanApplicationService.RegeneratePaymentScheduleAsync(id);
                if (!ok) return StatusCode(500, "Failed to regenerate schedule");
                return Ok(new { success = true });
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error regenerating payment schedule for loan {LoanId}", id);
                return StatusCode(500, "An error occurred while regenerating payment schedule");
            }
        }

        /// <summary>
        /// Calculer les détails d'un paiement en avance
        /// </summary>
        [HttpPost("{id}/calculate-early-payment")]
        public async Task<ActionResult<EarlyPaymentCalculationDto>> CalculateEarlyPayment(Guid id, [FromBody] EarlyPaymentRequestDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var loan = await _loanApplicationService.GetLoanAsync(id);
                if (loan == null)
                {
                    return NotFound($"Loan with ID {id} not found");
                }

                var savings = _calculatorService.CalculateEarlyPaymentSavings(
                    loan.OutstandingPrincipal, 
                    loan.InterestRate / 12, // Monthly interest rate
                    12); // Remaining months - we'll use a default of 12 months for now
                
                var calculation = new EarlyPaymentCalculationDto
                {
                    TotalOutstanding = loan.OutstandingPrincipal + loan.OutstandingInterest,
                    InterestSavings = savings,
                    PayoffAmount = dto.PaymentAmount,
                    PenaltySavings = 0,
                    CalculationDate = dto.PaymentDate
                };

                return Ok(calculation);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating early payment for loan {LoanId}", id);
                return StatusCode(500, "An error occurred while calculating early payment");
            }
        }

        /// <summary>
        /// Marquer un prêt comme en défaut
        /// </summary>
        [HttpPost("{id}/mark-default")]
        [Authorize(Roles = "SuperAdmin,Admin,Manager,Employee")]
        public async Task<ActionResult<MicrocreditLoanDto>> MarkLoanAsDefault(Guid id, [FromBody] MarkDefaultDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var markedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(markedBy))
                {
                    return Unauthorized("User ID not found in token");
                }

                var loan = await _loanApplicationService.MarkLoanAsDefaultAsync(id, markedBy, dto.Reason);
                return Ok(loan);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking loan {LoanId} as default", id);
                return StatusCode(500, "An error occurred while marking loan as default");
            }
        }

        /// <summary>
        /// Réhabiliter un prêt en défaut
        /// </summary>
        [HttpPost("{id}/rehabilitate")]
        [Authorize(Roles = "SuperAdmin,Admin,Manager")]
        public async Task<ActionResult<MicrocreditLoanDto>> RehabilitateLoan(Guid id, [FromBody] RehabilitateDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var rehabilitatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(rehabilitatedBy))
                {
                    return Unauthorized("User ID not found in token");
                }

                var loan = await _loanApplicationService.RehabilitateLoanAsync(id, rehabilitatedBy, dto.Notes);
                return Ok(loan);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rehabilitating loan {LoanId}", id);
                return StatusCode(500, "An error occurred while rehabilitating the loan");
            }
        }

        /// <summary>
        /// Obtenir le résumé financier d'un prêt
        /// </summary>
        [HttpGet("{id}/summary")]
        public async Task<ActionResult<LoanSummaryDto>> GetLoanSummary(Guid id)
        {
            try
            {
                var summary = await _loanApplicationService.GetLoanSummaryAsync(id);
                if (summary == null)
                {
                    return NotFound($"Loan with ID {id} not found");
                }

                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving summary for loan {LoanId}", id);
                return StatusCode(500, "An error occurred while retrieving loan summary");
            }
        }

        /// <summary>
        /// Obtenir l'historique des transactions d'un prêt
        /// </summary>
        [HttpGet("{id}/transactions")]
        public async Task<ActionResult<IList<MicrocreditPaymentDto>>> GetLoanTransactions(Guid id)
        {
            try
            {
                var transactions = await _loanApplicationService.GetLoanTransactionsAsync(id);
                return Ok(transactions);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving transactions for loan {LoanId}", id);
                return StatusCode(500, "An error occurred while retrieving loan transactions");
            }
        }

        /// <summary>
        /// Obtenir les prêts en retard
        /// </summary>
        [HttpGet("overdue")]
        [Authorize(Roles = "SuperAdmin,Admin,Manager,Employee")]
        public async Task<ActionResult<IList<OverdueLoanDto>>> GetOverdueLoans([FromQuery] int daysOverdue = 1, [FromQuery] int? branchId = null)
        {
            try
            {
                if (daysOverdue < 1) daysOverdue = 1;

                // Defense-in-depth: for branch-scoped roles, never allow cross-branch overdue listing.
                if (User.IsInRole("CreditAgent") || User.IsInRole("Employee") || User.IsInRole("LoanOfficer"))
                {
                    branchId = await ResolveEffectiveBranchIdAsync();
                    if (!branchId.HasValue)
                    {
                        return BadRequest("User not assigned to a branch");
                    }
                }

                var overdueLoans = await _loanApplicationService.GetOverdueLoansAsync(daysOverdue, branchId);
                return Ok(overdueLoans);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving overdue loans");
                return StatusCode(500, "An error occurred while retrieving overdue loans");
            }
        }

        /// <summary>
        /// Ajouter une note de recouvrement pour un prêt
        /// </summary>
        [HttpPost("{id}/collection-notes")]
        [Authorize(Roles = "SuperAdmin,Admin,Manager,Employee,LoanOfficer")]
        public async Task<ActionResult<MicrocreditCollectionNoteDto>> AddCollectionNote(Guid id, [FromBody] CreateMicrocreditCollectionNoteDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var createdBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(createdBy)) return Unauthorized("User ID not found in token");

                var note = await _loanApplicationService.AddCollectionNoteAsync(id, dto, createdBy);
                return Ok(note);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding collection note for loan {LoanId}", id);
                return StatusCode(500, "An error occurred while saving the collection note");
            }
        }

        /// <summary>
        /// Obtenir les notes de recouvrement pour un prêt
        /// </summary>
        [HttpGet("{id}/collection-notes")]
        [Authorize(Roles = "SuperAdmin,Admin,Manager,Employee,LoanOfficer")]
        public async Task<ActionResult<IList<MicrocreditCollectionNoteDto>>> GetCollectionNotes(Guid id)
        {
            try
            {
                var notes = await _loanApplicationService.GetCollectionNotesAsync(id);
                return Ok(notes);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving collection notes for loan {LoanId}", id);
                return StatusCode(500, "An error occurred while retrieving collection notes");
            }
        }

        /// <summary>
        /// Obtenir les statistiques du tableau de bord des microcrédits
        /// </summary>
        [HttpGet("dashboard/stats")]
        [Authorize]
        public async Task<ActionResult<MicrocreditDashboardStatsDto>> GetDashboardStats([FromQuery] int? branchId = null)
        {
            try
            {
                // Use the service method which includes BranchPerformance
                var stats = await _loanApplicationService.GetDashboardStatsAsync(branchId);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving dashboard statistics");
                return StatusCode(500, "An error occurred while retrieving dashboard statistics");
            }
        }
    }

    // DTOs pour les actions sur les prêts
    public class DisburseLoanDto
    {
        [Required]
        public DateTime DisbursementDate { get; set; }
        
        public string? Notes { get; set; }
    }

    public class EarlyPaymentRequestDto
    {
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Payment amount must be greater than 0")]
        public decimal PaymentAmount { get; set; }
        
        [Required]
        public DateTime PaymentDate { get; set; }
    }

    public class MarkDefaultDto
    {
        [Required]
        public string Reason { get; set; } = string.Empty;
    }

    public class RehabilitateDto
    {
        public string? Notes { get; set; }
    }
}