using System;

namespace NalaCreditDesktop.Services
{
    // Helper classes for Payment Schedule and History
    public class PaymentScheduleItem
    {
        public int InstallmentNumber { get; set; }
        public DateTime DueDate { get; set; }
        public decimal? PrincipalAmount { get; set; }
        public decimal? InterestAmount { get; set; }
        public decimal? FeePortion { get; set; }
        public decimal? TotalPayment { get; set; }
        public decimal? TotalAmountWithFee { get; set; }
        public string? Status { get; set; }
    }

    public class LoanPayment
    {
        public Guid Id { get; set; }
        public string ReceiptNumber { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal PrincipalAmount { get; set; }
        public decimal InterestAmount { get; set; }
        public decimal PenaltyAmount { get; set; }
        public string Currency { get; set; } = "HTG";
        public DateTime PaymentDate { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string? ProcessedByName { get; set; }
        public string? LoanNumber { get; set; }
        public string? CustomerName { get; set; }
        public string? ReceivedBy { get; set; }
        public string? Notes { get; set; }
    }

    public class CreatePaymentDto
    {
        public Guid LoanId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = "Cash";
        public string ReceiptNumber { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime PaymentDate { get; set; }
    }
}
