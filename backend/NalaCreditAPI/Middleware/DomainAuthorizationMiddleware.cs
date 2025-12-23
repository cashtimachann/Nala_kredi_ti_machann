using System.Security.Claims;

namespace NalaCreditAPI.Middleware;

public class DomainAuthorizationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<DomainAuthorizationMiddleware> _logger;

    public DomainAuthorizationMiddleware(RequestDelegate next, ILogger<DomainAuthorizationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip validation for non-authenticated requests and public endpoints
        if (!context.User.Identity?.IsAuthenticated ?? true)
        {
            await _next(context);
            return;
        }

        // Skip validation for auth endpoints
        var path = context.Request.Path.Value?.ToLower() ?? "";
        if (path.Contains("/api/auth/") || path.Contains("/health") || path.Contains("/swagger"))
        {
            await _next(context);
            return;
        }

        // Get the host from the request
        var host = context.Request.Host.Host.ToLower();
        
        // Determine which domain the request is coming from
        string currentDomain;
        if (host.StartsWith("admin."))
        {
            currentDomain = "admin";
        }
        else if (host.StartsWith("branch."))
        {
            currentDomain = "branch";
        }
        else
        {
            // For localhost or other domains, allow both
            await _next(context);
            return;
        }

        // Get the allowed domain from the user's claims
        var allowedDomain = context.User.FindFirst("AllowedDomain")?.Value;
        
        if (string.IsNullOrEmpty(allowedDomain))
        {
            _logger.LogWarning("User {UserId} has no AllowedDomain claim", context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            await _next(context);
            return;
        }

        // Check if user is accessing the correct domain
        if (allowedDomain != currentDomain)
        {
            var role = context.User.FindFirst("Role")?.Value ?? "Unknown";
            var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";
            
            _logger.LogWarning(
                "Domain authorization failed: User {UserId} with role {Role} (allowed: {AllowedDomain}) tried to access {CurrentDomain} domain",
                userId, role, allowedDomain, currentDomain);

            context.Response.StatusCode = 403;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                message = $"Access denied. You are not authorized to access this domain. Please use the correct portal: https://{allowedDomain}.nalakreditimachann.com"
            });
            return;
        }

        await _next(context);
    }
}
