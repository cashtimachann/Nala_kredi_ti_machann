using NalaCreditAPI.Services;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.Services
{
    public class CachedDashboardService : IDashboardService
    {
        private readonly IDashboardService _dashboardService;
        private readonly ICacheService _cacheService;
        private readonly ILogger<CachedDashboardService> _logger;

        public CachedDashboardService(
            DashboardService dashboardService,
            ICacheService cacheService,
            ILogger<CachedDashboardService> logger)
        {
            _dashboardService = dashboardService;
            _cacheService = cacheService;
            _logger = logger;
        }

        public async Task<object> GetDashboardDataAsync(string userId, UserRole role)
        {
            var cacheKey = $"dashboard:{role}:{userId}";
            
            var cached = await _cacheService.GetAsync<object>(cacheKey);
            if (cached != null)
            {
                _logger.LogInformation("Dashboard data retrieved from cache: {CacheKey}", cacheKey);
                return cached;
            }

            var data = await _dashboardService.GetDashboardDataAsync(userId, role);
            var cacheMinutes = role switch
            {
                UserRole.Cashier => 2,
                UserRole.Employee => 5,
                UserRole.Manager => 10,
                UserRole.Admin => 5,
                UserRole.SupportTechnique => 10,
                UserRole.SuperAdmin => 5,
                _ => 5
            };
            
            await _cacheService.SetAsync(cacheKey, data, TimeSpan.FromMinutes(cacheMinutes));
            
            _logger.LogInformation("Dashboard data cached: {CacheKey}", cacheKey);
            return data;
        }

        // Method to clear cache when data changes
        public async Task ClearDashboardCacheAsync(string? specificKey = null)
        {
            if (specificKey != null)
            {
                await _cacheService.RemoveAsync(specificKey);
            }
            else
            {
                // Clear all dashboard cache
                await _cacheService.RemovePatternAsync("dashboard:*");
            }
            
            _logger.LogInformation("Dashboard cache cleared: {Key}", specificKey ?? "all");
        }
    }
}