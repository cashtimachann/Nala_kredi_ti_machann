using System.ComponentModel.DataAnnotations;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.DTOs
{
    public class SalaryAdvanceDto
    {
        public Guid Id { get; set; }
        public string AdvanceNumber { get; set; } = string.Empty;
        public Guid EmployeeId { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeePosition { get; set; } = string.Empty;
        public decimal RequestedAmount { get; set; }
        public decimal ApprovedAmount { get; set; }
        public string Currency { get; set; } = "HTG";
        public DateTime RequestDate { get; set; }
        public DateTime? ApprovalDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public SalaryAdvanceStatus Status { get; set; }
        public string StatusName { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public decimal DeductionAmount { get; set; }
        public int DeductionMonths { get; set; }
        public decimal TotalDeducted { get; set; }
        public decimal RemainingBalance { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        public string PaymentMethodName { get; set; } = string.Empty;
        public string TransactionReference { get; set; } = string.Empty;
        public string RequestedBy { get; set; } = string.Empty;
        public string ApprovedBy { get; set; } = string.Empty;
        public string PaidBy { get; set; } = string.Empty;
        public string ApprovalNotes { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<SalaryAdvanceDeductionDto> Deductions { get; set; } = new List<SalaryAdvanceDeductionDto>();
    }

    public class SalaryAdvanceDeductionDto
    {
        public Guid Id { get; set; }
        public Guid PayslipId { get; set; }
        public string PayslipNumber { get; set; } = string.Empty;
        public decimal DeductedAmount { get; set; }
        public DateTime DeductionDate { get; set; }
        public string Notes { get; set; } = string.Empty;
    }

    public class CreateSalaryAdvanceDto
    {
        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Requested amount must be greater than 0")]
        public decimal RequestedAmount { get; set; }

        [Required]
        [StringLength(500)]
        public string Reason { get; set; } = string.Empty;

        [Range(1, 12, ErrorMessage = "Deduction months must be between 1 and 12")]
        public int DeductionMonths { get; set; } = 1;

        [Required]
        public PaymentMethod PaymentMethod { get; set; }

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;
    }

    public class ApproveSalaryAdvanceDto
    {
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Approved amount must be greater than 0")]
        public decimal ApprovedAmount { get; set; }

        [Range(1, 12, ErrorMessage = "Deduction months must be between 1 and 12")]
        public int DeductionMonths { get; set; } = 1;

        [Required]
        public PaymentMethod PaymentMethod { get; set; }

        [StringLength(500)]
        public string ApprovalNotes { get; set; } = string.Empty;
    }

    public class ProcessSalaryAdvancePaymentDto
    {
        [Required]
        public PaymentMethod PaymentMethod { get; set; }

        [StringLength(100)]
        public string TransactionReference { get; set; } = string.Empty;

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;
    }

    public class SalaryAdvanceSearchDto
    {
        public Guid? EmployeeId { get; set; }
        public Guid? BranchId { get; set; }
        public SalaryAdvanceStatus? Status { get; set; }
        public DateTime? RequestDateFrom { get; set; }
        public DateTime? RequestDateTo { get; set; }
        public decimal? AmountFrom { get; set; }
        public decimal? AmountTo { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    public class PayrollSummaryDto
    {
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public int TotalEmployees { get; set; }
        public int ActiveEmployees { get; set; }
        public decimal TotalBaseSalary { get; set; }
        public decimal TotalGrossPay { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal TotalNetPay { get; set; }
        public decimal TotalOvertimePay { get; set; }
        public decimal TotalBonus { get; set; }
        public decimal TotalAdvances { get; set; }
        public string Currency { get; set; } = "HTG";
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
    }
}