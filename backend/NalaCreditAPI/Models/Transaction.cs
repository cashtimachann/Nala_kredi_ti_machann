using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalaCreditAPI.Models;

public class Transaction
{
    public long Id { get; set; }
    
    [Required]
    [MaxLength(20)]
    public string TransactionNumber { get; set; } = string.Empty;
    
    [Required]
    public int AccountId { get; set; }
    public Account Account { get; set; } = null!;
    
    [Required]
    public int BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    
    [Required]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;
    
    [Required]
    public TransactionType Type { get; set; }
    
    [Required]
    public Currency Currency { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal? ExchangeRate { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal BalanceAfter { get; set; }
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    [MaxLength(100)]
    public string? Reference { get; set; }
    
    public TransactionStatus Status { get; set; } = TransactionStatus.Completed;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
    
    public int? CashSessionId { get; set; }
    public CashSession? CashSession { get; set; }
}

public enum TransactionType
{
    Deposit = 1,
    Withdrawal = 2,
    Transfer = 3,
    CreditDisbursement = 4,
    CreditPayment = 5,
    CurrencyExchange = 6,
    Fee = 7,
    Commission = 8,
    Interest = 9,
    Penalty = 10
}

public enum TransactionStatus
{
    Pending = 0,
    Completed = 1,
    Failed = 2,
    Cancelled = 3,
    Reversed = 4
}