using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Migrations;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MicrocreditPaymentController : ControllerBase
    {
        private readonly IMicrocreditLoanApplicationService _loanApplicationService;
        private readonly IMicrocreditFinancialCalculatorService _calculatorService;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<MicrocreditPaymentController> _logger;

        public MicrocreditPaymentController(
            IMicrocreditLoanApplicationService loanApplicationService,
            IMicrocreditFinancialCalculatorService calculatorService,
            ApplicationDbContext context,
            ILogger<MicrocreditPaymentController> logger)
        {
            _loanApplicationService = loanApplicationService;
            _calculatorService = calculatorService;
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Obtenir un paiement par ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<MicrocreditPaymentDto>> GetPayment(Guid id)
        {
            try
            {
                var payment = await _loanApplicationService.GetPaymentAsync(id);
                if (payment == null)
                {
                    return NotFound($"Payment with ID {id} not found");
                }

                return Ok(payment);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving payment {PaymentId}", id);
                return StatusCode(500, "An error occurred while retrieving the payment");
            }
        }

        /// <summary>
        /// Enregistrer un nouveau paiement
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<MicrocreditPaymentDto>> RecordPayment([FromBody] CreateMicrocreditPaymentDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var recordedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(recordedBy))
                {
                    return Unauthorized("User ID not found in token");
                }

                var payment = await _loanApplicationService.RecordPaymentAsync(dto, recordedBy);
                return CreatedAtAction(nameof(GetPayment), new { id = payment.Id }, payment);
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
                _logger.LogError(ex, "Error recording payment for loan {LoanId}", dto.LoanId);
                return StatusCode(500, "An error occurred while recording the payment");
            }
        }

        /// <summary>
        /// Obtenir les paiements d'un prêt
        /// </summary>
        [HttpGet("loan/{loanId}")]
        public async Task<ActionResult<IList<MicrocreditPaymentDto>>> GetLoanPayments(Guid loanId)
        {
            try
            {
                var payments = await _loanApplicationService.GetLoanPaymentsAsync(loanId);
                return Ok(payments);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving payments for loan {LoanId}", loanId);
                return StatusCode(500, "An error occurred while retrieving loan payments");
            }
        }

        /// <summary>
        /// Calculer l'allocation d'un paiement
        /// </summary>
        [HttpPost("calculate-allocation")]
        public async Task<ActionResult<PaymentAllocationDto>> CalculatePaymentAllocation([FromBody] CalculateAllocationDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var loan = await _loanApplicationService.GetLoanAsync(dto.LoanId);
                if (loan == null)
                {
                    return NotFound($"Loan with ID {dto.LoanId} not found");
                }

                var allocation = _calculatorService.CalculatePaymentAllocation(
                    dto.PaymentAmount,
                    loan.OutstandingPrincipal,
                    loan.OutstandingInterest,
                    0); // PenaltyAmount - we'll use 0 for now

                var allocationDto = new PaymentAllocationDto
                {
                    PrincipalAmount = allocation.PrincipalAmount,
                    InterestAmount = allocation.InterestAmount,
                    PenaltyAmount = allocation.PenaltyAmount,
                    FeesAmount = 0,
                    RemainingAmount = allocation.ExcessAmount,
                    AllocationDate = dto.PaymentDate
                };

                return Ok(allocationDto);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating payment allocation for loan {LoanId}", dto.LoanId);
                return StatusCode(500, "An error occurred while calculating payment allocation");
            }
        }

        /// <summary>
        /// Confirmer un paiement en attente
        /// </summary>
        [HttpPost("{id}/confirm")]
        [Authorize(Roles = "SuperAdmin,Admin,Manager,Employee,LoanOfficer,Cashier")]
        public async Task<ActionResult<MicrocreditPaymentDto>> ConfirmPayment(Guid id, [FromBody] ConfirmPaymentDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var confirmedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(confirmedBy))
                {
                    return Unauthorized("User ID not found in token");
                }

                var payment = await _loanApplicationService.ConfirmPaymentAsync(id, confirmedBy, dto.Notes);
                return Ok(payment);
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
                _logger.LogError(ex, "Error confirming payment {PaymentId}", id);
                return StatusCode(500, "An error occurred while confirming the payment");
            }
        }

        /// <summary>
        /// Annuler un paiement
        /// </summary>
        [HttpPost("{id}/cancel")]
        [Authorize(Roles = "SuperAdmin,Admin,Manager")]
        public async Task<ActionResult<MicrocreditPaymentDto>> CancelPayment(Guid id, [FromBody] CancelPaymentDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var cancelledBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(cancelledBy))
                {
                    return Unauthorized("User ID not found in token");
                }

                var payment = await _loanApplicationService.CancelPaymentAsync(id, cancelledBy, dto.Reason);
                return Ok(payment);
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
                _logger.LogError(ex, "Error cancelling payment {PaymentId}", id);
                return StatusCode(500, "An error occurred while cancelling the payment");
            }
        }

        /// <summary>
        /// Obtenir les paiements en attente de confirmation
        /// </summary>
        [HttpGet("pending")]
        [Authorize(Roles = "SuperAdmin,Admin,Manager,LoanOfficer")]
        public async Task<ActionResult<IList<MicrocreditPaymentDto>>> GetPendingPayments([FromQuery] int branchId = 0)
        {
            try
            {
                var payments = await _loanApplicationService.GetPendingPaymentsAsync(branchId > 0 ? branchId : null);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving pending payments");
                return StatusCode(500, "An error occurred while retrieving pending payments");
            }
        }

        /// <summary>
        /// Obtenir l'historique des paiements avec filtres
        /// </summary>
        [HttpGet("history")]
        public async Task<ActionResult<PaymentHistoryResponseDto>> GetPaymentHistory(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] MicrocreditPaymentStatus? status = null,
            [FromQuery] int? branchId = null)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1 || pageSize > 100) pageSize = 10;

                var result = await _loanApplicationService.GetPaymentHistoryAsync(page, pageSize, fromDate, toDate, status, branchId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving payment history");
                return StatusCode(500, "An error occurred while retrieving payment history");
            }
        }

        /// <summary>
        /// Obtenir les statistiques de paiements
        /// </summary>
        [HttpGet("statistics")]
        [Authorize(Roles = "SuperAdmin,Admin,Manager,LoanOfficer")]
        public async Task<ActionResult<PaymentStatisticsDto>> GetPaymentStatistics(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] int? branchId = null)
        {
            try
            {
                var statistics = await _loanApplicationService.GetPaymentStatisticsAsync(fromDate, toDate, branchId);
                return Ok(statistics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving payment statistics");
                return StatusCode(500, "An error occurred while retrieving payment statistics");
            }
        }

        /// <summary>
        /// Générer un reçu de paiement
        /// </summary>
        [HttpGet("{id}/receipt")]
        public async Task<ActionResult<PaymentReceiptDto>> GenerateReceipt(Guid id)
        {
            try
            {
                var receipt = await _loanApplicationService.GeneratePaymentReceiptAsync(id);
                if (receipt == null)
                {
                    return NotFound($"Payment with ID {id} not found or cannot generate receipt");
                }

                return Ok(receipt);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating receipt for payment {PaymentId}", id);
                return StatusCode(500, "An error occurred while generating payment receipt");
            }
        }

        /// <summary>
        /// Effectuer un remboursement anticipé complet
        /// </summary>
        [HttpPost("early-payoff")]
        public async Task<ActionResult<MicrocreditPaymentDto>> ProcessEarlyPayoff([FromBody] NalaCreditAPI.DTOs.EarlyPayoffDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var processedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(processedBy))
                {
                    return Unauthorized("User ID not found in token");
                }

                var payment = await _loanApplicationService.ProcessEarlyPayoffAsync(dto, processedBy);
                return CreatedAtAction(nameof(GetPayment), new { id = payment.Id }, payment);
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
                _logger.LogError(ex, "Error processing early payoff for loan {LoanId}", dto.LoanId);
                return StatusCode(500, "An error occurred while processing early payoff");
            }
        }

        /// <summary>
        /// Corriger les noms de succursale manquants dans les paiements (Admin uniquement)
        /// </summary>
        [HttpPost("fix-branch-names")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        public async Task<ActionResult<object>> FixPaymentBranchNames()
        {
            try
            {
                _logger.LogInformation("Starting payment branch names fix...");
                await PaymentBranchNameFixer.ExecuteAsync(_context);
                
                return Ok(new 
                { 
                    success = true, 
                    message = "Les noms de succursale ont été corrigés avec succès"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fixing payment branch names");
                return StatusCode(500, new 
                { 
                    success = false, 
                    message = "Une erreur s'est produite lors de la correction des succursales",
                    error = ex.Message 
                });
            }
        }
    }

    // DTOs pour les actions de paiement
    public class CalculateAllocationDto
    {
        [Required]
        public Guid LoanId { get; set; }
        
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Payment amount must be greater than 0")]
        public decimal PaymentAmount { get; set; }
        
        [Required]
        public DateTime PaymentDate { get; set; }
    }

    public class ConfirmPaymentDto
    {
        public string? Notes { get; set; }
    }

    public class CancelPaymentDto
    {
        [Required]
        public string Reason { get; set; } = string.Empty;
    }


}