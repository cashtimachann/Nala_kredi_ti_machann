using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.Models;
using NalaCreditAPI.DTOs;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<User> _userManager;

    public DashboardController(ApplicationDbContext context, UserManager<User> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    [HttpGet("cashier")]
    [Authorize(Roles = "Cashier")]
    public async Task<ActionResult<CashierDashboardDto>> GetCashierDashboard()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId!);
        
        if (user?.BranchId == null)
            return BadRequest("User not assigned to a branch");

        var today = DateTime.Today;
        
        // Get active cash session
        var activeCashSession = await _context.CashSessions
            .FirstOrDefaultAsync(cs => cs.UserId == userId && cs.Status == CashSessionStatus.Open);

        // Get today's transactions
        var todayTransactions = await _context.Transactions
            .Where(t => t.UserId == userId && t.CreatedAt.Date == today)
            .ToListAsync();

        // Calculate statistics
        var totalDeposits = todayTransactions
            .Where(t => t.Type == TransactionType.Deposit)
            .Sum(t => t.Currency == Currency.HTG ? t.Amount : t.Amount * (t.ExchangeRate ?? 1));

        var totalWithdrawals = todayTransactions
            .Where(t => t.Type == TransactionType.Withdrawal)
            .Sum(t => t.Currency == Currency.HTG ? t.Amount : t.Amount * (t.ExchangeRate ?? 1));

        var totalExchanges = todayTransactions
            .Where(t => t.Type == TransactionType.CurrencyExchange)
            .Count();

        var clientsServed = todayTransactions
            .Select(t => t.AccountId)
            .Distinct()
            .Count();

        return Ok(new CashierDashboardDto
        {
            CashSessionStatus = activeCashSession?.Status.ToString() ?? "Closed",
            CashBalanceHTG = activeCashSession?.OpeningBalanceHTG ?? 0,
            CashBalanceUSD = activeCashSession?.OpeningBalanceUSD ?? 0,
            TodayDeposits = totalDeposits,
            TodayWithdrawals = totalWithdrawals,
            TodayExchanges = totalExchanges,
            ClientsServed = clientsServed,
            TransactionCount = todayTransactions.Count,
            LastTransactionTime = todayTransactions.LastOrDefault()?.CreatedAt
        });
    }

    [HttpGet("credit-agent")]
    [Authorize(Roles = "CreditAgent")]
    public async Task<ActionResult<CreditAgentDashboardDto>> GetCreditAgentDashboard()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        // Active credits portfolio
        var activeCredits = await _context.Credits
            .Include(c => c.Application)
            .Where(c => c.Application.AgentId == userId && c.Status == CreditStatus.Active)
            .ToListAsync();

        // Pending applications
        var pendingApplications = await _context.CreditApplications
            .Where(ca => ca.AgentId == userId && ca.Status == CreditApplicationStatus.Submitted)
            .CountAsync();

        // This week's payments due
        var weekStart = DateTime.Today.AddDays(-(int)DateTime.Today.DayOfWeek);
        var weekEnd = weekStart.AddDays(7);
        
        var paymentsThisWeek = activeCredits
            .Where(c => c.NextPaymentDate >= weekStart && c.NextPaymentDate < weekEnd)
            .ToList();

        // Performance metrics
        var totalPortfolio = activeCredits.Sum(c => c.OutstandingBalance);
        var overdueCredits = activeCredits.Where(c => c.DaysInArrears > 0).Count();
        var repaymentRate = activeCredits.Count > 0 ? 
            (activeCredits.Count - overdueCredits) / (double)activeCredits.Count * 100 : 100;

        return Ok(new CreditAgentDashboardDto
        {
            ActiveCreditsCount = activeCredits.Count,
            TotalPortfolioAmount = totalPortfolio,
            PendingApplications = pendingApplications,
            PaymentsDueThisWeek = paymentsThisWeek.Count,
            OverdueCredits = overdueCredits,
            RepaymentRate = repaymentRate,
            PaymentsExpectedThisWeek = paymentsThisWeek.Sum(c => c.WeeklyPayment),
            AverageTicketSize = activeCredits.Count > 0 ? activeCredits.Average(c => c.PrincipalAmount) : 0
        });
    }

    [HttpGet("branch-supervisor")]
    [Authorize(Roles = "BranchSupervisor")]
    public async Task<ActionResult<BranchSupervisorDashboardDto>> GetBranchSupervisorDashboard()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId!);
        
        if (user?.BranchId == null)
            return BadRequest("User not assigned to a branch");

        var branchId = user.BranchId.Value;
        var today = DateTime.Today;

        // Today's performance
        var todayTransactions = await _context.Transactions
            .Where(t => t.BranchId == branchId && t.CreatedAt.Date == today)
            .Include(t => t.User)
            .ToListAsync();

        // Active cash sessions
        var activeCashSessions = await _context.CashSessions
            .Include(cs => cs.User)
            .Where(cs => cs.BranchId == branchId && cs.Status == CashSessionStatus.Open)
            .ToListAsync();

        // Branch portfolio
        var branchCredits = await _context.Credits
            .Include(c => c.Account)
            .Where(c => c.Account.BranchId == branchId && c.Status == CreditStatus.Active)
            .ToListAsync();

        // Pending approvals
        var pendingApprovals = await _context.CreditApplications
            .Where(ca => ca.Status == CreditApplicationStatus.UnderReview)
            .CountAsync();

        return Ok(new BranchSupervisorDashboardDto
        {
            TodayTransactionVolume = todayTransactions.Sum(t => t.Amount),
            TodayTransactionCount = todayTransactions.Count,
            ActiveCashiers = activeCashSessions.Count,
            NewAccountsToday = await _context.Accounts
                .Where(a => a.BranchId == branchId && a.CreatedAt.Date == today)
                .CountAsync(),
            BranchCreditPortfolio = branchCredits.Sum(c => c.OutstandingBalance),
            ActiveCredits = branchCredits.Count,
            PendingCreditApprovals = pendingApprovals,
            AverageTransactionTime = 2.5m, // This would come from actual timing data
            CashierPerformance = activeCashSessions.Select(cs => new CashierPerformanceDto
            {
                CashierName = $"{cs.User.FirstName} {cs.User.LastName}",
                TransactionsToday = todayTransactions.Count(t => t.UserId == cs.UserId),
                VolumeToday = todayTransactions.Where(t => t.UserId == cs.UserId).Sum(t => t.Amount),
                SessionStart = cs.SessionStart
            }).ToList()
        });
    }

    [HttpGet("regional-manager")]
    [Authorize(Roles = "RegionalManager")]
    public async Task<ActionResult<RegionalManagerDashboardDto>> GetRegionalManagerDashboard()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId!);
        
        // For now, assume regional manager sees all branches
        // In a real system, you'd have region assignments
        var branches = await _context.Branches.Where(b => b.IsActive).ToListAsync();
        var today = DateTime.Today;

        var branchPerformance = new List<BranchPerformanceDto>();

        foreach (var branch in branches)
        {
            var branchTransactions = await _context.Transactions
                .Where(t => t.BranchId == branch.Id && t.CreatedAt.Date == today)
                .ToListAsync();

            var branchCredits = await _context.Credits
                .Include(c => c.Account)
                .Where(c => c.Account.BranchId == branch.Id && c.Status == CreditStatus.Active)
                .ToListAsync();

            branchPerformance.Add(new BranchPerformanceDto
            {
                BranchName = branch.Name,
                BranchId = branch.Id,
                TodayVolume = branchTransactions.Sum(t => t.Amount),
                TodayTransactions = branchTransactions.Count,
                ActiveCredits = branchCredits.Count,
                CreditPortfolio = branchCredits.Sum(c => c.OutstandingBalance),
                RepaymentRate = CalculateRepaymentRate(branchCredits)
            });
        }

        return Ok(new RegionalManagerDashboardDto
        {
            TotalBranches = branches.Count,
            TotalRegionalVolume = branchPerformance.Sum(bp => bp.TodayVolume),
            TotalRegionalCredits = branchPerformance.Sum(bp => bp.ActiveCredits),
            TotalRegionalPortfolio = branchPerformance.Sum(bp => bp.CreditPortfolio),
            AverageRepaymentRate = branchPerformance.Average(bp => bp.RepaymentRate),
            BranchPerformance = branchPerformance,
            TopPerformingBranch = branchPerformance.OrderByDescending(bp => bp.TodayVolume).FirstOrDefault()?.BranchName ?? "N/A"
        });
    }

    [HttpGet("system-admin")]
    [Authorize(Roles = "SystemAdmin")]
    public async Task<ActionResult<SystemAdminDashboardDto>> GetSystemAdminDashboard()
    {
        var totalUsers = await _userManager.Users.CountAsync();
        var activeUsers = await _userManager.Users.Where(u => u.IsActive).CountAsync();
        var totalBranches = await _context.Branches.CountAsync();
        var activeBranches = await _context.Branches.Where(b => b.IsActive).CountAsync();

        // System health metrics (these would come from actual monitoring)
        var systemHealth = new SystemHealthDto
        {
            CpuUsage = 45.2m,
            MemoryUsage = 67.8m,
            DatabaseSize = 1024m, // MB
            ActiveConnections = await _context.CashSessions.Where(cs => cs.Status == CashSessionStatus.Open).CountAsync(),
            UptimeHours = 72.5m,
            LastBackup = DateTime.Now.AddHours(-6)
        };

        // Recent security events
        var recentAuditLogs = await _context.AuditLogs
            .OrderByDescending(al => al.Timestamp)
            .Take(10)
            .ToListAsync();

        return Ok(new SystemAdminDashboardDto
        {
            TotalUsers = totalUsers,
            ActiveUsers = activeUsers,
            TotalBranches = totalBranches,
            ActiveBranches = activeBranches,
            SystemHealth = systemHealth,
            RecentSecurityEvents = recentAuditLogs.Count,
            PendingUpdates = 2, // This would come from update management system
            BackupStatus = "Healthy"
        });
    }

    [HttpGet("accounting")]
    [Authorize(Roles = "Accounting,Management")]
    public async Task<ActionResult<AccountingDashboardDto>> GetAccountingDashboard()
    {
        var today = DateTime.Today;
        var thisMonth = DateTime.SpecifyKind(new DateTime(today.Year, today.Month, 1), DateTimeKind.Utc);
        var lastMonth = thisMonth.AddMonths(-1);

        // Financial metrics
        var totalDeposits = await _context.Transactions
            .Where(t => t.Type == TransactionType.Deposit && t.CreatedAt >= thisMonth)
            .SumAsync(t => t.Amount);

        var totalWithdrawals = await _context.Transactions
            .Where(t => t.Type == TransactionType.Withdrawal && t.CreatedAt >= thisMonth)
            .SumAsync(t => t.Amount);

        var totalCreditDisbursed = await _context.Transactions
            .Where(t => t.Type == TransactionType.CreditDisbursement && t.CreatedAt >= thisMonth)
            .SumAsync(t => t.Amount);

        var totalCreditRepayments = await _context.Transactions
            .Where(t => t.Type == TransactionType.CreditPayment && t.CreatedAt >= thisMonth)
            .SumAsync(t => t.Amount);

        // Portfolio quality
        var activeCredits = await _context.Credits.Where(c => c.Status == CreditStatus.Active).ToListAsync();
        var totalPortfolio = activeCredits.Sum(c => c.OutstandingBalance);
        var par30Amount = activeCredits.Where(c => c.DaysInArrears >= 30).Sum(c => c.OutstandingBalance);
        var par30Rate = totalPortfolio > 0 ? (double)((par30Amount / totalPortfolio) * 100) : 0.0;

        return Ok(new AccountingDashboardDto
        {
            MonthlyDeposits = totalDeposits,
            MonthlyWithdrawals = totalWithdrawals,
            MonthlyCreditDisbursed = totalCreditDisbursed,
            MonthlyRepayments = totalCreditRepayments,
            NetCashFlow = totalDeposits - totalWithdrawals,
            TotalPortfolio = totalPortfolio,
            PAR30Rate = par30Rate,
            PAR30Amount = par30Amount,
            MonthlyRevenue = totalCreditRepayments * 0.1m, // Simplified calculation
            OperationalExpenses = 50000m, // This would come from actual expense tracking
            NetIncome = (totalCreditRepayments * 0.1m) - 50000m
        });
    }

    [HttpGet("super-admin")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<SuperAdminDashboardDto>> GetSuperAdminDashboard()
    {
        var totalBranches = await _context.Branches.CountAsync();
        var activeBranches = await _context.Branches.Where(b => b.IsActive).CountAsync();
        var totalUsers = await _userManager.Users.CountAsync();
        var activeUsers = await _userManager.Users.Where(u => u.IsActive).CountAsync();

        // Calculate total volume (sum of all transactions)
        var totalVolume = await _context.Transactions.SumAsync(t => t.Amount);

        // Get savings accounts stats
        var totalSavingsAccounts = await _context.SavingsAccounts.CountAsync();
        var activeSavingsAccounts = await _context.SavingsAccounts.Where(sa => sa.Status == NalaCreditAPI.Models.SavingsAccountStatus.Active).CountAsync();
        var totalSavingsBalance = await _context.SavingsAccounts.SumAsync(sa => sa.Balance);

        // Get client stats (Physical + Business persons)
        var totalClients = await _context.SavingsCustomers.CountAsync();
        var activeClients = await _context.SavingsCustomers.Where(sc => sc.IsActive).CountAsync();

        // Calculate balances by currency for client accounts
        var currentAccountBalances = await _context.CurrentAccounts
            .Where(ca => ca.Status == NalaCreditAPI.Models.ClientAccountStatus.Active)
            .GroupBy(ca => ca.Currency)
            .Select(g => new { Currency = g.Key, TotalBalance = g.Sum(ca => ca.Balance) })
            .ToListAsync();

        var termSavingsBalances = await _context.TermSavingsAccounts
            .Where(tsa => tsa.Status == NalaCreditAPI.Models.ClientAccountStatus.Active)
            .GroupBy(tsa => tsa.Currency)
            .Select(g => new { Currency = g.Key, TotalBalance = g.Sum(tsa => tsa.Balance) })
            .ToListAsync();

        var totalClientBalanceHTG = currentAccountBalances.FirstOrDefault(cb => cb.Currency == NalaCreditAPI.Models.ClientCurrency.HTG)?.TotalBalance ?? 0 +
                                    termSavingsBalances.FirstOrDefault(tsb => tsb.Currency == NalaCreditAPI.Models.ClientCurrency.HTG)?.TotalBalance ?? 0;
        var totalClientBalanceUSD = currentAccountBalances.FirstOrDefault(cb => cb.Currency == NalaCreditAPI.Models.ClientCurrency.USD)?.TotalBalance ?? 0 +
                                    termSavingsBalances.FirstOrDefault(tsb => tsb.Currency == NalaCreditAPI.Models.ClientCurrency.USD)?.TotalBalance ?? 0;

        // Get recent activity count (transactions in last 24 hours)
        var yesterday = DateTime.Now.AddDays(-1);
        var recentActivity = await _context.Transactions
            .Where(t => t.CreatedAt >= yesterday)
            .CountAsync();

        return Ok(new SuperAdminDashboardDto
        {
            TotalBranches = totalBranches,
            ActiveBranches = activeBranches,
            TotalUsers = totalUsers,
            ActiveUsers = activeUsers,
            TotalVolume = totalVolume,
            SystemHealth = 96.8m, // This would come from actual monitoring
            RecentActivity = recentActivity,
            TotalSavingsAccounts = totalSavingsAccounts,
            ActiveSavingsAccounts = activeSavingsAccounts,
            TotalSavingsBalance = totalSavingsBalance,
            TotalClientAccounts = totalClients,
            ActiveClientAccounts = activeClients,
            TotalClientBalanceHTG = totalClientBalanceHTG,
            TotalClientBalanceUSD = totalClientBalanceUSD
        });
    }

    [HttpGet("recent-activities")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<List<RecentActivity>>> GetRecentActivities(int limit = 10)
    {
        var activities = new List<RecentActivity>();

        // Get recent branches
        var recentBranches = await _context.Branches
            .OrderByDescending(b => b.CreatedAt)
            .Take(3)
            .ToListAsync();

        foreach (var branch in recentBranches)
        {
            activities.Add(new RecentActivity
            {
                Id = $"branch-{branch.Id}",
                Type = "branch",
                Title = "Nouvelle succursale créée",
                Description = $"{branch.Name} - {branch.Address}",
                Timestamp = branch.CreatedAt
            });
        }

        // Get recent users
        var recentUsers = await _userManager.Users
            .Include(u => u.Branch)
            .OrderByDescending(u => u.CreatedAt)
            .Take(3)
            .ToListAsync();

        foreach (var user in recentUsers)
        {
            activities.Add(new RecentActivity
            {
                Id = $"user-{user.Id}",
                Type = "user",
                Title = "Nouvel utilisateur ajouté",
                Description = $"{user.FirstName} {user.LastName} ({user.UserName}) - {user.Branch?.Name ?? "N/A"}",
                Timestamp = user.CreatedAt
            });
        }

        // Get recent transactions
        var recentTransactions = await _context.Transactions
            .Include(t => t.User)
            .Include(t => t.Branch)
            .OrderByDescending(t => t.CreatedAt)
            .Take(4)
            .ToListAsync();

        foreach (var transaction in recentTransactions)
        {
            activities.Add(new RecentActivity
            {
                Id = $"transaction-{transaction.Id}",
                Type = "transaction",
                Title = $"Transaction {transaction.Type.ToString().ToLower()}",
                Description = $"{transaction.Amount} HTG - {transaction.Branch?.Name ?? "N/A"} par {transaction.User?.FirstName} {transaction.User?.LastName}",
                Timestamp = transaction.CreatedAt
            });
        }

        // Sort by timestamp and take the most recent ones
        return Ok(activities
            .OrderByDescending(a => a.Timestamp)
            .Take(limit)
            .ToList());
    }

    private double CalculateRepaymentRate(List<Credit> credits)
    {
        if (!credits.Any()) return 100.0;
        
        var onTimeCredits = credits.Where(c => c.DaysInArrears == 0).Count();
        return (double)onTimeCredits / credits.Count * 100.0;
    }

    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult Health()
    {
        return Ok(new 
        { 
            status = "Healthy", 
            timestamp = DateTime.UtcNow,
            environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown"
        });
    }
}