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
                if (page < 1) page = 1;
                if (pageSize < 1 || pageSize > 100) pageSize = 10;

                var result = await _loanApplicationService.GetLoansAsync(page, pageSize, status, loanType, branchId, isOverdue);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving loans");
                return StatusCode(500, "An error occurred while retrieving loans");
            }
        }

        /// <summary>
        /// Obtenir les prêts d'un client spécifique
        /// </summary>
        [HttpGet("customer/{customerId}")]
        public async Task<ActionResult<IList<MicrocreditLoanDto>>> GetCustomerLoans(Guid customerId)
        {
            try
            {
                var loans = await _loanApplicationService.GetCustomerLoansAsync(customerId);
                return Ok(loans);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving loans for customer {CustomerId}", customerId);
                return StatusCode(500, "An error occurred while retrieving customer loans");
            }
        }

        /// <summary>
        /// Débourser un prêt approuvé
        /// </summary>
        [HttpPost("{id}/disburse")]
        [Authorize(Roles = "Admin,Manager,LoanOfficer")]
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
        [Authorize(Roles = "Admin,Manager,LoanOfficer")]
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
        [Authorize(Roles = "Admin,Manager")]
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
        [Authorize(Roles = "Admin,Manager,LoanOfficer")]
        public async Task<ActionResult<IList<OverdueLoanDto>>> GetOverdueLoans([FromQuery] int daysOverdue = 1)
        {
            try
            {
                if (daysOverdue < 1) daysOverdue = 1;

                var overdueLoans = await _loanApplicationService.GetOverdueLoansAsync(daysOverdue);
                return Ok(overdueLoans);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving overdue loans");
                return StatusCode(500, "An error occurred while retrieving overdue loans");
            }
        }

        /// <summary>
        /// Obtenir les statistiques du tableau de bord des microcrédits
        /// </summary>
        [HttpGet("dashboard/stats")]
        [Authorize]
        public async Task<ActionResult<MicrocreditDashboardStatsDto>> GetDashboardStats()
        {
            try
            {
                var now = DateTime.UtcNow;
                var startOfMonth = new DateTime(now.Year, now.Month, 1);
                var startOfYear = new DateTime(now.Year, 1, 1);

                // Nombre total de clients (borrowers)
                var totalClients = await _context.MicrocreditBorrowers.CountAsync();

                // Nombre de crédits actifs
                var activeLoans = await _context.MicrocreditLoans
                    .Where(l => l.Status == MicrocreditLoanStatus.Active)
                    .CountAsync();

                // Montant total des crédits en cours (outstanding balance)
                var totalOutstandingHTG = await _context.MicrocreditLoans
                    .Where(l => l.Status == MicrocreditLoanStatus.Active && l.Currency == MicrocreditCurrency.HTG)
                    .SumAsync(l => l.OutstandingBalance);

                var totalOutstandingUSD = await _context.MicrocreditLoans
                    .Where(l => l.Status == MicrocreditLoanStatus.Active && l.Currency == MicrocreditCurrency.USD)
                    .SumAsync(l => l.OutstandingBalance);

                // Taux de remboursement global (%)
                var totalLoans = await _context.MicrocreditLoans.CountAsync();
                var completedLoans = await _context.MicrocreditLoans
                    .Where(l => l.Status == MicrocreditLoanStatus.Completed)
                    .CountAsync();

                var repaymentRate = totalLoans > 0 ? (decimal)completedLoans / totalLoans * 100 : 0;

                // Crédits en retard (nombre + montant)
                var overdueLoans = await _context.MicrocreditLoans
                    .Where(l => l.Status == MicrocreditLoanStatus.Active && l.DaysOverdue > 0)
                    .ToListAsync();

                var overdueCount = overdueLoans.Count;
                var overdueAmountHTG = overdueLoans
                    .Where(l => l.Currency == MicrocreditCurrency.HTG)
                    .Sum(l => l.OutstandingBalance);
                var overdueAmountUSD = overdueLoans
                    .Where(l => l.Currency == MicrocreditCurrency.USD)
                    .Sum(l => l.OutstandingBalance);

                // Revenus générés (intérêts perçus)
                var totalInterestCollectedHTG = await _context.MicrocreditPayments
                    .Where(p => p.Status == MicrocreditPaymentStatus.Completed && p.Currency == MicrocreditCurrency.HTG)
                    .SumAsync(p => p.InterestAmount);

                var totalInterestCollectedUSD = await _context.MicrocreditPayments
                    .Where(p => p.Status == MicrocreditPaymentStatus.Completed && p.Currency == MicrocreditCurrency.USD)
                    .SumAsync(p => p.InterestAmount);

                // Crédits remboursés ce mois
                var loansCompletedThisMonth = await _context.MicrocreditLoans
                    .Where(l => l.Status == MicrocreditLoanStatus.Completed &&
                               l.UpdatedAt >= startOfMonth && l.UpdatedAt < now)
                    .CountAsync();

                // Nouveaux crédits ce mois
                var newLoansThisMonth = await _context.MicrocreditLoans
                    .Where(l => l.CreatedAt >= startOfMonth && l.CreatedAt < now)
                    .CountAsync();

                var stats = new MicrocreditDashboardStatsDto
                {
                    TotalClients = totalClients,
                    ActiveLoans = activeLoans,
                    TotalOutstanding = new CurrencyAmountDto
                    {
                        HTG = totalOutstandingHTG,
                        USD = totalOutstandingUSD
                    },
                    RepaymentRate = Math.Round(repaymentRate, 2),
                    OverdueLoans = new OverdueStatsDto
                    {
                        Count = overdueCount,
                        Amount = new CurrencyAmountDto
                        {
                            HTG = overdueAmountHTG,
                            USD = overdueAmountUSD
                        }
                    },
                    InterestRevenue = new CurrencyAmountDto
                    {
                        HTG = totalInterestCollectedHTG,
                        USD = totalInterestCollectedUSD
                    },
                    LoansCompletedThisMonth = loansCompletedThisMonth,
                    NewLoansThisMonth = newLoansThisMonth,
                    GeneratedAt = now
                };

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