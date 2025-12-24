using System;
using System.Collections.Generic;

namespace NalaCreditDesktop.Models
{
    /// <summary>
    /// Branch Manager Dashboard Statistics
    /// </summary>
    public class BranchManagerStats
    {
        public int TotalTransactions { get; set; }
        public string ActiveCashiers { get; set; } = string.Empty;
        public int PendingApprovals { get; set; }
        public string PerformanceScore { get; set; } = string.Empty;
        public string CashBalanceHTG { get; set; } = string.Empty;
        public string CashBalanceUSD { get; set; } = string.Empty;
        public int NewAccounts { get; set; }
        public int ActiveLoans { get; set; }
        public string StaffPresent { get; set; } = string.Empty;
        public int Alerts { get; set; }
    }

    /// <summary>
    /// Pending validation item
    /// </summary>
    public class PendingValidation
    {
        public string Type { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    /// <summary>
    /// Active cash session information
    /// </summary>
    public class CashSession
    {
        public string Cashier { get; set; } = string.Empty;
        public string StartTime { get; set; } = string.Empty;
        public string TransCount { get; set; } = string.Empty;
    }

    /// <summary>
    /// Team member performance
    /// </summary>
    public class TeamMember
    {
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Score { get; set; } = string.Empty;
    }

    /// <summary>
    /// Pending loan approval details
    /// </summary>
    public class PendingLoan
    {
        public int Id { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string SubmittedAt { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    /// <summary>
    /// Branch Supervisor Dashboard (from API)
    /// </summary>
    public class BranchSupervisorDashboard
    {
        public int TodayTransactionCount { get; set; }
        public decimal TodayTransactionVolume { get; set; }
        public int NewAccountsToday { get; set; }
        public int ActiveCredits { get; set; }
        public int ActiveCashiers { get; set; }
        public int PendingCreditApprovals { get; set; }
        public decimal BranchCreditPortfolio { get; set; }
        public decimal AverageTransactionTime { get; set; }
        public List<CashierPerformance> CashierPerformance { get; set; } = new();
        public CashManagementStats? CashManagement { get; set; }
    }

    /// <summary>
    /// Cashier performance data
    /// </summary>
    public class CashierPerformance
    {
        public string CashierName { get; set; } = string.Empty;
        public int TransactionsToday { get; set; }
        public decimal VolumeToday { get; set; }
        public DateTime SessionStart { get; set; }
    }

    /// <summary>
    /// Cash management statistics
    /// </summary>
    public class CashManagementStats
    {
        public int DepositsCount { get; set; }
        public decimal DepositsHTG { get; set; }
        public decimal DepositsUSD { get; set; }
        
        public int WithdrawalsCount { get; set; }
        public decimal WithdrawalsHTG { get; set; }
        public decimal WithdrawalsUSD { get; set; }
        
        public int ExchangeCount { get; set; }
        public decimal ExchangeHTGIn { get; set; }
        public decimal ExchangeHTGOut { get; set; }
        public decimal ExchangeUSDIn { get; set; }
        public decimal ExchangeUSDOut { get; set; }
        
        public int RecoveriesCount { get; set; }
        public decimal RecoveriesHTG { get; set; }
        public decimal RecoveriesUSD { get; set; }
        
        public decimal NetHTG { get; set; }
        public decimal NetUSD { get; set; }
        public decimal TotalVolume { get; set; }
    }
}
