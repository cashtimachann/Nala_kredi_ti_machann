using System.ComponentModel.DataAnnotations;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.DTOs;

public class LoginDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string Password { get; set; } = string.Empty;
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public UserInfoDto User { get; set; } = new();
}

public class UserInfoDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? BranchId { get; set; }
    public string? BranchName { get; set; }
    public string? PhoneNumber { get; set; }
    public bool? IsActive { get; set; }
    public string? LastLogin { get; set; }
}

public class TwoFactorDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string Code { get; set; } = string.Empty;
}

public class ChangePasswordDto
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;
    
    [Required]
    [MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
}

public class ResetPasswordDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}

public class CreateUserDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string FirstName { get; set; } = string.Empty;
    
    [Required]
    public string LastName { get; set; } = string.Empty;
    
    [Required]
    public UserRole Role { get; set; }
    
    public int? BranchId { get; set; }
    
    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;
}

public class UpdateUserDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public UserRole? Role { get; set; }
    public int? BranchId { get; set; }
    public bool? IsActive { get; set; }
}

public class TransactionDto
{
    [Required]
    public int AccountId { get; set; }
    
    [Required]
    public TransactionType Type { get; set; }
    
    [Required]
    public Currency Currency { get; set; }
    
    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }
    
    public decimal? ExchangeRate { get; set; }
    public string? Description { get; set; }
    public string? Reference { get; set; }
}

public class CreditApplicationDto
{
    [Required]
    public int CustomerId { get; set; }
    
    [Required]
    [Range(1000, 1000000)]
    public decimal RequestedAmount { get; set; }
    
    [Required]
    public Currency Currency { get; set; }
    
    [Required]
    [Range(1, 104)]
    public int TermWeeks { get; set; }
    
    [Required]
    public string Purpose { get; set; } = string.Empty;
    
    public string? Collateral { get; set; }
}

public class CreditApprovalDto
{
    public decimal? ApprovedAmount { get; set; }
    public string? Comments { get; set; }
}