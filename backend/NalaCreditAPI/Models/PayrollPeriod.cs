using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalaCreditAPI.Models
{
    public enum PayrollPeriodType
    {
        Weekly = 1,
        BiWeekly = 2,
        Monthly = 3,
        Quarterly = 4
    }

    public enum PayrollStatus
    {
        Draft = 1,
        Processing = 2,
        Approved = 3,
        Paid = 4,
        Cancelled = 5
    }

    public class PayrollPeriod
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(50)]
        public string PeriodName { get; set; } = string.Empty;

        [Required]
        public PayrollPeriodType PeriodType { get; set; }

        [Required]
        public DateOnly StartDate { get; set; }

        [Required]
        public DateOnly EndDate { get; set; }

        [Required]
        public DateOnly PayDate { get; set; }

        [Required]
        public PayrollStatus Status { get; set; }

        [Required]
        public Guid BranchId { get; set; }

        [Required]
        [StringLength(200)]
        public string BranchName { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalGrossPay { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalDeductions { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalNetPay { get; set; }

        public int EmployeeCount { get; set; }

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
        public string ProcessedBy { get; set; } = string.Empty;

        // Navigation Properties
        public virtual ICollection<Payslip> Payslips { get; set; } = new List<Payslip>();
    }
}