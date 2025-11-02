using System.ComponentModel.DataAnnotations;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.DTOs
{
    public class PayrollPeriodDto
    {
        public Guid Id { get; set; }
        public string PeriodName { get; set; } = string.Empty;
        public PayrollPeriodType PeriodType { get; set; }
        public string PeriodTypeName { get; set; } = string.Empty;
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }
        public DateOnly PayDate { get; set; }
        public PayrollStatus Status { get; set; }
        public string StatusName { get; set; } = string.Empty;
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public decimal TotalGrossPay { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal TotalNetPay { get; set; }
        public int EmployeeCount { get; set; }
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public string ProcessedBy { get; set; } = string.Empty;
    }

    public class CreatePayrollPeriodDto
    {
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
        public Guid BranchId { get; set; }

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;
    }

    public class PayslipDto
    {
        public Guid Id { get; set; }
        public string PayslipNumber { get; set; } = string.Empty;
        public Guid EmployeeId { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string EmployeeName { get; set; } = string.Empty;
        public EmployeePosition Position { get; set; }
        public string PositionName { get; set; } = string.Empty;
        public Guid PayrollPeriodId { get; set; }
        public string PeriodName { get; set; } = string.Empty;
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }
        public DateOnly PayDate { get; set; }
        public decimal BaseSalary { get; set; }
        public decimal OvertimeHours { get; set; }
        public decimal OvertimeRate { get; set; }
        public decimal OvertimePay { get; set; }
        public decimal Bonus { get; set; }
        public decimal Commission { get; set; }
        public decimal Allowances { get; set; }
        public decimal GrossPay { get; set; }
        public decimal TaxDeduction { get; set; }
        public decimal InsuranceDeduction { get; set; }
        public decimal SocialSecurityDeduction { get; set; }
        public decimal SalaryAdvanceDeduction { get; set; }
        public decimal LoanDeduction { get; set; }
        public decimal OtherDeductions { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal NetPay { get; set; }
        public string Currency { get; set; } = "HTG";
        public PayrollStatus Status { get; set; }
        public string StatusName { get; set; } = string.Empty;
        public PaymentMethod PaymentMethod { get; set; }
        public string PaymentMethodName { get; set; } = string.Empty;
        public DateTime? PaidDate { get; set; }
        public string PaidBy { get; set; } = string.Empty;
        public string TransactionReference { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public List<PayslipDeductionDto> Deductions { get; set; } = new List<PayslipDeductionDto>();
    }

    public class PayslipDeductionDto
    {
        public Guid Id { get; set; }
        public DeductionType DeductionType { get; set; }
        public string DeductionTypeName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
    }

    public class PayrollCalculationDto
    {
        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public Guid PayrollPeriodId { get; set; }

        [Range(0, double.MaxValue)]
        public decimal OvertimeHours { get; set; }

        [Range(0, double.MaxValue)]
        public decimal Bonus { get; set; }

        [Range(0, double.MaxValue)]
        public decimal Commission { get; set; }

        [Range(0, double.MaxValue)]
        public decimal Allowances { get; set; }

        public List<PayrollDeductionDto> CustomDeductions { get; set; } = new List<PayrollDeductionDto>();

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;
    }

    public class PayrollDeductionDto
    {
        [Required]
        public DeductionType DeductionType { get; set; }

        [Required]
        [StringLength(100)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }

        [StringLength(100)]
        public string Reference { get; set; } = string.Empty;

        [StringLength(200)]
        public string Notes { get; set; } = string.Empty;
    }

    public class PayslipSearchDto
    {
        public Guid? EmployeeId { get; set; }
        public Guid? PayrollPeriodId { get; set; }
        public Guid? BranchId { get; set; }
        public PayrollStatus? Status { get; set; }
        public DateTime? PayDateFrom { get; set; }
        public DateTime? PayDateTo { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}