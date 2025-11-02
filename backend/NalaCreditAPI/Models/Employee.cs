using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalaCreditAPI.Models
{
    public enum EmployeePosition
    {
        Manager = 1,
        AssistantManager = 2,
        Cashier = 3,
        LoanOfficer = 4,
        CustomerService = 5,
        Security = 6,
        Accountant = 7,
        ITSupport = 8,
        HRAssistant = 9,
        Cleaner = 10,
        Driver = 11,
        Other = 12
    }

    public enum EmployeeStatus
    {
        Active = 1,
        Inactive = 2,
        OnLeave = 3,
        Terminated = 4,
        Suspended = 5
    }

    public enum PaymentMethod
    {
        Cash = 1,
        BankTransfer = 2,
        Check = 3,
        MobilePayment = 4
    }

    public class Employee
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(20)]
        public string EmployeeCode { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string LastName { get; set; } = string.Empty;

        [StringLength(100)]
        public string MiddleName { get; set; } = string.Empty;

        public string FullName => $"{FirstName} {MiddleName} {LastName}".Replace("  ", " ").Trim();

        [Required]
        public EmployeePosition Position { get; set; }

        [Required]
        public EmployeeStatus Status { get; set; }

        [Required]
        public Guid BranchId { get; set; }

        [Required]
        [StringLength(200)]
        public string BranchName { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal BaseSalary { get; set; }

        [Required]
        [StringLength(10)]
        public string Currency { get; set; } = "HTG";

        [Required]
        public DateTime HireDate { get; set; }

        public DateTime? TerminationDate { get; set; }

        [StringLength(15)]
        public string PhoneNumber { get; set; } = string.Empty;

        [StringLength(100)]
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

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }

        [Required]
        [StringLength(100)]
        public string CreatedBy { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string UpdatedBy { get; set; } = string.Empty;

        // Navigation Properties
        public virtual ICollection<PayrollPeriod> PayrollPeriods { get; set; } = new List<PayrollPeriod>();
        public virtual ICollection<Payslip> Payslips { get; set; } = new List<Payslip>();
        public virtual ICollection<SalaryAdvance> SalaryAdvances { get; set; } = new List<SalaryAdvance>();
    }
}