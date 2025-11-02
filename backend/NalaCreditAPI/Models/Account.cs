using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalaCreditAPI.Models;

public class Account
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(20)]
    public string AccountNumber { get; set; } = string.Empty;
    
    [Required]
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    
    [Required]
    public int BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    
    [Required]
    public AccountType Type { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal BalanceHTG { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal BalanceUSD { get; set; }
    
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastTransaction { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public ICollection<Credit> Credits { get; set; } = new List<Credit>();
}

public enum AccountType
{
    Savings = 1,
    Current = 2,
    Credit = 3,
    Investment = 4
}