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

    public enum MicrocreditCurrency
    {
        HTG = 0,
        USD = 1
    }

    public enum MicrocreditLoanType
    {
        Personal = 0,
        Business = 1,
        Agriculture = 2,
        Education = 3,
        Housing = 4,
        CreditAuto = 5,
        CreditMoto = 6,
        Equipment = 7,
        WorkingCapital = 8
    }

    public class MicrocreditLoan
    {
        public Guid Id { get; set; }
        public string LoanNumber { get; set; } = string.Empty;
        public string BorrowerName { get; set; } = string.Empty;
        public string? BorrowerFirstName { get; set; }
        public string? BorrowerLastName { get; set; }
        public string? BorrowerPhone { get; set; }
        public decimal ApprovedAmount { get; set; }
        public decimal PrincipalAmount { get; set; }
        public decimal InterestRate { get; set; }
        public decimal? MonthlyInterestRate { get; set; }
        public int DurationMonths { get; set; }
        public int TermMonths { get; set; }
        public decimal InstallmentAmount { get; set; }
        public decimal MonthlyPayment { get; set; }
        public string Currency { get; set; } = "HTG";
        public decimal OutstandingBalance { get; set; }
        public decimal RemainingBalance { get; set; }
        public decimal OutstandingPrincipal { get; set; }
        public decimal OutstandingInterest { get; set; }
        public int DaysOverdue { get; set; }
        public string? Status { get; set; }
        public string? LoanType { get; set; }
        public int PaymentsMade { get; set; }
        public DateTime? NextPaymentDate { get; set; }
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

    public class CreateMicrocreditLoanApplicationDto
    {
        public string SavingsAccountNumber { get; set; } = string.Empty;
        public MicrocreditLoanType LoanType { get; set; }
        public decimal RequestedAmount { get; set; }
        public int RequestedDurationMonths { get; set; }
        public string Purpose { get; set; } = string.Empty;
        public string? BusinessPlan { get; set; }
        public MicrocreditCurrency Currency { get; set; }
        public int BranchId { get; set; }
        public string? CustomerName { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? CustomerAddress { get; set; }
        public string? Occupation { get; set; }
        public decimal MonthlyIncome { get; set; }
        public decimal MonthlyExpenses { get; set; }
        public decimal ExistingDebts { get; set; }
        public decimal? CollateralValue { get; set; }
        public int Dependents { get; set; }
        public decimal InterestRate { get; set; }
        public decimal MonthlyInterestRate { get; set; }
        public string? CollateralType { get; set; }
        public string? CollateralDescription { get; set; }
        public string? Guarantor1Name { get; set; }
        public string? Guarantor1Phone { get; set; }
        public string? Guarantor1Relation { get; set; }
        public string? Guarantor2Name { get; set; }
        public string? Guarantor2Phone { get; set; }
        public string? Guarantor2Relation { get; set; }
        public string? Reference1Name { get; set; }
        public string? Reference1Phone { get; set; }
        public string? Reference2Name { get; set; }
        public string? Reference2Phone { get; set; }
        public bool HasNationalId { get; set; }
        public bool HasProofOfResidence { get; set; }
        public bool HasProofOfIncome { get; set; }
        public bool HasCollateralDocs { get; set; }
        public string? Notes { get; set; }
    }

    public class MicrocreditLoanApplicationDto
    {
        public Guid Id { get; set; }
        public string ApplicationNumber { get; set; } = string.Empty;
        public string SavingsAccountNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? CustomerAddress { get; set; }
        public string? Occupation { get; set; }
        public MicrocreditLoanType LoanType { get; set; }
        public decimal RequestedAmount { get; set; }
        public int RequestedDurationMonths { get; set; }
        public string Purpose { get; set; } = string.Empty;
        public string? BusinessPlan { get; set; }
        public MicrocreditCurrency Currency { get; set; }
        public int BranchId { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal MonthlyIncome { get; set; }
        public decimal MonthlyExpenses { get; set; }
        public decimal ExistingDebts { get; set; }
        public decimal? CollateralValue { get; set; }
        public decimal InterestRate { get; set; }
        public decimal MonthlyInterestRate { get; set; }
        public string? CollateralType { get; set; }
        public string? CollateralDescription { get; set; }
        public string? Guarantor1Name { get; set; }
        public string? Guarantor1Phone { get; set; }
        public string? Guarantor1Relation { get; set; }
        public string? Guarantor2Name { get; set; }
        public string? Guarantor2Phone { get; set; }
        public string? Guarantor2Relation { get; set; }
        public string? Reference1Name { get; set; }
        public string? Reference1Phone { get; set; }
        public string? Reference2Name { get; set; }
        public string? Reference2Phone { get; set; }
        public bool HasNationalId { get; set; }
        public bool HasProofOfResidence { get; set; }
        public bool HasProofOfIncome { get; set; }
        public bool HasCollateralDocs { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public decimal? ApprovedAmount { get; set; }
        public DateTime? DisbursementDate { get; set; }
    }

    public class MicrocreditApplicationListResponseDto
    {
        public List<MicrocreditLoanApplicationDto> Applications { get; set; } = new List<MicrocreditLoanApplicationDto>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class ApproveMicrocreditApplicationDto
    {
        public decimal ApprovedAmount { get; set; }
        public decimal InterestRate { get; set; }
        public int DurationMonths { get; set; }
        public DateTime DisbursementDate { get; set; }
        public string? Comments { get; set; }
    }

    public class RejectMicrocreditApplicationDto
    {
        public string RejectionReason { get; set; } = string.Empty;
        public string Comments { get; set; } = string.Empty;
    }
}
