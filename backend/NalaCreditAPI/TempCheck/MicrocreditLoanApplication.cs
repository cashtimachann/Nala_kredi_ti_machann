using System;
using System.Collections.Generic;

namespace NalaCreditAPI.TempCheck;

public partial class MicrocreditLoanApplication
{
    public Guid Id { get; set; }

    public string ApplicationNumber { get; set; } = null!;

    public Guid BorrowerId { get; set; }

    public int LoanType { get; set; }

    public decimal RequestedAmount { get; set; }

    public int RequestedDurationMonths { get; set; }

    public string Purpose { get; set; } = null!;

    public string? BusinessPlan { get; set; }

    public int Currency { get; set; }

    public int BranchId { get; set; }

    public string BranchName { get; set; } = null!;

    public decimal MonthlyIncome { get; set; }

    public decimal MonthlyExpenses { get; set; }

    public decimal ExistingDebts { get; set; }

    public decimal? CollateralValue { get; set; }

    public decimal DebtToIncomeRatio { get; set; }

    public int CurrentApprovalLevel { get; set; }

    public string? CreditScore { get; set; }

    public string? RiskAssessment { get; set; }

    public int Status { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public DateTime? RejectedAt { get; set; }

    public string? RejectionReason { get; set; }

    public string LoanOfficerId { get; set; } = null!;

    public string LoanOfficerName { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public decimal? BlockedGuaranteeAmount { get; set; }

    public string? BlockedSavingsAccountId { get; set; }
}
