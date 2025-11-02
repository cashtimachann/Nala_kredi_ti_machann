using System.ComponentModel.DataAnnotations;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.DTOs
{
    public class EmployeeDto
    {
        public Guid Id { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string MiddleName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public EmployeePosition Position { get; set; }
        public string PositionName { get; set; } = string.Empty;
        public EmployeeStatus Status { get; set; }
        public string StatusName { get; set; } = string.Empty;
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public decimal BaseSalary { get; set; }
        public string Currency { get; set; } = "HTG";
        public DateTime HireDate { get; set; }
        public DateTime? TerminationDate { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string NationalId { get; set; } = string.Empty;
        public PaymentMethod PreferredPaymentMethod { get; set; }
        public string PaymentMethodName { get; set; } = string.Empty;
        public string BankAccount { get; set; } = string.Empty;
        public string BankName { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public string UpdatedBy { get; set; } = string.Empty;
    }

    public class CreateEmployeeDto
    {
        [Required]
        [StringLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string LastName { get; set; } = string.Empty;

        [StringLength(100)]
        public string MiddleName { get; set; } = string.Empty;

        [Required]
        public EmployeePosition Position { get; set; }

        [Required]
        public Guid BranchId { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Base salary must be greater than 0")]
        public decimal BaseSalary { get; set; }

        [Required]
        public DateTime HireDate { get; set; }

        [StringLength(15)]
        public string PhoneNumber { get; set; } = string.Empty;

        [StringLength(100)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [StringLength(500)]
        public string Address { get; set; } = string.Empty;

        [StringLength(50)]
        public string NationalId { get; set; } = string.Empty;

        [Required]
        public PaymentMethod PreferredPaymentMethod { get; set; }

        [StringLength(100)]
        public string BankAccount { get; set; } = string.Empty;

        [StringLength(100)]
        public string BankName { get; set; } = string.Empty;

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;
    }

    public class UpdateEmployeeDto
    {
        [Required]
        [StringLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string LastName { get; set; } = string.Empty;

        [StringLength(100)]
        public string MiddleName { get; set; } = string.Empty;

        [Required]
        public EmployeePosition Position { get; set; }

        [Required]
        public EmployeeStatus Status { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Base salary must be greater than 0")]
        public decimal BaseSalary { get; set; }

        [StringLength(15)]
        public string PhoneNumber { get; set; } = string.Empty;

        [StringLength(100)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [StringLength(500)]
        public string Address { get; set; } = string.Empty;

        [StringLength(50)]
        public string NationalId { get; set; } = string.Empty;

        [Required]
        public PaymentMethod PreferredPaymentMethod { get; set; }

        [StringLength(100)]
        public string BankAccount { get; set; } = string.Empty;

        [StringLength(100)]
        public string BankName { get; set; } = string.Empty;

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;

        public DateTime? TerminationDate { get; set; }
    }

    public class EmployeeSearchDto
    {
        public string? SearchTerm { get; set; }
        public Guid? BranchId { get; set; }
        public EmployeePosition? Position { get; set; }
        public EmployeeStatus? Status { get; set; }
        public DateTime? HireDateFrom { get; set; }
        public DateTime? HireDateTo { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}