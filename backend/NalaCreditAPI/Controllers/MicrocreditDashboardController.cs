using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MicrocreditDashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<MicrocreditDashboardController> _logger;

        public MicrocreditDashboardController(
            ApplicationDbContext context,
            ILogger<MicrocreditDashboardController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Jwenn estatistik jeneral pou dashboard mikwokredi
        /// </summary>
        [HttpGet("stats")]
        public async Task<ActionResult<MicrocreditDashboardStatsDto>> GetDashboardStats()
        {
            try
            {
                var currentDate = DateTime.UtcNow;
                var firstDayOfMonth = new DateTime(currentDate.Year, currentDate.Month, 1);

                // Total kliyans (emprunteurs)
                var totalClients = await _context.MicrocreditBorrowers.CountAsync();

                // Kredi aktif
                var activeLoans = await _context.MicrocreditLoans
                    .Where(l => l.Status == MicrocreditLoanStatus.Active || 
                               l.Status == MicrocreditLoanStatus.Approved)
                    .CountAsync();

                // Total balans ki rete (HTG ak USD)
                var loansHTG = await _context.MicrocreditLoans
                    .Where(l => l.Currency == MicrocreditCurrency.HTG && 
                               (l.Status == MicrocreditLoanStatus.Active || 
                                l.Status == MicrocreditLoanStatus.Overdue))
                    .SumAsync(l => l.OutstandingBalance);

                var loansUSD = await _context.MicrocreditLoans
                    .Where(l => l.Currency == MicrocreditCurrency.USD && 
                               (l.Status == MicrocreditLoanStatus.Active || 
                                l.Status == MicrocreditLoanStatus.Overdue))
                    .SumAsync(l => l.OutstandingBalance);

                // Kredi an reta
                var overdueLoans = await _context.MicrocreditLoans
                    .Where(l => l.Status == MicrocreditLoanStatus.Overdue)
                    .ToListAsync();

                var overdueCount = overdueLoans.Count;
                var overdueAmountHTG = overdueLoans
                    .Where(l => l.Currency == MicrocreditCurrency.HTG)
                    .Sum(l => l.OutstandingBalance);
                var overdueAmountUSD = overdueLoans
                    .Where(l => l.Currency == MicrocreditCurrency.USD)
                    .Sum(l => l.OutstandingBalance);

                // Revni enterè (total enterè peye)
                var interestRevenueHTG = await _context.MicrocreditPayments
                    .Where(p => p.Currency == MicrocreditCurrency.HTG && 
                               p.Status == MicrocreditPaymentStatus.Completed)
                    .SumAsync(p => p.InterestAmount);

                var interestRevenueUSD = await _context.MicrocreditPayments
                    .Where(p => p.Currency == MicrocreditCurrency.USD && 
                               p.Status == MicrocreditPaymentStatus.Completed)
                    .SumAsync(p => p.InterestAmount);

                // Kredi konplete mwa sa a
                var loansCompletedThisMonth = await _context.MicrocreditLoans
                    .Where(l => l.Status == MicrocreditLoanStatus.Completed &&
                               l.UpdatedAt >= firstDayOfMonth)
                    .CountAsync();

                // Nouvo kredi mwa sa a
                var newLoansThisMonth = await _context.MicrocreditLoans
                    .Where(l => l.CreatedAt >= firstDayOfMonth)
                    .CountAsync();

                // Kalkile to ranbousman
                var totalDisbursed = await _context.MicrocreditLoans
                    .Where(l => l.Status != MicrocreditLoanStatus.Pending && 
                               l.Status != MicrocreditLoanStatus.Cancelled)
                    .SumAsync(l => l.PrincipalAmount);

                var totalPaid = await _context.MicrocreditLoans
                    .Where(l => l.Status != MicrocreditLoanStatus.Pending && 
                               l.Status != MicrocreditLoanStatus.Cancelled)
                    .SumAsync(l => l.AmountPaid);

                var repaymentRate = totalDisbursed > 0 
                    ? Math.Round((totalPaid / totalDisbursed) * 100, 2) 
                    : 0;

                var stats = new MicrocreditDashboardStatsDto
                {
                    TotalClients = totalClients,
                    ActiveLoans = activeLoans,
                    TotalOutstanding = new CurrencyAmountDto
                    {
                        HTG = loansHTG,
                        USD = loansUSD
                    },
                    RepaymentRate = repaymentRate,
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
                        HTG = interestRevenueHTG,
                        USD = interestRevenueUSD
                    },
                    LoansCompletedThisMonth = loansCompletedThisMonth,
                    NewLoansThisMonth = newLoansThisMonth,
                    GeneratedAt = DateTime.UtcNow
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving microcredit dashboard stats");
                return StatusCode(500, "An error occurred while retrieving dashboard statistics");
            }
        }

        /// <summary>
        /// Jwenn estatistik pa tip kredi
        /// </summary>
        [HttpGet("stats/by-type")]
        public async Task<ActionResult<List<LoanTypeStatsDto>>> GetStatsByType()
        {
            try
            {
                var loanTypes = Enum.GetValues<MicrocreditLoanType>();
                var statsByType = new List<LoanTypeStatsDto>();

                foreach (var loanType in loanTypes)
                {
                    var loans = await _context.MicrocreditLoans
                        .Where(l => l.LoanType == loanType)
                        .ToListAsync();

                    if (loans.Any())
                    {
                        var stats = new LoanTypeStatsDto
                        {
                            LoanType = loanType,
                            TotalLoans = loans.Count,
                            ActiveLoans = loans.Count(l => l.Status == MicrocreditLoanStatus.Active),
                            TotalDisbursed = loans.Sum(l => l.PrincipalAmount),
                            TotalOutstanding = loans
                                .Where(l => l.Status == MicrocreditLoanStatus.Active || 
                                           l.Status == MicrocreditLoanStatus.Overdue)
                                .Sum(l => l.OutstandingBalance),
                            AverageAmount = loans.Average(l => l.PrincipalAmount),
                            OverdueCount = loans.Count(l => l.Status == MicrocreditLoanStatus.Overdue)
                        };

                        statsByType.Add(stats);
                    }
                }

                return Ok(statsByType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving stats by loan type");
                return StatusCode(500, "An error occurred while retrieving statistics by type");
            }
        }

        /// <summary>
        /// Jwenn tandans mwa pa mwa
        /// </summary>
        [HttpGet("trends")]
        public async Task<ActionResult<List<MonthlyTrendDto>>> GetMonthlyTrends(
            [FromQuery] int months = 6)
        {
            try
            {
                var trends = new List<MonthlyTrendDto>();
                var currentDate = DateTime.UtcNow;

                for (int i = months - 1; i >= 0; i--)
                {
                    var monthStart = currentDate.AddMonths(-i);
                    var firstDay = new DateTime(monthStart.Year, monthStart.Month, 1);
                    var lastDay = firstDay.AddMonths(1).AddDays(-1);

                    var disbursements = await _context.MicrocreditLoans
                        .Where(l => l.DisbursementDate >= DateOnly.FromDateTime(firstDay) && 
                                   l.DisbursementDate <= DateOnly.FromDateTime(lastDay))
                        .SumAsync(l => l.PrincipalAmount);

                    var collections = await _context.MicrocreditPayments
                        .Where(p => p.PaymentDate >= DateOnly.FromDateTime(firstDay) && 
                                   p.PaymentDate <= DateOnly.FromDateTime(lastDay) &&
                                   p.Status == MicrocreditPaymentStatus.Completed)
                        .SumAsync(p => p.Amount);

                    var newLoans = await _context.MicrocreditLoans
                        .Where(l => l.CreatedAt >= firstDay && l.CreatedAt <= lastDay.AddDays(1))
                        .CountAsync();

                    var completedLoans = await _context.MicrocreditLoans
                        .Where(l => l.Status == MicrocreditLoanStatus.Completed &&
                                   l.UpdatedAt >= firstDay && l.UpdatedAt <= lastDay.AddDays(1))
                        .CountAsync();

                    trends.Add(new MonthlyTrendDto
                    {
                        Month = firstDay.ToString("yyyy-MM"),
                        Disbursements = disbursements,
                        Collections = collections,
                        NewLoans = newLoans,
                        CompletedLoans = completedLoans
                    });
                }

                return Ok(trends);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving monthly trends");
                return StatusCode(500, "An error occurred while retrieving trends");
            }
        }
    }
}
