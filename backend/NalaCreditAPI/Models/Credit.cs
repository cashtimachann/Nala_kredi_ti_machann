using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalaCreditAPI.Models;

public class CreditApplication
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(20)]
    public string ApplicationNumber { get; set; } = string.Empty;
    
    [Required]
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    
    [Required]
    public string AgentId { get; set; } = string.Empty;
    public User Agent { get; set; } = null!;
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal RequestedAmount { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal? ApprovedAmount { get; set; }
    
    [Required]
    public Currency Currency { get; set; }
    
    public int TermWeeks { get; set; }
    
    [Column(TypeName = "decimal(5,2)")]
    public decimal InterestRate { get; set; }
    
    [MaxLength(1000)]
    public string Purpose { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Collateral { get; set; }
    
    public CreditApplicationStatus Status { get; set; } = CreditApplicationStatus.Submitted;
    
    [MaxLength(1000)]
    public string? Comments { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    
    public string? ReviewedBy { get; set; }
    public User? Reviewer { get; set; }
    
    // Navigation property
    public Credit? Credit { get; set; }
}

public class Credit
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(20)]
    public string CreditNumber { get; set; } = string.Empty;
    
    [Required]
    public int ApplicationId { get; set; }
    public CreditApplication Application { get; set; } = null!;
    
    [Required]
    public int AccountId { get; set; }
    public Account Account { get; set; } = null!;
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal PrincipalAmount { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal OutstandingBalance { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal WeeklyPayment { get; set; }
    
    [Column(TypeName = "decimal(5,2)")]
    public decimal InterestRate { get; set; }
    
    public int TermWeeks { get; set; }
    public int WeeksPaid { get; set; } = 0;
    
    public DateTime DisbursementDate { get; set; }
    public DateTime NextPaymentDate { get; set; }
    public DateTime MaturityDate { get; set; }
    
    public CreditStatus Status { get; set; } = CreditStatus.Active;
    
    public int DaysInArrears { get; set; } = 0;
    
    // Navigation properties
    public ICollection<CreditPayment> Payments { get; set; } = new List<CreditPayment>();
}

public class CreditPayment
{
    public int Id { get; set; }
    
    [Required]
    public int CreditId { get; set; }
    public Credit Credit { get; set; } = null!;
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal PrincipalPaid { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal InterestPaid { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal? PenaltyPaid { get; set; }
    
    public DateTime PaymentDate { get; set; }
    public DateTime DueDate { get; set; }
    
    [Required]
    public long TransactionId { get; set; }
    public Transaction Transaction { get; set; } = null!;
    
    public bool IsEarlyPayment { get; set; } = false;
    public bool IsLatePayment { get; set; } = false;
}

public enum CreditApplicationStatus
{
    Submitted = 0,
    UnderReview = 1,
    Approved = 2,
    Rejected = 3,
    Disbursed = 4,
    Cancelled = 5
}

public enum CreditStatus
{
    Active = 1,
    PaidOff = 2,
    WriteOff = 3,
    Restructured = 4,
    InDefault = 5
}