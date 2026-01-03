using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.Models;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Utilities;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<User> _userManager;
    private readonly ILogger<ReportController> _logger;

    public ReportController(ApplicationDbContext context, UserManager<User> userManager, ILogger<ReportController> logger)
    {
        _context = context;
        _userManager = userManager;
        _logger = logger;
    }

    /// <summary>
    /// Get daily report for current cashier
    /// </summary>
    [HttpGet("daily")]
    [Authorize(Roles = "Cashier")]
    public async Task<ActionResult<DailyReportDto>> GetDailyReport([FromQuery] DateTime? date)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId!);
        
        if (user?.BranchId == null)
            return BadRequest(new { success = false, message = "User not assigned to a branch" });

        // Use provided date or today
        var reportDate = date ?? DateTime.Today;
        var reportDateUtc = reportDate.ToUniversalTime();
        var nextDay = reportDateUtc.AddDays(1);

        try
        {
            // Get all transactions for this cashier on the specified date
            var transactions = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.UserId == userId && t.CreatedAt >= reportDateUtc && t.CreatedAt < nextDay)
                .Include(t => t.Account)
                    .ThenInclude(a => a.Customer)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            // Get savings transactions
            var savingsTransactions = await _context.SavingsTransactions
                .AsNoTracking()
                .Where(t => t.ProcessedBy == userId && t.ProcessedAt >= reportDateUtc && t.ProcessedAt < nextDay)
                .Include(t => t.Account)
                    .ThenInclude(a => a.Customer)
                .ToListAsync();

            // Get current account transactions
            var currentAccountTransactions = await _context.CurrentAccountTransactions
                .AsNoTracking()
                .Where(t => t.ProcessedBy == userId && t.ProcessedAt >= reportDateUtc && t.ProcessedAt < nextDay)
                .Include(t => t.Account)
                    .ThenInclude(a => a.Customer)
                .ToListAsync();

            // Get microcredit payments
            var microcreditPayments = await _context.MicrocreditPayments
                .AsNoTracking()
                .Include(p => p.Loan)
                    .ThenInclude(l => l.Borrower)
                .Where(p => p.ProcessedBy == userId && 
                           p.CreatedAt >= reportDateUtc && 
                           p.CreatedAt < nextDay && 
                           p.Status == MicrocreditPaymentStatus.Completed)
                .ToListAsync();

            // Get exchange transactions
            var branchGuid = BranchIntegrationHelper.FromLegacyId(user.BranchId!.Value);
            var exchangeTransactions = await _context.ExchangeTransactions
                .AsNoTracking()
                .Where(t => t.BranchId == branchGuid && 
                           t.CreatedAt >= reportDateUtc && 
                           t.CreatedAt < nextDay &&
                           t.Status == ExchangeTransactionStatus.Completed)
                .ToListAsync();

            // Calculate statistics
            var depositCount = transactions.Count(t => t.Type == TransactionType.Deposit) +
                             savingsTransactions.Count(t => t.Type == SavingsTransactionType.Deposit) +
                             currentAccountTransactions.Count(t => t.Type == SavingsTransactionType.Deposit);

            var withdrawalCount = transactions.Count(t => t.Type == TransactionType.Withdrawal) +
                                savingsTransactions.Count(t => t.Type == SavingsTransactionType.Withdrawal) +
                                currentAccountTransactions.Count(t => t.Type == SavingsTransactionType.Withdrawal);

            var changeCount = exchangeTransactions.Count;
            var consultationCount = 0; // Will need to track consultations separately

            // Calculate totals by currency
            var depositsHTG = transactions.Where(t => t.Type == TransactionType.Deposit && t.Currency == Currency.HTG).Sum(t => t.Amount) +
                            savingsTransactions.Where(t => t.Type == SavingsTransactionType.Deposit && t.Currency == SavingsCurrency.HTG).Sum(t => t.Amount) +
                            currentAccountTransactions.Where(t => t.Type == SavingsTransactionType.Deposit && t.Currency == ClientCurrency.HTG).Sum(t => t.Amount);

            var depositsUSD = transactions.Where(t => t.Type == TransactionType.Deposit && t.Currency == Currency.USD).Sum(t => t.Amount) +
                            savingsTransactions.Where(t => t.Type == SavingsTransactionType.Deposit && t.Currency == SavingsCurrency.USD).Sum(t => t.Amount) +
                            currentAccountTransactions.Where(t => t.Type == SavingsTransactionType.Deposit && t.Currency == ClientCurrency.USD).Sum(t => t.Amount);

            var withdrawalsHTG = transactions.Where(t => t.Type == TransactionType.Withdrawal && t.Currency == Currency.HTG).Sum(t => t.Amount) +
                               savingsTransactions.Where(t => t.Type == SavingsTransactionType.Withdrawal && t.Currency == SavingsCurrency.HTG).Sum(t => t.Amount) +
                               currentAccountTransactions.Where(t => t.Type == SavingsTransactionType.Withdrawal && t.Currency == ClientCurrency.HTG).Sum(t => t.Amount);

            var withdrawalsUSD = transactions.Where(t => t.Type == TransactionType.Withdrawal && t.Currency == Currency.USD).Sum(t => t.Amount) +
                               savingsTransactions.Where(t => t.Type == SavingsTransactionType.Withdrawal && t.Currency == SavingsCurrency.USD).Sum(t => t.Amount) +
                               currentAccountTransactions.Where(t => t.Type == SavingsTransactionType.Withdrawal && t.Currency == ClientCurrency.USD).Sum(t => t.Amount);

            // Calculate net change from exchange transactions
            decimal changeHTG = 0;
            decimal changeUSD = 0;

            foreach (var exchange in exchangeTransactions)
            {
                if (exchange.FromCurrency == CurrencyType.HTG && exchange.ToCurrency == CurrencyType.USD)
                {
                    changeHTG += exchange.FromAmount;
                    changeUSD -= exchange.ToAmount;
                }
                else if (exchange.FromCurrency == CurrencyType.USD && exchange.ToCurrency == CurrencyType.HTG)
                {
                    changeUSD += exchange.FromAmount;
                    changeHTG -= exchange.ToAmount;
                }
            }

            // Calculate commissions (assuming 1% for deposits, 0.5% for withdrawals, 2% for exchanges)
            var commissionDepots = (depositsHTG + depositsUSD * 150) * 0.01m; // Approximate USD to HTG conversion
            var commissionRetraits = (withdrawalsHTG + withdrawalsUSD * 150) * 0.005m;
            var commissionChanges = exchangeTransactions.Sum(e => e.CommissionAmount);

            // Build transaction list
            var allTransactions = new List<DailyTransactionDto>();

            // Add regular transactions
            foreach (var t in transactions.Take(50))
            {
                var customerName = t.Account?.Customer != null 
                    ? $"{t.Account.Customer.FirstName ?? ""} {t.Account.Customer.LastName ?? ""}".Trim()
                    : "Client inconnu";
                
                allTransactions.Add(new DailyTransactionDto
                {
                    Date = t.CreatedAt.ToLocalTime(),
                    Type = t.Type == TransactionType.Deposit ? "deposit" : 
                          t.Type == TransactionType.Withdrawal ? "withdrawal" : 
                          "other",
                    Reference = t.TransactionNumber,
                    Amount = t.Amount,
                    Currency = t.Currency == Currency.USD ? "USD" : "HTG",
                    Description = $"{t.Type} - {customerName}",
                    Cashier = $"{user.FirstName ?? ""} {user.LastName ?? ""}".Trim()
                });
            }

            // Add savings transactions
            foreach (var t in savingsTransactions.Take(50))
            {
                var customerName = t.Account?.Customer != null 
                    ? $"{t.Account.Customer.FirstName ?? ""} {t.Account.Customer.LastName ?? ""}".Trim()
                    : "Client inconnu";
                
                allTransactions.Add(new DailyTransactionDto
                {
                    Date = t.ProcessedAt.ToLocalTime(),
                    Type = t.Type == SavingsTransactionType.Deposit ? "deposit" : "withdrawal",
                    Reference = t.Reference ?? t.Id.ToString(),
                    Amount = t.Amount,
                    Currency = t.Currency == SavingsCurrency.USD ? "USD" : "HTG",
                    Description = $"Épargne - {customerName}",
                    Cashier = $"{user.FirstName ?? ""} {user.LastName ?? ""}".Trim()
                });
            }

            // Add exchange transactions
            foreach (var t in exchangeTransactions.Take(20))
            {
                allTransactions.Add(new DailyTransactionDto
                {
                    Date = t.CreatedAt.ToLocalTime(),
                    Type = "change",
                    Reference = t.TransactionNumber ?? t.Id.ToString(),
                    Amount = t.FromAmount,
                    Currency = t.FromCurrency == CurrencyType.USD ? "USD" : "HTG",
                    Description = $"Change {t.FromCurrency} → {t.ToCurrency}",
                    Cashier = $"{user.FirstName ?? ""} {user.LastName ?? ""}".Trim()
                });
            }

            // Sort by date descending
            allTransactions = allTransactions.OrderByDescending(t => t.Date).ToList();

            var report = new DailyReportDto
            {
                Date = reportDate,
                CashierName = $"{user.FirstName ?? ""} {user.LastName ?? ""}".Trim(),
                CashierId = userId,
                DepositsCount = depositCount,
                WithdrawalsCount = withdrawalCount,
                ChangesCount = changeCount,
                ConsultationsCount = consultationCount,
                TotalDepotsHTG = depositsHTG,
                TotalRetraitsHTG = withdrawalsHTG,
                TotalChangeHTG = changeHTG,
                TotalDepotsUSD = depositsUSD,
                TotalRetraitsUSD = withdrawalsUSD,
                TotalChangeUSD = changeUSD,
                CommissionDepots = commissionDepots,
                CommissionRetraits = commissionRetraits,
                CommissionChanges = commissionChanges,
                Transactions = allTransactions
            };

            _logger.LogInformation("Daily report generated for cashier {CashierId} - Date: {Date}", 
                userId, reportDate.ToShortDateString());

            return Ok(new { success = true, data = report });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating daily report for cashier {UserId}", userId);
            return StatusCode(500, new { success = false, message = "Erreur lors de la génération du rapport", error = ex.Message });
        }
    }
}

// DTOs
public class DailyReportDto
{
    public DateTime Date { get; set; }
    public string? CashierName { get; set; }
    public string? CashierId { get; set; }
    
    public int DepositsCount { get; set; }
    public int WithdrawalsCount { get; set; }
    public int ChangesCount { get; set; }
    public int ConsultationsCount { get; set; }
    
    public decimal TotalDepotsHTG { get; set; }
    public decimal TotalRetraitsHTG { get; set; }
    public decimal TotalChangeHTG { get; set; }
    
    public decimal TotalDepotsUSD { get; set; }
    public decimal TotalRetraitsUSD { get; set; }
    public decimal TotalChangeUSD { get; set; }
    
    public decimal CommissionDepots { get; set; }
    public decimal CommissionRetraits { get; set; }
    public decimal CommissionChanges { get; set; }
    
    public List<DailyTransactionDto>? Transactions { get; set; }
}

public class DailyTransactionDto
{
    public DateTime Date { get; set; }
    public string? Type { get; set; }
    public string? Reference { get; set; }
    public decimal Amount { get; set; }
    public string? Currency { get; set; }
    public string? Description { get; set; }
    public string? Cashier { get; set; }
}
