using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;

namespace NalaCreditAPI.Services
{
    public interface IMessageQueueService
    {
        Task PublishAsync<T>(string queueName, T message) where T : class;
        void Subscribe<T>(string queueName, Func<T, Task> handler) where T : class;
    }

    public class MessageQueueService : IMessageQueueService, IDisposable
    {
        private IConnection? _connection;
        private IModel? _channel;
        private readonly ILogger<MessageQueueService> _logger;
        private readonly Dictionary<string, IModel> _channels = new();
        private readonly object _sync = new();
        private volatile bool _isConnected = false;
        private readonly ConnectionFactory _factory;

        public MessageQueueService(IConfiguration configuration, ILogger<MessageQueueService> logger)
        {
            _logger = logger;
            
            _factory = new ConnectionFactory()
            {
                HostName = configuration.GetConnectionString("RabbitMQ") ?? "localhost",
                Port = 5672,
                UserName = "guest",
                Password = "guest",
                VirtualHost = "/"
            };

            // Try to connect, but do not throw if RabbitMQ is unavailable. The service
            // will operate in a disabled/no-op mode until a successful connection is made.
            try
            {
                TryConnect();
            }
            catch (Exception ex)
            {
                // Already logged inside TryConnect; keep service in disconnected state
                _logger.LogWarning(ex, "MessageQueueService started without RabbitMQ connection. Message publishing and subscriptions will be no-ops until a connection is available.");
            }
        }

        private void TryConnect()
        {
            lock (_sync)
            {
                if (_isConnected)
                    return;

                _connection = _factory.CreateConnection();
                _channel = _connection.CreateModel();
                _isConnected = true;
                _logger.LogInformation("Connected to RabbitMQ successfully");
            }
        }

        public async Task PublishAsync<T>(string queueName, T message) where T : class
        {
            try
            {
                if (!_isConnected || _channel == null)
                {
                    _logger.LogWarning("Cannot publish to queue {QueueName} because RabbitMQ is not connected. Message will be dropped.", queueName);
                    return;
                }

                _channel.QueueDeclare(
                    queue: queueName,
                    durable: true,
                    exclusive: false,
                    autoDelete: false,
                    arguments: null);

                var json = JsonSerializer.Serialize(message);
                var body = Encoding.UTF8.GetBytes(json);

                var properties = _channel.CreateBasicProperties();
                properties.Persistent = true;
                properties.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());

                _channel.BasicPublish(
                    exchange: "",
                    routingKey: queueName,
                    basicProperties: properties,
                    body: body);

                _logger.LogInformation("Message published to queue {QueueName}", queueName);
                await Task.CompletedTask;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error publishing message to queue {QueueName}. Marking service as disconnected.", queueName);
                // Mark disconnected so subsequent attempts will be no-ops and an attempt
                // to reconnect can be triggered on next publish/subscribes.
                _isConnected = false;
                // Optionally attempt a reconnection asynchronously (fire-and-forget)
                _ = Task.Run(() =>
                {
                    try
                    {
                        TryConnect();
                    }
                    catch (Exception reconEx)
                    {
                        _logger.LogDebug(reconEx, "Reconnection attempt to RabbitMQ failed");
                    }
                });
                // swallow to avoid crashing callers
                return;
            }
        }

        public void Subscribe<T>(string queueName, Func<T, Task> handler) where T : class
        {
            try
            {
                if (!_isConnected || _connection == null)
                {
                    _logger.LogWarning("Cannot subscribe to queue {QueueName} because RabbitMQ is not connected. Subscription will be ignored.", queueName);
                    return;
                }

                var channel = _connection.CreateModel();
                _channels[queueName] = channel;

                channel.QueueDeclare(
                    queue: queueName,
                    durable: true,
                    exclusive: false,
                    autoDelete: false,
                    arguments: null);

                channel.BasicQos(prefetchSize: 0, prefetchCount: 1, global: false);

                var consumer = new EventingBasicConsumer(channel);
                consumer.Received += async (model, ea) =>
                {
                    try
                    {
                        var body = ea.Body.ToArray();
                        var json = Encoding.UTF8.GetString(body);
                        var message = JsonSerializer.Deserialize<T>(json);

                        if (message != null)
                        {
                            await handler(message);
                        }

                        channel.BasicAck(deliveryTag: ea.DeliveryTag, multiple: false);
                        _logger.LogInformation("Message processed from queue {QueueName}", queueName);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing message from queue {QueueName}", queueName);
                        channel.BasicNack(deliveryTag: ea.DeliveryTag, multiple: false, requeue: true);
                    }
                };

                channel.BasicConsume(queue: queueName, autoAck: false, consumer: consumer);
                _logger.LogInformation("Subscribed to queue {QueueName}", queueName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error subscribing to queue {QueueName}. Subscription will be ignored.", queueName);
                _isConnected = false;
                return;
            }
        }

        public void Dispose()
        {
            foreach (var channel in _channels.Values)
            {
                channel?.Close();
                channel?.Dispose();
            }
            _channels.Clear();
            
            _channel?.Close();
            _channel?.Dispose();
            _connection?.Close();
            _connection?.Dispose();
        }
    }

    // Message models for queues
    public class TransactionNotification
    {
        public string TransactionId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class AuditLogMessage
    {
        public string UserId { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string EntityType { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public Dictionary<string, object> Changes { get; set; } = new();
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}