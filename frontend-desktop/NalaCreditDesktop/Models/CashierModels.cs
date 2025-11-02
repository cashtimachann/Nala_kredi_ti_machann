using System;
using System.Windows.Media;

namespace NalaCreditDesktop.Models
{
    public class TransactionSummary
    {
        public string Id { get; set; } = string.Empty;
        public DateTime Time { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Type { get; set; } = string.Empty;
        public string TransactionType { get; set; } = string.Empty;
        public string ClientAccount { get; set; } = string.Empty;
        public string AccountId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string ReferenceNumber { get; set; } = string.Empty;
        public string ProcessedBy { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public Brush StatusColor { get; set; } = new SolidColorBrush(Colors.Gray);
    }

    public class CashierSession
    {
        public string SessionId { get; set; } = string.Empty;
        public string CashierName { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public bool IsActive { get; set; }
        public decimal OpeningBalanceHTG { get; set; }
        public decimal OpeningBalanceUSD { get; set; }
        public decimal ClosingBalanceHTG { get; set; }
        public decimal ClosingBalanceUSD { get; set; }
    }

    public class CashBalance
    {
        public decimal HTG { get; set; }
        public decimal USD { get; set; }
        public DateTime LastUpdated { get; set; }
    }

    public class DailyTransactionSummary
    {
        public int DepositsCount { get; set; }
        public decimal DepositsAmountHTG { get; set; }
        public decimal DepositsAmountUSD { get; set; }
        
        public int WithdrawalsCount { get; set; }
        public decimal WithdrawalsAmountHTG { get; set; }
        public decimal WithdrawalsAmountUSD { get; set; }
        
        public decimal UsdSalesAmount { get; set; }
        public decimal UsdPurchaseAmount { get; set; }
        
        public int TotalTransactions { get; set; }
        public int ClientsServed { get; set; }
    }

    public class CashierAlert
    {
        public enum AlertLevel
        {
            Info,
            Warning,
            Critical
        }

        public AlertLevel Level { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; }
        public string Category { get; set; } = string.Empty; // "Balance", "Security", "System", etc.
    }

    public class CashierStatistics
    {
        public int ClientsServedToday { get; set; }
        public int TransactionsProcessedToday { get; set; }
        public TimeSpan AverageTransactionTime { get; set; }
        public double ErrorRate { get; set; }
        public double DailyGoalProgress { get; set; }
        public decimal DailyGoalAmount { get; set; }
        public TimeSpan ActiveTime { get; set; }
    }

    public class ExchangeRate
    {
        public decimal HTGToUSD { get; set; }
        public decimal USDToHTG { get; set; }
        public DateTime LastUpdated { get; set; }
        public string Source { get; set; } = string.Empty;
    }

    public class CashierConfiguration
    {
        public decimal HTGWarningThreshold { get; set; } = 2_000_000m;
        public decimal HTGCriticalThreshold { get; set; } = 2_500_000m;
        public decimal USDWarningThreshold { get; set; } = 12_000m;
        public decimal USDCriticalThreshold { get; set; } = 15_000m;
        
        public decimal HTGMinimumBalance { get; set; } = 100_000m;
        public decimal USDMinimumBalance { get; set; } = 500m;
        
        public int RefreshIntervalSeconds { get; set; } = 30;
        public bool EnableSoundAlerts { get; set; } = true;
        public bool EnableAutoBackup { get; set; } = true;
    }
}