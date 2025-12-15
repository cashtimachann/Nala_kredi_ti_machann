using StackExchange.Redis;
using System.Text.Json;

namespace NalaCreditAPI.Services
{
    public interface ICacheService
    {
        Task<T?> GetAsync<T>(string key) where T : class;
        Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class;
        Task RemoveAsync(string key);
        Task RemovePatternAsync(string pattern);
    }

    public class CacheService : ICacheService
    {
        private readonly IDatabase _database;
        private readonly IServer? _server;
        private readonly ILogger<CacheService> _logger;

        public CacheService(IConnectionMultiplexer redis, ILogger<CacheService> logger)
        {
            _logger = logger;

            _database = redis.GetDatabase();

            var endpoints = redis.GetEndPoints();
            if (endpoints.Length > 0)
            {
                try
                {
                    _server = redis.GetServer(endpoints[0]);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Redis server endpoint indisponib – certaines opérations cache yo ap limite");
                }
            }
            else
            {
                _logger.LogWarning("Redis paret pa gen okenn endpoints – mode degrade");
            }
        }

        public async Task<T?> GetAsync<T>(string key) where T : class
        {
            try
            {
                var value = await _database.StringGetAsync(key);
                if (!value.HasValue)
                    return null;

                return JsonSerializer.Deserialize<T>(value!);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cache value for key: {Key}", key);
                return null;
            }
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class
        {
            try
            {
                var serializedValue = JsonSerializer.Serialize(value);
                await _database.StringSetAsync(key, serializedValue, expiration);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting cache value for key: {Key}", key);
            }
        }

        public async Task RemoveAsync(string key)
        {
            try
            {
                await _database.KeyDeleteAsync(key);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing cache value for key: {Key}", key);
            }
        }

        public async Task RemovePatternAsync(string pattern)
        {
            try
            {
                if (_server == null)
                {
                    _logger.LogDebug("Redis server non inicialize – skip remove pattern {Pattern}", pattern);
                    return;
                }

                var keys = _server.Keys(pattern: pattern).ToArray();
                if (keys.Length > 0)
                {
                    await _database.KeyDeleteAsync(keys);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing cache values for pattern: {Pattern}", pattern);
            }
        }
    }

    public sealed class NoOpCacheService : ICacheService
    {
        private readonly ILogger _logger;

        public NoOpCacheService(ILogger logger)
        {
            _logger = logger;
            _logger.LogWarning("ICacheService ap kouri san Redis (mode degrade)");
        }

        public Task<T?> GetAsync<T>(string key) where T : class
        {
            _logger.LogDebug("Cache disabled – Get {Key}", key);
            return Task.FromResult<T?>(null);
        }

        public Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class
        {
            _logger.LogDebug("Cache disabled – Set {Key}", key);
            return Task.CompletedTask;
        }

        public Task RemoveAsync(string key)
        {
            _logger.LogDebug("Cache disabled – Remove {Key}", key);
            return Task.CompletedTask;
        }

        public Task RemovePatternAsync(string pattern)
        {
            _logger.LogDebug("Cache disabled – RemovePattern {Pattern}", pattern);
            return Task.CompletedTask;
        }
    }
}