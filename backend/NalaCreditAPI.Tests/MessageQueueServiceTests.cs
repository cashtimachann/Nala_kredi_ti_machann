using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using NalaCreditAPI.Services;
using System.Threading.Tasks;
using Xunit;

namespace NalaCreditAPI.Tests
{
    public class MessageQueueServiceTests
    {
        [Fact]
        public async Task Constructor_DoesNotThrow_WhenRabbitUnavailable()
        {
            // Arrange: point to an unlikely host so connection fails immediately
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] { new KeyValuePair<string, string?>("ConnectionStrings:RabbitMQ", "rabbitmq-unavailable.invalid") })
                .Build();

            var logger = NullLogger<MessageQueueService>.Instance;

            // Act & Assert: constructing should not throw
            var svc = new MessageQueueService(config, logger);

            // Publish should be a no-op and not throw
            await svc.PublishAsync("test-queue", new { message = "hello" });

            // Subscribe should be a no-op and not throw
            svc.Subscribe<object>("test-queue", async (m) => await Task.CompletedTask);
        }
    }
}
