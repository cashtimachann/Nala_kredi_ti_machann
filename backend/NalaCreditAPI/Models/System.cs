using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalaCreditAPI.Models;

public class CashSession
{
    public int Id { get; set; }
    
    [Required]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;
    
    [Required]
    public int BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal OpeningBalanceHTG { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal OpeningBalanceUSD { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal? ClosingBalanceHTG { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal? ClosingBalanceUSD { get; set; }
    
    public DateTime SessionStart { get; set; } = DateTime.UtcNow;
    public DateTime? SessionEnd { get; set; }
    
    public CashSessionStatus Status { get; set; } = CashSessionStatus.Open;
    
    [MaxLength(500)]
    public string? Notes { get; set; }
    
    // Navigation properties
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}

public enum CashSessionStatus
{
    Open = 1,
    Closed = 2,
    Suspended = 3
}

public class SystemConfiguration
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Key { get; set; } = string.Empty;
    
    [Required]
    public string Value { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string? Description { get; set; }
    
    public DateTime LastModified { get; set; } = DateTime.UtcNow;
    
    public string? ModifiedBy { get; set; }
}

public class AuditLog
{
    public long Id { get; set; }
    
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string Action { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string EntityType { get; set; } = string.Empty;
    
    public string? EntityId { get; set; }
    
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    
    [Required]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    [MaxLength(45)]
    public string? IpAddress { get; set; }
    
    [MaxLength(500)]
    public string? UserAgent { get; set; }
    
    public byte[]? RowVersion { get; set; }
}