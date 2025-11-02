using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalaCreditAPI.Models
{
    public enum SalaryAdvanceStatus
    {
        Pending = 1,
        Approved = 2,
        Rejected = 3,
        Paid = 4,
        FullyDeducted = 5,
        Cancelled = 6
    }

    public class SalaryAdvance
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(50)]
        public string AdvanceNumber { get; set; } = string.Empty;

        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal RequestedAmount { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal ApprovedAmount { get; set; }

        [Required]
        [StringLength(10)]
        public string Currency { get; set; } = "HTG";

        [Required]
        public DateTime RequestDate { get; set; }

        public DateTime? ApprovalDate { get; set; }

        public DateTime? PaymentDate { get; set; }

        [Required]
        public SalaryAdvanceStatus Status { get; set; }

        [Required]
        [StringLength(500)]
        public string Reason { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal DeductionAmount { get; set; }

        public int DeductionMonths { get; set; } = 1;

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalDeducted { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal RemainingBalance { get; set; }

        [Required]
        public PaymentMethod PaymentMethod { get; set; }

        [StringLength(100)]
        public string TransactionReference { get; set; } = string.Empty;

        [StringLength(100)]
        public string RequestedBy { get; set; } = string.Empty;

        [StringLength(100)]
        public string ApprovedBy { get; set; } = string.Empty;

        [StringLength(100)]
        public string PaidBy { get; set; } = string.Empty;

        [StringLength(500)]
        public string ApprovalNotes { get; set; } = string.Empty;

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }

        // Navigation Properties
        public virtual Employee Employee { get; set; } = null!;
        public virtual ICollection<SalaryAdvanceDeduction> SalaryAdvanceDeductions { get; set; } = new List<SalaryAdvanceDeduction>();
    }

    public class SalaryAdvanceDeduction
    {
        public Guid Id { get; set; }

        [Required]
        public Guid SalaryAdvanceId { get; set; }

        [Required]
        public Guid PayslipId { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal DeductedAmount { get; set; }

        [Required]
        public DateTime DeductionDate { get; set; }

        [StringLength(200)]
        public string Notes { get; set; } = string.Empty;

        // Navigation Properties
        public virtual SalaryAdvance SalaryAdvance { get; set; } = null!;
        public virtual Payslip Payslip { get; set; } = null!;
    }
}