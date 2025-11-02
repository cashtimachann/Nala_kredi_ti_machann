using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalaCreditAPI.Models
{
    // Enums pour le microcrédit
    public enum MicrocreditLoanType
    {
        Commercial,
        Agricultural, 
        Personal,
        Emergency
    }

    public enum MicrocreditLoanStatus
    {
        Pending,
        Approved,
        Active,
        Completed,
        Overdue,
        Defaulted,
        Cancelled
    }

    public enum MicrocreditApplicationStatus
    {
        Draft,
        Submitted,
        UnderReview,
        Approved,
        Rejected,
        Cancelled
    }

    public enum MicrocreditPaymentStatus
    {
        Pending,
        Completed,
        Overdue,
        Partial,
        Cancelled
    }

    public enum MicrocreditGuaranteeType
    {
        Collateral,
        Personal,
        Group,
        Insurance,
        Deposit
    }

    public enum MicrocreditApprovalLevel
    {
        LoanOfficer,
        BranchManager,
        RegionalManager,
        CreditCommittee
    }

    public enum MicrocreditPaymentMethod
    {
        Cash,
        BankTransfer,
        MobileMoney,
        Check,
        Card
    }

    public enum MicrocreditDocumentType
    {
        IdCard,
        ProofOfIncome,
        BusinessRegistration,
        BankStatements,
        CollateralDocument,
        ReferenceLetter,
        Photos,
        Other
    }

    public enum MicrocreditCurrency
    {
        HTG,
        USD
    }

    // Configuration des types de crédit
    [Table("microcredit_loan_type_configurations")]
    public class MicrocreditLoanTypeConfiguration
    {
        [Key]
        public Guid Id { get; set; }
        
        [Required]
        public MicrocreditLoanType Type { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal MinAmount { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal MaxAmount { get; set; }
        
        [Required]
        public int MinDurationMonths { get; set; }
        
        [Required]
        public int MaxDurationMonths { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(5,4)")]
        public decimal InterestRateMin { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(5,4)")]
        public decimal InterestRateMax { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(5,4)")]
        public decimal DefaultInterestRate { get; set; }
        
        [Required]
        public int GracePeriodDays { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(5,4)")]
        public decimal PenaltyRate { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(5,4)")]
        public decimal ProcessingFeeRate { get; set; }
        
        [Required]
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // Emprunteur
    [Table("microcredit_borrowers")]
    public class MicrocreditBorrower
    {
        [Key]
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string FirstName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string LastName { get; set; } = string.Empty;
        
        [Required]
        public DateOnly DateOfBirth { get; set; }
        
        [Required]
        [MaxLength(1)]
        public string Gender { get; set; } = string.Empty;
        
        // Adresse (JSON)
        [Required]
        public string Address { get; set; } = string.Empty;
        
        // Contact (JSON)
        [Required]
        public string Contact { get; set; } = string.Empty;
        
        // Identité (JSON)
        [Required]
        public string Identity { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string Occupation { get; set; } = string.Empty;
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal MonthlyIncome { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string EmploymentType { get; set; } = string.Empty;
        
        public int? YearsInBusiness { get; set; }
        
        public int? CreditScore { get; set; }
        
        // Prêts précédents (JSON)
        public string? PreviousLoans { get; set; }
        
        // Références (JSON)
        public string References { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        [NotMapped]
        public string FullName => $"{FirstName} {LastName}";
        
        // Relations
        public virtual ICollection<MicrocreditLoanApplication> LoanApplications { get; set; } = new List<MicrocreditLoanApplication>();
        public virtual ICollection<MicrocreditLoan> Loans { get; set; } = new List<MicrocreditLoan>();
    }

    // Demande de crédit
    [Table("microcredit_loan_applications")]
    public class MicrocreditLoanApplication
    {
        [Key]
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string ApplicationNumber { get; set; } = string.Empty;
        
        [Required]
        public Guid BorrowerId { get; set; }
        
        [Required]
        public MicrocreditLoanType LoanType { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal RequestedAmount { get; set; }
        
        [Required]
        public int RequestedDurationMonths { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string Purpose { get; set; } = string.Empty;
        
        public string? BusinessPlan { get; set; }
        
        [Required]
        public MicrocreditCurrency Currency { get; set; }
        
        [Required]
        public int BranchId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string BranchName { get; set; } = string.Empty;
        
        // Évaluation financière
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal MonthlyIncome { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal MonthlyExpenses { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal ExistingDebts { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal? CollateralValue { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(5,4)")]
        public decimal DebtToIncomeRatio { get; set; }
        
        // Workflow d'approbation
        public MicrocreditApprovalLevel CurrentApprovalLevel { get; set; } = MicrocreditApprovalLevel.LoanOfficer;
        
        // Évaluation de risque (JSON)
        public string? CreditScore { get; set; }
        public string? RiskAssessment { get; set; }
        
        // Statut et dates
        [Required]
        public MicrocreditApplicationStatus Status { get; set; } = MicrocreditApplicationStatus.Draft;
        
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? RejectedAt { get; set; }
        
        [MaxLength(500)]
        public string? RejectionReason { get; set; }
        
        // Agent responsable
        [Required]
        public string LoanOfficerId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string LoanOfficerName { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Relations
        [ForeignKey("BorrowerId")]
        public virtual MicrocreditBorrower Borrower { get; set; } = null!;
        
        public virtual ICollection<MicrocreditApplicationDocument> Documents { get; set; } = new List<MicrocreditApplicationDocument>();
        public virtual ICollection<MicrocreditGuarantee> Guarantees { get; set; } = new List<MicrocreditGuarantee>();
        public virtual ICollection<MicrocreditApprovalStep> ApprovalSteps { get; set; } = new List<MicrocreditApprovalStep>();
        public virtual MicrocreditLoan? ApprovedLoan { get; set; }
    }

    // Documents de demande
    [Table("microcredit_application_documents")]
    public class MicrocreditApplicationDocument
    {
        [Key]
        public Guid Id { get; set; }
        
        [Required]
        public Guid ApplicationId { get; set; }
        
        [Required]
        public MicrocreditDocumentType Type { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string FilePath { get; set; } = string.Empty;
        
        [Required]
        public long FileSize { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string MimeType { get; set; } = string.Empty;
        
        [Required]
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        
        [Required]
        public string UploadedBy { get; set; } = string.Empty;
        
        [Required]
        public bool Verified { get; set; } = false;
        
        public DateTime? VerifiedAt { get; set; }
        public string? VerifiedBy { get; set; }
        
        // Relations
        [ForeignKey("ApplicationId")]
        public virtual MicrocreditLoanApplication Application { get; set; } = null!;
    }

    // Garanties
    [Table("microcredit_guarantees")]
    public class MicrocreditGuarantee
    {
        [Key]
        public Guid Id { get; set; }
        
        [Required]
        public Guid ApplicationId { get; set; }
        
        [Required]
        public MicrocreditGuaranteeType Type { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Value { get; set; }
        
        [Required]
        public MicrocreditCurrency Currency { get; set; }
        
        // Informations du garant (JSON)
        public string? GuarantorInfo { get; set; }
        
        [Required]
        public bool Verified { get; set; } = false;
        
        public DateTime? VerifiedAt { get; set; }
        public string? VerifiedBy { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Relations
        [ForeignKey("ApplicationId")]
        public virtual MicrocreditLoanApplication Application { get; set; } = null!;
    }

    // Étapes d'approbation
    [Table("microcredit_approval_steps")]
    public class MicrocreditApprovalStep
    {
        [Key]
        public Guid Id { get; set; }
        
        [Required]
        public Guid ApplicationId { get; set; }
        
        [Required]
        public MicrocreditApprovalLevel Level { get; set; }
        
        [Required]
        public string ApproverId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string ApproverName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED
        
        [MaxLength(1000)]
        public string? Comments { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal? RequiredAmount { get; set; }
        
        public DateTime? ProcessedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Relations
        [ForeignKey("ApplicationId")]
        public virtual MicrocreditLoanApplication Application { get; set; } = null!;
    }

    // Prêt actif
    [Table("microcredit_loans")]
    public class MicrocreditLoan
    {
        [Key]
        public Guid Id { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string LoanNumber { get; set; } = string.Empty;
        
        [Required]
        public Guid ApplicationId { get; set; }
        
        [Required]
        public Guid BorrowerId { get; set; }
        
        [Required]
        public MicrocreditLoanType LoanType { get; set; }
        
        // Conditions du prêt
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal PrincipalAmount { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(5,4)")]
        public decimal InterestRate { get; set; }
        
        [Required]
        public int DurationMonths { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal InstallmentAmount { get; set; }
        
        [Required]
        public MicrocreditCurrency Currency { get; set; }
        
        // Dates importantes
        [Required]
        public DateOnly DisbursementDate { get; set; }
        
        [Required]
        public DateOnly FirstInstallmentDate { get; set; }
        
        [Required]
        public DateOnly MaturityDate { get; set; }
        
        // État financier
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmountDue { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal AmountPaid { get; set; } = 0;
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal PrincipalPaid { get; set; } = 0;
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal InterestPaid { get; set; } = 0;
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal PenaltiesPaid { get; set; } = 0;
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal OutstandingBalance { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal OutstandingPrincipal { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal OutstandingInterest { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal OutstandingPenalties { get; set; } = 0;
        
        // Statut et performance
        [Required]
        public MicrocreditLoanStatus Status { get; set; } = MicrocreditLoanStatus.Approved;
        
        [Required]
        public int InstallmentsPaid { get; set; } = 0;
        
        [Required]
        public int InstallmentsRemaining { get; set; }
        
        [Required]
        public int DaysOverdue { get; set; } = 0;
        
        // Informations de gestion
        [Required]
        public int BranchId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string BranchName { get; set; } = string.Empty;
        
        [Required]
        public string LoanOfficerId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string LoanOfficerName { get; set; } = string.Empty;
        
        // Métadonnées
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastPaymentDate { get; set; }
        public DateOnly? NextPaymentDue { get; set; }
        
        // Relations
        [ForeignKey("ApplicationId")]
        public virtual MicrocreditLoanApplication Application { get; set; } = null!;
        
        [ForeignKey("BorrowerId")]
        public virtual MicrocreditBorrower Borrower { get; set; } = null!;
        
        public virtual ICollection<MicrocreditPaymentSchedule> PaymentSchedule { get; set; } = new List<MicrocreditPaymentSchedule>();
        public virtual ICollection<MicrocreditPayment> Payments { get; set; } = new List<MicrocreditPayment>();
    }

    // Échéancier de paiement
    [Table("microcredit_payment_schedules")]
    public class MicrocreditPaymentSchedule
    {
        [Key]
        public Guid Id { get; set; }
        
        [Required]
        public Guid LoanId { get; set; }
        
        [Required]
        public int InstallmentNumber { get; set; }
        
        [Required]
        public DateOnly DueDate { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal PrincipalAmount { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal InterestAmount { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }
        
        [Required]
        public MicrocreditPaymentStatus Status { get; set; } = MicrocreditPaymentStatus.Pending;
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal? PaidAmount { get; set; }
        
        public DateOnly? PaidDate { get; set; }
        
        public int? DaysOverdue { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal? PenaltyAmount { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal RemainingBalance { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Relations
        [ForeignKey("LoanId")]
        public virtual MicrocreditLoan Loan { get; set; } = null!;
    }

    // Paiement effectué
    [Table("microcredit_payments")]
    public class MicrocreditPayment
    {
        [Key]
        public Guid Id { get; set; }
        
        [Required]
        public Guid LoanId { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string PaymentNumber { get; set; } = string.Empty;
        
        // Montants
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal PrincipalAmount { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal InterestAmount { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal PenaltyAmount { get; set; } = 0;
        
        [Required]
        public MicrocreditCurrency Currency { get; set; }
        
        // Dates et statut
        [Required]
        public DateOnly PaymentDate { get; set; }
        
        [Required]
        public DateOnly ValueDate { get; set; }
        
        [Required]
        public MicrocreditPaymentStatus Status { get; set; } = MicrocreditPaymentStatus.Completed;
        
        // Méthode de paiement
        [Required]
        public MicrocreditPaymentMethod PaymentMethod { get; set; }
        
        [MaxLength(100)]
        public string? Reference { get; set; }
        
        // Traitement
        [Required]
        public string ProcessedBy { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string ProcessedByName { get; set; } = string.Empty;
        
        [Required]
        public int BranchId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string BranchName { get; set; } = string.Empty;
        
        // Reçu
        [Required]
        [MaxLength(20)]
        public string ReceiptNumber { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? ReceiptPath { get; set; }
        
        // Métadonnées
        [MaxLength(1000)]
        public string? Notes { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Relations
        [ForeignKey("LoanId")]
        public virtual MicrocreditLoan Loan { get; set; } = null!;
    }
}