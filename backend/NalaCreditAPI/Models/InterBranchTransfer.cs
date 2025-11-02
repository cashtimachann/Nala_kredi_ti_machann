using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalaCreditAPI.Models;

public class InterBranchTransfer
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(50)]
    public string TransferNumber { get; set; } = string.Empty;

    // Source Branch
    [Required]
    public int FromBranchId { get; set; }
    [ForeignKey("FromBranchId")]
    public Branch FromBranch { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string FromBranchName { get; set; } = string.Empty;

    // Destination Branch
    [Required]
    public int ToBranchId { get; set; }
    [ForeignKey("ToBranchId")]
    public Branch ToBranch { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string ToBranchName { get; set; } = string.Empty;

    // Transfer Details
    [Required]
    public ClientCurrency Currency { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal ExchangeRate { get; set; } = 1.0m;

    public decimal ConvertedAmount { get; set; }

    [Required]
    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Notes { get; set; }

    // Status and Approval
    [Required]
    public TransferStatus Status { get; set; } = TransferStatus.Pending;

    [Required]
    [MaxLength(100)]
    public string RequestedBy { get; set; } = string.Empty;

    public string? RequestedByName { get; set; }

    public DateTime? RequestedAt { get; set; }

    public string? ApprovedBy { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public string? RejectedBy { get; set; }
    public string? RejectedByName { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? RejectedAt { get; set; }

    public string? ProcessedBy { get; set; }
    public string? ProcessedByName { get; set; }
    public DateTime? ProcessedAt { get; set; }

    // Tracking
    [MaxLength(100)]
    public string? ReferenceNumber { get; set; }

    [MaxLength(100)]
    public string? TrackingNumber { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<InterBranchTransferLog> TransferLogs { get; set; } = new List<InterBranchTransferLog>();
}

public enum TransferStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    InTransit = 3,
    Completed = 4,
    Cancelled = 5
}

public class InterBranchTransferLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid TransferId { get; set; }
    [ForeignKey("TransferId")]
    public InterBranchTransfer Transfer { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string Action { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string PerformedBy { get; set; } = string.Empty;

    public string? PerformedByName { get; set; }

    public DateTime PerformedAt { get; set; } = DateTime.UtcNow;

    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
}