using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.Models;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Services;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransactionController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ITransactionService _transactionService;
    private readonly INotificationService _notificationService;
    private readonly IAuditService _auditService;

    public TransactionController(
        ApplicationDbContext context,
        ITransactionService transactionService,
        INotificationService notificationService,
        IAuditService auditService)
    {
        _context = context;
        _transactionService = transactionService;
        _notificationService = notificationService;
        _auditService = auditService;
    }

    [HttpPost("deposit")]
    [Authorize(Roles = "Cashier,Manager,BranchSupervisor,SuperAdmin")]
    public async Task<ActionResult> ProcessDeposit([FromBody] TransactionDto model)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        
        var success = await _transactionService.ProcessDepositAsync(
            model.AccountId, model.Amount, model.Currency, userId);

        if (!success)
            return BadRequest("Failed to process deposit");

        var account = await _context.Accounts
            .Include(a => a.Customer)
            .Include(a => a.Branch)
            .FirstOrDefaultAsync(a => a.Id == model.AccountId);

        // Send real-time notification
        await _notificationService.SendTransactionNotificationAsync(
            account!.BranchId.ToString(),
            new
            {
                type = "deposit",
                amount = model.Amount,
                currency = model.Currency.ToString(),
                customer = $"{account.Customer.FirstName} {account.Customer.LastName}",
                timestamp = DateTime.UtcNow
            });

        return Ok(new { message = "Deposit processed successfully" });
    }

    [HttpPost("withdrawal")]
    [Authorize(Roles = "Cashier,Manager,BranchSupervisor,SuperAdmin")]
    public async Task<ActionResult> ProcessWithdrawal([FromBody] TransactionDto model)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        
        var success = await _transactionService.ProcessWithdrawalAsync(
            model.AccountId, model.Amount, model.Currency, userId);

        if (!success)
            return BadRequest("Failed to process withdrawal - insufficient funds or invalid account");

        var account = await _context.Accounts
            .Include(a => a.Customer)
            .Include(a => a.Branch)
            .FirstOrDefaultAsync(a => a.Id == model.AccountId);

        // Send real-time notification
        await _notificationService.SendTransactionNotificationAsync(
            account!.BranchId.ToString(),
            new
            {
                type = "withdrawal",
                amount = model.Amount,
                currency = model.Currency.ToString(),
                customer = $"{account.Customer.FirstName} {account.Customer.LastName}",
                timestamp = DateTime.UtcNow
            });

        return Ok(new { message = "Withdrawal processed successfully" });
    }

    [HttpGet("account/{accountId}")]
    public async Task<ActionResult<IEnumerable<Transaction>>> GetAccountTransactions(int accountId, int page = 1, int pageSize = 20)
    {
        var transactions = await _context.Transactions
            .Where(t => t.AccountId == accountId)
            .Include(t => t.User)
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new
            {
                t.Id,
                t.TransactionNumber,
                t.Type,
                t.Currency,
                t.Amount,
                t.BalanceAfter,
                t.Description,
                t.CreatedAt,
                ProcessedBy = $"{t.User.FirstName} {t.User.LastName}"
            })
            .ToListAsync();

        return Ok(transactions);
    }

    [HttpGet("branch/{branchId}/today")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin,BranchSupervisor")]
    public async Task<ActionResult> GetBranchTransactionsToday(int branchId)
    {
        var today = DateTime.Today;
        var transactions = await _context.Transactions
            .Where(t => t.BranchId == branchId && t.CreatedAt.Date == today)
            .Include(t => t.User)
            .Include(t => t.Account)
                .ThenInclude(a => a.Customer)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id,
                t.TransactionNumber,
                t.Type,
                t.Currency,
                t.Amount,
                t.CreatedAt,
                Customer = $"{t.Account.Customer.FirstName} {t.Account.Customer.LastName}",
                ProcessedBy = $"{t.User.FirstName} {t.User.LastName}"
            })
            .ToListAsync();

        var summary = new
        {
            TotalTransactions = transactions.Count,
            TotalVolume = transactions.Sum(t => t.Amount),
            Deposits = transactions.Where(t => t.Type == TransactionType.Deposit).Sum(t => t.Amount),
            Withdrawals = transactions.Where(t => t.Type == TransactionType.Withdrawal).Sum(t => t.Amount),
            Transactions = transactions.Take(50) // Limit to recent 50 for performance
        };

        return Ok(summary);
    }

    [HttpPost("cash-session/open")]
    [Authorize(Roles = "Cashier")]
    public async Task<ActionResult> OpenCashSession([FromBody] OpenCashSessionDto model)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var branchId = int.Parse(User.FindFirst("BranchId")?.Value ?? "0");

        if (branchId == 0)
            return BadRequest("User not assigned to a branch");

        // Check if there's already an open session
        var existingSession = await _context.CashSessions
            .FirstOrDefaultAsync(cs => cs.UserId == userId && cs.Status == CashSessionStatus.Open);

        if (existingSession != null)
            return BadRequest("Cash session already open");

        var cashSession = new CashSession
        {
            UserId = userId,
            BranchId = branchId,
            OpeningBalanceHTG = model.OpeningBalanceHTG,
            OpeningBalanceUSD = model.OpeningBalanceUSD,
            SessionStart = DateTime.UtcNow,
            Status = CashSessionStatus.Open
        };

        _context.CashSessions.Add(cashSession);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("Cash Session Opened", "CashSession", cashSession.Id.ToString(), userId);

        return Ok(new { message = "Cash session opened successfully", sessionId = cashSession.Id });
    }

    [HttpPost("cash-session/close")]
    [Authorize(Roles = "Cashier")]
    public async Task<ActionResult> CloseCashSession([FromBody] CloseCashSessionDto model)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        
        var session = await _context.CashSessions
            .FirstOrDefaultAsync(cs => cs.UserId == userId && cs.Status == CashSessionStatus.Open);

        if (session == null)
            return BadRequest("No open cash session found");

        session.ClosingBalanceHTG = model.ClosingBalanceHTG;
        session.ClosingBalanceUSD = model.ClosingBalanceUSD;
        session.SessionEnd = DateTime.UtcNow;
        session.Status = CashSessionStatus.Closed;
        session.Notes = model.Notes;

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("Cash Session Closed", "CashSession", session.Id.ToString(), userId);

        return Ok(new { message = "Cash session closed successfully" });
    }
}

public class OpenCashSessionDto
{
    public decimal OpeningBalanceHTG { get; set; }
    public decimal OpeningBalanceUSD { get; set; }
}

public class CloseCashSessionDto
{
    public decimal ClosingBalanceHTG { get; set; }
    public decimal ClosingBalanceUSD { get; set; }
    public string? Notes { get; set; }
}