using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace NalaCreditAPI.Models;

public class User : IdentityUser
{
    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;
    
    [Required]
    public UserRole Role { get; set; }
    
    // Store the specific AdminType (more granular than Role)
    // This allows us to distinguish between CHEF_DE_SUCCURSALE and DIRECTEUR_REGIONAL
    // even though both have UserRole.Manager
    public int? AdminType { get; set; }
    
    public int? BranchId { get; set; }
    public Branch? Branch { get; set; }
    
    [MaxLength(100)]
    public string? Department { get; set; }
    
    public DateTime? HireDate { get; set; }
    
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLogin { get; set; }
    
    // Navigation properties
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public ICollection<CreditApplication> CreditApplications { get; set; } = new List<CreditApplication>();
    public ICollection<CashSession> CashSessions { get; set; } = new List<CashSession>();
}

public enum UserRole
{
    Cashier = 0,
    Employee = 1,
    Manager = 2,
    Admin = 3,
    Secretary = 4,
    SuperAdmin = 5
}