using System.ComponentModel.DataAnnotations;

namespace NalaCreditAPI.Models;

public class Branch
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Code { get; set; }

    [Required]
    [MaxLength(200)]
    public string Address { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Commune { get; set; }

    [MaxLength(50)]
    public string? Department { get; set; }

    public List<string> Phones { get; set; } = new List<string>();

    [MaxLength(100)]
    public string? Email { get; set; }

    public DateTime OpeningDate { get; set; } = DateTime.UtcNow;

    public string? ManagerId { get; set; }

    public string? ManagerName { get; set; }

    public int MaxEmployees { get; set; } = 50;

    [Required]
    public string Region { get; set; } = string.Empty;

    [Required]
    public Currency PrimaryCurrency { get; set; }

    public bool AcceptsUSD { get; set; } = true;
    public bool AcceptsHTG { get; set; } = true;

    public decimal DailyTransactionLimit { get; set; }
    public decimal CashLimit { get; set; }

    // Operating Hours
    public TimeSpan OpenTime { get; set; } = new TimeSpan(8, 0, 0); // 8:00 AM
    public TimeSpan CloseTime { get; set; } = new TimeSpan(17, 0, 0); // 5:00 PM
    public List<int> ClosedDays { get; set; } = new List<int>(); // 0=Sunday, 1=Monday, etc.

    // Branch Limits
    public decimal DailyWithdrawalLimit { get; set; } = 1000000;
    public decimal DailyDepositLimit { get; set; } = 1000000;
    public decimal MaxLocalCreditApproval { get; set; } = 500000;
    public decimal MinCashReserveHTG { get; set; } = 50000;
    public decimal MinCashReserveUSD { get; set; } = 1000;

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User? Manager { get; set; }
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Account> Accounts { get; set; } = new List<Account>();
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public ICollection<CashSession> CashSessions { get; set; } = new List<CashSession>();
    public ICollection<InterBranchTransfer> SentTransfers { get; set; } = new List<InterBranchTransfer>();
    public ICollection<InterBranchTransfer> ReceivedTransfers { get; set; } = new List<InterBranchTransfer>();
}

public enum Currency
{
    HTG = 1,
    USD = 2
}