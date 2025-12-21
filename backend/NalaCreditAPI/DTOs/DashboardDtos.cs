namespace NalaCreditAPI.DTOs;

public class CashierDashboardDto
{
    public string CashSessionStatus { get; set; } = string.Empty;
    public decimal CashBalanceHTG { get; set; }
    public decimal CashBalanceUSD { get; set; }
    public decimal TodayDeposits { get; set; }
    public decimal TodayWithdrawals { get; set; }
    public int TodayExchanges { get; set; }
    public int ClientsServed { get; set; }
    public int TransactionCount { get; set; }
    public DateTime? LastTransactionTime { get; set; }
}

public class CreditAgentDashboardDto
{
    public int ActiveCreditsCount { get; set; }
    public decimal TotalPortfolioAmount { get; set; }
    public int PendingApplications { get; set; }
    public int PaymentsDueThisWeek { get; set; }
    public int OverdueCredits { get; set; }
    public double RepaymentRate { get; set; }
    public decimal PaymentsExpectedThisWeek { get; set; }
    public decimal AverageTicketSize { get; set; }
}

public class BranchSupervisorDashboardDto
{
    public decimal TodayTransactionVolume { get; set; }
    public int TodayTransactionCount { get; set; }
    public int ActiveCashiers { get; set; }
    public int NewAccountsToday { get; set; }
    public decimal BranchCreditPortfolio { get; set; }
    public int ActiveCredits { get; set; }
    public int PendingCreditApprovals { get; set; }
    public decimal AverageTransactionTime { get; set; }
    public List<CashierPerformanceDto> CashierPerformance { get; set; } = new();
}

public class CashierPerformanceDto
{
    public string CashierName { get; set; } = string.Empty;
    public int TransactionsToday { get; set; }
    public decimal VolumeToday { get; set; }
    public DateTime SessionStart { get; set; }
}

// Alias pour compatibilité
public class ManagerDashboardDto : BranchSupervisorDashboardDto
{
}

public class RegionalManagerDashboardDto
{
    public int TotalBranches { get; set; }
    public decimal TotalRegionalVolume { get; set; }
    public int TotalRegionalCredits { get; set; }
    public decimal TotalRegionalPortfolio { get; set; }
    public double AverageRepaymentRate { get; set; }
    public List<RegionalBranchPerformanceDto> BranchPerformance { get; set; } = new();
    public string TopPerformingBranch { get; set; } = string.Empty;
}

public class RegionalBranchPerformanceDto
{
    public string BranchName { get; set; } = string.Empty;
    public int BranchId { get; set; }
    public decimal TodayVolume { get; set; }
    public int TodayTransactions { get; set; }
    public int ActiveCredits { get; set; }
    public decimal CreditPortfolio { get; set; }
    public double RepaymentRate { get; set; }
}

public class SystemAdminDashboardDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int TotalBranches { get; set; }
    public int ActiveBranches { get; set; }
    public SystemHealthDto SystemHealth { get; set; } = new();
    public int RecentSecurityEvents { get; set; }
    public int PendingUpdates { get; set; }
    public string BackupStatus { get; set; } = string.Empty;
}

public class SystemHealthDto
{
    public decimal CpuUsage { get; set; }
    public decimal MemoryUsage { get; set; }
    public decimal DatabaseSize { get; set; }
    public int ActiveConnections { get; set; }
    public decimal UptimeHours { get; set; }
    public DateTime LastBackup { get; set; }
}

public class AccountingDashboardDto
{
    public decimal MonthlyDeposits { get; set; }
    public decimal MonthlyWithdrawals { get; set; }
    public decimal MonthlyCreditDisbursed { get; set; }
    public decimal MonthlyRepayments { get; set; }
    public decimal NetCashFlow { get; set; }
    public decimal TotalPortfolio { get; set; }
    public double PAR30Rate { get; set; }
    public decimal PAR30Amount { get; set; }
    public decimal MonthlyRevenue { get; set; }
    public decimal OperationalExpenses { get; set; }
    public decimal NetIncome { get; set; }
}

public class SuperAdminDashboardDto
{
    public int TotalBranches { get; set; }
    public int ActiveBranches { get; set; }
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public decimal TotalVolume { get; set; }
    public decimal SystemHealth { get; set; }
    public int RecentActivity { get; set; }
    public int TotalSavingsAccounts { get; set; }
    public int ActiveSavingsAccounts { get; set; }
    public decimal TotalSavingsBalance { get; set; }
    public int TotalClientAccounts { get; set; }
    public int ActiveClientAccounts { get; set; }
    public decimal TotalClientBalanceHTG { get; set; }
    public decimal TotalClientBalanceUSD { get; set; }
}

public class RecentActivity
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // 'branch', 'user', 'transaction', 'account'
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}