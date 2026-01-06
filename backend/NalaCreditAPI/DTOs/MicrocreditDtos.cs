using NalaCreditAPI.Models;
using System.ComponentModel.DataAnnotations;

namespace NalaCreditAPI.DTOs
{
    // DTOs pour les emprunteurs
    public class MicrocreditBorrowerDto
    {
        public Guid Id { get; set; }
        public string AccountNumber { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public DateOnly DateOfBirth { get; set; }
        public string Gender { get; set; } = string.Empty;
        public BorrowerAddressDto Address { get; set; } = new();
        public BorrowerContactDto Contact { get; set; } = new();
        public BorrowerIdentityDto Identity { get; set; } = new();
        public string Occupation { get; set; } = string.Empty;
        public decimal MonthlyIncome { get; set; }
        public string EmploymentType { get; set; } = string.Empty;
        public int? YearsInBusiness { get; set; }
        public int? CreditScore { get; set; }
        public List<PreviousLoanDto>? PreviousLoans { get; set; }
        public List<ReferenceDto> References { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class BorrowerAddressDto
    {
        public string Street { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string PostalCode { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string? Landmark { get; set; }
    }

    public class BorrowerContactDto
    {
        public string PrimaryPhone { get; set; } = string.Empty;
        public string? SecondaryPhone { get; set; }
        public string? Email { get; set; }
        public string EmergencyContactName { get; set; } = string.Empty;
        public string EmergencyContactPhone { get; set; } = string.Empty;
        public string EmergencyContactRelation { get; set; } = string.Empty;
        
        // Aliases for frontend compatibility
        public string Phone => PrimaryPhone;
        public string PhoneNumber => PrimaryPhone;
    }

    public class BorrowerIdentityDto
    {
        public string DocumentType { get; set; } = string.Empty;
        public string DocumentNumber { get; set; } = string.Empty;
        public string IssuingAuthority { get; set; } = string.Empty;
        public string IssueDate { get; set; } = string.Empty;
        public string? ExpiryDate { get; set; }
    }

    public class PreviousLoanDto
    {
        public string Lender { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Purpose { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? CompletedAt { get; set; }
    }

    public class ReferenceDto
    {
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Relation { get; set; } = string.Empty;
        public int YearsKnown { get; set; }
        public string? Occupation { get; set; }
    }

    // DTOs pour les demandes de crédit
    public class MicrocreditLoanApplicationDto
    {
        // Snapshot fields from the application
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public string? CustomerEmail { get; set; }
    // Snapshot of customer address as a single string for display
    public string? CustomerAddress { get; set; }
        public string? Occupation { get; set; }
        public Guid Id { get; set; }
        public string ApplicationNumber { get; set; } = string.Empty;
        public string SavingsAccountNumber { get; set; } = string.Empty;
        public Guid BorrowerId { get; set; }
        public MicrocreditBorrowerDto? Borrower { get; set; }
        public Guid? LoanId { get; set; } // ID of the loan created from this application (if approved)
        public string LoanType { get; set; } = string.Empty;
        public decimal RequestedAmount { get; set; }
    public decimal? ApprovedAmount { get; set; }
        public int RequestedDurationMonths { get; set; }
        public string Purpose { get; set; } = string.Empty;
        public string? BusinessPlan { get; set; }
        public string Currency { get; set; } = string.Empty;
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        
        // Évaluation financière
        public decimal MonthlyIncome { get; set; }
        public decimal MonthlyExpenses { get; set; }
        public decimal ExistingDebts { get; set; }
        public decimal? CollateralValue { get; set; }
        public decimal DebtToIncomeRatio { get; set; }
        
        // Additional personal and financial information
        public int Dependents { get; set; }
        public decimal InterestRate { get; set; }
        public decimal MonthlyInterestRate { get; set; }
        public string? CollateralType { get; set; }
        public string? CollateralDescription { get; set; }
        
        // Guarantor information
        public string? Guarantor1Name { get; set; }
        public string? Guarantor1Phone { get; set; }
        public string? Guarantor1Relation { get; set; }
        public string? Guarantor2Name { get; set; }
        public string? Guarantor2Phone { get; set; }
        public string? Guarantor2Relation { get; set; }
        
        // Reference information
        public string? Reference1Name { get; set; }
        public string? Reference1Phone { get; set; }
        public string? Reference2Name { get; set; }
        public string? Reference2Phone { get; set; }
        
        // Document verification flags
        public bool HasNationalId { get; set; }
        public bool HasProofOfResidence { get; set; }
        public bool HasProofOfIncome { get; set; }
        public bool HasCollateralDocs { get; set; }
        public string? Notes { get; set; }
        
        // Workflow d'approbation
        public List<MicrocreditApprovalStepDto> ApprovalSteps { get; set; } = new();
        public string CurrentApprovalLevel { get; set; } = string.Empty;
        
        // Évaluation de risque
        public int? CreditScore { get; set; }
        public RiskAssessmentDto? RiskAssessment { get; set; }
        
        // Statut et dates
        public string Status { get; set; } = string.Empty;
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? RejectedAt { get; set; }
        public DateTime? DisbursementDate { get; set; }
        public string? RejectionReason { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        // Agent responsable
        public string LoanOfficerId { get; set; } = string.Empty;
        public string LoanOfficerName { get; set; } = string.Empty;
        
        // Documents et garanties
        public List<MicrocreditApplicationDocumentDto> Documents { get; set; } = new();
        public List<MicrocreditGuaranteeDto> Guarantees { get; set; } = new();
    }

    public class MicrocreditApprovalStepDto
    {
        public Guid Id { get; set; }
        public string Level { get; set; } = string.Empty;
        public string ApproverId { get; set; } = string.Empty;
        public string ApproverName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Comments { get; set; }
        public decimal? RequiredAmount { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class RiskAssessmentDto
    {
        public int Score { get; set; }
        public string Level { get; set; } = string.Empty;
        public List<RiskFactorDto> Factors { get; set; } = new();
        public string Recommendation { get; set; } = string.Empty;
        public string AssessedBy { get; set; } = string.Empty;
        public DateTime AssessedAt { get; set; }
    }

    public class RiskFactorDto
    {
        public string Factor { get; set; } = string.Empty;
        public string Impact { get; set; } = string.Empty;
        public decimal Weight { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    public class MicrocreditApplicationDocumentDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string FilePath { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string MimeType { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
        public string UploadedBy { get; set; } = string.Empty;
        public bool Verified { get; set; }
        public DateTime? VerifiedAt { get; set; }
        public string? VerifiedBy { get; set; }
    }

    public class MicrocreditGuaranteeDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public string Currency { get; set; } = string.Empty;
        public GuarantorInfoDto? GuarantorInfo { get; set; }
        public bool Verified { get; set; }
        public DateTime? VerifiedAt { get; set; }
        public string? VerifiedBy { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class GuarantorInfoDto
    {
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Occupation { get; set; } = string.Empty;
        public decimal? MonthlyIncome { get; set; }
        public string Relation { get; set; } = string.Empty;
    }

    // DTOs pour les prêts actifs
    public class MicrocreditLoanDto
    {
        public Guid Id { get; set; }
        public string LoanNumber { get; set; } = string.Empty;
        public Guid ApplicationId { get; set; }
        public Guid BorrowerId { get; set; }
        public MicrocreditBorrowerDto? Borrower { get; set; }
        public string LoanType { get; set; } = string.Empty;
        
        // Conditions du prêt
        public decimal PrincipalAmount { get; set; }
        public decimal InterestRate { get; set; }
        public int DurationMonths { get; set; }
        public decimal InstallmentAmount { get; set; }
        public string Currency { get; set; } = string.Empty;
        
        // Dates importantes
        public DateOnly DisbursementDate { get; set; }
        public DateOnly FirstInstallmentDate { get; set; }
        public DateOnly MaturityDate { get; set; }
        
        // État financier
        public decimal TotalAmountDue { get; set; }
        public decimal AmountPaid { get; set; }
        public decimal PrincipalPaid { get; set; }
        public decimal InterestPaid { get; set; }
        public decimal PenaltiesPaid { get; set; }
        public decimal OutstandingBalance { get; set; }
        public decimal OutstandingPrincipal { get; set; }
        public decimal OutstandingInterest { get; set; }
        public decimal OutstandingPenalties { get; set; }
        
        // Statut et performance
        public string Status { get; set; } = string.Empty;
        public int InstallmentsPaid { get; set; }
        public int InstallmentsRemaining { get; set; }
        public int DaysOverdue { get; set; }
        
        // Informations de gestion
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string LoanOfficerId { get; set; } = string.Empty;
        public string LoanOfficerName { get; set; } = string.Empty;
        
        // Métadonnées
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? LastPaymentDate { get; set; }
        public DateOnly? NextPaymentDue { get; set; }
        
        // Échéancier et paiements (optionnels pour les listes)
        public List<MicrocreditPaymentScheduleDto>? PaymentSchedule { get; set; }
        public List<MicrocreditPaymentDto>? Payments { get; set; }
    }

    public class MicrocreditPaymentScheduleDto
    {
        public Guid Id { get; set; }
        public int InstallmentNumber { get; set; }
        public DateOnly DueDate { get; set; }
        public decimal PrincipalAmount { get; set; }
        public decimal InterestAmount { get; set; }
        public decimal TotalAmount { get; set; }
        // Portion de frais dossier réparti sur cette échéance (non financé dans intérêt)
        public decimal? FeePortion { get; set; }
        // Total incluant la portion de frais pour affichage
        public decimal? TotalAmountWithFee { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal? PaidAmount { get; set; }
        public DateOnly? PaidDate { get; set; }
        public int? DaysOverdue { get; set; }
        public decimal? PenaltyAmount { get; set; }
        public decimal RemainingBalance { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class MicrocreditPaymentDto
    {
        public Guid Id { get; set; }
        public string PaymentNumber { get; set; } = string.Empty;
        
        // Montants
        public decimal Amount { get; set; }
        public decimal PrincipalAmount { get; set; }
        public decimal InterestAmount { get; set; }
        public decimal PenaltyAmount { get; set; }
        public string Currency { get; set; } = string.Empty;
        
        // Dates et statut
        public DateOnly PaymentDate { get; set; }
        public DateOnly ValueDate { get; set; }
        public string Status { get; set; } = string.Empty;
        
        // Méthode de paiement
        public string PaymentMethod { get; set; } = string.Empty;
        public string? Reference { get; set; }
        
        // Traitement
        public string ProcessedBy { get; set; } = string.Empty;
        public string ProcessedByName { get; set; } = string.Empty;
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        
        // Reçu
        public string ReceiptNumber { get; set; } = string.Empty;
        public string? ReceiptPath { get; set; }
        
        // Informations du prêt et client
        public string? LoanNumber { get; set; }
        public string? CustomerName { get; set; }
        
        // Métadonnées
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // DTOs pour notes de recouvrement
    public class CreateMicrocreditCollectionNoteDto
    {
        [Required]
        [MaxLength(2000)]
        public string Note { get; set; } = string.Empty;
    }

    public class MicrocreditCollectionNoteDto
    {
        public Guid Id { get; set; }
        public Guid LoanId { get; set; }
        public string Note { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public string? CreatedByName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // DTOs pour les créations/mises à jour
    public class CreateMicrocreditBorrowerDto
    {
        [Required]
        [MaxLength(50)]
        public string FirstName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string LastName { get; set; } = string.Empty;
        
        [Required]
        public DateOnly DateOfBirth { get; set; }
        
        [Required]
        [RegularExpression("^[MF]$")]
        public string Gender { get; set; } = string.Empty;
        
        [Required]
        public BorrowerAddressDto Address { get; set; } = new();
        
        [Required]
        public BorrowerContactDto Contact { get; set; } = new();
        
        [Required]
        public BorrowerIdentityDto Identity { get; set; } = new();
        
        [Required]
        [MaxLength(100)]
        public string Occupation { get; set; } = string.Empty;
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal MonthlyIncome { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string EmploymentType { get; set; } = string.Empty;
        
        [Range(0, 50)]
        public int? YearsInBusiness { get; set; }
        
        public List<PreviousLoanDto>? PreviousLoans { get; set; }
        
        [Required]
        public List<ReferenceDto> References { get; set; } = new();
    }

    public class CreateMicrocreditLoanApplicationDto
    {
        [Required]
        [MaxLength(12)]
        public string SavingsAccountNumber { get; set; } = string.Empty;
        
        [Required]
        public MicrocreditLoanType LoanType { get; set; }
        
        [Required]
        [Range(1, double.MaxValue)]
        public decimal RequestedAmount { get; set; }
        
        [Required]
        [Range(1, 60)]
        public int RequestedDurationMonths { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string Purpose { get; set; } = string.Empty;
        
        public string? BusinessPlan { get; set; }
        
        [Required]
        public MicrocreditCurrency Currency { get; set; }
        
        [Required]
        public int BranchId { get; set; }
    // Snapshot of applicant information
    [MaxLength(200)]
    public string? CustomerName { get; set; }
    [MaxLength(20)]
    public string? Phone { get; set; }
    [MaxLength(200)]
    public string? Email { get; set; }
    // Snapshot address label as simple string for loan application (front-end sends single-line address)
    public string? CustomerAddress { get; set; }
    [MaxLength(100)]
    public string? Occupation { get; set; }
        
        // Évaluation financière
        [Required]
        [Range(0, double.MaxValue)]
        public decimal MonthlyIncome { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal MonthlyExpenses { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal ExistingDebts { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? CollateralValue { get; set; }
        
        // Additional personal and financial information
        [Range(0, 50)]
        public int Dependents { get; set; }
        
        [Range(0, 1)]
        public decimal InterestRate { get; set; }
        
        [Range(0, 1)]
        public decimal MonthlyInterestRate { get; set; }
        
        [MaxLength(200)]
        public string? CollateralType { get; set; }
        
        [MaxLength(1000)]
        public string? CollateralDescription { get; set; }
        
        // Guarantor information
        [MaxLength(100)]
        public string? Guarantor1Name { get; set; }
        
        [MaxLength(20)]
        public string? Guarantor1Phone { get; set; }
        
        [MaxLength(50)]
        public string? Guarantor1Relation { get; set; }
        
        [MaxLength(100)]
        public string? Guarantor2Name { get; set; }
        
        [MaxLength(20)]
        public string? Guarantor2Phone { get; set; }
        
        [MaxLength(50)]
        public string? Guarantor2Relation { get; set; }
        
        // Reference information
        [MaxLength(100)]
        public string? Reference1Name { get; set; }
        
        [MaxLength(20)]
        public string? Reference1Phone { get; set; }
        
        [MaxLength(100)]
        public string? Reference2Name { get; set; }
        
        [MaxLength(20)]
        public string? Reference2Phone { get; set; }
        
        // Document verification flags
        public bool HasNationalId { get; set; }
        public bool HasProofOfResidence { get; set; }
        public bool HasProofOfIncome { get; set; }
        public bool HasCollateralDocs { get; set; }
        
        [MaxLength(2000)]
        public string? Notes { get; set; }
        
        // Garanties
        public List<CreateMicrocreditGuaranteeDto> Guarantees { get; set; } = new();
    }

    public class CreateMicrocreditGuaranteeDto
    {
        [Required]
        public MicrocreditGuaranteeType Type { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal Value { get; set; }
        
        [Required]
        public MicrocreditCurrency Currency { get; set; }
        
        public GuarantorInfoDto? GuarantorInfo { get; set; }
    }

    public class CreateMicrocreditPaymentDto
    {
        [Required]
        public Guid LoanId { get; set; }
        
        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }
        
        [Required]
        public DateOnly PaymentDate { get; set; }
        
        [Required]
        public MicrocreditPaymentMethod PaymentMethod { get; set; }
        
        [MaxLength(100)]
        public string? Reference { get; set; }
        
        [MaxLength(1000)]
        public string? Notes { get; set; }
        
        public bool AllocateToPrincipal { get; set; } = false;
        
        public CustomAllocationDto? CustomAllocation { get; set; }
    }

    public class CustomAllocationDto
    {
        [Range(0, double.MaxValue)]
        public decimal Principal { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal Interest { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal Penalties { get; set; }
    }

    // DTOs pour les listes et recherches
    public class MicrocreditLoanListResponseDto
    {
        public List<MicrocreditLoanDto> Loans { get; set; } = new();
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
    }

    public class MicrocreditApplicationListResponseDto
    {
        public List<MicrocreditLoanApplicationDto> Applications { get; set; } = new();
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
    }

    // DTOs pour les statistiques
    public class MicrocreditLoanStatisticsDto
    {
        public int TotalLoans { get; set; }
        public int ActiveLoans { get; set; }
        public int CompletedLoans { get; set; }
        public int OverdueLoans { get; set; }
        public int DefaultedLoans { get; set; }
        public decimal TotalDisbursed { get; set; }
        public decimal TotalOutstanding { get; set; }
        public decimal TotalCollected { get; set; }
        public decimal PortfolioAtRisk { get; set; }
        public decimal AverageLoanSize { get; set; }
        public decimal AverageInterestRate { get; set; }
        public decimal CollectionRate { get; set; }
    }

    public class MicrocreditPortfolioSummaryDto
    {
        public Dictionary<string, MicrocreditLoanStatisticsDto> ByType { get; set; } = new();
        public Dictionary<string, MicrocreditLoanStatisticsDto> ByCurrency { get; set; } = new();
        public Dictionary<string, int> ByStatus { get; set; } = new();
        public List<MonthlyTrendDto> MonthlyTrends { get; set; } = new();
    }

    public class MonthlyTrendDto
    {
        public string Month { get; set; } = string.Empty;
        public decimal Disbursements { get; set; }
        public decimal Collections { get; set; }
        public int NewLoans { get; set; }
        public int CompletedLoans { get; set; }
    }

    // DTOs supplémentaires pour les contrôleurs
    public class EarlyPaymentCalculationDto
    {
        public decimal TotalOutstanding { get; set; }
        public decimal InterestSavings { get; set; }
        public decimal PayoffAmount { get; set; }
        public decimal PenaltySavings { get; set; }
        public DateTime CalculationDate { get; set; }
    }

    public class PaymentAllocationDto
    {
        public decimal PrincipalAmount { get; set; }
        public decimal InterestAmount { get; set; }
        public decimal PenaltyAmount { get; set; }
        public decimal FeesAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public DateTime AllocationDate { get; set; }
    }

    public class LoanSummaryDto
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
        public MicrocreditLoanStatus Status { get; set; }
    }

    public class OverdueLoanDto
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

    public class PaymentHistoryResponseDto
    {
        public List<MicrocreditPaymentDto> Payments { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class PaymentStatisticsDto
    {
        public decimal TotalPaymentsCollected { get; set; }
        public decimal TotalPrincipalCollected { get; set; }
        public decimal TotalInterestCollected { get; set; }
        public decimal TotalPenaltiesCollected { get; set; }
        public int NumberOfPayments { get; set; }
        public decimal AveragePaymentAmount { get; set; }
        public int PaymentsOnTime { get; set; }
        public int PaymentsLate { get; set; }
        public decimal CollectionRate { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
    }

    public class PaymentReceiptDto
    {
        public string ReceiptNumber { get; set; } = string.Empty;
        public DateTime PaymentDate { get; set; }
        public string BorrowerName { get; set; } = string.Empty;
        public string LoanNumber { get; set; } = string.Empty;
        public decimal PaymentAmount { get; set; }
        public PaymentAllocationDto Allocation { get; set; } = new();
        public MicrocreditPaymentMethod PaymentMethod { get; set; }
        public string? TransactionReference { get; set; }
        public string ReceivedBy { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; }
    }

    public class EarlyPayoffDto
    {
        public Guid LoanId { get; set; }
        public DateTime PaymentDate { get; set; }
        public MicrocreditPaymentMethod PaymentMethod { get; set; }
        public string? TransactionReference { get; set; }
        public string? Notes { get; set; }
    }

    // DTOs pour les statistiques du tableau de bord
    public class MicrocreditDashboardStatsDto
    {
        public int TotalClients { get; set; }
        public int ActiveLoans { get; set; }
        public CurrencyAmountDto TotalOutstanding { get; set; } = new();
        // Total amount disbursed to date by currency (sum of PrincipalAmount)
        public CurrencyAmountDto TotalDisbursed { get; set; } = new();
        public decimal RepaymentRate { get; set; }
        public OverdueStatsDto OverdueLoans { get; set; } = new();
        public CurrencyAmountDto InterestRevenue { get; set; } = new();
        public int LoansCompletedThisMonth { get; set; }
        public int NewLoansThisMonth { get; set; }
        public List<BranchPerformanceSummaryDto> BranchPerformance { get; set; } = new();
        public DateTime GeneratedAt { get; set; }
    }

    public class CurrencyAmountDto
    {
        public decimal HTG { get; set; }
        public decimal USD { get; set; }
    }

    public class OverdueStatsDto
    {
        public int Count { get; set; }
        public CurrencyAmountDto Amount { get; set; } = new();
    }

    public class BranchPerformanceSummaryDto
    {
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public int TotalLoans { get; set; }
        public CurrencyAmountDto TotalDisbursed { get; set; } = new();
        public CurrencyAmountDto TotalOutstanding { get; set; } = new();
        public decimal RepaymentRate { get; set; }
        public decimal Par30 { get; set; }
    }

    // DTOs pour les performances des agents
    public class AgentPerformanceDto
    {
        public string AgentId { get; set; } = string.Empty;
        public string AgentName { get; set; } = string.Empty;
        public int TotalLoansManaged { get; set; }
        public int ActiveLoans { get; set; }
    public CurrencyAmountDto TotalDisbursed { get; set; } = new();
    public CurrencyAmountDto TotalCollected { get; set; } = new();
        public decimal OutstandingBalance { get; set; }
        public int OverdueLoans { get; set; }
        public decimal CollectionRate { get; set; }
        public decimal AverageLoanSize { get; set; }
        public int NewLoansThisMonth { get; set; }
        public decimal PortfolioGrowth { get; set; }
        public string PerformanceRating { get; set; } = string.Empty;
    }

    // DTOs pour les tendances du portefeuille
    public class PortfolioTrendDto
    {
        public string Period { get; set; } = string.Empty; // Month-Year format
        public decimal Disbursements { get; set; }
        public decimal Collections { get; set; }
        public decimal OutstandingBalance { get; set; }
        public int NewLoans { get; set; }
        public int CompletedLoans { get; set; }
        public decimal PortfolioGrowth { get; set; }
        public decimal CollectionRate { get; set; }
        public int ActiveClients { get; set; }
    }

    public class LoanTypeStatsDto
    {
        public MicrocreditLoanType LoanType { get; set; }
        public int TotalLoans { get; set; }
        public int ActiveLoans { get; set; }
        public decimal TotalDisbursed { get; set; }
        public decimal TotalOutstanding { get; set; }
        public decimal AverageAmount { get; set; }
        public int OverdueCount { get; set; }
    }
}