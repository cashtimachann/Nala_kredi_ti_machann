using System;
using System.Collections.Generic;

namespace NalaCreditDesktop.Models
{
    public enum MicrocreditPaymentMethod
    {
        Cash = 0,
        BankTransfer = 1,
        MobileMoney = 2,
        Check = 3,
        Card = 4
    }

    public class MicrocreditLoan
    {
        public Guid Id { get; set; }
        public string LoanNumber { get; set; } = string.Empty;
        public string BorrowerName { get; set; } = string.Empty;
        public decimal ApprovedAmount { get; set; }
        public decimal PrincipalAmount { get; set; }
        public decimal InterestRate { get; set; }
        public decimal? MonthlyInterestRate { get; set; }
        public int DurationMonths { get; set; }
        public decimal InstallmentAmount { get; set; }
        public string Currency { get; set; } = "HTG";
        public decimal OutstandingBalance { get; set; }
        public decimal OutstandingPrincipal { get; set; }
        public decimal OutstandingInterest { get; set; }
        public int DaysOverdue { get; set; }
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
    }

    public class MicrocreditLoanListResponse
    {
        public List<MicrocreditLoan> Loans { get; set; } = new();
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
    }

    public class OverdueLoan
    {
        public Guid LoanId { get; set; }
        public string LoanNumber { get; set; } = string.Empty;
        public string BorrowerName { get; set; } = string.Empty;
        public string BorrowerPhone { get; set; } = string.Empty;
        public decimal OutstandingAmount { get; set; }
        public int DaysOverdue { get; set; }
        public DateTime LastPaymentDate { get; set; }
        public decimal PenaltyAmount { get; set; }
        public string? LoanOfficer { get; set; }
    }

    public class LoanSummary
    {
        public Guid LoanId { get; set; }
        public string LoanNumber { get; set; } = string.Empty;
        public string BorrowerName { get; set; } = string.Empty;
        public decimal PrincipalAmount { get; set; }
        public decimal OutstandingPrincipal { get; set; }
        public decimal OutstandingInterest { get; set; }
        public decimal PenaltyAmount { get; set; }
        public decimal TotalOutstanding { get; set; }
        public decimal TotalPaid { get; set; }
        public int PaymentsMade { get; set; }
        public int PaymentsRemaining { get; set; }
        public DateTime? NextPaymentDate { get; set; }
        public decimal NextPaymentAmount { get; set; }
        public int DaysOverdue { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class CreateMicrocreditPaymentRequest
    {
        public Guid LoanId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; } = DateTime.Now;
        public MicrocreditPaymentMethod PaymentMethod { get; set; } = MicrocreditPaymentMethod.Cash;
        public string? Reference { get; set; }
        public string? Notes { get; set; }
    }

    public class MicrocreditPayment
    {
        public Guid Id { get; set; }
        public string PaymentNumber { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal PrincipalAmount { get; set; }
        public decimal InterestAmount { get; set; }
        public decimal PenaltyAmount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public DateTime PaymentDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public string? Reference { get; set; }
        public string ProcessedBy { get; set; } = string.Empty;
        public string ProcessedByName { get; set; } = string.Empty;
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string ReceiptNumber { get; set; } = string.Empty;
        public string? ReceiptPath { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class PaymentReceipt
    {
        public string ReceiptNumber { get; set; } = string.Empty;
        public DateTime PaymentDate { get; set; }
        public string BorrowerName { get; set; } = string.Empty;
        public string LoanNumber { get; set; } = string.Empty;
        public decimal PaymentAmount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string? TransactionReference { get; set; }
        public string ReceivedBy { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; }
    }
}
