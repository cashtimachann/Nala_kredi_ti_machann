using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalaCreditAPI.Models
{
    public enum DeductionType
    {
        Tax = 1,
        Insurance = 2,
        SocialSecurity = 3,
        SalaryAdvance = 4,
        Loan = 5,
        Union = 6,
        Other = 7
    }

    public class Payslip
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(50)]
        public string PayslipNumber { get; set; } = string.Empty;

        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public Guid PayrollPeriodId { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal BaseSalary { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal OvertimeHours { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal OvertimeRate { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal OvertimePay { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Bonus { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Commission { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Allowances { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal GrossPay { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TaxDeduction { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal InsuranceDeduction { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal SocialSecurityDeduction { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal SalaryAdvanceDeduction { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal LoanDeduction { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal OtherDeductions { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalDeductions { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal NetPay { get; set; }

        [Required]
        [StringLength(10)]
        public string Currency { get; set; } = "HTG";

        [Required]
        public PayrollStatus Status { get; set; }

        [Required]
        public PaymentMethod PaymentMethod { get; set; }

        public DateTime? PaidDate { get; set; }

        [StringLength(100)]
        public string PaidBy { get; set; } = string.Empty;

        [StringLength(100)]
        public string TransactionReference { get; set; } = string.Empty;

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }

        [Required]
        [StringLength(100)]
        public string CreatedBy { get; set; } = string.Empty;

        // Navigation Properties
        public virtual Employee Employee { get; set; } = null!;
        public virtual PayrollPeriod PayrollPeriod { get; set; } = null!;
        public virtual ICollection<PayslipDeduction> PayslipDeductions { get; set; } = new List<PayslipDeduction>();
    }

    public class PayslipDeduction
    {
        public Guid Id { get; set; }

        [Required]
        public Guid PayslipId { get; set; }

        [Required]
        public DeductionType DeductionType { get; set; }

        [Required]
        [StringLength(100)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [StringLength(100)]
        public string Reference { get; set; } = string.Empty;

        [StringLength(200)]
        public string Notes { get; set; } = string.Empty;

        // Navigation Properties
        public virtual Payslip Payslip { get; set; } = null!;
    }
}