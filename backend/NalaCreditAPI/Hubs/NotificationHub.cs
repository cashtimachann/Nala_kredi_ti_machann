using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace NalaCreditAPI.Services;

[Authorize]
public class NotificationHub : Hub
{
    public async Task JoinBranchGroup(string branchId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Branch_{branchId}");
    }

    public async Task LeaveBranchGroup(string branchId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Branch_{branchId}");
    }

    public async Task JoinUserGroup(string userId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
    }

    public async Task SendTransactionNotification(string branchId, object transactionData)
    {
        await Clients.Group($"Branch_{branchId}").SendAsync("TransactionProcessed", transactionData);
    }

    public async Task SendCreditApplicationNotification(string userId, object applicationData)
    {
        await Clients.Group($"User_{userId}").SendAsync("CreditApplicationUpdate", applicationData);
    }

    public async Task SendSystemAlert(string message, string severity = "info")
    {
        await Clients.All.SendAsync("SystemAlert", new { message, severity, timestamp = DateTime.UtcNow });
    }

    public async Task SendCashSessionAlert(string branchId, string message)
    {
        await Clients.Group($"Branch_{branchId}").SendAsync("CashSessionAlert", new { message, timestamp = DateTime.UtcNow });
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var branchId = Context.User?.FindFirst("BranchId")?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            await JoinUserGroup(userId);
        }

        if (!string.IsNullOrEmpty(branchId))
        {
            await JoinBranchGroup(branchId);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var branchId = Context.User?.FindFirst("BranchId")?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"User_{userId}");
        }

        if (!string.IsNullOrEmpty(branchId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Branch_{branchId}");
        }

        await base.OnDisconnectedAsync(exception);
    }
}

public interface INotificationService
{
    Task SendTransactionNotificationAsync(string branchId, object transactionData);
    Task SendCreditApplicationUpdateAsync(string userId, object applicationData);
    Task SendSystemAlertAsync(string message, string severity = "info");
    Task SendCashSessionAlertAsync(string branchId, string message);
}

public class NotificationService : INotificationService
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationService(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task SendTransactionNotificationAsync(string branchId, object transactionData)
    {
        await _hubContext.Clients.Group($"Branch_{branchId}")
            .SendAsync("TransactionProcessed", transactionData);
    }

    public async Task SendCreditApplicationUpdateAsync(string userId, object applicationData)
    {
        await _hubContext.Clients.Group($"User_{userId}")
            .SendAsync("CreditApplicationUpdate", applicationData);
    }

    public async Task SendSystemAlertAsync(string message, string severity = "info")
    {
        await _hubContext.Clients.All.SendAsync("SystemAlert", new 
        { 
            message, 
            severity, 
            timestamp = DateTime.UtcNow 
        });
    }

    public async Task SendCashSessionAlertAsync(string branchId, string message)
    {
        await _hubContext.Clients.Group($"Branch_{branchId}")
            .SendAsync("CashSessionAlert", new 
            { 
                message, 
                timestamp = DateTime.UtcNow 
            });
    }
}