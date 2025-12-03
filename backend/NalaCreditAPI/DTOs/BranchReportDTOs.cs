using NalaCreditAPI.Models;

namespace NalaCreditAPI.DTOs;

/// <summary>
/// Rapport journalier d'une succursale
/// </summary>
public class DailyBranchReportDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public DateTime ReportDate { get; set; }
    
    // Crédits décaissés
    public List<CreditDisbursementDto> CreditsDisbursed { get; set; } = new();
    public decimal TotalCreditsDisbursedHTG { get; set; }
    public decimal TotalCreditsDisbursedUSD { get; set; }
    public int CreditsDisbursedCount { get; set; }
    
    // Paiements reçus (crédits)
    public List<CreditPaymentSummaryDto> PaymentsReceived { get; set; } = new();
    public decimal TotalPaymentsReceivedHTG { get; set; }
    public decimal TotalPaymentsReceivedUSD { get; set; }
    public int PaymentsReceivedCount { get; set; }
    
    // Dépôts (comptes courants/épargne)
    public List<TransactionSummaryDto> Deposits { get; set; } = new();
    public decimal TotalDepositsHTG { get; set; }
    public decimal TotalDepositsUSD { get; set; }
    public int DepositsCount { get; set; }
    
    // Retraits
    public List<TransactionSummaryDto> Withdrawals { get; set; } = new();
    public decimal TotalWithdrawalsHTG { get; set; }
    public decimal TotalWithdrawalsUSD { get; set; }
    public int WithdrawalsCount { get; set; }
    
    // Solde de caisse
    public CashBalanceDto CashBalance { get; set; } = new();
    
    // Transferts inter-succursales
    public List<InterBranchTransferSummaryDto> InterBranchTransfers { get; set; } = new();
    public decimal TotalTransfersOutHTG { get; set; }
    public decimal TotalTransfersOutUSD { get; set; }
    public decimal TotalTransfersInHTG { get; set; }
    public decimal TotalTransfersInUSD { get; set; }
    
    // Statistiques générales
    public int TotalTransactions { get; set; }
    public int ActiveCashSessions { get; set; }
    public int CompletedCashSessions { get; set; }
}

/// <summary>
/// Résumé d'un crédit décaissé
/// </summary>
public class CreditDisbursementDto
{
    public int CreditId { get; set; }
    public string CreditNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public Currency Currency { get; set; }
    public DateTime DisbursementDate { get; set; }
    public string DisbursedBy { get; set; } = string.Empty;
    public int TermWeeks { get; set; }
    public decimal InterestRate { get; set; }
}

/// <summary>
/// Résumé d'un paiement de crédit
/// </summary>
public class CreditPaymentSummaryDto
{
    public int PaymentId { get; set; }
    public string CreditNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal PrincipalPaid { get; set; }
    public decimal InterestPaid { get; set; }
    public decimal? PenaltyPaid { get; set; }
    public Currency Currency { get; set; }
    public DateTime PaymentDate { get; set; }
    public string ReceivedBy { get; set; } = string.Empty;
}

/// <summary>
/// Résumé d'une transaction (dépôt/retrait)
/// </summary>
public class TransactionSummaryDto
{
    public long TransactionId { get; set; }
    public string TransactionNumber { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public Currency Currency { get; set; }
    public TransactionType Type { get; set; }
    public DateTime TransactionDate { get; set; }
    public string ProcessedBy { get; set; } = string.Empty;
}

/// <summary>
/// Solde de caisse de la succursale
/// </summary>
public class CashBalanceDto
{
    public decimal OpeningBalanceHTG { get; set; }
    public decimal OpeningBalanceUSD { get; set; }
    public decimal ClosingBalanceHTG { get; set; }
    public decimal ClosingBalanceUSD { get; set; }
    public decimal NetChangeHTG { get; set; }
    public decimal NetChangeUSD { get; set; }
    
    // Détails par session de caisse
    public List<CashSessionSummaryDto> CashSessions { get; set; } = new();
}

/// <summary>
/// Résumé d'une session de caisse
/// </summary>
public class CashSessionSummaryDto
{
    public int SessionId { get; set; }
    public string CashierName { get; set; } = string.Empty;
    public decimal OpeningBalanceHTG { get; set; }
    public decimal OpeningBalanceUSD { get; set; }
    public decimal ClosingBalanceHTG { get; set; }
    public decimal ClosingBalanceUSD { get; set; }
    public DateTime OpenedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public string Status { get; set; } = string.Empty;
}

/// <summary>
/// Résumé d'un transfert inter-succursales
/// </summary>
public class InterBranchTransferSummaryDto
{
    public int TransferId { get; set; }
    public string TransferNumber { get; set; } = string.Empty;
    public string SourceBranch { get; set; } = string.Empty;
    public string DestinationBranch { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public Currency Currency { get; set; }
    public DateTime TransferDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string InitiatedBy { get; set; } = string.Empty;
}

/// <summary>
/// Paramètres pour générer un rapport
/// </summary>
public class BranchReportRequestDto
{
    public int BranchId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IncludeDetails { get; set; } = true;
}

/// <summary>
/// Rapport mensuel de succursale
/// </summary>
public class MonthlyBranchReportDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }
    
    // Totaux mensuels
    public decimal TotalCreditsDisbursedHTG { get; set; }
    public decimal TotalCreditsDisbursedUSD { get; set; }
    public int TotalCreditsCount { get; set; }
    
    public decimal TotalPaymentsReceivedHTG { get; set; }
    public decimal TotalPaymentsReceivedUSD { get; set; }
    public int TotalPaymentsCount { get; set; }
    
    public decimal TotalDepositsHTG { get; set; }
    public decimal TotalDepositsUSD { get; set; }
    public int TotalDepositsCount { get; set; }
    
    public decimal TotalWithdrawalsHTG { get; set; }
    public decimal TotalWithdrawalsUSD { get; set; }
    public int TotalWithdrawalsCount { get; set; }
    
    // Performance
    public int NewCustomers { get; set; }
    public int ActiveLoans { get; set; }
    public decimal PortfolioAtRisk { get; set; }
    public decimal CollectionRate { get; set; }
    
    // Rapports journaliers
    public List<DailyBranchReportDto> DailyReports { get; set; } = new();
}

/// <summary>
/// Comparaison de performance entre succursales
/// </summary>
public class BranchPerformanceComparisonDto
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public List<BranchPerformanceDto> Branches { get; set; } = new();
}

public class BranchPerformanceDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    
    public decimal TotalDisbursementsHTG { get; set; }
    public decimal TotalDisbursementsUSD { get; set; }
    
    public decimal TotalCollectionsHTG { get; set; }
    public decimal TotalCollectionsUSD { get; set; }
    
    public decimal CollectionRate { get; set; }
    public decimal PortfolioAtRisk { get; set; }
    
    public int NumberOfActiveLoans { get; set; }
    public int NumberOfCustomers { get; set; }
    public int NumberOfEmployees { get; set; }
    
    public int Rank { get; set; }
}

/// <summary>
/// Rapport consolidé pour SuperAdmin - Vue d'ensemble de toutes les succursales
/// </summary>
public class SuperAdminConsolidatedReportDto
{
    public DateTime ReportDate { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    
    // Totaux globaux
    public decimal TotalCreditsDisbursedHTG { get; set; }
    public decimal TotalCreditsDisbursedUSD { get; set; }
    public int TotalCreditsDisbursedCount { get; set; }
    
    public decimal TotalPaymentsReceivedHTG { get; set; }
    public decimal TotalPaymentsReceivedUSD { get; set; }
    public int TotalPaymentsReceivedCount { get; set; }
    
    public decimal TotalDepositsHTG { get; set; }
    public decimal TotalDepositsUSD { get; set; }
    public int TotalDepositsCount { get; set; }
    
    public decimal TotalWithdrawalsHTG { get; set; }
    public decimal TotalWithdrawalsUSD { get; set; }
    public int TotalWithdrawalsCount { get; set; }
    
    public decimal TotalCashBalanceHTG { get; set; }
    public decimal TotalCashBalanceUSD { get; set; }
    
    // Métriques globales
    public int TotalBranches { get; set; }
    public int TotalActiveCustomers { get; set; }
    public int TotalActiveLoans { get; set; }
    public int TotalEmployees { get; set; }
    
    public decimal GlobalPortfolioAtRisk { get; set; }
    public decimal GlobalCollectionRate { get; set; }
    
    // Rapports par succursale
    public List<DailyBranchReportDto> BranchReports { get; set; } = new();
    
    // Top performers
    public List<BranchPerformanceDto> TopPerformers { get; set; } = new();
    
    // Alertes et anomalies
    public List<BranchAlertDto> Alerts { get; set; } = new();
}

/// <summary>
/// Alerte pour une succursale
/// </summary>
public class BranchAlertDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string AlertType { get; set; } = string.Empty; // "PAR_HIGH", "COLLECTION_LOW", "CASH_DISCREPANCY"
    public string Severity { get; set; } = string.Empty; // "LOW", "MEDIUM", "HIGH", "CRITICAL"
    public string Message { get; set; } = string.Empty;
    public decimal? Value { get; set; }
    public decimal? Threshold { get; set; }
    public DateTime DetectedAt { get; set; }
}

/// <summary>
/// Détails de transactions pour audit SuperAdmin
/// </summary>
public class SuperAdminTransactionAuditDto
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    
    public List<TransactionAuditDetailDto> Transactions { get; set; } = new();
    
    public int TotalTransactions { get; set; }
    public decimal TotalAmountHTG { get; set; }
    public decimal TotalAmountUSD { get; set; }
    
    // Filtres appliqués
    public int? BranchId { get; set; }
    public string? TransactionType { get; set; }
    public string? UserId { get; set; }
}

/// <summary>
/// Détail d'une transaction pour audit
/// </summary>
public class TransactionAuditDetailDto
{
    public long TransactionId { get; set; }
    public string TransactionNumber { get; set; } = string.Empty;
    public string TransactionType { get; set; } = string.Empty;
    
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    
    public string CustomerName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    
    public string Status { get; set; } = string.Empty;
    public DateTime TransactionDate { get; set; }
    
    public string? Description { get; set; }
    public string? Reference { get; set; }
    
    // Info pour audit
    public int? CashSessionId { get; set; }
    public string? CashierName { get; set; }
}

/// <summary>
/// Statistiques en temps réel pour dashboard SuperAdmin
/// </summary>
public class SuperAdminDashboardStatsDto
{
    public DateTime AsOfDate { get; set; }
    
    // Aujourd'hui
    public decimal TodayDisbursementsHTG { get; set; }
    public decimal TodayDisbursementsUSD { get; set; }
    public decimal TodayCollectionsHTG { get; set; }
    public decimal TodayCollectionsUSD { get; set; }
    public int TodayTransactionsCount { get; set; }
    
    // Ce mois
    public decimal MonthToDateDisbursementsHTG { get; set; }
    public decimal MonthToDateDisbursementsUSD { get; set; }
    public decimal MonthToDateCollectionsHTG { get; set; }
    public decimal MonthToDateCollectionsUSD { get; set; }
    
    // Portfolio
    public decimal TotalOutstandingPortfolioHTG { get; set; }
    public decimal TotalOutstandingPortfolioUSD { get; set; }
    public int TotalActiveLoans { get; set; }
    public decimal GlobalPAR { get; set; }
    
    // Succursales actives
    public int ActiveBranches { get; set; }
    public int ActiveCashSessions { get; set; }
    
    // Top 5 succursales
    public List<BranchQuickStatsDto> TopBranches { get; set; } = new();
    
    // Alertes actives
    public int CriticalAlerts { get; set; }
    public int HighAlerts { get; set; }
    public int MediumAlerts { get; set; }
}

/// <summary>
/// Statistiques rapides d'une succursale
/// </summary>
public class BranchQuickStatsDto
{
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public decimal TodayCollections { get; set; }
    public int TodayTransactions { get; set; }
    public decimal CollectionRate { get; set; }
    public decimal PAR { get; set; }
    public string Status { get; set; } = string.Empty; // "EXCELLENT", "GOOD", "WARNING", "CRITICAL"
}
