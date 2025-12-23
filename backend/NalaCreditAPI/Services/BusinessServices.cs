using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Models;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace NalaCreditAPI.Services;

public interface IAuthService
{
    Task<string> GenerateJwtToken(User user);
    Task<bool> ValidateCredentials(string email, string password);
}

public class AuthService : IAuthService
{
    private readonly UserManager<User> _userManager;
    private readonly IConfiguration _configuration;

    public AuthService(UserManager<User> userManager, IConfiguration configuration)
    {
        _userManager = userManager;
        _configuration = configuration;
    }

    public Task<string> GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["SecretKey"];
        var issuer = jwtSettings["Issuer"];
        var audience = jwtSettings["Audience"];
        var expiryMinutes = int.Parse(jwtSettings["ExpiryMinutes"] ?? "60");

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(secretKey!);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Name, user.UserName ?? user.Email ?? "Unknown"),
            new Claim(ClaimTypes.Email, user.Email ?? "Unknown"),
            new Claim("FirstName", user.FirstName ?? "Unknown"),
            new Claim("LastName", user.LastName ?? "Unknown"),
            new Claim("Role", user.Role.ToString()),
            new Claim(ClaimTypes.Role, GetRoleName(user.Role)),
            new Claim("AllowedDomain", GetAllowedDomain(user.Role))
        };

        if (user.BranchId.HasValue)
        {
            claims.Add(new Claim("BranchId", user.BranchId.Value.ToString()));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(expiryMinutes),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var tokenString = tokenHandler.WriteToken(token);
        return Task.FromResult(tokenString);
    }

    private string GetRoleName(UserRole role)
    {
        return role switch
        {
            UserRole.Cashier => "Cashier",
            UserRole.Employee => "Employee",
            UserRole.Manager => "Manager",
            UserRole.Admin => "Admin",
            UserRole.SupportTechnique => "SupportTechnique",
            UserRole.SuperAdmin => "SuperAdmin",
            _ => "Unknown"
        };
    }

    private string GetAllowedDomain(UserRole role)
    {
        return role switch
        {
            UserRole.Manager => "branch",  // Branch Manager only on branch domain
            UserRole.SuperAdmin => "admin", // SuperAdmin only on admin domain
            UserRole.Admin => "admin",      // Admin only on admin domain
            UserRole.SupportTechnique => "admin", // Support only on admin domain
            UserRole.Cashier => "branch",   // Cashier on branch domain
            UserRole.Employee => "branch",  // Employee on branch domain
            _ => "branch"
        };
    }

    public async Task<bool> ValidateCredentials(string email, string password)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || !user.IsActive)
            return false;

        return await _userManager.CheckPasswordAsync(user, password);
    }
}

public interface ITransactionService
{
    Task<Transaction> CreateTransactionAsync(Transaction transaction);
    Task<bool> ProcessDepositAsync(int accountId, decimal amount, Currency currency, string userId);
    Task<bool> ProcessWithdrawalAsync(int accountId, decimal amount, Currency currency, string userId);
}

public class TransactionService : ITransactionService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditService _auditService;

    public TransactionService(ApplicationDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    public async Task<Transaction> CreateTransactionAsync(Transaction transaction)
    {
        transaction.TransactionNumber = await GenerateTransactionNumber();
        transaction.CreatedAt = DateTime.UtcNow;
        transaction.ProcessedAt = DateTime.UtcNow;

        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("Transaction Created", "Transaction", transaction.Id.ToString(), transaction.UserId);

        return transaction;
    }

    public async Task<bool> ProcessDepositAsync(int accountId, decimal amount, Currency currency, string userId)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        
        try
        {
            var account = await _context.Accounts.FindAsync(accountId);
            if (account == null) return false;

            // Update account balance
            if (currency == Currency.HTG)
                account.BalanceHTG += amount;
            else
                account.BalanceUSD += amount;

            account.LastTransaction = DateTime.UtcNow;

            // Create transaction record
            var transactionRecord = new Transaction
            {
                AccountId = accountId,
                BranchId = account.BranchId,
                UserId = userId,
                Type = TransactionType.Deposit,
                Currency = currency,
                Amount = amount,
                BalanceAfter = currency == Currency.HTG ? account.BalanceHTG : account.BalanceUSD,
                Status = TransactionStatus.Completed
            };

            await CreateTransactionAsync(transactionRecord);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            return false;
        }
    }

    public async Task<bool> ProcessWithdrawalAsync(int accountId, decimal amount, Currency currency, string userId)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        
        try
        {
            var account = await _context.Accounts.FindAsync(accountId);
            if (account == null) return false;

            // Check sufficient balance
            var currentBalance = currency == Currency.HTG ? account.BalanceHTG : account.BalanceUSD;
            if (currentBalance < amount) return false;

            // Update account balance
            if (currency == Currency.HTG)
                account.BalanceHTG -= amount;
            else
                account.BalanceUSD -= amount;

            account.LastTransaction = DateTime.UtcNow;

            // Create transaction record
            var transactionRecord = new Transaction
            {
                AccountId = accountId,
                BranchId = account.BranchId,
                UserId = userId,
                Type = TransactionType.Withdrawal,
                Currency = currency,
                Amount = amount,
                BalanceAfter = currency == Currency.HTG ? account.BalanceHTG : account.BalanceUSD,
                Status = TransactionStatus.Completed
            };

            await CreateTransactionAsync(transactionRecord);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            return false;
        }
    }

    private async Task<string> GenerateTransactionNumber()
    {
        // Retain original sequential-per-day logic (needs DB) -> must stay async.
        var today = DateTime.Today.ToString("yyyyMMdd");
        var lastTransaction = await _context.Transactions
            .Where(t => t.TransactionNumber.StartsWith(today))
            .OrderByDescending(t => t.TransactionNumber)
            .FirstOrDefaultAsync();

        var sequence = 1;
        if (lastTransaction != null)
        {
            var lastSequence = lastTransaction.TransactionNumber.Substring(8);
            if (int.TryParse(lastSequence, out var lastSeq))
                sequence = lastSeq + 1;
        }

        return $"{today}{sequence:D6}";
    }
}

public interface ICreditService
{
    Task<CreditApplication> CreateApplicationAsync(CreditApplication application);
    Task<bool> ApproveApplicationAsync(int applicationId, string reviewerId, decimal? approvedAmount = null);
    Task<bool> RejectApplicationAsync(int applicationId, string reviewerId, string comments);
}

public class CreditService : ICreditService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditService _auditService;

    public CreditService(ApplicationDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    public async Task<CreditApplication> CreateApplicationAsync(CreditApplication application)
    {
        application.ApplicationNumber = await GenerateApplicationNumber();
        application.CreatedAt = DateTime.UtcNow;
        application.Status = CreditApplicationStatus.Submitted;

        _context.CreditApplications.Add(application);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("Credit Application Created", "CreditApplication", application.Id.ToString(), application.AgentId);

        return application;
    }

    public async Task<bool> ApproveApplicationAsync(int applicationId, string reviewerId, decimal? approvedAmount = null)
    {
        var application = await _context.CreditApplications.FindAsync(applicationId);
        if (application == null || application.Status != CreditApplicationStatus.Submitted)
            return false;

        application.Status = CreditApplicationStatus.Approved;
        application.ReviewedAt = DateTime.UtcNow;
        application.ApprovedAt = DateTime.UtcNow;
        application.ReviewedBy = reviewerId;
        application.ApprovedAmount = approvedAmount ?? application.RequestedAmount;

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("Credit Application Approved", "CreditApplication", applicationId.ToString(), reviewerId);

        return true;
    }

    public async Task<bool> RejectApplicationAsync(int applicationId, string reviewerId, string comments)
    {
        var application = await _context.CreditApplications.FindAsync(applicationId);
        if (application == null || application.Status != CreditApplicationStatus.Submitted)
            return false;

        application.Status = CreditApplicationStatus.Rejected;
        application.ReviewedAt = DateTime.UtcNow;
        application.ReviewedBy = reviewerId;
        application.Comments = comments;

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("Credit Application Rejected", "CreditApplication", applicationId.ToString(), reviewerId);

        return true;
    }

    private async Task<string> GenerateApplicationNumber()
    {
        var year = DateTime.Now.Year.ToString();
        var lastApplication = await _context.CreditApplications
            .Where(ca => ca.ApplicationNumber.StartsWith(year))
            .OrderByDescending(ca => ca.ApplicationNumber)
            .FirstOrDefaultAsync();

        var sequence = 1;
        if (lastApplication != null)
        {
            var lastSequence = lastApplication.ApplicationNumber.Substring(4);
            if (int.TryParse(lastSequence, out var lastSeq))
                sequence = lastSeq + 1;
        }

        return $"{year}{sequence:D6}";
    }
}

public interface IDashboardService
{
    Task<object> GetDashboardDataAsync(string userId, UserRole role);
}

public class DashboardService : IDashboardService
{
    private readonly ApplicationDbContext _context;

    public DashboardService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<object> GetDashboardDataAsync(string userId, UserRole role)
    {
        return role switch
        {
            UserRole.Cashier => await GetCashierDashboardAsync(userId),
            UserRole.Employee => await GetCreditAgentDashboardAsync(userId),
            UserRole.Manager => await GetBranchSupervisorDashboardAsync(userId),
            UserRole.Admin => await GetRegionalManagerDashboardAsync(userId),
            UserRole.SupportTechnique => await GetSystemAdminDashboardAsync(),
            UserRole.SuperAdmin => await GetSuperAdminDashboardAsync(),
            _ => throw new ArgumentException("Invalid user role")
        };
    }

    private Task<object> GetCashierDashboardAsync(string userId)
    {
        // Placeholder implementation; replace with real aggregated data queries.
        return Task.FromResult<object>(new { Message = "Cashier dashboard data" });
    }

    private Task<object> GetCreditAgentDashboardAsync(string userId)
    {
        return Task.FromResult<object>(new { Message = "Credit agent dashboard data" });
    }

    private Task<object> GetBranchSupervisorDashboardAsync(string userId)
    {
        return Task.FromResult<object>(new { Message = "Branch supervisor dashboard data" });
    }

    private Task<object> GetRegionalManagerDashboardAsync(string userId)
    {
        return Task.FromResult<object>(new { Message = "Regional manager dashboard data" });
    }

    private Task<object> GetSystemAdminDashboardAsync()
    {
        return Task.FromResult<object>(new { Message = "System admin dashboard data" });
    }

    private Task<object> GetAccountingDashboardAsync()
    {
        return Task.FromResult<object>(new { Message = "Accounting dashboard data" });
    }

    private Task<object> GetSuperAdminDashboardAsync()
    {
        return Task.FromResult<object>(new { Message = "Super admin dashboard data" });
    }
}

public interface IAuditService
{
    Task LogAsync(string action, string entityType, string? entityId, string userId);
}

public class AuditService : IAuditService
{
    private readonly ApplicationDbContext _context;

    public AuditService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(string action, string entityType, string? entityId, string userId)
    {
        var auditLog = new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Timestamp = DateTime.UtcNow
        };

        _context.AuditLogs.Add(auditLog);
        await _context.SaveChangesAsync();
    }
}

// Enhanced Transaction Service with Queue Integration
public class EnhancedTransactionService : ITransactionService
{
    private readonly ITransactionService _transactionService;
    private readonly IMessageQueueService _messageQueue;
    private readonly ICacheService _cache;
    private readonly ILogger<EnhancedTransactionService> _logger;

    public EnhancedTransactionService(
        TransactionService transactionService,
        IMessageQueueService messageQueue,
        ICacheService cache,
        ILogger<EnhancedTransactionService> logger)
    {
        _transactionService = transactionService;
        _messageQueue = messageQueue;
        _cache = cache;
        _logger = logger;
    }

    public async Task<Transaction> CreateTransactionAsync(Transaction transaction)
    {
        var result = await _transactionService.CreateTransactionAsync(transaction);

        // Send notification to queue
        await _messageQueue.PublishAsync("transaction-notifications", new TransactionNotification
        {
            TransactionId = result.Id.ToString(),
            UserId = transaction.UserId,
            Type = transaction.Type.ToString(),
            Amount = transaction.Amount,
            Currency = transaction.Currency.ToString()
        });

        // Clear related cache
        await _cache.RemovePatternAsync($"dashboard:*");

        _logger.LogInformation("Transaction created and notification sent: {TransactionId}", result.Id);
        return result;
    }

    public async Task<bool> ProcessDepositAsync(int accountId, decimal amount, Currency currency, string userId)
    {
        var result = await _transactionService.ProcessDepositAsync(accountId, amount, currency, userId);

        // Send notification to queue
        await _messageQueue.PublishAsync("transaction-notifications", new TransactionNotification
        {
            TransactionId = accountId.ToString(),
            UserId = userId,
            Type = "Deposit",
            Amount = amount,
            Currency = currency.ToString()
        });

        // Clear related cache
        await _cache.RemovePatternAsync($"dashboard:*");
        await _cache.RemoveAsync($"account:{accountId}");

        _logger.LogInformation("Deposit processed and notification sent for account: {AccountId}", accountId);
        return result;
    }

    public async Task<bool> ProcessWithdrawalAsync(int accountId, decimal amount, Currency currency, string userId)
    {
        var result = await _transactionService.ProcessWithdrawalAsync(accountId, amount, currency, userId);

        // Send notification to queue
        await _messageQueue.PublishAsync("transaction-notifications", new TransactionNotification
        {
            TransactionId = accountId.ToString(),
            UserId = userId,
            Type = "Withdrawal",
            Amount = amount,
            Currency = currency.ToString()
        });

        // Clear related cache
        await _cache.RemovePatternAsync($"dashboard:*");
        await _cache.RemoveAsync($"account:{accountId}");

        _logger.LogInformation("Withdrawal processed and notification sent for account: {AccountId}", accountId);
        return result;
    }
}