using System.ComponentModel.DataAnnotations;

namespace NalaCreditAPI.DTOs
{
    public class InterBranchTransferDto
    {
        public Guid Id { get; set; }
        public string TransferNumber { get; set; } = string.Empty;
        public int FromBranchId { get; set; }
        public string FromBranchName { get; set; } = string.Empty;
        public int ToBranchId { get; set; }
        public string ToBranchName { get; set; } = string.Empty;
        public int Currency { get; set; }
        public string CurrencyName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal ExchangeRate { get; set; }
        public decimal ConvertedAmount { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public int Status { get; set; }
        public string StatusName { get; set; } = string.Empty;
        public string RequestedBy { get; set; } = string.Empty;
        public string? RequestedByName { get; set; }
        public string? RequestedAt { get; set; }
        public string? ApprovedBy { get; set; }
        public string? ApprovedByName { get; set; }
        public string? ApprovedAt { get; set; }
        public string? RejectedBy { get; set; }
        public string? RejectedByName { get; set; }
        public string? RejectionReason { get; set; }
        public string? RejectedAt { get; set; }
        public string? ProcessedBy { get; set; }
        public string? ProcessedByName { get; set; }
        public string? ProcessedAt { get; set; }
        public string? ReferenceNumber { get; set; }
        public string? TrackingNumber { get; set; }
        public string CreatedAt { get; set; } = string.Empty;
        public string UpdatedAt { get; set; } = string.Empty;
    }

    public class CreateInterBranchTransferDto
    {
        [Required]
        public int ToBranchId { get; set; }

        [Required]
        public int Currency { get; set; }

        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }

        [Range(0.0001, double.MaxValue)]
        public decimal? ExchangeRate { get; set; }

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Notes { get; set; }
    }

    public class UpdateInterBranchTransferDto
    {
        public Guid Id { get; set; }

        [Range(0.01, double.MaxValue)]
        public decimal? Amount { get; set; }

        [Range(0.0001, double.MaxValue)]
        public decimal? ExchangeRate { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }
    }

    public class ApproveInterBranchTransferDto
    {
        public Guid Id { get; set; }
        public string? Notes { get; set; }
    }

    public class RejectInterBranchTransferDto
    {
        public Guid Id { get; set; }

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;
    }

    public class ProcessInterBranchTransferDto
    {
        public Guid Id { get; set; }

        [MaxLength(100)]
        public string? ReferenceNumber { get; set; }

        [MaxLength(100)]
        public string? TrackingNumber { get; set; }

        public string? Notes { get; set; }
    }

    public class InterBranchTransferSearchDto
    {
        public int? FromBranchId { get; set; }
        public int? ToBranchId { get; set; }
        public int? Currency { get; set; }
        public int? Status { get; set; }
        public string? RequestedBy { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class InterBranchTransferLogDto
    {
        public Guid Id { get; set; }
        public Guid TransferId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string PerformedBy { get; set; } = string.Empty;
        public string? PerformedByName { get; set; }
        public string PerformedAt { get; set; } = string.Empty;
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
    }

    public class BranchTransferSummaryDto
    {
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public decimal TotalSent { get; set; }
        public decimal TotalReceived { get; set; }
        public int PendingTransfers { get; set; }
        public int CompletedTransfers { get; set; }
        public DateTime LastTransferDate { get; set; }
    }

    public class ConsolidatedTransferReportDto
    {
        public List<BranchTransferSummaryDto> BranchSummaries { get; set; } = new List<BranchTransferSummaryDto>();
        public decimal TotalSystemTransfers { get; set; }
        public int TotalActiveTransfers { get; set; }
        public DateTime ReportGeneratedAt { get; set; }
    }
}