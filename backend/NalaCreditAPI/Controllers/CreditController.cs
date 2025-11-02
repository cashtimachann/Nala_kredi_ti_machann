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
public class CreditController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICreditService _creditService;
    private readonly INotificationService _notificationService;
    private readonly IAuditService _auditService;

    public CreditController(
        ApplicationDbContext context,
        ICreditService creditService,
        INotificationService notificationService,
        IAuditService auditService)
    {
        _context = context;
        _creditService = creditService;
        _notificationService = notificationService;
        _auditService = auditService;
    }

    [HttpPost("application")]
    [Authorize(Roles = "CreditAgent,Manager,BranchSupervisor,SuperAdmin")]
    public async Task<ActionResult> CreateApplication([FromBody] CreditApplicationDto model)
    {
        var agentId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        
        // Validate customer exists
        var customer = await _context.Customers.FindAsync(model.CustomerId);
        if (customer == null)
            return BadRequest("Customer not found");

        var application = new CreditApplication
        {
            CustomerId = model.CustomerId,
            AgentId = agentId,
            RequestedAmount = model.RequestedAmount,
            Currency = model.Currency,
            TermWeeks = model.TermWeeks,
            Purpose = model.Purpose,
            Collateral = model.Collateral,
            InterestRate = 15.0m // Default rate, should come from system config
        };

        await _creditService.CreateApplicationAsync(application);

        // Notify supervisors of new application
        var branchId = User.FindFirst("BranchId")?.Value;
        if (!string.IsNullOrEmpty(branchId))
        {
            await _notificationService.SendTransactionNotificationAsync(
                branchId,
                new
                {
                    type = "new_credit_application",
                    applicationId = application.Id,
                    customer = $"{customer.FirstName} {customer.LastName}",
                    amount = model.RequestedAmount,
                    currency = model.Currency.ToString(),
                    timestamp = DateTime.UtcNow
                });
        }

        return Ok(new { message = "Credit application created successfully", applicationId = application.Id });
    }

    [HttpPost("application/{applicationId}/approve")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin,BranchSupervisor")]
    public async Task<ActionResult> ApproveApplication(int applicationId, [FromBody] CreditApprovalDto model)
    {
        var reviewerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        
        var success = await _creditService.ApproveApplicationAsync(applicationId, reviewerId, model.ApprovedAmount);
        if (!success)
            return BadRequest("Failed to approve application");

        var application = await _context.CreditApplications
            .Include(ca => ca.Customer)
            .Include(ca => ca.Agent)
            .FirstOrDefaultAsync(ca => ca.Id == applicationId);

        // Notify agent of approval
        await _notificationService.SendCreditApplicationUpdateAsync(
            application!.AgentId,
            new
            {
                type = "application_approved",
                applicationId,
                customer = $"{application.Customer.FirstName} {application.Customer.LastName}",
                approvedAmount = model.ApprovedAmount ?? application.RequestedAmount,
                timestamp = DateTime.UtcNow
            });

        return Ok(new { message = "Application approved successfully" });
    }

    [HttpPost("application/{applicationId}/reject")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin,BranchSupervisor")]
    public async Task<ActionResult> RejectApplication(int applicationId, [FromBody] CreditApprovalDto model)
    {
        var reviewerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        
        var success = await _creditService.RejectApplicationAsync(applicationId, reviewerId, model.Comments ?? "");
        if (!success)
            return BadRequest("Failed to reject application");

        var application = await _context.CreditApplications
            .Include(ca => ca.Customer)
            .Include(ca => ca.Agent)
            .FirstOrDefaultAsync(ca => ca.Id == applicationId);

        // Notify agent of rejection
        await _notificationService.SendCreditApplicationUpdateAsync(
            application!.AgentId,
            new
            {
                type = "application_rejected",
                applicationId,
                customer = $"{application.Customer.FirstName} {application.Customer.LastName}",
                reason = model.Comments,
                timestamp = DateTime.UtcNow
            });

        return Ok(new { message = "Application rejected" });
    }

    [HttpGet("applications/pending")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin,BranchSupervisor")]
    public async Task<ActionResult> GetPendingApplications(int page = 1, int pageSize = 20)
    {
        var applications = await _context.CreditApplications
            .Where(ca => ca.Status == CreditApplicationStatus.Submitted)
            .Include(ca => ca.Customer)
            .Include(ca => ca.Agent)
            .OrderBy(ca => ca.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ca => new
            {
                ca.Id,
                ca.ApplicationNumber,
                Customer = $"{ca.Customer.FirstName} {ca.Customer.LastName}",
                Agent = $"{ca.Agent.FirstName} {ca.Agent.LastName}",
                ca.RequestedAmount,
                ca.Currency,
                ca.TermWeeks,
                ca.Purpose,
                ca.CreatedAt
            })
            .ToListAsync();

        return Ok(applications);
    }

    [HttpGet("agent/{agentId}/portfolio")]
    [Authorize(Roles = "CreditAgent,Manager,Admin,SuperAdmin,BranchSupervisor")]
    public async Task<ActionResult> GetAgentPortfolio(string agentId)
    {
        // Verify agent exists and user has permission to view
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
        
        if (currentUserId != agentId && !new[] { "Manager", "Admin", "SuperAdmin", "BranchSupervisor" }.Contains(userRole))
            return Forbid();

        var activeCredits = await _context.Credits
            .Include(c => c.Application)
                .ThenInclude(ca => ca.Customer)
            .Include(c => c.Account)
            .Where(c => c.Application.AgentId == agentId && c.Status == CreditStatus.Active)
            .Select(c => new
            {
                c.Id,
                c.CreditNumber,
                Customer = $"{c.Application.Customer.FirstName} {c.Application.Customer.LastName}",
                c.PrincipalAmount,
                c.OutstandingBalance,
                c.WeeklyPayment,
                c.NextPaymentDate,
                c.DaysInArrears,
                Status = c.Status.ToString()
            })
            .ToListAsync();

        var portfolioSummary = new
        {
            TotalCredits = activeCredits.Count,
            TotalPortfolio = activeCredits.Sum(c => c.OutstandingBalance),
            OverdueCredits = activeCredits.Count(c => c.DaysInArrears > 0),
            AverageTicketSize = activeCredits.Any() ? activeCredits.Average(c => c.PrincipalAmount) : 0,
            Credits = activeCredits
        };

        return Ok(portfolioSummary);
    }

    [HttpPost("payment")]
    [Authorize(Roles = "CreditAgent,Cashier,Manager,Admin,SuperAdmin,BranchSupervisor")]
    public async Task<ActionResult> RecordPayment([FromBody] CreditPaymentDto model)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        
        var credit = await _context.Credits
            .Include(c => c.Account)
            .FirstOrDefaultAsync(c => c.Id == model.CreditId);

        if (credit == null)
            return BadRequest("Credit not found");

        if (credit.Status != CreditStatus.Active)
            return BadRequest("Credit is not active");

        using var transaction = await _context.Database.BeginTransactionAsync();
        
        try
        {
            // Calculate payment breakdown
            var interestAmount = credit.OutstandingBalance * (credit.InterestRate / 100 / 52); // Weekly interest
            var principalAmount = model.Amount - interestAmount;
            
            if (principalAmount < 0)
                principalAmount = 0;

            // Update credit
            credit.OutstandingBalance -= principalAmount;
            credit.WeeksPaid += 1;
            credit.NextPaymentDate = credit.NextPaymentDate.AddDays(7);
            credit.DaysInArrears = Math.Max(0, credit.DaysInArrears - 7);

            if (credit.OutstandingBalance <= 0)
            {
                credit.Status = CreditStatus.PaidOff;
                credit.OutstandingBalance = 0;
            }

            // Create transaction record
            var transactionRecord = new Transaction
            {
                AccountId = credit.AccountId,
                BranchId = credit.Account.BranchId,
                UserId = userId,
                Type = TransactionType.CreditPayment,
                Currency = Currency.HTG, // Assuming HTG for now
                Amount = model.Amount,
                Description = $"Credit payment for {credit.CreditNumber}",
                Status = TransactionStatus.Completed
            };

            _context.Transactions.Add(transactionRecord);
            await _context.SaveChangesAsync();

            // Create credit payment record
            var creditPayment = new CreditPayment
            {
                CreditId = credit.Id,
                Amount = model.Amount,
                PrincipalPaid = principalAmount,
                InterestPaid = interestAmount,
                PaymentDate = DateTime.UtcNow,
                DueDate = credit.NextPaymentDate.AddDays(-7), // Previous due date
                TransactionId = transactionRecord.Id,
                IsLatePayment = credit.DaysInArrears > 0
            };

            _context.CreditPayments.Add(creditPayment);
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
            
            return Ok(new 
            { 
                message = "Payment recorded successfully",
                principalPaid = principalAmount,
                interestPaid = interestAmount,
                remainingBalance = credit.OutstandingBalance
            });
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            return BadRequest("Failed to process payment");
        }
    }

    [HttpGet("payments-due")]
    [Authorize(Roles = "CreditAgent,Manager,Admin,SuperAdmin,BranchSupervisor")]
    public async Task<ActionResult> GetPaymentsDue()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
        var branchId = User.FindFirst("BranchId")?.Value;

        var query = _context.Credits
            .Include(c => c.Application)
                .ThenInclude(ca => ca.Customer)
            .Include(c => c.Account)
            .Where(c => c.Status == CreditStatus.Active);

        // Filter by agent if user is credit agent
        if (userRole == "CreditAgent")
        {
            query = query.Where(c => c.Application.AgentId == userId);
        }
        // Filter by branch if user is branch supervisor
        else if (userRole == "Manager" && !string.IsNullOrEmpty(branchId))
        {
            var branchIdInt = int.Parse(branchId);
            query = query.Where(c => c.Account.BranchId == branchIdInt);
        }

        var weekStart = DateTime.Today.AddDays(-(int)DateTime.Today.DayOfWeek);
        var weekEnd = weekStart.AddDays(7);

        var paymentsDue = await query
            .Where(c => c.NextPaymentDate >= weekStart && c.NextPaymentDate < weekEnd)
            .Select(c => new
            {
                c.Id,
                c.CreditNumber,
                Customer = $"{c.Application.Customer.FirstName} {c.Application.Customer.LastName}",
                CustomerPhone = c.Application.Customer.Phone,
                c.WeeklyPayment,
                c.NextPaymentDate,
                c.DaysInArrears,
                c.OutstandingBalance
            })
            .OrderBy(c => c.NextPaymentDate)
            .ToListAsync();

        return Ok(paymentsDue);
    }
}

public class CreditPaymentDto
{
    public int CreditId { get; set; }
    public decimal Amount { get; set; }
}